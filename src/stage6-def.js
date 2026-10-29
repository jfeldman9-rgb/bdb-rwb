// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE6 = Object.freeze({ no: 6, key: 'salt', title: 'THE SALT MINE AFTERHOURS', bg: 's6-mid5', hpScale: 2.2, pace: 1.20,
  zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['minero','R',0],['walker','R',.8],['walker','L',2]],
    [['tagger','R',0],['guard','R',1],['walker','L',2.2]],
    [['lecturer','R',0],['minero','L',1],['hover','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['minero','R',0],['minero','R',.8],['charger','L',1.8]],
    [['choir','R',0],['tagger','L',.6],['walker','R',1.6]],
    [['hover','R',0],['guard','L',1],['tagger','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['choir','R',0],['minero','R',.6],['charger','L',1.4],['tagger','R',2.2]],
    [['lecturer','R',0],['lecturer','L',1],['minero','R',2]],
    [['guard','R',0],['hover','R',.8],['charger','L',1.8],['walker','R',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['tagger','R',0],['minero','L',.6],['guard','R',1.4],['walker','L',2.4]],
    [['charger','R',0],['charger','L',1],['tagger','R',2],['hover','R',3]],
    [['choir','R',0],['lecturer','R',.6],['minero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['minero','R',0],['minero','L',.8],['tagger','R',1.6],['charger','L',2.4]],
    [['choir','R',0],['guard','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['guard','R',0],['minero','R',.8],['tagger','L',1.6],['lecturer','R',2.4],['charger','L',3.2],['walker','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'celestina', name: 'LA CELESTINA' }, next: 7 });
