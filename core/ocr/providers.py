"""OCR provider registry metadata."""
from __future__ import annotations

import importlib.util




_PROVIDERS: dict[str, dict] = {
    "paddleocr": {
        "name": "PaddleOCR",
        "supported_formats": ["jpg", "jpeg", "png", "webp", "avif", "pdf"],
    },
}


def list_provider_ids() -> list[str]:
    """Return known provider IDs."""
    return sorted(_PROVIDERS.keys())


def get_provider_metadata(provider_id: str) -> dict:
    """Return provider metadata."""
    return _PROVIDERS[provider_id]


def provider_status(provider_id: str) -> str:
    """Return provider availability status."""
    if provider_id == "paddleocr":
        return "available" if importlib.util.find_spec("paddleocr") else "unavailable"
    return "unavailable"
