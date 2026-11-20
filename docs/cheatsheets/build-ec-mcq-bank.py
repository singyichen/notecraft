"""電子學實作系列的期末選擇題題庫：可列印版。

從 astro build 的產物抽出三篇筆記的 `#### 選擇題 N`（KaTeX 已渲染好），排成
docs/cheatsheets/ec-mcq-bank.html：前半是題目（不標正解，可以先自己寫），
後半是答案表與逐題詳解，印成 PDF 收進 _references/。

線上作答頁不由這支腳本產生——那是 `npm run build-quiz` 的事（scripts/build-quiz.mjs），
兩邊讀的都是同一份筆記，所以不會不一致。

用法（先跑過 astro build）：
  python3 docs/cheatsheets/build-ec-mcq-bank.py
  # 獨立建置時：python3 docs/cheatsheets/build-ec-mcq-bank.py --dist /path/to/build
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
    --allow-file-access-from-files --virtual-time-budget=5000 \
    --print-to-pdf="src/content/notes/_references/電子學實作系列/電子學期末選擇題題庫.pdf" \
    "file://$PWD/docs/cheatsheets/ec-mcq-bank.html"
"""
import argparse
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
NOTES = ROOT / "src/content/notes"
parser = argparse.ArgumentParser(description="從已建置筆記產生電子學期末選擇題題庫")
parser.add_argument("--dist", type=pathlib.Path, default=ROOT / "dist",
                    help="Astro 建置輸出資料夾（可用獨立 outDir）")
args = parser.parse_args()
DIST = args.dist / "notes"
OUT = ROOT / "docs/cheatsheets/ec-mcq-bank.html"
KATEX_CSS = "../../node_modules/katex/dist/katex.min.css"  # 相對於 OUT，避免寫進本機絕對路徑

# 章節順序與 scripts/build-quiz.mjs 的 ec.groups 相同；改一邊要改兩邊
GROUPS = [
    ("CH6", "CH6　MOS 電晶體與 CS 放大器", "電子學實作系列第7週-MOS電晶體與CS放大器"),
    ("CH8", "CH8　運算放大器", "電子學實作系列第10週-MOS放大器組態與運放電路"),
    ("CH12", "CH12　回授", "電子學實作系列第11週-回授"),
]

HEAD_RE = re.compile(r'<h4 id="選擇題-(\d+)">')
END_RE = re.compile(r"<h[1-4][ >]")


def extract(page: str, key: str):
    out = []
    for m in HEAD_RE.finditer(page):
        start = page.index("</h4>", m.end()) + len("</h4>")
        nxt = END_RE.search(page, start)
        chunk = page[start: nxt.start() if nxt else len(page)]
        tip = chunk.find('<details class="nc-adm nc-adm--tip"')
        assert tip > 0, f"{key} 選擇題 {m.group(1)} 找不到詳解"
        q, sol = chunk[:tip], chunk[tip:]
        answer = re.findall(
            r'<li class="nc-choice nc-choice--correct"><span class="nc-choice__key">([A-Z])', q
        )
        assert answer, f"{key} 選擇題 {m.group(1)} 沒有標出正解"
        # 題目頁不洩漏正解：拿掉高亮 class 與打勾圖示
        q = q.replace(" nc-choice--correct", "")
        q = re.sub(r'<svg class="nc-choice__check".*?</svg><span class="nc-choice__sr">正解</span>',
                   "", q, flags=re.S)
        body = sol[sol.find('<div class="nc-adm__body">'): sol.rfind("</details>")]
        out.append((int(m.group(1)), q, ",".join(answer), body))
    return out


chapters = []
for key, label, stem in GROUPS:
    mdx = NOTES / f"{stem}.mdx"
    dist = [d for d in DIST.iterdir() if d.name.lower() == stem.lower()]
    assert dist, f"dist 裡沒有 {stem}，先跑 astro build"
    page = (dist[0] / "index.html").read_bytes().decode("utf-8", "replace")
    qs = extract(page, key)
    assert len(qs) == mdx.read_text().count("#### 選擇題 "), f"{key}：產物與筆記的題數對不上"
    chapters.append((key, label, qs))

total = sum(len(q) for _, _, q in chapters)

parts = []
for key, label, qs in chapters:
    parts.append(f'<section class="ch"><h2>{html.escape(label)}</h2>')
    for n, q, _, _ in qs:
        parts.append(f'<article class="q"><div class="qn">{key}-{n}</div>{q}</article>')
    parts.append("</section>")

