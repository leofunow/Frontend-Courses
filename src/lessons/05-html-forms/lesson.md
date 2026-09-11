---
duration: 90 минут теории, 2 часа заданий
goals:
  - Собрать форму с полями разных типов и подписями
  - Включить проверку полей браузером без JavaScript
  - Сверстать таблицу с заголовками
  - Проверить страницу на доступность с клавиатуры и VoiceOver
summary:
  - '[[Форма]] `<form>` собирает данные. У каждого [[поле ввода|поля]] есть [[подпись поля|подпись]] `<label>`, связанная через `for` и `id`'
  - 'Тип поля — `email`, `tel`, `number`, `date` — даёт нужную клавиатуру на телефоне и встроенную проверку'
  - '`required`, `minlength`, `min`, `max`, `pattern` проверяют данные без единой строки JavaScript'
  - 'Таблица — только для табличных данных: `table`, `thead`, `tbody`, `tr`, `th`, `td`'
  - '[[Доступность]]: всё работает с клавиатуры, у полей есть подписи, у картинок — alt'
readMore:
  - title: 'METANIT — Работа с формами'
    url: https://metanit.com/web/html5/3.1.php
  - title: 'METANIT — Таблицы'
    url: https://metanit.com/web/html5/2.8.php
  - title: MDN — Веб-формы, учебный раздел
    url: https://developer.mozilla.org/ru/docs/Learn_web_development/Extensions/Forms
  - title: MDN — Основы HTML-таблиц
    url: https://developer.mozilla.org/ru/docs/Learn_web_development/Core/Structuring_content/HTML_table_basics
  - title: Apple — Руководство VoiceOver
    url: https://support.apple.com/ru-ru/guide/voiceover/welcome/mac
---

## Как устроена форма

[[Форма]] — всё, где пользователь что-то вводит: вход на сайт, заказ, поиск, запись к врачу. Путь данных всегда один:

:::diagram id=form-flow
type: flow
caption: "Что происходит, когда пользователь нажимает кнопку отправки"
items:
  - {title: Пользователь заполняет поля, text: "input, select, textarea", kind: muted, icon: pencil}
  - {arrow: right, label: "кнопка submit"}
  - {title: Браузер проверяет, text: "required, email, min…", kind: accent, icon: checklist}
  - {arrow: right, label: "всё верно"}
  - {title: Данные уходят, text: "на адрес из action", kind: back, icon: server}
:::

```html
<form action="/booking" method="post">
  <label for="name">Имя</label>
  <input id="name" name="name" type="text" required>

  <button type="submit">Записаться</button>
</form>
```

- `action` — куда отправить данные. Своего сервера у нас пока нет — его напишем в уроке {{n:express}}.
- `method` — как отправить: `post` для данных, `get` для поиска.
- `name` у поля — имя, под которым значение уйдёт на сервер.

## Поле и подпись

У каждого поля должна быть [[подпись поля|подпись]] `<label>`. Связь делается так: у поля `id`, у подписи — `for` с тем же значением.

:::sandbox Подпись и поле height=240
```html
<form>
  <label for="email">Email</label>
  <input id="email" type="email" placeholder="mary@example.com">
  <p>Щёлкните по слову «Email» — курсор окажется в поле.</p>
</form>
```
```css
label { display: block; font-weight: 600; margin-bottom: 4px; }
input { font: inherit; padding: 6px 8px; width: 260px; }
```
:::

Связанная подпись даёт три вещи: по ней можно щёлкнуть, программа экранного доступа прочитает её вслух, а Biome перестанет ругаться.

:::mistake Подсказка вместо подписи
`placeholder` исчезает, как только человек начал печатать, и он забывает, что вводил. Placeholder — пример значения, а не подпись.
:::

## Типы полей

Атрибут `type` меняет поведение поля. На телефоне `type="tel"` откроет цифровую клавиатуру, `type="email"` — клавиатуру с `@`, `type="date"` — календарь.

:::sandbox Типы полей height=460
```html
<form>
  <p><label for="f1">text</label> <input id="f1" type="text"></p>
  <p><label for="f2">email</label> <input id="f2" type="email"></p>
  <p><label for="f3">password</label> <input id="f3" type="password"></p>
  <p><label for="f4">tel</label> <input id="f4" type="tel"></p>
  <p><label for="f5">number</label> <input id="f5" type="number" min="1" max="10"></p>
  <p><label for="f6">date</label> <input id="f6" type="date"></p>
  <p><label for="f7">range</label> <input id="f7" type="range" min="0" max="100"></p>
  <p><label for="f8">color</label> <input id="f8" type="color"></p>
</form>
```
```css
p { display: grid; grid-template-columns: 90px 220px; align-items: center; margin: 6px 0; }
label { font-family: monospace; }
```
:::

