// ═══ FILES ════════════════════════════════════════════════
// Crown HQ — files.js

var FILE_STORE=[];

function bFiles(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Shared</div><div class="ph-title"><em>Files</em></div></div>' +
    '<div class="ph-acts"><label class="btn bp" style="cursor:pointer">+ Upload<input type="file" multiple style="display:none" onchange="handleUpload(event)"></label></div></div>' +
    '<div class="pb">' +
    '<label class="up-zone" style="margin-bottom:1.35rem;display:block;cursor:pointer">' +
    '<input type="file" multiple style="display:none" onchange="handleUpload(event)">' +
    '<div style="font-size:1.75rem;color:var(--wg);margin-bottom:.4rem">📁</div>' +
    '<div style="font-family:var(--fd);font-style:italic;font-size:.95rem;color:var(--wg);margin-bottom:.2rem">Click to upload files</div>' +
    '<div style="font-family:var(--fm);font-size:.57rem;color:var(--du);letter-spacing:1px;text-transform:uppercase">Images · PDFs · Audio · Video · Docs</div>' +
    '</label>' +
    '<div id="file-viewer" style="display:none;margin-bottom:1.35rem;background:var(--ink);border-radius:3px;overflow:hidden">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem .85rem;border-bottom:1px solid rgba(255,255,255,.07)">' +
    '<span id="fv-name" style="font-family:var(--fm);font-size:.6rem;color:rgba(254,252,247,.45);letter-spacing:1px"></span>' +
    '<button onclick="closeFileViewer()" style="background:none;border:none;color:rgba(254,252,247,.4);cursor:pointer;font-size:1.1rem;line-height:1">×</button>' +
    '</div>' +
    '<div id="fv-content" style="padding:.85rem;max-height:65vh;overflow:auto"></div>' +
    '</div>' +
    '<div style="display:flex;gap:.35rem;margin-bottom:.85rem;flex-wrap:wrap" id="folder-tabs">' +
    ['All','Competition','Sponsors','Press','Looks','Personal'].map(function(f){
      return '<button class="cal-tab '+(( window._fileFolder||'All')===f?'on':'')+'" onclick="window._fileFolder=''+f+'';renderFileList()">'+f+'</button>';
    }).join('') +
    '</div>' +
    '<div id="uploaded-files"></div>' +
    '</div>'
  );
  renderFileList();
}

function renderFileList(){

function handleUpload(e){
  Array.from(e.target.files).forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){FILE_STORE.push({name:file.name,size:file.size,type:file.type,data:ev.target.result});renderFileList();sbSaveFiles();};
    r.readAsDataURL(file);
  });
}

function openFile(i){

function closeFileViewer(){var v=g('file-viewer');if(v)v.style.display='none';}

function removeFile(i){FILE_STORE.splice(i,1);renderFileList();}

function downloadFile(i){var f=FILE_STORE[i];var a=document.createElement('a');a.href=f.data;a.download=f.name;a.click();}

// ═══ DELIVERABLES ════════════════════════════════════════════

function buildDelivCards(){
  return [{title:'Instagram Feature Post',due:'Apr 15',status:'pending'},{title:'YouTube Short (Launch)',due:'Apr 1',status:'overdue'},{title:'Logo on Advocacy One-Pager',due:'Mar 31',status:'done'},{title:'Named in Press Materials',due:'Ongoing',status:'done'}].map(function(d){
    return '<div class="dv-card '+d.status+'"><div class="dv-ti">'+d.title+'</div><div class="dv-du">Due: '+d.due+'</div>' +
      '<span class="dv-st ds-'+(d.status==='pending'?'p':d.status==='done'?'d':'o')+'">'+(d.status==='done'?'Complete':d.status==='overdue'?'Overdue':'Pending')+'</span></div>';
  }).join('');
}

function bDeliverables(){inject('<div class="ph"><div><div class="ph-tag">Sponsor</div><div class="ph-title">Your <em>Deliverables</em></div></div></div><div class="pb">'+buildDelivCards()+'</div>');}

function bCompProgress(){
  inject('<div class="ph"><div><div class="ph-tag">Sponsor View</div><div class="ph-title">Competition <em>Progress</em></div></div></div><div class="pb"><div class="card">' +
    [{label:'Entry Secured',done:true,note:'Miss California USA 2026'},{label:'Coach Engaged',done:true,note:'Weekly sessions'},{label:'Wardrobe In Progress',done:false,note:'With Laneea'},{label:'YouTube Channel Launch',done:false,note:'Starting from 0'},{label:'Competition Week',done:false,note:'July 10-12, 2026'}].map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--du)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong>'+p.note+'</div></div>';
    }).join('') +
    '</div></div>');
}

function bMessages(){

function quickSend(){
  var inp=g('quick-msg');if(!inp||!inp.value.trim())return;
  var m={id:Date.now(),from:S.role,to:'team',text:inp.value.trim(),time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  S.messages.push(m);lsSave('chq-ms',S.messages);inp.value='';bMessages();
}

function sendMsg(){
  var body=g('msg-body').value.trim();if(!body)return;
  var m={id:Date.now(),from:S.role,to:g('msg-to').value,text:body,time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  S.messages.push(m);lsSave('chq-ms',S.messages);closeM('m-msg');g('msg-body').value='';bMessages();
}

// ═══ FILES ═══════════════════════════════════════════════════
// FILES WITH INLINE VIEWER
