export const GUN = Object.freeze({ speed: 680, interval: .2, damage: 12, band: 56, bonkRange: 90 });
export function createShot(bob, multiplier = 1) {
  return { x: bob.x + bob.facing * 58, y: bob.y - bob.z - 150, gy: bob.y, dir: bob.facing,
    vx: bob.facing * GUN.speed, vy: 0, damage: GUN.damage * multiplier, alive: true, age: 0 };
}
export function fireGun(gun, dt, held, bob, enemies, multiplier = 1) {
  gun.cooldown = Math.max(0, (gun.cooldown || 0) - dt);
  if (!held || bob.busy || !bob.alive || gun.cooldown > 1e-8) return null;
  gun.cooldown = GUN.interval; bob.shootTime = .22;
  const target = enemies.filter(e => e.alive && e.canBeHit !== false && Math.abs(e.y - bob.y) < GUN.band && (e.x - bob.x) * bob.facing >= 0 && Math.abs(e.x - bob.x) < GUN.bonkRange)
    .sort((a,b) => Math.abs(a.x-bob.x) - Math.abs(b.x-bob.x))[0];
  return { shot: target ? null : createShot(bob, multiplier), bonk: target || null, damage: GUN.damage * multiplier };
}
export function stepShot(shot, dt, enemies, hit, camX = 0, width = 1280) {
  const oldX = shot.x; shot.x += shot.vx * dt; shot.vy = 0; shot.age += dt;
  const targets = enemies.filter(e => e.alive && e.canBeHit !== false && Math.abs(e.y - shot.gy) < GUN.band &&
    e.x >= Math.min(oldX, shot.x) - 30 && e.x <= Math.max(oldX, shot.x) + 30).sort((a,b) => (a.x - b.x) * shot.dir);
  if (targets.length) { hit(targets[0], shot.damage, shot.dir, false); shot.alive = false; }
  if (shot.x < camX - 200 || shot.x > camX + width + 200 || shot.age > 3) shot.alive = false;
}
