"""
ExpensIQ — Receipts Router

POST /receipts/upload   → upload image, trigger OCR, persist
GET  /receipts/         → list receipts (filterable by employee/status)
GET  /receipts/{id}     → get single receipt
POST /receipts/{id}/reconcile  → trigger manual reconciliation
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Receipt, ReceiptStatus, Employee
from app.ocr.processor import OCRProcessor
from app.services.categorizer import ExpenseCategorizer
from app.services.storage import StorageService
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ocr_processor = OCRProcessor(provider=settings.OCR_PROVIDER)
categorizer   = ExpenseCategorizer()
storage       = StorageService(backend=settings.STORAGE_BACKEND)


# ── Schemas (inline Pydantic for clarity) ────────────────────────

from pydantic import BaseModel

class ReceiptOut(BaseModel):
    id:               str
    employee_id:      str
    upload_timestamp: datetime
    image_url:        str
    merchant:         Optional[str]
    date:             Optional[str]
    amount:           Optional[float]
    currency:         str
    tax:              Optional[float]
    category:         str
    status:           str
    ocr_confidence:   Optional[float]

    class Config:
        from_attributes = True


# ── Background task: OCR + categorize + reconcile ─────────────────

async def _process_receipt(receipt_id: str, image_bytes: bytes, db: Session):
    """Run after upload returns — keeps endpoint fast."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        return

    receipt.status = ReceiptStatus.processing
    db.commit()

    try:
        # 1. OCR
        fields = await ocr_processor.process(image_bytes)

        # 2. Update receipt with extracted fields
        receipt.merchant        = fields.merchant
        receipt.date            = fields.date
        receipt.amount          = fields.amount
        receipt.currency        = fields.currency
        receipt.tax             = fields.tax
        receipt.ocr_raw_text    = fields.raw_text
        receipt.ocr_confidence  = fields.confidence
        receipt.ocr_provider    = fields.provider
        receipt.ocr_processed_at = datetime.utcnow()

        # 3. Categorize
        receipt.category = categorizer.categorize(fields.merchant)

        # 4. Mark ready for reconciliation
        receipt.status = ReceiptStatus.pending
        db.commit()

        logger.info(f"Receipt {receipt_id} processed: {fields.merchant} {fields.amount} {fields.currency}")

    except Exception as exc:
        logger.error(f"OCR failed for receipt {receipt_id}: {exc}")
        receipt.status = ReceiptStatus.flagged
        receipt.notes  = f"OCR error: {str(exc)}"
        db.commit()


# ── Routes ───────────────────────────────────────────────────────

@router.post("/upload", response_model=ReceiptOut, status_code=201)
async def upload_receipt(
    background_tasks: BackgroundTasks,
    employee_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a receipt image.
    Stores the file, creates a DB record, and triggers async OCR.
    """
    # Validate employee
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Store file
    receipt_id = str(uuid.uuid4())
    ext        = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    object_key = f"receipts/{employee_id}/{receipt_id}.{ext}"
    image_url  = await storage.upload(object_key, image_bytes, content_type=file.content_type)

    # Persist receipt record
    receipt = Receipt(
        id          = receipt_id,
        employee_id = employee_id,
        image_url   = image_url,
        status      = ReceiptStatus.pending,
        currency    = "EUR",
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    # Trigger OCR async
    background_tasks.add_task(_process_receipt, receipt_id, image_bytes, db)

    return _to_out(receipt)


@router.get("/", response_model=List[ReceiptOut])
def list_receipts(
    employee_id: Optional[str] = None,
    status:      Optional[str] = None,
    limit:  int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Receipt)
    if employee_id:
        q = q.filter(Receipt.employee_id == employee_id)
    if status:
        q = q.filter(Receipt.status == status)
    receipts = q.order_by(Receipt.upload_timestamp.desc()).offset(offset).limit(limit).all()
    return [_to_out(r) for r in receipts]


@router.get("/{receipt_id}", response_model=ReceiptOut)
def get_receipt(receipt_id: str, db: Session = Depends(get_db)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return _to_out(r)


@router.post("/{receipt_id}/reconcile")
async def reconcile_receipt(receipt_id: str, db: Session = Depends(get_db)):
    """Manually trigger reconciliation for a single receipt."""
    from app.services.reconciliation_service import reconcile_single
    result = await reconcile_single(receipt_id, db)
    return result


# ── Helper ───────────────────────────────────────────────────────

def _to_out(r: Receipt) -> dict:
    return ReceiptOut(
        id               = str(r.id),
        employee_id      = str(r.employee_id),
        upload_timestamp = r.upload_timestamp,
        image_url        = r.image_url,
        merchant         = r.merchant,
        date             = str(r.date) if r.date else None,
        amount           = float(r.amount) if r.amount else None,
        currency         = r.currency or "EUR",
        tax              = float(r.tax) if r.tax else None,
        category         = r.category.value if r.category else "other",
        status           = r.status.value if r.status else "pending",
        ocr_confidence   = r.ocr_confidence,
    )
