// 「副檔名 → 檢視器」註冊表的 client 端，與縮放範圍。兩個殼共用：
// 筆記裡的右側抽屜（ReferenceViewerDrawer）與 /references/doc/* 的講義頁籤（ReferenceDocView）。
//
// 新增一種格式：寫一個檢視器、在 reference-kinds.ts 的 REFERENCE_KINDS 加副檔名、在這裡加一列——
// 兩個殼與工具列都不用動。這裡是靜態 import 沒關係：檢視器模組本身很小，各自的重型依賴
//（pdfjs、docx-preview、pptx-renderer）都在模組內部用動態 import 惰性載入。
import type { ComponentType } from "react";
import type { ReferenceKind } from "@/lib/reference-kinds";
import { DOC_MAX_SCALE, DOC_MIN_SCALE } from "@/lib/wb-tabs";
import type { ReferenceViewerProps } from "./types";
import PdfRenderer from "./PdfRenderer";
import DocxRenderer from "./DocxRenderer";
import XlsxRenderer from "./XlsxRenderer";
import CsvRenderer from "./CsvRenderer";
import PptxRenderer from "./PptxRenderer";

export const REFERENCE_VIEWERS: Record<ReferenceKind, ComponentType<ReferenceViewerProps>> = {
  pdf: PdfRenderer,
  docx: DocxRenderer,
  xlsx: XlsxRenderer,
  csv: CsvRenderer,
  pptx: PptxRenderer,
};

// 與頁籤閱讀狀態的合法範圍是同一組數字（wb-tabs.ts）：存得進去的縮放，工具列一定調得出來，反之亦然
export const MIN_SCALE = DOC_MIN_SCALE;
export const MAX_SCALE = DOC_MAX_SCALE;
export const SCALE_STEP = 0.2;

export const zoomOut = (s: number): number => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2));
export const zoomIn = (s: number): number => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2));
