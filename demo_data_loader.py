"""
ExpensIQ — Demo Data Loader (Phase E — Spanish context, relative dates)

Run: python demo_data_loader.py [output.json]

Generates:
  - 8 employees (Spanish names, Spanish departments)
  - ~90 receipts spanning last 6 months
  - ~55 bank transactions (including orphans)
  - Intentional anomalies for AI detection testing
  - Budget overruns for 2 employees
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
    {"name": "Ana Garcia Lopez",       "email": "ana@empresa.com",       "department": "Ventas",       "role": "employee", "monthly_budget": 800.0},
    {"name": "Carlos Ruiz Martin",     "email": "carlos@empresa.com",    "department": "Marketing",    "role": "manager",  "monthly_budget": 1200.0},
    {"name": "Elena Torres Vega",      "email": "elena@empresa.com",     "department": "Ingenieria",   "role": "employee", "monthly_budget": 600.0},
    {"name": "Miguel Fernandez Diaz",  "email": "miguel@empresa.com",    "department": "Direccion",    "role": "admin",    "monthly_budget": 2000.0},
    {"name": "Lucia Moreno Sanz",      "email": "lucia@empresa.com",     "department": "Operaciones",  "role": "employee", "monthly_budget": 900.0},
    {"name": "Pablo Navarro Ruiz",     "email": "pablo@empresa.com",     "department": "Ventas",       "role": "employee", "monthly_budget": 1000.0},
    {"name": "Maria Jimenez Castro",   "email": "maria@empresa.com",     "department": "Marketing",    "role": "employee", "monthly_budget": 700.0},
    {"name": "Javier Ortega Blanco",   "email": "javier@empresa.com",    "department": "Ingenieria",   "role": "manager",  "monthly_budget": 1500.0},
]

# Relative 6-month window
END_DATE = date.today()
START_DATE = END_DATE - timedelta(days=180)

RECEIPT_TEMPLATES = [
    # (merchant, amount_range, currency, tax_rate, category)
    ("Cabify",                   (12, 35),    "EUR", 0.21, "transport"),
    ("Restaurante Casa Pepe",    (25, 65),    "EUR", 0.10, "meals"),
    ("Hotel NH Madrid",          (110, 220),  "EUR", 0.10, "lodging"),
    ("Cafeteria La Oficina",     (6, 15),     "EUR", 0.10, "meals"),
    ("El Corte Ingles",          (30, 180),   "EUR", 0.21, "supplies"),
    ("Renfe AVE",                (45, 160),   "EUR", 0.10, "transport"),
    ("Glovo",                    (12, 35),    "EUR", 0.10, "meals"),
    ("Leroy Merlin",             (25, 90),    "EUR", 0.21, "supplies"),
    ("Uber Espana",              (8, 28),     "EUR", 0.21, "transport"),
    ("Parador de Toledo",        (150, 300),  "EUR", 0.10, "lodging"),
    ("Mercadona",                (20, 60),    "EUR", 0.04, "meals"),
    ("Iberia Express",           (60, 200),   "EUR", 0.10, "transport"),
    ("Asador El Molino",         (35, 85),    "EUR", 0.10, "meals"),
    ("Europcar Bilbao",          (80, 200),   "EUR", 0.21, "transport"),
    ("Hotel Barcelo Bilbao",     (120, 260),  "EUR", 0.10, "lodging"),
    ("Amazon.es",                (15, 120),   "EUR", 0.21, "supplies"),
    ("Telepizza",                (10, 25),    "EUR", 0.10, "meals"),
    ("Repsol Gasolinera",        (35, 75),    "EUR", 0.21, "transport"),
    ("Telefonica Movistar",      (30, 55),    "EUR", 0.21, "utilities"),
    ("Iberdrola",                (70, 140),   "EUR", 0.21, "utilities"),
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
    if delta <= 0:
        return start
    return start + timedelta(days=random.randint(0, delta))


def get_months_in_range(start: date, end: date):
    """Return list of (year, month) tuples covering the range."""
    months = []
    current = start.replace(day=1)
    while current <= end:
        months.append((current.year, current.month))
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


def generate_demo_json(output_path: str = "demo_data.json"):
    random.seed(42)

    employees = []
    for e in EMPLOYEES:
        emp = {"id": str(uuid.uuid4()), **e}
        employees.append(emp)

    receipts = []
    receipt_idx = 0

    months = get_months_in_range(START_DATE, END_DATE)

    # ── Normal receipts (~70) ─────────────────────────────────────
    for year, month in months:
        month_start = date(year, month, 1)
        # End at 27 or END_DATE, whichever is earlier
        month_end = min(month_start + timedelta(days=27), END_DATE)
        if month_end < month_start:
            continue

        num_receipts = random.randint(10, 14)
        for _ in range(num_receipts):
            emp = random.choice(employees)
            tmpl = random.choice(RECEIPT_TEMPLATES)
            merchant, (amt_low, amt_high), currency, tax_rate, category = tmpl
            amount = round(random.uniform(amt_low, amt_high), 2)
            tax = round(amount * tax_rate, 2)
            r_date = random_date_in_range(month_start, month_end)

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

    # ── BUDGET OVERRUN: Pablo Navarro (budget 1000) ──────────────
    pablo = employees[5]  # Pablo Navarro Ruiz
    recent_months = months[-2:]  # Last 2 months
    for year, month in recent_months:
        month_start = date(year, month, 1)
        month_end = min(month_start + timedelta(days=27), END_DATE)
        if month_end < month_start:
            continue
        for _ in range(6):
            tmpl = random.choice([t for t in RECEIPT_TEMPLATES if t[4] in ("meals", "transport")])
            merchant, (amt_low, amt_high), currency, tax_rate, category = tmpl
            amount = round(random.uniform(amt_high * 0.7, amt_high * 1.2), 2)
            tax = round(amount * tax_rate, 2)
            r_date = random_date_in_range(month_start, month_end)
            receipts.append({
                "id": str(uuid.uuid4()),
                "employee_id": pablo["id"],
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
                "status": "matched",
                "ocr_confidence": round(random.uniform(0.85, 0.97), 3),
                "ocr_provider": "mock",
                "payment_method": "card",
                "approval_level": calc_approval_level(amount),
            })
            receipt_idx += 1

    # ── BUDGET OVERRUN: Maria Jimenez (budget 700) ───────────────
    maria = employees[6]  # Maria Jimenez Castro
    for year, month in recent_months:
        month_start = date(year, month, 1)
        month_end = min(month_start + timedelta(days=27), END_DATE)
        if month_end < month_start:
            continue
        for _ in range(5):
            tmpl = random.choice([t for t in RECEIPT_TEMPLATES if t[4] in ("meals", "supplies")])
            merchant, (amt_low, amt_high), currency, tax_rate, category = tmpl
            amount = round(random.uniform(amt_high * 0.6, amt_high * 1.1), 2)
            tax = round(amount * tax_rate, 2)
            r_date = random_date_in_range(month_start, month_end)
            receipts.append({
                "id": str(uuid.uuid4()),
                "employee_id": maria["id"],
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
                "status": "matched",
                "ocr_confidence": round(random.uniform(0.84, 0.96), 3),
                "ocr_provider": "mock",
                "payment_method": random.choice(["card", "card", "cash"]),
                "approval_level": calc_approval_level(amount),
            })
            receipt_idx += 1

    # ── ANOMALY: Policy violation (>500 EUR) ──────────────────────
    anomaly_date = END_DATE - timedelta(days=30)
    anomaly_emp = employees[5]  # Pablo, ventas
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": anomaly_emp["id"],
        "upload_timestamp": datetime.combine(anomaly_date, datetime.min.time().replace(hour=14, minute=30)).isoformat(),
        "image_url": "https://demo.expensiq.local/receipts/anomaly_policy.jpg",
        "merchant": "Sala VIP Bernabeu",
        "date": anomaly_date.isoformat(),
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
    rapid_date = END_DATE - timedelta(days=55)
    rapid_emp = employees[2]  # Elena, ingenieria
    for i in range(3):
        amt = round(random.uniform(15, 35), 2)
        receipts.append({
            "id": str(uuid.uuid4()),
            "employee_id": rapid_emp["id"],
            "upload_timestamp": datetime.combine(rapid_date, datetime.min.time().replace(hour=9 + i * 3, minute=15)).isoformat(),
            "image_url": f"https://demo.expensiq.local/receipts/rapid_{i}.jpg",
            "merchant": "Cabify",
            "date": rapid_date.isoformat(),
            "amount": amt,
            "currency": "EUR",
            "tax": round(amt * 0.21, 2),
            "category": "transport",
            "status": "review",
            "ocr_confidence": 0.91,
            "ocr_provider": "mock",
            "payment_method": "card",
            "approval_level": calc_approval_level(amt),
        })

    # ── ANOMALY: Duplicate receipts ───────────────────────────────
    dup_date = END_DATE - timedelta(days=90)
    dup_emp = employees[0]  # Ana
    dup_id1 = str(uuid.uuid4())
    dup_id2 = str(uuid.uuid4())
    for dup_id in [dup_id1, dup_id2]:
        receipts.append({
            "id": dup_id,
            "employee_id": dup_emp["id"],
            "upload_timestamp": datetime.combine(dup_date, datetime.min.time().replace(hour=11)).isoformat(),
            "image_url": "https://demo.expensiq.local/receipts/dup.jpg",
            "merchant": "Cafeteria La Oficina",
            "date": dup_date.isoformat(),
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
    # Find a recent Saturday
    weekend_date = END_DATE - timedelta(days=15)
    while weekend_date.weekday() != 5:  # Saturday
        weekend_date -= timedelta(days=1)
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": employees[5]["id"],  # Pablo
        "upload_timestamp": datetime.combine(weekend_date, datetime.min.time().replace(hour=23, minute=45)).isoformat(),
        "image_url": "https://demo.expensiq.local/receipts/weekend.jpg",
        "merchant": "Discoteca Opium Madrid",
        "date": weekend_date.isoformat(),
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
    low_ocr_date = END_DATE - timedelta(days=70)
    receipts.append({
        "id": str(uuid.uuid4()),
        "employee_id": employees[6]["id"],  # Maria
        "upload_timestamp": datetime.combine(low_ocr_date, datetime.min.time().replace(hour=10)).isoformat(),
        "image_url": "https://demo.expensiq.local/receipts/blurry.jpg",
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
            "external_id": f"RK-{i:04d}",
            "date": txn_date.isoformat(),
            "merchant": r["merchant"],
            "amount": round(r["amount"] + noise_amount, 2),
            "currency": r["currency"],
            "account_id": "ES83-3008-0001",
        })

    # Orphan transactions (no receipt)
    orphans = [
        ("Netflix Espana",       12.99, "EUR"),
        ("AWS Cloud Services",   89.00, "EUR"),
        ("Spotify Premium",       9.99, "EUR"),
        ("Google Workspace",     12.00, "EUR"),
        ("Movistar Fusion",      45.00, "EUR"),
    ]
    for i, (merchant, amount, currency) in enumerate(orphans):
        transactions.append({
            "id": str(uuid.uuid4()),
            "employee_id": random.choice(employees)["id"],
            "external_id": f"RK-ORPHAN-{i:04d}",
            "date": random_date_in_range(START_DATE, END_DATE).isoformat(),
            "merchant": merchant,
            "amount": amount,
            "currency": currency,
            "account_id": "ES83-3008-0001",
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
    print(f"   Budget overruns: Pablo Navarro, Maria Jimenez")
    return data


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo_data.json"
    generate_demo_json(out)
