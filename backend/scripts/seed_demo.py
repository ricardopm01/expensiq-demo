"""
ExpensIQ — Demo data seeder (Phase E — Spanish context, relative dates).

Inserts employees, receipts, bank transactions, matches, and alerts.
Includes real client data: Hotel Santo Mauro receipt, Rural Kutxa extract.

Usage:
  python -m scripts.seed_demo       (standalone)
  POST /api/v1/demo/seed            (via API)
"""

import sys
import os
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.models import Alert, BankTransaction, Employee, Match, Receipt
from app.services.categorizer import ExpenseCategorizer

# ─────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────

TODAY = date.today()
START_DATE = TODAY - timedelta(days=180)

DEMO_EMPLOYEES = [
    {"name": "Ana Garcia Lopez",       "email": "ana@empresa.com",       "department": "Ventas",       "role": "employee", "monthly_budget": 800.0},
    {"name": "Carlos Ruiz Martin",     "email": "carlos@empresa.com",    "department": "Marketing",    "role": "manager",  "monthly_budget": 1200.0},
    {"name": "Elena Torres Vega",      "email": "elena@empresa.com",     "department": "Ingenieria",   "role": "employee", "monthly_budget": 600.0},
    {"name": "Miguel Fernandez Diaz",  "email": "miguel@empresa.com",    "department": "Direccion",    "role": "admin",    "monthly_budget": 2000.0},
    {"name": "Lucia Moreno Sanz",      "email": "lucia@empresa.com",     "department": "Operaciones",  "role": "employee", "monthly_budget": 900.0},
    {"name": "Pablo Navarro Ruiz",     "email": "pablo@empresa.com",     "department": "Ventas",       "role": "employee", "monthly_budget": 1000.0},
    {"name": "Maria Jimenez Castro",   "email": "maria@empresa.com",     "department": "Marketing",    "role": "employee", "monthly_budget": 700.0},
    {"name": "Javier Ortega Blanco",   "email": "javier@empresa.com",    "department": "Ingenieria",   "role": "manager",  "monthly_budget": 1500.0},
]

