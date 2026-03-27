"""ExpensIQ — Alert routes."""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, Employee, Receipt
from app.schemas.schemas import AlertOut

router = APIRouter()


@router.post("/ai-scan")
def ai_anomaly_scan(db: Session = Depends(get_db)):
    """Run AI-powered anomaly detection on recent expenses."""
    from app.services.ai_anomaly import AIAnomalyDetector

    # Fetch recent receipts (last 90 days)
    cutoff = datetime.utcnow() - timedelta(days=90)
    receipts = db.query(Receipt).filter(Receipt.upload_timestamp >= cutoff).all()
    employees = db.query(Employee).all()

    # Build data dicts
    receipts_data = [
        {
            "id": str(r.id),
            "employee_id": str(r.employee_id),
            "employee_name": r.employee.name if r.employee else None,
            "merchant": r.merchant,
            "date": str(r.date) if r.date else None,
            "amount": float(r.amount) if r.amount else 0,
            "currency": r.currency,
            "category": r.category,
            "status": r.status,
        }
        for r in receipts
    ]

    employees_data = [
        {
            "id": str(e.id),
            "name": e.name,
            "department": e.department,
            "monthly_budget": float(e.monthly_budget) if e.monthly_budget else None,
            "total_spending": sum(
                float(r.amount or 0)
                for r in receipts
                if str(r.employee_id) == str(e.id)
            ),
        }
        for e in employees
    ]

    detector = AIAnomalyDetector()
    anomalies = detector.analyze(receipts_data, employees_data)

    # Persist alerts
    created = 0
    for a in anomalies:
        alert = Alert(
            id=uuid.uuid4(),
            employee_id=a.get("employee_id"),
            receipt_id=a.get("receipt_id"),
            alert_type=a.get("alert_type", "suspicious_pattern"),
            description=a.get("description", "Anomalia detectada por IA"),
            severity=a.get("severity", "medium"),
        )
        db.add(alert)
        created += 1

    db.commit()

    return {"alerts_created": created}


@router.post("/budget-scan")
def budget_alert_scan(db: Session = Depends(get_db)):
    """Check all employees against their monthly budget and create alerts if over 80%."""
    from sqlalchemy import extract, func
    from datetime import date

    today = date.today()
    employees = db.query(Employee).filter(Employee.monthly_budget.isnot(None)).all()

    created = 0
    for emp in employees:
        if not emp.monthly_budget or emp.monthly_budget <= 0:
            continue

        total = float(
            db.query(func.coalesce(func.sum(Receipt.amount), 0))
            .filter(
                Receipt.employee_id == emp.id,
                extract("year", Receipt.date) == today.year,
                extract("month", Receipt.date) == today.month,
            )
            .scalar()
        )

        pct = total / float(emp.monthly_budget) * 100
        if pct < 80:
            continue

        alert_type = "budget_exceeded" if pct >= 100 else "budget_warning"
        severity = "high" if pct >= 100 else "medium"
        label = "superado" if pct >= 100 else f"al {pct:.0f}%"

        # Avoid duplicate alerts this month
        existing = db.query(Alert).filter(
            Alert.employee_id == emp.id,
            Alert.alert_type == alert_type,
            extract("year", Alert.created_at) == today.year,
            extract("month", Alert.created_at) == today.month,
        ).first()

        if existing:
            continue

        alert = Alert(
            id=uuid.uuid4(),
            employee_id=emp.id,
            alert_type=alert_type,
            description=(
                f"{emp.name} ha {label} su presupuesto mensual. "
                f"Gasto acumulado: {total:.0f} EUR de {emp.monthly_budget:.0f} EUR ({pct:.0f}%)."
            ),
            severity=severity,
        )
        db.add(alert)
        created += 1

    db.commit()
    return {"alerts_created": created, "employees_checked": len(employees)}


@router.get("", response_model=list[AlertOut])
def list_alerts(
    resolved: Optional[bool] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.patch("/{alert_id}/read", response_model=AlertOut)
def mark_read(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert
