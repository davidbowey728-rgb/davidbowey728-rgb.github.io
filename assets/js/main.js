/* ==========================================================================
   MOLTEN INSTITUTE — main.js
   Loader and intro, cursor, scroll choreography, research dossiers,
   training pipeline, reasoning traces, quick navigation.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;

  /* ==========================================================================
     LOADER → BIG-BANG INTRO
     ========================================================================== */
  function loader(done) {
    var el = $("#loader"), bar = $("#loaderBar");
    var repeat = false;
    try { repeat = sessionStorage.getItem("mi-seen") === "1"; sessionStorage.setItem("mi-seen", "1"); } catch (e) {}
    var min = MI.reduced ? 200 : repeat ? 700 : 1500, start = performance.now(), fontsReady = false, finished = false;
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { fontsReady = true; });
    setTimeout(function () { fontsReady = true; }, 2500);
    (function tick(now) {
      if (finished) return;
      var p = Math.min((now - start) / min, 1);
      bar.style.width = (MI.ease(p) * (fontsReady ? 100 : 85)).toFixed(1) + "%";
      if (p >= 1 && fontsReady) { finished = true; el.classList.add("is-done"); done(); return; }
      requestAnimationFrame(tick);
    })(start);
  }

  function intro() {
    window.scrollTo(0, 0);
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    var start = performance.now(), dur = MI.reduced ? 1 : 2600;
    (function ramp(now) {
      var p = Math.min((now - start) / dur, 1);
      MI.intro = p;
      if (p < 1) requestAnimationFrame(ramp);
    })(start);
  }

  /* ==========================================================================
     CURSOR + MAGNETIC
     ========================================================================== */
  function cursor() {
    if (MI.coarse) return;
    body.classList.add("has-cursor");
    var c = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label");
    var rx = innerWidth / 2, ry = innerHeight / 2;
    MI.animate(c, function () {
      var m = MI.mouse;
      rx = MI.lerp(rx, m.x, 0.2); ry = MI.lerp(ry, m.y, 0.2);
      dot.style.transform = "translate(" + m.x + "px," + m.y + "px)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      c.classList.toggle("is-down", MI.mouse.down);
    }, true);
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("a, button, [data-cursor], input");
      if (!t) { c.classList.remove("is-hover", "is-label"); return; }
      var lab = t.getAttribute("data-cursor");
      if (lab) { label.textContent = lab; c.classList.add("is-label"); c.classList.remove("is-hover"); }
      else { c.classList.add("is-hover"); c.classList.remove("is-label"); }
    });
    document.addEventListener("pointerleave", function () { c.style.opacity = 0; });
    document.addEventListener("pointerenter", function () { c.style.opacity = 1; });

    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + x * 0.2 + "px," + y * 0.28 + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
    $$(".btn--primary").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--bx", (e.clientX - r.left) + "px");
        el.style.setProperty("--by", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ==========================================================================
     SPLIT TEXT + REVEALS
     ========================================================================== */
  function splitText(el) {
    var idx = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "split-word";
            for (var i = 0; i < part.length; i++) {
              var ch = document.createElement("span"); ch.className = "split-char"; ch.style.setProperty("--i", idx++); ch.textContent = part[i];
              w.appendChild(ch);
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    })(el);
  }

  function reveals() {
    $$("[data-split]").forEach(splitText);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add("is-in");
        io.unobserve(el);
        if (el.classList.contains("rcard")) setTimeout(function () { el.classList.add("is-settled"); }, 1400 + (parseFloat(el.style.getPropertyValue("--d")) || 0) * 90);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
    $$("[data-reveal], [data-split], .shead").forEach(function (el) { io.observe(el); });
  }

  /* ==========================================================================
     ABOUT — word-by-word illumination
     ========================================================================== */
  function about() {
    var el = $("#aboutText");
    if (!el) return;
    var words = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      var key = n.nodeType === 1, frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        var s = document.createElement("span"); s.className = "mword" + (key ? " is-key" : ""); s.textContent = part;
        words.push(s); frag.appendChild(s);
      });
      el.replaceChild(frag, n);
    });
    var lit = -1;
    MI.animate(el, function () {
      var r = el.getBoundingClientRect(), vh = innerHeight;
      var n = Math.round(MI.clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1) * words.length);
      if (n === lit) return;
      lit = n;
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-lit", i < n);
    });
  }

  /* ==========================================================================
     SCROLL: progress, nav, rail, ticker velocity skew
     ========================================================================== */
  function scrollFx() {
    var nav = $("#nav"), bar = $("#progressBar"), track = $(".ticker__track");
    var sections = $$("[data-section]"), navLinks = $$(".nav__links a"), railLinks = $$(".rail a");
    var lastY = scrollY, skew = 0, skewEl = null;
    if (track) {
      skewEl = document.createElement("div");
      track.parentNode.insertBefore(skewEl, track);
      skewEl.appendChild(track);
    }
    MI.animate(body, function () {
      var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      MI.scroll.v = MI.lerp(MI.scroll.v, y - lastY, 0.2);
      lastY = y; MI.scroll.y = y; MI.scroll.hero = y / innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0).toFixed(4) + ")";
      nav.classList.toggle("is-scrolled", y > 40);
      skew = MI.lerp(skew, MI.clamp(MI.scroll.v * 0.25, -10, 10), 0.1);
      if (skewEl) skewEl.style.transform = "skewX(" + (-skew).toFixed(2) + "deg)";
      var current = "top";
      for (var i = 0; i < sections.length; i++) if (sections[i].getBoundingClientRect().top <= innerHeight * 0.45) current = sections[i].id;
      if (current !== MI._active) {
        MI._active = current;
        navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + current); });
        railLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("data-rail") === current); });
      }
    }, true);
  }

  /* ==========================================================================
     MOBILE MENU
     ========================================================================== */
  function nav() {
    var burger = $("#burger"), menu = $("#mmenu");
    function set(open) {
      burger.setAttribute("aria-expanded", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", !open);
      body.style.overflow = open ? "hidden" : "";
    }
    burger.addEventListener("click", function () { set(burger.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
  }

  /* ==========================================================================
     RESEARCH CARDS: tilt + dossier
     ========================================================================== */
  function cards() {
    var dossier = $("#dossier"), dTitle = $("#dossierTitle"), dNo = $("#dossierNo"), dContent = $("#dossierContent"), lastFocus = null;
    $$("[data-tilt]").forEach(function (card) {
      if (!MI.coarse && !MI.reduced) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.classList.add("is-tilting");
          card.style.setProperty("--rx", ((0.5 - y) * 9).toFixed(2) + "deg");
          card.style.setProperty("--ry", ((x - 0.5) * 11).toFixed(2) + "deg");
          card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        });
        card.addEventListener("pointerleave", function () {
          card.classList.remove("is-tilting");
          card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg");
        });
      }
      function open() {
        lastFocus = document.activeElement;
        dNo.textContent = $(".rcard__no", card).textContent + " · " + $(".rcard__area", card).textContent;
        dTitle.textContent = $(".rcard__title", card).textContent;
        dContent.innerHTML = "";
        dContent.appendChild($("template", card).content.cloneNode(true));
        Array.prototype.forEach.call(dContent.children, function (c, i) { c.style.transitionDelay = (0.25 + i * 0.06) + "s"; });
        dossier.classList.add("is-open");
        dossier.setAttribute("aria-hidden", "false");
        body.style.overflow = "hidden";
        setTimeout(function () { $(".dossier__close").focus(); }, 50);
      }
      card.addEventListener("click", open);
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    function close() {
      if (!dossier.classList.contains("is-open")) return;
      dossier.classList.remove("is-open");
      dossier.setAttribute("aria-hidden", "true");
      body.style.overflow = "";
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    dossier.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-dossier]")) close();
      if (e.target.closest('a[href^="#"]')) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ==========================================================================
     TRAINING PIPELINE — pinned horizontal scroll
     ========================================================================== */
  function pipeline() {
    var sec = $("#pipeline"), track = $("#pipeTrack"), bar = $("#pipeBar"), stageNo = $("#pipeStage"), stageName = $("#pipeName");
    var stages = $$(".stage", track), dots = $$("#pipeDots i"), dist = 0, enabled = false, cur = 0, lastActive = -1;
    function layout() {
      enabled = innerWidth > 760;
      if (!enabled) { sec.style.height = ""; track.style.transform = ""; return; }
      dist = Math.max(0, track.scrollWidth - innerWidth);
      sec.style.height = (innerHeight + dist) + "px";
    }
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);
    MI.animate(sec, function () {
      var r = sec.getBoundingClientRect(), total = sec.offsetHeight - innerHeight;
      var p = enabled && total > 0 ? MI.clamp(-r.top / total, 0, 1) : 0;
      cur = MI.lerp(cur, p, 0.14);
      if (enabled) track.style.transform = "translate3d(" + (-cur * dist).toFixed(1) + "px,0,0)";
      bar.style.transform = "scaleX(" + cur.toFixed(4) + ")";
      var active = Math.min(stages.length - 1, Math.floor(cur * stages.length * 0.999));
      if (active !== lastActive) {
        lastActive = active;
        stages.forEach(function (s, i) { s.classList.toggle("is-active", enabled && i === active); });
        dots.forEach(function (d, i) { d.classList.toggle("is-on", i <= active); });
        stageNo.textContent = String(active + 1).padStart(2, "0");
        stageName.textContent = stages[active].getAttribute("data-name");
      }
    });
  }

  /* ==========================================================================
     REASONING TRACES (simulated)
     ========================================================================== */
  var TRACES = {
    physics: {
      prompt: "A vessel heats from 300 K to 1,500 K at a constant 40 K per minute. How long does it take?",
      steps: [
        { k: "Decompose", t: "Total temperature change: ΔT = 1,500 − 300 = 1,200 K.", s: 0.98 },
        { k: "Recall", t: "The heating rate is constant at 40 K per minute.", s: 0.97 },
        { k: "Propose", t: "t = 1,200 × 40 = 48,000 minutes.", bad: true, note: "Verifier: units do not cancel (K·K/min). Branch pruned." },
        { k: "Propose", t: "t = ΔT ÷ rate = 1,200 K ÷ 40 K/min = 30 minutes.", s: 0.96 },
        { k: "Verify", t: "Check: 300 K + 40 K/min × 30 min = 1,500 K. ✓", s: 0.99 }
      ],
      answer: "30 minutes."
    },
    security: {
      prompt: "An account shows 40 failed logins in five minutes, then a successful login from a new country. What should we do?",
      steps: [
        { k: "Observe", t: "Many failures followed by one success from an unfamiliar location fits a password-guessing or credential-stuffing pattern.", s: 0.95 },
        { k: "Propose", t: "Block all traffic from that country.", bad: true, note: "Verifier: overly broad — it disrupts legitimate users and is easily bypassed with a VPN. Pruned." },
        { k: "Hypothesize", t: "The account's password is likely compromised; the same source may be targeting other accounts.", s: 0.93 },
        { k: "Plan", t: "End the active session, force a password reset with MFA, and search logs for the source IP and related indicators across all accounts.", s: 0.95 },
        { k: "Verify", t: "Correlated logs show the same IP targeted 12 other accounts — all now protected, with no further successful logins. ✓", s: 0.96 }
      ],
      answer: "Treat it as a likely account compromise: end the session, reset credentials with MFA, and hunt for the same indicators across the environment."
    },
    debug: {
      prompt: "A fine-tuning run is stable, then the loss becomes NaN after about 2,000 steps. Why?",
      steps: [
        { k: "Observe", t: "Loss is healthy early and fails suddenly — this points to numerical instability, not a broken pipeline.", s: 0.94 },
        { k: "Propose", t: "The dataset must be corrupted.", bad: true, note: "Verifier: corrupt data usually fails early or intermittently, not after a long stable run. Pruned." },
        { k: "Hypothesize", t: "Gradient norms spike as the learning rate peaks after warmup; in fp16 this overflows to inf, then NaN.", s: 0.92 },
        { k: "Plan", t: "Clip gradients (max-norm 1.0), lower the peak learning rate or lengthen warmup, and train in bf16 or use loss scaling.", s: 0.95 },
        { k: "Verify", t: "Resuming from the step-1,800 checkpoint: gradient norm stays bounded and loss keeps decreasing. ✓", s: 0.97 }
      ],
      answer: "A numerical overflow. Clip gradients, soften the learning-rate peak, and train in bf16 (or enable loss scaling)."
    }
  };

  function reasoning() {
    var prompt = $("#rPrompt"), steps = $("#rSteps"), answer = $("#rAnswer"), status = $("#rStatus");
    var mT = $("#mTokens"), mS = $("#mSteps"), mP = $("#mPruned"), mC = $("#mConf"), mCB = $("#mConfBar");
    var presets = $$(".preset"), current = "physics", runId = 0, tokens = 0;
    if (!prompt) return;
    function wait(ms) { return new Promise(function (r) { setTimeout(r, MI.reduced ? 0 : ms); }); }
    function type(el, text, speed, id) {
      return new Promise(function (resolve) {
        if (MI.reduced) { el.textContent = text; tokens += Math.ceil(text.length / 4); mT.textContent = tokens; return resolve(); }
        var i = 0;
        (function next() {
          if (id !== runId) return resolve();
          i += 1 + ((Math.random() * 2) | 0);
          el.textContent = text.slice(0, i);
          if (i % 4 === 0) { tokens++; mT.textContent = tokens; }
          if (i < text.length) setTimeout(next, speed); else resolve();
        })();
      });
    }
    async function run(key) {
      var id = ++runId, tr = TRACES[key], nSteps = 0, pruned = 0, confs = [];
      tokens = 0;
      steps.innerHTML = ""; answer.classList.remove("is-in"); answer.innerHTML = "";
      steps.style.setProperty("--grow", 0);
      prompt.textContent = ""; mT.textContent = "0"; mS.textContent = "0"; mP.textContent = "0"; mC.textContent = "—"; mCB.style.width = "0";
      status.textContent = "REASONING"; status.className = "engine__status is-running";
      await type(prompt, tr.prompt, 18, id);
      if (id !== runId) return;
      await wait(350);
      for (var i = 0; i < tr.steps.length; i++) {
        if (id !== runId) return;
        var S = tr.steps[i], li = document.createElement("li");
        li.className = "step";
        li.innerHTML = '<div class="step__head"><span><span class="step__kind"></span> · step ' + String(i + 1).padStart(2, "0") + '</span><span class="step__verdict"></span></div><div class="step__text"></div>';
        $(".step__kind", li).textContent = S.k;
        steps.appendChild(li);
        steps.style.setProperty("--grow", (i + 1) / tr.steps.length);
        requestAnimationFrame(function (el) { return function () { el.classList.add("is-in"); }; }(li));
        await wait(200);
        await type($(".step__text", li), S.t, 12, id);
        if (id !== runId) return;
        await wait(420);
        var v = $(".step__verdict", li);
        nSteps++;
        if (S.bad) {
          pruned++; li.classList.add("is-bad"); v.textContent = "✗ pruned";
          var note = document.createElement("span"); note.className = "step__note"; note.textContent = S.note; li.appendChild(note);
        } else {
          li.classList.add("is-ok"); v.textContent = "✓ PRM " + S.s.toFixed(2); confs.push(S.s);
        }
        var avg = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : 0;
        mS.textContent = nSteps; mP.textContent = pruned;
        mC.textContent = avg ? avg.toFixed(2) : "—"; mCB.style.width = (avg * 100) + "%";
        await wait(380);
      }
      if (id !== runId) return;
      answer.innerHTML = "<small>Final answer · verified</small><p></p>";
      answer.classList.add("is-in");
      await type($("p", answer), tr.answer, 16, id);
      if (id !== runId) return;
      status.textContent = "COMPLETE"; status.className = "engine__status is-done";
    }
    presets.forEach(function (b) {
      b.addEventListener("click", function () {
        presets.forEach(function (x) { x.classList.toggle("is-active", x === b); });
        current = b.getAttribute("data-preset"); run(current);
      });
    });
    $("#rRerun").addEventListener("click", function () { run(current); });
    var started = false;
    new IntersectionObserver(function (es, obs) { if (es[0].isIntersecting && !started) { started = true; obs.disconnect(); run(current); } }, { threshold: 0.35 }).observe($(".engine"));
    MI.runTrace = function (k) { presets.forEach(function (x) { x.classList.toggle("is-active", x.getAttribute("data-preset") === k); }); current = k; started = true; run(k); };
  }

  /* ==========================================================================
     QUICK NAVIGATION (Ctrl/⌘ + K)
     ========================================================================== */
  function quickNav() {
    var box = $("#cmdk"), input = $("#cmdInput"), list = $("#cmdList"), sel = 0, items = [];
    function go(id) { return function () { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: MI.reduced ? "auto" : "smooth" }); }; }
    var CMDS = [
      { n: "Overview", d: "Section", f: go("top") },
      { n: "About the institute", d: "Section", f: go("about") },
      { n: "Government programs", d: "Section", f: go("government") },
      { n: "Research areas", d: "Section", f: go("research") },
      { n: "Training pipeline", d: "Section", f: go("pipeline") },
      { n: "Fine-Tuning Lab", d: "Interactive", f: go("finetuning") },
      { n: "Attention visualizer", d: "Interactive", f: go("attention") },
      { n: "Reasoning traces", d: "Interactive", f: go("reasoning") },
      { n: "Simulation lab", d: "Interactive", f: go("simulation") },
      { n: "Public releases", d: "Section", f: go("projects") },
      { n: "Our team", d: "Page", f: function () { location.href = "team.html"; } },
      { n: "Run trace: physics", d: "Reasoning", f: function () { go("reasoning")(); MI.runTrace("physics"); } },
      { n: "Run trace: cyber defense", d: "Reasoning", f: function () { go("reasoning")(); MI.runTrace("security"); } },
      { n: "Run trace: ML debugging", d: "Reasoning", f: function () { go("reasoning")(); MI.runTrace("debug"); } },
      { n: "Trigger a nova", d: "Universe", f: function () { go("top")(); setTimeout(function () { MI.nova(innerWidth * MI.rand(0.3, 0.7), innerHeight * MI.rand(0.3, 0.6), 1.2); }, 500); } }
    ];
    function render() {
      var q = input.value.trim().toLowerCase();
      items = CMDS.filter(function (c) { return !q || c.n.toLowerCase().indexOf(q) > -1 || c.d.toLowerCase().indexOf(q) > -1; });
      sel = Math.min(sel, Math.max(items.length - 1, 0));
      list.innerHTML = "";
      if (!items.length) { list.innerHTML = '<li class="empty">No results.</li>'; return; }
      items.forEach(function (c, i) {
        var li = document.createElement("li");
        li.className = i === sel ? "is-sel" : "";
        li.innerHTML = "<span></span><small></small>";
        li.firstChild.textContent = c.n; li.lastChild.textContent = c.d;
        li.addEventListener("pointerenter", function () { sel = i; mark(); });
        li.addEventListener("click", function () { exec(i); });
        list.appendChild(li);
      });
    }
    function mark() { $$("li", list).forEach(function (li, i) { li.classList.toggle("is-sel", i === sel); }); }
    function open() { box.classList.add("is-open"); box.setAttribute("aria-hidden", "false"); input.value = ""; sel = 0; render(); input.focus(); }
    function close() { box.classList.remove("is-open"); box.setAttribute("aria-hidden", "true"); input.blur(); }
    function exec(i) { var c = items[i]; if (!c) return; close(); setTimeout(c.f, 60); }
    input.addEventListener("input", function () { sel = 0; render(); });
    input.addEventListener("keydown", function (e) {
      var n = Math.max(items.length, 1);
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % n; mark(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + n) % n; mark(); }
      else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.classList.contains("is-open") ? close() : open(); }
      else if (e.key === "Escape" && box.classList.contains("is-open")) close();
    });
    $("#cmdOpen").addEventListener("click", open);
    box.addEventListener("click", function (e) { if (e.target.closest("[data-close-cmdk]")) close(); });
  }

  /* ==========================================================================
     FOOTER
     ========================================================================== */
  function footer() {
    var big = $("#footerBig");
    if (big) $("#footer").addEventListener("pointermove", function (e) {
      var r = big.getBoundingClientRect();
      big.style.setProperty("--fx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    });
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    cursor(); nav(); reveals(); about(); scrollFx(); cards(); pipeline(); reasoning(); quickNav(); footer();
    loader(intro);
  });
})();
