# BDB-RWB Step 2 status — IMPLEMENTED

Step 1's design plan is retained in BUILD-PLAN.md. Jason's later locked answers override its tentative Bob walk count, shop and Dad catchphrase choices.

Step 2.1–2.10 and the campaign-related Step 4 items are implemented locally: BDB boot/title, real Bob/Yetti atlases, silhouette placeholders, five-action input, Bob controller, horizontal eggplant gun, six enemy roles, packet Papacito rules, Dad, three stages, both mini-bosses, three-phase Wingmen, HUD, difficulty, checkpoints, saves and campaign bot. The same simulation runs under Phaser and Node.

Verification uses Node 24, the complete unit/simulation suite, and Chromium/SwiftShader with screenshots in `docs/shots/`. The browser smoke also checks actual simultaneous touch events, fresh-device Story default, portrait rotation, pause, graphics loss/restoration, and keyboard skipping of the inline opening video. Full results and the implementation commit are recorded in `logs/STEP2-REPORT.md`.

Deviations and later work:

- Bob walk is six original frames, as Jason specified. The `_v1` originals were used instead of the interpolated root frames. No frames were invented for Bob.
- Upgrade shop and its fields/UI are omitted. Old fields are discarded by save normalization.
- Flat lighting ships by default; normal maps and bloom are not needed.
- Dad uses the in-engine one-swat actor. The packed atlas is a single swat, and v1 does not add a second. Dad video variants and new voice recordings remain deferred.
- Chapter cards substitute for new chapter-entry, kidnap and boss-intro videos. Packet opening/victory clips work now.
- Pure combat models are separated from the Phaser Fighter presentation so the campaign tests exercise actual gameplay. Shared character textures stay resident; obsolete stage-specific pages are released.
- The compact campaign has not been tuned to the plan's 5–8 human minutes per chapter. Human pacing, audio/art polish and final casting need the subsequent content/review pass.
- Physical iPhone Safari testing, a real-device 60-second video, and hardware p95 ≤16.7 ms measurements remain unverified. Chromium touch emulation and software-rendered screenshots are available.
- Muse and Argon reviews have not been performed or claimed.

Local `main` only. No remote, push, PR, npm install, paid API, Tinyfish, Claude Fable/extra usage, Seedance or Manus. Packet/art/RWB references were only read.

### Art follow-up (same day)
- Repacked from `/workspace/bdb-art/sprites/` per `FPS.md` (dedupe HOLDs, scale 0.38, Stage-1 GPU <20 MiB).
- Codex Astra session did not consume the queued art update; pack applied by Grok Bot after Codex exit.
