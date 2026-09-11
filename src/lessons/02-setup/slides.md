<!-- class: statement -->
Сегодня собираем рабочее место: к концу занятия всё установлено и проверено

---

## Пять программ фронтенд-разработчика

:::use tools

Терминал уже есть на Mac. Остальное ставим сегодня.

---

## Клавиши Mac

| Значок | Клавиша | Пример |
|---|---|---|
| ⌘ | Command | ⌘C — копировать |
| ⌥ | Option | ⌥⌘I — DevTools |
| ⇧ | Shift | ⇧⌘P — палитра команд |
| ⌃ | Control | ⌃C — остановить команду |

---

## Finder: настоящие имена файлов

:::use finder

---

## Папка для учёбы: ~/dev

:::use home-tree

Без пробелов, без кириллицы, не в iCloud.

---

## Что такое Терминал

:::use finder-vs-terminal

---

## Как выглядит Терминал

:::terminal title="mary — -zsh — 80×24"
Last login: Thu Sep 11 10:24:15 on ttys000   [1]
mary@MacBook-Air ~ %    [2]
:::

1. Служебная строка — не обращаем внимания
2. Приглашение: Терминал ждёт команду

<kbd>⌘</kbd>+<kbd>Пробел</kbd> → «Терминал» → <kbd>Return</kbd>

---

## Приглашение

:::use prompt

---

## Как устроена команда

:::use command-anatomy

---

## Четыре правила

- Регистр важен: `ls` ≠ `LS`, `dev` ≠ `Dev`
- Пробел разделяет части: `cd "my folder"`
- Нет ответа — всё хорошо
- Ошибку читаем:

:::terminal
mary@MacBook-Air ~ % cd dve
! cd: no such file or directory: dve
:::

---

## Команды: где я и куда иду

| Команда | Что делает |
|---|---|
| `pwd` | Где я? |
| `ls`, `ls -a` | Что здесь? Со скрытыми |
| `cd папка` | Перейти в папку |
| `cd ..` / `cd ~` | На уровень выше / домой |

<kbd>Tab</kbd> — дописать имя, <kbd>↑</kbd> — прошлая команда, <kbd>⌃</kbd>+<kbd>C</kbd> — стоп

---

## Команды: файлы и папки

| Команда | Что делает |
|---|---|
| `mkdir имя` | Создать папку |
| `touch файл` | Создать пустой файл |
| `cp` / `mv` | Копировать / переместить, переименовать |
| `rm файл` | Удалить **без Корзины** |
| `open .` / `code .` | Открыть папку в Finder / в VS Code |

---

## Попробуем вместе

:::terminal
mary@MacBook-Air ~ % mkdir dev
mary@MacBook-Air ~ % cd dev
mary@MacBook-Air dev % mkdir hello
mary@MacBook-Air dev % cd hello
mary@MacBook-Air hello % touch index.html
mary@MacBook-Air hello % ls
index.html
mary@MacBook-Air hello % open .
:::

---

## Пути

:::use paths

---

## Как ставятся программы на Mac

:::use install-app

---

## Chrome

:::shot img/chrome-download.webp
google.com/chrome
:::

---

## VS Code

:::cols
:::shot img/vscode-download.webp
code.visualstudio.com/download
:::
+++
1. Распаковать `.zip`
2. Перетащить в «Программы»
3. ⇧⌘P → `Shell Command: Install 'code' command in PATH`
:::

---

## Node.js

:::shot img/node-download-lts.webp
Версия LTS
:::

:::shot img/node-download-pkg.webp
Установщик .pkg
:::

---

## Git

```bash
xcode-select --install
```

:::shot img/git-download.webp
Способ, который рекомендует сайт Git
:::

---

## Проверка

```bash
node -v
npm -v
git --version
code --version
```

`command not found` → ⌘Q, открыть Терминал заново

---

## Частые ошибки

- Файл `index.html.txt` — писали в TextEdit
- VS Code запущен из «Загрузок»
- `sudo` перед командой
- Пробелы и кириллица в пути

---

## Домашнее задание

1. Установить всё и прислать скриншот версий
2. Структура папок без мыши
3. Путешествие по путям
4. Первая страница из Терминала
5. Со звёздочкой: файлы без Finder
