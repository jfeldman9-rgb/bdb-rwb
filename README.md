# The Legend of Claudia: BDB's Awakening

A three-chapter lane brawler on the vendored Phaser 4.2.1 engine. Bob fires straight eggplants, dashes through angelic Yetti shields, calls Dad, and rescues Claudia with a Papacito finale. The upgrade shop is cut from v1.

Run from the repository root:

```sh
python3 -m http.server 8765
```

Open **http://127.0.0.1:8765/** to play or **http://127.0.0.1:8765/?demo=1** for the campaign bot. No build step or npm install is needed.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move in the lane | WASD / arrows | Left stick / D-pad |
| FIRE (hold) | J / Z / E | X |
| JUMP | Space / K / X | A |
| DASH | Shift; horizontal double tap | B / RB |
| PAPI | Q / C / L | Y |
| DAD | R / V | LB |
| Pause | Escape / P | Start |

Touch uses a stick and five buttons. Play in landscape. Story is the default on a fresh touch device; Adventure is the desktop default. Nightmare unlocks after victory. Optional auto-fire is off initially. It fires along Bob's current facing lane.

Three shakes grant a PAPI charge (maximum two). PAPI clears visible regular enemies. In the finale, weaken **both Wingmen to 1 HP**, then use PAPI. A shake trio appears every eight seconds if the finisher is ready and the meter is empty. Dad first becomes available in Chapter 1, zone 3; recharge needs both ten Bob KOs and 45 seconds, up to three calls per campaign. Checkpoints provide unlimited continues.

Chapter unlocks, best score, difficulty and auto-fire are saved locally under `bdb-rwb-save-v1`. Chapter selection respects unlocks; `?demo=1&stage=2` or `stage=3` can exercise later chapters. Add `?nocutscenes=1` to skip videos. Rendering is flat lit; `?lit=0` is supported by that default. Touch render scale is capped at 1.5 and bloom is off.

Run the tests with Node 24:

```sh
node --test tests/*.test.mjs
```

Tests cover packet rule parity, every animation frame, input ownership, Bob, the gun, all Yetti roles, Dad, checkpoints, saves, resource release, graphics recovery and complete Adventure campaigns at 30/60/120 Hz. The browser and tests share `src/campaign.js`; the bot changes only ordinary inputs.

`node tools/browser-smoke.mjs` launches its own static server and headless Chrome, clicks through to live gameplay, and writes screenshots plus `browser-report.json`. The shot directory defaults to `docs/shots/browser-smoke`. Set `BDB_SMOKE_DIR` to put them somewhere else, and `BDB_SMOKE_GAMEPLAY` for the gameplay still. `CHROME` overrides the browser binary. SwiftShader captures do not establish iPhone or hardware performance. A live frame report is available as `window.__bdbPerf.report()`.

Rebuild assets using the existing Python/Pillow installation:

```sh
node tools/make-placeholders.mjs
```

The packer reads the **v2 higher-fps** frames in `/workspace/bdb-art/sprites/` (see `FPS.md`; ignores `_v1/` and `_old/`). Bob walk is **12** frames @18fps; shoot/attack HOLDs are deduped in the atlas. It packs flat atlases, creates clothed silhouettes for missing keys, and copies only the specified packet media. Existing FFmpeg extracts video posters; without it, the packer uses a background poster. All reference directories remain read-only. See [asset notes](docs/ASSET-NOTES.md).

Step 2 includes all three chapters, both mini-bosses, the Wingmen finale, the campaign bot, placeholder media and local saves. Final character/background/cutscene art, rendered voice casting, physical iPhone checks, human pacing and the Muse/Argon reviews remain later work. No remote is configured and nothing has been pushed.
