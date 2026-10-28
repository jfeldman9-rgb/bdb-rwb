export const DIFFICULTIES = Object.freeze({
  story: { label: 'Story', pace: .72, damage: 1.15, recovery: 2.3, grace: .19, hearts: 5 },
  adventure: { label: 'Adventure', pace: 1, damage: 1, recovery: 1.35, grace: .13, hearts: 3 },
  nightmare: { label: 'Nightmare', pace: 1.22, damage: .8, recovery: .85, grace: .09, hearts: 3 },
});
export function resolveDifficulty(key, beaten = false, touch = false) {
  return Object.hasOwn(DIFFICULTIES, key) && (key !== 'nightmare' || beaten) ? key : touch ? 'story' : 'adventure';
}
