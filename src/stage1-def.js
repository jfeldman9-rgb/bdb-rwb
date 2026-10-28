export const STAGE1 = Object.freeze({ no: 1, key: 'boulevard', title: 'BOULEVARD OF BETTER JUDGMENT', bg: 'chapter1-boulevard',
  zones: [
    { at: 260, l: 0, r: 1280, waves: [['walker','walker'],['walker','guard']] },
    { at: 1500, l: 1280, r: 2560, waves: [['hover','walker'],['charger','walker']], shakes: true },
    { at: 2800, l: 2560, r: 3840, waves: [['choir','walker','walker','guard']], dad: true, spawnGap: 90 },
  ], boss: { at: 4140, l: 3920, r: 5200, type: 'interventionist', name: 'THE INTERVENTIONIST' }, next: 2 });
