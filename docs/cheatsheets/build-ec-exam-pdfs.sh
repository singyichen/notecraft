#!/usr/bin/env bash
# 一次重建電子學期末的三份 PDF（題庫、關鍵定義與公式總表、A4 雙面小抄）。
#
#   npm run build-ec-pdfs     # 或直接 bash docs/cheatsheets/build-ec-exam-pdfs.sh
#
# 前兩份是從 astro build 的產物抽出來的，所以會先確認 dist/ 存在；改了三篇筆記的
# 「考題」「關鍵定義」「公式」之後要重跑一次 astro build，再跑這支。
# 第三份（小抄）的內容是手寫的 docs/cheatsheets/ec-final-a4.html，不會自動跟著筆記更新。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_DIR="src/content/notes/_references/電子學實作系列"
[ -x "$CHROME" ] || { echo "找不到 Chrome：$CHROME" >&2; exit 1; }
[ -d dist/notes ] || { echo "dist/notes 不存在，先跑 npx astro build" >&2; exit 1; }
mkdir -p "$OUT_DIR"

pdf() {  # pdf <來源 html> <輸出 pdf>
  "$CHROME" --headless --no-pdf-header-footer --allow-file-access-from-files \
    --virtual-time-budget=8000 --print-to-pdf="$2" "file://$ROOT/$1" 2>/dev/null
  printf '  → %s（%s 頁）\n' "$2" "$(pdfinfo "$2" | awk '/^Pages/{print $2}')"
}

echo "[1/3] 選擇題題庫"
python3 docs/cheatsheets/build-ec-mcq-bank.py
pdf docs/cheatsheets/ec-mcq-bank.html "$OUT_DIR/電子學期末選擇題題庫.pdf"

echo "[2/3] 關鍵定義與公式總表"
python3 docs/cheatsheets/build-ec-key-terms.py
pdf docs/cheatsheets/ec-key-terms.html "$OUT_DIR/電子學關鍵定義與公式總表.pdf"

echo "[3/3] A4 雙面小抄"
pdf docs/cheatsheets/ec-final-a4.html "$OUT_DIR/電子學期末A4小抄.pdf"
# 小抄塞爆時右下角會印出紅色 OVERFLOW 方塊，列印版面與螢幕不一致，只能這樣驗
python3 - "$OUT_DIR/電子學期末A4小抄.pdf" <<'PY'
import subprocess, sys, tempfile, pathlib
from PIL import Image
pdf = sys.argv[1]
with tempfile.TemporaryDirectory() as d:
    subprocess.run(["pdftoppm", "-png", "-r", "60", pdf, f"{d}/p"], check=True)
    bad = []
    for png in sorted(pathlib.Path(d).glob("p-*.png")):
        im = Image.open(png).convert("RGB")
        w, h = im.size
        box = im.crop((int(w * 0.70), int(h * 0.92), w, h))
        if sum(1 for p in list(box.getdata()) if p[0] > 170 and p[1] < 60 and p[2] < 60) > 50:
            bad.append(png.name)
    print("  → 小抄溢出檢查：" + ("OK" if not bad else f"這幾頁塞爆了 {bad}，調小 body 的 font-size"))
    sys.exit(1 if bad else 0)
PY
echo "完成。"
