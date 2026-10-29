// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE5 = Object.freeze({ no: 5, key: 'cable', title: 'THE GONDOLA OF NO RETURN', bg: 's5-mid5', hpScale: 2.2, pace: 1.18,
  zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['tagger','R',0],['walker','R',.8],['walker','L',2]],
    [['salsero','R',0],['hover','R',1],['tagger','L',2.2]],
    [['guard','R',0],['lecturer','L',1],['walker','R',2]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['tagger','R',0],['tagger','R',.8],['charger','L',1.8]],
    [['choir','R',0],['salsero','L',.6],['walker','R',1.6]],
    [['guard','R',0],['hover','L',1],['salsero','R',1.8],['walker','L',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['charger','R',0],['tagger','R',.6],['salsero','L',1.4],['hover','R',2.2]],
    [['lecturer','R',0],['lecturer','L',1],['tagger','R',2]],
    [['choir','R',0],['guard','R',.8],['charger','L',1.8],['walker','R',2.8]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['tagger','R',0],['salsero','L',.6],['guard','R',1.4],['walker','L',2.4]],
    [['hover','R',0],['hover','L',1],['charger','R',2],['tagger','R',3]],
    [['choir','R',0],['lecturer','R',.6],['salsero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['tagger','R',0],['tagger','L',.8],['charger','R',1.6],['salsero','L',2.4]],
    [['guard','R',0],['choir','R',.6],['lecturer','L',1.4],['hover','R',2.4]],
    [['charger','R',0],['salsero','L',.8],['tagger','R',1.6],['guard','R',2.4],['lecturer','L',3.2],['hover','R',4]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'dj', name: 'DJ HALO' }, next: null });
