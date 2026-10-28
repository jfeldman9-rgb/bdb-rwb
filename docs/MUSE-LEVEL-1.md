# Muse Level 1 — Stage 1: Boulevard of Better Judgment

One-session Stage 1 pass on local `main` @ `7ae3448` (uncommitted working-tree
edits, intended branch `muse-level-1`). Scope was Stage 1 only per
`plan/BUILD-PLAN.md` §3.2 + §4 mechanics Stage 1 teaches. No Stage 2/3 waves,
finale, shop, or art pipelines were redesigned; the two shared-code changes
below are marked as such and are behavior-preserving outside Stage 1 except
where noted.

## What was wrong (probed against the running sim before editing)

- The Zone 2 charger telegraphed at up to 430 px but rushed a fixed
  0.65 s × 430 px/s ≈ 280 px. From max range it stopped **149 px short** of a
  stationary Bob and never hit him, so the "jump the rush" lesson taught
  nothing.
- Tutorial banners were keyed per zone, not per wave: the shield lesson fired
  on Zone 1 Wave 1 (two walkers, no guard on screen) and the guard wave only
  showed "ZONE 1 · WAVE 2". The Zone 3 banner never mentioned killing the
  choir first.
- The first eggplant clang on a gold shield gave no explanation, and banking
  the first PAPI charge was silent. The guaranteed shake trio always dropped
  at y=630, outside the 48 px pickup radius of a Bob hugging the top lane
  (y=572).
- In Zone 3 the guard spawned 315 px from the choir — just outside the
  300 px buff radius — so the toughest enemy in the "kill the choir first"
  wave was never buffed.
- The Interventionist's Phase II was a fresh HP bar only: same speed, same
  cadence, no slam, no visual change.
- Hover, charger, choir, and lecturer rendered with tinted
  walker/guard atlases even though their own packed atlases
  (`yetti_hover`, `yetti_charger`, `yetti_choir`, `yetti_lecturer`) exist.
  Hover height was static.

## What changed and why

### Teaching sequence (Zones 1–3)

- `src/story.js`: `TUTORIALS` is now per-zone arrays of per-wave prompts —
  move+fire straight (Z1W1), shield blocks / dash through (Z1W2, when the
  guard actually appears), hover shadow lane (Z2W1), red-flash rush / jump or
  step lanes (Z2W2), choir-first + Dad ready (Z3).
- `src/campaign.js`: `spawnWave()` selects the wave prompt and tracks
  first-run display per `zone:wave`. First blocked shot in Stage 1 banners
  "BLOCKED! DASH THROUGH THE GOLD SHIELD." once per life. Banking the first
  PAPI charge banners "PAPI READY! 3 SHAKES = 1 CHARGE. SAVE IT FOR A
  CROWD." Pressing DAD before Zone 3 now says "DAD ARRIVES IN ZONE 3."
  instead of the coffee-break refusal (spends nothing).
- `src/hud.js`: new pure `stagePrompt(w)` keeps the active lesson on screen
  after the 3 s banner fades (shield → dash, charger telegraph/rush → jump,
  choir with company → drop it first), Stage 1 only, below the existing
  grab/finisher prompts in precedence.

### Zone 2 mechanics

- `src/yettis.js`: charger rush duration is now
  `clamp((distance to telegraphed Bob x + 140) / (430 × pace), 0.65, 1.2)`,
  so it charges through the telegraphed spot; the tell is `0.72 / pace`
  (Story 1.0 s, Adventure unchanged 0.72 s, Nightmare 0.59 s). Hover bobs
  `z = 65 ± 10` over its shadow lane (hit lane unchanged).
- `src/campaign.js` (shared, tiny): `dropTrio(x, y = bob.y)` drops shakes on
  Bob's current lane, clamped to the lane band. This also makes boss-phase
  and Wingmen softlock trios land on Bob's lane instead of always mid-lane.

### Zone 3 choir lesson

- `src/stage1-def.js`: Zone 3 gets `spawnGap: 90`; `spawnWave()` honors an
  optional per-zone `spawnGap` (default 105, other stages untouched). The
  whole choir group now spawns inside the 300 px / ×1.28 buff radius,
  guard included.

### Mini-boss: The Interventionist

- `src/yettis.js`: Phase II now moves at ×1.3 speed, telegraphs grabs in
  0.58/pace (vs 0.65), recovers on a 1.1/pace cooldown (vs 1.3), and a
  whiffed Phase II grab becomes a `slam` state that sends a jumpable lane
  shockwave (`world.snowball(..., 'shockwave')`, same hostile the Wingman
  uses). Grab + 6-press mash, Story auto-mash, and both phase HP bars are
  unchanged.
- `src/campaign.js`: Phase II entry banners "THE INTERVENTIONIST · PHASE II:
  HE MEANS IT NOW" and replays the `lecturer_intervention` voice (intro
  still uses `interventionist_intro`; grabs still use
  `lecturer_intervention`).