## Выбор из вариантов

Когда ответов немного, дайте выбрать, а не печатать.

:::sandbox Переключатели, флажки, список height=440
```html
<form>
  <p>Размер кофе:</p>
  <input type="radio" id="s" name="size" value="s"> <label for="s">S</label>
  <input type="radio" id="m" name="size" value="m" checked> <label for="m">M</label>
  <input type="radio" id="l" name="size" value="l"> <label for="l">L</label>

  <p>Добавки:</p>
  <input type="checkbox" id="syrup" name="syrup"> <label for="syrup">Сироп</label>
  <input type="checkbox" id="milk" name="milk"> <label for="milk">Овсяное молоко</label>

  <p><label for="place">Где пить:</label></p>
  <select id="place" name="place">
    <option value="here">В кофейне</option>
    <option value="togo">С собой</option>
  </select>

  <p><label for="comment">Комментарий:</label></p>
  <textarea id="comment" name="comment" rows="3"></textarea>
</form>
```
:::

| Элемент | Когда |
|---|---|
| `type="radio"` | Один вариант из нескольких. У всех вариантов одинаковый `name` |
| `type="checkbox"` | Любое количество вариантов, или одна галочка «согласен» |
| `<select>` + `<option>` | Выпадающий список, когда вариантов много |
| `<textarea>` | Длинный текст в несколько строк |

## Кнопки

`<button>` внутри формы по умолчанию отправляет её. Поэтому тип указывайте всегда — об этом напоминает Biome (урок {{n:vscode}}).

```html
<button type="submit">Отправить</button>    <!-- отправляет форму -->
<button type="reset">Очистить</button>      <!-- возвращает поля к начальным значениям -->
<button type="button">Показать пароль</button>  <!-- ничего не делает, пока не добавим JS -->
```

:::mistake Кнопка из div
`<div class="button">` выглядит как кнопка, но на неё нельзя перейти клавишей Tab, и VoiceOver не скажет «кнопка». Для действий — только `<button>`, для переходов — `<a>`.
:::

## Проверка без JavaScript

Браузер сам проверит поля перед отправкой и покажет подсказку. Нужно только описать правила атрибутами. Попробуйте отправить пустую форму, потом неправильный email.

:::sandbox Встроенная валидация height=330
```html
<form>
  <p><label for="n">Имя (от 2 букв)</label><br>
  <input id="n" name="name" required minlength="2"></p>

  <p><label for="e">Email</label><br>
  <input id="e" name="email" type="email" required></p>

  <p><label for="g">Гостей (1–10)</label><br>
  <input id="g" name="guests" type="number" min="1" max="10" required></p>

  <button type="submit">Записаться</button>
</form>
```
:::

| Атрибут | Что проверяет |
|---|---|
| `required` | Поле не пустое |
| `minlength` / `maxlength` | Длина текста |
| `min` / `max` | Границы числа или даты |
| `type="email"` | Похоже на адрес: есть `@` и домен |
| `pattern` | Шаблон, например номер из 10 цифр: `pattern="[0-9]{10}"` |

:::note Проверка на сервере всё равно нужна
Встроенную [[валидация|проверку]] легко обойти через DevTools — помните урок {{n:intro}}: клиенту нельзя доверять. Она для удобства человека, а защита — на сервере.
:::

## Группы полей

Связанные поля объединяйте в `<fieldset>` с заголовком `<legend>`. Особенно важно для переключателей: VoiceOver прочитает вопрос вместе с вариантом.

```html
<fieldset>
  <legend>Как с вами связаться?</legend>
  <input type="radio" id="c-phone" name="contact" value="phone">
  <label for="c-phone">Телефон</label>
  <input type="radio" id="c-mail" name="contact" value="email">
  <label for="c-mail">Email</label>
</fieldset>
```

## Таблицы

Таблица — для данных, которые естественно ложатся в строки и столбцы: расписание, цены, сравнение. Раскладку страницы таблицами не делают.

:::diagram id=table-tree
type: tree
caption: Устройство таблицы
items:
  - name: table
    items:
      - {name: caption, note: название таблицы}
      - name: thead
        note: шапка
        items:
          - name: tr
            note: строка
            items:
              - {name: th, note: "ячейка-заголовок"}
      - name: tbody
        note: данные
        mark: true
        items:
          - name: tr
            items:
              - {name: td, note: обычная ячейка}
:::

