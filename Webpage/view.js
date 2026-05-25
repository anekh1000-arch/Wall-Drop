(function () {
  const STORAGE_KEY = 'walldrop_v2';
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const title = params.get('title') || 'Wallpaper';
  const cat = params.get('cat') || '';
  const dev = params.get('dev') || 'desktop';
  const res = params.get('res') || '';
  const index = params.get('i');
  const paramW = params.get('w');
  const paramH = params.get('h');

  const main = document.getElementById('viewMain');
  if (!main) return;

  if (!src) {
    main.innerHTML =
      '<p class="view-error">Wallpaper not found. <a href="index.html">Back to browse</a></p>';
    document.title = 'Not found — WallDrop';
    return;
  }

  document.title = title + ' — WallDrop';

  const devLabel = dev === 'mobile' ? 'Mobile' : 'Desktop';
  var initialRes = res;
  if (paramW && paramH) initialRes = paramW + '\u00d7' + paramH;

  main.innerHTML =
    '<div class="view-img-wrap">' +
    '<img class="view-img" id="viewImg" src="' +
    escapeAttr(src) +
    '" alt="' +
    escapeAttr(title) +
    '">' +
    '</div>' +
    '<p class="view-dims" id="viewDims"></p>' +
    '<div class="view-meta">' +
    '<div><h1>' +
    escapeHtml(title) +
    '</h1><p id="viewMetaLine">' +
    escapeHtml([initialRes, cat, devLabel].filter(Boolean).join(' \u00b7 ')) +
    '</p></div>' +
    '<div class="view-actions">' +
    '<button type="button" class="dl-btn" id="viewDownload">↓ Download</button>' +
    '<a class="btn-ghost" href="' +
    escapeAttr(src) +
    '" target="_blank" rel="noopener">Open full image</a>' +
    '</div></div>';

  var imgEl = document.getElementById('viewImg');
  var metaLine = document.getElementById('viewMetaLine');
  var dimsEl = document.getElementById('viewDims');

  function showNaturalSize() {
    var w = imgEl.naturalWidth;
    var h = imgEl.naturalHeight;
    if (!w || !h) return;
    var actual = w + '\u00d7' + h;
    dimsEl.textContent = 'Original size: ' + actual + ' px (shown at full aspect, scaled to fit screen)';
    metaLine.textContent = [actual, cat, devLabel].filter(Boolean).join(' \u00b7 ');
  }

  imgEl.addEventListener('load', showNaturalSize);
  if (imgEl.complete && imgEl.naturalWidth) showNaturalSize();

  document.getElementById('viewDownload').addEventListener('click', function () {
    downloadWallpaper(src, title, index, this);
  });
})();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function loadState(count) {
  try {
    const s = JSON.parse(localStorage.getItem('walldrop_v2'));
    if (s && Array.isArray(s.downloads)) return s;
  } catch (e) {}
  return { downloads: Array(count).fill(0), totalDownloads: 0 };
}

function saveState(s) {
  try {
    localStorage.setItem('walldrop_v2', JSON.stringify(s));
  } catch (e) {}
}

function downloadWallpaper(src, title, index, btn) {
  fetch(src)
    .then(function (r) {
      if (!r.ok) throw new Error('fetch');
      return r.blob();
    })
    .then(function (blob) {
      const ext = (src.match(/\.\w+$/) || ['.jpg'])[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + ext;
      a.click();
      URL.revokeObjectURL(url);

      if (index !== null && index !== '') {
        const i = parseInt(index, 10);
        if (!isNaN(i)) {
          const state = loadState(i + 1);
          while (state.downloads.length <= i) state.downloads.push(0);
          state.downloads[i] = (state.downloads[i] || 0) + 1;
          state.totalDownloads = (state.totalDownloads || 0) + 1;
          saveState(state);
        }
      }

      if (btn) {
        btn.textContent = '✓ Saved';
        btn.classList.add('done');
        setTimeout(function () {
          btn.textContent = '↓ Download';
          btn.classList.remove('done');
        }, 1800);
      }
    })
    .catch(function () {
      window.open(src, '_blank');
    });
}
