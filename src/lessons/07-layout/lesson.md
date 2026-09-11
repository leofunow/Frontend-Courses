---
duration: 90 минут теории, 2 часа заданий
goals:
  - Понимать поток документа — блочные и строчные элементы
  - Раскладывать элементы в ряд и по центру через Flexbox
  - Строить сетку из колонок и макет страницы через Grid
  - Выбирать между Flexbox и Grid для типовых задач
summary:
  - 'Без раскладки блоки идут сверху вниз, строчные элементы — в строку. Это [[поток документа]]'
  - '`display: flex` у родителя ставит детей в ряд. `justify-content` — вдоль ряда, `align-items` — поперёк'
  - '`gap` — расстояние между элементами, margin для этого больше не нужен'
  - '`display: grid` и `grid-template-columns: repeat(3, 1fr)` — сетка из трёх равных колонок'
  - '[[Flexbox]] — одна линия элементов, [[Grid]] — сетка из строк и колонок'
readMore:
  - title: 'METANIT — Flexbox'
    url: https://metanit.com/web/html5/12.1.php
  - title: 'METANIT — Grid Layout'
    url: https://metanit.com/web/html5/13.1.php
  - title: Flexbox Froggy — игра про Flexbox (есть русский)
    url: https://flexboxfroggy.com/#ru
  - title: Grid Garden — игра про Grid (есть русский)
    url: https://cssgridgarden.com/#ru
  - title: MDN — Раскладка CSS
    url: https://developer.mozilla.org/ru/docs/Learn_web_development/Core/CSS_layout
---

## Поток документа

Пока вы не включили раскладку, браузер расставляет элементы по [[поток документа|потоку]]. Блочные элементы — `h1`, `p`, `div`, `section` — занимают всю ширину и встают друг под другом. Строчные — `a`, `strong`, `span` — живут внутри строки, как слова.

:::shot img/layout-flow.webp width=640
Блочные элементы — синие, строчные — зелёные
:::

Свойство `display` меняет поведение элемента. Главные значения:

| Значение | Что делает |
|---|---|
| `block` | Новая строка, вся ширина |
| `inline` | В строку с текстом, ширину и высоту задать нельзя |
| `inline-block` | В строку, но размеры задать можно — например, кнопка |
| `none` | Элемент исчезает со страницы |
| `flex` | Дети встают в ряд — раскладка Flexbox |
| `grid` | Дети встают в сетку — раскладка Grid |

## Flexbox: элементы в ряд

Самая частая задача — поставить элементы в ряд: логотип слева, меню справа. Для этого `display: flex` пишут **родителю**, и все его прямые дети становятся в ряд.

:::sandbox Шапка на Flexbox height=260
```html
<header class="header">
  <strong>Зерно</strong>
  <nav class="nav">
    <a href="#">Меню</a>
    <a href="#">О нас</a>
    <a href="#">Контакты</a>
  </nav>
</header>
```
```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f6f8fa;
}

.nav {
  display: flex;
  gap: 16px;
}
```
:::

Удалите `display: flex` у `.header` — меню упадёт под логотип. Уберите `justify-content` — всё прижмётся влево.

## Две оси

У Flexbox две оси. Вдоль [[главная ось|главной]] стоят элементы, по ней выравнивает `justify-content`. Поперёк — `align-items`.

:::shot img/layout-axes.webp width=620
По умолчанию главная ось идёт слева направо
:::

`flex-direction: column` поворачивает главную ось вниз: элементы встают колонкой, а `justify-content` и `align-items` меняются ролями.

## justify-content: вдоль ряда

:::shot img/layout-justify.webp width=600
Все значения justify-content на одном ряду из трёх элементов
:::

Чаще всего нужны два значения: `space-between` — края по сторонам, как в шапке, и `center` — всё по центру.

## align-items: поперёк ряда

:::shot img/layout-align.webp
Элементы разной высоты при разных align-items
:::

Центрирование по вертикали и горизонтали — задача, над которой раньше мучились годами. С Flexbox это три строки:

:::sandbox Точно по центру height=280
```html
<div class="screen">
  <div class="modal">Я ровно по центру</div>
</div>
```
```css
.screen {
  display: flex;
  justify-content: center;   /* по горизонтали */
  align-items: center;       /* по вертикали */
  height: 240px;
  background: #f6f8fa;
}

.modal {
  padding: 20px 28px;
  background: #fff;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
}
```
:::

## Промежутки, перенос и размеры