# (merchant, amount_range, currency, tax_rate, category)
RECEIPT_TEMPLATES = [
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


def _approval_level(amount):
    if amount is None or amount < 100:
        return "auto"
    return "admin"


def _rand_date(start, end):
    delta = (end - start).days
    if delta <= 0:
        return start
    return start + timedelta(days=random.randint(0, delta))


def _get_months(start, end):
    months = []
    cur = start.replace(day=1)
    while cur <= end:
        months.append((cur.year, cur.month))
        if cur.month == 12:
            cur = cur.replace(year=cur.year + 1, month=1)
        else:
            cur = cur.replace(month=cur.month + 1)
    return months


def seed():
    random.seed(42)
    db = SessionLocal()
    categorizer = ExpenseCategorizer()

    try:
        # Check if data already exists
        if db.query(Employee).count() > 0:
            print("Database already has data. Skipping seed.")
            return {"status": "skipped", "message": "Database already has data"}

        # ── Employees ─────────────────────────────────────────────
        employees = []
        for emp_data in DEMO_EMPLOYEES:
            emp = Employee(**emp_data)
            db.add(emp)
            employees.append(emp)
        db.flush()
        print(f"  Employees: {len(employees)}")

        # ── Normal receipts (~70) ─────────────────────────────────
        receipts = []
        months = _get_months(START_DATE, TODAY)

        for year, month in months:
            m_start = date(year, month, 1)
            m_end = min(m_start + timedelta(days=27), TODAY)
            if m_end < m_start:
                continue

            for _ in range(random.randint(10, 14)):
                emp = random.choice(employees)
                merchant, (lo, hi), cur, tax_rate, cat = random.choice(RECEIPT_TEMPLATES)
                amount = round(random.uniform(lo, hi), 2)
                tax = round(amount * tax_rate, 2)
                r_date = _rand_date(m_start, m_end)
                conf = round(random.uniform(0.82, 0.98), 3)
                status = random.choices(["pending", "matched", "review"], weights=[0.3, 0.5, 0.2])[0]

                receipt = Receipt(
                    employee_id=emp.id,
                    merchant=merchant,
                    date=r_date,
                    amount=amount,
                    currency=cur,
                    tax=tax,
                    category=cat,
                    status=status,
                    ocr_confidence=conf,
                    ocr_provider="mock",
                    ocr_processed_at=datetime.utcnow(),
                    payment_method=random.choice(["card", "card", "card", "cash", "transfer"]),
                    approval_level=_approval_level(amount),
                    image_url=f"https://demo.expensiq.local/receipts/sample_{len(receipts)+1:03d}.jpg",
                )
                db.add(receipt)
                receipts.append(receipt)

        # ── Budget overruns: Pablo (idx 5) ────────────────────────
        pablo = employees[5]
        for year, month in months[-2:]:
            m_start = date(year, month, 1)
            m_end = min(m_start + timedelta(days=27), TODAY)
            if m_end < m_start:
                continue
            for _ in range(6):
                tmpl = random.choice([t for t in RECEIPT_TEMPLATES if t[4] in ("meals", "transport")])
                merchant, (lo, hi), cur, tax_rate, cat = tmpl
                amount = round(random.uniform(hi * 0.7, hi * 1.2), 2)
                tax = round(amount * tax_rate, 2)
                r_date = _rand_date(m_start, m_end)
                receipt = Receipt(
                    employee_id=pablo.id, merchant=merchant, date=r_date,
                    amount=amount, currency=cur, tax=tax, category=cat,
                    status="matched", ocr_confidence=round(random.uniform(0.85, 0.97), 3),
                    ocr_provider="mock", ocr_processed_at=datetime.utcnow(),
                    payment_method="card", approval_level=_approval_level(amount),
                )
                db.add(receipt)
                receipts.append(receipt)

        # ── Budget overruns: Maria (idx 6) ────────────────────────
        maria = employees[6]
        for year, month in months[-2:]:
            m_start = date(year, month, 1)
            m_end = min(m_start + timedelta(days=27), TODAY)
            if m_end < m_start:
                continue
            for _ in range(5):
                tmpl = random.choice([t for t in RECEIPT_TEMPLATES if t[4] in ("meals", "supplies")])
                merchant, (lo, hi), cur, tax_rate, cat = tmpl
                amount = round(random.uniform(hi * 0.6, hi * 1.1), 2)
                tax = round(amount * tax_rate, 2)
                r_date = _rand_date(m_start, m_end)
                receipt = Receipt(
                    employee_id=maria.id, merchant=merchant, date=r_date,
                    amount=amount, currency=cur, tax=tax, category=cat,
                    status="matched", ocr_confidence=round(random.uniform(0.84, 0.96), 3),
                    ocr_provider="mock", ocr_processed_at=datetime.utcnow(),
                    payment_method=random.choice(["card", "card", "cash"]),
                    approval_level=_approval_level(amount),
                )
                db.add(receipt)
                receipts.append(receipt)

        # ── CLIENT REAL DATA: Hotel Santo Mauro receipt ───────────
        santo_mauro_date = TODAY - timedelta(days=10)
        santo_mauro = Receipt(
            employee_id=pablo.id,
            merchant="Hotel Santo Mauro Madrid",
            date=santo_mauro_date,
            amount=Decimal("90.00"),
            currency="EUR",
            tax=Decimal("8.18"),
            category="meals",
            status="pending",
            ocr_confidence=Decimal("0.96"),
            ocr_provider="mock",
            ocr_processed_at=datetime.utcnow(),
            payment_method="cash",
            approval_level="auto",
            image_url="/static/receipts/hotel_santo_mauro.jpeg",
            line_items='[{"description": "5x Champagne Laurent Perrier Cuvee", "amount": 90.00}]',
            notes="Recibo real del cliente — Hotel Santo Mauro, Calle de Zurbano 36, Madrid",
        )
        db.add(santo_mauro)
        receipts.append(santo_mauro)

        # ── ANOMALY: Policy violation (>500 EUR) ──────────────────
        anomaly_date = TODAY - timedelta(days=30)
        receipts.append(_add_receipt(db, pablo, "Sala VIP Bernabeu", anomaly_date,
            1250.00, 113.64, "entertainment", "flagged", 0.94, "director"))

        # ── ANOMALY: Rapid repeat (3x Cabify in 24h) ─────────────
        rapid_date = TODAY - timedelta(days=55)
        elena = employees[2]
        for i in range(3):
            amt = round(random.uniform(15, 35), 2)
            receipts.append(_add_receipt(db, elena, "Cabify", rapid_date,
                amt, round(amt * 0.21, 2), "transport", "review", 0.91, _approval_level(amt)))

        # ── ANOMALY: Duplicate receipts ───────────────────────────
        dup_date = TODAY - timedelta(days=90)
        ana = employees[0]
        for _ in range(2):
            receipts.append(_add_receipt(db, ana, "Cafeteria La Oficina", dup_date,
                14.80, 1.35, "meals", "pending", 0.95, "auto"))

        # ── ANOMALY: Weekend expense ──────────────────────────────
        weekend = TODAY - timedelta(days=15)
        while weekend.weekday() != 5:
            weekend -= timedelta(days=1)
        receipts.append(_add_receipt(db, pablo, "Discoteca Opium Madrid", weekend,
            385.00, 35.00, "entertainment", "review", 0.72, "manager", "cash"))

        # ── ANOMALY: Low OCR ──────────────────────────────────────
        low_ocr_date = TODAY - timedelta(days=70)
        r = Receipt(
            employee_id=maria.id, merchant=None, date=None,
            amount=None, currency="EUR", tax=None, category="other",
            status="flagged", ocr_confidence=Decimal("0.18"), ocr_provider="mock",
            ocr_processed_at=datetime.utcnow(), approval_level="auto",
        )
        db.add(r)
        receipts.append(r)

        db.flush()
        print(f"  Receipts: {len(receipts)}")

        # ── Bank Transactions ─────────────────────────────────────
        transactions = []
        matched = [r for r in receipts if r.amount and r.status != "flagged"]
        for i, r in enumerate(matched[:50]):
            noise_days = random.choice([-1, 0, 0, 0, 1])
            noise_amt = random.choice([0.0, 0.0, 0.0, 0.5, -0.3])
            txn_date = r.date + timedelta(days=noise_days)
            txn = BankTransaction(
                employee_id=r.employee_id,
                external_id=f"RK-{i:04d}",
                date=txn_date,
                merchant=r.merchant,
                amount=round(float(r.amount) + noise_amt, 2),
                currency=r.currency,
                account_id="ES83-3008-0001",
            )
            db.add(txn)
            transactions.append((txn, r))

        # Rural Kutxa extract transactions (from client's real bank extract)
        kutxa_txns = [
            (TODAY - timedelta(days=12), "Hotel Santo Mauro Madrid",  90.00),
            (TODAY - timedelta(days=14), "Renfe Billete AVE",         85.60),
            (TODAY - timedelta(days=18), "Parking APK2 Madrid",       12.50),
            (TODAY - timedelta(days=20), "Telepizza Domicilio",       22.90),
            (TODAY - timedelta(days=25), "Gasolinera Repsol A6",      55.40),
            (TODAY - timedelta(days=28), "Farmacia Cruz Verde",       18.75),
        ]
        for i, (d, m, a) in enumerate(kutxa_txns):
            txn = BankTransaction(
                employee_id=random.choice(employees).id,
                external_id=f"RK-KUTXA-{i:04d}",
                date=d, merchant=m, amount=a, currency="EUR",
                account_id="ES83-3008-0042",
            )
            db.add(txn)

        # Orphans
        orphans = [
            ("Netflix Espana", 12.99), ("AWS Cloud Services", 89.00),
            ("Spotify Premium", 9.99), ("Google Workspace", 12.00),
            ("Movistar Fusion", 45.00),
        ]
        for i, (m, a) in enumerate(orphans):
            txn = BankTransaction(
                employee_id=random.choice(employees).id,
                external_id=f"RK-ORPHAN-{i:04d}",
                date=_rand_date(START_DATE, TODAY),
                merchant=m, amount=a, currency="EUR",
                account_id="ES83-3008-0001",
            )
            db.add(txn)

        db.flush()
        total_txns = len(transactions) + len(kutxa_txns) + len(orphans)
        print(f"  Transactions: {total_txns}")

        # ── Matches (auto-match some receipt↔transaction pairs) ───
        match_count = 0
        for txn, r in transactions[:35]:
            m = Match(
                receipt_id=r.id,
                transaction_id=txn.id,
                confidence=round(random.uniform(0.65, 0.98), 3),
                match_method="fuzzy_auto",
            )
            db.add(m)
            if r.status == "pending":
                r.status = "matched"
            match_count += 1
        print(f"  Matches: {match_count}")

        # ── Alerts ────────────────────────────────────────────────
        alerts_data = [
            (pablo.id, "policy_violation", "Gasto de 1.250 EUR en Sala VIP Bernabeu excede limite de 500 EUR", "high"),
            (elena.id, "rapid_repeat", "3 gastos en Cabify en menos de 24 horas", "medium"),
            (ana.id, "duplicate_receipt", "Recibo duplicado: Cafeteria La Oficina, 14.80 EUR", "medium"),
            (pablo.id, "policy_violation", "Gasto de 385 EUR en Discoteca Opium en fin de semana (sabado noche)", "high"),
            (maria.id, "no_match", "Recibo con OCR ilegible — sin datos extraidos (confianza 18%)", "low"),
            (pablo.id, "policy_violation", "Pablo Navarro supera presupuesto mensual de 1.000 EUR", "high"),
            (maria.id, "policy_violation", "Maria Jimenez supera presupuesto mensual de 700 EUR", "medium"),
        ]
        for emp_id, atype, desc, sev in alerts_data:
            db.add(Alert(
                employee_id=emp_id, alert_type=atype,
                description=desc, severity=sev,
            ))
        print(f"  Alerts: {len(alerts_data)}")

        db.commit()
        summary = {
            "status": "ok",
            "employees": len(employees),
            "receipts": len(receipts),
            "transactions": total_txns,
            "matches": match_count,
            "alerts": len(alerts_data),
        }
        print(f"Seed complete: {summary}")
        return summary

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


def _add_receipt(db, emp, merchant, r_date, amount, tax, cat, status, conf, level, pay="card"):
    r = Receipt(
        employee_id=emp.id, merchant=merchant, date=r_date,
        amount=amount, currency="EUR", tax=tax, category=cat,
        status=status, ocr_confidence=conf, ocr_provider="mock",
        ocr_processed_at=datetime.utcnow(), payment_method=pay,
        approval_level=level,
    )
    db.add(r)
    return r


if __name__ == "__main__":
    seed()
