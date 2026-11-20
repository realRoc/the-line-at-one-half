"""Sound for The Line at One-Half -> out/mix.wav (48 kHz stereo, exactly DUR seconds).
The song (audio/song.mp3, Suno) is the whole score and the voice; it is left untouched. Under it, very quietly:
real chalk recordings cut into grains (foley/lib, CC0), one grain chain per stroke, length and level from the stroke;
one felt pass for the wipe; a soft whoosh on each whip pan. Run after `node core/render/events.mjs <project>`:
    $LIB/.venv/bin/python audio.py   (LIB in the environment)"""
import sys, os, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ['LIB']
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf, soxr
from core.audio.sfx import SR, add, whoosh, noise, bp, hp, lp, t_, brown

rng = np.random.default_rng(7)
EV = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EV['dur']; ev = EV['ev']; N = int(round(DUR * SR))
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)

# ---------------------------------------------------------------- the song
wav = os.path.join(HERE, 'out', 'song.wav')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(HERE, 'audio/song.mp3'), '-map', '0:a', '-ac', '2', '-ar', str(SR), wav], check=True)
song, _ = sf.read(wav, dtype='float32')
song = np.pad(song, ((0, max(0, N - len(song))), (0, 0)))[:N]

def fade(x, a=.004, b=.03):
    n = len(x); a, b = min(int(a * SR), n // 2), min(int(b * SR), n // 2)
    x = x.copy(); x[:a] *= np.linspace(0, 1, a); x[n - b:] *= np.linspace(1, 0, b); return x

# ---------------------------------------------------------------- chalk
fx = np.zeros((N, 2), np.float32)
IDX = json.load(open(os.path.join(HERE, 'foley/lib/index.json')))
strokes = [g for g in IDX if g['kind'] == 'stroke']; taps = [g for g in IDX if g['kind'] == 'tap']
cache = {}
def grain(g):
    if g['file'] not in cache:
        x, sr = sf.read(os.path.join(HERE, 'foley/lib', g['file']), dtype='float32')
        if x.ndim > 1: x = x.mean(1)
        if sr != SR: x = soxr.resample(x, sr, SR)
        cache[g['file']] = x / (np.abs(x).max() + 1e-9)
    return cache[g['file']]
def chalk(d, v, soft=False):
    out = np.zeros(int((d + .06) * SR), np.float32); pos = 0
    while pos < len(out) - int(.03 * SR):
        g = grain(strokes[rng.integers(len(strokes))]); n = min(len(g), len(out) - pos)
        out[pos:pos + n] += fade(g[:n], .006, .02); pos += max(int(.6 * n), int(.04 * SR))
    env = np.ones(len(out)); a = int(.012 * SR); env[:a] = np.linspace(.3, 1, a); env[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    out = out * env
    out = lp(out, 3800) if soft else hp(out, 500)
    return (out * v).astype(np.float32)
for e in ev:
    if e['type'] != 'chalk' or e['t'] < 0 or e['len'] < 4: continue
    d = max(.04, e['d']); size = min(1.0, e['len'] / 700)
    v = (.12 + .32 * size) * (1.2 if e['big'] else .85)
    add(fx, chalk(d, v, e['color'] != 'white'), e['t'], 1.0, e['pan'])
    if d > .12 and rng.random() < .5:
        add(fx, fade(grain(taps[rng.integers(len(taps))]), .002, .03) * .35 * v, e['t'] - .005, 1.0, e['pan'])
for e in ev:
    if e['type'] == 'wipe':
        d = e['d']; w = bp(noise(d + .1), 280, 2200) * .22
        w *= np.sin(np.pi * np.clip(t_(d + .1) / (d + .1), 0, 1)) ** 1.2 * (1 + .35 * np.sin(2 * np.pi * 2.2 * t_(d + .1)))
        add(fx, w.astype(np.float32), e['t'], 1.0, 0)
    elif e['type'] == 'whip':
        add(fx, whoosh(min(.5, max(.25, e['d'])), .6) * .35, e['t'] + .02, 1.0, -.2)
    elif e['type'] == 'thread':
        add(fx, chalk(e['d'], .3, True), e['t'], 1.0, 0)

# ---------------------------------------------------------------- balance: chalk sits well under the song
def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
act = np.abs(fx).max(1) > 1e-4
song_rms = rms(song)
fx_rms = rms(fx[act]) if act.any() else 1
gain = song_rms * 10 ** (-21 / 20) / fx_rms
# louder in the quiet cold open, where the chalk is the first thing heard
env = np.ones(N, np.float32); k0, k1 = int(9.4 * SR), int(10.4 * SR)
env[:k0] = 1.9; env[k0:k1] = np.linspace(1.9, 1, k1 - k0)
mix = song + fx * gain * env[:, None]
peak = np.abs(mix).max()
if peak > .98: mix *= .98 / peak
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
print(f'mix.wav  {DUR:.2f}s  song rms {20*np.log10(song_rms):.1f} dBFS  chalk {20*np.log10(rms(fx*gain)):.1f} dBFS  peak {20*np.log10(np.abs(mix).max()):.1f} dBFS')
