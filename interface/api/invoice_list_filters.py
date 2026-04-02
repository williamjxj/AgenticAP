"""Invoice list filtering for FastAPI (aligned with dashboard `get_invoice_list` semantics)."""

from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import Select, func, or_, select

from core.models import ExtractedData, Invoice, ProcessingStatus, ValidationResult, ValidationStatus


def apply_invoice_list_filters(
    query: Select[Any],
    *,
    status: ProcessingStatus | None = None,
    search_query: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    vendor: str | None = None,
    amount_min: float | None = None,
    amount_max: float | None = None,
    confidence_min: float | None = None,
    validation_status: str | None = None,
) -> Select[Any]:
    """Apply dashboard-equivalent filters to a query that already joins Invoice ↔ ExtractedData."""

    if status is not None:
        query = query.where(Invoice.processing_status == status)

    if search_query:
        pattern = f"%{search_query}%"
        query = query.where(
            or_(
                Invoice.file_name.ilike(pattern),
                ExtractedData.vendor_name.ilike(pattern),
            ),
        )

    if date_from is not None:
        query = query.where(Invoice.created_at >= datetime.combine(date_from, time.min))

    if date_to is not None:
        exclusive_end = datetime.combine(date_to + timedelta(days=1), time.min)
        query = query.where(Invoice.created_at < exclusive_end)

    if vendor:
        query = query.where(ExtractedData.vendor_name.ilike(f"%{vendor}%"))

    if amount_min is not None:
        query = query.where(ExtractedData.total_amount >= amount_min)

    if amount_max is not None:
        query = query.where(ExtractedData.total_amount <= amount_max)

    if confidence_min is not None:
        query = query.where(ExtractedData.extraction_confidence >= confidence_min)

    if validation_status:
        if validation_status == "all_passed":
            failed_sq = (
                select(ValidationResult.invoice_id)
                .where(ValidationResult.status == ValidationStatus.FAILED)
                .distinct()
            )
            query = query.where(~Invoice.id.in_(failed_sq))
        elif validation_status == "has_failed":
            failed_sq = (
                select(ValidationResult.invoice_id)
                .where(ValidationResult.status == ValidationStatus.FAILED)
                .distinct()
            )
            query = query.where(Invoice.id.in_(failed_sq))
        elif validation_status == "has_warning":
            warn_sq = (
                select(ValidationResult.invoice_id)
                .where(ValidationResult.status == ValidationStatus.WARNING)
                .distinct()
            )
            query = query.where(Invoice.id.in_(warn_sq))
        else:
            raise ValueError(f"Invalid validation_status: {validation_status}")

    return query


def base_invoice_list_select() -> Select[Any]:
    return select(Invoice).outerjoin(ExtractedData, ExtractedData.invoice_id == Invoice.id)


def invoice_list_count_select() -> Select[Any]:
    return select(func.count(func.distinct(Invoice.id))).select_from(Invoice).outerjoin(
        ExtractedData,
        ExtractedData.invoice_id == Invoice.id,
    )
