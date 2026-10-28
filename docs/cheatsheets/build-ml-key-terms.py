"""機器學習關鍵定義總表（第 1–7 週，考前複習用，不是帶進考場的小抄）。

從 astro build 的第 9 週筆記抽出「各週關鍵定義總整理」一章（公式已渲染好），排成可列印的 HTML。

用法（先跑過 astro build）：
  python3 docs/cheatsheets/build-ml-key-terms.py
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
    --allow-file-access-from-files --virtual-time-budget=5000 \
    --print-to-pdf="src/content/notes/_references/機器學習實作系列/機器學習關鍵定義總表.pdf" \
    "file://$PWD/docs/cheatsheets/ml-key-terms.html"
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "dist/notes/機器學習實作系列第9週-期中考/index.html"
OUT = ROOT / "docs/cheatsheets/ml-key-terms.html"
KATEX_CSS = "../../node_modules/katex/dist/katex.min.css"  # 相對於 OUT，避免寫進本機絕對路徑

page = SRC.read_bytes().decode("utf-8", "replace").replace("\0", "")  # dist HTML 夾帶 NUL byte
start = page.index('<h2 id="各週關鍵定義總整理"')
start = page.index("<h3", start)  # 章節開頭的說明是寫給筆記讀者的，PDF 不收
end = page.index("</table>", page.rindex("<table", start)) + len("</table>")
body = page[start:end]
body = re.sub(r"<p>出處：.*?</p>", "", body, flags=re.S)  # 紙本上連結點不了
weeks = re.findall(r"<h3[^>]*>(.*?)</h3>", body)
terms = body.count("<tr") - body.count("<table")
assert terms == 118, terms

OUT.write_text(f"""<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>機器學習關鍵定義總表</title>
<link rel="stylesheet" href="{KATEX_CSS}">
<style>
@page {{ size: A4; margin: 13mm 13mm 14mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "PingFang TC", "Noto Sans TC", sans-serif; font-size: 10pt; line-height: 1.5; color: #1a1a1a; margin: 0; }}
.cover {{ border-bottom: 2px solid #1f4e9c; padding-bottom: 6px; margin-bottom: 8px; }}
.cover h1 {{ font-size: 17pt; margin: 0 0 2px; color: #1f4e9c; }}
.cover p {{ margin: 0; color: #555; font-size: 9pt; }}
h3 {{ font-size: 12pt; color: #1f4e9c; border-left: 4px solid #e8862a; padding-left: 7px; margin: 14px 0 6px; break-after: avoid; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ border: 1px solid #c4c9d2; padding: 3px 7px; vertical-align: top; text-align: left; }}
th {{ background: #eef2f9; font-size: 9pt; }}
td:first-child {{ width: 30%; font-weight: 600; }}
tr {{ break-inside: avoid; }}
thead {{ display: table-header-group; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 0.9em; background: #f0f1f4; padding: 0 3px; border-radius: 3px; }}
</style></head><body>
<div class="cover"><h1>機器學習實作系列｜關鍵定義總表</h1>
<p>期中範圍第 1–7 週，共 {terms} 個名詞（{"、".join(re.sub(r"：.*", "", w) for w in weeks)}）。整理自各週筆記的「關鍵定義」，考前複習用。</p></div>
{body}
</body></html>
""")
print(f"{OUT.relative_to(ROOT)}：{terms} 個名詞")
