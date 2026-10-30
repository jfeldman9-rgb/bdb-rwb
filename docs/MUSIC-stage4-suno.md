# Stage 4 Suno prompts (Afterparty Relapse)

Jason runs these in Suno (Custom Mode). Do **not** spend ElevenLabs music credits.
Target files once downloaded: `assets/audio/music/stage4.mp3`, `assets/audio/music/boss4.mp3`
(Pass A still maps `stage4`/`boss4` to `bdb-rise.mp3` until Jason drops the new MP3s.)

## Reference: existing `bdb-rise.mp3` (analyze before generate)

| Property | Measured / noted |
|---|---|
| Source | Suno (`comment` tag: made with suno; created 2026-07-29; id `280184d3-8426-47fb-b873-76a2d6e876e8`) |
| Length | ~262.6 s (4:22), stereo 48 kHz ~176 kbps |
| Tempo | **~136 BPM** (stable across 10–180 s windows; top candidate 136, secondary 129) |
| Spectrum | Presence + air heavy (guitar/vox/bright synths), solid kick/bass — comic **action-rock anthem**, not dark EDM |
| Role in game | Every stage/boss id currently streams this one file (`src/audio.js`) |
| Wanted for S4 | **Similar song** to bdb-rise: same style / energy / instrumentation / swagger, **new** composition. Neon afterparty / salsa-club flavor as seasoning only — do not flip into pure salsa or timba. |

Suno settings (both cues):
- **Custom Mode**, English lyrics, **Male vocals** (confident comic swagger, not crooner)
- Style strength: high similarity to an energetic comic action-rock game theme
- Aim **loop-friendly** ~90–120 s (trim later to ≤90 s @ 128 kbps mp3 if needed)
- Exclude: whispery lo-fi, trap 808s, pure salsa orchestra, ballad, chiptune, metal scream

---

## Cue A — Stage loop (`stage4`)

**Working title:** *Afterparty Relapse*

### Style prompt (paste in Style of Music)

```
Energetic comic action-rock game anthem, ~136 BPM, same family as a swaggering side-scroller theme: punchy kick, bright electric guitars, handclap backbeat, tight bass, male gang vocals, neon nightlife energy, light Latin percussion accents (conga/shaker seasoning only), brass stabs sparingly, high presence and air, loopable chorus, fun and cocky not dark, Medellín afterparty vibe without becoming pure salsa
```

### Lyrics (paste in Lyrics)

```
[Intro - drums + guitar stab]
One A-M and the neon's still screaming
Rescue party rolling back into the street

[Verse]
Calle de la Rumba, wet pavers and heat
Yettis in the velvet rope cutting the beat
Claudia gone again — they snatched her mid-toast
Bob loads the eggplant, Dad's already toast

[Pre-chorus]
Mirror ball spinning, orquesta on fire
Salsero hop, lane to lane, higher and higher

[Chorus]
Afterparty relapse — we don't go home!
Papacito rising through the smoke and chrome
Hold the line, shoot straight, keep the women at bay
Big Dick Bob's dancing through the fray

[Verse 2]
Club door queue, "SALSA ETERNA" in pink
Clipboard Yetti says we ain't on the list — think
Back-alley chiva, brass and confetti rain
Eggplant fires true — say the name again

[Chorus]
Afterparty relapse — we don't go home!
Papacito rising through the smoke and chrome
Hold the line, shoot straight, keep the women at bay
Big Dick Bob's dancing through the fray

[Bridge - half-time then lift]
Stay away from the Colombians room
Pork chop sandwiches under the moon
Die, Yetti, die — then back to the groove
Claudia's waiting — we still got a move

[Final chorus - bigger]
Afterparty relapse — we don't go home!
Papacito rising through the smoke and chrome
One more stage, one more fight, one more night to save
Big Dick Bob — dance us out the grave

[Outro - loop-friendly]
Rumba — rumba — rise
```

### Notes for Jason
- Generate 2 takes; pick the one closest to **bdb-rise** swagger (not the salsa-heavy one).
- If Suno leans too salsa, regenerate with style append: `more rock guitar, less salsa brass, same 136 BPM comic anthem`.
- Trim dead air; export mp3; drop as `assets/audio/music/stage4.mp3`.

---

## Cue B — Boss: The Bouncer (`boss4`)

**Working title:** *Not On The List*

### Style prompt (paste in Style of Music)

```
Same comic action-rock family as the stage theme and bdb-rise, ~136–140 BPM, heavier and meaner: bigger kick, distorted rhythm guitars, aggressive male vocals, brass stabs like a door slam, short tense breakdowns, velvet-rope nightclub tension, still fun swagger not horror, high energy boss fight loop, presence-forward mix, loopable
```

### Lyrics (paste in Lyrics)

```
[Intro - stomp + brass hit]
Clipboard up — velvet rope — nine feet tall
You're not on the list — you're not on the list at all

[Verse]
Rooftop VIP, city lights below
Bouncer Yetti grinning like he owns the show
Shield that clipboard, three hits break the board
Dash the rope grab — mash, then unload

[Pre-chorus]
Phase two charge — red tell in the dark
Salsero walkers pouring through the park

[Chorus]
You're not on the list! (not on the list!)
Papacito rising — clinch your fist
Stomp shockwave left, stomp shockwave right
Die, Yetti, die — finish this night

[Verse 2]
Phase three re-shield, twelve seconds of pain
Guard and charger, salsero in the lane
Eggplant flies straight — camera holds the lead
Bob's still dancing — Claudia's still the need

[Chorus]
You're not on the list! (not on the list!)
Papacito rising — clinch your fist
Stomp shockwave left, stomp shockwave right
Die, Yetti, die — finish this night

[Bridge - spoken swagger over drums]
I brought the eggplant
Hold on Claudia — Papacito is coming
It's eggplant time

[Final chorus - biggest]
You're not on the list! — we crash the gate anyway
Afterparty boss — we don't walk away
Big Dick Bob — rooftop VIP
Cut the rope — set Claudia free

[Outro - hard loop end]
Not — on — the — list
```

### Notes for Jason
- Should feel like **bdb-rise with the gloves off**, not a new genre.
- Keep locked Bob lines sung/spoken exactly as written in the bridge.
- Export mp3 → `assets/audio/music/boss4.mp3`.

---

## Wiring (after Jason drops files)

Pass A already adds `stage4`/`boss4` ids pointing at `bdb-rise.mp3`. When new files exist, point those ids at `assets/audio/music/stage4.mp3` and `boss4.mp3` only — do not retarget stages 1–3. Ask before any paid re-render.
