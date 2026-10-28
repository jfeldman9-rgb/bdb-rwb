# ADDENDUM (same pass — do not restart length work)

Game Art updated `/workspace/bdb-art/sprites` with **hand-drawn** `bob_shoot_00`–`07` and `yetti1_attack_00`–`07` (8 frames each @ **16 fps**). See `/workspace/bdb-art/sprites/FPS.md` (146 frames total).

**Required before you finish this pass:**
1. Repack Bob + yetti_walker (and any atlas that consumes yetti1_attack) from those new frames using existing `tools/pack.py` / import flow. Playback fps for those two anims must be **16**. Frame lists must be `00..07` (8 frames).
2. Wire/pack into `assets/chars/` so the game uses them (not the old 7-frame HOLD-interp sheets).
3. Known issue: fist in `yetti1_attack_05` is slightly clipped on the right — **leave as-is**, do not “fix” or regenerate art.
4. Keep length/difficulty work; this is additive. Still no Fable / no extra credits. Commit on `bdb-scroll`. Update `/tmp/bdb-length-claude-report.md` to mention the art repack.

Continue from current length work — do not throw away stage rebuild progress.
