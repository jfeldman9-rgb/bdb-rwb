import { registerLines, setVoiceFiles } from './audio.js';
import { STORY } from './story.js';
import { BARK_LINES, BARK_IDS } from './bark-packs.js';
// Stable casting IDs for later rendering; these are local roles, not paid provider IDs.
export const VOICE_ROLES = Object.freeze({Bob:'bdb-bob-warm-baritone',Claudia:'bdb-claudia-colombian',Dad:'bdb-dad-boston',Yetti:'bdb-yetti-comic',Wingman:'bdb-wingman-council',Narrator:'jason-indextts',Runners:'bdb-papi-adult-crowd',Crowd:'bdb-papi-adult-crowd'});
export const LINES = {
 nar_ch4:['Narrator','Chapter Four. The Afterparty Relapse.'],
 claudia_s4:['Claudia','Bob! Not again!'],bob_s4:['Bob','Again? Seriously?'],
 bouncer_intro:['Bouncer',"You're not on the list, Papi."],bouncer_grab:['Bouncer',"You're not on the list."],bouncer_phase2:['Bouncer','The rope comes out now.'],
 bouncer_phase3:['Bouncer',"Club's closed. Forever."],bouncer_defeat:['Bouncer',"Fine. You're on the list."],
 nar_ch5:['Narrator','Chapter Five. The Gondola of No Return.'],
 claudia_s5:['Claudia','Bob! Up here! The cable car!'],bob_s5:['Bob','Going up, Yettis!'],
 dj_intro:['DJ Halo','Hands up for heaven! Not you, Bob.'],dj_phase2:['DJ Halo','Let me scratch that.'],
 dj_phase3:['DJ Halo','Wait for it… the DROP!'],dj_defeat:['DJ Halo','Mic… dropped.'],
 nar_ch6:['Narrator','Chapter Six. The Salt Mine Afterhours.'],
 bob_s6:['Bob','Down we go.'],
 celestina_intro:['La Celestina','Ay, Bob. I found her a nice Yetti husband.'],
 claudia_s6:['Claudia','I am NOT marrying a Yetti!'],
 celestina_phase2:['La Celestina','Something borrowed… something YOU.'],
 celestina_phase3:['La Celestina','Everyone! To the altar!'],
 celestina_defeat:['La Celestina','Fine! Marry the eggplant man!'],
 nar_ch7:['Narrator','Chapter Seven. The Papacito Tribunal.'],
 bob_s7:['Bob',"Court's in session, Yetti!"],
 archyetti_intro:['Arch-Yetti','Bob. This court finds you… not a Papacito.'],
 archyetti_phase2:['Arch-Yetti','The verdict is snow.'],
 archyetti_phase3:['Arch-Yetti','Order! ORDER in my court!'],
 archyetti_defeat:['Arch-Yetti','The court… is adjourned.'],
 claudia_s7:['Claudia','Took you long enough, Papacito.'],
 dad_s7:['Dad',"That's my boy! Wicked big Papacito!"],
 bdb_open:['Bob','I brought the eggplant.'],bdb_produce:['Bob','Die, Yetti, die!'],bdb_laugh:['Bob','Ha! Dead!'],
 claudia_open:['Claudia','Bob. Winged Yettis locked me in Moonlit Keep.'],claudia_question:['Claudia','Is that what I think it is?'],claudia_leave:['Claudia',"Let's leave before they reform."],
 yetti_turnback:['Yetti','Turn back Papi!'],choir_serious:['Choir Yetti','Papi, be serious.'],lecturer_intervention:['Lecturer','This is an intervention.'],wingman_council:['Wingman','The council denies this rescue.'],
 nar_intro_01:['Narrator','This is Bob. Big Dick Bob, to his friends. And to most of his enemies.'],
 nar_intro_02:['Narrator','Bob and his ex are on again. Or off again. Nobody, including Bob, is sure.'],
 nar_intro_03:['Narrator',"Then there's Claudia. The Colombian. It's… complicated."],nar_kidnap:['Narrator','Heaven, it turns out, has opinions. And Yettis. With wings.'],
 nar_ch1:['Narrator','Chapter One. The Boulevard of Better Judgment.'],nar_ch2:['Narrator','Chapter Two. The Celestial Intervention.'],nar_ch3:['Narrator',"Chapter Three. Claudia's Moonlit Keep."],nar_victory:['Narrator','And Bob? Bob was, briefly, a man of good judgment.'],
 dad_call_01:['Dad','Bobby! Get behind me, kid!'],dad_call_02:['Dad','Yettis? In this economy? Get outta heah!'],dad_call_03:['Dad','Wicked big swattah, wicked small bird-bums.'],dad_done_01:['Dad','Call ya mothah.'],dad_done_02:['Dad',"BDB, baby. It's on the swattah."],dad_catchphrase:['Dad',STORY.dad],
 papi_chorus:['Runners','Papi! Papi! PAPI!'],papi_crowd_01:['Crowd','We love you Papacito! Pick me!'],papi_crowd_02:['Crowd','We love you Papacito! Pick me!'],bob_papi_01:['Bob','Not now, ladies!'],
 bob_hurt_01:['Bob','Oof!'],bob_hurt_02:['Bob','Ow!'],bob_hurt_03:['Bob','Ugh!'],bob_respawn_01:['Bob','I\'m back, baby!'],bob_dadwait_01:['Bob','Dad! Now!'],bob_papiwait_01:['Bob','Need the ladies!'],
 wingman_phase2:['Wingman','This is a divine performance review.'],wingman_phase3:['Wingman','Two wingmen. One terrible plan.'],wingman_defeat:['Wingman',"We'll… reform."],interventionist_intro:['Interventionist',"Bob. We all love you. That's why we're here."],choirmaster_intro:['Choirmaster','From the top! And-a-one, and-a—'],
 bob_papacito_01:['Bob',"I'm the Papacito!"],bob_papacito_02:['Bob',"I'm the Papacito!"],
 bob_where_claudia_01:['Bob','Where is Claudia???'],bob_where_claudia_02:['Bob','Where is Claudia???'],
 bob_cory_joke_01:['Bob','Why does Cory like guys?'],bob_cory_joke_02:['Bob','Why does Cory like guys?'],
 yetti_porkchop_01:['Yetti','Pork Chop Sandwiches!'],yetti_porkchop_02:['Yetti','Pork Chop Sandwiches!'],
 yetti_colombian_room_01:['Yetti','Stay away from the Colombians room.'],yetti_colombian_room_02:['Yetti','Stay away from the Colombians room.'],
 yetti_purple_car_01:['Yetti','Bob why is your car purple?'],yetti_purple_car_02:['Yetti','Bob why is your car purple?'],
 ...BARK_LINES,
};
export const PRESENT = ["bdb_open", "bdb_produce", "bdb_laugh", "claudia_open", "claudia_question", "claudia_leave", "yetti_turnback", "choir_serious", "lecturer_intervention", "wingman_council", "dad_call_01", "dad_call_02", "dad_call_03", "dad_done_01", "dad_done_02", "dad_catchphrase", "papi_chorus", "papi_crowd_01", "papi_crowd_02", "bob_papi_01", "bob_hurt_01", "bob_hurt_02", "bob_hurt_03", "bob_respawn_01", "bob_dadwait_01", "bob_papiwait_01", "wingman_phase2", "wingman_phase3", "wingman_defeat", "interventionist_intro", "choirmaster_intro", "nar_intro_01", "nar_intro_02", "nar_intro_03", "nar_kidnap", "nar_ch1", "nar_ch2", "nar_ch3", "nar_victory", "bob_papacito_01", "bob_papacito_02", "bob_where_claudia_01", "bob_where_claudia_02", "bob_cory_joke_01", "bob_cory_joke_02", "yetti_porkchop_01", "yetti_porkchop_02", "yetti_colombian_room_01", "yetti_colombian_room_02", "yetti_purple_car_01", "yetti_purple_car_02", "bob_s5", "bob_s6", "bob_s7", "claudia_s5", "claudia_s6", "claudia_s7", "dad_s7", "dj_intro", "dj_phase2", "dj_phase3", "dj_defeat", "celestina_intro", "celestina_phase2", "celestina_phase3", "celestina_defeat", "archyetti_intro", "archyetti_phase2", "archyetti_phase3", "archyetti_defeat", "nar_ch5", "nar_ch6", "nar_ch7", ...BARK_IDS];
export const stageLines = n => Object.keys(LINES).filter(id=>!/^nar_ch/.test(id)||id===`nar_ch${n}`);
export function registerVoiceLines(){registerLines(LINES);setVoiceFiles(Object.keys(LINES),PRESENT);}
