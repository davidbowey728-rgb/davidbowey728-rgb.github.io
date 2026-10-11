/* ==========================================================================
   MOLTEN INSTITUTE — core.js
   Shared utilities and a single visibility-aware animation loop.
   ========================================================================== */
(function () {
  "use strict";

  var MI = (window.MI = {
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    coarse: window.matchMedia("(pointer: coarse)").matches,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    mouse: { x: innerWidth * 0.7, y: innerHeight * 0.45, nx: 0, ny: 0, sx: 0, sy: 0, down: false, inside: false },
    scroll: { y: 0, v: 0, hero: 0 },
    intro: 0,
    colors: {
      abyss: "9,56,73",
      deep: "28,92,116",
      teal: "79,154,166",
      sea: "80,136,155",
      mint: "143,211,184",
      ice: "223,246,241"
    },
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    rgba: function (c, a) { return "rgba(" + c + "," + a + ")"; },
    ease: function (t) { return 1 - Math.pow(1 - t, 3); }
  });

  /* ---------- visibility-aware loop ---------- */
  var items = [];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      for (var i = 0; i < items.length; i++) if (items[i].el === e.target) items[i].visible = e.isIntersecting;
    });
  }, { rootMargin: "120px" });

  MI.animate = function (el, fn, always) {
    var item = { el: el, fn: fn, visible: !!always };
    items.push(item);
    if (!always) io.observe(el);
    return item;
  };

  /* Resize a canvas to its CSS box; returns {w,h} in CSS px. */
  MI.fit = function (canvas, ctx, scale) {
    var dpr = (scale || 1) * MI.dpr;
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { w: w, h: h };
  };

  var last = performance.now(), hidden = false;
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; last = performance.now(); });

  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var m = MI.mouse;
    m.sx = MI.lerp(m.sx, m.nx, 0.06);
    m.sy = MI.lerp(m.sy, m.ny, 0.06);
    var t = now / 1000;
    for (var i = 0; i < items.length; i++) if (items[i].visible) items[i].fn(t, dt);
  }
  requestAnimationFrame(frame);

  window.addEventListener("pointermove", function (e) {
    var m = MI.mouse;
    m.x = e.clientX; m.y = e.clientY; m.inside = true;
    m.nx = (e.clientX / innerWidth) * 2 - 1;
    m.ny = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
  document.addEventListener("pointerleave", function () { MI.mouse.inside = false; });
})();
