// ═══ SPONSORS ════════════════════════════════════════════════
// Crown HQ — sponsors.js

var spFilter='all';

function bSponsors(){
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  inject(
    '<div class="ph"><div><div class="ph-tag">Pipeline</div><div class="ph-title"><em>Sponsor</em> Tracker</div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="openM(\'m-sponsor\')">+ Add Sponsor</button></div></div>' +
    '<div class="pb">' +
    '<div class="g4" style="margin-bottom:.85rem">' +
    '<div class="stat st-tz"><div class="sn">'+S.sponsors.length+'</div><div class="sl">Total</div></div>' +
    '<div class="stat st-ch"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='meeting';}).length+'</div><div class="sl">Meeting Set</div></div>' +
    '<div class="stat st-sg"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='closed';}).length+'</div><div class="sl">Closed</div></div>' +
    '<div class="stat st-bl"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>' +
    '</div>' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">' +
    ['all','new','contacted','meeting','closed','declined'].map(function(f){
      return '<button class="btn '+(f===spFilter?'bp':'bg')+'" onclick="spFilter=\''+f+'\';bSponsors()">'+
        (f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1))+'</button>';
    }).join('') +
    '</div>' +
    '<div class="card" style="padding:0;overflow:hidden">' +
    '<table class="sp-tbl"><thead><tr><th>Company</th><th>Ask</th><th>Status</th><th>Notes</th><th></th></tr></thead>' +
    '<tbody>'+renderSpRows()+'</tbody></table>' +
    '</div>' :
    spTab==='pitch' ? renderSpPitchDecks() :
    spTab==='emails' ? renderSpEmails() :
    renderSpObjections()) +
    '</div>'
  );
}


