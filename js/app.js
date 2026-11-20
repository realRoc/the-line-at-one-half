// Page: every frame is Canvas 2D (wall, seven slates, chalk, the one wipe, light), then a WebGL2 post pass
// (camera motion blur, vignette, grade), then the subtitle plate. window.render(t) depends on t only.
import { clamp, lerp } from '/core/lib.js';
import { bake, drawStroke } from './chalk.js';
import { installDeposit, grainTile } from './r2d.js';
import { Post } from './post.js';
import { loadSvgFont } from './hand.js';
import { bakeWall, bakeSlate, WALL, SX, PW, BH, BW, NS, FLOOR } from './stage.js';
import { drawFront } from './props.js';

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
  const view = c0 => { const c = { ...c0, s: c0.s * KS }; return { ...c, m: [c.s, 0, 0, c.s, W / 2 - c.cx * c.s, H / 2 - c.cy * c.s], toScreen: (x, y) => [W / 2 + (x - c.cx) * c.s, H / 2 + (y - c.cy) * c.s], W, H,
    rect: [c.cx - W / 2 / c.s, c.cy - H / 2 / c.s, c.cx + W / 2 / c.s, c.cy + H / 2 / c.s] }; };
  const inView = (bb, r) => bb[2] >= r[0] && bb[0] <= r[2] && bb[3] >= r[1] && bb[1] <= r[3];
  const WP = F.wipe;
  const wipePath = t => {
    if (!WP || t <= WP.t0) return null;
    const P = WP.path, n = Math.max(2, Math.round(P.length * clamp((t - WP.t0) / (WP.t1 - WP.t0))));
    const p = new Path2D(); P.slice(0, n).forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); return p;
  };

  function frame(t) {
    const c = F.camAt(t), v = view(c), r = v.rect;
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.globalAlpha = 1; mx.filter = 'none';
    mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
    mx.setTransform(...v.m); mx.imageSmoothingQuality = 'high';
    if (r[1] < WALL[1] || r[3] > WALL[1] + WALL[3] || r[0] < WALL[0] || r[2] > WALL[0] + WALL[2]) {     // very wide: the hall beyond the baked wall
      mx.fillStyle = '#b3ae9f'; mx.fillRect(r[0], r[1], r[2] - r[0], 2380 - r[1]); mx.fillStyle = '#56705f'; mx.fillRect(r[0], 2380, r[2] - r[0], FLOOR - 2380);
      mx.fillStyle = '#4a3a2c'; mx.fillRect(r[0], FLOOR, r[2] - r[0], r[3] - FLOOR);
    }
    mx.drawImage(WALLI.cv, WALL[0], WALL[1], WALL[2], WALL[3]);
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
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pane(-300 + i * 400, 1060 + j * 330 + i * 400 * .28, 360, 300, .07 - i * .018);
    mx.restore();
    // the chalk's front: a few bright grains where the writing is now
    for (const s of F.S) {
      if (t <= s.t0 || t >= s.t1 || !inView(s.bb, r)) continue;
      const p = s.at(s.prog(t) * s.len);
      drawFront(mx, t, v, p[0], p[1], s.color, Math.min(s.w, 9), .5);
    }
    return c;
  }

  // ───────── subtitle plate: the sung line in English (each word lights as it is sung) over the Chinese translation;
  // where nobody sings, a Chinese note alone
  await document.fonts.load('40px SubKai');
  const sc = document.getElementById('s'); sc.width = W; sc.height = H; const sx = sc.getContext('2d');
  const SZ = { en: Math.round(31 * KS), zh: Math.round(37 * KS), enY: H - Math.round(98 * KS), zhY: H - Math.round(52 * KS), noteY: H - Math.round(64 * KS) };
  const NOSUBS = Q.has('nosubs');
  const subsAt = t => F.SUBS.filter(q => t >= q.t0 && t < q.t1);
  function plate(x0, y0, w, h, a) { sx.globalAlpha = a * .6; sx.fillStyle = '#0a0f0c'; sx.beginPath(); sx.roundRect(x0, y0, w, h, 10 * KS); sx.fill(); }
  function subtitle(t) {
    sx.clearRect(0, 0, W, H); if (NOSUBS) return;
    const q = subsAt(t).pop(); if (!q) return;
    const a = Math.min(1, (t - q.t0) / .12, (q.t1 - t) / .15);
    sx.textBaseline = 'alphabetic'; sx.textAlign = 'left';
    if (q.note) {
      sx.font = `${SZ.zh}px SubKai`; const wz = sx.measureText(q.zh).width;
      plate((W - wz) / 2 - 28 * KS, SZ.noteY - SZ.zh - 14 * KS, wz + 56 * KS, SZ.zh + 32 * KS, a);
      sx.globalAlpha = a; sx.fillStyle = '#e9e3d2'; sx.fillText(q.zh, (W - wz) / 2, SZ.noteY); sx.globalAlpha = 1; return;
    }
    sx.font = `${SZ.en}px SubKai`; const sp = sx.measureText(' ').width, ws = q.words.map(([w]) => sx.measureText(w).width);
    const we = ws.reduce((s, x) => s + x, 0) + sp * (ws.length - 1);
    sx.font = `${SZ.zh}px SubKai`; const wz = sx.measureText(q.zh).width;
    const w = Math.max(we, wz) + 56 * KS;
    plate((W - w) / 2, SZ.enY - SZ.en - 16 * KS, w, SZ.zhY - SZ.enY + SZ.en + 32 * KS, a);
    sx.font = `${SZ.en}px SubKai`; let x = (W - we) / 2;
    q.words.forEach(([word, t0], i) => {
      const lit = clamp((t - t0 + .06) / .12);
      sx.globalAlpha = a; sx.fillStyle = `rgb(${Math.round(lerp(128, 252, lit))},${Math.round(lerp(130, 236, lit))},${Math.round(lerp(122, 200, lit))})`;
      sx.fillText(word, x, SZ.enY); x += ws[i] + sp;
    });
    sx.font = `${SZ.zh}px SubKai`; sx.globalAlpha = a; sx.fillStyle = '#f3efe4'; sx.fillText(q.zh, (W - wz) / 2, SZ.zhY);
    sx.globalAlpha = 1;
  }
  window.render = t => {
    const c = frame(t);
    const tp = t - .5 / 30, pcam = F.camAt(tp), pc = pcam.shot === c.shot ? pcam : c, k = pc.s / c.s;
    const bl = [k, 0, 0, 0, k, 0, W / 2 - k * W / 2 + pc.s * KS * (c.cx - pc.cx), H / 2 - k * H / 2 + pc.s * KS * (c.cy - pc.cy), 1];
    post.draw(main, bl, t, .3);
    subtitle(t);
  };
  window.TEXTS = t => {
    const v = view(F.camAt(t)), out = [];
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
