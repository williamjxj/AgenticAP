"""Integration tests for upload API endpoints."""

import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sample_pdf_file(tmp_path: Path) -> Path:
    """Create a sample PDF file for testing."""
    pdf_file = tmp_path / "test_invoice.pdf"
    pdf_file.write_bytes(
        b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 0\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF",
    )
    return pdf_file


@pytest.fixture
def sample_image_file(tmp_path: Path) -> Path:
    """Create a sample image file for testing."""
    image_file = tmp_path / "test_invoice.png"
    image_file.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    return image_file


async def test_upload_single_file(client_with_db: AsyncClient, sample_pdf_file: Path) -> None:
    content = sample_pdf_file.read_bytes()
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test_invoice.pdf", content, "application/pdf"))],
        data={"subfolder": "uploads", "force_reprocess": "false"},
    )

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "success"
    assert len(data["data"]["uploads"]) == 1
    assert data["data"]["successful"] == 1


async def test_upload_rejects_unsupported_type(client_with_db: AsyncClient) -> None:
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test.txt", b"hello", "text/plain"))],
        data={"subfolder": "uploads"},
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["data"]["failed"] == 1
    item = payload["data"]["uploads"][0]
    assert item["status"] == "failed"
    assert "Unsupported" in (item.get("error_message") or "")


async def test_upload_rejects_over_max_size(
    client_with_db: AsyncClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    import interface.api.routes.uploads as uploads_mod

    monkeypatch.setattr(uploads_mod, "MAX_FILE_SIZE", 64)
    pdf = tmp_path / "big.pdf"
    pdf.write_bytes(b"x" * 128)
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("big.pdf", pdf.read_bytes(), "application/pdf"))],
        data={"subfolder": "uploads"},
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["data"]["failed"] == 1
    msg = (payload["data"]["uploads"][0].get("error_message") or "").lower()
    assert "exceeds maximum" in msg or "maximum allowed" in msg


async def test_upload_empty_file_fails_row(client_with_db: AsyncClient, tmp_path: Path) -> None:
    empty = tmp_path / "empty.pdf"
    empty.write_bytes(b"")
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("empty.pdf", empty.read_bytes(), "application/pdf"))],
        data={"subfolder": "uploads"},
    )
    assert response.status_code == 202
    payload = response.json()
    assert payload["data"]["failed"] == 1
    assert "empty" in (payload["data"]["uploads"][0].get("error_message") or "").lower()


async def test_upload_no_files_unprocessable(client_with_db: AsyncClient) -> None:
    response = await client_with_db.post(
        "/api/v1/uploads",
        data={"subfolder": "uploads"},
    )
    assert response.status_code == 422


async def test_upload_invalid_subfolder(client_with_db: AsyncClient, sample_pdf_file: Path) -> None:
    content = sample_pdf_file.read_bytes()
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test_invoice.pdf", content, "application/pdf"))],
        data={"subfolder": "../evil"},
    )
    assert response.status_code == 400


async def test_upload_multiple_files(
    client_with_db: AsyncClient, sample_pdf_file: Path, sample_image_file: Path,
) -> None:
    response = await client_with_db.post(
        "/api/v1/uploads",
        files=[
            ("files", ("test_invoice.pdf", sample_pdf_file.read_bytes(), "application/pdf")),
            ("files", ("test_invoice.png", sample_image_file.read_bytes(), "image/png")),
        ],
        data={"subfolder": "uploads", "force_reprocess": "false"},
    )

    assert response.status_code == 202
    data = response.json()
    assert len(data["data"]["uploads"]) == 2


async def test_upload_status_endpoint_not_found(client_with_db: AsyncClient) -> None:
    invoice_id = uuid.uuid4()
    response = await client_with_db.get(f"/api/v1/uploads/{invoice_id}/status")
    assert response.status_code == 404


async def test_upload_status_after_upload(client_with_db: AsyncClient, sample_pdf_file: Path) -> None:
    content = sample_pdf_file.read_bytes()
    up = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test_invoice.pdf", content, "application/pdf"))],
        data={"subfolder": "uploads", "force_reprocess": "false"},
    )
    assert up.status_code == 202
    invoice_id = up.json()["data"]["uploads"][0]["invoice_id"]
    assert invoice_id
    st = await client_with_db.get(f"/api/v1/uploads/{invoice_id}/status")
    assert st.status_code == 200
    body = st.json()
    assert body["data"]["invoice_id"] == invoice_id
    assert body["data"]["file_name"] == "test_invoice.pdf"
    assert body["data"]["processing_status"]


async def test_upload_duplicate_detection(client_with_db: AsyncClient, sample_pdf_file: Path) -> None:
    content = sample_pdf_file.read_bytes()
    response1 = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test_invoice.pdf", content, "application/pdf"))],
        data={"subfolder": "uploads", "force_reprocess": "false"},
    )

    assert response1.status_code == 202

    response2 = await client_with_db.post(
        "/api/v1/uploads",
        files=[("files", ("test_invoice.pdf", content, "application/pdf"))],
        data={"subfolder": "uploads", "force_reprocess": "false"},
    )

    assert response2.status_code == 202
    data = response2.json()
    assert data["data"]["skipped"] >= 1 or any(
        item["status"] == "duplicate" for item in data["data"]["uploads"]
    )
