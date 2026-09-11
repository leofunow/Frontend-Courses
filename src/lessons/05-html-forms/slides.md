<!-- class: statement -->
Форма — главный способ получить что-то от пользователя. Сделаем её удобной для всех

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

`action` — куда, `method` — как, `name` — под каким именем

---

## Подпись: for + id

```html
<label for="email">Email</label>
<input id="email" type="email">
```

- По подписи можно щёлкнуть
- VoiceOver её прочитает
- placeholder — не подпись

---

## Типы полей

| type | Что даёт |
|---|---|
| `email` | клавиатура с @ и проверка адреса |
| `tel` | цифровая клавиатура |
| `number` | стрелки, `min` и `max` |
| `date`, `time` | календарь и часы |
| `password` | скрытые символы |

---

## Выбор из вариантов

| Элемент | Когда |
|---|---|
| `radio` | один из нескольких, общий `name` |
| `checkbox` | сколько угодно или «согласен» |
| `select` | много вариантов |
| `textarea` | длинный текст |

---

## Кнопки

```html
<button type="submit">Отправить</button>
<button type="reset">Очистить</button>
<button type="button">Показать пароль</button>
```

Кнопка — только `button`, не `div`

---

## Проверка без JavaScript

```html
<input name="name" required minlength="2">
<input name="email" type="email" required>
<input name="guests" type="number" min="1" max="10">
```

Для удобства человека. Защита — на сервере

---

## Группы полей

```html
<fieldset>
  <legend>Как с вами связаться?</legend>
  <input type="radio" id="c-phone" name="contact">
  <label for="c-phone">Телефон</label>
</fieldset>
```

---

## Таблицы

:::use table-tree

---

## Таблица цен

```html
<table>
  <caption>Цены на кофе</caption>
  <thead><tr><th>Напиток</th><th>S</th><th>M</th></tr></thead>
  <tbody>
    <tr><th>Капучино</th><td>200 ₽</td><td>220 ₽</td></tr>
  </tbody>
</table>
```

Только для данных, не для раскладки страницы

---

## Доступность: кто и что

:::use a11y-who

---

## Фокус

:::shot img/focus-ring.webp
Рамку фокуса никогда не убираем
:::

---

## Проверка за пять минут

1. Пройти страницу клавишей Tab
2. Послушать в VoiceOver: ⌘F5
3. Увеличить до 200%: ⌘+
4. Biome: ноль ошибок a11y

---

## Воркшоп: форма записи в кофейню

1. Поля с подписями: `label` + `input`
2. Правильные типы: email, tel, date, number
3. Обязательные поля и проверка браузером
4. Выбор, комментарий, согласие
5. Отправка: куда уходят данные
6. Проверка клавиатурой, в DevTools и VoiceOver

---

## Домашнее задание

1. Форма записи в кофейню
2. Таблица расписания
3. Аудит доступности
4. Со звёздочкой: анкета с группами вопросов
