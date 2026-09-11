// Скриншоты сайтов для уроков с пометками «куда нажать».
// Описание — в src/lessons/NN-id/screenshots.yml, результат — PNG в src/lessons/NN-id/img/.
// Сайты открываются как в Chrome на macOS (platform: windows в описании — как на Windows),
// поэтому показывают нужные версии программ и сочетания клавиш.
//
// Запуск: npm run screenshots                — все скриншоты
//         npm run screenshots -- node          — только файлы, в имени которых есть «node»
//
// Формат screenshots.yml:
// - file: node-download.png
//   url: https://nodejs.org/en/download   # или путь к локальной странице относительно папки урока
//   viewport: [1280, 800]          # необязательно
//   platform: mac                  # mac (по умолчанию) или windows
//   mobile: true                   # эмуляция телефона
//   steps:                          # необязательно: действия перед снимком
//     - click: {text: "Open Folder"}
//     - press: Meta+Shift+P       # сочетание клавиш, Meta — это ⌘
//     - type: "format"
//     - wait: 800
//     - scroll: {text: "Windows Installer"}
//   hide: [".cookie-banner"]        # спрятать элементы
//   marks:                          # рамки с номерами
//     - {text: "Windows Installer (.msi)", label: 1}
//     - {selector: "#download", label: 2, side: right}   # side: left|right|top|bottom|inset — где номер (inset — внутри рамки, для больших областей)
//     - {text: "Windows 10, 11", closest: a, label: 3}    # обвести всю ссылку-кнопку
//   out: ../../../../homework/…/reference.png   # необязательно: сохранить не в img/ урока
//   clip: {selector: "main", pad: 16}   # pad: число или [x, y]; или {x, y, width, height}; по умолчанию — окно целиком
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'src', 'lessons');
const filter = process.argv[2];
const PLATFORMS = {
  mac: { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', platform: 'macOS', nav: 'MacIntel' },
  windows: { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', platform: 'Windows', nav: 'Win32' },
};
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/usr/bin/google-chrome']
  .filter(Boolean).find((p) => fs.existsSync(p));
if (!executablePath) { console.error('Не найден Chrome или Edge (CHROME_PATH)'); process.exit(2); }

const jobs = [];
for (const dir of fs.readdirSync(LESSONS).sort()) {
  const f = path.join(LESSONS, dir, 'screenshots.yml');
  if (!fs.existsSync(f)) continue;
  for (const shot of yaml.load(fs.readFileSync(f, 'utf8')) || []) {
    // url без http — путь к локальной странице относительно папки урока (примеры, эталоны заданий)
    const url = /^https?:/.test(shot.url) ? shot.url : pathToFileURL(path.resolve(LESSONS, dir, shot.url)).href;
    // out — куда сохранить, относительно папки урока (например, эталон прямо в папку задания); по умолчанию img/<file>
    const out = shot.out ? path.resolve(LESSONS, dir, shot.out) : path.join(LESSONS, dir, 'img', shot.file);
    if (!filter || shot.file.includes(filter)) jobs.push({ ...shot, url, out });
  }
}

// Выполняется в странице: найти самый глубокий видимый элемент, текст которого содержит строку
function findEl(target) {
  let best = null;
  if (target.selector) best = document.querySelector(target.selector);
  else {
    const want = target.text.toLowerCase();
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length) continue;
      const t = (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase();
      if (!t.includes(want)) continue;
      if (target.exact && t !== want) continue;
      if (!best || best.contains(el)) best = el;
    }
  }
  // closest: "a" — обвести не сам текст, а ближайший родитель (например, всю кнопку)
  return best && target.closest ? best.closest(target.closest) || best : best;
}

async function rectOf(page, target) {
  return page.evaluate((t, finder) => {
    const el = new Function(`return (${finder})`)()(t);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  }, target, findEl.toString());
}

const browser = await puppeteer.launch({ executablePath, headless: true });
let failed = 0;
for (const job of jobs) {
  // у каждого снимка чистый профиль: сайты (например, vscode.dev) не вспоминают прошлые действия
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    const pf = PLATFORMS[job.platform || 'mac'];
    await page.setUserAgent(pf.ua, { brands: [{ brand: 'Chromium', version: '140' }], platform: pf.platform, platformVersion: '14.0.0', architecture: 'arm', model: '', mobile: false });
    await page.evaluateOnNewDocument((nav) => Object.defineProperty(navigator, 'platform', { get: () => nav }), pf.nav);
    const [w, h] = job.viewport || [1280, 800];
    // mobile: true — как настоящий телефон: страница без meta viewport отрисуется «уменьшенной» шириной 980px
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: !!job.mobile, hasTouch: !!job.mobile });
    await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1200));
    for (const step of job.steps || []) {
      if (step.wait) await new Promise((r) => setTimeout(r, step.wait));
      if (step.press) {
        // сочетание через «+»: Meta+Shift+P (Meta — это ⌘)
        const keys = step.press.split('+');
        for (const k of keys) await page.keyboard.down(k);
        for (const k of [...keys].reverse()) await page.keyboard.up(k);
      }
      if (step.type) await page.keyboard.type(step.type, { delay: 30 });
      if (step.click || step.scroll) {
        const r = await rectOf(page, step.click || step.scroll);
        if (!r) throw new Error(`не найден элемент для шага ${JSON.stringify(step)}`);
        if (step.scroll) await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 120)), r.y);
        else await page.mouse.click(r.x + r.w / 2 - (await page.evaluate(() => scrollX)), r.y + r.h / 2 - (await page.evaluate(() => scrollY)));
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    if (job.hide?.length) await page.addStyleTag({ content: `${job.hide.join(',')} { visibility: hidden !important; }` });
    // рамки с номерами поверх страницы
    for (const m of job.marks || []) {
      const r = await rectOf(page, m);
      if (!r) throw new Error(`не найден элемент для пометки ${JSON.stringify(m)}`);
      await page.evaluate((r, label, side) => {
        const pad = 5;
        const box = document.createElement('div');
        box.style.cssText = `position:absolute;z-index:2147483647;left:${r.x - pad}px;top:${r.y - pad}px;width:${r.w + pad * 2}px;height:${r.h + pad * 2}px;border:3px solid #cf222e;border-radius:8px;box-shadow:0 0 0 3px rgba(255,255,255,.85);pointer-events:none;box-sizing:border-box`;
        if (label != null) {
          const b = document.createElement('div');
          b.textContent = label;
          // номер — снаружи рамки, чтобы не закрывать то, куда нажимать
          const pos = { left: 'right:calc(100% + 8px);top:50%;transform:translateY(-50%)', right: 'left:calc(100% + 8px);top:50%;transform:translateY(-50%)',
            top: 'bottom:calc(100% + 8px);left:50%;transform:translateX(-50%)', bottom: 'top:calc(100% + 8px);left:50%;transform:translateX(-50%)',
            inset: 'left:8px;top:8px' }[side || 'left'];
          b.style.cssText = `position:absolute;${pos};min-width:28px;height:28px;padding:0 6px;border-radius:14px;background:#cf222e;color:#fff;font:700 15px/28px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 3px #fff`;
          box.appendChild(b);
        }
        document.body.appendChild(box);
      }, r, m.label, m.side);
    }
    let clip;
    if (job.clip?.selector || job.clip?.text) {
      const r = await rectOf(page, job.clip);
      // pad: число или [по горизонтали, по вертикали]
      const [px, py] = Array.isArray(job.clip.pad) ? job.clip.pad : [job.clip.pad ?? 16, job.clip.pad ?? 16];
      const x = Math.max(0, r.x - px), y = Math.max(0, r.y - py);
      clip = { x, y, width: Math.min(r.w + px * 2, (job.viewport?.[0] || 1280) - x), height: r.h + py * 2 };
    } else if (job.clip) clip = job.clip;
    fs.mkdirSync(path.dirname(job.out), { recursive: true });
    const type = job.out.endsWith('.webp') ? 'webp' : job.out.endsWith('.jpg') ? 'jpeg' : 'png';
    await page.screenshot({ path: job.out, type, ...(type === 'png' ? {} : { quality: 85 }), ...(clip ? { clip } : {}) });
    console.log(`✓ ${path.relative(ROOT, job.out)}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${job.file}: ${e.message}`);
  }
  await context.close();
}
await browser.close();
if (failed) process.exit(1);
