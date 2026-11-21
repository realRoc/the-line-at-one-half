"""Beat grid, onsets and loudness of the song -> data/beats.json (used by js/fx.js to put camera punches,
glow and dust on the beat). Run with the Lemo-Opuscar venv:  $LIB/.venv/bin/python tools/beats.py"""
import json, os
import numpy as np, librosa
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
y, sr = librosa.load(os.path.join(HERE, 'audio/song.mp3'), sr=22050, mono=True)
hop = 512
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, units='time')
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
onsets = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units='time', backtrack=False)
# low-band kick-ish onsets
S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[f < 150].sum(0); low = np.maximum(0, np.diff(low, prepend=low[0])); low /= low.max() + 1e-9
kicks = librosa.util.peak_pick(low, pre_max=6, post_max=6, pre_avg=10, post_avg=10, delta=.08, wait=8)
kt = librosa.frames_to_time(kicks, sr=sr, hop_length=hop)
ks = low[kicks]
rms = librosa.feature.rms(y=y, hop_length=hop)[0]
# energy at 20 Hz, smoothed, normalised 0..1 (5th..98th percentile)
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
grid = np.arange(0, t[-1], .05); e = np.interp(grid, t, rms)
k = np.ones(9) / 9; e = np.convolve(e, k, 'same')
lo, hi = np.percentile(e, 5), np.percentile(e, 98); e = np.clip((e - lo) / (hi - lo), 0, 1)
on = np.interp(grid, librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop), oenv / oenv.max())
out = dict(tempo=float(np.atleast_1d(tempo)[0]), beats=[round(float(b), 3) for b in beats],
           kicks=[[round(float(a), 3), round(float(b), 3)] for a, b in zip(kt, ks)],
           onsets=[round(float(o), 3) for o in onsets],
           energy=dict(dt=.05, v=[round(float(x), 3) for x in e]), flux=dict(dt=.05, v=[round(float(x), 3) for x in on]))
json.dump(out, open(os.path.join(HERE, 'data/beats.json'), 'w'))
print('tempo', out['tempo'], 'beats', len(beats), 'kicks', len(kt), 'onsets', len(onsets))
# energy summary per 5 s
for i in range(0, len(e), 100): print(f'{grid[i]:6.1f}', '#' * int(e[i:i+100].mean() * 40))
