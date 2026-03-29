"""ExpensIQ — Quincenal PDF report generator using ReportLab."""

import io
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Palette ────────────────────────────────────────────────────────────────

INDIGO = colors.HexColor("#6366f1")
INDIGO_DARK = colors.HexColor("#4338ca")
SLATE_900 = colors.HexColor("#0f172a")
SLATE_700 = colors.HexColor("#334155")
SLATE_400 = colors.HexColor("#94a3b8")
SLATE_100 = colors.HexColor("#f1f5f9")
EMERALD = colors.HexColor("#10b981")
AMBER = colors.HexColor("#f59e0b")
RED = colors.HexColor("#ef4444")
WHITE = colors.white

CATEGORY_ES: dict[str, str] = {
    "travel": "Viajes",
    "meals": "Comidas",
    "supplies": "Material",
    "utilities": "Suministros",
    "services": "Servicios",
    "equipment": "Equipamiento",
    "other": "Otros",
}


def _fmt_money(val: Any) -> str:
    if val is None:
        return "—"
    try:
        return f"{float(val):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "—"


def _fmt_date(d: Any) -> str:
    if d is None:
        return "—"
    if isinstance(d, (date, datetime)):
        return d.strftime("%d/%m/%Y")
    try:
        return datetime.fromisoformat(str(d)).strftime("%d/%m/%Y")
    except Exception:
        return str(d)


