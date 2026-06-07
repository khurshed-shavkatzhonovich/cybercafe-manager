# CyberCafe Manager

Система управления компьютерным клубом. Electron + React + SQLite.

## Быстрый старт

### Требования
- Node.js 18+ 
- npm

### Установка

```bash
# Установить зависимости
npm install

# Перестроить native модули для Electron
npx electron-rebuild -f -w better-sqlite3

# Запуск в режиме разработки
npm start
```

### Сборка для Windows

```bash
npm run build:react
npx electron-builder --win
```

Установщик появится в папке `dist/`.

## Структура проекта

```
src/
  main/
    main.js        ← Electron main process + база данных SQLite
    preload.js     ← Безопасный мост renderer ↔ main
  renderer/
    App.js         ← Корневой компонент, роутинг, сайдбар
    pages/
      Dashboard.js  ← Дашборд с графиками
      Cashier.js    ← Касса: счета, товары, оплата
      Warehouse.js  ← Склад: товары, цены, остатки
      Reports.js    ← Отчётность по периодам
      SettingsPage.js ← Настройки, комнаты, компьютеры
    styles/
      globals.css   ← Темная тема, компоненты
public/
  index.html
```

## Функционал v1.0

- **Касса**: открытие/закрытие счетов, добавление компьютеров и товаров, скидки, объединение счетов
- **Склад**: товары с фото, категории, себестоимость, остатки, скидки
- **Отчётность**: выручка по периодам, топ товаров, структура продаж
- **Дашборд**: сводная статистика, графики, открытые счета
- **Настройки**: комнаты (VIP/Комфорт/...), компьютеры, название клуба

## Будущие интеграции (архитектура готова)

Модуль `AdapterService` (заглушка) готов к подключению Netadmin или других систем
через `src/main/adapters/` без изменения основной логики.

## База данных

SQLite, файл: `%APPDATA%/cybercafe-manager/cybercafe.db`
