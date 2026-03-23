"""ExpensIQ — Receipt routes."""

import csv
import io
import logging
import uuid
from datetime import date as DateType, datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.models import BankTransaction, Employee, Match, Receipt
from app.schemas.schemas import ApproveRejectResult, ReceiptMatchOut, ReceiptOut, ReceiptUpdate, ReconcileSingleResult

logger = logging.getLogger("expensiq.receipts")

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/", response_model=list[ReceiptOut])
def list_receipts(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[DateType] = None,
    date_to: Optional[DateType] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "desc",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    query = db.query(Receipt).options(joinedload(Receipt.employee))
    if status:
        query = query.filter(Receipt.status == status)
    if employee_id:
        query = query.filter(Receipt.employee_id == employee_id)
    if category:
        query = query.filter(Receipt.category == category)
    if date_from:
        query = query.filter(Receipt.date >= date_from)
    if date_to:
        query = query.filter(Receipt.date <= date_to)
    if search:
        query = query.filter(Receipt.merchant.ilike(f"%{search}%"))

    # Sorting
    sort_column = {
        "date": Receipt.date,
        "amount": Receipt.amount,
        "merchant": Receipt.merchant,
        "category": Receipt.category,
        "status": Receipt.status,
    }.get(sort_by, Receipt.upload_timestamp)

    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.offset(offset).limit(limit).all()


@router.get("/export/csv")
def export_receipts_csv(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[DateType] = None,
    date_to: Optional[DateType] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    query = db.query(Receipt).options(joinedload(Receipt.employee))
    if status:
        query = query.filter(Receipt.status == status)
    if employee_id:
        query = query.filter(Receipt.employee_id == employee_id)
    if category:
        query = query.filter(Receipt.category == category)
    if date_from:
        query = query.filter(Receipt.date >= date_from)
    if date_to:
        query = query.filter(Receipt.date <= date_to)
    if search:
        query = query.filter(Receipt.merchant.ilike(f"%{search}%"))
    receipts = query.order_by(Receipt.upload_timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "empleado", "merchant", "fecha", "importe", "moneda", "tax", "categoria", "estado", "confianza_ocr", "fecha_subida", "notas"])
    for r in receipts:
        writer.writerow([
            str(r.id),
            r.employee.name if r.employee else "",
            r.merchant or "",
            str(r.date) if r.date else "",
            r.amount or "",
            r.currency,
            r.tax or "",
            r.category,
            r.status,
            round(float(r.ocr_confidence), 2) if r.ocr_confidence else "",
            str(r.upload_timestamp) if r.upload_timestamp else "",
            r.notes or "",
        ])
    output.seek(0)
    filename = f"gastos_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/upload", response_model=ReceiptOut, status_code=201)
async def upload_receipt(
    background_tasks: BackgroundTasks,
    employee_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    # Store file
    receipt_id = uuid.uuid4()
    object_key = f"receipts/{receipt_id}/{file.filename}"
    image_url = None

    try:
        from app.services.storage import storage_service
        storage_service.upload(object_key, content, file.content_type)
        image_url = f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET}/{object_key}"
    except Exception as e:
        logger.warning("Storage upload failed, continuing without image_url: %s", e)

    # Create receipt record
    receipt = Receipt(
        id=receipt_id,
        employee_id=employee_id,
        image_url=image_url,
        status="processing",
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    # Trigger background OCR processing
    background_tasks.add_task(_process_receipt_ocr, str(receipt_id), content, file.filename)

    return receipt


@router.get("/{receipt_id}", response_model=ReceiptOut)
def get_receipt(receipt_id: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.get("/{receipt_id}/matches", response_model=list[ReceiptMatchOut])
def get_receipt_matches(receipt_id: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    matches = (
        db.query(Match, BankTransaction)
        .join(BankTransaction, Match.transaction_id == BankTransaction.id)
        .filter(Match.receipt_id == receipt_id)
        .all()
    )

    return [
        ReceiptMatchOut(
            match_id=m.id,
            transaction_id=t.id,
            confidence=float(m.confidence) if m.confidence else None,
            match_method=m.match_method,
            transaction_date=t.date,
            transaction_merchant=t.merchant,
            transaction_amount=float(t.amount),
            transaction_currency=t.currency,
        )
        for m, t in matches
    ]


@router.post("/{receipt_id}/reconcile", response_model=ReconcileSingleResult)
def reconcile_single(receipt_id: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    from app.services.reconciliation import reconciliation_engine
    matches_created = reconciliation_engine.reconcile_receipt(db, receipt)

    return ReconcileSingleResult(status=receipt.status, matches_created=matches_created)


@router.patch("/{receipt_id}", response_model=ReceiptOut)
def update_receipt(receipt_id: str, data: ReceiptUpdate, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(receipt, field, value)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/{receipt_id}/approve", response_model=ApproveRejectResult)
def approve_receipt(receipt_id: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.status not in ("pending", "review", "flagged"):
        raise HTTPException(status_code=409, detail=f"Cannot approve receipt with status '{receipt.status}'")
    has_match = db.query(Match).filter(Match.receipt_id == receipt_id).first()
    receipt.status = "matched" if has_match else "review"
    db.commit()
    return ApproveRejectResult(status=receipt.status, message="Receipt approved")


@router.post("/{receipt_id}/reject", response_model=ApproveRejectResult)
def reject_receipt(receipt_id: str, reason: Optional[str] = None, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.status not in ("pending", "review", "flagged", "matched"):
        raise HTTPException(status_code=409, detail=f"Cannot reject receipt with status '{receipt.status}'")
    receipt.status = "rejected"
    if reason:
        receipt.notes = reason
    db.commit()
    return ApproveRejectResult(status="rejected", message="Receipt rejected")


@router.delete("/{receipt_id}", status_code=204)
def delete_receipt(receipt_id: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    db.delete(receipt)
    db.commit()
    return Response(status_code=204)


def _process_receipt_ocr(receipt_id: str, file_content: bytes, filename: str):
    """Background task: run OCR on the uploaded file and update the receipt."""
    from app.db.session import SessionLocal
    from app.ocr.processor import ocr_processor
    from app.services.categorizer import ExpenseCategorizer

    db = SessionLocal()
    try:
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            logger.error("Receipt %s not found for OCR processing", receipt_id)
            return

        try:
            result = ocr_processor.process(file_content, filename)
            receipt.merchant = result.get("merchant")
            receipt.date = result.get("date")
            receipt.amount = result.get("amount")
            receipt.currency = result.get("currency", "EUR")
            receipt.tax = result.get("tax")
            receipt.ocr_raw_text = result.get("raw_text")
            receipt.ocr_confidence = result.get("confidence")
            receipt.ocr_provider = result.get("provider")
            receipt.ocr_processed_at = datetime.utcnow()

            # Categorize
            categorizer = ExpenseCategorizer()
            receipt.category = categorizer.categorize(receipt.merchant)
            receipt.status = "pending"

            logger.info("OCR processed receipt %s: %s %s %s",
                        receipt_id, receipt.merchant, receipt.amount, receipt.currency)
        except Exception as e:
            logger.error("OCR failed for receipt %s: %s", receipt_id, e)
            receipt.status = "flagged"
            receipt.notes = f"OCR error: {e}"

        db.commit()
    finally:
        db.close()
