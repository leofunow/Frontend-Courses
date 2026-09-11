<!-- class: statement -->
Две раскладки на все случаи: Flexbox — одна линия, Grid — сетка

---

## Поток документа

:::shot img/layout-flow.webp
Блочные — друг под другом, строчные — в строку
:::

---

## display

| Значение | Что делает |
|---|---|
| `block` | новая строка, вся ширина |
| `inline` | в строку с текстом |
| `none` | исчезает |
| `flex` | дети в ряд |
| `grid` | дети в сетку |

---

## Flexbox: шапка

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

`display: flex` — родителю, двигаются его дети

---

## Две оси

:::shot img/layout-axes.webp
:::

---

## justify-content

:::shot img/layout-justify-wide.webp
:::

---

## align-items

:::shot img/layout-align.webp
:::

---

## Точно по центру

```css
.screen {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

---

## Промежутки и размеры

| Свойство | Что делает |
|---|---|
| `gap: 16px` | промежутки между элементами |
| `flex-wrap: wrap` | перенос на новую строку |
| `flex: 1` | занять свободное место |
| `margin-left: auto` | отодвинуть вправо |

---

## Grid: колонки

:::shot img/layout-grid.webp
:::

---

## Адаптивная сетка

```css
.catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}
```

Колонок столько, сколько влезет

---

## Макет страницы

```css
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-areas:
    "header header"
    "aside  main"
    "footer footer";
}
```

---

## Flexbox или Grid

| Задача | Раскладка |
|---|---|
| Шапка, меню, кнопка с иконкой | Flexbox |
| Каталог, галерея | Grid |
| Макет страницы | Grid |
| По центру | любая |

---

## Частые ошибки

- `display: flex` не у того элемента
- Путают justify и align
- Промежутки через margin вместо gap

---

## Воркшоп: шапка, каталог и макет

1. Шапка на Flexbox и значок `flex` в DevTools
2. Редактор Flexbox: подобрать выравнивание мышью
3. Каталог на Grid и линии сетки
4. Колонок столько, сколько влезет
5. Макет страницы из областей
6. Flexbox внутри Grid-карточки

---

## Домашнее задание

1. Шапка сайта
2. Каталог на Grid
3. Макет страницы
4. Со звёздочкой: Flexbox Froggy и Grid Garden
