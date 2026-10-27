# Step 2 asset provenance

`tools/pack-flat.py`, invoked by `tools/make-placeholders.mjs`, reads local sources only. No generation service or paid API is used.

- Bob: original 720×600 RGBA frames from `/workspace/bdb-art/sprites/_v1`; idle 6, walk 6, shoot 4, hurt 3, knockdown 4, getup 4. Canvas metadata is 720×600, baseline 570. The artwork's feet are approximately y=560. The root also contains later optical-flow interpolations; those are intentionally not packed.
- Yetti 1 → `yetti_walker`, Yetti 2 → `yetti_guard`: idle 6, walk 8, attack 4, hurt 3, knockdown 4. Hover, charger and choir reuse the first atlas with tints; Lecturer reuses the second. Hover collision remains on the shadow lane.
- Every other §5.1 key has a locally drawn, coloured silhouette atlas. Dad has a BDB swatter plus a larger in-engine swatter overlay. PAPI runners are fully clothed adult silhouettes with four colour variants. Claudia and the bosses await final art.
- All atlases are trimmed, paged at up to 2048×2048, and carry source rectangles and animation holds. No normal maps are required. Shared character pages survive stage transitions; obsolete boss pages and backgrounds are released.
- Packet `chapter1-boulevard.webp`, `chapter2-clouds.webp`, `chapter3-castle.webp` and `astra-keep.webp` are stretched to 1280×720. Chapter 3 currently uses the chapter3-castle plate; astra-keep is packed for later composition.
- Packet opening/victory MP4s are copied without alteration. JPG posters are extracted locally. Chapter 2/3 entry, kidnap, boss intro and Dad video variants are deferred; chapter cards and an in-engine Dad actor work now.
- Packet `bdb-rise.mp3` supplies the placeholder music. The ten packet voice files are copied with the IDs in BUILD-PLAN §5.4. All planned lines are registered in `src/voice-lines.js`; unrecorded lines caption without fetching missing audio. Stable local casting-role IDs are reserved there for the later ElevenLabs/IndexTTS pass. No provider voice ID or cloned voice has been rendered in Step 2.
- Dad's `dad_catchphrase` caption is exactly Jason's locked line. It replaces the plan's tentative catchphrase for the actual call-in.
- The excluded console portrait is never read or copied.

`tests/fixtures/packet-rules.js` preserves the four requested packet rules, with TypeScript annotations removed. `tests/packet-parity.test.mjs` checks byte-for-byte function-body parity against the implementation. Shop logic and its tests were deliberately excluded from the port.
