# BDB dialogue fix — 2026-10-30

Branch: `cursor/bdb-dialogue-fix`; baseline: `bf8ca97`. No audio was generated, no paid API was used, and no audio files, locked captions, IDs, or manifests were changed.

## Root causes and changes

`Campaign.emit('voice')` sent player actions through `offerVoice`. A full 8-second / 3-per-60-second gate dropped optional Papacito refusals and Bob's finisher brag. Crowd occupied the same-frame slot, so the brag always lost. The existing `papi_chorus` recording was never requested.

`Campaign.papiVoice()` now sends a normal scene `voice` event with `bypass: 'papacito'`, directly to the existing scene `say()` / music-ducking path. It neither stamps nor resets the campaign gate. This is restricted to Papacito action responses:

- No protein: `bob_papiwait_01`; empty crowd / premature finisher: `bob_papi_01`.
- Successful stampedes rotate `papi_crowd_01`, `papi_crowd_02`, and the existing `papi_chorus`.
- Finishers arm `bob_papacito_01/02` for 2.5 seconds later, after the current crowd recordings (about 2.43 seconds). The scheduled bypass survives chapter loading. Presentation also queues the brag if the crowd is still loading or sounding.

Refusal/crowd/chorus presentation interrupts busy narration. Approved campaign dialogue waits behind a sounding Papacito clip instead of being discarded by the audio policy. The ordinary rolling budget keeps advancing throughout; no Papacito cooldown blocks future budget slots. Dad's movie ownership and budgeted fallback speech are unchanged.

Ambient barks previously advanced a separate scheduler even when the campaign gate could not present them. Reserved Yetti/produce/choir offers then accumulated with Dad, chapter and boss speech. Repeated crowd requests also occupied this queue. Now the bark scheduler checks the campaign gate before committing a presentation, admits fresh ambient candidates only when the durable queue is empty and an opening is at most eight seconds away, and retains already-admitted locked offers. Set-pieces and chapter changes still transfer held locked quotes to the durable queue. Existing boss-moment supersession is unchanged.

Ambient group selection rotates after the initial priority order. Where requests are retried once a combat second, rather than only at wave starts; successful Cory and purple-car chance rolls wait for admission instead of being lost. Hurt/laugh retain their combat triggers. The durable queue continues to flush every update, including during set-pieces and after victory. Scheduled lines use the same timing tolerance as the gate so a bark cannot take an opener's slot one floating-point tick early.

## Before / after, Adventure at 60 Hz

Fresh-stage `runVoiceRate({ stage, hz: 60 })`, default seed `0xbd28`. The baseline was rerun locally and exactly reproduced the reported numbers. “Total” below retains the original tool's combat-only counting: dialogue accepted during Papacito/Dad frames and after victory is excluded. After totals also exclude explicitly marked player bypass events. Queues are sampled at clear for stages 1–6; stage 7 includes the final panel drain.

| Stage | Combat s | Before total | Before/min | After gated total | After gated/min | Queue before → after | After min gap | After max/60s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 152.4 | 9 | 3.54 | 9 | 3.54 | 13 → 3 | 8.0 | 3 |
| 2 | 178.2 | 11 | 3.70 | 11 | 3.70 | 11 → 2 | 8.0 | 3 |
| 3 | 199.4 | 12 | 3.61 | 12 | 3.61 | 16 → 5 | 8.0 | 3 |
| 4 | 168.8 | 9 | 3.20 | 9 | 3.20 | 15 → 5 | 8.0 | 3 |
| 5 | 173.0 | 10 | 3.47 | 10 | 3.47 | 13 → 4 | 8.0 | 3 |
| 6 | 184.9 | 12 | 3.90 | 12 | 3.90 | 12 → 4 | 8.0 | 3 |
| 7 | 195.5 | 11 | 3.38 | 11 | 3.38 | 0 → 0 | 8.0 | 3 |

All seven runs pass `rollingOk`. Before minimum gaps were also 8 seconds and maximum rolling counts were 3. All legal fresh-stage slots are occupied (0/8/16, 60/68/76, etc.); the baseline already filled these slots. The increase comes from immediate player VO and replacing queued crowd/ambient repetition with scripted delivery, not raising the locked cap. Three early lines can still leave a 44-second wait for the rolling window.

To compare everything delivered before stage clear, the next table includes budgeted speech during Dad/Papacito and adds the player bypass events. It excludes the post-clear/finale drain on both sides. Rates use the reported combat seconds; tiny rounding differences from the tool are possible. These are **accepted dialogue events**, including caption-only entries, not a claim that every event has a recorded clip.

