(function () {
  const DEVICE_TAGS = {
    desktop: ['Desktop'],
    mobile: ['Mobile'],
    mac: ['Mac']
  };

  const FALLBACK_RES = {
    desktop: '3840×2160',
    mobile: '1284×2778',
    mac: '3024×1964'
  };

  const VALID_DEVICES = new Set(['desktop', 'mobile', 'mac']);
  const CARD_CHUNK = 24;
  const EAGER_COUNT = 20;
  const LAZY_ROOT_MARGIN = '1400px 0px';
  const ITEMS_PER_PAGE = 18;

  let lazyObserver = null;
  let scrollPrimeBound = false;
  let currentPage = 1;
  let filteredItems = [];
  let allItems = [];

  function formatRes(w, h) {
    return w + '\u00d7' + h;
  }

  function ensureLazyObserver() {
    if (lazyObserver) return lazyObserver;
    lazyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          var src = img.dataset.src;
          if (!src || img.getAttribute('src')) return;
          img.src = src;
          lazyObserver.unobserve(img);
        });
      },
      { rootMargin: LAZY_ROOT_MARGIN, threshold: 0.01 }
    );
    return lazyObserver;
  }

  function primeImage(img) {
    var src = img.dataset.src;
    if (!src || img.getAttribute('src')) return;
    img.src = src;
    if (lazyObserver) lazyObserver.unobserve(img);
  }

  function primeNearbyImages() {
    var ahead = Math.max(window.innerHeight * 1.25, 900);
    document.querySelectorAll('.wall-card:not(.hidden) img[data-src]').forEach(function (img) {
      var card = img.closest('.wall-card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      if (r.top < ahead && r.bottom > -ahead) primeImage(img);
    });
  }

  function bindScrollPrime() {
    if (scrollPrimeBound) return;
    scrollPrimeBound = true;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        primeNearbyImages();
        if (window.WallDropReveal && typeof window.WallDropReveal.flushCards === 'function') {
          window.WallDropReveal.flushCards();
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  function applyNaturalSize(card, img, item) {
    var w = img.naturalWidth;
    var h = img.naturalHeight;
    if (!w || !h) return;

    var res = formatRes(w, h);
    card.dataset.res = res;
    card.dataset.width = String(w);
    card.dataset.height = String(h);
    card.style.setProperty('--wall-ar', w + ' / ' + h);

    var badge = card.querySelector('.res-badge');
    if (badge) badge.textContent = res;

    var viewUrl = buildViewUrl(
      {
        title: item.title,
        category: item.category,
        device: item.device,
        resolution: res,
        width: w,
        height: h
      },
      card.dataset.index,
      card.dataset.image
    );
    card.dataset.viewUrl = viewUrl;
  }

  function deviceTags(dev) {
    return DEVICE_TAGS[dev] || [dev];
  }

  function resolveImagePath(item) {
    if (!item.image) return null;
    var raw = String(item.image).replace(/\\/g, '/').trim();
    if (!raw) return null;

    var dev = VALID_DEVICES.has(item.device) ? item.device : null;
    if (!dev) return null;

    if (raw.indexOf('/') === -1) {
      return 'images/wallpapers/' + dev + '/' + raw;
    }

    // Support subfolders like "dark/foo.jpg" (desktop/mobile categorization)
    if (!raw.startsWith('images/')) {
      raw = 'images/wallpapers/' + dev + '/' + raw.replace(/^\/+/, '');
    }

    if (raw.indexOf('/wallpapers/' + dev + '/') === -1) {
      console.warn(
        'WallDrop: "' + item.title + '" should use images/wallpapers/' + dev + '/ — check image path'
      );
    }
    return raw;
  }

  function isValidItem(item) {
    if (!item.title || !item.category) return false;
    if (!VALID_DEVICES.has(item.device)) {
      console.warn('WallDrop: skipped "' + (item.title || '?') + '" — device must be desktop, mobile, or mac');
      return false;
    }
    if (!resolveImagePath(item)) {
      console.warn('WallDrop: skipped "' + (item.title || '?') + '" — missing image');
      return false;
    }
    return true;
  }

  function buildViewUrl(item, index, imagePath) {
    const resolution = item.resolution || FALLBACK_RES[item.device];
    const q = new URLSearchParams();
    q.set('src', imagePath);
    q.set('title', item.title);
    q.set('cat', item.category);
    q.set('dev', item.device);
    q.set('res', resolution);
    q.set('i', String(index));
    if (item.width) q.set('w', String(item.width));
    if (item.height) q.set('h', String(item.height));
    return 'view.html?' + q.toString();
  }

  function isNewWallpaper(item) {
    if (!item.addedAt) return false;
    const addedDate = new Date(item.addedAt);
    const now = new Date();
    const daysDiff = (now - addedDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }

  function buildCard(item, index, eager) {
    const imagePath = resolveImagePath(item);
    const resolution =
      item.width && item.height
        ? formatRes(item.width, item.height)
        : item.resolution || FALLBACK_RES[item.device];
    const viewUrl = buildViewUrl(
      Object.assign({}, item, { resolution: resolution }),
      index,
      imagePath
    );
    const vibes = Array.isArray(item.vibes) ? item.vibes.join(',') : '';
    const tags = Array.isArray(item.tags) ? item.tags.join(',') : '';
    const isNew = isNewWallpaper(item);

    const card = document.createElement('div');
    card.className = 'wall-card';
    card.dataset.cat = item.category;
    card.dataset.dev = item.device;
    card.dataset.res = resolution;
    card.dataset.image = imagePath;
    card.dataset.viewUrl = viewUrl;
    card.dataset.index = String(index);
    if (vibes) card.dataset.vibes = vibes;
    if (tags) card.dataset.tags = tags;
    if (item.width) card.dataset.width = String(item.width);
    if (item.height) card.dataset.height = String(item.height);
    if (item.width && item.height) {
      card.style.setProperty('--wall-ar', item.width + ' / ' + item.height);
    }

    const thumbInner = document.createElement('div');
    thumbInner.className = 'wall-thumb-inner has-image is-loading';
    const skeleton = document.createElement('div');
    skeleton.className = 'thumb-skeleton';
    skeleton.setAttribute('aria-hidden', 'true');

    // Create picture element for WebP/JPEG fallback
    const picture = document.createElement('picture');
    
    const webpPath = imagePath.replace(/\.(jpg|jpeg|JPG|JPEG)$/i, '.webp');
    const source = document.createElement('source');
    source.srcset = webpPath;
    source.type = 'image/webp';
    
    // Generate srcset for responsive WebP images
    if (item.width && item.height) {
      const sizes = [
        { width: 640, height: Math.round(640 * (item.height / item.width)) },
        { width: 1280, height: Math.round(1280 * (item.height / item.width)) },
        { width: 1920, height: Math.round(1920 * (item.height / item.width)) }
      ];
      const webpSrcset = sizes
        .filter(s => s.width <= item.width)
        .map(s => `${webpPath} ${s.width}w`)
        .join(', ');
      if (webpSrcset) {
        source.srcset = webpSrcset;
      }
    }
    
    const img = document.createElement('img');
    img.alt =
      item.alt ||
      (item.title +
        ' ' +
        (item.device === 'mobile'
          ? 'mobile wallpaper'
          : item.device === 'mac'
            ? 'Mac wallpaper'
            : 'desktop wallpaper') +
        ' 4K');
    img.decoding = 'async';
    
    // Add explicit width/height to prevent CLS
    if (item.width && item.height) {
      img.width = item.width;
      img.height = item.height;
    }
    
    // Generate srcset for responsive JPEG images (fallback)
    if (item.width && item.height) {
      const sizes = [
        { width: 640, height: Math.round(640 * (item.height / item.width)) },
        { width: 1280, height: Math.round(1280 * (item.height / item.width)) },
        { width: 1920, height: Math.round(1920 * (item.height / item.width)) }
      ];
      const srcset = sizes
        .filter(s => s.width <= item.width)
        .map(s => `${imagePath} ${s.width}w`)
        .join(', ');
      if (srcset) {
        img.srcset = srcset;
        img.sizes = '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw';
      }
    }
    
    if (eager) {
      img.src = imagePath;
      img.loading = 'eager';
      if (index < 6) img.fetchPriority = 'high';
    } else {
      img.dataset.src = imagePath;
      img.loading = 'lazy';
      ensureLazyObserver().observe(img);
    }
    img.addEventListener('load', function () {
      thumbInner.classList.remove('is-loading');
      applyNaturalSize(card, img, item);
    });
    img.addEventListener('error', function () {
      thumbInner.classList.remove('is-loading');
      thumbInner.classList.add('is-error');
    });
    
    picture.appendChild(source);
    picture.appendChild(img);
    thumbInner.appendChild(skeleton);
    thumbInner.appendChild(picture);

    const tagsHtml = deviceTags(item.device)
      .map(function (t) {
        return '<span class="tag">' + t + '</span>';
      })
      .join('');

    const curated = item.curatedTag ? String(item.curatedTag) : '';

    const newBadge = isNew ? '<div class="new-badge">NEW</div>' : '';
    const shareButton = '<button class="share-btn" aria-label="Share wallpaper" data-share-url="' + escapeAttr(viewUrl) + '" data-share-title="' + escapeAttr(item.title) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>';

    card.innerHTML =
      '<a class="wall-card-link" href="' +
      escapeAttr(viewUrl) +
      '">' +
      '<div class="wall-thumb">' + newBadge + '</div>' +
      '<div class="res-badge">' +
      escapeHtml(resolution) +
      '</div>' +
      '<div class="wall-overlay"><span class="wall-view-hint">View</span></div>' +
      '</a>' +
      '<div class="card-meta">' +
      '<div class="card-text">' +
      '<span class="card-title">' +
      escapeHtml(item.title) +
      '</span>' +
      '<span class="card-subtitle">' +
      escapeHtml(curated || 'Curated · 4K') +
      '</span>' +
      '</div>' +
      '<div class="card-right">' +
      tagsHtml +
      shareButton +
      '<span class="dl-count" data-dlkey="' +
      index +
      '">0 dls</span>' +
      '</div></div>';

    card.querySelector('.wall-thumb').appendChild(thumbInner);
    
    // Add share button functionality
    const shareBtn = card.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const shareUrl = this.dataset.shareUrl;
        const shareTitle = this.dataset.shareTitle;
        
        if (navigator.share) {
          navigator.share({
            title: shareTitle,
            url: shareUrl
          }).catch(function(err) {
            console.log('Share failed:', err);
          });
        } else {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(shareUrl).then(function() {
            showToast('Link copied!');
          }).catch(function() {
            showToast('Failed to copy link');
          });
        }
      });
    }
    
    return card;
  }

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(function() {
      toast.classList.remove('visible');
    }, 2000);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function appendCardsInChunks(validItems, gallery, emptyEl, onDone) {
    var index = 0;
    var pos = 0;

    function afterChunk() {
      primeNearbyImages();
      if (window.WallDropReveal && typeof window.WallDropReveal.flushCards === 'function') {
        window.WallDropReveal.flushCards();
      }
    }

    function chunk() {
      var end = Math.min(pos + CARD_CHUNK, validItems.length);
      for (; pos < end; pos++) {
        gallery.insertBefore(buildCard(validItems[pos], index, pos < EAGER_COUNT), emptyEl);
        index++;
      }
      afterChunk();
      if (pos < validItems.length) {
        requestAnimationFrame(chunk);
      } else if (onDone) {
        bindScrollPrime();
        afterChunk();
        onDone(index);
      }
    }

    chunk();
  }

  function renderPage(page, items, gallery, emptyEl) {
    gallery.querySelectorAll('.wall-card').forEach(function (el) {
      el.remove();
    });

    if (items.length === 0) {
      emptyEl.classList.add('visible');
      emptyEl.querySelector('.empty-title').textContent = 'No wallpapers found';
      emptyEl.querySelector('p').textContent = 'Try adjusting your filters.';
      const hint = emptyEl.querySelector('.empty-hint');
      if (hint) hint.style.display = 'none';
      updatePaginationControls(0, 0);
      return;
    }

    emptyEl.classList.remove('visible');

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    var index = startIndex;
    pageItems.forEach(function (item, i) {
      gallery.insertBefore(buildCard(item, index, i < EAGER_COUNT), emptyEl);
      index++;
    });

    bindScrollPrime();
    primeNearbyImages();
    if (window.WallDropReveal && typeof window.WallDropReveal.flushCards === 'function') {
      window.WallDropReveal.flushCards();
    }

    updatePaginationControls(page, Math.ceil(items.length / ITEMS_PER_PAGE));
  }

  function updatePaginationControls(currentPage, totalPages) {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    if (totalPages <= 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      pageInfo.textContent = 'Page 1 of 1';
      return;
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;
  }

  function applyFilters(items, category, device) {
    return items.filter(function (item) {
      const categoryMatch = category === 'all' || item.category === category;
      const deviceMatch = device === 'all' || item.device === device;
      return categoryMatch && deviceMatch;
    });
  }

  window.initWallDropGallery = async function () {
    const gallery = document.getElementById('gallery');
    const emptyEl = document.getElementById('emptyState');
    if (!gallery || !emptyEl) return;

    let items = [];
    try {
      const res = await fetch('wallpapers.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      items = Array.isArray(data.wallpapers) ? data.wallpapers : [];
    } catch (err) {
      console.warn('WallDrop: could not load wallpapers.json', err);
      emptyEl.classList.add('visible');
      emptyEl.querySelector('.empty-title').textContent = 'Gallery unavailable';
      emptyEl.querySelector('p').textContent =
        'Could not load wallpapers.json. On Vercel, ensure the build step runs (npm run build).';
      const hint = emptyEl.querySelector('.empty-hint');
      if (hint) hint.style.display = 'none';
      window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { error: err, count: 0 } }));
      return;
    }

    gallery.querySelectorAll('.wall-card').forEach(function (el) {
      el.remove();
    });

    allItems = items.filter(isValidItem);
    filteredItems = allItems;

    if (allItems.length === 0) {
      emptyEl.classList.add('visible');
      emptyEl.querySelector('.empty-title').textContent = 'No wallpapers yet';
      emptyEl.querySelector('p').textContent =
        'Add images to images/wallpapers/desktop, mobile, or mac, then deploy (Vercel runs npm run build automatically).';
      const hint = emptyEl.querySelector('.empty-hint');
      if (hint) hint.textContent = 'Tip: use WebP/AVIF for faster loads — see PERFORMANCE.md';
      if (hint) hint.style.display = 'inline-block';
      window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { count: 0 } }));
      return;
    }

    currentPage = 1;
    renderPage(currentPage, filteredItems, gallery, emptyEl);

    window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { count: allItems.length } }));
  };

  window.changePage = function (delta) {
    const category = document.querySelector('.pill.active')?.dataset.cat || 'all';
    const device = document.querySelector('.device-pill.active')?.dataset.dev || 'all';
    filteredItems = applyFilters(allItems, category, device);
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      const gallery = document.getElementById('gallery');
      const emptyEl = document.getElementById('emptyState');
      renderPage(currentPage, filteredItems, gallery, emptyEl);
      // Scroll to filter section (higher up than gallery)
      const filterSection = document.getElementById('filterSection');
      if (filterSection) {
        filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.applyGalleryFilters = function () {
    const category = document.querySelector('.pill.active')?.dataset.cat || 'all';
    const device = document.querySelector('.device-pill.active')?.dataset.dev || 'all';
    filteredItems = applyFilters(allItems, category, device);
    currentPage = 1;
    const gallery = document.getElementById('gallery');
    const emptyEl = document.getElementById('emptyState');
    renderPage(currentPage, filteredItems, gallery, emptyEl);
  };
})();
