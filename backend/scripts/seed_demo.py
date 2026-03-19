"""
ExpensIQ — Demo data seeder.
Inserts sample employees and receipts into the database.

Usage: python -m scripts.seed_demo
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime
from app.db.session import SessionLocal
from app.models.models import Employee, Receipt
from app.services.categorizer import ExpenseCategorizer

DEMO_EMPLOYEES = [
    {"name": "Ana García López",     "email": "ana@empresa.com",    "department": "Ventas",     "role": "employee",  "monthly_budget": 1000.0},
    {"name": "Carlos Ruiz Martín",   "email": "carlos@empresa.com", "department": "Marketing",  "role": "manager",   "monthly_budget": 1500.0},
    {"name": "Elena Torres Vega",    "email": "elena@empresa.com",  "department": "Ingeniería", "role": "employee",  "monthly_budget": 800.0},
    {"name": "Miguel Fernández Díaz","email": "miguel@empresa.com", "department": "Dirección",  "role": "admin",     "monthly_budget": 2000.0},
    {"name": "Lucía Moreno Sanz",    "email": "lucia@empresa.com",  "department": "Operaciones","role": "employee",  "monthly_budget": 900.0},
]

DEMO_RECEIPTS = [
    {"merchant": "Uber",                    "date": "2025-01-15", "amount": 23.50,  "currency": "EUR", "tax": 4.93},
    {"merchant": "Restaurant El Buen Sabor","date": "2025-01-16", "amount": 45.00,  "currency": "EUR", "tax": 9.45},
    {"merchant": "Hotel Ibis Madrid",       "date": "2025-01-17", "amount": 89.00,  "currency": "EUR", "tax": 18.69},
    {"merchant": "Amazon.es",               "date": "2025-01-18", "amount": 156.80, "currency": "EUR", "tax": 32.93},
    {"merchant": "Ryanair",                 "date": "2025-01-19", "amount": 67.30,  "currency": "EUR", "tax": 14.13},
    {"merchant": "Starbucks",               "date": "2025-01-20", "amount": 8.90,   "currency": "EUR", "tax": 1.87},
    {"merchant": "Cabify",                  "date": "2025-01-21", "amount": 15.40,  "currency": "EUR", "tax": 3.23},
    {"merchant": "Office Depot",            "date": "2025-01-22", "amount": 234.50, "currency": "EUR", "tax": 49.25},
    {"merchant": "Booking.com",             "date": "2025-01-23", "amount": 120.00, "currency": "EUR", "tax": 25.20},
    {"merchant": "Deliveroo",               "date": "2025-01-24", "amount": 32.50,  "currency": "EUR", "tax": 6.83},
    {"merchant": "Renfe",                   "date": "2025-01-25", "amount": 45.60,  "currency": "EUR", "tax": 9.58},
    {"merchant": "Netflix",                 "date": "2025-01-26", "amount": 17.99,  "currency": "EUR", "tax": 3.78},
    {"merchant": "Lidl",                    "date": "2025-01-27", "amount": 42.30,  "currency": "EUR", "tax": 8.88},
    {"merchant": "Parking Saba",            "date": "2025-01-28", "amount": 12.00,  "currency": "EUR", "tax": 2.52},
    {"merchant": "Vodafone",                "date": "2025-01-29", "amount": 39.99,  "currency": "EUR", "tax": 8.40},
    {"merchant": "Hertz Rent a Car",        "date": "2025-01-30", "amount": 185.00, "currency": "EUR", "tax": 38.85},
    {"merchant": "IKEA",                    "date": "2025-01-31", "amount": 95.40,  "currency": "EUR", "tax": 20.03},
    {"merchant": "Spotify",                 "date": "2025-02-01", "amount": 9.99,   "currency": "EUR", "tax": 2.10},
    # High-value receipt for policy violation alert
    {"merchant": "Marriott Barcelona",      "date": "2025-02-02", "amount": 650.00, "currency": "EUR", "tax": 136.50},
    # Duplicate for anomaly detection
    {"merchant": "Uber",                    "date": "2025-01-15", "amount": 23.50,  "currency": "EUR", "tax": 4.93},
]


def seed():
    db = SessionLocal()
    categorizer = ExpenseCategorizer()

    try:
        # Check if data already exists
        if db.query(Employee).count() > 0:
            print("Database already has data. Skipping seed.")
            return

        # Insert employees
        employees = []
        for emp_data in DEMO_EMPLOYEES:
            emp = Employee(**emp_data)
            db.add(emp)
            employees.append(emp)
        db.flush()  # Get IDs

        # Insert receipts (round-robin assignment to employees)
        for i, rec_data in enumerate(DEMO_RECEIPTS):
            employee = employees[i % len(employees)]
            receipt = Receipt(
                employee_id=employee.id,
                merchant=rec_data["merchant"],
                date=date.fromisoformat(rec_data["date"]),
                amount=rec_data["amount"],
                currency=rec_data["currency"],
                tax=rec_data["tax"],
                category=categorizer.categorize(rec_data["merchant"]),
                status="pending",
                ocr_confidence=0.92,
                ocr_provider="mock",
                ocr_processed_at=datetime.utcnow(),
            )
            db.add(receipt)

        db.commit()
        print(f"Seeded {len(employees)} employees and {len(DEMO_RECEIPTS)} receipts.")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
