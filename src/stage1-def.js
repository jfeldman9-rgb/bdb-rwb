// Waves are RWB-style [type, side, delay]: 'R' stands in the arena's right half, 'L' steps in at Bob's back.
// Zones 1–3 keep the Muse teaching beats on their first two waves (see story.js TUTORIALS); 4–5 test them.
export const STAGE1 = Object.freeze({ no: 1, key: 'boulevard', title: 'BOULEVARD OF BETTER JUDGMENT', bg: 'chapter1-boulevard', hpScale: 2.2,
  zones: [
    { at: 260, l: 0, r: 1280, waves: [
      [['walker','R',0],['walker','R',1.2],['walker','R',2.6]],
      [['walker','R',0],['guard','R',.6],['walker','R',2.2]],
      [['walker','R',0],['guard','R',1],['walker','L',2.4]] ] },
    { at: 1500, l: 1280, r: 2560, shakes: true, waves: [
      [['hover','R',0],['walker','R',1],['walker','L',2.4]],
      [['charger','R',0],['walker','R',.8],['walker','L',2]],
      [['hover','R',0],['charger','R',1.6],['guard','R',3]] ] },
    { at: 2800, l: 2560, r: 3840, dad: true, spawnGap: 90, waves: [
      [['choir','R',0],['walker','R',0],['walker','R',0],['guard','R',0]],
      [['charger','L',0],['hover','R',.8],['walker','R',1.6],['walker','L',2.8]],
      [['guard','R',0],['choir','R',1],['lecturer','L',2],['charger','R',3]] ] },
    { at: 4080, l: 3840, r: 5120, waves: [
      [['lecturer','R',0],['walker','R',.6],['walker','L',1.8]],
      [['guard','R',0],['hover','R',1],['charger','L',2.2]],
      [['choir','R',0],['lecturer','R',.8],['walker','L',1.6],['walker','R',2.6]] ] },
    { at: 5360, l: 5120, r: 6400, waves: [
      [['charger','R',0],['charger','L',1.4],['walker','R',2.4]],
      [['guard','R',0],['lecturer','L',.8],['hover','R',1.6],['charger','L',2.6],['walker','R',3.4]],
      [['choir','R',0],['guard','R',.6],['charger','L',1.8],['hover','R',2.8],['walker','L',3.6]] ] },
  ], boss: { at: 6700, l: 6480, r: 7760, type: 'interventionist', name: 'THE INTERVENTIONIST' }, next: 2 });
