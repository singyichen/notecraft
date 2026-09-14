#!/usr/bin/env python3
import argparse
import hashlib
import json
import os

import pymupdf


def hash_page_images(doc, min_size):
    """第一遍：只算每張內嵌 bitmap 的內容雜湊，統計各自出現在哪些頁——
    用來分辨「版面模板圖」（幾乎每頁都重複，例如背景/logo/頁碼底色，
    這種重複沒有資訊、可以放心跳過)跟「內容圖被重複使用」(只在少數
    幾頁重複，例如同一張示意圖疊加不同顏色標注逐步講解——這種重複
    每次疊加的向量內容可能不同，不能因為 bitmap 相同就當作純粹重複)。
    """
    hash_pages = {}
    for page_index in range(len(doc)):
        page = doc[page_index]
        page_no = page_index + 1
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                base = page.parent.extract_image(xref)
            except Exception:
                continue
            w, h = base.get("width", 0), base.get("height", 0)
            if w < min_size or h < min_size:
                continue
            digest = hashlib.md5(base["image"]).hexdigest()
            hash_pages.setdefault(digest, []).append(page_no)
    return hash_pages


def extract_page(page, page_no, out_dir, min_size, dpi, hash_pages, template_hashes, seen_hashes):
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
        digest = hashlib.md5(base["image"]).hexdigest()

        if digest in template_hashes:
            first_page = hash_pages[digest][0]
            if page_no != first_page:
                # 版面模板圖（幾乎每頁都出現），除了第一次出現的頁面，其餘
                # 頁面不重複存檔、也不需要整頁渲染比對——單純是裝飾重複。
                images.append({
                    "type": "embedded-template-skipped",
                    "width": w, "height": h,
                    "template_of_page": first_page,
                })
                continue

        ext = base["ext"]
        fname = f"p{page_no:03d}_{img_index}_{w}x{h}.{ext}"
        with open(os.path.join(out_dir, fname), "wb") as f:
            f.write(base["image"])

        reused_from_page = seen_hashes.get(digest)
        if reused_from_page is None:
            seen_hashes[digest] = page_no

        entry = {"file": fname, "width": w, "height": h, "type": "embedded"}
        if reused_from_page is not None:
            # bitmap 跟先前某頁完全相同，但只有少數頁重複（不是版面模板）——
            # 常見於投影片重複使用同一張底圖、疊加不同向量標注逐步講解。
            # 補一張整頁渲染，強制人工比對頁面上是否有 bitmap 沒有的額外內容，
            # 不能只看抽出來的 bitmap 就判定「跟之前那頁純粹重複」。
            entry["reused_from_page"] = reused_from_page
            render_fname = f"p{page_no:03d}_pagerender_dupcheck.png"
            page.get_pixmap(dpi=dpi).save(os.path.join(out_dir, render_fname))
            entry["dup_check_render"] = render_fname
        images.append(entry)

    if not images or all(im["type"] == "embedded-template-skipped" for im in images):
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
    parser.add_argument(
        "--template-min-pages", type=int, default=6,
        help="同一份 bitmap 內容出現在至少這麼多頁時，視為版面模板（背景/logo/頁碼底色），"
             "只在第一次出現時存檔，其餘頁面不重複存檔也不做 dup-check 渲染。調低此值會讓更多重複圖被當成模板略過；"
             "調高則連投影片模板都會被當成「內容重複使用」逐一比對，多數 PDF 用預設值即可。",
    )
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    doc = pymupdf.open(args.pdf_path)

    # 第一遍：只算雜湊、統計每份 bitmap 出現在哪些頁，藉此分出「版面模板」
    # 跟「內容圖被少數幾頁重複使用」——只有後者需要在第二遍逐頁比對整頁渲染。
    hash_pages = hash_page_images(doc, args.min_size)
    template_hashes = {h for h, pages in hash_pages.items() if len(pages) >= args.template_min_pages}

    results = []
    seen_hashes = {}
    for page_index in range(len(doc)):
        page = doc[page_index]
        page_no = page_index + 1
        images = extract_page(
            page, page_no, args.out_dir, args.min_size, args.dpi,
            hash_pages, template_hashes, seen_hashes,
        )
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
    reused = sum(1 for r in results for im in r["images"] if "reused_from_page" in im)
    print(f"pages={len(doc)} embedded_images={embedded} fullpage_fallbacks={fallback} reused_bitmaps={reused}")
    if reused:
        print(f"注意：{reused} 張內嵌圖與更早頁面的 bitmap 內容相同，已補上 dup_check_render 整頁渲染——")
        print("處理這些頁面前務必先比對整頁渲染，確認頁面上有沒有疊加額外的向量標注（見 manifest 裡的 reused_from_page / dup_check_render 欄位）。")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    main()
