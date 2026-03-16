#!/usr/bin/env python3
"""
Specialized script to process mychen76/invoices-and-receipts_ocr_v1 HuggingFace dataset using the shared adapter.
"""

import asyncio
from core.config import settings
from ingestion.hf_datasets.mychen76_adapter import Mychen76Adapter

async def process_mychen76(limit=10):
    print(f"🔍 Loading and processing mychen76 dataset using shared adapter...")
    adapter = Mychen76Adapter()
    records = await adapter.load(limit=limit)
    print(f"🚀 Loaded {len(records)} records from mychen76 adapter.")
    if records:
        print(f"First record: {records[0]}")
    else:
        print("❌ No records loaded.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Process mychen76 HF dataset using shared adapter")
    parser.add_argument("--limit", type=int, default=10, help="Number of samples to process")
    args = parser.parse_args()
    asyncio.run(process_mychen76(limit=args.limit))