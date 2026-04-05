import { describe, expect, it } from "vitest";

import { buildUploadFormData } from "./build-upload-form";

describe("buildUploadFormData", () => {
  it("appends each file under the files field", () => {
    const a = new File(["a"], "one.pdf", { type: "application/pdf" });
    const b = new File(["b"], "two.png", { type: "image/png" });
    const fd = buildUploadFormData({ files: [a, b] });
    expect(fd.getAll("files")).toHaveLength(2);
  });

  it("defaults subfolder to uploads and sets force_reprocess", () => {
    const f = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const fd = buildUploadFormData({ files: [f] });
    expect(fd.get("subfolder")).toBe("uploads");
    expect(fd.get("force_reprocess")).toBe("false");
  });

  it("includes optional group and category when non-empty", () => {
    const f = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const fd = buildUploadFormData({
      files: [f],
      group: " batch-1 ",
      category: " Q1 ",
      forceReprocess: true,
    });
    expect(fd.get("group")).toBe("batch-1");
    expect(fd.get("category")).toBe("Q1");
    expect(fd.get("force_reprocess")).toBe("true");
  });

  it("omits group and category when blank", () => {
    const f = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const fd = buildUploadFormData({
      files: [f],
      group: "   ",
      category: "",
    });
    expect(fd.get("group")).toBeNull();
    expect(fd.get("category")).toBeNull();
  });
});
