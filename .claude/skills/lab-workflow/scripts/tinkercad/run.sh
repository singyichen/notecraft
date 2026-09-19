#!/bin/zsh
# usage: ./run.sh <name> <<'JS' ... JS   — sends a command to the daemon and waits for its result
D=$(cd "$(dirname "$0")" && pwd)/work   # daemon 工作目錄（cmds/ out/ done/ profile/）
name="$1"; cat > "$D/cmds/$name.js.tmp"; mv "$D/cmds/$name.js.tmp" "$D/cmds/$name.js"
for i in {1..500}; do [ -f "$D/out/$name.json" ] && { cat "$D/out/$name.json"; exit 0; }; /bin/sleep 0.3; done
echo "TIMEOUT waiting for $name"; exit 1
