<!-- class: part -->
## Как устроен веб

Путь от адреса в браузере до страницы на экране

---

## Интернет и веб

:::use internet

---

<!-- class: photo statement -->
Веб-приложение устроено как ресторан

:::shot img/cat-cafe.webp
Фото: Sh.aliaksei, [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Cat_cafe_vilnius_02.jpg)
:::

---

## Три части любого веб-приложения

:::use web

---

<!-- class: cards -->
## Кто что делает

- **Фронтенд** зал: всё, что пользователь видит и трогает
- **API** официант: правила, по которым просят данные
- **Бэкенд** кухня: логика, проверки, расчёты
- **База данных** склад: товары, заказы, пользователи

---

<!-- class: photo statement -->
Пользователь видит только фронтенд. Всё остальное — за экраном

:::shot img/cat-tv.webp
Фото: Karel Frydrýšek, [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Cat_and_its_play_(catching_birds_on_TV),_Ev%C5%BEena_Ro%C5%A1ick%C3%A9ho_street,_Ostrava-Svinov,_Silesia,_Czech_Republic_03.jpg)
:::

---

## Адрес сайта

:::shot img/intro-url.webp
:::

Обязательны только протокол и домен

---

## Что происходит, когда вы открываете сайт

:::use request

---

<!-- class: numbers -->
## Одна страница в цифрах

- **7** шагов от Enter до картинки на экране
- **50–150** запросов на одну страницу
- **< 1 с** — столько обычно занимает всё это

---

## Запрос и ответ — это просто текст

:::cols
```http
GET /catalog HTTP/1.1
Host: shop.ru
```
+++
```http
HTTP/1.1 200 OK
Content-Type: text/html

<!doctype html>…
```
:::

---

## Методы и статус-коды

:::cols
| Метод | Что делает |
|---|---|
| `GET` | получить |
| `POST` | создать |
| `PUT`, `PATCH` | изменить |
| `DELETE` | удалить |
+++
| Код | Значит |
|---|---|
| `2xx` | всё получилось |
| `3xx` | ищите в другом месте |
| `4xx` | ошибка в запросе |
| `5xx` | ошибка на сервере |
:::

---

<!-- class: part -->
## Архитектуры

Как части приложения связаны между собой

---

## Клиент и сервер

:::use client-server

---

<!-- class: photo statement -->
Клиенту нельзя доверять. Всё, что в браузере, пользователь может изменить

:::shot img/cat-surprised.webp
Фото: Tdcccl, [CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:C_O_O_K_I_E_(2020;_cropped_2024).png)
:::

---

<!-- class: photo -->
## API — дверца на кухню

Фронтенд не лезет в базу сам. Он стучится в API по правилам:

- какой адрес
- какой метод
- что отправить и что придёт в ответ

:::shot img/cat-door.webp
Фото: Lisa Risager, [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Back_to_Seoul!_(5166579678)_(2010;_cropped_2025).jpg)
:::

---

## API — договор между фронтом и бэком

:::use api

```json
[{ "id": 1, "title": "Купить молоко", "done": false }]
```

---

## MPA, SPA, SSR

:::use mpa-spa-ssr

---

<!-- class: photos -->
## Монолит и микросервисы

