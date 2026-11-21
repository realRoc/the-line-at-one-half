#!/bin/sh
# One command: The Line at One-Half (music video, Chalkboard style, Lemo-Opuscar library)
#   LIB=<path to lemo-opuscar> sh build.sh
# v2 adds: the song's beat grid (tools/beats.py → data/beats.json) for the camera, glow and hits.
# Steps: fonts and chalk recordings (downloaded, OFL / CC0), lyric file, subtitle font subset, events from the page,
# mix (song + chalk foley), picture, master to -14 LUFS, reading-time check, subtitles, poster.
# The lyric timings in data/lyrics_aligned.json come from tools/align.md (demucs + stable-ts forced alignment).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder (github.com/lemomo-ai/lemo-opuscar)"; exit 1; }
PY="$LIB/.venv/bin/python"
NAME=the-line-at-one-half-v2
FPS=30
POSTER=165.3

EMS=https://gitlab.com/oskay/svg-fonts/-/raw/master/fonts/EMS
[ -f "$HERE/fonts/EMSDelight.svg" ] || curl -sfL -o "$HERE/fonts/EMSDelight.svg" "$EMS/EMSDelight.svg"
[ -f "$HERE/fonts/wenkai-sub.woff2" ] || {
  [ -f "$HERE/fonts/LXGWWenKai-Regular.ttf" ] || curl -sfL -o "$HERE/fonts/LXGWWenKai-Regular.ttf" https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Regular.ttf
  python3 "$HERE/tools/subset.py"; }                 # needs fonttools + brotli
python3 "$HERE/tools/make_lyrics.py" > /dev/null

C=https://upload.wikimedia.org/wikipedia/commons
mkdir -p "$HERE/foley/raw" "$HERE/out"
[ -f "$HERE/foley/raw/chalk-on-chalkboard.wav" ] || curl -sfL -o "$HERE/foley/raw/chalk-on-chalkboard.wav" "$C/8/81/264944_chalk-on-chalkboard.wav"
[ -f "$HERE/foley/raw/Chalkboard-writing.ogg" ]  || curl -sfL -o "$HERE/foley/raw/Chalkboard-writing.ogg" "$C/3/36/Chalkboard-writing.ogg"
[ -f "$HERE/foley/lib/index.json" ] || "$PY" -I "$HERE/tools/foley_lib.py" "$HERE/foley/lib" \
  fat="$HERE/foley/raw/chalk-on-chalkboard.wav" tom="$HERE/foley/raw/Chalkboard-writing.ogg"

[ -f "$HERE/data/beats.json" ] || "$PY" "$HERE/tools/beats.py"      # beat grid + loudness for js/fx.js

cd "$LIB"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/audio.py"
node core/render/video.mjs "$HERE" --fps $FPS --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" $FPS 1
node core/render/readcheck.mjs "$HERE" > "$HERE/out/readcheck.txt" && echo "readcheck ok" || { tail -20 "$HERE/out/readcheck.txt"; exit 1; }
"$PY" "$HERE/tools/srt.py" "$HERE"
node core/render/still.mjs "$HERE" $POSTER --q nosubs --out "$HERE/out" --prefix poster_
cp "$HERE/out/poster_$POSTER.jpg" "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"
