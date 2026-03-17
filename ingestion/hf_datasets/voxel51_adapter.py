"""Adapter for Voxel51 high-quality-invoice-images-for-ocr dataset."""

import json
import os
import hashlib
from pathlib import Path
from decimal import Decimal
from typing import List
from PIL import Image
import imagehash
from datasets import load_dataset
from huggingface_hub import hf_hub_download

from ingestion.hf_datasets.base_adapter import BaseDatasetAdapter
from brain.schemas import CanonicalInvoiceSchema, LineItem
from core.logging import get_logger

logger = get_logger(__name__)

class Voxel51Adapter(BaseDatasetAdapter):
    """Adapter for Voxel51 dataset."""

    DATASET_ID = "Voxel51/high-quality-invoice-images-for-ocr"
    LOCAL_DIR = Path("data/hf_datasets/voxel51")
    TEMP_DIR = Path("data/hf_temp")
    SAMPLES_JSON = Path("data/hf_temp/samples.json")

    async def load(self, limit: int = 10) -> List[CanonicalInvoiceSchema]:
        """Load and normalize Voxel51 records."""
        if not self.SAMPLES_JSON.exists():
            logger.info(f"Samples JSON not found at {self.SAMPLES_JSON}. Attempting download...")
            try:
                self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
                hf_hub_download(
                    repo_id=self.DATASET_ID,
                    filename="samples.json",
                    repo_type="dataset",
                    local_dir=str(self.TEMP_DIR)
                )
                temp_file = self.TEMP_DIR / "samples.json"
                if temp_file.exists():
                    temp_file.rename(self.SAMPLES_JSON)
            except Exception as e:
                logger.error(f"Failed to download samples.json: {e}")
                return []

        self.LOCAL_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)

        with open(self.SAMPLES_JSON, "r") as f:
            data = json.load(f)
        
        # Voxel51 JSON structure might vary, but let's assume 'samples' or a list
        samples_data = data.get("samples") if isinstance(data, dict) else data
        if not samples_data:
            logger.error("No samples found in Voxel51 JSON metadata")
            return []
            
        annotated_samples = [s for s in samples_data if isinstance(s, dict) and "json_annotation" in s]
        
        results = []
        for sample_meta in annotated_samples[:limit]:
            try:
                hf_filepath = sample_meta["filepath"]
                local_filename = hf_filepath.split("/")[-1]
                local_path = self.LOCAL_DIR / local_filename

                if not local_path.exists():
                    logger.info(f"Downloading {hf_filepath}")
                    hf_hub_download(
                        repo_id=self.DATASET_ID,
                        filename=hf_filepath,
                        repo_type="dataset",
                        local_dir=str(self.TEMP_DIR)
                    )
                    temp_path = self.TEMP_DIR / hf_filepath
                    if temp_path.exists():
                        temp_path.rename(local_path)

                if not local_path.exists():
                    continue

                # Open image for hashing
                with Image.open(local_path) as img:
                    img_hash = str(imagehash.phash(img))

                # Parse annotation
                # Voxel51 stores annotation as escaped JSON string in 'json_annotation' field
                try:
                    annotation = json.loads(sample_meta["json_annotation"])
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Failed to parse annotation for {hf_filepath}")
                    continue

                invoice_info = annotation.get("invoice", {})
                financial_info = annotation.get("subtotal", {}) # Note: Voxel51 uses 'subtotal' key for main totals

                # Safe Decimal conversion helper
                def safe_decimal(val):
                    if val is None or val == "": return None
                    try:
                        clean_val = "".join(c for c in str(val) if c.isdigit() or c in ".-")
                        return Decimal(clean_val) if clean_val else None
                    except: return None

                line_items = []
                for idx, item in enumerate(annotation.get("items", [])):
                    line_items.append(LineItem(
                        description=item.get("description"),
                        quantity=safe_decimal(item.get("quantity")),
                        unit_price=safe_decimal(item.get("unit_price")),
                        amount=safe_decimal(item.get("amount")),
                        line_order=idx
                    ))

                # Date parsing helper
                def parse_date(date_str):
                    if not date_str: return None
                    from datetime import datetime
                    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                        try:
                            return datetime.strptime(date_str, fmt).date()
                        except ValueError: continue
                    return None

                # --- Vendor (Seller) and Client (Buyer) Extraction ---
                def extract_party(annotation_dict, keys):
                    for k in keys:
                        val = annotation_dict.get(k)
                        if val:
                            if isinstance(val, dict):
                                # Try to join name and address if present
                                name = val.get("name") or val.get("Name")
                                if name:
                                    return name
                                # Fallback: join all string fields
                                return ", ".join(str(v) for v in val.values() if isinstance(v, str))
                            elif isinstance(val, str):
                                return val
                    return None

                # Try multiple keys for seller/vendor and client/buyer
                vendor_name = (
                    extract_party(invoice_info, ["seller_name", "seller", "vendor", "seller_info"]) or
                    extract_party(annotation, ["seller", "vendor", "seller_info"]) or
                    None
                )
                client_name = (
                    extract_party(invoice_info, ["client_name", "client", "buyer", "client_info"]) or
                    extract_party(annotation, ["client", "buyer", "client_info"]) or
                    None
                )

                # Fallback: robustly parse multi-line Seller block from OCR text
                if not vendor_name and sample_meta.get("ocr_text"):
                    import re
                    ocr = sample_meta["ocr_text"]
                    # Look for 'Seller:' or 'Seller\n' block, capture all lines until 'Client:', 'Date', 'Invoice', or end
                    m = re.search(r"Seller:?\s*\n?(.+?)(?:\n\s*Client:|\n\s*Date|\n\s*Invoice|$)", ocr, re.DOTALL|re.IGNORECASE)
                    if m:
                        block = m.group(1).strip()
                        lines = [line.strip() for line in block.split("\n") if line.strip()]
                        # Heuristic: pick the first line that looks like a name (not address, not number, not empty)
                        for line in lines:
                            # Skip lines that look like addresses or numbers
                            if re.match(r"^(\d+|[A-Za-z0-9 .,-]+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Suite|Blvd|Drive|Dr\.|Lane|Ln\.|Ave|Highway|Hwy|PO Box|P\.O\.|Zip|[A-Z]{2}\s*\d{5}|[A-Z]{2,3}\d{2,}|[0-9]{5,}|Tax Id|IBAN|[A-Z]{2}\d{10,}))", line, re.IGNORECASE):
                                continue
                            # Skip lines that are too short or generic
                            if len(line) < 3 or line.lower() in {"seller", "client"}:
                                continue
                            vendor_name = line
                            break
                        # Fallback: if all lines look like addresses, just use the first line
                        if not vendor_name and lines:
                            vendor_name = lines[0]

                results.append(CanonicalInvoiceSchema(
                    source_dataset="voxel51",
                    source_id=sample_meta.get("filepath", ""),
                    image_path=str(local_path),
                    file_name=local_filename,
                    invoice_number=invoice_info.get("invoice_number"),
                    invoice_date=parse_date(invoice_info.get("invoice_date")),
                    vendor_name=vendor_name,
                    line_items=line_items,
                    subtotal=safe_decimal(financial_info.get("subtotal")),
                    tax_amount=safe_decimal(financial_info.get("tax")),
                    total_amount=safe_decimal(financial_info.get("total")),
                    currency="USD",
                    raw_ocr_text=sample_meta.get("ocr_text"),
                    annotation_confidence=Decimal("1.0"),
                    image_hash=img_hash
                ))

            except Exception as e:
                logger.error(f"Error processing Voxel51 sample: {e}")
                continue

        return results
