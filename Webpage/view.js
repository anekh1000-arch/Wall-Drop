(function () {
  const STORAGE_KEY = 'walldrop_v3';
  const BASELINE_KEY = 'walldrop_dl_baseline_v1';
  const DOWNLOAD_BASELINE = 1240;

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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function wallpaperHintText() {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'Tap Share, then “Use as Wallpaper”.';
    if (/Android/i.test(ua)) return 'Open the download, tap ⋮, then “Set as wallpaper”.';
    return 'Right-click the saved image → “Set as desktop background”.';
  }

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
    '" loading="eager" decoding="async">' +
    '</div>' +
    '<p class="view-dims" id="viewDims"></p>' +
    '<div class="view-meta">' +
    '<div><h1>' +
    escapeHtml(title) +
    '</h1><p id="viewMetaLine">' +
    escapeHtml([initialRes, cat, devLabel].filter(Boolean).join(' \u00b7 ')) +
    '</p></div>' +
    '<div class="view-actions">' +
    '<label for="viewQuality" style="font-size:0.62rem;color:#555;letter-spacing:0.1em;text-transform:uppercase">Quality</label>' +
    '<select id="viewQuality" style="background:#0e0e0e;border:1px solid #2a2a2a;color:#a0a0a0;padding:0.45rem 0.6rem;border-radius:8px;font-size:0.72rem">' +
    '<option value="original">Original</option>' +
    '<option value="1080p">1080p</option>' +
    '<option value="mobile">Mobile</option>' +
    '</select>' +
    '<button type="button" class="dl-btn" id="viewDownload">↓ Download</button>' +
    '</div></div>' +
    '<p class="view-dims" id="viewWallHint" style="margin-top:0.75rem"></p>';

  var imgEl = document.getElementById('viewImg');
  var metaLine = document.getElementById('viewMetaLine');
  var dimsEl = document.getElementById('viewDims');
  var hintEl = document.getElementById('viewWallHint');
  if (hintEl) hintEl.textContent = wallpaperHintText();

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

  function loadState() {
    const byImage = {};
    let totalDownloads = 0;
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      if (s.downloadsByImage) Object.assign(byImage, s.downloadsByImage);
      if (typeof s.totalDownloads === 'number') totalDownloads = s.totalDownloads;
    } catch (e) {}
    return { downloadsByImage: byImage, totalDownloads };
  }

  function saveState(byImage, totalDownloads) {
    try {
      const prev = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          downloadsByImage: byImage,
          downloadKeys: prev.downloadKeys || [],
          downloads: prev.downloads || [],
          totalDownloads
        })
      );
      if (!localStorage.getItem(BASELINE_KEY)) {
        localStorage.setItem(BASELINE_KEY, String(DOWNLOAD_BASELINE));
      }
    } catch (e) {}
  }

  function getQualityTarget(quality, nw, nh) {
    if (quality === '1080p') return { w: 1920, h: 1080 };
    if (quality === 'mobile') {
      return dev === 'mobile' ? { w: 1284, h: 2778 } : { w: 1170, h: 2532 };
    }
    return { w: nw, h: nh };
  }

  function resizeBlob(blob, targetW, targetH, nw, nh) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, targetW, targetH);
        var scale = Math.min(targetW / nw, targetH / nh);
        var dw = Math.round(nw * scale);
        var dh = Math.round(nh * scale);
        ctx.drawImage(img, Math.floor((targetW - dw) / 2), Math.floor((targetH - dh) / 2), dw, dh);
        canvas.toBlob(
          function (b) {
            URL.revokeObjectURL(url);
            if (b) resolve(b);
            else reject(new Error('canvas'));
          },
          'image/jpeg',
          0.92
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('img'));
      };
      img.src = url;
    });
  }

  function downloadWallpaper(btn) {
    var quality = document.getElementById('viewQuality').value;
    fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error('fetch');
        return r.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var img = new Image();
          var url = URL.createObjectURL(blob);
          img.onload = function () {
            URL.revokeObjectURL(url);
            resolve({ blob: blob, w: img.naturalWidth, h: img.naturalHeight });
          };
          img.onerror = reject;
          img.src = url;
        });
      })
      .then(function (data) {
        var out = data.blob;
        if (quality !== 'original') {
          var t = getQualityTarget(quality, data.w, data.h);
          return resizeBlob(data.blob, t.w, t.h, data.w, data.h);
        }
        return out;
      })
      .then(function (outBlob) {
        var ext = quality === 'original' ? (src.match(/\.\w+$/) || ['.jpg'])[0] : '.jpg';
        var suffix = quality === 'original' ? '' : '-' + quality;
        var dlUrl = URL.createObjectURL(outBlob);
        var a = document.createElement('a');
        a.href = dlUrl;
        a.download = title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + suffix + ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(dlUrl);

        var state = loadState();
        state.downloadsByImage[src] = (state.downloadsByImage[src] || 0) + 1;
        state.totalDownloads = (state.totalDownloads || 0) + 1;
        saveState(state.downloadsByImage, state.totalDownloads);

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
        var a = document.createElement('a');
        a.href = src;
        a.download = title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + (src.match(/\.\w+$/) || ['.jpg'])[0];
        a.click();
      });
  }

  document.getElementById('viewDownload').addEventListener('click', function () {
    downloadWallpaper(this);
  });
})();
