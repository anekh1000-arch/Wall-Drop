(function () {
  const svg = document.querySelector('.hero-draw-svg');
  if (!svg) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const main = svg.querySelector('.draw-main');
  const guides = svg.querySelectorAll('.draw-guide');
  const pen = svg.querySelector('.draw-pen');

  if (reduced) {
    svg.classList.add('is-done');
    if (main) {
      main.style.strokeDashoffset = '0';
      main.style.opacity = '1';
    }
    guides.forEach(function (g) {
      g.style.strokeDashoffset = '0';
      g.style.opacity = '0.12';
    });
    if (pen) pen.style.opacity = '0';
    return;
  }

  function lengthOf(el) {
    try {
      if (el.getTotalLength) {
        var len = el.getTotalLength();
        if (len > 0) return len;
      }
    } catch (e) {}
    return 1200;
  }

  if (main) {
    var mainLen = lengthOf(main);
    main.style.strokeDasharray = mainLen;
    main.style.strokeDashoffset = mainLen;
  }

  guides.forEach(function (g, i) {
    var len = lengthOf(g);
    g.style.strokeDasharray = len;
    g.style.strokeDashoffset = len;
    g.style.animation = 'drawStroke 0.55s cubic-bezier(0.4, 0, 0.2, 1) ' + (0.15 + i * 0.1) + 's forwards';
  });

  if (main) {
    main.style.animation = 'drawStroke 2.6s cubic-bezier(0.65, 0, 0.35, 1) 0.85s forwards';
  }

  if (pen) {
    pen.style.animation =
      'penTravel 2.6s cubic-bezier(0.65, 0, 0.35, 1) 0.85s forwards, penHide 0.35s ease 3.5s forwards';
  }

  setTimeout(function () {
    svg.classList.add('is-done');
    guides.forEach(function (g) {
      g.style.animation = 'guideSettle 0.8s ease forwards';
    });
  }, 3600);
})();
