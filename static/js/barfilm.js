// BarFilm — renders a real photo (or video) as luminance-driven vertical bars,
// and can sweep between the bar medium and the photograph.
// Everything is authored animation; nothing here analyses the image content.

const VS = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec3 uCam;
uniform vec3 uCamW;
uniform vec3 uCamR;
uniform float uCol;
uniform float uBars;
uniform float uSweep;
uniform float uReveal;
uniform float uRevealDir;
uniform float uTime;
uniform float uScan;
uniform vec3 uInk;
uniform vec3 uInkHi;
uniform vec3 uBg;
uniform vec4 uRect;
uniform float uRectOn;
uniform float uWorld;
uniform float uDim;
uniform float uSat;
uniform float uGamma;
uniform float uBgAlpha;
uniform float uGrain;
uniform float uFrame;

float h1(float n){ return fract(sin(n * 91.345 + 7.13) * 47453.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
uniform float uDetail;
uniform float uAccent;
uniform float uValue;
uniform float uWorldA;
float tone(vec3 c){ return mix(luma(c), max(c.r, max(c.g, c.b)), uValue); }

vec2 coverScale(vec2 res, float z){
  float ar = res.x / res.y;
  float ir = uImg.x / uImg.y;
  vec2 s = ar > ir ? vec2(1.0, ir / ar) : vec2(ar / ir, 1.0);
  return s / z;
}
vec2 cover(vec2 suv, vec2 res, vec3 cam){
  vec2 s = coverScale(res, cam.z);
  vec2 c = clamp(cam.xy, s * 0.5, 1.0 - s * 0.5);
  return c + (suv - 0.5) * s;
}

vec3 photo(vec2 iuv){
  vec3 c = texture2D(uTex, iuv).rgb;
  float l = luma(c);
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * vec3(0.88, 0.94, 1.07), 0.4);
  return c * (1.0 - uDim);
}

vec4 bars(vec2 suv, vec3 cam){
  float px = suv.x * uRes.x;
  float col = floor(px / uCol);
  float xc = (col + 0.5) * uCol;
  vec2 iuv = cover(vec2(xc / uRes.x, suv.y), uRes, cam);
  vec2 s = coverScale(uRes, cam.z);
  float cw = uCol / uRes.x * s.x;
  float ch = uCol / uRes.y * s.y;
  vec3 s0 = texture2D(uTex, iuv + vec2(-cw * 0.33, 0.0), 1.0).rgb;
  vec3 s1 = texture2D(uTex, iuv, 1.0).rgb;
  vec3 s2 = texture2D(uTex, iuv + vec2(cw * 0.33, 0.0), 1.0).rgb;
  vec3 s3 = texture2D(uTex, iuv + vec2(0.0, ch * 0.6), 1.0).rgb;
  vec3 s4 = texture2D(uTex, iuv - vec2(0.0, ch * 0.6), 1.0).rgb;
  vec3 avg = (s0 + s1 + s2 + s3 + s4) / 5.0;
  float l = tone(avg);
  // local contrast: compare with a wide neighbourhood so figures separate from ground
  float lb = tone(texture2D(uTex, iuv, 4.5).rgb);
  l = clamp(lb + (l - lb) * uDetail, 0.0, 1.0);
  l = pow(clamp((l - 0.03) * 1.1, 0.0, 1.0), uGamma);
  float red = clamp((avg.r - max(avg.g, avg.b)) * 2.6, 0.0, 1.0);
  l += (h1(col + floor(uTime * 9.0) * 17.0) - 0.5) * 0.035;
  l = clamp(l, 0.0, 1.0);
  float hw = mix(0.045, 0.47, l) * uCol;
  float d = abs(px - xc);
  float a = 1.0 - smoothstep(hw - 0.8, hw + 0.8, d);
  vec3 ink = mix(uInk, uInkHi, smoothstep(0.25, 0.95, l));
  ink = mix(ink, vec3(1.0, 0.42, 0.37), red * uAccent);
  if (uScan > -0.5) {
    float band = exp(-pow((suv.x - uScan) * 7.0, 2.0));
    ink = mix(ink, uInkHi * 1.15, band * 0.55);
    a = max(a, band * 0.25 * (1.0 - smoothstep(0.0, uCol * 0.5, d)));
  }
  return vec4(ink, a * (0.45 + 0.55 * smoothstep(0.0, 0.3, l)));
}

float stair(vec2 suv, float amt, float dir){
  if (amt >= 1.0) return 1.0;
  if (amt <= 0.0) return 0.0;
  float gw = max(uCol * 4.0, 18.0);
  float px = suv.x * uRes.x;
  float g = floor(px / gw);
  float G = ceil(uRes.x / gw);
  float gx = abs((px - (g + 0.5) * gw) / (gw * 0.5));
  float order = (g + 0.5) / G;
  float hgt = amt * 2.5 - (1.0 - order) * 1.0 - h1(g * 3.7) * 0.18;
  float y = dir > 0.0 ? 1.0 - suv.y : suv.y;
  float tip = 0.28;
  float f = clamp((hgt - y) / tip, 0.0, 1.0);
  float w = pow(f, 0.55);
  float aa = 2.0 / (gw * 0.5);
  return 1.0 - smoothstep(w - aa, w + aa, gx);
}

void main(){
  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c;
  float a = 1.0;
  float colI = floor(suv.x * uRes.x / uCol);

  if (uRectOn > 0.5) {
    vec2 r0 = uRect.xy; vec2 r1 = uRect.zw;
    float inside = step(r0.x, suv.x) * step(suv.x, r1.x) * step(r0.y, suv.y) * step(suv.y, r1.y);
    vec2 rs = max(r1 - r0, vec2(0.0001));
    vec2 ruv = (suv - r0) / rs;
    vec3 inPhoto = photo(cover(ruv, uRes * rs, uCamR));
    vec4 wb = bars(suv, uCamW);
    float wm = stair(suv, uWorld, 1.0);
    vec3 outC = mix(uBg, wb.rgb, wb.a * wm * uWorldA);
    c = mix(outC, inPhoto, inside);
    // hairline frame around the receding photo
    vec2 pxp = suv * uRes;
    vec2 p0 = r0 * uRes; vec2 p1 = r1 * uRes;
    float fx = min(abs(pxp.x - p0.x), abs(pxp.x - p1.x));
    float fy = min(abs(pxp.y - p0.y), abs(pxp.y - p1.y));
    float onX = step(p0.y - 1.0, pxp.y) * step(pxp.y, p1.y + 1.0);
    float onY = step(p0.x - 1.0, pxp.x) * step(pxp.x, p1.x + 1.0);
    float line = max((1.0 - smoothstep(0.0, 1.5, fx)) * onX, (1.0 - smoothstep(0.0, 1.5, fy)) * onY);
    c = mix(c, uInkHi, line * uFrame * 0.8);
  } else {
    vec4 b = bars(suv, uCam);
    vec3 bc = mix(uBg, b.rgb, b.a);
    vec3 ph = photo(cover(suv, uRes, uCam));
    float N = uRes.x / uCol;
    float thr = (colI / N) * 0.75 + h1(colI * 1.73) * 0.25;
    float m = smoothstep(thr - 0.015, thr + 0.015, uSweep * 1.04);
    float edge = clamp(smoothstep(thr - 0.07, thr, uSweep * 1.04) - m, 0.0, 1.0);
    float pAmt = max(1.0 - uBars, m);
    c = mix(bc, ph, pAmt);
    c = mix(c, uInkHi, edge * 0.55 * uBars);
    a = stair(suv, uReveal, uRevealDir);
  }

  c += (h2(suv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;
  vec3 rgb = mix(uBg * uBgAlpha, c, a);
  gl_FragColor = vec4(rgb, mix(uBgAlpha, 1.0, a));
}`;

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function coverScale(res, img, z) {
  const ar = res[0] / res[1], ir = img[0] / img[1];
  const s = ar > ir ? [1, ir / ar] : [ar / ir, 1];
  return [s[0] / z, s[1] / z];
}

// Project an image-space box {x,y,w,h} (0..1, y down) to stage percentages.
export function projectBox(box, res, img, cam) {
  const s = coverScale(res, img, cam[2]);
  const cx = Math.min(Math.max(cam[0], s[0] / 2), 1 - s[0] / 2);
  const cy = Math.min(Math.max(cam[1], s[1] / 2), 1 - s[1] / 2);
  return {
    x: ((box.x - cx) / s[0] + 0.5) * 100,
    y: ((box.y - cy) / s[1] + 0.5) * 100,
    w: (box.w / s[0]) * 100,
    h: (box.h / s[1]) * 100,
  };
}

export class BarFilm {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.o = Object.assign({
      dpr: Math.min(window.devicePixelRatio || 1, 1.75),
      col: 6, ink: '#3b5a86', inkHi: '#cfe2ff', bg: '#080b10', bgAlpha: 1,
      gamma: 1.35, grain: 0.02, detail: 1.0, accent: 0, value: 0,
    }, opts);
    this.u = {
      cam: [0.5, 0.5, 1], camW: [0.5, 0.5, 1.1], camR: [0.5, 0.5, 1],
      bars: 1, sweep: 0, reveal: 1, revealDir: 1, scan: -1,
      rect: [0, 0, 1, 1], rectOn: 0, world: 0, dim: 0, sat: 1, frame: 1,
    };
    this.ok = false;
    this.visible = true;
    this.img = [1, 1];
    this.res = [1, 1];
    this.t0 = performance.now();
    this.running = false;
    this.source = null;
    const attrs = { antialias: false, premultipliedAlpha: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', attrs);
    this.gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) return;
    this.gl = gl;
    try { this._init(); this.ok = true; } catch (e) { console.warn('[BarFilm]', e); this.ok = false; }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; this.onLost && this.onLost(); });
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this._io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; }, { rootMargin: '120px' });
    this._io.observe(canvas);
    this.resize();
  }

  _init() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    this.pr = pr;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.L = {};
    ['uTex', 'uRes', 'uImg', 'uCam', 'uCamW', 'uCamR', 'uCol', 'uBars', 'uSweep', 'uReveal', 'uRevealDir', 'uTime', 'uScan', 'uInk', 'uInkHi', 'uBg', 'uRect', 'uRectOn', 'uWorld', 'uDim', 'uSat', 'uGamma', 'uBgAlpha', 'uGrain', 'uFrame', 'uDetail', 'uAccent', 'uValue', 'uWorldA']
      .forEach((n) => { this.L[n] = gl.getUniformLocation(pr, n); });
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 11, 16, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  setSource(el) {
    if (!this.ok) return;
    const gl = this.gl;
    this.source = el;
    this.isVideo = el.tagName === 'VIDEO';
    const w = el.naturalWidth || el.videoWidth || el.width;
    const h = el.naturalHeight || el.videoHeight || el.height;
    this.img = [w, h];
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    if (this.gl2 && !this.isVideo) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    this.dirty = true;
  }

  set(obj) { Object.assign(this.u, obj); this.dirty = true; return this; }

  resize() {
    if (!this.ok) return;
    const r = this.canvas.getBoundingClientRect();
    const dpr = this.o.dpr;
    const w = Math.max(2, Math.round(r.width * dpr));
    const h = Math.max(2, Math.round(r.height * dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w; this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.res = [r.width, r.height];
    this.dirty = true;
  }

  draw() {
    if (!this.ok || !this.source) return;
    const gl = this.gl, L = this.L, u = this.u, o = this.o;
    if (this.isVideo && this.source.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.source);
    }
    const t = (performance.now() - this.t0) / 1000;
    gl.uniform1i(L.uTex, 0);
    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(L.uImg, this.img[0], this.img[1]);
    gl.uniform3fv(L.uCam, u.cam);
    gl.uniform3fv(L.uCamW, u.camW);
    gl.uniform3fv(L.uCamR, u.camR);
    gl.uniform1f(L.uCol, o.col * o.dpr);
    gl.uniform1f(L.uBars, u.bars);
    gl.uniform1f(L.uSweep, u.sweep);
    gl.uniform1f(L.uReveal, u.reveal);
    gl.uniform1f(L.uRevealDir, u.revealDir);
    gl.uniform1f(L.uTime, t);
    gl.uniform1f(L.uScan, u.scan);
    gl.uniform3fv(L.uInk, hex(o.ink));
    gl.uniform3fv(L.uInkHi, hex(o.inkHi));
    gl.uniform3fv(L.uBg, hex(o.bg));
    gl.uniform4fv(L.uRect, u.rect);
    gl.uniform1f(L.uRectOn, u.rectOn);
    gl.uniform1f(L.uWorld, u.world);
    gl.uniform1f(L.uDim, u.dim);
    gl.uniform1f(L.uSat, u.sat);
    gl.uniform1f(L.uGamma, o.gamma);
    gl.uniform1f(L.uBgAlpha, o.bgAlpha);
    gl.uniform1f(L.uGrain, o.grain);
    gl.uniform1f(L.uFrame, u.frame);
    gl.uniform1f(L.uDetail, o.detail);
    gl.uniform1f(L.uAccent, u.accent != null ? u.accent : o.accent);
    gl.uniform1f(L.uValue, o.value);
    gl.uniform1f(L.uWorldA, u.worldA != null ? u.worldA : 0.55);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.dirty = false;
  }

  start() {
    if (this.running || !this.ok) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      if (this.visible && !document.hidden) this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this._raf); }
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      if (!im.decode) { res(im); return; }
      // decode() can stall in background tabs; never wait on it for long.
      Promise.race([im.decode().catch(() => {}), new Promise((r) => setTimeout(r, 300))]).then(() => res(im));
    };
    im.onerror = rej;
    im.src = src;
  });
}