:::sandbox Таблица цен height=300
```html
<table>
  <caption>Цены на кофе</caption>
  <thead>
    <tr><th>Напиток</th><th>S</th><th>M</th><th>L</th></tr>
  </thead>
  <tbody>
    <tr><th>Эспрессо</th><td>150 ₽</td><td>—</td><td>—</td></tr>
    <tr><th>Капучино</th><td>200 ₽</td><td>220 ₽</td><td>250 ₽</td></tr>
    <tr><th>Раф</th><td>230 ₽</td><td>260 ₽</td><td>290 ₽</td></tr>
  </tbody>
</table>
```
```css
table { border-collapse: collapse; }
th, td { border: 1px solid #d1d9e0; padding: 6px 12px; text-align: left; }
thead th { background: #f6f8fa; }
caption { font-weight: 600; margin-bottom: 8px; text-align: left; }
```
:::

`<th>` бывает не только в шапке: первая ячейка строки с названием напитка — тоже заголовок. Программа экранного доступа прочитает «Капучино, M, 220 рублей».

## Доступность

[[Доступность]] — сайт удобен всем: людям, которые плохо видят, пользуются только клавиатурой, слушают страницу вместо чтения. И просто человеку с телефоном в одной руке.

:::diagram id=a11y-who
type: rows
caption: Кто пользуется сайтом не мышью и что ему нужно
rows:
  - label: Незрячий
    items:
      - {title: VoiceOver, text: читает страницу вслух, kind: muted, icon: unmute}
      - {arrow: right}
      - {title: "Нужно:", text: "alt, label, заголовки по уровням, семантические теги", kind: accent, icon: check}
  - label: Только клавиатура
    items:
      - {title: "Tab, Return, пробел", text: переход и нажатие, kind: muted, icon: command-palette}
      - {arrow: right}
      - {title: "Нужно:", text: "настоящие button и a, видимый фокус", kind: accent, icon: check}
  - label: Плохо видит
    items:
      - {title: Увеличение, text: "⌘+ до 200%", kind: muted, icon: zoom-in}
      - {arrow: right}
      - {title: "Нужно:", text: "контраст текста, ничего не ломается при увеличении", kind: accent, icon: check}
:::

:::shot img/focus-ring.webp width=340
После двух нажатий Tab фокус на поле «Телефон»: браузер обводит его рамкой. Никогда не убирайте эту рамку в CSS
:::

Проверьте свою страницу за пять минут:

1. **Клавиатура.** Щёлкните в адресную строку и нажимайте <kbd>Tab</kbd>. Видно, где [[фокус]]? Можно дойти до каждой ссылки, поля и кнопки? Нажатие <kbd>Return</kbd> срабатывает?
2. **VoiceOver.** Включите <kbd>⌘</kbd>+<kbd>F5</kbd> (на ноутбуке — <kbd>⌘</kbd>+<kbd>Fn</kbd>+<kbd>F5</kbd> или три быстрых нажатия на Touch ID с зажатой <kbd>⌘</kbd>) и послушайте форму: читаются ли подписи полей? Выключите тем же сочетанием.
3. **Увеличение.** <kbd>⌘</kbd>+<kbd>+</kbd> до 200%: ничего не наезжает и не пропадает?
4. **Biome.** Правила `a11y` в панели Problems — ноль ошибок.

:::tip Включить Tab по всем элементам в Safari
В Chrome Tab переходит по всем ссылкам сразу. В Safari — только если включить: Настройки → Дополнения → «Нажатие клавиши Tab выделяет каждый объект на веб-странице».
:::

## Частые ошибки

:::mistake Поле без подписи
Человек с VoiceOver услышит «поле для текста» и не поймёт, что вводить. У каждого поля — свой `<label for>`.
:::

:::mistake Разные name у переключателей
Если у `radio` разные `name`, можно выбрать все сразу. У вариантов одного вопроса `name` одинаковый.
:::

:::mistake Таблица для раскладки
Колонки на странице делают через CSS Grid (урок {{n:layout}}), а не через `<table>`.
:::

## Шпаргалка

```html
<form action="/order" method="post">
  <fieldset>
    <legend>Контакты</legend>
    <label for="name">Имя</label>
    <input id="name" name="name" required minlength="2">

    <label for="phone">Телефон</label>
    <input id="phone" name="phone" type="tel" required>
  </fieldset>

  <input id="agree" name="agree" type="checkbox" required>
  <label for="agree">Согласен на обработку данных</label>

  <button type="submit">Отправить</button>
</form>
```

## Квиз

:::quiz
- q: Как связать подпись с полем?
  options:
    - Поставить label сразу перед input
    - '`<label for="email">` и `<input id="email">`'
    - Написать подпись в placeholder
    - '`<input label="Email">`'
  answer: 1
  why: Значение for у подписи совпадает с id поля. Тогда по подписи можно щёлкнуть, и VoiceOver её прочитает.
- q: Какой тип поля выбрать для номера телефона?
  options:
    - "`text`"
    - "`number`"
    - "`tel`"
    - "`phone`"
  answer: 2
  why: "`tel` откроет на телефоне цифровую клавиатуру. `number` не подходит: у номера бывают +, скобки и ведущие нули."
