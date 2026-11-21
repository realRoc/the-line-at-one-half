// Check page (?lab=hz): every character's chalk strokes over LXGW WenKai (red, behind) on the same 100-unit box,
// to see proportions while authoring hz.js. ?lab=latin shows the single-line fonts. Not part of the film.
import { bake, drawStroke } from './chalk.js';
import { HZ } from './hz.js';
import { writeChar, writeLatin, loadSvgFont } from './hand.js';
export async function run(cv, W, H, Q) {
  const o = new OffscreenCanvas(W, H), x = o.getContext('2d');
  x.fillStyle = '#132219'; x.fillRect(0, 0, W, H);
  if (Q.get('lab') === 'clawd') {
    const { buildClawd, drawClawd, Track } = await import('./clawd.js');
    const P = buildClawd(0), T = new Track(0, 0, 0, 1);
    const poses = [[0, {}], [1, { armL: 1.35, armR: 1.35 }], [2, { legs: [.6, .6, .6, .6], sq: -.1 }], [3, { chalk: true, armR: 1.1, flip: -1 }], [4, { blink: 1, sit: 1, sq: .18, armL: -.6, armR: -.6 }]];
    poses.forEach(([i, o]) => {
      const st = { ...T.state(5, 0, .5), x: 0, y: 0, k: 1, sq: 0, rot: 0, ...o };
      x.save(); x.translate(180 + i * 360, i === 4 ? 420 : 380); x.scale(1.3, 1.3); drawClawd(x, P, st, 1e9); x.restore();
    });
    x.save(); x.translate(260, 900); x.scale(2.6, 2.6); drawClawd(x, P, { ...T.state(5, 0, .5), x: 0, y: 0, k: 1, sq: 0, rot: 0, emote: { ch: '?', k: 1, age: 1 } }, 1e9); x.restore();
    x.save(); x.translate(1000, 900); x.scale(2.6, 2.6); drawClawd(x, P, { ...T.state(5, 0, .5), x: 0, y: 0, k: 1, sq: 0, rot: 0 }, .9); x.restore();
  } else if (Q.get('lab') === 'latin') {
    let y = 120;
    for (const f of ['EMSDelight', 'EMSCasualHand']) {
      await loadSvgFont('fonts/' + f + '.svg');
      const s = writeLatin(f + ': An inch tall? Let an arrow fly. body <- bow 10 28', 40, y, 54, -5);
      s.forEach(st => { bake(st, 1.5); drawStroke(x, st, 1e9); }); y += 160;
    }
  } else {
    await document.fonts.load('100px WenKaiRef');
    const chars = [...(Q.get('chars') || Object.keys(HZ).join(''))], S = +(Q.get('size') || 200), cols = Math.floor(W / (S + 20));
    chars.forEach((ch, i) => {
      const ox = 10 + (i % cols) * (S + 20), oy = 10 + Math.floor(i / cols) * (S + 20);
      x.strokeStyle = 'rgba(200,180,110,.25)'; x.strokeRect(ox, oy, S, S);
      x.font = `${S}px WenKaiRef`; x.fillStyle = 'rgba(220,60,60,.45)'; x.textBaseline = 'alphabetic'; x.fillText(ch, ox, oy + S * .88);
      const st = writeChar(ch, ox + S / 2, oy + S / 2, S, -10, { hand: Q.get('hand') || 'teacher', seed: 3 });
      st.forEach(s => { bake(s, 1); drawStroke(x, s, 1e9); });
    });
  }
  const c = cv.getContext('2d'); c.drawImage(o, 0, 0);
  window.render = () => {};
}
