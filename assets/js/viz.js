/* ==========================================================================
   MOLTEN INSTITUTE — viz.js
   Section visualizations: research areas, training pipeline stages,
   DNA helix, Sanila neural sphere.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI, C = MI.colors, TAU = Math.PI * 2, rgba = MI.rgba;
  var MONO = "'IBM Plex Mono', monospace";

  function makeCanvas(canvas, draw, hoverEl) {
    var ctx = canvas.getContext("2d");
    var state = { energy: 0, target: 0, box: MI.fit(canvas, ctx) };
    var host = hoverEl || canvas;
    host.addEventListener("pointerenter", function () { state.target = 1; });
    host.addEventListener("pointerleave", function () { state.target = 0; });
    new ResizeObserver(function () { state.box = MI.fit(canvas, ctx); }).observe(canvas);
    MI.animate(canvas, function (t, dt) {
      state.energy = MI.lerp(state.energy, state.target, 0.06);
      var b = state.box;
      ctx.clearRect(0, 0, b.w, b.h);
      draw(ctx, b.w, b.h, t, dt, state.energy, state);
    });
    return state;
  }

  function glowDot(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, rgba(C.ice, a)); g.addColorStop(0.35, rgba(col, a * 0.7)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, TAU); c.fill();
  }

  /* ==========================================================================
     RESEARCH AREAS
     ========================================================================== */
  var research = {
    llm: function (canvas, card) {
      var tokens = 14, arcs = [];
      for (var i = 0; i < 26; i++) arcs.push({ a: (Math.random() * tokens) | 0, b: (Math.random() * tokens) | 0, ph: Math.random() * TAU, s: MI.rand(0.4, 1.2) });
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var y = h * 0.62, pad = 26, step = (w - pad * 2) / (tokens - 1);
        c.lineWidth = 1;
        arcs.forEach(function (A, i) {
          if (A.a === A.b) return;
          var x1 = pad + A.a * step, x2 = pad + A.b * step;
          var s = Math.pow(Math.sin(t * A.s * (1 + e) + A.ph) * 0.5 + 0.5, 3);
          c.strokeStyle = rgba(i % 5 === 0 ? C.ice : C.teal, (0.06 + s * (0.5 + e * 0.4)).toFixed(3));
          c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo((x1 + x2) / 2, y - Math.abs(x2 - x1) * 0.55, x2, y); c.stroke();
        });
        for (var k = 0; k < tokens; k++) {
          var x = pad + k * step, act = Math.sin(t * 2 + k * 0.7) * 0.5 + 0.5;
          c.fillStyle = rgba(C.mint, (0.25 + act * 0.6 * (0.5 + e)).toFixed(3));
          c.fillRect(x - 4, y - 4, 8, 8);
          c.fillStyle = rgba(C.teal, 0.14);
          c.fillRect(x - 0.5, y + 10, 1, 10 + act * 26);
        }
      }, card);
    },

    finetune: function (canvas, card) {
      var pts = [];
      for (var i = 0; i < 120; i++) { var x = i / 119; pts.push(0.12 + 0.75 * Math.exp(-x * 4.2) + (Math.random() - 0.5) * 0.06 * (1 - x * 0.6)); }
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var gx = w - 120, gy = 30, cell = 9;
        for (var r = 0; r < 8; r++) for (var q = 0; q < 2; q++) {
          var v = Math.sin(t * 1.5 + r * 0.8 + q * 2) * 0.5 + 0.5;
          c.fillStyle = rgba(q ? C.ice : C.teal, (0.1 + v * 0.5 * (0.5 + e)).toFixed(3));
          c.fillRect(gx + q * (cell + 2), gy + r * (cell + 2), cell, cell);
          c.fillRect(gx + 30 + r * (cell + 2), gy + q * (cell + 2) + 34, cell, cell);
        }
        c.font = "9px " + MONO; c.fillStyle = rgba(C.ice, 0.4);
        c.fillText("ΔW = B·A", gx + 30, gy + 80);
        var prog = (t * (0.12 + e * 0.2)) % 1.2, n = Math.floor(MI.clamp(prog, 0, 1) * (pts.length - 1));
        var x0 = 24, x1 = w - 150, y0 = 26, y1 = h * 0.8;
        c.strokeStyle = rgba(C.ice, 0.06); c.beginPath();
        for (var g = 0; g < 4; g++) { var yy = y0 + (y1 - y0) * g / 3; c.moveTo(x0, yy); c.lineTo(x1, yy); }
        c.stroke();
        c.lineWidth = 1.6; c.strokeStyle = rgba(C.mint, 0.95); c.shadowColor = rgba(C.mint, 0.8); c.shadowBlur = 10;
        c.beginPath();
        for (var k = 0; k <= n; k++) { var px = x0 + (x1 - x0) * k / (pts.length - 1), py = y0 + (y1 - y0) * (1 - pts[k]); k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke(); c.shadowBlur = 0;
        if (n > 0) {
          var hx = x0 + (x1 - x0) * n / (pts.length - 1), hy = y0 + (y1 - y0) * (1 - pts[n]);
          c.fillStyle = "#fff"; c.beginPath(); c.arc(hx, hy, 2.5, 0, TAU); c.fill();
          c.fillStyle = rgba(C.mint, 0.8); c.fillText("loss " + pts[n].toFixed(3), Math.min(hx + 8, x1 - 50), hy - 8);
        }
      }, card);
    },

    steps: function (canvas, card) {
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cols = 5, rows = 3, x0 = 30, x1 = w - 30, y0 = 34, y1 = h * 0.78, path = [1, 0, 1, 2, 1], bad = { c: 2, r: 0 };
        function P(ci, ri) { return [x0 + (x1 - x0) * ci / (cols - 1), y0 + (y1 - y0) * ri / (rows - 1)]; }
        c.lineWidth = 1;
        for (var ci = 0; ci < cols - 1; ci++) for (var a = 0; a < rows; a++) for (var b = 0; b < rows; b++) {
          var p1 = P(ci, a), p2 = P(ci + 1, b), on = path[ci] === a && path[ci + 1] === b;
          c.strokeStyle = on ? rgba(C.mint, 0.55 + e * 0.4) : rgba(C.ice, 0.05);
          c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
        }
        var seg = ((t * (0.35 + e * 0.5)) % 1.25) * (cols - 1);
        for (ci = 0; ci < cols; ci++) for (var r = 0; r < rows; r++) {
          var p = P(ci, r), chosen = path[ci] === r, reached = chosen && seg >= ci;
          if (ci === bad.c && r === bad.r && seg > bad.c - 0.4) {
            c.strokeStyle = "rgba(255,110,110,.8)"; c.beginPath();
            c.moveTo(p[0] - 5, p[1] - 5); c.lineTo(p[0] + 5, p[1] + 5); c.moveTo(p[0] + 5, p[1] - 5); c.lineTo(p[0] - 5, p[1] + 5); c.stroke();
            continue;
          }
          c.fillStyle = reached ? rgba(C.ice, 1) : rgba(C.ice, chosen ? 0.35 : 0.12);
          c.beginPath(); c.arc(p[0], p[1], chosen ? 5 : 3.5, 0, TAU); c.fill();
          if (reached) { c.fillStyle = rgba(C.mint, 0.2); c.beginPath(); c.arc(p[0], p[1], 12, 0, TAU); c.fill(); }
        }
        if (seg < cols - 1) {
          var i0 = Math.floor(seg), f = seg - i0, pa = P(i0, path[i0]), pb = P(i0 + 1, path[i0 + 1]);
          c.fillStyle = "#fff"; c.shadowColor = rgba(C.mint, 1); c.shadowBlur = 14;
          c.beginPath(); c.arc(MI.lerp(pa[0], pb[0], f), MI.lerp(pa[1], pb[1], f), 3, 0, TAU); c.fill(); c.shadowBlur = 0;
        }
      }, card);
    },

    med: function (canvas, card) {
      var atoms = [], bonds = [];
      for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; atoms.push([Math.cos(a), Math.sin(a), 0, 1]); bonds.push([i, (i + 1) % 6]); }
      [[0, 1.9, 0.3, 2], [3, 1.9, -0.4, 3], [1, 1.8, 0.8, 2], [5, 1.8, -0.6, 3]].forEach(function (s) {
        var base = atoms[s[0]], idx = atoms.length;
        atoms.push([base[0] * s[1], base[1] * s[1], s[2], s[3]]); bonds.push([s[0], idx]);
        if (s[3] === 2) { atoms.push([base[0] * (s[1] + 0.8), base[1] * (s[1] + 0.8) + 0.4, s[2] - 0.5, 1]); bonds.push([idx, atoms.length - 1]); }
      });
      makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
        st.rot = (st.rot || 0) + dt * (0.4 + e * 1.2);
        var ry = st.rot, rx = 0.5 + Math.sin(t * 0.4) * 0.3, cx = w * 0.5, cy = h * 0.45, S = Math.min(w, h) * 0.2;
        var P = atoms.map(function (a) {
          var x = a[0] * Math.cos(ry) - a[2] * Math.sin(ry), z = a[0] * Math.sin(ry) + a[2] * Math.cos(ry);
          var y = a[1] * Math.cos(rx) - z * Math.sin(rx); z = a[1] * Math.sin(rx) + z * Math.cos(rx);
          var k = 3.2 / (3.2 + z);
          return { x: cx + x * S * k, y: cy + y * S * k, z: z, k: k, t: a[3] };
        });
        c.lineWidth = 1.2;
        bonds.forEach(function (b) { var A = P[b[0]], B = P[b[1]]; c.strokeStyle = rgba(C.mint, (0.25 + 0.3 * (1 - (A.z + B.z) / 4)).toFixed(3)); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); });
        P.slice().sort(function (a, b) { return b.z - a.z; }).forEach(function (p) {
          glowDot(c, p.x, p.y, (p.t === 1 ? 4 : 5.5) * p.k * 0.8, p.t === 2 ? C.ice : p.t === 3 ? C.deep : C.teal, 0.95);
        });
      }, card);
    },

    agents: function (canvas, card) {
      var tools = ["search", "code", "memory", "api", "plan", "eval"];
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cx = w * 0.5, cy = h * 0.45, R = Math.min(w, h * 1.6) * 0.3;
        c.strokeStyle = rgba(C.ice, 0.06); c.beginPath(); c.ellipse(cx, cy, R, R * 0.45, 0, 0, TAU); c.stroke();
        var active = Math.floor(t * (0.7 + e)) % tools.length;
        c.font = "9px " + MONO; c.textAlign = "center";
        tools.forEach(function (name, i) {
          var a = t * (0.25 + e * 0.3) + i / tools.length * TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.45, on = i === active;
          if (on) {
            var f = (t * (0.7 + e)) % 1;
            c.strokeStyle = rgba(C.mint, 0.7); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
            c.fillStyle = "#fff"; c.beginPath(); c.arc(MI.lerp(cx, x, f), MI.lerp(cy, y, f), 2.2, 0, TAU); c.fill();
          }
          c.fillStyle = on ? rgba(C.ice, 1) : rgba(C.ice, 0.3); c.beginPath(); c.arc(x, y, on ? 4.5 : 3, 0, TAU); c.fill();
          c.fillStyle = on ? rgba(C.mint, 0.95) : rgba(C.ice, 0.3); c.fillText(name, x, y - 10);
        });
        glowDot(c, cx, cy, 9, C.teal, 1);
        c.textAlign = "start";
      }, card);
    },

    interp: function (canvas, card) {
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cols = 18, rows = 7, gx = 22, gy = 24, cw = (w - gx * 2) / cols, ch = (h * 0.78 - gy) / rows;
        var circuit = [[2, 1], [5, 3], [8, 2], [11, 4], [14, 3], [16, 5]];
        for (var x = 0; x < cols; x++) for (var y = 0; y < rows; y++) {
          var v = Math.pow(Math.sin(x * 0.55 + t * 1.6) * Math.cos(y * 0.9 - t * 1.1) * 0.5 + 0.5, 2.2);
          c.fillStyle = rgba(C.teal, (0.05 + v * 0.5 * (0.6 + e)).toFixed(3));
          c.fillRect(gx + x * cw + 1, gy + y * ch + 1, cw - 2, ch - 2);
        }
        var k = (t * (0.6 + e)) % circuit.length;
        c.strokeStyle = rgba(C.ice, 0.6 + e * 0.3); c.lineWidth = 1.2; c.beginPath();
        circuit.forEach(function (p, i) { var px = gx + (p[0] + 0.5) * cw, py = gy + (p[1] + 0.5) * ch; i ? c.lineTo(px, py) : c.moveTo(px, py); });
        c.stroke();
        circuit.forEach(function (p, i) {
          var px = gx + (p[0] + 0.5) * cw, py = gy + (p[1] + 0.5) * ch;
          c.strokeStyle = i <= k ? rgba(C.mint, 0.95) : rgba(C.mint, 0.3); c.strokeRect(px - cw / 2 + 1, py - ch / 2 + 1, cw - 2, ch - 2);
        });
      }, card);
    }
  };

  /* ==========================================================================
     TRAINING PIPELINE STAGES
     ========================================================================== */
  var stages = {
    curation: function (canvas) {
      var words = "the of model data code λ ∑ token def return proof cell protein ∂ ∇ attention theorem lemma fn() SELECT gene ψ".split(" ");
      var P = [];
      for (var i = 0; i < 70; i++) P.push({ x: Math.random(), y: Math.random(), v: MI.rand(0.05, 0.18), g: words[(Math.random() * words.length) | 0], keep: Math.random() > 0.35 });
      makeCanvas(canvas, function (c, w, h, t, dt) {
        var fy = h * 0.62;
        c.strokeStyle = rgba(C.teal, 0.5); c.beginPath(); c.moveTo(w * 0.15, fy - 60); c.lineTo(w * 0.45, fy); c.lineTo(w * 0.55, fy); c.lineTo(w * 0.85, fy - 60); c.stroke();
        c.font = "11px " + MONO; c.textAlign = "center";
        P.forEach(function (p) {
          p.y += p.v * dt;
          if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); p.keep = Math.random() > 0.35; }
          var py = p.y * h, px = p.x * w;
          if (py > fy - 60) px = MI.lerp(px, w * 0.5, MI.clamp((py - (fy - 60)) / 60, 0, 1));
          if (py > fy && !p.keep) return;
          c.fillStyle = py > fy ? rgba(C.mint, 0.9) : (p.keep ? rgba(C.ice, 0.4) : "rgba(255,120,120,.28)");
          c.fillText(py > fy ? "■" : p.g, px, py);
        });
        c.textAlign = "start"; c.fillStyle = rgba(C.ice, 0.45);
        c.fillText("filter · dedupe · mix", 20, h - 16);
      });
    },
    pretrain: function (canvas) {
      var P = [];
      for (var i = 0; i < 160; i++) P.push({ a: Math.random() * TAU, r: MI.rand(0.3, 1), s: MI.rand(0.2, 0.8) });
      makeCanvas(canvas, function (c, w, h, t, dt) {
        var cx = w / 2, cy = h * 0.48, R = Math.min(w, h) * 0.42;
        c.globalCompositeOperation = "lighter";
        P.forEach(function (p) {
          p.r -= dt * p.s * 0.25; p.a += dt * p.s * 1.4;
          if (p.r < 0.05) { p.r = 1; p.a = Math.random() * TAU; }
          c.fillStyle = rgba(p.r < 0.4 ? C.ice : C.teal, ((1 - p.r) * 0.9).toFixed(3));
          c.beginPath(); c.arc(cx + Math.cos(p.a) * p.r * R, cy + Math.sin(p.a) * p.r * R * 0.7, 1.6, 0, TAU); c.fill();
        });
        glowDot(c, cx, cy, 16 + Math.sin(t * 2) * 2, C.mint, 1);
        c.globalCompositeOperation = "source-over";
        c.font = "10px " + MONO; c.fillStyle = rgba(C.ice, 0.45);
        c.fillText("next-token prediction", 20, h - 16);
      });
    },
    sft: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var lines = 9, order = Math.sin(t * 0.5) * 0.5 + 0.5;
        for (var l = 0; l < lines; l++) {
          var y0 = h * 0.16 + l * (h * 0.58 / (lines - 1));
          c.strokeStyle = l === 4 ? rgba(C.ice, 0.9) : rgba(C.teal, 0.4); c.lineWidth = l === 4 ? 1.8 : 1;
          c.beginPath();
          for (var x = 0; x <= w; x += 6) {
            var chaos = Math.sin(x * 0.05 + l * 3 + t * 3) * 14 + Math.sin(x * 0.13 - t * 2 + l) * 8, calm = Math.sin(x * 0.02 + t * 1.2) * 10;
            var y = y0 + MI.lerp(chaos, calm, order);
            x ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
        c.font = "10px " + MONO; c.fillStyle = rgba(C.mint, 0.85);
        c.fillText("instruction following " + (order * 100).toFixed(1) + "%", 20, h - 16);
      });
    },
    preference: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var cyc = (t * 0.35) % 1, pick = Math.floor(t * 0.35) % 2;
        var bw = Math.min(150, w * 0.36), bh = 62, gap = 18, x0 = w / 2 - bw - gap / 2, y0 = h * 0.3;
        ["Response A", "Response B"].forEach(function (lab, i) {
          var x = x0 + i * (bw + gap), win = i === pick && cyc > 0.45;
          c.strokeStyle = win ? rgba(C.mint, 0.9) : rgba(C.ice, 0.15); c.lineWidth = 1;
          c.fillStyle = win ? rgba(C.teal, 0.12) : "rgba(255,255,255,.02)";
          c.beginPath(); c.roundRect ? c.roundRect(x, y0, bw, bh, 8) : c.rect(x, y0, bw, bh); c.fill(); c.stroke();
          c.font = "10px " + MONO; c.fillStyle = rgba(C.ice, 0.6); c.fillText(lab, x + 10, y0 + 18);
          for (var k = 0; k < 3; k++) { c.fillStyle = rgba(C.ice, 0.12); c.fillRect(x + 10, y0 + 28 + k * 9, bw - 20 - k * 22, 4); }
          if (win) { c.fillStyle = rgba(C.mint, 1); c.fillText("preferred  y_w", x + 10, y0 + bh + 18); }
        });
        // reward meter
        var my = h * 0.74, mw = w * 0.7, mx = (w - mw) / 2, val = MI.clamp((cyc - 0.2) / 0.5, 0, 1);
        c.fillStyle = rgba(C.ice, 0.08); c.fillRect(mx, my, mw, 4);
        var grd = c.createLinearGradient(mx, 0, mx + mw, 0); grd.addColorStop(0, rgba(C.deep, 1)); grd.addColorStop(1, rgba(C.mint, 1));
        c.fillStyle = grd; c.fillRect(mx, my, mw * (0.35 + val * 0.5), 4);
        c.font = "10px " + MONO; c.fillStyle = rgba(C.ice, 0.5);
        c.fillText("reward r(x, y)", mx, my - 8);
        c.fillStyle = rgba(C.mint, 0.85);
        c.fillText("L = −log σ(β·Δ log π)", 20, h - 16);
      });
    },
    reasoning: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var n = 6, sw = (w - 60) / n, sh = (h * 0.6) / n, x0 = 30, y0 = h * 0.82, k = (t * 0.9) % (n + 2);
        for (var i = 0; i < n; i++) {
          var x = x0 + i * sw, y = y0 - (i + 1) * sh, on = i < k;
          c.fillStyle = on ? rgba(C.teal, 0.2) : "rgba(255,255,255,.03)";
          c.strokeStyle = on ? rgba(C.mint, 0.85) : rgba(C.ice, 0.1);
          c.fillRect(x, y, sw - 6, y0 - y); c.strokeRect(x + 0.5, y + 0.5, sw - 7, y0 - y - 1);
          c.font = "10px " + MONO; c.fillStyle = on ? rgba(C.ice, 1) : rgba(C.ice, 0.25);
          c.fillText("s" + (i + 1), x + 8, y + 16);
          if (on) { c.fillStyle = rgba(C.mint, 0.95); c.fillText("✓", x + sw - 22, y + 16); }
        }
        var ci = Math.min(Math.floor(k), n - 1);
        c.fillStyle = "#fff"; c.shadowColor = rgba(C.mint, 1); c.shadowBlur = 16;
        c.beginPath(); c.arc(x0 + ci * sw + (sw - 6) / 2, y0 - (ci + 1) * sh - 10, 4, 0, TAU); c.fill(); c.shadowBlur = 0;
      });
    },
    evaluation: function (canvas) {
      var axes = ["Reasoning", "Coding", "Knowledge", "Long context", "Safety", "Multilingual"];
      makeCanvas(canvas, function (c, w, h, t) {
        var cx = w / 2, cy = h * 0.47, R = Math.min(w, h) * 0.3, n = axes.length;
        c.strokeStyle = rgba(C.ice, 0.08); c.lineWidth = 1;
        for (var ring = 1; ring <= 4; ring++) {
          c.beginPath();
          for (var i = 0; i <= n; i++) { var a = i / n * TAU - Math.PI / 2, rr = R * ring / 4; i ? c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
          c.stroke();
        }
        c.font = "9px " + MONO; c.textAlign = "center";
        var grow = MI.clamp(((t * 0.3) % 1.3) / 0.8, 0, 1);
        c.beginPath();
        for (i = 0; i <= n; i++) {
          var k = i % n, ang = k / n * TAU - Math.PI / 2, v = (0.55 + 0.4 * Math.abs(Math.sin(k * 1.7 + 0.4))) * MI.ease(grow);
          var px = cx + Math.cos(ang) * R * v, py = cy + Math.sin(ang) * R * v;
          i ? c.lineTo(px, py) : c.moveTo(px, py);
          if (i < n) { c.fillStyle = rgba(C.ice, 0.45); c.fillText(axes[k], cx + Math.cos(ang) * (R + 16), cy + Math.sin(ang) * (R + 16) + 3); }
        }
        c.fillStyle = rgba(C.teal, 0.22); c.fill();
        c.strokeStyle = rgba(C.mint, 0.9); c.lineWidth = 1.4; c.stroke();
        c.textAlign = "start";
      });
    }
  };

  /* ==========================================================================
     DNA HELIX
     ========================================================================== */
  function helix(canvas) {
    var BASES = "ATGC", pairs = 46, seq = [];
    for (var i = 0; i < pairs; i++) seq.push((Math.random() * 4) | 0);
    var seqEl = document.getElementById("seqReadout"), affEl = document.getElementById("affReadout"), lastUpd = 0;
    makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
      st.rot = (st.rot || 0) + dt * (0.5 + e * 0.8);
      var cx = w / 2, R = Math.min(w * 0.26, 150), tilt = MI.mouse.sx * 0.5, pts = [];
      for (var i = 0; i < pairs; i++) {
        var f = i / (pairs - 1), y = h * 0.06 + f * h * 0.88, a = f * TAU * 2.4 + st.rot;
        for (var s = 0; s < 2; s++) {
          var ang = a + s * Math.PI, x = Math.cos(ang) * R, z = Math.sin(ang) * R;
          pts.push({ i: i, s: s, x: cx + x * Math.cos(tilt) - (y - h / 2) * Math.sin(tilt) * 0.15, y: y, z: z });
        }
      }
      for (i = 0; i < pairs; i++) {
        var A = pts[i * 2], B = pts[i * 2 + 1], depth = (A.z + B.z) / (2 * R), scan = Math.abs(((t * 0.25) % 1) * pairs - i) < 2;
        c.strokeStyle = scan ? rgba(C.ice, 0.95) : rgba(C.teal, (0.14 + (1 - Math.abs(depth)) * 0.22).toFixed(3));
        c.lineWidth = scan ? 1.6 : 1;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
      }
      for (var s2 = 0; s2 < 2; s2++) {
        c.strokeStyle = s2 ? rgba(C.ice, 0.35) : rgba(C.mint, 0.55); c.lineWidth = 1.4; c.beginPath();
        for (i = 0; i < pairs; i++) { var p = pts[i * 2 + s2]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
        c.stroke();
      }
      c.globalCompositeOperation = "lighter";
      c.font = "9px " + MONO; c.textAlign = "center";
      pts.forEach(function (p) {
        var k = (p.z / R + 1) / 2, r = 1.5 + k * 3.2, col = p.s ? C.ice : C.teal;
        glowDot(c, p.x, p.y, r, col, 0.4 + k * 0.6);
        if (k > 0.85 && p.i % 3 === 0) { c.fillStyle = rgba(C.ice, 0.6); c.fillText(BASES[(seq[p.i] + p.s * 2) % 4], p.x + (p.s ? 14 : -14), p.y + 3); }
      });
      c.globalCompositeOperation = "source-over"; c.textAlign = "start";
      if (t - lastUpd > 0.35) {
        lastUpd = t;
        var off = Math.floor(t * 3) % (pairs - 12), str = "";
        for (var q = 0; q < 12; q++) { str += BASES[seq[off + q]]; if (q % 3 === 2 && q < 11) str += "·"; }
        if (seqEl) seqEl.textContent = str;
        if (affEl) affEl.textContent = "−" + (8.6 + Math.sin(t * 0.7) * 1.1 + Math.random() * 0.2).toFixed(1) + " kcal/mol";
      }
    }, canvas.parentElement);
  }

  /* ==========================================================================
     SANILA NEURAL SPHERE
     ========================================================================== */
  function orb(canvas) {
    var N = MI.coarse ? 420 : 760, pts = [], golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random()]);
    }
    var links = [];
    for (i = 0; i < N; i += 3) for (var j = i + 1; j < Math.min(N, i + 40); j++) {
      var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
      if (dx * dx + dy * dy + dz * dz < 0.018) links.push([i, j]);
    }
    var card = document.getElementById("sanilaCard");
    makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
      st.ry = (st.ry || 0) + dt * (0.18 + e * 0.5);
      var ry = st.ry + MI.mouse.sx * 0.6, rx = MI.mouse.sy * 0.4 + 0.25, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3 * (1 + e * 0.06);
      var cr = Math.cos(ry), sr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx), P = new Array(N);
      for (var i = 0; i < N; i++) {
        var p = pts[i], wob = 1 + Math.sin(t * 1.4 + p[3] * 12 + p[1] * 4) * 0.045 * (1 + e);
        var x = p[0] * wob, y = p[1] * wob, z = p[2] * wob;
        var x2 = x * cr - z * sr, z2 = x * sr + z * cr, y2 = y * cxr - z2 * sxr, z3 = y * sxr + z2 * cxr, k = 2.6 / (2.6 + z3);
        P[i] = [cx + x2 * R * k, cy + y2 * R * k, z3];
      }
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      g.addColorStop(0, rgba(C.ice, 0.85)); g.addColorStop(0.18, rgba(C.mint, 0.45)); g.addColorStop(0.5, rgba(C.deep, 0.22)); g.addColorStop(1, rgba(C.deep, 0));
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.25, 0, TAU); c.fill();
      c.globalCompositeOperation = "lighter"; c.lineWidth = 0.6;
      var wave = (t * 0.5) % 2 - 1;
      for (i = 0; i < links.length; i++) {
        var A = P[links[i][0]], B = P[links[i][1]], front = (A[2] + B[2]) * -0.5;
        if (front < -0.2) continue;
        var near = Math.abs(pts[links[i][0]][1] - wave) < 0.12;
        c.strokeStyle = near ? rgba(C.ice, 0.6) : rgba(C.teal, (0.1 + front * 0.2).toFixed(3));
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      }
      for (i = 0; i < N; i++) {
        var q = P[i], f = (1 - q[2]) / 2, fire = Math.sin(t * 3 + pts[i][3] * 40) > 0.96, s = (fire ? 2.2 : 1) * (0.6 + f * 1.3);
        c.fillStyle = fire ? "rgba(255,255,255,.95)" : rgba(f > 0.5 ? C.mint : C.teal, (0.15 + f * 0.7).toFixed(3));
        c.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      c.globalCompositeOperation = "source-over";
    }, card);
    if (card) card.addEventListener("pointermove", function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      card.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("canvas[data-viz]").forEach(function (cv) { var fn = research[cv.getAttribute("data-viz")]; if (fn) fn(cv, cv.closest(".rcard")); });
    document.querySelectorAll("canvas[data-stage]").forEach(function (cv) { var fn = stages[cv.getAttribute("data-stage")]; if (fn) fn(cv); });
    var hx = document.getElementById("helix"); if (hx) helix(hx);
    var ob = document.getElementById("sanilaOrb"); if (ob) orb(ob);
  });
})();
