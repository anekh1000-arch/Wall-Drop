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
    '<label for="viewQuality" class="view-quality-label">Quality</label>' +
    '<select id="viewQuality" class="view-quality">' +
    '<option value="original">Original</option>' +
    '<option value="1080p">1080p</option>' +
    '<option value="mobile">Mobile</option>' +
    '<option value="mac">MacBook</option>' +
    '</select>' +
    '<button type="button" class="dl-btn" id="viewDownload">↓ Download</button>' +
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

  if (isMobile && dev === 'mobile') {
    var q = document.getElementById('viewQuality');
    if (q) q.value = 'mobile';
  }

  function getQualityTarget(quality, nw, nh) {
    if (quality === '1080p') return { w: 1920, h: 1080 };
    if (quality === 'mac') return { w: 3024, h: 1964 };
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
      .then(async function (outBlob) {
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

        if (window.WallDropDownloads) {
          await window.WallDropDownloads.recordDownload(src);
          updateDlStat();
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
        var a = document.createElement('a');
        a.href = src;
        a.download = title.replace(/\s+/g, '-').toLowerCase() + '-walldrop' + (src.match(/\.\w+$/) || ['.jpg'])[0];
        a.click();
      });
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
    if (t && t.closest && t.closest('nav,.view-meta,a,button,select,option,label,input,textarea')) return;
    if (t && t.closest && t.closest('.view-img')) return;

    var x = typeof e.clientX === 'number' ? e.clientX : 0;
    var y = typeof e.clientY === 'number' ? e.clientY : 0;
    if (!isInImageGutter(x, y)) return;

    e.preventDefault();
    goHome();
  });
})();
