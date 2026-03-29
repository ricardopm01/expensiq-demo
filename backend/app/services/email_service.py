"""ExpensIQ — Email service (SMTP async) + period reminder scheduler."""

import asyncio
import logging
from calendar import monthrange
from datetime import date, timedelta
from typing import List

import aiosmtplib
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("expensiq.email")

scheduler = AsyncIOScheduler()


# ── Core send ──────────────────────────────────────────────────────────────

async def send_email(to: str, subject: str, html_body: str) -> bool:
    if not settings.EMAIL_HOST or not settings.EMAIL_USER:
        logger.warning("Email not configured — skipping send to %s: %s", to, subject)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_USER,
            password=settings.EMAIL_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


async def send_bulk(recipients: List[str], subject: str, html_body: str):
    tasks = [send_email(r, subject, html_body) for r in recipients]
    await asyncio.gather(*tasks)


# ── Email templates ────────────────────────────────────────────────────────

def _reminder_html(employee_name: str, days_left: int, end_date: date, frontend_url: str) -> str:
    if days_left == 0:
        urgency = "⚠️ <strong>HOY es el último día</strong> para subir tus facturas."
        color = "#dc2626"
    elif days_left == 1:
        urgency = "⏰ <strong>Mañana cierra el periodo</strong>. Sube tus facturas hoy."
        color = "#ea580c"
    else:
        urgency = f"📅 El periodo cierra en <strong>{days_left} días</strong> ({end_date.strftime('%d/%m/%Y')})."
        color = "#4f46e5"

    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: {color}; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">ExpensIQ — Recordatorio de gastos</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <p>Hola <strong>{employee_name}</strong>,</p>
        <p>{urgency}</p>
        <p>Recuerda subir todos tus recibos y facturas antes del cierre automático
           a las <strong>00:00 del {end_date.strftime('%d/%m/%Y')}</strong>.</p>
        <p>Si tienes algún problema, contacta con la responsable de administración.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{frontend_url}/receipts"
             style="background: {color}; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: bold;">
            Subir facturas ahora
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">ExpensIQ · Gestión automática de gastos</p>
      </div>
    </div>
    """


def _period_closed_html(employee_name: str, end_date: date) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #1e293b; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">ExpensIQ — Periodo cerrado</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <p>Hola <strong>{employee_name}</strong>,</p>
        <p>El periodo de gastos hasta el <strong>{end_date.strftime('%d/%m/%Y')}</strong>
           ha sido cerrado automáticamente.</p>
        <p>Si necesitas subir una factura fuera de plazo, contacta con la responsable
           de administración para que te reabra el acceso.</p>
        <p style="color: #64748b; font-size: 12px;">ExpensIQ · Gestión automática de gastos</p>
      </div>
    </div>
    """


# ── Scheduled jobs ─────────────────────────────────────────────────────────

def _period_end_dates() -> list[date]:
    """Returns the next two closing dates (15th and last day of month)."""
    today = date.today()
    year, month = today.year, today.month
    last_day = monthrange(year, month)[1]
    candidates = [
        date(year, month, 15),
        date(year, month, last_day),
    ]
    # Also next month
    if month == 12:
        nm_year, nm_month = year + 1, 1
    else:
        nm_year, nm_month = year, month + 1
    nm_last = monthrange(nm_year, nm_month)[1]
    candidates += [date(nm_year, nm_month, 15), date(nm_year, nm_month, nm_last)]
    return [d for d in candidates if d >= today]


async def _send_reminders_for_days_left(days_left: int):
    """Send reminder emails to all active employees with receipts pending."""
    from app.db.session import SessionLocal
    from app.models.models import Employee

    ends = _period_end_dates()
    if not ends:
        return
    target_date = ends[0]
    if (target_date - date.today()).days != days_left:
        return

    db = SessionLocal()
    try:
        employees = db.query(Employee).filter(Employee.is_active == True, Employee.role == "employee").all()
        for emp in employees:
            html = _reminder_html(emp.name, days_left, target_date, settings.FRONTEND_URL)
            subject = f"ExpensIQ — {'Último día' if days_left == 0 else f'Cierra en {days_left} día(s)'}: sube tus facturas"
            await send_email(emp.email, subject, html)
        logger.info("Sent %d-day reminders to %d employees", days_left, len(employees))
    finally:
        db.close()


async def _auto_close_period():
    """Close the current period at 00:00 on closing days."""
    from app.db.session import SessionLocal
    from app.models.models import Employee, Period
    from app.routes.periods import _get_or_create_current_period
    from datetime import datetime

    today = date.today()
    last_day = monthrange(today.year, today.month)[1]
    if today.day not in (15, last_day):
        return

    db = SessionLocal()
    try:
        period = _get_or_create_current_period(db)
        if period.status == "open":
            period.status = "closed"
            period.closed_at = datetime.utcnow()
            db.commit()
            logger.info("Auto-closed period %s", period.id)

            # Notify employees
            employees = db.query(Employee).filter(Employee.is_active == True, Employee.role == "employee").all()
            for emp in employees:
                html = _period_closed_html(emp.name, period.end_date)
                await send_email(emp.email, "ExpensIQ — Periodo de gastos cerrado", html)
    finally:
        db.close()


def start_scheduler():
    """Register all cron jobs and start the scheduler."""
    # Auto-close at midnight on 15th and last day of month
    scheduler.add_job(_auto_close_period, "cron", hour=0, minute=0, id="auto_close")

    # Reminder at 9:00 — 3 days before
    scheduler.add_job(
        lambda: asyncio.create_task(_send_reminders_for_days_left(3)),
        "cron", hour=9, minute=0, id="reminder_3d"
    )
    # Reminder at 9:00 — 1 day before
    scheduler.add_job(
        lambda: asyncio.create_task(_send_reminders_for_days_left(1)),
        "cron", hour=9, minute=0, id="reminder_1d"
    )
    # Reminder at 9:00 — same day
    scheduler.add_job(
        lambda: asyncio.create_task(_send_reminders_for_days_left(0)),
        "cron", hour=9, minute=0, id="reminder_0d"
    )

    scheduler.start()
    logger.info("Scheduler started: auto-close + reminders registered")
