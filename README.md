# Trello‑подобная доска с Drag & Drop

[![Build and Deploy](https://github.com/ExFafurion/ahj-homeworks-dnd/actions/workflows/deploy.yml/badge.svg)](https://github.com/ExFafurion/ahj-homeworks-dnd/actions/workflows/deploy.yml)

**GitHub Pages:** [https://ExFafurion.github.io/ahj-homeworks-dnd/](https://ExFafurion.github.io/ahj-homeworks-dnd/)

## Возможности

- Три фиксированные колонки: TODO, IN PROGRESS, DONE.
- Добавление новых карточек через кнопку «+ Add another card».
- Удаление карточек по нажатию на крестик (появляется при наведении).
- Перетаскивание карточек между колонками и внутри колонки.
- Визуальный плейсхолдер, показывающий место вставки.
- Сохранение состояния в `localStorage` – после перезагрузки всё остаётся на своих местах.
- Сборка через Webpack, деплой на GitHub Pages (GitHub Actions).

## Запуск локально

```bash
yarn install
yarn start