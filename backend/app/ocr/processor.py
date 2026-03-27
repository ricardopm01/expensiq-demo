"""ExpensIQ — OCR processor dispatcher."""

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("expensiq.ocr")


class OCRProcessor:
    """Dispatches OCR to the configured provider (mock or tesseract)."""

    def process(self, file_content: bytes, filename: str) -> dict:
        provider = settings.OCR_PROVIDER

        if provider == "google":
            from app.ocr.google_provider import GoogleVisionProvider
            return GoogleVisionProvider().extract(file_content, filename)
        elif provider == "claude":
            from app.ocr.claude_provider import ClaudeVisionProvider
            return ClaudeVisionProvider().extract(file_content, filename)
        elif provider == "tesseract":
            from app.ocr.tesseract_provider import TesseractProvider
            return TesseractProvider().extract(file_content, filename)
        else:
            from app.ocr.mock_provider import MockProvider
            return MockProvider().extract(file_content, filename)


ocr_processor = OCRProcessor()
