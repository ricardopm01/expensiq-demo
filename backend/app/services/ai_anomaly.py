"""ExpensIQ — AI-powered anomaly detection using Claude."""

import json
import logging
import uuid
from datetime import datetime

import anthropic

from app.core.config import settings

logger = logging.getLogger("expensiq.ai_anomaly")

ANALYSIS_PROMPT = """You are an expert expense auditor analyzing company expenses.
Review the following expense data and identify anomalies, suspicious patterns, or policy violations.

For each anomaly found, return a JSON array of objects with:
- "alert_type": one of "policy_violation", "duplicate", "rapid_repeat", "no_match", "suspicious_pattern"
- "description": clear explanation in Spanish of what is suspicious and why
- "severity": "low", "medium", "high", or "critical"
- "receipt_id": the UUID of the receipt involved (if applicable, otherwise null)
- "employee_id": the UUID of the employee involved (if applicable, otherwise null)

Look for:
1. Unusual spending patterns (sudden spikes, weekend expenses, late-night purchases)
2. Possible duplicate submissions (similar amounts/merchants within days)
3. Category misclassification (e.g., entertainment classified as supplies)
4. Expenses that seem unusually high for their category
5. Employees significantly over budget
6. Rapid repeated purchases from the same merchant

Return ONLY a valid JSON array. If no anomalies found, return [].

EXPENSE DATA:
"""


class AIAnomalyDetector:
    """Detect expense anomalies using Claude AI."""

    def analyze(self, receipts_data: list[dict], employees_data: list[dict]) -> list[dict]:
        if not settings.ANTHROPIC_API_KEY:
            logger.warning("ANTHROPIC_API_KEY not set, skipping AI anomaly detection")
            return []

        # Build a compact summary for Claude
        summary = self._build_summary(receipts_data, employees_data)

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": ANALYSIS_PROMPT + summary,
                    }
                ],
            )

            raw = response.content[0].text
            alerts = json.loads(raw)

            if not isinstance(alerts, list):
                logger.warning("AI anomaly response is not a list: %s", raw[:200])
                return []

            return alerts

        except json.JSONDecodeError:
            logger.error("AI anomaly returned non-JSON: %s", raw[:200])
            return []
        except Exception as e:
            logger.error("AI anomaly detection failed: %s", str(e))
            return []

    def _build_summary(self, receipts: list[dict], employees: list[dict]) -> str:
        lines = []

        lines.append("## EMPLOYEES:")
        for emp in employees:
            budget = emp.get("monthly_budget") or "N/A"
            lines.append(
                f"- {emp['name']} (ID: {emp['id']}, dept: {emp.get('department', 'N/A')}, "
                f"budget: {budget} EUR, total_spending: {emp.get('total_spending', 0)} EUR)"
            )

        lines.append("\n## RECENT RECEIPTS (last 90 days):")
        for r in receipts[:100]:  # Limit to avoid token overflow
            lines.append(
                f"- ID: {r['id']} | Employee: {r.get('employee_name', 'N/A')} "
                f"(EmpID: {r.get('employee_id')}) | {r.get('merchant', 'N/A')} | "
                f"{r.get('date', 'N/A')} | {r.get('amount', 0)} {r.get('currency', 'EUR')} | "
                f"Category: {r.get('category', 'other')} | Status: {r.get('status', 'pending')}"
            )

        return "\n".join(lines)
