const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, 'work');   // cmds/ out/ done/ profile/ 都放在 work/ 底下（已 gitignore）
for (const d of ['cmds', 'out', 'done', 'profile']) fs.mkdirSync(path.join(D, d), { recursive: true });
const log = (...a) => fs.appendFileSync(path.join(D, 'daemon.log'), new Date().toISOString() + ' ' + a.join(' ') + '\n');

(async () => {
  const ctx = await chromium.launchPersistentContext(path.join(D, 'profile'), {
    channel: 'chrome', headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--window-size=1460,1000', '--window-position=40,40'],
  });
  let page = ctx.pages()[0] || await ctx.newPage();
  page.on('dialog', async d => { log('dialog:', d.message()); await d.accept().catch(() => {}); });
  await page.goto('https://www.tinkercad.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => log('goto err', e.message));
  log('ready', page.url());
  fs.writeFileSync(path.join(D, 'READY'), page.url());
  for (;;) {
    const files = fs.readdirSync(path.join(D, 'cmds')).filter(f => f.endsWith('.js')).sort();
    if (files.length === 0) { await new Promise(r => setTimeout(r, 300)); continue; }
    const f = files[0];
    const src = fs.readFileSync(path.join(D, 'cmds', f), 'utf8');
    fs.renameSync(path.join(D, 'cmds', f), path.join(D, 'done', f));
    const name = f.replace(/\.js$/, '');
    let out;
    try {
      page = ctx.pages()[ctx.pages().length - 1];
      const fn = new Function('page', 'ctx', 'require', 'D', 'return (async () => {' + src + '\n})()');
      const result = await Promise.race([
        fn(page, ctx, require, D),
        new Promise((_, rej) => setTimeout(() => rej(new Error('command timeout 120s')), 120000)),
      ]);
      out = { ok: true, result };
    } catch (e) {
      out = { ok: false, error: e.message, stack: (e.stack || '').split('\n').slice(0, 4).join('\n') };
    }
    fs.writeFileSync(path.join(D, 'out', name + '.json'), JSON.stringify(out, null, 2));
    log('done', name, out.ok ? 'ok' : 'ERR ' + out.error);
  }
})().catch(e => { log('fatal', e.message); process.exit(1); });
