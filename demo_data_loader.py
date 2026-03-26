"""
ExpensIQ — Demo Data Loader (Phase B — 6 months, anomalies, 8 employees)

Run: python demo_data_loader.py [output.json]

Generates:
  - 8 employees across 4 departments
  - ~90 receipts spanning Oct 2025 – Mar 2026
  - ~50 bank transactions (including orphans)
  - Intentional anomalies for AI detection testing
"""

import sys
import os
import uuid
import json
import random
from datetime import date, datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# ─────────────────────────────────────────────────────────────────
# SAMPLE DATA
# ─────────────────────────────────────────────────────────────────

EMPLOYEES = [
    {"name": "Alice Martin",     "email": "alice@acme.com",     "department": "Engineering",  "role": "employee", "monthly_budget": 800.0},
    {"name": "Bob Lefevre",      "email": "bob@acme.com",       "department": "Sales",        "role": "employee", "monthly_budget": 1200.0},
    {"name": "Carla Ramos",      "email": "carla@acme.com",     "department": "Marketing",    "role": "manager",  "monthly_budget": 2000.0},
    {"name": "David Chen",       "email": "david@acme.com",     "department": "Engineering",  "role": "employee", "monthly_budget": 600.0},
    {"name": "Eva Kowalski",     "email": "eva@acme.com",       "department": "Finance",      "role": "admin",    "monthly_budget": 500.0},
    {"name": "Fernando Garcia",  "email": "fernando@acme.com",  "department": "Sales",        "role": "employee", "monthly_budget": 1000.0},
    {"name": "Greta Olsen",      "email": "greta@acme.com",     "department": "Marketing",    "role": "employee", "monthly_budget": 900.0},
    {"name": "Hugo Fernandez",   "email": "hugo@acme.com",      "department": "Operations",   "role": "manager",  "monthly_budget": 1500.0},
]

# 6-month window: Oct 2025 - Mar 2026
START_DATE = date(2025, 10, 1)
END_DATE = date(2026, 3, 25)

RECEIPT_TEMPLATES = [
    # (merchant, amount_range, currency, tax_rate, category)
    ("Uber Technologies",      (15, 45),    "EUR", 0.21, "transport"),
    ("Restaurant Le Bistro",   (35, 85),    "EUR", 0.10, "meals"),
    ("Ibis Hotel Paris",       (120, 250),  "EUR", 0.10, "lodging"),
    ("Starbucks Coffee",       (8, 18),     "EUR", 0.10, "meals"),
    ("Amazon Business",        (30, 150),   "EUR", 0.21, "supplies"),
    ("Ryanair",                (80, 200),   "EUR", 0.10, "transport"),
    ("Deliveroo",              (15, 45),    "EUR", 0.10, "meals"),
    ("Office Depot",           (40, 120),   "EUR", 0.21, "supplies"),
    ("Bolt Taxi",              (10, 30),    "EUR", 0.21, "transport"),
    ("Marriott Hotel",         (180, 350),  "EUR", 0.10, "lodging"),
    ("Nandos Restaurant",      (25, 55),    "EUR", 0.10, "meals"),
    ("SNCF Train",             (50, 150),   "EUR", 0.10, "transport"),
    ("Cafe de Flore",          (12, 30),    "EUR", 0.10, "meals"),
    ("Hertz Car Rental",       (100, 250),  "EUR", 0.21, "transport"),
    ("Novotel Barcelona",      (130, 280),  "EUR", 0.10, "lodging"),
    ("Staples Office",         (25, 80),    "EUR", 0.21, "supplies"),
    ("McDonalds",              (8, 20),     "EUR", 0.10, "meals"),
    ("Gas Station Repsol",     (40, 80),    "EUR", 0.21, "transport"),
    ("Telefonica",             (30, 60),    "EUR", 0.21, "utilities"),
    ("Endesa Energia",         (80, 150),   "EUR", 0.21, "utilities"),
]


def calc_approval_level(amount):
    """Determine approval level based on amount."""
    if amount is None or amount < 100:
        return "auto"
    elif amount < 500:
        return "manager"
    else:
        return "director"


