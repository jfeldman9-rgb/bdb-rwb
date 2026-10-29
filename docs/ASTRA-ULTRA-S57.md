# Codex gpt-6-astra ultra S1–S7 polish

- Started at `dc2825f2a10f7a4b694d12dd08958e5d4a3d80f5` on `cursor/bdb-levels5-7`. Baseline: **379 tests passed across 53 files**, zero failures.
- Fixed DJ Halo, La Celestina, and Arch-Yetti lane tells: choose the safe lane before the tell and keep it through release. Arch-Yetti's phase III gavel now respects that lane. Boss rush warnings take priority over the previous volley.
- Show DJ Halo's threatened lanes throughout the build/drop, and align Minero's lamp with the actual shockwave. Tagger warnings and live paint now cover the full damaging width and lane; spent paint fades and loses its danger outline. Halo/wing drawings and all asset files are unchanged.
- Fixed La Celestina's repeated blink destination: advance the deterministic sequence and turn inward at arena edges, preserving 300–500 px movement.
- Keep rush contact inside the advertised strip, sweep across crossed targets, and stop travel at the promised endpoint even on a long frame. Regression coverage includes both directions at 30/60/120 Hz.
- Close Bob's 0.10-second vulnerable gap while still knocked down; keep the existing getup grace. Settle S3/S7 finishers before surviving adds can attack, release grabs on chapter clear, and preserve Arch-Yetti's defeated state.
- Correct the Tribunal's early-finisher hint to name Arch-Yetti. Show Dad as **SPENT** after the campaign allowance is exhausted, while preserving recharge and mercy behavior.
- No enemy HP, wave content, spawn cadence, stage length, or bot controls were retuned. Straight eggplants, `CAM_LEAD = 0.28`, scrolling, Choirmaster HP 1140, choir multiplier 1.28, full default `intro_v3`, dialogue limits/queueing/locked lines, Dad/Papi rules, and the absence of a shop remain intact.

## Verification

- `npm test`: **404 passed across 57 files**, zero failed/skipped/cancelled; 25 new regression tests. Includes full Adventure campaigns at 30/60/120 Hz, voice limits, resource budgets, cutscenes, and existing campaign tests. No existing test assertions were changed.
- `npm run smoke`: **full S1–S7 run passed through victory**, all 42 campaign plate runs captured, 67 screenshots, zero runtime/HTTP errors and zero missing media. Also passed full default intro selection, chapter intros, final victory clip/panel and cage removal, simultaneous touch controls, pause/resume, rotation, and graphics recovery. Browser campaign time: 1,389.97 s; clear-to-victory wait: 2.53 s.
- `node tools/bot-sim.mjs adventure 60`: **all seven fresh stages and the full campaign cleared**. Campaign **1,390.0 s**, 87 hurts, 15 deaths, 28 Papi uses, 3 Dad calls, 435 KOs, and every boss phase reached. Baseline: 1,391.0 s, 89 hurts, 15 deaths.

| Stage | Fresh start (s) | Campaign continuation (s) |
| --- | ---: | ---: |
| S1 | 165.1 | 165.1 |
| S2 | 189.2 | 187.5 |
| S3 | 208.9 | 213.3 |
| S4 | 176.7 | 177.8 |
| S5 | 195.0 | 204.2 |
| S6 | 202.1 | 213.4 |
| S7 | 209.0 | 211.0 |

- Evidence: `/tmp/bdb-astra-s57-tests.log`, `/tmp/bdb-astra-s57-bot.json`, `/tmp/bdb-astra-s57-baseline-bot.json`, `/tmp/bdb-astra-s57-smoke.log`, and `/tmp/bdb-astra-s57-smoke/`. Browser rendering uses Chromium/SwiftShader; physical-device performance is not measured.
- Work remains on the requested branch; no push, merge, or PR changes.
- Local commit was attempted with message `Codex gpt-6-astra ultra S1–S7 polish`, but Git failed before staging: `Unable to create '/workspace/bdb-astra-ultra-s57/.git/index.lock': Read-only file system`. No commit was created; HEAD remains the starting commit. The operator must stage and commit these saved changes once `.git` is writable.
