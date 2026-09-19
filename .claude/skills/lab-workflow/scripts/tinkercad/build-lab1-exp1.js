const p0 = ctx.pages()[ctx.pages().length - 1];
await p0.goto('https://www.tinkercad.com/things/jKblOBzuo2v-glorious-habbi-kieran/editel', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p0.waitForTimeout(9000);
const p = p0;
const R = { steps: [], moves: [], probes: {} };
const countComps = () => p.evaluate(() => document.querySelectorAll('#breadboardTab svg [class*="cgfx__"]').length);
const geom = () => p.evaluate(() => {
  const out = {};
  const bb = document.querySelector('#breadboardTab svg [class*="cgfx__breadboard"]');
  if (bb) {
    const pts = Array.from(bb.querySelectorAll('g.cgfx__breadboard-round')).map(g => { const r = g.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const ys = [...new Set(pts.map(o => Math.round(o.y)))].sort((a, b) => a - b);
    const rows = []; for (const y of ys) { if (!rows.length || y - rows[rows.length - 1].y > 3) rows.push({ y, xs: [] }); }
    for (const o of pts) { const r = rows.find(r => Math.abs(r.y - o.y) <= 3); if (r) r.xs.push(o.x); }
    const main = rows.slice(2, 12); const names = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    out.rows = Object.fromEntries(names.map((n, i) => [n, main[i].y])); out.rail = { minus: rows[0].y, plus: rows[1].y };
    out.cols = [...new Set(main[0].xs.map(x => Math.round(x)))].sort((a, b) => a - b);
    out.railCols = [...new Set(rows[1].xs.map(x => Math.round(x)))].sort((a, b) => a - b);
    const r = bb.getBoundingClientRect(); out.board = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    out.pitch = Math.round((out.cols[29] - out.cols[0]) / 29 * 10) / 10;
  }
  const top = sel => Array.from(document.querySelectorAll(sel)).filter(e => !e.parentElement.closest('[class*="cgfx__"]'));
  out.mm = top('#breadboardTab svg [class*="cgfx__multimeter"]').map(root => { const r = root.getBoundingClientRect(); return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height * 0.45), t: Array.from(root.querySelectorAll('[class*="cgfx__wire-terminal"]')).map(t => { const q = t.getBoundingClientRect(); return { x: Math.round(q.x + q.width / 2), y: Math.round(q.y + q.height * 0.7), cls: (t.getAttribute('class') || '').slice(0, 30) }; }) }; });
  const ps = top('#breadboardTab svg [class*="cgfx__powersupply"]')[0]; if (ps) { const q = ps.getBoundingClientRect(); out.ps = { x: q.x, y: q.y, w: q.width, h: q.height }; }
  out.wires = document.querySelectorAll('#breadboardTab svg .wire-segment').length;
  return out;
});
const deselect = async () => { await p.keyboard.press('Escape'); await p.mouse.click(60, 870); await p.waitForTimeout(300); };
const drag = async (x1, y1, x2, y2) => { await p.mouse.move(x1, y1); await p.mouse.down(); await p.waitForTimeout(100); for (let i = 1; i <= 24; i++) { await p.mouse.move(x1 + (x2 - x1) * i / 24, y1 + (y2 - y1) * i / 24); await p.waitForTimeout(25); } await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(1200); };
const tileOf = async (name) => { await p.evaluate((name) => { const el = Array.from(document.querySelectorAll('.editor__component_picker__groups__item')).find(e => (e.innerText || '').trim().startsWith(name)); el.scrollIntoView({ block: 'center' }); }, name); await p.waitForTimeout(500); return p.evaluate((name) => { const el = Array.from(document.querySelectorAll('.editor__component_picker__groups__item')).find(e => (e.innerText || '').trim().startsWith(name)); const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }, name); };
const place = async (name, x, y, search) => { const q = p.locator('#q'); await q.click({ clickCount: 3 }); await q.fill(search || ''); await q.press('Enter'); await p.waitForTimeout(900); const t = await tileOf(name); await drag(t.x, t.y, x, y); };
const panelSet = async (yy, val) => { const inputs = p.locator('input').filter({ visible: true }); const n = await inputs.count(); for (let i = 0; i < n; i++) { const b = await inputs.nth(i).boundingBox(); if (b && b.x > 880 && b.x < 1160 && Math.abs(b.y - yy) < 8) { await inputs.nth(i).click({ clickCount: 3, force: true }); await inputs.nth(i).fill(val, { force: true }); await inputs.nth(i).press('Enter'); return true; } } return false; };
const selectOpt = async (label) => { const sels = p.locator('select').filter({ visible: true }); const n = await sels.count(); for (let i = 0; i < n; i++) { const b = await sels.nth(i).boundingBox(); if (b && b.x > 880 && b.x < 1160 && b.y < 400) await sels.nth(i).selectOption({ label }); } };
const bbox = (cls) => p.evaluate((cls) => Array.from(document.querySelectorAll('#breadboardTab svg [class*="' + cls + '"]')).filter(e => !e.parentElement.closest('[class*="cgfx__"]')).map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }), cls);
const tipAt = async (x, y) => { await p.mouse.move(x, y); await p.waitForTimeout(180); return p.evaluate(() => Array.from(document.querySelectorAll('[class*=tooltip], [role=tooltip]')).filter(e => e.getBoundingClientRect().width > 0).map(e => (e.innerText || '').trim()).join('|')); };
// 0. robust clear
for (let k = 0; k < 4; k++) { await p.mouse.click(100, 820); await p.waitForTimeout(200); await p.keyboard.press('Meta+a'); await p.waitForTimeout(300); await p.keyboard.press('Delete'); await p.waitForTimeout(700); if ((await countComps()) === 0) break; await p.keyboard.press('Backspace'); await p.waitForTimeout(700); }
R.cleared = await countComps(); if (R.cleared !== 0) return { error: 'canvas not cleared', R };
await place('小型電路試驗板', 660, 560); await deselect();
const placeHoriz = async (name, c1, c2, row, cls) => {
  let g = await geom(); const tx = (g.cols[c1 - 1] + g.cols[c2 - 1]) / 2, ty = g.rows[row];
  await place(name, tx, ty); await p.waitForTimeout(300); for (let q = 0; q < 3; q++) { await p.keyboard.press('r'); await p.waitForTimeout(350); }
  if (name === '電阻') { await panelSet(186, '1'); await selectOpt('kΩ'); }
  await deselect();
  for (let k = 0; k < 5; k++) { const bb = (await bbox(cls))[0]; g = await geom(); const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, tx2 = (g.cols[c1 - 1] + g.cols[c2 - 1]) / 2, ty2 = g.rows[row]; R.moves.push({ name, k, dx: Math.round(tx2 - cx), dy: Math.round(ty2 - cy), w: bb.w, h: bb.h }); if (Math.abs(cx - tx2) <= 3 && Math.abs(cy - ty2) <= 3) break; await drag(cx, cy, tx2, ty2); await deselect(); }
};
await placeHoriz('二極體', 5, 9, 'i', 'cgfx__diode');
let g = await geom();
R.probes.d5 = await tipAt(g.cols[4], g.rows.i); R.probes.d9 = await tipAt(g.cols[8], g.rows.i);
if (R.probes.d9.includes('陽極')) {   // anode must be on the left (col 5): turn the diode 180°
  const bb = (await bbox('cgfx__diode'))[0]; await p.mouse.click(bb.x + bb.w / 2, bb.y + bb.h / 2); await p.waitForTimeout(300);
  for (let q = 0; q < 6; q++) { await p.keyboard.press('r'); await p.waitForTimeout(300); }
  await deselect();
  for (let k = 0; k < 5; k++) { const b2 = (await bbox('cgfx__diode'))[0]; g = await geom(); const cx = b2.x + b2.w / 2, cy = b2.y + b2.h / 2, tx2 = (g.cols[4] + g.cols[8]) / 2, ty2 = g.rows.i; if (Math.abs(cx - tx2) <= 3 && Math.abs(cy - ty2) <= 3) break; await drag(cx, cy, tx2, ty2); await deselect(); }
  g = await geom(); R.probes.d5b = await tipAt(g.cols[4], g.rows.i); R.probes.d9b = await tipAt(g.cols[8], g.rows.i);
}
const aCol = 5, kCol = 9, rFar = 13;
await placeHoriz('電阻', 9, 13, 'h', 'cgfx__resistor');
for (let k = 0; k < 10; k++) { g = await geom(); if (g.pitch <= 14.5) break; await p.mouse.move(640, 500); await p.mouse.wheel(0, 120); await p.waitForTimeout(400); }
g = await geom();
await place('電源供應器', Math.max(110, g.board.x - 115), g.rows.g, '電源供應器'); await panelSet(186, '0.7'); await panelSet(222, '0.1'); await deselect();
g = await geom();
await place('萬用表', g.cols[2] - 30, g.board.y - 120, '萬用表'); await selectOpt('電壓'); await deselect();
g = await geom();
await place('萬用表', Math.min(g.cols[16] + 40, 1000), g.board.y - 120, '萬用表'); await selectOpt('安培數'); await deselect();
g = await geom(); R.layout = { pitch: g.pitch, board: g.board, rail: g.rail, mm: g.mm.map(m => [m.cx, m.cy]), aCol, kCol, rFar, comps: await countComps() };
const Vm = g.mm.reduce((a, b) => (a.cx < b.cx ? a : b)); const Am = g.mm.find(m => m !== Vm);
const tOf = (m, key) => { const t = m.t.find(o => o.cls.includes(key)); return [t.x, t.y]; };
const Ared = tOf(Am, 'red'), Ablk = tOf(Am, 'black'), Vred = tOf(Vm, 'red'), Vblk = tOf(Vm, 'black');
const pos = [], neg = [];
outer: for (let y = Math.round(g.ps.y + g.ps.h * 0.85); y <= g.ps.y + g.ps.h + 4; y += 3) { for (let x = Math.round(g.ps.x + g.ps.w * 0.3); x <= Math.round(g.ps.x + g.ps.w * 0.7); x += 3) { const t = await tipAt(x, y); if (t.includes('正極')) pos.push([x, y]); if (t.includes('負極')) neg.push([x, y]); } if (pos.length && neg.length) break outer; }
const mid = a => a[Math.floor(a.length / 2)]; const PSp = mid(pos), PSn = mid(neg);
R.terms = { PSp, PSn, Ared, Ablk, Vred, Vblk };
if (!PSp || !PSn) return { error: 'ps terminals not found', R };
const H = (c, r) => [g.cols[c - 1], g.rows[r]]; const RAIL = (sign, c) => [g.railCols[c - 1], sign === '+' ? g.rail.plus : g.rail.minus];
const nWires = () => p.evaluate(() => document.querySelectorAll('#breadboardTab svg .wire-segment').length);
const wire = async (name, a, b, vias = []) => { const before = await nWires(); await p.mouse.move(a[0], a[1]); await p.waitForTimeout(250); await p.mouse.click(a[0], a[1]); await p.waitForTimeout(350); for (const v of vias) { await p.mouse.move(v[0], v[1]); await p.waitForTimeout(120); await p.mouse.click(v[0], v[1]); await p.waitForTimeout(200); } await p.mouse.move(b[0], b[1]); await p.waitForTimeout(300); await p.mouse.click(b[0], b[1]); await p.waitForTimeout(700); const after = await nWires(); if (after === before) { await p.keyboard.press('Escape'); await deselect(); } R.steps.push({ name, ok: after > before }); };
await wire('PS+ -> +rail c1', PSp, RAIL('+', 1), [[PSp[0], g.rail.plus + 40], [g.railCols[0] - 22, g.rail.plus + 40], [g.railCols[0] - 22, g.rail.plus]]);
await wire('PS- -> -rail c2', PSn, RAIL('-', 2), [[PSn[0], g.rail.minus - 30], [g.railCols[1], g.rail.minus - 30]]);
await wire('+rail -> j(anode)', RAIL('+', aCol), H(aCol, 'j'));
await wire('A red -> j(rFar)', Ared, H(rFar, 'j'));
await wire('A blk -> -rail', Ablk, RAIL('-', rFar + 4));
await wire('V red -> +rail', Vred, RAIL('+', aCol - 2));
await wire('V blk -> j(cathode)', Vblk, H(kCol, 'j'));
await p.mouse.move(60, 870); await p.waitForTimeout(300);
await p.getByText('開始模擬').first().click(); await p.waitForTimeout(3000);
R.displays = await p.evaluate(() => Array.from(document.querySelectorAll('#breadboardTab svg text')).map(t => t.textContent.trim()).filter(t => t && t.length < 20 && /[VAµm]/.test(t)));
await p.screenshot({ path: D + '/s-059-sim.png' });
await p.getByText('停止模擬').first().click(); await p.waitForTimeout(300);
return R;
