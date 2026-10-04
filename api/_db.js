// Общий доступ к базе данных (Vercel Blob — подключается в 1 клик, без внешних регистраций)
import { put, list } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

const BLOB_KEY = 'mini-crm/clients.json';

export function dbConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readClients() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeClients(clients) {
  // handleIfMatch: 'discard' — просто перезаписать, блокировки не нужны
  await put(BLOB_KEY, JSON.stringify(clients), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    handleIfMatch: 'discard',
  });
}
