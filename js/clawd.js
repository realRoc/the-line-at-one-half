// Clawd in chalk: Claude's little mascot drawn on the slate, who then comes alive and walks the boards.
// Silhouette (body units u): body 10u × 6u (x −5u…5u, y −8u…−2u), two slit eyes 1u × 2u (x −3u…−2u and 2u…3u,
// y −7u…−5u) left as bare slate, two stubby arms at the sides (pivot ±5u, −4.5u, 2.2u long), four legs
// (x −4u, −2u, 1u, 3u; 1u wide) down to the ground at y = 0. Origin = the ground point between the feet.
// The body is filled with the side of a clay-coloured chalk in rows, outlined with a lighter clay, so it reads as
// chalk on a board, not a sticker. Everything is a pure function of t.
import { clamp, lerp, eio, back } from '/core/lib.js';
import { Stroke, bake, drawStroke, COLORS, n1 } from './chalk.js';
import { M } from './mathhand.js';
import { beatPhase, beatIndex, intensity, night } from './fx.js';

COLORS.clay = [.88, .50, .37]; COLORS.clayLt = [.99, .74, .62];
export const U = 22;                                    // the baked body unit (board units); a Clawd can be scaled from it

const S = (pts, o) => new Stroke(pts, { wob: .6, wav: 90, specks: .4, ...o });
// a fat stroke with the tip, pressed hard: the solid clay of the body, legs and arms
const FILL = (w, col = 'clay') => ({ kind: 'write', w, color: col, press: 1.25, skip: .04, taper: .05, land: .3, wob: .35, clean: .6, specks: .25 });
// t0/t1 of every stroke = the draw-on timing of the first appearance
function timed(st, t0, d) { st.t0 = t0; st.t1 = t0 + d; return st; }

export function buildClawd(tDraw) {
  const u = U, P = { body: [], legs: [], armL: [], armR: [], lids: [], chalk: [], emote: {} };
  let t = tDraw;
  // 1. outline (one continuous stroke round the body, then the arms' stubs are drawn later)
  const ol = S([[-5 * u, -8 * u], [5 * u, -8 * u], [5 * u, -2 * u], [-5 * u, -2 * u], [-5 * u, -8 * u]], { kind: 'write', w: 3.6, color: 'clayLt', taper: .15, land: .5, skip: .1, ease: .5 });
  P.body.push(timed(ol, t, .55)); t += .58;
  // 2. side-of-chalk fill, row by row, leaving the eye slits bare
  const rows = [-7.45, -6.5, -5.55, -4.45, -3.5, -2.6];
  rows.forEach((ry, i) => {
    const y = ry * u, eye = ry > -7.2 && ry < -4.8;
    const segs = eye ? [[-4.6, -3.08], [-1.92, 1.92], [3.08, 4.6]] : [[-4.6, 4.6]];
    segs.forEach(([a, b], k) => {
      const dir = i % 2 ? -1 : 1, p0 = [(dir > 0 ? a : b) * u, y + (n1(i * 3 + k, 4) - .5) * 2], p1 = [(dir > 0 ? b : a) * u, y + (n1(i * 3 + k, 8) - .5) * 2];
      P.body.push(timed(S([p0, p1], FILL(.6 * u)), t, .07 + .02 * (b - a) / 9.5));
    });
    t += .1;
  });
  // 3. legs
  [-4, -2, 1, 3].forEach((lx, i) => {
    const x = (lx + .5) * u;
    P.legs.push(timed(S([[x, -2.4 * u], [x, -.15 * u]], FILL(.5 * u)), t, .09)); t += .1;
  });
  // 4. arms (in arm space: from the pivot outward along +x for the right arm, −x for the left)
  P.armR.push(timed(S([[-.3 * u, 0], [2.0 * u, 0]], FILL(.5 * u)), t, .1)); t += .12;
  P.armL.push(timed(S([[.3 * u, 0], [-2.0 * u, 0]], FILL(.5 * u)), t, .1)); t += .12;
  P.tEnd = t;
  // eyelids for blinks (never drawn on, only shown whole)
  for (const ex of [-2.5, 2.5]) P.lids.push(timed(S([[ex * u, -7.0 * u], [ex * u, -5.0 * u]], FILL(.62 * u)), -10, .01));
  // a stub of pale yellow chalk, held at the tip of the right arm (Claude's hand)
  P.chalk.push(timed(S([[0, -.6 * u], [0, .6 * u]], FILL(.28 * u, 'kid')), -10, .01));
  // emotes
  for (const ch of ['?', '!']) P.emote[ch] = M(ch, -.3 * u, 0, 3.2 * u, -10, { seed: ch.charCodeAt(0), dur: .01 }).map(s => { s.t0 = -10; s.t1 = -9.99; return s; });
  P.emote['♪'] = [S([[0, 0], [0, -2.6 * u]], { kind: 'write', w: 3.4, color: 'white' }), S([[0, -2.6 * u], [1.3 * u, -2.0 * u]], { kind: 'write', w: 3.4, color: 'white' }),
    S([[-.55 * u, .1 * u], [.1 * u, -.1 * u], [-.2 * u, .4 * u], [-.7 * u, .3 * u], [-.55 * u, .1 * u]], { kind: 'write', w: 4.5, color: 'white' })].map(s => timed(s, -10, .01));
  const all = [...P.body, ...P.legs, ...P.armL, ...P.armR, ...P.lids, ...P.chalk, ...Object.values(P.emote).flat()];
  for (const s of all) bake(s, 2);
  return P;
}

