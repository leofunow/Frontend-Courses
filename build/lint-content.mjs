// Проверка уроков на соответствие STYLE.md: объём, стоп-слова, примеры в разделах, квизы, задания, слайды.
// Запуск: npm run lint:content
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'src', 'lessons');

const STOP = ['давайте разбер', 'важно отметить', 'стоит отметить', 'следует отметить', 'в современном мире', 'как известно',
  'не секрет', 'таким образом', 'в заключение', 'итак,', 'данный', 'данная', 'данное', 'является одним из', 'играет важную роль',
  'огромное количество', 'мощный инструмент', 'погрузимся', 'окунёмся', 'в этом уроке мы', 'безусловно', 'на самом деле'];
// Разделы, где пример не обязателен
const SERVICE = /^(частые (ошибки|заблуждения)|шпаргалка|квиз|задания|как учиться)/i;
const EXAMPLE = /```|^:::(diagram|use|sandbox|cols|shot|terminal)|^\|.*\|$/m;

const problems = [];
const warnings = [];
const err = (f, m) => problems.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

// Убрать всё, что не является текстом: код, схемы, песочницы, квизы, таблицы
const prose = (s) => s
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/^:::(diagram|sandbox|quiz|terminal)[^\n]*\n[\s\S]*?^:::\s*$/gm, ' ')
  .replace(/^:::[^\n]*$/gm, ' ')
  .replace(/^\|.*\|$/gm, ' ')
  .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a)
  .replace(/<[^>]+>/g, ' ');
const words = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;

for (const slug of fs.readdirSync(LESSONS).sort()) {
  const dir = path.join(LESSONS, slug);
  const file = path.join(dir, 'lesson.md');
  if (!fs.existsSync(file)) continue;
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { err(rel, 'нет frontmatter'); continue; }
  let fm = {};
  try { fm = yaml.load(m[1]) || {}; } catch (e) { err(rel, `ошибка YAML в шапке урока: ${e.reason}`); }
  const body = src.slice(m[0].length);

  if (!fm.duration) err(rel, 'нет duration');
  if (!Array.isArray(fm.goals) || fm.goals.length < 3 || fm.goals.length > 4) err(rel, `goals: нужно 3–4 пункта, сейчас ${fm.goals?.length ?? 0}`);
  if (!Array.isArray(fm.summary) || fm.summary.length < 3 || fm.summary.length > 5) err(rel, `summary: нужно 3–5 пунктов, сейчас ${fm.summary?.length ?? 0}`);
  if (!Array.isArray(fm.readMore) || fm.readMore.length < 2 || fm.readMore.length > 5) err(rel, `readMore: нужно 2–5 ссылок, сейчас ${fm.readMore?.length ?? 0}`);

  const text = prose(body);
  const n = words(text);
  if (n > 2500) err(rel, `текст ${n} слов, лимит 2500`);

  // номера уроков — только через {{n:id}}
  for (const f of ['lesson.md', 'slides.md', 'script.md']) {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    for (const m of raw.matchAll(/(урок[а-яё]*|уроки)\s+\d+/gi)) err(path.relative(ROOT, fp), `«${m[0]}»: номер урока пишите через {{n:id}}`);
  }

  const lower = text.toLowerCase();
  for (const s of STOP) {
    const re = new RegExp(`(^|[^\\p{L}])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'giu');
    const hits = lower.match(re);
    if (hits) err(rel, `стоп-слово «${s}» (${hits.length})`);
  }

  // длинные предложения
  for (const sentence of text.split(/\n\s*\n|\n(?=\s*(?:[-*]|\d+\.)\s)|(?<=[.!?])\s+/)) {
    const w = words(sentence);
    if (w > 25) warn(rel, `длинное предложение (${w} слов): «${sentence.trim().slice(0, 80)}…»`);
  }

  // каждый раздел ## — с примером
  const sections = body.split(/^## /m).slice(1);
  for (const sec of sections) {
    const title = sec.split('\n')[0].trim();
    if (SERVICE.test(title)) continue;
    if (!EXAMPLE.test(sec)) err(rel, `раздел «${title}» без примера: нужен код, схема, песочница или таблица`);
    const intro = prose(sec.split('\n').slice(1).join('\n').split(/```|^:::/m)[0]);
    if (words(intro) > 120) warn(rel, `раздел «${title}»: ${words(intro)} слов до первого примера (лимит 120)`);
  }

  const quiz = body.match(/^:::quiz\n([\s\S]*?)^:::\s*$/m);
  let qn = 0;
  try { qn = quiz ? (yaml.load(quiz[1]) || []).length : 0; } catch (e) { err(rel, `ошибка YAML в квизе, строка ${e.mark?.line + 1}: ${e.reason}. Текст с двоеточием возьмите в кавычки`); }
  if (qn < 6 || qn > 10) err(rel, `квиз: нужно 6–10 вопросов, сейчас ${qn}`);
  const tn = (body.match(/^:::task /gm) || []).length;
  if (tn < 3 || tn > 6) err(rel, `задания: нужно 3–6, сейчас ${tn}`);

  const slides = path.join(dir, 'slides.md');
  let sn = 0;
  if (!fs.existsSync(slides)) err(rel, 'нет slides.md');
  else {
    sn = fs.readFileSync(slides, 'utf8').split(/^---\s*$/m).filter((s) => s.trim()).length + 1;
    if (sn < 12 || sn > 36) err(path.relative(ROOT, slides), `слайдов ${sn}, нужно 12–36`);
  }

  // сценарий к слайдам: раздел на каждый слайд, у каждого длительность и что рассказать
  const scriptFile = path.join(dir, 'script.md');
  const srel = path.relative(ROOT, scriptFile);
  if (!fs.existsSync(scriptFile)) err(rel, 'нет script.md — сценария к слайдам');
  else {
    const secs = fs.readFileSync(scriptFile, 'utf8').split(/^## /m).slice(1);
    if (sn && secs.length !== sn) err(srel, `разделов ${secs.length}, слайдов ${sn} (с титульным) — должно совпадать`);
    let total = 0;
    for (const sec of secs) {
      const head = sec.split('\n')[0].trim();
      const min = head.match(/\((\d+)\s*мин\)\s*$/);
      if (!min) err(srel, `«${head}»: нет длительности «(N мин)»`); else total += Number(min[1]);
      if (!/\*\*На слайде:\*\*/.test(sec)) err(srel, `«${head}»: нет «**На слайде:**»`);
      if (!/\*\*(Рассказать|Показать вживую)/.test(sec)) err(srel, `«${head}»: нет «**Рассказать:**» или «**Показать вживую:**»`);
    }
    if (total < 70 || total > 100) warn(srel, `сценарий на ${total} мин, занятие рассчитано на 90`);
    console.log(`${slug}: сценарий — разделов ${secs.length}, ${total} мин`);
  }
  console.log(`${slug}: слов ${n}, разделов ${sections.length}, вопросов в квизе ${qn}, заданий ${tn}`);
}

if (warnings.length) console.log(`\nЗамечания (${warnings.length}):\n- ${warnings.join('\n- ')}`);
if (problems.length) {
  console.log(`\nОшибки (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\nКонтент в порядке');
