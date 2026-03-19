"""ExpensIQ — Analytics routes."""

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, BankTransaction, Employee, Match, Receipt
from app.schemas.schemas import (
    CategoryOut,
    EmployeeCategoryBreakdownOut,
    ReceiptSummary,
    SummaryOut,
    TopSpenderOut,
)

router = APIRouter()


@router.get("/summary", response_model=SummaryOut)
def get_summary(db: Session = Depends(get_db)):
    total_spending = db.query(func.coalesce(func.sum(Receipt.amount), 0)).scalar()
    receipt_count = db.query(Receipt).count()
    matched_count = db.query(Receipt).filter(Receipt.status == "matched").count()
    flagged_count = db.query(Receipt).filter(Receipt.status == "flagged").count()
    review_count = db.query(Receipt).filter(Receipt.status == "review").count()
    pending_count = db.query(Receipt).filter(Receipt.status.in_(["pending", "processing"])).count()
    open_alert_count = db.query(Alert).filter(Alert.resolved == False).count()
    transaction_count = db.query(BankTransaction).count()

    # Unmatched transactions: those without a match record
    matched_txn_ids = db.query(Match.transaction_id).distinct()
    unmatched_txn_count = db.query(BankTransaction).filter(
        ~BankTransaction.id.in_(matched_txn_ids)
    ).count()

    return SummaryOut(
        total_spending=float(total_spending),
        receipt_count=receipt_count,
        matched_count=matched_count,
        open_alert_count=open_alert_count,
        flagged_count=flagged_count,
        transaction_count=transaction_count,
        unmatched_txn_count=unmatched_txn_count,
        review_count=review_count,
        pending_count=pending_count,
    )


@router.get("/categories", response_model=list[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    results = (
        db.query(
            Receipt.category,
            func.coalesce(func.sum(Receipt.amount), 0).label("total_amount"),
        )
        .filter(Receipt.amount.isnot(None))
        .group_by(Receipt.category)
        .order_by(func.sum(Receipt.amount).desc())
        .all()
    )
    return [CategoryOut(category=r.category, total_amount=float(r.total_amount)) for r in results]


@router.get("/top-spenders", response_model=list[TopSpenderOut])
def get_top_spenders(db: Session = Depends(get_db)):
    results = (
        db.query(
            Employee.id.label("employee_id"),
            Employee.name,
            Employee.department,
            func.coalesce(func.sum(Receipt.amount), 0).label("total_month"),
            func.count(Receipt.id).label("receipt_count"),
        )
        .join(Receipt, Receipt.employee_id == Employee.id)
        .filter(Receipt.amount.isnot(None))
        .group_by(Employee.id, Employee.name, Employee.department)
        .order_by(func.sum(Receipt.amount).desc())
        .limit(10)
        .all()
    )
    return [
        TopSpenderOut(
            employee_id=r.employee_id,
            name=r.name,
            department=r.department,
            total_month=float(r.total_month),
            receipt_count=r.receipt_count,
        )
        for r in results
    ]


@router.get("/employee/{employee_id}/categories", response_model=list[EmployeeCategoryBreakdownOut])
def get_employee_categories(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    receipts = db.query(Receipt).filter(Receipt.employee_id == employee_id).all()

    categories: dict[str, list] = {}
    for r in receipts:
        cat = r.category or "other"
        categories.setdefault(cat, []).append(r)

    return [
        EmployeeCategoryBreakdownOut(
            category=cat,
            total_amount=sum(float(r.amount or 0) for r in cat_receipts),
            receipt_count=len(cat_receipts),
            receipts=[ReceiptSummary.model_validate(r) for r in cat_receipts],
        )
        for cat, cat_receipts in sorted(
            categories.items(),
            key=lambda x: sum(float(r.amount or 0) for r in x[1]),
            reverse=True,
        )
    ]
