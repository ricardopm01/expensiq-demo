"""ExpensIQ — Settings routes (admin-only).

Sprint 1 fase B — CRUD minimo sobre la tabla `settings` para que el admin
pueda ajustar los umbrales de aprobacion sin redeploy.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_optional
from app.db.session import get_db
from app.models.models import Employee
from app.services import settings_service

router = APIRouter()


class ApprovalThresholdsOut(BaseModel):
    threshold_auto: float
    threshold_manager: float
    auto_enabled: bool


class ApprovalThresholdsIn(BaseModel):
    threshold_auto: Optional[float] = None
    threshold_manager: Optional[float] = None
    auto_enabled: Optional[bool] = None


@router.get("/approval-thresholds", response_model=ApprovalThresholdsOut)
def get_approval_thresholds(db: Session = Depends(get_db)):
    t = settings_service.get_approval_thresholds(db)
    return ApprovalThresholdsOut(
        threshold_auto=float(t["threshold_auto"] or 0),
        threshold_manager=float(t["threshold_manager"] or 0),
        auto_enabled=bool(t["auto_enabled"]),
    )


@router.put("/approval-thresholds", response_model=ApprovalThresholdsOut)
def update_approval_thresholds(
    body: ApprovalThresholdsIn,
    db: Session = Depends(get_db),
    current_user: Optional[Employee] = Depends(get_current_user_optional),
    x_user_role: str = Header(default="admin", alias="X-User-Role"),
):
    # Admin-only. Prefer JWT role; fall back to header so DEV_MODE keeps working.
    effective_role = current_user.role if current_user else x_user_role
    if effective_role != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede modificar umbrales")

    updated_by = str(current_user.id) if current_user else None

    if body.threshold_auto is not None:
        if body.threshold_auto < 0:
            raise HTTPException(status_code=400, detail="threshold_auto no puede ser negativo")
        settings_service.set_setting(
            db, "approval.threshold_auto", body.threshold_auto, "number", updated_by
        )
    if body.threshold_manager is not None:
        if body.threshold_manager < 0:
            raise HTTPException(status_code=400, detail="threshold_manager no puede ser negativo")
        settings_service.set_setting(
            db, "approval.threshold_manager", body.threshold_manager, "number", updated_by
        )
    if body.auto_enabled is not None:
        settings_service.set_setting(
            db, "approval.auto_enabled", body.auto_enabled, "bool", updated_by
        )

    # Validate consistency: auto < manager
    t = settings_service.get_approval_thresholds(db)
    if float(t["threshold_auto"]) >= float(t["threshold_manager"]):
        # Roll back the last-in to keep coherencia? Simpler: return 422
        raise HTTPException(
            status_code=422,
            detail=f"threshold_auto ({t['threshold_auto']}) debe ser menor que threshold_manager ({t['threshold_manager']})",
        )

    return ApprovalThresholdsOut(
        threshold_auto=float(t["threshold_auto"]),
        threshold_manager=float(t["threshold_manager"]),
        auto_enabled=bool(t["auto_enabled"]),
    )
