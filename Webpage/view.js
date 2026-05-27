(function () {
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const title = params.get('title') || 'Wallpaper';
  const cat = params.get('cat') || '';
  const dev = params.get('dev') || 'desktop';
  const res = params.get('res') || '';
  const paramW = params.get('w');
  const paramH = params.get('h');

  const main = document.getElementById('viewMain');
  if (!main) return;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  if (!src) {
    main.innerHTML =
      '<p class="view-error">Wallpaper not found. <a href="index.html">Back to browse</a></p>';
    document.title = 'Not found — WallDrop';
    return;
  }

  document.title = title + ' — WallDrop';
  const devLabel = dev === 'mobile' ? 'Mobile' : dev === 'mac' ? 'Mac' : 'Desktop';
  var initialRes = res;
  if (paramW && paramH) initialRes = paramW + '\u00d7' + paramH;

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  document.documentElement.classList.toggle('is-mobile', isMobile);

  main.innerHTML =
    '<div class="view-img-wrap">' +
    '<img class="view-img" id="viewImg" src="' +
    escapeAttr(src) +
    '" alt="' +
    escapeAttr(title) +
    '" loading="eager" decoding="async">' +
    '</div>' +
    '<p class="view-dims" id="viewDims"></p>' +
    '<div class="view-meta">' +
    '<div><h1>' +
    escapeHtml(title) +
    '</h1><p id="viewMetaLine">' +
    escapeHtml([initialRes, cat, devLabel].filter(Boolean).join(' \u00b7 ')) +
    '</p><p class="view-dl-stat" id="viewDlStat"></p></div>' +
    '<div class="view-actions">' +
    '<button type="button" class="dl-btn" id="viewDownload">↓ Download Original</button>' +
    '</div></div>';

  var imgEl = document.getElementById('viewImg');
  var metaLine = document.getElementById('viewMetaLine');
  var dimsEl = document.getElementById('viewDims');
  var dlStatEl = document.getElementById('viewDlStat');

  function fmtNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function updateDlStat() {
    if (!dlStatEl || !window.WallDropDownloads) return;
    const stats = window.WallDropDownloads.loadLocal();
    const n = window.WallDropDownloads.countForImage(stats, src);
    dlStatEl.textContent = n === 1 ? '1 download' : fmtNum(n) + ' downloads';
  }

  function showNaturalSize() {
    var w = imgEl.naturalWidth;
    var h = imgEl.naturalHeight;
    if (!w || !h) return;
    var actual = w + '\u00d7' + h;
    dimsEl.textContent = 'Original size: ' + actual + ' px';
    metaLine.textContent = [actual, cat, devLabel].filter(Boolean).join(' \u00b7 ');
  }

  imgEl.addEventListener('load', showNaturalSize);
  if (imgEl.complete && imgEl.naturalWidth) showNaturalSize();

  function downloadWallpaper(btn) {
    var ext = src.match(/\.\w+$/) || ['.jpg'];
    var dlUrl = src;
    var a = document.createElement('a');
    a.href = dlUrl;
    a.download = title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + ext[0];
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (window.WallDropDownloads) {
      window.WallDropDownloads.recordDownload(src).then(updateDlStat);
    }

    if (btn) {
      btn.textContent = '✓ Saved';
      btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = '↓ Download Original';
        btn.classList.remove('done');
      }, 1800);
    }
  }

  document.getElementById('viewDownload').addEventListener('click', function () {
    downloadWallpaper(this);
  });

  if (window.WallDropDownloads) {
    window.WallDropDownloads.syncFromServer().then(updateDlStat);
  }

  function goHome() {
    if (window.WallDropLoader && typeof window.WallDropLoader.navigate === 'function') {
      window.WallDropLoader.navigate('index.html');
    } else {
      location.href = 'index.html';
    }
  }

  function isInImageGutter(clientX, clientY) {
    var wrap = document.querySelector('.view-img-wrap');
    var img = document.getElementById('viewImg');
    if (!wrap || !img) return false;

    var frame = wrap.getBoundingClientRect();
    var pic = img.getBoundingClientRect();

    if (clientY < frame.top || clientY > frame.bottom) return false;

    if (clientX < frame.left || clientX > frame.right) return true;

    if (clientX < pic.left || clientX > pic.right || clientY < pic.top || clientY > pic.bottom) {
      return true;
    }

    return false;
  }

  // Desktop / Mac: full left/right gutter beside the image frame → home (smooth loader).
  document.addEventListener('click', function (e) {
    if (isMobile) return;
    if (e.defaultPrevented) return;
    if (e.button && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var t = e.target;
    if (t && t.closest && t.closest('nav,.view-meta,a,button,label,input,textarea')) return;
    if (t && t.closest && t.closest('.view-img')) return;

    var x = typeof e.clientX === 'number' ? e.clientX : 0;
    var y = typeof e.clientY === 'number' ? e.clientY : 0;
    if (!isInImageGutter(x, y)) return;

    e.preventDefault();
    goHome();
  });
})();
