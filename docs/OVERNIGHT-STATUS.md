# BDB overnight status — 2026-10-28 (America/Phoenix)

## Model split (Jason via Legend Of Claudia, ~02:43 AZ)
- **Coding:** ChatGPT 6.1 Sol ↔ Grok in Cursor (alternate sessions).
- **Reviews this gate:** Claude + Argon + Muse; merge into `docs/FIX-LIST.md`. Kimi TBD.
- **Rules:** no Fable, no extra usage credits, keep existing Cloudflare preview Jason already uses, no new public sites, no merge to `main` without Jason preview+yes.

## Passes tonight (this session)

| Pass | Model / tool | Outcome | Artifact |
|---|---|---|---|
| Private GitHub repo | `gh` + `user-GitHub-xai` as jfeldman9-rgb | Created **private** `jfeldman9-rgb/bdb-rwb`; pushed `main` + `bdb-scroll` | https://github.com/jfeldman9-rgb/bdb-rwb |
| Argon review (prior) | Argon Design | Copied into tree | `docs/ARGON-REVIEW.md` (overall ~4.9/10 vs RWB; snapshot was slightly older than tip) |
| Claude review | Claude Code CLI `--model opus` (Opus 5.5, Pro) | Read-only; hit max-turns 40 after writing doc; **6/10** | `docs/REVIEW-CLAUDE.md` |
| Muse feel/pacing review | Muse Wonder Full 1.0, `--reasoning-effort max` on Mac mini | Read-only; **5/10**; QUOTA=ok | `docs/REVIEW-MUSE.md` |
| Merge fix list | Grok Bot (Cursor) | Deduped P0/P1/P2 + locked-rule exclusions; Kimi slot left | `docs/FIX-LIST.md` |

## Muse quota
- **Before feel review:** `server_sent_no_usage` (new window; no mint yet) — see `docs/muse/muse-usage-before-feel.json`.
- **After feel review:** Muse Code Power Usage — **window 6%**, **weekly 9%** (`docs/muse/muse-usage-after-feel.json`). Prior 100-improvements pass had been window 21% / weekly 7% on an earlier window.
- Window reset epoch (after): `1793199066000` ms.

