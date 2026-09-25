// 給 run.sh 送進 daemon 的命令共用：const H = require('./helpers.js')(page);
module.exports = (p) => {
  const S = {};
  S.p = p;
  S.wait = (ms) => p.waitForTimeout(ms);
  S.countComps = () => p.evaluate(() => document.querySelectorAll('#breadboardTab svg [class*="cgfx__"]').length);
  S.nWires = () => p.evaluate(() => document.querySelectorAll('#breadboardTab svg .wire-segment').length);

  S.geom = () => p.evaluate(() => {
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
    const term = root => Array.from(root.querySelectorAll('[class*="cgfx__wire-terminal"]')).map(t => { const q = t.getBoundingClientRect(); return { x: Math.round(q.x + q.width / 2), y: Math.round(q.y + q.height * 0.7), cls: (t.getAttribute('class') || '').slice(0, 40) }; });
    const inst = cls => top('#breadboardTab svg [class*="cgfx__' + cls + '"]').map(root => { const r = root.getBoundingClientRect(); return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height * 0.45), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), t: term(root) }; });
    out.mm = inst('multimeter'); out.ps = inst('powersupply')[0]; out.fg = inst('function'); out.scope = inst('oscilloscope');
    out.wires = document.querySelectorAll('#breadboardTab svg .wire-segment').length;
    return out;
  });

  S.deselect = async () => { await p.keyboard.press('Escape'); await p.mouse.click(60, 870); await S.wait(300); };
  S.drag = async (x1, y1, x2, y2) => { await p.mouse.move(x1, y1); await p.mouse.down(); await S.wait(100); for (let i = 1; i <= 24; i++) { await p.mouse.move(x1 + (x2 - x1) * i / 24, y1 + (y2 - y1) * i / 24); await S.wait(25); } await S.wait(300); await p.mouse.up(); await S.wait(1200); };
  S.tileOf = async (name) => { await p.evaluate((name) => { const el = Array.from(document.querySelectorAll('.editor__component_picker__groups__item')).find(e => (e.innerText || '').trim().startsWith(name) && e.getBoundingClientRect().width > 0); if (el) el.scrollIntoView({ block: 'center' }); }, name); await S.wait(500); const t = await p.evaluate((name) => { const el = Array.from(document.querySelectorAll('.editor__component_picker__groups__item')).find(e => (e.innerText || '').trim().startsWith(name) && e.getBoundingClientRect().width > 0); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }, name); if (!t) throw new Error('tile not visible: ' + name + '（元件選單類別可能不是「全部」）'); return t; };
  S.place = async (name, x, y, search) => { const q = p.locator('#q'); await q.click({ clickCount: 3 }); await q.fill(search || ''); await q.press('Enter'); await S.wait(900); const t = await S.tileOf(name); await S.drag(t.x, t.y, x, y); };
  S.panelSet = async (yy, val) => { const inputs = p.locator('input').filter({ visible: true }); const n = await inputs.count(); for (let i = 0; i < n; i++) { const b = await inputs.nth(i).boundingBox(); if (b && b.x > 880 && b.x < 1160 && Math.abs(b.y - yy) < 8) { await inputs.nth(i).click({ clickCount: 3, force: true }); await inputs.nth(i).fill(val, { force: true }); await inputs.nth(i).press('Enter'); return true; } } return false; };
  S.panelInputs = async () => { const inputs = p.locator('input').filter({ visible: true }); const n = await inputs.count(); const r = []; for (let i = 0; i < n; i++) { const b = await inputs.nth(i).boundingBox(); if (b && b.x > 880 && b.x < 1200) r.push({ y: Math.round(b.y), v: await inputs.nth(i).inputValue() }); } return r; };
  S.panelSelects = async () => { const sels = p.locator('select').filter({ visible: true }); const n = await sels.count(); const r = []; for (let i = 0; i < n; i++) { const b = await sels.nth(i).boundingBox(); if (b && b.x > 880 && b.x < 1200) r.push({ y: Math.round(b.y), v: await sels.nth(i).inputValue(), opts: await sels.nth(i).locator('option').allTextContents() }); } return r; };
  S.selectOpt = async (label, yy) => { const sels = p.locator('select').filter({ visible: true }); const n = await sels.count(); for (let i = 0; i < n; i++) { const b = await sels.nth(i).boundingBox(); if (!b || b.x <= 880 || b.x >= 1200) continue; if (yy != null && Math.abs(b.y - yy) > 10) continue; if (yy == null && b.y >= 400) continue; try { await sels.nth(i).selectOption({ label }); return true; } catch (e) {} } return false; };
  S.bbox = (cls) => p.evaluate((cls) => Array.from(document.querySelectorAll('#breadboardTab svg [class*="' + cls + '"]')).filter(e => !e.parentElement.closest('[class*="cgfx__"]')).map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }), cls);
  S.tipAt = async (x, y) => { await p.mouse.move(x, y); await S.wait(180); return p.evaluate(() => Array.from(document.querySelectorAll('[class*=tooltip], [role=tooltip]')).filter(e => e.getBoundingClientRect().width > 0).map(e => (e.innerText || '').trim()).join('|')); };


  // 屬性面板：用標籤找欄位，不依賴固定 y
  S.fields = () => p.evaluate(() => {
    const res = [];
    for (const el of document.querySelectorAll('input, select')) {
      const r = el.getBoundingClientRect(); if (!r.width || r.x < 860 || r.x > 1170) continue;
      let lab = ''; let n = el.parentElement;
      for (let k = 0; k < 3 && n; k++, n = n.parentElement) { const t = (n.innerText || '').trim().split('\n')[0]; if (t && t.length < 12) { lab = t; break; } }
      res.push({ label: lab, y: Math.round(r.y), tag: el.tagName, value: el.value, opts: el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.text) : undefined });
    }
    return res;
  });
  S.setField = async (label, val) => {
    const f = (await S.fields()).find(o => o.tag === 'INPUT' && o.label.startsWith(label));
    if (!f) return false;
    return S.panelSet(f.y, String(val));
  };
  S.setSelect = async (optLabel) => {
    const f = (await S.fields()).find(o => o.tag === 'SELECT' && (o.opts || []).includes(optLabel));
    if (!f) return false;
    return S.selectOpt(optLabel, f.y);
  };


  // 每個元件的端子：名稱 + 螢幕座標（由 g.cgfx__terminal 內 line 的 x1/y1 經 CTM 換算）
  S.terms = (cls) => p.evaluate((cls) => {
    const top = Array.from(document.querySelectorAll('#breadboardTab svg [class*="cgfx__' + cls + '"]')).filter(e => !e.parentElement.closest('[class*="cgfx__"]'));
    return top.map(root => {
      const r = root.getBoundingClientRect();
      const t = Array.from(root.querySelectorAll('g.cgfx__terminal')).map(g => {
        const m = g.getScreenCTM(); const ln = g.querySelector('line');
        const lx = ln ? parseFloat(ln.getAttribute('x1')) : 0, ly = ln ? parseFloat(ln.getAttribute('y1')) : 0;
        const nm = g.querySelector('desc.cgfx__terminalname');
        return { name: nm ? nm.textContent.trim() : '', x: Math.round(m.a * lx + m.c * ly + m.e), y: Math.round(m.b * lx + m.d * ly + m.f) };
      });
      return { box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, t };
    });
  }, cls);
  S.pin = async (cls, idx, name) => { const a = await S.terms(cls); const c = a[idx]; const t = c.t.find(o => o.name === name); return t ? [t.x, t.y] : null; };


  // 元件選單切到「全部」（新設計預設是「基本」，找不到儀器類元件）
  S.allComponents = async () => {
    const has = () => p.evaluate(() => Array.from(document.querySelectorAll('.editor__component_picker__groups__item')).some(e => (e.innerText || '').trim().startsWith('函數波產生器') && e.getBoundingClientRect().width > 0));
    if (await has()) return 'already';
    await p.mouse.click(1277, 126); await S.wait(1200);
    const all = p.getByText('全部', { exact: true }); const c = await all.count();
    for (let i = 0; i < c; i++) { const el = all.nth(i); if (await el.isVisible()) { const b = await el.boundingBox(); if (b && b.x > 1100 && b.y > 100 && b.y < 260) { await el.click(); break; } } }
    await S.wait(2000);
    return (await has()) ? 'switched' : 'FAILED';
  };


  // 配線顏色：畫線前先設，之後畫的線都用這個顏色
  // 注意：選單會把「當下選取的線」一併改色，所以設預設色前一定要先取消選取
  S.wireColor = async (label) => {
    await S.deselect();
    return S.pickColor(label);
  };

  // 每條線段上的「真實點」：圓角會讓 bbox 中心落在線外，要用 getPointAtLength
  S.wirePoints = () => p.evaluate(() => [...document.querySelectorAll('#breadboardTab svg .wire-segment')].map(el => {
    const r = el.getBoundingClientRect(); const m = el.getScreenCTM();
    let x, y;
    if (el.getTotalLength && el.getTotalLength() > 4) { const q = el.getPointAtLength(el.getTotalLength() / 2); x = m.a * q.x + m.c * q.y + m.e; y = m.b * q.x + m.d * q.y + m.f; }
    else { x = r.x + r.width / 2; y = r.y + r.height / 2; }
    return { x: Math.round(x), y: Math.round(y), box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  }));

  // 點一條既有的線再改它的顏色
  S.recolor = async (pt, label) => {
    await S.deselect();
    await p.mouse.click(pt[0], pt[1]); await S.wait(400);
    return S.pickColor(label);
  };
  S.pickColor = async (label) => {
    await p.mouse.click(369, 76); await S.wait(800);
    const items = p.getByText(label, { exact: true });
    const n = await items.count();
    for (let i = 0; i < n; i++) {
      const el = items.nth(i); if (!(await el.isVisible())) continue;
      const b = await el.boundingBox();
      if (b && b.y > 100 && b.y < 545 && b.x > 300 && b.x < 520) { await el.click(); await S.wait(500); return true; }
    }
    await p.keyboard.press('Escape'); return false;
  };

  // 逐條點選刪除畫布上所有的線（元件不動）

  // 畫布上「頂層元件」的數量（不含 hitarea 與線）
  S.topComps = () => p.evaluate(() => [...document.querySelectorAll('#breadboardTab svg [class*="cgfx__"]')]
    .filter(e => !e.parentElement.closest('[class*="cgfx__"]'))
    .filter(e => !/hitarea|selected/.test(e.getAttribute('class') || '')).length);

  S.deleteAllWires = async (max = 40) => {
    const log = [];
    for (let k = 0; k < max; k++) {
      const before = await S.nWires();
      if (before === 0) break;
      const seg = await p.evaluate(() => {
        const el = document.querySelector('#breadboardTab svg .wire-segment');
        if (!el) return null;
        const L = el.getTotalLength ? el.getTotalLength() : 0;
        if (L > 6 && el.getPointAtLength) { const q = el.getPointAtLength(L / 2); const m = el.getScreenCTM(); return { x: Math.round(m.a * q.x + m.c * q.y + m.e), y: Math.round(m.b * q.x + m.d * q.y + m.f) }; }
        const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      });
      if (!seg) break;
      const compsBefore = await S.topComps();
      await p.mouse.click(seg.x, seg.y); await S.wait(350);
      await p.keyboard.press('Delete'); await S.wait(500);
      // 防呆：點到元件本體而不是線的話，Delete 會刪掉元件 —— 立刻復原
      if ((await S.topComps()) < compsBefore) { await p.keyboard.press('Meta+z'); await S.wait(1200); log.push({ k, at: seg, undo: true }); await S.deselect(); continue; }
      const after = await S.nWires();
      log.push({ k, at: seg, before, after });
      if (after >= before) { await S.deselect(); if (log.filter(o => o.after >= o.before).length > 5) break; }
    }
    return { left: await S.nWires(), log };
  };

  S.clear = async () => { for (let k = 0; k < 4; k++) { await p.mouse.click(100, 820); await S.wait(200); await p.keyboard.press('Meta+a'); await S.wait(300); await p.keyboard.press('Delete'); await S.wait(700); if ((await S.countComps()) === 0) break; await p.keyboard.press('Backspace'); await S.wait(700); } return S.countComps(); };

  // 放一個元件橫跨 c1..c2 欄、落在 row 列；rot 為按 r 的次數（3 次 = 90°）
  S.placeHoriz = async (name, c1, c2, row, cls, opts = {}) => {
    const log = [];
    let g = await S.geom(); const tx = (g.cols[c1 - 1] + g.cols[c2 - 1]) / 2, ty = g.rows[row];
    await S.place(name, tx, ty, opts.search);
    await S.wait(400);
    for (let q = 0; q < (opts.rot == null ? 3 : opts.rot); q++) { await p.keyboard.press('r'); await S.wait(350); }
    if (opts.fields) for (const [lab, val] of opts.fields) await S.setField(lab, val);
    if (opts.unit) await S.setSelect(opts.unit);
    await S.deselect();
    for (let k = 0; k < 5; k++) {
      const arr = await S.bbox(cls); const bb = opts.pick == null ? arr[arr.length - 1] : arr[opts.pick];
      g = await S.geom(); const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
      const tx2 = (g.cols[c1 - 1] + g.cols[c2 - 1]) / 2, ty2 = g.rows[row];
      log.push({ k, dx: Math.round(tx2 - cx), dy: Math.round(ty2 - cy), w: bb.w, h: bb.h });
      if (Math.abs(cx - tx2) <= 3 && Math.abs(cy - ty2) <= 3) break;
      await S.drag(cx, cy, tx2, ty2); await S.deselect();
    }
    return log;
  };

  S.wire = async (name, a, b, vias = []) => {
    const before = await S.nWires();
    await p.mouse.move(a[0], a[1]); await S.wait(250); await p.mouse.click(a[0], a[1]); await S.wait(350);
    for (const v of vias) { await p.mouse.move(v[0], v[1]); await S.wait(120); await p.mouse.click(v[0], v[1]); await S.wait(200); }
    await p.mouse.move(b[0], b[1]); await S.wait(300); await p.mouse.click(b[0], b[1]); await S.wait(700);
    const after = await S.nWires();
    if (after === before) { await p.keyboard.press('Escape'); await S.deselect(); }
    return { name, ok: after > before };
  };

  S.start = async () => { const b = p.getByText('開始模擬').first(); if (await b.count()) { await b.click(); await S.wait(3000); return true; } return false; };
  S.stop = async () => { const b = p.getByText('停止模擬').first(); if (await b.count()) { await b.click(); await S.wait(600); return true; } return false; };
  S.displays = () => p.evaluate(() => Array.from(document.querySelectorAll('#breadboardTab svg text')).map(t => t.textContent.trim()).filter(t => t && t.length < 20 && /[VAµmk]/.test(t)));
  S.rename = async (newName) => {
    const title = await p.evaluate(() => { const el = Array.from(document.querySelectorAll('div, span, input')).find(e => { const r = e.getBoundingClientRect(); return r.y < 50 && r.x < 320 && r.x > 40 && /\S/.test(e.value || e.innerText || '') && (e.value || e.innerText).length < 40 && !/電路|線路圖|元件/.test(e.value || e.innerText); }); if (!el) return null; const r = el.getBoundingClientRect(); return { text: el.value || el.innerText, x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (!title) return null;
    await p.mouse.click(title.x, title.y); await S.wait(500);
    await p.keyboard.press('Meta+a'); await p.keyboard.type(newName); await p.keyboard.press('Enter'); await S.wait(1500);
    return p.title();
  };
  return S;
};
