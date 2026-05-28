/* WallDrop — gallery UI, filters, downloads */
(function () {
  const POPULAR_LIMIT = 10;
  const dl = () => window.WallDropDownloads;

  const cards = () => [...document.querySelectorAll('.wall-card')];

  let state = { downloadsByImage: {}, totalDownloads: 0 };
  let activeCat = 'all';
  let activeDev = 'all';
  let sortMode = 'default';
  let searchQuery = '';
  let galleryCount = 0;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isMobileUa() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }

  function initMobileExperience() {
    const mobile = isMobileUa() || window.matchMedia('(max-width: 768px)').matches;
    document.documentElement.classList.toggle('is-mobile', mobile);
    if (!mobile) return;
    const group = document.getElementById('deviceGroup');
    if (!group) return;
    group.querySelectorAll('.device-pill').forEach((b) => {
      b.classList.toggle('active', b.dataset.dev === 'mobile');
    });
    activeDev = 'mobile';
  }

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function downloadCountForCard(card) {
    if (!card || !dl()) return 0;
    return dl().countForImage(state, card.dataset.image);
  }

  function rebuildDownloadsArray() {
    state.downloads = cards().map((c) => downloadCountForCard(c));
  }

  function cardMatches(card) {
    const cat = card.dataset.cat;
    const dev = card.dataset.dev;
    const title = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
    const vibes = (card.dataset.vibes || '').toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase();
    const catOk = activeCat === 'all' || cat === activeCat;
    const devOk = activeDev === 'all' || dev === activeDev;
    const q = searchQuery.toLowerCase();
    const searchOk =
      !q ||
      title.includes(q) ||
      cat.includes(q) ||
      vibes.includes(q) ||
      tags.includes(q) ||
      (card.dataset.res || '').toLowerCase().includes(q);
    return catOk && devOk && searchOk;
  }

  function sortCardsPopular() {
    const gallery = document.getElementById('gallery');
    const emptyEl = document.getElementById('emptyState');
    if (!gallery || sortMode !== 'popular') return;

    const list = cards().slice();
    list.sort((a, b) => {
      const da = downloadCountForCard(a);
      const db = downloadCountForCard(b);
      if (db !== da) return db - da;
      return (+a.dataset.index || 0) - (+b.dataset.index || 0);
    });
    list.forEach((card) => gallery.insertBefore(card, emptyEl));
  }

  function applyFilters(animateSearch) {
    const gallery = document.getElementById('gallery');
    const q = searchQuery.trim().toLowerCase();
    let visible = 0;

    if (sortMode === 'popular') {
      sortCardsPopular();
      // In popular mode, don't use pagination - show all popular wallpapers
      let popularShown = 0;
      cards().forEach((card) => {
        let show = cardMatches(card);
        if (show && sortMode === 'popular') {
          if (popularShown >= POPULAR_LIMIT) show = false;
          else popularShown++;
        }
        card.classList.toggle('hidden', !show);
        card.classList.remove('is-search-hit');
        if (show) visible++;
      });
    } else {
      // Normal mode with pagination
      if (typeof window.applyGalleryFilters === 'function') {
        window.applyGalleryFilters();
      }
      cards().forEach((card) => {
        let show = cardMatches(card);
        card.classList.toggle('hidden', !show);
        card.classList.remove('is-search-hit');
        if (show) visible++;
      });
    }

    if (gallery) gallery.classList.toggle('is-searching', !!q);

    if (animateSearch && q && sortMode !== 'popular') {
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
      emptyEl.querySelector('.empty-title').textContent =
        sortMode === 'popular' ? 'No downloads yet' : 'No wallpapers found';
      emptyEl.querySelector('p').textContent =
        sortMode === 'popular'
          ? 'Download wallpapers to build the popular list.'
          : 'Try a different search or filter.';
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
    galleryCount = galleryCount || cards().length;
    state.wallCount = galleryCount;
    updateFilterBar();

    document.querySelectorAll('[data-dlkey]').forEach((el) => {
      const card = el.closest('.wall-card');
      const n = card ? downloadCountForCard(card) : 0;
      el.textContent = n === 0 ? '0 dls' : fmtNum(n) + ' dls';
    });

    const totalDl = state.totalDownloads || 0;
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
      el.textContent = fmtNum(Math.round(target * easeOut(p)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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

  async function bootWallDrop(ev) {
    initMobileExperience();
    galleryCount = (ev && ev.detail && ev.detail.count) || cards().length;
    if (dl()) {
      state = await dl().syncFromServer();
    } else {
      state = { downloadsByImage: {}, totalDownloads: 0 };
    }
    rebuildDownloadsArray();
    renderStats(true);
  }

  const filtersEl = document.getElementById('filters');
  if (filtersEl) {
    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      document.querySelectorAll('#filters .pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      sortMode = 'default';
      if (typeof window.applyGalleryFilters === 'function') {
        window.applyGalleryFilters();
      }
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
      if (typeof window.applyGalleryFilters === 'function') {
        window.applyGalleryFilters();
      }
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
        activeDev = isMobileUa() ? 'mobile' : 'all';
        document.querySelectorAll('#filters .pill').forEach((b) => {
          b.classList.toggle('active', b.dataset.cat === 'all');
        });
        if (deviceGroup) {
          deviceGroup.querySelectorAll('.device-pill').forEach((b) => {
            b.classList.toggle('active', b.dataset.dev === activeDev);
          });
        }
        scrollToGallery();
        applyFilters(false);
        showToast('All collections');
      } else if (nav === 'popular') {
        sortMode = 'popular';
        activeCat = 'all';
        activeDev = 'all';
        document.querySelectorAll('#filters .pill').forEach((b) => {
          b.classList.toggle('active', b.dataset.cat === 'all');
        });
        if (deviceGroup) {
          deviceGroup.querySelectorAll('.device-pill').forEach((b) => {
            b.classList.toggle('active', b.dataset.dev === 'all');
          });
        }
        scrollToGallery();
        applyFilters(false);
        showToast('Top 10 most downloaded');
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
