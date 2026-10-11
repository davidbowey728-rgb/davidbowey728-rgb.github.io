/* ==========================================================================
   MOLTEN INSTITUTE — lab.js
   Interactive showcases: Fine-Tuning Lab and Attention visualizer.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI, C = MI.colors, rgba = MI.rgba, TAU = Math.PI * 2;
  var MONO = "'IBM Plex Mono', monospace";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return String(n);
  }
  function fmtLr(lr) { var e = Math.floor(Math.log10(lr)), m = lr / Math.pow(10, e); return (Math.round(m * 10) / 10) + "e" + e; }

  /* segmented control helper */
  function seg(el, onChange) {
    $$("button", el).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("button", el).forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b); });
        onChange(b.getAttribute("data-v"));
      });
    });
  }

  /* ==========================================================================
     FINE-TUNING LAB
     ========================================================================== */
  var MODELS = {
    "1": { d: 2048, L: 16, N: 1.2e9 },
    "7": { d: 4096, L: 32, N: 6.7e9 },
    "13": { d: 5120, L: 40, N: 13e9 },
    "70": { d: 8192, L: 80, N: 69e9 }
  };
  var RANKS = [2, 4, 8, 16, 32, 64, 128, 256];
  var OPT_LR = { full: 2e-5, lora: 2e-4, qlora: 2e-4 };
  var STEPS = 1000;

  function lab() {
    var root = $("#ftLab");
    if (!root) return;
    var st = { method: "lora", size: "7", rank: 16, lr: 2e-4 };
    var lossCv = $("#ftLoss"), matCv = $("#ftMatrix");
    var lctx = lossCv.getContext("2d"), mctx = matCv.getContext("2d");
    var inRank = $("#inRank"), inLr = $("#inLr"), vRank = $("#vRank"), vLr = $("#vLr");
    var out = {
      params: $("#ftParams"), pct: $("#ftPct"), mem: $("#ftMem"), gpu: $("#ftGpu"),
      step: $("#ftStep"), loss: $("#ftLossVal"), verdict: $("#ftVerdict"), status: $("#ftStatus")
    };
    var run = null, progress = 0, training = false, debounce = 0;

    // learning-rate slider: log scale 1e-6 … 3e-3
    var LMIN = Math.log10(1e-6), LMAX = Math.log10(3e-3);
    function sliderToLr(v) { return Math.pow(10, LMIN + (LMAX - LMIN) * v / 100); }
    function lrToSlider(lr) { return Math.round((Math.log10(lr) - LMIN) / (LMAX - LMIN) * 100); }
    inLr.value = lrToSlider(st.lr);

    function stats() {
      var M = MODELS[st.size], full = st.method === "full";
      var P = full ? M.N : 8 * M.L * st.rank * M.d;
      var mem;
      if (full) mem = M.N * 16;
      else if (st.method === "lora") mem = M.N * 2 + P * 16;
      else mem = M.N * 0.55 + P * 16;
      mem /= 1e9;
      out.params.textContent = fmtNum(P);
      out.pct.textContent = full ? "100%" : ((P / M.N) * 100).toFixed(P / M.N < 0.001 ? 3 : 2) + "%";
      out.mem.textContent = "≈ " + (mem < 10 ? mem.toFixed(1) : Math.round(mem)) + " GB";
      var need = mem * 1.25;
      out.gpu.textContent = need <= 24 ? "1× 24 GB" : need <= 80 ? "1× 80 GB" : Math.ceil(need / 80) + "× 80 GB";
      vRank.textContent = full ? "—" : st.rank;
      vLr.textContent = fmtLr(st.lr);
      root.classList.toggle("is-full", full);
      inRank.disabled = full;
    }

    function simulate() {
      var M = MODELS[st.size], ratio = st.lr / OPT_LR[st.method];
      var sizeK = Math.log10(parseFloat(st.size));
      var floor = (st.method === "full" ? 0.98 : 1.04 + 0.22 / Math.sqrt(st.rank)) + (st.method === "qlora" ? 0.03 : 0) - 0.14 * sizeK;
      var tau = 230 / Math.pow(MI.clamp(ratio, 0.01, 3), 0.85);
      var noiseK = 0.018 * (1 + ratio * 0.25) * (st.method === "qlora" ? 1.25 : 1);
      var divergeAt = ratio > 6 ? Math.round(MI.clamp(900 / Math.pow(ratio / 6, 1.4), 60, 900)) : -1;
      var spiky = ratio > 2.5;
      var overfit = st.method === "full" ? MI.clamp((ratio - 0.4) * 0.6, 0, 0.5) : st.rank >= 128 ? 0.12 : 0;
      var train = [], val = [], start = 2.55, cur = start, spike = 0;
      for (var s = 0; s <= STEPS; s++) {
        if (divergeAt > 0 && s >= divergeAt) { train.push(NaN); if (s % 10 === 0) val.push(NaN); continue; }
        var base = floor + (start - floor) * Math.exp(-s / tau);
        if (divergeAt > 0 && s > divergeAt - 80) base += Math.pow((s - (divergeAt - 80)) / 80, 3) * 3.5;
        if (spiky && Math.random() < 0.012) spike = MI.rand(0.3, 0.9);
        spike *= 0.93;
        cur = base + spike + gauss() * noiseK;
        train.push(Math.max(0.2, cur));
        if (s % 10 === 0) {
          var gap = 0.04 + overfit * Math.pow(Math.max(0, s - 420) / 580, 2) * 0.9;
          val.push(Math.max(0.2, base + gap + spike * 0.6 + gauss() * noiseK * 0.4));
        }
      }
      var verdict, kind;
      var vmin = Infinity, vminAt = 0;
      val.forEach(function (v, i) { if (v < vmin) { vmin = v; vminAt = i * 10; } });
      var vlast = val[val.length - 1];
      if (divergeAt > 0) { kind = "bad"; verdict = "Diverged at step " + divergeAt + " — the learning rate is too high for " + label() + ". Loss became NaN."; }
      else if (ratio < 0.12) { kind = "warn"; verdict = "Under-trained — the learning rate is too low. Loss is still falling at step 1,000."; }
      else if (vlast - vmin > 0.06) { kind = "warn"; verdict = "Converged, but validation loss rises after step " + vminAt + " — overfitting. Use early stopping, more data or a lower rank."; }
      else if (spiky) { kind = "warn"; verdict = "Converged with instability — loss spikes suggest lowering the learning rate or adding gradient clipping."; }
      else { kind = "ok"; verdict = "Stable convergence. Final validation loss " + vlast.toFixed(3) + "."; }
      return { train: train, val: val, divergeAt: divergeAt, verdict: verdict, kind: kind };
    }
    function label() { return st.method === "full" ? "full fine-tuning" : st.method === "lora" ? "LoRA" : "QLoRA"; }

    function start() {
      stats();
      run = simulate();
      progress = 0; training = true;
      out.verdict.textContent = "Training…"; out.verdict.className = "lab__verdict";
      out.status.textContent = "TRAINING"; out.status.className = "lab__status is-running";
    }
    function schedule() { clearTimeout(debounce); stats(); debounce = setTimeout(start, 260); }

    seg($('[data-ctl="method"]', root), function (v) { st.method = v; st.lr = OPT_LR[v]; inLr.value = lrToSlider(st.lr); schedule(); });
    seg($('[data-ctl="size"]', root), function (v) { st.size = v; schedule(); });
    inRank.addEventListener("input", function () { st.rank = RANKS[+inRank.value]; schedule(); });
    inLr.addEventListener("input", function () { st.lr = sliderToLr(+inLr.value); schedule(); });
    $("#ftRun").addEventListener("click", start);

    stats();
    var started = false;
    new IntersectionObserver(function (es, obs) { if (es[0].isIntersecting && !started) { started = true; obs.disconnect(); start(); } }, { threshold: 0.3 }).observe(root);

    var lbox = MI.fit(lossCv, lctx), mbox = MI.fit(matCv, mctx);
    new ResizeObserver(function () { lbox = MI.fit(lossCv, lctx); mbox = MI.fit(matCv, mctx); }).observe(root);

    // base weight matrix values
    var GRID = 18, Wv = [];
    for (var i = 0; i < GRID * GRID; i++) Wv.push(Math.random());

    MI.animate(root, function (t, dt) {
      if (training && run) {
        progress = Math.min(STEPS, progress + dt * (MI.reduced ? 5000 : 260));
        var s = Math.floor(progress), v = run.train[s];
        out.step.textContent = s.toLocaleString("en-US");
        out.loss.textContent = isNaN(v) ? "NaN" : v.toFixed(3);
        if (progress >= STEPS || (run.divergeAt > 0 && s >= run.divergeAt)) {
          training = false; progress = run.divergeAt > 0 ? run.divergeAt : STEPS;
          out.verdict.textContent = run.verdict;
          out.verdict.className = "lab__verdict is-" + run.kind;
          out.status.textContent = run.kind === "bad" ? "DIVERGED" : "COMPLETE";
          out.status.className = "lab__status is-" + (run.kind === "bad" ? "bad" : "done");
        }
      }
      drawLoss(lctx, lbox.w, lbox.h);
      drawMatrix(mctx, mbox.w, mbox.h, t);
    });

    function drawLoss(c, w, h) {
      c.clearRect(0, 0, w, h);
      var L = 46, R = 16, T = 18, B = 30, pw = w - L - R, ph = h - T - B, ymin = 0.5, ymax = 3;
      c.font = "10px " + MONO; c.lineWidth = 1;
      for (var g = 0; g <= 5; g++) {
        var y = T + ph * g / 5, val = ymax - (ymax - ymin) * g / 5;
        c.strokeStyle = rgba(C.ice, 0.06); c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke();
        c.fillStyle = rgba(C.ice, 0.35); c.fillText(val.toFixed(1), 12, y + 3);
      }
      for (g = 0; g <= 4; g++) { var x = L + pw * g / 4; c.fillStyle = rgba(C.ice, 0.35); c.fillText(String(g * 250), x - 8, h - 10); }
      c.fillStyle = rgba(C.ice, 0.45); c.fillText("loss", 12, 10); c.fillText("step", L + pw - 24, h - 10);
      if (!run) return;
      var upto = Math.floor(progress);
      function X(s) { return L + pw * s / STEPS; }
      function Y(v) { return T + ph * (1 - (MI.clamp(v, ymin, ymax) - ymin) / (ymax - ymin)); }
      // train
      c.strokeStyle = rgba(C.mint, 0.95); c.lineWidth = 1.4; c.shadowColor = rgba(C.mint, 0.7); c.shadowBlur = 8;
      c.beginPath(); var pen = false;
      for (var s = 0; s <= upto; s += 2) { var v = run.train[s]; if (isNaN(v)) break; if (!pen) { c.moveTo(X(s), Y(v)); pen = true; } else c.lineTo(X(s), Y(v)); }
      c.stroke(); c.shadowBlur = 0;
      // val
      c.strokeStyle = rgba(C.ice, 0.75); c.setLineDash([4, 4]); c.lineWidth = 1.2; c.beginPath(); pen = false;
      for (var k = 0; k * 10 <= upto; k++) { var vv = run.val[k]; if (isNaN(vv)) break; if (!pen) { c.moveTo(X(k * 10), Y(vv)); pen = true; } else c.lineTo(X(k * 10), Y(vv)); }
      c.stroke(); c.setLineDash([]);
      // head
      var hv = run.train[Math.min(upto, STEPS)];
      if (!isNaN(hv)) { c.fillStyle = "#fff"; c.beginPath(); c.arc(X(upto), Y(hv), 3, 0, TAU); c.fill(); }
      if (run.divergeAt > 0 && upto >= run.divergeAt) {
        var dx = X(run.divergeAt), dy = T + 12;
        c.strokeStyle = "rgba(255,110,110,.9)"; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(dx - 6, dy - 6); c.lineTo(dx + 6, dy + 6); c.moveTo(dx + 6, dy - 6); c.lineTo(dx - 6, dy + 6); c.stroke();
        c.fillStyle = "rgba(255,130,130,.95)"; c.fillText("NaN", dx + 10, dy + 4);
      }
      // legend
      c.fillStyle = rgba(C.mint, 0.95); c.fillRect(L + 10, T + 6, 14, 2); c.fillStyle = rgba(C.ice, 0.6); c.fillText("train", L + 30, T + 10);
      c.fillStyle = rgba(C.ice, 0.75); c.fillRect(L + 74, T + 6, 4, 2); c.fillRect(L + 80, T + 6, 4, 2); c.fillStyle = rgba(C.ice, 0.6); c.fillText("validation", L + 92, T + 10);
    }

    function drawMatrix(c, w, h, t) {
      c.clearRect(0, 0, w, h);
      var full = st.method === "full", q = st.method === "qlora";
      var active = training ? 1 : 0.25;
      var rv = Math.max(1, Math.min(8, Math.round(Math.log2(st.rank) * 1.2)));
      var cell = full ? Math.min((h - 70) / GRID, (w - 40) / GRID) : Math.min((h - 90) / GRID, (w - 70) / (2 * GRID + rv));
      var size = cell * GRID;
      var wx = full ? (w - size) / 2 : Math.max(16, (w - (2 * GRID + rv) * cell - 40) / 2), wy = 32;
      c.font = "10px " + MONO;
      // W
      for (var y = 0; y < GRID; y++) for (var x = 0; x < GRID; x++) {
        var v = Wv[y * GRID + x];
        if (q) v = Math.round(v * 3) / 3;
        var upd = full ? (Math.sin(t * 5 + x * 0.7 + y * 1.3) * 0.5 + 0.5) * active : 0;
        c.fillStyle = rgba(upd > 0.6 ? C.mint : C.teal, (0.12 + v * 0.35 + upd * 0.35).toFixed(3));
        c.fillRect(wx + x * cell + 0.5, wy + y * cell + 0.5, cell - 1, cell - 1);
      }
      c.fillStyle = rgba(C.ice, 0.7);
      c.fillText(full ? "W  (all " + fmtNum(MODELS[st.size].N) + " weights updated)" : q ? "W  (4-bit NF4 · frozen)" : "W  (bf16 · frozen)", wx, wy - 10);
      if (full) return;
      // + B·A
      var bx = wx + size + 26, ax = bx + rv * cell + 14;
      c.fillStyle = rgba(C.ice, 0.6); c.font = "16px " + MONO; c.fillText("+", wx + size + 8, wy + size / 2 + 5);
      c.font = "10px " + MONO;
      for (y = 0; y < GRID; y++) for (x = 0; x < rv; x++) {
        var sh = (Math.sin(t * 4 + y * 0.9 + x * 2.1) * 0.5 + 0.5) * active;
        c.fillStyle = rgba(sh > 0.55 ? C.ice : C.mint, (0.2 + sh * 0.6).toFixed(3));
        c.fillRect(bx + x * cell + 0.5, wy + y * cell + 0.5, cell - 1, cell - 1);
      }
      for (y = 0; y < rv; y++) for (x = 0; x < GRID; x++) {
        var sa = (Math.cos(t * 4 + x * 0.8 + y * 1.7) * 0.5 + 0.5) * active;
        c.fillStyle = rgba(sa > 0.55 ? C.ice : C.mint, (0.2 + sa * 0.6).toFixed(3));
        c.fillRect(ax + x * cell + 0.5, wy + y * cell + 0.5, cell - 1, cell - 1);
      }
      c.fillStyle = rgba(C.ice, 0.7);
      c.fillText("B", bx, wy - 10); c.fillText("A", ax, wy - 10);
      c.fillStyle = rgba(C.mint, 0.9);
      c.fillText("W′ = W + BA,  r = " + st.rank, wx, wy + size + 24);
      c.fillStyle = rgba(C.ice, 0.4);
      c.fillText("B ∈ ℝ^(d×r) · A ∈ ℝ^(r×d) · only B and A are trained", wx, wy + size + 42);
    }
  }

  /* ==========================================================================
     ATTENTION VISUALIZER
     ========================================================================== */
  var TOKENS = ["The", "model", "reads", "the", "question", ",", "reasons", "step", "by", "step", ",", "then", "answers", "."];
  var HEADS = [
    { name: "Previous token", desc: "Attends almost entirely to the token immediately before it — a positional head found in nearly every transformer.", rules: function (i) { var r = {}; if (i > 0) r[i - 1] = 6; r[i] = 2; return r; } },
    { name: "Syntax", desc: "Links words to their grammatical heads: verbs to their subjects, nouns to their determiners.", rules: function (i) { return ({ 1: { 0: 5 }, 2: { 1: 6 }, 3: { 2: 3 }, 4: { 2: 5, 3: 4 }, 5: { 4: 4 }, 6: { 1: 6 }, 7: { 6: 5 }, 8: { 7: 5 }, 9: { 8: 4, 6: 2 }, 10: { 9: 3 }, 11: { 6: 5 }, 12: { 1: 6, 11: 2 }, 13: { 12: 5 } })[i] || { 0: 1 }; } },
    { name: "Long-range", desc: "Connects distant, semantically related tokens — the answer attends back to the question and the reasoning.", rules: function (i) { return ({ 4: { 1: 4 }, 6: { 4: 6, 2: 3 }, 9: { 7: 6 }, 11: { 6: 5, 4: 2 }, 12: { 4: 6, 6: 5 }, 13: { 4: 3, 12: 3 } })[i] || { 0: 2 }; } },
    { name: "Attention sink", desc: "Parks most of its attention on the first token and spreads the rest evenly — a common 'no-op' pattern.", rules: function () { return { 0: 5 }; } }
  ];

  function matrixFor(head) {
    var n = TOKENS.length, M = [];
    for (var i = 0; i < n; i++) {
      var row = [], rules = HEADS[head].rules(i), sum = 0;
      for (var j = 0; j < n; j++) {
        var v = j <= i ? Math.exp((rules[j] || 0) * 0.8) * (head === 3 ? 1 : 0.6) : 0;
        row.push(v); sum += v;
      }
      for (j = 0; j < n; j++) row[j] /= sum || 1;
      M.push(row);
    }
    return M;
  }

  function attention() {
    var root = $("#attn");
    if (!root) return;
    var tokWrap = $("#attnTokens"), arcs = $("#attnArcs"), mat = $("#attnMatrix"), desc = $("#attnDesc");
    var actx = arcs.getContext("2d"), mctx = mat.getContext("2d");
    var head = 0, M = matrixFor(0), sel = 12, userSel = false, lastAuto = 0, shown = [];
    TOKENS.forEach(function (tk, i) {
      var b = document.createElement("button");
      b.className = "tok"; b.textContent = tk; b.type = "button";
      b.addEventListener("pointerenter", function () { sel = i; userSel = true; mark(); });
      b.addEventListener("focus", function () { sel = i; userSel = true; mark(); });
      b.addEventListener("click", function () { sel = i; userSel = true; mark(); });
      tokWrap.appendChild(b);
    });
    tokWrap.addEventListener("pointerleave", function () { userSel = false; lastAuto = performance.now() / 1000; });
    var toks = $$(".tok", tokWrap);
    function mark() { toks.forEach(function (b, i) { b.classList.toggle("is-sel", i === sel); b.style.setProperty("--w", (i <= sel ? M[sel][i] : 0).toFixed(3)); }); }
    function setHead(h) { head = h; M = matrixFor(h); desc.textContent = HEADS[h].desc; mark(); }
    seg($('[data-ctl="head"]', root), function (v) { setHead(+v); });
    setHead(0);
    shown = M[sel].slice();

    var abox = MI.fit(arcs, actx), mbox = MI.fit(mat, mctx);
    new ResizeObserver(function () { abox = MI.fit(arcs, actx); mbox = MI.fit(mat, mctx); }).observe(root);

    MI.animate(root, function (t) {
      if (!userSel && t - lastAuto > 1.4) { lastAuto = t; sel = sel >= TOKENS.length - 1 ? 1 : sel + 1; mark(); }
      for (var j = 0; j < TOKENS.length; j++) shown[j] = MI.lerp(shown[j] || 0, j <= sel ? M[sel][j] : 0, 0.15);
      // arcs
      var c = actx, w = abox.w, h = abox.h, rootR = arcs.getBoundingClientRect();
      c.clearRect(0, 0, w, h);
      var centers = toks.map(function (b) { var r = b.getBoundingClientRect(); return [r.left + r.width / 2 - rootR.left, r.top - rootR.top]; });
      var src = centers[sel];
      if (!src) return;
      for (j = 0; j < TOKENS.length; j++) {
        var wgt = shown[j];
        if (wgt < 0.01) continue;
        var dst = centers[j], midx = (src[0] + dst[0]) / 2, lift = Math.min(h * 0.9, 24 + Math.abs(src[0] - dst[0]) * 0.45);
        c.strokeStyle = rgba(wgt > 0.25 ? C.ice : C.mint, MI.clamp(0.15 + wgt * 1.4, 0, 1).toFixed(3));
        c.lineWidth = 0.6 + wgt * 9;
        c.shadowColor = rgba(C.mint, 0.8); c.shadowBlur = wgt * 18;
        c.beginPath(); c.moveTo(src[0], src[1]); c.quadraticCurveTo(midx, src[1] - lift, dst[0], dst[1]); c.stroke();
        c.shadowBlur = 0;
        if (wgt > 0.12) {
          c.font = "10px " + MONO; c.fillStyle = rgba(C.ice, 0.85); c.textAlign = "center";
          c.fillText(wgt.toFixed(2), midx, src[1] - lift * 0.55 - 4);
        }
        // travelling particle
        var p = (t * 0.8 + j * 0.13) % 1, qx = (1 - p) * (1 - p) * src[0] + 2 * (1 - p) * p * midx + p * p * dst[0], qy = (1 - p) * (1 - p) * src[1] + 2 * (1 - p) * p * (src[1] - lift) + p * p * dst[1];
        c.fillStyle = rgba(C.ice, MI.clamp(wgt * 2, 0, 1).toFixed(3)); c.beginPath(); c.arc(qx, qy, 1.5 + wgt * 2, 0, TAU); c.fill();
      }
      c.textAlign = "start";
      // matrix
      var m = mctx, mw = mbox.w, mh = mbox.h, n = TOKENS.length, pad = 4, cs = Math.min((mw - pad * 2) / n, (mh - pad * 2) / n), ox = (mw - cs * n) / 2, oy = (mh - cs * n) / 2;
      m.clearRect(0, 0, mw, mh);
      for (var i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var v = M[i][j];
        m.fillStyle = j > i ? "rgba(255,255,255,.015)" : rgba(v > 0.3 ? C.ice : C.teal, (0.06 + Math.sqrt(v) * 0.9).toFixed(3));
        m.fillRect(ox + j * cs + 0.5, oy + i * cs + 0.5, cs - 1, cs - 1);
      }
      m.strokeStyle = rgba(C.mint, 0.95); m.lineWidth = 1.2;
      m.strokeRect(ox + 0.5, oy + sel * cs + 0.5, cs * n - 1, cs - 1);
    });
  }

  document.addEventListener("DOMContentLoaded", function () { lab(); attention(); });
})();
