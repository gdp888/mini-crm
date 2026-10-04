# Мини CRM

Простая CRM-таблица клиентов с **серверным хранением данных** (Vercel + Upstash Redis).
Данные видны с любого устройства и не зависят от браузера.

## Возможности
- Таблица клиентов: имя, телефон, email, статус (Новый / Активный / Закрытый), примечание
- Добавление / редактирование / удаление через модальное окно
- Поиск, сортировка по колонкам, счётчики статистики
- Экспорт в CSV
- Хранение на сервере (Upstash Redis) — данные общие для всех устройств

## Структура
```
index.html      — интерфейс
style.css       — стили
app.js          — логика (работает через fetch с /api/clients)
api/clients.js  — серверная функция Vercel (REST API + Redis)
package.json    — зависимости (@upstash/redis)
vercel.json     — конфиг деплоя
```

## Настройка (один раз)
1. Зарегистрируйтесь на https://console.upstash.com/redis → **Create Database** (бесплатный Serverless Redis).
2. Скопируйте **REST URL** и **REST Token** (вкладка REST API).
3. В проекте Vercel: Settings → Environment Variables, добавьте:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Деплой: vercel.com → Add New Project → импортируйте этот репозиторий → Deploy.
   Vercel сам установит зависимости и обнаружит функции в папке `api/`.

Каждый push в main — автоматический передеплой.

## Локальный запуск
```bash
npm i -g vercel
vercel dev   # поднимет и статику, и /api/clients
```
Локально переменные окружения возьмутся из `.env.local`:
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```
