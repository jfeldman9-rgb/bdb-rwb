// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE7 = Object.freeze({ no: 7, key: 'tribunal', title: 'THE PAPACITO TRIBUNAL', bg: 's7-mid5', hpScale: 2.2, pace: 1.22,
  zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['bailiff','R',0],['walker','R',.8],['walker','L',2]],
    [['minero','R',0],['hover','R',1],['walker','L',2.2]],
    [['guard','R',0],['lecturer','L',1],['bailiff','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['choir','R',0],['bailiff','R',.6],['walker','L',1.6]],
    [['minero','R',0],['minero','L',1],['hover','R',2]],
    [['lecturer','R',0],['guard','L',.8],['bailiff','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['bailiff','L',0],['choir','R',.6],['charger','R',1.4],['hover','L',2.2]],
    [['minero','L',0],['lecturer','R',1],['minero','R',2]],
    [['guard','L',0],['bailiff','R',.8],['charger','R',1.8],['walker','L',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['minero','R',0],['bailiff','L',.6],['hover','R',1.4],['walker','L',2.4]],
    [['charger','R',0],['charger','L',1],['lecturer','R',2],['guard','R',3]],
    [['choir','R',0],['bailiff','R',.6],['minero','L',1.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['bailiff','R',0],['bailiff','L',.8],['minero','R',1.6],['charger','L',2.4]],
    [['choir','R',0],['guard','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['guard','R',0],['minero','R',.8],['bailiff','L',1.6],['lecturer','R',2.4],['minero','L',3.2],['bailiff','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'archyetti', name: 'THE ARCH-YETTI' }, next: null });
