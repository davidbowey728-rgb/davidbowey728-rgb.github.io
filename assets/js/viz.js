/* ==========================================================================
   MOLTEN INSTITUTE — viz.js
   Canvas visualizations: research vectors, forge stages, DNA helix,
   Sanila neural orb, launch warp.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI;
  var TAU = Math.PI * 2;
  var ORANGE = "255,138,61", GOLD = "255,197,107", MOLTEN = "255,77,18", PLASMA = "94,242,255";

  function rgba(c, a) { return "rgba(" + c + "," + a + ")"; }

  /* Generic canvas wrapper: handles sizing and hover energy. */
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

  /* ==========================================================================
     RESEARCH VECTOR MINI-VIZ
     ========================================================================== */
  var research = {
    // Token row with attention arcs
    llm: function (canvas, card) {
      var tokens = 14, arcs = [];
      for (var i = 0; i < 26; i++) arcs.push({ a: (Math.random() * tokens) | 0, b: (Math.random() * tokens) | 0, ph: Math.random() * TAU, s: MI.rand(.4, 1.2) });
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var y = h * 0.62, pad = 26, step = (w - pad * 2) / (tokens - 1);
        c.lineWidth = 1;
        for (var i = 0; i < arcs.length; i++) {
          var A = arcs[i], x1 = pad + A.a * step, x2 = pad + A.b * step;
          if (A.a === A.b) continue;
          var str = (Math.sin(t * A.s * (1 + e) + A.ph) * .5 + .5);
          str = Math.pow(str, 3);
          var mid = (x1 + x2) / 2, hh = Math.abs(x2 - x1) * 0.55;
          c.strokeStyle = rgba(i % 5 === 0 ? PLASMA : ORANGE, (0.06 + str * (0.5 + e * 0.4)).toFixed(3));
          c.beginPath(); c.moveTo(x1, y); c.quadraticCurveTo(mid, y - hh, x2, y); c.stroke();
        }
        for (var k = 0; k < tokens; k++) {
          var x = pad + k * step;
          var act = Math.sin(t * 2 + k * 0.7) * .5 + .5;
          c.fillStyle = rgba(GOLD, (0.25 + act * 0.6 * (0.5 + e)).toFixed(3));
          c.fillRect(x - 4, y - 4, 8, 8);
          c.fillStyle = rgba(ORANGE, 0.12);
          c.fillRect(x - 0.5, y + 10, 1, 10 + act * 26);
        }
      }, card);
    },

    // Loss curve descending + low-rank adapter grid
    finetune: function (canvas, card) {
      var pts = [];
      for (var i = 0; i < 120; i++) { var x = i / 119; pts.push(0.12 + 0.75 * Math.exp(-x * 4.2) + (Math.random() - .5) * 0.06 * (1 - x * .6)); }
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var gx = w - 120, gy = 30, cell = 9;
        // adapter matrices A (r x n) and B (n x r)
        for (var r = 0; r < 8; r++) for (var q = 0; q < 2; q++) {
          var v = Math.sin(t * 1.5 + r * .8 + q * 2) * .5 + .5;
          c.fillStyle = rgba(q ? PLASMA : ORANGE, (0.1 + v * 0.5 * (0.5 + e)).toFixed(3));
          c.fillRect(gx + q * (cell + 2), gy + r * (cell + 2), cell, cell);
          c.fillRect(gx + 30 + r * (cell + 2), gy + q * (cell + 2) + 34, cell, cell);
        }
        c.font = "9px JetBrains Mono, monospace"; c.fillStyle = rgba("255,255,255", .35);
        c.fillText("ΔW = B·A", gx + 30, gy + 80);
        // curve
        var prog = ((t * (0.12 + e * 0.2)) % 1.2);
        var n = Math.floor(MI.clamp(prog, 0, 1) * (pts.length - 1));
        var x0 = 24, x1 = w - 150, y0 = 26, y1 = h * 0.8;
        c.strokeStyle = rgba("255,255,255", .06); c.beginPath();
        for (var g = 0; g < 4; g++) { var yy = y0 + (y1 - y0) * g / 3; c.moveTo(x0, yy); c.lineTo(x1, yy); }
        c.stroke();
        c.lineWidth = 1.6; c.strokeStyle = rgba(GOLD, .9); c.shadowColor = "rgba(255,110,40,.8)"; c.shadowBlur = 10;
        c.beginPath();
        for (var k = 0; k <= n; k++) { var px = x0 + (x1 - x0) * k / (pts.length - 1), py = y0 + (y1 - y0) * (1 - pts[k]); k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke(); c.shadowBlur = 0;
        if (n > 0) { var hx = x0 + (x1 - x0) * n / (pts.length - 1), hy = y0 + (y1 - y0) * (1 - pts[n]); c.fillStyle = "#fff"; c.beginPath(); c.arc(hx, hy, 2.5, 0, TAU); c.fill();
          c.fillStyle = rgba(GOLD, .7); c.fillText("loss " + pts[n].toFixed(3), Math.min(hx + 8, x1 - 50), hy - 8); }
      }, card);
    },

    // Reasoning tree with a pulse traveling down the chosen path
    steps: function (canvas, card) {
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cols = 5, rows = 3, x0 = 30, x1 = w - 30, y0 = 34, y1 = h * .78;
        var path = [1, 0, 1, 2, 1];
        var bad = { c: 2, r: 0 };
        function P(ci, ri) { return [x0 + (x1 - x0) * ci / (cols - 1), y0 + (y1 - y0) * ri / (rows - 1)]; }
        c.lineWidth = 1;
        for (var ci = 0; ci < cols - 1; ci++) for (var a = 0; a < rows; a++) for (var b = 0; b < rows; b++) {
          var p1 = P(ci, a), p2 = P(ci + 1, b);
          var on = path[ci] === a && path[ci + 1] === b;
          c.strokeStyle = on ? rgba(ORANGE, .55 + e * .4) : rgba("255,255,255", .05);
          c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
        }
        var speed = 0.35 + e * 0.5, prog = (t * speed) % 1.25, seg = prog * (cols - 1);
        for (ci = 0; ci < cols; ci++) for (var r = 0; r < rows; r++) {
          var p = P(ci, r), chosen = path[ci] === r, reached = chosen && seg >= ci;
          var isBad = ci === bad.c && r === bad.r && seg > bad.c - .4;
          c.beginPath(); c.arc(p[0], p[1], chosen ? 5 : 3.5, 0, TAU);
          if (isBad) { c.fillStyle = "rgba(255,70,70,.8)"; c.fill(); c.strokeStyle = "rgba(255,70,70,.8)"; c.beginPath(); c.moveTo(p[0] - 6, p[1] - 6); c.lineTo(p[0] + 6, p[1] + 6); c.moveTo(p[0] + 6, p[1] - 6); c.lineTo(p[0] - 6, p[1] + 6); c.stroke(); continue; }
          c.fillStyle = reached ? rgba(GOLD, 1) : rgba("255,255,255", chosen ? .35 : .12);
          c.fill();
          if (reached) { c.fillStyle = rgba(ORANGE, .18); c.beginPath(); c.arc(p[0], p[1], 12, 0, TAU); c.fill(); }
        }
        if (seg < cols - 1) {
          var i0 = Math.floor(seg), f = seg - i0, pa = P(i0, path[i0]), pb = P(i0 + 1, path[i0 + 1]);
          var x = MI.lerp(pa[0], pb[0], f), y = MI.lerp(pa[1], pb[1], f);
          c.fillStyle = "#fff"; c.shadowColor = "#ff8a3d"; c.shadowBlur = 14; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); c.shadowBlur = 0;
        }
      }, card);
    },

    // Rotating 3D molecule
    med: function (canvas, card) {
      var atoms = [], bonds = [];
      for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; atoms.push([Math.cos(a), Math.sin(a), 0, 1]); bonds.push([i, (i + 1) % 6]); }
      var sub = [[0, 1.9, 0.3, 2], [3, 1.9, -0.4, 3], [1, 1.8, 0.8, 2], [5, 1.8, -0.6, 3]];
      sub.forEach(function (s) { var base = atoms[s[0]]; var idx = atoms.length; atoms.push([base[0] * s[1], base[1] * s[1], s[2], s[3]]); bonds.push([s[0], idx]);
        if (s[3] === 2) { atoms.push([base[0] * (s[1] + .8), base[1] * (s[1] + .8) + .4, s[2] - .5, 1]); bonds.push([idx, atoms.length - 1]); } });
      makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
        st.rot = (st.rot || 0) + dt * (0.4 + e * 1.2);
        var ry = st.rot, rx = 0.5 + Math.sin(t * .4) * .3;
        var cx = w * .5, cy = h * .45, S = Math.min(w, h) * .2;
        var P = atoms.map(function (a) {
          var x = a[0] * Math.cos(ry) - a[2] * Math.sin(ry), z = a[0] * Math.sin(ry) + a[2] * Math.cos(ry);
          var y = a[1] * Math.cos(rx) - z * Math.sin(rx); z = a[1] * Math.sin(rx) + z * Math.cos(rx);
          var k = 3.2 / (3.2 + z);
          return { x: cx + x * S * k, y: cy + y * S * k, z: z, k: k, t: a[3] };
        });
        c.lineWidth = 1.2;
        bonds.forEach(function (b) { var A = P[b[0]], B = P[b[1]]; c.strokeStyle = rgba(GOLD, (.25 + .3 * (1 - (A.z + B.z) / 4)).toFixed(3)); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); });
        P.slice().sort(function (a, b) { return b.z - a.z; }).forEach(function (p) {
          var col = p.t === 2 ? PLASMA : p.t === 3 ? MOLTEN : ORANGE, r = (p.t === 1 ? 4 : 5.5) * p.k;
          var g = c.createRadialGradient(p.x - r * .3, p.y - r * .3, 0, p.x, p.y, r * 2.4);
          g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(.3, rgba(col, .9)); g.addColorStop(1, rgba(col, 0));
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r * 2.4, 0, TAU); c.fill();
        });
      }, card);
    },

    // Agent hub with orbiting tools and tool calls
    agents: function (canvas, card) {
      var tools = ["search", "code", "memory", "api", "plan", "eval"];
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cx = w * .5, cy = h * .45, R = Math.min(w, h * 1.6) * .3;
        c.strokeStyle = rgba("255,255,255", .06); c.beginPath(); c.ellipse(cx, cy, R, R * .45, 0, 0, TAU); c.stroke();
        var active = Math.floor(t * (0.7 + e)) % tools.length;
        c.font = "9px JetBrains Mono, monospace"; c.textAlign = "center";
        for (var i = 0; i < tools.length; i++) {
          var a = t * (0.25 + e * .3) + i / tools.length * TAU, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .45;
          var on = i === active;
          if (on) {
            var f = (t * (0.7 + e)) % 1;
            c.strokeStyle = rgba(ORANGE, .7); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
            c.fillStyle = "#fff"; c.beginPath(); c.arc(MI.lerp(cx, x, f), MI.lerp(cy, y, f), 2.2, 0, TAU); c.fill();
          }
          c.fillStyle = on ? rgba(GOLD, 1) : rgba("255,255,255", .3); c.beginPath(); c.arc(x, y, on ? 4.5 : 3, 0, TAU); c.fill();
          c.fillStyle = on ? rgba(GOLD, .9) : rgba("255,255,255", .3); c.fillText(tools[i], x, y - 10);
        }
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, 26);
        g.addColorStop(0, "rgba(255,240,210,1)"); g.addColorStop(.35, rgba(ORANGE, .9)); g.addColorStop(1, rgba(MOLTEN, 0));
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 26, 0, TAU); c.fill();
        c.textAlign = "start";
      }, card);
    },

    // Neuron activation grid with circuit highlight
    interp: function (canvas, card) {
      makeCanvas(canvas, function (c, w, h, t, dt, e) {
        var cols = 18, rows = 7, gx = 22, gy = 24, cw = (w - gx * 2) / cols, ch = (h * .78 - gy) / rows;
        var circuit = [[2, 1], [5, 3], [8, 2], [11, 4], [14, 3], [16, 5]];
        for (var x = 0; x < cols; x++) for (var y = 0; y < rows; y++) {
          var v = Math.sin(x * .55 + t * 1.6) * Math.cos(y * .9 - t * 1.1) * .5 + .5;
          v = Math.pow(v, 2.2);
          c.fillStyle = rgba(ORANGE, (0.04 + v * 0.45 * (0.6 + e)).toFixed(3));
          c.fillRect(gx + x * cw + 1, gy + y * ch + 1, cw - 2, ch - 2);
        }
        var k = (t * (0.6 + e)) % circuit.length;
        c.strokeStyle = rgba(PLASMA, .6 + e * .3); c.lineWidth = 1.2; c.beginPath();
        circuit.forEach(function (p, i) { var px = gx + (p[0] + .5) * cw, py = gy + (p[1] + .5) * ch; i ? c.lineTo(px, py) : c.moveTo(px, py); });
        c.stroke();
        circuit.forEach(function (p, i) {
          var px = gx + (p[0] + .5) * cw, py = gy + (p[1] + .5) * ch, on = i <= k;
          c.strokeStyle = on ? rgba(PLASMA, .95) : rgba(PLASMA, .3); c.strokeRect(px - cw / 2 + 1, py - ch / 2 + 1, cw - 2, ch - 2);
        });
      }, card);
    }
  };

  /* ==========================================================================
     FORGE STAGES
     ========================================================================== */
  var stages = {
    ore: function (canvas) {
      var glyphs = "the of model data code λ ∑ token <s> def return 0x1F proof cell protein Σ ∂ ∇ attention".split(" ");
      var P = [];
      for (var i = 0; i < 70; i++) P.push({ x: Math.random(), y: Math.random(), v: MI.rand(.05, .18), g: glyphs[(Math.random() * glyphs.length) | 0], keep: Math.random() > .35 });
      makeCanvas(canvas, function (c, w, h, t, dt) {
        var fy = h * .62;
        c.strokeStyle = rgba(ORANGE, .4); c.beginPath(); c.moveTo(w * .15, fy - 60); c.lineTo(w * .45, fy); c.lineTo(w * .55, fy); c.lineTo(w * .85, fy - 60); c.stroke();
        c.font = "11px JetBrains Mono, monospace"; c.textAlign = "center";
        P.forEach(function (p) {
          p.y += p.v * dt;
          if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); p.keep = Math.random() > .35; }
          var py = p.y * h, px = p.x * w;
          if (py > fy - 60) { var k = MI.clamp((py - (fy - 60)) / 60, 0, 1); px = MI.lerp(px, w * .5, k); }
          if (py > fy && !p.keep) return;
          var a = py > fy ? .9 : .35;
          c.fillStyle = py > fy ? rgba(GOLD, a) : (p.keep ? rgba("255,255,255", a) : rgba("255,90,90", .25));
          c.fillText(py > fy ? "■" : p.g, px, py);
        });
        c.textAlign = "start";
      });
    },
    smelt: function (canvas) {
      var P = [];
      for (var i = 0; i < 160; i++) P.push({ a: Math.random() * TAU, r: MI.rand(.3, 1), s: MI.rand(.2, .8) });
      makeCanvas(canvas, function (c, w, h, t, dt) {
        var cx = w / 2, cy = h * .5, R = Math.min(w, h) * .42;
        c.globalCompositeOperation = "lighter";
        P.forEach(function (p) {
          p.r -= dt * p.s * .25; p.a += dt * p.s * 1.4;
          if (p.r < .05) { p.r = 1; p.a = Math.random() * TAU; }
          var x = cx + Math.cos(p.a) * p.r * R, y = cy + Math.sin(p.a) * p.r * R * .7;
          c.fillStyle = rgba(p.r < .4 ? GOLD : ORANGE, (1 - p.r) * .9);
          c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill();
        });
        var pulse = 30 + Math.sin(t * 2) * 4;
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, pulse * 2);
        g.addColorStop(0, "rgba(255,245,220,1)"); g.addColorStop(.25, rgba(GOLD, .9)); g.addColorStop(.6, rgba(MOLTEN, .4)); g.addColorStop(1, rgba(MOLTEN, 0));
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, pulse * 2, 0, TAU); c.fill();
        c.globalCompositeOperation = "source-over";
      });
    },
    temper: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var lines = 9, order = (Math.sin(t * .5) * .5 + .5);
        for (var l = 0; l < lines; l++) {
          var y0 = h * .18 + l * (h * .6 / (lines - 1));
          c.strokeStyle = rgba(l === 4 ? GOLD : ORANGE, l === 4 ? .9 : .35); c.lineWidth = l === 4 ? 1.8 : 1;
          c.beginPath();
          for (var x = 0; x <= w; x += 6) {
            var chaos = Math.sin(x * .05 + l * 3 + t * 3) * 14 + Math.sin(x * .13 - t * 2 + l) * 8;
            var calm = Math.sin(x * .02 + t * 1.2) * 10;
            var y = y0 + MI.lerp(chaos, calm, order);
            x ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
        c.font = "10px JetBrains Mono, monospace"; c.fillStyle = rgba(GOLD, .8);
        c.fillText("alignment " + (order * 100).toFixed(1) + "%", 20, h - 16);
      });
    },
    steps: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var n = 6, sw = (w - 60) / n, sh = (h * .6) / n, x0 = 30, y0 = h * .82;
        var k = (t * .9) % (n + 2);
        for (var i = 0; i < n; i++) {
          var x = x0 + i * sw, y = y0 - (i + 1) * sh, on = i < k;
          c.fillStyle = on ? rgba(ORANGE, .18) : rgba("255,255,255", .03);
          c.strokeStyle = on ? rgba(GOLD, .8) : rgba("255,255,255", .1);
          c.fillRect(x, y, sw - 6, y0 - y); c.strokeRect(x + .5, y + .5, sw - 7, y0 - y - 1);
          c.font = "10px JetBrains Mono, monospace"; c.fillStyle = on ? rgba(GOLD, 1) : rgba("255,255,255", .25);
          c.fillText("s" + (i + 1), x + 8, y + 16);
          if (on) { c.fillStyle = rgba(PLASMA, .9); c.fillText("✓", x + sw - 22, y + 16); }
        }
        var ci = Math.min(Math.floor(k), n - 1), cx = x0 + ci * sw + (sw - 6) / 2, cy = y0 - (ci + 1) * sh - 10;
        c.fillStyle = "#fff"; c.shadowColor = "#ff8a3d"; c.shadowBlur = 16; c.beginPath(); c.arc(cx, cy, 4, 0, TAU); c.fill(); c.shadowBlur = 0;
      });
    },
    quench: function (canvas) {
      makeCanvas(canvas, function (c, w, h, t) {
        var cx = w / 2, cy = h * .5;
        for (var i = 0; i < 5; i++) {
          var p = ((t * .35) + i / 5) % 1, r = p * Math.min(w, h) * .6;
          c.strokeStyle = rgba(p < .5 ? GOLD : PLASMA, (1 - p) * .7); c.lineWidth = 1.4;
          c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
        }
        var cool = Math.sin(t * .8) * .5 + .5;
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, 40);
        g.addColorStop(0, "#fff"); g.addColorStop(.3, "rgba(" + Math.round(MI.lerp(255, 94, cool)) + "," + Math.round(MI.lerp(150, 242, cool)) + "," + Math.round(MI.lerp(60, 255, cool)) + ",.9)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 40, 0, TAU); c.fill();
        c.font = "10px JetBrains Mono, monospace"; c.textAlign = "center"; c.fillStyle = rgba(PLASMA, .8);
        c.fillText("RELEASE · " + (cool > .5 ? "STABLE" : "COOLING"), cx, h - 16); c.textAlign = "start";
      });
    }
  };

  /* ==========================================================================
     DNA HELIX
     ========================================================================== */
  function helix(canvas) {
    var BASES = "ATGC";
    var pairs = 46;
    var seq = [];
    for (var i = 0; i < pairs; i++) seq.push((Math.random() * 4) | 0);
    var seqEl = document.getElementById("seqReadout"), affEl = document.getElementById("affReadout");
    var lastUpd = 0;
    makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
      st.rot = (st.rot || 0) + dt * (0.5 + e * .8);
      var cx = w / 2, R = Math.min(w * .26, 150), tilt = MI.mouse.sx * .5;
      var pts = [];
      for (var i = 0; i < pairs; i++) {
        var f = i / (pairs - 1), y = h * .06 + f * h * .88, a = f * TAU * 2.4 + st.rot;
        for (var s = 0; s < 2; s++) {
          var ang = a + s * Math.PI, x = Math.cos(ang) * R, z = Math.sin(ang) * R;
          var xx = x * Math.cos(tilt) - (y - h / 2) * Math.sin(tilt) * .15;
          pts.push({ i: i, s: s, x: cx + xx, y: y, z: z });
        }
      }
      // base pair rungs
      for (i = 0; i < pairs; i++) {
        var A = pts[i * 2], B = pts[i * 2 + 1], depth = (A.z + B.z) / (2 * R);
        var scan = Math.abs(((t * .25) % 1) * pairs - i) < 2;
        c.strokeStyle = scan ? rgba(PLASMA, .9) : rgba(ORANGE, (.12 + (1 - Math.abs(depth)) * .2).toFixed(3));
        c.lineWidth = scan ? 1.6 : 1;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
      }
      // backbones
      for (var s2 = 0; s2 < 2; s2++) {
        c.strokeStyle = s2 ? rgba(PLASMA, .35) : rgba(GOLD, .5); c.lineWidth = 1.4; c.beginPath();
        for (i = 0; i < pairs; i++) { var p = pts[i * 2 + s2]; i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
        c.stroke();
      }
      // nodes sorted by depth
      c.globalCompositeOperation = "lighter";
      c.font = "9px JetBrains Mono, monospace"; c.textAlign = "center";
      pts.forEach(function (p) {
        var k = (p.z / R + 1) / 2, r = 1.5 + k * 3.2;
        var col = p.s ? PLASMA : ORANGE;
        var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        g.addColorStop(0, rgba("255,255,255", .5 + k * .5)); g.addColorStop(.35, rgba(col, .4 + k * .5)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r * 3, 0, TAU); c.fill();
        if (k > .85 && p.i % 3 === 0) { c.fillStyle = rgba("255,255,255", .55); c.fillText(BASES[(seq[p.i] + p.s * 2) % 4], p.x + (p.s ? 14 : -14), p.y + 3); }
      });
      c.globalCompositeOperation = "source-over"; c.textAlign = "start";
      // readouts
      if (t - lastUpd > .35) {
        lastUpd = t;
        var off = Math.floor(t * 3) % (pairs - 12), str = "";
        for (var q = 0; q < 12; q++) { str += BASES[seq[off + q]]; if (q % 3 === 2 && q < 11) str += "·"; }
        if (seqEl) seqEl.textContent = str;
        if (affEl) affEl.textContent = "−" + (8.6 + Math.sin(t * .7) * 1.1 + Math.random() * .2).toFixed(1) + " kcal/mol";
      }
    }, canvas.parentElement);
  }

  /* ==========================================================================
     SANILA NEURAL ORB
     ========================================================================== */
  function orb(canvas) {
    var N = MI.coarse ? 420 : 760;
    var pts = [], golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random()]);
    }
    // precompute neighbor links
    var links = [];
    for (i = 0; i < N; i += 3) {
      for (var j = i + 1; j < Math.min(N, i + 40); j++) {
        var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
        if (dx * dx + dy * dy + dz * dz < 0.018) links.push([i, j]);
      }
    }
    var card = document.getElementById("sanilaCard");
    makeCanvas(canvas, function (c, w, h, t, dt, e, st) {
      st.ry = (st.ry || 0) + dt * (0.18 + e * 0.5);
      var ry = st.ry + MI.mouse.sx * .6, rx = MI.mouse.sy * .4 + .25;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3 * (1 + e * .06);
      var cr = Math.cos(ry), sr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
      var P = new Array(N);
      for (var i = 0; i < N; i++) {
        var p = pts[i];
        var wob = 1 + Math.sin(t * 1.4 + p[3] * 12 + p[1] * 4) * .045 * (1 + e);
        var x = p[0] * wob, y = p[1] * wob, z = p[2] * wob;
        var x2 = x * cr - z * sr, z2 = x * sr + z * cr;
        var y2 = y * cxr - z2 * sxr, z3 = y * sxr + z2 * cxr;
        var k = 2.6 / (2.6 + z3);
        P[i] = [cx + x2 * R * k, cy + y2 * R * k, z3];
      }
      // core glow
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      g.addColorStop(0, "rgba(255,236,200,.95)"); g.addColorStop(.18, rgba(GOLD, .55)); g.addColorStop(.5, rgba(MOLTEN, .18)); g.addColorStop(1, rgba(MOLTEN, 0));
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.25, 0, TAU); c.fill();
      c.globalCompositeOperation = "lighter";
      c.lineWidth = .6;
      var wave = (t * .5) % 2 - 1;
      for (i = 0; i < links.length; i++) {
        var A = P[links[i][0]], B = P[links[i][1]];
        var front = (A[2] + B[2]) * -.5;
        if (front < -.2) continue;
        var near = Math.abs(pts[links[i][0]][1] - wave) < .12;
        c.strokeStyle = near ? rgba(PLASMA, .55) : rgba(ORANGE, (.08 + front * .18).toFixed(3));
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      }
      for (i = 0; i < N; i++) {
        var q = P[i], f = (1 - q[2]) / 2;
        var fire = Math.sin(t * 3 + pts[i][3] * 40) > .96;
        c.fillStyle = fire ? "rgba(255,255,255,.95)" : rgba(f > .5 ? GOLD : ORANGE, (.15 + f * .7).toFixed(3));
        var s = (fire ? 2.2 : 1) * (.6 + f * 1.3);
        c.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
      c.globalCompositeOperation = "source-over";
    }, card);

    // card spotlight
    if (card) card.addEventListener("pointermove", function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      card.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  }

  /* ==========================================================================
     WARP (launch overlay)
     ========================================================================== */
  function warp() {
    var el = document.getElementById("warp"), canvas = document.getElementById("warpCanvas");
    if (!el || !canvas) return function () {};
    var ctx = canvas.getContext("2d"), stars = [], running = false, start = 0;
    for (var i = 0; i < 420; i++) stars.push({ x: MI.rand(-1, 1), y: MI.rand(-1, 1), z: Math.random() });
    function tick(now) {
      if (!running) return;
      var b = MI.fit(canvas, ctx), el2 = (now - start) / 1000;
      var speed = Math.min(el2 * 2.2, 2.4);
      ctx.fillStyle = "rgba(2,2,3,.35)"; ctx.fillRect(0, 0, b.w, b.h);
      var cx = b.w / 2, cy = b.h / 2;
      ctx.lineCap = "round";
      stars.forEach(function (s, idx) {
        var pz = s.z;
        s.z -= speed * 0.02;
        if (s.z <= 0.01) { s.z = 1; s.x = MI.rand(-1, 1); s.y = MI.rand(-1, 1); pz = 1; }
        var sx = cx + (s.x / s.z) * cx, sy = cy + (s.y / s.z) * cy;
        var px = cx + (s.x / pz) * cx, py = cy + (s.y / pz) * cy;
        ctx.strokeStyle = idx % 7 === 0 ? rgba(PLASMA, .9) : rgba(idx % 2 ? GOLD : ORANGE, Math.min(1, (1 - s.z) * 1.4));
        ctx.lineWidth = (1 - s.z) * 2.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
      });
      requestAnimationFrame(tick);
    }
    return function play() {
      if (running) return;
      running = true; start = performance.now();
      el.classList.add("is-on");
      requestAnimationFrame(tick);
      setTimeout(function () { el.classList.remove("is-on"); }, 1700);
      setTimeout(function () { running = false; }, 2200);
    };
  }

  /* ==========================================================================
     INIT
     ========================================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("canvas[data-viz]").forEach(function (cv) {
      var fn = research[cv.getAttribute("data-viz")];
      if (fn) fn(cv, cv.closest(".rcard"));
    });
    document.querySelectorAll("canvas[data-stage]").forEach(function (cv) {
      var fn = stages[cv.getAttribute("data-stage")];
      if (fn) fn(cv);
    });
    var hx = document.getElementById("helix");
    if (hx) helix(hx);
    var ob = document.getElementById("sanilaOrb");
    if (ob) orb(ob);
    MI.warp = warp();
  });
})();