// ───────── the choreography: a list of moves; state(t) = where Clawd is and how he holds himself.
// When he is not travelling he never stands still: he dances on the song's beat grid — a groove (bob, sway, arm swing)
// in the verses, a full hop on every beat in the choruses, with squash on each landing and stretch on each rise.
const hop = (u) => 4 * u * (1 - u);
const inW = (list, t, pre = 0, post = 0) => list.some(([a, b]) => t >= a - pre && t < b + post);
export class Track {
  constructor(t0, x, y, k = 1, o = {}) {
    this.moves = [{ type: 'place', t0, t1: t0, x, y }]; this.k0 = k; this.x = x; this.y = y;
    this.ev = { cheer: [], emote: [], blink: [], spin: [], sit: [], wave: [], scale: [], hide: [], hold: [], face: [], still: [], dance: [] };
    this.phase = o.phase ?? 0; this.drawT = o.drawT ?? null;      // clones: beat offset; draw-on time override
  }
  place(t, x, y) { this.moves.push({ type: 'place', t0: t, t1: t, x, y }); this.x = x; this.y = y; return this; }
  hop(t0, t1, x, y, h = 160, o = {}) { this.moves.push({ type: 'hop', t0, t1, x0: this.x, y0: this.y, x, y, h, flip: o.flip || 0 }); this.x = x; this.y = y; return this; }
  walk(t0, t1, x, y = this.y) { this.moves.push({ type: 'walk', t0, t1, x0: this.x, y0: this.y, x, y }); this.x = x; this.y = y; return this; }
  follow(t0, t1, f, o = {}) { this.moves.push({ type: 'follow', t0, t1, f, ...o }); const e = f(t1); this.x = e[0]; this.y = e[1]; return this; }
  cheer(t0, t1) { this.ev.cheer.push([t0, t1]); return this; }
  wave(t0, t1) { this.ev.wave.push([t0, t1]); return this; }
  emote(t0, t1, ch) { this.ev.emote.push([t0, t1, ch]); return this; }
  blink(t) { this.ev.blink.push(t); return this; }
  spin(t0, t1, turns = 1) { this.ev.spin.push([t0, t1, turns]); return this; }
  sit(t0, t1) { this.ev.sit.push([t0, t1]); return this; }
  hold(t0, t1, aim) { this.ev.hold.push([t0, t1, aim]); return this; }
  face(t0, t1, dir) { this.ev.face.push([t0, t1, dir]); return this; }
  still(t0, t1) { this.ev.still.push([t0, t1]); return this; }                       // no dancing (the draw-on)
  dance(t0, t1, style) { this.ev.dance.push([t0, t1, style]); return this; }       // force 'jump' or 'groove'
  scaleTo(t, k, d = .4) { this.ev.scale.push([t, k, d]); return this; }
  hide(t0, t1) { this.ev.hide.push([t0, t1]); return this; }

