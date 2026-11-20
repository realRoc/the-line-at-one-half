# The Line at One-Half — treatment

Music video for the Suno song *The Line at One-Half* (3:57.7, ~92 BPM), explaining in pictures the
claimed proof of the Riemann Hypothesis by Levent Alpöge (with Claude), announced 2026-11-20 and
published as ~17.4 M lines of Lean (mirror: github.com/CocoSgt/riemann-hypothesis-lean; outline:
alpo.ge/remark.pdf). Style: **Chalkboard** (Lemo-Opuscar). No voice-over: the song is the voice.
Audience: a maths graduate ten years out, who reads Chinese first.

## Three candidate structures

1. **One long wall, left to right.** Every verse is one board on a single classroom wall; the camera
   travels right as the history and the proof advance; the last chorus pulls back to show the whole
   wall at once, every board joined by one orange line. *Time = space.*
2. **One board, written and wiped seven times.** Each verse overwrites the last. Clean, but the
   viewer loses the chain of ideas, and the style allows one wipe per film.
3. **Two boards in dialogue.** Left board: finite fields (where RH is a theorem). Right board:
   the integers (where it was open). Every idea is written on the left, then its analogue on the right.

**Chosen: 1, with 3 folded in.** The proof *is* a chain (function fields → multiplicity → theta
lifts → explicit formula → Lean), and the song is a lift-it-higher song; a single wall whose final
wide shot shows the entire argument at once is the right ending. The "finite field ↔ integers"
dialogue of (3) is kept inside board 2–3 as a left/right comparison.

## Logline and arc

A line Riemann wrote in 1859 as "very probably" is drawn, doubted for 160 years, and finally
earned: by building, out of chained theta lifts, the multiplicity the integers never gave us.

