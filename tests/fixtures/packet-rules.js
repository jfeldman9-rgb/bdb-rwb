// Read-only packet rules.ts reference; only TypeScript annotations stripped.
export function applyBossDamage(phase, hp, amount) {
  const safeHp = Math.max(0, Number.isFinite(hp) ? hp : 0);
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const floor = phase === 3 ? 1 : 0;
  const nextHp = Math.max(floor, safeHp - safeAmount);
  return { hp: nextHp, removed: Math.max(0, safeHp - nextHp) };
}

export function isBossFinisherReady(
  phase,
  bosses,
) {
  if (phase !== 3) return false;
  let live = 0;
  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    if (!boss?.alive) continue;
    if (boss.hp > 1) return false;
    live++;
  }
  return live >= 1;
}

export function collectShake(
  shakeRemainder,
  charges,
  hearts,
  shakeHeal,
) {
  let nextRemainder = Math.max(0, Math.floor(shakeRemainder)) + 1;
  let nextCharges = Math.max(0, Math.floor(charges));
  if (nextRemainder >= 3) {
    nextRemainder = 0;
    nextCharges = Math.min(2, nextCharges + 1);
  }
  return {
    shakeRemainder: nextRemainder,
    charges: nextCharges,
    hearts: shakeHeal ? Math.min(3, Math.max(0, Math.floor(hearts)) + 2) : Math.max(0, Math.floor(hearts)),
  };
}

export function canActivatePapacito(
  phase,
  bosses,
  charges,
) {
  if (charges <= 0) return { allowed: false, finisher: false, charges };
  const finisher = isBossFinisherReady(phase, bosses);
  if (phase === 3 && bosses.some((boss) => boss.alive) && !finisher) {
    return { allowed: false, finisher: false, charges };
  }
  return { allowed: true, finisher, charges: charges - 1 };
}
