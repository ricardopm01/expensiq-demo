"""ExpensIQ — Analytics routes."""

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, BankTransaction, Employee, Match, Receipt
from app.schemas.schemas import (
    CategoryOut,
    DepartmentComparisonOut,
    EmployeeCategoryBreakdownOut,
    ForecastOut,
    MonthlyHistoryPoint,
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


@router.get("/approval-summary")
def get_approval_summary(db: Session = Depends(get_db)):
    """Counts of pending receipts by approval level."""
    pending_statuses = ["pending", "review", "flagged"]
    base = db.query(Receipt).filter(Receipt.status.in_(pending_statuses))

    pending_auto = base.filter(Receipt.approval_level == "auto").count()
    # Count admin + legacy manager/director as one bucket
    pending_admin = base.filter(
        Receipt.approval_level.in_(["admin", "manager", "director"])
    ).count()

    # Approved today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    approved_today = db.query(Receipt).filter(
        Receipt.approved_at >= today_start
    ).count()

    return {
        "pending_auto": pending_auto,
        "pending_admin": pending_admin,
        "approved_today": approved_today,
    }


@router.get("/monthly-trend")
def get_monthly_trend(db: Session = Depends(get_db)):
    """Monthly spending trend for the last 6 months."""
    results = (
        db.query(
            extract("year", Receipt.date).label("year"),
            extract("month", Receipt.date).label("month"),
            func.coalesce(func.sum(Receipt.amount), 0).label("total"),
            func.count(Receipt.id).label("count"),
        )
        .filter(Receipt.date.isnot(None), Receipt.amount.isnot(None))
        .group_by(extract("year", Receipt.date), extract("month", Receipt.date))
        .order_by(extract("year", Receipt.date), extract("month", Receipt.date))
        .all()
    )

    months_es = {
        1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
    }

    return [
        {
            "month": f"{months_es.get(int(r.month), '?')} {int(r.year)}",
            "total": float(r.total),
            "count": r.count,
        }
        for r in results
    ]


@router.get("/department-comparison", response_model=list[DepartmentComparisonOut])
def get_department_comparison(db: Session = Depends(get_db)):
    """Spending vs budget comparison grouped by department."""
    employees = db.query(Employee).all()

    dept_map: dict[str, dict] = {}
    for emp in employees:
        dept = emp.department or "Sin departamento"
        if dept not in dept_map:
            dept_map[dept] = {"employees": [], "spending": 0.0, "receipt_count": 0, "category_counts": {}}
        dept_map[dept]["employees"].append(emp)

    receipts = db.query(Receipt).filter(Receipt.amount.isnot(None)).all()
    emp_dept = {str(emp.id): emp.department or "Sin departamento" for emp in employees}

    for r in receipts:
        dept = emp_dept.get(str(r.employee_id), "Sin departamento")
        if dept in dept_map:
            dept_map[dept]["spending"] += float(r.amount or 0)
            dept_map[dept]["receipt_count"] += 1
            cat = r.category or "other"
            dept_map[dept]["category_counts"][cat] = dept_map[dept]["category_counts"].get(cat, 0) + 1

    result = []
    for dept, data in dept_map.items():
        budget_total = sum(float(e.monthly_budget or 0) for e in data["employees"])
        utilization = (data["spending"] / budget_total * 100) if budget_total > 0 else 0
        top_cat = max(data["category_counts"], key=data["category_counts"].get) if data["category_counts"] else None
        result.append(DepartmentComparisonOut(
            department=dept,
            total_spending=round(data["spending"], 2),
            budget_total=round(budget_total, 2),
            employee_count=len(data["employees"]),
            receipt_count=data["receipt_count"],
            utilization_pct=round(utilization, 1),
            top_category=top_cat,
        ))

    return sorted(result, key=lambda x: x.total_spending, reverse=True)


@router.get("/forecast/{employee_id}", response_model=ForecastOut)
def get_employee_forecast(employee_id: str, db: Session = Depends(get_db)):
    """AI-powered spending forecast for an employee."""
    from app.services.ai_forecast import AIForecastService

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    months_es = {1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
                 7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"}

    rows = (
        db.query(
            extract("year", Receipt.date).label("year"),
            extract("month", Receipt.date).label("month"),
            func.coalesce(func.sum(Receipt.amount), 0).label("total"),
            func.count(Receipt.id).label("count"),
        )
        .filter(Receipt.employee_id == employee_id, Receipt.date.isnot(None), Receipt.amount.isnot(None))
        .group_by(extract("year", Receipt.date), extract("month", Receipt.date))
        .order_by(extract("year", Receipt.date), extract("month", Receipt.date))
        .all()
    )

    monthly_history = [
        {"month": f"{months_es.get(int(r.month), '?')} {int(r.year)}", "total": float(r.total), "count": r.count}
        for r in rows
    ]

    # Current month spending
    today = date.today()
    current_month_spending = float(
        db.query(func.coalesce(func.sum(Receipt.amount), 0))
        .filter(
            Receipt.employee_id == employee_id,
            extract("year", Receipt.date) == today.year,
            extract("month", Receipt.date) == today.month,
        )
        .scalar()
    )

    emp_dict = {
        "id": str(employee.id),
        "name": employee.name,
        "department": employee.department,
        "monthly_budget": employee.monthly_budget,
    }

    forecast_data = AIForecastService().forecast(emp_dict, monthly_history)

    return ForecastOut(
        employee_id=str(employee.id),
        employee_name=employee.name,
        current_month_spending=round(current_month_spending, 2),
        forecast_next_month=forecast_data["forecast_next_month"],
        trend=forecast_data["trend"],
        confidence=forecast_data["confidence"],
        insight=forecast_data["insight"],
        monthly_history=[MonthlyHistoryPoint(**m) for m in monthly_history],
    )


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
