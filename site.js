(function () {
  /* Mobile navigation */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!links.classList.contains('is-open')) return;
      if (!e.target.closest('nav')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Coming soon links on about page */
  document.querySelectorAll('[data-soon]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var msg = 'Coming soon — ' + (a.dataset.soon || a.textContent.trim());
      if (typeof showToast === 'function') showToast(msg);
      else alert(msg);
    });
  });
})();
