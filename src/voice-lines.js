import { registerLines, setVoiceFiles } from './audio.js';
import { STORY } from './story.js';
// Stable casting IDs for later rendering; these are local roles, not paid provider IDs.
export const VOICE_ROLES = Object.freeze({Bob:'bdb-bob-warm-baritone',Claudia:'bdb-claudia-colombian',Dad:'bdb-dad-boston',Yetti:'bdb-yetti-comic',Wingman:'bdb-wingman-council',Narrator:'jason-indextts',Runners:'bdb-papi-adult-chorus'});
export const LINES = {
 bdb_open:['Bob','I brought the eggplant.'],bdb_produce:['Bob','Die, Yetti, die!'],bdb_laugh:['Bob','Ha! Dead!'],
 claudia_open:['Claudia','Bob. Winged Yettis locked me in Moonlit Keep.'],claudia_question:['Claudia','Is that what I think it is?'],claudia_leave:['Claudia',"Let's leave before they reform."],
 yetti_turnback:['Yetti','Turn back Papi!'],choir_serious:['Choir Yetti','Papi, be serious.'],lecturer_intervention:['Lecturer','This is an intervention.'],wingman_council:['Wingman','The council denies this rescue.'],
 nar_intro_01:['Narrator','This is Bob. Big Dick Bob, to his friends. And to most of his enemies.'],
 nar_intro_02:['Narrator','Bob and his ex are on again. Or off again. Nobody, including Bob, is sure.'],
 nar_intro_03:['Narrator',"Then there's Claudia. The Colombian. It's… complicated."],nar_kidnap:['Narrator','Heaven, it turns out, has opinions. And Yettis. With wings.'],
 nar_ch1:['Narrator','Chapter One. The Boulevard of Better Judgment.'],nar_ch2:['Narrator','Chapter Two. The Celestial Intervention.'],nar_ch3:['Narrator',"Chapter Three. Claudia's Moonlit Keep."],nar_victory:['Narrator','And Bob? Bob was, briefly, a man of good judgment.'],
 dad_call_01:['Dad','Bobby! Get behind me, kid!'],dad_call_02:['Dad','Yettis? In this economy? Get outta heah!'],dad_call_03:['Dad','Wicked big swattah, wicked small bird-bums.'],dad_done_01:['Dad','Call ya mothah.'],dad_done_02:['Dad',"BDB, baby. It's on the swattah."],dad_catchphrase:['Dad',STORY.dad],
 papi_chorus:['Runners','Papi! Papi! PAPI!'],bob_papi_01:['Bob','Not now, ladies!'],
 bob_hurt_01:['Bob','Oof!'],bob_hurt_02:['Bob','Ow!'],bob_hurt_03:['Bob','Ugh!'],bob_respawn_01:['Bob','I\'m back, baby!'],bob_dadwait_01:['Bob','Dad! Now!'],bob_papiwait_01:['Bob','Need the ladies!'],
 wingman_phase2:['Wingman','This is a divine performance review.'],wingman_phase3:['Wingman','Two wingmen. One terrible plan.'],wingman_defeat:['Wingman',"We'll… reform."],interventionist_intro:['Interventionist',"Bob. We all love you. That's why we're here."],choirmaster_intro:['Choirmaster','From the top! And-a-one, and-a—'],
};
export const PRESENT = ["bdb_open", "bdb_produce", "bdb_laugh", "claudia_open", "claudia_question", "claudia_leave", "yetti_turnback", "choir_serious", "lecturer_intervention", "wingman_council", "dad_call_01", "dad_call_02", "dad_call_03", "dad_done_01", "dad_done_02", "dad_catchphrase", "papi_chorus", "bob_papi_01", "bob_hurt_01", "bob_hurt_02", "bob_hurt_03", "bob_respawn_01", "bob_dadwait_01", "bob_papiwait_01", "wingman_phase2", "wingman_phase3", "wingman_defeat", "interventionist_intro", "choirmaster_intro"];
export const stageLines = n => Object.keys(LINES).filter(id=>!/^nar_ch/.test(id)||id===`nar_ch${n}`);
export function registerVoiceLines(){registerLines(LINES);setVoiceFiles(Object.keys(LINES),PRESENT);}