- Setup (0–50 s): the line and the zeros; nobody could prove it.
- Turn (50–103 s): over finite fields it *was* proved (Weil, Stepanov's multiplicity trick); the
  integers lack Frobenius — so *build* multiplicity: lift θ after θ, √X times.
- Development (103–180 s): seesaw, Iwasawa towers, explicit formula, the price of each lift.
- Ending (180–238 s): 17 M lines of Lean, three axioms, the line drawn across the whole wall.
  The end card states plainly that the proof is claimed and independent checking is pending.

## Benchmark (grammar only)

- 3Blue1Brown's *Visualizing the Riemann zeta function* — learn: one picture per idea, the critical
  line as a constant visual anchor. Don't take: its 3D/colour-wheel look, any of its shots.
- A real university lecture filmed from the back row, sliding boards — learn: boards are filled in
  the order of the argument, and the lecturer never erases what the next step needs.

## Colour logic (three chalks)

- **White**: every structure (axes, formulas, words).
- **Orange (accent)**: only *the line Re(s) = ½* and the zeros that land on it. Tracked through the
  whole film: cold open, strip diagram, end of each chorus, final wide.
- **Pale yellow (second hand)**: Claude's hand — the √X chain length (remark.pdf: "Claude's suggested
  length of chain of theta lifts … was √X"), and the Lean kernel's answer.

## Native moves used

- *Tracked component in accent chalk*: the critical line.
- *Write, wipe, rewrite in place* (the one wipe): pre-chorus, "d/dn ?" (differentiate an integer?)
  wiped → "BUILD IT" in the same spot.
- *A line that sews boards*: on the last "line at one-half" the orange line runs across every seam.
- *Second hand*: Claude's yellow √X.

## Cue map (seconds, from forced alignment of the vocal stem; beat ≈ 0.65 s)

| Section | t | Board / action |
|---|---|---|
| Cold open | 0–9.6 | close on clean slate; orange vertical line draws itself; "Re(s) = 1/2" |
| Intro (spoken) | 9.9 / 13.4 / 18.7 | "1859" · "B. Riemann" · "»sehr wahrscheinlich«" |
| Instr. | 19.6–30.9 | pull to wide: the classroom; ζ(s) = Σ n⁻ˢ = Π (1−p⁻ˢ)⁻¹ |
| Verse 1 | 30.9–49.3 | critical strip, zeros tick onto the orange line, "10¹³ zeros checked", "proof?" |
| Verse 2 | 50.8–69.5 | over 𝔽_q: Weil 1948 \|α\| = √q; Stepanov: f vanishes at every point to order m |
| Pre-chorus | 71.6–80.5 | over ℤ: "Frobenius" struck; "d/dn ?" wiped → **BUILD IT** on 80.28 |
| Chorus 1 | 82.1–102.6 | panel slides: U(X₀) →θ U(X₁) →θ … U(Xₘ); **m ≈ √X** (yellow); 3 zeros land on 97.8/99.2/101.0 |
| Interlude | 102.6–107.6 | whip to next board |
| Verse 3 | 107.6–126.2 | seesaw diagram; period = Bessel period, χ crossed out; Iwasawa tower ↔ 𝔽_q ⊂ 𝔽_{q²} ⊂ … |
| Verse 4 | 127.6–146.5 | explicit formula Σ Λ(n)φ(n) ↔ Σ_ρ φ̂(ρ); W ≥ 0; qN = Mᵏ + R; Parseval ×k; \|R\| ≲ √ |
| Bridge | 148.4–157.9 | cost per lift curve stalls at 2/3; twist χ; "Vandiver (weak)", K-groups |
| Chorus 2 | 159.0–179.4 | chain extends; pull back; orange line sews the boards on 174.7/176.0/177.8 |
| Verse 5 | 181.8–200.2 | Lean board: 17.4 M lines · sorry 0 · axiom 0 · "build: pending" · `theorem riemannHypothesis` |
| Outro | 202.4–222.9 | `#print axioms` → propext · Classical.choice · Quot.sound (yellow); final wide, line drawn |
| Fade | 223–237.7 | end card: title, credits, status note |

## Shot list (summary)

1. Close, flat, locked — the orange line writes itself (hook, 0–9.6).
2. Close → slow pull to medium as 1859 / Riemann / quote are written.
3. **Wide** of the classroom (wall, frame, tray, clock) during the instrumental — the room shot.
4. Medium push-in on the strip diagram; lateral pan as zeros climb the line (V1).
5. Whip (≤0.5 s) right to the finite-field board (V2); close on the multiplicity rings.
6. Same frame later: the wipe and "BUILD IT" (pre-chorus judgement).
7. Locked frame while the front panel slides away (chorus 1 = a page turned) → slow lateral pan
   along the θ chain, "higher and higher" = camera cranes up the chain.
8. Whip to V3 board; medium; tilt down… (flat camera: vertical pan) the Iwasawa tower floor by floor.
9. Lateral pan along the explicit formula (V4), push-in on "√".
10. Close on the 2/3 stall (bridge).
11. **Signature shot**: chorus 2 pull-back from the chain to the whole wall while the orange line
    sews every board, landing on "to the line at one-half".
12. Medium on the Lean board (V5), close on "sorry: 0".
13. Close on the three axiom names; final wide of the whole wall, held; end card.

## Sound design

The song is the full mix (no added score). Chalk foley (CC0/CC-BY grains, as in the style) is laid
very low under every stroke — it must never mask the vocal; one felt pass for the wipe; one panel roll
for the slide. Music is not ducked.

## Subtitles and titles

- Burned-in plate above the bottom safe area: English lyric line (karaoke: sung words full white,
  upcoming words dim) over a Chinese translation in a kai face (LXGW WenKai subset).
- In instrumental gaps the plate carries a short Chinese 讲解 (what this board means), held for
  reading time.
- Board writing is English and maths only (handwriting font + hand-authored strokes for Greek and
  maths symbols), never typeset.
- Exported as `subtitles_en.srt` and `subtitles_zh.srt`.
