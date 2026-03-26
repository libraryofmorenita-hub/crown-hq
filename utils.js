// ═══ UTILS ════════════════════════════════════════════════
// Crown HQ — utils.js

function bPlaceholder(id){

  inject('<div class="ph"><div><div class="ph-tag">'+id+'</div><div class="ph-title"><em>Coming Soon</em></div></div></div><div class="pb"><div class="edit-hint" style="margin-top:1rem">This section is under construction. Switch on Edit Mode to customize.</div></div>');
}

// ═══ EDIT MODE ════════════════════════════════════════════════

var EM_TYPES={
  amelia:{'timeline':'dashboard','sponsor':'sponsors','look':'looks','brand':'brand','oath':'dashboard','ns':'dashboard','goal':'dashboard','goalcur':'dashboard','goalcur':'dashboard','goaltar':'dashboard','workout':'workouts','appt':'appointments'},
  laneea:{'sponsor':'sponsors','look':'looks','appt':'appointments'},
  trainer:{'workout':'workouts'},
  hmu:{'look':'looks'},
};


function toggleEM(){
  S.emActive=!S.emActive;
  document.body.classList.toggle('em',S.emActive);
  var btn=g('em-btn');
  if(btn){btn.classList.toggle('on',S.emActive);btn.textContent=S.emActive?'Exit Edit Mode':'Edit Mode';}
  if(S.emActive) applyEM();
}


function applyEM(){

function commitE(el){
  var key=el.getAttribute('data-e');
  var val=el.textContent.trim();
  if(!key)return;
