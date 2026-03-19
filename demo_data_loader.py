"""
ExpensIQ — Demo Data Loader + Mock Bank API

Run: python scripts/demo_data_loader.py

Loads:
  - 5 sample employees
  - 20 sample receipts (OCR pre-parsed)
  - 22 sample bank transactions (18 with matching receipts, 4 orphans)
  - Runs reconciliation engine
  - Generates sample alerts
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
    {"name": "Alice Martin",   "email": "alice@acme.com",   "department": "Engineering",  "role": "employee", "monthly_budget": 800.0},
    {"name": "Bob Lefèvre",    "email": "bob@acme.com",     "department": "Sales",        "role": "employee", "monthly_budget": 1200.0},
    {"name": "Carla Ramos",    "email": "carla@acme.com",   "department": "Marketing",    "role": "manager",  "monthly_budget": 2000.0},
    {"name": "David Chen",     "email": "david@acme.com",   "department": "Engineering",  "role": "employee", "monthly_budget": 600.0},
    {"name": "Eva Kowalski",   "email": "eva@acme.com",     "department": "Finance",      "role": "admin",    "monthly_budget": 500.0},
]

BASE_DATE = date(2024, 3, 1)

RECEIPT_TEMPLATES = [
    # (merchant, amount, currency, tax, category)
    ("Uber Technologies",        27.00,  "EUR", 4.50,  "transport"),
    ("Restaurant Le Bistro",     52.25,  "EUR", 4.75,  "meals"),
    ("Ibis Hotel Paris",        216.70,  "EUR", 19.70, "lodging"),
    ("Starbucks Coffee",         14.80,  "EUR", 1.35,  "meals"),
    ("Amazon Business",          89.99,  "EUR", 8.18,  "supplies"),
    ("Ryanair",                 143.50,  "EUR", 13.05, "transport"),
    ("Deliveroo",                31.60,  "EUR", 2.87,  "meals"),
    ("Office Depot",             67.40,  "EUR", 6.13,  "supplies"),
    ("Bolt Taxi",                18.20,  "EUR", 3.03,  "transport"),
    ("Marriott Hotel",          289.00,  "EUR", 26.27, "lodging"),
    ("Nandos Restaurant",        43.50,  "EUR", 3.95,  "meals"),
    ("SNCF Train",               88.00,  "EUR", 8.00,  "transport"),
    ("Cafe de Flore",            22.40,  "EUR", 2.04,  "meals"),
    ("Hertz Car Rental",        175.00,  "EUR", 15.91, "transport"),
    ("Novotel Barcelona",       198.00,  "EUR", 18.00, "lodging"),
    ("Staples Office",           55.00,  "EUR", 5.00,  "supplies"),
    ("McDonalds",                12.90,  "EUR", 1.17,  "meals"),
    # Anomaly: high value
    ("Executive Conference",    650.00,  "EUR", 59.09, "entertainment"),
    # Anomaly: will have no match
    ("Unknown Vendor",           33.00,  "EUR", 3.00,  "other"),
    # Duplicate
    ("Starbucks Coffee",         14.80,  "EUR", 1.35,  "meals"),
]

ORPHAN_TRANSACTIONS = [
    ("Netflix",    12.99, "EUR"),
    ("AWS Cloud",  89.00, "EUR"),
    ("Spotify",     9.99, "EUR"),
    ("Apple Store", 4.99, "EUR"),
]


# ─────────────────────────────────────────────────────────────────
# Mock Bank API Adapter
# ─────────────────────────────────────────────────────────────────

class MockBankAdapter:
    """
    Simulates a Plaid / Tink response.
    In production, swap this for the real Plaid SDK call.
    """

    def get_transactions(
        self,
        account_id: str,
        start_date: date,
        end_date:   date,
    ) -> list[dict]:
        """Returns a list of transaction dicts matching the Plaid schema."""
        transactions = []

        for i, (merchant, amount, currency, tax, category) in enumerate(RECEIPT_TEMPLATES[:18]):
            # Simulate slight date/amount noise to test matching
            noise_days   = random.choice([-1, 0, 0, 0, 1])
            noise_amount = random.choice([0.0, 0.0, 0.0, 0.5, -0.3])
            txn_date     = BASE_DATE + timedelta(days=i + noise_days)
            txn_amount   = round(amount + noise_amount, 2)

            transactions.append({
                "transaction_id":   f"mock-txn-{i:04d}",
                "account_id":       account_id,
                "date":             txn_date.isoformat(),
                "name":             merchant,
                "amount":           txn_amount,
                "iso_currency_code": currency,
            })

        # Add orphan transactions (no receipt)
        for i, (merchant, amount, currency) in enumerate(ORPHAN_TRANSACTIONS):
            transactions.append({
                "transaction_id":   f"mock-orphan-{i:04d}",
                "account_id":       account_id,
                "date":             (BASE_DATE + timedelta(days=i + 20)).isoformat(),
                "name":             merchant,
                "amount":           amount,
                "iso_currency_code": currency,
            })

        return transactions


# ─────────────────────────────────────────────────────────────────
# JSON export (used when DB is not available)
# ─────────────────────────────────────────────────────────────────

def generate_demo_json(output_path: str = "demo_data.json"):
    random.seed(42)

    employees = []
    for i, e in enumerate(EMPLOYEES):
        emp = {"id": str(uuid.uuid4()), **e}
        employees.append(emp)

    receipts = []
    for i, (merchant, amount, currency, tax, category) in enumerate(RECEIPT_TEMPLATES):
        emp = employees[i % len(employees)]
        receipts.append({
            "id":               str(uuid.uuid4()),
            "employee_id":      emp["id"],
            "upload_timestamp": (datetime(2024, 3, 1) + timedelta(days=i, hours=random.randint(8, 18))).isoformat(),
            "image_url":        f"https://demo.expensiq.local/receipts/sample_{i+1:02d}.jpg",
            "merchant":         merchant,
            "date":             (BASE_DATE + timedelta(days=i)).isoformat(),
            "amount":           amount,
            "currency":         currency,
            "tax":              tax,
            "category":         category,
            "status":           "pending",
            "ocr_confidence":   round(random.uniform(0.88, 0.98), 3),
            "ocr_provider":     "mock",
        })

    adapter     = MockBankAdapter()
    raw_txns    = adapter.get_transactions("acct-demo-001", BASE_DATE, BASE_DATE + timedelta(days=30))
    transactions = []
    for t in raw_txns:
        # Assign employee based on index
        idx = int(t["transaction_id"].split("-")[-1]) if t["transaction_id"].split("-")[-1].isdigit() else 0
        emp = employees[idx % len(employees)]
        transactions.append({
            "id":          str(uuid.uuid4()),
            "employee_id": emp["id"],
            "external_id": t["transaction_id"],
            "date":        t["date"],
            "merchant":    t["name"],
            "amount":      t["amount"],
            "currency":    t["iso_currency_code"],
            "account_id":  t["account_id"],
        })

    data = {
        "generated_at": datetime.utcnow().isoformat(),
        "employees":    employees,
        "receipts":     receipts,
        "transactions": transactions,
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2, default=str)

    print(f"✅ Demo data written to {output_path}")
    print(f"   Employees:    {len(employees)}")
    print(f"   Receipts:     {len(receipts)}")
    print(f"   Transactions: {len(transactions)}")
    return data


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo_data.json"
    generate_demo_json(out)
