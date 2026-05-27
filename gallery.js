(function () {
  const DEVICE_TAGS = {
    desktop: ['Desktop'],
    mobile: ['Mobile']
  };

  const FALLBACK_RES = {
    desktop: '3840×2160',
    mobile: '1284×2778'
  };

  function formatRes(w, h) {
    return w + '\u00d7' + h;
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
    var viewLink = card.querySelector('.pre-btn');
    if (viewLink) viewLink.href = viewUrl;
  }

  function deviceTags(dev) {
    return DEVICE_TAGS[dev] || [dev];
  }

  function resolveImagePath(item) {
    if (!item.image) return null;
    var raw = String(item.image).replace(/\\/g, '/').trim();
    if (!raw) return null;

    var dev = item.device === 'mobile' ? 'mobile' : item.device === 'desktop' ? 'desktop' : null;
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
    if (item.device !== 'desktop' && item.device !== 'mobile') {
      console.warn('WallDrop: skipped "' + (item.title || '?') + '" — device must be desktop or mobile');
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

    const card = document.createElement('div');
    card.className = 'wall-card';
    card.dataset.cat = item.category;
    card.dataset.dev = item.device;
    card.dataset.res = resolution;
    card.dataset.image = imagePath;
    card.dataset.viewUrl = viewUrl;
    card.dataset.index = String(index);
    if (item.width) card.dataset.width = String(item.width);
    if (item.height) card.dataset.height = String(item.height);
    if (item.width && item.height) {
      card.style.setProperty('--wall-ar', item.width + ' / ' + item.height);
    }

    const thumbInner = document.createElement('div');
    thumbInner.className = 'wall-thumb-inner has-image';
    const img = document.createElement('img');
    img.src = imagePath;
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // Add explicit width/height to prevent CLS
    if (item.width && item.height) {
      img.width = item.width;
      img.height = item.height;
    }
    
    // Generate srcset for responsive images
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
    
    img.addEventListener('load', function () {
      applyNaturalSize(card, img, item);
    });
    if (img.complete && img.naturalWidth) {
      applyNaturalSize(card, img, item);
    }
    thumbInner.appendChild(img);

    const tagsHtml = deviceTags(item.device)
      .map(function (t) {
        return '<span class="tag">' + t + '</span>';
      })
      .join('');

    card.innerHTML =
      '<div class="wall-thumb"></div>' +
      '<div class="res-badge">' +
      escapeHtml(resolution) +
      '</div>' +
      '<div class="wall-overlay"><span class="wall-view-hint">View</span></div>' +
      '<div class="card-meta">' +
      '<span class="card-title">' +
      escapeHtml(item.title) +
      '</span>' +
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
      window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { error: err } }));
      return;
    }

    gallery.querySelectorAll('.wall-card').forEach(function (el) {
      el.remove();
    });

    var index = 0;
    items.forEach(function (item) {
      if (!isValidItem(item)) return;
      gallery.insertBefore(buildCard(item, index), emptyEl);
      index++;
    });

    gallery.querySelectorAll('.wall-thumb-inner,.wall-card').forEach(function (el) {
      el.style.willChange = 'transform';
      el.style.transform = 'translateZ(0)';
    });

    window.dispatchEvent(new CustomEvent('walldrop:gallery-ready', { detail: { count: index } }));
  };
})();