def random_date_in_range(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def generate_demo_json(output_path: str = "demo_data.json"):
    random.seed(42)

    employees = []
    for e in EMPLOYEES:
        emp = {"id": str(uuid.uuid4()), **e}
        employees.append(emp)

    receipts = []
    receipt_idx = 0

    # ── Normal receipts (~70) ─────────────────────────────────────
    months = [
        (2025, 10), (2025, 11), (2025, 12),
        (2026, 1), (2026, 2), (2026, 3),
    ]
    for year, month in months:
        month_start = date(year, month, 1)
        month_end = month_start + timedelta(days=27)

        num_receipts = random.randint(10, 14)
        for _ in range(num_receipts):
            emp = random.choice(employees)
            tmpl = random.choice(RECEIPT_TEMPLATES)
            merchant, (amt_low, amt_high), currency, tax_rate, category = tmpl
            amount = round(random.uniform(amt_low, amt_high), 2)
            tax = round(amount * tax_rate, 2)
            r_date = random_date_in_range(month_start, month_end)

            # Weekday receipts mostly
            confidence = round(random.uniform(0.82, 0.98), 3)
            status = random.choices(
                ["pending", "matched", "review"],
                weights=[0.3, 0.5, 0.2],
            )[0]

            receipts.append({
                "id": str(uuid.uuid4()),
                "employee_id": emp["id"],
                "upload_timestamp": datetime.combine(
                    r_date, datetime.min.time().replace(hour=random.randint(8, 18))
                ).isoformat(),
                "image_url": f"https://demo.expensiq.local/receipts/sample_{receipt_idx + 1:03d}.jpg",
                "merchant": merchant,
                "date": r_date.isoformat(),
                "amount": amount,
                "currency": currency,
                "tax": tax,
                "category": category,
                "status": status,
                "ocr_confidence": confidence,
                "ocr_provider": "mock",
                "payment_method": random.choice(["card", "card", "card", "cash", "transfer"]),
                "approval_level": calc_approval_level(amount),
            })
            receipt_idx += 1

    # ── ANOMALY: Policy violation (>500 EUR) ──────────────────────
    anomaly_emp = employees[1]  # Bob, sales
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": anomaly_emp["id"],
        "upload_timestamp": datetime(2026, 2, 15, 14, 30).isoformat(),
        "image_url": f"https://demo.expensiq.local/receipts/anomaly_policy.jpg",
        "merchant": "Executive Conference Center Madrid",
        "date": "2026-02-15",
        "amount": 1250.00,
        "currency": "EUR",
        "tax": 113.64,
        "category": "entertainment",
        "status": "flagged",
        "ocr_confidence": 0.94,
        "ocr_provider": "mock",
        "payment_method": "card",
        "approval_level": "director",
    })

    # ── ANOMALY: Rapid repeat (3 receipts same merchant in 24h) ──
    rapid_emp = employees[3]  # David, engineering
    for i in range(3):
        receipts.append({
            "id": str(uuid.uuid4()),
            "employee_id": rapid_emp["id"],
            "upload_timestamp": datetime(2026, 1, 20, 9 + i * 3, 15).isoformat(),
            "image_url": f"https://demo.expensiq.local/receipts/rapid_{i}.jpg",
            "merchant": "Uber Technologies",
            "date": "2026-01-20",
            "amount": round(random.uniform(15, 35), 2),
            "currency": "EUR",
            "tax": round(random.uniform(3, 7), 2),
            "category": "transport",
            "status": "review",
            "ocr_confidence": 0.91,
            "ocr_provider": "mock",
            "payment_method": "card",
            "approval_level": calc_approval_level(round(random.uniform(15, 35), 2)),
        })

    # ── ANOMALY: Duplicate receipts ───────────────────────────────
    dup_emp = employees[0]  # Alice
    dup_id1 = str(uuid.uuid4())
    dup_id2 = str(uuid.uuid4())
    for dup_id in [dup_id1, dup_id2]:
        receipts.append({
            "id": dup_id,
            "employee_id": dup_emp["id"],
            "upload_timestamp": datetime(2025, 12, 10, 11, 0).isoformat(),
            "image_url": f"https://demo.expensiq.local/receipts/dup.jpg",
            "merchant": "Starbucks Coffee",
            "date": "2025-12-10",
            "amount": 14.80,
            "currency": "EUR",
            "tax": 1.35,
            "category": "meals",
            "status": "pending",
            "ocr_confidence": 0.95,
            "ocr_provider": "mock",
            "payment_method": "card",
            "approval_level": "auto",
        })

    # ── ANOMALY: Weekend expense ──────────────────────────────────
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": employees[5]["id"],  # Fernando
        "upload_timestamp": datetime(2026, 3, 8, 23, 45).isoformat(),  # Saturday night
        "image_url": f"https://demo.expensiq.local/receipts/weekend.jpg",
        "merchant": "Nightclub Premium VIP",
        "date": "2026-03-08",
        "amount": 385.00,
        "currency": "EUR",
        "tax": 35.00,
        "category": "entertainment",
        "status": "review",
        "ocr_confidence": 0.72,
        "ocr_provider": "mock",
        "payment_method": "cash",
        "approval_level": "manager",
    })

    # ── ANOMALY: Low OCR confidence receipts ──────────────────────
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": employees[6]["id"],  # Greta
        "upload_timestamp": datetime(2026, 1, 5, 10, 0).isoformat(),
        "image_url": f"https://demo.expensiq.local/receipts/blurry.jpg",
        "merchant": None,
        "date": None,
        "amount": None,
        "currency": "EUR",
        "tax": None,
        "category": "other",
        "status": "flagged",
        "ocr_confidence": 0.18,
        "ocr_provider": "mock",
        "payment_method": None,
        "approval_level": "auto",
    })

    # ── Bank Transactions ─────────────────────────────────────────
    transactions = []

    # Matching transactions for ~60% of receipts
    matched_receipts = [r for r in receipts if r["amount"] and r["status"] != "flagged"]
    for i, r in enumerate(matched_receipts[:50]):
        noise_days = random.choice([-1, 0, 0, 0, 1])
        noise_amount = random.choice([0.0, 0.0, 0.0, 0.5, -0.3])
        r_date = date.fromisoformat(r["date"])
        txn_date = r_date + timedelta(days=noise_days)

        transactions.append({
            "id": str(uuid.uuid4()),
            "employee_id": r["employee_id"],
            "external_id": f"TXN-{i:04d}",
            "date": txn_date.isoformat(),
            "merchant": r["merchant"],
            "amount": round(r["amount"] + noise_amount, 2),
            "currency": r["currency"],
            "account_id": "acct-demo-001",
        })

    # Orphan transactions (no receipt)
    orphans = [
        ("Netflix Subscription",  12.99, "EUR"),
        ("AWS Cloud Services",    89.00, "EUR"),
        ("Spotify Premium",        9.99, "EUR"),
        ("Apple iCloud",           2.99, "EUR"),
        ("Google Workspace",      12.00, "EUR"),
    ]
    for i, (merchant, amount, currency) in enumerate(orphans):
        transactions.append({
            "id": str(uuid.uuid4()),
            "employee_id": random.choice(employees)["id"],
            "external_id": f"TXN-ORPHAN-{i:04d}",
            "date": random_date_in_range(START_DATE, END_DATE).isoformat(),
            "merchant": merchant,
            "amount": amount,
            "currency": currency,
            "account_id": "acct-demo-001",
        })

    data = {
        "generated_at": datetime.utcnow().isoformat(),
        "employees": employees,
        "receipts": receipts,
        "transactions": transactions,
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)

    print(f"Demo data written to {output_path}")
    print(f"   Employees:    {len(employees)}")
    print(f"   Receipts:     {len(receipts)}")
    print(f"   Transactions: {len(transactions)}")
    print(f"   Date range:   {START_DATE} to {END_DATE}")
    print(f"   Anomalies:    policy violation, rapid repeat x3, duplicate x2, weekend, low OCR")
    return data


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo_data.json"
    generate_demo_json(out)
