// Проверка домашних заданий с браузерными тестами (homework/*/task-*/index.html и tests.js):
// на заготовке ученика тесты должны падать, на эталоне из mentor/ — проходить.
// Запуск: npm run check:homework (папки homework/ и mentor/ лежат рядом с course/).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE = path.resolve(import.meta.dirname, '..', '..');
const HW = path.join(BASE, 'homework');
const MENTOR = path.join(BASE, 'mentor');
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', '/usr/bin/google-chrome']
  .filter(Boolean).find((p) => fs.existsSync(p));
if (!executablePath) { console.error('Не найден Chrome или Edge (CHROME_PATH)'); process.exit(2); }

const tasks = fs.readdirSync(HW).filter((d) => !d.startsWith('_') && fs.statSync(path.join(HW, d)).isDirectory())
  .flatMap((lesson) => fs.readdirSync(path.join(HW, lesson)).filter((t) => fs.existsSync(path.join(HW, lesson, t, 'tests.js'))).map((t) => path.join(lesson, t)));

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--allow-file-access-from-files'] });
// В tests.js можно указать ширины экрана: «// widths: 375, 800, 1280» — задание проверяется на каждой.
// Итог: passed и total суммируются по всем ширинам.
async function run(dir) {
  const tests = fs.readFileSync(path.join(dir, 'tests.js'), 'utf8');
  const widths = (tests.match(/^\/\/\s*widths:\s*([\d,\s]+)$/m)?.[1] || '800').split(',').map(Number);
  const sum = { passed: 0, tasks: 0, total: 0, errors: 0 };
  for (const width of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href, { waitUntil: 'load' });
    const r = await page.evaluate(() => ({ passed: +document.body.dataset.passed, tasks: +document.body.dataset.passedTasks, total: +document.body.dataset.total, errors: +document.body.dataset.loadErrors }));
    for (const k of Object.keys(sum)) sum[k] += r[k];
    await page.close();
  }
  return sum;
}

let bad = 0;
for (const task of tasks) {
  const starter = await run(path.join(HW, task));
  const solutionDir = path.join(MENTOR, task);
  let solved = null;
  if (fs.existsSync(solutionDir)) {
    // копия задания во временной папке, поверх — файлы эталона из mentor/ (solution.js, index.html, style.css…)
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-'));
    fs.cpSync(path.join(HW, '_runner'), path.join(tmp, '_runner'), { recursive: true });
    const dir = path.join(tmp, 'lesson', 'task');
    fs.cpSync(path.join(HW, task), dir, { recursive: true });
    fs.cpSync(solutionDir, dir, { recursive: true });
    solved = await run(dir);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const starterOk = starter.total > 0 && starter.passed < starter.total;
  const solvedOk = solved && !solved.errors && solved.total > 0 && solved.passed === solved.total;
  if (!starterOk || !solvedOk) bad++;
  console.log(`${starterOk && solvedOk ? '✓' : '✗'} ${task}: заготовка ${starter.passed}/${starter.total}${starterOk ? '' : ' (тесты должны падать)'}, эталон ${solved ? `${solved.passed}/${solved.total}` : 'нет папки mentor/' + task}`);
  // проверка, которая проходит на пустой заготовке, часто проверяет «ничего»: например, подписи у нуля полей
  // ограничения test.keep не считаются: они и должны быть верны на заготовке
  if (starter.tasks > 0) console.log(`  ⚠ заготовка уже проходит ${starter.tasks} проверок — убедитесь, что они не пустые, или отметьте их как test.keep`);
}
await browser.close();
if (bad) process.exit(1);
console.log(`\nЗадания в порядке: ${tasks.length}`);