:::cols
:::shot img/cat-big.webp
**Монолит** — один большой сервис. Фото: allen watkin, [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Fat_Cat_(2556593236).jpg)
:::
+++
:::shot img/cat-kittens.webp
**Микросервисы** — много маленьких, у каждого своя миска. Фото: Coffins, [CC0](https://commons.wikimedia.org/wiki/File:Katzen_Bauernhof2.jpg)
:::
:::

---

## Монолит и микросервисы на схеме

:::use monolith

Для фронтенда разницы нет: бэкенд — это набор адресов API

---

<!-- class: part -->
## Фронтенд и команда

Что делает фронтенд-разработчик и с кем работает

---

## HTML, CSS, JavaScript

:::cols
**HTML** — структура

```html
<button>Купить</button>
```
+++
**CSS** — внешний вид

```css
button { background: purple; }
```
+++
**JS** — поведение

```js
button.onclick = () => alert('Готово');
```
:::

---

<!-- class: cards -->
## Что делает фронтенд-разработчик

- **Вёрстка** страница как в макете, на любом экране
- **Поведение** кнопки, формы, фильтры, окна
- **Данные** запросить у API и показать
- **Доступность и скорость** удобно всем, быстро везде

---

## Четыре состояния одного экрана

:::shot img/intro-states.webp
:::

Макет обычно показывает только последнее

---

## Кто есть кто в команде

| Роль | Результат работы |
|---|---|
| Фронтенд | Работающие экраны |
| Бэкенд | API и база данных |
| Дизайнер | Макеты в Figma |
| Аналитик | Требования |
| QA | Отчёты о багах |
| DevOps | Стабильные серверы и выкладка |
| Менеджер | Приоритеты |

---

## Браузеры

| Движок | Браузеры |
|---|---|
| Chromium | Chrome, Edge, Opera, Яндекс Браузер |
| WebKit | Safari — и все браузеры на iPhone |
| Gecko | Firefox |

Разрабатываем в Chrome, проверяем ещё и в Safari

---

<!-- class: photo -->
## DevTools — заглянуть внутрь

- <kbd>⌥</kbd>+<kbd>⌘</kbd>+<kbd>I</kbd> или правый клик → «Просмотреть код»
- **Elements** — HTML и стили, можно менять
- **Network** — все запросы страницы
- **Fetch/XHR** — только запросы к API

:::shot img/cat-box.webp
Фото: Kenny Louie, [CC BY 2.0](https://commons.wikimedia.org/wiki/File:Im_in_a_box!_(3939780053).jpg)
:::

---

## Elements и Network

:::cols
:::shot img/intro-elements.webp
Elements: код и стили
:::
+++
:::shot img/intro-network.webp
Network: запросы
:::
:::

---

<!-- class: part -->
## Курс

Что вы соберёте и как будем учиться

---

## Карта курса

:::use course-map

---

<!-- class: cards -->
## Четыре проекта в портфолио

- **Лендинг** HTML и CSS, после урока {{n:git-basics}}
- **Приложение на API** JavaScript, после урока {{n:async}}
- **Личный бюджет** React, после урока {{n:react-global-state}}
- **Канбан-доска** свой сервер, тесты, деплой — в конце

---

## Кем вы станете после курса

| Уровень | Опыт | Как работает |
|---|---|---|
| **Junior** | до 1–2 лет | понятные задачи, учится на ревью |
| **Middle** | 2–4 года | фича целиком сам |
| **Senior** | от 4–5 лет | устройство системы и качество |

После курса — junior

---

<!-- class: photo -->
## Как учиться

1. Текст урока — с открытым редактором
2. Занятие с ментором
3. Квиз
4. Задания
5. Ревью

:::shot img/cat-book.webp
Фото: BibBornem, [CC0](https://commons.wikimedia.org/wiki/File:Cat_reading_book_498102.jpg)
:::

---

<!-- class: photo statement -->
Застряли больше чем на 30 минут — пишите ментору

Что делаю, что ожидаю, что получаю, что пробовал

:::shot img/cat-yarn.webp
Фото: kitty.green66, [CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Little_cate_(4985415966).jpg)
:::

---

<!-- class: cards -->
## AI — репетитор, а не решатель

- **Можно** объяснить непонятное, дать подсказку, найти ошибку
- **Нельзя** сгенерировать решение задания целиком
- **Правило** каждую строку сданного кода вы умеете объяснить

---

<!-- class: photo -->
## Домашнее задание

1. Изменить чужой сайт через Elements
2. Разобрать адреса
3. Разобрать запросы трёх сайтов
4. Вакансии: какой стек нужен
5. Архитектура сервиса в Excalidraw
6. Со звёздочкой: JSON реального сайта

:::shot img/cat-keyboard.webp
Фото: Panini!, [CC0](https://commons.wikimedia.org/wiki/File:Cat_Sleeping_on_Keyboard.jpg)
:::
