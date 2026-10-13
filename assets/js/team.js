/* ==========================================================================
   MOLTEN INSTITUTE — team.js
   Team page: ambient starfield, reveals, member profiles, navigation.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI, C = MI.colors, TAU = Math.PI * 2;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;

  /* ---------- ambient starfield with a faint nexus ---------- */
  function sky() {
    var canvas = $("#teamSky");
    if (!canvas) return;
    var ctx = canvas.getContext("2d"), box = MI.fit(canvas, ctx), stars = [], nodes = [];
    function seed() {
      stars = []; nodes = [];
      var n = Math.round(box.w * box.h / 2600);
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * box.w, y: Math.random() * box.h, r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.6 + 0.15, p: Math.random() * TAU, z: Math.random() });
      for (i = 0; i < (MI.coarse ? 18 : 36); i++) nodes.push({ x: Math.random() * box.w, y: Math.random() * box.h, vx: MI.rand(-6, 6), vy: MI.rand(-6, 6) });
    }
    seed();
    window.addEventListener("resize", function () { box = MI.fit(canvas, ctx); seed(); });
    canvas.style.opacity = 1;
    MI.animate(canvas, function (t, dt) {
      var w = box.w, h = box.h, sy = MI.scroll.y || scrollY;
      ctx.clearRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w * 0.75, h * 0.1, 0, w * 0.75, h * 0.1, Math.max(w, h) * 0.8);
      g.addColorStop(0, "rgba(28,92,116,.22)"); g.addColorStop(0.5, "rgba(9,56,73,.08)"); g.addColorStop(1, "rgba(2,4,6,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], y = ((s.y - sy * s.z * 0.15) % h + h) % h;
        ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t * 1.5 + s.p));
        ctx.fillStyle = "rgb(" + C.ice + ")";
        ctx.fillRect(s.x, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6;
      for (i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 32000) { ctx.strokeStyle = MI.rgba(C.teal, ((1 - d2 / 32000) * 0.14).toFixed(3)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.fillStyle = MI.rgba(C.mint, 0.5);
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.3, 0, TAU); ctx.fill();
      }
    }, true);
  }

  /* ---------- reveals ---------- */
  function reveals() {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$("[data-reveal], .shead").forEach(function (el) { io.observe(el); });
  }

  /* ---------- nav ---------- */
  function nav() {
    var navEl = $("#nav"), burger = $("#burger"), menu = $("#mmenu");
    MI.animate(body, function () { MI.scroll.y = scrollY; navEl.classList.toggle("is-scrolled", scrollY > 30); }, true);
    function set(open) {
      burger.setAttribute("aria-expanded", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", !open);
      body.style.overflow = open ? "hidden" : "";
    }
    burger.addEventListener("click", function () { set(burger.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- member profiles ---------- */
  function profiles() {
    var dlg = $("#profile"), img = $("#profileImg"), nameEl = $("#profileName"), roleEl = $("#profileRole"), teamEl = $("#profileTeam"), content = $("#profileContent");
    var members = $$(".member"), lastFocus = null;

    function groupOf(m) {
      var sec = m.closest(".team-group"), tag = sec && $(".shead__tag", sec);
      return tag ? tag.textContent : "";
    }
    function open(m, push) {
      lastFocus = m;
      var photo = $(".member__photo img", m);
      img.src = photo.getAttribute("src"); img.alt = photo.alt;
      nameEl.textContent = $(".member__name", m).textContent;
      roleEl.textContent = $(".member__role", m).textContent;
      teamEl.textContent = groupOf(m);
      content.innerHTML = "";
      content.appendChild($("template", m).content.cloneNode(true));
      Array.prototype.forEach.call(content.children, function (c, i) { c.style.transitionDelay = (0.2 + i * 0.05) + "s"; });
      dlg.classList.add("is-open");
      dlg.setAttribute("aria-hidden", "false");
      body.style.overflow = "hidden";
      if (push !== false && history.replaceState) history.replaceState(null, "", "#" + m.id);
      setTimeout(function () { $(".profile__close", dlg).focus(); }, 60);
    }
    function close() {
      if (!dlg.classList.contains("is-open")) return;
      dlg.classList.remove("is-open");
      dlg.setAttribute("aria-hidden", "true");
      body.style.overflow = "";
      if (history.replaceState) history.replaceState(null, "", location.pathname);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    members.forEach(function (m) {
      m.addEventListener("click", function () { open(m); });
      m.addEventListener("pointermove", function (e) {
        var r = m.getBoundingClientRect();
        m.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        m.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    });
    dlg.addEventListener("click", function (e) { if (e.target.closest("[data-close-profile]")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!dlg.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var i = members.indexOf(lastFocus), n = members[(i + (e.key === "ArrowRight" ? 1 : -1) + members.length) % members.length];
        open(n);
      }
    });
    // deep link: team.html#soren-sterling
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains("member")) setTimeout(function () { target.scrollIntoView({ block: "center" }); open(target, false); }, 300);
  }

  document.addEventListener("DOMContentLoaded", function () { sky(); reveals(); nav(); profiles(); });
})();
