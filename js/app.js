// Page: every frame is Canvas 2D (wall, seven slates, chalk, the one wipe, light), then a WebGL2 post pass
// (camera motion blur, vignette, grade), then the subtitle plate. window.render(t) depends on t only.
import { clamp, lerp } from '/core/lib.js';
import { bake, drawStroke } from './chalk.js';
import { installDeposit, grainTile } from './r2d.js';
import { Post } from './post.js';
import { loadSvgFont } from './hand.js';
import { bakeWall, bakeSlate, WALL, SX, PW, BH, BW, NS, FLOOR } from './stage.js';
import { drawFront, Dust, drawMotes } from './props.js';
import { COLORS } from './chalk.js';
import { pulse, intensity, night, energy, cameraLife, drawRings } from './fx.js';
import { buildClawd, drawClawd, silhouette, U as CU } from './clawd.js';
import { bake as bakeS } from './chalk.js';

const Q = new URLSearchParams(location.search), W = innerWidth, H = innerHeight;
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
await loadSvgFont('fonts/EMSDelight.svg');
installDeposit();

if (Q.has('lab')) { await import('./lab.js').then(m => m.run(cv, W, H, Q)); }
else {
  const { build } = await import('./film.js');
  const F = build(W, H);
  for (const s of F.S) { bake(s, s.o.R || 2); const sp = s.sprite; s.bb = [sp.x0, sp.y0, sp.x0 + sp.W / sp.R, sp.y0 + sp.H / sp.R]; }
  window.DUR = F.DUR; window.EV = F.EV;

  const WALLI = bakeWall();
  const SLATES = Array.from({ length: NS }, (_, i) => bakeSlate(61 + i * 10, 1));
  const TILE = grainTile();
  const post = new Post(cv, W, H);
  const main = new OffscreenCanvas(W, H), mx = main.getContext('2d');
  const la = new OffscreenCanvas(W, H), lx = la.getContext('2d');
  const PAT = mx.createPattern(TILE, 'repeat');
  const KS = W / 1920;
  // camera with roll: screen = R(r)·s·(p − c) + centre + (dx, dy)
  const view = c0 => {
    const c = { ...c0, s: c0.s * KS }, r = c.r || 0, co = Math.cos(r), si = Math.sin(r), s = c.s, ox = W / 2 + (c.dx || 0) * KS, oy = H / 2 + (c.dy || 0) * KS;
    const m = [s * co, s * si, -s * si, s * co, ox - s * (co * c.cx - si * c.cy), oy - s * (si * c.cx + co * c.cy)];
    const hx = (Math.abs(co) * W / 2 + Math.abs(si) * H / 2) / s + Math.abs(c.dx || 0) / s, hy = (Math.abs(si) * W / 2 + Math.abs(co) * H / 2) / s + Math.abs(c.dy || 0) / s;
    return { ...c, m, toScreen: (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]], W, H, rect: [c.cx - hx, c.cy - hy, c.cx + hx, c.cy + hy] };
  };
  // the film's camera = the authored keys + the beat's life + the hits (shake, roll kick, punch-in)
  const HITS = F.HITS;
  const camFull = t => {
    const c = F.camAt(t), L = cameraLife(t), h = HITS.camAt(t);
    return { ...c, s: c.s * (1 + L.z + h.z), r: L.r + h.r, dx: L.dx + h.dx, dy: L.dy + h.dy };
  };
  const CLAWD = buildClawd(F.CLAWD_T);
  for (const p of F.POPS) for (const s of p.st) bakeS(s, 1.5);
  const ir = new OffscreenCanvas(W, H), irx = ir.getContext('2d');
  const DUST = new Dust();
  for (const b of HITS.bursts) DUST.emit(b.t, b.x, b.y, b.n, { color: b.col, speed: b.speed ?? 260, life: b.life ?? 1.4, size: b.size ?? 3.2, a: .9, spread: b.spread ?? 6.28, dir: b.dir, g: 140, jx: 20, jy: 20 });
  for (const b of HITS.bursts) if (b.puff !== false) DUST.puff(b.t, b.x, b.y, 60 + b.n * 2, { color: b.col, a: .22, life: .9, grow: 2.4 });
  const inView = (bb, r) => bb[2] >= r[0] && bb[0] <= r[2] && bb[3] >= r[1] && bb[1] <= r[3];
  const WP = F.wipe;
  const wipePath = t => {
    if (!WP || t <= WP.t0) return null;
    const P = WP.path, n = Math.max(2, Math.round(P.length * clamp((t - WP.t0) / (WP.t1 - WP.t0))));
    const p = new Path2D(); P.slice(0, n).forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); return p;
  };

  function frame(t) {
    const c = camFull(t), v = view(c), r = v.rect, N = night(t), I = intensity(t);
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.globalAlpha = 1; mx.filter = 'none';
    mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
    mx.setTransform(...v.m); mx.imageSmoothingQuality = 'high';
    if (r[1] < WALL[1] || r[3] > WALL[1] + WALL[3] || r[0] < WALL[0] || r[2] > WALL[0] + WALL[2]) {     // very wide: the hall beyond the baked wall
      mx.fillStyle = '#b3ae9f'; mx.fillRect(r[0], r[1], r[2] - r[0], 2380 - r[1]); mx.fillStyle = '#56705f'; mx.fillRect(r[0], 2380, r[2] - r[0], FLOOR - 2380);
      mx.fillStyle = '#4a3a2c'; mx.fillRect(r[0], FLOOR, r[2] - r[0], r[3] - FLOOR);
    }
    mx.drawImage(WALLI.cv, WALL[0], WALL[1], WALL[2], WALL[3]);
    if (N > .01) {                                              // night: the hall around the boards goes dark
      mx.save(); mx.fillStyle = `rgba(4,6,8,${.82 * N})`; mx.beginPath(); mx.rect(r[0] - 10, r[1] - 10, r[2] - r[0] + 20, r[3] - r[1] + 20); mx.rect(-75, -75, BW + 150, BH + 150); mx.fill('evenodd'); mx.restore();
    }
    for (let i = 0; i < NS; i++) if (SX(i) + PW >= r[0] && SX(i) <= r[2]) mx.drawImage(SLATES[i].cv, SX(i), 0, PW, BH);
    // chalk that stays
    for (const s of F.S) if (!s.wiped && t > s.t0 && inView(s.bb, r)) drawStroke(mx, s, t);
    // the one wipe: the strokes it takes are drawn on their own layer and erased along the cloth's path
    const hp = wipePath(t);
    if (!(hp && t > WP.t1 + .05)) {
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, W, H); lx.filter = 'none'; lx.globalCompositeOperation = 'source-over';
      lx.setTransform(...v.m);
      let any = false;
      for (const s of F.S) if (s.wiped && t > s.t0 && inView(s.bb, r)) { drawStroke(lx, s, t); any = true; }
      if (any) {
        if (hp) { lx.globalCompositeOperation = 'destination-out'; lx.filter = `blur(${Math.max(1, 16 * v.s)}px)`; lx.lineCap = 'round'; lx.lineJoin = 'round'; lx.lineWidth = WP.w; lx.strokeStyle = '#000'; lx.stroke(hp); lx.globalCompositeOperation = 'source-over'; lx.filter = 'none'; }
        mx.setTransform(1, 0, 0, 1, 0, 0); mx.drawImage(la, 0, 0); mx.setTransform(...v.m);
      }
    }
    if (hp) {                                                   // the thin even haze a wipe leaves behind
      mx.save(); mx.filter = `blur(${Math.max(1, 12 * v.s)}px)`; mx.strokeStyle = 'rgba(160,176,168,.03)'; mx.lineCap = 'round'; mx.lineJoin = 'round'; mx.lineWidth = WP.w * .9; mx.stroke(hp); mx.restore();
    }
    // Clawd: chalk on the board like everything else, so he takes the same light
    mx.save(); mx.setTransform(...v.m);
    for (const c of F.CLONES) drawClawd(mx, CLAWD, c.state(t), 1e9);
    // speed trails: smeared chalk ghosts of where he just was, when he moves fast
    const st = F.CL.state(t);
    if (st) for (let g = 3; g >= 1; g--) {
      const q = F.CL.state(t - g * .028); if (!q) continue;
      const d = Math.hypot(q.x - st.x, q.y - st.y); if (d < 18) continue;
      mx.globalAlpha = Math.min(.5, d / 160) * (1 - g / 4.2); drawClawd(mx, CLAWD, q, t); mx.globalAlpha = 1;
    }
    drawClawd(mx, CLAWD, st, t);
    mx.restore();
    // slate micro grain in close shots
    if (v.s / KS > .6) {
      mx.save(); mx.beginPath(); mx.rect(0, 0, BW, BH); mx.clip();
      PAT.setTransform(new DOMMatrix([.25, 0, 0, .25, 0, 0])); mx.globalCompositeOperation = 'soft-light'; mx.globalAlpha = Math.min(.2, (v.s / KS - .6) * .3);
      mx.fillStyle = PAT; mx.fillRect(Math.max(0, r[0]), 0, Math.min(BW, r[2]) - Math.max(0, r[0]), BH); mx.restore();
    }
    // daylight from tall windows on the left of the hall: a long soft falloff and a warm slanted patch low on the left
    mx.save(); mx.setTransform(...v.m);
    const lg = mx.createLinearGradient(-1600, 0, BW + 1600, 0); lg.addColorStop(0, 'rgb(255,250,240)'); lg.addColorStop(.3, 'rgb(240,240,236)'); lg.addColorStop(1, 'rgb(206,208,210)');
    mx.globalCompositeOperation = 'multiply'; mx.fillStyle = lg; mx.fillRect(r[0] - 10, r[1] - 10, r[2] - r[0] + 20, r[3] - r[1] + 20);
    mx.globalCompositeOperation = 'screen'; mx.filter = `blur(${Math.max(3, 40 * v.s)}px)`;
    const pane = (x, y, w, h, a) => { mx.fillStyle = `rgba(255,212,150,${a})`; mx.beginPath(); mx.moveTo(x, y); mx.lineTo(x + w, y + w * .28); mx.lineTo(x + w, y + w * .28 + h); mx.lineTo(x, y + h); mx.closePath(); mx.fill(); };
    if (N < .99) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pane(-300 + i * 400, 1060 + j * 330 + i * 400 * .28, 360, 300, (.07 - i * .018) * (1 - N));
    mx.restore();
    // dust bursts and shockwave rings from the hits (screen space)
    mx.save(); mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'lighter';
    DUST.draw(mx, t, v); mx.globalCompositeOperation = 'source-over'; mx.restore();
    drawRings(mx, HITS, t, v.toScreen, v.s, COLORS);
    // chalk words slamming in (design units 1920×1080)
    for (const p of F.POPS) {
      const u = t - p.t; if (u < 0 || u > p.d) continue;
      const kin = Math.min(1, u / .13), sc = lerp(2.3, 1, 1 - Math.pow(1 - kin, 3)) * (1 + .1 * Math.max(0, (u - (p.d - .25)) / .25)), a = Math.min(1, u / .05) * (1 - clamp((u - (p.d - .25)) / .25));
      const wob = Math.sin(u * 26) * .05 * Math.exp(-u * 5);
      mx.save(); mx.setTransform(KS, 0, 0, KS, 0, 0); mx.translate(p.x + c.dx * .5, p.y + c.dy * .5); mx.rotate(p.rot + wob); mx.scale(sc, sc);
      mx.globalAlpha = a; for (const s of p.st) drawStroke(mx, s, 1e9); mx.restore();
    }
    // motes in the air: the room's dust catching the light, thicker in the choruses
    if (I > .5) { mx.save(); mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'screen'; mx.globalAlpha = clamp((I - .5) * 1.6) * (.6 + N * .8); drawMotes(mx, t, v, W, H); mx.restore(); }
    // the chalk's front: a few bright grains where the writing is now
    for (const s of F.S) {
      if (t <= s.t0 || t >= s.t1 || !inView(s.bb, r)) continue;
      const p = s.at(s.prog(t) * s.len);
      drawFront(mx, t, v, p[0], p[1], s.color, Math.min(s.w, 9), .5 + N * .5);
    }
    // the Clawd-shaped iris: the frame closes down to his silhouette, black around it, and opens on the next board
    for (const [a, m, b] of F.IRIS) {
      if (t < a || t > b) continue;
      const f = t < m ? (t - a) / (m - a) : 1 - (t - m) / (b - m), big = Math.log(.5 * W), uu = Math.exp(lerp(big, Math.log(.4), f < 1 ? Math.pow(f, 1.6) : 1));
      const q = F.CL.state(Math.min(t, b)), [px, py] = q ? v.toScreen(q.x, q.y) : [W / 2, H * .7];
      const g = Math.min(1, f * 1.4), cx = lerp(W / 2, px, g), cy = lerp(H / 2 + 5 * uu, py + .3 * uu, g);
      irx.setTransform(1, 0, 0, 1, 0, 0); irx.globalCompositeOperation = 'source-over'; irx.clearRect(0, 0, W, H); irx.fillStyle = '#000'; irx.fillRect(0, 0, W, H);
      if (f < .999) { irx.globalCompositeOperation = 'destination-out'; irx.beginPath(); silhouette(irx, cx, cy, uu); irx.fill(); }
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalAlpha = 1; mx.drawImage(ir, 0, 0);
    }
    return c;
  }

  // ───────── subtitle plate: the sung line in English (each word lights as it is sung) over the Chinese translation;
  // where nobody sings, a Chinese note alone
  await document.fonts.load('40px SubKai');
  const sc = document.getElementById('s'); sc.width = W; sc.height = H; const sx = sc.getContext('2d');
  // English is the main line (large, karaoke: the word being sung pops and glows), Chinese sits under it, smaller
  const SZ = { en: Math.round(44 * KS), zh: Math.round(29 * KS), enY: H - Math.round(84 * KS), zhY: H - Math.round(42 * KS) };
  const NOSUBS = Q.has('nosubs');
  const subsAt = t => F.SUBS.filter(q => t >= q.t0 && t < q.t1);
  function plate(x0, y0, w, h, a) { sx.globalAlpha = a * .62; sx.fillStyle = '#070b09'; sx.beginPath(); sx.roundRect(x0, y0, w, h, 12 * KS); sx.fill(); }
  const fit = (txt, size, max) => { sx.font = `${size}px SubKai`; const w = sx.measureText(txt).width; return w > max ? Math.floor(size * max / w) : size; };
  function subtitle(t) {
    sx.clearRect(0, 0, W, H); if (NOSUBS) return;
    const q = subsAt(t).pop(); if (!q) return;
    const a = Math.min(1, (t - q.t0) / .12, (q.t1 - t) / .15);
    sx.textBaseline = 'alphabetic'; sx.textAlign = 'left';
    const maxW = W - 160 * KS;
    if (q.note) {
      const se = fit(q.en, Math.round(SZ.en * .78), maxW), sz = SZ.zh;
      sx.font = `${se}px SubKai`; const we = sx.measureText(q.en).width; sx.font = `${sz}px SubKai`; const wz = sx.measureText(q.zh).width;
      const w = Math.max(we, wz) + 60 * KS;
      plate((W - w) / 2, SZ.enY - se - 16 * KS, w, SZ.zhY - SZ.enY + se + 30 * KS, a);
      sx.globalAlpha = a; sx.fillStyle = '#f6f1e2'; sx.font = `${se}px SubKai`; sx.fillText(q.en, (W - we) / 2, SZ.enY);
      sx.fillStyle = '#c9c3b2'; sx.font = `${sz}px SubKai`; sx.fillText(q.zh, (W - wz) / 2, SZ.zhY); sx.globalAlpha = 1; return;
    }
    const se = fit(q.en, SZ.en, maxW);
    sx.font = `${se}px SubKai`; const sp = sx.measureText(' ').width, ws = q.words.map(([w]) => sx.measureText(w).width);
    const we = ws.reduce((s, x) => s + x, 0) + sp * (ws.length - 1);
    sx.font = `${SZ.zh}px SubKai`; const wz = sx.measureText(q.zh).width;
    const w = Math.max(we, wz) + 64 * KS;
    plate((W - w) / 2, SZ.enY - se - 20 * KS, w, SZ.zhY - SZ.enY + se + 34 * KS, a);
    let x = (W - we) / 2;
    q.words.forEach(([word, t0], i) => {
      const lit = clamp((t - t0 + .06) / .12), age = t - t0, hot = age >= -.02 && age < .45 ? Math.exp(-Math.max(0, age) * 6) : 0;
      const k = 1 + .16 * hot, cx = x + ws[i] / 2;
      sx.save(); sx.translate(cx, SZ.enY - 4 * KS * hot); sx.scale(k, k);
      sx.font = `${se}px SubKai`; sx.globalAlpha = a;
      if (hot > .05) { sx.shadowColor = `rgba(255,200,110,${.8 * hot})`; sx.shadowBlur = 18 * KS * hot; }
      sx.fillStyle = `rgb(${Math.round(lerp(120, 255, lit))},${Math.round(lerp(122, lerp(246, 214, hot), lit))},${Math.round(lerp(116, lerp(228, 130, hot), lit))})`;
      sx.fillText(word, -ws[i] / 2, 0); sx.restore();
      x += ws[i] + sp;
    });
    sx.font = `${SZ.zh}px SubKai`; sx.globalAlpha = a; sx.fillStyle = '#d9d3c2'; sx.fillText(q.zh, (W - wz) / 2, SZ.zhY);
    sx.globalAlpha = 1;
  }
  // motion blur: map each current screen pixel to where it was half a frame ago (prev ∘ current⁻¹)
  const blurMat = (c, pc) => {
    const A = view(c).m, B = view(pc).m, det = A[0] * A[3] - A[1] * A[2];
    const ia = A[3] / det, ib = -A[1] / det, ic = -A[2] / det, id = A[0] / det, ie = -(ia * A[4] + ic * A[5]), iff = -(ib * A[4] + id * A[5]);
    const a = B[0] * ia + B[2] * ib, b = B[1] * ia + B[3] * ib, cc = B[0] * ic + B[2] * id, d = B[1] * ic + B[3] * id;
    const e = B[0] * ie + B[2] * iff + B[4], f = B[1] * ie + B[3] * iff + B[5];
    return [a, b, 0, cc, d, 0, e, f, 1];
  };
  window.render = t => {
    const c = frame(t);
    const tp = t - .5 / 30, pcam = camFull(tp), pc = pcam.shot === c.shot ? pcam : c;
    const N = night(t), I = intensity(t), p = pulse(t, 8), fl = HITS.flashAt(t), hz = HITS.camAt(t);
    const ca = Math.min(9, Math.hypot(hz.dx, hz.dy) * .35 + (fl[0] + fl[1]) * 6 + p * I * N * 2.5);
    const fade = clamp((t - (F.DUR - .5)) / .42);
    post.draw(main, blurMat(c, pc), t, .3 + I * .1, {
      bloom: .32 + N * .95 + p * I * .35 + energy(t) * .15, thr: .2 - N * .05, ca, night: N * .82, flash: fl, fade, grain: (1.2 + N * 2.5) / 255,
    });
    subtitle(t);
  };
  window.TEXTS = t => {
    const v = view(camFull(t)), out = [];
    for (const q of F.TX) {
      if (t < q.t0 || t >= q.t1) continue;
      const [a, b] = v.toScreen(q.box[0], q.box[1]), [d, e] = v.toScreen(q.box[2], q.box[3]);
      if (d < 0 || a > W || e < 0 || b > H) continue;          // off screen: not on the board we are looking at
      out.push({ id: q.id, text: q.text, x0: a, y0: b, x1: d, y1: e, pass: q.pass });
    }
    return out;
  };
  window.F = F;
  window.render(+(Q.get('t') || 0));
}
window.READY = true;
