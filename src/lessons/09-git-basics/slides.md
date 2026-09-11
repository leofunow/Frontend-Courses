<!-- class: part -->
## Зачем Git

История проекта, которую не страшно сломать

---

<!-- class: statement -->
`site-final-2-точно-final.html` — так больше не надо

Git помнит каждую версию сам

---

## История — цепочка коммитов

:::use git-history

Каждый коммит можно открыть, сравнить или вернуть

---

<!-- class: cards -->
## Что даёт Git

- **Вернуться назад** сломали — откатили один коммит
- **Видеть изменения** каждая строка: была и стала
- **Работать вместе** Git сводит правки двух людей
- **Портфолио** история на GitHub показывает, как вы работаете

---

## Словарь

| Слово | Что это |
|---|---|
| Репозиторий | папка проекта с историей в `.git` |
| Коммит | снимок файлов с сообщением |
| Индекс | что попадёт в следующий коммит |
| Ветка | отдельная линия коммитов |
| Удалённый репозиторий | копия на GitHub |

---

<!-- class: part -->
## Git на вашем Mac

Коммиты, сообщения и история

---

## Настроить один раз

```bash
git config --global user.name "Мария Иванова"
git config --global user.email "mary@example.com"
git config --global init.defaultBranch main
```

Почта — та же, что на GitHub

---

## Три места изменения

:::use git-areas

---

## Первый коммит

:::terminal title="zerno — -zsh"
mary@MacBook-Air zerno % git init [1]
mary@MacBook-Air zerno % git status [2]
mary@MacBook-Air zerno % git add . [3]
mary@MacBook-Air zerno % git commit -m "Добавить главную страницу" [4]
[main (root-commit) 90c92c0] Добавить главную страницу
:::

---

## Сообщение коммита

| Плохо | Хорошо |
|---|---|
| `fix` | `Исправить путь к картинке в шапке` |
| `изменения` | `Добавить форму записи` |
| `сделал всё` | три коммита: разметка, стили, адаптив |

Глагол, одна задача, коротко

---

## .gitignore

```text
node_modules/
.DS_Store
```

То, что скачивается или создаётся само, в историю не кладём

---

## Git в VS Code

:::shot img/git-vscode-changes.webp
:::

1 — в индекс, 2 — сообщение, 3 — Commit, 4 — история

---

## Git Graph

:::shot img/git-graph.webp
:::

Строка — коммит, цветная линия — ветка

---

<!-- class: photo contain -->
## Отменить изменения

- **Испортили файл** — Discard Changes
- **Лишнее в индексе** — минус у файла
- **Плохой коммит** — Revert в Git Graph

Revert не стирает историю, а добавляет отмену

:::shot img/git-graph-revert.webp
:::

---

<!-- class: part -->
## GitHub

Копия проекта в интернете и сайт бесплатно

---

## Создать репозиторий

:::shot img/gh-new-repo.webp
:::

Public — портфолио, Private — домашка

---

## Отправить из VS Code

:::cols
:::shot img/git-vscode-publish.webp
:::
+++
1. Publish Branch
2. Войти в GitHub в браузере
3. Дальше — Sync Changes
:::

---

## GitHub Pages

:::cols
1. Settings → Pages
2. Branch: `main`, `/ (root)`
3. Save — через минуту сайт готов
+++
:::shot img/gh-pages-source.webp
:::
:::

`https://mary.github.io/zerno/`

---

<!-- class: part -->
## Сдача домашки

Ветка, pull request и ревью ментора

---

## Как проходит pull request

:::use pr-flow

---

## Каждое задание

1. Ветка `lesson-09` — щелчок по `main` внизу
2. Коммиты с решением
3. Publish Branch
4. Compare & pull request

:::shot img/gh-compare-pr.webp
:::

---

<!-- class: cards -->
## Частые ошибки

- **Author identity unknown** не настроен `git config`
- **Нет на GitHub** коммит сделан, `push` — нет
- **Rejected** на GitHub новое: сначала `pull`
- **Тысячи изменений** `git init` не в той папке

---

<!-- class: cards -->
## Воркшоп: публикуем сайт кофейни

- **Коммиты** репозиторий и история в VS Code
- **Git Graph** находим, что и когда поменяли
- **GitHub** Publish Branch и Pages
- **Pull request** ветка, ревью, слияние

---

## Домашнее задание

1. Первый репозиторий и история в Git Graph
2. Сайт на GitHub Pages
3. Репозиторий домашки и первый pull request
4. Со звёздочкой: машина времени — Revert
