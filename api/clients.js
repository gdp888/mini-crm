// Мини CRM — серверный API (Vercel Serverless Function)
// Хранение: Vercel Blob. Подключается в дашборде Vercel в 1 клик
// (Storage → Blob storage → Create), переменная BLOB_READ_WRITE_TOKEN добавляется автоматически.
import { readClients, writeClients, dbConfigured } from './_db.js';

export const config = { runtime: 'nodejs' };

function json(res, status, data) {
  res.status(status).json(data);
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

  if (!dbConfigured()) {
    return json(res, 500, {
      error: 'База данных не подключена. На Vercel: Project → Storage → Blob storage → Create → Connect, затем redeploy.',
    });
  }

  try {
    const clients = await readClients();

    // GET /api/clients — список всех клиентов
    if (req.method === 'GET') {
      return json(res, 200, clients);
    }

    // POST /api/clients — добавить клиента
    if (req.method === 'POST') {
      const c = sanitize({ ...req.body, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
      if (!c.name) return json(res, 400, { error: 'Имя обязательно' });
      clients.push(c);
      await writeClients(clients);
      return json(res, 201, c);
    }

    // PUT /api/clients — обновить клиента (по id)
    if (req.method === 'PUT') {
      const idx = clients.findIndex((x) => x.id === req.body.id);
      if (idx === -1) return json(res, 404, { error: 'Клиент не найден' });
      const updated = sanitize({ ...clients[idx], ...req.body, id: clients[idx].id });
      clients[idx] = updated;
      await writeClients(clients);
      return json(res, 200, updated);
    }

    // DELETE /api/clients?id=xxx — удалить клиента
    if (req.method === 'DELETE') {
      const before = clients.length;
      const filtered = clients.filter((x) => x.id !== req.query.id);
      if (filtered.length === before) return json(res, 404, { error: 'Клиент не найден' });
      await writeClients(filtered);
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: 'Метод не поддерживается' });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Ошибка сервера' });
  }
}
