"""ExpensIQ — SQLAlchemy ORM models."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    department = Column(String(100))
    role = Column(String(20), nullable=False, default="employee")
    monthly_budget = Column(Numeric(10, 2))
    nif = Column(String(20))  # Sprint 5B — for SAP CSV export
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Auth fields
    google_id = Column(String(255), unique=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login = Column(DateTime(timezone=True))

    receipts = relationship("Receipt", back_populates="employee", foreign_keys="[Receipt.employee_id]")
    alerts = relationship("Alert", back_populates="employee")
    period_statuses = relationship("EmployeePeriodStatus", back_populates="employee", foreign_keys="[EmployeePeriodStatus.employee_id]")


class Project(Base):
    """Obra o proyecto al que se imputa un gasto."""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    receipts = relationship("Receipt", back_populates="project")


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    upload_timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    image_url = Column(Text)
    merchant = Column(String(255))
    date = Column(Date)
    amount = Column(Numeric(10, 2))
    currency = Column(String(3), default="EUR")
    tax = Column(Numeric(10, 2))
    # IVA breakdown (Sprint 3)
    tax_base = Column(Numeric(10, 2))
    tax_rate = Column(Numeric(5, 2))    # e.g. 21.00
    tax_amount = Column(Numeric(10, 2))
    category = Column(String(20), default="other")
    status = Column(String(20), nullable=False, default="pending")
    ocr_confidence = Column(Numeric(4, 3))
    ocr_raw_text = Column(Text)
    ocr_provider = Column(String(50))
    ocr_processed_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    payment_method = Column(String(20))
    line_items = Column(Text)
    approval_level = Column(String(20))  # auto, manager, director
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    approved_at = Column(DateTime(timezone=True))
    # Obra (Sprint 3)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"))

    employee = relationship("Employee", back_populates="receipts", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
    matches = relationship("Match", back_populates="receipt")
    project = relationship("Project", back_populates="receipts")

    @property
    def employee_name(self):
        return self.employee.name if self.employee else None

    @property
    def approver_name(self):
        return self.approver.name if self.approver else None

    @property
    def project_code(self):
        return self.project.code if self.project else None

    @property
    def project_name(self):
        return self.project.name if self.project else None

    @property
    def approval_reason(self):
        """Human-readable reason — only populated for non-auto levels.

        Kept here (not in routes) so list/detail endpoints serialize it via
        from_attributes without extra plumbing. Thresholds are the same as
        routes/receipts.py; duplication is deliberate to avoid import cycles.
        """
        level = self.approval_level
        if level in (None, "auto"):
            return None
        amount = float(self.amount) if self.amount is not None else None
        if amount is None:
            return None
        if level == "manager":
            return f"Importe {amount:.2f}€ entre 100€ y 500€ — requiere manager"
        if level == "director":
            return f"Importe {amount:.2f}€ ≥ 500€ — requiere director"
        if level == "admin":
            return f"Importe {amount:.2f}€ requiere aprobación admin (legacy)"
        return None


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    external_id = Column(String(255), unique=True)
    date = Column(Date, nullable=False)
    merchant = Column(String(255))
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    account_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    matches = relationship("Match", back_populates="transaction")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("receipt_id", "transaction_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("bank_transactions.id", ondelete="CASCADE"), nullable=False)
    confidence = Column(Numeric(4, 3))
    match_method = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    receipt = relationship("Receipt", back_populates="matches")
    transaction = relationship("BankTransaction", back_populates="matches")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("receipts.id", ondelete="SET NULL"))
    alert_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")
    suggested_action = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at = Column(DateTime(timezone=True))

    employee = relationship("Employee", back_populates="alerts")


class Period(Base):
    """Quincena — billing period (1-15 or 16-end of month)."""
    __tablename__ = "periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="open")  # open | closed
    closed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    employee_statuses = relationship("EmployeePeriodStatus", back_populates="period")


class EmployeePeriodStatus(Base):
    """Tracks per-employee period status (admin can reopen for a specific employee)."""
    __tablename__ = "employee_period_status"
    __table_args__ = (UniqueConstraint("employee_id", "period_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    period_id = Column(UUID(as_uuid=True), ForeignKey("periods.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="open")  # open | closed | reopened
    reopened_at = Column(DateTime(timezone=True))
    reopened_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))

    # Review fields (admin review after period closes)
    review_status = Column(String(20), nullable=False, default="pending")  # pending | approved | flagged
    review_note = Column(Text)
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))

    employee = relationship("Employee", back_populates="period_statuses", foreign_keys=[employee_id])
    period = relationship("Period", back_populates="employee_statuses")


class Setting(Base):
    """Key-value application setting (editable from admin UI).

    Why a dedicated table instead of JSON file or env vars: settings must
    be editable at runtime by the admin without a redeploy, and we need
    audit trail (updated_by) for sensitive values like approval thresholds.
    """
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    value_type = Column(String(20), nullable=False, default="string")  # string | number | bool
    description = Column(Text)
    updated_at = Column(DateTime(timezone=True))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