function renderSpPitchDecks(){

function renderSpEmails(){
  var pd=lsGet('chq-pitch',{emails:{}});

function renderSpObjections(){
  var pd=lsGet('chq-pitch',{objections:{}});
  var defaults={
    budget:{q:'We don't have budget for this.',a:'Totally understand — this doesn't have to be cash. Product placement, gifted item, or co-branded social post all count. We are flexible on structure.'},
    audience:{q:'Your audience is too small.',a:'Amelia's audience is highly engaged and values-aligned with sustainability brands. Quality over quantity — and she is actively growing into competition.'},
    pageant:{q:'We don't typically sponsor pageants.',a:'This isn't a typical pageant. Amelia is an engineer with a policy platform — SB 100, SB 707. Your brand is backing a climate advocate on a national stage.'},
    timing:{q:'The timing isn't right.',a:'The competition is July 10-12. Early partners get the best placement and most lead time for co-created content. The window is real.'},
    fit:{q:'Not sure it is a fit.',a:'Tell me what a good fit looks like for you. We built this to be flexible — brand awareness, social content, community goodwill, or something else.'}
  };
  return '<div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.85rem">' +
    Object.keys(defaults).map(function(k){

function copySpEmail(bodyId,subjId,btn){

function saveSpEmail(key,field,val){
  var pd=lsGet('chq-pitch',{});
  if(!pd.emails)pd.emails={};
  if(!pd.emails[key])pd.emails[key]={};
  pd.emails[key][field]=val;
  lsSave('chq-pitch',pd);
}


function saveSpObjection(key,val){
  var pd=lsGet('chq-pitch',{});
  if(!pd.objections)pd.objections={};
  if(!pd.objections[key])pd.objections[key]={};
  pd.objections[key].a=val;
  lsSave('chq-pitch',pd);
}


function renderSpRows(){

function openSponsorLink(id){

function addSponsor(){
  var s={id:Date.now(),name:g('s-name').value.trim(),cat:g('s-cat').value,ask:g('s-ask').value,status:g('s-status').value,amount:parseFloat(g('s-amount').value)||0,notes:g('s-notes').value};
  if(!s.name)return;
  S.sponsors.push(s);lsSave('chq-sp',S.sponsors);
  closeM('m-sponsor');['s-name','s-ask','s-notes','s-amount'].forEach(function(id){g(id).value='';});
  bSponsors();
}


function openStatusModal(id){
  S.editSponsorId=id;
  var s=S.sponsors.find(function(x){return x.id===id;});
  g('m-status-title').textContent='Update: '+s.name;
  g('sm-status').value=s.status;g('sm-amount').value=s.amount||'';g('sm-notes').value=s.notes||'';
  openM('m-status');
}


function saveStatus(){
  var s=S.sponsors.find(function(x){return x.id===S.editSponsorId;});
  s.status=g('sm-status').value;s.amount=parseFloat(g('sm-amount').value)||0;s.notes=g('sm-notes').value;
  lsSave('chq-sp',S.sponsors);closeM('m-status');bSponsors();
}


function delSponsor(){
  if(!confirm('Remove this sponsor?'))return;
  S.sponsors=S.sponsors.filter(function(x){return x.id!==S.editSponsorId;});
  lsSave('chq-sp',S.sponsors);closeM('m-status');bSponsors();
}


function updateNote(id,val){var s=S.sponsors.find(function(x){return x.id===id;});if(s){s.notes=val;lsSave('chq-sp',S.sponsors);}}

function updateLink(id,val){var s=S.sponsors.find(function(x){return x.id===id;});if(s){s.link=val;lsSave('chq-sp',S.sponsors);}}

function editSponsorInline(id){var s=S.sponsors.find(function(x){return x.id===id;});if(!s)return;var link=prompt('Website URL for '+s.name+':',s.link||'https://');if(link!==null){s.link=link;lsSave('chq-sp',S.sponsors);showToast('Link saved');}}

// ═══ CALENDAR ════════════════════════════════════════════════

function bPitch(){

function renderFollowUpRow(f,i){
  var today=new Date().toISOString().split('T')[0];

function addFollowUp(){
  var pd=lsGet('chq-pitch',{});
  if(!pd.followUps)pd.followUps=[];

function updateFU(id,field,val){
  var pd=lsGet('chq-pitch',{});
  if(!pd.followUps)return;
  var f=pd.followUps.find(function(x){return x.id===id;});
  if(f){f[field]=val;lsSave('chq-pitch',pd);}
}


function removeFU(id){
  var pd=lsGet('chq-pitch',{});
  pd.followUps=(pd.followUps||[]).filter(function(x){return x.id!==id;});
  lsSave('chq-pitch',pd);
  var el=document.getElementById('fu-'+id);if(el)el.remove();
}


function toggleMC(id,el){
  var pd=lsGet('chq-pitch',{});
  if(!pd.meetingChecklist)return;
  var item=pd.meetingChecklist.find(function(x){return x.id===id;});
  if(item){item.done=!item.done;lsSave('chq-pitch',pd);}
  el.classList.toggle('done',item&&item.done);
  var txt=el.nextSibling;if(txt)txt.classList.toggle('done',item&&item.done);
}


function addMCItem(){
  var inp=document.getElementById('mc-inp');
  if(!inp||!inp.value.trim())return;
  var pd=lsGet('chq-pitch',{});
  if(!pd.meetingChecklist)pd.meetingChecklist=[];
  var id=Date.now();
  pd.meetingChecklist.push({id:id,text:inp.value.trim(),done:false});
  lsSave('chq-pitch',pd);
  var list=document.getElementById('meeting-checklist');
  if(list){
    var div=document.createElement('div');
    div.className='todo-item';div.id='mc-'+id;
    div.innerHTML='<div class="todo-cb" onclick="toggleMC('+id+',this)"></div><span class="todo-txt">'+inp.value.trim()+'</span>';
    list.insertBefore(div,list.lastElementChild);
  }
  inp.value='';
}


function viewDeckPDF(key){
  var pd=lsGet('chq-pitch',{});
  if(!pd.decks||!pd.decks[key]||!pd.decks[key].pdf)return;
  window.open(pd.decks[key].pdf,'_blank');
}


function copyPitchEmail(id,btn){
  var el=document.getElementById(id);if(!el)return;
  var subj=document.querySelector('.email-subj[data-key="'+el.dataset.key+'"]');
  var text=(subj?'Subject: '+subj.value+'\n\n':'')+el.value;
  navigator.clipboard.writeText(text);
  btn.textContent='Copied!';
  setTimeout(function(){btn.textContent='Copy';},2000);
  showToast('Email copied');
}


function savePitch(){
  var pd=lsGet('chq-pitch',{});
