# How the lyric timings were made

`data/lyrics_aligned.json` holds every sung word with its start and end time. It was made once, from the song:

1. Vocal stem: `python -m demucs --two-stems=vocals song.wav` (htdemucs).
2. Free transcription for the structure: stable-ts with faster-whisper `large-v3-turbo`, word timestamps, VAD.
3. Forced alignment of the lyric text as sung (repeats included) to the vocal stem: `model.align(vocals, text, language='en')`.
4. Fixes by hand where the aligner stretched a phrase's first word back into the gap before it (start = end − 0.5 s,
   cross-checked against step 2 and the vocal stem's energy): "Riemann", "Rallis", "When", "Only", the second
   "Unitary", and the last "The line at one-half" (from step 2).

`tools/make_lyrics.py` merges the sung fragments back into the lyric's own lines and adds the Chinese translation.
Every board stroke in `js/film.js` is timed with `at(word)`, the start of that sung word.
