# Shell Scripts (`bin/`)

This directory contains **all shell scripts** for environment setup, server management, and batch operations. All Python scripts are in the `scripts/` directory.

## Usage

Make scripts executable (if needed):
```bash
chmod +x bin/*.sh
```

Run a script:
```bash
./bin/<script_name>.sh
```


## Available Shell Scripts

- `setup.sh` — Full environment setup: venv, dependencies, .env, DB, migrations
- `api.sh` — Start/restart API server: `./bin/api.sh start|safe|restart`
- `dashboard.sh` — Start the Streamlit dashboard
- `process_invoices.sh` — Batch process invoices in data/
- `setup_queue.sh` — Initialize the pgqueuer schema for background jobs
- `ocr_smoke_test.sh` — Run a quick OCR test (verifies OCR pipeline)
- `demo.sh` — One-command demo: DB, API, dashboard, browser

> **Note:**
> - All shell scripts are now in `bin/`. Python scripts are in `scripts/`.
> - See the main [README.md](../README.md) for project overview and [scripts/README.md](../scripts/README.md) for Python utilities.

> **Note:**
> - All shell scripts are now in `bin/`. Python scripts are in `scripts/`.
> - See the main [README.md](../README.md) for project overview and [scripts/README.md](../scripts/README.md) for Python utilities.
