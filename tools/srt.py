"""subtitles_en.srt and subtitles_zh.srt from events.json (the sung lines and the Chinese notes, exactly as the
page shows them). The subtitles are also burned into the picture, so the files are named apart from the video.
usage: python tools/srt.py <project>"""
import json, os, sys
HERE = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ev = json.load(open(os.path.join(HERE, 'events.json')))['ev']
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
for lang in ('en', 'zh'):
    cues = sorted([e for e in ev if e['type'] == 'sub' or (e['type'] == 'note' and lang == 'zh')], key=lambda e: e['t'])
    with open(os.path.join(HERE, f'subtitles_{lang}.srt'), 'w', encoding='utf-8') as f:
        for i, e in enumerate(cues, 1):
            f.write(f"{i}\n{ts(e['t'])} --> {ts(e['t1'])}\n{e[lang] if e['type'] == 'sub' else e['zh']}\n\n")
    print(f'subtitles_{lang}.srt: {len(cues)} cues')
