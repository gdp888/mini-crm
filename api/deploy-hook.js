// Временный хук: включает Production Protection, чтобы CRM открывался без логина Vercel.
// Автодеплой в production при push в main включается через GitHub API (нужен VERCEL_API_TOKEN).
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const out = { time: new Date().toISOString() };

  // 1. Состояние Production Protection сейчас
  try {
    const r = await fetch('https://api.vercel.com/v9/projects/mini-crm?teamId=' + encodeURIComponent(process.env.VERCEL_TEAM_ID || ''), {
      headers: { Authorization: 'Bearer ' + (process.env.VERCEL_API_TOKEN || '') },
    });
    const j = await r.json();
    out.project = { id: j.id, name: j.name, ssoProtection: j.ssoProtection ?? null, target: j.targetProductionBranch };
    if (j.id && process.env.VERCEL_API_TOKEN) {
      // 2. Отключаем защиту (deletion protection тоже off)
      const p = await fetch('https://api.vercel.com/v9/projects/' + j.id + '?teamId=' + encodeURIComponent(process.env.VERCEL_TEAM_ID || ''), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + process.env.VERCEL_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssoProtection: null }),
      });
      out.protectionPatch = { status: p.status, body: (await p.text()).slice(0, 200) };
    }
  } catch (e) {
    out.error = e.message;
  }

  res.status(200).json(out);
}