def generate_period_report(
    period: Any,
    employees: list[Any],
    receipts: list[Any],
    alerts: list[Any],
) -> bytes:
    """
    Build a PDF quincenal report and return the raw bytes.

    Args:
        period:    Period ORM object (start_date, end_date, status, closed_at)
        employees: list of Employee ORM objects
        receipts:  list of Receipt ORM objects for this period
        alerts:    list of Alert ORM objects linked to this period
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story: list[Any] = []

    # ── Shared styles ──────────────────────────────────────────────────────

    title_style = ParagraphStyle(
        "title",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=SLATE_900,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        textColor=SLATE_400,
        spaceAfter=2,
    )
    section_style = ParagraphStyle(
        "section",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=SLATE_900,
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=SLATE_700,
        leading=13,
    )
    small_style = ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=SLATE_400,
    )
    cell_style = ParagraphStyle(
        "cell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        textColor=SLATE_700,
    )
    cell_bold = ParagraphStyle(
        "cell_bold",
        parent=cell_style,
        fontName="Helvetica-Bold",
    )

    # ── Header bar ────────────────────────────────────────────────────────

    # Logo pill + title in a table
    logo_data = [[
        Paragraph(
            '<font color="#ffffff"><b>ExpensIQ</b></font>',
            ParagraphStyle("logo", fontName="Helvetica-Bold", fontSize=13,
                           textColor=WHITE, alignment=TA_CENTER),
        ),
        Paragraph("Informe Quincenal de Gastos", title_style),
    ]]
    logo_table = Table(logo_data, colWidths=[3.5 * cm, None])
    logo_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), INDIGO),
        ("ROUNDEDCORNERS", [6]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 10),
        ("TOPPADDING", (0, 0), (0, 0), 8),
        ("BOTTOMPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (1, 0), (1, 0), 14),
    ]))
    story.append(logo_table)
    story.append(Spacer(1, 6))

    # Period info line
    period_label = (
        f"{_fmt_date(period.start_date)} — {_fmt_date(period.end_date)}"
    )
    status_str = "Abierto" if period.status == "open" else "Cerrado"
    closed_str = f"  ·  Cerrado el {_fmt_date(period.closed_at)}" if period.closed_at else ""
    story.append(Paragraph(
        f"Periodo: <b>{period_label}</b>  ·  Estado: <b>{status_str}</b>{closed_str}",
        subtitle_style,
    ))
    story.append(Paragraph(
        f"Generado el {datetime.utcnow().strftime('%d/%m/%Y a las %H:%M')} UTC",
        small_style,
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=INDIGO, spaceAfter=14))

    # ── Summary KPI row ───────────────────────────────────────────────────

    total_amount = sum(float(r.amount or 0) for r in receipts)
    receipt_count = len(receipts)
    employee_ids_with_receipts = {str(r.employee_id) for r in receipts}
    employees_only = [e for e in employees if e.role == "employee"]
    submitted = len([e for e in employees_only if str(e.id) in employee_ids_with_receipts])
    pending = len(employees_only) - submitted
    approved_count = len([r for r in receipts if r.status == "approved"])

    kpi_data = [[
        _kpi_cell("Gasto total", _fmt_money(total_amount), INDIGO),
        _kpi_cell("Recibos", str(receipt_count), SLATE_700),
        _kpi_cell("Aprobados", str(approved_count), EMERALD),
        _kpi_cell("Con recibos", str(submitted), EMERALD),
        _kpi_cell("Sin recibos", str(pending), AMBER if pending > 0 else SLATE_400),
    ]]
    kpi_table = Table(kpi_data, colWidths=[3.5 * cm] * 5)
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_100),
        ("ROUNDEDCORNERS", [6]),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEAFTER", (0, 0), (-2, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 16))

    # ── Per-employee breakdown ─────────────────────────────────────────────

    story.append(Paragraph("Desglose por empleado", section_style))

    # Build per-employee aggregates
    emp_rows: list[dict] = []
    for emp in sorted(employees_only, key=lambda e: e.name):
        emp_receipts = [r for r in receipts if str(r.employee_id) == str(emp.id)]
        emp_total = sum(float(r.amount or 0) for r in emp_receipts)
        cat_counts: dict[str, int] = {}
        for r in emp_receipts:
            cat = CATEGORY_ES.get(r.category or "other", r.category or "Otros")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        top_cat = max(cat_counts, key=lambda k: cat_counts[k]) if cat_counts else "—"

        budget = float(emp.monthly_budget or 0)
        if budget > 0:
            # Half-month budget
            half_budget = budget / 2
            pct = (emp_total / half_budget * 100) if half_budget > 0 else 0
            budget_str = f"{pct:.0f}% de {_fmt_money(half_budget)}"
        else:
            budget_str = "Sin límite"

        emp_rows.append({
            "name": emp.name,
            "dept": emp.department or "—",
            "count": str(len(emp_receipts)),
            "total": _fmt_money(emp_total),
            "top_cat": top_cat,
            "budget": budget_str,
            "has_receipts": len(emp_receipts) > 0,
        })

    table_header = [
        Paragraph("<b>Empleado</b>", cell_bold),
        Paragraph("<b>Dpto.</b>", cell_bold),
        Paragraph("<b>Recibos</b>", cell_bold),
        Paragraph("<b>Importe</b>", cell_bold),
        Paragraph("<b>Categoría principal</b>", cell_bold),
        Paragraph("<b>Presupuesto</b>", cell_bold),
    ]
    col_widths = [5 * cm, 3 * cm, 1.8 * cm, 2.5 * cm, 3 * cm, 2.4 * cm]

    table_data = [table_header]
    for row in emp_rows:
        name_p = Paragraph(row["name"], cell_style)
        dept_p = Paragraph(row["dept"], cell_style)
        count_p = Paragraph(row["count"], ParagraphStyle(
            "cell_center", parent=cell_style, alignment=TA_CENTER,
        ))
        total_p = Paragraph(row["total"], ParagraphStyle(
            "cell_right", parent=cell_bold if float(row["total"].replace(".", "").replace(",", ".").replace(" €", "") or 0) > 0 else cell_style,
            alignment=TA_RIGHT,
        ))
        cat_p = Paragraph(row["top_cat"], cell_style)
        budget_p = Paragraph(row["budget"], ParagraphStyle(
            "cell_small", parent=small_style, fontSize=7.5,
        ))
        table_data.append([name_p, dept_p, count_p, total_p, cat_p, budget_p])

    emp_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    row_count = len(table_data)
    emp_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), SLATE_900),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        # Data rows alternating
        *[
            ("BACKGROUND", (0, i), (-1, i), SLATE_100 if i % 2 == 0 else WHITE)
            for i in range(1, row_count)
        ],
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        # Grid
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 0), (-1, 0), [SLATE_900]),
    ]))

    # Highlight rows with no receipts
    for i, row in enumerate(emp_rows, start=1):
        if not row["has_receipts"]:
            emp_table.setStyle(TableStyle([
                ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#fffbeb")),
            ]))

    story.append(emp_table)
    story.append(Spacer(1, 20))

    # ── Category breakdown ────────────────────────────────────────────────

    if receipts:
        story.append(Paragraph("Distribución por categoría", section_style))

        cat_totals: dict[str, float] = {}
        for r in receipts:
            cat = CATEGORY_ES.get(r.category or "other", r.category or "Otros")
            cat_totals[cat] = cat_totals.get(cat, 0.0) + float(r.amount or 0)

        cat_rows_data = [[
            Paragraph("<b>Categoría</b>", cell_bold),
            Paragraph("<b>Importe</b>", cell_bold),
            Paragraph("<b>% del total</b>", cell_bold),
        ]]
        for cat, amt in sorted(cat_totals.items(), key=lambda x: -x[1]):
            pct = (amt / total_amount * 100) if total_amount > 0 else 0
            cat_rows_data.append([
                Paragraph(cat, cell_style),
                Paragraph(_fmt_money(amt), ParagraphStyle("cr", parent=cell_style, alignment=TA_RIGHT)),
                Paragraph(f"{pct:.1f}%", ParagraphStyle("cp", parent=cell_style, alignment=TA_RIGHT)),
            ])

        cat_table = Table(cat_rows_data, colWidths=[8 * cm, 4 * cm, 3.5 * cm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SLATE_900),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            *[
                ("BACKGROUND", (0, i), (-1, i), SLATE_100 if i % 2 == 0 else WHITE)
                for i in range(1, len(cat_rows_data))
            ],
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 20))

    # ── Alerts / anomalies ────────────────────────────────────────────────

    if alerts:
        story.append(Paragraph(f"Alertas y anomalías ({len(alerts)})", section_style))

        alert_header = [
            Paragraph("<b>Tipo</b>", cell_bold),
            Paragraph("<b>Empleado</b>", cell_bold),
            Paragraph("<b>Descripción</b>", cell_bold),
            Paragraph("<b>Severidad</b>", cell_bold),
        ]
        alert_data = [alert_header]
        sev_colors = {"critical": RED, "high": colors.HexColor("#f97316"),
                      "medium": AMBER, "low": EMERALD}

        for a in alerts[:30]:  # cap at 30 rows
            sev = (a.severity or "medium").lower()
            sev_color = sev_colors.get(sev, SLATE_400)
            alert_data.append([
                Paragraph(a.alert_type or "—", cell_style),
                Paragraph(a.employee.name if a.employee else "—", cell_style),
                Paragraph((a.description or "")[:80], ParagraphStyle(
                    "alert_desc", parent=cell_style, fontSize=7.5, leading=11,
                )),
                Paragraph(
                    sev.capitalize(),
                    ParagraphStyle("sev", parent=cell_bold, fontSize=8,
                                   textColor=sev_color),
                ),
            ])

        alert_table = Table(alert_data, colWidths=[3.5 * cm, 3.5 * cm, 8.5 * cm, 2.2 * cm])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SLATE_900),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            *[
                ("BACKGROUND", (0, i), (-1, i), SLATE_100 if i % 2 == 0 else WHITE)
                for i in range(1, len(alert_data))
            ],
        ]))
        story.append(alert_table)
        story.append(Spacer(1, 16))

    # ── Footer ────────────────────────────────────────────────────────────

    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_400, spaceBefore=8, spaceAfter=8))
    story.append(Paragraph(
        "Documento confidencial · Generado automáticamente por ExpensIQ · "
        f"{datetime.utcnow().strftime('%d/%m/%Y %H:%M')} UTC",
        ParagraphStyle("footer", parent=small_style, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()


def _kpi_cell(label: str, value: str, value_color: Any) -> Table:
    """Renders a small KPI card as a nested table."""
    data = [[
        Paragraph(value, ParagraphStyle(
            "kpi_val", fontName="Helvetica-Bold", fontSize=16,
            textColor=value_color, alignment=TA_CENTER,
        )),
    ], [
        Paragraph(label, ParagraphStyle(
            "kpi_lbl", fontName="Helvetica", fontSize=7.5,
            textColor=SLATE_400, alignment=TA_CENTER,
        )),
    ]]
    t = Table(data)
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t
