"""ExpensIQ — Tesseract OCR provider for real receipt processing."""

import io
import logging
import re
from datetime import date, datetime
from typing import Optional

from PIL import Image

logger = logging.getLogger("expensiq.ocr.tesseract")


class TesseractProvider:
    """Extracts structured fields from receipt images using Tesseract OCR."""

    def extract(self, file_content: bytes, filename: str) -> dict:
        import pytesseract

        # Handle PDF vs image
        if filename.lower().endswith(".pdf"):
            text = self._extract_from_pdf(file_content)
        else:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image, lang="spa+eng")

        logger.info("Tesseract extracted %d chars from %s", len(text), filename)

        return {
            "merchant": self._extract_merchant(text),
            "date": self._extract_date(text),
            "amount": self._extract_amount(text),
            "currency": self._extract_currency(text),
            "tax": self._extract_tax(text),
            "raw_text": text[:2000],  # Cap raw text
            "confidence": self._estimate_confidence(text),
            "provider": "tesseract",
        }

    def _extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from first page of PDF."""
        import pytesseract
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(file_content, first_page=1, last_page=1)
            if images:
                return pytesseract.image_to_string(images[0], lang="spa+eng")
        except ImportError:
            logger.warning("pdf2image not installed, attempting direct OCR")
        return ""

    def _extract_merchant(self, text: str) -> Optional[str]:
        """First non-empty line is likely the merchant name."""
        for line in text.strip().split("\n"):
            line = line.strip()
            if line and len(line) > 2 and not line.replace(" ", "").isdigit():
                return line[:100]
        return None

    def _extract_date(self, text: str) -> Optional[date]:
        """Find date patterns in text."""
        # DD/MM/YYYY or DD-MM-YYYY
        patterns = [
            r"(\d{2})[/\-.](\d{2})[/\-.](\d{4})",
            r"(\d{4})[/\-.](\d{2})[/\-.](\d{2})",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                try:
                    if len(groups[0]) == 4:  # YYYY-MM-DD
                        return date(int(groups[0]), int(groups[1]), int(groups[2]))
                    else:  # DD/MM/YYYY
                        return date(int(groups[2]), int(groups[1]), int(groups[0]))
                except (ValueError, IndexError):
                    continue
        return None

    def _extract_amount(self, text: str) -> Optional[float]:
        """Find the largest monetary amount (likely the total)."""
        # Match patterns like: 123.45, 1.234,56, €123.45
        amounts = []
        for match in re.finditer(r"[\€\$]?\s*(\d{1,6}[.,]\d{2})\b", text):
            try:
                val = match.group(1).replace(",", ".")
                amounts.append(float(val))
            except ValueError:
                pass

        # Also match "TOTAL: 123.45" pattern
        total_match = re.search(r"(?:total|importe|amount)[:\s]*[\€\$]?\s*(\d{1,6}[.,]\d{2})", text, re.IGNORECASE)
        if total_match:
            try:
                val = total_match.group(1).replace(",", ".")
                return float(val)
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
        return "EUR"  # Default

    def _extract_tax(self, text: str) -> Optional[float]:
        """Extract tax/IVA amount."""
        tax_match = re.search(r"(?:iva|tax|vat|impuesto)[:\s]*[\€\$]?\s*(\d{1,6}[.,]\d{2})", text, re.IGNORECASE)
        if tax_match:
            try:
                return float(tax_match.group(1).replace(",", "."))
            except ValueError:
                pass
        return None

    def _estimate_confidence(self, text: str) -> float:
        """Rough confidence estimate based on text quality."""
        if not text or len(text) < 10:
            return 0.1
        # More text with recognizable patterns = higher confidence
        score = 0.5
        if re.search(r"\d{2}[/\-]\d{2}[/\-]\d{4}", text):
            score += 0.15
        if re.search(r"\d+[.,]\d{2}", text):
            score += 0.15
        if len(text) > 100:
            score += 0.1
        return min(score, 0.95)
