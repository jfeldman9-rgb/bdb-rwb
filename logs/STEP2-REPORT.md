# Step 2 implementation report

Date: 2026-10-27. Repository: `/workspace/bdb-rwb`. Branch: local `main`.

## Commits

- Implementation: `a7607dab80478839a5e3596cce7a208dde75d318` — **BDB-RWB Step 2: Bob, eggplant, Yettis, Papi, Dad and three-stage campaign**.
- Starting scaffold: `87fe6043dee4b0b79b41ba9d5d77cd16af7167b9`.
- This report is committed separately after the implementation. Its containing commit can be found with `git log -1 -- logs/STEP2-REPORT.md`.

No git remote is configured. No push, remote addition or PR was performed. No changes were made in the packet, art reference, `/workspace/rwb-s8`, any `/workspace/rwb-w2*` directory, or any RWB branch.

## Completed

- **2.1:** BDB title/entry, five touch actions, standalone static boot, startup/graphics recovery, clean player-facing text. Every source module imports under the DOM test stub. Forbidden RWB dependencies are absent; `stage2-def.js` and `stage3-def.js` are newly authored BDB chapter definitions.
- **2.2:** Real Bob and both Yetti originals packed; all thirteen character keys available. Seventeen flat atlas pages, trimmed source rectangles, holds, 720×600 metadata and baseline 570. Silhouette generator and reproducible flat packer included. Specified packet backgrounds, ten voice placeholders, music, opening/victory videos and posters copied. Excluded portrait absent.
- **2.3–2.6:** Keyboard/gamepad/multitouch ownership; Bob lane movement, short hop, ground/air dash, hurt/knockdown/getup and six-press grab escape; horizontal-only five-shot/second gun, point-blank bonk and light hit-stop; walker, front-shield guard, hover shadow lane, 0.72-second charger tell, choir buff and Lecturer grabs.
- **2.7–2.8:** All four packet rule bodies preserved verbatim after stripping TypeScript annotations. Papacito refuses without spending, clears visible non-bosses and finishes only two weakened Wingmen. Clothed adult runner silhouettes cross the screen. Dad unlocks in Stage 1 zone 3, has the CALL7-shaped charge/recharge/max-call/per-phase gates, two visible swats, exact catchphrase caption and boss floors.
- **2.9–2.10 / campaign Step 4 work:** Three stages, three zones each, two-phase Interventionist and Choirmaster, three-phase Wingmen with split and Papacito-only kill, eight-second shake-trio softlock guard, zone/phase retries, HUD, difficulty, local save/unlocks, optional auto-fire, all planned voice-line registrations, inline opening/victory videos, stage resource release and complete campaign bot.
- README, asset provenance, Step 2 status, screenshots and reproducible browser smoke script included.

## Verification

| Check | Result |
| --- | --- |
| Node 24.10.0: `node --test tests/*.test.mjs` | **67 pass / 0 fail / 0 skip**, 0 cancelled |
| Default installed Node 20.19.2: same command | 67 pass / 0 fail / 0 skip (compatibility check) |
| Every `src/*.js` import under DOM stub | Pass |
| Atlas/frame and packet-body parity | Pass |
| `git remote -v` | Empty |
| HTTP `GET /` from `python3 -m http.server 8765` | **200** |
| Chromium / Phaser version | Vendored **Phaser 4.2.1** booted |
| Browser runtime / HTTP errors | **0 / 0** on final smoke run |
| Stage 1 Adventure bot | **32.783 sim seconds**, 0 deaths, PAPI 1, DAD 1; Stage 2 unlocked |
| Full Adventure simulation, 60 Hz | **229.950 sim seconds**, stages `[1,2,3]`, victory, PAPI 6, DAD 3; 8 checkpoint continues |
| Full Adventure simulation, 30 / 120 Hz | Victory at 192.767 / 194.742 sim seconds; 0 exceptions |
| Full browser campaign | Victory at 229.950 sim seconds; normal controls and fixed scene updates, no health/damage/resource cheats |
| Touch / lifecycle browser checks | Simultaneous movement + held FIRE, release, fresh-save Story default, pause freeze, portrait prompt, WebGL loss/restoration passed |
| Cutscene browser checks | Inline opening playback and keyboard skip passed; victory clip asset present and wired |

The browser smoke advances ordinary scene updates faster than wall time; the underlying simulation is the production one. Software-rendered Chromium is **not** physical iPhone or hardware performance evidence. A live frame meter is wired as `window.__bdbPerf.report()`.

During verification, the video check found a missing opening poster. Both video posters were generated and the packer was updated; the final browser run has no missing assets. No usage or rate-limit hits occurred.

## Screenshots

- `docs/shots/title.png`
- `docs/shots/stage1.png`
- `docs/shots/boss.png`
- `docs/shots/wingmen.png`
- `docs/shots/victory.png`
- `docs/shots/touch-stage1.png`
- Machine-readable checks: `docs/shots/browser-report.json`

All paths are relative to `/workspace/bdb-rwb`.

## Preview and tests

```sh
cd /workspace/bdb-rwb
python3 -m http.server 8765
# Open http://127.0.0.1:8765/?demo=1
# Or http://127.0.0.1:8765/ for manual play.
node --test tests/*.test.mjs
```

The local preview server was left running on port 8765. The shell initially supplied Node 20. A public Node 24.10.0 binary was downloaded into ignored `.cache/`; acceptance was run using:

```sh
PATH="$PWD/.cache/node-v24.10.0-linux-x64/bin:$PATH" node --test tests/*.test.mjs
```

No npm install, paid API, Tinyfish, Claude Fable/extra usage, Seedance or Manus was used. Existing Pillow, FFmpeg and Chrome handled local packing, posters and screenshots. The ignored Node/browser cache is not committed.

## Deviations and deferred work

- **Bob walk = 6**, overriding the plan's eight-frame brief. `_v1` contains the originals; later optical-flow frames in the root were excluded. Bob frames were not invented.
- The four packet rules are verbatim; combat otherwise uses small pure models with the retained Phaser Fighter/view, input, audio, viewport and recovery patterns. This makes the browser and bot simulations share behavior.
- Flat lighting is the shipped default, touch scale is capped at 1.5, and bloom is off. Normal maps are optional and omitted.
- Shared actor pages remain across stages; exclusive previous boss pages/backgrounds are released. This avoids unloading and reloading identical Bob/Yetti pages.
- Upgrade shop, bank and upgrade fields/UI are omitted. Save normalization discards legacy shop fields.
- Dad is fully in-engine. Dad video variants, new chapter/kidnap/boss-intro clips, final backgrounds/character art, and new voice recordings remain later work. All line IDs and stable local casting roles are registered; provider casting IDs are not bound or rendered in this pass.
- The compact campaign is functional but **human pacing is not yet tuned to 5–8 minutes per chapter**. The bot uses unlimited checkpoint continues in the full campaign. Further balance/playfeel work remains appropriate for review.
- Physical iPhone Safari playthrough, the real-device 60-second capture, and hardware p95 ≤16.7 ms remain unverified. The parent can capture these from the provided preview.
- Muse/Argon reviews and Jason's final fun/playability check remain outstanding and are not claimed complete.
