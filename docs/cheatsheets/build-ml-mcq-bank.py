"""機器學習實作系列的選擇題題庫：可列印版與互動練習版。

從 astro build 的產物抽出各週 `#### 選擇題 N`（公式、程式碼已渲染好），產生兩份：
- docs/cheatsheets/ml-mcq-bank.html：前半是題目（不標正解），後半是答案表與詳解，印成 PDF
- public/quiz/ml-mcq.html：作答頁，網址 /quiz/ml-mcq.html（樣式與互動在 ml-mcq-quiz.template.html），
  作答紀錄存在 localStorage，按「重新答題」才清除

用法（先跑過 astro build）：
  python3 docs/cheatsheets/build-ml-mcq-bank.py
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
    --allow-file-access-from-files --virtual-time-budget=5000 \
    --print-to-pdf="src/content/notes/_references/機器學習實作系列/機器學習選擇題題庫.pdf" \
    "file://$PWD/docs/cheatsheets/ml-mcq-bank.html"
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
NOTES = ROOT / "src/content/notes"
DIST = ROOT / "dist/notes"
OUT = ROOT / "docs/cheatsheets/ml-mcq-bank.html"
KATEX_CSS = "../../node_modules/katex/dist/katex.min.css"  # 相對於 OUT，避免寫進本機絕對路徑

HEAD_RE = re.compile(r'<h4 id="選擇題-(\d+)">')
END_RE = re.compile(r"<h[1-4][ >]")


def clean_code(s: str) -> str:
    s = re.sub(r'<div class="nc-cb__header">.*?</div>(?=<div class="nc-cb__body">)', "", s, flags=re.S)
    return re.sub(r'<div class="nc-cb__gutter".*?(?=<pre)', "", s, flags=re.S)


def extract(page: str):
    out = []
    for m in HEAD_RE.finditer(page):
        start = page.index("</h4>", m.end()) + len("</h4>")
        nxt = END_RE.search(page, start)
        chunk = page[start : nxt.start() if nxt else len(page)]
        tip = chunk.find('<details class="nc-adm nc-adm--tip"')
        assert tip > 0, f"選擇題 {m.group(1)} 找不到詳解"
        q, sol = chunk[:tip], chunk[tip:]
        answer = re.findall(
            r'<li class="nc-choice nc-choice--correct"><span class="nc-choice__key">([A-Z])', q
        )
        assert answer, f"選擇題 {m.group(1)} 沒有標出正解"
        q = q.replace(" nc-choice--correct", "")
        q = re.sub(r'<svg class="nc-choice__check".*?</svg><span class="nc-choice__sr">正解</span>', "", q, flags=re.S)
        body = sol[sol.find('<div class="nc-adm__body">') : sol.rfind("</details>")]
        out.append((int(m.group(1)), clean_code(q), ",".join(answer), clean_code(body)))
    return out


def week_of(p: pathlib.Path) -> int:
    return int(re.search(r"第(\d+)週", p.name).group(1))


weeks = []
for mdx in sorted(NOTES.glob("機器學習實作系列第*週-*.mdx"), key=week_of):
    if "#### 選擇題" not in mdx.read_text():
        continue
    dist = [d for d in DIST.iterdir() if d.name.lower() == mdx.stem.lower()]
    assert dist, f"dist 裡沒有 {mdx.stem}，先跑 astro build"
    page = (dist[0] / "index.html").read_bytes().decode("utf-8", "replace")
    title = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S).group(1)
    qs = extract(page)
    assert len(qs) == mdx.read_text().count("#### 選擇題"), mdx.name
    weeks.append((week_of(mdx), re.sub(r"^機器學習實作系列[：:]\s*", "", re.sub(r"<[^>]+>", "", title).strip()), qs))

total = sum(len(q) for _, _, q in weeks)

parts = []
for w, title, qs in weeks:
    tag = "" if w <= 7 else '<span class="tag">期中範圍外</span>'
    parts.append(f'<section class="week"><h2>{html.escape(title)}{tag}</h2>')
    for n, q, _, _ in qs:
        parts.append(f'<article class="q"><div class="qn">W{w}-{n}</div>{q}</article>')
    parts.append("</section>")

parts.append('<section class="answers"><h1>答案表</h1><table class="key">')
for w, _, qs in weeks:
    cells = "".join(f"<td><b>{n}</b> {a}</td>" for n, _, a, _ in qs)
    parts.append(f"<tr><th>第 {w} 週</th>{cells}</tr>")
parts.append("</table></section>")

parts.append('<section class="sols"><h1>詳解</h1>')
for w, title, qs in weeks:
    parts.append(f"<h2>{html.escape(title)}</h2>")
    for n, _, a, body in qs:
        parts.append(f'<article class="s"><div class="sn">W{w}-{n}<span>答 {a}</span></div>{body}</article>')
parts.append("</section>")

OUT.write_text(f"""<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>機器學習選擇題題庫</title>
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
.tag {{ font-size: 8pt; color: #a55; border: 1px solid #a55; border-radius: 3px; padding: 0 4px; margin-left: 8px; vertical-align: middle; }}
.week {{ break-before: page; }}
.week:first-of-type {{ break-before: auto; }}
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
.nc-cb {{ margin: 4px 0; background: #f5f6f8; border: 1px solid #ddd; border-radius: 4px; padding: 4px 8px; }}
.nc-cb pre {{ margin: 0; white-space: pre-wrap; font-size: 8.4pt; line-height: 1.4; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 0.92em; }}
:not(pre) > code {{ background: #f0f1f4; padding: 0 3px; border-radius: 3px; }}
.nc-cb__line {{ min-height: 1.4em; }}
.nc-cb__t--keyword {{ color: #8a3ab9; }} .nc-cb__t--string {{ color: #2a7a2a; }}
.nc-cb__t--number {{ color: #b35c00; }} .nc-cb__t--comment {{ color: #888; font-style: italic; }}
.nc-cb__t--func {{ color: #1f4e9c; }}
table {{ border-collapse: collapse; margin: 4px 0; font-size: 8.8pt; }}
th, td {{ border: 1px solid #bbb; padding: 2px 6px; vertical-align: top; }}
.answers {{ break-before: page; }}
.key td {{ text-align: center; white-space: nowrap; }}
.key th {{ white-space: nowrap; background: #eef2f9; }}
.s {{ break-inside: avoid; border-bottom: 1px dashed #ccc; padding: 4px 0 6px; font-size: 9pt; }}
.katex-display {{ margin: 4px 0; }}
img, svg {{ max-width: 100%; }}
</style></head><body>
<div class="cover"><h1>機器學習實作系列｜選擇題題庫</h1>
<p>共 {total} 題（{"、".join(f"第 {w} 週 {len(q)} 題" for w, _, q in weeks)}）。前半為題目，答案表與詳解在最後。期中考範圍為第 1–7 週。</p></div>
{"".join(parts)}
</body></html>
""")
print(f"{OUT.relative_to(ROOT)}：{total} 題")

# 互動練習版：同一批題目，選項可點、對答案算分，作答紀錄存在瀏覽器 localStorage
QUIZ_TPL = ROOT / "docs/cheatsheets/ml-mcq-quiz.template.html"
# 放在 public/ 才會被 dev 與正式站提供（網址 /quiz/ml-mcq.html），第 9 週筆記連過來；
# KaTeX 的 CSS 與 woff2 字型複製到旁邊，不依賴 node_modules
QUIZ_DIR = ROOT / "public/quiz"
QUIZ_OUT = QUIZ_DIR / "ml-mcq.html"
KATEX_DIST = ROOT / "node_modules/katex/dist"
(QUIZ_DIR / "katex/fonts").mkdir(parents=True, exist_ok=True)
(QUIZ_DIR / "katex/katex.min.css").write_bytes((KATEX_DIST / "katex.min.css").read_bytes())
for font in (KATEX_DIST / "fonts").glob("*.woff2"):
    (QUIZ_DIR / "katex/fonts" / font.name).write_bytes(font.read_bytes())
quiz = []
for w, title, qs in weeks:
    tag = "" if w <= 7 else '<span class="tag">期中範圍外</span>'
    quiz.append(f'<section class="week" data-week="{w}"><h2>{html.escape(title)}{tag}</h2>')
    for n, q, a, body in qs:
        quiz.append(
            f'<article class="q" data-id="W{w}-{n}" data-week="{w}" data-answer="{a}">'
            f'<div class="qn">W{w}-{n}<span class="verdict" hidden></span></div>{q}'
            f'<div class="sol" hidden><span class="lbl">正解 {a}</span>{body}</div></article>'
        )
    quiz.append("</section>")
QUIZ_OUT.write_text(
    QUIZ_TPL.read_text().replace("{{KATEX_CSS}}", "katex/katex.min.css").replace("{{QUESTIONS}}", "".join(quiz))
)
print(f"{QUIZ_OUT.relative_to(ROOT)}：{total} 題（互動練習）")
