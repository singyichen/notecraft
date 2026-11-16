#!/usr/bin/env node
/**
 * 由筆記的 `#### 選擇題 N` 區塊產生 public/quiz/ 底下的線上作答頁。
 *
 *   ml  → public/quiz/ml-mcq.html        機器學習期中（Lectures 1–6，106 題）
 *   ec  → public/quiz/ec-final-mcq.html  電子學期末（CH6／CH8／CH12，36 題）
 *
 * **只產生題目區段**，頁面外殼（CSS、計分 JS、頁首、說明）放在 `scripts/quiz/*.template.html`
 * 的 `<!--QUESTIONS-->` 前後，原封不動沿用——兩頁的互動本來就不一樣，不要硬合併。
 *
 * 這樣題幹、選項、正解、詳解只有一份來源（筆記本身）：改筆記、重跑一次就同步。
 * `#### 延伸題（原 WX-N）` 不收（那是移出題庫、留在筆記的延伸閱讀）。
 *
 * 機器學習那份的「小抄 §N／第幾面」是作答頁專屬的版面資訊，筆記裡沒有，放在
 * `scripts/quiz/ml-cheatsheet-refs.json`；它以題幹前 24 字當指紋，對不上就中止，
 * 避免筆記插入新題之後題號位移、小抄欄默默指錯區塊。
 *
 * 用法：node scripts/build-quiz.mjs [--check] [ml|ec]
 *   --check 只比對產物是否與筆記同步，不覆寫。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';
import { retext } from 'retext';
import retextSmartypants from 'retext-smartypants';
import { tokenizeLine } from '../src/lib/code-tokenize.ts';

/** Astro 的 markdown 預設開著 smartypants，筆記頁渲染出來是彎引號；作答頁要一致。 */
const smart = retext().use(retextSmartypants);
const smarten = (s) => String(smart.processSync(s));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TPL = path.join(ROOT, 'scripts', 'quiz');
const NOTES = path.join(ROOT, 'src', 'content', 'notes');

/* ── 兩份題庫的設定 ──────────────────────────────────────────────────── */
const QUIZZES = {
  ml: {
    out: 'ml-mcq.html',
    template: 'ml-mcq.template.html',
    /** 題號前綴與區段屬性：機器學習用 data-week、電子學用 data-ch */
    attr: 'week',
    idOf: (g, n) => `W${g.key}-${n}`,
    refs: 'ml-cheatsheet-refs.json',
    groups: [
      { key: 1, label: '第 1 週 - 機器學習簡介', file: '機器學習實作系列第1週-機器學習簡介.mdx' },
      { key: 2, label: '第 2 週 - PLA 與 Python 基礎', file: '機器學習實作系列第2週-Python基礎.mdx' },
      { key: 3, label: '第 3 週 - Adaline 與 NumPy、Pandas', file: '機器學習實作系列第3週-NumPy與Pandas.mdx' },
      { key: 5, label: '第 5 週 - 邏輯迴歸、Matplotlib 與 Seaborn', file: '機器學習實作系列第5週-Matplotlib與Seaborn資料視覺化.mdx' },
      { key: 6, label: '第 6 週 - Scikit-learn 機器學習', file: '機器學習實作系列第6週-Scikit-learn機器學習.mdx' },
      { key: 7, label: '第 7 週 - 資料前處理、特徵工程與模型選擇評估', file: '機器學習實作系列第7週-資料前處理與模型評估.mdx' },
    ],
  },
  ec: {
    out: 'ec-final-mcq.html',
    template: 'ec-final-mcq.template.html',
    attr: 'ch',
    idOf: (g, n) => `${g.key}-${n}`,
    /** 電子學那份把「考的觀念」抽到詳解欄；機器學習那份的欄位是小抄位置，所以留在內文 */
    keyInRef: true,
    ref: (q) => `<div class="ref"><b>考的觀念</b><span>${inline(q.key)}</span></div>`,
    groups: [
      { key: 'CH6', label: 'CH6　MOS 電晶體與 CS 放大器', file: '電子學實作系列第7週-MOS電晶體與CS放大器.mdx',
        note: '/notes/電子學實作系列第7週-mos電晶體與cs放大器#考題', noteLabel: '第 7 週筆記 →' },
      { key: 'CH8', label: 'CH8　運算放大器', file: '電子學實作系列第10週-MOS放大器組態與運放電路.mdx',
        note: '/notes/電子學實作系列第10週-mos放大器組態與運放電路#考題', noteLabel: '第 10 週筆記 →' },
      { key: 'CH12', label: 'CH12　回授', file: '電子學實作系列第11週-回授.mdx',
        note: '/notes/電子學實作系列第11週-回授#考題', noteLabel: '第 11 週筆記 →' },
    ],
  },
};