  state(t) {
    let m = null; for (const q of this.moves) if (q.t0 <= t) m = q; else break;
    if (!m) return null;
    for (const [a, b] of this.ev.hide) if (t >= a && t < b) return null;
    let x, y, air = 0, walk = null, tilt = 0, sq = 0, dir = 0, moving = false, flipRot = 0;
    const lastHop = this.moves.filter(q => q.type === 'hop' && q.t1 <= t).pop();
    if (m.type === 'place') { x = m.x; y = m.y; }
    else {
      const u = clamp((t - m.t0) / Math.max(1e-3, m.t1 - m.t0)); moving = u < 1;
      if (m.type === 'hop') {
        x = lerp(m.x0, m.x, eio(u) * .3 + u * .7); y = lerp(m.y0, m.y, u) - hop(u) * m.h; air = u < 1 ? 1 : 0; dir = Math.sign(m.x - m.x0);
        if (u < 1) { sq = -.28 * Math.sin(Math.PI * Math.min(1, u * 1.6)); if (m.flip) flipRot = eio(u) * Math.PI * 2 * m.flip; }
      }
      else if (m.type === 'walk') { const e = eio(u); x = lerp(m.x0, m.x, e); y = lerp(m.y0, m.y, e); walk = u < 1 ? (t - m.t0) * 9 : null; dir = Math.sign(m.x - m.x0); }
      else if (m.type === 'follow') { const p = m.f(Math.min(t, m.t1)); x = p[0]; y = p[1]; tilt = p[2] || 0; walk = t < m.t1 && m.walk !== false ? (t - m.t0) * 10 : null; air = m.air && t < m.t1 ? 1 : 0; dir = p[3] ?? 0; }
    }
    // anticipation before a hop, a big squash and wobble after landing
    const next = this.moves.find(q => q.type === 'hop' && q.t0 > t);
    if (next && next.t0 - t < .12) sq = Math.max(sq, .34 * (1 - (next.t0 - t) / .12));
    if (lastHop && t - lastHop.t1 < .5 && !moving) { const a = t - lastHop.t1; sq = .4 * Math.exp(-a * 8) * Math.cos(a * 24); }
    let k = this.k0; for (const [ts, kk, d] of this.ev.scale) if (t >= ts) k = lerp(k, kk, back(clamp((t - ts) / d), 2.4));
    let rot = tilt + flipRot;
    for (const [a, b, n] of this.ev.spin) if (t >= a && t < b) rot += eio((t - a) / (b - a)) * Math.PI * 2 * n * (dir < 0 ? -1 : 1);
    let armL = .25, armR = .25, legs = [0, 0, 0, 0], chalk = false, cheerK = 0, sit = 0, flip = dir, lid = 0;
    for (const [a, b, d] of this.ev.face) if (t >= a && t < b) flip = d;
    if (walk != null) { const p = walk * Math.PI; legs = [Math.max(0, Math.sin(p)), Math.max(0, -Math.sin(p)), Math.max(0, Math.sin(p)), Math.max(0, -Math.sin(p))].map(v => v * .8); armL = .25 + Math.sin(p) * .5; armR = .25 - Math.sin(p) * .5; y -= Math.abs(Math.sin(p)) * 10 * k; }
    if (air) { legs = [.7, .7, .7, .7]; armL = armR = 1.2; }
    for (const [a, b] of this.ev.cheer) if (t >= a - .1 && t < b + .2) { cheerK = Math.max(cheerK, clamp((t - a + .1) / .12) * (1 - clamp((t - b) / .2))); }
    for (const [a, b] of this.ev.sit) if (t >= a && t < b) sit = Math.max(sit, clamp((t - a) / .25) * (1 - clamp((t - b + .2) / .2)));
    const holding = inW(this.ev.hold, t);
    // ── the dance (only when not travelling, sitting, or being drawn)
    const I = intensity(t), ph = (beatPhase(t) + this.phase) % 1, bi = beatIndex(t), side = bi % 2 ? -1 : 1;
    let style = I >= .9 ? 'jump' : 'groove'; for (const [a, b, st] of this.ev.dance) if (t >= a && t < b) style = st;
    const dancing = !moving && !sit && !inW(this.ev.still, t) && walk == null;
    if (dancing) {
      if (style === 'jump' && !holding) {
        const H = (40 + 34 * Math.min(1.3, I)) * k;
        y -= hop(ph) * H;
        sq += ph < .14 ? .36 * (1 - ph / .14) : -.18 * Math.sin(Math.PI * (ph - .14) / .86);
        rot += side * .09 * Math.sin(Math.PI * ph);
        legs = legs.map(v => Math.max(v, .45 * Math.sin(Math.PI * ph)));
        armL = 1.15 + .4 * Math.sin(Math.PI * 2 * ph); armR = 1.15 - .4 * Math.sin(Math.PI * 2 * ph);
        lid = Math.max(lid, .45);
      } else {
        const g = Math.sin(Math.PI * ph);
        sq += .16 * Math.exp(-ph * 7) - .05 * g * (.5 + I);
        rot += side * (.05 + .07 * I) * Math.sin(Math.PI * Math.min(1, ph * 1.4));
        y -= g * 10 * k * (.4 + I);
        x += side * 6 * k * g;
        armL = .25 + (side > 0 ? .7 : .1) * g; armR = .25 + (side > 0 ? .1 : .7) * g;
        legs = side > 0 ? [.3 * g, 0, .3 * g, 0] : [0, .3 * g, 0, .3 * g];
      }
    }
    if (cheerK) { const w = Math.sin(t * 20) * .35; armL = lerp(armL, 1.15 + w, cheerK); armR = lerp(armR, 1.15 - w, cheerK); lid = Math.max(lid, .55 * cheerK); }
    for (const [a, b] of this.ev.wave) if (t >= a && t < b) { const kk = clamp((t - a) / .15) * (1 - clamp((t - b + .15) / .15)); armR = lerp(armR, 1.6 + Math.sin((t - a) * 14) * .5, kk); lid = Math.max(lid, .5 * kk); }
    for (const [a, b, aim] of this.ev.hold) if (t >= a && t < b) { const kk = clamp((t - a) / .15) * (1 - clamp((t - b + .15) / .15)); armR = lerp(armR, aim ? aim(t) : 1.2, kk); chalk = kk > .3; }
    if (sit) { sq = Math.max(sq, .18 * sit); legs = legs.map(v => Math.max(v, .9 * sit)); armL = lerp(armL, -.6, sit); armR = lerp(armR, -.6, sit); lid = Math.max(lid, .35 * sit); }
    // blinks: every ~3.3 s, plus scripted ones
    const bt = [...this.ev.blink, Math.floor(t / 3.3) * 3.3 + .7 + n1(Math.floor(t / 3.3), 2 + this.phase * 9) * 1.5];
    for (const b of bt) if (t >= b && t < b + .13) lid = 1;
    let emote = null; for (const [a, b, ch] of this.ev.emote) if (t >= a && t < b) emote = { ch, k: back(clamp((t - a) / .22), 3) * (1 - clamp((t - b + .15) / .15)), age: t - a };
    return { x, y, k, sq: clamp(sq, -.35, .45), rot, legs, armL, armR, lid, emote, chalk, flip, air, sit, moving };
  }
}

