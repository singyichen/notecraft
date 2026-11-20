"""電子學期末關鍵定義與公式總表（CH6／CH8／CH12，考前複習用，不是帶進考場的小抄）。

從 astro build 的三篇筆記抽出 `## 關鍵定義` 與 `## 公式` 兩章（KaTeX 已渲染好），
排成可列印的 HTML。帶進考場的那一張是另一份（build-ec-a4-cheatsheet.py）。

用法（先跑過 astro build）：
  python3 docs/cheatsheets/build-ec-key-terms.py
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
    --allow-file-access-from-files --virtual-time-budget=5000 \
    --print-to-pdf="src/content/notes/_references/電子學實作系列/電子學關鍵定義與公式總表.pdf" \
    "file://$PWD/docs/cheatsheets/ec-key-terms.html"
"""
import argparse
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description="產生電子學期末關鍵定義與公式總表")
parser.add_argument("--dist", type=pathlib.Path, default=ROOT / "dist")
args = parser.parse_args()
DIST = args.dist / "notes"
OUT = ROOT / "docs/cheatsheets/ec-key-terms.html"
KATEX_CSS = "../../node_modules/katex/dist/katex.min.css"  # 相對於 OUT，避免寫進本機絕對路徑

GROUPS = [
    ("CH6　MOS 電晶體與 CS 放大器", "電子學實作系列第7週-MOS電晶體與CS放大器"),
    ("CH8　運算放大器", "電子學實作系列第10週-MOS放大器組態與運放電路"),
    ("CH12　回授", "電子學實作系列第11週-回授"),
]


def section(page: str, hid: str, stop: str) -> str:
    """取出 <h2 id=hid> 之後、<h2 id=stop> 之前的內容，不含標題本身。"""
    start = page.index(f'<h2 id="{hid}"')
    start = page.index("</h2>", start) + len("</h2>")
    end = page.index(f'<h2 id="{stop}"', start)
    body = page[start:end]
    # 章節開頭寫給筆記讀者的引言與紙本上點不了的連結都拿掉
    body = re.sub(r"<blockquote>.*?</blockquote>", "", body, flags=re.S)
    body = re.sub(r'<a [^>]*href="[^"]*"[^>]*>(.*?)</a>', r"\1", body, flags=re.S)
    return body.strip()


parts, n_terms, n_forms = [], 0, 0
for label, stem in GROUPS:
    hit = [d for d in DIST.iterdir() if d.name.lower() == stem.lower()]
    assert hit, f"dist 裡沒有 {stem}，先跑 astro build"
    page = (hit[0] / "index.html").read_bytes().decode("utf-8", "replace")
    terms = section(page, "關鍵定義", "公式")
    forms = section(page, "公式", "考題")
    n_terms += terms.count("<tr>") - terms.count("<thead>")  # 扣掉標題列
    n_forms += forms.count("<li>") + max(forms.count("<tr>") - forms.count("<thead>"), 0)
    parts.append(
        f'<section class="ch"><h2>{html.escape(label)}</h2>'
        f'<h3>關鍵定義</h3>{terms}<h3>公式</h3>{forms}</section>'
    )

OUT.write_text(f"""<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>電子學期末關鍵定義與公式總表</title>
<link rel="stylesheet" href="{KATEX_CSS}">
<style>
@page {{ size: A4; margin: 12mm 12mm 13mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "PingFang TC", "Noto Sans TC", sans-serif; font-size: 9pt; line-height: 1.45; color: #1a1a1a; margin: 0; }}
.cover {{ border-bottom: 2px solid #1f4e9c; padding-bottom: 6px; margin-bottom: 10px; }}
.cover h1 {{ font-size: 16pt; margin: 0 0 2px; color: #1f4e9c; }}
.cover p {{ margin: 0; color: #555; font-size: 8.6pt; }}
.ch {{ break-before: page; }}
.ch:first-of-type {{ break-before: auto; }}
h2 {{ font-size: 12.5pt; color: #1f4e9c; border-left: 4px solid #e8862a; padding-left: 7px; margin: 0 0 8px; break-after: avoid; }}
h3 {{ font-size: 10pt; color: #e8862a; margin: 10px 0 4px; break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; margin: 0 0 4px; font-size: 8.5pt; }}
th, td {{ border: 1px solid #bbb; padding: 2.5px 6px; vertical-align: top; text-align: left; }}
th {{ background: #eef2f9; color: #1f4e9c; white-space: nowrap; }}
tr {{ break-inside: avoid; }}
td:first-child {{ white-space: nowrap; font-weight: 600; }}
ul {{ margin: 0 0 4px; padding-left: 1.2em; }}
li {{ margin: 2px 0; break-inside: avoid; }}
p {{ margin: 3px 0; }}
strong {{ color: #1f4e9c; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 0.92em; background: #f0f1f4; padding: 0 3px; border-radius: 3px; }}
.katex {{ font-size: 1em; }}
.katex-display {{ margin: 3px 0; }}
</style></head><body>
<div class="cover"><h1>電子學實作系列｜期末關鍵定義與公式總表</h1>
<p>CH6 MOS 電晶體、CH8 運算放大器、CH12 回授，共 {n_terms} 個名詞與 {n_forms} 條公式。
考前複習用，不是帶進考場的那一張——小抄是另一份。內容取自三篇週次筆記的「關鍵定義」與「公式」兩章，以投影片與課本為準。</p></div>
{"".join(parts)}
</body></html>
""")
print(f"{OUT.relative_to(ROOT)}：{n_terms} 個名詞、{n_forms} 條公式")
