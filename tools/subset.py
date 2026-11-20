"""fonts/wenkai-sub.woff2: LXGW WenKai (OFL) cut down to the characters the subtitle plate uses (every string in
js/lyrics.js and NOTES in js/film.js) plus printable ASCII. The chalk on the board needs no font file of this kind.
usage: python tools/subset.py"""
import os, re
from fontTools import subset
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(HERE, 'js/lyrics.js'), encoding='utf-8').read() + open(os.path.join(HERE, 'js/film.js'), encoding='utf-8').read()
chars = {c for c in src if not c.isspace() and ord(c) > 0x7f} | {chr(c) for c in range(0x20, 0x7f)} | set('“”‘’…·—√θζ')
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']
font = subset.load_font(os.path.join(HERE, 'fonts/LXGWWenKai-Regular.ttf'), opt)
cmap = font.getBestCmap(); miss = sorted(c for c in chars if ord(c) not in cmap and c != ' ')
chars -= set(miss)
s = subset.Subsetter(opt); s.populate(text=''.join(sorted(chars))); s.subset(font)
subset.save_font(font, os.path.join(HERE, 'fonts/wenkai-sub.woff2'), opt)
print(f'wenkai-sub.woff2: {len(chars)} characters' + (f' (not in the font, dropped: {"".join(miss)})' if miss else ''))
