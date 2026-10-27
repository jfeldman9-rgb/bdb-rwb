export const STAGE2 = Object.freeze({ no: 2, key: 'clouds', title: 'THE CELESTIAL INTERVENTION', bg: 'chapter2-clouds',
  zones: [
    { at: 260, l: 0, r: 1280, waves: [['lecturer','walker'],['hover','hover']] },
    { at: 1500, l: 1280, r: 2560, waves: [['choir','charger','hover'],['guard','guard']] },
    { at: 2800, l: 2560, r: 3840, waves: [['walker','hover','charger','choir','lecturer']], shakes: true },
  ], boss: { at: 4140, l: 3920, r: 5200, type: 'choirmaster', name: 'THE CHOIRMASTER' }, next: 3 });
