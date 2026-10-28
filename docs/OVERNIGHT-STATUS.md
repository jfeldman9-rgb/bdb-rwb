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

`1eb6f3a` did not boot. `src/game-scene.js` imported `./shot-feel.js`, which was never committed, and `bindRotatePause` (`src/rotate-block.js`) and `noteRenderer` (`src/perf.js`) were imported without exports (the behaviour-test commit called them, the exports stayed in the working tree). A clean checkout of that SHA was 179/184. The 192/192 figure above was that dirty tree, not the pushed commit. `FX.slowmo` / `FX.hitstop` were still written and never read, and hostile knockback still used the projectile's x. This follow-up commits `src/shot-feel.js`, `tests/presentation.test.mjs`, those two exports, and a zero-dependency `package-lock.json` so `npm ci` can run. FX no longer stores slow-mo or hit-stop. A hostile hit calls `hurtBob(false, null, p.dir)`. Choirmaster numbers and `assets/cutscenes/intro_v3.mp4` are unchanged.
