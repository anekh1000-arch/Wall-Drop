(function () {

  const NAV_FLAG_KEY = 'walldrop-from-nav';

  const MIN_SHOW_MS = 600;

  const NAV_DELAY_MS = 380;

  const VIEW_NAV_DELAY_MS = 200;

  const start = performance.now();



  const LOADER_HTML =

    '<div id="page-loader" class="page-loader" aria-live="polite" aria-busy="true">' +

    '<div class="page-loader__grid"></div>' +

    '<div class="page-loader__inner">' +

    '<div class="page-loader__brand">' +

    '<img src="icons/logo.svg?v=5" alt="" class="site-logo site-logo--sm" width="34" height="34">' +

    '<span class="logo-text">WallDrop</span></div>' +

    '<svg class="page-loader__ring" viewBox="0 0 44 44" aria-hidden="true">' +

    '<circle cx="22" cy="22" r="18"></circle>' +

    '<circle class="ring-progress" cx="22" cy="22" r="18"></circle>' +

    '</svg>' +

    '<div class="page-loader__bar"><div class="page-loader__bar-fill"></div></div>' +

    '<span class="page-loader__label">Loading</span></div></div>';



  function isViewPage() {

    return /view\.html/i.test(location.pathname);

  }



  function isIndexUrl(url) {

    try {

      var p = new URL(url, location.href).pathname.toLowerCase();

      return !p || p === '/' || p.endsWith('/index.html');

    } catch (e) {

      return false;

    }

  }



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



  function isViewLink(url) {

    try {

      return /view\.html/i.test(new URL(url, location.href).pathname);

    } catch {

      return false;

    }

  }



  function getNavFlag() {

    try {

      return sessionStorage.getItem(NAV_FLAG_KEY);

    } catch (e) {

      return null;

    }

  }



  function clearNavFlag() {

    try {

      sessionStorage.removeItem(NAV_FLAG_KEY);

    } catch (e) {}

  }



  function setNavFlag(value) {

    try {

      sessionStorage.setItem(NAV_FLAG_KEY, value);

    } catch (e) {}

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



  function hideLoaderImmediate() {

    var loader = document.getElementById('page-loader');

    document.documentElement.classList.remove('is-loading');

    if (!loader) return;

    loader.classList.add('is-exit');

    loader.setAttribute('aria-hidden', 'true');

    loader.setAttribute('aria-busy', 'false');

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

      hideLoaderImmediate();

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



    if (isViewPage() && isIndexUrl(url)) {

      setNavFlag('home');

    } else if (isViewLink(url)) {

      setNavFlag('view');

    }



    showLoader();

    setTimeout(

      function () {

        location.href = url;

      },

      isViewLink(url) ? VIEW_NAV_DELAY_MS : NAV_DELAY_MS

    );

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



  function initOnLoad() {

    var flag = getNavFlag();

    if (flag) clearNavFlag();



    if (flag === 'view' && isViewPage()) {

      hideLoaderImmediate();

      return;

    }

    if (flag === 'home' && !isViewPage()) {

      hideLoaderImmediate();

      return;

    }

    hideLoader();

  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', initOnLoad);

  } else {

    initOnLoad();

  }



  window.addEventListener('pageshow', function (e) {

    if (e.persisted) hideLoaderImmediate();

  });



  window.WallDropLoader = {

    show: showLoader,

    hide: hideLoader,

    hideImmediate: hideLoaderImmediate,

    navigate: navigateWithLoader

  };

})();


