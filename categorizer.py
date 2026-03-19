"""
ExpensIQ — Expense Categorizer (Rule-Based MVP)

Maps merchant names to expense categories.
Designed to be swapped out for an ML model later.
"""

import re
from typing import Optional


CATEGORY_RULES: dict[str, list[str]] = {
    "transport": [
        "uber", "lyft", "taxi", "cabify", "bolt", "freenow", "free now",
        "ryanair", "easyjet", "lufthansa", "air france", "iberia", "vueling",
        "renfe", "eurostar", "thalys", "sncf", "deutsche bahn", "db bahn",
        "hertz", "avis", "enterprise", "sixt", "europcar",
        "metro", "bus", "tram", "transporte", "parking",
    ],
    "meals": [
        "restaurant", "cafe", "café", "bistro", "brasserie", "bar",
        "pizza", "burger", "sushi", "mcdonalds", "starbucks", "costa coffee",
        "subway", "kfc", "dominos", "nandos", "pret", "pret a manger",
        "deliveroo", "just eat", "uber eats", "doordash",
        "lunch", "dinner", "breakfast",
    ],
    "lodging": [
        "hotel", "ibis", "novotel", "marriott", "hilton", "hyatt",
        "airbnb", "booking.com", "expedia", "trivago",
        "hostel", "motel", "inn", "lodge", "bnb",
    ],
    "supplies": [
        "amazon", "office depot", "staples", "fnac", "mediamarkt", "pcworld",
        "currys", "ikea", "leroy merlin", "home depot", "b&q",
        "printer", "toner", "paper", "ink",
    ],
    "entertainment": [
        "cinema", "theatre", "theater", "netflix", "spotify", "concert",
        "museum", "gallery", "event", "ticket", "eventbrite",
    ],
    "utilities": [
        "electric", "electricity", "gas", "water", "internet", "telecom",
        "orange", "vodafone", "sfr", "bouygues", "telefonica",
        "aws", "azure", "google cloud", "digitalocean", "heroku",
    ],
}


class ExpenseCategorizer:
    """
    Rule-based categorizer.  Call .categorize(merchant) → category string.
    """

    def categorize(self, merchant: Optional[str]) -> str:
        if not merchant:
            return "other"

        normalized = merchant.lower().strip()

        for category, keywords in CATEGORY_RULES.items():
            for kw in keywords:
                if kw in normalized:
                    return category

        return "other"


# ─────────────────────────────────────────────────────────────────
# Anomaly Detection Service
# ─────────────────────────────────────────────────────────────────

"""
ExpensIQ — Anomaly Detection Rules Engine

Rules:
  1. Receipt without matching bank transaction
  2. Transaction without a receipt
  3. Duplicate receipts (same merchant + amount + date)
  4. Expense exceeds company policy limit
  5. Multiple receipts from same merchant within RAPID_REPEAT_WINDOW hours
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List

logger = logging.getLogger(__name__)

POLICY_MAX_SINGLE_EXPENSE   = 500.0   # EUR
RAPID_REPEAT_WINDOW_HOURS   = 24
RAPID_REPEAT_MIN_COUNT      = 3


@dataclass
class AnomalyAlert:
    employee_id:  str
    receipt_id:   Optional[str]
    alert_type:   str
    description:  str


class AnomalyDetector:
    """
    Runs all anomaly rules against a set of receipts and transactions.
    Returns a list of AnomalyAlert objects to be persisted.
    """

    def detect(
        self,
        receipts:     list,   # List[Receipt ORM objects]
        transactions: list,   # List[BankTransaction ORM objects]
        matches:      list,   # List[Match ORM objects]
        policy_max:   float = POLICY_MAX_SINGLE_EXPENSE,
    ) -> List[AnomalyAlert]:

        alerts: List[AnomalyAlert] = []
        matched_receipt_ids     = {str(m.receipt_id)     for m in matches}
        matched_transaction_ids = {str(m.transaction_id) for m in matches}

        # ── Rule 1: Receipt without bank transaction ──────────────
        for r in receipts:
            if str(r.id) not in matched_receipt_ids:
                alerts.append(AnomalyAlert(
                    employee_id = str(r.employee_id),
                    receipt_id  = str(r.id),
                    alert_type  = "no_transaction_for_receipt",
                    description = (
                        f"Receipt for {r.merchant or 'Unknown merchant'} "
                        f"({r.amount} {r.currency} on {r.date}) "
                        "has no matching bank transaction."
                    ),
                ))

        # ── Rule 2: Transaction without receipt ───────────────────
        for t in transactions:
            if str(t.id) not in matched_transaction_ids:
                alerts.append(AnomalyAlert(
                    employee_id = str(t.employee_id) if t.employee_id else "unknown",
                    receipt_id  = None,
                    alert_type  = "no_receipt_for_transaction",
                    description = (
                        f"Bank transaction for {t.merchant or 'Unknown'} "
                        f"({t.amount} {t.currency} on {t.date}) "
                        "has no uploaded receipt."
                    ),
                ))

        # ── Rule 3: Duplicate receipts ────────────────────────────
        seen: dict = {}
        for r in receipts:
            key = (r.merchant, r.amount, str(r.date))
            if key in seen:
                alerts.append(AnomalyAlert(
                    employee_id = str(r.employee_id),
                    receipt_id  = str(r.id),
                    alert_type  = "duplicate_receipt",
                    description = (
                        f"Possible duplicate receipt: {r.merchant} "
                        f"{r.amount} {r.currency} on {r.date}. "
                        f"First seen receipt ID: {seen[key]}"
                    ),
                ))
            else:
                seen[key] = str(r.id)

        # ── Rule 4: Policy violation ──────────────────────────────
        for r in receipts:
            if r.amount and float(r.amount) > policy_max:
                alerts.append(AnomalyAlert(
                    employee_id = str(r.employee_id),
                    receipt_id  = str(r.id),
                    alert_type  = "policy_violation",
                    description = (
                        f"Expense of {r.amount} {r.currency} at {r.merchant} "
                        f"exceeds the company policy limit of {policy_max} {r.currency}."
                    ),
                ))

        # ── Rule 5: Rapid repeat at same merchant ─────────────────
        from collections import defaultdict
        merchant_times: dict = defaultdict(list)
        for r in receipts:
            if r.merchant and r.upload_timestamp:
                merchant_times[(str(r.employee_id), r.merchant.lower())].append(r)

        for (emp_id, merchant), recs in merchant_times.items():
            recs_sorted = sorted(recs, key=lambda x: x.upload_timestamp)
            window = timedelta(hours=RAPID_REPEAT_WINDOW_HOURS)
            for i in range(len(recs_sorted)):
                window_recs = [
                    r for r in recs_sorted
                    if abs((r.upload_timestamp - recs_sorted[i].upload_timestamp)) <= window
                ]
                if len(window_recs) >= RAPID_REPEAT_MIN_COUNT:
                    alerts.append(AnomalyAlert(
                        employee_id = emp_id,
                        receipt_id  = str(recs_sorted[i].id),
                        alert_type  = "rapid_repeat_expense",
                        description = (
                            f"{len(window_recs)} receipts from '{merchant}' "
                            f"within {RAPID_REPEAT_WINDOW_HOURS}h window. "
                            "Please verify."
                        ),
                    ))
                    break   # one alert per merchant per employee

        logger.info(f"Anomaly detection complete: {len(alerts)} alert(s) generated")
        return alerts
