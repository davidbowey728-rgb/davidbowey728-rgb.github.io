/* ==========================================================================
   MOLTEN INSTITUTE — universe.js
   The landing-page cosmos:
   - WebGL: nebula, starfield, black hole (lensing, accretion disk, photon
     ring), cursor gravitational lens, nova shockwaves, big-bang intro.
   - Canvas: spiral galaxy built from mathematical glyphs, orbiting equations,
     nexus network with signal pulses, nova bursts, annotations.
   Interaction: click = nova · hold = gravity well · move = lensing.
   ========================================================================== */
(function () {
  "use strict";
  var MI = window.MI, C = MI.colors, TAU = Math.PI * 2;

  /* ---------- shared scene state ---------- */
  var scene = MI.cosmos = {
    W: innerWidth, H: innerHeight,
    bh: { u: 0.38, v: 0.02, r: 0.085 },
    bhA: 1,
    hold: 0,
    novas: [],          // {x,y (px), t0, s}
    glyphCount: 0
  };

  function layout() {
    scene.W = innerWidth; scene.H = innerHeight;
    var aspect = scene.W / scene.H;
    if (aspect > 1.15) { scene.base = { u: Math.min(0.5 * aspect - 0.42, 0.45), v: 0.02, r: 0.082 }; }
    else { scene.base = { u: 0.04, v: 0.3, r: 0.058 }; }
  }
  layout();
  window.addEventListener("resize", layout);

  function toPx(u, v) { return [scene.W / 2 + u * scene.H, scene.H / 2 - v * scene.H]; }
  function toUV(x, y) { return [(x - scene.W / 2) / scene.H, (scene.H / 2 - y) / scene.H]; }

  function updateScene(t, dt) {
    var hs = MI.scroll.hero;
    var b = scene.base;
    scene.bh.u = b.u;
    scene.bh.v = b.v + MI.clamp(hs, 0, 1.2) * 0.08;
    scene.bh.r = b.r * (1 + MI.clamp(hs, 0, 1.4) * 1.6);
    scene.bhA = 1 - MI.clamp((hs - 0.55) / 0.6, 0, 1);
    scene.hold = MI.lerp(scene.hold, MI.mouse.down ? 1 : 0, MI.mouse.down ? 0.05 : 0.08);
    // drop finished novas
    for (var i = scene.novas.length - 1; i >= 0; i--) if (t - scene.novas[i].t0 > 4.5) scene.novas.splice(i, 1);
  }

  MI.nova = function (x, y, s) {
    var t = performance.now() / 1000;
    scene.novas.push({ x: x, y: y, t0: t, s: s || 1, burst: null });
    if (scene.novas.length > 6) scene.novas.shift();
    if (scene.onNova) scene.onNova(scene.novas[scene.novas.length - 1]);
  };

  /* ==========================================================================
     WEBGL LAYER
     ========================================================================== */
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uMouseOn;uniform float uHold;",
    "uniform vec3 uBH;uniform float uBHa;uniform float uIntro;uniform vec4 uNova[4];",
    "float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n));}",
    "float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*n2(p);p=m*p;a*=.5;}return s;}",
    "float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "float n3(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);",
    " return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),",
    "            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n3(p);p=p*2.07+vec3(3.1,1.7,5.3);a*=.5;}return s;}",
    "vec2 rot(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}",
    "vec3 starLayer(vec2 p,float sc,float th){",
    " vec2 g=p*sc;vec2 id=floor(g);vec2 f=fract(g)-.5;float h=h21(id);",
    " if(h<th)return vec3(0.);",
    " vec2 o=(h22(id+3.1)-.5)*.7;float d=length(f-o);",
    " float tw=.6+.4*sin(uTime*(1.+h*3.)+h*60.);",
    " float b=smoothstep(.07,0.,d)*tw+smoothstep(.3,0.,d)*.06;",
    " vec3 c=mix(vec3(.8,.95,1.),vec3(.6,.9,.8),fract(h*7.));",
    " return c*b*(h-th)/(1.-th)*2.;}",
    "vec3 sky(vec2 p){",
    " vec2 q=p*1.15;",
    " float w=fbm(q*1.1+vec2(uTime*.004,0.));",
    " float n=fbm(q*1.6+w*1.8+vec2(0.,uTime*.003));",
    " float dust=fbm(q*3.4-w*1.3);",
    " vec3 abyss=vec3(.035,.22,.29),deep=vec3(.11,.36,.45),teal=vec3(.31,.6,.65),mint=vec3(.56,.83,.72);",
    " vec3 neb=mix(abyss*.22,deep*.6,smoothstep(.35,.78,n));",
    " neb=mix(neb,teal*.62,smoothstep(.62,.92,n)*.7);",
    " neb+=mint*.2*smoothstep(.7,.98,n*w*1.7);",
    " neb*=.5+.5*smoothstep(.2,.7,dust);",
    " neb*=.5;",
    " vec3 s=starLayer(p,55.,.9)+starLayer(p+7.3,130.,.93)*.75+starLayer(p+2.1,280.,.95)*.55;",
    " return neb+s;}",
    "void main(){",
    " vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    " vec2 bh=uBH.xy;float rs=uBH.z;",
    " float bhA=uBHa*smoothstep(.05,.6,uIntro);",
    " vec2 d=p-bh;float r=length(d);",
    " vec2 src=p;",
    " float lens=rs*rs*1.3*bhA;",
    " src-=d/max(r,1e-4)*lens/max(r,rs*.5);",
    " vec2 dm=p-uMouse;float rm=length(dm);",
    " float ms=(.011+uHold*.042)*uMouseOn;",
    " src-=dm/max(rm,1e-4)*ms*ms*1.5/max(rm,ms*.6)*smoothstep(.45,0.,rm);",
    " vec3 nova=vec3(0.);",
    " for(int i=0;i<4;i++){vec4 nv=uNova[i];float age=uTime-nv.z;",
    "  if(age>0.&&age<4.){vec2 dn=p-nv.xy;float rr=length(dn);float front=age*.26;float fade=1.-age/4.;",
    "   float shell=exp(-pow((rr-front)*26.,2.))*fade*nv.w;",
    "   src-=dn/max(rr,1e-4)*shell*.016;",
    "   float flash=exp(-rr*rr*1400./(1.+age*5.))*exp(-age*1.4)*nv.w;",
    "   nova+=vec3(.88,1.,.97)*flash*2.4+vec3(.45,.85,.76)*shell*.3+vec3(.25,.55,.65)*exp(-rr*rr*50.)*exp(-age*.8)*nv.w*.3;}}",
    " float z=mix(5.,1.,uIntro);",
    " vec3 col=sky((src-bh)*z+bh+uMouse*.012)*smoothstep(0.,.4,uIntro);",
    " if(bhA>.001){",
    "  vec2 q=rot(d,.2);q.y/=.26;float rd=length(q);",
    "  float inner=rs*1.9,outer=rs*5.6;",
    "  float band=smoothstep(inner*.92,inner*1.15,rd)*(1.-smoothstep(outer*.42,outer,rd));",
    "  vec3 disk=vec3(0.);",
    "  if(band>0.){float ang=atan(q.y,q.x);float a2=ang-uTime*.9*pow(inner/rd,1.5);",
    "   float nn=fbm3(vec3(cos(a2)*2.4,sin(a2)*2.4,rd/rs*1.7));",
    "   float streak=.5+.95*nn;float dop=1.+.65*cos(ang+.4);float heat=pow(inner/rd,1.5);",
    "   vec3 cc=mix(vec3(.12,.36,.46),vec3(.48,.85,.77),smoothstep(.15,.5,heat));cc=mix(cc,vec3(.93,1.,.98),smoothstep(.55,1.,heat));",
    "   disk=cc*band*streak*dop*heat*2.3*bhA;}",
    "  float front=step(q.y,0.);",
    "  float shadow=smoothstep(rs*1.02,rs*.9,r);",
    "  float ra=atan(d.y,d.x);",
    "  float hn=fbm3(vec3(cos(ra-uTime*.4)*3.,sin(ra-uTime*.4)*3.,uTime*.08));",
    "  float halo=exp(-pow((r-rs*1.33)/(rs*.17),2.))*(.45+.55*max(sin(ra),0.))+exp(-pow((r-rs*1.18)/(rs*.09),2.))*.3;",
    "  float photon=exp(-pow((r-rs*1.04)/(rs*.026),2.));",
    "  col+=disk*(1.-front);",
    "  col+=vec3(.55,.9,.83)*halo*(.55+.85*hn)*bhA;",
    "  col*=1.-shadow*bhA;",
    "  col+=vec3(.86,1.,.97)*photon*1.5*bhA;",
    "  col+=disk*front;",
    "  col+=vec3(.2,.5,.56)*.07*rs/max(r,rs)*bhA;",
    " }",
    " col+=vec3(.56,.83,.72)*exp(-pow((rm-ms*1.25)/.0028,2.))*.55*uMouseOn*(.25+uHold);",
    " col+=nova;",
    " col+=vec3(.9,1.,.97)*exp(-r*mix(2.,45.,uIntro))*(1.-uIntro)*3.;",
    " col=1.-exp(-col*1.3);",
    " col*=1.-.45*smoothstep(.55,1.45,length(p));",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function initGL() {
    var canvas = document.getElementById("cosmosGL");
    if (!canvas) return;
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) { canvas.style.background = "radial-gradient(circle at 70% 48%, #050a0d 0 5%, #3d7685 5.6%, #0b2a36 9%, #020406 40%)"; return; }
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uRes", "uTime", "uMouse", "uMouseOn", "uHold", "uBH", "uBHa", "uIntro", "uNova"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var scale = MI.coarse ? 0.55 : 0.85, frames = 0, acc = 0, mouseOn = 0;
    var novaBuf = new Float32Array(16);
    function resize() {
      var s = Math.min(MI.dpr, 1.5) * scale;
      var W = Math.round(innerWidth * s), H = Math.round(innerHeight * s);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
    }
    resize();
    window.addEventListener("resize", resize);

    MI.animate(canvas, function (t, dt) {
      acc += dt; frames++;
      if (frames === 40) {
        var avg = acc / frames;
        if (avg > 0.024 && scale > 0.4) { scale = Math.max(0.4, scale - 0.15); resize(); }
        else if (avg < 0.013 && scale < 1) { scale = Math.min(1, scale + 0.1); resize(); }
        frames = 0; acc = 0;
      }
      updateScene(t, dt);
      var hs = MI.scroll.hero;
      document.body.style.setProperty("--gl-op", (1 - MI.clamp(hs, 0, 1) * 0.6).toFixed(3));
      var m = toUV(MI.mouse.x, MI.mouse.y);
      mouseOn = MI.lerp(mouseOn, MI.mouse.inside && !MI.coarse && hs < 1 ? 1 : 0, 0.05);
      for (var i = 0; i < 4; i++) {
        var n = scene.novas[scene.novas.length - 1 - i];
        if (n) { var uv = toUV(n.x, n.y); novaBuf[i * 4] = uv[0]; novaBuf[i * 4 + 1] = uv[1]; novaBuf[i * 4 + 2] = n.t0; novaBuf[i * 4 + 3] = n.s; }
        else { novaBuf[i * 4 + 2] = -100; novaBuf[i * 4 + 3] = 0; }
      }
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uMouse, m[0], m[1]);
      gl.uniform1f(U.uMouseOn, mouseOn);
      gl.uniform1f(U.uHold, scene.hold);
      gl.uniform3f(U.uBH, scene.bh.u, scene.bh.v, scene.bh.r);
      gl.uniform1f(U.uBHa, scene.bhA);
      gl.uniform1f(U.uIntro, MI.intro);
      gl.uniform4fv(U.uNova, novaBuf);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, true);
  }

  /* ==========================================================================
     CANVAS LAYER — the equation cosmos
     ========================================================================== */
  var SYMBOLS = ["∑", "∫", "∂", "∇", "λ", "π", "ψ", "Φ", "Ω", "θ", "μ", "σ", "ε", "∞", "≈", "⊗", "ħ", "∮", "α", "β", "γ", "Δ", "√", "∏", "ℒ", "η", "ρ", "τ", "ξ", "∈", "≡", "∝", "⟨ψ|", "|0⟩", "dx", "∇²", "e^iπ", "x²", "f(x)", "0", "1", "∂t", "ΔS", "Gμν", "c²", "∀", "∃", "⊕", "ℏω", "∂L"];
  var EQUATIONS = [
    "Rμν − ½Rgμν + Λgμν = (8πG / c⁴) Tμν",
    "iħ ∂ψ/∂t = Ĥψ",
    "Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V",
    "θ ← θ − η ∇θ L(θ)",
    "W′ = W + BA,  rank(BA) ≤ r",
    "L = − Σₜ log pθ(xₜ | x<ₜ)",
    "ds² = −(1 − rₛ/r) c²dt² + (1 − rₛ/r)⁻¹ dr² + r² dΩ²",
    "∇ · E = ρ / ε₀",
    "e^{iπ} + 1 = 0",
    "S = k_B ln Ω",
    "π*(y|x) ∝ π_ref(y|x) · exp(r(x, y) / β)",
    "T_H = ħc³ / 8πGMk_B",
    "∂ρ/∂t + ∇ · (ρv) = 0",
    "H(p) = − Σ p(x) log p(x)",
    "F = G m₁m₂ / r²",
    "∮ B · dl = μ₀ I",
    "p(y|x) = Πₜ p(yₜ | y<ₜ, x)",
    "E = mc²"
  ];
  var PALETTE = [C.ice, C.mint, C.teal];
  var ARMS = 3, WIND = 2.35, OUT = 22, TILT = 0.34, TILT_ROT = -0.2;

  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  function buildAtlas() {
    var size = 30, pad = 10, cells = [], x = 0, y = 0, rowH = size + pad * 2, maxW = 1024;
    var m = document.createElement("canvas").getContext("2d");
    m.font = "500 " + size + "px 'IBM Plex Mono', 'Inter', monospace";
    var layout = SYMBOLS.map(function (s) {
      var w = Math.ceil(m.measureText(s).width) + pad * 2;
      if (x + w > maxW) { x = 0; y += rowH; }
      var cell = { x: x, y: y, w: w, h: rowH }; x += w; return cell;
    });
    var atlasH = y + rowH;
    var atlases = PALETTE.map(function (col) {
      var cv = document.createElement("canvas"); cv.width = maxW; cv.height = atlasH;
      var c = cv.getContext("2d");
      c.font = m.font; c.textBaseline = "middle"; c.textAlign = "center";
      c.fillStyle = "rgb(" + col + ")"; c.shadowColor = "rgba(" + col + ",.9)"; c.shadowBlur = 9;
      SYMBOLS.forEach(function (s, i) { var L = layout[i]; c.fillText(s, L.x + L.w / 2, L.y + L.h / 2); });
      return cv;
    });
    return { cells: layout, sheets: atlases, size: size, rowH: rowH };
  }

  function initCosmos() {
    var canvas = document.getElementById("cosmos");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var box = MI.fit(canvas, ctx);
    var atlas = null;
    var stars = [], field = [], eqs = [], nodes = [], pulses = [], bursts = [];
    var mobile = MI.coarse || innerWidth < 760;
    var NSTAR = mobile ? 520 : 1250, NFIELD = mobile ? 110 : 260, NNODE = mobile ? 26 : 62;

    function makeStar(p, fresh) {
      p.arm = (Math.random() * ARMS) | 0;
      p.rr = fresh ? 2.4 + Math.pow(Math.random(), 0.75) * (OUT - 2.4) : OUT * MI.rand(0.8, 1.05);
      p.spread = gauss() * 0.32;
      p.lift = gauss() * 0.04;
      p.g = (Math.random() * SYMBOLS.length) | 0;
      p.s = MI.rand(0.28, 0.75);
      p.vr = MI.rand(0.5, 1.5);
      p.tw = Math.random() * TAU;
      return p;
    }
    function makeField(p) {
      p.x = Math.random() * box.w; p.y = Math.random() * box.h;
      p.vx = MI.rand(-6, 6); p.vy = MI.rand(-6, 6);
      p.g = (Math.random() * SYMBOLS.length) | 0;
      p.c = Math.random() < 0.3 ? 1 : 2;
      p.s = MI.rand(0.22, 0.5);
      p.a = MI.rand(0.2, 0.55);
      return p;
    }
    for (var i = 0; i < NSTAR; i++) stars.push(makeStar({}, true));
    for (i = 0; i < NFIELD; i++) field.push(makeField({}));
    EQUATIONS.forEach(function (e, k) {
      eqs.push({ text: e, rr: 7 + (k / EQUATIONS.length) * 15 + MI.rand(-0.6, 0.6), th: Math.random() * TAU, w: MI.rand(0.025, 0.06) * (Math.random() < 0.5 ? 1 : 1), size: MI.rand(11, 14) });
    });
    function makeNode(p) {
      p.x = Math.random() * box.w; p.y = Math.random() * box.h;
      p.vx = MI.rand(-8, 8); p.vy = MI.rand(-8, 8);
      p.b = MI.rand(0.4, 1); p.glow = 0;
      return p;
    }
    for (i = 0; i < NNODE; i++) nodes.push(makeNode({}));

    new ResizeObserver(function () {
      var ow = box.w || 1, oh = box.h || 1;
      box = MI.fit(canvas, ctx);
      field.forEach(function (p) { p.x *= box.w / ow; p.y *= box.h / oh; });
      nodes.forEach(function (p) { p.x *= box.w / ow; p.y *= box.h / oh; });
    }).observe(canvas);

    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { atlas = buildAtlas(); });

    /* nova bursts (glyph shrapnel) */
    scene.onNova = function (n) {
      var parts = [], count = mobile ? 22 : 40;
      for (var k = 0; k < count; k++) {
        var a = (k / count) * TAU + MI.rand(-0.08, 0.08), sp = MI.rand(110, 280) * n.s;
        parts.push({ x: n.x, y: n.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: (Math.random() * SYMBOLS.length) | 0, c: Math.random() < 0.5 ? 0 : 1, s: MI.rand(0.3, 0.6) });
      }
      bursts.push({ n: n, parts: parts });
      // shove nearby free glyphs and nodes
      field.concat(nodes).forEach(function (p) {
        var dx = p.x - n.x, dy = p.y - n.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 320) { var f = (1 - d / 320) * 260 * n.s; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      });
      nodes.forEach(function (p) { var dx = p.x - n.x, dy = p.y - n.y; if (dx * dx + dy * dy < 90000) p.glow = 1; });
    };

    /* auto novas */
    var nextNova = 3.2;

    /* projection of a galactic-plane point (units of rs) to screen px */
    function project(rr, th, lift, out) {
      var bh = scene.bh, H = scene.H;
      var X = rr * Math.cos(th), Y = rr * Math.sin(th);
      var sx = X, sy = Y * TILT + lift * rr;
      var c = Math.cos(TILT_ROT), s = Math.sin(TILT_ROT);
      var ux = (c * sx - s * sy) * bh.r, uy = (s * sx + c * sy) * bh.r;
      // gravitational lensing (matches the shader's deflection)
      var d = Math.sqrt(ux * ux + uy * uy) || 1e-4;
      var lensed = d + (bh.r * bh.r * 1.3 * scene.bhA) / Math.max(d, bh.r * 0.5);
      ux *= lensed / d; uy *= lensed / d;
      out[0] = scene.W / 2 + (bh.u + ux) * H;
      out[1] = scene.H / 2 - (bh.v + uy) * H;
      out[2] = -Math.sin(th);           // depth: +1 near side
      out[3] = d * H;                   // screen distance from centre (pre-lens)
      return out;
    }

    var P = [0, 0, 0, 0], Q = [0, 0, 0, 0];
    var hud = document.getElementById("hudCount");
    var heroText = document.querySelector(".hero__content"), tb = { cx: 0, cy: 0, hw: 0, hh: 0 };
    /* soft mask: glyphs dim behind the headline so it stays readable */
    function mask(x, y) {
      var dx = Math.max(0, Math.abs(x - tb.cx) - tb.hw) / 110, dy = Math.max(0, Math.abs(y - tb.cy) - tb.hh) / 110;
      var k = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      return 0.14 + 0.86 * k * k;
    }
    var hudT = 0;

    MI.animate(canvas, function (t, dt) {
      var i, j;
      var hs = MI.scroll.hero;
      canvas.style.opacity = (1 - MI.clamp(hs * 1.25, 0, 1)).toFixed(3);
      if (hs > 0.95) return;
      var W = box.w, H = box.h;
      ctx.clearRect(0, 0, W, H);
      if (!atlas) return;
      var intro = MI.ease(MI.clamp(MI.intro, 0, 1));
      var bh = scene.bh, bhPx = toPx(bh.u, bh.v), rsPx = bh.r * scene.H;
      var mx = MI.mouse.x, my = MI.mouse.y, mOn = MI.mouse.inside && !MI.coarse;
      var hold = scene.hold, omega = 0.045;
      var drawn = 0;
      if (heroText) { var hr = heroText.getBoundingClientRect(); tb.cx = hr.left + hr.width / 2; tb.cy = hr.top + hr.height / 2; tb.hw = hr.width / 2 - 40; tb.hh = hr.height / 2 - 20; }

      // auto novas
      if (!MI.reduced && MI.intro >= 1) {
        nextNova -= dt;
        if (nextNova <= 0) {
          nextNova = MI.rand(3.5, 6.5);
          var nx, ny, tries = 0;
          do { nx = MI.rand(W * 0.05, W * 0.95); ny = MI.rand(H * 0.08, H * 0.85); tries++; }
          while (tries < 10 && Math.hypot(nx - bhPx[0], ny - bhPx[1]) < rsPx * 4);
          MI.nova(nx, ny, MI.rand(0.6, 1));
        }
      }

      /* ---- nexus network ---- */
      ctx.globalCompositeOperation = "lighter";
      var LINK = mobile ? 120 : 155, L2 = LINK * LINK;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var dxm = mx - n.x, dym = my - n.y, dm2 = dxm * dxm + dym * dym;
        if (mOn && dm2 < 260 * 260) {
          var dmm = Math.sqrt(dm2) || 1, pull = (40 + hold * 260) / (dmm + 30);
          n.vx += (dxm / dmm) * pull * dt * 60; n.vy += (dym / dmm) * pull * dt * 60;
        }
        n.vx *= 0.97; n.vy *= 0.97;
        n.vx += MI.rand(-2, 2) * dt; n.vy += MI.rand(-2, 2) * dt;
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
        n.glow = Math.max(0, n.glow - dt * 0.8);
      }
      ctx.lineWidth = 0.7;
      for (i = 0; i < nodes.length; i++) {
        var A = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var B = nodes[j], dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy;
          if (d2 < L2) {
            var al = (1 - d2 / L2) * (0.16 + Math.max(A.glow, B.glow) * 0.4) * intro;
            ctx.strokeStyle = MI.rgba(C.teal, al.toFixed(3));
            ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
          }
        }
        if (mOn) {
          var ddx = A.x - mx, ddy = A.y - my, dd2 = ddx * ddx + ddy * ddy;
          if (dd2 < 210 * 210) {
            ctx.strokeStyle = MI.rgba(C.mint, ((1 - dd2 / 44100) * 0.45 * intro).toFixed(3));
            ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(mx, my); ctx.stroke();
          }
        }
      }
      // signal pulses travelling the network
      if (Math.random() < dt * (mobile ? 3 : 6)) {
        var s0 = nodes[(Math.random() * nodes.length) | 0];
        pulses.push({ a: s0, b: null, p: 0, hops: 0 });
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var pu = pulses[i];
        if (!pu.b) {
          var best = null, bd = L2;
          for (j = 0; j < nodes.length; j++) {
            var nn = nodes[j]; if (nn === pu.a || nn === pu.prev) continue;
            var qx = nn.x - pu.a.x, qy = nn.y - pu.a.y, q2 = qx * qx + qy * qy;
            if (q2 < bd && Math.random() < 0.6) { bd = q2; best = nn; }
          }
          if (!best) { pulses.splice(i, 1); continue; }
          pu.b = best;
        }
        pu.p += dt * 1.6;
        var px = MI.lerp(pu.a.x, pu.b.x, pu.p), py = MI.lerp(pu.a.y, pu.b.y, pu.p);
        ctx.fillStyle = MI.rgba(C.ice, (0.9 * intro).toFixed(3));
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
        ctx.fillStyle = MI.rgba(C.mint, (0.18 * intro).toFixed(3));
        ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
        if (pu.p >= 1) {
          pu.b.glow = Math.min(1, pu.b.glow + 0.5);
          pu.hops++;
          if (pu.hops > 5) { pulses.splice(i, 1); continue; }
          pu.prev = pu.a; pu.a = pu.b; pu.b = null; pu.p = 0;
        }
      }
      for (i = 0; i < nodes.length; i++) {
        var N = nodes[i], r0 = 1.2 + N.b * 1.2 + N.glow * 2, nm = mask(N.x, N.y);
        ctx.fillStyle = MI.rgba(C.ice, ((0.5 + N.glow * 0.5) * intro * nm).toFixed(3));
        ctx.beginPath(); ctx.arc(N.x, N.y, r0, 0, TAU); ctx.fill();
        ctx.fillStyle = MI.rgba(C.mint, ((0.08 + N.glow * 0.25) * intro).toFixed(3));
        ctx.beginPath(); ctx.arc(N.x, N.y, r0 * 4, 0, TAU); ctx.fill();
      }

      /* ---- free-floating glyph field ---- */
      var cells = atlas.cells, sheets = atlas.sheets, base = atlas.size;
      for (i = 0; i < field.length; i++) {
        var f = field[i];
        var gx = bhPx[0] - f.x, gy = bhPx[1] - f.y, gd = Math.sqrt(gx * gx + gy * gy) || 1;
        var gpull = (scene.bhA * 1800) / (gd * gd + 4000);
        f.vx += (gx / gd) * gpull * dt * 60; f.vy += (gy / gd) * gpull * dt * 60;
        if (mOn) {
          var fx = mx - f.x, fy = my - f.y, fd = Math.sqrt(fx * fx + fy * fy) || 1;
          if (fd < 300) {
            var mp = (hold * 5200 + 500) / (fd * fd + 2500);
            f.vx += (fx / fd) * mp * dt * 60; f.vy += (fy / fd) * mp * dt * 60;
            // tangential swirl while holding
            f.vx += (-fy / fd) * hold * mp * dt * 40; f.vy += (fx / fd) * hold * mp * dt * 40;
          }
        }
        f.vx *= 0.985; f.vy *= 0.985;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (gd < rsPx * 1.1 * scene.bhA || f.x < -40 || f.x > W + 40 || f.y < -40 || f.y > H + 40) {
          makeField(f);
          if (Math.random() < 0.5) { f.x = Math.random() < 0.5 ? -30 : W + 30; } else { f.y = Math.random() < 0.5 ? -30 : H + 30; }
        }
        var cl = cells[f.g], sc = f.s * (0.6 + 0.4 * intro);
        var fxp = MI.lerp(bhPx[0], f.x, intro), fyp = MI.lerp(bhPx[1], f.y, intro);
        ctx.globalAlpha = f.a * intro * mask(fxp, fyp);
        ctx.drawImage(sheets[f.c], cl.x, cl.y, cl.w, cl.h, fxp - cl.w * sc / 2, fyp - cl.h * sc / 2, cl.w * sc, cl.h * sc);
        drawn++;
      }

      /* ---- spiral galaxy of glyphs ---- */
      var holdK = 1 + hold * 3;
      for (i = 0; i < stars.length; i++) {
        var st = stars[i];
        st.rr -= dt * 0.11 * st.vr * (1 + 9 / st.rr);
        if (st.rr < 1.55) makeStar(st, false);
        var rrI = st.rr * (0.06 + 0.94 * intro);
        var th = (st.arm / ARMS) * TAU + Math.log(Math.max(st.rr, 1)) * WIND + st.spread + t * omega;
        project(rrI, th, st.lift, P);
        var depth = P[2];
        // hidden behind the shadow
        if (depth < 0 && P[3] < rsPx * 1.05) continue;
        var fade = MI.clamp((st.rr - 1.55) / 1.6, 0, 1);
        var x = P[0], y = P[1];
        if (mOn) {
          var ox = mx - x, oy = my - y, od = Math.sqrt(ox * ox + oy * oy) || 1;
          var off = Math.min(od * 0.6, (1600 * holdK) / (od + 60)) * Math.exp(-od / 260);
          x += (ox / od) * off; y += (oy / od) * off;
        }
        var inner = st.rr < 6 ? 0 : st.rr < 13 ? 1 : 2;
        var size = st.s * (1 + depth * 0.22) * (0.75 + 0.5 * MI.clamp(6 / st.rr, 0, 1));
        var a = (0.35 + 0.35 * depth + 0.25 * Math.sin(t * 2 + st.tw)) * fade * intro;
        if (a <= 0.02) continue;
        var cc = cells[st.g];
        ctx.globalAlpha = MI.clamp(a * mask(x, y), 0, 1);
        ctx.drawImage(sheets[inner], cc.x, cc.y, cc.w, cc.h, x - cc.w * size / 2, y - cc.h * size / 2, cc.w * size, cc.h * size);
        drawn++;
      }

      /* ---- orbiting equations ---- */
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      for (i = 0; i < eqs.length; i++) {
        var e = eqs[i];
        e.th += dt * e.w;
        var rrE = e.rr * (0.06 + 0.94 * intro);
        project(rrE, e.th, 0, P);
        project(rrE, e.th + 0.01, 0, Q);
        var ang = Math.atan2(Q[1] - P[1], Q[0] - P[0]);
        if (Math.cos(ang) < 0) ang += Math.PI;
        var dep = P[2];
        var ea = (0.22 + 0.42 * (dep * 0.5 + 0.5)) * intro * scene.bhA * mask(P[0], P[1]);
        if (ea < 0.02) continue;
        ctx.save();
        ctx.translate(P[0], P[1]);
        ctx.rotate(ang);
        ctx.font = "400 " + (e.size * (1 + dep * 0.15)).toFixed(1) + "px 'IBM Plex Mono', monospace";
        ctx.fillStyle = MI.rgba(dep > 0 ? C.ice : C.mint, ea.toFixed(3));
        ctx.shadowColor = MI.rgba(C.teal, 0.8); ctx.shadowBlur = 8;
        ctx.fillText(e.text, 0, 0);
        ctx.restore();
      }

      /* ---- nova bursts ---- */
      ctx.globalCompositeOperation = "lighter";
      for (i = bursts.length - 1; i >= 0; i--) {
        var bu = bursts[i], age = Math.max(0, t - bu.n.t0);
        if (age > 3.2) { bursts.splice(i, 1); continue; }
        var life = 1 - age / 3.2, nvx = bu.n.x, nvy = bu.n.y;
        // flare with diffraction spikes
        var fl = Math.exp(-age * 1.8) * bu.n.s;
        var gr = ctx.createRadialGradient(nvx, nvy, 0, nvx, nvy, 70 * fl + 10);
        gr.addColorStop(0, MI.rgba(C.ice, (0.95 * fl).toFixed(3)));
        gr.addColorStop(0.25, MI.rgba(C.mint, (0.45 * fl).toFixed(3)));
        gr.addColorStop(1, MI.rgba(C.teal, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(nvx, nvy, 70 * fl + 10, 0, TAU); ctx.fill();
        ctx.strokeStyle = MI.rgba(C.ice, (0.7 * fl).toFixed(3)); ctx.lineWidth = 1;
        var sl = 120 * fl;
        ctx.beginPath(); ctx.moveTo(nvx - sl, nvy); ctx.lineTo(nvx + sl, nvy); ctx.moveTo(nvx, nvy - sl); ctx.lineTo(nvx, nvy + sl); ctx.stroke();
        ctx.strokeStyle = MI.rgba(C.mint, (0.35 * fl).toFixed(3));
        ctx.beginPath(); ctx.moveTo(nvx - sl * .5, nvy - sl * .5); ctx.lineTo(nvx + sl * .5, nvy + sl * .5); ctx.moveTo(nvx + sl * .5, nvy - sl * .5); ctx.lineTo(nvx - sl * .5, nvy + sl * .5); ctx.stroke();
        // expanding ring
        ctx.strokeStyle = MI.rgba(C.mint, (0.4 * life * life).toFixed(3));
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(nvx, nvy, age * 0.26 * scene.H, 0, TAU); ctx.stroke();
        // glyph shrapnel
        for (j = 0; j < bu.parts.length; j++) {
          var sp2 = bu.parts[j];
          sp2.vx *= 0.975; sp2.vy *= 0.975;
          sp2.x += sp2.vx * dt; sp2.y += sp2.vy * dt;
          var c2 = cells[sp2.g];
          ctx.globalAlpha = life * 0.9;
          ctx.drawImage(sheets[sp2.c], c2.x, c2.y, c2.w, c2.h, sp2.x - c2.w * sp2.s / 2, sp2.y - c2.h * sp2.s / 2, c2.w * sp2.s, c2.h * sp2.s);
        }
        // annotation
        if (!mobile) {
          var la = MI.clamp(age * 3, 0, 1) * MI.clamp((3.2 - age) * 1.5, 0, 1);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          ctx.textAlign = "left";
          ctx.font = "500 10px 'IBM Plex Mono', monospace";
          ctx.fillStyle = MI.rgba(C.ice, (0.85 * la).toFixed(3));
          ctx.fillText("NOVA", nvx + 22, nvy - 18);
          ctx.fillStyle = MI.rgba(C.mint, (0.75 * la).toFixed(3));
          ctx.fillText("L = 4πR²σT⁴", nvx + 22, nvy - 4);
          ctx.strokeStyle = MI.rgba(C.mint, (0.5 * la).toFixed(3)); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(nvx + 6, nvy - 6); ctx.lineTo(nvx + 18, nvy - 18); ctx.stroke();
          ctx.globalCompositeOperation = "lighter";
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      /* ---- annotations on the black hole ---- */
      var annA = MI.clamp((MI.intro - 0.7) * 3, 0, 1) * scene.bhA * (1 - MI.clamp(hs * 3, 0, 1));
      if (annA > 0.01 && !mobile) {
        ctx.textAlign = "left";
        var ax = bhPx[0] + Math.cos(-0.8) * rsPx * 1.35, ay = bhPx[1] + Math.sin(-0.8) * rsPx * 1.35;
        var ex = ax + 70, ey = ay - 70;
        annotate(ax, ay, ex, ey, ex + 90, "EVENT HORIZON", "rₛ = 2GM / c²", annA);
        var bx = bhPx[0] - rsPx * 2.5, by = bhPx[1] + rsPx * 0.8;
        annotate(bx, by, bx - 40, by + 84, bx - 170, "ACCRETION DISK", "T(r) ∝ r^(−3/4)", annA, true);
      }

      // HUD count
      if (hud && t - hudT > 0.5) { hudT = t; hud.textContent = (drawn + eqs.length).toLocaleString("en-US"); }
    }, true);

    function annotate(x0, y0, x1, y1, x2, title, eq, a, left) {
      ctx.strokeStyle = MI.rgba(C.mint, (0.55 * a).toFixed(3)); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
      ctx.fillStyle = MI.rgba(C.ice, (0.9 * a).toFixed(3));
      ctx.beginPath(); ctx.arc(x0, y0, 2.2, 0, TAU); ctx.fill();
      var tx = left ? x2 : x1 + 6;
      ctx.font = "500 10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = MI.rgba(C.ice, (0.85 * a).toFixed(3));
      ctx.fillText(title, tx, y1 - 10);
      ctx.font = "400 12px 'IBM Plex Mono', monospace";
      ctx.fillStyle = MI.rgba(C.mint, (0.85 * a).toFixed(3));
      ctx.fillText(eq, tx, y1 + 10);
    }
  }

  /* ==========================================================================
     INTERACTION (hero only)
     ========================================================================== */
  function initInput() {
    var hero = document.getElementById("top");
    if (!hero) return;
    var downAt = 0, downX = 0, downY = 0;
    hero.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button")) return;
      MI.mouse.down = true; downAt = performance.now(); downX = e.clientX; downY = e.clientY;
    });
    window.addEventListener("pointerup", function (e) {
      if (!MI.mouse.down) return;
      MI.mouse.down = false;
      var quick = performance.now() - downAt < 280, still = Math.hypot(e.clientX - downX, e.clientY - downY) < 10;
      if (quick && still) MI.nova(e.clientX, e.clientY, 1);
    });
    // live sky coordinates under the cursor
    var coords = document.getElementById("hudCoords");
    window.addEventListener("pointermove", function () {
      if (!coords || MI.scroll.hero > 1) return;
      var ra = (MI.mouse.x / innerWidth) * 24, dec = 90 - (MI.mouse.y / innerHeight) * 180;
      var h = Math.floor(ra), m = Math.floor((ra - h) * 60), s = Math.floor(((ra - h) * 60 - m) * 60);
      var dg = Math.floor(Math.abs(dec)), dm = Math.floor((Math.abs(dec) - dg) * 60);
      coords.textContent = "RA " + pad(h) + "h " + pad(m) + "m " + pad(s) + "s  ·  Dec " + (dec < 0 ? "−" : "+") + pad(dg) + "° " + pad(dm) + "′";
    }, { passive: true });
    function pad(n) { return (n < 10 ? "0" : "") + n; }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGL();
    initCosmos();
    initInput();
  });
})();
