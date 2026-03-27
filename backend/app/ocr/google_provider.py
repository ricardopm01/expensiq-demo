"""ExpensIQ — Google Cloud Vision OCR provider using REST API with API Key."""

import base64
import json
import logging
import re
from datetime import date
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger("expensiq.ocr.google")

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"


class GoogleVisionProvider:
    """OCR provider using Google Cloud Vision API (API Key auth)."""

    def extract(self, file_content: bytes, filename: str) -> dict:
        image_b64 = base64.b64encode(file_content).decode("utf-8")

        payload = {
            "requests": [
                {
                    "image": {"content": image_b64},
                    "features": [
                        {"type": "TEXT_DETECTION"},
                        {"type": "DOCUMENT_TEXT_DETECTION"},
                    ],
                }
            ]
        }

        try:
            resp = requests.post(
                VISION_URL,
                params={"key": settings.GOOGLE_VISION_API_KEY},
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            responses = data.get("responses", [{}])
            annotation = responses[0] if responses else {}

            # Prefer fullTextAnnotation (DOCUMENT_TEXT_DETECTION) for better structure
            full_text = ""
            if "fullTextAnnotation" in annotation:
                full_text = annotation["fullTextAnnotation"].get("text", "")
            elif "textAnnotations" in annotation:
                full_text = annotation["textAnnotations"][0].get("description", "")

            if not full_text:
                logger.warning("Google Vision returned no text for %s", filename)
                return self._empty_result(full_text)

            logger.info("Google Vision extracted %d chars from %s", len(full_text), filename)

            return {
                "merchant": self._extract_merchant(full_text),
                "date": self._extract_date(full_text),
                "amount": self._extract_amount(full_text),
                "currency": self._extract_currency(full_text),
                "tax": self._extract_tax(full_text),
                "raw_text": full_text[:2000],
                "confidence": self._estimate_confidence(full_text),
                "provider": "google",
                "line_items": None,
                "payment_method": self._extract_payment_method(full_text),
            }

        except requests.RequestException as e:
            logger.error("Google Vision API request failed: %s", e)
            raise
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            logger.error("Failed to parse Google Vision response: %s", e)
            raise

    def _empty_result(self, raw_text: str) -> dict:
        return {
            "merchant": None,
            "date": None,
            "amount": None,
            "currency": "EUR",
            "tax": None,
            "raw_text": raw_text[:2000] if raw_text else "",
            "confidence": 0.1,
            "provider": "google",
            "line_items": None,
            "payment_method": None,
        }

    def _extract_merchant(self, text: str) -> Optional[str]:
        """First meaningful non-numeric line is likely the merchant."""
        for line in text.strip().split("\n"):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            # Skip lines that are mostly numbers/dates
            if re.match(r"^[\d\s/\-.:€$%]+$", line):
                continue
            # Skip common header words
            lower = line.lower()
            if any(w in lower for w in ["factura", "ticket", "recibo", "fecha", "nif", "cif", "tel"]):
                continue
            return line[:120]
        return None

    def _extract_date(self, text: str) -> Optional[str]:
        """Find date patterns in text."""
        patterns = [
            # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
            (r"(\d{2})[/\-.](\d{2})[/\-.](\d{4})", "dmy"),
            # YYYY-MM-DD
            (r"(\d{4})[/\-.](\d{2})[/\-.](\d{2})", "ymd"),
        ]
        for pattern, fmt in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                try:
                    if fmt == "ymd":
                        d = date(int(groups[0]), int(groups[1]), int(groups[2]))
                    else:
                        d = date(int(groups[2]), int(groups[1]), int(groups[0]))
                    return d.isoformat()
                except (ValueError, IndexError):
                    continue
        return None

    def _extract_amount(self, text: str) -> Optional[float]:
        """Find the total amount — prefer explicit TOTAL lines."""
        # Look for explicit total patterns first
        total_patterns = [
            r"(?:total|importe\s*total|amount|a\s*pagar|total\s*eur)[:\s]*[\€\$]?\s*(\d{1,6}[.,]\d{2})",
            r"(\d{1,6}[.,]\d{2})\s*(?:€|EUR)\s*$",
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                try:
                    val = match.group(1).replace(",", ".")
                    return float(val)
                except ValueError:
                    pass

        # Fallback: largest amount found
        amounts = []
        for match in re.finditer(r"(\d{1,6}[.,]\d{2})", text):
            try:
                val = match.group(1).replace(",", ".")
                amounts.append(float(val))
            except ValueError:
                pass
        return max(amounts) if amounts else None

    def _extract_currency(self, text: str) -> str:
        if "€" in text or "EUR" in text.upper():
            return "EUR"
        if "$" in text or "USD" in text.upper():
            return "USD"
        if "£" in text or "GBP" in text.upper():
            return "GBP"
        return "EUR"

    def _extract_tax(self, text: str) -> Optional[float]:
        """Extract IVA/tax amount."""
        tax_patterns = [
            r"(?:iva|i\.v\.a|tax|vat|impuesto)[:\s]*[\€\$]?\s*(\d{1,6}[.,]\d{2})",
            r"(\d{1,6}[.,]\d{2})\s*(?:iva|i\.v\.a)",
        ]
        for pattern in tax_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", "."))
                except ValueError:
                    pass
        return None

    def _extract_payment_method(self, text: str) -> Optional[str]:
        lower = text.lower()
        if any(w in lower for w in ["visa", "mastercard", "tarjeta", "card", "4b", "débito", "crédito"]):
            return "card"
        if any(w in lower for w in ["efectivo", "cash", "metálico"]):
            return "cash"
        if any(w in lower for w in ["transferencia", "transfer", "bizum"]):
            return "transfer"
        return None

    def _estimate_confidence(self, text: str) -> float:
        if not text or len(text) < 10:
            return 0.1
        score = 0.6
        if re.search(r"\d{2}[/\-]\d{2}[/\-]\d{4}", text):
            score += 0.1
        if re.search(r"\d+[.,]\d{2}", text):
            score += 0.1
        if len(text) > 100:
            score += 0.1
        return min(score, 0.95)
