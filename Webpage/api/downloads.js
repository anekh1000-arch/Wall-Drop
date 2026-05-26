'use strict';

const BLOB_PATH = 'downloads-stats.json';
const REDIS_KEY = 'walldrop:downloads';

function emptyStats() {
  return { downloadsByImage: {}, totalDownloads: 0 };
}

function sumStats(byImage) {
  return Object.values(byImage || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

function normalizeStats(raw) {
  const byImage =
    raw && raw.downloadsByImage && typeof raw.downloadsByImage === 'object' ? raw.downloadsByImage : {};
  const total =
    typeof raw?.totalDownloads === 'number' ? raw.totalDownloads : sumStats(byImage);
  return { downloadsByImage: byImage, totalDownloads: total };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readFromUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(['GET', REDIS_KEY])
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return emptyStats();
  try {
    return normalizeStats(JSON.parse(data.result));
  } catch {
    return emptyStats();
  }
}

async function writeToUpstash(stats) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(['SET', REDIS_KEY, JSON.stringify(stats)])
  });
  return res.ok;
}

async function readFromBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { list } = await import('@vercel/blob');
    const items = await list({ prefix: BLOB_PATH, token });
    const match = items.blobs.find((b) => b.pathname === BLOB_PATH);
    if (!match?.url) return null;
    const res = await fetch(match.url, { cache: 'no-store' });
    if (!res.ok) return null;
    return normalizeStats(await res.json());
  } catch {
    return null;
  }
}

async function writeToBlob(stats) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(stats), {
      access: 'public',
      addRandomSuffix: false,
      token,
      contentType: 'application/json'
    });
    return true;
  } catch {
    return false;
  }
}

async function readStats() {
  return (await readFromUpstash()) || (await readFromBlob()) || emptyStats();
}

async function writeStats(stats) {
  if (await writeToUpstash(stats)) return true;
  return writeToBlob(stats);
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const stats = await readStats();
    return res.status(200).json(stats);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    if (body && body.bulk && body.downloadsByImage) {
      const current = await readStats();
      const incoming = normalizeStats(body);
      const merged = { downloadsByImage: {}, totalDownloads: 0 };
      const keys = new Set([
        ...Object.keys(current.downloadsByImage),
        ...Object.keys(incoming.downloadsByImage)
      ]);
      keys.forEach((k) => {
        merged.downloadsByImage[k] = Math.max(
          current.downloadsByImage[k] || 0,
          incoming.downloadsByImage[k] || 0
        );
      });
      merged.totalDownloads = sumStats(merged.downloadsByImage);
      const saved = await writeStats(merged);
      if (!saved) {
        return res.status(503).json({ error: 'storage_unavailable', stats: merged });
      }
      return res.status(200).json(merged);
    }

    const image = body && body.image ? String(body.image).trim() : '';
    if (!image) return res.status(400).json({ error: 'image required' });

    const stats = await readStats();
    stats.downloadsByImage[image] = (stats.downloadsByImage[image] || 0) + 1;
    stats.totalDownloads = sumStats(stats.downloadsByImage);

    const saved = await writeStats(stats);
    if (!saved) {
      return res.status(503).json({
        error: 'storage_unavailable',
        message: 'Connect Upstash Redis or Vercel Blob for shared download counts.',
        stats
      });
    }
    return res.status(200).json(stats);
  }

  return res.status(405).json({ error: 'method not allowed' });
};
