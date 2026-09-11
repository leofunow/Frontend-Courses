// Автотесты интерактива сайта в настоящем Chrome: npm run test:ui
// Проверяет то, что нельзя проверить сборкой:
//   ответы на задания сохраняются между перезагрузками (текст, таблицы, картинки);
//   отчёт собирается в корректный ZIP с нужными файлами, кнопка скачивает архив;
//   комментарии к слайдам сохраняются, промпт с правками содержит строки исходников;
//   Esc в слайдах и синхронизация слайдов со сценарием.
// Каждый тест — в чистом профиле браузера, чтобы не зависеть от прошлых запусков.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = (p) => { const [file, hash] = p.split('#'); return pathToFileURL(path.join(DOCS, file)).href + (hash ? '#' + hash : ''); };
const LESSON = 'lessons/01-intro.html';
const SCRIPT = 'scripts/01-intro.html';
const SLIDES = 'slides/01-intro.html';

let failed = 0, passed = 0;
async function test(name, fn) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-profile-'));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args: ['--allow-file-access-from-files'] });
  try {
    await fn(browser, profile);
    passed++; console.log(`✓ ${name}`);
  } catch (e) {
    failed++; console.log(`✗ ${name}\n    ${e.message.split('\n').join('\n    ')}`);
  } finally {
    await browser.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, p, width = 1280) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url(p), { waitUntil: 'load' });
  page.errors = errors;
  return page;
}
async function downloadsTo(page, dir) {
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });
}
async function waitFile(dir, ext, ms = 8000) {
  for (let t = 0; t < ms; t += 200) {
    const f = fs.readdirSync(dir).find((x) => x.endsWith(ext));
    if (f) { await sleep(300); return path.join(dir, f); }
    await sleep(200);
  }
  throw new Error(`не скачался файл *${ext}`);
}
// маленькая PNG-картинка для поля «скриншот»
function makePng(file) {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(file, png);
  return file;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-test-'));

await test('Ответы: текст, таблица и картинка сохраняются после перезагрузки', async (browser) => {
  let page = await open(browser, LESSON);
  await page.waitForSelector('.answer[data-type=table] input');
  await page.type('#ans-1-2', 'Потому что я поменял только свою копию страницы');
  await page.type('.answer[data-answer="2-1"] input[data-r="0"][data-c="2"]', 'hh.ru');
  const input = await page.$('#ans-1-1');
  await input.uploadFile(makePng(path.join(tmp, 'shot.png')));
  await page.waitForSelector('.answer[data-answer="1-1"] .answer-thumb img');
  await sleep(700); // сохранение с задержкой 400 мс
  expect(page.errors.length === 0, 'ошибки на странице: ' + page.errors.join('; '));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#ans-1-2').value !== '');
  const state = await page.evaluate(() => ({
    text: document.querySelector('#ans-1-2').value,
    cell: document.querySelector('.answer[data-answer="2-1"] input[data-r="0"][data-c="2"]').value,
    rowLabel: document.querySelector('.answer[data-answer="2-1"] tbody th').textContent,
    thumbs: document.querySelectorAll('.answer[data-answer="1-1"] .answer-thumb').length,
  }));
  expect(state.text === 'Потому что я поменял только свою копию страницы', 'текст не сохранился: ' + state.text);
  expect(state.cell === 'hh.ru', 'ячейка таблицы не сохранилась: ' + state.cell);
  expect(state.rowLabel === 'Поиск на hh.ru', 'подпись строки таблицы: ' + state.rowLabel);
  expect(state.thumbs === 1, 'картинка не сохранилась, миниатюр: ' + state.thumbs);
  // просмотр картинки и удаление
  await page.click('.answer[data-answer="1-1"] .answer-open');
  expect(await page.evaluate(() => document.querySelector('.answer-viewer').open), 'просмотр картинки не открылся');
  await page.keyboard.press('Escape');
  await page.click('.answer[data-answer="1-1"] .answer-del');
  await sleep(300);
  await page.reload({ waitUntil: 'load' });
  await sleep(500);
  expect(await page.evaluate(() => document.querySelectorAll('.answer[data-answer="1-1"] .answer-thumb').length) === 0, 'удалённая картинка вернулась');
});

await test('Ответы: свободная таблица — добавить, удалить строку, Enter', async (browser) => {
  const page = await open(browser, LESSON);
  await page.waitForSelector('.answer[data-answer="4-1"] tbody tr');
  const before = await page.$$eval('.answer[data-answer="4-1"] tbody tr', (r) => r.length);
  await page.click('.answer[data-answer="4-1"] .answer-add-row');
  await page.keyboard.type('Figma');
  await sleep(600);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.answer[data-answer="4-1"] tbody tr');
  const after = await page.$$eval('.answer[data-answer="4-1"] tbody tr', (r) => r.length);
  const last = await page.$eval('.answer[data-answer="4-1"] tbody tr:last-child input', (i) => i.value);
  expect(after === before + 1 && last === 'Figma', `строк было ${before}, стало ${after}, в последней «${last}»`);
  // удаление строки: пропадает именно она, остальное сдвигается и сохраняется
  await page.type('.answer[data-answer="4-1"] input[data-r="0"][data-c="0"]', 'HTML');
  await page.type('.answer[data-answer="4-1"] input[data-r="1"][data-c="0"]', 'CSS');
  await page.click('.answer[data-answer="4-1"] .answer-del-row[data-r="0"]');
  await sleep(600);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.answer[data-answer="4-1"] tbody tr');
  const rows = await page.$$eval('.answer[data-answer="4-1"] tbody tr', (r) => r.map((tr) => tr.querySelector('input').value));
  expect(rows.length === after - 1 && rows[0] === 'CSS' && rows.at(-1) === 'Figma', 'после удаления: ' + JSON.stringify(rows));
  // Enter в последней строке добавляет новую
  await page.focus('.answer[data-answer="4-1"] tbody tr:last-child input');
  await page.keyboard.press('Enter');
  const n = await page.$$eval('.answer[data-answer="4-1"] tbody tr', (r) => r.length);
  const focused = await page.evaluate(() => document.activeElement.dataset.r);
  expect(n === rows.length + 1 && Number(focused) === n - 1, `Enter: строк ${n}, фокус на ${focused}`);
  // в таблице с подписями строк из условия удалять нельзя
  expect(await page.$$eval('.answer[data-answer="3-1"] .answer-del-row', (b) => b.length) === 0, 'у фиксированной таблицы есть кнопки удаления');
});

await test('Отчёт: ZIP открывается, внутри README, задания и картинки', async (browser) => {
  const page = await open(browser, LESSON);
  await page.waitForSelector('.answer[data-type=table] input');
  await page.type('#report-name', 'Мария');
  await page.type('#ans-1-2', 'Это была моя копия');
  await page.type('.answer[data-answer="3-1"] input[data-r="1"][data-c="1"]', '42');
  await (await page.$('#ans-3-2')).uploadFile(makePng(path.join(tmp, 'json.png')));
  await page.waitForSelector('.answer[data-answer="3-2"] .answer-thumb');
  await page.click('#task-1 .task-list-item-checkbox');
  await page.click('.quiz .q .opt');
  await sleep(700);
  const dir = fs.mkdtempSync(path.join(tmp, 'dl-'));
  await downloadsTo(page, dir);
  await page.click('.report-make');
  const zip = await waitFile(dir, '.zip');
  expect(path.basename(zip) === 'lesson-01-report.zip', 'имя архива: ' + path.basename(zip));
  execFileSync('unzip', ['-tq', zip]); // проверка целостности: CRC и структура
  const list = execFileSync('unzip', ['-Z1', zip]).toString().trim().split('\n');
  for (const f of ['lesson-01-report/README.md', 'lesson-01-report/task-1.md', 'lesson-01-report/task-6.md']) expect(list.includes(f), `в архиве нет ${f}: ${list.join(', ')}`);
  expect(list.some((f) => /^lesson-01-report\/img\/task-3-2-1\.(webp|png)$/.test(f)), 'нет картинки задания 3: ' + list.join(', '));
  const read = (f) => execFileSync('unzip', ['-p', zip, f]).toString();
  const readme = read('lesson-01-report/README.md');
  expect(readme.includes('Ученик: Мария') && readme.includes('Квиз:') && readme.includes('| 1 | [Изменить чужой сайт](task-1.md)'), 'README:\n' + readme);
  const t1 = read('lesson-01-report/task-1.md');
  expect(t1.includes('Это была моя копия') && t1.includes('- [x] Скриншот прикреплён') && t1.includes('## Условие') && t1.includes('Откройте любой новостной сайт'), 'task-1.md:\n' + t1);
  const t3 = read('lesson-01-report/task-3.md');
  expect(t3.includes('| ru.wikipedia.org | 42 |') && /!\[.*\]\(img\/task-3-2-1\.(webp|png)\)/.test(t3), 'task-3.md:\n' + t3);
  const summary = await page.$eval('.report-summary', (e) => e.textContent);
  expect(summary.startsWith('Готово'), 'сообщение после отчёта: ' + summary);
});

await test('Проект: поля ответов сохраняются, отчёт — project-p1-report.zip', async (browser) => {
  const page = await open(browser, 'projects/p1.html');
  await page.waitForSelector('#ans-1-1');
  await page.type('#ans-1-1', 'Кофейня «Зерно»');
  await sleep(700);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#ans-1-1').value !== '');
  const dir = fs.mkdtempSync(path.join(tmp, 'dl-'));
  await downloadsTo(page, dir);
  await page.click('.report-make');
  const zip = await waitFile(dir, '.zip');
  expect(path.basename(zip) === 'project-p1-report.zip', 'имя архива: ' + path.basename(zip));
  const readme = execFileSync('unzip', ['-p', zip, 'project-p1-report/README.md']).toString();
  const t1 = execFileSync('unzip', ['-p', zip, 'project-p1-report/task-1.md']).toString();
  expect(readme.includes('# Отчёт: проект «Адаптивный лендинг»'), 'README:\n' + readme);
  expect(t1.includes('Кофейня «Зерно»') && t1.includes('Проект «Адаптивный лендинг»'), 'task-1.md:\n' + t1);
});

await test('Отчёт: очистка ответов в два нажатия', async (browser) => {
  const page = await open(browser, LESSON);
  await page.waitForSelector('#ans-1-2');
  await page.type('#ans-1-2', 'удалить меня');
  await sleep(600);
  await page.click('.report-clear');
  expect((await page.$eval('.report-clear', (b) => b.textContent)).includes('Точно'), 'нет подтверждения');
  await Promise.all([page.waitForNavigation(), page.click('.report-clear')]);
  await sleep(400);
  expect(await page.$eval('#ans-1-2', (t) => t.value) === '', 'ответ не удалился');
});

await test('ZIP: CRC32 совпадает с эталонным значением', async (browser) => {
  const page = await open(browser, LESSON);
  const crc = await page.evaluate(() => window.CourseWorkbook.crc32(new TextEncoder().encode('123456789')));
  expect(crc === 0xCBF43926, 'crc32("123456789") = ' + crc.toString(16));
});

await test('Сценарий: комментарии сохраняются, промпт указывает на исходники', async (browser) => {
  const page = await open(browser, SCRIPT);
  const card = '.script-card[data-slide="4"]'; // «Три части любого веб-приложения»
  // поле комментария скрыто, пока его не открыли: проверяем то, что видно, а не только атрибут
  expect(await page.$eval(`${card} .review-text`, (t) => getComputedStyle(t).display) === 'none', 'поле комментария видно до нажатия кнопки');
  await page.click(`${card} .review-toggle`);
  expect(await page.$eval(`${card} .review-text`, (t) => getComputedStyle(t).display) !== 'none', 'поле комментария не открылось');
  await page.type(`${card} .review-text`, 'Добавить пример с банком');
  await page.type('#review-general', 'Темп хороший');
  await sleep(500);
  await page.reload({ waitUntil: 'load' });
  const saved = await page.evaluate((c) => ({ text: document.querySelector(`${c} .review-text`).value, hidden: document.querySelector(`${c} .review-text`).hidden, general: document.querySelector('#review-general').value, mark: document.querySelector(c).classList.contains('has-review') }), card);
  expect(saved.text === 'Добавить пример с банком' && !saved.hidden && saved.general === 'Темп хороший' && saved.mark, 'не сохранилось: ' + JSON.stringify(saved));
  const prompt = await page.evaluate(() => window.CourseReviewPrompt());
  const slidesMd = fs.readFileSync(path.join(ROOT, 'src/lessons/01-intro/slides.md'), 'utf8').split('\n');
  const m = prompt.match(/## Слайд 5\. Три части любого веб-приложения[\s\S]*?`course\/src\/lessons\/01-intro\/slides\.md`, строка (\d+)/);
  expect(m, 'в промпте нет слайда 5 со строкой:\n' + prompt);
  expect(slidesMd[Number(m[1]) - 1].includes('Три части любого веб-приложения'), `строка ${m[1]} в slides.md: «${slidesMd[Number(m[1]) - 1]}»`);
  expect(prompt.includes('«Веб-приложение из трёх частей»'), 'нет связанного раздела текста урока:\n' + prompt);
  expect(prompt.includes('## Общий комментарий к занятию\n\nТемп хороший'), 'нет общего комментария');
  expect(prompt.includes('> Добавить пример с банком'), 'нет текста комментария');
  const dir = fs.mkdtempSync(path.join(tmp, 'dl-'));
  await downloadsTo(page, dir);
  await page.click('.review-download');
  const file = await waitFile(dir, '.md');
  expect(path.basename(file) === 'правки-урок-01.md' && fs.readFileSync(file, 'utf8') === prompt, 'скачанный промпт не совпадает');
  // стрелки в поле комментария не листают сценарий
  // фокус сам прокручивает страницу к полю, поэтому текущий слайд запоминаем после фокуса
  await page.focus(`${card} .review-text`);
  await sleep(1200);
  const before = await page.$eval('.script-card.is-current', (c) => c.dataset.slide);
  await page.keyboard.press('ArrowDown');
  await sleep(300);
  expect(await page.$eval('.script-card.is-current', (c) => c.dataset.slide) === before, 'стрелка в поле комментария переключила слайд');
});

await test('Слайды: Esc закрывает обзор, второй Esc ведёт к тексту урока', async (browser) => {
  const page = await open(browser, SLIDES + '#/3');
  await sleep(400);
  await page.keyboard.press('KeyO'); await sleep(300);
  expect(await page.evaluate(() => Reveal.isOverview()), 'O не открыл обзор');
  await page.keyboard.press('Escape'); await sleep(300);
  expect(!(await page.evaluate(() => Reveal.isOverview())) && page.url().includes('slides/'), 'Esc не закрыл обзор');
  await Promise.all([page.waitForNavigation({ timeout: 5000 }), page.keyboard.press('Escape')]);
  expect(page.url().endsWith(LESSON), 'Esc не открыл текст урока: ' + page.url());
});

await test('Картинки: на слайдах увеличиваются по щелчку, Esc закрывает, а не уводит со слайда', async (browser) => {
  const page = await open(browser, SLIDES + '#/3');
  await sleep(500);
  await page.evaluate(() => Reveal.slide(3)); await sleep(400); // «Веб-приложение устроено как ресторан» — фото
  const img = await page.$('.present .shot img');
  expect(img, 'на слайде нет картинки');
  expect(await img.evaluate((i) => !i.closest('a')), 'картинка на слайде — ссылка');
  await img.click(); await sleep(300);
  expect(await page.$('.slide-zoom img'), 'картинка не увеличилась');
  await page.keyboard.press('Escape'); await sleep(300);
  expect(!(await page.$('.slide-zoom')) && page.url().includes('slides/'), 'Esc не закрыл картинку или увёл со слайда');
  const before = (await browser.pages()).length;
  // на странице урока — окно поверх страницы, а не новая вкладка
  const lesson = await open(browser, LESSON);
  await lesson.click('figure.shot > a');
  await sleep(400);
  expect(await lesson.$eval('.img-zoom', (d) => d.open), 'на странице урока картинка не открылась поверх');
  expect((await browser.pages()).length === before + 1, 'открылась новая вкладка');
  await lesson.keyboard.press('Escape'); await sleep(200);
  expect(!(await lesson.$eval('.img-zoom', (d) => d.open)), 'Esc не закрыл картинку на странице урока');
});

await test('Слайды: сценарий в соседней вкладке листается вместе со слайдами', async (browser) => {
  const script = await open(browser, SCRIPT);
  const slides = await open(browser, SLIDES);
  await sleep(500);
  for (let i = 0; i < 3; i++) { await slides.keyboard.press('ArrowRight'); await sleep(300); }
  await sleep(600);
  const cur = await script.$eval('.script-card.is-current', (c) => c.dataset.slide);
  expect(cur === '3', 'сценарий на слайде ' + cur + ', ожидали 3');
});

await test('Слайды: у разделителей частей свои номера', async (browser) => {
  const page = await open(browser, SLIDES);
  const parts = await page.$$eval('section.part .part-n', (p) => p.map((x) => x.textContent));
  expect(parts.join(',') === 'Часть 1,Часть 2,Часть 3,Часть 4', 'номера частей: ' + parts.join(','));
});

await test('npm start: десять открытых вкладок не блокируют переходы', async (browser) => {
  // раньше каждая страница держала открытое соединение для автообновления, и после шестой вкладки переходы зависали
  const port = 3900 + Math.floor(Math.random() * 90);
  const server = spawn(process.execPath, [path.join(ROOT, 'build/serve.mjs')], { env: { ...process.env, PORT: String(port), NO_OPEN: '1' }, stdio: 'ignore' });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let t = 0; t < 40; t++) { try { await fetch(base + '/__version'); break; } catch { await sleep(250); } }
    for (let i = 0; i < 10; i++) { const p = await browser.newPage(); await p.goto(base + (i % 2 ? '/' + SCRIPT : '/' + SLIDES), { waitUntil: 'domcontentloaded' }); }
    const page = await browser.newPage();
    const started = Date.now();
    await page.goto(base + '/' + LESSON, { waitUntil: 'load', timeout: 5000 });
    expect(Date.now() - started < 3000, `страница грузилась ${Date.now() - started} мс`);
  } finally { server.kill(); }
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${failed ? 'Есть ошибки' : 'Все тесты пройдены'}: ${passed} из ${passed + failed}`);
if (failed) process.exit(1);
