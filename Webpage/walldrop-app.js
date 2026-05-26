/* WallDrop — gallery UI, filters, lightbox, downloads */
(function () {
  const STORAGE_KEY = 'walldrop_v3';
  const DOWNLOAD_BASELINE = 1240;
  const BASELINE_KEY = 'walldrop_dl_baseline_v1';

  const cards = () => [...document.querySelectorAll('.wall-card')];

  let state = { downloads: [], downloadsByImage: {}, wallCount: 0, totalDownloads: 0 };
  let activeCat = 'all';
  let activeDev = 'all';
  let activeVibe = 'all';
  let sortMode = 'default';
  let searchQuery = '';
  let galleryCount = 0;

  const lightbox = document.getElementById('wallLightbox');
  const lbImg = document.getElementById('lbImg');
  const lbTitle = document.getElementById('lbTitle');
  const lbSub = document.getElementById('lbSub');
  const lbDownload = document.getElementById('lbDownload');
  const lbFullPage = document.getElementById('lbFullPage');
  const lbClose = document.getElementById('lbClose');
  const lbBackdrop = document.getElementById('lbBackdrop');
  const lbQuality = document.getElementById('lbQuality');
  const lbWallHint = document.getElementById('lbWallHint');

  let lightboxIndex = null;
  let lightboxClosing = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function cardIndex(card) {
    return cards().indexOf(card);
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function ensureBaseline() {
    try {
      if (!localStorage.getItem(BASELINE_KEY)) {
        localStorage.setItem(BASELINE_KEY, String(DOWNLOAD_BASELINE));
      }
    } catch (e) {}
  }

  function getDisplayDownloads() {
    const local = state.totalDownloads || 0;
    let stored = DOWNLOAD_BASELINE;
    try {
      stored = parseInt(localStorage.getItem(BASELINE_KEY) || String(DOWNLOAD_BASELINE), 10);
    } catch (e) {}
    return stored + local;
  }

  function loadState() {
    const total = cards().length;
    const byImage = {};
    let totalDownloads = 0;
    try {
      let s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!s) {
        const old = JSON.parse(localStorage.getItem('walldrop_v2'));
        if (old) s = old;
      }
      s = s || {};
      if (s.downloadsByImage && typeof s.downloadsByImage === 'object') {
        Object.assign(byImage, s.downloadsByImage);
      }
      if (Array.isArray(s.downloadKeys) && Array.isArray(s.downloads)) {
        s.downloadKeys.forEach((key, i) => {
          if (key) byImage[key] = (byImage[key] || 0) + (s.downloads[i] || 0);
        });
      }
      if (typeof s.totalDownloads === 'number') totalDownloads = s.totalDownloads;
    } catch (e) {}
    const downloads = cards().map((c) => byImage[c.dataset.image] || 0);
    const sum = downloads.reduce((a, b) => a + b, 0);
    if (!totalDownloads) totalDownloads = sum;
    return { downloads, downloadsByImage: byImage, wallCount: total, totalDownloads };
  }

  function saveState(s) {
    const downloadsByImage = {};
    const downloadKeys = [];
    cards().forEach((card, i) => {
      const key = card.dataset.image;
      downloadKeys.push(key);
      downloadsByImage[key] = s.downloads[i] || 0;
    });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          downloads: s.downloads,
          downloadsByImage,
          downloadKeys,
          totalDownloads: s.totalDownloads || 0
        })
      );
    } catch (e) {}
  }

  function cardMatches(card) {
    const cat = card.dataset.cat;
    const dev = card.dataset.dev;
    const title = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
    const vibes = (card.dataset.vibes || '').toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase();
    const catOk = activeCat === 'all' || cat === activeCat;
    const devOk = activeDev === 'all' || dev === activeDev;
    const vibeOk =
      activeVibe === 'all' ||
      vibes.split(',').some((v) => v.trim() === activeVibe) ||
      tags.includes(activeVibe);
    const q = searchQuery.toLowerCase();
    const searchOk =
      !q ||
      title.includes(q) ||
      cat.includes(q) ||
      vibes.includes(q) ||
      tags.includes(q) ||
      (card.dataset.res || '').toLowerCase().includes(q);
    return catOk && devOk && vibeOk && searchOk;
  }

  function sortCards() {
    const gallery = document.getElementById('gallery');
    const emptyEl = document.getElementById('emptyState');
    if (!gallery || sortMode !== 'popular') return;

    const list = cards().slice();
    list.sort((a, b) => {
      const da = state.downloads[cardIndex(a)] || 0;
      const db = state.downloads[cardIndex(b)] || 0;
      return db - da;
    });
    list.forEach((card) => gallery.insertBefore(card, emptyEl));
  }

  function applyFilters(animateSearch) {
    const gallery = document.getElementById('gallery');
    const q = searchQuery.trim().toLowerCase();
    let visible = 0;

    if (sortMode === 'popular') sortCards();

    cards().forEach((card) => {
      const show = cardMatches(card);
      card.classList.toggle('hidden', !show);
      card.classList.remove('is-search-hit');
      if (show) visible++;
    });

    if (gallery) gallery.classList.toggle('is-searching', !!q);

    if (animateSearch && q) {
      requestAnimationFrame(() => {
        let hitIndex = 0;
        cards().forEach((card) => {
          if (card.classList.contains('hidden')) return;
          card.classList.add('is-search-hit');
          card.style.setProperty('--pop-delay', Math.min(hitIndex * 0.06, 0.36) + 's');
          hitIndex++;
        });
      });
    }

    const emptyEl = document.getElementById('emptyState');
    const total = galleryCount || cards().length;
    if (total === 0) return;

    emptyEl.classList.toggle('visible', visible === 0);
    if (visible === 0) {
      emptyEl.querySelector('.empty-title').textContent = 'No wallpapers found';
      emptyEl.querySelector('p').textContent = 'Try a different search, color vibe, or filter.';
      const hint = emptyEl.querySelector('.empty-hint');
      if (hint) hint.style.display = 'none';
    }

    updateUploadedCount();
  }

  function updateUploadedCount() {
    const el = document.getElementById('wall-count');
    const count = galleryCount || cards().length;
    if (el) el.textContent = fmtNum(count);
  }

  function updateFilterBar() {
    const fs = document.getElementById('filterSection');
    if (fs) fs.classList.toggle('is-disabled', (galleryCount || cards().length) === 0);
  }

  function renderStats(animate) {
    const total = galleryCount || cards().length;
    const totalDl = getDisplayDownloads();
    state.wallCount = total;
    updateFilterBar();

    document.querySelectorAll('[data-dlkey]').forEach((el) => {
      const i = +el.dataset.dlkey;
      const n = state.downloads[i] || 0;
      el.textContent = n === 0 ? '0 dls' : fmtNum(n) + ' dls';
    });

    const dlEl = document.getElementById('dl-count');
    if (animate && totalDl > 0) {
      animateNum(dlEl, totalDl);
    } else if (dlEl) {
      dlEl.textContent = fmtNum(totalDl);
    }
    updateUploadedCount();
    applyFilters(false);
  }

  function animateNum(el, target) {
    if (!el) return;
    const dur = 800;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const val = Math.round(target * easeOut(p));
      el.textContent = fmtNum(val);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function slugFilename(title, ext) {
    return title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + ext;
  }

  function recordDownload(index, title) {
    const card = cards()[index];
    const key = card && card.dataset.image;
    state.downloads[index] = (state.downloads[index] || 0) + 1;
    if (key) {
      state.downloadsByImage = state.downloadsByImage || {};
      state.downloadsByImage[key] = state.downloads[index];
    }
    state.totalDownloads = (state.totalDownloads || 0) + 1;
    saveState(state);
    renderStats(false);
    showToast('Downloaded · ' + title);
  }

  function deviceLabel(dev) {
    if (dev === 'mobile') return 'Mobile';
    if (dev === 'mac') return 'Mac';
    return 'Desktop';
  }

  function getQualityTarget(quality, naturalW, naturalH, device) {
    if (quality === '1080p') return { w: 1920, h: 1080 };
    if (quality === 'mac') return { w: 3024, h: 1964 };
    if (quality === 'mobile') {
      if (device === 'mobile') return { w: 1284, h: 2778 };
      return { w: 1170, h: 2532 };
    }
    return { w: naturalW, h: naturalH };
  }

  function resizeBlob(blob, targetW, targetH, naturalW, naturalH) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, targetW, targetH);
        const scale = Math.min(targetW / naturalW, targetH / naturalH);
        const dw = Math.round(naturalW * scale);
        const dh = Math.round(naturalH * scale);
        const ox = Math.floor((targetW - dw) / 2);
        const oy = Math.floor((targetH - dh) / 2);
        ctx.drawImage(img, ox, oy, dw, dh);
        canvas.toBlob(
          (b) => {
            URL.revokeObjectURL(url);
            if (b) resolve(b);
            else reject(new Error('canvas'));
          },
          blob.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('img'));
      };
      img.src = url;
    });
  }

  function downloadImageFile(src, title, index, quality) {
    const card = cards()[index];
    const device = (card && card.dataset.dev) || 'desktop';
    const q = quality || (lbQuality ? lbQuality.value : 'original');

    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error('fetch');
        return r.blob();
      })
      .then(async (blob) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = url;
        });
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        URL.revokeObjectURL(url);

        let out = blob;
        if (q !== 'original') {
          const target = getQualityTarget(q, nw, nh, device);
          out = await resizeBlob(blob, target.w, target.h, nw, nh);
        }

        const ext = q === 'original' ? (src.match(/\.\w+$/) || ['.jpg'])[0] : '.jpg';
        const suffix = q === 'original' ? '' : '-' + q;
        const dlUrl = URL.createObjectURL(out);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = slugFilename(title, ext).replace('-walldrop', '-walldrop' + suffix);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(dlUrl);
        recordDownload(index, title);
      })
      .catch(() => showToast('Download failed — check image path'));
  }

  function downloadWallpaper(index) {
    const card = cards()[index];
    if (!card) return;
    const title = card.querySelector('.card-title').textContent.trim();
    const imageSrc = card.dataset.image;
    if (!imageSrc) {
      showToast('No image file for this wallpaper');
      return;
    }
    const quality = lbQuality ? lbQuality.value : 'original';
    downloadImageFile(imageSrc, title, index, quality);
  }

  function markDownloadBtn(btn) {
    btn.textContent = '✓ Saved';
    btn.classList.add('done');
    setTimeout(() => {
      btn.textContent = '↓ Download';
      btn.classList.remove('done');
    }, 1800);
  }

  function triggerDownload(index, btn) {
    downloadWallpaper(index);
    if (btn) markDownloadBtn(btn);
  }

  function wallpaperHintText() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'Tap Share, then “Use as Wallpaper”.';
    }
    if (/Android/i.test(ua)) {
      return 'Open the download, tap ⋮, then “Set as wallpaper”.';
    }
    if (/Macintosh|Mac OS X/i.test(ua)) {
      return 'Open the image → System Settings → Wallpaper → Add Photo.';
    }
    return 'Right-click the saved image → “Set as desktop background”.';
  }

  function updateWallHint() {
    if (lbWallHint) lbWallHint.textContent = wallpaperHintText();
  }

  function openLightbox(index) {
    const card = cards()[index];
    if (!card || card.classList.contains('hidden') || lightboxClosing) return;
    const src = card.dataset.image;
    const img = card.querySelector('.wall-thumb-inner img');
    if (!src || !img) return;

    lightboxIndex = index;
    lbImg.classList.remove('is-ready');
    lbImg.onload = function () {
      lbImg.classList.add('is-ready');
    };
    if (lbImg.src !== new URL(src, location.href).href) lbImg.src = src;
    else if (lbImg.complete) lbImg.classList.add('is-ready');
    lbImg.alt = card.querySelector('.card-title').textContent;
    lbTitle.textContent = card.querySelector('.card-title').textContent;
    lbSub.textContent =
      (card.dataset.res || '') +
      ' · ' +
      (card.dataset.cat || '') +
      ' · ' +
      deviceLabel(card.dataset.dev || 'desktop');
    if (card.dataset.viewUrl) lbFullPage.href = card.dataset.viewUrl;
    if (lbQuality) lbQuality.value = 'original';
    updateWallHint();

    card.classList.add('is-launching');
    setTimeout(() => card.classList.remove('is-launching'), reducedMotion ? 0 : 380);

    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (reducedMotion) {
      lightbox.classList.add('is-open');
      return;
    }
    lightbox.classList.remove('is-open');
    void lightbox.offsetWidth;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('is-open') || lightboxClosing) return;
    lightboxClosing = true;
    lightbox.classList.remove('is-open');
    const wait = reducedMotion ? 0 : 420;
    setTimeout(() => {
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbImg.removeAttribute('src');
      lbImg.classList.remove('is-ready');
      lightboxIndex = null;
      lightboxClosing = false;
    }, wait);
  }

  function bindCardInteractions() {
    cards().forEach((card, i) => {
      const thumb = card.querySelector('.wall-thumb');
      if (thumb) {
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          openLightbox(i);
        });
      }
    });
  }

  function scrollToGallery() {
    const el = document.getElementById('gallery') || document.getElementById('filterSection');
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function runSearch(animate) {
    searchQuery = document.querySelector('.search-wrap input')?.value.trim() || '';
    if ((galleryCount || cards().length) === 0) {
      if (searchQuery) showToast('No wallpapers in gallery yet');
      return;
    }
    applyFilters(animate !== false);
  }

  let searchInputTimer;

  function onSearchInput() {
    clearTimeout(searchInputTimer);
    searchInputTimer = setTimeout(() => runSearch(true), 70);
  }

  function bootWallDrop(ev) {
    ensureBaseline();
    galleryCount = (ev && ev.detail && ev.detail.count) || cards().length;
    state = loadState();
    bindCardInteractions();
    renderStats(true);
    updateWallHint();
  }

  /* Event bindings */
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);
  if (lbDownload) {
    lbDownload.addEventListener('click', () => {
      if (lightboxIndex !== null) triggerDownload(lightboxIndex, lbDownload);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) closeLightbox();
  });

  const filtersEl = document.getElementById('filters');
  if (filtersEl) {
    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn || btn.classList.contains('vibe-swatch')) return;
      document.querySelectorAll('#filters .pill:not(.vibe-swatch)').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      sortMode = 'default';
      applyFilters(false);
    });
  }

  const vibeRow = document.getElementById('vibeFilters');
  if (vibeRow) {
    vibeRow.addEventListener('click', (e) => {
      const sw = e.target.closest('.vibe-swatch');
      if (!sw) return;
      vibeRow.querySelectorAll('.vibe-swatch').forEach((b) => b.classList.remove('active'));
      sw.classList.add('active');
      activeVibe = sw.dataset.vibe || 'all';
      applyFilters(false);
    });
  }

  const deviceGroup = document.getElementById('deviceGroup');
  if (deviceGroup) {
    deviceGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.device-pill');
      if (!btn) return;
      deviceGroup.querySelectorAll('.device-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeDev = btn.dataset.dev;
      applyFilters(false);
    });
  }

  const searchBtn = document.querySelector('.search-btn');
  const searchInput = document.querySelector('.search-wrap input');
  if (searchBtn) searchBtn.addEventListener('click', () => runSearch(true));
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearch(true);
    });
    searchInput.addEventListener('input', onSearchInput);
  }

  document.querySelectorAll('.nav-links a[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const nav = a.dataset.nav;
      document.querySelectorAll('.nav-links a').forEach((l) => l.classList.remove('active'));
      a.classList.add('active');
      if (nav === 'collections') {
        sortMode = 'default';
        activeCat = 'all';
        activeVibe = 'all';
        document.querySelectorAll('#filters .pill:not(.vibe-swatch)').forEach((b) => {
          b.classList.toggle('active', b.dataset.cat === 'all');
        });
        if (vibeRow) {
          vibeRow.querySelectorAll('.vibe-swatch').forEach((b) => {
            b.classList.toggle('active', b.dataset.vibe === 'all');
          });
        }
        scrollToGallery();
        applyFilters(false);
        showToast('All collections');
      } else if (nav === 'popular') {
        sortMode = 'popular';
        scrollToGallery();
        applyFilters(false);
        showToast('Sorted by downloads');
      }
    });
  });

  window.addEventListener('walldrop:gallery-ready', bootWallDrop);
  if (typeof initWallDropGallery === 'function') {
    initWallDropGallery();
  } else {
    bootWallDrop({ detail: { count: cards().length } });
  }
})();
