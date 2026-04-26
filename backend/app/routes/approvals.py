"""ExpensIQ — Approvals routes.

Sprint 4 — Batch approve inteligente. Endpoint para que el frontend
sepa qué recibos preseleccionar (auto-aprobables sin alertas) y poder
mostrar el banner "N recibos listos para aprobar (Y €)".
"""

from sqlalchemy import and_, func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Alert, Receipt
from app.schemas.schemas import AutoReadyOut

router = APIRouter()


@router.get("/auto-ready", response_model=AutoReadyOut)
def auto_ready_receipts(db: Session = Depends(get_db)):
    """Recibos auto-aprobables sin alertas activas — para banner /approvals.

    Criterios:
    - approval_level = "auto"
    - status ∈ {pending, review, flagged}
    - sin Alert no resuelta asociada al receipt_id
    """
    blocking_receipt_ids = (
        db.query(Alert.receipt_id)
        .filter(
            Alert.resolved == False,  # noqa: E712
            Alert.receipt_id.isnot(None),
        )
        .subquery()
    )

    rows = (
        db.query(Receipt.id, Receipt.amount)
        .filter(
            Receipt.approval_level == "auto",
            Receipt.status.in_(["pending", "review", "flagged"]),
            Receipt.id.notin_(blocking_receipt_ids),
        )
        .all()
    )

    receipt_ids = [r.id for r in rows]
    total = float(sum((r.amount or 0) for r in rows))

    return AutoReadyOut(
        count=len(receipt_ids),
        total_amount_eur=round(total, 2),
        receipt_ids=receipt_ids,
    )
