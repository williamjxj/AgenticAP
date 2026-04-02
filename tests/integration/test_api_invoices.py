"""Integration tests for invoice API endpoints."""

import uuid

import pytest
from fastapi.testclient import TestClient

from interface.api.main import app

client = TestClient(app)


def test_list_invoices_empty():
    """Test listing invoices when none exist."""
    response = client.get("/api/v1/invoices")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert isinstance(data["data"], list)
    assert "pagination" in data


def test_list_invoices_pagination():
    """Test invoice list pagination parameters."""
    response = client.get("/api/v1/invoices?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["page_size"] == 10


def test_get_invoice_not_found():
    """Test getting non-existent invoice."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/invoices/{fake_id}")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_process_invoice_file_not_found():
    """Test processing non-existent file."""
    response = client.post(
        "/api/v1/invoices/process",
        json={"file_path": "nonexistent.pdf"},
    )
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_list_invoices_invalid_status():
    """Test listing invoices with invalid status filter."""
    response = client.get("/api/v1/invoices?status=invalid_status")
    assert response.status_code == 400
    data = response.json()
    assert "invalid status" in data["detail"].lower()


def test_list_invoices_invalid_sort():
    """Test listing invoices with invalid sort field."""
    response = client.get("/api/v1/invoices?sort_by=invalid_field")
    assert response.status_code == 400
    data = response.json()
    assert "invalid sort_by" in data["detail"].lower()


def test_list_invoices_extended_filter_params_accepted():
    """Extended dashboard filters are accepted (200); result may be empty without DB seed."""
    response = client.get(
        "/api/v1/invoices?"
        "search=acme&vendor=ven&min_amount=0&max_amount=999999&confidence=0.5"
        "&validation_status=all_passed&date_from=2020-01-01&date_to=2025-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "pagination" in data


def test_list_invoices_invalid_validation_status():
    response = client.get("/api/v1/invoices?validation_status=not_a_real_status")
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


def test_export_csv_ok():
    response = client.get("/api/v1/invoices/export/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert response.content


def test_export_pdf_not_found():
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/invoices/{fake_id}/export/pdf")
    assert response.status_code == 404


def test_source_file_not_found():
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/invoices/{fake_id}/file")
    assert response.status_code == 404

