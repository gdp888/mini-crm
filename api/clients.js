// Мини CRM — серверный API (Vercel Serverless Function)
// Хранение: Vercel KV (Upstash под капотом). Интеграция подключается в
// дашборде Vercel одним кликом — отдельная регистрация не нужна,
// переменные окружения добавляются автоматически.
import { Redis } from '@upstash/redis';

export const config = { runtime: 'nodejs' };

const KEY = 'crm:clients';

function json(res, status, data) {
  res.status(status).json(data);
}

function getClient() {
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

const sanitize = (c) => ({
  id: String(c.id || '').slice(0, 32),
  name: String(c.name || '').trim().slice(0, 60),
  phone: String(c.phone || '').trim().slice(0, 30),
  email: String(c.email || '').trim().slice(0, 60),
  status: ['new', 'active', 'closed'].includes(c.status) ? c.status : 'new',
  note: String(c.note || '').trim().slice(0, 200),
  createdAt: Number(c.createdAt) || Date.now(),
});

export default async function handler(req, res) {
  // CORS (для локальной разработки)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return json(res, 500, {
      error: 'База данных не подключена. На Vercel: Project → Storage → Create Database → KV (бесплатно), затем redeploy.',
    });
  }

  const redis = getClient();

  try {
    let clients;
    // Блокировка на 5 сек, чтобы параллельные записи не затерли данные
    const locked = await redis.set('crm:lock', '1', { nx: true, ex: 5 });
    if (!locked) return json(res, 503, { error: 'Подождите секунду, попробуйте ещё раз' });

    try {
      clients = (await redis.get(KEY)) || [];
      if (typeof clients === 'string') clients = JSON.parse(clients);
      if (!Array.isArray(clients)) clients = [];

      // GET /api/clients — список всех клиентов
      if (req.method === 'GET') {
        return json(res, 200, clients);
      }

      // POST /api/clients — добавить клиента
      if (req.method === 'POST') {
        const c = sanitize({ ...req.body, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
        if (!c.name) return json(res, 400, { error: 'Имя обязательно' });
        clients.push(c);
        await redis.set(KEY, clients);
        return json(res, 201, c);
      }

      // PUT /api/clients — обновить клиента (по id)
      if (req.method === 'PUT') {
        const idx = clients.findIndex((x) => x.id === req.body.id);
        if (idx === -1) return json(res, 404, { error: 'Клиент не найден' });
        const updated = sanitize({ ...clients[idx], ...req.body, id: clients[idx].id });
        clients[idx] = updated;
        await redis.set(KEY, clients);
        return json(res, 200, updated);
      }

      // DELETE /api/clients?id=xxx — удалить клиента
      if (req.method === 'DELETE') {
        const before = clients.length;
        clients = clients.filter((x) => x.id !== req.query.id);
        if (clients.length === before) return json(res, 404, { error: 'Клиент не найден' });
        await redis.set(KEY, clients);
        return json(res, 200, { ok: true });
      }

      return json(res, 405, { error: 'Метод не поддерживается' });
    } finally {
      await redis.del('crm:lock').catch(() => {});
    }
  } catch (e) {
    return json(res, 500, { error: e.message || 'Ошибка сервера' });
  }
}
