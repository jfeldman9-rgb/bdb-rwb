import { clamp } from './config.js';

/** One definition per attack: used for both warning graphics and contact. */
export const ATTACK = Object.freeze({
  melee: Object.freeze({ kind: 'melee', reach: 95, halfH: 35, zMax: 65, sweep: 0 }),
  rush: Object.freeze({ kind: 'rush', reach: 70, halfH: 34, zMax: 70, sweep: 70 }),
});

export function attackSpec(e) {
  const lunge = !!(e?.lunge || e?.type === 'salsero');
  const rushing = e?.state === 'rush' || e?.mode === 'rush' || e?.type === 'charger' || lunge;
  return rushing ? ATTACK.rush : ATTACK.melee;
}

/** Forward interval [origin, origin+dir*reach] plus an optional far-end sweep pad. */
export function attackSpan(origin, dir, reach, sweep = 0, bounds) {
  const sign = dir >= 0 ? 1 : -1;
  const far = origin + sign * (reach + sweep);
  let x0 = Math.min(origin, far), x1 = Math.max(origin, far);
  if (bounds) {
    x0 = clamp(x0, bounds.l, bounds.r);
    x1 = clamp(x1, bounds.l, bounds.r);
  }
  return { x0, x1 };
}

export function attackBox(e, world, spec = attackSpec(e)) {
  const bounds = world?.bounds;
  const dir = e.rushDir || e.facing || -1;
  const y = e.warnY ?? e.attackY ?? e.y;
  const origin = e.warnFrom != null ? (dir >= 0 ? Math.min(e.warnFrom, e.warnTo ?? e.warnFrom) : Math.max(e.warnFrom, e.warnTo ?? e.warnFrom)) : e.x;
  if (spec.kind === 'rush' && e.warnFrom != null && e.warnTo != null) {
    const farPad = spec.sweep * dir;
    let x0 = Math.min(e.warnFrom, e.warnTo + farPad);
    let x1 = Math.max(e.warnFrom, e.warnTo + farPad);
    if (bounds) {
      x0 = clamp(x0, bounds.l, bounds.r);
      x1 = clamp(x1, bounds.l, bounds.r);
    }
    return { x0, x1, y, halfH: spec.halfH, zMax: spec.zMax, dir, kind: spec.kind, spec };
  }
  const span = attackSpan(e.x, dir, spec.reach, spec.sweep, bounds);
  return { x0: span.x0, x1: span.x1, y, halfH: spec.halfH, zMax: spec.zMax, dir, kind: spec.kind, spec };
}

export function warningRect(plan, bounds) {
  const spec = plan.spec || (plan.kind === 'rush' ? ATTACK.rush : ATTACK.melee);
  const dir = plan.dir || -1;
  const far = plan.to + dir * spec.sweep;
  let x0 = Math.min(plan.from, far);
  let x1 = Math.max(plan.from, far);
  if (bounds) {
    x0 = clamp(x0, bounds.l, bounds.r);
    x1 = clamp(x1, bounds.l, bounds.r);
  }
  const halfH = plan.halfH ?? spec.halfH;
  return { x: x0, y: plan.y - halfH, w: Math.max(0, x1 - x0), h: halfH * 2 };
}

export function pointInAttack(box, x, y, z = 0) {
  if (!box) return false;
  if (Math.abs(y - box.y) >= box.halfH) return false;
  if (z >= box.zMax) return false;
  if (x < box.x0 - 1e-6 || x > box.x1 + 1e-6) return false;
  if (box.kind === 'melee') {
    const along = (x - (box.dir >= 0 ? box.x0 : box.x1)) * (box.dir || 1);
    if (along < -1e-6) return false;
  }
  return true;
}

export function meleeHits(e, b) {
  const spec = ATTACK.melee;
  const dir = e.rushDir || e.facing || -1;
  const along = (b.x - e.x) * dir;
  return along >= -1e-6 && along < spec.reach
    && Math.abs(b.y - (e.attackY ?? e.y)) < spec.halfH
    && b.z < spec.zMax;
}

export function rushHits(e, b, prevX) {
  const spec = ATTACK.rush;
  if (e.warnFrom != null && e.warnTo != null) {
    const dir = e.rushDir || e.facing || -1;
    const along = (b.x - e.warnFrom) * dir;
    // Contact never extends behind the warning's origin or beyond its end cap.
    if (along < 0 || along > (e.warnTo - e.warnFrom) * dir + spec.sweep) return false;
  }
  const hitX = b.x >= Math.min(prevX, e.x) - spec.sweep && b.x <= Math.max(prevX, e.x) + spec.sweep;
  return hitX && Math.abs(b.y - e.y) < spec.halfH && b.z < spec.zMax;
}
