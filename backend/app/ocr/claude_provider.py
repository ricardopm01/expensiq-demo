"""ExpensIQ — Claude Vision OCR provider using Anthropic API."""

import base64
import json
import logging
from pathlib import Path

import anthropic

from app.core.config import settings

logger = logging.getLogger("expensiq.ocr.claude")

MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

EXTRACTION_PROMPT = """Analyze this receipt/invoice image. Extract the following fields as JSON:

{
  "merchant": "business name exactly as it appears",
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "currency": "EUR",
  "tax": 0.00,
  "line_items": [{"description": "item description", "amount": 0.00}],
  "payment_method": "card" | "cash" | "transfer" | null,
  "raw_text": "full text transcription of the receipt"
}

Rules:
- Return ONLY valid JSON, no markdown or extra text.
- If a field cannot be determined, use null.
- For currency, default to EUR if unclear.
- For tax, look for IVA, VAT, TVA, or similar.
- For payment_method, look for clues like "VISA", "MASTERCARD", "EFECTIVO", "TRANSFERENCIA".
- Include all line items you can identify.
- The amount should be the TOTAL amount (not individual items)."""


class ClaudeVisionProvider:
    """OCR provider using Claude Vision API."""

    def extract(self, file_content: bytes, filename: str) -> dict:
        ext = Path(filename).suffix.lower()
        media_type = MEDIA_TYPES.get(ext, "image/jpeg")

        if ext == ".pdf":
            logger.warning("PDF files not supported by Claude Vision provider, falling back to mock")
            from app.ocr.mock_provider import MockProvider
            return MockProvider().extract(file_content, filename)

        image_b64 = base64.b64encode(file_content).decode("utf-8")

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_b64,
                                },
                            },
                            {
                                "type": "text",
                                "text": EXTRACTION_PROMPT,
                            },
                        ],
                    }
                ],
            )

            raw_response = response.content[0].text
            # Try to parse JSON from the response
            data = json.loads(raw_response)

            return {
                "merchant": data.get("merchant"),
                "date": data.get("date"),
                "amount": data.get("amount"),
                "currency": data.get("currency", "EUR"),
                "tax": data.get("tax"),
                "raw_text": data.get("raw_text", raw_response),
                "confidence": 0.95,  # Claude Vision is high-confidence
                "provider": "claude",
                "line_items": json.dumps(data.get("line_items")) if data.get("line_items") else None,
                "payment_method": data.get("payment_method"),
            }

        except json.JSONDecodeError:
            logger.error("Claude returned non-JSON response: %s", raw_response[:200])
            return {
                "merchant": None,
                "date": None,
                "amount": None,
                "currency": "EUR",
                "tax": None,
                "raw_text": raw_response,
                "confidence": 0.3,
                "provider": "claude",
                "line_items": None,
                "payment_method": None,
            }
        except Exception as e:
            logger.error("Claude Vision OCR failed: %s", str(e))
            raise
