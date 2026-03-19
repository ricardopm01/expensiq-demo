"""ExpensIQ — Mock OCR provider for demo purposes."""

import random
from datetime import date, timedelta


MOCK_RESULTS = [
    {"merchant": "Uber",          "amount": 23.50, "tax": 4.93},
    {"merchant": "Starbucks",     "amount": 8.90,  "tax": 1.87},
    {"merchant": "Amazon.es",     "amount": 156.80,"tax": 32.93},
    {"merchant": "Hotel Ibis",    "amount": 89.00, "tax": 18.69},
    {"merchant": "Ryanair",       "amount": 67.30, "tax": 14.13},
    {"merchant": "Deliveroo",     "amount": 32.50, "tax": 6.83},
    {"merchant": "Renfe",         "amount": 45.60, "tax": 9.58},
    {"merchant": "Office Depot",  "amount": 234.50,"tax": 49.25},
]


class MockProvider:
    """Returns randomized mock OCR results for demo/testing."""

    def extract(self, file_content: bytes, filename: str) -> dict:
        template = random.choice(MOCK_RESULTS)
        receipt_date = date.today() - timedelta(days=random.randint(1, 30))

        return {
            "merchant": template["merchant"],
            "date": receipt_date,
            "amount": template["amount"],
            "currency": "EUR",
            "tax": template["tax"],
            "raw_text": f"[MOCK OCR] {template['merchant']} - {template['amount']} EUR",
            "confidence": round(random.uniform(0.85, 0.98), 3),
            "provider": "mock",
        }
