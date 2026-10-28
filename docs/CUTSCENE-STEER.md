# ADDENDUM (same pass — authorized by Jason/parent)

Wire Game Art cutscenes into `STAGE_CLIPS` on `bdb-scroll` (do not undo Dad/KTX work):

Source (silent 6s 960×540, skippable tap):
- `/workspace/bdb-art/cutscenes/kidnap_1.mp4` — Yettis block Bob
- `/workspace/bdb-art/cutscenes/kidnap_2.mp4` — Claudia carried off  
  → play **before or at start of Stage 2** (kidnap sequence)
- `/workspace/bdb-art/cutscenes/rescue_1.mp4` — Bob and Dad at the cloud fortress  
  → play **before the Stage 3 boss**
- `/workspace/bdb-art/cutscenes/rescue_2.mp4` — Claudia freed  
  → play as the **ending** (replace or precede current victory clip as appropriate)
- Optional: `/workspace/bdb-art/cutscenes/intro-v2/final/intro_v2.mp4` as opening, behind a **flag defaulting OFF** until Jason OKs it (e.g. `?intro=v2` or `INTRO_V2=0` in config). Keep existing `opening` as default intro.

Copy into `assets/cutscenes/` (or serve from a stable path). Update `src/cutscene.js` `STAGE_CLIPS` and hooks (`cutscene-hooks.js` / `game-scene` / `campaign` / title flow) so the right keys fire at those beats. Clips are silent — tap-to-skip already exists; keep maxMs sensible for 6s×N.

Tests green; commit on `bdb-scroll`. Append to `/tmp/bdb-dad-ktx-report.md`. Do **not** deploy (parent does preview). Still Opus 5.5 only, no Fable, no extra usage.
