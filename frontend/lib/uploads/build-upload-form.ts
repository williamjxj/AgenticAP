/**
 * Build `multipart/form-data` for `POST /api/v1/uploads` (FastAPI `File` + `Form` fields).
 */

export type UploadFormInput = {
  files: File[];
  subfolder?: string;
  group?: string;
  category?: string;
  forceReprocess?: boolean;
};

/**
 * Returns FormData with one `files` part per file (same field name) plus form fields.
 */
export function buildUploadFormData(input: UploadFormInput): FormData {
  const form = new FormData();
  for (const file of input.files) {
    form.append("files", file, file.name);
  }
  form.append("subfolder", input.subfolder?.trim() || "uploads");
  if (input.group?.trim()) {
    form.append("group", input.group.trim());
  }
  if (input.category?.trim()) {
    form.append("category", input.category.trim());
  }
  form.append("force_reprocess", String(input.forceReprocess ?? false));
  return form;
}
