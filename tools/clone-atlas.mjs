// Clone a packed donor atlas under a new key so stand-ins have valid KTX pages.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const [,, donor, dest, ...pairs] = process.argv;
if (!donor || !dest) {
  console.error('usage: node tools/clone-atlas.mjs <donor> <dest> [from:to ...]');
  process.exit(1);
}
const chars = new URL('../assets/chars/', import.meta.url);
for (const suffix of ['-0.webp', '-0.json', '-0.astc.ktx', '-0.etc2.ktx']) {
  copyFileSync(new URL(`${donor}${suffix}`, chars), new URL(`${dest}${suffix}`, chars));
}
const anims = JSON.parse(readFileSync(new URL(`${donor}.anims.json`, chars), 'utf8'));
const byName = Object.fromEntries(anims.anims.map(anim => [anim.name.slice(donor.length + 1), anim]));
anims.pages = anims.pages.map(page => page.replace(donor, dest));
anims.source = `stand-in cloned from ${donor}`;
anims.placeholder = true;
if (pairs.length) {
  anims.anims = pairs.map(pair => {
    const [from, to] = pair.split(':');
    const src = byName[from];
    if (!src) throw new Error(`${donor} has no ${from}`);
    return { ...src, name: `${dest}_${to}` };
  });
} else {
  anims.anims = anims.anims.map(anim => ({ ...anim, name: anim.name.replace(donor, dest) }));
}
writeFileSync(new URL(`${dest}.anims.json`, chars), JSON.stringify(anims, null, 2));
console.log(dest, '<-', donor, anims.anims.map(a => a.name).join(', '));
