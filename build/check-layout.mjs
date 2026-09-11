// Проверка вёрстки: открывает каждую страницу docs/ в Chrome (или Edge) на нескольких ширинах
// и падает, если что-то вылезает за свой блок, страница скроллится вбок или в консоли есть ошибки.
// Запуск: npm run check:layout. Путь к браузеру можно задать переменной CHROME_PATH.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const DOCS = path.resolve(import.meta.dirname, '..', 'docs');
const WIDTHS = [1440, 1024, 768, 375];

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Не найден Chrome или Edge. Укажите путь: $env:CHROME_PATH="C:\\путь\\к\\chrome.exe"');
  process.exit(2);
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
const pages = walk(DOCS);

// Выполняется внутри страницы: ищет элементы, содержимое которых шире самого элемента
function findOverflow() {
  const name = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      parts.unshift(e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''));
    }
    return parts.join(' > ');
  };
  const bad = [];
  if (document.documentElement.scrollWidth > window.innerWidth + 1) {
    bad.push(`страница скроллится по горизонтали: ${document.documentElement.scrollWidth}px при ширине окна ${window.innerWidth}px`);
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg, .sidebar:not(.open), .search-overlay[hidden], [hidden]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'none' || cs.display === 'contents') continue;
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue; // прокрутка задумана: код, таблицы
    if (el.tagName === 'TEXTAREA' || el.tagName === 'IFRAME') continue;
    const extra = el.scrollWidth - el.clientWidth;
    if (extra > 1 && el.clientWidth > 0) {
      const text = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      bad.push(`${name(el)} — вылезает на ${extra}px${text ? `: «${text}»` : ''}`);
    }
  }
  // Контраст текста с фоном (WCAG). Порог 3:1 ловит грубые ошибки вроде серого текста на зелёной кнопке.
  const parse = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0, 0]; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] == null ? 1 : +m[3] }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0.5) return c; }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const faded = (el) => { for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 1) return true; return false; };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg, iframe, textarea, pre, .shiki, [hidden], .sidebar:not(.open), .search-overlay[hidden]')) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText || !el.getClientRects().length || faded(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    const fg = parse(cs.color), bg = bgOf(el);
    const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (l1 + 0.05) / (l2 + 0.05);
    const key = `${cs.color}|${bg.r},${bg.g},${bg.b}`;
    if (ratio < 3 && !seen.has(key)) {
      seen.add(key);
      bad.push(`${name(el)} — низкий контраст ${ratio.toFixed(2)}:1 (${cs.color} на rgb(${bg.r}, ${bg.g}, ${bg.b})): «${el.textContent.trim().slice(0, 40)}»`);
    }
  }
  return bad;
}

function findSlideOverflow() {
  const bad = [];
  const slides = Reveal.getSlides();
  slides.forEach((s, i) => {
    Reveal.slide(i, 0, 99); // все фрагменты видимы
    const body = s.querySelector('.slide-body') || s;
    if (body.scrollHeight > s.clientHeight + 1) bad.push(`слайд ${i + 1}: не помещается по высоте (${body.scrollHeight}px из ${s.clientHeight}px)`);
    if (s.scrollWidth > s.clientWidth + 1) bad.push(`слайд ${i + 1}: не помещается по ширине`);
  });
  return bad;
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--allow-file-access-from-files'] });
let failures = 0;
for (const file of pages) {
  const rel = path.relative(DOCS, file);
  const url = pathToFileURL(file).href;
  const isSlides = rel.startsWith('slides');
  const widths = isSlides ? [1280] : WIDTHS;
  for (const width of widths) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`JS-ошибка: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    // ERR_ABORTED — загрузку прервали (например, закрыли страницу во время загрузки iframe), это не ошибка вёрстки
    page.on('requestfailed', (r) => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`не загрузился файл: ${r.url()}`); });
    await page.setViewport({ width, height: isSlides ? 720 : 900 });
    await page.goto(url, { waitUntil: 'load' });
    // картинки с loading="lazy" ниже первого экрана сами не загрузятся — догружаем, чтобы проверить их размеры
    await page.evaluate(() => Promise.all([...document.images].map((img) => {
      img.loading = 'eager';
      return img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; });
    })));
    await new Promise((r) => setTimeout(r, 150));
    const bad = [...errors, ...(await page.evaluate(isSlides ? findSlideOverflow : findOverflow))];
    if (bad.length) {
      failures += bad.length;
      console.log(`\n✗ ${rel} @ ${width}px`);
      for (const b of [...new Set(bad)].slice(0, 15)) console.log(`  - ${b}`);
    }
    await page.close();
  }
}
await browser.close();

if (failures) {
  console.log(`\nНайдено проблем: ${failures}`);
  process.exit(1);
}
console.log(`Вёрстка в порядке: ${pages.length} страниц, ширины ${WIDTHS.join(', ')}px`);
