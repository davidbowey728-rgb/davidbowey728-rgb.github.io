/* ==========================================================================
   MOLTEN INSTITUTE — main.js
   Boot sequence, cursor, scroll choreography, interactions, Step Engine,
   command terminal.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var body = document.body;
  var GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEFXYZ";

  /* ==========================================================================
     TEXT SCRAMBLE
     ========================================================================== */
  function scramble(el, opts) {
    opts = opts || {};
    var final = el.getAttribute("data-final") || el.textContent;
    el.setAttribute("data-final", final);
    if (MI.reduced) { el.textContent = final; return; }
    var dur = opts.duration || 900, start = performance.now(), len = final.length;
    var token = (el._scr || 0) + 1; el._scr = token;
    (function step(now) {
      if (el._scr !== token) return;
      var p = Math.min((now - start) / dur, 1), out = "";
      for (var i = 0; i < len; i++) {
        var reveal = (i / len) * 0.75 + 0.25;
        if (p >= reveal || final[i] === " ") out += final[i];
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    })(start);
  }
  MI.scramble = scramble;

  /* ==========================================================================
     BOOT
     ========================================================================== */
  function boot(done) {
    var el = $("#boot"), log = $("#bootLog"), bar = $("#bootBar"), pct = $("#bootPct");
    var repeat = false;
    try { repeat = sessionStorage.getItem("mi-booted") === "1"; sessionStorage.setItem("mi-booted", "1"); } catch (e) {}
    var lines = [
      ["[ 0.000] MOLTEN//OS v5.0 — kernel handshake", ""],
      ["[ 0.112] mounting tensor cores ............ ", "OK", "ok"],
      ["[ 0.241] calibrating attention heads ...... ", "OK", "ok"],
      ["[ 0.388] loading research vectors (06) .... ", "OK", "ok"],
      ["[ 0.502] sanila.uplink .................... ", "LIVE", "lv"],
      ["[ 0.630] core temperature ................. ", "1,412 K", "ok"],
      ["", "IGNITION", "ign"]
    ];
    var total = MI.reduced ? 300 : repeat ? 1100 : 2600;
    var start = performance.now(), shown = 0, finished = false;

    function render(n) {
      var html = "";
      for (var i = 0; i < n; i++) {
        var L = lines[i];
        html += L[0] + (L[1] ? '<span class="' + (L[2] || "") + '">' + L[1] + "</span>" : "") + "\n";
      }
      log.innerHTML = html;
    }
    function finish() {
      if (finished) return;
      finished = true;
      render(lines.length);
      bar.style.width = "100%"; pct.textContent = "100%";
      el.classList.add("is-flash");
      setTimeout(function () {
        el.classList.add("is-done");
        done();
      }, MI.reduced ? 0 : 260);
    }
    (function tick(now) {
      if (finished) return;
      var p = Math.min((now - start) / total, 1);
      var eased = 1 - Math.pow(1 - p, 2.2);
      bar.style.width = (eased * 100).toFixed(1) + "%";
      pct.textContent = String(Math.floor(eased * 100)).padStart(3, "0") + "%";
      var n = Math.min(lines.length, Math.floor(p * (lines.length + 0.6)));
      if (n !== shown) { shown = n; render(n); }
      if (p < 1) requestAnimationFrame(tick); else finish();
    })(start);
    el.addEventListener("click", finish);
    window.addEventListener("keydown", function k(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { finish(); window.removeEventListener("keydown", k); } });
  }

  function ignite() {
    window.scrollTo(0, 0);
    body.classList.remove("is-loading");
    body.classList.add("is-ignited");
    var start = performance.now();
    (function ramp(now) {
      var p = Math.min((now - start) / 1600, 1);
      MI.ignite = 1 - Math.pow(1 - p, 3);
      if (p < 1) requestAnimationFrame(ramp);
    })(start);
    setTimeout(function () { $$("[data-scramble-hero]").forEach(function (w, i) { setTimeout(function () { scramble(w, { duration: 1100 }); }, i * 160); }); }, 150);
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
      rx = MI.lerp(rx, m.x, 0.18); ry = MI.lerp(ry, m.y, 0.18);
      dot.style.transform = "translate(" + m.x + "px," + m.y + "px)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
    }, true);
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest("a, button, [data-cursor], input, .rcard");
      if (!t) { c.classList.remove("is-hover", "is-label"); return; }
      var lab = t.getAttribute("data-cursor");
      if (lab) { label.textContent = lab; c.classList.add("is-label"); c.classList.remove("is-hover"); }
      else { c.classList.add("is-hover"); c.classList.remove("is-label"); }
    });
    document.addEventListener("pointerdown", function () { c.classList.add("is-down"); });
    document.addEventListener("pointerup", function () { c.classList.remove("is-down"); });
    document.addEventListener("pointerleave", function () { c.style.opacity = 0; });
    document.addEventListener("pointerenter", function () { c.style.opacity = 1; });

    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + x * 0.22 + "px," + y * 0.3 + "px)";
        el.style.setProperty("--bx", (e.clientX - r.left) + "px");
        el.style.setProperty("--by", (e.clientY - r.top) + "px");
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
    $$(".btn--molten").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--bx", (e.clientX - r.left) + "px");
        el.style.setProperty("--by", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ==========================================================================
     SPLIT + REVEAL
     ========================================================================== */
  function splitText(el) {
    var idx = 0;
    function walk(node) {
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
    }
    walk(el);
  }

  function reveals() {
    $$("[data-split]").forEach(splitText);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add("is-in");
        io.unobserve(el);
        if (el.hasAttribute("data-scramble")) scramble(el, { duration: 1200 });
        $$("[data-count]", el).forEach(countUp);
        if (el.classList.contains("rcard")) setTimeout(function () { el.classList.add("is-settled"); }, 1400 + (parseFloat(el.style.getPropertyValue("--d")) || 0) * 90);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
    $$("[data-reveal], [data-split], [data-scramble], .shead").forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-count")), start = performance.now(), dur = 1600;
    (function step(now) {
      var p = Math.min((now - start) / dur, 1), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = String(v).padStart(2, "0");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  /* ==========================================================================
     MISSION WORD-BY-WORD
     ========================================================================== */
  function mission() {
    var el = $("#missionText");
    if (!el) return;
    var words = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      var key = n.nodeType === 1;
      var frag = document.createDocumentFragment();
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
      var p = MI.clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      var n = Math.round(p * words.length);
      if (n === lit) return;
      lit = n;
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-lit", i < n);
    });
  }

  /* ==========================================================================
     SCROLL: progress, nav, rail, hero state, ticker velocity
     ========================================================================== */
  function scrollFx() {
    var nav = $("#nav"), bar = $("#progressBar"), ticker = $("#tickerTrack");
    var sections = $$("[data-section]");
    var navLinks = $$(".nav__links a"), railLinks = $$(".rail a");
    var lastY = scrollY, skew = 0;
    var coreTemp = $("#coreTemp");

    MI.animate(body, function (t) {
      var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      MI.scroll.v = MI.lerp(MI.scroll.v, y - lastY, 0.2);
      lastY = y;
      MI.scroll.y = y;
      MI.scroll.hero = y / innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0).toFixed(4) + ")";
      nav.classList.toggle("is-scrolled", y > 40);

      skew = MI.lerp(skew, MI.clamp(MI.scroll.v * 0.25, -12, 12), 0.1);
      if (ticker) ticker.style.setProperty("transform", "skewX(" + (-skew).toFixed(2) + "deg)");

      if (coreTemp && (t * 4 | 0) % 2 === 0) coreTemp.textContent = (1400 + Math.round(Math.sin(t) * 18 + Math.random() * 6)).toLocaleString("en-US") + " K";

      // active section
      var current = "top";
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= innerHeight * 0.45) current = sections[i].id;
      }
      if (current !== MI._active) {
        MI._active = current;
        navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + current); });
        railLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("data-rail") === current); });
      }
    }, true);

    // ticker skew needs its own wrapper so the marquee animation keeps its transform
    if (ticker) {
      var wrap = document.createElement("div");
      wrap.style.willChange = "transform";
      ticker.parentNode.insertBefore(wrap, ticker);
      wrap.appendChild(ticker);
      var tk = ticker; ticker = wrap; tk.style.removeProperty("transform");
    }

    // HUD
    var utc = $("#utc"), coords = $("#coords");
    setInterval(function () {
      var d = new Date();
      if (utc) utc.textContent = d.toISOString().substr(11, 8);
    }, 1000);
    window.addEventListener("pointermove", function () {
      if (!coords) return;
      var x = MI.mouse.nx, y = MI.mouse.ny;
      coords.textContent = "x " + (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(3) + " · y " + (y >= 0 ? "+" : "−") + Math.abs(y).toFixed(3);
    }, { passive: true });
  }

  /* ==========================================================================
     NAV: mobile menu + smooth anchor offset
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
    $$("[data-hover-scramble]").forEach(function (a) { a.addEventListener("pointerenter", function () { scramble(a, { duration: 450 }); }); });
  }

  /* ==========================================================================
     CARD TILT + DOSSIER
     ========================================================================== */
  function cards() {
    var dossier = $("#dossier"), dTitle = $("#dossierTitle"), dNo = $("#dossierNo"), dContent = $("#dossierContent");
    var lastFocus = null;

    $$("[data-tilt]").forEach(function (card) {
      if (!MI.coarse && !MI.reduced) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.classList.add("is-tilting");
          card.style.setProperty("--rx", ((0.5 - y) * 10).toFixed(2) + "deg");
          card.style.setProperty("--ry", ((x - 0.5) * 12).toFixed(2) + "deg");
          card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
          card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        });
        card.addEventListener("pointerleave", function () {
          card.classList.remove("is-tilting");
          card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg");
        });
      }
      function open() {
        var tpl = $("template", card);
        lastFocus = document.activeElement;
        dNo.textContent = $(".rcard__no", card).textContent;
        dTitle.textContent = $(".rcard__title", card).textContent;
        dContent.innerHTML = "";
        dContent.appendChild(tpl.content.cloneNode(true));
        Array.prototype.forEach.call(dContent.children, function (c, i) { c.style.transitionDelay = (0.25 + i * 0.06) + "s"; });
        dossier.classList.add("is-open");
        dossier.setAttribute("aria-hidden", "false");
        body.style.overflow = "hidden";
        scramble(dTitle, { duration: 700 });
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
    dossier.addEventListener("click", function (e) { if (e.target.closest("[data-close-dossier]")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    MI.closeDossier = close;
  }

  /* ==========================================================================
     FORGE — pinned horizontal scroll
     ========================================================================== */
  function forge() {
    var sec = $("#forge"), track = $("#forgeTrack"), bar = $("#forgeBar"), temp = $("#forgeTemp");
    var stagesEl = $$(".stage", track), dots = $$("#forgeDots i");
    var dist = 0, enabled = false;
    function layout() {
      enabled = innerWidth > 760;
      if (!enabled) { sec.style.height = ""; track.style.transform = ""; return; }
      dist = Math.max(0, track.scrollWidth - innerWidth);
      sec.style.height = (innerHeight + dist) + "px";
    }
    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);
    var cur = 0;
    MI.animate(sec, function () {
      var r = sec.getBoundingClientRect();
      var total = sec.offsetHeight - innerHeight;
      var p = enabled && total > 0 ? MI.clamp(-r.top / total, 0, 1) : MI.clamp((innerHeight - r.top) / (r.height + innerHeight), 0, 1);
      cur = MI.lerp(cur, p, 0.14);
      if (enabled) track.style.transform = "translate3d(" + (-cur * dist).toFixed(1) + "px,0,0)";
      bar.style.transform = "scaleX(" + cur.toFixed(4) + ")";
      var K = Math.round(300 + cur * 1500);
      temp.textContent = K.toLocaleString("en-US") + " K";
      sec.style.setProperty("--fheat", cur.toFixed(3));
      var active = Math.min(stagesEl.length - 1, Math.floor(cur * stagesEl.length * 0.999));
      stagesEl.forEach(function (s, i) { s.classList.toggle("is-active", enabled ? i === active : false); });
      dots.forEach(function (d, i) { d.classList.toggle("is-on", i <= active); });
    });
  }

  /* ==========================================================================
     STEP ENGINE (simulated reasoning trace)
     ========================================================================== */
  var TRACES = {
    physics: {
      prompt: "A reactor vessel heats from 300 K to 1,500 K at a steady 40 K per minute. How long does it take?",
      steps: [
        { k: "Decompose", t: "Find the total temperature change: ΔT = 1,500 − 300 = 1,200 K.", s: 0.98 },
        { k: "Recall", t: "The heating rate is constant: 40 K per minute.", s: 0.97 },
        { k: "Propose", t: "t = 1,200 × 40 = 48,000 minutes.", bad: true, note: "Verifier: units don't cancel (K·K/min). Branch pruned." },
        { k: "Propose", t: "t = ΔT ÷ rate = 1,200 K ÷ 40 K/min = 30 minutes.", s: 0.96 },
        { k: "Verify", t: "Check: 300 K + 40 K/min × 30 min = 1,500 K. ✓", s: 0.99 }
      ],
      answer: "30 minutes."
    },
    medicine: {
      prompt: "We have 10,000 generated molecules for an oral drug. What should we screen first?",
      steps: [
        { k: "Decompose", t: "Goal is an oral drug, so the molecule must be absorbed through the gut — bioavailability matters before anything else.", s: 0.95 },
        { k: "Propose", t: "Rank everything by predicted potency against the target and test the top 100.", bad: true, note: "Verifier: potent but non-absorbable compounds waste synthesis budget. Pruned." },
        { k: "Recall", t: "Apply drug-likeness filters (e.g. Lipinski's rule of five: MW ≤ 500, logP ≤ 5, ≤ 5 H-bond donors, ≤ 10 acceptors).", s: 0.94 },
        { k: "Plan", t: "Filter by drug-likeness and predicted permeability, flag toxicity risks, then rank survivors by potency.", s: 0.93 },
        { k: "Verify", t: "Funnel removes likely failures early, so compute and lab time go to viable candidates. ✓", s: 0.95 }
      ],
      answer: "Screen for drug-likeness and permeability first, filter toxicity risks, then optimize potency — and validate the shortlist in the lab."
    },
    debug: {
      prompt: "My fine-tuning run is stable, then the loss turns NaN after about 2,000 steps. Why?",
      steps: [
        { k: "Observe", t: "Loss is healthy early, then fails suddenly — a numerical instability, not a broken pipeline.", s: 0.94 },
        { k: "Propose", t: "The dataset must be corrupted.", bad: true, note: "Verifier: corrupt data usually fails early or intermittently, not after a stable run. Pruned." },
        { k: "Hypothesize", t: "Gradient norm spikes as the learning rate peaks after warmup; in fp16 this overflows to inf → NaN.", s: 0.92 },
        { k: "Plan", t: "Clip gradients (max-norm 1.0), lower peak LR or lengthen warmup, switch fp16 → bf16 or enable loss scaling.", s: 0.95 },
        { k: "Verify", t: "Resume from the step-1,800 checkpoint: grad norm stays bounded, loss keeps falling. ✓", s: 0.97 }
      ],
      answer: "A numerical blow-up. Clip gradients, soften the LR peak, and train in bf16 (or use loss scaling)."
    }
  };

  function engine() {
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
      var id = ++runId, tr = TRACES[key];
      tokens = 0; var nSteps = 0, pruned = 0, confs = [];
      steps.innerHTML = ""; answer.classList.remove("is-in"); answer.innerHTML = "";
      steps.style.setProperty("--grow", 0);
      prompt.textContent = ""; mT.textContent = "0"; mS.textContent = "0"; mP.textContent = "0"; mC.textContent = "—"; mCB.style.width = "0";
      status.textContent = "THINKING"; status.className = "engine__status is-running";
      await type(prompt, tr.prompt, 18, id);
      if (id !== runId) return;
      await wait(350);
      for (var i = 0; i < tr.steps.length; i++) {
        if (id !== runId) return;
        var S = tr.steps[i];
        var li = document.createElement("li");
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
          pruned++;
          li.classList.add("is-bad");
          v.textContent = "✗ pruned";
          var note = document.createElement("span"); note.className = "step__note"; note.textContent = S.note;
          li.appendChild(note);
        } else {
          li.classList.add("is-ok");
          v.textContent = "✓ PRM " + S.s.toFixed(2);
          confs.push(S.s);
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
        current = b.getAttribute("data-preset");
        run(current);
      });
    });
    $("#rRerun").addEventListener("click", function () { run(current); });

    var started = false;
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting && !started) { started = true; obs.disconnect(); run(current); }
    }, { threshold: 0.35 }).observe($(".engine"));
    MI.runTrace = function (k) { presets.forEach(function (x) { x.classList.toggle("is-active", x.getAttribute("data-preset") === k); }); current = k; started = true; run(k); };
  }

  /* ==========================================================================
     LAUNCH (warp overlay — does not block the link)
     ========================================================================== */
  function launch() {
    $$("[data-launch]").forEach(function (a) {
      a.addEventListener("click", function () { if (MI.warp && !MI.reduced) MI.warp(); });
    });
  }

  /* ==========================================================================
     COMMAND TERMINAL
     ========================================================================== */
  function terminal() {
    var box = $("#cmdk"), input = $("#cmdInput"), list = $("#cmdList"), sel = 0, items = [];
    function go(id) { return function () { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: MI.reduced ? "auto" : "smooth" }); }; }
    var CMDS = [
      { n: "goto core", d: "Navigate", f: go("top") },
      { n: "goto mission", d: "Navigate", f: go("mission") },
      { n: "goto research", d: "Navigate", f: go("research") },
      { n: "goto forge", d: "Navigate", f: go("forge") },
      { n: "goto step-engine", d: "Navigate", f: go("reasoning") },
      { n: "goto bio-compute", d: "Navigate", f: go("bio") },
      { n: "goto projects", d: "Navigate", f: go("projects") },
      { n: "launch sanila", d: "Open sanila.org", f: function () { window.open("https://sanila.org", "_blank", "noopener"); if (MI.warp) MI.warp(); } },
      { n: "run trace physics", d: "Step Engine", f: function () { go("reasoning")(); MI.runTrace("physics"); } },
      { n: "run trace medicine", d: "Step Engine", f: function () { go("reasoning")(); MI.runTrace("medicine"); } },
      { n: "run trace debug", d: "Step Engine", f: function () { go("reasoning")(); MI.runTrace("debug"); } },
      { n: "ignite", d: "Reheat the core", f: function () { go("top")(); var s = performance.now(); (function r(now) { var p = Math.min((now - s) / 1400, 1); MI.ignite = 0.2 + 0.8 * (1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(r); })(s); } }
    ];
    function render() {
      var q = input.value.trim().toLowerCase();
      items = CMDS.filter(function (c) { return !q || c.n.indexOf(q) > -1 || c.d.toLowerCase().indexOf(q) > -1; });
      sel = Math.min(sel, Math.max(items.length - 1, 0));
      list.innerHTML = "";
      if (!items.length) { list.innerHTML = '<li class="empty">No command found. Try "goto" or "launch".</li>'; return; }
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
    function open() { box.classList.add("is-open"); box.setAttribute("aria-hidden", "false"); input.value = ""; sel = 0; render(); setTimeout(function () { input.focus(); }, 30); }
    function close() { box.classList.remove("is-open"); box.setAttribute("aria-hidden", "true"); input.blur(); }
    function exec(i) { var c = items[i]; if (!c) return; close(); setTimeout(c.f, 60); }
    input.addEventListener("input", function () { sel = 0; render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(items.length, 1); mark(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(items.length, 1); mark(); }
      else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.classList.contains("is-open") ? close() : open(); }
      else if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName) && !body.classList.contains("is-loading")) { e.preventDefault(); open(); }
      else if (e.key === "Escape" && box.classList.contains("is-open")) close();
    });
    $("#cmdOpen").addEventListener("click", open);
    box.addEventListener("click", function (e) { if (e.target.closest("[data-close-cmdk]")) close(); });
  }

  /* ==========================================================================
     FOOTER heat-follow
     ========================================================================== */
  function footer() {
    var big = $("#footerBig");
    if (!big) return;
    $("#footer").addEventListener("pointermove", function (e) {
      var r = big.getBoundingClientRect();
      big.style.setProperty("--fx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    });
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  }

  /* ==========================================================================
     INIT
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    cursor();
    nav();
    reveals();
    mission();
    scrollFx();
    cards();
    forge();
    engine();
    launch();
    terminal();
    footer();
    // anchors inside dossier close it first
    document.addEventListener("click", function (e) {
      var a = e.target.closest('#dossier a[href^="#"]');
      if (a && MI.closeDossier) MI.closeDossier();
    });
    boot(ignite);
  });
})();
