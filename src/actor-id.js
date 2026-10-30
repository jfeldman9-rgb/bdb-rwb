// Actor identity is independent of per-scene KO/parity counters.
let next = 1;
export function actorId() { return next++; }
/** Each Campaign starts its own id space so prior runs cannot change combat order. */
export function resetActorIds() { next = 1; }
