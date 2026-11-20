// Maths on the board: Latin from the single-line EMS font (hand.js), and every symbol the font lacks
// (Greek, arrows, relations, blackboard ℤ and 𝔽, radicals, ticks) as our own hand-authored centre lines.
// Glyph boxes: cap height 100, baseline y = 0, y down (cap top = −100), x from 0 to `adv`.
// Markup in a string:  \name for a symbol,  _x or _{…} subscript,  ^x or ^{…} superscript,  \sqrt{…},  \hat{…}.
import { clamp } from '/core/lib.js';
import { Stroke, catmull } from './chalk.js';
import { writeLatin, latinWidth } from './hand.js';

// each stroke: [kind, ...points]; kind 'l' polyline (corners kept), 'c' smooth curve
const G = {
  alpha: { adv: 66, s: [['c', [56, -66], [46, -26], [32, -2], [15, -6], [8, -32], [20, -62], [38, -64], [48, -30], [60, 0]]] },
  zeta: { adv: 62, s: [['c', [14, -104], [50, -104]], ['c', [50, -104], [22, -68], [10, -32], [20, -6], [44, -2], [50, 16], [40, 34]]] },
  theta: { adv: 64, s: [['c', [32, -102], [12, -78], [9, -40], [20, -6], [34, 0], [50, -18], [56, -58], [48, -92], [32, -102]], ['l', [12, -52], [54, -52]]] },
  Lambda: { adv: 74, s: [['l', [4, 0], [37, -102], [70, 0]]] },
  chi: { adv: 64, s: [['c', [4, -66], [14, -70], [30, -30], [46, 18], [58, 26]], ['l', [54, -68], [8, 26]]] },
  pi: { adv: 70, s: [['l', [4, -60], [64, -64]], ['l', [22, -62], [18, 0]], ['c', [46, -62], [47, -14], [52, 0], [60, -2]]] },
  rho: { adv: 58, s: [['c', [12, 32], [14, -36], [26, -64], [44, -64], [52, -38], [40, -8], [22, -6], [13, -24]]] },
  sigma: { adv: 62, s: [['c', [60, -66], [28, -66], [9, -44], [12, -10], [30, 0], [48, -16], [49, -50], [36, -66]]] },
  gamma: { adv: 58, s: [['c', [3, -60], [13, -68], [24, -46], [31, -4], [27, 26], [21, 20], [29, -6], [54, -66]]] },
  mu: { adv: 64, s: [['l', [12, -66], [9, 32]], ['c', [12, -24], [24, -2], [40, -8], [48, -30], [49, -66]], ['c', [49, -66], [50, -8], [60, 0]]] },
  phi: { adv: 66, s: [['c', [33, -70], [11, -52], [12, -16], [33, -3], [54, -20], [53, -55], [33, -70]], ['l', [36, -102], [30, 32]]] },
  Sigma: { adv: 74, s: [['l', [66, -100], [8, -100], [40, -50], [8, 0], [68, 0]]] },
  Pi: { adv: 80, s: [['l', [4, -100], [76, -100]], ['l', [20, -100], [20, 0]], ['l', [60, -100], [60, 0]]] },
  to: { adv: 96, s: [['l', [6, -46], [88, -46]], ['l', [70, -62], [90, -46], [70, -30]]] },
  lto: { adv: 96, s: [['l', [90, -46], [8, -46]], ['l', [26, -62], [6, -46], [26, -30]]] },
  lr: { adv: 130, s: [['l', [8, -46], [122, -46]], ['l', [104, -62], [124, -46], [104, -30]], ['l', [26, -62], [6, -46], [26, -30]]] },
  mapsto: { adv: 104, s: [['l', [8, -64], [8, -28]], ['l', [8, -46], [94, -46]], ['l', [76, -62], [96, -46], [76, -30]]] },
  imp: { adv: 110, s: [['l', [6, -58], [92, -58]], ['l', [6, -34], [92, -34]], ['l', [74, -76], [102, -46], [74, -16]]] },
  ge: { adv: 64, s: [['l', [8, -88], [54, -64], [8, -40]], ['l', [8, -18], [54, -18]]] },
  le: { adv: 64, s: [['l', [54, -88], [8, -64], [54, -40]], ['l', [8, -18], [54, -18]]] },
  ll: { adv: 86, s: [['l', [40, -84], [8, -50], [40, -16]], ['l', [76, -84], [44, -50], [76, -16]]] },
  approx: { adv: 64, s: [['c', [6, -58], [18, -66], [32, -58], [44, -50], [58, -58]], ['c', [6, -30], [18, -38], [32, -30], [44, -22], [58, -30]]] },
  ne: { adv: 62, s: [['l', [6, -58], [56, -58]], ['l', [6, -32], [56, -32]], ['l', [44, -80], [18, -10]]] },
  infty: { adv: 96, s: [['c', [48, -46], [64, -64], [84, -58], [88, -36], [66, -28], [48, -46], [30, -64], [10, -56], [8, -34], [30, -28], [48, -46]]] },
  subset: { adv: 64, s: [['c', [58, -84], [28, -84], [9, -66], [8, -38], [26, -16], [58, -16]]] },
  in: { adv: 58, s: [['c', [52, -82], [26, -82], [9, -50], [26, -18], [52, -18]], ['l', [10, -50], [46, -50]]] },
  boxplus: { adv: 86, s: [['l', [8, -92], [76, -92], [76, -8], [8, -8], [8, -92]], ['l', [42, -84], [42, -16]], ['l', [16, -50], [68, -50]]] },
  times: { adv: 56, s: [['l', [10, -72], [44, -28]], ['l', [44, -72], [10, -28]]] },
  cdot: { adv: 30, s: [['l', [13, -50], [17, -47]]] },
  cdots: { adv: 92, s: [['l', [12, -50], [16, -47]], ['l', [42, -50], [46, -47]], ['l', [72, -50], [76, -47]]] },
  vdots: { adv: 40, s: [['l', [18, -96], [21, -93]], ['l', [18, -56], [21, -53]], ['l', [18, -16], [21, -13]]] },
  check: { adv: 84, s: [['l', [6, -46], [30, -4], [80, -100]]] },
  cross: { adv: 72, s: [['l', [8, -88], [64, -8]], ['l', [62, -88], [10, -6]]] },
  Z: { adv: 82, s: [['l', [8, -100], [74, -100]], ['l', [62, -100], [6, 0]], ['l', [74, -100], [18, 0]], ['l', [6, 0], [76, 0]]] },
  F: { adv: 66, s: [['l', [10, 0], [10, -100]], ['l', [22, -100], [22, 0]], ['l', [10, -100], [62, -100]], ['l', [22, -52], [52, -52]]] },
  int: { adv: 46, s: [['c', [38, -112], [28, -110], [22, -90], [20, 10], [14, 28], [4, 24]]] },
  hourglass: { adv: 62, s: [['l', [10, -100], [52, -100], [10, 0], [52, 0], [10, -100]]] },
  partial: { adv: 60, s: [['c', [12, -90], [30, -102], [50, -80], [48, -30], [32, -2], [14, -8], [12, -34], [30, -48], [48, -38]]] },
  ell: { adv: 40, s: [['c', [8, -14], [26, -60], [30, -96], [22, -100], [14, -70], [16, -14], [24, 0], [34, -6]]] },
  odia: { adv: 58, s: [['c', [30, -66], [12, -50], [10, -20], [26, -1], [44, -6], [52, -34], [46, -60], [30, -66]], ['l', [20, -92], [23, -89]], ['l', [42, -92], [45, -89]]] },
  emdash: { adv: 110, s: [['l', [8, -46], [102, -46]]] },
};
export const MATH = G;

