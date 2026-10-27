export const STAGE3 = Object.freeze({ no: 3, key: 'keep', title: "CLAUDIA'S MOONLIT KEEP", bg: 'chapter3-castle',
  zones: [
    { at: 260, l: 0, r: 1280, waves: [['walker','lecturer','hover']] },
    { at: 1500, l: 1280, r: 2560, waves: [['guard','choir','charger']] },
    { at: 2800, l: 2560, r: 3840, waves: [['hover','guard','lecturer','walker']], shakes: true },
  ], boss: { at: 4140, l: 3920, r: 5200, type: 'wingman', name: 'THE WINGMEN' }, next: null });
