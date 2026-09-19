#!/bin/zsh
# 用 macOS 版 LTspice（CrossOver 包裝）的批次模式跑網表，產生同名 .raw 與 .log
# 用法：./run-lt.sh lab1-*.cir
set -e
CX=/Applications/LTspice.app/Contents/SharedSupport/ltspice
[ -d "$CX" ] || { echo "找不到 /Applications/LTspice.app，請先安裝 LTspice"; exit 1; }
for f in "$@"; do
  abs=$(cd "$(dirname "$f")" && pwd)/$(basename "$f")
  env CX_ROOT="$CX" WINEPREFIX="$CX/support/ltspice" CX_BOTTLE=ltspice \
    "$CX/LTspice/wine" --cx-app "C:\\Program Files\\ADI\\LTspice\\LTspice.exe" -b "Z:$abs" >/dev/null 2>&1 || true
  if [ -f "${abs%.cir}.raw" ]; then echo "ok   $(basename "$f")"; else echo "FAIL $(basename "$f")（沒有產生 .raw）"; fi
done
