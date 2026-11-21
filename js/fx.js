// v2 motion grammar: everything that makes the film hit on the beat. All of it is a pure function of t.
// - the song's beat grid and loudness (data/beats.json, from tools/beats.py)
// - section intensity: how hard the camera and the glow lean in (verses calm, choruses hard, chorus 2 harder)
// - hits: flashes, decaying shakes, roll kicks, shockwave rings and dust bursts, placed by film.js on sung words
import { clamp, lerp } from '/core/lib.js';
import { n1, rng } from './chalk.js';

export const BEATS = await (await fetch('data/beats.json')).json();
const B = BEATS.beats, E = BEATS.energy;

export const energy = t => { const i = clamp(t / E.dt, 0, E.v.length - 1), a = Math.floor(i), b = Math.min(E.v.length - 1, a + 1); return lerp(E.v[a], E.v[b], i - a); };
// time since the last beat and its index
function lastBeat(t) { let lo = 0, hi = B.length - 1; if (t < B[0]) return -1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (B[m] <= t) lo = m; else hi = m; } return B[hi] <= t ? hi : lo; }
// 1 on the beat, decaying; every other beat (the backbeat) a little weaker
export function pulse(t, k = 9) {
  const i = lastBeat(t); if (i < 0) return 0;
  const age = t - B[i]; return Math.exp(-age * k) * (i % 2 ? .7 : 1);
}
export const beatPhase = t => { const i = lastBeat(t); if (i < 0 || i + 1 >= B.length) return 0; return (t - B[i]) / (B[i + 1] - B[i]); };
export const beatIndex = t => lastBeat(t);

// section intensity (0 calm … 1.3 all in), keyed on the song's form
const SEC = [[0, .15], [9.6, .25], [19.5, .55], [30.6, .4], [50.3, .45], [71.4, .6], [79.0, .85], [81.9, 1.0], [102.8, .6], [107.2, .5],
  [127.0, .55], [148.0, .6], [158.8, 1.2], [180.4, .3], [201.8, .55], [213.4, 1.15], [223.4, .25]];
export function intensity(t) {
  let i = 0; while (i + 1 < SEC.length && t >= SEC[i + 1][0]) i++;
  const [ta, a] = SEC[i], n = SEC[i + 1]; if (!n) return a;
  const prev = i > 0 ? SEC[i - 1][1] : a, k = clamp((t - ta) / .35);
  return lerp(prev, a, k);
}
// "night": the room's lights go down and the chalk glows (choruses, the last line)
const NIGHT = [[81.9, 103.0], [158.8, 180.4], [213.4, 223.6]];
export function night(t) {
  let v = 0; for (const [a, b] of NIGHT) v = Math.max(v, clamp((t - a + .05) / .12) * (1 - clamp((t - b) / 1.2)));
  return v;
}

// ───────── hits
export class Hits {
  constructor() { this.flash = []; this.shake = []; this.roll = []; this.rings = []; this.bursts = []; this.zoom = []; this.spin = []; }
  addFlash(t, a = .6, col = [1, .96, .88], d = .35) { this.flash.push({ t, a, col, d }); return this; }
  addShake(t, a = 14, d = .5) { this.shake.push({ t, a, d }); return this; }
  addRoll(t, a = .02, d = .6) { this.roll.push({ t, a, d }); return this; }
  addSpin(t0, t1, turns = 1) { this.spin.push({ t0, t1, turns }); return this; }
  addZoom(t, a = .06, d = .45) { this.zoom.push({ t, a, d }); return this; }
  addRing(t, x, y, col = 'orange', r = 260, d = .7) { this.rings.push({ t, x, y, col, r, d }); return this; }
  addBurst(t, x, y, col = 'white', n = 40, o = {}) { this.bursts.push({ t, x, y, col, n, ...o }); return this; }
  // a full impact: flash + shake + ring + dust at a board point
  impact(t, x, y, col = 'orange', k = 1) {
    this.addFlash(t, .35 * k, col === 'orange' ? [1, .7, .45] : [1, .95, .8], .3).addShake(t, 16 * k, .45).addZoom(t, .045 * k, .4);
    this.addRing(t, x, y, col, 220 * Math.sqrt(k)).addBurst(t, x, y, col, Math.round(36 * k));
    return this;
  }
  flashAt(t) {
    const c = [0, 0, 0];
    for (const f of this.flash) { const u = (t - f.t) / f.d; if (u < 0 || u > 1) continue; const a = f.a * Math.pow(1 - u, 2.2); for (let k = 0; k < 3; k++) c[k] += f.col[k] * a; }
    return c;
  }
  // camera additions: [dx, dy] in screen px, roll (rad), zoom factor
  camAt(t) {
    let dx = 0, dy = 0, r = 0, z = 0;
    for (const s of this.shake) {
      const age = t - s.t; if (age < 0 || age > s.d * 2.5) continue;
      const a = s.a * Math.exp(-age / s.d * 3.2), f = Math.floor(age * 30);       // shake changes 30 times a second, frame-locked
      const R = rng(Math.round(s.t * 997) + f * 13);
      dx += (R() - .5) * 2 * a; dy += (R() - .5) * 2 * a;
    }
    for (const q of this.roll) { const age = t - q.t; if (age < 0 || age > q.d * 3) continue; r += q.a * Math.exp(-age / q.d * 2.5) * Math.cos(age * 9); }
    for (const q of this.zoom) { const age = t - q.t; if (age < 0 || age > q.d * 3) continue; z += q.a * Math.exp(-age / q.d * 3) * (age < .05 ? age / .05 : 1); }
    for (const q of this.spin) if (t >= q.t0 && t < q.t1) { const u = clamp((t - q.t0) / (q.t1 - q.t0)); r += (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2) * Math.PI * 2 * q.turns; }
    return { dx, dy, r, z };
  }
}

// the film's ongoing camera life: beat punch-in, handheld drift and a slow roll that breathes with the music
export function cameraLife(t) {
  const I = intensity(t), p = pulse(t, 7), N = night(t);
  const z = p * .018 * I * (1 + N * .9);
  const amp = 3 + 9 * I;
  const dx = (n1(t * .55, 3) - .5) * 2 * amp + (n1(t * 2.1, 5) - .5) * amp * .35;
  const dy = (n1(t * .48, 7) - .5) * 2 * amp * .7 + (n1(t * 1.9, 9) - .5) * amp * .3;
  const r = (n1(t * .21, 11) - .5) * .012 * I + N * Math.sin(t * .7) * .006;
  return { dx, dy, r, z };
}

// ───────── drawing: rings (in screen space, glowing), bursts use props.Dust
const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
export function drawRings(ctx, hits, t, toScreen, s, COLORS) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of hits.rings) {
    const u = (t - q.t) / q.d; if (u < 0 || u > 1) continue;
    const [x, y] = toScreen(q.x, q.y), col = COLORS[q.col] || COLORS.white, e = 1 - Math.pow(1 - u, 3);
    for (let k = 0; k < 2; k++) {
      const rr = q.r * s * (.15 + e * (k ? .7 : 1.05)), a = (1 - u) * (k ? .22 : .38);
      ctx.lineWidth = Math.max(1.5, (14 - 10 * u) * s * (k ? 1.8 : 1)); ctx.strokeStyle = css(col, a);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.stroke();
    }
    if (u < .25) { const g = ctx.createRadialGradient(x, y, 0, x, y, q.r * s * .6); g.addColorStop(0, css(col, .5 * (1 - u * 4))); g.addColorStop(1, css(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - q.r * s, y - q.r * s, q.r * s * 2, q.r * s * 2); }
  }
  ctx.restore();
}
