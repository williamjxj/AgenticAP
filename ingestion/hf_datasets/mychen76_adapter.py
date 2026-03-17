"""Adapter for mychen76/invoices-and-receipts_ocr_v1 dataset."""

import os
from pathlib import Path
from decimal import Decimal
from typing import List
from PIL import Image
import imagehash
from datasets import load_dataset

from ingestion.hf_datasets.base_adapter import BaseDatasetAdapter
from brain.schemas import CanonicalInvoiceSchema
from core.logging import get_logger

logger = get_logger(__name__)

class Mychen76Adapter(BaseDatasetAdapter):
    """Adapter for mychen76 dataset."""

    DATASET_ID = "mychen76/invoices-and-receipts_ocr_v1"
    LOCAL_DIR = Path("data/hf_datasets/mychen76")

    async def load(self, limit: int = 10) -> List[CanonicalInvoiceSchema]:
        """Load and normalize mychen76 records."""
        self.LOCAL_DIR.mkdir(parents=True, exist_ok=True)

        try:
            ds = load_dataset(self.DATASET_ID, split="train", streaming=True)
            results = []
            count = 0
            ds_iter = iter(ds)
            while count < limit:
                try:
                    row = next(ds_iter)
                except StopIteration:
                    break
                except Exception as e:
                    logger.warning(f"Error iterating mychen76 dataset: {e}")
                    break
                try:
                    img = row["image"]
                    img_id = row.get("id") or str(count)
                    local_filename = f"mychen_{img_id}.jpg"
                    local_path = self.LOCAL_DIR / local_filename
                    if not local_path.exists():
                        img.convert("RGB").save(local_path, "JPEG")
                    img_hash = str(imagehash.phash(img))
                    import json
                    import ast
                    parsed_str = row.get("parsed_data")
                    labels = {}
                    if parsed_str:
                        try:
                            wrapper = json.loads(parsed_str)
                            json_payload = wrapper.get("json", "{}")
                            if isinstance(json_payload, str):
                                try:
                                    labels = json.loads(json_payload)
                                except json.JSONDecodeError:
                                    labels = ast.literal_eval(json_payload)
                            else:
                                labels = json_payload
                        except Exception as e:
                            logger.warning(f"Failed to parse mychen76 labels: {e}")
                    header = labels.get("header", {})
                    def safe_decimal(val):
                        if val is None or val == "": return None
                        try:
                            clean_val = "".join(c for c in str(val) if c.isdigit() or c in ".-")
                            return Decimal(clean_val) if clean_val else None
                        except: return None

                    # --- Vendor (Seller) Extraction ---
                    def extract_vendor(header_dict, labels_dict, raw_text):
                        # Try multiple keys
                        for k in ["seller", "vendor", "seller_name", "seller_info"]:
                            val = header_dict.get(k) or labels_dict.get(k)
                            if val:
                                if isinstance(val, dict):
                                    name = val.get("name") or val.get("Name")
                                    if name:
                                        return name
                                    return ", ".join(str(v) for v in val.values() if isinstance(v, str))
                                elif isinstance(val, str):
                                    return val
                        # Fallback: parse from raw text
                        if raw_text:
                            import re
                            m = re.search(r"Seller:?\s*\n?(.+?)(?:\n\s*Client:|\n\s*Date|\n\s*Invoice|$)", raw_text, re.DOTALL|re.IGNORECASE)
                            if m:
                                block = m.group(1).strip()
                                return block.split("\n")[0].strip()
                        return None

                    vendor_name = extract_vendor(header, labels, row.get("raw_data"))

                    results.append(CanonicalInvoiceSchema(
                        source_dataset="mychen76",
                        source_id=img_id,
                        image_path=str(local_path),
                        file_name=local_filename,
                        invoice_number=header.get("invoice_no"),
                        invoice_date=None, # Need parsing if available
                        vendor_name=vendor_name,
                        total_amount=safe_decimal(labels.get("total_amount")),
                        currency="USD",
                        raw_ocr_text=row.get("raw_data"),
                        annotation_confidence=Decimal("0.8"),
                        image_hash=img_hash
                    ))
                    count += 1
                except Exception as e:
                    logger.warning(f"Error processing mychen76 row: {e}")
                    continue
            # Explicitly delete iterator to help cleanup
            del ds_iter
            return results
        except Exception as e:
            logger.error(f"Failed to load mychen76 dataset: {e}")
            return []
