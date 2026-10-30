# Codex gpt-6.1-sol hardening Pass A

Worktree: `/workspace/bdb-sol4`, branch `cursor/bdb-level4`, starting HEAD `7d42b1916e9767af1a31f821f482a7fb7b927551`. Node 24.10.0. No push, merge, PR change, deployment, or paid service.

Fixed a Bouncer phase gate losing its roar/adds when shield-break or mash stun was still active. The regression failed before the fix and passes at both gates, both stun sources, and 30/60/120 Hz. No balance values changed. Salsero behavior, existing cage reset, final-stage assumptions, voice rate and GPU budgets were checked; no further gameplay retuning was needed.

Added stage1–stage4 intro keys without replacing legacy entries. Title/chapter-select plays its opener once; campaign loads emit stage keys before narration. Adjacent intro/kidnap requests share a sequence so neither is superseded and narration stays held. Synchronous media refusal no longer leaves an inactive input handle. Stage 1 video/poster/alias are copied exactly from the provided source; Stage 2–4 videos are absent and gracefully skip. Existing error/stall/skip paths and listener/timer/media cleanup are covered. All cutscene media stays lazy; browser verification confirms none is downloaded on the title.

Verification:

- `npm test`: 283 pass / 0 fail (starting tip: 268 pass).
- `npm run smoke`: pass, all four stages and 24 plate captures, 753.8 s campaign.
- `npm run smoke -- --from=4`: pass, six plate captures, 176.8 s clear.
- Both smokes also verify real Stage 1 intro playback and keyboard skip; missing Stage 2–4 recovery; S2/S4 kidnap retention; S3 cage-to-S4 restart; touch, pause and graphics recovery. Zero unexpected runtime/HTTP errors; six expected optional-media 404s per run.
- All nine difficulty/rate bot runs clear S4 and the campaign. S1–S3 full result objects and campaign times match baseline exactly in all nine.
- Adventure S4 fresh at 30/60/120 Hz: 175.0 / 176.8 / 175.2 s, hits 8/7/7, deaths 1/0/1; continuation 185.2 / 177.8 / 171.5 s.
- Story S4 fresh: 158.5 / 162.3 / 157.6 s; Nightmare: 247.8 / 259.6 / 238.8 s. Story 30 Hz changed because the Bouncer now completes its formerly cancelled gate.
- S4 voice: 3.28 ambient/min, 6.56 total/min, minimum ambient gap 8.000 s. BARK unchanged.
- S4 GPU: 8.987930 MiB ASTC / 35.951721 MiB RGBA, within 12/48 limits.
- Locked-file diff empty except the four authorized STAGE_CLIPS additions. 122 existing assets match baseline; Stage 4 bg/chars unchanged from the starting tip. Choir and S3 Nightmare blocks unchanged; existing media byte-identical.

Screenshots and browser JSON: `/workspace/bdb-sol4-run/sol-smoke-campaign/`, `/workspace/bdb-sol4-run/sol-smoke-stage4/`. Full measurements and changes: `docs/LENGTH-DIFFICULTY.md` and `logs/sol-hardening-*`.

Remaining gaps: missing Stage 2–4 intro media (intentional), Salsero/Bouncer placeholder art, caption-only S4 voices, Story above the proposed target, physical iPhone performance unverified. Adventure acceptance passes without retuning. Run `bash logs/sol-hardening-commit.sh` if the sandbox prevents staging/commit; it checks the branch and starting HEAD, stages only the listed changes/evidence, and never pushes.

Local commit attempt was blocked before staging: `fatal: Unable to create '/workspace/bdb-sol4/.git/index.lock': Read-only file system`. HEAD remains `7d42b1916e9767af1a31f821f482a7fb7b927551`. The operator commit script is ready at `logs/sol-hardening-commit.sh` with the required Codex gpt-6.1-sol hardening Pass A message.
