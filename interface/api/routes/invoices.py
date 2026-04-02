"""Invoice route handlers."""

import mimetypes
import uuid
from datetime import date
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_session
from core.logging import get_logger
from core.models import ExtractedData, Invoice, ProcessingStatus, ValidationResult
from core.queue import get_queries
from ingestion.orchestrator import process_invoice_file
from interface.api.invoice_list_filters import (
    apply_invoice_list_filters,
    base_invoice_list_select,
    invoice_list_count_select,
)
from interface.api.schemas import (
    BulkActionItem,
    BulkActionResponse,
    BulkReprocessRequest,
    InvoiceDetailResponse,
    InvoiceListResponse,
    InvoiceSummary,
    Pagination,
    ProcessInvoiceRequest,
    ProcessInvoiceResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/invoices", tags=["Invoices"])


def _status_param(status: str | None) -> ProcessingStatus | None:
    if not status:
        return None
    try:
        return ProcessingStatus(status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}") from e


def _sort_columns(sort_by: str, sort_order: str):
    if sort_by == "created_at":
        sort_column = Invoice.created_at
    elif sort_by == "processed_at":
        sort_column = Invoice.processed_at
    elif sort_by == "file_name":
        sort_column = Invoice.file_name
    else:
        raise HTTPException(status_code=400, detail=f"Invalid sort_by: {sort_by}")
    if sort_order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail=f"Invalid sort_order: {sort_order}")
    return sort_column


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    status: Annotated[str | None, Query(description="Filter by processing status")] = None,
    search: Annotated[str | None, Query(description="Substring match on file name or vendor")] = None,
    vendor: Annotated[str | None, Query(description="Vendor name substring")] = None,
    min_amount: Annotated[float | None, Query(description="Minimum total amount")] = None,
    max_amount: Annotated[float | None, Query(description="Maximum total amount")] = None,
    confidence: Annotated[
        float | None,
        Query(ge=0.0, le=1.0, description="Minimum extraction confidence"),
    ] = None,
    validation_status: Annotated[
        str | None,
        Query(description="all_passed | has_failed | has_warning"),
    ] = None,
    date_from: Annotated[date | None, Query(description="Created on/Created after (inclusive)")] = None,
    date_to: Annotated[date | None, Query(description="Created on/before (inclusive date)")] = None,
    page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    sort_by: Annotated[str, Query(description="Sort field")] = "created_at",
    sort_order: Annotated[str, Query(description="Sort order")] = "desc",
    session: AsyncSession = Depends(get_session),
) -> InvoiceListResponse:
    """List processed invoices with pagination and dashboard-equivalent filters."""
    status_enum = _status_param(status)
    sort_column = _sort_columns(sort_by, sort_order)

    try:
        count_query = invoice_list_count_select()
        count_query = apply_invoice_list_filters(
            count_query,
            status=status_enum,
            search_query=search,
            date_from=date_from,
            date_to=date_to,
            vendor=vendor,
            amount_min=min_amount,
            amount_max=max_amount,
            confidence_min=confidence,
            validation_status=validation_status,
        )
        total_result = await session.execute(count_query)
        total_items = total_result.scalar() or 0
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    query = base_invoice_list_select()
    try:
        query = apply_invoice_list_filters(
            query,
            status=status_enum,
            search_query=search,
            date_from=date_from,
            date_to=date_to,
            vendor=vendor,
            amount_min=min_amount,
            amount_max=max_amount,
            confidence_min=confidence,
            validation_status=validation_status,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    offset = (page - 1) * page_size
    query = query.options(selectinload(Invoice.extracted_data)).offset(offset).limit(page_size)

    result = await session.execute(query)
    invoices = result.unique().scalars().all()

    invoice_summaries = []
    for invoice in invoices:
        extracted_data = invoice.extracted_data
        summary = InvoiceSummary(
            id=str(invoice.id),
            file_name=invoice.file_name,
            storage_path=invoice.storage_path,
            category=invoice.category,
            group=invoice.group,
            job_id=str(invoice.job_id) if invoice.job_id else None,
            file_type=invoice.file_type,
            processing_status=invoice.processing_status.value,
            vendor_name=extracted_data.vendor_name if extracted_data else None,
            total_amount=float(extracted_data.total_amount) if extracted_data and extracted_data.total_amount else None,
            currency=extracted_data.currency if extracted_data else None,
            created_at=invoice.created_at,
            processed_at=invoice.processed_at,
        )
        if invoice.processing_status == ProcessingStatus.FAILED and invoice.error_message:
            logger.debug(
                "Invoice processing failed",
                invoice_id=str(invoice.id),
                error_message=invoice.error_message,
            )
        invoice_summaries.append(summary)

    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0

    pagination = Pagination(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )

    return InvoiceListResponse(
        status="success",
        data=invoice_summaries,
        pagination=pagination,
    )


_EXPORT_ROW_LIMIT = 50_000


@router.get("/export/csv")
async def export_invoices_csv(
    status: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    vendor: Annotated[str | None, Query()] = None,
    min_amount: Annotated[float | None, Query()] = None,
    max_amount: Annotated[float | None, Query()] = None,
    confidence: Annotated[float | None, Query(ge=0.0, le=1.0)] = None,
    validation_status: Annotated[str | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Export filtered invoice list as CSV (same filters as list; cap on row count)."""
    from interface.dashboard.components.export_utils import export_invoice_list_to_csv

    status_enum = _status_param(status)
    try:
        query = base_invoice_list_select()
        query = apply_invoice_list_filters(
            query,
            status=status_enum,
            search_query=search,
            date_from=date_from,
            date_to=date_to,
            vendor=vendor,
            amount_min=min_amount,
            amount_max=max_amount,
            confidence_min=confidence,
            validation_status=validation_status,
        )
        query = query.order_by(Invoice.created_at.desc())
        query = query.options(selectinload(Invoice.extracted_data)).limit(_EXPORT_ROW_LIMIT)
        result = await session.execute(query)
        invoices = result.unique().scalars().all()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    rows: list[dict] = []
    for inv in invoices:
        ed = inv.extracted_data
        rows.append(
            {
                "invoice_id": str(inv.id),
                "file_name": inv.file_name,
                "processing_status": inv.processing_status.value,
                "vendor_name": ed.vendor_name if ed else None,
                "total_amount": float(ed.total_amount) if ed and ed.total_amount is not None else None,
                "currency": ed.currency if ed else None,
                "invoice_date": ed.invoice_date if ed else None,
                "created_at": inv.created_at,
            },
        )

    csv_bytes = export_invoice_list_to_csv(rows)
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="invoices-export.csv"'},
    )


@router.get("/{invoice_id}/export/pdf")
async def export_invoice_pdf(
    invoice_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Export a single invoice detail as PDF."""
    from interface.dashboard.components.export_utils import export_invoice_detail_to_pdf

    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await session.execute(query)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: {invoice_id}")

    extracted_query = select(ExtractedData).where(ExtractedData.invoice_id == invoice.id)
    extracted_result = await session.execute(extracted_query)
    extracted_data = extracted_result.scalar_one_or_none()

    validation_query = select(ValidationResult).where(ValidationResult.invoice_id == invoice.id)
    validation_result = await session.execute(validation_query)
    validation_results = validation_result.scalars().all()

    extracted_dict = None
    if extracted_data:
        extracted_dict = {
            "vendor_name": extracted_data.vendor_name,
            "invoice_number": extracted_data.invoice_number,
            "invoice_date": extracted_data.invoice_date,
            "total_amount": float(extracted_data.total_amount) if extracted_data.total_amount else None,
            "subtotal": float(extracted_data.subtotal) if extracted_data.subtotal else None,
            "tax_amount": float(extracted_data.tax_amount) if extracted_data.tax_amount else None,
            "currency": extracted_data.currency,
        }

    detail_dict: dict = {
        "invoice_id": str(invoice.id),
        "file_name": invoice.file_name,
        "processing_status": invoice.processing_status.value,
        "created_at": invoice.created_at,
        "extracted_data": extracted_dict,
        "validation_results": [
            {
                "rule_name": vr.rule_name,
                "status": vr.status.value,
                "error_message": vr.error_message,
            }
            for vr in validation_results
        ],
    }

    pdf_bytes = export_invoice_detail_to_pdf(detail_dict)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in invoice.file_name)[:80]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{safe_name}.pdf"'},
    )


def _resolved_invoice_file_path(invoice: Invoice) -> Path:
    """Resolve invoice storage_path under data/ with traversal protection."""
    data_dir = Path("data").resolve()
    rel = invoice.storage_path
    path_obj = Path(rel)
    if path_obj.parts and path_obj.parts[0] == "data":
        rel = str(Path(*path_obj.parts[1:]))
    file_path = (data_dir / rel).resolve()
    try:
        file_path.relative_to(data_dir)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid storage path") from e
    return file_path


@router.get("/{invoice_id}/file")
async def get_invoice_source_file(
    invoice_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Serve the original uploaded file for preview (PDF/image) when it exists on disk."""
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await session.execute(query)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: {invoice_id}")

    file_path = _resolved_invoice_file_path(invoice)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Source file not found on server")

    media_type, _ = mimetypes.guess_type(invoice.file_name or str(file_path))
    return FileResponse(
        path=file_path,
        media_type=media_type or "application/octet-stream",
        filename=invoice.file_name or file_path.name,
    )


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> InvoiceDetailResponse:
    """Get detailed invoice information with status validation.

    This endpoint validates that the invoice exists and returns current status.
    Status is always up-to-date as it's read directly from the database.
    """
    # Get invoice
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await session.execute(query)
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice not found: {invoice_id}")

    # Log status check for monitoring
    logger.debug(
        "Invoice status queried",
        invoice_id=str(invoice_id),
        current_status=invoice.processing_status.value,
    )

    # Get extracted data
    extracted_query = select(ExtractedData).where(ExtractedData.invoice_id == invoice.id)
    extracted_result = await session.execute(extracted_query)
    extracted_data = extracted_result.scalar_one_or_none()

    # Get validation results
    validation_query = select(ValidationResult).where(ValidationResult.invoice_id == invoice.id)
    validation_result = await session.execute(validation_query)
    validation_results = validation_result.scalars().all()

    # Build response
    from interface.api.schemas import ExtractedDataResponse, ValidationResultResponse

    extracted_response = None
    if extracted_data:
        extracted_response = ExtractedDataResponse(
            vendor_name=extracted_data.vendor_name,
            invoice_number=extracted_data.invoice_number,
            invoice_date=extracted_data.invoice_date,
            due_date=extracted_data.due_date,
            subtotal=float(extracted_data.subtotal) if extracted_data.subtotal else None,
            tax_amount=float(extracted_data.tax_amount) if extracted_data.tax_amount else None,
            tax_rate=float(extracted_data.tax_rate) if extracted_data.tax_rate else None,
            total_amount=float(extracted_data.total_amount) if extracted_data.total_amount else None,
            currency=extracted_data.currency,
            line_items=extracted_data.line_items,
            extraction_confidence=float(extracted_data.extraction_confidence) if extracted_data.extraction_confidence else None,
        )

    validation_responses = [
        ValidationResultResponse(
            rule_name=vr.rule_name,
            rule_description=vr.rule_description,
            status=vr.status.value,
            expected_value=float(vr.expected_value) if vr.expected_value else None,
            actual_value=float(vr.actual_value) if vr.actual_value else None,
            error_message=vr.error_message,
            validated_at=vr.validated_at,
        )
        for vr in validation_results
    ]

    from interface.api.schemas import InvoiceDetail, UploadMetadata

    upload_metadata_response = None
    if invoice.upload_metadata:
        upload_metadata_response = UploadMetadata(**invoice.upload_metadata)

    invoice_detail = InvoiceDetail(
        id=str(invoice.id),
        file_name=invoice.file_name,
        storage_path=invoice.storage_path,
        category=invoice.category,
        group=invoice.group,
        job_id=str(invoice.job_id) if invoice.job_id else None,
        file_type=invoice.file_type,
        file_hash=invoice.file_hash,
        version=invoice.version,
        processing_status=invoice.processing_status.value,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        processed_at=invoice.processed_at,
        error_message=invoice.error_message,
        upload_metadata=upload_metadata_response,
        extracted_data=extracted_response,
        validation_results=validation_responses,
    )

    return InvoiceDetailResponse(
        status="success",
        data=invoice_detail,
    )


@router.post("/process", response_model=ProcessInvoiceResponse, status_code=202)
async def process_invoice(
    request: ProcessInvoiceRequest,
    session: AsyncSession = Depends(get_session),
) -> ProcessInvoiceResponse:
    """Trigger processing of an invoice file."""
    from pathlib import Path

    # Resolve file path - handle both relative and absolute paths
    data_dir = Path("data").resolve()

    # Normalize the file path
    if Path(request.file_path).is_absolute():
        # If absolute path, check if it's within data directory
        file_path = Path(request.file_path)
        try:
            file_path.relative_to(data_dir)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"File path must be within data directory: {request.file_path}"
            )
    else:
        # Relative path - resolve against data directory
        file_path = (data_dir / request.file_path).resolve()
        # Security check: ensure resolved path is still within data directory
        try:
            file_path.relative_to(data_dir)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file path (path traversal detected): {request.file_path}"
            )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {request.file_path}. Please ensure the file exists in the data/ directory."
        )

    # Check file size before processing to prevent resource exhaustion
    try:
        file_size = file_path.stat().st_size
        if file_size == 0:
            raise HTTPException(status_code=400, detail=f"File is empty: {request.file_path}")
        if file_size > 100 * 1024 * 1024:  # 100MB limit
            raise HTTPException(
                status_code=400,
                detail=f"File too large: {file_size} bytes (maximum 100MB allowed)"
            )
    except OSError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot access file: {request.file_path} - {str(e)}"
        )

    logger.info("Processing invoice file requested", file_path=str(file_path), file_size=file_size)

    try:
        # Determine if we should process in background
        if request.background:
            # Enqueue job
            queries = await get_queries()
            import json
            payload = {
                "file_path": str(file_path),
                "data_dir": str(data_dir),
                "force_reprocess": request.force_reprocess,
                "category": request.category,
                "group": request.group,
                "job_id": request.job_id,
                "ocr_provider": request.ocr_provider,
            }
            # Enqueue returns job_id
            job_id = await queries.enqueue("process_invoice", json.dumps(payload).encode("utf-8"))

            logger.info("Invoice processing enqueued", file_path=str(file_path), job_id=str(job_id))

            return ProcessInvoiceResponse(
                status="success",
                data={
                    "invoice_id": "queued",  # ID not known until worker processes it or we pre-create it
                    "job_id": str(job_id),
                    "status": ProcessingStatus.QUEUED.value,
                },
            )

        # Process invoice synchronously
        invoice = await process_invoice_file(
            file_path=file_path,
            data_dir=data_dir,
            session=session,
            force_reprocess=request.force_reprocess,
            category=request.category,
            group=request.group,
            job_id=uuid.UUID(request.job_id) if request.job_id else None,
            ocr_provider=request.ocr_provider,
        )

        await session.commit()

        # Create processing job record (simplified for scaffold)
        from core.models import ExecutionType, JobType, ProcessingJob

        job = ProcessingJob(
            id=uuid.uuid4(),
            invoice_id=invoice.id,
            job_type=JobType.FILE_INGESTION,
            execution_type=ExecutionType.ASYNC_COROUTINE,
            status=invoice.processing_status,
        )
        session.add(job)
        await session.commit()

        return ProcessInvoiceResponse(
            status="success",
            data={
                "invoice_id": str(invoice.id),
                "job_id": str(job.id),
                "status": invoice.processing_status.value,
            },
        )

    except Exception as e:
        await session.rollback()
        error_type = type(e).__name__
        from core.logging import format_error_message
        user_friendly_error = format_error_message(e, context={"stage": "api_processing"})

        logger.error(
            "Invoice processing failed",
            file_path=str(file_path),
            error_type=error_type,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=user_friendly_error)


@router.post("/bulk/reprocess", response_model=BulkActionResponse)
async def bulk_reprocess_invoices(
    request: BulkReprocessRequest,
    session: AsyncSession = Depends(get_session),
) -> BulkActionResponse:
    """Reprocess multiple invoices in bulk.

    Args:
        request: Bulk reprocess request with invoice IDs
        session: Database session

    Returns:
        Bulk action response with results for each invoice
    """
    results: list[BulkActionItem] = []
    successful = 0
    failed = 0
    skipped = 0

    for invoice_id_str in request.invoice_ids:
        try:
            invoice_id = uuid.UUID(invoice_id_str)
        except ValueError:
            results.append(
                BulkActionItem(
                    invoice_id=invoice_id_str,
                    status="failed",
                    message="Invalid UUID format",
                )
            )
            failed += 1
            continue

        try:
            # Get invoice
            invoice_query = select(Invoice).where(Invoice.id == invoice_id)
            invoice_result = await session.execute(invoice_query)
            invoice = invoice_result.scalar_one_or_none()

            if not invoice:
                results.append(
                    BulkActionItem(
                        invoice_id=invoice_id_str,
                        status="skipped",
                        message="Invoice not found",
                    )
                )
                skipped += 1
                continue

            # Check if already processing
            if invoice.processing_status == ProcessingStatus.PROCESSING:
                results.append(
                    BulkActionItem(
                        invoice_id=invoice_id_str,
                        status="skipped",
                        message="Invoice is already being processed",
                    )
                )
                skipped += 1
                continue

            # Check if already processed and not forcing
            if (
                not request.force_reprocess
                and invoice.processing_status == ProcessingStatus.COMPLETED
            ):
                results.append(
                    BulkActionItem(
                        invoice_id=invoice_id_str,
                        status="skipped",
                        message="Invoice already processed (use force_reprocess=true to override)",
                    )
                )
                skipped += 1
                continue

            # Reprocess invoice
            file_path = Path("data") / invoice.storage_path
            if not file_path.exists():
                results.append(
                    BulkActionItem(
                        invoice_id=invoice_id_str,
                        status="failed",
                        message=f"File not found: {file_path}",
                    )
                )
                failed += 1
                continue

            # Create processing job
            job_invoice = await process_invoice_file(
                file_path=file_path,
                data_dir=Path("data"),
                session=session,
                force_reprocess=request.force_reprocess,
                category=invoice.category,
                group=invoice.group,
                job_id=invoice.job_id,
            )

            results.append(
                BulkActionItem(
                    invoice_id=invoice_id_str,
                    status="success",
                    message=f"Reprocessing job created for invoice: {job_invoice.id}",
                )
            )
            successful += 1

        except Exception as e:
            logger.error(
                "Bulk reprocess failed for invoice",
                invoice_id=invoice_id_str,
                error=str(e),
            )
            results.append(
                BulkActionItem(
                    invoice_id=invoice_id_str,
                    status="failed",
                    message=f"Error: {str(e)}",
                )
            )
            failed += 1

    await session.commit()

    return BulkActionResponse(
        status="success",
        total_requested=len(request.invoice_ids),
        successful=successful,
        failed=failed,
        skipped=skipped,
        results=results,
    )