| Stage | Before events | After gated events | Player bypass events | After combined | Before/min | After combined/min |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 9 | 9 | 4 | 13 | 3.54 | 5.12 |
| 2 | 11 | 11 | 3 | 14 | 3.70 | 4.71 |
| 3 | 12 | 12 | 6 | 18 | 3.61 | 5.42 |
| 4 | 10 | 10 | 3 | 13 | 3.55 | 4.62 |
| 5 | 10 | 10 | 3 | 13 | 3.47 | 4.51 |
| 6 | 12 | 12 | 3 | 15 | 3.89 | 4.87 |
| 7 | 12 | 12 | 5 | 17 | 3.68 | 5.22 |

`voiceAt`, `minVoiceGap`, `maxIn60s`, and `rollingOk` count only ordinary campaign authorizations. `playerAt`, `playerCounts`, and `playerTriggered` separately expose Papacito bypasses; `allCounts` includes both. This prevents a crowd/brag pair from falsely failing the ambient/scripted cap check. These are simulation authorization timestamps; audio presentation can wait for an already-sounding clip.

In the seeded full campaign, Where now plays three times and Cory twice; produce, all three locked Yetti quote families, hurt, laugh, turnback, choir and armed chapter lines still appear. Fresh-stage simulations remain script-heavy because Dad/boss/chapter lines get the available budget first. The full campaign drains its final queue to zero; the final-stage panel drain falls from 285.8 seconds to 105.8 seconds. Reserved speech may still continue after combat ends.

### Remaining thin spots and unused recordings

Stage 4 remains the largest audible gap: `claudia_s4` and `bob_s4` have captions but no MP3/PRESENT entry. Local inspection also found `nar_ch4` and every Bouncer line (`bouncer_intro`, `bouncer_grab`, `bouncer_phase2`, `bouncer_phase3`, `bouncer_defeat`) absent from PRESENT and disk. These caption-only requests still consume the campaign budget. In the fresh Stage 4 trace, five of ten budgeted events have no audio; the three new player callouts do have existing recordings. No recordings were invented or relabeled.

Stages 5 and 7 remain relatively sparse in the original combat-only metric (3.47 and 3.38/min), despite filling legal budget slots. Stages 1–6 can still finish with 2–5 reserved lines waiting. Those lines survive chapter transitions; adding more ambient requests would worsen their delay. Chapter/boss lines can still arrive later than their trigger under the locked cap.

`papi_chorus` is now wired. The on-disk `papi_chorus_01/02/03` remain unused and outside PRESENT; `_01` is the manifest's alias of `papi_chorus`, and `_02/03` are alternate existing performances. They are candidates for a later manifest/caption registration pass, not rendered or enabled here.

Proposed text only, **not implemented or rendered**:

- First record the existing Stage 4 captions, including Claudia's “Bob! Not again!”, Bob's “Again? Seriously?”, chapter narration, and Bouncer beats.
- Bob, Stage 4: “Claudia, I'm getting us out of this club.”
- Bob, Stage 5: “Nobody said rescue came with a cover charge.”
- Bob, Stage 7: “Objection. I brought my own evidence.”

Any additional recorded lines must replace or rotate existing ambient opportunities under the same cap, rather than create another reserved backlog. The eight locked quotes remain verbatim.

## Verification

- Unit/regression suite: `npm test` — 448 passed, zero failed. Covers saturated-gate refusal/success, all three cheer choices, a durable finisher brag, WebAudio playback/queueing, global chapter/ending continuity at 30/60/120 Hz, reserved-quote survival, and every stage's 60 Hz rolling limits/queue size.
- `npm run smoke` — passed: full browser campaign, touch controls, pause/graphics recovery, chapter/movie transitions and final victory; zero unexpected runtime/HTTP errors or missing media. Screenshots are in `/workspace/bdb-dialogue-fix-run/browser-smoke/`.
- `node tools/bot-sim.mjs adventure 60` — all seven fresh stages and full campaign cleared. Stage times: 165.5 / 190.3 / 216.6 / 181.0 / 185.1 / 197.0 / 207.7 s. Full campaign: 1410.6 s, 19 deaths, 28 Papacito uses, 3 Dad calls.
- Eggplant `vy=0`, `CAM_LEAD=0.28`, Choirmaster HP 1140, choir multiplier 1.28, intro_v3 default, stage length, halos/wings and lack of upgrade shop are unchanged; the full existing suite passes.

Reproduce the requested per-stage measurements:

```sh
node --input-type=module <<'JS'
import { runVoiceRate } from './tools/voice-rate.mjs';
for (let stage = 1; stage <= 7; stage++) {
  console.log(JSON.stringify(runVoiceRate({ stage, hz: 60 })));
}
JS
```

Raw before/after traces and verification logs are saved in `/workspace/bdb-dialogue-fix-run/` for this run.
