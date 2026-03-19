"""ExpensIQ — Bank transaction routes."""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, BankTransaction, Employee, Match, Receipt
from app.schemas.schemas import ReconcileResult, SyncResult, TransactionOut

logger = logging.getLogger("expensiq.transactions")

router = APIRouter()

# ── Mock bank data (adapted from demo_data_loader.py) ─────────────

MOCK_TRANSACTIONS = [
    {"external_id": "TXN-001", "date": "2025-01-15", "merchant": "Uber",            "amount": 23.50,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-002", "date": "2025-01-16", "merchant": "Restaurant El Buen Sabor", "amount": 45.00, "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-003", "date": "2025-01-17", "merchant": "Hotel Ibis Madrid", "amount": 89.00, "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-004", "date": "2025-01-18", "merchant": "Amazon.es",        "amount": 156.80, "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-005", "date": "2025-01-19", "merchant": "Ryanair",          "amount": 67.30,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-006", "date": "2025-01-20", "merchant": "Starbucks",        "amount": 8.90,   "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-007", "date": "2025-01-21", "merchant": "Cabify",           "amount": 15.40,  "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-008", "date": "2025-01-22", "merchant": "Office Depot",     "amount": 234.50, "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-009", "date": "2025-01-23", "merchant": "Booking.com",      "amount": 120.00, "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-010", "date": "2025-01-24", "merchant": "Deliveroo",        "amount": 32.50,  "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-011", "date": "2025-01-25", "merchant": "Renfe",            "amount": 45.60,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-012", "date": "2025-01-26", "merchant": "Netflix",          "amount": 17.99,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-013", "date": "2025-01-27", "merchant": "Lidl",             "amount": 42.30,  "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-014", "date": "2025-01-28", "merchant": "Parking Saba",     "amount": 12.00,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-015", "date": "2025-01-29", "merchant": "Vodafone",         "amount": 39.99,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-016", "date": "2025-01-30", "merchant": "Hertz Rent",       "amount": 185.00, "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-017", "date": "2025-01-31", "merchant": "IKEA",             "amount": 95.40,  "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-018", "date": "2025-02-01", "merchant": "Spotify",          "amount": 9.99,   "currency": "EUR", "account_id": "ES12-3456"},
    # Orphan transactions (no matching receipt expected)
    {"external_id": "TXN-019", "date": "2025-02-02", "merchant": "Unknown Shop A",   "amount": 55.00,  "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-020", "date": "2025-02-03", "merchant": "Mystery Store B",  "amount": 120.00, "currency": "EUR", "account_id": "ES34-7890"},
    {"external_id": "TXN-021", "date": "2025-02-04", "merchant": "Cash Withdrawal",  "amount": 200.00, "currency": "EUR", "account_id": "ES12-3456"},
    {"external_id": "TXN-022", "date": "2025-02-05", "merchant": "Wire Transfer",    "amount": 500.00, "currency": "EUR", "account_id": "ES34-7890"},
]


@router.get("/", response_model=list[TransactionOut])
def list_transactions(limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(BankTransaction)
        .order_by(BankTransaction.date.desc())
        .limit(limit)
        .all()
    )


@router.post("/sync-mock", response_model=SyncResult)
def sync_mock_transactions(db: Session = Depends(get_db)):
    """Import mock bank transactions (simulates Plaid/Tink sync)."""
    created = 0
    skipped = 0

    # Get employees to assign transactions to
    employees = db.query(Employee).all()

    for i, txn_data in enumerate(MOCK_TRANSACTIONS):
        existing = db.query(BankTransaction).filter(
            BankTransaction.external_id == txn_data["external_id"]
        ).first()
        if existing:
            skipped += 1
            continue

        # Round-robin assign to employees
        employee = employees[i % len(employees)] if employees else None

        txn = BankTransaction(
            external_id=txn_data["external_id"],
            date=txn_data["date"],
            merchant=txn_data["merchant"],
            amount=txn_data["amount"],
            currency=txn_data["currency"],
            account_id=txn_data["account_id"],
            employee_id=employee.id if employee else None,
        )
        db.add(txn)
        created += 1

    db.commit()
    logger.info("Mock sync complete: %d created, %d skipped", created, skipped)
    return SyncResult(created=created, skipped=skipped)


@router.post("/reconcile-all", response_model=ReconcileResult)
def reconcile_all(db: Session = Depends(get_db)):
    """Run reconciliation engine on all pending/review receipts."""
    from app.services.reconciliation import reconciliation_engine

    receipts = db.query(Receipt).filter(
        Receipt.status.in_(["pending", "review"])
    ).all()

    total_matches = 0
    for receipt in receipts:
        total_matches += reconciliation_engine.reconcile_receipt(db, receipt)

    # Run anomaly detection
    from app.services.categorizer import AnomalyDetector

    all_receipts = db.query(Receipt).all()
    all_transactions = db.query(BankTransaction).all()
    all_matches = db.query(Match).all()

    detector = AnomalyDetector()
    anomalies = detector.detect(all_receipts, all_transactions, all_matches)

    alerts_created = 0
    for anomaly in anomalies:
        # Avoid duplicate alerts
        existing = db.query(Alert).filter(
            Alert.alert_type == anomaly.alert_type,
            Alert.description == anomaly.description,
            Alert.resolved == False,
        ).first()
        if not existing:
            alert = Alert(
                employee_id=anomaly.employee_id if anomaly.employee_id != "unknown" else None,
                receipt_id=anomaly.receipt_id,
                alert_type=anomaly.alert_type,
                description=anomaly.description,
            )
            db.add(alert)
            alerts_created += 1

    db.commit()
    logger.info("Reconciliation: %d receipts, %d matches, %d alerts",
                len(receipts), total_matches, alerts_created)

    return ReconcileResult(
        receipts_processed=len(receipts),
        matches_created=total_matches,
        alerts_created=alerts_created,
    )
