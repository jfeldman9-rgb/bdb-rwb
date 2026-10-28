// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE2 = Object.freeze({ no: 2, key: 'clouds', title: 'THE CELESTIAL INTERVENTION', bg: 'chapter2-clouds', hpScale: 2.2, pace: 1.1,
  zones: [
    { at: 260, l: 0, r: 1280, waves: [
      [['lecturer','R',0],['walker','R',.8],['walker','L',2]],
      [['hover','R',0],['hover','R',1.2],['walker','L',2.4]],
      [['guard','R',0],['lecturer','L',1],['walker','R',2.2]] ] },
    { at: 1500, l: 1280, r: 2560, waves: [
      [['choir','R',0],['charger','R',.6],['hover','R',1.6]],
      [['guard','R',0],['guard','R',.8],['walker','L',2]],
      [['charger','L',0],['lecturer','R',1],['hover','R',2.2],['walker','L',3.2]] ] },
    { at: 2800, l: 2560, r: 3840, waves: [
      [['walker','R',0],['hover','R',.6],['charger','L',1.4],['choir','R',2]],
      [['lecturer','R',0],['lecturer','L',1.2],['guard','R',2.4]],
      [['hover','R',0],['hover','L',.8],['charger','R',1.8],['walker','R',2.8]] ] },
    { at: 4080, l: 3840, r: 5120, waves: [
      [['choir','R',0],['guard','R',.4],['walker','L',1.4],['walker','R',2.4]],
      [['charger','R',0],['charger','L',1],['lecturer','R',2],['hover','R',3]],
      [['guard','R',0],['hover','L',1],['lecturer','R',1.8],['walker','L',2.8]] ] },
    { at: 5360, l: 5120, r: 6400, waves: [
      [['choir','R',0],['choir','R',.8],['walker','L',1.6],['charger','R',2.4]],
      [['lecturer','L',0],['guard','R',.6],['hover','R',1.6],['charger','L',2.6]],
      [['guard','R',0],['choir','R',.8],['lecturer','L',1.6],['hover','R',2.4],['charger','L',3.4]] ] },
  ], boss: { at: 6700, l: 6480, r: 7760, type: 'choirmaster', name: 'THE CHOIRMASTER' }, next: 3 });
