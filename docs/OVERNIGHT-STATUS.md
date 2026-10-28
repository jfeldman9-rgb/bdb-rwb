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