- `src/game-scene.js`: Interventionist renders at 0.59 scale (≈1.4× the
  0.42 regular scale) and tints warm in Phase II.

### Role art wiring (shared, no new pipeline)

- `src/yettis.js`: `TYPES` art now points each role at its own atlas.
- `src/stages.js`: the four role atlases join the shared stage kit (boss
  residency deltas unchanged). Stage 1 kit GPU is ≈18.9 MiB decoded, inside
  the existing <20 MiB atlas test budget; Stage 3 kit ≈19.1 MiB by the same
  math.
- `src/game-scene.js`: animation selection is explicit per role
  (hover fly/shoot, charger telegraph/rush, choir sing, lecturer &
  Interventionist grab/hold/slam, etc.), replacing the first-anim fallback
  that mis-animated the placeholder atlases.

### Unchanged on purpose

Eggplant `vy = 0` with no aiming; no pits/platforms; shield still breaks on
dash contact, rear hits, Dad, PAPI, and the pre-existing 3-frontal-chip
fallback (kept so a phone player can never soft-lock on the Zone 1 guard;
there is a maintained test for that). Dad catchphrase, voice wiring, Bob
6-frame walk, TAP TO START, `#touch` controls, portrait rotate CTA, and
Story-on-touch default are untouched.

## Files touched (10)

- `src/stage1-def.js` — Zone 3 `spawnGap`.
- `src/story.js` — per-wave tutorial strings.
- `src/campaign.js` — wave tutorials, shield/PAPI hints, locked-Dad banner,
  trio lane, Interventionist Phase II banner/voice, `spawnGap`.
- `src/yettis.js` — role art, charger rush/tell, hover bob, Interventionist
  Phase II speed/cadence/slam.
- `src/hud.js` — `stagePrompt()` + HUD use.
- `src/stages.js` — shared kit gains the four role atlases.
- `src/game-scene.js` — per-role anims, boss scale/tint.
- `tests/stage1-sim.test.mjs` — 5 new tests (wave tutorials; shield hint +
  locked Dad; choir buff + trio/PAPI; boss-phase retry; HUD prompt).
- `tests/yettis.test.mjs` — 5 new tests (role art; charger reach; Story
  tell; hover bob; Phase II speed + slam).
- `docs/MUSE-LEVEL-1.md` — this file.

New tests were run first and failed for the reasons above (e.g. "charger
stopped 149.5px short", "phase2 95 vs phase1 95"), then passed after the fix.

## Verification (observed, this session)

- Full suite: `node --test tests/*.test.mjs` → **85 pass, 0 fail**
  (Node v24.22.1 from `/Applications/ChatGPT.app/.../cua_node/bin/node`;
  plain `node` is not on PATH on this machine). Includes the Stage 1
  Adventure bot clear (39.5 sim s, 1 death at boss Phase II, PAPI + Dad each
  used, unlock → stage 2), full-campaign clears at 30/60/120 Hz, packet
  parity, atlas GPU budget, touch/title tests.
- Bot per difficulty (Stage 1): Story 29 s / 0 deaths; Adventure 39.5 s /
  1 death; Nightmare 43.8 s / 1 death. Checkpoint/phase respawns make the
  Adventure/Nightmare death a retry, not a wall; the phone default (Story)
  is death-free for the bot.
- Static art cross-check (scratch script, not committed): every animation
  suffix `game-scene.js` can request exists in the corresponding
  `*.anims.json`, and every needed atlas is in the right `STAGE_CHARS` kit.

## Remaining gaps / not verified

- **Browser smoke not run**: `tools/browser-smoke.mjs` needs a Chrome/
  Chromium with remote debugging; none is installed on this machine and
  installs were out of scope. The Phaser presentation changes (new atlases,
  anim mapping, boss tint) are covered by module-import, atlas, and static
  anim checks plus the unchanged rendering path — but no screenshot or
  real-browser play of the new views exists yet. First human/browser pass
  should confirm `missing anim` never logs.
- No physical iPhone Safari run (unchanged from `plan/STATUS.md`).
- Stage length is still the compact vertical slice (≈30–45 bot seconds),
  not the plan's 5–7 human minutes; pacing/length work was out of scope.
- Choir buff still ends when allies walk out of 300 px (plan-correct
  radius); the tighter spawn makes the opening buff readable, but a slow
  player will mostly fight unbuffed walkers.
- Adventure bot dies once to Phase II slam pressure near the kill; if human
  desktop testers find the slam cadence unfair, soften `1.1 / pace` toward
  `1.3` before touching damage.
- `git status` shows pre-existing deleted `docs/shots/*` files and
  untracked prompt/voice-job files that predate this session; they were
  left exactly as found.

## Quota

No quota warning, rate limit, or allowance message was seen in this session.
QUOTA=ok.
