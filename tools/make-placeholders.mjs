// Reproducible local assets only; no network or image generation services.
import { execFileSync } from 'node:child_process';
execFileSync('python3', ['tools/pack-flat.py', ...process.argv.slice(2)], { stdio: 'inherit' });
