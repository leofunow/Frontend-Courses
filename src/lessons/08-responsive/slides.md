<!-- class: statement -->
Одна страница — любой экран

---

## Один сайт, три ширины

:::shot img/resp-devices.webp
:::

---

## meta viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

:::cols
:::shot img/resp-no-viewport.webp
Без неё
:::
+++
:::shot img/resp-with-viewport.webp
С ней
:::
:::

---

## Режим устройств

:::shot img/devtools-device-toggle.webp
⇧⌘M в DevTools
:::

---

## Три ширины для проверки

| Экран | Ширина |
|---|---|
| Телефон | 375px |
| Планшет | 768px |
| Ноутбук | 1280px |

Горизонтальная прокрутка — всегда ошибка

---

## Медиазапрос

```css
.cards { grid-template-columns: 1fr; }

@media (min-width: 640px) {
  .cards { grid-template-columns: 1fr 1fr; }
}
```

`min-width: 640px` — «от 640px и шире»

---

## Сначала телефон

:::shot img/resp-breakpoints.webp
:::

Базовые стили — телефон, `min-width` добавляет колонки

---

## Порядок в файле

```css
/* телефон — без медиазапроса */
.cards { display: grid; gap: 16px; }

@media (min-width: 640px) { … }   /* планшет */
@media (min-width: 1024px) { … }  /* ноутбук */
```

От меньшей ширины к большей, в конце файла

---

## Резиновые размеры

| Запись | Что значит |
|---|---|
| `max-width: 960px` | не шире, но может быть уже |
| `%` | доля ширины родителя |
| `vw` | 1% ширины окна |
| `clamp(2rem, 5vw, 3.5rem)` | идеал в границах |

---

## width или max-width

```css
.page { width: 960px; }       /* на телефоне — прокрутка */
.page { max-width: 960px; }   /* на телефоне — сжимается */
```

---

## Картинки

```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

---

## object-fit

:::shot img/resp-fit.webp
:::

Превью и обложки — `cover`

---

## Сетка без медиазапросов

```css
.menu {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
```

Колонок столько, сколько влезет

---

## CSS-переменные

```css
:root {
  --color-accent: #bc4c00;
}

.btn {
  background: var(--color-accent);
}
```

Поменяли в одном месте — поменялось везде

---

## Частые ошибки

:::cols
- Нет meta viewport
- `width` в пикселях
- Меню только по `:hover`
- Кнопки меньше 44px
+++
:::shot img/resp-fixed.webp
:::
:::

---

## Домашнее задание

1. Адаптивный каталог: 1, 2, 3 колонки
2. Шапка на телефоне
3. Цвета в переменные
4. Со звёздочкой: починить страницу
