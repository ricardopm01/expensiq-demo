"""ExpensIQ — AI-powered spending forecast using Claude."""

import json
import logging
from statistics import mean, stdev

import anthropic

from app.core.config import settings

logger = logging.getLogger("expensiq.ai_forecast")

FORECAST_PROMPT = """Eres un analista financiero experto en gastos empresariales.
Analiza el historial de gastos del empleado y genera una predicción para el próximo mes.

Responde SOLO con un JSON válido con estos campos:
- "forecast_next_month": número decimal (importe previsto en EUR para el próximo mes)
- "trend": "increasing" | "decreasing" | "stable"
- "confidence": "high" | "medium" | "low"
- "insight": string en español (2-3 frases explicando la predicción, el patrón detectado y una recomendación concreta)

DATOS DEL EMPLEADO:
"""


class AIForecastService:
    """Predict next-month employee spending using Claude AI with statistical fallback."""

    def forecast(self, employee: dict, monthly_history: list[dict]) -> dict:
        amounts = [m["total"] for m in monthly_history if m["total"] > 0]

        # Statistical fallback (always computed as baseline)
        if len(amounts) >= 2:
            stat_forecast = mean(amounts[-3:]) if len(amounts) >= 3 else mean(amounts)
            if len(amounts) >= 3:
                recent_trend = amounts[-1] - amounts[-3]
                stat_forecast += recent_trend * 0.3
        elif amounts:
            stat_forecast = amounts[-1]
        else:
            stat_forecast = float(employee.get("monthly_budget") or 0) * 0.6

        stat_forecast = max(0.0, stat_forecast)

        if not settings.ANTHROPIC_API_KEY:
            return self._stat_result(employee, monthly_history, stat_forecast, amounts)

        try:
            summary = self._build_summary(employee, monthly_history)
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{"role": "user", "content": FORECAST_PROMPT + summary}],
            )
            raw = response.content[0].text.strip()
            # Strip markdown code blocks if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw)
            return {
                "forecast_next_month": float(result.get("forecast_next_month", stat_forecast)),
                "trend": result.get("trend", "stable"),
                "confidence": result.get("confidence", "medium"),
                "insight": result.get("insight", ""),
            }
        except Exception as e:
            logger.error("AI forecast failed for %s: %s", employee.get("name"), str(e))
            return self._stat_result(employee, monthly_history, stat_forecast, amounts)

    def _stat_result(self, employee: dict, monthly_history: list[dict], stat_forecast: float, amounts: list[float]) -> dict:
        if len(amounts) >= 3:
            recent = mean(amounts[-2:])
            older = mean(amounts[:-2])
            trend = "increasing" if recent > older * 1.1 else "decreasing" if recent < older * 0.9 else "stable"
        else:
            trend = "stable"

        budget = float(employee.get("monthly_budget") or 0)
        pct = (stat_forecast / budget * 100) if budget > 0 else 0
        trend_es = {"increasing": "en aumento", "decreasing": "en descenso", "stable": "estable"}.get(trend, "estable")

        insight = (
            f"Basado en el historial de {len(amounts)} meses, el gasto de {employee.get('name', '')} "
            f"muestra una tendencia {trend_es}. "
            f"La previsión para el próximo mes es de {stat_forecast:.0f} EUR"
            f"{f', que representa el {pct:.0f}% del presupuesto mensual.' if budget > 0 else '.'} "
            f"{'Se recomienda revisar las categorías de mayor gasto para optimizar el presupuesto.' if pct > 80 else 'El gasto se mantiene dentro de los parámetros habituales.'}"
        )

        return {
            "forecast_next_month": round(stat_forecast, 2),
            "trend": trend,
            "confidence": "medium" if len(amounts) >= 3 else "low",
            "insight": insight,
        }

    def _build_summary(self, employee: dict, monthly_history: list[dict]) -> str:
        lines = [
            f"Empleado: {employee.get('name')} ({employee.get('department', 'N/A')})",
            f"Presupuesto mensual: {employee.get('monthly_budget', 'N/A')} EUR",
            "",
            "Historial de gasto mensual (últimos meses):",
        ]
        for m in monthly_history:
            lines.append(f"  - {m['month']}: {m['total']:.2f} EUR ({m['count']} recibos)")
        return "\n".join(lines)