/* ── 行內：KaTeX、粗體、行內程式碼 ───────────────────────────────────── */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function inline(src) {
  // 數學與行內程式碼先抽成佔位符再跳脫：`**` 這種內容否則會被下面的粗體規則吃掉。
  // 佔位符用私用區字元，正文不會出現。
  const MARK = String.fromCharCode(0xe000);
  const held = [];
  const hold = (html) => MARK + (held.push(html) - 1) + MARK;
  let s = src.replace(/\$([^$]+)\$/g, (_, tex) =>
    hold(katex.renderToString(tex, { throwOnError: true, displayMode: false })));
  s = s.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${esc(code)}</code>`));
  s = esc(smarten(s));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s.replace(new RegExp(MARK + '(\\d+)' + MARK, 'g'), (_, i) => held[+i]);
}

/** `中文 :en[English]` → 中文 ＋ 一行淡色英文（對應筆記的 :en 指令）。 */
function bilingual(src) {
  const m = src.match(/^(.*?)\s*:en\[([\s\S]*)\]\s*$/);
  if (!m) return inline(src.trim());
  return `${inline(m[1].trim())} <span class="nc-en" lang="en">${inline(m[2].trim())}</span>`;
}

/* ── 區塊：圍欄程式碼、display math、表格、段落 ──────────────────────── */
/** 用站上同一份 tokenizer（src/lib/code-tokenize.ts），上色規則與筆記內文一致。 */
function codeBlock(lang, code) {
  const lines = code.split('\n').map((line) => {
    const parts = tokenizeLine(line).map(({ text, cat }) => (
      cat === 'plain' ? esc(text) : `<span class="nc-cb__t nc-cb__t--${cat}">${esc(text)}</span>`
    )).join('');
    return `<div class="nc-cb__line">${parts || '&#8203;'}</div>`;
  }).join('');
  return `<div class="nc-cb"${lang ? ` data-lang="${esc(lang)}"` : ''}><div class="nc-cb__body">` +
    `<pre class="nc-cb__pre"><code class="nc-cb__code">${lines}</code></pre></div></div>`;
}

function table(rows) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Markdown 區塊 → HTML。支援段落、```圍欄、$$display$$、表格、`- ` 清單。 */
function blocks(md) {
  const out = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const body = [];
      for (i += 1; i < lines.length && !lines[i].startsWith('```'); i += 1) body.push(lines[i]);
      out.push(codeBlock(fence[1], body.join('\n')));
      continue;
    }
    if (line.trim() === '$$') {
      const body = [];
      for (i += 1; i < lines.length && lines[i].trim() !== '$$'; i += 1) body.push(lines[i]);
      out.push(katex.renderToString(body.join('\n'), { throwOnError: true, displayMode: true }));
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows = [];
      for (; i < lines.length && /^\s*\|/.test(lines[i]); i += 1) rows.push(lines[i]);
      i -= 1;
      out.push(table(rows));
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      for (; i < lines.length && /^\s*[-*] /.test(lines[i]); i += 1) items.push(lines[i].replace(/^\s*[-*] /, ''));
      i -= 1;
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }
    const para = [line];
    for (; i + 1 < lines.length && lines[i + 1].trim() && !/^(```|\s*\||\s*[-*] |\$\$)/.test(lines[i + 1]); i += 1) {
      para.push(lines[i + 1]);
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('');
}

/* ── 解析一篇筆記的選擇題 ────────────────────────────────────────────── */
function parseNote(src, where, keyInRef) {
  const blocksRaw = src.split(/^#### 選擇題 \d+$/m).slice(1);
  return blocksRaw.map((raw, i) => {
    const at = `${where} 第 ${i + 1} 題`;
    // 下一個 #### 之後的內容屬於別題，切掉
    const body = raw.split(/^#### /m)[0];

    const stem = body.match(/^>\s*(.+)\n>\s*:en\[([\s\S]*?)\]\s*$/m);
    if (!stem) throw new Error(`${at}：題幹缺中文或 :en[...] 英文對照`);

    const cho = body.match(/^:::choices\{answer="([A-D])"\}\n([\s\S]*?)^:::$/m);
    if (!cho) throw new Error(`${at}：找不到 :::choices 區塊或 answer 不是 A–D`);
    const opts = cho[2].trim().split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
    if (opts.length !== 4) throw new Error(`${at}：選項有 ${opts.length} 個，應為 4 個`);

    const tip = body.match(/^:::tip\{collapsible title="詳解"\}\n([\s\S]*?)^:::$/m);
    if (!tip) throw new Error(`${at}：找不到詳解區塊`);

    // 題幹 blockquote 與 :::choices 之間的東西（程式碼、算式、表格）要跟著題目走
    const between = body.slice(body.indexOf(stem[0]) + stem[0].length, body.indexOf(cho[0])).trim();

    const paras = tip[1].trim().split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const km = paras[paras.length - 1].match(/^\*\*考的觀念\*\*：(.+)$/);
    if (keyInRef && !km) throw new Error(`${at}：詳解最後一行不是「**考的觀念**：…」`);

    return {
      n: i + 1, answer: cho[1],
      stemZh: stem[1].trim(), stemEn: stem[2].trim(), extra: between,
      opts,
      sol: keyInRef && km ? paras.slice(0, -1).join('\n\n') : paras.join('\n\n'),
      key: km ? km[1].trim() : null,
    };
  });
}

/* ── 產生一份題庫 ────────────────────────────────────────────────────── */
const KEYS = ['A', 'B', 'C', 'D'];
const fingerprint = (s) => s.replace(/\s/g, '').slice(0, 24);

function build(name) {
  const cfg = QUIZZES[name];
  const refs = cfg.refs ? JSON.parse(fs.readFileSync(path.join(TPL, cfg.refs), 'utf8')) : null;
  const tally = {};
  let total = 0;

  const sections = cfg.groups.map((g) => {
    const src = fs.readFileSync(path.join(NOTES, g.file), 'utf8');
    const qs = parseNote(src, `${name}/${g.key}`, !!cfg.keyInRef);
    total += qs.length;

    const rendered = qs.map((q) => {
      const id = cfg.idOf(g, q.n);
      tally[q.answer] = (tally[q.answer] || 0) + 1;

      let ref = '';
      if (refs) {
        const r = refs[id];
        if (!r) throw new Error(`${id}：scripts/quiz/${cfg.refs} 缺這一題的小抄欄`);
        if (r.fp && r.fp !== fingerprint(q.stemZh)) {
          throw new Error(`${id}：小抄欄的題幹指紋對不上（筆記可能插入或調動了題目），` +
            `請重新核對 scripts/quiz/${cfg.refs}`);
        }
        ref = `<div class="ref">小抄 <b>${esc(r.sec)}</b><span>${esc(r.side)}</span></div>`;
      } else if (cfg.ref) {
        ref = cfg.ref(q);
      }

      const choices = q.opts.map((o, i) => (
        `<li class="nc-choice" role="radio" aria-checked="false" tabindex="0" data-k="${KEYS[i]}">` +
        `<span class="nc-choice__key">${KEYS[i]}</span>` +
        `<span class="nc-choice__text">${bilingual(o)}</span></li>`
      )).join('');

      return `<article class="q" data-id="${id}" data-${cfg.attr}="${g.key}" data-answer="${q.answer}">` +
        `<div class="qn">${id}<span class="verdict" hidden></span></div>` +
        `<blockquote><p>${inline(q.stemZh)}` +
        `<span class="nc-en" lang="en">${inline(q.stemEn)}</span></p></blockquote>` +
        (q.extra ? blocks(q.extra) : '') +
        `<ul class="nc-choices" role="radiogroup" aria-label="${id} 選項">${choices}</ul>` +
        `<div class="sol" hidden><span class="lbl">正解 ${q.answer}</span>${ref}` +
        `<div class="nc-adm__body">${blocks(q.sol)}</div></div></article>`;
    }).join('\n');

    const head = g.note
      ? `<h2>${esc(g.label)}<a class="src" href="${g.note}">${esc(g.noteLabel)}</a></h2>`
      : `<h2>${esc(g.label)}</h2>`;
    return `<section class="${cfg.attr === 'week' ? 'week' : 'ch'}" data-${cfg.attr}="${g.key}">${head}\n${rendered}\n</section>`;
  }).join('\n');

  const worst = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (worst[1] > total / 2) throw new Error(`${name}：正解字母 ${worst[0]} 佔 ${worst[1]}/${total}，超過一半`);

  const template = fs.readFileSync(path.join(TPL, cfg.template), 'utf8');
  if (!template.includes('<!--QUESTIONS-->')) throw new Error(`${cfg.template} 缺 <!--QUESTIONS--> 標記`);
  return { html: template.replace('<!--QUESTIONS-->', sections), total, tally, out: cfg.out };
}

/* ── 進入點 ──────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const check = args.includes('--check');
const picked = args.filter((a) => !a.startsWith('--'));
const names = picked.length ? picked : Object.keys(QUIZZES);

let failed = false;
for (const name of names) {
  if (!QUIZZES[name]) throw new Error(`沒有這份題庫：${name}（可用：${Object.keys(QUIZZES).join('、')}）`);
  const { html, total, tally, out } = build(name);
  const dest = path.join(ROOT, 'public', 'quiz', out);
  const letters = Object.entries(tally).sort().map(([k, v]) => `${k}=${v}`).join(' ');
  if (check) {
    const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
    if (cur !== html) {
      console.error(`[quiz] public/quiz/${out} 與筆記不同步，請跑 node scripts/build-quiz.mjs ${name}`);
      failed = true;
    } else {
      console.log(`[quiz] ${name}：${total} 題，產物與筆記同步（正解 ${letters}）`);
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
    console.log(`[quiz] ${name}：寫出 public/quiz/${out}，${total} 題（正解 ${letters}）`);
  }
}
if (failed) process.exit(1);
