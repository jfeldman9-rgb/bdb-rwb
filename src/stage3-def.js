// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE3 = Object.freeze({ no: 3, key: 'keep', title: "CLAUDIA'S MOONLIT KEEP", bg: 'chapter3-castle', hpScale: 2.2, pace: 1.15,
  zones: [
    { at: 260, l: 0, r: 1280, waves: [
      [['walker','R',0],['lecturer','R',.8],['hover','L',2]],
      [['guard','R',0],['charger','L',1.2],['walker','R',2.2]],
      [['choir','R',0],['lecturer','R',.8],['walker','L',1.8]] ] },
    { at: 1500, l: 1280, r: 2560, waves: [
      [['guard','R',0],['choir','R',.6],['charger','L',1.6]],
      [['hover','R',0],['hover','L',1],['lecturer','R',2]],
      [['charger','R',0],['guard','L',1],['walker','R',2],['walker','L',3]] ] },
    { at: 2800, l: 2560, r: 3840, waves: [
      [['hover','R',0],['guard','R',.6],['lecturer','L',1.4],['walker','R',2.2]],
      [['choir','R',0],['charger','R',.8],['charger','L',1.8]],
      [['lecturer','R',0],['lecturer','L',1],['hover','R',2],['guard','R',3]] ] },
    { at: 4080, l: 3840, r: 5120, waves: [
      [['choir','R',0],['guard','R',.4],['hover','L',1.2],['walker','R',2.2]],
      [['charger','R',0],['lecturer','L',.8],['charger','R',1.8],['hover','L',2.8]],
      [['guard','R',0],['guard','L',1],['choir','R',1.8],['walker','L',2.8]] ] },
    { at: 5360, l: 5120, r: 6400, waves: [
      [['hover','R',0],['hover','L',.8],['lecturer','R',1.6],['charger','L',2.4]],
      [['choir','R',0],['guard','R',.6],['charger','L',1.4],['lecturer','R',2.4]],
      [['guard','R',0],['choir','R',.8],['hover','L',1.6],['lecturer','R',2.4],['charger','L',3.2],['walker','R',4]] ] },
  ], boss: { at: 6700, l: 6480, r: 7760, type: 'wingman', name: 'THE WINGMEN' }, next: null });