const SL = .1;                                             // the same slant as the Latin hand
// one symbol at x (left), baseline by, cap height `cap`; returns { strokes, x }
function sym(name, x, by, cap, t, o) {
  const g = G[name]; if (!g) throw new Error('no math glyph ' + name);
  const k = cap / 100, out = [];
  const wu = cap * (o.lw ?? .068);
  for (const [kind, ...pts] of g.s) {
    let P = pts.map(([px, py]) => [x + (px - py * SL) * k, by + py * k]);
    if (kind === 'c') P = catmull(P, 8);
    const st = new Stroke(P, { kind: 'write', w: wu, color: o.color || 'white', taper: .12, taperLen: .2, land: .6, wob: cap * .006, wav: cap * 1.4, skip: .15, press: 1, endSpecks: true, specks: .5, seed: (o.seed ?? 5) * 13 + x * .37 + by * .11, R: o.R });
    const d = clamp(.03 + st.len / (cap * (o.lspeed ?? 40)), .03, .3);
    if (out.length || o._prev) t += .008;
    st.t0 = t; st.t1 = t + d; t += d; out.push(st);
  }
  return { strokes: out, x: x + g.adv * k, t };
}

// tokenise the markup into a tree: [{type:'txt',s}|{type:'sym',n}|{type:'sub'|'sup'|'sqrt'|'hat',c:[…]}]
function parse(s) {
  let i = 0;
  const group = () => { if (s[i] === '{') { i++; const c = seq('}'); i++; return c; } return seq(null, 1); };
  function seq(end, one = 0) {
    const out = [];
    while (i < s.length && s[i] !== end) {
      const ch = s[i];
      if (ch === '\\') {
        let j = i + 1; while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
        const n = s.slice(i + 1, j); i = j;
        if (n === 'sqrt' || n === 'hat') out.push({ type: n, c: group() });
        else if (n === '') { out.push({ type: 'txt', s: s[i] }); i++; }  // escaped char
        else { out.push({ type: 'sym', n }); if (s[i] === '{' && s[i + 1] === '}') i += 2; }
      } else if (ch === '_' || ch === '^') { i++; out.push({ type: ch === '_' ? 'sub' : 'sup', c: group() }); }
      else { out.push({ type: 'txt', s: ch }); i++; }
      if (one) break;
    }
    return out;
  }
  return seq(null);
}

