<!-- class: statement -->
Редактор — ваше главное рабочее место. Сегодня делаем его удобным

---

## Интерфейс

:::shot img/vscode-ui.webp
1 — панель действий, 2 — боковая панель, 3 — редактор, 4 — строка состояния
:::

---

## Открываем папку, а не файл

:::cols
:::shot img/vscode-welcome.webp
Open Folder
:::
+++
- **File → Open Folder…** (<kbd>⌘</kbd>+<kbd>O</kbd>)
- перетащить папку на VS Code в Dock
- в Терминале: `code .`
:::

---

## Файлы и папки

:::use project-tree

Новый файл — значок с плюсом у названия проекта. `css/style.css` создаст и папку.

---

## Палитра команд

:::shot img/vscode-palette.webp
⇧⌘P — любая команда по названию. ⌘P — любой файл по имени
:::

---

## Горячие клавиши

| Сочетание | Действие |
|---|---|
| ⌘S | Сохранить |
| ⌘/ | Закомментировать |
| ⌥↑ / ⌥↓ | Переместить строку |
| ⇧⌥↓ | Продублировать строку |
| ⌘D | Следующее совпадение |
| ⇧⌥F | Отформатировать |

---

## Несколько курсоров: ⌘D

:::cols
```html
<li class="item">Кофе</li>
<li class="item">Чай</li>
<li class="item">Какао</li>
```
+++
```html
<li class="card">Кофе</li>
<li class="card">Чай</li>
<li class="card">Какао</li>
```
:::

---

## Emmet

:::shot img/vscode-emmet.webp
Набрали ! → Tab → каркас страницы
:::

---

## Сокращения Emmet

| Сокращение | Результат |
|---|---|
| `h1{Привет}` | заголовок с текстом |
| `.card` | `<div class="card">` |
| `ul>li*3` | список из трёх пунктов |
| `ul>li.item$*3` | классы item1, item2, item3 |

`>` — внутри, `*` — повторить, `.` — класс, `{}` — текст

---

## Расширения: Live Server и Biome

:::cols
:::shot img/vscode-extensions.webp
Live Server
:::
+++
:::shot img/vscode-biome.webp
Biome от biomejs
:::
:::

---

## Настройки текстом

```json
{
  "editor.formatOnSave": true,
  "files.autoSave": "onFocusChange",
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.linkedEditing": true
}
```

⇧⌘P → `Preferences: Open User Settings (JSON)`

---

## Встроенный терминал

:::terminal title="zsh — hello"
mary@MacBook-Air hello % ls
css        index.html   about.html
:::

<kbd>⌃</kbd>+<kbd>`</kbd> или View → Terminal — сразу в папке проекта

---

## Папка для домашки

1. Распаковать шаблон в `~/dev/homework`
2. `code .` → установить рекомендованные расширения
3. Один раз в терминале:

```bash
npm install
```

---

## Линтер Biome

:::use biome-flow

Волнистая линия → навести мышь → объяснение. Все ошибки: ⇧⌘M

---

## Как читать сообщение линтера

:::terminal title="zsh — homework"
mary@MacBook-Air homework % npx biome check index.html
index.html:9:7 lint/a11y/useAltText
! × Provide a text alternative through the alt, aria-label, or aria-labelledby attribute.
:::

Файл → строка → колонка → правило → что не так

---

## Live Server

:::use live-server

**Go Live** в строке состояния → `http://127.0.0.1:5500`

---

## Частые ошибки

- Открыт файл, а не папка
- Файл не сохранён — точка ● на вкладке
- Biome молчит: нет расширения, не сделан `npm install` или открыта не та папка

---

## Воркшоп: мини-проект в VS Code

Страница с нуля — только клавиатурой и Emmet

1. Открыть папку проекта
2. Файлы в проводнике
3. Каркас и разметка через Emmet
4. Мультикурсор и перемещение строк
5. Ошибки Biome и быстрое исправление
6. Live Server и встроенный терминал

---

## Домашнее задание

1. Настроить VS Code и папку homework
2. Emmet вместо печати
3. Тренажёр горячих клавиш — проверки прямо на странице
4. Ошибки глазами Biome
5. Со звёздочкой: своё сочетание клавиш
