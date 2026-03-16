#!/usr/bin/env python3
"""
Specialized script to process Voxel51 HuggingFace dataset using FiftyOne.
This script utilizes FiftyOne for intelligent dataset management and the 
FastAPI endpoint for extraction processing.
"""


import asyncio
from core.config import settings
from ingestion.hf_datasets.voxel51_adapter import Voxel51Adapter


async def process_voxel51(limit=10):
    print(f"🔍 Loading and processing Voxel51 dataset using shared adapter...")
    adapter = Voxel51Adapter()
    records = await adapter.load(limit=limit)
    print(f"🚀 Loaded {len(records)} records from Voxel51 adapter.")
    # Here you can add further processing, e.g., send to API, save, etc.
    # For demonstration, just print the first record summary
    if records:
        print(f"First record: {records[0]}")
    else:
        print("❌ No records loaded.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Process Voxel51 HF dataset using shared adapter")
    parser.add_argument("--limit", type=int, default=10, help="Number of samples to process")
    args = parser.parse_args()
    asyncio.run(process_voxel51(limit=args.limit))
