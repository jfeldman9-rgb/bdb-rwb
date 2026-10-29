// See stage1-def.js for the [type, side, delay] wave format.
export const STAGE4 = Object.freeze({ no: 4, key: 'rumba', title: 'THE AFTERPARTY RELAPSE', bg: 's4-mid5', hpScale: 2.2, pace: 1.17,
  zones: [
  { at: 260, l: 0, r: 1280, waves: [
    [['walker','R',0],['salsero','R',.8],['walker','L',2]],
    [['guard','R',0],['salsero','L',1],['hover','R',2.2]],
    [['lecturer','R',0],['salsero','R',.8],['walker','L',1.8]] ] },
  { at: 1500, l: 1280, r: 2560, waves: [
    [['salsero','R',0],['salsero','L',.6],['choir','R',1.6]],
    [['charger','R',0],['guard','R',1],['walker','L',2]],
    [['hover','R',0],['salsero','L',.8],['lecturer','R',1.8],['walker','R',2.8]] ] },
  { at: 2800, l: 2560, r: 3840, waves: [
    [['choir','R',0],['salsero','R',.6],['salsero','L',1.4],['guard','R',2.2]],
    [['charger','L',0],['hover','R',.8],['lecturer','R',1.8]],
    [['walker','R',0],['walker','L',.8],['salsero','R',1.6],['charger','R',2.6]] ] },
  { at: 4080, l: 3840, r: 5120, waves: [
    [['guard','R',0],['salsero','L',.6],['hover','R',1.4],['walker','L',2.4]],
    [['lecturer','R',0],['charger','L',1],['salsero','R',2]],
    [['choir','R',0],['guard','R',.6],['salsero','L',1.6],['walker','R',2.6]] ] },
  { at: 5360, l: 5120, r: 6400, waves: [
    [['salsero','R',0],['salsero','L',.8],['charger','R',1.6],['hover','L',2.4]],
    [['choir','R',0],['lecturer','R',.6],['guard','L',1.4],['salsero','R',2.4]],
    [['guard','R',0],['charger','L',.8],['walker','R',1.6],['hover','R',2.4],['lecturer','L',3.2],['walker','R',4],['walker','R',5]] ] },
], boss: { at: 6700, l: 6480, r: 7760, type: 'bouncer', name: 'THE BOUNCER' }, next: 5 });

