#!/bin/zsh
# 把 bodies/*.body 各自和 ua741-model.txt 串成自足的 .cir（LTspice 線上版也開得起來）。
# 網表的真正來源是 bodies/；.cir 是產物，但照樣進版控，重新 clone 不必先跑這支。
set -e
cd "$(dirname "$0")"
for b in bodies/*.body; do
  n=$(basename "$b" .body)
  cat ua741-model.txt "$b" > "$n.cir"
  echo "寫出 $n.cir"
done
