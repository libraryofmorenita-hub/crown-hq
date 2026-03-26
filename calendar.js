// ═══ CALENDAR ════════════════════════════════════════════════
// Crown HQ — calendar.js

function bCalendar(){

function renderCalList(){

function renderWeek(){
  var today=new Date();

function renderMonth(){
  var today=new Date();

function quickAddEvent(date,hour){
  g('ev-date').value=date;
  g('ev-time').value=String(hour).padStart(2,'0')+':00';
  openM('m-ev');
}


function addEvent(){

function addAppt(){

function editCalEvent(id){
  var ev=S.calEvents.find(function(x){return x.id===id;});
  if(!ev)return;
  g('ev-title').value=ev.title||'';
  g('ev-date').value=ev.date||'';
  g('ev-time').value=ev.time||'';
  g('ev-dur').value=ev.dur||1;
  g('ev-type').value=ev.type||'coach';
  g('ev-who').value=ev.who||'';
  S._editingEvId=id;
  var sb=document.querySelector('#m-ev .btn.bp');if(sb)sb.textContent='Update';

function deleteCalEvent(){
  if(!S._editingEvId)return;
  if(!confirm('Remove this event?'))return;
  S.calEvents=S.calEvents.filter(function(x){return x.id!==S._editingEvId;});
  lsSave('chq-ce',S.calEvents);
  S._editingEvId=null;
  closeM('m-ev');
  bCalendar();
}

