/* ==========================================================================
   MOLTEN INSTITUTE — core.js
   Shared utilities, visibility-aware animation loop, WebGL molten core, embers.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  var MI = (window.MI = {
    reduced: reduced,
    coarse: coarse,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    mouse: { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, sx: 0, sy: 0 },
    scroll: { y: 0, v: 0, hero: 0 },
    ignite: 0,
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); }
  });

  /* ---------- visibility-aware loop ---------- */
  var items = [];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      for (var i = 0; i < items.length; i++) if (items[i].el === e.target) items[i].visible = e.isIntersecting;
    });
  }, { rootMargin: "100px" });

  MI.animate = function (el, fn, always) {
    var item = { el: el, fn: fn, visible: !!always, always: !!always };
    items.push(item);
    if (!always) io.observe(el);
    return item;
  };

  /* Resize a canvas to its CSS box. Returns {w,h} in CSS px. */
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

  var last = performance.now();
  var hidden = false;
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
    for (var i = 0; i < items.length; i++) {
      if (items[i].visible) items[i].fn(t, dt);
    }
  }
  requestAnimationFrame(frame);

  window.addEventListener("pointermove", function (e) {
    MI.mouse.x = e.clientX; MI.mouse.y = e.clientY;
    MI.mouse.nx = (e.clientX / innerWidth) * 2 - 1;
    MI.mouse.ny = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  /* ==========================================================================
     WEBGL MOLTEN CORE
     ========================================================================== */
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  var FRAG = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;uniform float uIgnite;uniform vec2 uCenter;uniform float uSize;",
    "float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);",
    " return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),",
    "            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}",
    "mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}",
    "mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}",
    "float field(vec3 p){return fbm(p*1.55+vec3(0.,uTime*.11,uTime*.05));}",
    "float map(vec3 p,out float n){n=field(p);return length(p)-1.0-(n-.5)*.34;}",
    "float stars(vec2 uv){vec2 g=floor(uv*140.);float h=fract(sin(dot(g,vec2(12.9898,78.233)))*43758.5453);",
    " vec2 f=fract(uv*140.)-.5;float d=length(f);float tw=.5+.5*sin(uTime*2.+h*40.);",
    " return step(.985,h)*smoothstep(.12,.0,d)*tw;}",
    "vec2 rot2(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}",
    "float ring(vec2 q,float r,float tilt,float w,float spd,float dashes){",
    " vec2 e=vec2(q.x,q.y*tilt);float d=abs(length(e)-r);float a=atan(e.y,e.x);",
    " float dash=smoothstep(.35,.5,fract(a*dashes/6.2831+uTime*spd));",
    " return smoothstep(w,0.,d)*(.35+.65*dash);}",
    "void main(){",
    " vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    " vec2 c=uCenter+vec2(0.,uScroll*.42);",
    " vec2 q=(uv-c)*(1.0+uScroll*1.4)/uSize;",
    " vec3 col=vec3(0.);",
    // background
    " float bgGlow=exp(-length(uv-c)*2.2);",
    " col+=vec3(.06,.018,.01)*bgGlow*2.;",
    " col+=vec3(1.,.8,.6)*stars(uv+uMouse*.01)*.6;",
    " col+=vec3(.01,.02,.03)*(1.-length(uv));",
    // camera
    " mat3 m=rotY(uTime*.07+uMouse.x*.55)*rotX(-uMouse.y*.35+.2);",
    " vec3 ro=m*vec3(0.,0.,4.);vec3 rd=m*normalize(vec3(q,-1.15));",
    " float b=dot(ro,rd);float c2=dot(ro,ro);float closest=sqrt(max(c2-b*b,0.));",
    " float h=b*b-(c2-1.3*1.3);float hit=0.;vec3 p=ro;float n=0.;",
    " if(h>0.){float t=-b-sqrt(h);float tmax=-b+sqrt(h);",
    "  for(int i=0;i<44;i++){p=ro+rd*t;float d=map(p,n);if(d<.003){hit=1.;break;}t+=d*.85;if(t>tmax)break;}}",
    " float pulse=.85+.15*sin(uTime*1.3)+.08*sin(uTime*3.7);",
    " float ig=uIgnite;",
    // halo
    " float halo=1./(1.+pow(max(closest-.92,0.)*5.5,2.));",
    " col+=mix(vec3(1.,.25,.04),vec3(1.,.55,.18),halo)*halo*.55*ig*pulse;",
    // rings
    " vec2 rq=rot2(q,.28);",
    " float rings=ring(rq,1.55,3.2,.006,.03,24.)+ring(rq,1.85,3.2,.004,-.02,60.)*.6+ring(rot2(q,-.5),2.2,4.,.003,.012,8.)*.4;",
    " float front=step(rq.y,0.);",
    " col+=vec3(1.,.5,.2)*rings*(hit>.5?front:1.)*.55*ig;",
    " if(hit>.5){",
    "  vec3 nor=normalize(p);",
    "  vec3 e=vec3(.02,0.,0.);float nn;",
    "  vec3 g=vec3(map(p+e.xyy,nn),map(p+e.yxy,nn),map(p+e.yyx,nn))-map(p,nn);",
    "  nor=normalize(nor*.02+g*1.0);",
    "  float veins=1.-abs(fbm(p*3.2+vec3(uTime*.18,0.,uTime*.07))*2.-1.);",
    "  veins=pow(veins,7.);",
    "  float heat=1.-smoothstep(.32,.5,n);",
    "  heat=clamp(heat*.85+veins*.75,0.,1.);",
    "  vec3 L=normalize(vec3(-.6,.7,.5));",
    "  float diff=max(dot(nor,L),0.);",
    "  float fres=pow(1.-max(dot(nor,-rd),0.),3.);",
    "  vec3 rock=vec3(.035,.025,.03)+vec3(.09,.05,.04)*diff;",
    "  vec3 lavaA=vec3(.9,.12,.02);vec3 lavaB=vec3(1.,.55,.12);vec3 lavaC=vec3(1.,.92,.65);",
    "  vec3 lava=mix(lavaA,lavaB,smoothstep(.2,.7,heat));lava=mix(lava,lavaC,smoothstep(.85,1.,heat));",
    "  vec3 s=rock+lava*heat*1.35*pulse*ig;",
    "  s+=vec3(1.,.38,.08)*fres*.9*ig;",
    "  s+=vec3(.2,.7,1.)*pow(fres,6.)*.25*ig;",
    "  col=s;",
    " }",
    // flash on ignite
    " col+=vec3(1.,.6,.3)*smoothstep(.0,.3,ig)*smoothstep(1.,.3,ig)*exp(-length(q)*1.5)*1.5;",
    " col*=1.-smoothstep(.6,1.6,length(uv))*.55;",
    " col=1.-exp(-col*1.25);",
    " col=pow(col,vec3(.92));",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function initGL() {
    var canvas = document.getElementById("forgeGL");
    if (!canvas) return;
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) { canvas.style.background = "radial-gradient(circle at 68% 45%, #ff6a1f 0, #7a1a05 12%, #120604 30%, #050507 60%)"; return; }

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
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
    ["uRes", "uTime", "uMouse", "uScroll", "uIgnite", "uCenter", "uSize"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var scale = MI.coarse ? 0.55 : 0.8;
    var frames = 0, acc = 0;
    var timeOffset = Math.random() * 100;

    function resize() {
      var s = Math.min(MI.dpr, 1.5) * scale;
      var W = Math.round(innerWidth * s), H = Math.round(innerHeight * s);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
    }
    resize();
    window.addEventListener("resize", resize);

    MI.animate(canvas, function (t, dt) {
      // adaptive resolution
      acc += dt; frames++;
      if (frames === 40) {
        var avg = acc / frames;
        if (avg > 0.024 && scale > 0.4) { scale = Math.max(0.4, scale - 0.15); resize(); }
        else if (avg < 0.014 && scale < 1) { scale = Math.min(1, scale + 0.1); resize(); }
        frames = 0; acc = 0;
      }
      var hs = MI.scroll.hero;
      // past the hero, the core becomes an ambient presence
      var op = 1 - MI.clamp((hs - 0.6) / 1.2, 0, 1) * 0.72;
      document.body.style.setProperty("--gl-op", op.toFixed(3));
      if (op <= 0.01) return;

      var wide = innerWidth / innerHeight;
      var cx = wide > 1.2 ? Math.min(0.42 * wide - 0.2, 0.5) : 0;
      var cy = wide > 1.2 ? 0.04 : 0.2;
      var size = wide > 1.2 ? 0.82 : 0.66;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, MI.reduced ? 10 : t + timeOffset);
      gl.uniform2f(U.uMouse, MI.mouse.sx, MI.mouse.sy);
      gl.uniform1f(U.uScroll, MI.clamp(hs, 0, 1.6));
      gl.uniform1f(U.uIgnite, MI.ignite);
      gl.uniform2f(U.uCenter, cx, cy);
      gl.uniform1f(U.uSize, size);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, true);
  }

  /* ==========================================================================
     EMBERS
     ========================================================================== */
  function initEmbers() {
    var canvas = document.getElementById("embers");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var P = [];
    var N = 0;
    var box = { w: 0, h: 0 };

    function spawn(p, fresh) {
      p.x = Math.random() * box.w;
      p.y = fresh ? Math.random() * box.h : box.h + 10;
      p.vx = MI.rand(-10, 10);
      p.vy = -MI.rand(14, 60);
      p.r = MI.rand(0.4, 1.9);
      p.life = 0;
      p.max = MI.rand(5, 14);
      p.hue = MI.rand(14, 42);
      p.seed = Math.random() * 1000;
      return p;
    }
    function resize() {
      box = MI.fit(canvas, ctx);
      N = Math.round(MI.clamp((box.w * box.h) / 9000, 60, 220));
      if (MI.coarse) N = Math.round(N * 0.5);
      while (P.length < N) P.push(spawn({}, true));
      P.length = N;
    }
    resize();
    window.addEventListener("resize", resize);

    MI.animate(canvas, function (t, dt) {
      ctx.clearRect(0, 0, box.w, box.h);
      ctx.globalCompositeOperation = "lighter";
      var mx = MI.mouse.x, my = MI.mouse.y;
      var boost = 1 + Math.min(Math.abs(MI.scroll.v) * 0.02, 3);
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        p.life += dt;
        if (p.life > p.max || p.y < -20) spawn(p, false);
        var turb = Math.sin(t * 1.2 + p.seed) * 14;
        var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { var f = (1 - d2 / 22000) * 160; var d = Math.sqrt(d2) || 1; p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        p.vx *= 0.985;
        p.x += (p.vx + turb) * dt;
        p.y += p.vy * dt * boost;
        var a = Math.sin((p.life / p.max) * Math.PI) * MI.ignite;
        var r = p.r * (1 + a);
        ctx.fillStyle = "hsla(" + p.hue + ",100%," + (55 + p.r * 12) + "%," + (a * 0.85).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
        if (p.r > 1.65) {
          ctx.fillStyle = "hsla(" + p.hue + ",100%,55%," + (a * 0.07).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }, true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGL();
    if (!MI.reduced) initEmbers();
  });
})();
