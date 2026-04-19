"""ExpensIQ — Analytics routes."""

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Alert,
    BankTransaction,
    Employee,
    EmployeePeriodStatus,
    Match,
    Period,
    Receipt,
)
from app.schemas.schemas import (
    ActionTodayOut,
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
            Employee.monthly_budget,
            func.coalesce(func.sum(Receipt.amount), 0).label("total_month"),
            func.count(Receipt.id).label("receipt_count"),
        )
        .join(Receipt, Receipt.employee_id == Employee.id)
        .filter(Receipt.amount.isnot(None))
        .group_by(Employee.id, Employee.name, Employee.department, Employee.monthly_budget)
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
            monthly_budget=float(r.monthly_budget) if r.monthly_budget else None,
        )
        for r in results
    ]


@router.get("/approval-summary")
def get_approval_summary(db: Session = Depends(get_db)):
    """Counts of pending receipts by approval level (3 tiers + legacy bucket)."""
    pending_statuses = ["pending", "review", "flagged"]
    base = db.query(Receipt).filter(Receipt.status.in_(pending_statuses))

    pending_auto = base.filter(Receipt.approval_level == "auto").count()
    pending_manager = base.filter(Receipt.approval_level == "manager").count()
    pending_director = base.filter(Receipt.approval_level == "director").count()
    # Legacy "admin" rows (pre-Sprint1 data) bucketed with manager for admin dashboards.
    pending_legacy_admin = base.filter(Receipt.approval_level == "admin").count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    approved_today = db.query(Receipt).filter(
        Receipt.approved_at >= today_start
    ).count()

    return {
        "pending_auto": pending_auto,
        "pending_manager": pending_manager,
        "pending_director": pending_director,
        # Keep pending_admin for backwards compat: manager + director + legacy admin
        "pending_admin": pending_manager + pending_director + pending_legacy_admin,
        "approved_today": approved_today,
    }


@router.get("/action-today", response_model=ActionTodayOut)
def get_action_today(db: Session = Depends(get_db)):
    """Consolidated counters for the 'Acción Hoy' dashboard banner.

    - receipts_pending_approval: recibos que requieren manager/director/legacy admin
    - transactions_unmatched: transacciones bancarias sin ningún match
    - period_pending_employees: si quincena abierta → empleados activos sin recibos;
      si cerrada → empleados con review_status='pending'
    - alerts_urgent: alertas activas con severity in (high, critical)
    """
    pending_statuses = ["pending", "review", "flagged"]
    receipts_pending_approval = (
        db.query(Receipt)
        .filter(
            Receipt.status.in_(pending_statuses),
            Receipt.approval_level.in_(["manager", "director", "admin"]),
        )
        .count()
    )

    matched_txn_ids = db.query(Match.transaction_id).distinct()
    transactions_unmatched = (
        db.query(BankTransaction).filter(~BankTransaction.id.in_(matched_txn_ids)).count()
    )

    alerts_urgent = (
        db.query(Alert)
        .filter(Alert.resolved == False, Alert.severity.in_(["high", "critical"]))
        .count()
    )

    # Period-aware employee counter
    period = (
        db.query(Period).order_by(Period.start_date.desc()).first()
    )
    period_pending_employees = 0
    period_pending_label = ""
    period_id = None
    period_status = None

    if period:
        period_id = period.id
        period_status = period.status
        active_employees = (
            db.query(Employee)
            .filter(Employee.role == "employee", Employee.is_active == True)
            .all()
        )

        if period.status == "open":
            period_pending_label = "sin enviar recibos"
            for emp in active_employees:
                count = (
                    db.query(Receipt)
                    .filter(
                        Receipt.employee_id == emp.id,
                        Receipt.date >= period.start_date,
                        Receipt.date <= period.end_date,
                    )
                    .count()
                )
                if count == 0:
                    period_pending_employees += 1
        else:  # closed
            period_pending_label = "sin revisar"
            reviewed_ids = {
                str(s.employee_id)
                for s in db.query(EmployeePeriodStatus)
                .filter(
                    EmployeePeriodStatus.period_id == period.id,
                    EmployeePeriodStatus.review_status.in_(["approved", "flagged"]),
                )
                .all()
            }
            for emp in active_employees:
                if str(emp.id) not in reviewed_ids:
                    period_pending_employees += 1

    return ActionTodayOut(
        receipts_pending_approval=receipts_pending_approval,
        transactions_unmatched=transactions_unmatched,
        period_pending_employees=period_pending_employees,
        period_pending_label=period_pending_label,
        alerts_urgent=alerts_urgent,
        period_id=period_id,
        period_status=period_status,
    )


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
