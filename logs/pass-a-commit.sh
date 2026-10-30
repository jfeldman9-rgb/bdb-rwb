#!/usr/bin/env bash
# Operator helper: run only after this workspace's Git metadata is writable.
# This never pushes, merges, opens a PR, or deploys.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
test "$(git branch --show-current)" = 'cursor/bdb-level4'
test "$(git rev-parse HEAD)" = '5beda6f497f496fe88d79258740180feeb505323'
git diff --check
git add -- \
  assets/bg/MANIFEST.json \
  assets/bg/s4-far.webp \
  assets/bg/s4-floor.webp \
  assets/bg/s4-mid0.webp \
  assets/bg/s4-mid1.webp \
  assets/bg/s4-mid2.webp \
  assets/bg/s4-mid3.webp \
  assets/bg/s4-mid4.webp \
  assets/bg/s4-mid5.webp \
  assets/chars/_pack_report.json \
  assets/chars/bouncer-0.astc.ktx \
  assets/chars/bouncer-0.etc2.ktx \
  assets/chars/bouncer-0.json \
  assets/chars/bouncer-0.webp \
  assets/chars/bouncer.anims.json \
  assets/chars/yetti_salsero-0.astc.ktx \
  assets/chars/yetti_salsero-0.etc2.ktx \
  assets/chars/yetti_salsero-0.json \
  assets/chars/yetti_salsero-0.webp \
  assets/chars/yetti_salsero.anims.json \
  docs/GPU-MEMORY.md \
  docs/LENGTH-DIFFICULTY.md \
  docs/shots/pass-a-campaign/boss.png \
  docs/shots/pass-a-campaign/browser-report.json \
  docs/shots/pass-a-campaign/gameplay.png \
  docs/shots/pass-a-campaign/intro-dad.png \
  docs/shots/pass-a-campaign/s1-mid0.png \
  docs/shots/pass-a-campaign/s1-mid1.png \
  docs/shots/pass-a-campaign/s1-mid2.png \
  docs/shots/pass-a-campaign/s1-mid3.png \
  docs/shots/pass-a-campaign/s1-mid4.png \
  docs/shots/pass-a-campaign/s1-mid5.png \
  docs/shots/pass-a-campaign/s2-mid0.png \
  docs/shots/pass-a-campaign/s2-mid1.png \
  docs/shots/pass-a-campaign/s2-mid2.png \
  docs/shots/pass-a-campaign/s2-mid3.png \
  docs/shots/pass-a-campaign/s2-mid4.png \
  docs/shots/pass-a-campaign/s2-mid5.png \
  docs/shots/pass-a-campaign/s3-mid0.png \
  docs/shots/pass-a-campaign/s3-mid1.png \
  docs/shots/pass-a-campaign/s3-mid2.png \
  docs/shots/pass-a-campaign/s3-mid3.png \
  docs/shots/pass-a-campaign/s3-mid4.png \
  docs/shots/pass-a-campaign/s3-mid5.png \
  docs/shots/pass-a-campaign/s4-mid0.png \
  docs/shots/pass-a-campaign/s4-mid1.png \
  docs/shots/pass-a-campaign/s4-mid2.png \
  docs/shots/pass-a-campaign/s4-mid3.png \
  docs/shots/pass-a-campaign/s4-mid4.png \
  docs/shots/pass-a-campaign/s4-mid5.png \
  docs/shots/pass-a-campaign/stage1.png \
  docs/shots/pass-a-campaign/stampede.png \
  docs/shots/pass-a-campaign/title.png \
  docs/shots/pass-a-campaign/touch-stage1.png \
  docs/shots/pass-a-campaign/victory.png \
  docs/shots/pass-a-campaign/wingmen.png \
  docs/shots/pass-a-stage4/boss.png \
  docs/shots/pass-a-stage4/browser-report.json \
  docs/shots/pass-a-stage4/gameplay.png \
  docs/shots/pass-a-stage4/intro-dad.png \
  docs/shots/pass-a-stage4/s4-mid0.png \
  docs/shots/pass-a-stage4/s4-mid1.png \
  docs/shots/pass-a-stage4/s4-mid2.png \
  docs/shots/pass-a-stage4/s4-mid3.png \
  docs/shots/pass-a-stage4/s4-mid4.png \
  docs/shots/pass-a-stage4/s4-mid5.png \
  docs/shots/pass-a-stage4/stage4-clear.png \
  docs/shots/pass-a-stage4/stage4.png \
  docs/shots/pass-a-stage4/stampede.png \
  docs/shots/pass-a-stage4/title.png \
  docs/shots/pass-a-stage4/touch-stage1.png \
  index.html \
  src/audio.js \
  src/bot.js \
  src/campaign.js \
  src/game-scene.js \
  src/hud.js \
  src/main.js \
  src/save.js \
  src/stage4-def.js \
  src/stages.js \
  src/story.js \
  src/voice-lines.js \
  src/yettis.js \
  src/zone-stream.js \
  tests/campaign-sim.test.mjs \
  tests/length-difficulty.test.mjs \
  tests/levels-4-7.test.mjs \
  tests/save.test.mjs \
  tests/stage4-combat.test.mjs \
  tests/stage4-scene.test.mjs \
  tests/boot.test.mjs \
  tests/voice-cues.test.mjs \
  shots/s4-mid2.png \
  shots/gameplay.png \
  shots/boss.png \
  tools/bot-sim.mjs \
  tools/browser-smoke.mjs \
  tools/compress-ktx.py \
  tools/pack-flat.py \
  tools/voice-rate.mjs
git add -f -- \
  logs/baseline-8c06396-adventure-120.json \
  logs/baseline-8c06396-adventure-30.json \
  logs/baseline-8c06396-adventure-60.json \
  logs/baseline-8c06396-nightmare-120.json \
  logs/baseline-8c06396-nightmare-30.json \
  logs/baseline-8c06396-nightmare-60.json \
  logs/baseline-8c06396-story-120.json \
  logs/baseline-8c06396-story-30.json \
  logs/baseline-8c06396-story-60.json \
  logs/baseline-8c06396-tests.txt \
  logs/pass-a-final-adventure-120.json \
  logs/pass-a-final-adventure-30.json \
  logs/pass-a-final-adventure-60.json \
  logs/pass-a-final-golden.json \
  logs/pass-a-final-locks.json \
  logs/pass-a-final-nightmare-120.json \
  logs/pass-a-final-nightmare-30.json \
  logs/pass-a-final-nightmare-60.json \
  logs/pass-a-final-smoke-campaign.txt \
  logs/pass-a-final-smoke-stage4.txt \
  logs/pass-a-final-story-120.json \
  logs/pass-a-final-story-30.json \
  logs/pass-a-final-story-60.json \
  logs/pass-a-final-tests.txt \
  logs/pass-a-final-voice-stage4-60.json
git diff --cached --check
git commit -m 'feat: BDB Stage 4 - Codex gpt-6-astra ultra Pass A' -m 'Add the afterparty stage, Salsero and Bouncer, painted plates, caption-only dialogue, and regression evidence. Preserve locked legacy behavior. Record two unchanged locked-test conflicts in LENGTH-DIFFICULTY.md.'
git status --short
git log -1 --format='%h %s'