parts.append('<section class="answers"><h1>答案表</h1><table class="key">')
for key, _, qs in chapters:
    cells = "".join(f"<td><b>{n}</b> {a}</td>" for n, _, a, _ in qs)
    parts.append(f"<tr><th>{key}</th>{cells}</tr>")
parts.append("</table></section>")

parts.append('<section class="sols"><h1>詳解</h1>')
for key, label, qs in chapters:
    parts.append(f"<h2>{html.escape(label)}</h2>")
    for n, _, a, body in qs:
        parts.append(f'<article class="s"><div class="sn">{key}-{n}<span>答 {a}</span></div>{body}</article>')
parts.append("</section>")

counts = "、".join(f"{k} {len(q)} 題" for k, _, q in chapters)

OUT.write_text(f"""<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>電子學期末選擇題題庫</title>
<link rel="stylesheet" href="{KATEX_CSS}">
<style>
@page {{ size: A4; margin: 13mm 13mm 14mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "PingFang TC", "Noto Sans TC", sans-serif; font-size: 9.6pt; line-height: 1.5; color: #1a1a1a; margin: 0; }}
.cover {{ border-bottom: 2px solid #1f4e9c; padding-bottom: 6px; margin-bottom: 10px; }}
.cover h1 {{ font-size: 17pt; margin: 0 0 2px; color: #1f4e9c; }}
.cover p {{ margin: 0; color: #555; font-size: 9pt; }}
h1 {{ font-size: 15pt; color: #1f4e9c; margin: 0 0 8px; }}
h2 {{ font-size: 12pt; color: #1f4e9c; border-left: 4px solid #e8862a; padding-left: 7px; margin: 12px 0 6px; break-after: avoid; }}
.ch {{ break-before: page; }}
.ch:first-of-type {{ break-before: auto; }}
.q {{ break-inside: avoid; border-bottom: 1px dashed #ccc; padding: 4px 0 6px; }}
.qn {{ float: left; margin-right: 6px; }}
.qn, .sn {{ font-weight: 700; color: #1f4e9c; font-size: 9pt; }}
.sn span {{ margin-left: 8px; color: #e8862a; }}
blockquote {{ margin: 2px 0 4px; padding: 0; }}
blockquote p {{ margin: 0; }}
p {{ margin: 3px 0; }}
.nc-en {{ display: block; color: #666; font-size: 8.6pt; }}
.nc-choices {{ list-style: none; margin: 3px 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; column-gap: 14px; }}
.nc-choice {{ display: flex; gap: 6px; margin: 2px 0; }}
.nc-choice__key {{ flex: none; width: 1.6em; height: 1.6em; border: 1px solid #888; border-radius: 50%; text-align: center; line-height: 1.5em; font-size: 8.5pt; font-weight: 600; }}
.nc-choice__text .nc-en {{ font-size: 8.3pt; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 0.92em; }}
:not(pre) > code {{ background: #f0f1f4; padding: 0 3px; border-radius: 3px; }}
table {{ border-collapse: collapse; margin: 4px 0; font-size: 8.8pt; }}
th, td {{ border: 1px solid #bbb; padding: 2px 6px; vertical-align: top; }}
.answers {{ break-before: page; }}
.key td {{ text-align: center; white-space: nowrap; }}
.key th {{ white-space: nowrap; background: #eef2f9; }}
.s {{ break-inside: avoid; border-bottom: 1px dashed #ccc; padding: 4px 0 6px; font-size: 9pt; }}
.katex-display {{ margin: 4px 0; }}
img, svg {{ max-width: 100%; }}
</style></head><body>
<div class="cover"><h1>電子學實作系列｜期末選擇題題庫</h1>
<p>共 {total} 題（{counts}）。範圍：期中考之後的 CH6 MOS 電晶體、CH8 運算放大器、CH12 回授。
題幹與選項中英並列。前半為題目、不標正解，答案表與逐題詳解在最後。
題目依課程投影片內容改編，Example 8-3、8-4、12-4、12-5、12-38 改寫自投影片原題，其餘為自創練習題，不是教授公布的考古題。</p></div>
{"".join(parts)}
</body></html>
""")
print(f"{OUT.relative_to(ROOT)}：{total} 題（{counts}）")
