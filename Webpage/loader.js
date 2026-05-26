(function () {
  const MIN_SHOW_MS = 600;
  const NAV_DELAY_MS = 480;
  const start = performance.now();

  const LOADER_HTML =
    '<div id="page-loader" class="page-loader" aria-live="polite" aria-busy="true">' +
    '<div class="page-loader__grid"></div>' +
    '<div class="page-loader__inner">' +
    '<div class="page-loader__brand">' +
    '<img src="icons/logo.svg" alt="" class="site-logo site-logo--sm" width="22" height="22">' +
    '<span class="logo-text">WallDrop</span></div>' +
    '<svg class="page-loader__ring" viewBox="0 0 44 44" aria-hidden="true">' +
    '<circle cx="22" cy="22" r="18"></circle>' +
    '<circle class="ring-progress" cx="22" cy="22" r="18"></circle>' +
    '</svg>' +
    '<div class="page-loader__bar"><div class="page-loader__bar-fill"></div></div>' +
    '<span class="page-loader__label">Loading</span></div></div>';

  function isPageLink(anchor) {
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return false;
      const path = url.pathname.toLowerCase();
      return (
        path.endsWith('.html') ||
        path.endsWith('/') ||
        path.endsWith('/index.html') ||
        path.indexOf('view.html') !== -1
      );
    } catch {
      return false;
    }
  }

  function ensureLoader() {
    var loader = document.getElementById('page-loader');
    if (!loader) {
      document.body.insertAdjacentHTML('afterbegin', LOADER_HTML);
      loader = document.getElementById('page-loader');
    }
    return loader;
  }

  function showLoader() {
    var loader = ensureLoader();
    loader.classList.remove('is-exit');
    loader.setAttribute('aria-hidden', 'false');
    loader.setAttribute('aria-busy', 'true');
    document.documentElement.classList.add('is-loading');
  }

  function hideLoader() {
    var loader = document.getElementById('page-loader');
    if (!loader) {
      document.documentElement.classList.remove('is-loading');
      return;
    }
    var elapsed = performance.now() - start;
    var wait = Math.max(0, MIN_SHOW_MS - elapsed);
    setTimeout(function () {
      loader.classList.add('is-exit');
      loader.setAttribute('aria-hidden', 'true');
      loader.setAttribute('aria-busy', 'false');
      document.documentElement.classList.remove('is-loading');
    }, wait);
  }

  function navigateWithLoader(url) {
    if (!url) return;
    try {
      const target = new URL(url, location.href);
      if (target.href === location.href) return;
    } catch (e) {
      return;
    }
    showLoader();
    setTimeout(function () {
      location.href = url;
    }, NAV_DELAY_MS);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || !isPageLink(a)) return;
    var target = new URL(a.href, location.href);
    if (target.href === location.href) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    e.preventDefault();
    navigateWithLoader(a.href);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideLoader);
  } else {
    hideLoader();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) hideLoader();
  });

  window.WallDropLoader = {
    show: showLoader,
    hide: hideLoader,
    navigate: navigateWithLoader
  };
})();
