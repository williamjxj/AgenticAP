/**
 * Shapes for `POST /api/v1/uploads` and `GET /api/v1/uploads/{id}/status`.
 */

export type UploadItem = {
  file_name: string;
  invoice_id?: string | null;
  status: string;
  file_path?: string | null;
  file_size?: number | null;
  error_message?: string | null;
};

export type UploadBatchData = {
  uploads: UploadItem[];
  total: number;
  successful: number;
  failed: number;
  skipped: number;
};

export type UploadResponse = {
  status: string;
  data: UploadBatchData;
};

export type UploadStatusData = {
  invoice_id: string;
  file_name: string;
  storage_path?: string | null;
  category?: string | null;
  group?: string | null;
  job_id?: string | null;
  processing_status: string;
  upload_metadata?: Record<string, unknown> | null;
  error_message?: string | null;
};

export type UploadStatusResponse = {
  status: string;
  data: UploadStatusData;
};
