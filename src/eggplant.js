import { isBossBragging } from './wingman.js';

export const GUN = Object.freeze({ speed: 680, interval: .2, damage: 12, band: 56, bonkRange: 90 });
/** Visual hurt slab: from the sprite feet (y - z) up `body` pixels. Tall enough that a combat jump still clips the torso; a shot that clears the silhouette misses. Shot half-height is the eggplant ellipse. */
export const HURT = Object.freeze({ body: 270, shot: 10 });
export function hurtRange(e) {
  const feet = (e.y || 0) - (e.z || 0);
  return { top: feet - HURT.body, bottom: feet };
}
export function overlapsHurt(shotY, e) {
  const { top, bottom } = hurtRange(e);
  return shotY + HURT.shot > top && shotY - HURT.shot < bottom;
}
export function muzzleY(bob) { return bob.y - bob.z - 150; }
export function createShot(bob, multiplier = 1) {
  return { x: bob.x + bob.facing * 58, y: muzzleY(bob), gy: bob.y, dir: bob.facing,
    vx: bob.facing * GUN.speed, vy: 0, damage: GUN.damage * multiplier, alive: true, age: 0 };
}
function inLane(ay, by) { return Math.abs(ay - by) < GUN.band; }
export function fireGun(gun, dt, held, bob, enemies, multiplier = 1) {
  gun.cooldown = Math.max(0, (gun.cooldown || 0) - dt);
  if (!held || bob.busy || !bob.alive || gun.cooldown > 1e-8) return null;
  gun.cooldown = GUN.interval; bob.shootTime = .22;
  bob.shootPulse = (bob.shootPulse || 0) + 1;
  let target = null, best = Infinity;
  const facing = bob.facing;
  const muzzle = muzzleY(bob);
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive || e.canBeHit === false && !isBossBragging(e)) continue;
    if (!inLane(e.y, bob.y) || !overlapsHurt(muzzle, e)) continue;
    const dx = (e.x - bob.x) * facing;
    if (dx < 0 || dx >= GUN.bonkRange) continue;
    const dist = Math.abs(e.x - bob.x);
    if (dist < best) { best = dist; target = e; }
  }
  return { shot: target ? null : createShot(bob, multiplier), bonk: target || null, damage: GUN.damage * multiplier };
}
export function stepShot(shot, dt, enemies, hit, camX = 0, width = 1280) {
  if (!shot.alive) return;
  const oldX = shot.x; shot.x += shot.vx * dt; shot.vy = 0; shot.age += dt;
  let target = null, clang = null;
  const forward = shot.dir >= 0;
  let best = forward ? Infinity : -Infinity;
  const x0 = Math.min(oldX, shot.x) - 30, x1 = Math.max(oldX, shot.x) + 30;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    if (!inLane(e.y, shot.gy) || e.x < x0 || e.x > x1 || !overlapsHurt(shot.y, e)) continue;
    if (e.canBeHit === false) {
      if (e.boss && (!clang || (forward ? e.x < clang.x : e.x > clang.x))) clang = e;
      continue;
    }
    if (forward ? e.x < best : e.x > best) { best = e.x; target = e; }
  }
  // Preserve pass-through (especially a floored Wingman's partner), but make
  // the invulnerable beat audible once per shot. A nearer hit stops the sweep.
  if (clang && !shot.clanged && (!target || (forward ? clang.x <= target.x : clang.x >= target.x))) {
    hit(clang, 0, shot.dir, false); shot.clanged = true;
  }
  if (target) { hit(target, shot.damage, shot.dir, false); shot.alive = false; }
  if (shot.x < camX - 200 || shot.x > camX + width + 200 || shot.age > 3) shot.alive = false;
}