// width of a markup string at cap (no strokes)
export function mathWidth(s, cap) { return lay(parse(s), 0, 0, cap, 0, { dry: true }).x; }

function lay(nodes, x, by, cap, t, o) {
  const out = [];
  let X = x;
  const push = r => { if (r.strokes) out.push(...r.strokes); X = r.x; t = r.t; };
  for (const nd of nodes) {
    if (nd.type === 'txt') {
      if (nd.s === ' ') { X += cap * .42; continue; }
      if (o.dry) { X += latinWidth(nd.s, cap); continue; }
      const s = writeLatin(nd.s, X, by, cap, t + (out.length ? .008 : 0), o);
      out.push(...s); X = s.x; if (s.length) t = s.end;
    } else if (nd.type === 'sym') {
      if (o.dry) { X += G[nd.n].adv * cap / 100; continue; }
      push(sym(nd.n, X, by, cap, t, o));
    } else if (nd.type === 'sub' || nd.type === 'sup') {
      const c2 = cap * .62, b2 = nd.type === 'sub' ? by + cap * .3 : by - cap * .58;
      const r = lay(nd.c, X + cap * .04, b2, c2, t, { ...o, lw: (o.lw ?? .068) * 1.25 });
      out.push(...r.strokes); X = r.x + cap * .06; t = r.t;
    } else if (nd.type === 'sqrt') {
      const inner = lay(nd.c, 0, 0, cap, 0, { dry: true }).x;
      const k = cap / 100, x0 = X, top = by - cap * 1.16;
      if (o.dry) { X += 40 * k + inner + 8 * k; continue; }
      const P = [[x0, by - cap * .44], [x0 + 10 * k, by - cap * .52], [x0 + 22 * k, by - cap * .02], [x0 + 38 * k + cap * 1.16 * SL, top]];
      const st = new Stroke(P, { kind: 'write', w: cap * (o.lw ?? .068), color: o.color || 'white', taper: .1, land: .6, wob: cap * .006, wav: cap * 1.4, skip: .15, endSpecks: true, specks: .5, seed: x0 * .31, R: o.R });
      const d = clamp(.03 + st.len / (cap * (o.lspeed ?? 40)), .03, .3); st.t0 = t + .008; st.t1 = st.t0 + d; t = st.t1; out.push(st);
      const r = lay(nd.c, x0 + 42 * k, by, cap, t, o); out.push(...r.strokes); t = r.t;
      const bar = new Stroke([[x0 + 38 * k + cap * 1.16 * SL, top], [r.x + 6 * k + cap * 1.16 * SL, top]], { kind: 'write', w: cap * (o.lw ?? .068), color: o.color || 'white', taper: .15, land: .4, wob: cap * .004, wav: cap * 2, skip: .15, endSpecks: true, specks: .4, seed: x0 * .17, R: o.R });
      const d2 = clamp(.03 + bar.len / (cap * (o.lspeed ?? 40)), .03, .3); bar.t0 = t + .008; bar.t1 = bar.t0 + d2; t = bar.t1; out.push(bar);
      X = r.x + 8 * k;
    } else if (nd.type === 'hat') {
      const r = lay(nd.c, X, by, cap, t, o);
      if (!o.dry) {
        const k = cap / 100, mid = (X + r.x) / 2 + cap * .9 * SL, y0 = by - cap * 1.02;
        const st = new Stroke([[mid - 18 * k, y0], [mid, y0 - 18 * k], [mid + 18 * k, y0]], { kind: 'write', w: cap * (o.lw ?? .068) * .9, color: o.color || 'white', taper: .2, land: .4, wob: 0, skip: .1, seed: X * .3, R: o.R });
        st.t0 = r.t + .008; st.t1 = st.t0 + .08; out.push(...r.strokes, st); t = st.t1;
      } else t = r.t;
      X = r.x;
    }
  }
  return { strokes: out, x: X, t };
}

// write a markup string at (x, baseline by). o.dur: rescale the hand to finish exactly `dur` seconds after t.
export function M(s, x, by, cap, t, o = {}) {
  const r = lay(parse(s), x, by, cap, t, o), st = r.strokes;
  if (o.dur && st.length) {
    const a = st[0].t0, b = st[st.length - 1].t1, k = o.dur / (b - a);
    for (const q of st) { q.t0 = t + (q.t0 - a) * k; q.t1 = t + (q.t1 - a) * k; }
  }
  st.end = st.length ? st[st.length - 1].t1 : t; st.x = r.x;
  return st;
}
export const Mc = (s, cx, by, cap, t, o = {}) => M(s, cx - mathWidth(s, cap) / 2, by, cap, t, o);
