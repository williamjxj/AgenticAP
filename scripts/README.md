# Utility Scripts

This directory contains Python utility scripts for processing invoices, debugging, and maintaining the database. All shell scripts have been moved to the bin/ directory.


**Usage:**
# Python Utility Scripts (`scripts/`)

This directory contains **all Python utility scripts** for processing invoices, debugging, and maintaining the database. All shell scripts are now in the `bin/` directory.

## Quick Reference

| Use Case                        | Script                      | Example command                                      |
| :------------------------------ | :-------------------------- | :--------------------------------------------------- |
| **Batch process invoices**      | `process_invoices.py`       | `python3 scripts/process_invoices.py --dir data/`    |
| **Process HuggingFace dataset** | `process_hf_voxel51.py`     | `python3 scripts/process_hf_voxel51.py`              |
|                                 | `process_hf_mychen76.py`    | `python3 scripts/process_hf_mychen76.py`             |
|                                 | `process_hf_gokulraja.py`   | `python3 scripts/process_hf_gokulraja.py`            |
| **Inspect a specific invoice**  | `inspect_invoice.py`        | `python3 scripts/inspect_invoice.py <ID>`            |
| **List failed extractions**     | `inspect_invoice.py`        | `python3 scripts/inspect_invoice.py --failed`        |
| **Check batch job status**      | `inspect_invoice.py`        | `python3 scripts/inspect_invoice.py --job <ID>`      |
| **Test OCR/PDF on a file**      | `debug_ocr.py`              | `python3 scripts/debug_ocr.py <file>`                |
| **Query/Chat with your data**   | `debug_chatbot.py`          | `python3 scripts/debug_chatbot.py "query"`          |
| **Reset or clean up data**      | `cleanup_data.py`           | `python3 scripts/cleanup_data.py --all`              |
| **Test DB connection**          | `test_db_connection.py`     | `python3 scripts/test_db_connection.py`              |
| **Verify DB schema**            | `verify_db.py`              | `python3 scripts/verify_db.py`                       |
| **Fix HF confidences**          | `fix_hf_confidences.py`     | `python3 scripts/fix_hf_confidences.py`              |

---


## Processing Scripts

### process_invoices.py
The primary script for batch processing invoices. Walks through a directory and sends files to the AI-eInvoicing engine for extraction and validation.

#### Processing HuggingFace Datasets
You can use this script to process files downloaded from HuggingFace datasets (e.g., Voxel51, mychen76, GokulRajaR) that are saved in `data/hf_datasets/<dataset>/`.

**Example usage:**
```bash
# Process all images in the Voxel51 dataset
python3 scripts/process_invoices.py --dir data/hf_datasets/voxel51 --pattern "*.jpg"

# Process all images in all HuggingFace datasets (recursively)
python3 scripts/process_invoices.py --dir data/hf_datasets --recursive --pattern "*.jpg"
```
This will send each file to the extraction API, store results in the database, and make them available for inspection.

**Other usage:**
```bash
# Process all files in data/
python3 scripts/process_invoices.py

# Specify category and group
python3 scripts/process_invoices.py --category "Invoice" --group "Vendor_X" --dir data/vendor_x
```

### process_hf_voxel51.py, process_hf_mychen76.py, process_hf_gokulraja.py
Scripts for processing HuggingFace datasets using their respective adapters. Each script normalizes and ingests a specific dataset.

---

## Debugging & Inspection

### inspect_invoice.py
All-in-one tool for checking an invoice's lifecycle. Shows processing status, error messages, extracted AI data, and validation rule results.

**Usage:**
```bash
# Inspect the most recently processed invoice
python3 scripts/inspect_invoice.py

# List recent failed invoices
python3 scripts/inspect_invoice.py --failed

# List all invoices for a specific batch job
python3 scripts/inspect_invoice.py --job <job_id>

# Inspect by specific UUID or partial filename
python3 scripts/inspect_invoice.py 550e8400-e29b-41d4-a716-446655440000
python3 scripts/inspect_invoice.py "grok/1.jpg"
```

### debug_ocr.py
Tool for OCR testing and diagnostics. Supports image and PDF files.

**Usage:**
```bash
# Basic diagnostic (extract text and check key fields)
python3 scripts/debug_ocr.py data/samples/invoice.png

# Show full extracted text
python3 scripts/debug_ocr.py data/samples/invoice.png --raw

# Dump raw PaddleOCR structure for debugging
python3 scripts/debug_ocr.py data/samples/invoice.png --paddle-debug
```

### debug_chatbot.py
Diagnoses data availability for the chatbot and allows testing direct queries against the engine.

---

## Maintenance & Cleanup

### cleanup_data.py
Unified tool for data management. Replaces individual cleanup/reset scripts.

**Usage:**
```bash
# Show what would be deleted (safe)
python3 scripts/cleanup_data.py --all --dry-run

# Clean up only invoice records
python3 scripts/cleanup_data.py --invoices

# Clean up only vector embeddings
python3 scripts/cleanup_data.py --vectors

# Comprehensive reset (database + files)
python3 scripts/cleanup_data.py --all --storage
```

### test_db_connection.py
Tests database connection and schema health.

### verify_db.py
Verifies database schema and integrity.

### fix_hf_confidences.py
Fixes confidence values in HuggingFace datasets.

---


## Shell Scripts
All shell scripts have been moved to the `bin/` directory. See [bin/README.md](../bin/README.md) for usage instructions.

### Key Shell Scripts

- `setup.sh` — Full environment setup: venv, dependencies, .env, DB, migrations
- `api.sh` — Start/restart API server: `./bin/api.sh start|safe|restart`
- `dashboard.sh` — Start the Streamlit dashboard
- `process_invoices.sh` — Batch process invoices in data/
- `setup_queue.sh` — Initialize the pgqueuer schema for background jobs
- `ocr_smoke_test.sh` — Run a quick OCR test (verifies OCR pipeline)
- `demo.sh` — One-command demo: DB, API, dashboard, browser

> **IMPORTANT:**
> - Ensure the FastAPI server is running before using `process_invoices.py`.
> - Cleanup scripts are destructive; always use `--dry-run` first.
> - OCR processing may take 30-180 seconds for first-time requests due to model loading.
