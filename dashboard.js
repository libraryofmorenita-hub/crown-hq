// ═══ DASHBOARD ════════════════════════════════════════════════
// Crown HQ — dashboard.js

function bDash(){

function bPlaceholderDash(role,ns,first){
  var dmb=(S.dashMood&&S.dashMood[role])||[];
  inject(
    '<div style="padding:1.35rem 1.75rem">' +
    '<div class="ph-ns"><div class="ph-ns-q">'+ns+'</div><div class="ph-ns-sub">'+ROLES[role].name+'</div></div>' +
    '<div class="card" style="margin:.85rem 0">' +
    '<div class="cl">Focus for Today</div>' +
    '<div class="edit-hint">Switch on Edit Mode to customize this section for your role.</div>' +
    '<div style="margin-top:.75rem">'+first+'</div>' +
    '</div>' +
    '<div class="card" style="margin:.85rem 0"><div class="cl">My To-Do</div>' + renderTodos(role) + '</div>' +
    '<div class="card"><div class="cl">My Board</div>' + renderDashMood(role) + '</div>' +
    '</div>'
  );
}



function openGoalEditor(){

function addGoalRow(){
  var list=g('goal-editor-list');if(!list)return;
  var i=list.children.length;

function removeGoalRow(i){var el=g('grow-'+i);if(el)el.remove();}

function saveGoals(){
  var list=g('goal-editor-list');if(!list)return;

function bLaneaDash(){
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  bPlaceholderDash('laneea',
    '"Every room Amelia walks into, she\'s already won it."',
    '<div class="g3">' +
    '<div class="stat st-ch"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>' +
    '<div class="stat st-tz"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='meeting';}).length+'</div><div class="sl">Meetings Set</div></div>' +
    '<div class="stat st-bl"><div class="sn">'+S.appts.length+'</div><div class="sl">Appointments</div></div>' +
    '</div>'
  );
}


function bHMUDash(){
  bPlaceholderDash('hmu',
    '"Beauty that has a story worth telling."',
    '<div style="background:var(--tz);border-radius:11px;padding:1.25rem">' +
    [
      {date:'Jul 10',ev:'Day 1 — Interview',look:'Natural, professional'},
      {date:'Jul 11',ev:'Day 2 — Swimsuit',look:'Glowing, beach-ready'},
      {date:'Jul 12',ev:'Day 3 — Evening Gown',look:'Full glam updo'},
    ].map(function(t){
      return '<div style="display:grid;grid-template-columns:48px 1fr;gap:.75rem;padding:.55rem 0;border-bottom:1px solid rgba(240,216,152,.07)">' +
        '<span style="font-family:var(--fm);font-size:.58rem;color:var(--ch2)">'+t.date+'</span>' +
        '<div><div style="font-size:.82rem;font-weight:600;color:var(--wh)">'+t.ev+'</div><div style="font-size:.72rem;color:var(--ch)">'+t.look+'</div></div></div>';
    }).join('') +
    '</div>'
  );
}


function bTrainerDash(){
  bPlaceholderDash('trainer',
    '"Train like an athlete. Move like an artist."',
    '<div class="g3">' +
    '<div class="stat st-sg"><div class="sn">'+S.workouts.length+'</div><div class="sl">Plans Set</div></div>' +
    '<div class="stat st-ch"><div class="sn">July 10</div><div class="sl">Competition</div></div>' +
    '<div class="stat st-tz"><div class="sn">Foundation</div><div class="sl">Phase</div></div>' +
    '</div>'
  );
}


function bSponsorPortal(){
  inject(
    '<div style="padding:0">' +
    '<div style="background:var(--tz);padding:2rem 1.75rem">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:4px;color:rgba(240,216,152,.35);text-transform:uppercase;margin-bottom:.5rem">Sponsor Portal</div>' +
    '<div style="font-family:var(--fd);font-size:1.8rem;font-style:italic;color:var(--ch);margin-bottom:.65rem">You are not sponsoring a pageant.<br>You are funding a platform.</div>' +
    '<div style="font-size:.82rem;line-height:1.8;color:rgba(254,252,247,.6)">Thank you for investing in Amelia Arabe\'s Miss California USA 2026 campaign. Your support puts clean energy and fashion accountability policy on a national stage. We are honored to have you in this room with us.</div>' +
    '<div style="font-family:var(--fm);font-size:.55rem;color:rgba(240,216,152,.3);margin-top:.85rem">— Amelia Arabe & Laneea Love</div>' +
    '</div>' +
    '<div style="padding:1.35rem 1.75rem">' +
    '<div class="g2">' +
    '<div><div class="cl">Your Deliverables</div>'+buildDelivCards()+'</div>' +
    '<div class="card"><div class="cl">Competition Progress</div>' +
    [{label:'Entry Secured',done:true,note:'Miss California USA 2026'},{label:'Coach Engaged',done:true,note:'Weekly sessions'},{label:'Wardrobe In Progress',done:false,note:'With Laneea'},{label:'YouTube Channel Launch',done:false,note:'Starting from 0'},{label:'Competition Week',done:false,note:'July 10-12, 2026'}].map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--du)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong>'+p.note+'</div></div>';
    }).join('') +
    '</div>' +
    '</div>' +
    '</div></div>'
  );
}

// ═══ TODO ════════════════════════════════════════════════════

function renderTodos(role){

function toggleTodo(role,id,el){
  var list=S.todos[role]||[];

function saveTodoText(role,id,val){
  var list=S.todos[role]||[];
  var item=list.find(function(t){return t.id===id;});
  if(item){item.text=val;lsSave('chq-td',S.todos);showToast();}
}


function addTodo(role){
  var inp=g('todo-inp-'+role);
  if(!inp||!inp.value.trim())return;
  if(!S.todos[role])S.todos[role]=[];

function removeTodo(role,id){
  S.todos[role]=(S.todos[role]||[]).filter(function(t){return t.id!==id;});
  lsSave('chq-td',S.todos);

function renderDashMood(role){
  var items=(S.dashMood&&S.dashMood[role])||[];
  return '<div class="mb-grid" id="dmb-'+role+'">' +
    items.map(function(m,i){
      return '<div class="mb-item"><img src="'+m.src+'" alt="'+m.label+'"><div class="mb-lbl">'+m.label+'</div>' +
        '<button class="mb-rm" onclick="removeDashMood(\''+role+'\','+i+')">×</button></div>';
    }).join('') +
    '<label class="mb-item mb-add" style="aspect-ratio:3/4">' +
    '<input type="file" accept="image/*" multiple style="display:none" onchange="addDashMood(\''+role+'\',event)">' +
    '<div style="font-size:1.3rem;color:var(--wg)">+</div>' +
    '<span style="font-family:var(--fm);font-size:.52rem;color:var(--wg);letter-spacing:1px;text-transform:uppercase">Add Images</span>' +
    '</label></div>';
}


function addDashMood(role,e){

function removeDashMood(role,i){
  if(S.dashMood[role])S.dashMood[role].splice(i,1);
  lsSave('chq-dm',S.dashMood);
  var grid=g('dmb-'+role);
  if(grid){var items=grid.querySelectorAll('.mb-item:not(.mb-add)');if(items[i])items[i].remove();}
}

// ═══ SPONSORS ════════════════════════════════════════════════

function getMorningGreeting(){

function getBriefAlerts(){
