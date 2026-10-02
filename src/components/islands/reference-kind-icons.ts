// 講義格式的圖示與顏色：講義庫列表、講義頁籤（TabStrip／TabAll／TabSheet）、Palette 共用，
// 同一份檔案在各處長得一樣。新增一種格式時與 reference-kinds.ts 一起補（Record 會在 tsc 擋漏）。
import { FileSpreadsheet, FileText, FileType2, Presentation, Table2 } from "lucide-react";
import type { ReferenceKind } from "@/lib/reference-kinds";

export const KIND_ICON: Record<ReferenceKind, typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  xlsx: FileSpreadsheet,
  csv: Table2,
  pptx: Presentation,
};

export const KIND_COLOR: Record<ReferenceKind, string> = {
  pdf: "var(--blue-600)",
  docx: "var(--orange-600)",
  xlsx: "var(--success-500)",
  csv: "var(--neutral-500)",
  pptx: "var(--danger-500)",
};
