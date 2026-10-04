// Мини CRM — серверный API (Vercel Serverless Function)
// Хранение: Upstash Redis (env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
import { Redis } from '@upstash/redis';

const KEY = 'crm:clients';

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  // CORS (для локальной разработки)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return json(res, 500, { error: 'Не настроена база данных. Добавьте UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN в переменные окружения Vercel.' });
  }

  const redis = new Redis({ url, token });

  let clients = [];
  try {
    clients = (await redis.get(KEY)) || [];
    if (typeof clients === 'string') clients = JSON.parse(clients);
  } catch {
    clients = [];
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

  try {
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
      const updated = sanitize({ ...clients[idx], ...req.body });
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
  } catch (e) {
    return json(res, 500, { error: e.message || 'Ошибка сервера' });
  }

  return json(res, 405, { error: 'Метод не поддерживается' });
}
