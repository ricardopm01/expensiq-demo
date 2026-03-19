"""ExpensIQ — Reconciliation engine (fuzzy matching)."""

import logging
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.models import BankTransaction, Match, Receipt

logger = logging.getLogger("expensiq.reconciliation")

# Matching thresholds
AMOUNT_TOLERANCE = 0.05     # 5% tolerance
DATE_WINDOW_DAYS = 3
MATCH_THRESHOLD = 0.6       # >= 0.6 → matched
REVIEW_THRESHOLD = 0.4      # 0.4-0.6 → review

# Weight distribution
W_AMOUNT = 0.5
W_DATE = 0.3
W_MERCHANT = 0.2


def _merchant_similarity(a: str, b: str) -> float:
    """Fuzzy string match for merchant names. Returns 0.0-1.0."""
    if not a or not b:
        return 0.0
    try:
        from fuzzywuzzy import fuzz
        return fuzz.token_sort_ratio(a.lower(), b.lower()) / 100.0
    except ImportError:
        # Fallback: simple containment check
        a_lower, b_lower = a.lower(), b.lower()
        if a_lower in b_lower or b_lower in a_lower:
            return 0.8
        return 0.0


def _amount_score(receipt_amount: float, txn_amount: float) -> float:
    """Score based on amount proximity. 1.0 = exact match, 0.0 = too far."""
    if receipt_amount == 0:
        return 0.0
    diff_pct = abs(receipt_amount - txn_amount) / receipt_amount
    if diff_pct <= AMOUNT_TOLERANCE:
        return 1.0 - (diff_pct / AMOUNT_TOLERANCE)
    return 0.0


def _date_score(receipt_date, txn_date) -> float:
    """Score based on date proximity. 1.0 = same day, 0.0 = too far."""
    if not receipt_date or not txn_date:
        return 0.0
    diff_days = abs((receipt_date - txn_date).days)
    if diff_days <= DATE_WINDOW_DAYS:
        return 1.0 - (diff_days / DATE_WINDOW_DAYS)
    return 0.0


class ReconciliationEngine:
    """Matches receipts against bank transactions using fuzzy logic."""

    def reconcile_receipt(self, db: Session, receipt: Receipt) -> int:
        """Try to match a single receipt against unmatched transactions. Returns match count."""
        if receipt.amount is None:
            return 0

        # Get transactions not already matched to this receipt
        already_matched_txn_ids = {
            m.transaction_id for m in db.query(Match).filter(Match.receipt_id == receipt.id).all()
        }

        transactions = db.query(BankTransaction).all()
        best_match = None
        best_score = 0.0

        for txn in transactions:
            if txn.id in already_matched_txn_ids:
                continue

            amount_s = _amount_score(float(receipt.amount), float(txn.amount))
            date_s = _date_score(receipt.date, txn.date)
            merchant_s = _merchant_similarity(receipt.merchant, txn.merchant)

            confidence = (W_AMOUNT * amount_s) + (W_DATE * date_s) + (W_MERCHANT * merchant_s)

            if confidence > best_score:
                best_score = confidence
                best_match = txn

        if best_match and best_score >= REVIEW_THRESHOLD:
            # Create match record
            match = Match(
                receipt_id=receipt.id,
                transaction_id=best_match.id,
                confidence=round(best_score, 3),
                match_method="fuzzy_v1",
            )
            db.add(match)

            if best_score >= MATCH_THRESHOLD:
                receipt.status = "matched"
                logger.info("Matched receipt %s → txn %s (conf=%.2f)",
                            receipt.id, best_match.id, best_score)
            else:
                receipt.status = "review"
                logger.info("Review needed: receipt %s → txn %s (conf=%.2f)",
                            receipt.id, best_match.id, best_score)

            db.commit()
            return 1

        return 0


reconciliation_engine = ReconciliationEngine()
