<!-- class: part -->
## Первые правила

Подключаем стили и пишем правило

---

<!-- class: statement -->
HTML — что есть на странице. CSS — как это выглядит

Кнопка без CSS серая, но работает

---

## Подключаем стили

```html
<link rel="stylesheet" href="css/style.css">
```

:::use css-files

---

<!-- class: cards -->
## Три способа — один правильный

- **Файл и link** один файл на весь сайт — всегда так
- **Тег style** для быстрых опытов на одной странице
- **Атрибут style** почти никогда: не найти и не перебить

---

## Анатомия правила

:::use rule-anatomy

```css
h1 { color: brown; font-size: 2rem; }
```

---

<!-- class: part -->
## Селекторы и каскад

Кого красим и кто побеждает в споре

---

## Селекторы

| Селектор | Что выбирает |
|---|---|
| `p` | все абзацы |
| `.card` | класс card |
| `nav a` | ссылки внутри nav |
| `h1, h2` | и то и другое |
| `#logo` | id — для стилей лучше класс |

---

<!-- class: cards -->
## Имена классов

- **По смыслу** `.card`, `.card-title`, `.main-nav`
- **Не по виду** `.red-text` устареет, когда цвет поменяют
- **Латиницей через дефис** `.price-old`, не `.ЦенаСтарая`

---

## Состояния: псевдоклассы

:::shot img/css-states.webp
:::

`:hover` · `:focus-visible` · `:active` — ответ на каждое действие

---

## Позиции в списке

:::shot img/css-children.webp
:::

`:first-child`, `:last-child`, `:nth-child(even)`

---

## ::before и ::after

:::shot img/css-pseudo.webp
:::

Украшение без лишнего тега. Без `content` не появится

---

## Селекторы атрибутов

| Селектор | Выбирает |
|---|---|
| `input[type="email"]` | поля для почты |
| `a[target="_blank"]` | ссылки в новой вкладке |
| `a[href^="tel:"]` | ссылки на телефон |

---

## Каскад: кто победит

:::use specificity

При равном весе — правило ниже в файле

---

## Проверим

```html
<p class="note" id="promo">Какого я цвета?</p>
```

```css
#promo { color: purple; }
.note { color: green; }
p { color: red; }
```

---

## Наследование

| Наследуются | Не наследуются |
|---|---|
| `color`, `font-*`, `line-height` | `margin`, `padding`, `border`, `background` |

Шрифт и цвет — один раз на `body`

---

<!-- class: part -->
## Внешний вид

Цвет, текст, шрифты, фон и тени

---

## Цвета

| Запись | Пример |
|---|---|
| HEX — из Figma | `#1f883d` |
| RGB | `rgb(31 136 61)` |
| С прозрачностью | `rgb(0 0 0 / 50%)` |

---

<!-- class: cards -->
## Единицы

- **px** рамки, тени, мелкие детали
- **rem** шрифты и отступы — растут с настройкой шрифта
- **%** ширина от родителя
- **vw / vh** доля окна: первый экран на всю высоту

---

## Текст

```css
body {
  font-family: -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
  color: #1f2328;
}
article { max-width: 60ch; }
```

---

## Подключаемые шрифты

:::shot img/css-fonts.webp
:::

Google Fonts → Cyrillic → Get embed code → `<link>` в head

---

## Оформление текста

:::shot img/css-text.webp
:::

---

## Скругления и тени

:::shot img/css-effects.webp
:::

```css
.card { border-radius: 16px; box-shadow: 0 8px 24px rgb(31 35 40 / 18%); }
```

---

## Градиенты и фон-картинка

:::shot img/css-gradients.webp
:::

`linear-gradient(135deg, #bc4c00, #fb8f44)`

---

<!-- class: part -->
## Размеры и DevTools

Блочная модель и отладка стилей

---

## Блочная модель

:::use box-model

---

<!-- class: numbers -->
## box-sizing

- **350px** реальная ширина `width: 300px` с padding 24 и рамкой 1
- **300px** та же карточка с `box-sizing: border-box`
- **1** строка в начале каждого проекта: `*, *::before, *::after`

---

## overflow

:::shot img/css-overflow.webp
:::

`visible` — по умолчанию, `hidden` — обрезать, `auto` — прокрутка

---

## DevTools: Styles

:::shot img/css-devtools-styles.webp
:::

Зачёркнутое — проиграло. `:hov` — включить `:hover` без мыши

---

<!-- class: cards -->
## Частые ошибки

- **Нет ; или }** ломается следующее объявление
- **Забыли точку** `card` вместо `.card`
- **Неверный href** стили не подключились
- **!important** вместо точного селектора

---

<!-- class: cards -->
## Воркшоп: оформляем страницу кофейни

- **Подключить** style.css и проверить
- **Текст** шрифт, интервал, веб-шрифт
- **Карточка** скругление, тень, :hover
- **DevTools** правим вживую, переносим в файл

---

## Домашнее задание

1. Стили для рецепта — с веб-шрифтом и состояниями ссылок
2. Карточка по размерам — ровно 320px
3. Спор правил
4. Со звёздочкой: визитка по картинке