- `gap: 16px` — расстояние между элементами. Не нужно ставить margin каждому и убирать у последнего.
- `flex-wrap: wrap` — не влезли в ряд — переносятся на следующую строку.
- `flex: 1` у элемента — занять всё свободное место. Удобно для поля поиска.
- `margin-left: auto` у элемента — отодвинуть его и всех, кто после него, к правому краю ряда. Так в шапке делают «логотип слева, всё остальное справа».

:::sandbox Поиск на всю ширину height=240
```html
<form class="search">
  <label class="sr" for="q">Поиск</label>
  <input id="q" class="search-input" placeholder="Капучино, раф, какао…">
  <button type="submit">Найти</button>
</form>
```
```css
.search {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;        /* растянуться на всё свободное место */
  padding: 8px;
  font: inherit;
}

.sr { position: absolute; left: -9999px; }  /* подпись есть для VoiceOver, но не видна */
```
:::

## Grid: сетка из колонок

Когда нужны и строки, и колонки — каталог, галерея, макет страницы, — берите [[Grid]]. Колонки описывают у родителя:

:::shot img/layout-grid.webp width=600
Три равные колонки, промежуток 16px. Карточки сами переходят на новую строку
:::

```css
.catalog {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* три колонки по одной доле */
  gap: 16px;
}
```

[[fr]] — доля свободного места: `1fr 2fr` — вторая колонка вдвое шире первой. `repeat(3, 1fr)` — то же, что `1fr 1fr 1fr`.

:::sandbox Каталог на Grid height=320
```html
<section class="catalog">
  <article class="card">Эспрессо</article>
  <article class="card">Капучино</article>
  <article class="card">Раф</article>
  <article class="card">Какао</article>
  <article class="card">Матча</article>
</section>
```
```css
.catalog {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.card {
  padding: 24px 12px;
  text-align: center;
  background: #ddf4ff;
  border-radius: 8px;
}
```
:::

Поменяйте `3` на `2`, потом `1fr` на `200px`. А теперь замените всю строку на `repeat(auto-fill, minmax(150px, 1fr))` — колонок станет столько, сколько влезет. Это адаптивная сетка без единого медиазапроса.

## Grid: макет страницы

Grid умеет раскладывать и всю страницу. `grid-template-areas` — схема страницы прямо в CSS, словами:

:::sandbox Макет из областей height=340
```html
<div class="page">
  <header class="p-header">header</header>
  <aside class="p-aside">aside</aside>
  <main class="p-main">main</main>
  <footer class="p-footer">footer</footer>
</div>
```
```css
.page {
  display: grid;
  grid-template-columns: 180px 1fr;
  grid-template-areas:
    "header header"
    "aside  main"
    "footer footer";
  gap: 8px;
  min-height: 280px;
}

.p-header { grid-area: header; }
.p-aside  { grid-area: aside; }
.p-main   { grid-area: main; }
.p-footer { grid-area: footer; }

.page > * { padding: 12px; background: #f6f8fa; border: 1px dashed #afb8c1; }
```
:::

Поменяйте местами слова `aside` и `main` в схеме — колонки поменяются местами, а HTML останется прежним.

## Flexbox или Grid

| Задача | Что взять |
|---|---|
| Шапка: логотип слева, меню справа | Flexbox, `space-between` |
| Пункты меню в ряд | Flexbox, `gap` |
| Кнопка с иконкой и текстом | Flexbox, `align-items: center` |
| Что-то точно по центру | Flexbox или Grid с `place-items: center` |
| Каталог карточек | Grid, `repeat(…)` |
| Макет страницы | Grid, `grid-template-areas` |

Правило: одна линия — Flexbox, строки и колонки сразу — Grid. Их можно вкладывать: сетка карточек на Grid, а внутри карточки — Flexbox.

:::tip Значки flex и grid в DevTools
В Elements рядом с элементом, у которого `display: flex` или `grid`, есть кнопка-значок. Нажмите — на странице появятся линии сетки и промежутки.
:::

## Частые ошибки

:::mistake display: flex не у того элемента
Flex пишут родителю, а двигаются его прямые дети. Если элементы не встают в ряд, проверьте, что `display: flex` стоит у их общего родителя, а не у них самих.
:::

:::mistake Путают justify и align
`justify-content` — вдоль главной оси, `align-items` — поперёк. Если после `flex-direction: column` центрирование «сломалось», — оси поменялись местами.
:::

:::mistake Отступы между карточками через margin
Появляются лишние отступы у крайних элементов. Для промежутков — `gap`.
:::

