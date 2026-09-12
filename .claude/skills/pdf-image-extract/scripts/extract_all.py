#!/usr/bin/env python3
import argparse
import json
import os

import pymupdf


def extract_page(page, page_no, out_dir, min_size, dpi):
    images = []
    for img_index, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        try:
            base = page.parent.extract_image(xref)
        except Exception:
            continue
        w, h = base.get("width", 0), base.get("height", 0)
        if w < min_size or h < min_size:
            continue
        ext = base["ext"]
        fname = f"p{page_no:03d}_{img_index}_{w}x{h}.{ext}"
        with open(os.path.join(out_dir, fname), "wb") as f:
            f.write(base["image"])
        images.append({"file": fname, "width": w, "height": h, "type": "embedded"})

    if not images:
        pix = page.get_pixmap(dpi=dpi)
        fname = f"p{page_no:03d}_fullpage.png"
        pix.save(os.path.join(out_dir, fname))
        images.append({"file": fname, "width": pix.width, "height": pix.height, "type": "fullpage-fallback"})

    return images


def main():
    parser = argparse.ArgumentParser(
        description="逐頁萃取 PDF 圖片：優先抓內嵌點陣圖，該頁完全沒有時才退回整頁截圖，確保每一頁都有對應圖可用。"
    )
    parser.add_argument("pdf_path")
    parser.add_argument("out_dir")
    parser.add_argument("--min-size", type=int, default=80, help="小於此邊長（px）的內嵌圖視為裝飾用圖示，略過")
    parser.add_argument("--dpi", type=int, default=150, help="整頁截圖 fallback 的解析度")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    doc = pymupdf.open(args.pdf_path)

    results = []
    for page_index in range(len(doc)):
        page = doc[page_index]
        page_no = page_index + 1
        images = extract_page(page, page_no, args.out_dir, args.min_size, args.dpi)
        results.append({"page": page_no, "images": images})

    manifest = {
        "pdf": os.path.abspath(args.pdf_path),
        "pages": len(doc),
        "min_size": args.min_size,
        "dpi": args.dpi,
        "results": results,
    }
    manifest_path = os.path.join(args.out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    embedded = sum(1 for r in results for im in r["images"] if im["type"] == "embedded")
    fallback = sum(1 for r in results for im in r["images"] if im["type"] == "fullpage-fallback")
    print(f"pages={len(doc)} embedded_images={embedded} fullpage_fallbacks={fallback}")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    main()
