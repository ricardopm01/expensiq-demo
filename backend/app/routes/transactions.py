"""ExpensIQ — Bank transaction routes."""

import logging
import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, BankTransaction, Employee, Match, Receipt
from app.schemas.schemas import (
    ImportPreviewResult,
    ImportPreviewRow,
    ImportResult,
    ReconcileResult,
    SyncResult,
    TransactionOut,
)

logger = logging.getLogger("expensiq.transactions")

router = APIRouter()

# ── Mock bank data (relative dates, Spanish merchants) ────────────


def _build_mock_txns():
    """Generate mock transactions with dates relative to today."""
    today = date.today()
    acct = "ES83-3008-0001"
    acct2 = "ES83-3008-0042"
    base = [
        (-90, "Cabify",                23.50),
        (-88, "Restaurante Casa Pepe", 45.00),
        (-85, "Hotel NH Madrid",       189.00),
        (-82, "Amazon.es",             156.80),
        (-78, "Iberia Express",        67.30),
        (-75, "Cafeteria La Oficina",  8.90),
        (-72, "Uber Espana",           15.40),
        (-68, "El Corte Ingles",       134.50),
        (-65, "Hotel Barcelo Bilbao",  220.00),
        (-60, "Glovo",                 32.50),
        (-55, "Renfe AVE",             95.60),
        (-50, "Netflix Espana",        17.99),
        (-47, "Mercadona",             42.30),
        (-44, "Repsol Gasolinera",     52.00),
        (-40, "Telefonica Movistar",   39.99),
        (-36, "Europcar Bilbao",       185.00),
        (-32, "Leroy Merlin",          95.40),
        (-28, "Spotify Premium",        9.99),
        (-24, "Asador El Molino",      62.00),
        (-20, "Parador de Toledo",     245.00),
        (-16, "Telepizza",             18.50),
        (-12, "Iberdrola",             98.00),
        (-8,  "Cabify",                19.80),
        (-5,  "Restaurante Casa Pepe", 55.00),
        (-3,  "Amazon.es",             42.90),
        (-1,  "Cafeteria La Oficina",  12.50),
        # Orphans (no matching receipt)
        (-70, "Tienda Desconocida",    55.00),
        (-45, "Transferencia Recibida", 500.00),
        (-30, "Retirada Cajero",       200.00),
        (-15, "Google Workspace",       12.00),
    ]
    txns = []
    for i, (offset, merchant, amount) in enumerate(base):
        txns.append({
            "external_id": f"RK-MOCK-{i + 1:03d}",
            "date": (today + timedelta(days=offset)).isoformat(),
            "merchant": merchant,
            "amount": amount,
            "currency": "EUR",
            "account_id": acct if i % 3 != 2 else acct2,
        })
    return txns


MOCK_TRANSACTIONS = _build_mock_txns()


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


@router.post("/preview-import", response_model=ImportPreviewResult)
async def preview_import(file: UploadFile = File(...)):
    """Parse a bank statement file and return a preview without saving."""
    from app.services.bank_parser import BankStatementParser

    content = await file.read()
    parser = BankStatementParser()
    rows = parser.parse(content, file.filename or "upload.csv")

    preview_rows = [
        ImportPreviewRow(
            date=r.get("date"),
            merchant=r.get("merchant"),
            amount=r.get("amount"),
            reference=r.get("reference"),
        )
        for r in rows[:50]
    ]

    return ImportPreviewResult(rows=preview_rows, total=len(rows))


@router.post("/import-bank-extract", response_model=ImportResult)
async def import_bank_extract(
    file: UploadFile = File(...),
    account_id: str = Form(default="RURAL-KUTXA"),
    db: Session = Depends(get_db),
):
    """Import a bank statement CSV/Excel and create BankTransaction records."""
    from app.services.bank_parser import BankStatementParser

    content = await file.read()
    parser = BankStatementParser()
    rows = parser.parse(content, file.filename or "upload.csv")

    created = 0
    skipped = 0
    errors: list[str] = []

    for i, row in enumerate(rows):
        ext_id = row.get("external_id", "")
        if not ext_id:
            errors.append(f"Row {i+1}: no external_id generated")
            continue

        # Dedup by external_id
        existing = db.query(BankTransaction).filter(
            BankTransaction.external_id == ext_id
        ).first()
        if existing:
            skipped += 1
            continue

        try:
            txn = BankTransaction(
                external_id=ext_id,
                date=row.get("date"),
                merchant=row.get("merchant"),
                amount=row.get("amount", 0),
                currency="EUR",
                account_id=account_id,
            )
            db.add(txn)
            created += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")

    db.commit()
    logger.info("Bank import: %d created, %d skipped, %d errors", created, skipped, len(errors))

    return ImportResult(
        total_rows=len(rows),
        created=created,
        skipped=skipped,
        errors=errors[:10],  # Limit error messages
    )
