// The Line at One-Half — the whole film as data: every chalk stroke with its time (locked to the sung words in
// lyrics.js), the one wipe, the camera, the subtitle cues, the board texts for readcheck and the sound events.
// World units: seven slates in one frame (stage.js), slate i spans x SX(i) … SX(i)+3200, y 0 … 1700.
import { clamp, lerp, eio, ei, eo } from '/core/lib.js';
import { Stroke, catmull, arc as arcS } from './chalk.js';
import { M, mathWidth } from './mathhand.js';
import { SX, PW, BH, BW } from './stage.js';
import { LYRICS } from './lyrics.js';
import { Hits } from './fx.js';
import { Track, U as CU, localToWorld } from './clawd.js';

export const DUR = 237.6;
// lookup: start time of the n-th occurrence of a sung word (case-insensitive prefix match)
const WORDS = LYRICS.flatMap(c => c.words.map(([w, t]) => [w.toLowerCase().replace(/[^a-z0-9'-]/g, ''), t]));
const at = (word, after = 0) => { const w = word.toLowerCase(); const hit = WORDS.find(([x, t]) => t >= after && x.startsWith(w)); if (!hit) throw new Error('no word ' + word + ' after ' + after); return hit[1]; };

const PLAIN = { zeta: 'ζ', theta: 'θ', Lambda: 'Λ', chi: 'χ', pi: 'π', rho: 'ρ', sigma: 'σ', gamma: 'γ', mu: 'μ', phi: 'φ', Sigma: 'Σ', Pi: 'Π',
  to: '→', lto: '←', lr: '↔', mapsto: '↦', imp: '⇒', ge: '≥', le: '≤', ll: '≪', approx: '≈', ne: '≠', infty: '∞', subset: '⊂', in: '∈', boxplus: '⊞',
  times: '×', cdot: '·', cdots: '⋯', vdots: '⋮', check: '✓', cross: '✗', Z: 'ℤ', F: '𝔽', int: '∫', hourglass: '⧗', partial: '∂', ell: 'ℓ', emdash: '—', odia: 'ö' };
const plain = s => s.replace(/\\sqrt/g, '√').replace(/\\hat/g, '').replace(/\\([a-zA-Z]+)/g, (_, n) => PLAIN[n] ?? n).replace(/[{}_^]/g, '');

export const NOTES = [   // bilingual notes on the subtitle plate where nobody sings (English first)
  { id: 'n0', t0: 1.2, t1: 9.5, en: 'The Riemann Hypothesis: every nontrivial zero of ζ(s) has real part 1/2.', zh: '黎曼猜想：ζ(s) 的非平凡零点，实部全都等于 1/2。' },
  { id: 'n1', t0: 20.4, t1: 25.3, en: 'ζ ties all the positive integers to all the primes.', zh: 'ζ 函数一头连着全体正整数，一头连着全体素数。' },
  { id: 'n2', t0: 25.5, t1: 30.6, en: 'Where the zeros sit decides how well we can count the primes.', zh: '零点在哪里，决定了素数分布的误差有多小。' },
  { id: 'n3', t0: 103.0, t1: 107.35, en: 'Each θ-lift wins one more layer of multiplicity; √X lifts copy the finite-field trick.', zh: '每做一次 θ 提升，多赢一层重数；连提 √X 次，模仿有限域里的高重数。' },
  { id: 'n4', t0: 224.6, t1: 237.6, en: 'Note: as of 2026-11-20 there is no public independent build or peer review of this proof.', zh: '注：截至 2026-11-20，这份证明尚无公开的独立编译与同行审查。' },
];

export function build(W = 1920, H = 1080) {
  const S = [], TX = [], EV = [];
  let OX = 0, SEED = 1;
  const slate = i => { OX = SX(i); };
  const add = (arr, o = {}) => { for (const s of arr) { if (o.wiped) s.wiped = true; if (o.R) s.o.R = o.R; S.push(s); } return arr; };
  const box = arr => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of arr) for (const [x, y] of s.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - 8, y0 - 8, x1 + 8, y1 + 8]; };
  // write markup at slate-local (x, baseline) and register it as a board text
  const w = (id, s, x, by, cap, t, o = {}) => {
    const st = add(M(s, OX + x, by, cap, t, { seed: SEED++, ...o }), o);
    if (id) TX.push({ id, text: o.say ?? plain(s), box: box(st), t0: st[0].t0, t1: o.t1 ?? 1e9, pass: o.pass });
    return st;
  };
  const wc = (id, s, cx, by, cap, t, o = {}) => w(id, s, cx - mathWidth(s, cap) / 2, by, cap, t, o);
  // a chalk line through slate-local points
  const L = (pts, t0, dur, o = {}) => {
    const P = pts.map(([x, y]) => [OX + x, y]);
    const st = new Stroke(o.smooth ? catmull(P, 10) : P, { kind: 'write', w: o.w ?? 7, color: o.color || 'white', taper: o.taper ?? .2, taperLen: .2, land: .6, skip: o.skip ?? .14,
      endSpecks: true, specks: .6, wob: o.wob ?? 1.6, wav: o.wav ?? 160, seed: (SEED++) * 7.3, R: o.R, ease: o.ease });
    st.t0 = t0; st.t1 = t0 + dur; if (o.wiped) st.wiped = true; S.push(st); return st;
  };
  const arrow = (x0, y0, x1, y1, t0, dur, o = {}) => {
    const a = L([[x0, y0], [x1, y1]], t0, dur * .78, o), ang = Math.atan2(y1 - y0, x1 - x0), h = o.head ?? 34;
    const hd = L([[x1 + Math.cos(ang + Math.PI - .5) * h, y1 + Math.sin(ang + Math.PI - .5) * h], [x1, y1], [x1 + Math.cos(ang + Math.PI + .5) * h, y1 + Math.sin(ang + Math.PI + .5) * h]], t0 + dur * .8, dur * .2, { ...o, wob: .3, taper: .3 });
    return [a, hd];
  };
  const cross = (x, y, r, t0, o = {}) => [L([[x - r, y - r], [x + r, y + r]], t0, .1, { w: 6, wob: .3, ...o }), L([[x + r, y - r], [x - r, y + r]], t0 + .12, .1, { w: 6, wob: .3, ...o })];
  const dashed = (x0, y0, x1, y1, t0, dur, o = {}) => {
    const n = o.n ?? 12, out = [];
    for (let i = 0; i < n; i++) { const a = i / n, b = (i + .55) / n; out.push(L([[lerp(x0, x1, a), lerp(y0, y1, a)], [lerp(x0, x1, b), lerp(y0, y1, b)]], t0 + dur * a, dur / n * .55, { w: 5, wob: .3, taper: .3, ...o })); }
    return out;
  };
  const ring = (x, y, r, t0, dur, o = {}) => { const st = arcS(OX + x, y, r, -1.9, -1.9 + Math.PI * 2.08, { kind: 'write', w: o.w ?? 4.5, color: o.color || 'white', taper: .3, land: .4, wob: .5, skip: .1, seed: (SEED++) * 3.1 }); st.t0 = t0; st.t1 = t0 + dur; S.push(st); return st; };
  const T = {};

  // ════════ S1 · Riemann, 1859: the line, the zeros (0 – 50 s)
  slate(0);
  const LX = 2250, AX = 1130, IM = y => AX - 17.5 * y;            // the critical line's x; real axis y; Im → board y
  w('lbl-half', 'Re(s) = 1/2', LX + 50, 150, 72, .5, { dur: 1.5 });
  const crit = L([[LX, 40], [LX, 1590]], 1.9, 3.9, { color: 'orange', w: 9, wob: 1.2, ease: .55 });
  T.crit = crit;
  w('y1859', '1859', 230, 470, 230, at('eighteen') - .02, { dur: 1.0 });
  w('riemann', 'B. Riemann', 250, 640, 82, 11.15, { dur: 1.0 });
  w('quote', '"... sehr wahrscheinlich ..."', 250, 820, 66, at('a', 13) , { dur: 2.2 });
  w('allzeros', '(all zeros on one line)', 280, 930, 56, 16.2, { dur: 1.6 });
  w('veryprob', '= very probably', 300, 1050, 70, at('very') - .05, { dur: 1.0 });
  // instrumental: the function itself
  w('zeta', '\\zeta(s) = \\Sigma 1/n^s = \\Pi_p (1 - p^{-s})^{-1}', 200, 1330, 70, 22.4, { dur: 3.4 });
  w('primes-zeros', 'integers \\lr primes \\lr zeros', 230, 1460, 58, 26.6, { dur: 1.8 });
  // verse 1: the strip
  L([[1650, AX], [3060, AX]], at('riemann') + .05, .55, { w: 6 });
  L([[1800, 1470], [1800, 70]], at('drew') + .05, .55, { w: 6 });
  arrow(3000, AX, 3070, AX, at('riemann') + .55, .12, { w: 6, head: 26 });
  dashed(2700, 1460, 2700, 80, at('across'), .7, { n: 14 });
  w('ax0', '0', 1770, AX + 72, 52, at('dark'), { dur: .2 });
  w('ax12', '1/2', LX - 56, AX + 72, 52, at('dark') + .2, { dur: .35 });
  w('ax1', '1', 2690, AX + 72, 52, at('dark') + .55, { dur: .2 });
  w('axre', 'Re', 2930, AX - 30, 46, at('dark') + .8, { dur: .25 });
  w('axim', 'Im', 1830, 130, 46, at('dark') + 1.05, { dur: .25 });
  const Z = [14.135, 21.022, 25.011, 30.425, 32.935, 37.586, 40.919, 43.327, 48.005, 49.774, 52.970, 56.446, 59.347];
  const z0 = at('every', 35), z1 = at('one-half', 37) + .7;
  for (let i = 0; i < 10; i++) { const t = lerp(z0 + .05, z1, i / 9); cross(LX, IM(Z[i]), 22, t, { color: 'orange', w: 6.5 }); EV.push({ t, type: 'zero' }); }
  w('rho1', '\\rho = 1/2 + 14.13i', LX + 42, IM(Z[0]) + 16, 44, z1 + .4, { dur: 1.1 });
  w('years', '1859 \\to 2026', 1180, 330, 60, at('hundred') + .05, { dur: 1.6 });
  w('checked', 'first 10^{13} zeros', 1180, 450, 60, at('everyone'), { dur: 1.0 });
  w('online', 'all on the line \\check', 1180, 560, 60, at('see', 45), { dur: .8 });
  w('proof', 'proof ?', 1180, 700, 80, at('no', 47) , { dur: .9 });

  // ════════ S2 · over 𝔽_q it is a theorem; over ℤ: build it (50 – 81 s)
  slate(1);
  w('fq', 'over \\F_q', 170, 210, 110, at('out', 50), { dur: 1.2 });
  w('fq-sub', '(curves over a finite field)', 180, 320, 52, at('story'), { dur: 1.2 });
  w('weil', 'Weil 1948:  |\\alpha_i| = \\sqrt{q}', 170, 480, 72, at('weil'), { dur: 2.0 });
  w('weil2', '#C(\\F_q) = q + 1 - \\Sigma \\alpha_i', 200, 585, 60, at('answer') - .2, { dur: 1.1 });
  w('step', 'Stepanov 1969:', 170, 735, 72, at('stepanov'), { dur: 1.0 });
  w('buildf', 'build f with f(P) = 0 at every P', 200, 845, 60, at('build', 60), { dur: 2.4 });
  // the curve and its points
  const CY = x => 975 + Math.sin(x / 210) * 34;
  const cpts = []; for (let x = 200; x <= 1560; x += 40) cpts.push([x, CY(x)]);
  L(cpts, at('vanish') - .3, .8, { smooth: true, w: 6 });
  const PX = [330, 560, 790, 1020, 1250, 1460];
  PX.forEach((x, i) => { L([[x - 3, CY(x) - 2], [x + 3, CY(x) + 2]], at('vanish') + .5 + i * .14, .06, { w: 11, wob: 0 }); });
  for (let k = 0; k < 3; k++) PX.forEach((x, i) => ring(x, CY(x), 26 + k * 17, at('stack') + .05 + k * .55 + i * .07, .16));
  w('orderm', 'to order m', 1300, 1120, 48, at('multiplicity', 64) + .6, { dur: .7 });
  w('weilbound', '\\imp #C(\\F_q) \\le q + O(\\sqrt{q})', 200, 1190, 66, at('till'), { dur: 2.0 });
  w('noroom', '(the zeros have no room)', 260, 1265, 46, at('nowhere') - .1, { dur: 1.1 });
  // over ℤ
  w('z', 'over \\Z', 1760, 210, 110, at('integers') - .2, { dur: 1.0 });
  w('z-sub', '(the integers: no curve, no Frobenius)', 1770, 320, 50, at('give') - .1, { dur: 1.5 });
  w('frob', 'Frobenius', 1780, 470, 80, at('no', 74) , { dur: .8 });
  L([[1760, 445], [2310, 440]], at('frobenius') + .85, .22, { w: 7 });
  cross(2400, 445, 26, at('way'), { w: 6 });
  const wiped0 = w('ddn', 'mult. = d/dn ?', 1780, 650, 92, at('world') - .05, { dur: 1.3, t1: 79.4, wiped: true });
  T.wipe0 = 79.15; T.wipe1 = 79.75;
  EV.push({ t: T.wipe0, type: 'wipe', d: T.wipe1 - T.wipe0 });
  const WP = []; for (let i = 0; i <= 24; i++) { const u = i / 24; WP.push([SX(1) + 1740 + u * 1150, 620 + Math.sin(u * 9.4) * 50 - 10]); }
  T.wipe = { t0: T.wipe0, t1: T.wipe1, w: 220, path: catmull(WP, 6) };
  w('buildit', 'BUILD IT', 1780, 750, 160, 79.8, { dur: .75, lw: .075 });

  // ════════ S3 · the chain of theta lifts (82 – 103 s, and again 159 – 180 s)
  slate(2);
  const NODES = [[200, 1250, 'U(X_0)'], [760, 1000, 'U(X_1)'], [1320, 750, 'U(X_2)'], [2120, 420, 'U(X_m)']];
  const ncap = 78, nw = s => mathWidth(s, ncap);
  w('n0', NODES[0][2], NODES[0][0], NODES[0][1], ncap, 81.92, { dur: .3 });
  const MID = [];
  const lift = (a, b, t, label = '\\theta', dot = false) => {
    const x0 = a[0] + nw(a[2]) + 20, y0 = a[1] - 30, x1 = b[0] - 20, y1 = b[1] - 20; MID.push([(x0 + x1) / 2, (y0 + y1) / 2]);
    arrow(x0, y0, x1, y1, t, .3, { w: 6 });
    w(null, label, (x0 + x1) / 2 - 40, (y0 + y1) / 2 - 40, 60, t + .32, { dur: .16 });
  };
  const tl1 = at('lift', 82), tl2 = at('lift', 82.5), tth = at('theta', 83), tth2 = at('theta', 84);
  lift(NODES[0], NODES[1], tl1 + .12); w('n1', NODES[1][2], NODES[1][0], NODES[1][1], ncap, tl1 + .58, { dur: .3 });
  lift(NODES[1], NODES[2], tl2); w('n2', NODES[2][2], NODES[2][0], NODES[2][1], ncap, tl2 + .5, { dur: .35 });
  // the dots, then the last lift
  lift(NODES[2], [1840, 600, ''], tth - .05);
  w('ndots', '\\cdots', 1850, 590, 78, tth + .45, { dur: .2 });
  lift([1850, 590, '\\cdots'], NODES[3], tth2 - .1);
  w('nm', NODES[3][2], NODES[3][0], NODES[3][1], ncap, tth2 + .35, { dur: .4 });
  w('chainlen', 'chain length:', 230, 380, 54, at('square', 85) - .1, { dur: .5 });
  w('sqrtx', 'm \\approx \\sqrt{X}', 260, 560, 140, at('root', 85) - .05, { dur: 1.4, color: 'kid' });
  // multiplicity under each node
  const mult = [['mult 0', 0], ['mult 1', 1], ['mult 2', 2], ['mult m', 3]];
  mult.forEach(([s, i], k) => w('mult' + k, s, NODES[i][0] + 20, NODES[i][1] + 82, 46, 88.2 + k * .55, { dur: .4 }));
  w('unitary', 'U = unitary group', 1400, 250, 52, at('unitary', 91) + .05, { dur: 2.0 });
  w('pilift', 'each lift: \\pi \\mapsto \\pi \\boxplus \\mu_j', 1480, 1010, 60, at('higher', 93) - .1, { dur: 1.3 });
  const L3 = 2950;
  const crit3 = L([[L3, 160], [L3, 1420]], at('every', 95) + .05, 1.0, { color: 'orange', w: 8 });
  w('lbl3', 'Re = 1/2', L3 - 120, 120, 52, at('home', 96), { dur: .3 });
  const h3 = [at('line', 97.8), at('line', 99.2), at('line', 101)];
  h3.forEach((t, i) => { cross(L3, [930, 720, 500][i], 24, t - .02, { color: 'orange', w: 5.5 }); EV.push({ t, type: 'zero' }); });
  // chorus 2 additions
  const c2 = [at('lift', 158.9), at('lift', 159.5), at('theta', 160), at('theta', 161)];
  MID.forEach(([x, y], i) => w('plus' + i, '+1', x + 34, y + 62, 48, c2[i] + .05, { dur: .3 }));
  L([[250, 600], [880, 590]], at('square', 162) + .05, .5, { color: 'kid', w: 7 });
  w('lensum', '(X: length of \\Sigma \\Lambda(n))', 270, 690, 48, at('of', 163) - .2, { dur: 1.8, color: 'kid' });
  // the line that sews the boards: from this slate's line all the way back to Riemann's
  T.sew0 = at('every', 172) + .05; T.sew1 = at('to', 174.5) - .1;
  const sewPts = [[SX(2) + L3, 1420], [SX(2) + L3, 1590], [LX + 6, 1590]];
  OX = 0;
  const sew = T.sewSt = L(sewPts, T.sew0, T.sew1 - T.sew0, { color: 'orange', w: 8, wob: 2, R: 1, ease: .3 });
  EV.push({ t: T.sew0, type: 'thread', d: T.sew1 - T.sew0 });
  const h1 = [at('line', 174.6), at('line', 175.9), at('line', 177.7)];
  h1.forEach((t, i) => { cross(LX, AX + 17.5 * Z[i], 22, t - .02, { color: 'orange', w: 6.5 }); EV.push({ t, type: 'zero' }); });

  // ════════ S4 · seesaw, Bessel periods, Iwasawa towers (107 – 127 s)
  slate(3);
  w('rallis', 'Rallis: the seesaw', 200, 240, 76, at('rallis') - .05, { dur: 1.0 });
  L([[740, 640], [800, 540], [860, 640], [740, 640]], at('seesaw') - .1, .35, { w: 7 });
  L([[200, 538], [1400, 532]], at('seesaw') + .3, .4, { w: 8 });
  w('ss-l', '(\\theta f, g)', 280, 500, 66, at('both') - .05, { dur: .55 });
  w('ss-r', '(f, \\theta g)', 1010, 500, 66, at('balance') - .05, { dur: .55 });
  w('ss-eq', '=', 775, 500, 66, at('even') + .05, { dur: .15 });
  w('bessel', 'period = Bessel period', 200, 800, 72, at('period') - .1, { dur: 1.6 });
  const tch = at('characters') - .05;
  [220, 420, 620].forEach((x, i) => w('chi' + i, '\\chi_' + (i + 1) + ',', x, 960, 72, tch + i * .3, { dur: .25 }));
  w(null, '\\cdots', 820, 960, 72, tch + .9, { dur: .15 });
  [220, 420, 620].forEach((x, i) => L([[x - 15, 985], [x + 85, 900]], at('away') - .5 + i * .18, .12, { w: 6 }));
  // the tower
  const TWX = 1800, TWW = 360, FH = 140, BASE = 1210;
  w('iwasawa', 'Iwasawa tower', TWX - 40, 300, 66, at('iwasawa') - .1, { dur: .9 });
  const floors = ['K_0', 'K_1', 'K_2', 'K_3'];
  const ft = [at('towers') - .1, at('climbing'), at('floor', 119), at('floor', 120)];
  floors.forEach((k, i) => {
    const y1 = BASE - FH * i, y0 = y1 - FH;
    L([[TWX, y1], [TWX, y0], [TWX + TWW, y0], [TWX + TWW, y1]], ft[i], .3, { w: 6 });
    if (i === 0) L([[TWX - 40, BASE], [TWX + TWW + 40, BASE]], ft[i] - .15, .15, { w: 6 });
    w('floor' + i, k, TWX + 40, y1 - 45, 58, ft[i] + .3, { dur: .25 });
  });
  w('fvd', '\\vdots', TWX + 150, BASE - FH * 4 - 20, 70, ft[3] + .5, { dur: .2 });
  L([[TWX, BASE - FH * 5], [TWX, BASE - FH * 6], [TWX + TWW, BASE - FH * 6], [TWX + TWW, BASE - FH * 5]], ft[3] + .7, .3, { w: 6 });
  w('kinf', 'K_\\infty', TWX + 40, BASE - FH * 5 - 45, 58, ft[3] + 1.0, { dur: .3 });
  // doors on each floor
  const dt = [at('opening'), at('opening') + .2, at('doors') - .1, at('doors') + .1];
  floors.forEach((_, i) => { const y1 = BASE - FH * i, x = TWX + 270; L([[x, y1], [x, y1 - 92], [x + 52, y1 - 100], [x + 52, y1 - 8]], dt[i], .14, { w: 5 }); });
  w('approx', '\\approx', TWX + TWW + 60, 860, 80, at('like') , { dur: .25 });
  const fqs = ['\\F_q', '\\F_{q^2}', '\\F_{q^3}', '\\F_{q^4}'];
  const ff = [at('finite', 122), at('field', 123), at('that', 123), at('keeps')];
  fqs.forEach((s, i) => w('fq' + i, s, TWX + TWW + 220, BASE - FH * i - 45, 58, ff[i], { dur: .3 }));
  w('fqvd', '\\vdots', TWX + TWW + 250, BASE - FH * 4 - 20, 70, ff[3] + .45, { dur: .2 });
  w('fqinf', '\\F_{q^\\infty}', TWX + TWW + 220, BASE - FH * 5 - 45, 58, ff[3] + .75, { dur: .3 });

  // ════════ S5 · the explicit formula, positivity, Parseval; the price of each lift (127 – 158 s)
  slate(4);
  w('explicit', '\\Sigma_n \\Lambda(n)\\phi(n) = (main) - \\Sigma_\\rho \\hat{\\phi}(\\rho)', 170, 320, 76, at('primes', 127) - .05, { dur: 2.7 });
  w('lprimes', 'primes', 250, 460, 54, at('explicit') - .15, { dur: .45 });
  w('lzeros', 'zeros', 1180, 460, 54, at('formula') - .05, { dur: .45 });
  w('posit', 'W(f) \\ge 0', 170, 650, 92, at('positive') - .1, { dur: 1.0 });
  w('posit2', '\\lr RH   (Weil)', 780, 650, 66, at('sign') + .05, { dur: .9 });
  w('variance', 'a variance: a sum of squares', 200, 760, 52, at('variance') - .1, { dur: 1.3 });
  w('gauss', 'Gauss sums', 170, 930, 76, at('no', 137) - .05, { dur: .8 });
  L([[150, 905], [790, 896]], at('sums') - .02, .22, { w: 7 });
  w('parseval', 'Parseval \\times k', 1000, 930, 76, at('parseval') - .1, { dur: 1.0 });
  w('qn', 'qN = M^k + R', 200, 1060, 72, at('times', 140) - .05, { dur: .9 });
  w('sqrtcanc', '|R| \\approx \\sqrt{M^k}', 1000, 1060, 72, at('square-root') - .02, { dur: 1.2 });
  w('honest', 'square-root cancellation', 1010, 1165, 50, at('cancellation') + .3, { dur: 1.2 });
  // the price of each lift: gain per lift stalls at 2/3; twisting pushes on
  const GX = 1960, GY = 1180, GW = 1060, GH = 700;
  L([[GX, GY], [GX + GW, GY]], at('every', 148) + .02, .5, { w: 6 });
  L([[GX, GY], [GX, GY - GH - 40]], at('lift', 148.5) + .1, .45, { w: 6 });
  w('glifts', 'lifts', GX + GW - 160, GY + 70, 50, at('price') - .1, { dur: .3 });
  w('ggain', 'reach', GX + 30, GY - GH - 70, 50, at('pay') - .2, { dur: .3 });
  const y23 = GY - GH * 2 / 3, y1 = GY - GH;
  dashed(GX, y23, GX + GW, y23, at('two-thirds') - .1, .5, { n: 14 });
  w('g23', '2/3', GX - 140, y23 + 20, 54, at('two-thirds') + .35, { dur: .3 });
  dashed(GX, y1, GX + GW, y1, at('two-thirds') + .2, .4, { n: 14 });
  w('g1', '1', GX - 80, y1 + 20, 54, at('two-thirds') + .55, { dur: .2 });
  const curve = []; for (let i = 0; i <= 30; i++) { const u = i / 30; curve.push([GX + u * GW * .62, GY - GH * 2 / 3 * (1 - Math.exp(-4.2 * u))]); }
  const curveSt = L(curve, at('way', 150) - .1, 1.0, { smooth: true, w: 7 });
  w('twist', 'twist by \\chi', GX + GW * .55, y23 + 130, 56, at('twist') - .05, { dur: .7 });
  const c2p = []; for (let i = 0; i <= 16; i++) { const u = i / 16; c2p.push([GX + GW * .62 + u * GW * .36, lerp(curve[30][1], y1 + 6, Math.pow(u, 1.4))]); }
  const c2St = L(c2p, at('stubborn') - .1, .7, { smooth: true, w: 7 });
  w('vandiver', 'weak Vandiver \\imp K(\\Z)', GX - 40, 270, 56, at('vandiver') - .3, { dur: 1.1 });

  // ════════ S6 · Lean (181 – 223 s)
  slate(5);
  w('lean', 'Lean 4', 170, 230, 110, at('seventeen') - .05, { dur: .7 });
  w('lines', '17,400,000 lines  \\cdot  175,187 files', 190, 360, 62, at('million') - .1, { dur: 1.7 });
  w('sorry', 'sorry : 0', 190, 530, 86, at('scanned') - .05, { dur: .9 });
  w(null, '\\check', 850, 530, 86, at('none') - .1, { dur: .3 });
  w('axiom', 'axiom : 0', 190, 670, 86, at('no', 191) - .05, { dur: .9 });
  w(null, '\\check', 850, 670, 86, at('axioms', 191) + .3, { dur: .3 });
  w('build', 'independent build : pending \\hourglass', 190, 800, 62, at('build', 193) - .2, { dur: 1.3 });
  w('thm1', 'theorem riemannHypothesis :', 190, 980, 58, at('levent') - .05, { dur: 1.5 });
  const thm2 = w('thm2', 'RiemannHypothesis := rhOfAll', 260, 1070, 58, at('hand', 198) - .1, { dur: 1.2 }), ex = thm2.x - OX + 50;
  arrow(ex, 1050, ex + 200, 1050, at('kernel') - .1, .35, { w: 6 });
  T.kernel = w('kernel', 'kernel', ex + 230, 1070, 58, at('kernel') + .25, { dur: .5 });
  w('print', '#print axioms riemannHypothesis', 1720, 300, 58, at('when', 202) + .4, { dur: 2.2 });
  w('ax-a', 'propext', 1780, 440, 66, at('only') + .05, { dur: .5, color: 'kid' });
  w('ax-b', 'Classical.choice', 1780, 545, 66, at('three') + .05, { dur: .7, color: 'kid' });
  w('ax-c', 'Quot.sound', 1780, 650, 66, at('names') + .1, { dur: .5, color: 'kid' });
  w('nothing', '(nothing else)', 1800, 760, 52, at('nothing') - .05, { dur: .8 });
  const L6 = 2950;
  const line6 = L([[L6, 70], [L6, 1500]], at('then', 213) + .05, 1.4, { color: 'orange', w: 10, ease: .5 });
  w('lbl6', 'Re(s) = 1/2', 2390, 1180, 70, at('drawn') + .5, { dur: 1.2 });

  // ════════ S7 · end card (224 – 237.6 s)
  slate(6);
  wc('title', 'The Line at One-Half', 1600, 470, 150, 224.6, { dur: 2.2 });
  L([[1600 - 760, 560], [1600 + 760, 552]], 226.9, .5, { color: 'orange', w: 8 });
  const cr = [
    ['cr1', 'Proof (claimed, 2026-11-20): Levent Alp\\odia{}ge, with Claude'],
    ['cr2', 'Lean code: alpo.ge  \\cdot  mirror: github.com/CocoSgt/riemann-hypothesis-lean'],
    ['cr3', 'Status: no public independent build or review yet'],
    ['cr4', 'Song: "The Line at One-Half" (Suno)'],
  ];
  cr.forEach(([id, s], i) => wc(id, s, 1600, 720 + i * 100, 50, 227.4 + i * 1.1, { dur: 1.0 }));

  // ════════ camera: keys [t, cx, cy, s]; a key with cut:true starts a new shot (no blend, no motion blur across it)
  const K = (t, i, x, y, s, cut) => ({ t, cx: SX(i) + x, cy: y, s, cut });
  const WALLV = (t, cut) => ({ t, cx: SX(5) / 2 + PW / 2, cy: 900, s: 1920 / (SX(5) + PW + 1800), cut });
  const keys = [
    K(0, 0, 2420, 260, 1.25, true), K(1.8, 0, 2400, 270, 1.25), K(5.9, 0, 2330, 900, 1.05), K(9.3, 0, 1900, 820, .72),
    K(9.6, 0, 1010, 690, 1.0, true), K(19.4, 0, 1060, 700, .98),
    K(19.8, 0, 1060, 700, .98), K(22.8, 0, 2050, 520, .3), K(24.6, 0, 2050, 520, .3), K(27.0, 0, 1000, 1180, .78), K(30.2, 0, 1000, 1160, .78),
    K(30.5, 0, 2150, 700, .72, true), K(49.2, 0, 2120, 690, .76),
    K(49.6, 0, 2120, 690, .76), K(50.3, 1, 860, 640, .8), K(53.8, 1, 860, 640, .8), K(59.0, 1, 860, 740, .76), K(69.4, 1, 860, 760, .76),
    K(70.45, 1, 860, 760, .76), K(71.45, 1, 2420, 560, .9), K(81.0, 1, 2420, 560, .9),
    K(81.8, 1, 2420, 560, .9), K(82.15, 2, 900, 980, .9), K(84.9, 2, 1250, 820, .72), K(90.6, 2, 1250, 820, .7), K(95.0, 2, 1900, 640, .8), K(96.5, 2, 2250, 760, .68), K(102.5, 2, 2250, 760, .68),
    K(104.6, 2, 1600, 820, .56), K(106.9, 2, 1600, 820, .56),
    K(107.3, 3, 820, 700, .9), K(117.2, 3, 820, 720, .9), K(118.0, 3, 2350, 900, .8), K(120.9, 3, 2350, 760, .8), K(126.65, 3, 2350, 740, .8),
    K(127.1, 4, 820, 640, .86), K(136.0, 4, 900, 700, .84), K(147.4, 4, 920, 720, .84),
    K(148.0, 4, 2420, 760, .82), K(158.35, 4, 2420, 740, .82),
    K(158.9, 2, 1200, 860, .72), K(161.8, 2, 1250, 840, .7), K(166.2, 2, 900, 760, .8), K(167.6, 2, 900, 980, .85), K(171.8, 2, 2000, 600, .82), K(172.6, 2, 2650, 1150, .72),
    K(T.sew1, 0, 2300, 1160, .72), K(178.9, 0, 2260, 1150, .74),
    WALLV(180.6), WALLV(181.0), K(181.75, 5, 860, 600, .86), K(190.5, 5, 860, 640, .86), K(201.6, 5, 900, 760, .86),
    K(202.5, 5, 2350, 560, .86), K(212.2, 5, 2350, 580, .86), K(213.4, 5, 2350, 860, .72), K(218.6, 5, 2350, 860, .72),
    WALLV(221.4), WALLV(223.6),
    K(224.4, 6, 1600, 720, .62), K(DUR, 6, 1600, 730, .6),
  ];
  const camAt0 = t => {
    let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    let shot = 0; for (let j = 1; j <= i; j++) if (keys[j].cut) shot++;
    if (!b || b.cut) return { cx: a.cx, cy: a.cy, s: a.s, shot };
    const u = eio((t - a.t) / (b.t - a.t)), ls = Math.exp(lerp(Math.log(a.s), Math.log(b.s), u));
    // keep the zoom's anchor steady: blend the centre in the same log space as the scale when the scale changes a lot
    const r = Math.abs(Math.log(b.s / a.s)) > .7 ? (1 / ls - 1 / a.s) / (1 / b.s - 1 / a.s) : u;
    return { cx: lerp(a.cx, b.cx, r), cy: lerp(a.cy, b.cy, r), s: ls, shot };
  };

  // ════════ v2: Clawd and the hits
  const HITS = new Hits(), WX = (i, x) => SX(i) + x;
  const k0 = 1.25, GH0 = 8 * CU;                                  // Clawd's height at k = 1 (legs to the top of the body)
  const front = st => st.at(st.prog(Math.min(Math.max(st.t0, 0), 1e9)) * st.len);
  const frontAt = (st, t) => st.at(st.prog(t) * st.len);
  const dirAt = (st, t) => { const d = st.dir(st.prog(t) * st.len); return Math.atan2(d[1], d[0]); };
  const CLAWD_T = 27.4;
  const CL = new Track(0, WX(0, 1660), 1640, k0);
  // — board 0: drawn under the ζ line, comes alive, hops onto the real axis to watch the zeros
  const alive = CLAWD_T + 2.0;
  CL.still(0, alive);
  CL.emote(alive, alive + 1.0, '!');
  HITS.addZoom(at('eighteen'), .05, .5).addFlash(at('eighteen'), .1, [1, .97, .9], .3).addZoom(at('very') - .05, .035, .4);
  HITS.addBurst(alive, WX(0, 1660), 1560, 'clay', 30).addShake(alive, 6, .3).addFlash(alive, .12, [1, .8, .7], .25);
  CL.hop(30.15, 30.75, WX(0, 2480), AX, 380).face(30.75, 49.4, -1);
  HITS.addBurst(30.75, WX(0, 2480), AX, 'white', 18).addShake(30.75, 6, .3);
  HITS.addRing(crit.t1, WX(0, LX), 700, 'orange', 340, .9).addFlash(crit.t1, .15, [1, .7, .45], .4);
  for (let i = 0; i < 10; i++) { const t = lerp(z0 + .05, z1, i / 9) + .12; HITS.addRing(t, WX(0, LX), IM(Z[i]), 'orange', 120, .5).addBurst(t, WX(0, LX), IM(Z[i]), 'orange', 8, { puff: false, speed: 160, size: 2.4 }); }
  CL.cheer(z1 + .2, z1 + 1.4);
  CL.emote(at('no', 47), 49.3, '?');
  // — board 1: Weil, Stepanov; then the wipe is Clawd running through "d/dn ?", and BUILD IT
  CL.hop(49.55, 50.45, WX(1, 1800), 1260, 520).face(50.45, 70.4, -1);
  HITS.addBurst(50.45, WX(1, 1800), 1260, 'white', 20).addShake(50.45, 7, .3);
  CL.cheer(at('nowhere') + .1, at('nowhere') + 1.2);
  for (let k = 0; k < 3; k++) HITS.addRing(at('stack') + .05 + k * .55 + .3, WX(1, 900), CY(900), 'white', 520, .6);
  CL.walk(70.5, 71.45, WX(1, 2950), 1100);
  CL.emote(at('world') + .1, 78.7, '?');
  CL.hop(78.75, 79.13, WX(1, 1720), 700, 160);
  CL.follow(79.15, 79.75, t => { const u = clamp((t - 79.15) / .6); return [WX(1, 1740 + u * 1160), 700 + Math.sin(u * 9.4) * 50 - 10, .18]; }, { air: false });
  for (let k = 0; k < 6; k++) HITS.addBurst(79.18 + k * .1, WX(1, 1760 + k * 195), 640, 'white', 14, { puff: true, speed: 120, size: 2.6 });
  CL.hop(79.8, 80.28, WX(1, 2300), 1010, 220).face(80.28, 82, 1);
  const tBuild = at('build', 80);
  HITS.impact(tBuild, WX(1, 2240), 680, 'white', 2.2).addRoll(tBuild, .045, .5);
  HITS.addBurst(tBuild + .02, WX(1, 2240), 680, 'kid', 40, { speed: 420, size: 3.6 });
  CL.cheer(tBuild, 81.35).still(81.35, 81.95).face(81.35, 81.95, 1);
  // — chorus 1 (night): drops onto U(X₀), hops up the chain one lift per beat, writes √X in yellow, lands the zeros
  const top = (n) => [WX(2, n[0] + nw(n[2]) / 2), n[1] - ncap - 18];
  const NT = [top(NODES[0]), top(NODES[1]), top(NODES[2]), [WX(2, 1890), 560], top(NODES[3])];
  HITS.addFlash(81.99, .7, [1, .9, .75], .22).addRoll(81.92, -.05, .7).addZoom(81.92, .1, .6);
  CL.place(81.9, NT[0][0], NT[0][1] - 900).hop(81.95, 82.32, NT[0][0], NT[0][1], 0);
  HITS.impact(82.32, NT[0][0], NT[0][1], 'white', .8);
  const chain = (ts, from = 1, flips = [], onLeave) => ts.forEach((t, i) => { const n = NT[from + i]; if (onLeave) onLeave(t - .34, from + i - 1); CL.hop(t - .34, t, n[0], n[1], 190, { flip: flips[i] || 0 }); HITS.addBurst(t, n[0], n[1], 'white', 22, { speed: 240 }).addShake(t, 9, .25).addZoom(t, .035, .3).addRing(t, n[0], n[1], 'white', 160, .4); });
  chain([tl1 + .58, tl2 + .5, tth + .45, tth2 + .35], 1, [0, 0, -1, -1]);
  const sqX = WX(2, 1150), sqY = 600, tsq = at('root', 85) - .05;
  CL.hop(tsq - .55, tsq - .05, sqX, sqY, 260).face(tsq - .05, 90.9, -1).hold(tsq - .05, tsq + 1.6, t => 1.0 + Math.sin(t * 22) * .25);
  HITS.addBurst(tsq + 1.45, WX(2, 700), 500, 'kid', 46, { speed: 300 }).addFlash(tsq + 1.45, .22, [1, .9, .55], .4).addShake(tsq + 1.45, 10, .35);
  const hh = [at('unitary', 91), at('unitary', 92), at('higher', 93), at('higher', 94)];
  chain([hh[0] + .05, hh[1] + .1, hh[2] + .1, hh[3] + .2], 1, [0, 0, 0, -1]);
  CL.cheer(hh[3] + .25, 95.6);
  CL.hop(95.75, 96.45, WX(2, 2700), 1430, 300).face(96.45, 103, 1);
  h3.forEach((t, i) => { HITS.impact(t + .1, WX(2, L3), [930, 720, 500][i], 'orange', .9 + i * .25); CL.hop(t - .05, t + .25, WX(2, 2700), 1430, 70); });
  HITS.addRoll(h3[2] + .1, .04, .6);
  CL.cheer(h3[2] + .3, 102.6).wave(103.0, 104.6);
  // — board 3: balancing on the seesaw beat, then climbing the Iwasawa tower floor by floor
  CL.place(107.25, WX(3, 1600), 760);
  HITS.addFlash(107.3, .12, [1, .96, .9], .3);
  CL.follow(at('both') - .1, at('even') + .7, t => [WX(3, 1600), 760, Math.sin((t - at('both')) * 5.2) * .22], { walk: false });
  CL.cheer(at('away') - .3, at('away') + .9);
  CL.walk(117.2, 118.3, WX(3, 1600), 1210);
  [0, 1, 2, 3].forEach(i => { const t = ft[i] + .62; CL.hop(t - .3, t, WX(3, i < 3 ? TWX + TWW / 2 : 2110), BASE - FH * (i + 1), 120); HITS.addBurst(t, WX(3, TWX + TWW / 2), BASE - FH * (i + 1), 'white', 16, { speed: 180 }).addZoom(t, .02, .3); });
  CL.hop(ft[3] + .9, ft[3] + 1.4, WX(3, 1560), 1210, 220);
  CL.cheer(at('doors') - .1, at('doors') + 1.1);
  // — board 4: watches the explicit formula; rides the price-of-a-lift curve, stalls at 2/3, twists, climbs to 1
  CL.place(127.0, WX(4, 1780), 1240);
  CL.cheer(at('positive') + .2, at('positive') + 1.2).emote(at('no', 137), at('no', 137) + 1.4, '!').cheer(at('cancellation') + .3, at('cancellation') + 1.3);
  const whenX = (st, x) => { for (let t = st.t0; t < st.t1; t += .005) if (frontAt(st, t)[0] >= x) return t; return st.t1; };
  const tOn = whenX(curveSt, WX(4, GX + 210));
  CL.hop(148.35, 148.95, WX(4, GX + 210), GY, 260);
  CL.follow(tOn, curveSt.t1 + .05, t => { const p = frontAt(curveSt, t); return [p[0], p[1], dirAt(curveSt, t) * .6]; });
  CL.sit(curveSt.t1 + .6, at('twist') - .15).emote(curveSt.t1 + .9, at('twist') - .2, '?');
  CL.spin(at('twist') - .1, at('twist') + .45, 1);
  HITS.addBurst(at('twist') + .1, WX(4, GX + GW * .62), y23, 'white', 26, { speed: 240 });
  CL.follow(c2St.t0, c2St.t1 + .05, t => { const p = frontAt(c2St, t); return [p[0], p[1], dirAt(c2St, t) * .6]; });
  HITS.impact(c2St.t1 + .05, WX(4, GX + GW * .98), y1 + 6, 'white', 1.0);
  CL.cheer(c2St.t1 + .1, 157.9);
  // — chorus 2 (harder): same chain, then Clawd rides the orange line that sews the boards back to Riemann's
  HITS.addFlash(158.9, .75, [1, .88, .7], .24).addRoll(158.9, .055, .7).addZoom(158.9, .12, .6);
  CL.place(158.7, NT[0][0], NT[0][1] - 1000).hop(158.75, 159.1, NT[0][0], NT[0][1], 0);
  HITS.impact(159.1, NT[0][0], NT[0][1], 'white', 1.0);
  const CLONES = [];
  const leave = (t, i) => {
    const n = NT[i], c = new Track(0, n[0], n[1], 0, { phase: .12 * (i + 1) }); c.scaleTo(t, k0, .3).hide(0, t);
    HITS.addBurst(t + .02, n[0], n[1] - 120, 'clay', 22, { speed: 220 }); CLONES.push(c); return c;
  };
  chain(c2.map((t, i) => t + [.45, .45, .45, .4][i]), 1, [0, -1, 0, -1], leave);
  const tsq2 = at('square', 162);
  leave(tsq2 - .5, 4);
  CL.hop(tsq2 - .5, tsq2, sqX, sqY, 260).face(tsq2, 167.6, -1).hold(tsq2, tsq2 + 2.6, t => 1.0 + Math.sin(t * 22) * .25);
  HITS.addBurst(tsq2 + .4, WX(2, 560), 600, 'kid', 40, { speed: 300 }).addFlash(tsq2 + .4, .2, [1, .9, .55], .4);
  const hh2 = [at('unitary', 167.5), at('unitary', 168.5), at('higher', 169.5), at('higher', 170.5)];
  hh2.forEach((t, j) => CLONES.forEach((c, i) => { const n = NT[i], tt = t + .1 + i * .07; c.hop(tt, tt + .42, n[0], n[1], 150 + j * 40, { flip: (i + j) % 2 ? 1 : -1 }); }));
  hh2.forEach(t => HITS.addZoom(t + .1, .04, .35).addShake(t + .4, 8, .3));
  CL.cheer(hh2[0], 171.7);
  CLONES.forEach((c, i) => { const t = 171.9 + i * .08, n = NT[i]; c.cheer(hh2[3] + .6, t).scaleTo(t, 0, .22).hide(t + .3, 1e9); HITS.addBurst(t + .1, n[0], n[1] - 110, 'clay', 30, { speed: 320 }); });
  CL.hop(171.85, T.sew0, WX(2, L3), 1420, 260);
  const sewEnd = T.sew1 + .02;
  CL.follow(T.sew0, sewEnd, t => { const p = frontAt(sew, t); return [p[0], p[1], t < T.sew0 + .25 ? .1 : -.16, -1]; }, { walk: true });
  CL.hold(T.sew0 + .2, sewEnd, () => 1.5).face(T.sew0, sewEnd, -1);
  for (let t = T.sew0 + .1; t < T.sew1; t += .09) { const p = frontAt(sew, t); HITS.addBurst(t, p[0], p[1], 'orange', 10, { puff: false, speed: 220, size: 2.6, dir: 0, spread: 1.6, life: .9 }); }
  CL.hop(sewEnd, sewEnd + .35, WX(0, 2550), 1590, 140).face(sewEnd + .35, 180.5, -1);
  h1.forEach((t, i) => { HITS.impact(t + .1, WX(0, LX), AX + 17.5 * Z[i], 'orange', 1.1 + i * .35); CL.hop(t - .05, t + .25, WX(0, 2550), 1590, 80); });
  HITS.addRoll(h1[2] + .1, -.05, .7).addFlash(h1[2] + .1, .4, [1, .75, .5], .7);
  CL.cheer(h1[2] + .3, 180.4);
  // — board 5: Lean. Clawd checks for sorry, waits for the build, hands it to the kernel, writes the three axioms
  CL.place(181.6, WX(5, 1350), 700);
  CL.emote(at('scanned'), at('scanned') + 1.6, '?').cheer(at('none') + .1, at('none') + 1.0);
  CL.sit(at('done', 193) - .1, at('levent') - .4);
  const kb = box(T.kernel);
  CL.wave(at('claude', 196) - .05, at('claude', 196) + 1.1).emote(at('claude', 196) - .05, at('claude', 196) + 1.2, '!');
  CL.hop(at('kernel') - .3, at('kernel') + .1, kb[2] + 150, 1070, 200);
  HITS.addBurst(at('kernel') + .1, kb[2] + 150, 1070, 'white', 20);
  CL.hop(201.55, 202.45, WX(5, 1500), 700, 380).face(202.45, 213, 1);
  CL.hold(at('only') - .1, at('nothing') + .4, t => .55 + Math.sin(t * 20) * .2);
  [['only', 440], ['three', 545], ['names', 650]].forEach(([wd, y]) => { const t = at(wd, 207) + .1; HITS.addBurst(t, WX(5, 1800), y - 30, 'kid', 22, { speed: 200 }).addZoom(t, .02, .3); });
  CL.hop(212.9, 213.6, WX(5, 2650), 1420, 380).face(213.6, 223, 1);
  HITS.addFlash(213.45, .45, [1, .85, .65], .5).addRoll(213.45, -.04, .6);
  HITS.impact(line6.t1, WX(5, L6), 800, 'orange', 2.6).addRoll(line6.t1, .06, .7);
  for (let k = 0; k < 6; k++) HITS.addBurst(line6.t1 + .02, WX(5, L6), 120 + k * 260, 'orange', 18, { speed: 340, puff: false });
  CL.cheer(line6.t1, 223.4);
  [at('line', 218), at('line', 221)].forEach(t => HITS.impact(t, WX(5, L6), 700, 'orange', 1.4));
  // — end card: Clawd hops in under the credits, waves, hums
  CL.place(224.3, WX(6, 1600), 1330).scaleTo(224.3, 1.35, .01).hop(224.9, 225.6, WX(6, 1600), 1330, 300, { flip: 1 }).face(225.6, 234.9, -1);
  HITS.addBurst(225.6, WX(6, 1600), 1330, 'clay', 26);
  CL.wave(228.4, 230.4).emote(231.5, 234.6, '♪').dance(225.6, 234.8, 'jump');
  CL.hop(234.9, 235.55, WX(6, 1600), 1330, 260, { flip: -1 }).cheer(235.6, 235.95).still(235.95, 240).face(235.95, 240, 1);
  HITS.impact(235.55, WX(6, 1600), 1330, 'white', 1.0);
  // ── chalk words that slam in on the hooks (screen space, 1920×1080 design units)
  const POPS = [];
  const pop = (t, text, x, y, size, o = {}) => { const st = M(text, -mathWidth(text, size) / 2, size / 2, size, -10, { seed: SEED++, dur: .01, color: o.color || 'white', lw: o.lw ?? .085 }); for (const q of st) { q.t0 = -10; q.t1 = -9.99; } POPS.push({ t, d: o.d ?? .7, x, y, rot: o.rot ?? 0, st, size }); HITS.addShake(t, o.shake ?? 10, .3).addZoom(t, o.zoom ?? .03, .3); };
  for (const [cx, LIFT, TH, HI, HOME, TL, sc] of [[0, [tl1, tl2], [tth, tth2], hh, at('home', 96), h3, 1], [1, [c2[0], c2[1]], [c2[2], c2[3]], hh2, at('home', 173), h1, 1.2]]) {
    pop(LIFT[0], 'LIFT IT!', 520, 250, 120 * sc, { rot: -.12 }); pop(LIFT[1], 'LIFT IT!', 1400, 230, 135 * sc, { rot: .1 });
    pop(TH[0], '\\theta', 300, 520, 300 * sc, { color: 'kid', rot: -.15, d: .55 }); pop(TH[1], '\\theta', 1640, 480, 340 * sc, { color: 'kid', rot: .15, d: .55 });
    pop(HI[2], 'HIGHER', 960, 230, 130 * sc, { rot: -.06 }); pop(HI[3], 'HIGHER!', 960, 230, 175 * sc, { rot: .06, color: 'kid' });
    pop(HOME, 'HOME', 600, 250, 150 * sc, { rot: -.1 });
    TL.forEach((t, i) => pop(t, 'TO THE LINE', [560, 1360, 960][i], [250, 300, 420][i], (110 + 30 * i) * sc, { color: 'orange', rot: [-.1, .1, 0][i], d: .9, shake: 14 }));
    pop(at('one-half', TL[2] + .2), 'ONE-HALF', 960, 560, 230 * sc, { color: 'orange', d: 1.1, shake: 22, zoom: .06 });
  }
  // the verses get their own hits, smaller, on the words that carry the story
  const V = [['hundred', 40, '160 YEARS', 1300, 230, 110, 'white', -.08], ['made', 45, 'PROOF?', 700, 240, 120, 'white', .1],
    ['weil', 55, 'WEIL', 1350, 220, 120, 'white', -.1], ['road', 57, 'THE ROAD', 1300, 240, 110, 'white', .08], ['vanish', 60, 'VANISH', 1350, 230, 120, 'white', -.08],
    ['stack', 63, 'STACK IT', 1350, 230, 120, 'kid', .08], ['frobenius', 74, 'NO FROBENIUS', 760, 860, 96, 'white', -.06], ['back', 75, 'NO WAY BACK', 760, 860, 100, 'white', .06],
    ['seesaw', 107, 'BALANCE', 1350, 260, 120, 'white', -.08], ['fall', 113, 'FALL AWAY', 600, 860, 110, 'white', .1],
    ['floor', 118, 'FLOOR', 700, 260, 120, 'white', -.1], ['floor', 119.5, 'BY FLOOR', 760, 300, 130, 'white', .08],
    ['settle', 128, 'SETTLE UP', 1350, 860, 110, 'white', -.06], ['positive', 131, '+', 1500, 380, 300, 'kid', 0], ['honest', 142, 'HONEST', 1450, 860, 110, 'white', .08],
    ['price', 148, 'PAY UP', 700, 260, 110, 'white', -.1], ['stay', 151, 'STAY...', 700, 260, 110, 'white', .06],
    ['seventeen', 181, '17,400,000', 1300, 250, 130, 'white', -.06], ['done', 193, 'NOT DONE', 1450, 280, 110, 'orange', .1], ['kernel', 197, 'KERNEL', 1400, 260, 110, 'kid', -.08],
    ['three', 208, '3', 760, 300, 300, 'kid', 0]];
  for (const [wd, after, txt, x, y, size, color, rot] of V) pop(at(wd, after) + .02, txt, x, y, size, { color, rot, d: .6, shake: 7, zoom: .02 });
  pop(at('twist') + .05, 'TWIST!', 1280, 250, 160, { rot: .16 });
  pop(at('none') + .05, 'NONE!', 1450, 300, 150, { rot: .1 });
  pop(at('line', 218), 'THE LINE AT ONE-HALF', 960, 300, 88, { color: 'orange', d: 1.3, shake: 16 });
  pop(at('line', 221), 'THE LINE AT ONE-HALF', 960, 300, 108, { color: 'orange', d: 1.4, shake: 24, zoom: .07 });
  // ── Clawd-shaped irises on the board changes: close on him, open on him somewhere else
  const IRIS = [[106.62, 107.12, 107.6], [126.45, 126.95, 127.35], [180.9, 181.35, 181.9], [223.3, 223.85, 224.6]];
  // ── the barrel roll into chorus 2
  HITS.addSpin(158.3, 158.95, -1);
  // whip pans get a soft flash on the cut
  for (const tw of [49.6, 70.45, 104.6, 107.3, 117.2, 126.9, 148.0, 158.4, 201.7, 224.4]) HITS.addFlash(tw, .08, [1, .97, .92], .25);

  // the camera chases Clawd along the sewing line
  // dive into Clawd's eye: a pure zoom about the eye that also brings it to the centre (exponential scale)
  const eyeAt = t => { const st = CL.state(t); return localToWorld(st, -2.5 * CU, -6.0 * CU); };
  const dive = (t, a, b, sEnd) => {
    const c0 = camAt0(a), e = eyeAt(Math.min(t, b)), u = ei(clamp((t - a) / (b - a))) ;
    const s = Math.exp(lerp(Math.log(c0.s), Math.log(sEnd), u)), keep = c0.s / s * (1 - eo(clamp((t - a) / (b - a))));
    return { ...camAt0(t), cx: e[0] + (c0.cx - e[0]) * keep, cy: e[1] + (c0.cy - e[1]) * keep, s };
  };
  const DIVES = [[81.68, 81.99, 90], [236.0, 237.15, 120]];
  const camAt = t => {
    for (const [a, b, se] of DIVES) {
      if (t >= a && t < b) return dive(t, a, b, se);
      if (t >= b && t < b + .25 && b < 100) { const c = camAt0(82.15); return { ...c, shot: c.shot + 500 }; }
      if (t >= b && b > 200) return { ...dive(b - .001, a, b, se), shot: 900 };
    }
    const c = camAt0(t);
    const a = T.sew0 + .1, b = T.sew1 + .1;
    if (t < a || t > b + .6) return c;
    const p = frontAt(sew, Math.min(t, T.sew1)), k = clamp((t - a) / .35) * (1 - clamp((t - b) / .6));
    return { ...c, cx: lerp(c.cx, p[0] - 320, k), cy: lerp(c.cy, 1300, k), s: lerp(c.s, .8, k) };
  };

  // subtitle cues: sung lines (karaoke) and the Chinese notes
  const SUBS = [];
  LYRICS.forEach((c, i) => {
    const nx = LYRICS[i + 1] ? LYRICS[i + 1].t0 : DUR;
    const t0 = c.t0 - .15, t1 = Math.min(nx - .2, Math.max(c.t1 + 1.3, t0 + 2.0));
    SUBS.push({ id: c.id, t0, t1, en: c.en, zh: c.zh, words: c.words });
    EV.push({ t: +t0.toFixed(3), type: 'sub', t1: +t1.toFixed(3), en: c.en, zh: c.zh });
  });
  NOTES.forEach(n => { SUBS.push({ ...n, note: true }); EV.push({ t: n.t0, type: 'note', t1: n.t1, en: n.en, zh: n.zh }); });
  SUBS.sort((a, b) => a.t0 - b.t0);

  // chalk events for the foley: every stroke, with its on-screen length and where it sits across the frame
  for (const st of S) {
    if (st.t1 <= 0 || st.t0 >= DUR) continue;
    const c = camAt((st.t0 + st.t1) / 2), p = st.at(st.len / 2), sx = (p[0] - c.cx) * c.s * W / 1920 / (W / 2);
    EV.push({ t: +st.t0.toFixed(3), type: 'chalk', d: +(st.t1 - st.t0).toFixed(3), len: Math.round(st.len * c.s), color: st.color, pan: +clamp(sx * .6, -.7, .7).toFixed(2), big: st.w > 9 ? 1 : 0 });
  }
  for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (!b.cut && Math.abs(b.cx - a.cx) * b.s > 1500 && b.t - a.t < 1.2) EV.push({ t: a.t, type: 'whip', d: b.t - a.t }); }
  EV.sort((a, b) => a.t - b.t);
  return { S, TX, EV, SUBS, T, camAt, keys, DUR, wipe: T.wipe, HITS, CL, CLONES, CLAWD_T, POPS, IRIS };
}
