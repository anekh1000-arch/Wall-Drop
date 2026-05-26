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
  const CARD_CHUNK = 10;
  const LAZY_ROOT_MARGIN = '500px 0px';

  let lazyObserver = null;

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

  function buildCard(item, index) {
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

    const img = document.createElement('img');
    img.dataset.src = imagePath;
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
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', function () {
      thumbInner.classList.remove('is-loading');
      applyNaturalSize(card, img, item);
    });
    img.addEventListener('error', function () {
      thumbInner.classList.remove('is-loading');
      thumbInner.classList.add('is-error');
    });
    thumbInner.appendChild(skeleton);
    thumbInner.appendChild(img);
    ensureLazyObserver().observe(img);

    const tagsHtml = deviceTags(item.device)
      .map(function (t) {
        return '<span class="tag">' + t + '</span>';
      })
      .join('');

    const curated = item.curatedTag ? String(item.curatedTag) : '';

    card.innerHTML =
      '<a class="wall-card-link" href="' +
      escapeAttr(viewUrl) +
      '">' +
      '<div class="wall-thumb"></div>' +
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
      '<span class="dl-count" data-dlkey="' +
      index +
      '">0 dls</span>' +
      '</div></div>';

    card.querySelector('.wall-thumb').appendChild(thumbInner);
    return card;
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

    function chunk() {
      var end = Math.min(pos + CARD_CHUNK, validItems.length);
      for (; pos < end; pos++) {
        gallery.insertBefore(buildCard(validItems[pos], index), emptyEl);
        index++;
      }
      if (pos < validItems.length) {
        requestAnimationFrame(chunk);
      } else if (onDone) {
        onDone(index);
      }
    }

    requestAnimationFrame(chunk);
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

    var validItems = items.filter(isValidItem);

    if (validItems.length === 0) {
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

    emptyEl.classList.remove('visible');

    appendCardsInChunks(validItems, gallery, emptyEl, function (count) {
      window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { count: count } }));
    });
  };
})();