## Шпаргалка

```css
/* ряд: края по сторонам, по центру по вертикали */
.row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }

/* точно по центру */
.center { display: grid; place-items: center; }

/* сетка карточек, которая сама подстраивается под ширину */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
```

## Квиз

:::quiz
- q: 'Что делает `display: flex`?'
  options:
    - Ставит сам элемент в ряд с соседями
    - Ставит в ряд прямых детей элемента
    - Делает элемент гибким по ширине
    - Центрирует текст
  answer: 1
  why: Flex включают у родителя, раскладываются его прямые дети.
- q: Как в шапке прижать логотип влево, а меню вправо?
  options:
    - "`justify-content: center`"
    - "`justify-content: space-between`"
    - "`align-items: flex-end`"
    - "`text-align: right`"
  answer: 1
  why: space-between прижимает первый и последний элемент к краям.
- q: Элементы стоят в ряд, но разной высоты прилипли к верху. Как выровнять их по центру по вертикали?
  options:
    - "`justify-content: center`"
    - "`align-items: center`"
    - "`vertical-align: middle`"
    - "`gap: center`"
  answer: 1
  why: align-items работает поперёк главной оси, в обычном ряду — по вертикали.
- q: Чем задать расстояние 16px между карточками?
  options:
    - margin-right у каждой карточки
    - "`gap: 16px` у родителя"
    - "`padding: 16px` у родителя"
    - "`space: 16px`"
  answer: 1
  why: gap ставит промежутки только между элементами, без лишних отступов по краям.
- q: 'Что значит `grid-template-columns: 1fr 2fr`?'
  options:
    - Две колонки, вторая вдвое шире первой
    - Первая колонка 1px, вторая 2px
    - Три колонки
    - Две строки
  answer: 0
  why: fr — доля свободного места. Всего три доли, вторая колонка получает две.
- q: Для каталога товаров из многих карточек лучше подходит…
  options:
    - Flexbox с margin
    - Grid с `repeat(…)`
    - Таблица
    - "`float: left`"
  answer: 1
  why: Каталог — строки и колонки одновременно. Это задача для Grid.
- q: 'Что сделает `flex: 1` у поля поиска внутри flex-ряда?'
  options:
    - Поле займёт всё свободное место в ряду
    - Поле станет шириной 1px
    - Поле встанет первым
    - Поле перенесётся на новую строку
  answer: 0
  why: flex 1 — «забрать свободное место». Кнопка рядом сохранит свой размер.
:::

## Задания

:::task Шапка сайта level=1 time="30 мин"
В `homework/07-layout/task-1` есть разметка шапки: логотип, меню из трёх ссылок и кнопка. Сделайте раскладку в `css/style.css`:

:::answer image Скриншот шапки с плашкой проверок
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Логотип слева, меню и кнопка справа
- [ ] Всё выровнено по центру по вертикали
- [ ] Между ссылками меню 24px через `gap`
- [ ] Плашка проверок: всё пройдено

:::shot img/task-header.webp
Эталон шапки
:::
:::

:::task Каталог на Grid level=1 time="30 мин"
В `task-2` шесть карточек кофе. Разложите их сеткой:

:::answer image Скриншот каталога
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Три колонки одинаковой ширины
- [ ] Промежутки между карточками 24px
- [ ] Внутри карточки: название слева, цена справа, на одной линии — через Flexbox
- [ ] Плашка проверок: всё пройдено
:::

:::task Макет страницы level=2 time="40 мин"
В `task-3` есть шапка, боковое меню, основное содержимое и подвал. Разложите их через `grid-template-areas`:

:::answer image Скриншот макета
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Шапка и подвал на всю ширину
- [ ] Боковое меню слева шириной 240px, содержимое справа занимает остальное
- [ ] Промежутки между областями 16px
- [ ] Плашка проверок: всё пройдено
:::

:::task Лягушки и морковки level=3 time="60 мин"
Пройдите две игры на русском:

1. [Flexbox Froggy](https://flexboxfroggy.com/#ru) — все 24 уровня.
2. [Grid Garden](https://cssgridgarden.com/#ru) — все 28 уровней.

:::answer image Скриншоты последних уровней обеих игр
:::answer table Свойства из игр, которых нет в уроке cols="Свойство|Что делает" rows=3

- [ ] Скриншоты последних уровней обеих игр
- [ ] Три свойства из игр, которых нет в уроке, и что они делают
:::
