// Диагностика: проверка подключения к базе и переменных окружения.
// Открытый GET /api/status — безопасен: секреты не отдаются, только статус.
import { readClients, dbConfigured } from './_db.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const result = {
    time: new Date().toISOString(),
    deploymentEnv: process.env.VERCEL_ENV || 'local',
    blobToken: dbConfigured() ? 'SET' : 'NOT SET',
    readTest: null,
  };

  if (dbConfigured()) {
    try {
      const clients = await readClients();
      result.readTest = { ok: true, clientsCount: clients.length };
    } catch (e) {
      result.readTest = { ok: false, error: e.message };
    }
  }

  res.status(200).json(result);
}
