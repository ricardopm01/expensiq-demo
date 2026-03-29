"""ExpensIQ — Quincena (bi-weekly period) management."""

import uuid
from calendar import monthrange
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_admin, require_full_admin
from app.db.session import get_db
from app.models.models import Alert, Employee, EmployeePeriodStatus, Period, Receipt
from app.services.pdf_report import generate_period_report

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class PeriodOut(BaseModel):
    id: str
    start_date: date
    end_date: date
    status: str
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class EmployeePeriodStatusOut(BaseModel):
    employee_id: str
    employee_name: str
    period_id: str
    status: str
    reopened_at: Optional[datetime]


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_or_create_current_period(db: Session) -> Period:
    today = date.today()
    if today.day <= 15:
        start = date(today.year, today.month, 1)
        end = date(today.year, today.month, 15)
    else:
        start = date(today.year, today.month, 16)
        end = date(today.year, today.month, monthrange(today.year, today.month)[1])

    period = db.query(Period).filter(Period.start_date == start, Period.end_date == end).first()
    if not period:
        period = Period(id=uuid.uuid4(), start_date=start, end_date=end, status="open")
        db.add(period)
        db.commit()
        db.refresh(period)
    return period


def _employee_can_submit(db: Session, employee: Employee, period: Period) -> bool:
    """Returns True if the employee can still submit receipts in this period."""
    if period.status == "open":
        return True
    # Check for individual reopen
    eps = db.query(EmployeePeriodStatus).filter(
        EmployeePeriodStatus.employee_id == employee.id,
        EmployeePeriodStatus.period_id == period.id,
    ).first()
    return eps is not None and eps.status == "reopened"


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/current", response_model=PeriodOut)
def get_current_period(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return _get_or_create_current_period(db)


@router.get("/", response_model=List[PeriodOut])
def list_periods(
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    return db.query(Period).order_by(Period.start_date.desc()).limit(12).all()


@router.post("/close-current")
def close_current_period(
    db: Session = Depends(get_db),
    _: Employee = Depends(require_full_admin),
):
    """Manually close the current period (also called by scheduler at 00:00)."""
    period = _get_or_create_current_period(db)
    if period.status == "closed":
        return {"status": "already_closed", "period_id": str(period.id)}
    period.status = "closed"
    period.closed_at = datetime.utcnow()
    db.commit()
    return {"status": "closed", "period_id": str(period.id)}


@router.post("/{period_id}/reopen-employee/{employee_id}")
def reopen_for_employee(
    period_id: str,
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(require_full_admin),
):
    """Admin reopens a closed period for a specific employee."""
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    eps = db.query(EmployeePeriodStatus).filter(
        EmployeePeriodStatus.employee_id == employee_id,
        EmployeePeriodStatus.period_id == period_id,
    ).first()

    if eps:
        eps.status = "reopened"
        eps.reopened_at = datetime.utcnow()
        eps.reopened_by = current_user.id
    else:
        eps = EmployeePeriodStatus(
            id=uuid.uuid4(),
            employee_id=uuid.UUID(employee_id),
            period_id=uuid.UUID(period_id),
            status="reopened",
            reopened_at=datetime.utcnow(),
            reopened_by=current_user.id,
        )
        db.add(eps)

    db.commit()
    return {"status": "reopened", "employee_id": employee_id, "period_id": period_id}


@router.get("/{period_id}/employee-statuses", response_model=List[EmployeePeriodStatusOut])
def get_employee_statuses(
    period_id: str,
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    statuses = (
        db.query(EmployeePeriodStatus)
        .filter(EmployeePeriodStatus.period_id == period_id)
        .all()
    )
    return [
        EmployeePeriodStatusOut(
            employee_id=str(s.employee_id),
            employee_name=s.employee.name if s.employee else "—",
            period_id=str(s.period_id),
            status=s.status,
            reopened_at=s.reopened_at,
        )
        for s in statuses
    ]


@router.get("/{period_id}/report/pdf")
def download_period_report(
    period_id: str,
    db: Session = Depends(get_db),
    _: Employee = Depends(require_admin),
):
    """Generate and return a PDF report for the given period."""
    period = db.query(Period).filter(Period.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")

    employees = db.query(Employee).filter(Employee.is_active == True).order_by(Employee.name).all()  # noqa: E712

    # Receipts within the period window
    receipts = (
        db.query(Receipt)
        .filter(Receipt.date >= period.start_date, Receipt.date <= period.end_date)
        .all()
    )

    # Alerts linked to receipts in this period
    receipt_ids = [r.id for r in receipts]
    alerts = (
        db.query(Alert)
        .filter(Alert.receipt_id.in_(receipt_ids), Alert.resolved == False)  # noqa: E712
        .order_by(Alert.created_at.desc())
        .all()
    ) if receipt_ids else []

    pdf_bytes = generate_period_report(period, employees, receipts, alerts)

    start = period.start_date.strftime("%Y%m%d")
    end = period.end_date.strftime("%Y%m%d")
    filename = f"expensiq_informe_{start}_{end}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/me/can-submit")
def can_i_submit(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Returns whether the current employee can submit receipts this period."""
    period = _get_or_create_current_period(db)
    can_submit = _employee_can_submit(db, current_user, period)
    return {
        "can_submit": can_submit,
        "period_id": str(period.id),
        "period_end": period.end_date.isoformat(),
        "period_status": period.status,
    }
