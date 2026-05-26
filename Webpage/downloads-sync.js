/* Shared download counts — syncs with /api/downloads when storage is configured */
(function (global) {
  const STORAGE_KEY = 'walldrop_v4';
  const API = '/api/downloads';

  function emptyStats() {
    return { downloadsByImage: {}, totalDownloads: 0 };
  }

  function sumByImage(byImage) {
    return Object.values(byImage || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  }

  function normalizeStats(raw) {
    const byImage =
      raw && raw.downloadsByImage && typeof raw.downloadsByImage === 'object'
        ? raw.downloadsByImage
        : {};
    const total =
      typeof raw?.totalDownloads === 'number' ? raw.totalDownloads : sumByImage(byImage);
    return { downloadsByImage: byImage, totalDownloads: total };
  }

  function loadLocal() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return normalizeStats(s);
    } catch {
      return emptyStats();
    }
  }

  function saveLocal(stats) {
    const normalized = normalizeStats(stats);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          downloadsByImage: normalized.downloadsByImage,
          totalDownloads: normalized.totalDownloads
        })
      );
    } catch (e) {}
    return normalized;
  }

  function mergeStats(a, b) {
    const merged = emptyStats();
    const keys = new Set([
      ...Object.keys(a.downloadsByImage || {}),
      ...Object.keys(b.downloadsByImage || {})
    ]);
    keys.forEach((k) => {
      merged.downloadsByImage[k] = Math.max(a.downloadsByImage[k] || 0, b.downloadsByImage[k] || 0);
    });
    merged.totalDownloads = sumByImage(merged.downloadsByImage);
    return merged;
  }

  async function fetchServer() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) return null;
      return normalizeStats(await res.json());
    } catch {
      return null;
    }
  }

  async function syncFromServer() {
    const server = await fetchServer();
    const local = loadLocal();
    if (!server) return saveLocal(local);
    const merged = mergeStats(server, local);
    const needsUpload = JSON.stringify(merged.downloadsByImage) !== JSON.stringify(server.downloadsByImage);
    if (needsUpload) {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, downloadsByImage: merged.downloadsByImage })
        });
        if (res.ok) return saveLocal(normalizeStats(await res.json()));
      } catch (e) {}
    }
    return saveLocal(merged);
  }

  async function recordDownload(imagePath) {
    const key = String(imagePath || '').trim();
    if (!key) return loadLocal();

    let stats = loadLocal();
    stats.downloadsByImage[key] = (stats.downloadsByImage[key] || 0) + 1;
    stats.totalDownloads = sumByImage(stats.downloadsByImage);
    saveLocal(stats);

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: key })
      });
      const data = await res.json();
      if (res.ok && data.downloadsByImage) {
        return saveLocal(data);
      }
      if (data && data.stats) {
        return saveLocal(mergeStats(stats, data.stats));
      }
    } catch (e) {}

    return stats;
  }

  function countForImage(stats, imagePath) {
    if (!imagePath) return 0;
    return stats.downloadsByImage[imagePath] || 0;
  }

  global.WallDropDownloads = {
    loadLocal,
    saveLocal,
    syncFromServer,
    recordDownload,
    countForImage,
    sumByImage,
    normalizeStats
  };
})(window);
