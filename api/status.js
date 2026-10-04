// Диагностика: проверка подключения к базе и переменных окружения.
// Открытый GET /api/status — безопасен: секреты не отдаются, только статус.
export const config = { runtime: 'nodejs' };

const ENV_KEYS = [
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'KV_URL',
  'KV_REST_API_READ_ONLY_TOKEN',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const envStatus = {};
  for (const k of ENV_KEYS) {
    const v = process.env[k];
    envStatus[k] = v ? `SET (${String(v).slice(0, 12)}...)` : 'NOT SET';
  }

  const result = {
    time: new Date().toISOString(),
    nodeVersion: process.version,
    deploymentEnv: process.env.VERCEL_ENV || 'local',
    envStatus,
    redisTest: null,
  };

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/get/crm:clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      result.redisTest = { ok: r.ok, httpStatus: r.status };
      if (!r.ok) {
        result.redisTest.body = (await r.text()).slice(0, 200);
      }
    } catch (e) {
      result.redisTest = { ok: false, error: e.message };
    }
  } else {
    result.redisTest = { ok: false, error: 'KV variables not set' };
  }

  res.status(200).json(result);
}
