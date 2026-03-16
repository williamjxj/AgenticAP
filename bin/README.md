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

- `setup.sh` — Set up the development environment (dependencies, .env, etc.)
- `setup_queue.sh` — Initialize the pgqueuer schema for background jobs
- `start_safe_api.sh` — Start the API server in safe mode
- `restart_api.sh` — Restart the API server
- `ocr_smoke_test.sh` — Run a quick OCR test (verifies OCR pipeline)
- Other project-specific shell scripts may be present; see comments at the top of each script for details and options.

> **Note:**
> - All shell scripts are now in `bin/`. Python scripts are in `scripts/`.
> - See the main [README.md](../README.md) for project overview and [scripts/README.md](../scripts/README.md) for Python utilities.
