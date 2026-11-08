// Lab 4／Lab 5 運放電路在 Tinkercad 的共用座標與接線小工具
// 重點：列的 y 座標一律即時量，不可寫死——畫布會隨操作位移（踩過一次）。
module.exports = (H, p, D) => {
  const S = {};
  const NAMES = ['tm', 'tp', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a', 'bm', 'bp'];
  S.geom = async () => {
    const info = await p.evaluate(() => {
      const bb = document.querySelector('#breadboardTab svg [class*="cgfx__breadboard"]');
      const pts = Array.from(bb.querySelectorAll('g.cgfx__breadboard-round')).map(g => { const r = g.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      const ys = [...new Set(pts.map(o => Math.round(o.y)))].sort((a, b) => a - b);
      const rows = []; for (const y of ys) { if (!rows.length || y - rows[rows.length - 1] > 3) rows.push(y); }
      const colsOf = y => [...new Set(pts.filter(o => Math.abs(o.y - y) <= 3).map(o => Math.round(o.x)))].sort((a, b) => a - b);
      const r = bb.getBoundingClientRect();
      return { rows, cols: colsOf(rows[4]), board: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    });
    S.R = Object.fromEntries(NAMES.map((n, i) => [n, info.rows[i]]));
    S.cols = info.cols;
    S.board = info.board;
    return info;
  };
  S.C = (i) => S.cols[i - 1];
  S.at = (col, row) => [S.C(col), S.R[row]];
  // 每條線之間一定要先 deselect，而且每次都重新量座標
  S.run = async (list, color) => {
    const out = [];
    if (color) { await H.deselect(); out.push({ color, ok: await H.pickColor(color) }); }
    for (const [name, ca, ra, cb, rb, vias] of list) {
      await H.deselect();
      await S.geom();
      const r = await H.wire(name, S.at(ca, ra), S.at(cb, rb), vias || []);
      out.push(r);
    }
    await H.deselect();
    return out;
  };
  // 儀器端子 → 板上孔位。座標一律在畫線前「當場重讀」：Tinkercad 的畫布會隨操作位移，
  // 先讀好再畫一定會落空（踩過兩次：列 y 寫死、儀器端子先讀）。
  S.termOf = async (cls, idx, name) => {
    const t = await H.terms(cls);
    const o = t[idx].t.find(q => q.name === name);
    return o ? [o.x, o.y] : null;
  };
  S.wireT = async (name, from, to, vias, color) => {
    await H.deselect();
    if (color) { await H.pickColor(color); await H.deselect(); }
    await S.geom();
    const a = Array.isArray(from) ? from : await S.termOf(from.cls, from.i, from.t);
    const b = Array.isArray(to) ? to : (to.col ? S.at(to.col, to.row) : await S.termOf(to.cls, to.i, to.t));
    const r = await H.wire(name, a, b, typeof vias === 'function' ? vias(a, b) : (vias || []));
    await H.deselect();
    return r;
  };
  // 刪掉「有一端落在某個孔位」的那條線（多段線點任一段都會選到整條）
  S.delAt = async (col, row, tol = 9) => {
    await H.deselect();
    await S.geom();
    const [x, y] = S.at(col, row);
    const pts = await H.wirePoints();
    const hit = pts.find(o => {
      const b = o.box;
      return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    });
    if (!hit) return { found: false, at: [col, row] };
    const before = await H.nWires(), comps = await H.topComps();
    await p.mouse.click(hit.x, hit.y); await H.wait(400);
    await p.keyboard.press('Delete'); await H.wait(600);
    if ((await H.topComps()) < comps) { await p.keyboard.press('Meta+z'); await H.wait(1200); await H.deselect(); return { found: true, undo: true }; }
    await H.deselect();
    return { found: true, at: [col, row], before, after: await H.nWires() };
  };
  S.shot = (n) => p.screenshot({ path: D + '/out/' + n + '.png' });
  return S;
};
