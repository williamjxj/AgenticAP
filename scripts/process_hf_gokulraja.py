#!/usr/bin/env python3
"""
Specialized script to process GokulRajaR/invoice-ocr-json HuggingFace dataset using the shared adapter.
"""

import asyncio
from core.config import settings
from ingestion.hf_datasets.gokulraja_adapter import GokulRajaAdapter

async def process_gokulraja(limit=10):
    print(f"🔍 Loading and processing GokulRajaR dataset using shared adapter...")
    adapter = GokulRajaAdapter()
    records = await adapter.load(limit=limit)
    print(f"🚀 Loaded {len(records)} records from GokulRajaR adapter.")
    if records:
        print(f"First record: {records[0]}")
    else:
        print("❌ No records loaded.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Process GokulRajaR HF dataset using shared adapter")
    parser.add_argument("--limit", type=int, default=10, help="Number of samples to process")
    args = parser.parse_args()
    asyncio.run(process_gokulraja(limit=args.limit))