- q: Как сделать, чтобы из трёх переключателей размера можно было выбрать только один?
  options:
    - Дать им одинаковый name
    - Дать им одинаковый id
    - Поставить их в разные формы
    - Использовать checkbox
  answer: 0
  why: Переключатели с одинаковым name — одна группа, выбрать можно один. id у каждого должен быть свой.
- q: Что сделает кнопка `<button>` без type внутри формы?
  options:
    - Ничего
    - Отправит форму
    - Очистит форму
    - Выдаст ошибку
  answer: 1
  why: По умолчанию тип кнопки — submit. Поэтому тип пишем всегда явно.
- q: 'Поле `<input type="email" required>`. Когда браузер не даст отправить форму?'
  options:
    - Никогда — это только подсказка
    - Если поле пустое или в нём не адрес почты
    - Только если поле пустое
    - Только если почта не существует
  answer: 1
  why: required запрещает пустое значение, type="email" проверяет, что текст похож на адрес. Существует ли почта, браузер не знает.
- q: Нужна ли проверка на сервере, если в форме есть required и pattern?
  options:
    - Нет, браузер уже всё проверил
    - Да, встроенную проверку легко обойти
    - Только для паролей
    - Только если сайт большой
  answer: 1
  why: Всё, что в браузере, пользователь может изменить. Проверки на клиенте — для удобства, защита — на сервере.
- q: Какой тег у ячейки-заголовка таблицы?
  options:
    - "`td`"
    - "`th`"
    - "`thead`"
    - "`caption`"
  answer: 1
  why: th — ячейка-заголовок, td — обычная ячейка. thead — группа строк шапки, caption — название всей таблицы.
- q: Почему кнопку не делают из `<div>`?
  options:
    - div нельзя покрасить
    - На div нельзя перейти клавишей Tab, и VoiceOver не назовёт его кнопкой
    - div медленнее
    - div нельзя положить в форму
  answer: 1
  why: button из коробки доступна с клавиатуры и понятна программам экранного доступа. div — нет.
- q: Как быстрее всего проверить, что страницей можно пользоваться без мыши?
  options:
    - Открыть на телефоне
    - Пройти страницу клавишей Tab и нажимать Return
    - Посмотреть в Biome
    - Увеличить страницу
  answer: 1
  why: Tab показывает, до каких элементов можно дойти и где сейчас фокус.
:::

## Задания

:::task Форма записи в кофейню level=1 time="45 мин"
В `homework/05-html-forms/task-1/index.html` сверстайте форму бронирования столика:

:::answer image Скриншот формы с плашкой проверок
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Поля: имя, телефон, email, дата, время, число гостей от 1 до 10
- [ ] Выбор зала из списка: основной, веранда, у окна
- [ ] Комментарий — многострочное поле
- [ ] Галочка «Согласен с правилами» — обязательная
- [ ] У каждого поля своя подпись `label` через `for` и `id`
- [ ] Обязательные поля: имя, телефон, дата, согласие
- [ ] Кнопка отправки с явным типом
- [ ] Плашка проверок: всё пройдено

:::shot img/task-booking.webp width=460
Примерно так выглядит форма без стилей. Стили добавим после урока про CSS
:::
:::

:::task Таблица расписания level=1 time="25 мин"
В `task-2/index.html` сверстайте расписание занятий студии на неделю: дни, время, занятие, тренер.

:::answer image Скриншот таблицы
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] У таблицы есть `caption`
- [ ] Шапка в `thead` с ячейками `th`
- [ ] Не меньше пяти строк данных в `tbody`
- [ ] Плашка проверок: всё пройдено
:::

:::task Аудит доступности level=2 time="40 мин"
В `task-3/index.html` страница записи в студию с ошибками доступности. Найдите и исправьте все: пройдите страницу клавишей Tab, послушайте VoiceOver, посмотрите панель Problems.

:::answer table Найденные проблемы cols="Проблема|Как исправили" rows=4
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Плашка проверок: всё пройдено
- [ ] Список найденных проблем и как вы их исправили
- [ ] Страницу можно заполнить и отправить только клавиатурой
:::

:::task Анкета с группами вопросов level=3 time="40 мин"
В `task-4/index.html` сделайте анкету «Какой кофе вам подходит» минимум из трёх вопросов. Первый — с переключателями, второй — с флажками, третий — с ползунком `range` или списком. Каждый вопрос — в своём `fieldset` с `legend`.

:::answer image Скриншот анкеты с плашкой проверок
:::answer text Вопросы ментору и что было трудно — если есть rows=2

- [ ] Плашка проверок: всё пройдено
- [ ] Показали анкету ментору в VoiceOver: вопросы читаются вместе с вариантами
:::
