#!/usr/bin/env python3
"""在機器學習期中考的參考解答原檔上，標出作答者的實際作答。

輸入：src/content/notes/_references/機器學習實作系列/第9週-期中考-參考解答.pdf
      scripts/ml-midterm-my-answers/answers.json
輸出：src/content/notes/_references/機器學習實作系列/第9週-期中考-我的作答標記版.pdf

標記規則（圖例印在第 1 頁答案表下方）：
  黃色螢光   正解，而且就是我選的（沿用「答案標記版」的同一組黃色）
  紅色螢光   我選錯的那個選項；該題的正解仍另外標黃色
  紅色 ✗     畫在錯題題號左側的頁邊，方便翻頁時掃視
  第 1 頁    答案表裡錯掉的題號右邊，以紅字補上我當時寫的選項

執行：python3 scripts/ml-midterm-my-answers/build.py
相依：PyMuPDF（pip install pymupdf）；中文用 PyMuPDF 內建的 china-t 字型，不需外部字型檔。
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
REF_DIR = ROOT / "src/content/notes/_references/機器學習實作系列"
SRC_PDF = REF_DIR / "第9週-期中考-參考解答.pdf"
OUT_PDF = REF_DIR / "第9週-期中考-我的作答標記版.pdf"
DATA = Path(__file__).with_name("answers.json")

YELLOW = (1.0, 0.86, 0.25)   # 與既有「答案標記版」相同
RED = (1.0, 0.55, 0.55)
INK = (0.80, 0.05, 0.05)

LABEL_RE = re.compile(r"\(([ABCD])\)")
QNUM_RE = re.compile(r"^(\d{1,2})\.\s")
ROW_TOL = 4.0  # 同一視覺列的 y 容差（pt）


def visual_rows(page):
    """把一頁的文字切成「視覺列」：同一 y 的多個 line 物件合併，字元依 x 排序。

    第 49 題的四個選項各自是獨立的 line（中間還夾著分數線 ⁄），不先併成一列就抓不到選項邊界。
    """
    chars = []
    for block in page.get_text("rawdict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line["spans"]:
                for ch in span["chars"]:
                    chars.append((ch["bbox"], ch["c"]))
    rows = []
    for bbox, ch in sorted(chars, key=lambda c: (round(c[0][1] / ROW_TOL), c[0][0])):
        if rows and abs(rows[-1][0][0][1] - bbox[1]) <= ROW_TOL:
            rows[-1].append((bbox, ch))
        else:
            rows.append([(bbox, ch)])
    return [sorted(r, key=lambda c: c[0][0]) for r in rows]


def parse_options(doc):
    """回傳 ({題號: {選項字母: (page_no, Rect)}}, {題號: (page_no, 題號列的 Rect)})。"""
    options = {}
    stems = {}
    cur_q = None
    for pno in range(1, doc.page_count):      # 第 1 頁是答案表，沒有題目
        page = doc[pno]
        for row in visual_rows(page):
            text = "".join(ch for _, ch in row)
            m = QNUM_RE.match(text.lstrip())
            if m:
                cur_q = int(m.group(1))
                stems[cur_q] = (pno, pymupdf.Rect(
                    min(b[0] for b, _ in row), min(b[1] for b, _ in row),
                    max(b[2] for b, _ in row), max(b[3] for b, _ in row)))
            if cur_q is None:
                continue
            hits = list(LABEL_RE.finditer(text))
            if not hits:
                continue
            y0 = min(b[1] for b, _ in row)
            y1 = max(b[3] for b, _ in row)
            for i, hit in enumerate(hits):
                start = hit.start()
                end = hits[i + 1].start() - 1 if i + 1 < len(hits) else len(text)
                seg = [row[j] for j in range(start, min(end, len(row))) if row[j][1].strip()]
                if not seg:
                    continue
                rect = pymupdf.Rect(
                    min(b[0] for b, _ in seg) - 1,
                    y0 - 1,
                    max(b[2] for b, _ in seg) + 1,
                    y1 + 1,
                )
                options.setdefault(cur_q, {}).setdefault(hit.group(1), (pno, rect))
    return options, stems


def answer_table_cells(page):
    """第 1 頁答案表：回傳 {題號: fitz.Rect}（該格「N.  X」整串的範圍）。"""
    cells = {}
    for row in visual_rows(page):
        text = "".join(ch for _, ch in row)
        for m in re.finditer(r"(\d{1,2})\.\s+([ABCD])", text):
            seg = [row[j] for j in range(m.start(), m.end())]
            cells[int(m.group(1))] = pymupdf.Rect(
                min(b[0] for b, _ in seg),
                min(b[1] for b, _ in seg),
                max(b[2] for b, _ in seg),
                max(b[3] for b, _ in seg),
            )
    return cells


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    key, mine = data["key"], data["mine"]
    if not (len(key) == len(mine) == 50):
        sys.exit("answers.json 的 key／mine 必須各有 50 題")

    doc = pymupdf.open(SRC_PDF)
    cells = answer_table_cells(doc[0])
    pages = {i: doc[i] for i in range(doc.page_count)}   # 留住 Page 物件，否則註解會失去綁定
    options, stems = parse_options(doc)

    # 護欄一：answers.json 的 key 必須和參考解答第 1 頁的答案表逐題相同
    table = {}
    for row in visual_rows(doc[0]):
        text = "".join(ch for _, ch in row)
        for m in re.finditer(r"(\d{1,2})\.\s+([ABCD])", text):
            table[int(m.group(1))] = m.group(2)
    mismatch = [q for q in range(1, 51) if table.get(q) != key[q - 1]]
    if mismatch:
        sys.exit(f"key 與參考解答第 1 頁答案表不符：{mismatch}")

    # 護欄二：50 題都要抓到完整的四個選項
    broken = [q for q in range(1, 51) if sorted(options.get(q, {})) != list("ABCD")]
    if broken:
        sys.exit(f"選項定位失敗：{broken}")

    wrong = [q for q in range(1, 51) if mine[q - 1] != key[q - 1]]
    if 100 - 2 * len(wrong) != data["score"]:
        sys.exit(f"錯 {len(wrong)} 題算出 {100 - 2 * len(wrong)} 分，與 answers.json 的 {data['score']} 不符")

    for q in range(1, 51):
        marks = [(key[q - 1], YELLOW)]
        if mine[q - 1] != key[q - 1]:
            marks.append((mine[q - 1], RED))
        for letter, colour in marks:
            pno, rect = options[q][letter]
            annot = pages[pno].add_highlight_annot(rect)
            annot.set_colors(stroke=colour)
            annot.set_info(content=f"第 {q} 題：正解 {key[q - 1]}，我選 {mine[q - 1]}")
            annot.update()

        if q in wrong:
            # 錯題題號左側的紅色 ✗（用兩條線畫，不依賴字型有沒有這個字）
            pno, rect = stems[q]
            page = pages[pno]
            qy = rect.y0 + 1
            x0, x1 = 50, 62
            shape = page.new_shape()
            shape.draw_line((x0, qy), (x1, qy + 12))
            shape.draw_line((x1, qy), (x0, qy + 12))
            shape.finish(color=INK, width=1.6)
            shape.commit()

    # 第 1 頁答案表：錯掉的題號右邊補上我寫的選項
    page1 = pages[0]
    for q in wrong:
        cell = cells[q]
        page1.insert_text(
            (cell.x1 + 4, cell.y1 - 1),
            f"我選{mine[q - 1]}",
            fontname="china-t",
            fontsize=7.5,
            color=INK,
        )

    # 圖例：中文用 china-t，題號清單改用 helv —— china-t 會把半形數字排成全形，整串會拉得很長
    lines = [
        f"本版在教授的參考解答原檔上，加註作答者（{data['student']}）期中考當天的實際作答。",
        "黃色螢光＝正解，而且就是我當時選的；紅色螢光＝我選錯的選項，該題的正解仍另外標黃色，",
        "題號左側畫一個紅色叉。上方答案表中錯掉的題號右邊，也以紅字標出我寫的選項。",
        "全卷五十題、每題兩分，錯十題，得八十分。答錯的題號：",
    ]
    y = 500
    for line in lines:
        page1.insert_text((50, y), line, fontname="china-t", fontsize=9, color=INK)
        y += 15
    page1.insert_text(
        (50, y),
        ", ".join(str(q) for q in wrong),
        fontname="helv",
        fontsize=9,
        color=INK,
    )

    doc.set_metadata({**doc.metadata, "title": "資料分析與機器學習 Midterm Exam 2026-11-02 我的作答標記版"})
    doc.save(OUT_PDF, garbage=3, deflate=True)
    print(f"寫出 {OUT_PDF.relative_to(ROOT)}")
    print(f"錯 {len(wrong)} 題：{wrong} → {data['score']} 分")


if __name__ == "__main__":
    main()
