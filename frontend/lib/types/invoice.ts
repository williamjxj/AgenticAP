/** Mirrors `interface/api/schemas.py` list/detail payloads (subset for UI). */

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface InvoiceSummary {
  id: string;
  file_name: string;
  storage_path: string | null;
  category: string | null;
  group: string | null;
  job_id: string | null;
  file_type: string | null;
  processing_status: string;
  vendor_name: string | null;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface InvoiceListResponse {
  status: string;
  timestamp?: string;
  data: InvoiceSummary[];
  pagination: Pagination;
}

export interface LineItemResponse {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
}

export interface ExtractedDataResponse {
  vendor_name?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  tax_rate?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  line_items?: LineItemResponse[] | Record<string, unknown> | null;
  extraction_confidence?: number | null;
}

export interface ValidationResultResponse {
  rule_name: string;
  rule_description?: string | null;
  status: string;
  expected_value?: number | null;
  actual_value?: number | null;
  error_message?: string | null;
  validated_at: string;
}

export interface UploadMetadataResponse {
  subfolder: string;
  group?: string | null;
  category?: string | null;
  upload_source: string;
  uploaded_at?: string | null;
}

export interface InvoiceDetail {
  id: string;
  file_name: string;
  storage_path: string;
  category?: string | null;
  group?: string | null;
  job_id?: string | null;
  file_type: string;
  file_hash: string;
  version: number;
  processing_status: string;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  error_message?: string | null;
  upload_metadata?: UploadMetadataResponse | null;
  extracted_data?: ExtractedDataResponse | null;
  validation_results: ValidationResultResponse[];
}

export interface InvoiceDetailResponse {
  status: string;
  timestamp?: string;
  data: InvoiceDetail;
}
