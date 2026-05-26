(function () {
  var STAGGER_MS = 55;
  var observer = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function revealNow(el) {
    el.classList.add('reveal', 'is-visible');
  }

  function isNearViewport(el, margin) {
    margin = margin || 0;
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight + margin && r.bottom > -margin;
  }

  function observe(el, index) {
    if (!el || el.classList.contains('is-visible')) return;
    el.classList.add('reveal');
    if (el.classList.contains('wall-card')) {
      if (typeof index === 'number' && index > 0 && index < 12) {
        el.style.setProperty('--reveal-delay', Math.min(index * STAGGER_MS, 280) + 'ms');
      } else {
        el.style.removeProperty('--reveal-delay');
      }
      if (prefersReducedMotion() || isNearViewport(el, 320)) {
        el.classList.add('is-visible');
        return;
      }
    } else if (typeof index === 'number' && index > 0) {
      el.style.setProperty('--reveal-delay', index * STAGGER_MS + 'ms');
    }
    if (prefersReducedMotion()) {
      revealNow(el);
      return;
    }
    if (observer) observer.observe(el);
  }

  function flushCards() {
    document.querySelectorAll('.wall-card.reveal:not(.is-visible)').forEach(function (card) {
      if (card.classList.contains('hidden')) return;
      if (isNearViewport(card, 480)) card.classList.add('is-visible');
    });
  }

  function initObserver() {
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: '0px 0px 12%', threshold: 0.05 }
    );
  }

  function scan(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-reveal]').forEach(function (el, i) {
      observe(el, i);
    });
  }

  function watchGallery() {
    var gallery = document.getElementById('gallery');
    if (!gallery) return;
    var cardIndex = 0;
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('wall-card')) {
            observe(node, cardIndex++);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('.wall-card').forEach(function (card) {
              observe(card, cardIndex++);
            });
          }
        });
      });
    });
    mo.observe(gallery, { childList: true, subtree: true });
  }

  if (prefersReducedMotion()) {
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[data-reveal], .wall-card').forEach(revealNow);
    });
  } else {
    initObserver();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        scan();
        watchGallery();
      });
    } else {
      scan();
      watchGallery();
    }
  }

  window.WallDropReveal = { observe: observe, scan: scan, flushCards: flushCards };
})();
