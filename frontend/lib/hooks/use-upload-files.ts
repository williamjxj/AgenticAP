"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPostFormData } from "@/lib/api-client";
import { buildUploadFormData, type UploadFormInput } from "@/lib/uploads/build-upload-form";
import type { UploadResponse } from "@/lib/types/upload";

/**
 * Multipart upload to `POST /api/v1/uploads` (202 + batch result body).
 */
export function useUploadFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadFormInput) => {
      const form = buildUploadFormData(input);
      return apiPostFormData<UploadResponse>("/uploads", form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