// draw Clawd with the 2D context already in board space (the camera's transform); t drives the draw-on
export function drawClawd(ctx, P, st, t) {
  if (!st || st.k < .01) return;
  const u = U, { x, y, k, sq, rot } = st;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const fl = st.flip < 0 ? -1 : 1;
  ctx.scale(k * (1 + sq * .6) * fl, k * (1 - sq));
  const sit = st.sit || 0;
  P.legs.forEach((s, i) => { ctx.save(); ctx.translate(0, -st.legs[i] * .6 * u + sit * .9 * u); drawStroke(ctx, s, t); ctx.restore(); });
  ctx.save(); ctx.translate(0, sit * 1.4 * u);
  const arm = (strokes, side, a, held) => {
    ctx.save(); ctx.translate(side * 5.05 * u, -4.6 * u); ctx.rotate(side > 0 ? -a : a);
    for (const s of strokes) drawStroke(ctx, s, t);
    if (held) { ctx.translate(side * 2.25 * u, 0); for (const s of P.chalk) drawStroke(ctx, s, 1e9); }
    ctx.restore();
  };
  arm(P.armL, -1, st.armL, false); arm(P.armR, 1, st.armR, st.chalk);
  for (const s of P.body) drawStroke(ctx, s, t);
  // eyelids: a lid slides down over each slit (1 = shut, ~.5 = a happy squint)
  if (st.lid > .02 && t > P.tEnd) { ctx.save(); ctx.beginPath(); ctx.rect(-5 * u, -7.2 * u, 10 * u, (2.2 * Math.min(1, st.lid) + .05) * u); ctx.clip(); for (const s of P.lids) drawStroke(ctx, s, 1e9); ctx.restore(); }
  ctx.restore();
  ctx.restore();
  if (st.emote && P.emote[st.emote.ch]) {
    const e = st.emote, kk = Math.max(0, e.k) * k;
    ctx.save(); ctx.translate(x + 4.2 * u * k, y - 9.6 * u * k + Math.sin(e.age * 6) * 4); ctx.rotate(Math.sin(e.age * 9) * .14 * Math.exp(-e.age * 2)); ctx.scale(kk, kk);
    for (const s of P.emote[e.ch]) drawStroke(ctx, s, 1e9);
    ctx.restore();
  }
}
// a point in Clawd's body frame (body units, before scale) → board coordinates, with his squash, flip and rotation
export function localToWorld(st, lx, ly) {
  const fl = st.flip < 0 ? -1 : 1, sx = st.k * (1 + st.sq * .6) * fl, sy = st.k * (1 - st.sq), x = lx * sx, y = ly * sy, c = Math.cos(st.rot), s = Math.sin(st.rot);
  return [st.x + c * x - s * y, st.y + s * x + c * y];
}
// the silhouette (for the iris): body, four legs, two arm stubs, unit u, origin at the ground between the feet
export function silhouette(ctx, cx, cy, u) {
  ctx.rect(cx - 5 * u, cy - 8 * u, 10 * u, 6 * u);
  for (const lx of [-4, -2, 1, 3]) ctx.rect(cx + lx * u, cy - 2.05 * u, u, 2.05 * u);   // nonzero fill: overlaps are fine
  ctx.rect(cx - 7.2 * u, cy - 5.1 * u, 2.25 * u, u); ctx.rect(cx + 4.95 * u, cy - 5.1 * u, 2.25 * u, u);
}