## Earlier same-night work (context; not this gate)
- intro_v3 remixed VO (Jason: "I like it" / "not perfect but good") — then Claude found 30 s hard cap truncates it (**P0-1**).
- Dad call-in clips D1–D3 + playDadCall; painted Yetti roles compressed to KTX.
- Photo-based Dad redraw in progress at Game Art (Jason confirmed Bob's dad likeness OK). Interim clean-shaven set not shipped pending photo Dad.
- Legend Of Claudia overnight notes treated as suggestions; Jason's likeness + preview-link decisions win.

## Open decisions
- None blocking this gate. Next coding pass should start from `docs/FIX-LIST.md` P0 order.
- Kimi review still pending for the four-way merge.

## Git
- Branch: `bdb-scroll` (this status + reviews + FIX-LIST committed here).
- Remote: private `origin` → `https://github.com/jfeldman9-rgb/bdb-rwb.git`
- **No merge to `main`.** No new public Pages projects.

## Pass 1: Grok 4.7 (Cursor)

Pass 1: Grok 4.7 (Cursor) did it, on `bdb-pass1-grok` (draft PR into `bdb-scroll`, not `main`).

Done: P0-1 through P0-5, K1, K2, P1-1, P1-2, P1-3, P1-4, P1-6, P1-7 (governor only), P1-9, P1-14, P1-20.

Deferred: P1-5, P1-8, P1-10 through P1-13, P1-15 through P1-19, the `recovery.js` card, and P2. No deploy.

## Pass 2: Muse Spark (Cursor)

Branch `cursor/bdb-pass2-d377` (stands in for the requested `bdb-pass2` name; branch policy requires the `cursor/` prefix), draft PR #2 into `bdb-pass1-grok`. No merge, no deploy. `npm test` 168/168 green (was 143). Bot band holds at 30/60/120 Hz (e.g. 60 Hz stages 166/190/226 s).

Done: P1-5 (Dad clip keys + iOS bless), P1-8 (hurt knockback slide), P1-10 (refusal banners keep charge numbers), P1-11 (Papi wipe lands with runners), P1-12 (choirmaster single summon source; also fixed its volley skip excluding every band), P1-13 (Phaser parked behind story video), P1-15 (pad Start begins, Enter pauses), P1-16 (Dad stand clamp; 2nd swat is a docs bug), P1-17 (44pt pause/mute + safe-area), P1-18 (translucent HUD band, per-Wingman bars, street label dropped), P1-19 scoped (zone-4 stagger only; zone heals softened on Nightmare only — wider cuts pushed stage 3 to 263 s at 120 Hz), `recovery.js` wired (resume cleanup + stage-aware reload). Kimi F1 (voice queue follows sounding-line duration; test fails on old code), F2 (pre-gameplay downgrade keeps floor), F3 (bosses pin lanes). Gaps G1–G4, G6 closed (G1 voice-queue, G2 corpse integration, G3 breath mercy, G4 boss-lane, G6 pre-gameplay governor).

Deferred: P2 (untouched), Kimi F4–F8, G5 (browser-only). Locked rules re-verified intact; `assets/cutscenes/intro_v3.mp4` untouched.

## Pass 3: Grok 4.7 (Cursor)

Branch `cursor/bdb-pass3-7221`, draft PR into `cursor/bdb-pass2-d377`. No merge, no deploy. `npm test` 192/192 green (was 168). Adventure bot band holds at 30/60/120 Hz. At 60 Hz the stages were 166.4 / 196.8 / 210.2 s, inside 140–240 s. Choirmaster fight numbers from PR #2 were not retuned. `assets/cutscenes/intro_v3.mp4` untouched. Eggplant still fires straight, `CAM_LEAD` is still 0.28, there is still no upgrade shop, and the locked lines are unchanged.

Done: P3-1 through P3-13.
- P3-1 Nightmare stages finish. Wingman damage persists across a death. `tools/bot-sim` drains `dad_callin`. Full-stage Nightmare clear test for S2 and S3.
- P3-2 Scripted voice waits behind whatever is sounding, including the third queued line. Stage 2 narration waits out the kidnap clip.
- P3-3 Dad unmute no longer skips the clip. The video element and bless survive a stage change. iOS sound is blessed before the first call.
- P3-4 Wingman telegraph uses the same lane constants as the halos.
- P3-5 Dad's catchphrase plays on the swatter impact. Wording unchanged.
- P3-6 Chapter 2 and 3 do not replay the 61s intro. The story player pauses Phaser while a clip is up.
- P3-7 Reload stays wired after the title. A stalled loop and a gameplay error call `showStuck`. Graphics retry reopens the running stage. A missing chapter file still fails after ready.
- P3-8 Each Papi target falls when the front runner reaches it.
- P3-9 A dead Lecturer lets go without hurting Bob. A grab timeout goes through `hurtBob`.
- P3-10 Wingman bars sit side by side, labeled W1/W2, including a dead Wingman at empty.
- P3-11 Mercy clears that phase's swat lock. Respawn sets `camMax` to the checkpoint camera.
- P3-12 Rotate listens once. Touch labels write only when they change. The perf meter is not replaced. `FX.slowmo` / `FX.hitstop` removed. Snowball knockback follows travel. Recoil is a short kick. Halo, shockwave, and snowball are different shapes.
- P3-13 The pause, recovery, title/Enter, HUD-band, and voice-policy checks call the code. The heal test name matches Nightmare-only half heal.

Deferred: Choirmaster fight balance (Claude C3; Jason signs off). Kimi F8 (stage-2 music blip, mercy banner replacing the checkpoint banner, double splat on kill). Claude C10 refusal-banner nits. Claude C12 Escape/P start the title. Claude C13 second-swat docs. Muse choir aura, shield cracks, enemy separation, boss corpse hold. Kimi G5 browser rotate. Muse Adventure zone-5 spike (no further heal cut).

## Pass 3 boot follow-up

`1eb6f3a` did not boot. `src/game-scene.js` imported `./shot-feel.js`, which was never committed, and `bindRotatePause` (`src/rotate-block.js`) and `noteRenderer` (`src/perf.js`) were imported without exports (the behaviour-test commit called them, the exports stayed in the working tree). A clean checkout of that SHA was 179/184. The 192/192 figure above was that dirty tree, not the pushed commit. `FX.slowmo` / `FX.hitstop` were still written and never read, and hostile knockback still used the projectile's x. This follow-up commits `src/shot-feel.js`, `tests/presentation.test.mjs`, those two exports, and a zero-dependency `package-lock.json` so `npm ci` can run. FX no longer stores slow-mo or hit-stop. A hostile hit calls `hurtBob(false, null, p.dir)`. Choirmaster numbers and `assets/cutscenes/intro_v3.mp4` are unchanged. Fresh clone of `b360d53` (`git clone`, `npm ci`, `npm test`) is 192/192. The browser entry (`lib/phaser.min.js`, then `src/bootstrap.js`) imports through `main.js` with `shot-feel.js`, `bindRotatePause`, and `noteRenderer` resolved.

## Pass 4: Grok 4.7 (Cursor)

Branch `cursor/bdb-pass4-cfe0`, draft PR #11 into `cursor/bdb-pass3-7221` (parent `298879e`). No merge, no deploy.

The missing-file P0 scored on PR #6 was already fixed at `298879e` (`src/shot-feel.js`, `bindRotatePause`, `noteRenderer`). Confirmed, then skipped. The pass-4 list is `docs/FIX-LIST.md`, merged from the four Pass 3 reviews plus the Pass 3 deferrals, with each reviewer credited.

Fresh clone of `54984a9` (`git clone`, `npm ci`, `npm test`) is 210/210. The browser entry loads `lib/phaser.min.js` and then `src/bootstrap.js`, which imports `main.js`. `shot-feel.js`, `bindRotatePause`, and `noteRenderer` resolve.

Adventure clears from that clone stay inside 140–240 s. Fresh stages: 60 Hz 165.1 / 189 / 206.5 s, 30 Hz 165 / 194.1 / 198.2 s, 120 Hz 161.4 / 193.3 / 203.8 s. Full-campaign stage times: 60 Hz 165.1 / 187.1 / 212.9 s, 30 Hz 165 / 184.7 / 206.6 s, 120 Hz 161.4 / 197.6 / 206.9 s.

Choirmaster HP stays 1140. The eggplant still fires straight (`vy` 0). `CAM_LEAD` is still 0.28. There is still no shop. Dad's catchphrase and the quoted lines are unchanged. `assets/cutscenes/intro_v3.mp4` is untouched.

Done: P4-1 through P4-18.
- P4-1 A phase-3 Wingman at 1 HP no longer soaks eggplants. Nightmare clears cover every stage at 60 Hz and at 30 Hz, including Stage 1.
- P4-2 The stuck card stays off a slow chapter load and off the first stray error. An empty filename does not trip. A repeat does.
- P4-3 `dad_catchphrase` waits with the scripted lines. Wording unchanged.
- P4-4 A dead Wingman stays dead when phase 3 respawns. Phase advance clears the HP snapshot.
- P4-5 `showStuck` does not stack a second Reload listener. The freeze guard clears on `game.destroy`.
- P4-6 The story player is the only clip pause. A second clip aborts the first.
- P4-7 `syncViews`, effects, particles, and the sim's dead-entry sweeps reuse their lists. Boss bars tick the 66% and 33% gates.
- P4-8 Stage music does not start when a cutscene is already queued, so Stage 2 does not blip under the kidnap clip.
- P4-9 Respawn uses `CAM_LEAD`. The value stays 0.28.
- P4-10 A mercy respawn keeps the checkpoint line. A Bob kill splats once. Papi and Dad still splat on the ko.
- P4-11 A locked Dad is not reported as spent. A recharging call shows the 10-KO and 45 s progress.
- P4-12 Escape and P do not start the title. Pad Start and Enter still begin. Gameplay pause is unchanged.
- P4-13 The plan docs match the single packed swat. No second swat was added.
- P4-14 A living choir draws a 300 px ring, note marks, and a gold pulse on buffed enemies. `choirMultiplier` stays 1.28.
- P4-15 Shield chips 1 and 2 crack the ellipse. The clang rises per chip. The break is still the third hit.
- P4-16 Same-lane non-boss Yettis under 46 px are pushed apart in `actorId` order, at most 8 px per body per pair. Bosses stay put.
- P4-17 A boss corpse stays fully opaque through the minion hold (0.5 s), then fades. Minion hold stays 0.5 s.
- P4-18 After the title, a missing chapter file says the chapter did not finish loading.

Deferred: Choirmaster fight balance (Claude C3; waits for Jason). Muse Adventure zone-5 spike (no further heal cut). Kimi G5 real-device rotate (`bindRotatePause` is unit-tested). Claude R9 `grabPunish` handoff (the campaign consumes it the same step). Kimi minor 5 static export check. Muse Story flatness and the nocutscenes ear-check.

## Pass 6: Grok 4.7 (Cursor)

Branch `cursor/bdb-pass6-5619` @ `d496144`, draft PR #21 into `cursor/bdb-pass5-7e78`. No merge, no deploy.

Fresh clone of `d496144` (`git clone`, `npm ci`, `npm test`). `npm ci` warns `EBADENGINE` (package asks for Node `>=24`; this clone ran Node v22.23.4) and then installs. `npm test` is 227/227. Browser smoke (`CHROME=/usr/local/bin/google-chrome`, `BDB_SMOKE_DIR=/opt/cursor/artifacts/browser-smoke`) reached victory with zero runtime or HTTP errors. Phaser 4.2.1. The live stage-1 shot is `/opt/cursor/artifacts/p6-gameplay.png` (Bob firing, the caption reads `Stay away from the Colombians room.`). The in-browser Adventure campaign matched the 60 Hz bot: 165.1 / 187.5 / 213.3 s, 4 deaths.

Pass 5 published fresh stages, the before for this pass: Story 30 Hz 128.2 / 137.6 / 151.8, 60 Hz 128.6 / 141.1 / 155.6, 120 Hz 126.0 / 138.9 / 152.1, 0 deaths (campaigns 418.4 / 426.7 / 415.5). Adventure 30 Hz 182.7/2, 194.1/3, 197.0/2; 60 Hz 164.9/0, 188.9/2, 225.4/5; 120 Hz 161.3/0, 193.3/3, 213.1/3 (campaigns 582.1/6, 584.9/5, 573.5/5). Nightmare 30 Hz 247.5/6, 260.4/6, 326.6/10; 60 Hz 235.5/6, 263.6/6, 326.1/10; 120 Hz 235.5/7, 265.6/6, 328.4/11 (campaigns 869.6/23, 859.9/23, 871.3/27).

Fresh-clone bot-sim after, fresh stage starts then the continued campaign:

| | 30 Hz | 60 Hz | 120 Hz |
|---|---|---|---|
| Story S1 / S2 / S3 | 149.5/0, 163.2/1, 179.2/0 | 151.2/0, 168.1/1, 183.0/0 | 148.3/1, 164.4/1, 178.6/0 |
| Story campaign | 499.1 s / 1 death (149.5 / 162.4 / 179.6) | 512.2 s / 1 (151.2 / 168.8 / 184.7) | 500.2 s / 2 (148.3 / 164.8 / 179.6) |
| Adventure S1 / S2 / S3 | 163.8/0, 186.2/2, 196.9/2 | 165.1/0, 189.2/2, 209.0/3 | 161.2/0, 193.6/3, 205.7/3 |
| Adventure campaign | 577.8 s / 6 (163.8 / 184.9 / 221.6) | 573.4 s / 4 (165.1 / 187.5 / 213.3) | 573.1 s / 5 (161.2 / 197.8 / 206.6) |
| Nightmare S1 / S2 / S3 | 252.7/7, 280.6/8, 286.1/7 | 229.8/5, 304.0/9, 285.6/9 | 235.5/6, 285.7/9, 283.1/9 |
| Nightmare campaign | 815.2 s / 21 (252.7 / 270.2 / 284.8) | 856.7 s / 25 (229.8 / 319.9 / 299.5) | 856.5 s / 27 (235.5 / 291.5 / 322.1) |

Nightmare stage 3 fresh starts moved from 326.6/10, 326.1/10, 328.4/11 to 286.1/7, 285.6/9, 283.1/9. All three sit in 280–310 s. The continued 120 Hz campaign's stage 3 is 322.1 s (12 deaths against 9 on a fresh start). That run still has Dad and Papacito charges from the earlier chapters. Adventure stage 3 at 60 Hz fresh starts moved from 225.4 s / 5 deaths to 209.0 s / 3. Every Adventure fresh stage stays inside 140–240 s.

Choirmaster HP stays 1140. The eggplant still fires straight (`vy` 0). `CAM_LEAD` is still 0.28. There is still no shop. `assets/cutscenes/intro_v3.mp4` is untouched.

Done: P6-1 through P6-13.
- P6-1 `snowClearZ` is 65 for every difficulty and every step rate. Nightmare stage 3 drops the trailing lecturer from zone index 4, wave index 1. Damage, minion HP, and shot multipliers stay at 1. A uniform cut flipped which rate death-spiraled.
- P6-2 Captions are `Stay away from the Colombians room.` and `Bob why is your car purple?` The mp3s are the existing files. The locked-quote test covers the eggplant line, `Die, Yetti, die!`, `Pork Chop Sandwiches!`, those two, and Dad's catchphrase. The Papacito shout is not in the tree.
- P6-3 A throw in `create()` after the title calls `showStuck`.
- P6-4 `tests/scene-boot.test.mjs` fails on a second `'shadow'` texture and on an `assemble` throw. Smoke shots use `BDB_SMOKE_DIR` and `BDB_SMOKE_GAMEPLAY`.
- P6-5 Hold and telegraph stay skipped. Skipping rush, stun, and down brought the 60 Hz Adventure stage 3 time back. `ADVENTURE_S3_DAMAGE` stays 1.
- P6-6 `separateEnemies` also skips rush, stun, down, and a live stun timer. Push stays 8 px.
- P6-7 The unused bounds argument is gone.
- P6-8 An aborted clip's held lines carry onto the new voice hold. The settle callback still receives `'abort'`.
- P6-9 `flushVoice` keeps the queue array and drops due lines in place.
- P6-10 The list now says walkers clamp to `world.bounds`, which outside an arena is the camera view.
- P6-11 Wingmen draw at alpha 0.78 and behind Bob on every lane.
- P6-12 `Let's leave before they reform.` is the first line on the victory panel. The HUD caption is cleared.
- P6-13 Story eggplant damage is 1.15. Pace 0.72, recovery 2.3, grace 0.19, and 5 hearts stay. The bot takes one death on stage 2 at every rate, plus one on stage 1 at 120 Hz, and still clears.

Deferred: painted Interventionist and Wingman bodies. A timed human playthrough. Real-device mobile frame time. Recharge-banner punctuation. Choirmaster fight numbers, still waiting on Jason. Node engine warning (`>=24` vs the suite on 22).
