#!/usr/bin/env bash
set -euo pipefail
cd /workspace/bdb-sol4
if [ "$(git branch --show-current)" != 'cursor/bdb-level4' ]; then
  echo 'Refusing to commit on a different branch.' >&2
  exit 1
fi
if [ "$(git rev-parse HEAD)" != '7d42b1916e9767af1a31f821f482a7fb7b927551' ]; then
  echo 'HEAD changed; review the hardening changes before committing.' >&2
  exit 1
fi
git add -- src/campaign.js src/cutscene-hooks.js src/cutscene.js src/game-scene.js src/main.js src/title-flow.js src/yettis.js tests/clip-hold.test.mjs tests/cutscene-cap.test.mjs tests/media.test.mjs tests/title-flow.test.mjs tests/stage-intros.test.mjs tests/stage4-hardening.test.mjs tools/browser-smoke.mjs docs/LENGTH-DIFFICULTY.md assets/cutscenes/stage1_intro.mp4 assets/cutscenes/stage1_intro.jpg assets/cutscenes/stage1_intro_poster.jpg
git add -f -- logs/sol-hardening-commit.sh logs/sol-hardening-report.md logs/sol-hardening-verify-locks.py logs/sol-hardening-locks.json logs/sol-hardening-golden.json logs/sol-hardening-tests.txt logs/sol-hardening-voice-stage4-60.json logs/sol-hardening-smoke-campaign.txt logs/sol-hardening-smoke-stage4.txt logs/sol-hardening-adventure-30.json logs/sol-hardening-adventure-60.json logs/sol-hardening-adventure-120.json logs/sol-hardening-story-30.json logs/sol-hardening-story-60.json logs/sol-hardening-story-120.json logs/sol-hardening-nightmare-30.json logs/sol-hardening-nightmare-60.json logs/sol-hardening-nightmare-120.json
git diff --cached --check
git commit -m 'Codex gpt-6.1-sol hardening Pass A: stage intros and Bouncer gate safety'
