<!-- class: part -->
## Формы

Как страница получает данные от человека

---

<!-- class: statement -->
Вход, поиск, заказ, запись к врачу — всё это формы

---

## Как устроена форма

:::use form-flow

---

## Минимальная форма

```html
<form action="/booking" method="post">
  <label for="name">Имя</label>
  <input id="name" name="name" required>
  <button type="submit">Записаться</button>
</form>
```

---

<!-- class: cards -->
## Четыре главных атрибута

- **action** куда отправить данные
- **method** как: `post` для данных, `get` для поиска
- **name** под каким именем уйдёт значение
- **type** у кнопки — всегда явно

---

## Подпись: for + id

```html
<label for="email">Email</label>
<input id="email" type="email">
```

- По подписи можно щёлкнуть
- VoiceOver её прочитает
- Biome перестанет ругаться

---

<!-- class: statement -->
placeholder — это пример значения, а не подпись. Он исчезает, как только человек начал печатать

---

<!-- class: part -->
## Поля

Правильный тип поля — половина удобства

---

## Одно поле — много типов

:::shot img/forms-input-types.webp
:::

---

## Что даёт type

| type | На телефоне и в браузере |
|---|---|
| `email` | клавиатура с @, проверка адреса |
| `tel` | цифровая клавиатура |
| `number` | стрелки, `min`, `max`, `step` |
| `date`, `time` | календарь и часы |
| `password` | точки вместо символов |
| `search`, `url` | кнопка «Найти», проверка адреса |

---

## Выбор из вариантов

:::shot img/forms-choices.webp
:::

---

<!-- class: cards -->
## Что выбрать

- **radio** один из нескольких, общий `name`
- **checkbox** сколько угодно или «согласен»
- **select** много вариантов в списке
- **textarea** длинный текст

---

## value и checked

```html
<input type="radio" id="m" name="size" value="m" checked>
<label for="m">M — 350 мл</label>
```

Подпись — для человека, `value` — для сервера. `checked` — выбрано сразу

---

## Подсказки: datalist

```html
<input id="drink" name="drink" list="drinks">
<datalist id="drinks">
  <option value="Эспрессо">
  <option value="Капучино">
</datalist>
```

Предлагает варианты, но можно написать свой

---

## Отправка файлов

```html
<form action="/upload" method="post"
      enctype="multipart/form-data">
  <input name="photo" type="file"
         accept="image/*" multiple>
</form>
```

Без `enctype` уйдёт только имя файла

---

## Кнопки

```html
<button type="submit">Отправить</button>
<button type="reset">Очистить</button>
<button type="button">Показать пароль</button>
```

Без `type` кнопка в форме отправляет её

---

<!-- class: statement -->
Действие — только `button`, переход — только `a`. Кнопку из `div` не видит ни Tab, ни VoiceOver

---

<!-- class: part -->
## Проверка и группы

Браузер проверит поля сам — без JavaScript

---

## Проверка без JavaScript

```html
<input name="name" required minlength="2">
<input name="email" type="email" required>
<input name="guests" type="number" min="1" max="10">
<input name="zip" pattern="[0-9]{6}"
       title="Индекс — 6 цифр">
```

---

<!-- class: cards -->
## Ещё полезные атрибуты

- **autocomplete** браузер подставит имя, телефон, почту
- **step** шаг числа: `0.5`
- **disabled** нельзя изменить, не отправляется
- **readonly** нельзя изменить, но отправляется

---

<!-- class: statement -->
Проверка в браузере — для удобства человека. Защита — на сервере: клиенту нельзя доверять

---

## Группы полей

```html
<fieldset>
  <legend>Как с вами связаться?</legend>
  <input type="radio" id="c-phone" name="contact">
  <label for="c-phone">Телефон</label>
</fieldset>
```

VoiceOver прочитает вопрос вместе с вариантом

---

## Готовая форма

:::cols
Имя, телефон, дата, гости, зал, комментарий, согласие.

Без единой строки CSS — но уже удобная и доступная. Красоту добавим в следующем уроке
+++
:::shot img/task-booking.webp
:::
:::

---

<!-- class: part -->
## Таблицы и доступность

Данные в строках и столбцах. Сайт для всех

---

## Устройство таблицы

:::use table-tree

---

## Таблица цен

:::shot img/forms-table.webp
:::

---

## Объединение ячеек

```html
<tr>
  <th rowspan="2">Напиток</th>
  <th colspan="3">Объём</th>
</tr>
<tr><th>S</th><th>M</th><th>L</th></tr>
```

Таблица — только для данных, не для раскладки

---

## Доступность: кто и что

:::use a11y-who

---

## Фокус

:::shot img/focus-ring.webp
Рамку фокуса никогда не убираем
:::

---

<!-- class: cards -->
## Проверка за пять минут

- **Tab** дойти до каждого поля и кнопки
- **VoiceOver** ⌘F5: слышны ли подписи
- **⌘+** до 200% — ничего не наезжает
- **Biome** ноль ошибок a11y

---

<!-- class: cards -->
## Частые ошибки

- **Поле без подписи** VoiceOver скажет «поле для текста»
- **Разные name у radio** можно выбрать все сразу
- **Кнопка из div** не работает с клавиатуры
- **Таблица для раскладки** колонки делают на Grid

---

<!-- class: cards -->
## Воркшоп: форма записи в кофейню

- **Поля** подписи и правильные типы
- **Проверка** обязательные поля без JavaScript
- **Выбор** список, комментарий, согласие
- **Доступность** Tab, DevTools, VoiceOver

---

## Домашнее задание

1. Форма записи в кофейню
2. Таблица расписания
3. Аудит доступности
4. Со звёздочкой: анкета с группами вопросов
