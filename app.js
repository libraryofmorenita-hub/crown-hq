

// ═══ SUPABASE ════════════════════════════════════════════════
var SB_URL='https://haqfxrcsszjwiyrchqnm.supabase.co';
var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcWZ4cmNzc3pqd2l5cmNocW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDY5NjIsImV4cCI6MjA4OTg4Mjk2Mn0.eioSLntQ0E1mIxUC_r4kmmVbzrIi-d69LLO4rnn0Nlg';
var SB_SYNC_SUSPENDED=false;
var SB_SAVE_PENDING=0;
var SB_STATUS_RESET_TIMER=null;
var SB_KV_MAP={
  'chq-gl':'goals',
  'chq-td':'todos',
  'chq-an':'answers',
  'chq-br':'brand',
  'chq-adv':'adv',
  'chq-gd':'gd',
  'chq-timeline':'timeline',
  'chq-ap':'appts',
  'chq-md':'mood',
  'chq-dm':'dashMood',
  'chq-qz':'quiz',
  'chq-pitch':'pitch',
  'chq-board':'board',
  'chq-lb-imgs':'lookbook_imgs',
  'chq-lb-links':'lookbook_links',
  'chq-lb-bio':'lookbook_bio',
  'chq-lb-meta':'lookbook_meta',
  'chq-social':'social',
  'chq-inbox':'inbox',
  'chq-fitness':'fitness',
  'chq-peace':'peace',
  'chq-role-pages':'role_pages',
  'chq-contacts':'contacts',
  'chq-portal-profiles':'portal_profiles'
};
function setSupabaseStatus(state,text,sticky){
  var el=document.getElementById('tb-sync');
  var txt=document.getElementById('tb-sync-text');
  if(!el||!txt)return;
  el.className='tb-sync '+state;
  txt.textContent=text;
  if(SB_STATUS_RESET_TIMER){clearTimeout(SB_STATUS_RESET_TIMER);SB_STATUS_RESET_TIMER=null;}
  if(!sticky&&state!=='saving'&&state!=='idle'){
    SB_STATUS_RESET_TIMER=setTimeout(function(){
      if(SB_SAVE_PENDING===0)setSupabaseStatus('idle','Supabase ready',true);
    },2200);
  }
}
function beginSupabaseSave(){
  SB_SAVE_PENDING+=1;
  setSupabaseStatus('saving','Saving to Supabase',true);
}
function finishSupabaseSave(ok){
  SB_SAVE_PENDING=Math.max(0,SB_SAVE_PENDING-1);
  if(!ok){
    setSupabaseStatus('error','Supabase save failed',true);
    return;
  }
  if(SB_SAVE_PENDING===0)setSupabaseStatus('saved','Saved to Supabase',false);
}
function sbFetch(table,method,body,match){
  var url=SB_URL+'/rest/v1/'+table+(match?'?'+match:'');
  var isWrite=(method||'GET')!=='GET';
  if(isWrite)beginSupabaseSave();
  return fetch(url,{method:method||'GET',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':method==='POST'?'resolution=merge-duplicates':''},body:body?JSON.stringify(body):undefined})
  .then(function(r){
    if(isWrite)finishSupabaseSave(r.ok);
    return r.ok?r.json().catch(function(){return[];}):[];
  }).catch(function(){
    if(isWrite)finishSupabaseSave(false);
    return[];
  });
}
function sbGet(table){return sbFetch(table,'GET',null,'order=id');}
function sbUpsert(table,rows){if(!rows||!rows.length)return Promise.resolve();return sbFetch(table,'POST',rows);}
function sbDelete(table,match){return sbFetch(table,'DELETE',null,match);}
function sbReplace(table,rows){
  rows=rows||[];
  return sbGet(table).then(function(existing){
    var nextIds=rows.map(function(r){return String(r.id);});
    var ops=(existing||[]).filter(function(r){return nextIds.indexOf(String(r.id))<0;}).map(function(r){
      return sbDelete(table,'id=eq.'+encodeURIComponent(r.id));
    });
    if(rows.length)ops.push(sbUpsert(table,rows));
    return Promise.all(ops);
  }).catch(function(){
    return rows.length?sbUpsert(table,rows):Promise.resolve();
  });
}
function sbGetKV(key){
  return fetch(SB_URL+'/rest/v1/app_data?key=eq.'+encodeURIComponent(key),{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}})
  .then(function(r){return r.json();}).then(function(rows){return rows&&rows.length?rows[0].value:null;}).catch(function(){return null;});
}
function sbSetKV(key,value){
  beginSupabaseSave();
  return fetch(SB_URL+'/rest/v1/app_data',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},body:JSON.stringify({key:key,value:value,updated_at:new Date().toISOString()})})
  .then(function(r){finishSupabaseSave(r.ok);return r;})
  .catch(function(){finishSupabaseSave(false);});
}
function loadFromSupabase(){
  var kvKeys=['goals','todos','answers','brand','adv','gd','timeline','appts','mood','dashMood','quiz','pitch','board','lookbook_imgs','lookbook_links','lookbook_bio','lookbook_meta','social','inbox','fitness','peace','role_pages','contacts','portal_profiles'];
  return Promise.all([sbGet('sponsors'),sbGet('calendar_events'),sbGet('posts'),sbGet('looks'),sbGet('workouts'),sbGet('messages'),sbGet('files'),sbGet('mood_board')].concat(kvKeys.map(sbGetKV)))
  .then(function(results){
    var sp=results[0],ev=results[1],po=results[2],lk=results[3],wk=results[4],ms=results[5],fi=results[6],mb=results[7];
    var kv={};
    kvKeys.forEach(function(key,idx){kv[key]=results[8+idx];});
    SB_SYNC_SUSPENDED=true;
    if(sp&&sp.length){S.sponsors=sp;lsWriteLocal('chq-sp',S.sponsors);}
    if(ev&&ev.length){S.calEvents=ev;lsWriteLocal('chq-ce',S.calEvents);}
    if(po&&po.length){S.posts=po;lsWriteLocal('chq-po',S.posts);}
    if(lk&&lk.length){
      S.looks=lk.map(function(l){return{id:l.id,event:l.event_name,round:l.round_name,title:l.title,desc:l.description,img:l.img||''};});
      lsWriteLocal('chq-lk',S.looks);
    }
    if(wk&&wk.length){S.workouts=wk;lsWriteLocal('chq-wk',S.workouts);}
    if(ms&&ms.length){
      S.messages=ms.map(function(m){return{id:m.id,from:m.from_role,to:m.to_role,text:m.body,time:m.time};});
      lsWriteLocal('chq-ms',S.messages);
    }
    if(fi&&fi.length){FILE_STORE=fi.map(function(f){return{id:f.id,name:f.name,size:f.size,type:f.file_type,data:f.data,folder:f.folder||'Personal'};});}
    if(kv.goals){S.goals=kv.goals;lsWriteLocal('chq-gl',S.goals);}
    if(kv.todos){S.todos=kv.todos;lsWriteLocal('chq-td',S.todos);}
    if(kv.answers){S.answers=kv.answers;lsWriteLocal('chq-an',S.answers);}
    if(kv.brand){S.brand=kv.brand;lsWriteLocal('chq-br',S.brand);}
    if(kv.adv)lsWriteLocal('chq-adv',kv.adv);
    if(kv.gd)lsWriteLocal('chq-gd',kv.gd);
    if(kv.timeline)lsWriteLocal('chq-timeline',kv.timeline);
    if(kv.appts){S.appts=kv.appts;lsWriteLocal('chq-ap',S.appts);}
    if(kv.mood){S.mood=kv.mood;lsWriteLocal('chq-md',S.mood);}
    if(kv.dashMood){S.dashMood=kv.dashMood;lsWriteLocal('chq-dm',S.dashMood);}
    else if(mb&&mb.length){
      S.dashMood={};
      mb.forEach(function(m){if(!S.dashMood[m.role])S.dashMood[m.role]=[];S.dashMood[m.role].push({src:m.src,label:m.label});});
      lsWriteLocal('chq-dm',S.dashMood);
    }
    if(kv.quiz){S.quiz={sessions:kv.quiz.sessions||0,total:kv.quiz.total||0};lsWriteLocal('chq-qz',S.quiz);}
    if(kv.pitch)lsWriteLocal('chq-pitch',kv.pitch);
    if(kv.board)lsWriteLocal('chq-board',kv.board);
    if(kv.lookbook_imgs)lsWriteLocal('chq-lb-imgs',kv.lookbook_imgs);
    if(kv.lookbook_links)lsWriteLocal('chq-lb-links',kv.lookbook_links);
    if(kv.lookbook_bio)lsWriteLocal('chq-lb-bio',kv.lookbook_bio);
    if(kv.lookbook_meta)lsWriteLocal('chq-lb-meta',kv.lookbook_meta);
    if(kv.social)lsWriteLocal('chq-social',kv.social);
    if(kv.inbox)lsWriteLocal('chq-inbox',kv.inbox);
    if(kv.fitness)lsWriteLocal('chq-fitness',kv.fitness);
    if(kv.peace)lsWriteLocal('chq-peace',kv.peace);
    if(kv.role_pages)lsWriteLocal('chq-role-pages',kv.role_pages);
    if(kv.contacts)lsWriteLocal('chq-contacts',kv.contacts);
    if(kv.portal_profiles)lsWriteLocal('chq-portal-profiles',kv.portal_profiles);
    SB_SYNC_SUSPENDED=false;
  }).catch(function(){SB_SYNC_SUSPENDED=false;});
}
function sbSaveSponsors(){sbReplace('sponsors',S.sponsors.map(function(s){return{id:s.id,name:s.name,cat:s.cat,ask:s.ask,status:s.status,amount:s.amount||0,notes:s.notes||'',link:s.link||'',updated_at:new Date().toISOString()};}));}
function sbSaveEvents(){sbReplace('calendar_events',S.calEvents.map(function(e){return{id:e.id,title:e.title,date:e.date,time:e.time||'',dur:e.dur||1,type:e.type||'coach',who:e.who||'',updated_at:new Date().toISOString()};}));}
function sbSavePosts(){sbReplace('posts',S.posts.map(function(p){return{id:p.id,title:p.title,tag:p.tag||'',cat:p.cat||'',date:p.date||'',status:p.status||'draft',cover:p.cover||'',body:p.body||'',updated_at:new Date().toISOString()};}));}
function sbSaveLooks(){sbReplace('looks',S.looks.map(function(l){return{id:l.id,event_name:l.event||'',round_name:l.round||'',title:l.title||'',description:l.desc||'',img:l.img||'',updated_at:new Date().toISOString()};}));}
function sbSaveWorkouts(){sbReplace('workouts',S.workouts.map(function(w){return{id:w.id,day:w.day||'',focus:w.focus||'',exercises:w.exercises||[],notes:w.notes||'',updated_at:new Date().toISOString()};}));}
function sbSaveMessages(){sbReplace('messages',S.messages.map(function(m){return{id:m.id,from_role:m.from||'',to_role:m.to||'',body:m.text||'',time:m.time||'',updated_at:new Date().toISOString()};}));}
function sbSaveFiles(){sbReplace('files',FILE_STORE.map(function(f){return{id:f.id,name:f.name,size:f.size,file_type:f.type,data:f.data,folder:f.folder||'Personal',updated_at:new Date().toISOString()};}));}
function sbSaveKV(key,value){sbSetKV(key,value);}

// ═══ STATE ═══════════════════════════════════════════════════
var S={
  role:null,
  portalProfile:null,
  sponsors:lsGet('chq-sp',[]),
  appts:lsGet('chq-ap',[]),
  messages:lsGet('chq-ms',[]),
  workouts:lsGet('chq-wk',[]),
  posts:lsGet('chq-po',[]),
  mood:lsGet('chq-md',[]),
  dashMood:lsGet('chq-dm',{}),
  looks:lsGet('chq-lk',[]),
  quiz:(function(){var q=lsGet('chq-qz',{});return {sessions:q.sessions||0,total:q.total||0};})(),
  brand:lsGet('chq-br',{}),
  answers:lsGet('chq-an',{}),
  goals:lsGet('chq-gl',{}),
  todos:lsGet('chq-td',{}),
  calEvents:lsGet('chq-ce',[]),
  editSponsorId:null,
  editingPostId:null,
  quizCat:'all',
  quizQs:[],
  curQ:0,
  qTimer:null,
  qSecs:60,
  calView:'week',
  calWeekOffset:0,
  emActive:false,
  saveTimer:null
};

function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function lsWriteLocal(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

// ── PERFORMANCE: debounced Supabase saves ─────────────────────
// localStorage writes are instant. Supabase syncs are batched
// with a 1.2s debounce so rapid keystrokes don't flood the API.
var _sbDebounce = {};
function debouncedSbSave(key, fn){
  clearTimeout(_sbDebounce[key]);
  _sbDebounce[key] = setTimeout(fn, 1200);
}

function lsSave(k,v){
  lsWriteLocal(k,v);
  if(SB_SYNC_SUSPENDED)return;
  // Debounce all Supabase writes
  if(k==='chq-sp')      debouncedSbSave(k, sbSaveSponsors);
  else if(k==='chq-ce') debouncedSbSave(k, sbSaveEvents);
  else if(k==='chq-po') debouncedSbSave(k, sbSavePosts);
  else if(k==='chq-lk') debouncedSbSave(k, sbSaveLooks);
  else if(k==='chq-wk') debouncedSbSave(k, sbSaveWorkouts);
  else if(k==='chq-ms') debouncedSbSave(k, sbSaveMessages);
  else if(k==='chq-gl') debouncedSbSave(k, function(){ sbSaveKV('goals',v); });
  else if(k==='chq-td') debouncedSbSave(k, function(){ sbSaveKV('todos',v); });
  else if(k==='chq-an') debouncedSbSave(k, function(){ sbSaveKV('answers',v); });
  else if(k==='chq-br') debouncedSbSave(k, function(){ sbSaveKV('brand',v); });
  else if(k==='chq-adv')debouncedSbSave(k, function(){ sbSaveKV('adv',v); });
  else if(k==='chq-gd') debouncedSbSave(k, function(){ sbSaveKV('gd',v); });
  else if(k==='chq-timeline') debouncedSbSave(k, function(){ sbSaveKV('timeline',v); });
  else if(SB_KV_MAP[k]) debouncedSbSave(k, function(){ sbSaveKV(SB_KV_MAP[k],v); });
}

// ── PERFORMANCE: panel cache ──────────────────────────────────
// Panels that haven't changed don't re-render. Cache keyed by
// panel id + a lightweight data hash.
var _panelCache = {};
function panelHash(id){
  // Quick hash — just use key data source per panel type
  var src = {
    'sponsors': S.sponsors.length,
    'calendar': (S.appts||[]).length+(S.calEvents||[]).length,
    'fitness': JSON.stringify(lsGet('chq-fitness',{}).days||{}),
    'looks': S.looks.length,
    'files': (window.FILE_STORE||[]).length
  };
  return id + ':' + (src[id] !== undefined ? src[id] : Date.now());
}
function shouldSkipRender(id){
  var h = panelHash(id);
  if(_panelCache[id]===h) return true;
  _panelCache[id] = h;
  return false;
}
// Call this when navigating away to invalidate
function invalidatePanel(id){ delete _panelCache[id]; }
function invalidateAll(){ _panelCache = {}; }
function sv(k,v){S[k]=v;lsSave('chq-'+k.replace(/[A-Z]/g,function(c){return '-'+c.toLowerCase();}).replace('chq-',''),v);}

function getRolePages(){
  var defaults={
    laneea:{
      quote:'"Every room Amelia walks into, she\'s already won it."',
      focus:'Keep the calendar clean, the sponsor pipeline warm, and every detail one step ahead.'
    },
    hmu:{
      quote:'"Beauty that has a story worth telling."',
      focus:'Keep each day\'s beauty direction polished, calm, and camera-ready.',
      schedule:[
        {date:'Jul 10',ev:'Day 1 — Interview',look:'Natural, professional'},
        {date:'Jul 11',ev:'Day 2 — Swimsuit',look:'Glowing, beach-ready'},
        {date:'Jul 12',ev:'Day 3 — Evening Gown',look:'Full glam updo'}
      ]
    },
    trainer:{
      quote:'"Train like an athlete. Move like an artist."',
      focus:'Build posture, stamina, and calm confidence without burning out.',
      phase:'Foundation'
    }
  };
  var saved=lsGet('chq-role-pages',{})||{};
  return {
    laneea:{
      quote:(saved.laneea&&saved.laneea.quote)||defaults.laneea.quote,
      focus:(saved.laneea&&saved.laneea.focus)||defaults.laneea.focus
    },
    hmu:{
      quote:(saved.hmu&&saved.hmu.quote)||defaults.hmu.quote,
      focus:(saved.hmu&&saved.hmu.focus)||defaults.hmu.focus,
      schedule:Array.isArray(saved.hmu&&saved.hmu.schedule)&&saved.hmu.schedule.length?saved.hmu.schedule:defaults.hmu.schedule.slice()
    },
    trainer:{
      quote:(saved.trainer&&saved.trainer.quote)||defaults.trainer.quote,
      focus:(saved.trainer&&saved.trainer.focus)||defaults.trainer.focus,
      phase:(saved.trainer&&saved.trainer.phase)||defaults.trainer.phase
    }
  };
}

function getPageantContacts(){
  var defaults={
    updated:'2026-03-28',
    people:[
      {id:'kristie',name:'Kristie Axmaker',role:'Contestant Manager',email:'info@misscaliforniausa.com',phone:'805-262-7973',note:'Miss California USA staff'},
      {id:'dorian',name:'Dorian Qi',role:'Official Photographer',email:'dorianqiqd@gmail.com',phone:'',note:'@droianqdphoto'},
      {id:'lisa',name:'Lisa G. Artistry',role:'Official Photographer',email:'lisagartistry@gmail.com',phone:'',note:'@lisagartistry'}
    ],
    links:{
      hotel:'https://www.hyatt.com/events/en-US/group-booking/CHAMP/G-CA26',
      sash:'https://form.123formbuilder.com/6214578/sash-order-form'
    }
  };
  var saved=lsGet('chq-contacts',null)||{};
  var people=Array.isArray(saved.people)&&saved.people.length?saved.people:defaults.people.slice();
  var links=Object.assign({},defaults.links,saved.links&&typeof saved.links==='object'?saved.links:{});
  return {
    updated:saved.updated||defaults.updated,
    people:people.map(function(p,i){
      return Object.assign({},defaults.people[i]||{},p||{});
    }),
    links:links
  };
}

function getPortalProfiles(){
  var defaults={
    sponsor:[
      {id:'paired-power',name:'Paired Power Team',company:'Paired Power',email:'partner@pairedpower.com',username:'pairedpower',password:'paired2026',status:'actual',active:true,sponsorId:1,notes:'Primary partner login'},
      {id:'cleantech-sd',name:'Cleantech SD',company:'Cleantech San Diego',email:'partners@cleantechsandiego.org',username:'cleantechsd',password:'cleantech2026',status:'actual',active:true,sponsorId:4,notes:'Community partner login'},
      {id:'econyl-prospect',name:'ECONYL Prospect',company:'ECONYL / Aquafil',email:'prospect@econyl.com',username:'econyl',password:'econyl2026',status:'possible',active:false,sponsorId:14,notes:'Prospect profile ready if they convert'},
      {id:'keel-labs-prospect',name:'Keel Labs Prospect',company:'Keel Labs',email:'prospect@keel-labs.com',username:'keellabs',password:'keel2026',status:'possible',active:false,sponsorId:23,notes:'Engineer-to-engineer outreach target'}
    ],
    hmu:[
      {id:'lisa-g-artistry',name:'Lisa G. Artistry',company:'Lisa G. Artistry',email:'lisagartistry@gmail.com',username:'lisag',password:'lisa2026',status:'active',active:true,specialty:'Pageant glam and polish',notes:'Official artistry profile'},
      {id:'studio-hmu',name:'Studio HMU',company:'Studio HMU',email:'hmu@stardom.team',username:'beautyteam',password:'beauty2026',status:'active',active:true,specialty:'Shared team access',notes:'Default HMU team profile'},
      {id:'trial-artist-1',name:'Trial Artist One',company:'Freelance Artist',email:'trialartist1@example.com',username:'trialartist1',password:'trial2026',status:'possible',active:false,specialty:'Interview day natural glam',notes:'Potential artist profile'},
      {id:'trial-artist-2',name:'Trial Artist Two',company:'Freelance Artist',email:'trialartist2@example.com',username:'glowartist',password:'glow2026',status:'possible',active:false,specialty:'Swimsuit and stage glow',notes:'Potential artist profile'}
    ],
    contributor:[
      {id:'dorian-qi',name:'Dorian Qi',company:'Dorian QD Photo',email:'dorianqiqd@gmail.com',username:'dorianqi',password:'photo2026',status:'active',active:true,specialty:'Official headshots and stage photography',notes:'Photo drop portal for official stills',goals:[{text:'Upload official headshot selects',done:false},{text:'Send vertical stage images for portfolio',done:false}]},
      {id:'media-team',name:'Media Team',company:'Contributor Team',email:'contributor@example.com',username:'contributor',password:'contrib2026',status:'active',active:true,specialty:'Photo and media uploads',notes:'Shared contributor access',goals:[{text:'Upload event photos',done:false}]}
    ]
  };
  var saved=lsGet('chq-portal-profiles',null)||{};
  function merge(kind){
    var arr=Array.isArray(saved[kind])&&saved[kind].length?saved[kind]:(defaults[kind]||[]);
    return arr.map(function(item,i){
      var merged=Object.assign({},(defaults[kind]&&defaults[kind][i])||{},item||{});
      if(!Array.isArray(merged.goals))merged.goals=Array.isArray(((defaults[kind]&&defaults[kind][i])||{}).goals)?((defaults[kind][i].goals||[]).slice()):[];
      return merged;
    });
  }
  return {sponsor:merge('sponsor'),hmu:merge('hmu'),contributor:merge('contributor')};
}

function getPortalProfile(role,id){
  var list=(getPortalProfiles()[role]||[]);
  return list.find(function(p){return String(p.id)===String(id);})||null;
}

function findPortalProfileByUsername(role,username){
  var uname=String(username||'').trim().toLowerCase();
  return (getPortalProfiles()[role]||[]).find(function(p){
    return String(p.username||'').trim().toLowerCase()===uname;
  })||null;
}

function syncActivePortalProfile(){
  if(!S.portalProfile||!S.role)return;
  var fresh=getPortalProfile(S.role,S.portalProfile.id);
  if(fresh)S.portalProfile=fresh;
}

function savePortalProfiles(data){
  lsSave('chq-portal-profiles',data);
}

function addPortalProfile(role){
  var name=prompt(role==='sponsor'?'Sponsor contact name:':role==='contributor'?'Contributor name:':'Artist name:');
  if(!name)return;
  var company=prompt(role==='sponsor'?'Company / sponsor name:':role==='contributor'?'Studio / publication / company:':'Studio / brand name:', '');
  var email=prompt('Login email:', '');
  var username=prompt('Username:', '');
  var password=prompt('Password:', '');
  var profiles=getPortalProfiles();
  var item={
    id:(name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now()).replace(/^-+|-+$/g,''),
    name:name,
    company:company||'',
    email:email||'',
    username:username||'',
    password:password||'',
    status:role==='sponsor'?'possible':'possible',
    active:false,
    notes:'',
    sponsorId:null,
    goals:[]
  };
  if(role==='hmu'||role==='contributor')item.specialty=prompt('Specialty:', '')||'';
  profiles[role].unshift(item);
  savePortalProfiles(profiles);
  showToast('Profile added');
  if(window._spTab==='accounts')bSponsors();
}

function editPortalProfile(role,id){
  var profiles=getPortalProfiles();
  var list=profiles[role]||[];
  var item=list.find(function(x){return String(x.id)===String(id);});
  if(!item)return;
  var name=prompt('Display name:',item.name||'');
  if(name===null)return;
  item.name=name;
  item.company=prompt('Company / studio:',item.company||'')||'';
  item.email=prompt('Login email:',item.email||'')||'';
  item.username=prompt('Username:',item.username||'')||'';
  item.password=prompt('Password:',item.password||'')||'';
  if(role==='sponsor'){
    item.status=prompt('Status: actual or possible',item.status||'possible')||item.status;
  } else {
    item.specialty=prompt('Specialty:',item.specialty||'')||'';
    item.status=prompt('Status: active or possible',item.status||'possible')||item.status;
  }
  if(!Array.isArray(item.goals))item.goals=[];
  item.active=confirm('Should this profile be able to log in right now?');
  savePortalProfiles(profiles);
  showToast('Profile updated');
  if(window._spTab==='accounts')bSponsors();
}

function removePortalProfile(role,id){
  if(!confirm('Remove this profile?'))return;
  var profiles=getPortalProfiles();
  profiles[role]=(profiles[role]||[]).filter(function(x){return String(x.id)!==String(id);});
  savePortalProfiles(profiles);
  showToast('Profile removed');
  if(window._spTab==='accounts')bSponsors();
}

// ═══ SEED DATA ═══════════════════════════════════════════════
function seed(){
  var portalProfiles=lsGet('chq-portal-profiles',null);
  if(!portalProfiles||!portalProfiles.sponsor||!portalProfiles.hmu||!portalProfiles.contributor){
    lsSave('chq-portal-profiles',getPortalProfiles());
  }
  if(!S.sponsors.length){
    S.sponsors=[
      // CLEAN ENERGY / EV
      {id:1,name:'Paired Power',cat:'ev',ask:'$1,000-3,000',status:'new',amount:0,notes:'Just graduated Cleantech SD. Engineer-to-engineer pitch. Walk in.',link:'https://pairedpower.com'},
      {id:2,name:'SD Community Power',cat:'ev',ask:'$500-1,500',status:'new',amount:0,notes:'Public agency. Lead with community benefit and SB 100 alignment.',link:'https://sdcp.energy'},
      {id:3,name:'HES Solar',cat:'ev',ask:'$500-2,000',status:'contacted',amount:0,notes:'Family owned SD business. Called last week. Follow up Thursday.',link:''},
      {id:4,name:'Cleantech San Diego',cat:'ev',ask:'$1,000-2,500',status:'new',amount:0,notes:'Industry org. Perfect platform alignment. Ask for event co-sponsorship.',link:'https://cleantechsandiego.org'},
      {id:5,name:'SDGE (SDG&E)',cat:'ev',ask:'$2,000-5,000',status:'new',amount:0,notes:'Local utility. SB 100 is their mandate too. Frame as shared mission.',link:'https://sdge.com'},
      {id:6,name:'Sunrun',cat:'ev',ask:'$1,500-3,000',status:'new',amount:0,notes:'Residential solar leader. SD presence strong. Community angle.',link:'https://sunrun.com'},
      {id:7,name:'ChargePoint',cat:'ev',ask:'$1,000-2,500',status:'new',amount:0,notes:'EV charging network. SB 100 downstream story. Tech audience.',link:'https://chargepoint.com'},
      {id:8,name:'BioLite',cat:'ev',ask:'$500-1,500',status:'new',amount:0,notes:'Clean energy consumer products. Engineer + sustainability angle.',link:'https://bioliteenergy.com'},
      {id:9,name:'Miramar Solar',cat:'ev',ask:'$500-2,000',status:'new',amount:0,notes:'Local SD installer. Hyperlocal story. Easy warm intro.',link:''},
      {id:10,name:'Lucid Motors SD',cat:'auto',ask:'$3,000-5,000',status:'new',amount:0,notes:'Opened Oct 2025. Walk in with deck. EV premium brand alignment.',link:'https://lucidmotors.com'},
      {id:11,name:'Rivian San Diego',cat:'auto',ask:'$2,000-5,000',status:'new',amount:0,notes:'SD Space showroom. Adventure + sustainability brand. Strong aesthetic fit.',link:'https://rivian.com'},
      {id:12,name:'Tesla SD',cat:'auto',ask:'$2,000-5,000',status:'new',amount:0,notes:'EV brand. Platform alignment obvious. Lead with engineer narrative.',link:'https://tesla.com'},
      // SUSTAINABLE FASHION / TEXTILES
      {id:13,name:'H2OM',cat:'fashion',ask:'Swimsuit + $500',status:'new',amount:0,notes:'Ocean plastic swimwear. Swimsuit round is the story. Dream collab.',link:'https://h2om.com'},
      {id:14,name:'ECONYL / Aquafil',cat:'fashion',ask:'Product + $500',status:'new',amount:0,notes:'Regenerated nylon from ocean plastic. The material itself is the pitch.',link:'https://econyl.com'},
      {id:15,name:'Patagonia SD',cat:'fashion',ask:'$1,000-2,000',status:'new',amount:0,notes:'Sustainable fashion giant. Mission-first brand. Lead with advocacy.',link:'https://patagonia.com'},
      {id:16,name:'prAna',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Sustainable activewear. SD-adjacent. Athlete body platform angle.',link:'https://prana.com'},
      {id:17,name:'Reformation',cat:'fashion',ask:'$1,000-3,000',status:'new',amount:0,notes:'Sustainable fashion brand. Big audience overlap. SB 707 alignment.',link:'https://thereformation.com'},
      {id:18,name:'Stella McCartney',cat:'fashion',ask:'Gown or product',status:'new',amount:0,notes:'Sustainable luxury. Evening gown round. Dream partnership. Reach out via press contact.',link:'https://stellamccartney.com'},
      {id:19,name:'Faherty Brand',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Sustainable coastal brand. SD aesthetic is perfect. Easy pitch.',link:'https://fahertybrand.com'},
      {id:20,name:'tentree',cat:'fashion',ask:'$500-1,000',status:'new',amount:0,notes:'Plants trees per item. Simple sustainability story. Easy ask.',link:'https://tentree.com'},
      {id:21,name:'AETHER Apparel',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Sustainable premium outdoor fashion. Design-forward aesthetic fit.',link:'https://aetherapparel.com'},
      {id:22,name:'Mirror Palais',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Beautiful aesthetic overlap. Customer is Amelias audience. Lead with lookbook.',link:'https://mirrorpalais.com'},
      {id:23,name:'Keel Labs',cat:'fashion',ask:'$1,000-2,000',status:'new',amount:0,notes:'Algae-based Kelsun fiber. Engineer-to-engineer pitch. Amelia can speak their language directly.',link:'https://keel-labs.com'},
      {id:24,name:'Pangaia',cat:'fashion',ask:'$1,000-3,000',status:'new',amount:0,notes:'Science-based sustainable materials. Highly aligned. Global brand with SD reach.',link:'https://pangaia.com'},
      {id:25,name:'Eileen Fisher',cat:'fashion',ask:'$1,000-2,000',status:'new',amount:0,notes:'Circular fashion pioneer. Resale and repair program. EPR alignment is perfect.',link:'https://eileenfisher.com'},
      {id:26,name:'Kindred Black',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Slow fashion, artisan-made. Anti-fast-fashion ethos. Library of Morenita aesthetic.',link:'https://kindred-black.com'},
      {id:27,name:'Remake',cat:'fashion',ask:'$500-1,000',status:'new',amount:0,notes:'Fashion accountability nonprofit. Huge credibility signal. May be press not cash.',link:'https://remake.world'},
      {id:28,name:'Collective Fashion Justice',cat:'fashion',ask:'Media + credibility',status:'new',amount:0,notes:'Pure platform alignment. Frame as advocacy partner not just sponsor.',link:'https://www.collectivefashionjustice.org'},
      {id:29,name:'The Kit Vintage',cat:'fashion',ask:'Product + feature',status:'new',amount:0,notes:'Sustainable secondhand. Build the story bridge — circular economy in action.',link:''},
      {id:30,name:'REI San Diego',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Outdoor + sustainability. Co-op values align. Local SD angle.',link:'https://rei.com'},
      // BEAUTY
      {id:31,name:'Lush',cat:'fashion',ask:'$1,000-2,000',status:'new',amount:0,notes:'Ethics and sustainability front and center. Go corporate team for sponsorship budget.',link:'https://lush.com'},
      {id:32,name:'Lush Temecula',cat:'local',ask:'$500-1,000',status:'new',amount:0,notes:'Local location for hyperlocal story. Warm intro possible via walk-in.',link:''},
      {id:33,name:'Beautycounter',cat:'fashion',ask:'$500-1,500',status:'new',amount:0,notes:'Advocacy-forward beauty. They lobby Congress — kindred spirits. Lead with policy angle.',link:'https://beautycounter.com'},
      {id:34,name:'Aether Beauty',cat:'fashion',ask:'$500-1,000',status:'new',amount:0,notes:'Sustainable cosmetics, clean packaging. HMU partnership angle.',link:'https://aetherbeauty.com'},
      {id:35,name:'Cocokind',cat:'fashion',ask:'$500-1,000',status:'new',amount:0,notes:'Transparent supply chain skincare. Brand story alignment with platform.',link:'https://cocokind.com'},
      // TECH
      {id:36,name:'Bolt Threads',cat:'tech',ask:'$1,000-2,000',status:'new',amount:0,notes:'Mycelium leather. Bio-materials pioneer. Engineer story writes itself.',link:'https://boltthreads.com'},
      {id:37,name:'EON',cat:'tech',ask:'$500-1,500',status:'new',amount:0,notes:'Product circularity platform, digital IDs for garments. Circular economy in practice.',link:'https://eongroup.co'},
      {id:38,name:'All Things Fashion Tech',cat:'tech',ask:'Media + feature',status:'new',amount:0,notes:'More media than money but great visibility. Pitch for feature story first.',link:''},
      {id:39,name:'Qualcomm SD',cat:'tech',ask:'$2,000-5,000',status:'new',amount:0,notes:'Local SD tech giant. Engineer narrative is the hook. Alumni network angle.',link:'https://qualcomm.com'},
      // LOCAL SD
      {id:40,name:'San Diego Tourism Authority',cat:'local',ask:'$1,000-3,000',status:'new',amount:0,notes:'SD pride angle. Miss California USA is a local story. Community visibility.',link:'https://sandiego.org'},
      {id:41,name:'Noli Yoga',cat:'local',ask:'$500-1,000',status:'new',amount:0,notes:'SD-based sustainable activewear. Local story + athlete platform.',link:'https://noliactive.com'},
      {id:42,name:'Blenders Eyewear',cat:'local',ask:'$500-1,000',status:'new',amount:0,notes:'SD brand with sustainability push. Local pride angle. Easy warm pitch.',link:'https://blenderseyewear.com'},
      {id:43,name:'Gymshark',cat:'fashion',ask:'Product + $500',status:'new',amount:0,notes:'Activewear. Athlete body platform. Social media audience overlap.',link:'https://gymshark.com'},
      {id:44,name:'Anthropologie',cat:'fashion',ask:'$1,000-2,000',status:'new',amount:0,notes:'Sustainable line growing. Design-forward aesthetic. SD location for local angle.',link:'https://anthropologie.com'},
    ];
    lsSave('chq-sp',S.sponsors);
  }
  if(!S.appts.length){
    S.appts=[
      {id:1,date:'2026-03-25',time:'10:00',title:'Runway Walk + Turns',who:'Pageant Coach',type:'coach',notes:'Heel placement and posture at turn'},
      {id:2,date:'2026-03-26',time:'07:00',title:'Strength + Posture',who:'Donovan',type:'fitness',notes:'Glutes, core, back. 75 min.'},
      {id:3,date:'2026-03-28',time:'14:00',title:'Wardrobe Consult',who:'Laneea Love',type:'styling',notes:'Review gown options'},
      {id:4,date:'2026-03-29',time:'09:00',title:'Competition Hair Test',who:'HMU Team',type:'hair',notes:'Test two updos'},
    ];
    lsSave('chq-ap',S.appts);
    // also seed calEvents from appts
    S.calEvents=S.appts.map(function(a){return {id:a.id,title:a.title,date:a.date,time:a.time,dur:1,type:a.type,who:a.who};});
    lsSave('chq-ce',S.calEvents);
  }
  if(!S.messages.length){
    S.messages=[
      {id:1,from:'laneea',to:'amelia',text:'Morning! HES Solar wants a call Thursday. Setting it up.',time:'8:24 AM'},
      {id:2,from:'amelia',to:'laneea',text:'Amazing!! Send them the clean energy deck first.',time:'8:31 AM'},
      {id:3,from:'laneea',to:'amelia',text:'Done! H2OM swimsuit samples arrive Friday.',time:'8:35 AM'},
    ];
    lsSave('chq-ms',S.messages);
  }
  if(!S.workouts.length){
    S.workouts=[
      {id:1,day:'Monday',focus:'Posture + Core',exercises:[{name:'Posture wall stands',sets:'3x60s'},{name:'Glute bridges',sets:'4x15'},{name:'Dead bugs',sets:'3x12'},{name:'Plank',sets:'3x45s'}],notes:'Neutral spine. No rushing.'},
      {id:2,day:'Wednesday',focus:'Strength + Cardio',exercises:[{name:'Romanian deadlift',sets:'4x10'},{name:'Step-ups',sets:'3x12 each'},{name:'Lateral band walks',sets:'3x20'},{name:'Incline walk',sets:'20 min'}],notes:'Keep heart rate moderate.'},
      {id:3,day:'Friday',focus:'Stage Prep',exercises:[{name:'Heel walks 30m',sets:'5 laps'},{name:'Turn practice',sets:'10 min'},{name:'Stage presence mirror',sets:'15 min'},{name:'Yoga flow',sets:'20 min'}],notes:'Practice in competition heels.'},
    ];
    lsSave('chq-wk',S.workouts);
  }
  if(!S.looks.length){
    S.looks=[
      {id:1,event:'Evening Gown',round:'Competition Night',title:'Sustainable Silk Gown',desc:'Custom design. Deadstock silk, natural dye. Tanzanite and champagne tones.',img:''},
      {id:2,event:'Swimsuit Round',round:'Competition Day 2',title:'ECONYL Ocean Plastic',desc:'H2OM partnership. Made from regenerated ocean plastic.',img:''},
      {id:3,event:'Interview Look',round:'Competition Day 1',title:'Power Suit',desc:'Tailored, structured, sustainable fabric. Engineer energy.',img:''},
      {id:4,event:'Opening Night',round:'Pre-Competition',title:'Statement Arrival',desc:'First impression. Sustainable brand, bold color.',img:''},
    ];
    lsSave('chq-lk',S.looks);
  }
  if(!S.posts.length){ seedLibrary(); }
  if(!S.todos||!Object.keys(S.todos).length){
    S.todos={
      amelia:[
        {id:1,text:'Pay FULL entry fee by March 31 — get embroidered sash',done:false},
        {id:2,text:'Submit official headshot by June 1 (300dpi, white bg, 3/4 length)',done:false},
        {id:3,text:'Follow @misscausa @misscateenusa @crowndivaproductions on IG',done:false},
        {id:4,text:'Watch for social media intro script — post next week',done:false},
        {id:5,text:'Book room at Grand Hyatt Indian Wells — use group rate link',done:false},
        {id:6,text:'Contact official photographers: Dorian Qi or Lisa G. Artistry',done:false},
        {id:7,text:'Walk into Lucid Motors SD with printed deck',done:false},
        {id:8,text:'Email Paired Power and SD Community Power',done:false},
      ],
      laneea:[
        {id:1,text:'Contact Kristie Axmaker: info@misscaliforniausa.com / 805-262-7973',done:false},
        {id:2,text:'Book Grand Hyatt Indian Wells rooms — use contestant group rate',done:false},
        {id:3,text:'Research Dorian Qi + Lisa G. Artistry for headshot shoot',done:false},
        {id:4,text:'Confirm H2OM swimsuit sizing',done:false},
        {id:5,text:'Research sustainable gown designers for Miss California stage',done:false},
        {id:6,text:'Prepare sponsor pitch deck with Miss Temecula title',done:false},
        {id:7,text:'Book HMU trial for gown night look',done:true},
      ],
      trainer:[{id:1,text:'Send Amelia this week training plan',done:true},{id:2,text:'Book Friday stage prep session',done:false}],
      hmu:[{id:1,text:'Source vegan makeup brands',done:false},{id:2,text:'Schedule interview day makeup trial',done:false}],
      sponsor:[],contributor:[]
    };
    lsSave('chq-td',S.todos);
  }
}

function seedLibrary(){
  S.posts=[
    {id:1,title:'The Morning That Changes Everything',tag:'Beauty & Wellness',cat:'wellness',date:'2026-03-21',status:'draft',cover:'',body:'<div class="mag-hero">The Morning That<br>Changes <em>Everything</em></div><div class="mag-byline">By Amelia Arabe · Beauty & Wellness · March 2026</div><p class="mag-drop">I used to think my mornings were the problem. Too scattered, too ambitious, too many tabs open in my head before I even made coffee. I have ADHD, which means my brain moves fast and my hands sometimes forget to follow. But I have learned something important: structure is not the enemy of freedom. Structure is what makes freedom possible.</p><div class="mag-pq">"A beautiful day starts with a beautiful morning. Non-negotiable."</div><p>My morning does not begin with my phone. It begins with water — a full glass before anything else. Then I make something beautiful to eat. Not elaborate. Beautiful. There is a difference. A sliced mango arranged on a white plate. Eggs cooked slowly with herbs. Matcha in my favorite cup. I am a breakfast girl. I take it seriously.</p><p>After breakfast, I rotate through my hobbies. Not all of them every day — that would be chaos. But I have learned to anchor my mornings with at least one creative practice. Monday is cello. Tuesday is drawing. Wednesday is voice warm-ups. Thursday is painting. Friday is photography. The weekends are ocean days when possible — freediving, snorkeling, just being near the water that inspires everything I make.</p><p>Then movement. Pilates or yoga for posture and core. Tennis for joy and stamina. Walking always. The body is the instrument. I treat it like one.</p>'},
    {id:2,title:'SB 707 and What It Actually Means for Fashion',tag:'Fashion Accountability',cat:'fashion',date:'2026-03-19',status:'draft',cover:'',body:'<div class="mag-hero">SB 707 and What<br>It Actually <em>Means</em></div><div class="mag-byline">By Amelia Arabe · Fashion Accountability · March 2026</div><p class="mag-drop">Fashion is the second most polluting industry on Earth. I say this not to be dramatic but because it is a fact I cite constantly and I believe in citing facts correctly. Ten percent of global carbon emissions. Eighty-five percent of textiles end up in landfills. The fashion industry uses 93 billion cubic meters of water annually. These numbers are not abstractions. They are the cost of what we wear.</p><div class="mag-pq">"Every garment has a carbon cost. I advocate for the policy that makes brands pay it — not the planet."</div><p>SB 707 — the Responsible Textile Producer Program — is California\'s answer to this. It is an Extended Producer Responsibility law. What that means in plain language: the brands that make the clothes become financially responsible for what happens when those clothes are no longer worn. The cost of textile waste management shifts from California taxpayers to the companies creating the waste.</p><p>This is not a punishment for fashion. It is an incentive to design differently. When waste becomes expensive, longevity becomes profitable. When disposal costs money, circularity makes sense. SB 707 does not tell brands what to design. It changes what makes good business sense to design.</p><p>As an engineer, I find this elegant. You do not have to convince every designer to care about the planet. You change the economic structure so that caring about the planet is the rational choice.</p>'},
    {id:3,title:'SB 100 and the Bridge to Lived Reality',tag:'Clean Energy & EV Policy',cat:'energy',date:'2026-03-17',status:'draft',cover:'',body:'<div class="mag-hero">SB 100 and the<br>Bridge to <em>Lived Reality</em></div><div class="mag-byline">By Amelia Arabe · Clean Energy Policy · March 2026</div><p class="mag-drop">California passed SB 100 in 2018. It mandated 100 percent clean energy by 2045. This is law. Not aspiration — law. And yet the gap between what the law requires and what people experience in their daily lives remains enormous. That gap is where I work. That gap is my platform.</p><div class="mag-pq">"SB 100 is law. Net-zero is the target. My platform is the bridge between legislation and lived reality."</div><p>Polyester makes up 65 percent of all clothing manufactured globally. It is derived from crude oil. The textile mills that produce it are among the most energy-intensive manufacturing facilities in existence. A transition to renewable energy in those mills is not a fashion story. It is an energy story. It is a climate story. It is the story of what SB 100 actually means when you follow it downstream into the supply chains that shape what we wear.</p><p>Green-collar jobs are the economic argument. California positioning itself as the clean fashion capital of North America is the industry argument. And the moral argument is simple: we already have the technology. Solar-powered mills exist. Bio-based fibers exist. ECONYL regeneration exists. The problem is not technical. It is political will, investment, and the courage to connect the dots.</p>'},
    {id:4,title:'A Solarpunk Glossary for the Uninitiated',tag:'Solarpunk & Sustainable Tech',cat:'solarpunk',date:'2026-03-15',status:'draft',cover:'',body:'<div class="mag-hero">A Solarpunk Glossary<br>for the <em>Uninitiated</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita · March 2026</div><p class="mag-drop">Solarpunk is an aesthetic and a political project. It imagines futures that are not dystopian. This seems simple. It is not. Most science fiction about the future imagines collapse, hierarchy, scarcity. Solarpunk imagines abundance, community, beauty. It asks: what if the future was actually good? And then it tries to build it.</p><div class="mag-pq">"I am not describing a utopia. I am describing a building permit."</div><p><strong>Circular economy</strong> — a system where waste from one process becomes input for another. Nothing discarded; everything cycled. The opposite of our current linear model of take, make, dispose.</p><p><strong>ECONYL</strong> — a regenerated nylon fiber made from ocean plastic waste, fishing nets, fabric scraps. My swimsuit of choice for competition. It is beautiful and it has a story.</p><p><strong>Bio-based fiber</strong> — textiles derived from plant sources rather than petroleum. Linen, hemp, organic cotton, Tencel from eucalyptus wood pulp. Each with different properties, different tradeoffs, different futures.</p><p><strong>Extended Producer Responsibility (EPR)</strong> — a policy framework that makes manufacturers responsible for the end-of-life management of their products. SB 707 is an EPR law. It is the policy mechanism that makes circular economy possible at scale.</p>'},
    {id:5,title:'The Athlete Body as an Art Form',tag:'Fitness & Movement',cat:'fitness',date:'2026-03-13',status:'draft',cover:'',body:'<div class="mag-hero">The Athlete Body<br>as an <em>Art Form</em></div><div class="mag-byline">By Amelia Arabe · Fitness & Movement · March 2026</div><p class="mag-drop">I want an athlete body. I say this without apology. I want to be strong. I want stamina. I want the kind of physical ease that comes from consistent training over time — the ease that lets you walk across a stage in heels after a full day of competition without your posture collapsing. I want to swim in the ocean without tiring. I want to serve an ace.</p><div class="mag-pq">"Train like an athlete. Move like an artist. The body is the instrument."</div><p>My movement practice has five pillars. Pilates for core, posture, and the long lean strength that photographs beautifully. Tennis for joy, stamina, and the competitive edge that transfers to everything. Yoga for flexibility, breath, and the stillness that makes presence possible. Swimming for full-body conditioning and the connection to water that feeds my soul. And walking — always walking — because it is the practice that clears my head and gives me my best ideas.</p><p>I do not train to punish my body. I train to know what it can do. There is a difference, and it took me a long time to learn it. The athlete body I want is not an aesthetic project alone. It is a capacity project. I want to be capable. Capable of competing. Capable of performing. Capable of carrying myself through whatever the next stage of my life requires.</p>'},
    {id:6,title:'The Library of Alexandria Rebuilt',tag:'Library of Morenita',cat:'morenita',date:'2026-03-10',status:'draft',cover:'',body:'<div class="mag-hero">The Library of<br>Alexandria <em>Rebuilt</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita · March 2026</div><p class="mag-drop">The Library of Alexandria was the most important knowledge repository of the ancient world. Scholars traveled from across the Mediterranean to read there. It held works by Euclid, Archimedes, Sophocles, hundreds of thousands of scrolls. Then it burned. Not once but several times over centuries, each fire taking something irreplaceable.</p><div class="mag-pq">"Cultural infrastructure for the next century. The kind that does not burn."</div><p>Library of Morenita is my answer to that problem. It is a sustainable digital archive — sustainable meaning it is designed to last, to be maintained, to survive the fires that consume most creative work. Most of what artists and thinkers produce disappears. It goes unpublished, unshared, unseen. It exists on hard drives that fail and in notebooks that get lost and in conversations that no one recorded.</p><p>I am building something that does not burn. A place for ideas, for research, for the writing and music and visual work of people whose names the world does not know yet. I am the founding editor and curator. I am also, inevitably, one of the first subjects — building the infrastructure by becoming an example of what the infrastructure can hold.</p><p>The Morenita Prototype, my journal calls it. Amelia Arabe is building the infrastructure for the next generation of renaissance leaders — she is proving it works by becoming one.</p>'},
    {id:7,title:'Why I Entered a Pageant',tag:'Personal',cat:'morenita',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">Why I Entered<br>a <em>Pageant</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita</div><div class="mag-pq">"I am not here for the crown. I am here for the microphone."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> Start with the question everyone asks. Not defensively — directly. Yes, I entered a pageant. Here is exactly why.</p><p><strong>Section 1 — The Tool Argument:</strong> Every platform is a tool. A GitHub repo does not reach the people who write California policy. A pageant stage does. I am an engineer. I use the right tool for the job.</p><p><strong>Section 2 — What I Actually Want:</strong> Not validation. Not a crown. A microphone pointed at the people who fund clean energy legislation and set textile import policy. That is what Miss California USA gives me.</p><p><strong>Section 3 — The Tension:</strong> Honest about the contradiction. Pageantry has a complicated history. I am not pretending otherwise. I am choosing to be inside the room rather than critiquing it from outside.</p><p><strong>Section 4 — What Winning Means:</strong> Platform amplification. Press access. A title that opens doors for the policy conversations I am already having.</p><p><strong>Close:</strong> If I do not win, the work continues. But I plan to win.</p>'},
    {id:8,title:'SB 707 Explained — The Law That Could Change Fashion',tag:'Fashion Accountability',cat:'fashion',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">SB 707 Explained —<br>The Law That Could Change <em>Fashion</em></div><div class="mag-byline">By Amelia Arabe · Fashion Accountability</div><div class="mag-pq">"Extended Producer Responsibility means the brand pays. Not the planet. Not the taxpayer."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> One number: 85% of textiles end up in landfills. One law: SB 707. Here is what it actually does.</p><p><strong>Section 1 — What EPR Means:</strong> Extended Producer Responsibility in plain language. The brand that makes the garment becomes financially responsible for what happens when you are done with it.</p><p><strong>Section 2 — What SB 707 Specifically Does:</strong> The Responsible Textile Producer Program. How it shifts costs. What the compliance timeline looks like. Who is affected.</p><p><strong>Section 3 — Why This Is Elegant Engineering:</strong> You do not have to convince every designer to care about the planet. You change the economic structure so that caring is the rational business decision.</p><p><strong>Section 4 — What Brands Are Fighting It:</strong> Who lobbied against it and why. What their arguments are and why they do not hold.</p><p><strong>Close:</strong> The law exists. The fight now is implementation and funding.</p>'},
    {id:9,title:'What Keel Labs Is Doing With Algae',tag:'Solarpunk & Sustainable Tech',cat:'solarpunk',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">What Keel Labs<br>Is Doing With <em>Algae</em></div><div class="mag-byline">By Amelia Arabe · Solarpunk & Sustainable Tech</div><div class="mag-pq">"Kelsun is not a sustainability compromise. It is a better material."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> The shirt you are wearing is probably made from crude oil. Keel Labs is making fiber from algae. Here is why that matters more than you think.</p><p><strong>Section 1 — The Polyester Problem:</strong> 65% of all clothing is polyester. Derived from petroleum. Energy-intensive to produce. Takes centuries to decompose. This is the problem Keel is solving.</p><p><strong>Section 2 — How Kelsun Works:</strong> Engineer explanation of algae-based fiber production. What makes it different. What the tradeoffs are — because there are always tradeoffs.</p><p><strong>Section 3 — Why This Is a Systems Story:</strong> Keel Labs is not just a material company. It is proof that the technical solutions already exist. The gap is adoption speed and policy support.</p><p><strong>Section 4 — What I Would Build With It:</strong> Personal angle. As an engineer designing net-zero hardware, what does this material unlock?</p><p><strong>Close:</strong> The future of fashion is not cotton or polyester. It is grown.</p>'},
    {id:10,title:'The Supply Chain of What You Are Wearing Right Now',tag:'Fashion Accountability',cat:'fashion',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">The Supply Chain of<br>What You Are Wearing <em>Right Now</em></div><div class="mag-byline">By Amelia Arabe · Fashion Accountability</div><div class="mag-pq">"Every garment is a supply chain. Every supply chain is a choice."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> Pick up whatever you are wearing. Read the label. That tag is the end of a story that started in a field or a refinery. Here is the middle part nobody talks about.</p><p><strong>Section 1 — Raw Materials:</strong> Where fiber comes from. Cotton fields, petroleum refineries, sheep farms. The carbon cost before a single thread is spun.</p><p><strong>Section 2 — The Mill:</strong> Energy-intensive. Often coal-powered. Located in countries with weaker environmental regulation. SB 100 has no jurisdiction here — yet.</p><p><strong>Section 3 — Assembly and Shipping:</strong> The geography of fast fashion. Why your shirt was grown in one country, woven in another, sewn in a third, and shipped to you in a plastic bag.</p><p><strong>Section 4 — The Disposal:</strong> Where it goes when you donate it. The truth about textile recycling. What landfill actually means for synthetic fabric.</p><p><strong>Close:</strong> Transparency is the first policy. You cannot fix what you cannot see.</p>'},
    {id:11,title:'San Diego as a Clean Fashion Capital',tag:'Clean Energy & EV Policy',cat:'energy',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">San Diego as a<br>Clean Fashion <em>Capital</em></div><div class="mag-byline">By Amelia Arabe · Clean Energy Policy</div><div class="mag-pq">"California has the legislation. San Diego has the engineering talent. The question is whether we have the will."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> California is the fifth largest economy in the world and the state with the strongest environmental legislation. San Diego is its most innovative city. Why is nobody talking about what that combination could mean for fashion?</p><p><strong>Section 1 — The Policy Foundation:</strong> SB 100, SB 707, Scope 3 reporting. The legislation is already there. California leads.</p><p><strong>Section 2 — The Engineering Talent:</strong> Cleantech San Diego. Qualcomm. The biotech corridor. The talent that builds clean energy hardware can build clean fashion infrastructure.</p><p><strong>Section 3 — The Green Collar Opportunity:</strong> What solar-powered textile mills in California would mean for jobs. The economic argument for clean fashion manufacturing.</p><p><strong>Section 4 — What Needs to Happen:</strong> Investment, policy bridge, industry will. What the roadmap looks like from an engineering perspective.</p><p><strong>Close:</strong> This is not a fantasy. It is a zoning decision and a funding round away.</p>'},
    {id:12,title:'Cello, Engineering, and Why I Need Both',tag:'Personal',cat:'morenita',date:'2026-03-24',status:'draft',cover:'',body:'<div class="mag-hero">Cello, Engineering,<br>and Why I Need <em>Both</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita</div><div class="mag-pq">"Engineering teaches me to solve. Cello teaches me to feel the problem first."</div><p><strong>OUTLINE</strong></p><p><strong>Hook:</strong> People ask which one I am. The engineer or the musician. The answer is that the question does not make sense to me.</p><p><strong>Section 1 — What Engineering Gives Me:</strong> Systems thinking. Precision. The ability to look at a problem and see its components. The satisfaction of a solution that works.</p><p><strong>Section 2 — What Cello Gives Me:</strong> Presence. The ability to be inside a moment rather than analyzing it. The understanding that some things cannot be optimized — they can only be felt.</p><p><strong>Section 3 — Where They Meet:</strong> The best engineering has an aesthetic. The best music has a structure. Infrastructure as beauty. Synchronicity as design.</p><p><strong>Section 4 — What This Means for Leadership:</strong> The teams I have led. What it means to hold the tempo and set the tone. The cello as metaphor for the kind of infrastructure I want to build — invisible, essential, emotional.</p><p><strong>Close:</strong> I will be a renaissance woman. Not as an aspiration. As a plan.</p>'}
  ];
  lsSave('chq-po',S.posts);
}

// ═══ PASSWORDS ════════════════════════════════════════════════
var PASSWORDS=Object.assign({amelia:'serph',laneea:'withlove',kathy:'finance2026'},lsGet('chq-pw',{}));

// ═══ UNIFIED LOGIN ═══════════════════════════════════════════
// Single username/password login that routes to the right role
// Amelia and Laneea use their name as username + their password
// Portal users (hmu, sponsor, contributor, trainer) use their portal profile username/password
function submitUnifiedLogin(){
  var username=(document.getElementById('login-username').value||'').trim().toLowerCase();
  var password=(document.getElementById('login-password').value||'').trim();
  var errEl=document.getElementById('login-error');
  if(errEl) errEl.textContent='';

  if(!username||!password){
    if(errEl) errEl.textContent='Please enter your username and password.';
    return;
  }

  // 1. Check Amelia
  if(username==='amelia'||username==='amelia arabe'||username==='ameliaarabe'){
    if(password===PASSWORDS.amelia){ doLogin('amelia'); return; }
    showLoginError(); return;
  }

  // 2. Check Laneea
  if(username==='laneea'||username==='laneea love'||username==='laneeалove'){
    if(password===PASSWORDS.laneea){ doLogin('laneea'); return; }
    showLoginError(); return;
  }

  // 3. Check Donovan (trainer — no portal profile, direct role)
  if(username==='donovan'||username==='trainer'){
    if(password==='train2026'){ doLogin('trainer'); return; }
    showLoginError(); return;
  }

  // 4. Check Kathy (finance)
  if(username==='kathy'||username==='finance'){
    if(password===PASSWORDS.kathy){ doLogin('finance'); return; }
    showLoginError(); return;
  }

  // 5. Check portal profiles across all portal roles
  var portalRoles=['hmu','sponsor','contributor'];
  for(var ri=0;ri<portalRoles.length;ri++){
    var role=portalRoles[ri];
    var profile=findPortalProfileByUsername(role,username);
    if(profile){
      if(String(profile.password||'')===password){
        if(!profile.active){
          if(errEl) errEl.textContent='Your account is not active yet. Contact Amelia\'s team.';
          return;
        }
        doLogin(role,profile.id);
        return;
      } else {
        showLoginError(); return;
      }
    }
  }

  // Not found
  showLoginError();
}

function showLoginError(){
  var pw=document.getElementById('login-password');
  var errEl=document.getElementById('login-error');
  if(pw){
    pw.style.borderColor='rgba(255,100,60,.5)';
    pw.value='';
    setTimeout(function(){pw.style.borderColor='rgba(240,216,152,.15)';},1200);
    pw.focus();
  }
  if(errEl) errEl.textContent='Incorrect username or password.';
}
var PENDING_ROLE=null;

function tryLogin(role,btn){
  if(PASSWORDS[role]){
    PENDING_ROLE=role;
    document.getElementById('pw-'+role).classList.add('show');
    setTimeout(function(){var inp=document.getElementById('pw-inp-'+role);if(inp)inp.focus();},100);
  } else {
    doLogin(role);
  }
}

function submitPw(role){
  var inp=document.getElementById('pw-inp-'+role);
  if(!inp)return;
  if(inp.value===PASSWORDS[role]){
    doLogin(role);
  } else {
    inp.classList.add('shake');
    inp.value='';
    setTimeout(function(){inp.classList.remove('shake');},400);
  }
}

function cancelPw(role,e){
  e.stopPropagation();
  document.getElementById('pw-'+role).classList.remove('show');
  var inp=document.getElementById('pw-inp-'+role);
  if(inp) inp.value='';
  PENDING_ROLE=null;
}

function openPortalLogin(role){
  var modal=g('m-portal-login');
  if(!modal)return;
  var title=g('portal-login-title');
  var modeLbl=g('portal-login-mode-label');
  var nameWrap=g('portal-signup-name-wrap');
  var companyWrap=g('portal-signup-company-wrap');
  var nameEl=g('portal-login-name');
  var companyEl=g('portal-login-company');
  var email=g('portal-login-email');
  var username=g('portal-login-username');
  var password=g('portal-login-password');
  var submit=g('portal-login-submit');
  var hint=g('portal-login-hint');
  if(title)title.textContent=role==='sponsor'?'Sponsor Portal Access':role==='contributor'?'Contributor Portal Access':'Hair & Makeup Portal Access';
  if(nameEl)nameEl.value='';
  if(companyEl)companyEl.value='';
  if(email)email.value='';
  if(username)username.value='';
  if(password)password.value='';
  modal.dataset.role=role;
  modal.dataset.mode='login';
  if(modeLbl)modeLbl.textContent='Sign In';
  if(nameWrap)nameWrap.style.display='none';
  if(companyWrap)companyWrap.style.display='none';
  if(email)email.parentElement.style.display='none';
  if(submit)submit.textContent='Sign In';
  if(hint)hint.textContent=role==='sponsor'?'First time here? Create an account with your email, then sign back in anytime with your username and password.':role==='contributor'?'First-time contributors can create an account with email, then sign back in anytime with a username and password.':'First-time artists can create an account with email, then return anytime with a username and password.';
  openM('m-portal-login');
  setTimeout(function(){if(username)username.focus();},60);
}

function setPortalAuthMode(mode){
  var modal=g('m-portal-login');
  if(!modal)return;
  var role=modal.dataset.role;
  modal.dataset.mode=mode;
  var modeLbl=g('portal-login-mode-label');
  var nameWrap=g('portal-signup-name-wrap');
  var companyWrap=g('portal-signup-company-wrap');
  var email=g('portal-login-email');
  var submit=g('portal-login-submit');
  var hint=g('portal-login-hint');
  if(modeLbl)modeLbl.textContent=mode==='create'?'Create Account':'Sign In';
  if(nameWrap)nameWrap.style.display=mode==='create'?'block':'none';
  if(companyWrap)companyWrap.style.display=mode==='create'?'block':'none';
  if(email)email.parentElement.style.display=mode==='create'?'block':'none';
  if(submit)submit.textContent=mode==='create'?'Create Account':'Sign In';
  if(hint){
    hint.textContent=mode==='create'
      ? (role==='sponsor'?'Create your sponsor portal with email first, then come back with your username and password.':role==='contributor'?'Create your contributor account with email first, then come back with your username and password.':'Create your artist account with email first, then come back with your username and password.')
      : (role==='sponsor'?'Sign in with the username and password tied to your sponsor portal.':role==='contributor'?'Sign in with the username and password tied to your contributor account.':'Sign in with the username and password tied to your artist account.');
  }
}

function submitPortalLogin(){
  var modal=g('m-portal-login');
  if(!modal)return;
  var role=modal.dataset.role;
  var mode=modal.dataset.mode||'login';
  var profiles=getPortalProfiles();
  var list=profiles[role]||[];
  var name=(g('portal-login-name')?g('portal-login-name').value:'').trim();
  var company=(g('portal-login-company')?g('portal-login-company').value:'').trim();
  var email=(g('portal-login-email')?g('portal-login-email').value:'').trim().toLowerCase();
  var username=(g('portal-login-username')?g('portal-login-username').value:'').trim();
  var password=(g('portal-login-password')?g('portal-login-password').value:'').trim();
  if(mode==='create'){
    if(!email||!username||!password){
      showToast('Email, username, and password required');
      return;
    }
    if(findPortalProfileByUsername(role,username)){
      showToast('Username already taken');
      return;
    }
    if(list.some(function(p){return String(p.email||'').toLowerCase()===email;})){
      showToast('Email already has an account');
      return;
    }
    var item={
      id:(username.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now()).replace(/^-+|-+$/g,''),
      name:name||(role==='sponsor'?'New Sponsor':role==='contributor'?'New Contributor':'New Artist'),
      company:company||'',
      email:email,
      username:username,
      password:password,
      status:role==='sponsor'?'possible':'active',
      active:true,
      notes:'Created from login screen',
      goals:[]
    };
    if(role==='hmu'||role==='contributor')item.specialty='';
    profiles[role].unshift(item);
    savePortalProfiles(profiles);
    closeM('m-portal-login');
    doLogin(role,item.id);
    return;
  }
  var profile=findPortalProfileByUsername(role,username);
  if(!profile||String(profile.password||'')!==password){
    var passEl=g('portal-login-password');
    if(passEl){
      passEl.classList.add('shake');
      passEl.value='';
      setTimeout(function(){passEl.classList.remove('shake');},400);
    }
    return;
  }
  if(!profile.active){
    showToast('Account not active yet');
    return;
  }
  closeM('m-portal-login');
  doLogin(role,profile.id);
}

function changePortalUsername(){
  if(!S.portalProfile||!S.role)return;
  var next=(prompt('Choose a new username:',S.portalProfile.username||'')||'').trim();
  if(!next)return;
  var dupe=findPortalProfileByUsername(S.role,next);
  if(dupe&&String(dupe.id)!==String(S.portalProfile.id)){
    showToast('Username already taken');
    return;
  }
  var profiles=getPortalProfiles();
  var item=(profiles[S.role]||[]).find(function(p){return String(p.id)===String(S.portalProfile.id);});
  if(!item)return;
  item.username=next;
  savePortalProfiles(profiles);
  syncActivePortalProfile();
  showToast('Username updated');
  showPanel(S.panel||'dashboard');
}

function changePortalPassword(){
  if(!S.portalProfile||!S.role)return;
  var next=(prompt('Choose a new password:', '')||'').trim();
  if(!next)return;
  var profiles=getPortalProfiles();
  var item=(profiles[S.role]||[]).find(function(p){return String(p.id)===String(S.portalProfile.id);});
  if(!item)return;
  item.password=next;
  savePortalProfiles(profiles);
  syncActivePortalProfile();
  showToast('Password updated');
}

function getPortalWorkspaceKey(){
  if(!S.portalProfile||!S.role)return '';
  return 'portal:'+S.role+':'+S.portalProfile.id;
}

function getPortalWorkspaceLabel(){
  if(!S.portalProfile||!S.role)return '';
  var base=S.portalProfile.company||S.portalProfile.name||ROLES[S.role].name;
  return base+' Workspace';
}

function getPortalGoals(){
  return Array.isArray(S.portalProfile&&S.portalProfile.goals)?S.portalProfile.goals:[];
}

function savePortalProfilePatch(patch){
  if(!S.portalProfile||!S.role)return;
  var profiles=getPortalProfiles();
  var item=(profiles[S.role]||[]).find(function(p){return String(p.id)===String(S.portalProfile.id);});
  if(!item)return;
  Object.keys(patch||{}).forEach(function(k){item[k]=patch[k];});
  savePortalProfiles(profiles);
  syncActivePortalProfile();
}

function togglePortalGoal(idx){
  var goals=getPortalGoals().slice();
  if(!goals[idx])return;
  goals[idx].done=!goals[idx].done;
  savePortalProfilePatch({goals:goals});
  if(S.panel==='hmu-dash'||S.panel==='sponsor-portal'||S.panel==='contributor-dash')showPanel(S.panel);
}

function addPortalGoal(){
  if(!S.portalProfile)return;
  var text=(prompt('Add a goal:', '')||'').trim();
  if(!text)return;
  var goals=getPortalGoals().slice();
  goals.push({text:text,done:false});
  savePortalProfilePatch({goals:goals});
  if(S.panel==='hmu-dash'||S.panel==='sponsor-portal'||S.panel==='contributor-dash')showPanel(S.panel);
}

function removePortalGoal(idx){
  var goals=getPortalGoals().slice();
  goals.splice(idx,1);
  savePortalProfilePatch({goals:goals});
  if(S.panel==='hmu-dash'||S.panel==='sponsor-portal'||S.panel==='contributor-dash')showPanel(S.panel);
}

function renderPortalGoalsCard(title){
  var goals=getPortalGoals();
  return '<div class="card"><div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.55rem"><div class="cl">'+title+'</div><button class="btn bg" style="font-size:.58rem;padding:.25rem .65rem" onclick="addPortalGoal()">+ Add</button></div>' +
    (goals.length?goals.map(function(goal,idx){
      return '<div class="todo-item">' +
        '<div class="todo-cb '+(goal.done?'done':'')+'" onclick="togglePortalGoal('+idx+')"></div>' +
        '<span class="todo-txt '+(goal.done?'done':'')+'">'+goal.text+'</span>' +
        '<button class="todo-rm" onclick="removePortalGoal('+idx+')">×</button>' +
        '</div>';
    }).join(''):'<div style="font-size:.76rem;color:var(--wg);line-height:1.7">No goals yet. Add the first one for this workspace.</div>') +
    '</div>';
}

// ═══ ROLES ═══════════════════════════════════════════════════
var ROLES={
  amelia:{name:'Amelia Arabe',abbr:'AA',color:'var(--ch)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'dashboard'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'👥',lbl:'Team Admin',id:'team-admin'},
      {ico:'🌐',lbl:'Campaign Site',id:'campaign-site'},
      {ico:'✍️',lbl:'Library Editor',id:'library-editor'},
      {ico:'💰',lbl:'Sponsors',id:'sponsors',badge:true},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'🎤',lbl:'Interview Prep',id:'quiz'},
      {ico:'📣',lbl:'Advocacy',id:'advocacy'},
      {ico:'🖼',lbl:'Mood Board',id:'moodboard'},
      {ico:'👗',lbl:'Looks',id:'looks'},
      {ico:'🌿',lbl:'Wellness',id:'fitness'},
      {ico:'📱',lbl:'Social Media',id:'social'},
      {ico:'📬',lbl:'Inbox',id:'inbox'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['timeline','sponsors','looks','brand','dashboard','workouts','appointments','goals','todos','library']
  },
  laneea:{name:'Laneea Love',abbr:'LL',color:'var(--lv)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'laneea-dash'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'💰',lbl:'Sponsors',id:'sponsors',badge:true},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'👗',lbl:'Looks & Styling',id:'looks'},
      {ico:'🖼',lbl:'Mood Board',id:'moodboard'},
      {ico:'📬',lbl:'Inbox',id:'inbox'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['sponsors','looks','appointments','todos']
  },
  hmu:{name:'Hair & Makeup',abbr:'HM',color:'var(--bl)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'hmu-dash'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'💬',lbl:'Chat',id:'messages'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:[]
  },
  trainer:{name:'Donovan',abbr:'TR',color:'var(--sg)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'trainer-dash'},
      {ico:'🌿',lbl:'Wellness',id:'fitness'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
    ],
    editable:['workouts','todos']
  },
  sponsor:{name:'Sponsor',abbr:'SP',color:'var(--ch3)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'sponsor-portal'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'💬',lbl:'Chat',id:'messages'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:[]
  },
  contributor:{name:'Contributor',abbr:'CO',color:'var(--go)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'contributor-dash'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'💬',lbl:'Chat',id:'messages'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:[]
  },
  finance:{name:'Kathy',abbr:'KF',color:'var(--sg2)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'finance-dash'},
      {ico:'👤',lbl:'My Profile',id:'profile'},
      {ico:'💰',lbl:'Expenses',id:'expenses'},
      {ico:'🧾',lbl:'Invoices',id:'invoices'},
      {ico:'👗',lbl:'Looks & Costs',id:'looks'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
      {ico:'💬',lbl:'Chat',id:'messages'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['expenses','invoices','looks']
  }
};

// ═══ LOGIN/LOGOUT ═════════════════════════════════════════════
function doLogin(role,portalProfileId){
  S.role=role;
  S.portalProfile=portalProfileId?getPortalProfile(role,portalProfileId):null;
  seed();
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('on');
  var r=ROLES[role];
  var displayName=S.portalProfile?S.portalProfile.name:r.name;
  var displayAbbr=S.portalProfile?String(S.portalProfile.name||r.name).split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase():r.abbr;
  g('tb-av').textContent=displayAbbr;
  g('tb-av').style.background=r.color;
  g('tb-un').textContent=displayName;
  g('tb-date').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase();
  buildSB(r.nav);

  // ── PERFORMANCE: show dashboard immediately from localStorage ──
  // Supabase syncs in background — user never waits for network
  if(portalProfileId) S.portalProfile=getPortalProfile(role,portalProfileId);
  showPanel(r.nav[0].id);
  // Background Supabase sync — silently refreshes data after render
  setTimeout(function(){
    loadFromSupabase().then(function(){
      if(portalProfileId) S.portalProfile=getPortalProfile(role,portalProfileId);
      // Only re-render current panel if data changed
      if(S.panel) showPanel(S.panel);
    }).catch(function(){/* Supabase unavailable — localStorage data is fine */});
  }, 800);

  var eb=g('em-btn');
  if(eb) eb.style.display=(r.editable&&r.editable.length)?'block':'none';
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  if(days<=30) document.body.classList.add('countdown-urgent');
  else document.body.classList.remove('countdown-urgent');
  var cd=g('sb-countdown');if(cd)cd.textContent=days;
  var pg=g('sb-prog');if(pg)pg.style.width=Math.min(100,Math.round(((112-days)/112)*100))+'%';
  var rn=g('sb-role-name');if(rn)rn.textContent=displayName;
}

function doSwitch(){
  S.role=null; S.portalProfile=null; S.emActive=false;
  document.body.classList.remove('em');
  var eb=g('em-btn'); if(eb){eb.classList.remove('on');eb.textContent='Edit Mode';}
  document.getElementById('login').style.display='flex';
  document.getElementById('app').classList.remove('on');
  // reset pw overlays
  ['amelia','laneea'].forEach(function(r){
    var o=document.getElementById('pw-'+r);if(o)o.classList.remove('show');
    var i=document.getElementById('pw-inp-'+r);if(i)i.value='';
  });
}

// ═══ SIDEBAR ══════════════════════════════════════════════════
function buildSB(nav){
  g('sb-nav').innerHTML=nav.map(function(n){
    return '<div class="nav-i" onclick="showPanel(\''+n.id+'\',this)" id="ni-'+n.id+'">' +
      '<span class="nav-ico">'+n.ico+'</span>' +
      '<span class="nav-lbl">'+n.lbl+'</span>' +
      (n.badge?'<span class="nav-badge">'+S.sponsors.filter(function(s){return s.status==='new';}).length+'</span>':'') +
      '</div>';
  }).join('');
}
function toggleSB(){g('sidebar').classList.toggle('open');}
function closeSB(){if(window.innerWidth<=768)g('sidebar').classList.remove('open');}

// ═══ PANELS ═══════════════════════════════════════════════════
// ── Remove duplicate dashboard functions defined earlier ──────
// (bHMUDash, bSponsorPortal, bContributorDash were redefined)
// The correct versions are further down — showPanel uses a lazy
// lookup so forward references work fine.

function showPanel(id,navEl){
  S.panel=id;
  document.querySelectorAll('.nav-i').forEach(function(n){n.classList.remove('on');});
  if(navEl) navEl.classList.add('on');
  else{var n=g('ni-'+id);if(n)n.classList.add('on');}
  g('main').innerHTML='';
  // Lazy panel lookup — functions resolved at call time not definition time
  var panelFn = {
    'dashboard':        function(){ bDash(); },
    'laneea-dash':      function(){ bLaneaDash(); },
    'hmu-dash':         function(){ bHMUDash(); },
    'trainer-dash':     function(){ bTrainerDash(); },
    'finance-dash':     function(){ bFinanceDash(); },
    'sponsor-portal':   function(){ bSponsorPortal(); },
    'contributor-dash': function(){ bContributorDash(); },
    'sponsors':         function(){ bSponsors(); },
    'calendar':         function(){ bCalendar(); },
    'library':          function(){ bLibrary(); },
    'library-editor':   function(){ bLibraryEditor(); },
    'quiz':             function(){ bQuiz(); },
    'brand':            function(){ bBrand(); },
    'moodboard':        function(){ bMoodboard(); },
    'looks':            function(){ bLooks(); },
    'fitness':          function(){ bFitness(); },
    'profile':          function(){ bProfile(); },
    'team-admin':       function(){ bTeamAdmin(); },
    'expenses':         function(){ bExpenses(); },
    'invoices':         function(){ bInvoices(); },
    'messages':         function(){ bMessages(); },
    'files':            function(){ bFiles(); },
    'board':            function(){ bBoard(); },
    'social':           function(){ bSocial(); },
    'inbox':            function(){ bInbox(); },
    'deliverables':     function(){ bDeliverables(); },
    'comp-progress':    function(){ bCompProgress(); },
    'advocacy':         function(){ bAdvocacy(); },
    'lookbook':         function(){ bLookbook(); },
    'campaign-site':    function(){ bCampaignEditor(); },
  }[id];
  if(panelFn) panelFn();
  else bPlaceholder(id);
  closeSB();
  if(S.emActive) setTimeout(applyEM,80);
}

// ═══ HELPERS ══════════════════════════════════════════════════
function g(id){return document.getElementById(id);}
function inject(html){g('main').innerHTML=html;}
function rerenderKeepScroll(renderFn){
  var main=g('main');
  var pb=main?main.querySelector('.pb'):null;
  var mainTop=main?main.scrollTop:0;
  var pbTop=pb?pb.scrollTop:0;
  renderFn();
  function restore(){
    var newMain=g('main');
    if(newMain&&mainTop>0) newMain.scrollTop=mainTop;
    var newPb=newMain?newMain.querySelector('.pb'):null;
    if(newPb&&pbTop>0) newPb.scrollTop=pbTop;
  }
  restore();
  requestAnimationFrame(function(){ restore(); requestAnimationFrame(restore); });
}
function openM(id){g(id).classList.add('on');}
function closeM(id){g(id).classList.remove('on');}
function fdate(d){if(!d)return'';var dt=new Date(d+'T12:00:00');return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function showToast(msg){var t=g('toast');if(!t)return;t.textContent=msg||'Saved';t.classList.add('on');clearTimeout(window._tt);window._tt=setTimeout(function(){t.classList.remove('on');},1800);}
function copyQuick(text,label){
  if(!text)return;
  navigator.clipboard.writeText(text);
  showToast((label||'Copied')+' copied');
}
function renderContactsCard(compact){
  var data=getPageantContacts();
  return '<div class="card'+(compact?' pc-card':'')+'"><div class="cl">Pageant Contacts</div>' +
    '<div class="pc-list">' +
    data.people.map(function(p){
      return '<div class="pc-row">' +
        '<div class="pc-main"><div class="pc-name">'+p.name+'</div><div class="pc-role">'+p.role+(p.note?' · '+p.note:'')+'</div></div>' +
        '<div class="pc-meta">' +
        (p.email?'<button class="pc-chip" onclick="copyQuick(\''+p.email+'\',\'Email\')">'+p.email+'</button>':'') +
        (p.phone?'<button class="pc-chip" onclick="copyQuick(\''+p.phone+'\',\'Phone\')">'+p.phone+'</button>':'') +
        '</div></div>';
    }).join('') +
    '</div>' +
    '<div class="pc-links">' +
    '<button class="pc-link" onclick="window.open(\''+data.links.hotel+'\',\'_blank\')">Hotel Link</button>' +
    '<button class="pc-link" onclick="window.open(\''+data.links.sash+'\',\'_blank\')">Sash Form</button>' +
    '<button class="pc-link" onclick="copyQuick(\''+data.links.hotel+'\',\'Hotel link\')">Copy Hotel Link</button>' +
    '</div></div>';
}
function renderRegistrationCard(){
  var contacts=getPageantContacts();
  var hotel=contacts.links.hotel;
  return '<div class="card reg-card"><div class="cl">Registration HQ</div>' +
    '<div class="reg-head">Miss Temecula Valley USA 2026 confirmed</div>' +
    '<div class="reg-sub">Grand Hyatt Indian Wells Resort & Villas · July 10-12, 2026</div>' +
    '<div class="reg-grid">' +
    '<div class="reg-item"><span class="reg-k">Mar 31</span><strong>Pay in full for complimentary embroidered sash</strong></div>' +
    '<div class="reg-item"><span class="reg-k">Jun 1</span><strong>Official headshot due in Contestant Portal</strong></div>' +
    '<div class="reg-item"><span class="reg-k">Hotel</span><strong>Friends & Family rate available</strong></div>' +
    '<div class="reg-item"><span class="reg-k">Social</span><strong>Official intro script coming next week</strong></div>' +
    '</div>' +
    '<div class="reg-actions">' +
    '<button class="btn bp" onclick="window.open(\''+hotel+'\',\'_blank\')">Open Hotel Link</button>' +
    '<button class="btn bg" onclick="copyQuick(\''+hotel+'\',\'Hotel link\')">Copy Hotel Link</button>' +
    '<button class="btn bg" onclick="showPanel(\'inbox\')">Open Inbox Note</button>' +
    '</div></div>';
}

// ═══ AMELIA DASHBOARD ════════════════════════════════════════
function bDash(){
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  var closed=S.sponsors.filter(function(s){return s.status==='closed';}).length;
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  var tl=lsGet('chq-timeline',[]);
  var tlDef=[
    {dot:'var(--bl2)',date:'Mar 31',text:'$500 deposit due',tag:'tu',tagtext:'urgent',idx:0},
    {dot:'var(--ch3)',date:'Now',text:'Launch YouTube channel',tag:'ta',tagtext:'this week',idx:1},
    {dot:'var(--du)',date:'Apr 1',text:'Priority 1 sponsor outreach',idx:2},
    {dot:'var(--du)',date:'Apr 30',text:'$500 installment due',idx:3},
    {dot:'var(--du)',date:'Jun 30',text:'$1,000 final balance',idx:4},
    {dot:'var(--du)',date:'Jul 10',text:'Miss Temecula Valley USA 2026',idx:5},
  ];
  var goals=S.goals;
  var gDefaults=[
    {ico:'▶️',name:'YouTube followers',key:'youtube',target:'5K',cur:'0'},
    {ico:'📸',name:'Instagram followers',key:'ig',target:'100K',cur:'1.4K'},
    {ico:'📝',name:'Written publications',key:'pubs',target:'12',cur:'0'},
    {ico:'🌱',name:'Mother Earth volunteer',key:'vol',target:'3x',cur:'0x'},
    {ico:'👠',name:'Runways walked',key:'runways',target:'3',cur:'0'},
    {ico:'🏛',name:'Gallery show / oil paintings',key:'gallery',target:'1',cur:'Planning'},
    {ico:'🎙',name:'Podcast launch',key:'podcast',target:'Launch',cur:'Concept'},
    {ico:'📚',name:'Library of Morenita live',key:'library',target:'Live',cur:'Building'},
  ];
  var gSaved=lsGet('chq-gd',null);
  var gDef=gSaved?gSaved:gDefaults.map(function(g2){
    return {ico:g2.ico,name:g2.name,key:g2.key,target:g2.target,cur:goals[g2.key]||g2.cur};
  });
  var dmb=(S.dashMood&&S.dashMood.amelia)||[];

  inject(
    '<div style="display:flex;flex-direction:column;">' +

    // MORNING BRIEF
    '<div style="background:var(--tz);padding:1.25rem 1.75rem;border-bottom:1px solid rgba(240,216,152,.06)">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.65rem">' +
    '<div>' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.2rem">'+new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase()+'</div>' +
    '<div style="font-family:var(--fd);font-size:1.2rem;font-style:italic;color:var(--ch)">'+getMorningGreeting()+'</div>' +
    '</div>' +
    '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
    getBriefAlerts() +
    '</div>' +
    '</div>' +
    '</div>' +

    // OATH HERO
    '<div style="padding:1.35rem 1.75rem 0">' +
    '<div class="oath">' +
    '<div class="oath-glow"></div>' +
    '<div class="oath-label">The Seraphim Oath</div>' +
    '<div class="oath-text" data-e="oath:seraphim:text">'+(goals.oath||'Miss Temecula Valley USA 2026. Miss California USA 2026. Miss USA. Miss Universe. I am not competing. I am arriving.')+'</div>' +
    '<div class="oath-attr">Amelia Arabe · 2026</div>' +
    '</div>' +

    // NORTH STARS
    '<div class="ns-grid">' +
    '<div class="ns-card compassion"><div class="ns-icon">🌸</div><div class="ns-title">Compassion</div><div class="ns-text" data-e="ns:compassion:text">'+(goals.ns_compassion||'I treat myself and others with compassion — and that is what makes me truly beautiful.')+'</div></div>' +
    '<div class="ns-card energy"><div class="ns-icon">⚡</div><div class="ns-title">Clean Energy</div><div class="ns-text" data-e="ns:energy:text">'+(goals.ns_energy||'SB 100 is law. Net-zero is the target. My platform is the bridge between legislation and lived reality.')+'</div></div>' +
    '<div class="ns-card fashion"><div class="ns-icon">🌿</div><div class="ns-title">Fashion Accountability</div><div class="ns-text" data-e="ns:fashion:text">'+(goals.ns_fashion||'Every garment has a carbon cost. I advocate for the policy that makes brands pay it — not the planet.')+'</div></div>' +
    '<div class="ns-card pageant"><div class="ns-icon">👑</div><div class="ns-title">Pageant</div><div class="ns-text" data-e="ns:pageant:text">'+(goals.ns_pageant||'I walk into every room already having won it.')+'</div></div>' +
    '</div>' +

    // COUNTDOWN + STATS
    '<div class="g4" style="margin-bottom:.85rem">' +
    '<div class="stat st-bl"><div class="sn" data-e="goal:days:text">'+days+'</div><div class="sl">Days to Crown</div><div class="prog"><div class="pf pf-s" style="width:'+Math.min(100,Math.round(((112-days)/112)*100))+'%"></div></div><div class="pl">July 10 2026</div></div>' +
    '<div class="stat st-ch"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div><div class="prog"><div class="pf pf-c" style="width:'+Math.min(100,Math.round((raised/2500)*100))+'%"></div></div><div class="pl">Goal: $<span data-e="goal:fundraise:text">'+(goals.fundraise||'2,500')+'</span></div></div>' +
    '<div class="stat st-tz"><div class="sn">'+closed+'</div><div class="sl">Sponsors Closed</div></div>' +
    '<div class="stat st-sg"><div class="sn">96K</div><div class="sl">Social Reach</div></div>' +
    '</div>' +

    // CAREER GOALS + TIMELINE
    '<div class="g2" style="margin-bottom:.85rem">' +

    '<div class="card">' +
    '<div class="cl">Goals</div>' +
    gDef.map(function(g2,gi){
      return '<div class="goal-item">' +
        '<span class="goal-ico">'+g2.ico+'</span>' +
        '<div style="flex:1"><div class="goal-name">'+g2.name+'</div></div>' +
        '<span style="font-family:var(--fd);font-size:.9rem;font-style:italic;color:var(--tz2)" data-e="goalcur:'+g2.key+':cur">'+g2.cur+'</span>' +
        '<span style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin:0 .25rem">/</span>' +
        '<span style="font-family:var(--fm);font-size:.6rem;color:var(--tz3)" data-e="goaltar:'+g2.key+':target">'+g2.target+'</span>' +
        '</div>';
    }).join('') +
    '</div>' +

    '<div class="card"><div class="cl">Key Timeline</div>' +
    tlDef.map(function(t){
      var txt=(tl[t.idx]&&tl[t.idx].text)||t.text;
      var dt=(tl[t.idx]&&tl[t.idx].date)||t.date;
      return '<div class="tl"><div class="tl-d" style="background:'+t.dot+'"></div>' +
        '<span class="tl-dt" data-e="tl:'+t.idx+':date">'+dt+'</span>' +
        '<div class="tl-t"><strong data-e="tl:'+t.idx+':text">'+txt+'</strong>' +
        (t.tag?'<span class="tag '+t.tag+'">'+t.tagtext+'</span>':'') +
        '</div></div>';
    }).join('') +
    '</div>' +
    '</div>' +

    '<div class="g2" style="margin-bottom:.85rem">' +
    renderRegistrationCard() +
    renderContactsCard(true) +
    '</div>' +

    // TO-DO + MESSAGES
    '<div class="g2" style="margin-bottom:.85rem">' +
    '<div class="card"><div class="cl">My To-Do</div>' + renderTodos('amelia') + '</div>' +
    '<div class="card"><div class="cl">Recent Messages</div>' +
    S.messages.slice(-3).map(function(m){
      return '<div style="padding:.4rem 0;border-bottom:1px solid var(--ch4)">' +
        '<div style="font-size:.72rem;font-weight:600;color:var(--ink)">'+(m.from==='amelia'?'You':m.from)+'</div>' +
        '<div style="font-size:.75rem;color:var(--st);line-height:1.5">'+m.text+'</div>' +
        '</div>';
    }).join('') +
    '<button class="btn bg" style="margin-top:.5rem;font-size:.6rem" onclick="showPanel(\'messages\')">View All</button>' +
    '</div>' +
    '</div>' +

    // DASHBOARD MOOD BOARD
    '<div class="card" style="margin-bottom:.85rem"><div class="cl">My Board <span style="font-family:var(--fm);font-size:.48rem;color:var(--tz4)">— personal inspiration</span></div>' +
    renderDashMood('amelia') +
    '</div>' +



    '</div></div>'
  );
}

// ═══ OTHER DASHBOARDS ════════════════════════════════════════
function bPlaceholderDash(role,ns,first){
  var rp=getRolePages()[role]||{quote:ns,focus:''};
  var dmb=(S.dashMood&&S.dashMood[role])||[];
  inject(
    '<div style="padding:1.35rem 1.75rem">' +
    '<div class="ph-ns"><div class="ph-ns-q" data-e="rolepage:'+role+':quote">'+rp.quote+'</div><div class="ph-ns-sub">'+ROLES[role].name+'</div></div>' +
    '<div class="card" style="margin:.85rem 0">' +
    '<div class="cl">Focus for Today</div>' +
    '<div class="edit-hint" data-e="rolepage:'+role+':focus">'+rp.focus+'</div>' +
    '<div style="margin-top:.75rem">'+first+'</div>' +
    '</div>' +
    '<div class="card" style="margin:.85rem 0"><div class="cl">My To-Do</div>' + renderTodos(role) + '</div>' +
    '<div class="card"><div class="cl">My Board</div>' + renderDashMood(role) + '</div>' +
    '</div>'
  );
}


function openGoalEditor(){
  var list=g('goal-editor-list');
  if(!list)return;
  list.innerHTML=gDef.map(function(g2,i){
    return '<div style="display:grid;grid-template-columns:2rem 1fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem" id="grow-'+i+'">' +
      '<input class="fi" value="'+g2.ico+'" id="gico-'+i+'" style="padding:.3rem;text-align:center;font-size:1rem">' +
      '<input class="fi" value="'+g2.name.replace(/"/g,'&quot;')+'" id="gname-'+i+'" placeholder="Goal name">' +
      '<input class="fi" value="'+g2.cur.replace(/"/g,'&quot;')+'" id="gcur-'+i+'" placeholder="Current">' +
      '<input class="fi" value="'+g2.target.replace(/"/g,'&quot;')+'" id="gtgt-'+i+'" placeholder="Target">' +
      '<button onclick="removeGoalRow('+i+')" style="background:none;border:none;color:var(--bl2);cursor:pointer;font-size:1rem;padding:0 .25rem">×</button>' +
      '</div>';
  }).join('');
  openM('m-goals');
}
function addGoalRow(){
  var list=g('goal-editor-list');if(!list)return;
  var i=list.children.length;
  var div=document.createElement('div');
  div.id='grow-'+i;
  div.style.cssText='display:grid;grid-template-columns:2rem 1fr 1fr 1fr auto;gap:.4rem;align-items:center;margin-bottom:.4rem';
  div.innerHTML='<input class="fi" id="gico-'+i+'" placeholder="🎯" style="padding:.3rem;text-align:center;font-size:1rem">'+
    '<input class="fi" id="gname-'+i+'" placeholder="Goal name">'+
    '<input class="fi" id="gcur-'+i+'" placeholder="Current">'+
    '<input class="fi" id="gtgt-'+i+'" placeholder="Target">'+
    '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--bl2);cursor:pointer;font-size:1rem;padding:0 .25rem">×</button>';
  list.appendChild(div);
}
function removeGoalRow(i){var el=g('grow-'+i);if(el)el.remove();}
function saveGoals(){
  var list=g('goal-editor-list');if(!list)return;
  var newGoals=[];
  Array.from(list.children).forEach(function(row,i){
    var ico=row.querySelector('[id^="gico-"]'),name=row.querySelector('[id^="gname-"]'),cur=row.querySelector('[id^="gcur-"]'),tgt=row.querySelector('[id^="gtgt-"]');
    if(name&&name.value.trim()){
      var key='goal_'+Date.now()+'_'+i;
      newGoals.push({ico:(ico?ico.value:'🎯'),name:name.value.trim(),key:key,cur:(cur?cur.value.trim():''),target:(tgt?tgt.value.trim():'')});
    }
  });
  lsSave('chq-gd',newGoals);
  closeM('m-goals');
  showToast('Goals saved');
  bDash();
}
function bLaneaDash(){
  var today = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  var raised = S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  var meetings = S.sponsors.filter(function(s){return s.status==='meeting';}).length;
  var contacted = S.sponsors.filter(function(s){return s.status==='contacted';}).length;
  var daysLeft = Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  var nextAppts = (S.appts||[]).filter(function(a){ return a.date >= new Date().toISOString().slice(0,10); }).slice(0,3);
  var looks = S.looks||[];
  var todos = (S.todos&&S.todos.laneea)||[];
  var openTodos = todos.filter(function(t){return !t.done;});

  inject(
    '<div class="ph"><div>' +
    '<div class="ph-tag">Campaign Manager</div>' +
    '<div class="ph-title">Good to see you, <em>Laneea</em></div>' +
    '</div>' +
    '<div class="ph-acts" style="font-family:var(--fm);font-size:.5rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase">'+today+'</div>' +
    '</div>' +
    '<div class="pb">' +

    // Countdown banner
    '<div style="background:var(--ink);border-radius:10px;padding:1.1rem 1.4rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;border:0.5px solid rgba(201,168,76,.1)">' +
    '<div><div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:rgba(201,168,76,.38);text-transform:uppercase;margin-bottom:.2rem">Competition Day</div>' +
    '<div style="font-family:var(--fd);font-size:1.2rem;font-style:italic;color:rgba(250,247,242,.85)">Miss California USA &middot; July 10, 2026</div></div>' +
    '<div style="text-align:right"><div style="font-family:var(--fd);font-size:2.5rem;font-style:italic;color:var(--go);line-height:1">'+daysLeft+'</div><div style="font-family:var(--fm);font-size:.44rem;color:rgba(201,168,76,.38);letter-spacing:2px;text-transform:uppercase">days</div></div>' +
    '</div>' +

    // Stats row
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin-bottom:1rem">' +
    '<div class="stat st-sg"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>' +
    '<div class="stat st-ch"><div class="sn">'+meetings+'</div><div class="sl">Meetings Set</div></div>' +
    '<div class="stat st-bl"><div class="sn">'+contacted+'</div><div class="sl">In Pipeline</div></div>' +
    '<div class="stat" style="border-top-color:var(--go)"><div class="sn">'+looks.length+'</div><div class="sl">Looks Staged</div></div>' +
    '</div>' +

    '<div class="g2">' +

    // This week
    '<div>' +
    '<div class="card">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
    '<div class="cl" style="margin-bottom:0">This Week</div>' +
    '<button class="btn bg" style="font-size:.52rem;padding:.2rem .6rem;min-height:28px" onclick="showPanel(\'calendar\')">Full calendar</button>' +
    '</div>' +
    (nextAppts.length ? nextAppts.map(function(a){
      return '<div class="appt-i">' +
        '<div class="appt-time">'+fdate(a.date)+'<br><span style="color:var(--muted)">'+( a.time||'')+'</span></div>' +
        '<div class="appt-body"><div class="appt-title">'+escHtml(a.title||'')+'</div><div class="appt-who">'+escHtml(a.who||'')+'</div></div>' +
        '</div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:1rem">No upcoming appointments</div>') +
    '</div>' +

    // Open tasks
    '<div class="card" style="margin-top:.75rem">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
    '<div class="cl" style="margin-bottom:0">Open Tasks <span style="color:var(--si)">'+openTodos.length+'</span></div>' +
    '</div>' +
    (openTodos.length ? openTodos.slice(0,5).map(function(t){
      return '<div class="todo-item"><div class="todo-cb '+(t.done?'done':'')+'" onclick="toggleTodo(\'laneea\','+t.id+',this)"></div><span class="todo-txt">'+escHtml(t.text)+'</span></div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:.75rem">All clear ✓</div>') +
    '<div class="todo-add-row"><input class="todo-inp" id="todo-inp-laneea" placeholder="Add task..." onkeydown="if(event.key===\'Enter\')addTodo(\'laneea\')"><button class="btn bg" style="font-size:.58rem;min-height:32px" onclick="addTodo(\'laneea\')">Add</button></div>' +
    '</div>' +
    '</div>' +

    // Sponsor pipeline snapshot + looks queue
    '<div>' +
    '<div class="card">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
    '<div class="cl" style="margin-bottom:0">Sponsor Pipeline</div>' +
    '<button class="btn bg" style="font-size:.52rem;padding:.2rem .6rem;min-height:28px" onclick="showPanel(\'sponsors\')">Manage</button>' +
    '</div>' +
    (S.sponsors.slice(0,5).map(function(s){
      var cls = {new:'s-new',contacted:'s-contacted',meeting:'s-meeting',closed:'s-closed',declined:'s-declined'}[s.status]||'s-new';
      return '<div style="display:flex;align-items:center;gap:.65rem;padding:.42rem 0;border-bottom:0.5px solid var(--iv3)">' +
        '<div style="flex:1;font-size:.78rem;font-weight:500;color:var(--ink)">'+escHtml(s.name)+'</div>' +
        '<div style="font-family:var(--fd);font-size:.88rem;font-style:italic;color:var(--muted)">'+escHtml(s.ask||'')+'</div>' +
        '<span class="s-btn '+cls+'">'+s.status+'</span></div>';
    }).join('') || '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:1rem">No sponsors yet</div>') +
    '</div>' +

    '<div class="card" style="margin-top:.75rem">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
    '<div class="cl" style="margin-bottom:0">Looks Queue</div>' +
    '<button class="btn bg" style="font-size:.52rem;padding:.2rem .6rem;min-height:28px" onclick="showPanel(\'looks\')">All looks</button>' +
    '</div>' +
    (looks.slice(0,3).map(function(lk){
      return '<div style="display:flex;align-items:center;gap:.65rem;padding:.42rem 0;border-bottom:0.5px solid var(--iv3)">' +
        (lk.img?'<img src="'+lk.img+'" style="width:36px;height:36px;border-radius:4px;object-fit:cover;flex-shrink:0">':'<div style="width:36px;height:36px;border-radius:4px;background:var(--iv2);flex-shrink:0"></div>') +
        '<div><div style="font-size:.78rem;font-weight:500;color:var(--ink)">'+escHtml(lk.title||'')+'</div><div style="font-size:.68rem;color:var(--muted)">'+escHtml(lk.event_name||'')+'</div></div></div>';
    }).join('') || '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:.75rem">No looks staged yet</div>') +
    '</div>' +
    '</div>' +

    '</div>' + // g2
    '</div>'   // pb
  );
}

function bHMUDash(){
  var profile = S.portalProfile;
  var name = profile ? profile.name : 'Hair & Makeup Team';
  var specialty = profile && profile.specialty ? profile.specialty : 'Beauty direction';
  var daysLeft = Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  var nextAppts = (S.appts||[]).filter(function(a){
    return a.date >= new Date().toISOString().slice(0,10) && (a.type==='hair'||a.type==='styling'||a.type==='hmu');
  }).slice(0,4);

  inject(
    '<div class="ph"><div><div class="ph-tag">Hair & Makeup</div><div class="ph-title">Welcome, <em>'+escHtml(name)+'</em></div></div></div>' +
    '<div class="pb">' +

    // Hero card
    '<div style="background:var(--ink);border-radius:10px;padding:1.5rem;margin-bottom:1rem;border:0.5px solid rgba(201,168,76,.1)">' +
    '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:rgba(201,168,76,.35);text-transform:uppercase;margin-bottom:.5rem">Your role on this campaign</div>' +
    '<div style="font-family:var(--fd);font-size:1.25rem;font-style:italic;color:rgba(250,247,242,.85);margin-bottom:.3rem">'+escHtml(name)+' is the beauty direction for Amelia Arabe.</div>' +
    '<div style="font-size:.78rem;color:rgba(250,247,242,.45);line-height:1.7">'+escHtml(specialty)+' &middot; Competition: July 10, 2026 &middot; <strong style="color:rgba(201,168,76,.6)">'+daysLeft+' days away</strong></div>' +
    '</div>' +

    '<div class="g2">' +

    // Upcoming events
    '<div class="card">' +
    '<div class="cl">Upcoming Dates</div>' +
    (nextAppts.length ? nextAppts.map(function(a){
      return '<div class="appt-i">' +
        '<div class="appt-time">'+fdate(a.date)+'<br><span style="color:var(--muted)">'+(a.time||'')+'</span></div>' +
        '<div class="appt-body"><div class="appt-title">'+escHtml(a.title||'')+'</div><div class="appt-who">'+escHtml(a.who||'')+'</div></div>' +
        '</div>';
    }).join('') :
    '<div style="font-size:.75rem;color:var(--faint);padding:1rem;text-align:center">No upcoming beauty appointments yet.</div>') +
    '<div style="margin-top:.75rem;font-size:.72rem;color:var(--muted)">Check Calendar for the full schedule.</div>' +
    '</div>' +

    // Goals + quick links
    '<div>' +
    renderPortalGoalsCard('Beauty Goals') +
    '<div class="card" style="margin-top:.75rem">' +
    '<div class="cl">Quick Links</div>' +
    '<div style="display:flex;flex-direction:column;gap:.4rem">' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'messages\')">💬 Message Amelia</button>' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'files\')">📁 Upload Photos / Files</button>' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'calendar\')">📅 View Calendar</button>' +
    '</div>' +
    (profile ? '<div style="margin-top:.75rem;display:flex;gap:.4rem"><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalUsername()">Change Username</button><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalPassword()">Change Password</button></div>' : '') +
    '</div>' +
    '</div>' +

    '</div></div>'
  );
}

function bSponsorPortal(){
  var profile = S.portalProfile;
  var partnerName = profile ? (profile.company||profile.name) : 'Sponsor Partner';
  var daysLeft = Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  var progress = [
    {label:'Entry Secured',done:true,note:'Miss Temecula Valley USA 2026'},
    {label:'Coach Engaged',done:true,note:'Weekly training sessions'},
    {label:'Wardrobe In Progress',done:false,note:'With Laneea — gown + swimsuit'},
    {label:'Sponsor Partnerships',done:false,note:'Building now'},
    {label:'Competition Week',done:false,note:'July 10 · Grand Hyatt Indian Wells'},
  ];

  inject(
    '<div style="background:var(--ink);padding:2rem 1.75rem;border-bottom:0.5px solid rgba(201,168,76,.08)">' +
    '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:4px;color:rgba(201,168,76,.3);text-transform:uppercase;margin-bottom:.5rem">Sponsor Portal</div>' +
    '<div style="font-family:var(--fd);font-size:1.7rem;font-style:italic;color:rgba(250,247,242,.85);margin-bottom:.6rem;line-height:1.2">'+escHtml(partnerName)+' is not sponsoring a pageant.<br>'+escHtml(partnerName)+' is funding a platform.</div>' +
    '<div style="font-size:.8rem;line-height:1.8;color:rgba(250,247,242,.5)">Thank you for investing in Amelia Arabe\'s Miss Temecula Valley USA 2026 campaign. Your support puts clean energy and fashion accountability policy on a California stage.</div>' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:rgba(201,168,76,.28);margin-top:.75rem">— Amelia Arabe &amp; Laneea</div>' +
    '</div>' +
    '<div class="pb">' +

    // Countdown
    '<div style="background:var(--sip);border-radius:8px;padding:.85rem 1.1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;border:0.5px solid var(--sil)">' +
    '<div style="font-size:.8rem;color:var(--si)">Competition Day &mdash; July 10, 2026</div>' +
    '<div style="font-family:var(--fd);font-size:1.6rem;font-style:italic;color:var(--si)">'+daysLeft+' days</div>' +
    '</div>' +

    '<div class="g2">' +
    '<div>' +
    '<div class="cl">Campaign Progress</div>' +
    progress.map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--iv3)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong> &mdash; '+p.note+'</div></div>';
    }).join('') +
    '</div>' +
    '<div>' +
    renderPortalGoalsCard('Sponsor Goals') +
    '<div class="card" style="margin-top:.75rem">' +
    '<div class="cl">Your Portal</div>' +
    '<div style="font-size:.78rem;color:var(--muted);line-height:1.7;margin-bottom:.75rem">Use Chat to reach Amelia\'s team directly. Use Files to exchange logos, invoices, and deliverables.</div>' +
    '<div style="display:flex;flex-direction:column;gap:.4rem">' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'messages\')">💬 Message the team</button>' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'files\')">📁 Files & Deliverables</button>' +
    '</div>' +
    (profile ? '<div style="margin-top:.75rem;display:flex;gap:.4rem"><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalUsername()">Change Username</button><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalPassword()">Change Password</button></div>' : '') +
    '</div>' +
    '</div>' +
    '</div>' + // g2
    '</div>'
  );
}

function bContributorDash(){
  var profile = S.portalProfile;
  var name = profile ? profile.name : 'Contributor';
  var specialty = profile && profile.specialty ? profile.specialty : 'Photography & Media';
  var daysLeft = Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));

  inject(
    '<div class="ph"><div><div class="ph-tag">Contributor Portal</div><div class="ph-title">Welcome, <em>'+escHtml(name)+'</em></div></div></div>' +
    '<div class="pb">' +

    '<div style="background:var(--ink);border-radius:10px;padding:1.35rem;margin-bottom:1rem;border:0.5px solid rgba(201,168,76,.08)">' +
    '<div style="font-family:var(--fd);font-size:1.15rem;font-style:italic;color:rgba(250,247,242,.82);margin-bottom:.3rem">'+escHtml(specialty)+'</div>' +
    '<div style="font-size:.76rem;color:rgba(250,247,242,.42);line-height:1.7">This workspace is for sending Amelia photography, selects, and media assets. Competition: <strong style="color:rgba(201,168,76,.6)">July 10 · '+daysLeft+' days away</strong></div>' +
    '</div>' +

    '<div class="g2">' +

    '<div class="card">' +
    '<div class="cl">What to Send</div>' +
    '<div style="display:flex;flex-direction:column;gap:.6rem">' +
    [{t:'Headshots',d:'Official selects, retouched finals, vertical crops.'},{t:'Stage Photos',d:'Swimsuit, gown, interview, BTS coverage.'},{t:'Media Notes',d:'Captions, delivery timing, file descriptions.'}].map(function(item){
      return '<div style="padding:.65rem .75rem;background:var(--iv2);border-radius:6px;border:0.5px solid var(--iv3)">' +
        '<div style="font-size:.78rem;font-weight:600;color:var(--ink);margin-bottom:.2rem">'+item.t+'</div>' +
        '<div style="font-size:.7rem;color:var(--muted);line-height:1.6">'+item.d+'</div></div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:.85rem;display:flex;flex-direction:column;gap:.4rem">' +
    '<button class="btn bc" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'files\')">📁 Upload Files Now</button>' +
    '<button class="btn bg" style="width:100%;text-align:left;justify-content:flex-start" onclick="showPanel(\'messages\')">💬 Message Amelia</button>' +
    '</div>' +
    '</div>' +

    '<div>' +
    renderPortalGoalsCard('Contributor Goals') +
    (profile ? '<div class="card" style="margin-top:.75rem"><div class="cl">Account</div>' +
    '<div style="font-size:.78rem;color:var(--muted);margin-bottom:.65rem">'+escHtml(profile.company||'')+(profile.email?' &middot; '+escHtml(profile.email):'')+'</div>' +
    '<div style="display:flex;gap:.4rem"><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalUsername()">Change Username</button><button class="btn bg" style="font-size:.52rem;flex:1" onclick="changePortalPassword()">Change Password</button></div>' +
    '</div>' : '') +
    '</div>' +

    '</div></div>'
  );
}

function bTrainerDash(){
  var fd = lsGet('chq-fitness',{});
  fd.measurements = fd.measurements || {};
  fd.days = fd.days || {};
  var daysLeft = Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  var today = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  var todayKey = new Date().toLocaleDateString('en-US',{weekday:'short'}).slice(0,3).toLowerCase();
  var split = ['mon','tue','wed','thu','fri','sat','sun'];
  var focusMap = {mon:'Core Circuit',tue:'Swim',wed:'Legs + Barre',thu:'Tennis',fri:'Arms + Posture',sat:'Swim + Ballet',sun:'Active Recovery'};
  var doneThisWeek = split.filter(function(k){ return fd.days[k]&&fd.days[k].done; }).length;

  inject(
    '<div class="ph"><div><div class="ph-tag">Fitness Coach</div><div class="ph-title">Training Brief, <em>Donovan</em></div></div>' +
    '<div class="ph-acts" style="font-family:var(--fm);font-size:.5rem;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase">'+today+'</div></div>' +
    '<div class="pb">' +

    // Countdown
    '<div style="background:var(--ink);border-radius:10px;padding:1rem 1.3rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;border:0.5px solid rgba(201,168,76,.1)">' +
    '<div><div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:rgba(201,168,76,.35);text-transform:uppercase;margin-bottom:.2rem">Competition Day</div>' +
    '<div style="font-family:var(--fd);font-size:1.1rem;font-style:italic;color:rgba(250,247,242,.82)">Miss California USA &middot; July 10, 2026</div></div>' +
    '<div style="text-align:right"><div style="font-family:var(--fd);font-size:2.2rem;font-style:italic;color:var(--go);line-height:1">'+daysLeft+'</div>' +
    '<div style="font-family:var(--fm);font-size:.42rem;color:rgba(201,168,76,.35);letter-spacing:2px;text-transform:uppercase">days</div></div>' +
    '</div>' +

    '<div class="g2">' +

    // Amelia's stats
    '<div>' +
    '<div class="card">' +
    '<div class="cl">Amelia\'s Measurements</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem">' +
    [
      {k:'waist',l:'Waist'},{k:'hips',l:'Hips'},
      {k:'arms',l:'Arms'},{k:'thighs',l:'Thighs'}
    ].map(function(m){
      return '<div style="background:var(--iv2);border-radius:6px;padding:.65rem;border:0.5px solid var(--iv3)">' +
        '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:.2rem">'+m.l+'</div>' +
        '<div style="font-family:var(--fd);font-size:1.5rem;font-style:italic;color:'+((fd.measurements[m.k])?'var(--si)':'var(--faint)')+'">'+((fd.measurements[m.k])||'—')+'<span style="font-size:.7rem;color:var(--muted)"> in</span></div>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:.65rem;padding:.65rem;background:var(--sgp);border-radius:6px;border:0.5px solid var(--sal)">' +
    '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:2px;color:var(--sa);text-transform:uppercase;margin-bottom:.2rem">This Week</div>' +
    '<div style="font-family:var(--fd);font-size:1.4rem;font-style:italic;color:var(--sg)">'+doneThisWeek+'/7 <span style="font-size:.9rem;color:var(--sal)">sessions complete</span></div>' +
    '</div>' +
    '</div>' +

    // Weekly split overview
    '<div class="card">' +
    '<div class="cl">Weekly Split</div>' +
    split.map(function(k){
      var done = fd.days[k]&&fd.days[k].done;
      var isToday = k===todayKey;
      return '<div style="display:flex;align-items:center;gap:.6rem;padding:.38rem 0;border-bottom:0.5px solid var(--iv3)">' +
        '<div style="width:28px;height:28px;border-radius:50%;background:'+(done?'var(--sg2)':isToday?'var(--sip)':'var(--iv2)')+';border:0.5px solid '+(done?'var(--sg2)':isToday?'var(--sil)':'var(--iv3)')+';display:flex;align-items:center;justify-content:center;font-family:var(--fm);font-size:.48rem;color:'+(done?'white':isToday?'var(--si)':'var(--muted)')+';flex-shrink:0;text-transform:uppercase">'+k.toUpperCase()+'</div>' +
        '<div style="flex:1;font-size:.78rem;color:'+(isToday?'var(--ink)':'var(--muted)')+';font-weight:'+(isToday?'600':'400')+'">'+focusMap[k]+'</div>' +
        (done?'<span style="font-family:var(--fm);font-size:.46rem;color:var(--sg2)">Done ✓</span>':isToday?'<span style="font-family:var(--fm);font-size:.46rem;color:var(--si)">Today</span>':'') +
        '</div>';
    }).join('') +
    '</div>' +

    '</div>' + // g2

    // Quick links
    '<div style="display:flex;gap:.6rem;margin-top:.85rem;flex-wrap:wrap">' +
    '<button class="btn bc" style="flex:1" onclick="showPanel(\'fitness\')">Open Full Training Plan</button>' +
    '<button class="btn bg" style="flex:1" onclick="showPanel(\'calendar\')">View Calendar</button>' +
    '<button class="btn bg" style="flex:1" onclick="showPanel(\'board\')">Discussion</button>' +
    '</div>' +

    '</div>'
  );
}

// ═══ TODO ════════════════════════════════════════════════════
function renderTodos(role){
  var items=(S.todos&&S.todos[role])||[];
  return '<div id="todo-list-'+role+'">' +
    items.map(function(t){
      return '<div class="todo-item" id="ti-'+role+'-'+t.id+'">' +
        '<div class="todo-cb '+(t.done?'done':'')+'" onclick="toggleTodo(\''+role+'\','+t.id+',this)"></div>' +
        '<span class="todo-txt '+(t.done?'done':'')+'" contenteditable="false" onblur="saveTodoText(\''+role+'\','+t.id+',this.textContent)">'+t.text+'</span>' +
        '<button class="todo-rm" onclick="removeTodo(\''+role+'\','+t.id+')">×</button>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<div class="todo-add-row">' +
    '<input class="todo-inp" id="todo-inp-'+role+'" placeholder="Add task..." onkeydown="if(event.key===\'Enter\')addTodo(\''+role+'\')">' +
    '<button class="btn bp" style="font-size:.6rem;padding:.3rem .75rem" onclick="addTodo(\''+role+'\')">+ Add</button>' +
    '</div>';
}

function toggleTodo(role,id,el){
  var list=S.todos[role]||[];
  var item=list.find(function(t){return t.id===id;});
  if(!item)return;
  item.done=!item.done;
  lsSave('chq-td',S.todos);
  el.classList.toggle('done',item.done);
  var txt=el.nextSibling;
  if(txt) txt.classList.toggle('done',item.done);
}

function saveTodoText(role,id,val){
  var list=S.todos[role]||[];
  var item=list.find(function(t){return t.id===id;});
  if(item){item.text=val;lsSave('chq-td',S.todos);showToast();}
}

function addTodo(role){
  var inp=g('todo-inp-'+role);
  if(!inp||!inp.value.trim())return;
  if(!S.todos[role])S.todos[role]=[];
  var newId=Date.now();
  S.todos[role].push({id:newId,text:inp.value.trim(),done:false});
  lsSave('chq-td',S.todos);
  inp.value='';
  var list=g('todo-list-'+role);
  if(list){
    var item=S.todos[role][S.todos[role].length-1];
    var div=document.createElement('div');
    div.className='todo-item';div.id='ti-'+role+'-'+newId;
    div.innerHTML='<div class="todo-cb" onclick="toggleTodo(\''+role+'\','+newId+',this)"></div>' +
      '<span class="todo-txt" contenteditable="false" onblur="saveTodoText(\''+role+'\','+newId+',this.textContent)">'+item.text+'</span>' +
      '<button class="todo-rm" onclick="removeTodo(\''+role+'\','+newId+')">×</button>';
    list.appendChild(div);
    if(S.emActive){var sp=div.querySelector('.todo-txt');if(sp){sp.contentEditable='true';}}
  }
}

function removeTodo(role,id){
  S.todos[role]=(S.todos[role]||[]).filter(function(t){return t.id!==id;});
  lsSave('chq-td',S.todos);
  var el=g('ti-'+role+'-'+id);if(el)el.remove();
}

// ═══ DASHBOARD MOODBOARD ═════════════════════════════════════
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
  var files=Array.from(e.target.files);
  if(!S.dashMood[role])S.dashMood[role]=[];
  files.forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){
      S.dashMood[role].push({src:ev.target.result,label:file.name.split('.')[0].replace(/[-_]/g,' ')});
      lsSave('chq-dm',S.dashMood);
      var grid=g('dmb-'+role);
      if(grid){
        var item=S.dashMood[role][S.dashMood[role].length-1];
        var idx=S.dashMood[role].length-1;
        var div=document.createElement('div');div.className='mb-item';
        div.innerHTML='<img src="'+item.src+'" alt="'+item.label+'"><div class="mb-lbl">'+item.label+'</div>' +
          '<button class="mb-rm" onclick="removeDashMood(\''+role+'\','+idx+')">×</button>';
        grid.insertBefore(div,grid.lastElementChild);
      }
    };
    r.readAsDataURL(file);
  });
}

function removeDashMood(role,i){
  if(S.dashMood[role])S.dashMood[role].splice(i,1);
  lsSave('chq-dm',S.dashMood);
  var grid=g('dmb-'+role);
  if(grid){var items=grid.querySelectorAll('.mb-item:not(.mb-add)');if(items[i])items[i].remove();}
}

// ═══ SPONSORS ════════════════════════════════════════════════
var spFilter='all';
function setSpFilter(f){spFilter=f;bSponsors();}
function getSpTabContent(spTab, raised){
  if(spTab==='accounts') return renderPortalAccounts();
  if(spTab==='pitch') return renderSpPitchDecks();
  if(spTab==='emails') return renderSpEmails();
  if(spTab==='objections') return renderSpObjections();
  var html = '';
  html += '<div class="g4" style="margin-bottom:.85rem">';
  html += '<div class="stat st-tz"><div class="sn">'+S.sponsors.length+'</div><div class="sl">Total</div></div>';
  html += '<div class="stat st-ch"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='meeting';}).length+'</div><div class="sl">Meeting Set</div></div>';
  html += '<div class="stat st-sg"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='closed';}).length+'</div><div class="sl">Closed</div></div>';
  html += '<div class="stat st-bl"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">';
  ['all','new','contacted','meeting','closed','declined'].forEach(function(f){
    var label = f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1);
    var cls = f===spFilter?'btn bp':'btn bg';
    html += '<button class="'+cls+'" data-f="'+f+'" onclick="spFilter=this.getAttribute(String.fromCharCode(100,97,116,97,45,102));bSponsors()">'+label+'</button>';
  });
  html += '</div>';
  html += '<div class="card" style="padding:0;overflow:hidden">';
  html += renderSponsorsTable();
  html += '</div>';
  return html;
}

function bSponsors(){
  var spTab=window._spTab||'tracker';
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  var tabBar='<div class="sp-tabbar">';
  var spTabs=[{t:'tracker',l:'Pipeline'},{t:'accounts',l:'Accounts'},{t:'pitch',l:'Pitch Decks'},{t:'emails',l:'Email Templates'},{t:'objections',l:'Objections'}];
  for(var ti=0;ti<spTabs.length;ti++){
    var xt=spTabs[ti];
    var isActive=spTab===xt.t;
    var bStyle='font-family:var(--fm);font-size:.55rem;letter-spacing:2px;text-transform:uppercase;padding:.7rem .9rem;border:none;background:transparent;cursor:pointer;margin-bottom:-2px;';
    bStyle+='border-bottom:2px solid '+(isActive?'var(--tz)':'transparent')+';';
    bStyle+='color:'+(isActive?'var(--tz)':'var(--wg)')+';';
    tabBar+='<button class="sp-tab-btn" data-t="'+xt.t+'" style="'+bStyle+'">'+xt.l+'</button>';
  }
  tabBar+='</div>';
  inject(
    '<div class="ph"><div><div class="ph-tag">Pipeline</div><div class="ph-title"><em>Sponsors</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="openM(\'m-sponsor\')">+ Add Sponsor</button></div></div>' +
    tabBar +
    '<div class="pb">' +
    getSpTabContent(spTab, raised) +
    '</div>'
  );
  document.querySelectorAll('.sp-tab-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      window._spTab=btn.getAttribute('data-t');
      bSponsors();
    });
  });
}

function renderSpPitchDecks(){
  var pd=lsGet('chq-pitch',{});
  var decks={general:{name:'General / Universal',color:'var(--tz3)'},energy:{name:'Clean Energy & EV',color:'var(--ch2)'},fashion:{name:'Fashion & Sustainability',color:'var(--sg2)'},local:{name:'Local San Diego',color:'var(--bl2)'}};
  return '<div class="g2" style="margin-top:.85rem">' +
    Object.keys(decks).map(function(k){
      var d=decks[k];var saved=(pd.decks&&pd.decks[k])||{};
      return '<div class="card" style="border-top:3px solid '+d.color+';padding:.85rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:'+d.color+';text-transform:uppercase">'+d.name+'</div>' +
        '<label class="btn bp" style="cursor:pointer;font-size:.55rem;padding:.25rem .65rem">Upload PDF<input type="file" accept=".pdf" style="display:none" class="deck-upload" data-key="'+k+'"></label>' +
        '</div>' +
        '<div style="font-family:var(--fm);font-size:.55rem;color:var(--wg);margin-bottom:.4rem">'+(saved.fileName?'📄 '+saved.fileName:'No PDF uploaded')+'</div>' +
        '<textarea class="deck-notes" data-key="'+k+'" placeholder="Key talking points..." style="width:100%;min-height:70px;border:1.5px dashed var(--du);border-radius:3px;padding:.55rem .7rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:var(--ch5)">'+(saved.notes||'')+'</textarea>' +
        (saved.pdf?'<button class="btn bg" style="font-size:.55rem;margin-top:.4rem" onclick="window.open(lsGet(\'chq-pitch\',{}).decks[\''+k+'\'].pdf,\'_blank\')">View PDF</button>':'') +
        '</div>';
    }).join('') +
    '</div>';
}

function renderSpEmails(){
  var pd=lsGet('chq-pitch',{emails:{}});
  var defaults={
    cold:{subject:'An invitation — Amelia Arabe x [Company]',body:'Hi [Name], My name is Laneea Love — I manage Amelia Arabe, Miss Temecula Valley USA 2026 candidate. Her platform is clean energy and textile accountability policy. Would you be open to a 15-minute call? With gratitude, Laneea Love'},
    followUp:{subject:'Following up — Amelia Arabe partnership',body:'Hi [Name], Just following up on my note from [DATE]. Amelia competes July 10-12. We have a few partnership spots remaining. Happy to jump on a quick call. Best, Laneea Love'},
    postMeeting:{subject:'Great connecting — next steps',body:'Hi [Name], Thank you for your time today. As discussed, here are our partnership options: [Tier 1]: [Deliverable] / [Tier 2]: [Deliverable]. I will follow up [DATE]. With gratitude, Laneea Love'}
  };
  var labels={cold:'Cold Outreach',followUp:'Follow-Up',postMeeting:'Post-Meeting'};
  var colors={cold:'var(--tz3)',followUp:'var(--ch2)',postMeeting:'var(--sg2)'};
  return '<div style="display:flex;flex-direction:column;gap:.65rem;margin-top:.85rem">' +
    Object.keys(defaults).map(function(k){
      var e=(pd.emails&&pd.emails[k])||defaults[k];
      return '<div class="card" style="border-left:3px solid '+colors[k]+';padding:.85rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:'+colors[k]+';text-transform:uppercase">'+labels[k]+'</div>' +
        '<button class="btn bg" style="font-size:.55rem;padding:.2rem .6rem" onclick="copySpEmail(\'se-body-'+k+'\',\'se-subj-'+k+'\',this)">Copy</button>' +
        '</div>' +
        '<input id="se-subj-'+k+'" value="'+e.subject.replace(/"/g,'&quot;')+'" style="width:100%;border:1px solid var(--du);border-radius:3px;padding:.35rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--ink);background:var(--wh);outline:none;margin-bottom:.45rem" onblur="saveSpEmail(\''+k+'\',\'subject\',this.value)">' +
        '<textarea id="se-body-'+k+'" style="width:100%;min-height:100px;border:1px solid var(--du);border-radius:3px;padding:.5rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.75;resize:vertical;outline:none;background:var(--wh)" onblur="saveSpEmail(\''+k+'\',\'body\',this.value)">'+e.body+'</textarea>' +
        '</div>';
    }).join('') +
    '</div>';
}
function renderSpObjections(){
  var pd=lsGet('chq-pitch',{objections:{}});
  var defaults={
    budget:{q:"We don't have budget for this.",a:"Totally understand — this doesn't have to be cash. Product placement, gifted item, or co-branded social post all count. We are flexible on structure."},
    audience:{q:'Your audience is too small.',a:"Amelia's audience is highly engaged and values-aligned with sustainability brands. Quality over quantity — and she is actively growing into competition."},
    pageant:{q:"We don't typically sponsor pageants.",a:"This isn't a typical pageant. Amelia is an engineer with a policy platform — SB 100, SB 707. Your brand is backing a climate advocate on a national stage."},
    timing:{q:"The timing isn't right.",a:'The competition is July 10-12. Early partners get the best placement and most lead time for co-created content. The window is real.'},
    fit:{q:'Not sure it is a fit.',a:'Tell me what a good fit looks like for you. We built this to be flexible — brand awareness, social content, community goodwill, or something else.'}
  };
  return '<div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.85rem">' +
    Object.keys(defaults).map(function(k){
      var saved=(pd.objections&&pd.objections[k])||defaults[k];
      return '<div class="card" style="padding:.85rem">' +
        '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--bl2);text-transform:uppercase;margin-bottom:.25rem">They say</div>' +
        '<div style="font-family:var(--fd);font-style:italic;font-size:.88rem;color:var(--ink);margin-bottom:.5rem;border-left:2px solid var(--bl);padding-left:.65rem">'+saved.q+'</div>' +
        '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--sg2);text-transform:uppercase;margin-bottom:.25rem">You say</div>' +
        '<textarea style="width:100%;min-height:55px;border:1.5px solid var(--ch4);border-radius:3px;padding:.5rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:var(--ch5)" onblur="saveSpObjection(\''+k+'\',this.value)">'+saved.a+'</textarea>' +
        '</div>';
    }).join('') +
    '</div>';
}
function copySpEmail(bodyId,subjId,btn){
  var body=document.getElementById(bodyId);
  var subj=document.getElementById(subjId);
  var text=(subj?subj.value+' — ':'')+(body?body.value:'');
  navigator.clipboard.writeText(text);
  btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy';},2000);
  showToast('Email copied');
}
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
  var filtered=spFilter==='all'?S.sponsors:S.sponsors.filter(function(s){return s.status===spFilter;});
  var cm={ev:'EV',fashion:'Fashion',auto:'Auto',tech:'Tech',local:'Local SD'};
  var sm={new:'New',contacted:'Contacted',meeting:'Meeting Set',closed:'Closed',declined:'Declined'};
  var dc={ev:'var(--ch3)',fashion:'var(--sg2)',auto:'var(--lv2)',tech:'var(--tz3)',local:'var(--bl2)'};
  return filtered.map(function(s){
    var dot='<div style="width:6px;height:6px;border-radius:50%;background:'+(dc[s.cat]||'var(--wg)')+'"></div>';
    var nm='<span class="sp-nm" style="cursor:'+(s.link?'pointer':'default')+'" '+(s.link?'onclick="openSponsorLink('+s.id+')"':'')+' data-e="sponsor:'+s.id+':name">'+s.name+(s.link?' ↗':'')+'</span>';
    return '<tr><td><div style="display:flex;align-items:center;gap:.5rem">'+dot+'<div>'+nm+'<span class="sp-lc">'+(cm[s.cat]||s.cat)+'</span></div></div></td>'+
      '<td><span class="ask-v" data-e="sponsor:'+s.id+':ask">'+s.ask+'</span></td>'+
      '<td><button class="s-btn s-'+s.status+'" onclick="openStatusModal('+s.id+')">'+(sm[s.status]||s.status)+'</button></td>'+
      '<td><input class="n-inp" value="'+(s.notes||'').replace(/"/g,'&quot;')+'" onblur="updateNote('+s.id+',this.value)" placeholder="Notes..."></td>'+
      '<td style="display:flex;gap:.3rem"><button class="btn bg" style="padding:.2rem .55rem;font-size:.58rem" onclick="openStatusModal('+s.id+')">Update</button><button class="btn bg" style="padding:.2rem .55rem;font-size:.58rem" onclick="editSponsorInline('+s.id+')">Link</button></td></tr>';
  }).join('');
}
function renderSponsorsTable(){
  return '<div class="sp-table-wrap"><table class="sp-tbl"><thead><tr><th>Company</th><th>Ask</th><th>Status</th><th>Notes</th><th></th></tr></thead><tbody>'+renderSpRows()+'</tbody></table></div>';
}
function renderPortalAccounts(){
  var profiles=getPortalProfiles();
  function renderList(role,label){
    var items=(profiles[role]||[]);
    return '<div class="card" style="margin-top:.85rem">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.65rem">' +
      '<div><div class="cl">'+label+'</div><div style="font-size:.76rem;color:var(--wg);line-height:1.6">Manage sign-in details, contact info, and access status for each portal user.</div></div>' +
      '<button class="btn bp" onclick="addPortalProfile(\''+role+'\')">+ Add</button>' +
      '</div>' +
      items.map(function(p){
        var stage=role==='sponsor'
          ? (p.status==='actual'?'Actual Sponsor':'Possible Sponsor')
          : role==='contributor'
            ? (p.status==='active'?'Active Contributor':'Possible Contributor')
            : (p.status==='active'?'Active Artist':'Possible Artist');
        return '<div class="pc-row">' +
          '<div><div class="pc-name">'+p.name+'</div><div class="pc-role">'+(p.company||'')+(p.specialty?' · '+p.specialty:'')+'<br>'+p.email+'<br>username: '+(p.username||'')+'</div></div>' +
          '<div class="pc-meta">' +
          '<span class="pc-chip">'+stage+'</span>' +
          '<span class="pc-chip">'+(p.active?'Login Active':'Login Off')+'</span>' +
          '<button class="pc-link" onclick="editPortalProfile(\''+role+'\',\''+p.id+'\')">Edit</button>' +
          '<button class="pc-link" onclick="removePortalProfile(\''+role+'\',\''+p.id+'\')">Remove</button>' +
          '</div></div>';
      }).join('') +
      '</div>';
  }
  return '<div class="g2">' +
    renderList('sponsor','Sponsor Accounts') +
    renderList('hmu','Hair & Makeup Accounts') +
    renderList('contributor','Contributor Accounts') +
    '</div>';
}
function openSponsorLink(id){
  var s=S.sponsors.find(function(x){return x.id===id;});
  if(s&&s.link) window.open(s.link,'_blank');
}
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
function bCalendar(){
  var isMobile=window.innerWidth<=768;
  inject(
    '<div class="ph"><div><div class="ph-tag">Schedule</div><div class="ph-title"><em>Calendar</em></div></div>' +
    '<div class="ph-acts">' +
    (isMobile?'':
      '<div class="cal-tabs">' +
      ['week','month'].map(function(v){return '<button class="cal-tab '+(S.calView===v?'on':'')+'" onclick="S.calView=\''+v+'\';bCalendar()">'+v.charAt(0).toUpperCase()+v.slice(1)+'</button>';}).join('') +
      '</div>' +
      '<button class="btn bg" onclick="S.calWeekOffset--;bCalendar()">&#8249;</button>' +
      '<button class="btn bg" onclick="S.calWeekOffset=0;bCalendar()">Today</button>' +
      '<button class="btn bg" onclick="S.calWeekOffset++;bCalendar()">&#8250;</button>'
    ) +
    '<button class="btn bp" onclick="openM(\'m-ev\')">+ Add Event</button>' +
    '</div></div>' +
    '<div class="pb">' +
    (isMobile?renderCalList():(S.calView==='week'?renderWeek():renderMonth())) +
    '</div>'
  );
}
function renderCalList(){
  var today=new Date();today.setHours(0,0,0,0);
  var evs=S.calEvents.slice().sort(function(a,b){
    return (a.date+' '+(a.time||'00:00'))>(b.date+' '+(b.time||'00:00'))?1:-1;
  });
  var groups={};var order=[];
  evs.forEach(function(ev){
    if(!groups[ev.date]){groups[ev.date]=[];order.push(ev.date);}
    groups[ev.date].push(ev);
  });
  var tc={coach:'var(--ch2)',styling:'var(--bl2)',hair:'var(--lv2)',fitness:'var(--sg2)',photo:'var(--tz2)',strategy:'var(--tz)'};
  var tl={coach:'Coach',styling:'Styling',hair:'Hair & MU',fitness:'Fitness',photo:'Photo',strategy:'Strategy'};
  if(!order.length) return '<div style="text-align:center;padding:3rem;font-family:var(--fd);font-style:italic;color:var(--wg)">No events yet</div>';
  var html='';
  order.forEach(function(date){
    var d=new Date(date+'T12:00:00');
    var isToday=d.toDateString()===new Date().toDateString();
    var isPast=d<today;
    html+='<div style="margin-bottom:1.1rem">'+
      '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:3px;text-transform:uppercase;color:'+(isToday?'var(--ch2)':'var(--wg)')+';margin-bottom:.4rem;padding-bottom:.3rem;border-bottom:1px solid var(--ch4)">'+(isToday?'Today &#8212; ':'')+d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+'</div>';
    groups[date].forEach(function(ev){
      var color=tc[ev.type||'coach']||'var(--ch2)';
      html+='<div onclick="editCalEvent('+ev.id+')" style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--wh);border-radius:3px;margin-bottom:.4rem;border-left:3px solid '+color+';box-shadow:0 1px 4px rgba(46,37,96,.06);cursor:pointer;opacity:'+(isPast?'.55':'1')+'">'+
        '<div style="min-width:38px;text-align:center"><div style="font-family:var(--fm);font-size:.72rem;color:'+color+';font-weight:600">'+(ev.time||'')+'</div></div>'+
        '<div style="flex:1"><div style="font-size:.85rem;font-weight:600;color:var(--ink);margin-bottom:.1rem">'+ev.title+'</div>'+(ev.who?'<div style="font-family:var(--fm);font-size:.55rem;color:var(--wg)">'+ev.who+'</div>':'')+'</div>'+
        '<div style="font-family:var(--fm);font-size:.45rem;letter-spacing:1px;text-transform:uppercase;color:'+color+'">'+(tl[ev.type||'coach']||ev.type)+'</div>'+
        '</div>';
    });
    html+='</div>';
  });
  return html;
}

function renderWeek(){
  var today=new Date();
  var startOfWeek=new Date(today);
  var day=today.getDay();
  startOfWeek.setDate(today.getDate()-day+(S.calWeekOffset*7));
  var days=[];
  for(var i=0;i<7;i++){
    var d=new Date(startOfWeek);d.setDate(startOfWeek.getDate()+i);days.push(d);
  }
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var hours=['7AM','8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM'];
  var todayStr=today.toDateString();

  var html='<div class="week-grid">' +
    '<div class="wk-head"></div>' +
    days.map(function(d){
      return '<div class="wk-head">' +
        '<div class="wk-head-lbl">'+dayNames[d.getDay()]+'</div>' +
        '<div class="wk-head-num '+(d.toDateString()===todayStr?'today':'')+'">'+d.getDate()+'</div>' +
        '</div>';
    }).join('') +
    hours.map(function(h,hi){
      var actualHour=hi+7;
      return '<div class="wk-time">'+h+'</div>' +
        days.map(function(d){
          var dateStr=d.toISOString().split('T')[0];
          var evs=S.calEvents.filter(function(ev){
            if(ev.date!==dateStr)return false;
            var evHour=parseInt(ev.time.split(':')[0]);
            return evHour===actualHour;
          });
          return '<div class="wk-cell '+(d.toDateString()===todayStr?'wk-today':'')+' " onclick="quickAddEvent(\''+dateStr+'\','+actualHour+')">' +
            evs.map(function(ev){return '<div class="wk-ev ev-'+(ev.type||'coach')+'" title="'+ev.title+(ev.who?' — '+ev.who:'')+'">'+ev.title+'</div>';}).join('') +
            '</div>';
        }).join('');
    }).join('') +
    '</div>';
  return html;
}

function renderMonth(){
  var today=new Date();
  var month=new Date(today.getFullYear(),today.getMonth()+(S.calWeekOffset),1);
  var monthName=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  var firstDay=month.getDay();
  var daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var todayStr=today.toDateString();

  var html='<div style="font-family:var(--fd);font-size:1.1rem;font-style:italic;color:var(--tz);margin-bottom:.65rem">'+monthName+'</div>' +
    '<div class="month-grid">' +
    dayNames.map(function(d){return '<div class="mn-head">'+d+'</div>';}).join('');

  for(var i=0;i<firstDay;i++) html+='<div class="mn-cell"><div class="mn-num other"></div></div>';
  for(var d=1;d<=daysInMonth;d++){
    var dateStr=month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var dayDate=new Date(month.getFullYear(),month.getMonth(),d);
    var evs=S.calEvents.filter(function(ev){return ev.date===dateStr;});
    var isToday=dayDate.toDateString()===todayStr;
    html+='<div class="mn-cell" onclick="quickAddEvent(\''+dateStr+'\',9)">' +
      '<div class="mn-num '+(isToday?'today':'')+'">'+d+'</div>' +
      evs.slice(0,2).map(function(ev){return '<div class="mn-ev ev-'+(ev.type||'coach')+'">'+ev.title+'</div>';}).join('') +
      (evs.length>2?'<div style="font-family:var(--fm);font-size:.48rem;color:var(--wg)">+'+( evs.length-2)+' more</div>':'') +
      '</div>';
  }
  html+='</div>';
  return html;
}

function quickAddEvent(date,hour){
  g('ev-date').value=date;
  g('ev-time').value=String(hour).padStart(2,'0')+':00';
  openM('m-ev');
}

function addEvent(){
  var title=g('ev-title').value.trim();
  if(!title)return;
  if(S._editingEvId){
    var ev=S.calEvents.find(function(x){return x.id===S._editingEvId;});
    if(ev){ev.title=title;ev.date=g('ev-date').value;ev.time=g('ev-time').value;ev.dur=parseFloat(g('ev-dur').value)||1;ev.type=g('ev-type').value;ev.who=g('ev-who').value;}
    S._editingEvId=null;
  } else {
    S.calEvents.push({id:Date.now(),title:title,date:g('ev-date').value,time:g('ev-time').value,dur:parseFloat(g('ev-dur').value)||1,type:g('ev-type').value,who:g('ev-who').value});
  }
  lsSave('chq-ce',S.calEvents);
  closeM('m-ev');
  var sb=document.querySelector('#m-ev .btn.bp');if(sb)sb.textContent='Save';
  ['ev-title','ev-who'].forEach(function(id){g(id).value='';});
  bCalendar();
}

function addAppt(){
  var a={id:Date.now(),date:g('ap-date').value,time:g('ap-time').value,title:g('ap-title').value,who:g('ap-who').value,type:g('ap-type').value,notes:g('ap-notes').value};
  if(!a.title)return;
  S.appts.push(a);lsSave('chq-ap',S.appts);
  S.calEvents.push({id:a.id,title:a.title,date:a.date,time:a.time,dur:1,type:a.type,who:a.who});
  lsSave('chq-ce',S.calEvents);
  closeM('m-appt');bCalendar();
}

// ═══ LIBRARY ══════════════════════════════════════════════════
var libCatFilter='all';
var libCats={
  wellness:{lbl:'Beauty & Wellness',col:'var(--bl2)',bg:'var(--bl3)'},
  fashion:{lbl:'Fashion Accountability',col:'var(--sg2)',bg:'rgba(90,138,82,.12)'},
  energy:{lbl:'Clean Energy',col:'var(--ch2)',bg:'var(--ch4)'},
  solarpunk:{lbl:'Solarpunk',col:'var(--tz3)',bg:'var(--tz5)'},
  fitness:{lbl:'Fitness & Movement',col:'var(--lv2)',bg:'rgba(152,128,200,.12)'},
  morenita:{lbl:'Library of Morenita',col:'var(--tz2)',bg:'var(--tz5)'},
};

function getPublishedPosts(){
  return S.posts.filter(function(p){return p.status==='published';}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
}

function bLibrary(){
  var published=getPublishedPosts();
  var featured=published[0]||null;
  var cats=Object.keys(libCats);
  if(window._libraryFrontPostId){
    return openLibraryPost(window._libraryFrontPostId);
  }
  inject(
    '<div class="ph"><div><div class="ph-tag">Library of Morenita</div><div class="ph-title">The <em>Library</em></div></div>' +
    '<div class="ph-acts"><button class="btn bg" onclick="showPanel(\'lookbook\')">Open Portfolio</button>' +(S.role==='amelia'?'<button class="btn bg" onclick="showPanel(\'library-editor\')">Open Editor</button>':'')+'</div></div>' +
    '<div class="pb">' +
    '<div class="card lib-front-hero">' +
    '<div class="lib-front-kicker">Editorial Portfolio</div>' +
    '<div class="lib-front-title">Essays, imagery, and advocacy gathered into one editorial world.</div>' +
    '<div class="lib-front-sub">Library of Morenita now sits inside the same portfolio language as the Lookbook, so writing, visuals, and campaign identity read as one body of work.</div>' +
    '</div>' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">' +
    '<button class="cal-tab '+(libCatFilter==='all'?'on':'')+'" onclick="libCatFilter=\'all\';bLibrary()">All</button>' +
    cats.map(function(c){return '<button class="cal-tab '+(libCatFilter===c?'on':'')+'" onclick="libCatFilter=\''+c+'\';bLibrary()">'+libCats[c].lbl+'</button>';}).join('') +
    '</div>' +
    (featured&&libCatFilter==='all'?
    '<div class="lib-feature" onclick="openLibraryPost('+featured.id+')">' +
    '<div class="lib-feature-copy">' +
    '<div class="lib-feature-kicker">Featured Essay</div>' +
    '<div class="lib-feature-title">'+featured.title+'</div>' +
    '<div class="lib-feature-meta">'+featured.tag+' · '+fdate(featured.date)+'</div>' +
    '<div class="lib-feature-cta">Read article</div>' +
    '</div>' +
    '<div class="lib-feature-visual" style="background:'+(featured.cover?'linear-gradient(transparent,rgba(26,19,64,.2)),url('+featured.cover+') center/cover':'var(--tz5)')+'"></div>' +
    '</div>':'') +
    '<div class="card lib-portfolio-note">' +
    '<div class="cl">Portfolio Flow</div>' +
    '<div class="lib-portfolio-copy">Start here for essays and published writing. Open the portfolio to see these ideas alongside competition imagery, social links, and sponsor-facing presentation.</div>' +
    '<button class="btn bg" onclick="showPanel(\'lookbook\')">Go To Portfolio</button>' +
    '</div>' +
    '<div class="lib-grid">' +
    published.filter(function(p){return (libCatFilter==='all'||p.cat===libCatFilter)&&(!featured||libCatFilter!=='all'||p.id!==featured.id);}).map(function(p){
      var cat=libCats[p.cat]||{lbl:p.tag,col:'var(--tz3)',bg:'var(--tz5)'};
      return '<div class="lib-card" onclick="openLibraryPost('+p.id+')">' +
        '<div class="lib-cover" style="background:'+cat.bg+'">' +
        (p.cover?'<img src="'+p.cover+'">':'')+
        '<div class="lib-overlay"></div>' +
        '<div class="lib-cover-text"><div class="lib-cat">'+p.tag+'</div><div class="lib-title-sm">'+p.title+'</div></div>' +
        '</div>' +
        '<div class="lib-meta"><span class="lib-date">'+fdate(p.date)+'</span>' +
        '<span class="lib-status ls-p">Read</span></div>' +
        '</div>';
    }).join('') +
    '</div></div>'
  );
}

function openLibraryPost(id){
  var p=S.posts.find(function(x){return x.id===id&&x.status==='published';});
  if(!p){window._libraryFrontPostId=null;return bLibrary();}
  window._libraryFrontPostId=id;
  inject(
    '<div style="display:flex;flex-direction:column;height:100%">' +
    '<div class="ed-top">' +
    '<button class="btn bg" onclick="closeLibraryPost()" style="flex-shrink:0">← Back to Library</button>' +
    (S.role==='amelia'?'<button class="btn bg" onclick="editPost('+p.id+')">Open In Editor</button>':'') +
    '</div>' +
    '<div class="lib-read-wrap">' +
    '<div class="lib-read-head">' +
    '<div class="lib-read-tag">'+p.tag+'</div>' +
    '<div class="lib-read-title">'+p.title+'</div>' +
    '<div class="lib-read-meta">'+fdate(p.date)+' · Published in Library of Morenita</div>' +
    '</div>' +
    (p.cover?'<div class="lib-read-cover"><img src="'+p.cover+'" alt="'+p.title+'"></div>':'') +
    '<article class="lib-read-body">'+(p.body||'')+'</article>' +
    '</div>' +
    '</div>'
  );
}

function closeLibraryPost(){
  window._libraryFrontPostId=null;
  bLibrary();
}

function bLibraryEditor(){
  var cats=Object.keys(libCats);
  inject(
    '<div class="ph"><div><div class="ph-tag">Internal</div><div class="ph-title">Library <em>Editor</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="newPost()">+ New Article</button></div></div>' +
    '<div class="pb">' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">' +
    '<button class="cal-tab '+(libCatFilter==='all'?'on':'')+'" onclick="libCatFilter=\'all\';bLibraryEditor()">All</button>' +
    cats.map(function(c){return '<button class="cal-tab '+(libCatFilter===c?'on':'')+'" onclick="libCatFilter=\''+c+'\';bLibraryEditor()">'+libCats[c].lbl+'</button>';}).join('') +
    '</div>' +
    '<div class="lib-grid">' +
    S.posts.filter(function(p){return libCatFilter==='all'||p.cat===libCatFilter;}).map(function(p,pi){
      var cat=libCats[p.cat]||{lbl:p.tag,col:'var(--tz3)',bg:'var(--tz5)'};
      return '<div class="lib-card'+(pi===0&&libCatFilter==="all"?" lib-hero":'')+' " onclick="editPost('+p.id+')">' +
        '<div class="lib-cover" style="background:'+cat.bg+'">' +
        (p.cover?'<img src="'+p.cover+'">':'')+
        '<div class="lib-overlay"></div>' +
        '<div class="lib-cover-text"><div class="lib-cat">'+p.tag+'</div><div class="lib-title-sm">'+p.title+'</div></div>' +
        '</div>' +
        '<div class="lib-meta"><span class="lib-date">'+fdate(p.date)+'</span>' +
        '<span class="lib-status '+(p.status==='published'?'ls-p':'ls-d')+'">'+(p.status==='published'?'Published':'Draft')+'</span></div>' +
        '</div>';
    }).join('') +
    '<div class="lib-card" onclick="newPost()" style="cursor:pointer">' +
    '<div class="lib-cover" style="background:var(--tz5);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.35rem">' +
    '<div style="font-size:1.75rem;color:var(--tz4)">+</div>' +
    '<div style="font-family:var(--fm);font-size:.55rem;letter-spacing:3px;color:var(--tz4);text-transform:uppercase">New Article</div>' +
    '</div><div class="lib-meta"><span class="lib-date">Start writing</span></div></div>' +
    '</div></div>'
  );
}

function newPost(){
  var p={id:Date.now(),title:'Untitled Article',tag:'Library of Morenita',cat:'morenita',date:new Date().toISOString().split('T')[0],status:'draft',cover:'',body:'<div class="mag-hero">Your <em>Headline</em></div><div class="mag-byline">By Amelia Arabe</div><p class="mag-drop">Start writing your story here.</p>'};
  S.posts.unshift(p);lsSave('chq-po',S.posts);editPost(p.id);
}

function editPost(id){
  var p=S.posts.find(function(x){return x.id===id;});
  S.editingPostId=id;
  var cats=Object.keys(libCats);
  inject(
    '<div style="display:flex;flex-direction:column;height:100%">' +
    '<div class="ed-top">' +
    '<button class="btn bg" onclick="showPanel(\'library-editor\')" style="flex-shrink:0">← Editor</button>' +
    '<input class="ed-title-inp" id="post-title" value="'+p.title.replace(/"/g,'&quot;')+'" placeholder="Article title..." oninput="updatePostTitle(this.value)">' +
    '<div style="display:flex;gap:.35rem;flex-shrink:0">' +
    '<select class="fs" id="post-cat" style="font-size:.72rem;padding:.3rem .6rem" onchange="updatePostCat(this.value)">' +
    cats.map(function(c){return '<option value="'+c+'" '+(p.cat===c?'selected':'')+'>'+libCats[c].lbl+'</option>';}).join('') +
    '</select>' +
    '<label class="btn bg" style="cursor:pointer;display:flex;align-items:center;gap:.25rem;font-size:.65rem">Cover<input type="file" accept="image/*" style="display:none" onchange="setCover(event)"></label>' +
    '<button class="btn bg" onclick="togglePostStatus()" id="post-status-btn">'+(p.status==='published'?'Published':'Draft')+'</button>' +
    '<button class="btn bp" onclick="savePost()">Save</button>' +
    '</div></div>' +
    '<div class="ed-bar">' +
    '<button class="t-btn" onclick="ins(\'hero\')">Headline</button>' +
    '<button class="t-btn" onclick="ins(\'byline\')">Byline</button>' +
    '<button class="t-btn" onclick="ins(\'drop\')">Drop Cap</button>' +
    '<button class="t-btn" onclick="ins(\'pq\')">Pull Quote</button>' +
    '<div class="t-sep"></div>' +
    '<button class="t-btn" onclick="ins(\'br\')">✦ Break</button>' +
    '<div class="t-sep"></div>' +
    '<label class="t-btn" style="cursor:pointer">Insert Image<input type="file" accept="image/*" style="display:none" onchange="insImg(event)"></label>' +
    '<button class="t-btn" onclick="ins(\'2col\')">2-Col</button>' +
    '<div class="t-sep"></div>' +
    '<button class="t-btn" onclick="document.execCommand(\'bold\')"><strong>B</strong></button>' +
    '<button class="t-btn" onclick="document.execCommand(\'italic\')"><em>I</em></button>' +
    '</div>' +
    '<div class="ed-canvas"><div class="ed-body" id="ed-body" contenteditable="true">'+(p.body||'')+'</div></div>' +
    '</div>'
  );
}

function ins(type){
  var el=g('ed-body');if(!el)return;
  var t={
    hero:'<div class="mag-hero">Your <em>Headline</em><br>Here</div>',
    byline:'<div class="mag-byline">By Amelia Arabe · Library of Morenita</div>',
    drop:'<p class="mag-drop">Your paragraph starts here with a drop cap.</p>',
    pq:'<div class="mag-pq">Your pull quote goes here.</div>',
    br:'<div class="mag-br">✦ ✦ ✦</div>',
    '2col':'<div class="mag-2col"><div class="mag-img" style="height:180px;display:flex;align-items:center;justify-content:center;color:var(--wg);font-size:.75rem">Image 1</div><div class="mag-img" style="height:180px;display:flex;align-items:center;justify-content:center;color:var(--wg);font-size:.75rem">Image 2</div></div>'
  };
  el.focus();document.execCommand('insertHTML',false,t[type]||'');
}

function insImg(e){
  var file=e.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(ev){
    var el=g('ed-body');if(!el)return;
    el.focus();document.execCommand('insertHTML',false,'<div class="mag-img"><img src="'+ev.target.result+'"><div class="mag-cap">Caption — click to edit</div></div>');
  };
  r.readAsDataURL(file);
}

function setCover(e){
  var file=e.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(ev){var p=S.posts.find(function(x){return x.id===S.editingPostId;});if(p){p.cover=ev.target.result;lsSave('chq-po',S.posts);}};
  r.readAsDataURL(file);
}

function updatePostTitle(val){var p=S.posts.find(function(x){return x.id===S.editingPostId;});if(p)p.title=val;}
function updatePostCat(val){
  var p=S.posts.find(function(x){return x.id===S.editingPostId;});
  if(p){p.cat=val;p.tag=libCats[val]?libCats[val].lbl:val;}
}
function togglePostStatus(){
  var p=S.posts.find(function(x){return x.id===S.editingPostId;});if(!p)return;
  p.status=p.status==='published'?'draft':'published';
  if(p.status==='published'&&!p.date) p.date=new Date().toISOString().slice(0,10);
  var btn=g('post-status-btn');if(btn)btn.textContent=p.status==='published'?'Published':'Draft';
  lsSave('chq-po',S.posts);
  sbSavePosts();
  showToast(p.status==='published'?'Published \u2713':'Moved to draft');
}
function savePost(){
  var p=S.posts.find(function(x){return x.id===S.editingPostId;});
  var body=g('ed-body'),title=g('post-title');
  if(p&&body)p.body=body.innerHTML;
  if(p&&title)p.title=title.value;
  lsSave('chq-po',S.posts);
  sbSavePosts();
  // Update public library key if any published posts exist
  localStorage.setItem('chq-po', JSON.stringify(S.posts));
  var btn=document.querySelector('.ed-top .btn.bp');
  if(btn){btn.textContent='Saved!';setTimeout(function(){btn.textContent='Save';},1500);}
  showToast('Article saved');
}

// ═══ QUIZ ════════════════════════════════════════════════════
var QDB={
  platform:[
    {q:'What is your platform and why does it matter to California?',a:'My platform is clean energy and textile accountability policy. Fashion is the second most polluting industry on Earth — 10% of global carbon emissions. California has the regulatory power to change that through SB 707, Scope 3 reporting, and Fashion Miles disclosure legislation.',cat:'Platform'},
    {q:'What is SB 707 and what does it actually do?',a:'SB 707 is the Responsible Textile Producer Program — an Extended Producer Responsibility law shifting textile waste costs from taxpayers to brands. It creates market incentives to design for longevity, not disposal.',cat:'Platform'},
    {q:'What specific policy change would you advocate for first?',a:'Full funding of SB 707 combined with a Fashion Miles disclosure label on every garment sold in California. Transparency is the first step. When consumers see the true cost, the market shifts.',cat:'Platform'},
    {q:'How does clean energy connect to the fashion industry?',a:'Polyester — 65% of all clothing — comes from crude oil. Textile mills are energy-intensive. A transition to renewable energy creates green-collar jobs and positions California as the clean fashion capital of North America.',cat:'Platform'},
    {q:'What is SB 100 and why is it relevant to your platform?',a:'SB 100 mandates 100% clean energy for California by 2045. It is law. My platform is the bridge between that legislation and the textile supply chains that still run on fossil fuels. The law exists. The implementation gap is where I work.',cat:'Platform'},
  ],
  personal:[
    {q:'Tell us about yourself.',a:'I am Amelia Arabe — a Filipina-American student engineer in San Diego. I design net-zero technology, play cello, and founded Library of Morenita — a sustainable digital archive I describe as Alexandria rebuilt for the next century. Top Model at Miss Philippines USA. I am here for the microphone, not just the crown.',cat:'Personal'},
    {q:'Why did you enter Miss California USA?',a:'I have a technical platform and specific policy agenda, and this stage reaches decision-makers and press who can amplify it. I am an engineer — I use the right tool for the job. This stage is the right tool.',cat:'Personal'},
    {q:'What is Library of Morenita?',a:'A sustainable digital archive preserving the ideas that shape civilization. Cultural infrastructure for the next century. The Library of Alexandria burned. I am designing something that does not.',cat:'Personal'},
    {q:"What is your biggest strength?",a:"Precision. I am trained to understand systems and design solutions. When I say fashion is the second most polluting industry, I can give you the source, the number, and the policy solution. I do not speak in generalities when specifics exist.",cat:'Personal'},
    {q:'Who are you outside of what you think you are worth?',a:'I am a funny and sweet woman who loves animals, food, music, and the ocean. I get bored easily and want constant stimulation so I love active days with lots to see. I love to travel and take photos of the scenery, myself, and the beautiful people I surround myself with. I adore fashion and have fun looking cute every day.',cat:'Personal'},
  ],
  tough:[
    {q:"What is your biggest weakness?",a:'I move faster than the people around me — I see the solution before fully explaining the problem. I am actively working on building consensus rather than just building. Engineering teaches you to optimize. Leadership teaches you the best solution is one people actually adopt.',cat:'Tough'},
    {q:'Why should you win over the other candidates?',a:'Because I am not competing for the experience of competing. I have a specific platform, technical background, and an audience I am already building. This title gives my advocacy reach it does not have today. That is a concrete answer.',cat:'Tough'},
    {q:'Is pageantry not superficial — why not advocate through other channels?',a:'Every platform is a tool. This one reaches audiences, press, and decision-makers that a GitHub repository does not. I am an engineer — I use the right tool for the job. This stage is the right tool for amplifying clean energy policy to a broad California audience.',cat:'Tough'},
    {q:'What would you do if you did not win?',a:'Keep building. Library of Morenita does not pause. The advocacy does not stop. Competition is one platform — not the only one. But I plan to win.',cat:'Tough'},
  ],
  pageant:[
    {q:'What does being Miss California USA mean to you?',a:'A platform with reach, credibility, and a stage — and using all three to advance clean energy and textile accountability. It means a Filipina-American engineer can stand on this stage and be taken seriously.',cat:'Pageant'},
    {q:'How would you use the title if you won?',a:'Every appearance, interview, and platform moment to advance California clean energy and textile accountability. Partner with Cleantech San Diego and fashion sustainability organizations to amplify legislation already moving.',cat:'Pageant'},
    {q:'What would your legacy as Miss California USA be?',a:'That I made the conversation about sustainable fashion and clean energy more specific, more technical, and more actionable than before I held the title. That the crown was a microphone, and I used it.',cat:'Pageant'},
    {q:'Describe your competition look philosophy.',a:'Every look is an advocacy statement. My gown is deadstock silk — it has a supply chain story. My swimsuit is ECONYL ocean plastic — the brand story is the story. I do not wear fashion. I wear arguments.',cat:'Pageant'},
  ],
};

function bQuiz(){
  var allQs=Object.values(QDB).reduce(function(a,b){return a.concat(b);},[]);
  inject(
    '<div class="ph"><div><div class="ph-tag">Competition Prep</div><div class="ph-title"><em>Interview</em> Practice</div></div></div>' +
    '<div class="pb">' +

    // FLASHCARD MODE
    '<div class="qz-wrap">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.5rem">Flashcard Practice</div>' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">' +
    [{id:'all',lbl:'All'},{id:'platform',lbl:'Platform'},{id:'personal',lbl:'Personal'},{id:'tough',lbl:'Tough Questions'},{id:'pageant',lbl:'Pageant'}].map(function(c){
      return '<button class="cal-tab '+(S.quizCat===c.id?'on':'')+'" onclick="S.quizCat=\''+c.id+'\';bQuiz()">'+c.lbl+'</button>';
    }).join('') +
    '</div>' +

    '<div class="qz-card" id="qz-card">' +
    '<div class="q-cat" id="q-cat"></div>' +
    '<div class="q-txt" id="q-txt"></div>' +
    '<div class="q-timer" id="q-timer">1:00</div>' +
    '<div class="q-prog" id="q-prog"></div>' +
    '<div id="q-rev" style="display:none">' +
    '<div class="q-ans-rev">' +
    '<div class="qa-lbl">Model Answer</div>' +
    '<div class="qa-txt" id="q-ans"></div>' +
    '<button class="qa-edit" onclick="editAnswer()">Edit this answer</button>' +
    '<textarea class="qa-area" id="q-edit-area" style="display:none"></textarea>' +
    '<div id="q-edit-acts" style="display:none;gap:.35rem;margin-top:.35rem">' +
    '<button class="btn bg" style="font-size:.6rem" onclick="cancelEdit()">Cancel</button>' +
    '<button class="btn bc" style="font-size:.6rem" onclick="saveAnswer()">Save</button>' +
    '</div>' +
    '</div></div>' +
    '<div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-top:.55rem">' +
    '<button class="btn bg" onclick="startQuiz()">Start Session</button>' +
    '<button class="btn bg" onclick="revealAnswer()">See Answer</button>' +
    '<button class="btn bc" onclick="nextQ()">Next →</button>' +
    '</div></div>' +
    '<div class="card" style="background:var(--ch6);margin-bottom:1.5rem">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--ch2);text-transform:uppercase;margin-bottom:.25rem">Sessions</div>' +
    '<div style="font-family:var(--fd);font-size:1.2rem;font-style:italic;color:var(--tz)">'+S.quiz.sessions+' sessions · '+S.quiz.total+' questions practiced</div>' +
    '</div>' +

    // LIST VIEW
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">All Questions — Click to Expand & Edit</div>' +
    '<div class="qz-list">' +
    allQs.filter(function(q){return S.quizCat==='all'||q.cat.toLowerCase()===S.quizCat;}).map(function(q,i){
      var savedAns=S.answers[q.q]||q.a;
      return '<div class="qz-item">' +
        '<div class="qz-item-head" onclick="toggleQItem(this)">' +
        '<span class="qz-q-num">Q'+(i+1)+'</span>' +
        '<span class="qz-q-txt">'+q.q+'</span>' +
        '<span class="qz-q-cat">'+q.cat+'</span>' +
        '<span style="font-family:var(--fm);font-size:.65rem;color:var(--wg)">▾</span>' +
        '</div>' +
        '<div class="qz-item-body">' +
        '<div class="qz-ans-wrap">' +
        '<div class="qz-ans-lbl">Model Answer</div>' +
        '<div class="qz-ans-txt" contenteditable="true" onblur="saveListAnswer(\''+encodeURIComponent(q.q)+'\',this.textContent)" data-key="'+encodeURIComponent(q.q)+'">'+savedAns+'</div>' +
        '</div></div></div>';
    }).join('') +
    '</div>' +
    '</div></div>'
  );
  startQuiz();
}

function toggleQItem(head){
  var body=head.nextElementSibling;
  if(body)body.classList.toggle('open');
}

function saveListAnswer(encKey,val){
  var key=decodeURIComponent(encKey);
  S.answers[key]=val;lsSave('chq-an',S.answers);showToast('Answer saved');
}

function startQuiz(){
  var pool=S.quizCat==='all'?Object.values(QDB).reduce(function(a,b){return a.concat(b);},[]):(QDB[S.quizCat]||[]);
  S.quizQs=pool.slice().sort(function(){return Math.random()-.5;}).slice(0,5);
  S.curQ=0;showQ();
}
function showQ(){
  if(!S.quizQs.length)return;
  if(S.curQ>=S.quizQs.length)S.curQ=0;
  var q=S.quizQs[S.curQ];
  var cat=g('q-cat'),txt=g('q-txt'),rev=g('q-rev'),ans=g('q-ans');
  if(!cat)return;
  cat.textContent=q.cat;txt.textContent=q.q;
  rev.style.display='none';
  if(ans)ans.textContent=S.answers[q.q]||q.a;
  updateQProg();startTimer();
}
function updateQProg(){
  var pg=g('q-prog');if(!pg)return;
  pg.innerHTML=S.quizQs.map(function(_,i){return '<div class="qp-d '+(i<S.curQ?'done':i===S.curQ?'cur':'')+'"></div>';}).join('');
}
function startTimer(){
  clearInterval(S.qTimer);S.qSecs=60;updateTimer();
  S.qTimer=setInterval(function(){S.qSecs--;updateTimer();if(S.qSecs<=0){clearInterval(S.qTimer);revealAnswer();}},1000);
}
function updateTimer(){
  var el=g('q-timer');if(!el)return;
  var m=Math.floor(S.qSecs/60),s=S.qSecs%60;
  el.textContent=m+':'+(s<10?'0':'')+s;
  el.className='q-timer'+(S.qSecs<=10?' urg':'');
}
function revealAnswer(){clearInterval(S.qTimer);var r=g('q-rev');if(r)r.style.display='block';}
function nextQ(){clearInterval(S.qTimer);S.curQ++;if(S.curQ>=S.quizQs.length){S.quiz.sessions++;S.quiz.total+=S.quizQs.length;lsSave('chq-qz',S.quiz);S.curQ=0;}showQ();}
function editAnswer(){
  var area=g('q-edit-area'),acts=g('q-edit-acts');
  area.value=g('q-ans').textContent;area.style.display='block';acts.style.display='flex';
}
function saveAnswer(){
  var key=S.quizQs[S.curQ]?S.quizQs[S.curQ].q:null;
  if(!key)return;
  var val=g('q-edit-area').value;
  S.answers[key]=val;lsSave('chq-an',S.answers);
  g('q-ans').textContent=val;g('q-edit-area').style.display='none';g('q-edit-acts').style.display='none';
  showToast('Answer saved');
}
function cancelEdit(){g('q-edit-area').style.display='none';g('q-edit-acts').style.display='none';}

// ═══ BRAND ═══════════════════════════════════════════════════
var DA={
  ig:{head:'ig',title:'Instagram Bio',platform:'@ameliavarabe',text:"engineer building the future\ncellist. miss california usa '26\nfounder @libraryofmorenita\ni learned to find the light. bask in it\nsan diego"},
  press:{head:'press',title:'Press Bio',platform:'Third person',text:"Amelia Arabe is a Filipina-American student engineer, classically trained cellist, and 2026 candidate for Miss California USA based in San Diego.\n\nShe is the founder of Library of Morenita — a sustainable digital archive built for the next century.\n\nA Top Model award winner at Miss Philippines USA, Amelia brings engineering precision and performance presence to every stage.\n\nShe competes not for a crown, but for a microphone.\n\nRepresented by Laneea Love."},
  sub:{head:'sub',title:'Substack',platform:'Library of Morenita',text:"Dispatches from the intersection of engineering, culture, and the planet.\n\nFor people who build things, wear things, and wonder about the systems behind both.\n\nBy Amelia Arabe — engineer, cellist, she/they. San Diego."},
  li:{head:'li',title:'LinkedIn Headline',platform:'LinkedIn',text:"Student Engineer · Net-Zero Hardware Design · Founder, Library of Morenita · Miss Temecula Valley USA 2026 · San Diego"},
};

function bBrand(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Identity</div><div class="ph-title"><em>Brand</em> Assets</div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="saveAllBrand()">Save All</button></div></div>' +
    '<div class="pb"><div class="g2">' +
    Object.entries(DA).map(function(entry){
      var k=entry[0],a=entry[1];
      return '<div class="ba-card">' +
        '<div class="ba-head '+a.head+'">' +
        '<div><div class="ba-pf">'+a.title+'</div><div style="font-family:var(--fm);font-size:.5rem;opacity:.4;margin-top:.1rem;color:'+(a.head==='sub'?'var(--wg)':'white')+'">'+a.platform+'</div></div>' +
        '<div class="ba-acts"><button class="ba-b '+(a.head==='sub'?'lt':'')+'" onclick="copyAsset(\'ba-'+k+'\',this)">Copy</button></div>' +
        '</div>' +
        '<div class="ba-body"><textarea class="ba-ta" id="ba-'+k+'" oninput="S.brand[\''+k+'\']=this.value">'+(S.brand[k]||a.text)+'</textarea></div>' +
        '</div>';
    }).join('') +
    '<div class="ba-card"><div class="ba-head brand"><div class="ba-pf">Color Palette</div></div>' +
    '<div class="ba-body">' +
    '<div class="c-row"><div class="csw od" style="background:var(--tz)"><span>#2E2560 Tanzanite</span></div><div class="csw od" style="background:var(--tz2)"><span>#4B3F8A Mid</span></div><div class="csw od" style="background:var(--tz3)"><span>#6B5FBA Light</span></div></div>' +
    '<div class="c-row"><div class="csw ol" style="background:var(--ch5)"><span>#FDF8EC BG</span></div><div class="csw ol" style="background:var(--ch)"><span>#F0D898 Champagne</span></div><div class="csw ol" style="background:var(--ch3)"><span>#D4B86A Gold</span></div></div>' +
    '<div class="c-row"><div class="csw ol" style="background:var(--bl)"><span>#F2C4C0 Blush</span></div><div class="csw ol" style="background:var(--lv)"><span>#C8B8E8 Lavender</span></div><div class="csw ol" style="background:var(--sg)"><span>#A8C4A0 Sage</span></div></div>' +
    '<div style="margin-top:.75rem;font-family:var(--fd);font-size:1.5rem;font-weight:300;color:var(--tz)">Amelia <em style="font-style:italic;color:var(--bl2)">Arabe</em></div>' +
    '<div style="font-family:var(--fm);font-size:.58rem;color:var(--wg);line-height:1.8;margin-top:.25rem">Cormorant · Plus Jakarta Sans · DM Mono</div>' +
    '</div></div>' +
    '<div class="ba-card" style="grid-column:1/-1"><div class="ba-head" style="background:linear-gradient(135deg,var(--bl3),var(--ch6))"><div class="ba-pf" style="color:var(--tz)">Voice Principles</div><div class="ba-acts"><button class="ba-b lt" onclick="copyAsset(\'ba-voice\',this)">Copy</button></div></div>' +
    '<div class="ba-body"><textarea class="ba-ta" id="ba-voice" style="min-height:55px" oninput="S.brand[\'voice\']=this.value">'+(S.brand.voice||'Name the number. Name the bill.\nState, do not apologize.\nCurious, never preachy.\nSignature: Not for a crown, but for a microphone.')+'</textarea></div>' +
    '</div>' +
    '</div></div>'
  );
}
function saveAllBrand(){lsSave('chq-br',S.brand);showToast('Brand saved');}
function copyAsset(id,btn){
  var el=g(id);if(!el)return;
  navigator.clipboard.writeText(el.value||el.innerText);
  btn.textContent='Copied!';btn.classList.add('cp');
  setTimeout(function(){btn.textContent='Copy';btn.classList.remove('cp');},2000);
}

// ═══ MOODBOARD ═══════════════════════════════════════════════
function bMoodboard(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Inspiration</div><div class="ph-title"><em>Mood</em> Board</div></div>' +
    '<div class="ph-acts"><label class="btn bp" style="cursor:pointer">+ Add Images<input type="file" accept="image/*" multiple style="display:none" onchange="addMoodImg(event)"></label></div></div>' +
    '<div class="pb">' +
    '<div class="mb-grid" id="mb-main">' +
    S.mood.map(function(m,i){
      return '<div class="mb-item"><img src="'+m.src+'" alt="'+m.label+'"><div class="mb-lbl">'+m.label+'</div>' +
        '<button class="mb-rm" onclick="removeMoodImg('+i+')">×</button></div>';
    }).join('') +
    '<label class="mb-item mb-add"><input type="file" accept="image/*" multiple style="display:none" onchange="addMoodImg(event)">' +
    '<div style="font-size:1.3rem;color:var(--wg)">+</div>' +
    '<span style="font-family:var(--fm);font-size:.52rem;color:var(--wg);letter-spacing:1px;text-transform:uppercase">Add Images</span>' +
    '</label></div></div>'
  );
}
function addMoodImg(e){
  Array.from(e.target.files).forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){
      S.mood.push({src:ev.target.result,label:file.name.split('.')[0].replace(/[-_]/g,' ')});
      lsSave('chq-md',S.mood);
      var grid=g('mb-main');
      if(grid){
        var m=S.mood[S.mood.length-1];var idx=S.mood.length-1;
        var div=document.createElement('div');div.className='mb-item';
        div.innerHTML='<img src="'+m.src+'"><div class="mb-lbl">'+m.label+'</div><button class="mb-rm" onclick="removeMoodImg('+idx+')">×</button>';
        grid.insertBefore(div,grid.lastElementChild);
      }
    };
    r.readAsDataURL(file);
  });
}
function removeMoodImg(i){S.mood.splice(i,1);lsSave('chq-md',S.mood);bMoodboard();}

// ═══ LOOKS ═══════════════════════════════════════════════════
function bLooks(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Competition</div><div class="ph-title">Event <em>Looks</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="addLook()">+ Add Look</button></div></div>' +
    '<div class="pb"><div class="g2">' +
    S.looks.map(function(l){
      var links=Array.isArray(l.links)?l.links:[];
      return '<div class="look-card">' +
        // Image
        '<div class="look-img">' +
        (l.img
          ? '<img src="'+l.img+'" alt="'+escHtml(l.title)+'" onclick="openLookImg(\''+l.id+'\')">' +
            '<label class="look-img-upload-btn" style="display:none;position:absolute;bottom:.5rem;right:.5rem;cursor:pointer;background:rgba(28,23,20,.65);border:0.5px solid rgba(255,255,255,.2);border-radius:3px;padding:.25rem .55rem;font-family:var(--fm);font-size:.48rem;letter-spacing:1px;color:rgba(255,255,255,.75);text-transform:uppercase;align-items:center;gap:.3rem">' +
              'Change<input type="file" accept="image/*" style="display:none" onchange="setLookImg('+l.id+',event)">' +
            '</label>'
          : '<div class="look-add-img"><label style="cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.35rem;color:var(--muted)">' +
            '<input type="file" accept="image/*" style="display:none" onchange="setLookImg('+l.id+',event)">' +
            '<div style="font-size:2rem;opacity:.4">📷</div>' +
            '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase">Add Photo</div>' +
            '</label></div>') +
        '</div>' +
        // Body
        '<div class="look-body">' +
        '<div class="look-ev" data-e="look:'+l.id+':event">'+escHtml(l.event)+'</div>' +
        '<div class="look-title" data-e="look:'+l.id+':title">'+escHtml(l.title)+'</div>' +
        '<div class="look-notes" data-e="look:'+l.id+':notes" data-placeholder="Notes, details, inspiration...">'+escHtml(l.notes||'')+'</div>' +
        // Links
        '<div class="look-links">' +
        links.map(function(lk,li){
          return '<a href="'+escHtml(lk.url)+'" target="_blank" class="look-link-chip">'+escHtml(lk.title)+
            '<button class="look-link-rm" onclick="event.preventDefault();removeLookLink('+l.id+','+li+')">×</button></a>';
        }).join('') +
        '</div>' +
        // Add link form (visible in edit mode via CSS)
        '<div class="look-add-link">' +
        '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:.1rem">Add Link</div>' +
        '<input id="ll-title-'+l.id+'" class="fi" placeholder="Link title (e.g. Shop ECONYL)" style="font-size:.72rem;padding:.3rem .55rem">' +
        '<input id="ll-url-'+l.id+'" class="fi" placeholder="https://..." style="font-size:.72rem;padding:.3rem .55rem">' +
        '<button onclick="addLookLink('+l.id+')" class="btn bp" style="font-size:.52rem;padding:.25rem .7rem;align-self:flex-start">Add</button>' +
        '</div>' +
        // Remove button (edit mode)
        '<button onclick="if(confirm(\'Remove this look?\'))removeLook('+l.id+')" style="margin-top:auto;padding-top:.75rem;background:transparent;border:none;font-family:var(--fm);font-size:.48rem;letter-spacing:1px;color:var(--faint);cursor:pointer;text-align:left;text-transform:uppercase;display:none" class="look-rm-btn">Remove look</button>' +
        '</div></div>';
    }).join('') +
    '</div></div>'
  );
}

function setLookImg(id,e){
  var file=e.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(ev){var l=S.looks.find(function(x){return x.id===id;});if(l){l.img=ev.target.result;lsSave('chq-lk',S.looks);bLooks();}};
  r.readAsDataURL(file);
}

function openLookImg(id){
  var l=S.looks.find(function(x){return String(x.id)===String(id);});
  if(!l||!l.img)return;
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(28,23,20,.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  ov.onclick=function(){ov.remove();};
  var img=document.createElement('img');
  img.src=l.img;img.style.cssText='max-width:92vw;max-height:92vh;object-fit:contain;border-radius:4px';
  ov.appendChild(img);document.body.appendChild(ov);
}

function addLook(){
  S.looks.push({id:Date.now(),event:'New Event',round:'Competition',title:'New Look',notes:'',links:[],img:''});
  lsSave('chq-lk',S.looks);bLooks();
}

function removeLook(id){S.looks=S.looks.filter(function(x){return x.id!==id;});lsSave('chq-lk',S.looks);bLooks();}

function addLookLink(id){
  var titleEl=g('ll-title-'+id), urlEl=g('ll-url-'+id);
  if(!titleEl||!urlEl)return;
  var title=titleEl.value.trim(), url=urlEl.value.trim();
  if(!title||!url)return;
  if(!/^https?:\/\//.test(url))url='https://'+url;
  var l=S.looks.find(function(x){return x.id===id;});
  if(!l)return;
  if(!Array.isArray(l.links))l.links=[];
  l.links.push({title:title,url:url});
  lsSave('chq-lk',S.looks);bLooks();
}

function removeLookLink(id,idx){
  var l=S.looks.find(function(x){return x.id===id;});
  if(!l||!Array.isArray(l.links))return;
  l.links.splice(idx,1);
  lsSave('chq-lk',S.looks);bLooks();
}


// ═══ BODY & MIND — unified Fitness / Peace / Diet ═══════════════
// Single panel with three-tab toggle. All state in chq-fitness + chq-peace.

var _bodyTab = 'fitness'; // 'fitness' | 'peace' | 'diet'
var _openFitDays = {}; // tracks which day cards the user has manually opened
var _dietWeek = 1;        // 1-4 rotation
var _medTimer = null, _medRunning = false, _medTotal = 0, _medLeft = 0;
var _breathRunning = false, _breathTimer = null, _breathIdx = 0, _breathCount = 0;
var _breathPhases = ['Inhale','Hold','Exhale','Hold'];

function bFitness(){ _bodyTab='fitness'; bBody(); }
function bPeace(){   _bodyTab='peace';   bBody(); }

function bBody(){
  var fd = lsGet('chq-fitness',{});
  fd.days      = fd.days      && typeof fd.days==='object'      ? fd.days      : {};
  fd.measurements = fd.measurements && typeof fd.measurements==='object' ? fd.measurements : {};
  fd.nutrition = fd.nutrition && typeof fd.nutrition==='object' ? fd.nutrition : {};
  fd.rituals   = fd.rituals   && typeof fd.rituals==='object'   ? fd.rituals   : {};
  fd.exChecks  = fd.exChecks  && typeof fd.exChecks==='object'  ? fd.exChecks  : {};
  fd.weight    = fd.weight    || '';
  fd.quit      = fd.quit      && typeof fd.quit==='object'      ? fd.quit      : {};

  var tabBar =
    '<div style="display:flex;border-bottom:0.5px solid var(--iv3);background:var(--wh);padding:0 1.75rem;flex-shrink:0">' +
    ['fitness','peace','diet'].map(function(t){
      var labels = {fitness:'💪 Fitness', peace:'🕊 Peace & Mind', diet:'🥗 Diet'};
      var on = _bodyTab===t;
      return '<button onclick="_bodyTab=\''+t+'\';bBody()" style="font-family:var(--fm);font-size:.55rem;letter-spacing:2px;text-transform:uppercase;padding:.75rem 1rem;border:none;background:transparent;cursor:pointer;border-bottom:2px solid '+(on?'var(--si)':'transparent')+';color:'+(on?'var(--si)':'var(--muted)')+';transition:all .15s">'+labels[t]+'</button>';
    }).join('') +
    '</div>';

  var content = '';
  if(_bodyTab==='fitness') content = renderFitnessTab(fd);
  else if(_bodyTab==='peace') content = renderPeaceTab(fd);
  else content = renderDietTab();

  inject(
    '<div style="display:flex;flex-direction:column;height:100%;min-height:0">' +
    '<div class="ph" style="flex-shrink:0"><div><div class="ph-tag">Body &amp; Mind</div><div class="ph-title"><em>Wellness</em></div></div>' +
    (_bodyTab==='fitness'?'<div class="ph-acts"><button class="btn bc" onclick="saveFitnessLog()">Save check-ins</button></div>':'') +
    (_bodyTab==='diet'?'<div class="ph-acts"><button class="btn bg" onclick="printGroceryList()">🛒 Grocery list</button><button class="btn bc" onclick="_dietWeek=(_dietWeek%4)+1;bBody()">Week '+_dietWeek+' ↻</button></div>':'') +
    '</div>' +
    tabBar +
    '<div class="pb" style="flex:1;overflow-y:auto">' + content + '</div>' +
    '</div>'
  );
}

// ─── FITNESS TAB ───────────────────────────────────────────────
function renderFitnessTab(fd){
  var todayFull = new Date().toLocaleDateString('en-US',{weekday:'long'}).slice(0,3).toLowerCase();
  var daysClean = 0;
  if(fd.quit&&fd.quit.startDate) daysClean=Math.floor((new Date()-new Date(fd.quit.startDate))/(1000*60*60*24));

  var split=[
    {day:'Mon',key:'mon',focus:'Core Circuit',color:'var(--si)',exercises:[
      {name:'Dead Bugs',sets:'3×12',note:'Lower back flat. Builds the corset.'},
      {name:'Hollow Body Hold',sets:'3×30s',note:'Ribs down. The waist wraps here.'},
      {name:'Pallof Press',sets:'3×12 each',note:'Anti-rotation. Builds the taper.'},
      {name:'Side Plank + Hip Dip',sets:'3×15 each',note:'Obliques. This is the curve.'},
      {name:'Single Leg RDL',sets:'3×10 each',note:'Balance + posterior chain.'},
      {name:'Bicycle Crunch',sets:'3×20',note:'Controlled. Elbow to knee.'},
    ]},
    {day:'Tue',key:'tue',focus:'Swim',color:'var(--go2)',exercises:[
      {name:'Freestyle Laps',sets:'20 min',note:'Long and lean. Think elongation.'},
      {name:'Butterfly Arms',sets:'4×25m',note:'Shoulders + lats. Creates the V-taper.'},
      {name:'Kickboard Legs',sets:'4×25m',note:'Quads and glutes activated.'},
      {name:'Cool Down Float',sets:'5 min',note:'Breathe. Let your body reset.'},
    ]},
    {day:'Wed',key:'wed',focus:'Legs + Barre',color:'var(--sg2)',exercises:[
      {name:'Bulgarian Split Squat',sets:'4×10 each',note:'Rear foot elevated. Go deep.'},
      {name:'Glute Bridge + Hold',sets:'4×15',note:'Squeeze at top 2 seconds.'},
      {name:'Lateral Band Walks',sets:'3×20 each',note:'Band above knees. Burn.'},
      {name:'Relevé Holds',sets:'3×30s',note:'Calves and balance.'},
      {name:'Arabesque Pulses',sets:'3×20 each',note:'Glute and hip flexor length.'},
      {name:'Plié Squats',sets:'3×15',note:'Turnout. Inner thigh activation.'},
    ]},
    {day:'Thu',key:'thu',focus:'Tennis',color:'var(--go)',exercises:[
      {name:'Serve Practice',sets:'20 min',note:'Shoulder rotation. Core drives power.'},
      {name:'Footwork Drills',sets:'15 min',note:'Explosive lateral movement.'},
      {name:'Rally Sets',sets:'3 sets',note:'Cardio base. Rotational core.'},
      {name:'Cool Down Stretch',sets:'10 min',note:'Hip flexors and shoulders.'},
    ]},
    {day:'Fri',key:'fri',focus:'Arms + Posture',color:'var(--sil)',exercises:[
      {name:'Port de Bras with Weights',sets:'3×12',note:'2-3lb. Slow and deliberate.'},
      {name:'Swimmer Lat Pulldown',sets:'4×12',note:'V-taper. Waist looks smaller instantly.'},
      {name:'Overhead Press',sets:'3×10',note:'Shoulders and posture.'},
      {name:'Tricep Dip',sets:'3×12',note:'Back of arm. Lean and sculpted.'},
      {name:'Resistance Band Row',sets:'3×15',note:'Posture muscles. Stage presence.'},
      {name:'Plank to Downdog',sets:'3×10',note:'Core + shoulder mobility.'},
    ]},
    {day:'Sat',key:'sat',focus:'Swim + Ballet',color:'var(--sa)',exercises:[
      {name:'Freestyle Endurance',sets:'30 min',note:'Build your base. Think long.'},
      {name:'Full Barre',sets:'45-60 min',note:'YouTube barre. Non-negotiable.'},
      {name:'Stretching Flow',sets:'15 min',note:'Hips, hamstrings, shoulders.'},
    ]},
    {day:'Sun',key:'sun',focus:'Active Recovery',color:'var(--sal)',exercises:[
      {name:'Ocean or Beach Walk',sets:'30-45 min',note:'Clear your head. This is medicine.'},
      {name:'Yoga Flow',sets:'20 min',note:'Any beginner flow.'},
      {name:'Full Body Stretch',sets:'15 min',note:'Every muscle. Breathe into it.'},
    ]},
  ];

  var html = '';

  // TODAY CHECK-INS
  html += '<div style="background:var(--ink);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:1rem;border:0.5px solid rgba(201,168,76,.1)">';
  html += '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:rgba(201,168,76,.38);text-transform:uppercase;margin-bottom:.6rem">Today · ' + new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) + '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:.6rem">';
  [{k:'breakfast',l:'Protein breakfast',n:'Within 30 min of waking'},{k:'water',l:'Water before coffee',n:'Every morning'},{k:'snacks',l:'Smart snacks only',n:'No processed, no sugar'},{k:'dinner',l:'Cooked dinner',n:'30 min. Non-negotiable.'}].forEach(function(n){
    var done=fd.nutrition&&fd.nutrition[n.k];
    html += '<div onclick="saveFitnessNutrition(\''+n.k+'\')" style="padding:.45rem .6rem;background:'+(done?'rgba(74,94,72,.18)':'rgba(250,247,242,.04)')+';border-radius:6px;cursor:pointer;border:0.5px solid '+(done?'rgba(106,138,104,.35)':'rgba(250,247,242,.07)')+';display:flex;gap:.45rem;align-items:center">';
    html += '<div style="width:14px;height:14px;border-radius:50%;border:1.5px solid '+(done?'var(--sg2)':'rgba(250,247,242,.2)')+';background:'+(done?'var(--sg2)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center">'+(done?'<div style="width:5px;height:5px;border-radius:50%;background:white"></div>':'')+'</div>';
    html += '<div><div style="font-size:.7rem;font-weight:500;color:rgba(250,247,242,.8)">'+n.l+'</div><div style="font-family:var(--fm);font-size:.44rem;color:rgba(250,247,242,.28)">'+n.n+'</div></div></div>';
  });
  html += '</div>';
  // Rituals
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">';
  ['Vitamin C serum','Moisturizer + SPF','Omega-3 supplement','Collagen powder','Double cleanse','Retinol / niacinamide','Heavy moisturizer','Magnesium supplement'].forEach(function(item,i){
    var rkey=i<4?'morn':'night'; var ridx=i<4?i:(i-4);
    var done=fd.rituals&&fd.rituals[rkey]&&fd.rituals[rkey][ridx];
    html += '<div onclick="saveFitnessRitual(\''+rkey+'\','+ridx+')" style="padding:.38rem .58rem;background:'+(done?'rgba(74,94,72,.12)':'rgba(250,247,242,.03)')+';border-radius:4px;cursor:pointer;border:0.5px solid '+(done?'rgba(106,138,104,.28)':'rgba(250,247,242,.05)')+';display:flex;gap:.42rem;align-items:center">';
    html += '<div class="wk-chk '+(done?'done':'')+'" style="flex-shrink:0;width:12px;height:12px"></div>';
    html += '<div style="font-size:.66rem;color:rgba(250,247,242,'+(done?'.35':'.7')+');">'+(done?'<s>':'')+item+(done?'</s>':'')+'</div></div>';
  });
  html += '</div></div>';

  // STATS
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin-bottom:.85rem">';
  html += '<div class="stat st-sg"><div class="sn">'+(daysClean||0)+'</div><div class="sl">Days Clear</div></div>';
  html += '<div class="stat st-ch"><input id="m-waist" value="'+(fd.measurements.waist||'')+'" placeholder="—" style="border:none;outline:none;font-family:var(--fd);font-size:1.8rem;font-style:italic;color:var(--ink);background:transparent;width:100%" onblur="saveFitnessField(\'measurements\',\'waist\',this.value)"><div class="sl">Waist (in)</div></div>';
  html += '<div class="stat st-ch"><input id="m-hips" value="'+(fd.measurements.hips||'')+'" placeholder="—" style="border:none;outline:none;font-family:var(--fd);font-size:1.8rem;font-style:italic;color:var(--ink);background:transparent;width:100%" onblur="saveFitnessField(\'measurements\',\'hips\',this.value)"><div class="sl">Hips (in)</div></div>';
  html += '<div class="stat st-bl"><input id="m-weight" value="'+(fd.weight||'')+'" placeholder="—" style="border:none;outline:none;font-family:var(--fd);font-size:1.8rem;font-style:italic;color:var(--ink);background:transparent;width:100%" onblur="saveFitnessWeight(this.value)"><div class="sl">Weight (lbs)</div></div>';
  html += '</div>';

  // WEEKLY SPLIT
  html += '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.6rem">Weekly Training Split</div>';
  html += '<div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:.85rem">';
  split.forEach(function(s){
    var dayDone=fd.days&&fd.days[s.key]&&fd.days[s.key].done;
    var exChecks=fd.exChecks&&fd.exChecks[s.key]||{};
    var doneCount=Object.values(exChecks).filter(Boolean).length;
    var isToday=(s.key===todayFull);
    html += '<div style="border-radius:10px;overflow:hidden;border:0.5px solid '+(isToday?'var(--si)':'var(--iv3)')+';background:var(--wh)">';
    html += '<div style="background:'+(dayDone?s.color:'var(--iv2)')+';padding:.6rem 1rem;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="toggleFitnessDay(\''+s.key+'\')">';
    html += '<div style="display:flex;align-items:center;gap:.7rem">';
    html += '<div onclick="event.stopPropagation();saveFitnessDay(\''+s.key+'\')" style="width:22px;height:22px;border-radius:50%;border:2px solid '+(dayDone?'rgba(255,255,255,.5)':'var(--iv3)')+';background:'+(dayDone?'rgba(255,255,255,.85)':'transparent')+';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">';
    html += (dayDone?'<div style="color:'+s.color+';font-size:.6rem;font-weight:700">✓</div>':'')+' </div>';
    html += '<div><div style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;color:'+(dayDone?'rgba(255,255,255,.55)':'var(--muted)')+';text-transform:uppercase">'+s.day+(isToday?' · TODAY':'')+'</div>';
    html += '<div style="font-family:var(--fd);font-size:.98rem;font-style:italic;color:'+(dayDone?'white':'var(--ink)')+'">'+s.focus+'</div></div></div>';
    html += '<div style="font-family:var(--fm);font-size:.46rem;color:'+(dayDone?'rgba(255,255,255,.45)':'var(--muted)')+'">'+doneCount+'/'+s.exercises.length+'</div></div>';
    html += '<div id="fit-day-'+s.key+'">';
    s.exercises.forEach(function(e,ei){
      var exDone=exChecks[ei];
      html += '<div onclick="saveFitnessEx(\''+s.key+'\','+ei+')" style="display:flex;gap:.6rem;padding:.42rem 1rem;border-bottom:0.5px solid var(--iv3);align-items:center;cursor:pointer;background:'+(exDone?'var(--sgp)':'transparent')+'">';
      html += '<div class="wk-chk '+(exDone?'done':'')+'" style="flex-shrink:0"></div>';
      html += '<div style="flex:1"><div style="font-size:.77rem;font-weight:500;color:var(--ink);'+(exDone?'text-decoration:line-through;opacity:.5':'')+'">'+e.name+'</div>';
      html += '<div style="font-family:var(--fm);font-size:.46rem;color:var(--muted)">'+e.note+'</div></div>';
      html += '<div style="font-family:var(--fm);font-size:.52rem;color:'+s.color+';white-space:nowrap;flex-shrink:0">'+e.sets+'</div></div>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ─── PEACE TAB ─────────────────────────────────────────────────
function renderPeaceTab(fd){
  var pd = lsGet('chq-peace',{});
  pd.gratitude = pd.gratitude && typeof pd.gratitude==='object' ? pd.gratitude : {};
  pd.journal   = pd.journal   && typeof pd.journal==='object'   ? pd.journal   : {};
  pd.sleep     = pd.sleep     && typeof pd.sleep==='object'     ? pd.sleep     : {};
  var today = new Date().toISOString().split('T')[0];
  var todayGrat = Array.isArray(pd.gratitude[today]) ? pd.gratitude[today] : ['','',''];
  var todayJournal = pd.journal[today] || '';
  var todaySleep = pd.sleep[today] || {};
  var daysClean = 0;
  if(fd.quit&&fd.quit.startDate) daysClean=Math.floor((new Date()-new Date(fd.quit.startDate))/(1000*60*60*24));
  var quoteIdx = new Date().getDate() % _quotes.length;
  var quote = _quotes[quoteIdx];

  var html = '';

  // Quote
  html += '<div style="background:var(--ink);border-radius:10px;padding:1.5rem;margin-bottom:1rem;border:0.5px solid rgba(201,168,76,.1);text-align:center">';
  html += '<div style="font-family:var(--fd);font-size:1.1rem;font-style:italic;color:rgba(250,247,242,.82);line-height:1.75;margin-bottom:.6rem">'+quote.text+'</div>';
  html += '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:3px;color:rgba(201,168,76,.3);text-transform:uppercase">— '+quote.author+'</div></div>';

  // Two col
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">';

  // Clarity
  html += '<div class="card"><div class="cl">Clarity Streak</div>';
  html += '<div style="text-align:center;padding:.5rem 0"><div style="font-family:var(--fd);font-size:3rem;font-style:italic;color:'+(daysClean>0?'var(--sg2)':'var(--faint)')+'">'+daysClean+'</div>';
  html += '<div style="font-family:var(--fm);font-size:.46rem;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:.6rem">days of clarity</div>';
  html += '<input type="date" id="quit-date" value="'+(fd.quit&&fd.quit.startDate||'')+'" style="font-family:var(--fm);font-size:.6rem;border:0.5px solid var(--iv3);border-radius:4px;padding:.3rem .5rem;color:var(--muted);background:var(--iv2)" onchange="saveFitnessQuit(this.value)">';
  html += '</div></div>';

  // Meditation
  html += '<div class="card"><div class="cl">Meditation</div>';
  html += '<div style="display:flex;gap:.4rem;justify-content:center;margin-bottom:.75rem">';
  [5,10,20].forEach(function(m){
    html += '<button onclick="startMed('+m+')" style="background:var(--iv2);border:0.5px solid var(--iv3);border-radius:4px;padding:.4rem .8rem;font-family:var(--fm);font-size:.55rem;color:var(--muted);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase">'+m+' min</button>';
  });
  html += '</div>';
  html += '<div style="text-align:center">';
  html += '<div id="med-circle" style="width:80px;height:80px;border-radius:50%;border:1.5px solid var(--iv3);margin:0 auto .65rem;display:flex;align-items:center;justify-content:center;transition:all 1s">';
  html += '<div id="med-time" style="font-family:var(--fd);font-size:1.3rem;font-style:italic;color:var(--muted)">—</div></div>';
  html += '<button id="med-btn" onclick="toggleMed()" style="background:transparent;border:0.5px solid var(--iv3);border-radius:4px;padding:.3rem .8rem;font-family:var(--fm);font-size:.52rem;color:var(--muted);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase">Start</button>';
  html += '</div></div>';
  html += '</div>'; // end two col

  // Box breathing
  html += '<div class="card" style="margin-bottom:1rem"><div class="cl">Box Breathing</div>';
  html += '<div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap">';
  html += '<div id="breath-circle" style="width:100px;height:100px;border-radius:50%;border:1.5px solid var(--iv3);display:flex;align-items:center;justify-content:center;transition:all 4s;flex-shrink:0">';
  html += '<div id="breath-label" style="font-family:var(--fd);font-size:.88rem;font-style:italic;color:var(--muted);text-align:center">Breathe</div></div>';
  html += '<div style="display:flex;flex-direction:column;gap:.3rem">';
  ['Inhale — 4 counts','Hold — 4 counts','Exhale — 4 counts','Hold — 4 counts'].forEach(function(s){
    html += '<div style="font-family:var(--fm);font-size:.5rem;color:var(--muted);letter-spacing:1px">'+s+'</div>';
  });
  html += '</div></div>';
  html += '<div style="text-align:center;margin-top:.6rem"><button onclick="startBreath()" id="breath-btn" style="background:transparent;border:0.5px solid var(--iv3);border-radius:4px;padding:.3rem .8rem;font-family:var(--fm);font-size:.52rem;color:var(--muted);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase">Begin</button></div></div>';

  // Gratitude
  html += '<div class="card" style="margin-bottom:1rem"><div class="cl">Three Things</div>';
  html += '<div style="font-size:.75rem;color:var(--muted);margin-bottom:.75rem">Name three things that softened, strengthened, or surprised you today.</div>';
  [0,1,2].forEach(function(i){
    html += '<input value="'+(todayGrat[i]||'')+'" placeholder="I am grateful for..." style="width:100%;border:0.5px solid var(--iv3);border-radius:5px;padding:.5rem .75rem;font-family:var(--fd);font-style:italic;font-size:.9rem;background:var(--iv2);color:var(--ink);outline:none;margin-bottom:.5rem" onblur="saveGratitude('+i+',this.value)">';
  });
  html += '</div>';

  // Journal
  html += '<div class="card" style="margin-bottom:1rem"><div class="cl">Journal</div>';
  html += '<div style="font-size:.75rem;color:var(--muted);margin-bottom:.65rem">Let the page hold what your body is still trying to say.</div>';
  html += '<textarea style="width:100%;border:0.5px solid var(--iv3);border-radius:5px;padding:.65rem .85rem;font-family:var(--fd);font-size:.9rem;line-height:1.85;background:var(--iv2);color:var(--ink);outline:none;resize:vertical;min-height:120px" placeholder="This space is yours. No one else reads this." onblur="saveJournal(this.value)">'+todayJournal+'</textarea></div>';

  // Wind down
  html += '<div class="card"><div class="cl">Wind Down</div>';
  var windDownItems = ['No screens 30 min before bed','Magnesium supplement','Light stretch or legs up the wall','Room cool and dark','Set tomorrow intention'];
  windDownItems.forEach(function(item,i){
    var done = todaySleep&&todaySleep[i];
    html += '<div onclick="toggleSleep('+i+')" style="display:flex;align-items:center;gap:.6rem;padding:.42rem 0;border-bottom:0.5px solid var(--iv3);cursor:pointer">';
    html += '<div class="wk-chk '+(done?'done':'')+'"></div>';
    html += '<div style="font-size:.78rem;color:var(--muted);'+(done?'text-decoration:line-through;opacity:.5':'')+'">'+item+'</div></div>';
  });
  html += '</div>';
  return html;
}

// ─── DIET TAB ──────────────────────────────────────────────────
// 4-week low-carb rotation. No pork. No nuts. Spicy preferred.
// High protein, anti-inflammatory, 30 min max weeknights.

var MEALS = (function(){
  // Helper: build a meal object
  function m(name, macros, time, recipe, grocery){
    return {name:name, macros:macros, time:time, recipe:recipe, grocery:grocery};
  }
  // Four weeks × 7 days × 4 meals (B=breakfast, L=lunch, D=dinner, S=snack)
  var w1 = {
    Mon:{
      B: m('Spicy Scrambled Eggs + Avocado','P:28g C:6g F:22g','10 min','Scramble 3 eggs with diced jalapeño, cherry tomatoes, and a pinch of cumin. Serve with ½ avocado and a sprinkle of chili flakes.','eggs,jalapeño,cherry tomatoes,cumin,avocado,chili flakes'),
      L: m('Grilled Chicken Arugula Bowl','P:42g C:8g F:14g','20 min','Season chicken thigh with paprika, garlic, and lime. Sear 6 min per side. Slice over arugula with cucumber, red onion, and lemon-olive oil dressing.','chicken thighs,paprika,garlic,lime,arugula,cucumber,red onion,olive oil'),
      D: m('Spicy Shrimp + Zucchini Noodles','P:35g C:10g F:12g','25 min','Sauté shrimp with garlic, butter, red pepper flakes, and lemon. Spiralize 2 zucchini, sauté 3 min. Toss together with fresh parsley.','shrimp,garlic,butter,red pepper flakes,lemon,zucchini,parsley'),
      S: m('Greek Yogurt + Berries','P:18g C:12g F:3g','2 min','Full-fat Greek yogurt topped with blueberries and a pinch of cinnamon.','Greek yogurt,blueberries,cinnamon'),
    },
    Tue:{
      B: m('Smoked Salmon + Egg Cups','P:32g C:3g F:18g','15 min','Line muffin tin with smoked salmon. Crack egg into each. Add capers and dill. Bake 12 min at 375°F.','smoked salmon,eggs,capers,dill'),
      L: m('Turkey Lettuce Wraps','P:38g C:7g F:15g','20 min','Brown ground turkey with ginger, garlic, soy sauce, and chili garlic sauce. Serve in butter lettuce cups with shredded carrots and lime.','ground turkey,ginger,garlic,soy sauce,chili garlic sauce,butter lettuce,carrots,lime'),
      D: m('Baked Salmon + Roasted Asparagus','P:45g C:8g F:20g','30 min','Rub salmon with Dijon, garlic, and lemon zest. Bake 15 min at 400°F. Roast asparagus with olive oil, salt, and red pepper flakes alongside.','salmon fillet,Dijon mustard,lemon,asparagus,olive oil,red pepper flakes'),
      S: m('Cucumber + Tuna','P:22g C:4g F:6g','5 min','Slice cucumber rounds. Top each with a spoon of tuna mixed with lime juice, diced jalapeño, and a drop of hot sauce.','cucumber,canned tuna,lime,jalapeño,hot sauce'),
    },
    Wed:{
      B: m('Veggie Egg White Omelette','P:30g C:7g F:8g','15 min','Whisk 5 egg whites. Pour into non-stick pan. Fill with spinach, roasted red peppers, and feta. Fold and cook 3 min.','egg whites,spinach,roasted red peppers,feta'),
      L: m('Chicken Taco Bowl (no tortilla)','P:44g C:12g F:16g','25 min','Season chicken breast with cumin, chili powder, garlic. Cook and shred. Serve over shredded cabbage with pico de gallo, avocado, and lime.','chicken breast,cumin,chili powder,garlic,cabbage,pico de gallo,avocado,lime'),
      D: m('Spicy Turkey Stir-Fry + Broccoli','P:40g C:14g F:12g','25 min','Brown turkey with ginger, garlic, soy sauce, and sriracha. Add broccoli florets and bell peppers. Cook 8 min. Serve in bowls.','ground turkey,ginger,garlic,soy sauce,sriracha,broccoli,bell peppers'),
      S: m('Cottage Cheese + Hot Sauce','P:20g C:6g F:4g','2 min','Full-fat cottage cheese with a generous pour of hot sauce and black pepper. Simple and effective.','cottage cheese,hot sauce'),
    },
    Thu:{
      B: m('Shakshuka (Spiced Tomato Eggs)','P:26g C:14g F:16g','25 min','Sauté onion, garlic, and bell pepper in olive oil. Add crushed tomatoes, cumin, paprika, and cayenne. Crack in 3-4 eggs. Simmer covered until eggs set. Top with fresh herbs.','onion,garlic,bell pepper,crushed tomatoes,cumin,paprika,cayenne,eggs,fresh cilantro'),
      L: m('Salmon Salad Lettuce Wraps','P:36g C:5g F:18g','15 min','Flake canned salmon with avocado, lemon, diced celery, and sriracha. Serve in romaine leaves.','canned salmon,avocado,lemon,celery,sriracha,romaine'),
      D: m('Garlic Butter Shrimp + Cauliflower Rice','P:38g C:12g F:16g','25 min','Pulse cauliflower in food processor, sauté 5 min. Cook shrimp in garlic butter with lemon and red pepper flakes. Serve over cauli rice.','shrimp,garlic,butter,lemon,red pepper flakes,cauliflower'),
      S: m('Hard-Boiled Eggs + Tajin','P:12g C:1g F:10g','10 min','Two hard-boiled eggs sliced and dusted with Tajín. High protein, zero sugar.','eggs,Tajin seasoning'),
    },
    Fri:{
      B: m('Spicy Avocado Egg Toast (on cucumber)','P:22g C:8g F:20g','10 min','Mash avocado with lime, salt, and chili flakes. Spread on thick cucumber rounds. Top with a fried egg and hot sauce.','avocado,lime,chili flakes,cucumber,eggs,hot sauce'),
      L: m('Ground Turkey Stuffed Bell Peppers','P:42g C:16g F:14g','30 min','Halve bell peppers. Fill with spiced ground turkey, diced tomatoes, and cumin. Bake 20 min at 375°F.','bell peppers,ground turkey,diced tomatoes,cumin,garlic'),
      D: m('Seared Tuna + Bok Choy','P:46g C:8g F:14g','20 min','Coat tuna steak in black sesame and soy. Sear 90 seconds per side. Serve over sautéed bok choy with ginger and garlic.','tuna steak,black sesame,soy sauce,bok choy,ginger,garlic'),
      S: m('Spicy Edamame','P:18g C:14g F:8g','5 min','Steamed edamame tossed with sesame oil, chili flakes, and sea salt.','edamame,sesame oil,chili flakes'),
    },
    Sat:{
      B: m('Full Protein Breakfast Plate','P:38g C:8g F:24g','25 min','3 eggs any style. 2 turkey bacon strips. Sautéed spinach with garlic. Sliced tomato with sea salt.','eggs,turkey bacon,spinach,garlic,tomatoes'),
      L: m('Grilled Chicken + Mango Slaw','P:44g C:18g F:14g','30 min','Grill spiced chicken thighs. Make slaw from shredded cabbage, mango, jalapeño, lime, and cilantro. Serve over slaw.','chicken thighs,cabbage,mango,jalapeño,lime,cilantro'),
      D: m('Salmon Poke Bowl (no rice)','P:42g C:14g F:20g','20 min','Cube fresh salmon. Toss with soy, sesame oil, green onions, and chili. Serve over mixed greens with cucumber, avocado, and edamame.','sashimi salmon,soy sauce,sesame oil,green onions,chili,mixed greens,cucumber,avocado,edamame'),
      S: m('Protein Smoothie','P:30g C:16g F:6g','5 min','Blend Greek yogurt, frozen berries, spinach, a scoop of collagen powder, and unsweetened almond-free milk substitute.','Greek yogurt,frozen berries,spinach,collagen powder,oat milk'),
    },
    Sun:{
      B: m('Veggie Frittata (meal prep)','P:32g C:9g F:18g','35 min','Whisk 8 eggs. Add roasted veggies (zucchini, peppers, cherry tomatoes), feta, and chili flakes. Pour into oven-safe pan. Bake 20 min at 375°F. Cuts into 4 portions for the week.','eggs,zucchini,bell peppers,cherry tomatoes,feta,chili flakes'),
      L: m('Slow-Cooked Chicken Thighs + Greens','P:48g C:8g F:18g','35 min','Season chicken with paprika, garlic, cumin. Sear then finish in oven 25 min at 400°F. Serve with sautéed kale and lemon.','chicken thighs,paprika,garlic,cumin,kale,lemon'),
      D: m('Zucchini Lasagna (turkey)','P:44g C:16g F:18g','40 min','Slice zucchini into thin sheets. Layer with spiced ground turkey, marinara, and ricotta. Bake 30 min at 375°F.','zucchini,ground turkey,marinara sauce,ricotta'),
      S: m('Greek Yogurt Dip + Veggies','P:16g C:10g F:3g','5 min','Full-fat Greek yogurt mixed with garlic, lemon, and dill. Serve with sliced cucumber, bell pepper, and celery.','Greek yogurt,garlic,dill,cucumber,bell pepper,celery'),
    },
  };
  // Weeks 2-4: simplified variations (same structure, different recipes)
  var w2 = JSON.parse(JSON.stringify(w1)); // Start from w1, override key meals
  w2.Mon.D = m('Lemon Herb Chicken + Brussels Sprouts','P:44g C:12g F:16g','28 min','Roast chicken thighs with lemon, thyme, and garlic. Halve Brussels sprouts and roast with olive oil and red pepper flakes alongside.','chicken thighs,lemon,thyme,garlic,Brussels sprouts,olive oil,red pepper flakes');
  w2.Tue.B = m('Spicy Turkey Breakfast Bowl','P:34g C:8g F:14g','20 min','Brown turkey with cumin, chili powder, and garlic. Serve over spinach with a fried egg and hot sauce on top.','ground turkey,cumin,chili powder,garlic,spinach,eggs,hot sauce');
  w2.Wed.D = m('Tuna Stuffed Avocado','P:36g C:8g F:22g','10 min','Mix canned tuna with lime, diced jalapeño, and cilantro. Halve two avocados. Fill each half with tuna mixture.','canned tuna,lime,jalapeño,cilantro,avocados');
  w2.Thu.B = m('Egg + Veggie Scramble','P:28g C:6g F:16g','15 min','Scramble 3 eggs with zucchini, cherry tomatoes, and spinach in olive oil. Season with turmeric, salt, and pepper.','eggs,zucchini,cherry tomatoes,spinach,turmeric,olive oil');
  w2.Fri.D = m('Spicy Coconut Shrimp Soup','P:36g C:12g F:18g','25 min','Simmer shrimp in coconut milk with lemongrass, chili, ginger, and lime. Add bok choy last 3 min.','shrimp,coconut milk,lemongrass,chili,ginger,lime,bok choy');
  w2.Sat.D = m('Sheet Pan Chicken + Veggies','P:46g C:14g F:18g','35 min','Toss chicken thighs with cumin, smoked paprika, and olive oil. Arrange on sheet pan with broccoli, bell peppers, and onion. Roast 30 min at 425°F.','chicken thighs,cumin,smoked paprika,olive oil,broccoli,bell peppers,onion');
  var w3 = JSON.parse(JSON.stringify(w1));
  w3.Mon.B = m('Collagen Matcha Smoothie Bowl','P:26g C:12g F:8g','8 min','Blend Greek yogurt, matcha powder, collagen, and frozen spinach. Pour into bowl. Top with berries and hemp seeds.','Greek yogurt,matcha powder,collagen powder,spinach,berries,hemp seeds');
  w3.Tue.D = m('Miso Glazed Salmon','P:44g C:8g F:20g','20 min','Mix white miso, soy, and ginger. Brush on salmon. Broil 8 min. Serve with steamed broccoli and sesame.','salmon,white miso,soy sauce,ginger,broccoli,sesame seeds');
  w3.Wed.L = m('Spicy Chicken Soup','P:42g C:10g F:12g','30 min','Simmer chicken breast in broth with garlic, jalapeño, cumin, and lime. Shred chicken. Add zucchini and cilantro.','chicken breast,chicken broth,garlic,jalapeño,cumin,lime,zucchini,cilantro');
  w3.Thu.D = m('Turkey Lettuce Cup Tacos','P:40g C:9g F:14g','20 min','Brown turkey with taco seasoning. Serve in butter lettuce with avocado salsa and sriracha.','ground turkey,taco seasoning,butter lettuce,avocado,lime,sriracha');
  w3.Fri.B = m('Egg White Frittata Muffins','P:28g C:4g F:6g','20 min','Whisk egg whites with spinach, roasted peppers, and feta. Pour into muffin tin. Bake 18 min at 375°F. Makes 6.','egg whites,spinach,roasted red peppers,feta');
  var w4 = JSON.parse(JSON.stringify(w2));
  w4.Mon.L = m('Smoked Salmon Cucumber Rolls','P:30g C:5g F:16g','10 min','Spread cream cheese on sliced cucumber. Top with smoked salmon, capers, and dill. Roll and pin if desired.','smoked salmon,cucumber,cream cheese,capers,dill');
  w4.Tue.B = m('Turmeric Scrambled Eggs','P:26g C:5g F:16g','12 min','Scramble 3 eggs with turmeric, black pepper, and coconut oil. Serve with sliced tomato and a handful of spinach.','eggs,turmeric,black pepper,coconut oil,tomato,spinach');
  w4.Wed.B = m('Greek Yogurt Parfait','P:28g C:14g F:8g','5 min','Layer Greek yogurt with mixed berries, hemp seeds, and a drizzle of raw honey. High protein, no gut stress.','Greek yogurt,mixed berries,hemp seeds,honey');
  w4.Thu.L = m('Chicken + Avocado Salad','P:44g C:8g F:22g','15 min','Dice grilled chicken and avocado. Toss with lime, cilantro, red onion, and jalapeño. Serve on romaine.','grilled chicken,avocado,lime,cilantro,red onion,jalapeño,romaine');
  w4.Fri.L = m('Shrimp Ceviche Cups','P:32g C:10g F:8g','20 min','Cook shrimp with lime juice. Toss with diced tomato, cucumber, red onion, jalapeño, and cilantro. Serve in endive cups.','shrimp,lime,tomato,cucumber,red onion,jalapeño,cilantro,endive');
  return [w1,w2,w3,w4];
})();

function renderDietTab(){
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var mealTypes = ['B','L','D','S'];
  var mealLabels = {B:'Breakfast',L:'Lunch',D:'Dinner',S:'Snack'};
  var week = MEALS[_dietWeek-1];
  var today = new Date().toLocaleDateString('en-US',{weekday:'short'});

  var html = '';

  // Week selector
  html += '<div style="display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center">';
  html += '<span style="font-family:var(--fm);font-size:.46rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase">Rotation:</span>';
  [1,2,3,4].forEach(function(w){
    html += '<button onclick="_dietWeek='+w+';bBody()" style="font-family:var(--fm);font-size:.52rem;padding:.28rem .7rem;border-radius:20px;border:0.5px solid '+(w===_dietWeek?'var(--si)':'var(--iv3)')+';background:'+(w===_dietWeek?'var(--sip)':'transparent')+';color:'+(w===_dietWeek?'var(--si)':'var(--muted)')+';cursor:pointer">Week '+w+'</button>';
  });
  html += '<button onclick="printGroceryList()" style="margin-left:auto;font-family:var(--fm);font-size:.52rem;padding:.28rem .8rem;border-radius:20px;border:0.5px solid var(--sal);background:var(--sap);color:var(--sa);cursor:pointer">🛒 Grocery List</button>';
  html += '</div>';

  // Macro key
  html += '<div style="display:flex;gap:.75rem;margin-bottom:1rem;padding:.65rem .85rem;background:var(--ink);border-radius:8px;flex-wrap:wrap">';
  [{l:'Daily Target',v:'~1,600 cal'},{l:'Protein',v:'~160g'},{l:'Net Carbs',v:'<60g'},{l:'Fat',v:'~80g'}].forEach(function(m){
    html += '<div style="text-align:center;flex:1;min-width:80px"><div style="font-family:var(--fd);font-size:1rem;font-style:italic;color:var(--go)">'+m.v+'</div><div style="font-family:var(--fm);font-size:.44rem;color:rgba(250,247,242,.3);letter-spacing:1.5px;text-transform:uppercase">'+m.l+'</div></div>';
  });
  html += '</div>';

  // Meal grid — each day as a card
  days.forEach(function(day){
    var dayMeals = week[day];
    var isToday = (today===day);
    html += '<div style="background:var(--wh);border-radius:10px;border:0.5px solid '+(isToday?'var(--si)':'var(--iv3)')+';overflow:hidden;margin-bottom:.75rem">';
    html += '<div style="background:'+(isToday?'var(--si)':'var(--iv2)')+';padding:.55rem 1rem;display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2.5px;color:'+(isToday?'white':'var(--muted)')+';text-transform:uppercase">'+day+(isToday?' · Today':'')+'</div>';
    // approx daily protein
    var totalP = mealTypes.reduce(function(acc,t){ var m=dayMeals&&dayMeals[t]; if(!m)return acc; var match=m.macros.match(/P:(\d+)g/); return acc+(match?parseInt(match[1]):0); },0);
    html += '<div style="font-family:var(--fm);font-size:.46rem;color:'+(isToday?'rgba(255,255,255,.65)':'var(--faint)')+'">~'+totalP+'g protein</div>';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">';
    mealTypes.forEach(function(t,ti){
      var meal = dayMeals&&dayMeals[t];
      if(!meal) return;
      var border = ti<2 ? 'border-bottom:0.5px solid var(--iv3);' : '';
      var borderR = (ti%2===0) ? 'border-right:0.5px solid var(--iv3);' : '';
      html += '<div style="padding:.75rem .85rem;cursor:pointer;'+border+borderR+'transition:background .12s" onmouseover="this.style.background=\'var(--sip)\'" onmouseout="this.style.background=\'\'" onclick="showRecipe(\''+day+'\',\''+t+'\')">';
      html += '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;color:var(--si);text-transform:uppercase;margin-bottom:.2rem">'+mealLabels[t]+'</div>';
      html += '<div style="font-size:.78rem;font-weight:500;color:var(--ink);line-height:1.3;margin-bottom:.2rem">'+meal.name+'</div>';
      html += '<div style="font-family:var(--fm);font-size:.46rem;color:var(--faint)">'+meal.macros+'</div>';
      html += '</div>';
    });
    html += '</div></div>';
  });

  return html;
}

function showRecipe(day, type){
  var meal = MEALS[_dietWeek-1][day]&&MEALS[_dietWeek-1][day][type];
  if(!meal) return;
  var mealLabels = {B:'Breakfast',L:'Lunch',D:'Dinner',S:'Snack'};
  var ov = document.createElement('div');
  ov.className = 'ov on';
  ov.id = 'recipe-modal-ov';
  ov.innerHTML = '<div class="modal" style="max-width:480px">' +
    '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:2.5px;color:var(--si);text-transform:uppercase;margin-bottom:.4rem">'+mealLabels[type]+'</div>' +
    '<h3 style="font-family:var(--fd);font-size:1.4rem;font-weight:300;font-style:italic;color:var(--ink);margin-bottom:.25rem">'+meal.name+'</h3>' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--muted);margin-bottom:1rem">'+meal.macros+' &middot; '+meal.time+'</div>' +
    '<div style="font-size:.78rem;line-height:1.85;color:var(--charcoal);margin-bottom:1rem">'+meal.recipe+'</div>' +
    '<div style="font-size:.68rem;color:var(--muted);padding:.65rem;background:var(--iv2);border-radius:5px;margin-bottom:1rem"><strong style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;text-transform:uppercase;color:var(--si);display:block;margin-bottom:.3rem">Grocery</strong>'+meal.grocery+'</div>' +
    '<div class="m-acts"><button class="btn bg" onclick="document.getElementById(\'recipe-modal-ov\').remove()">Close</button></div>' +
    '</div>';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
}

function printGroceryList(){
  var week = MEALS[_dietWeek-1];
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var types = ['B','L','D','S'];
  var all = {};
  days.forEach(function(d){
    types.forEach(function(t){
      var meal = week[d]&&week[d][t];
      if(!meal) return;
      meal.grocery.split(',').forEach(function(item){
        var clean = item.trim().toLowerCase();
        if(clean) all[clean] = true;
      });
    });
  });
  var cats = {
    'Proteins':['chicken thighs','chicken breast','ground turkey','salmon','salmon fillet','shrimp','tuna steak','canned tuna','canned salmon','sashimi salmon','smoked salmon','eggs','egg whites','turkey bacon'],
    'Produce':['avocado','spinach','arugula','romaine','kale','mixed greens','bok choy','broccoli','zucchini','asparagus','cauliflower','bell peppers','cucumber','cherry tomatoes','tomato','red onion','green onions','jalapeño','lemongrass','endive','butter lettuce','celery','cabbage','brussels sprouts'],
    'Dairy & Eggs':['greek yogurt','cottage cheese','feta','ricotta','cream cheese','butter'],
    'Pantry':['olive oil','coconut oil','soy sauce','sesame oil','miso','hot sauce','sriracha','chili garlic sauce','chili flakes','red pepper flakes','cumin','paprika','smoked paprika','turmeric','ginger','garlic','lime','lemon','cilantro','parsley','dill','capers','tajin seasoning','black sesame','hemp seeds','collagen powder','matcha powder','honey','marinara sauce','chicken broth','coconut milk'],
    'Frozen / Other':['edamame','frozen berries','oat milk','berries','blueberries','mango'],
  };
  var win = window.open('','_blank');
  var listHtml = '';
  Object.keys(cats).forEach(function(cat){
    var items = cats[cat].filter(function(item){ return all[item]; });
    if(!items.length) return;
    // also add uncategorized
    listHtml += '<div style="margin-bottom:1.5rem"><div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8B4A2F;margin-bottom:.6rem;padding-bottom:.3rem;border-bottom:0.5px solid #E5DDD2">'+cat+'</div>';
    items.forEach(function(i){ listHtml += '<div style="display:flex;align-items:center;gap:.6rem;padding:.3rem 0;font-size:13px;color:#3D3028"><div style="width:14px;height:14px;border-radius:3px;border:1.5px solid #D0C8C0;flex-shrink:0"></div>'+i.charAt(0).toUpperCase()+i.slice(1)+'</div>'; });
    // uncategorized items
    var uncatItems = Object.keys(all).filter(function(item){ return !Object.values(cats).some(function(arr){ return arr.includes(item); }); });
    if(cat==='Pantry' && uncatItems.length){
      uncatItems.forEach(function(i){ listHtml += '<div style="display:flex;align-items:center;gap:.6rem;padding:.3rem 0;font-size:13px;color:#3D3028"><div style="width:14px;height:14px;border-radius:3px;border:1.5px solid #D0C8C0;flex-shrink:0"></div>'+i.charAt(0).toUpperCase()+i.slice(1)+'</div>'; });
    }
    listHtml += '</div>';
  });
  win.document.write('<!DOCTYPE html><html><head><title>Grocery List — Week '+_dietWeek+'</title><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;color:#1C1714;padding:2.5rem;max-width:600px;margin:0 auto}h1{font-family:"Cormorant Garamond",serif;font-size:28px;font-weight:300;font-style:italic;margin-bottom:.25rem}p{font-size:11px;color:#7A6F68;margin-bottom:2rem}@media print{button{display:none}}</style></head><body><button onclick="window.print()" style="padding:8px 18px;background:#1C1714;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;margin-bottom:1.5rem">Print List</button><h1>Grocery List</h1><p>Week '+_dietWeek+' · Low-carb · High protein · No pork · No nuts</p>'+listHtml+'</body></html>');
  win.document.close();
}

// ─── SHARED HELPERS ────────────────────────────────────────────
function toggleFitnessDay(key){
  var el=document.getElementById('fit-day-'+key);
  if(!el) return;
  var opening=el.style.display==='none';
  el.style.display=opening?'block':'none';
  _openFitDays[key]=opening;
}
function saveFitnessEx(dayKey,exIdx){
  var fd=lsGet('chq-fitness',{});
  if(!fd.exChecks)fd.exChecks={};
  if(!fd.exChecks[dayKey])fd.exChecks[dayKey]={};
  fd.exChecks[dayKey][exIdx]=!fd.exChecks[dayKey][exIdx];
  lsSave('chq-fitness',fd);rerenderKeepScroll(bBody);
}
function saveFitnessField(section,key,val){var fd=lsGet('chq-fitness',{});if(!fd[section])fd[section]={};fd[section][key]=val;lsSave('chq-fitness',fd);}
function saveFitnessWeight(val){var fd=lsGet('chq-fitness',{});fd.weight=val;lsSave('chq-fitness',fd);}
function saveFitnessDay(key){var fd=lsGet('chq-fitness',{days:{}});if(!fd.days)fd.days={};if(!fd.days[key])fd.days[key]={done:false};fd.days[key].done=!fd.days[key].done;lsSave('chq-fitness',fd);rerenderKeepScroll(bBody);}
function saveFitnessNutrition(key){var fd=lsGet('chq-fitness',{nutrition:{}});if(!fd.nutrition)fd.nutrition={};fd.nutrition[key]=!fd.nutrition[key];lsSave('chq-fitness',fd);rerenderKeepScroll(bBody);}
function saveFitnessRitual(key,idx){var fd=lsGet('chq-fitness',{rituals:{}});if(!fd.rituals)fd.rituals={};if(!fd.rituals[key])fd.rituals[key]={};fd.rituals[key][idx]=!fd.rituals[key][idx];lsSave('chq-fitness',fd);rerenderKeepScroll(bBody);}
function saveFitnessQuit(val){var fd=lsGet('chq-fitness',{quit:{}});if(!fd.quit)fd.quit={};fd.quit.startDate=val;lsSave('chq-fitness',fd);rerenderKeepScroll(bBody);}
function saveFitnessLog(){showToast('Saved \u2713');}

function saveGratitude(idx,val){var pd=lsGet('chq-peace',{gratitude:{}});var today=new Date().toISOString().split('T')[0];if(!pd.gratitude)pd.gratitude={};if(!pd.gratitude[today])pd.gratitude[today]=['','',''];pd.gratitude[today][idx]=val;lsSave('chq-peace',pd);}
function saveJournal(val){var pd=lsGet('chq-peace',{journal:{}});var today=new Date().toISOString().split('T')[0];if(!pd.journal)pd.journal={};pd.journal[today]=val;lsSave('chq-peace',pd);}
function toggleSleep(idx){var pd=lsGet('chq-peace',{sleep:{}});var today=new Date().toISOString().split('T')[0];if(!pd.sleep)pd.sleep={};if(!pd.sleep[today])pd.sleep[today]={};pd.sleep[today][idx]=!pd.sleep[today][idx];lsSave('chq-peace',pd);rerenderKeepScroll(bBody);}

// Meditation timer
function startMed(mins){_medTotal=mins*60;_medLeft=mins*60;_medRunning=false;toggleMed();}
function toggleMed(){
  _medRunning=!_medRunning;
  var btn=document.getElementById('med-btn');if(btn)btn.textContent=_medRunning?'Pause':'Resume';
  if(!_medRunning){clearInterval(_medTimer);return;}
  clearInterval(_medTimer);
  _medTimer=setInterval(function(){
    if(!_medRunning){clearInterval(_medTimer);return;}
    _medLeft--;
    var m=Math.floor(_medLeft/60),s=_medLeft%60;
    var t=document.getElementById('med-time');if(t)t.textContent=m+':'+(s<10?'0':'')+s;
    var c=document.getElementById('med-circle');
    if(c){var pct=_medLeft/_medTotal;c.style.borderColor='rgba(139,74,47,'+(0.2+pct*0.6)+')';}
    if(_medLeft<=0){clearInterval(_medTimer);_medRunning=false;var t2=document.getElementById('med-time');if(t2)t2.textContent='Done';showToast('Meditation complete \u2713');}
  },1000);
}

// Box breathing
function startBreath(){
  _breathRunning=!_breathRunning;
  var btn=document.getElementById('breath-btn');
  if(btn)btn.textContent=_breathRunning?'Stop':'Begin';
  if(!_breathRunning){clearInterval(_breathTimer);var c=document.getElementById('breath-circle');if(c){c.style.transform='';c.style.borderColor='var(--iv3)';}return;}
  _breathIdx=0;_breathCount=0;
  runBreathPhase();
  _breathTimer=setInterval(function(){
    _breathCount++;
    if(_breathCount>=4){_breathCount=0;_breathIdx=(_breathIdx+1)%4;runBreathPhase();}
  },1000);
}
function runBreathPhase(){
  var lbl=document.getElementById('breath-label');
  var circ=document.getElementById('breath-circle');
  if(!lbl||!circ)return;
  var phase=_breathPhases[_breathIdx];
  lbl.textContent=phase;
  if(phase==='Inhale'){circ.style.transform='scale(1.35)';circ.style.borderColor='var(--sil)';}
  else if(phase==='Exhale'){circ.style.transform='scale(0.85)';circ.style.borderColor='var(--iv3)';}
  else{circ.style.transform='scale(1.1)';circ.style.borderColor='var(--go)';}
}

function bPlaceholder(id){

  inject('<div class="ph"><div><div class="ph-tag">'+id+'</div><div class="ph-title"><em>Coming Soon</em></div></div></div><div class="pb"><div class="edit-hint" style="margin-top:1rem">This section is under construction. Switch on Edit Mode to customize.</div></div>');
}

// ═══ EDIT MODE ════════════════════════════════════════════════
var EM_TYPES={
  amelia:{'timeline':'dashboard','sponsor':'sponsors','look':'looks','brand':'brand','oath':'dashboard','ns':'dashboard','goal':'dashboard','goalcur':'dashboard','goalcur':'dashboard','goaltar':'dashboard','workout':'workouts','appt':'appointments','peace':'peace'},
  laneea:{'sponsor':'sponsors','look':'looks','appt':'appointments','rolepage':'dashboard'},
  trainer:{'workout':'workouts','rolepage':'dashboard'},
  hmu:{'look':'looks','rolepage':'dashboard'},
};

function toggleEM(){
  S.emActive=!S.emActive;
  document.body.classList.toggle('em',S.emActive);
  var btn=g('em-btn');
  if(btn){
    btn.classList.toggle('on',S.emActive);
    btn.textContent=S.emActive?'Exit Edit':'Edit Mode';
    btn.style.color      = S.emActive ? 'rgba(201,168,76,.95)' : 'rgba(201,168,76,.5)';
    btn.style.borderColor= S.emActive ? 'rgba(201,168,76,.6)'  : 'rgba(201,168,76,.25)';
    btn.style.background = S.emActive ? 'rgba(201,168,76,.08)' : 'transparent';
  }
  if(S.emActive) applyEM();
}

function applyEM(){
  var allowed=EM_TYPES[S.role]||{};
  document.querySelectorAll('[data-e]').forEach(function(el){
    if(el.isContentEditable) return;
    var key=el.getAttribute('data-e');
    var type=key.split(':')[0];
    if(allowed[type]===undefined) return;
    el.contentEditable='true';
    el.addEventListener('input',function(){
      clearTimeout(S.saveTimer);
      S.saveTimer=setTimeout(function(){commitE(el);},600);
    });
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&el.tagName!=='TEXTAREA'){e.preventDefault();el.blur();}
    });
    // also make todo items editable
    document.querySelectorAll('.todo-txt').forEach(function(t){t.contentEditable='true';});
  });
}

function commitE(el){
  var key=el.getAttribute('data-e');
  var val=el.textContent.trim();
  if(!key)return;
  var parts=key.split(':'),type=parts[0],id=parts[1],field=parts[2];
  if(type==='sponsor'){var s=S.sponsors.find(function(x){return String(x.id)===id;});if(s){s[field]=val;lsSave('chq-sp',S.sponsors);}}
  else if(type==='look'){var l=S.looks.find(function(x){return String(x.id)===id;});if(l){l[field]=val;lsSave('chq-lk',S.looks);}}
  else if(type==='workout'){
    var w=S.workouts.find(function(x){return String(x.id)===id;});
    if(w){if(field.indexOf('ex')===0){var ei=parseInt(field.replace('ex',''));if(w.exercises[ei])w.exercises[ei].name=val;}
    else if(field.indexOf('sets')===0){var si=parseInt(field.replace('sets',''));if(w.exercises[si])w.exercises[si].sets=val;}
    else{w[field]=val;}lsSave('chq-wk',S.workouts);}
  }
  else if(type==='goal'){S.goals[id]=val;lsSave('chq-gl',S.goals);}
  else if(type==='goalcur'){
    var gd=lsGet('chq-gd',null);if(gd){var gi=gd.find(function(x){return x.key===id;});if(gi){gi.cur=val;lsSave('chq-gd',gd);}}
  }
  else if(type==='goaltar'){
    var gd2=lsGet('chq-gd',null);if(gd2){var gi2=gd2.find(function(x){return x.key===id;});if(gi2){gi2.target=val;lsSave('chq-gd',gd2);}}
  }
  else if(type==='ns'){S.goals['ns_'+id]=val;lsSave('chq-gl',S.goals);}
  else if(type==='oath'){S.goals['oath']=val;lsSave('chq-gl',S.goals);}
  else if(type==='rolepage'){
    var rp=lsGet('chq-role-pages',{})||{};
    if(!rp[id])rp[id]={};
    if(id==='hmu'&&(field.indexOf('date')===0||field.indexOf('ev')===0||field.indexOf('look')===0)){
      if(!Array.isArray(rp[id].schedule))rp[id].schedule=getRolePages().hmu.schedule.slice();
      var idx=parseInt(field.replace(/[^\d]/g,''),10);
      var baseField=field.replace(/\d+/g,'');
      if(!rp[id].schedule[idx])rp[id].schedule[idx]={date:'',ev:'',look:''};
      rp[id].schedule[idx][baseField]=val;
    } else {
      rp[id][field]=val;
    }
    lsSave('chq-role-pages',rp);
  }
  else if(type==='peace'){
    var pd=lsGet('chq-peace',{})||{};
    if(!pd.copy||typeof pd.copy!=='object')pd.copy={};
    if(id==='copy'){
      pd.copy[field]=val;
    } else if(id==='wind'){
      if(!Array.isArray(pd.copy.windDownItems))pd.copy.windDownItems=[];
      var windIdx=parseInt(field,10);
      if(isNaN(windIdx))windIdx=parseInt(parts[2],10);
      var windField=parts[3];
      if(windField==='label')pd.copy.windDownItems[windIdx]=val;
    }
    lsSave('chq-peace',pd);
  }
  else if(type==='gd'){
    var gd=lsGet('chq-gd',null)||[];
    var idx=parseInt(id);
    if(gd[idx]){gd[idx][field]=val;lsSave('chq-gd',gd);}
  }
  else if(type==='goalcur'){
    var gd2=lsGet('chq-gd',null);
    if(gd2){var item=gd2.find(function(x){return x.key===id;});if(item){item[field]=val;lsSave('chq-gd',gd2);}}
  }
  else if(type==='tl'){var tl=lsGet('chq-timeline',[]);var i=parseInt(id);if(!tl[i])tl[i]={};tl[i][field]=val;lsSave('chq-timeline',tl);}
  showToast();
}

// ═══ MODAL & MISC ═════════════════════════════════════════════
document.querySelectorAll('.ov').forEach(function(o){
  o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on');});
});

// ═══ PETALS ══════════════════════════════════════════════════
(function(){
  var canvas=document.getElementById('petal-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var petals=[];
  var W,H;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
  resize();
  window.addEventListener('resize',resize);
  var colors=['rgba(240,216,152,','rgba(242,196,192,','rgba(200,184,232,','rgba(212,184,106,','rgba(255,245,220,'];
  function makePetal(){
    return {x:Math.random()*W,y:H+Math.random()*120,size:3+Math.random()*5,
      speedY:-(0.4+Math.random()*0.7),speedX:(Math.random()-.5)*0.4,
      rot:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*0.015,
      opacity:0.15+Math.random()*0.35,color:colors[Math.floor(Math.random()*colors.length)],
      wobble:Math.random()*Math.PI*2,wobbleSpeed:0.01+Math.random()*0.02};
  }
  for(var i=0;i<38;i++){var p=makePetal();p.y=Math.random()*H;petals.push(p);}
  function drawPetal(p){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=p.opacity;
    ctx.fillStyle=p.color+'1)';ctx.beginPath();
    ctx.moveTo(0,-p.size);
    ctx.bezierCurveTo(p.size*.6,-p.size*.5,p.size*.6,p.size*.5,0,p.size*.8);
    ctx.bezierCurveTo(-p.size*.6,p.size*.5,-p.size*.6,-p.size*.5,0,-p.size);
    ctx.fill();ctx.restore();
  }
  function tick(){
    var loginEl=document.getElementById('login');
    if(!loginEl||loginEl.style.display==='none'){ctx.clearRect(0,0,W,H);return;}
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<petals.length;i++){
      var p=petals[i];
      p.wobble+=p.wobbleSpeed;p.x+=p.speedX+Math.sin(p.wobble)*.3;
      p.y+=p.speedY;p.rot+=p.rotSpeed;
      if(p.y<-20)petals[i]=makePetal();
      drawPetal(p);
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

if(typeof isPublicPortfolioRoute === 'function' && isPublicPortfolioRoute()){
  renderPublicPortfolioRoute();
}


// ═══════════════════════════════════════════════════════════════
// FINANCE SYSTEM — Kathy's Dashboard
// Expense tracking, invoice creation, PDF generation
// ═══════════════════════════════════════════════════════════════

var FIN_KEY = 'chq-finance';

function getFinData(){
  var d = lsGet(FIN_KEY, {});
  if(!d.expenses) d.expenses = [];
  if(!d.invoices) d.invoices = [];
  if(!d.budget)   d.budget   = 5000; // default campaign budget
  return d;
}

function saveFinData(d){ lsSave(FIN_KEY, d); }

var EXP_CATS = ['Wardrobe','Competition Fees','Training','Travel','Photography','Hair & Makeup','Marketing','Misc'];
var INV_STATUS = ['Draft','Sent','Paid','Overdue'];

function finTotals(){
  var d = getFinData();
  var spent    = d.expenses.reduce(function(a,e){ return a+(parseFloat(e.amount)||0); }, 0);
  var invoiced = d.invoices.filter(function(i){ return i.status==='Sent'||i.status==='Overdue'; }).reduce(function(a,i){ return a+(parseFloat(i.amount)||0); }, 0);
  var paid     = d.invoices.filter(function(i){ return i.status==='Paid'; }).reduce(function(a,i){ return a+(parseFloat(i.amount)||0); }, 0);
  var budget   = d.budget || 0;
  return { spent:spent, invoiced:invoiced, paid:paid, budget:budget, remaining: budget - spent };
}

// ── FINANCE DASHBOARD ─────────────────────────────────────────
function bFinanceDash(){
  var t = finTotals();
  var d = getFinData();
  var recentExp = d.expenses.slice(-5).reverse();
  var recentInv = d.invoices.slice(-5).reverse();

  inject(
    '<div class="ph"><div><div class="ph-tag">Finance & Operations</div><div class="ph-title">Campaign <em>Finances</em></div></div>' +
    '<div class="ph-acts">' +
    '<button class="btn bg" onclick="showPanel(\'expenses\')">+ Expense</button>' +
    '<button class="btn bc" onclick="showPanel(\'invoices\')">+ Invoice</button>' +
    '</div></div>' +
    '<div class="pb">' +

    // Stats
    '<div class="fin-stat-grid" style="margin-bottom:1rem">' +
    '<div class="fin-stat expense"><div class="fin-n">$'+t.spent.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})+'</div><div class="fin-l">Total Spent</div></div>' +
    '<div class="fin-stat income"><div class="fin-n">$'+t.paid.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})+'</div><div class="fin-l">Sponsorship Received</div></div>' +
    '<div class="fin-stat pending"><div class="fin-n">$'+t.invoiced.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})+'</div><div class="fin-l">Invoiced / Pending</div></div>' +
    '<div class="fin-stat balance"><div class="fin-n" style="color:'+((t.remaining>=0)?'var(--sg2)':'var(--si)')+'">$'+Math.abs(t.remaining).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})+'</div><div class="fin-l">'+(t.remaining>=0?'Budget Remaining':'Over Budget')+'</div></div>' +
    '</div>' +

    // Budget bar
    '<div class="card" style="margin-bottom:.85rem">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
    '<div class="cl" style="margin-bottom:0">Budget Tracker</div>' +
    '<div style="display:flex;align-items:center;gap:.5rem">' +
    '<span style="font-family:var(--fm);font-size:.5rem;color:var(--muted)">Campaign budget:</span>' +
    '<input id="fin-budget-inp" value="'+t.budget+'" style="border:none;outline:none;font-family:var(--fd);font-size:.95rem;font-style:italic;color:var(--ink);background:transparent;width:80px;text-align:right" onblur="saveBudget(this.value)">' +
    '</div></div>' +
    '<div style="height:8px;background:var(--iv3);border-radius:4px;overflow:hidden">' +
    '<div style="height:100%;width:'+Math.min(100,Math.round(t.budget?t.spent/t.budget*100:0))+'%;background:'+(t.remaining>=0?'var(--si)':'#C0392B')+';border-radius:4px;transition:width .6s"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:.35rem">' +
    '<span style="font-family:var(--fm);font-size:.48rem;color:var(--muted)">$'+t.spent.toLocaleString()+' spent</span>' +
    '<span style="font-family:var(--fm);font-size:.48rem;color:var(--muted)">'+(t.budget?Math.min(100,Math.round(t.spent/t.budget*100)):0)+'% used</span>' +
    '</div>' +
    '</div>' +

    '<div class="g2">' +
    // Recent expenses
    '<div class="card">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.65rem">' +
    '<div class="cl" style="margin-bottom:0">Recent Expenses</div>' +
    '<button class="btn bg" style="font-size:.55rem;padding:.2rem .6rem;min-height:28px" onclick="showPanel(\'expenses\')">View all</button>' +
    '</div>' +
    (recentExp.length ? recentExp.map(function(e){
      return '<div class="exp-row">' +
        '<div class="exp-cat">'+escHtml(e.cat||'Misc')+'</div>' +
        '<div class="exp-desc">'+escHtml(e.desc||'')+'</div>' +
        '<div class="exp-date">'+escHtml(e.date||'')+'</div>' +
        '<div class="exp-amt">$'+parseFloat(e.amount||0).toFixed(2)+'</div>' +
        '</div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:1rem">No expenses logged yet</div>') +
    '</div>' +

    // Recent invoices
    '<div class="card">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.65rem">' +
    '<div class="cl" style="margin-bottom:0">Recent Invoices</div>' +
    '<button class="btn bg" style="font-size:.55rem;padding:.2rem .6rem;min-height:28px" onclick="showPanel(\'invoices\')">View all</button>' +
    '</div>' +
    (recentInv.length ? recentInv.map(function(inv){
      return '<div class="inv-row">' +
        '<div class="inv-num">'+escHtml(inv.number||'INV-000')+'</div>' +
        '<div class="inv-to">'+escHtml(inv.to||'')+'</div>' +
        '<div class="inv-date">'+escHtml(inv.date||'')+'</div>' +
        '<div class="inv-amt">$'+parseFloat(inv.amount||0).toFixed(2)+'</div>' +
        '<div class="inv-status inv-'+((inv.status||'Draft').toLowerCase())+'">'+escHtml(inv.status||'Draft')+'</div>' +
        '</div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:1rem">No invoices created yet</div>') +
    '</div>' +
    '</div>' + // g2

    '</div>' // pb
  );
}

function saveBudget(val){
  var d = getFinData();
  d.budget = parseFloat(val) || 0;
  saveFinData(d);
  showToast('Budget updated');
}

// ── EXPENSES ──────────────────────────────────────────────────
function bExpenses(){
  var d = getFinData();

  inject(
    '<div class="ph"><div><div class="ph-tag">Finance</div><div class="ph-title">Campaign <em>Expenses</em></div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="openAddExpense()">+ Add Expense</button></div></div>' +
    '<div class="pb">' +

    // Add expense form (hidden by default)
    '<div id="exp-form" style="display:none;margin-bottom:1rem">' +
    '<div class="card">' +
    '<div class="cl">New Expense</div>' +
    '<div class="g2">' +
    '<div class="fg"><label>Description</label><input class="fi" id="exp-desc" placeholder="What was this for?"></div>' +
    '<div class="fg"><label>Amount ($)</label><input class="fi" id="exp-amount" type="number" step="0.01" placeholder="0.00"></div>' +
    '</div>' +
    '<div class="g2">' +
    '<div class="fg"><label>Category</label><select class="fs" id="exp-cat">'+EXP_CATS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div>' +
    '<div class="fg"><label>Date</label><input class="fi" id="exp-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>' +
    '</div>' +
    '<div class="fg"><label>Notes (optional)</label><input class="fi" id="exp-notes" placeholder="Receipt details, vendor, etc."></div>' +
    '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
    '<button class="btn bc" onclick="saveExpense()">Save Expense</button>' +
    '<button class="btn bg" onclick="document.getElementById(\'exp-form\').style.display=\'none\'">Cancel</button>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Expenses by category summary
    '<div class="g4" style="margin-bottom:1rem">' +
    EXP_CATS.slice(0,4).map(function(cat){
      var total = d.expenses.filter(function(e){ return e.cat===cat; }).reduce(function(a,e){ return a+(parseFloat(e.amount)||0); },0);
      return '<div class="card" style="margin-bottom:0;padding:.75rem">' +
        '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem">'+cat+'</div>' +
        '<div style="font-family:var(--fd);font-size:1.3rem;font-style:italic;color:var(--si)">$'+total.toFixed(0)+'</div>' +
        '</div>';
    }).join('') +
    '</div>' +

    // All expenses table
    '<div class="card">' +
    '<div class="cl">All Expenses ('+d.expenses.length+')</div>' +
    (d.expenses.length ? d.expenses.slice().reverse().map(function(e,ri){
      var i = d.expenses.length - 1 - ri;
      return '<div class="exp-row" style="align-items:center">' +
        '<div class="exp-cat">'+escHtml(e.cat||'Misc')+'</div>' +
        '<div class="exp-desc" style="flex:1">' +
        '<div>'+escHtml(e.desc||'')+'</div>' +
        (e.notes?'<div style="font-size:.65rem;color:var(--faint)">'+escHtml(e.notes)+'</div>':'') +
        '</div>' +
        '<div class="exp-date">'+escHtml(e.date||'')+'</div>' +
        '<div class="exp-amt">$'+parseFloat(e.amount||0).toFixed(2)+'</div>' +
        '<button onclick="deleteExpense('+i+')" style="border:none;background:transparent;color:var(--faint);cursor:pointer;font-size:.9rem;padding:0 .3rem;flex-shrink:0">&times;</button>' +
        '</div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:2rem">No expenses yet. Add your first one above.</div>') +
    '</div>' +

    '</div>'
  );
}

function openAddExpense(){
  var f = document.getElementById('exp-form');
  if(f){ f.style.display = 'block'; setTimeout(function(){ var el=document.getElementById('exp-desc'); if(el) el.focus(); },60); }
}

function saveExpense(){
  var desc   = (document.getElementById('exp-desc').value||'').trim();
  var amount = document.getElementById('exp-amount').value;
  if(!desc||!amount){ showToast('Description and amount required'); return; }
  var d = getFinData();
  d.expenses.push({
    id:    Date.now(),
    desc:  desc,
    amount: parseFloat(amount),
    cat:   document.getElementById('exp-cat').value,
    date:  document.getElementById('exp-date').value,
    notes: document.getElementById('exp-notes').value
  });
  saveFinData(d);
  showToast('Expense saved \u2713');
  bExpenses();
}

function deleteExpense(i){
  if(!confirm('Delete this expense?')) return;
  var d = getFinData();
  d.expenses.splice(i,1);
  saveFinData(d);
  bExpenses();
}

// ── INVOICES ──────────────────────────────────────────────────
function bInvoices(){
  var d = getFinData();

  inject(
    '<div class="ph"><div><div class="ph-tag">Finance</div><div class="ph-title">Invoices &amp; <em>Billing</em></div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="openCreateInvoice()">+ Create Invoice</button></div></div>' +
    '<div class="pb">' +

    // Create invoice form
    '<div id="inv-form" style="display:none;margin-bottom:1rem">' +
    '<div class="card">' +
    '<div class="cl">New Invoice</div>' +
    '<div class="g2">' +
    '<div class="fg"><label>Bill To (Company / Sponsor)</label><input class="fi" id="inv-to" placeholder="Company name"></div>' +
    '<div class="fg"><label>Contact Name</label><input class="fi" id="inv-contact" placeholder="Contact person"></div>' +
    '</div>' +
    '<div class="g2">' +
    '<div class="fg"><label>Contact Email</label><input class="fi" id="inv-email" type="email" placeholder="billing@company.com"></div>' +
    '<div class="fg"><label>Amount ($)</label><input class="fi" id="inv-amount" type="number" step="0.01" placeholder="0.00"></div>' +
    '</div>' +
    '<div class="g2">' +
    '<div class="fg"><label>Invoice Date</label><input class="fi" id="inv-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>' +
    '<div class="fg"><label>Due Date</label><input class="fi" id="inv-due" type="date" value="'+new Date(Date.now()+30*86400000).toISOString().slice(0,10)+'"></div>' +
    '</div>' +
    '<div class="fg"><label>Description of services / sponsorship tier</label><textarea class="ft" id="inv-desc" style="min-height:70px" placeholder="Sponsorship &ndash; Gold Tier &middot; Logo placement on all campaign materials, social media acknowledgment, competition presence&hellip;"></textarea></div>' +
    '<div class="fg"><label>Notes / Payment Instructions</label><input class="fi" id="inv-notes" placeholder="Wire transfer, PayPal, check made payable to Amelia Arabe&hellip;"></div>' +
    '<div style="display:flex;gap:.5rem;margin-top:.5rem">' +
    '<button class="btn bc" onclick="createInvoice()">Create Invoice</button>' +
    '<button class="btn bg" onclick="document.getElementById(\'inv-form\').style.display=\'none\'">Cancel</button>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Invoice list
    '<div class="card">' +
    '<div class="cl">All Invoices ('+d.invoices.length+')</div>' +
    (d.invoices.length ? d.invoices.slice().reverse().map(function(inv, ri){
      var i = d.invoices.length - 1 - ri;
      var statusCls = 'inv-'+(inv.status||'draft').toLowerCase();
      return '<div class="inv-row" style="flex-wrap:wrap;align-items:center;gap:.5rem">' +
        '<div class="inv-num">'+escHtml(inv.number)+'</div>' +
        '<div class="inv-to" style="flex:1;min-width:120px">'+escHtml(inv.to)+'<br><span style="font-size:.65rem;color:var(--muted)">'+escHtml(inv.contact||'')+(inv.email?' · '+escHtml(inv.email):'')+'</span></div>' +
        '<div class="inv-date">Due '+escHtml(inv.dueDate||inv.date||'')+'</div>' +
        '<div class="inv-amt">$'+parseFloat(inv.amount||0).toFixed(2)+'</div>' +
        '<select class="inv-status '+statusCls+'" onchange="updateInvoiceStatus('+i+',this.value)" style="border:0.5px solid var(--iv3);border-radius:4px;cursor:pointer;padding:.2rem .4rem;font-family:var(--fm);font-size:.48rem">'+
        INV_STATUS.map(function(s){ return '<option'+(inv.status===s?' selected':'')+'>'+s+'</option>'; }).join('')+
        '</select>' +
        '<div style="display:flex;gap:.3rem">' +
        '<button onclick="printInvoice('+i+')" class="btn bg" style="font-size:.52rem;padding:.2rem .6rem;min-height:28px">PDF</button>' +
        '<button onclick="emailInvoice('+i+')" class="btn bg" style="font-size:.52rem;padding:.2rem .6rem;min-height:28px">Email</button>' +
        '<button onclick="deleteInvoice('+i+')" style="border:none;background:transparent;color:var(--faint);cursor:pointer;font-size:.9rem;padding:0 .3rem">&times;</button>' +
        '</div>' +
        '</div>';
    }).join('') : '<div style="font-size:.75rem;color:var(--faint);text-align:center;padding:2rem">No invoices yet. Create your first one above.</div>') +
    '</div>' +

    '</div>'
  );
}

function openCreateInvoice(){
  var f = document.getElementById('inv-form');
  if(f){ f.style.display='block'; setTimeout(function(){ var el=document.getElementById('inv-to'); if(el) el.focus(); },60); }
}

function createInvoice(){
  var to = (document.getElementById('inv-to').value||'').trim();
  var amount = document.getElementById('inv-amount').value;
  if(!to||!amount){ showToast('Company name and amount required'); return; }
  var d = getFinData();
  var num = 'INV-' + String(d.invoices.length+1).padStart(3,'0');
  d.invoices.push({
    id:      Date.now(),
    number:  num,
    to:      to,
    contact: document.getElementById('inv-contact').value,
    email:   document.getElementById('inv-email').value,
    amount:  parseFloat(amount),
    date:    document.getElementById('inv-date').value,
    dueDate: document.getElementById('inv-due').value,
    desc:    document.getElementById('inv-desc').value,
    notes:   document.getElementById('inv-notes').value,
    status:  'Draft'
  });
  saveFinData(d);
  showToast('Invoice created \u2713');
  bInvoices();
}

function updateInvoiceStatus(i, status){
  var d = getFinData();
  if(d.invoices[i]) d.invoices[i].status = status;
  saveFinData(d);
  showToast('Status updated');
  // Re-render status chip color without full reload
  bInvoices();
}

function deleteInvoice(i){
  if(!confirm('Delete this invoice?')) return;
  var d = getFinData();
  d.invoices.splice(i,1);
  saveFinData(d);
  bInvoices();
}

function emailInvoice(i){
  var d = getFinData();
  var inv = d.invoices[i];
  if(!inv) return;
  var subject = encodeURIComponent('Invoice '+inv.number+' — Amelia Arabe Campaign Sponsorship');
  var body = encodeURIComponent(
    'Dear '+(inv.contact||inv.to)+',\n\n'+
    'Please find attached Invoice '+inv.number+' for $'+parseFloat(inv.amount).toFixed(2)+'.\n\n'+
    'Description: '+(inv.desc||'Sponsorship')+'\n'+
    'Invoice Date: '+inv.date+'\n'+
    'Due Date: '+inv.dueDate+'\n\n'+
    (inv.notes?'Payment instructions: '+inv.notes+'\n\n':'')+
    'Thank you for your partnership and support of the Miss California USA 2026 campaign.\n\n'+
    'With gratitude,\nAmelia Arabe\n'+
    'Miss Temecula Valley USA 2026 · Competing for Miss California USA\n'+
    'missameliava@gmail.com'
  );
  window.location = 'mailto:'+(inv.email||'')+
    '?subject='+subject+'&body='+body;
  updateInvoiceStatus(i,'Sent');
}

function printInvoice(i){
  var d = getFinData();
  var inv = d.invoices[i];
  if(!inv) return;

  // Build a print-ready invoice page
  var win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${inv.number}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Figtree:wght@300;400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Figtree',sans-serif;color:#1C1714;background:white;padding:3rem;max-width:760px;margin:0 auto;font-size:13px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3rem;padding-bottom:1.5rem;border-bottom:0.5px solid #E5DDD2}
.logo-area h1{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;font-style:italic;color:#1C1714}
.logo-area p{font-size:11px;color:#7A6F68;margin-top:4px;letter-spacing:0.04em}
.inv-meta{text-align:right}
.inv-num{font-size:22px;font-family:'Cormorant Garamond',serif;font-style:italic;color:#8B4A2F;margin-bottom:4px}
.inv-dates{font-size:11px;color:#7A6F68;line-height:1.8}
.bill-section{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2.5rem}
.bill-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B0A89F;margin-bottom:8px}
.bill-name{font-size:15px;font-weight:600;color:#1C1714;margin-bottom:2px}
.bill-detail{font-size:12px;color:#7A6F68;line-height:1.7}
.line-items{width:100%;border-collapse:collapse;margin-bottom:2rem}
.line-items th{text-align:left;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#B0A89F;padding:8px 12px;border-bottom:0.5px solid #E5DDD2}
.line-items td{padding:14px 12px;border-bottom:0.5px solid #F0EBE3;font-size:13px;color:#3D3028;vertical-align:top}
.line-items .amt{text-align:right;font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;color:#1C1714}
.total-row{display:flex;justify-content:flex-end;margin-bottom:2.5rem}
.total-box{background:#FAF7F2;border:0.5px solid #E5DDD2;border-radius:8px;padding:1.25rem 1.75rem;text-align:right;min-width:220px}
.total-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6F68;margin-bottom:6px}
.total-amount{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;font-style:italic;color:#8B4A2F}
.notes{padding:1.25rem;background:#F5EDE8;border-radius:6px;font-size:12px;color:#3D3028;line-height:1.7;margin-bottom:2rem}
.footer{text-align:center;font-size:10px;color:#B0A89F;letter-spacing:1px;padding-top:1.5rem;border-top:0.5px solid #E5DDD2}
@media print{body{padding:1.5rem}button{display:none}}
</style></head><body>
<div style="text-align:right;margin-bottom:1.5rem"><button onclick="window.print()" style="padding:8px 18px;background:#1C1714;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px">Print / Save PDF</button></div>
<div class="header">
  <div class="logo-area">
    <h1>Amelia Arabe</h1>
    <p>Miss Temecula Valley USA 2026 · Competing for Miss California USA<br>missameliava@gmail.com · Riverside, CA</p>
  </div>
  <div class="inv-meta">
    <div class="inv-num">${inv.number}</div>
    <div class="inv-dates">
      Invoice Date: ${inv.date}<br>
      Due Date: <strong>${inv.dueDate}</strong><br>
      Status: <strong style="color:${inv.status==='Paid'?'#4A5E48':inv.status==='Overdue'?'#8B4A2F':'#A07830'}">${inv.status}</strong>
    </div>
  </div>
</div>
<div class="bill-section">
  <div>
    <div class="bill-label">From</div>
    <div class="bill-name">Amelia Arabe</div>
    <div class="bill-detail">Miss Temecula Valley USA 2026<br>Riverside, California<br>missameliava@gmail.com</div>
  </div>
  <div>
    <div class="bill-label">Bill To</div>
    <div class="bill-name">${inv.to}</div>
    <div class="bill-detail">${inv.contact||''}${inv.email?'<br>'+inv.email:''}</div>
  </div>
</div>
<table class="line-items">
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>${inv.desc||'Campaign Sponsorship'}</td><td class="amt">$${parseFloat(inv.amount).toFixed(2)}</td></tr>
  </tbody>
</table>
<div class="total-row">
  <div class="total-box">
    <div class="total-label">Total Due</div>
    <div class="total-amount">$${parseFloat(inv.amount).toFixed(2)}</div>
  </div>
</div>
${inv.notes?'<div class="notes"><strong style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7A6F68;display:block;margin-bottom:6px">Payment Instructions</strong>'+inv.notes+'</div>':''}
<div class="footer">
  Library of Morenita · Amelia Arabe Campaign 2026 · Thank you for your partnership
</div>
</body></html>`);
  win.document.close();
}

// ── SEED DEFAULT FINANCE DATA ─────────────────────────────────
(function seedFinance(){
  var d = getFinData();
  if(!d.expenses.length && !d.invoices.length){
    // Seed with some example data so Kathy sees a real dashboard
    d.budget = 8000;
    d.expenses = [
      {id:1,desc:'Competition entry fee',cat:'Competition Fees',amount:395,date:'2026-03-15',notes:'Full payment secures embroidered sash'},
      {id:2,desc:'Gown consultation — Laneea',cat:'Wardrobe',amount:150,date:'2026-03-20',notes:'Initial styling session'},
      {id:3,desc:'Headshot session — Dorian Qi',cat:'Photography',amount:250,date:'2026-03-22',notes:'Official campaign headshots'},
      {id:4,desc:'Training sessions — Donovan',cat:'Training',amount:300,date:'2026-03-25',notes:'March training package'},
    ];
    saveFinData(d);
  }
})();


// ═══════════════════════════════════════════════════════════════
// PROFILE SYSTEM
// Each team member has a profile stored in localStorage under
// 'chq-profiles'. The public.html page reads this same key to
// populate the live Team section.
// ═══════════════════════════════════════════════════════════════

var PROFILE_KEY = 'chq-profiles';

var CATEGORY_LABELS = {
  'amelia':    'Miss Temecula Valley USA 2026',
  'laneea':    'Styling & Fashion',
  'trainer':   'Fitness & Training',
  'finance':   'Finance & Operations',
  'hmu':       'Hair & Makeup',
  'sponsor':   'Sponsor',
  'contributor':'Photography & Video',
  'Styling & Fashion':   'Styling & Fashion',
  'Fitness & Training':  'Fitness & Training',
  'Photography & Video': 'Photography & Video',
  'Hair & Makeup':       'Hair & Makeup',
  'Finance & Operations':'Finance & Operations',
  'Press & Media':       'Press & Media',
  'Sponsor':             'Sponsor',
  'Volunteer / General': 'Volunteer / General'
};

// Get the profile key for the current user
function getMyProfileKey(){
  var effectiveRole = _viewAsRole || S.role;
  if(S.portalProfile && !_viewAsRole) return 'portal:'+S.role+':'+S.portalProfile.id;
  return effectiveRole || '';
}

// Load all profiles
function getAllProfiles(){
  return lsGet(PROFILE_KEY, {});
}

// Load current user's profile
function getMyProfile(){
  var profiles = getAllProfiles();
  var key = getMyProfileKey();
  return profiles[key] || {};
}

// Save current user's profile patch
function saveMyProfile(patch){
  var profiles = getAllProfiles();
  var key = getMyProfileKey();
  profiles[key] = Object.assign({}, profiles[key]||{}, patch, {
    updatedAt: new Date().toISOString(),
    role: S.role,
    profileKey: key
  });
  lsSave(PROFILE_KEY, profiles);
  // Also write to the public-readable key
  localStorage.setItem('chq-team-public', JSON.stringify(buildPublicTeamData()));
}

// Build the public team data object that public.html reads
function buildPublicTeamData(){
  var profiles = getAllProfiles();
  var team = [];
  Object.keys(profiles).forEach(function(key){
    var p = profiles[key];
    if(p && p.displayOnPublic !== false && p.name){
      team.push({
        key: key,
        name: p.name,
        role: S.role === key ? ROLES[S.role] && ROLES[S.role].name : (p.roleLabel || p.category || ''),
        roleLabel: p.roleLabel || p.category || '',
        bio: p.bio || '',
        photo: p.photo || '',
        category: p.category || p.role || '',
        sortOrder: p.sortOrder || 99,
        displayOnPublic: p.displayOnPublic !== false
      });
    }
  });
  team.sort(function(a,b){ return (a.sortOrder||99)-(b.sortOrder||99); });
  return team;
}

// Render the profile panel
function bProfile(){
  var profile = getMyProfile();
  var effectiveRole = _viewAsRole || S.role;
  var r = ROLES[effectiveRole] || {};
  var displayName = (S.portalProfile && !_viewAsRole) ? S.portalProfile.name : r.name;
  var categoryLabel = CATEGORY_LABELS[effectiveRole] || effectiveRole || '';
  if(S.portalProfile && !_viewAsRole) categoryLabel = S.portalProfile.specialty || categoryLabel;

  // Seed defaults if first time
  if(!profile.name) profile.name = displayName;
  if(!profile.roleLabel) profile.roleLabel = categoryLabel;
  if(profile.displayOnPublic === undefined) profile.displayOnPublic = true;
  if(!profile.sortOrder){
    var orderMap = {amelia:1, laneea:2, trainer:3};
    profile.sortOrder = orderMap[S.role] || 10;
  }

  inject(
    '<div style="padding:1.5rem 1.75rem;max-width:720px">' +

    // Header
    '<div style="margin-bottom:1.5rem">' +
      '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;text-transform:uppercase;color:var(--ch2);margin-bottom:.3rem">My Profile</div>' +
      '<div style="font-family:var(--fd);font-size:1.6rem;font-style:italic;color:var(--ch);margin-bottom:.3rem">'+profile.name+'</div>' +
      '<div style="font-size:.78rem;color:var(--st)">'+categoryLabel+' &middot; Crown HQ Team</div>' +
    '</div>' +

    // Photo upload
    '<div style="display:flex;align-items:flex-start;gap:1.5rem;margin-bottom:1.5rem">' +
      '<div style="flex-shrink:0">' +
        '<div id="prof-photo-preview" style="' +
          'width:90px;height:90px;border-radius:50%;' +
          'background:'+(profile.photo?'url('+profile.photo+') center/cover':'var(--du)')+';' +
          'border:2px solid var(--ch4);display:flex;align-items:center;justify-content:center;' +
          'font-family:var(--fd);font-size:2rem;font-style:italic;color:var(--ch);' +
          'overflow:hidden;' +
        '">'+(profile.photo?'':profile.name.charAt(0).toUpperCase())+'</div>' +
        '<label style="display:block;text-align:center;margin-top:.5rem;font-size:.65rem;color:var(--wg);cursor:pointer;letter-spacing:1px">'+
          'CHANGE PHOTO' +
          '<input type="file" accept="image/*" style="display:none" onchange="uploadProfilePhoto(event)">' +
        '</label>' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:.76rem;color:var(--st);line-height:1.7;margin-bottom:.8rem">' +
          'Your profile photo and bio appear on the <strong style="color:var(--ch)">public campaign site</strong> under the Team section. ' +
          'Keep your bio to 1–2 sentences &mdash; punchy and real.' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:.5rem;font-size:.74rem;color:var(--st);cursor:pointer">' +
          '<input type="checkbox" id="prof-public-toggle" '+(profile.displayOnPublic!==false?'checked':'')+' onchange="toggleProfilePublic()" style="width:14px;height:14px">' +
          'Show my profile on the public campaign site' +
        '</label>' +
      '</div>' +
    '</div>' +

    // Form fields
    '<div class="card">' +
      '<div class="cl">Profile Details</div>' +

      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Display Name</div>' +
        '<input id="prof-name" class="fi" value="'+escHtml(profile.name||'')+'" placeholder="Your display name" ' +
          'style="width:100%">' +
      '</div>' +

      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Role / Title</div>' +
        '<input id="prof-role" class="fi" value="'+escHtml(profile.roleLabel||categoryLabel)+'" placeholder="e.g. Campaign Manager &middot; Stylist" ' +
          'style="width:100%">' +
        '<div style="font-size:.64rem;color:var(--wg);margin-top:.2rem">This appears as your role under your name on the public site.</div>' +
      '</div>' +

      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Bio <span style="opacity:.5">(shown publicly)</span></div>' +
        '<textarea id="prof-bio" class="ft" placeholder="1-2 sentences about who you are and what you bring to this campaign..." ' +
          'style="width:100%;min-height:80px;resize:vertical">'+escHtml(profile.bio||'')+'</textarea>' +
      '</div>' +

      '<div style="margin-bottom:1rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Sort Order <span style="opacity:.5">(1 = first on team page)</span></div>' +
        '<input id="prof-order" class="fi" type="number" min="1" max="20" value="'+(profile.sortOrder||10)+'" style="width:80px">' +
      '</div>' +

      '<button class="btn bp" onclick="saveProfileForm()" style="width:100%;padding:.7rem">Save Profile &rarr;</button>' +
    '</div>' +

    // Change password
    ((!_viewAsRole && (PASSWORDS[S.role] !== undefined || S.portalProfile)) ?
    '<div class="card" style="margin-top:1.25rem">' +
      '<div class="cl">Change Password</div>' +
      '<div style="margin-bottom:.75rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Current Password</div>' +
        '<input id="pw-current" class="fi" type="password" style="width:100%" placeholder="Enter current password">' +
      '</div>' +
      '<div style="margin-bottom:.75rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">New Password</div>' +
        '<input id="pw-new" class="fi" type="password" style="width:100%" placeholder="New password">' +
      '</div>' +
      '<div style="margin-bottom:1rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Confirm New Password</div>' +
        '<input id="pw-confirm" class="fi" type="password" style="width:100%" placeholder="Confirm new password">' +
      '</div>' +
      '<button class="btn bg" onclick="changePassword()" style="width:100%;padding:.65rem">Update Password</button>' +
    '</div>' : '') +

    // Preview card
    '<div style="margin-top:1.25rem">' +
      '<div style="font-size:.68rem;letter-spacing:2px;text-transform:uppercase;color:var(--wg);margin-bottom:.6rem">Public preview</div>' +
      '<div id="prof-preview-card" style="' +
        'background:var(--tz);border-radius:11px;padding:1.25rem;' +
        'display:flex;align-items:flex-start;gap:1rem;' +
      '">' +
        renderProfilePreviewCard(profile) +
      '</div>' +
    '</div>' +

    '</div>'
  );
}

function renderProfilePreviewCard(profile){
  var initials = (profile.name||'?').split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase();
  return (
    '<div style="' +
      'width:56px;height:56px;border-radius:50%;flex-shrink:0;' +
      'background:'+(profile.photo?'url('+profile.photo+') center/cover':'rgba(240,216,152,.15)')+';' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:var(--fd);font-size:1.2rem;font-style:italic;color:var(--ch);' +
      'border:1.5px solid rgba(240,216,152,.2);overflow:hidden;' +
    '">'+(profile.photo?'':initials)+'</div>' +
    '<div>' +
      '<div style="font-family:var(--fd);font-size:1rem;font-weight:500;color:var(--wh);margin-bottom:.15rem">'+(profile.name||'Your Name')+'</div>' +
      '<div style="font-size:.72rem;color:var(--ch);letter-spacing:.5px;margin-bottom:.4rem">'+(profile.roleLabel||'Your Role')+'</div>' +
      '<div style="font-size:.74rem;color:rgba(254,252,247,.6);line-height:1.6">'+(profile.bio||'Your bio will appear here.')+'</div>' +
    '</div>'
  );
}

function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function saveProfileForm(){
  var patch = {
    name:      (document.getElementById('prof-name').value||'').trim(),
    roleLabel: (document.getElementById('prof-role').value||'').trim(),
    bio:       (document.getElementById('prof-bio').value||'').trim(),
    sortOrder: parseInt(document.getElementById('prof-order').value)||10,
    category:  CATEGORY_LABELS[_viewAsRole || S.role] || (_viewAsRole || S.role)
  };
  if(!patch.name){ showToast('Name required'); return; }
  saveMyProfile(patch);
  showToast('Profile saved \u2713');
  // Refresh preview card
  var profile = getMyProfile();
  var card = document.getElementById('prof-preview-card');
  if(card) card.innerHTML = renderProfilePreviewCard(profile);
  // Update topbar name
  var un = document.getElementById('tb-un');
  if(un) un.textContent = patch.name;
}

function changePassword(){
  var current=(g('pw-current').value||'').trim();
  var next=(g('pw-new').value||'').trim();
  var confirm=(g('pw-confirm').value||'').trim();
  if(!current||!next||!confirm){showToast('Fill in all three fields');return;}
  if(next!==confirm){showToast('New passwords don\'t match');return;}
  if(next.length<4){showToast('Password must be at least 4 characters');return;}
  // Verify current password
  var ok=false;
  if(S.portalProfile){
    ok=(String(S.portalProfile.password||'')=== current);
    if(ok){
      S.portalProfile.password=next;
      var profiles=getPortalProfiles();
      var list=profiles[S.role]||[];
      var item=list.find(function(x){return x.id===S.portalProfile.id;});
      if(item){item.password=next;savePortalProfiles(profiles);}
    }
  } else {
    ok=(PASSWORDS[S.role]===current);
    if(ok){
      PASSWORDS[S.role]=next;
      var saved=lsGet('chq-pw',{});
      saved[S.role]=next;
      lsSave('chq-pw',saved);
    }
  }
  if(!ok){showToast('Current password is incorrect');return;}
  g('pw-current').value='';g('pw-new').value='';g('pw-confirm').value='';
  showToast('Password updated \u2713');
}

function toggleProfilePublic(){
  var checked = document.getElementById('prof-public-toggle').checked;
  saveMyProfile({ displayOnPublic: checked });
  showToast(checked ? 'Showing on public site' : 'Hidden from public site');
}

function uploadProfilePhoto(e){
  var file = e.target.files && e.target.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ showToast('Photo must be under 2MB'); return; }
  var reader = new FileReader();
  reader.onload = function(ev){
    var dataUrl = ev.target.result;
    saveMyProfile({ photo: dataUrl });
    // Update preview circle
    var preview = document.getElementById('prof-photo-preview');
    if(preview){
      preview.style.background = 'url('+dataUrl+') center/cover';
      preview.textContent = '';
    }
    // Refresh preview card
    var card = document.getElementById('prof-preview-card');
    if(card) card.innerHTML = renderProfilePreviewCard(getMyProfile());
    showToast('Photo saved \u2713');
  };
  reader.readAsDataURL(file);
}

// ── TEAM ADMIN PANEL (Amelia only) ────────────────────────────
// Shows all profiles, lets Amelia view/edit any of them

var _adminEditingKey = null;

// ── viewAs state ──────────────────────────────────────────────
var _viewAsRole = null;
var _viewAsName = null;
var _ameliaNav  = null; // saved so we can restore

function enterViewAs(role, displayName){
  if(S.role !== 'amelia') return;
  var r = ROLES[role];
  if(!r) return;
  // Save Amelia's state
  _viewAsRole = role;
  _viewAsName = displayName || r.name;
  _ameliaNav  = ROLES.amelia.nav;
  // Swap nav to target role
  buildSB(r.nav);
  // Show viewAs banner in topbar
  var tb = g('tb-un');
  if(tb) tb.textContent = 'Viewing: ' + _viewAsName;
  var av = g('tb-av');
  if(av){ av.style.background = r.color; av.textContent = String(_viewAsName).split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase(); }
  // Add exit button to topbar if not already there
  var existing = g('view-as-exit-btn');
  if(!existing){
    var btn = document.createElement('button');
    btn.id = 'view-as-exit-btn';
    btn.className = 'tb-btn';
    btn.textContent = '← Exit View';
    btn.style.background = 'rgba(201,168,76,.15)';
    btn.style.color = 'rgba(201,168,76,.85)';
    btn.style.borderColor = 'rgba(201,168,76,.3)';
    btn.onclick = exitViewAs;
    var tbr = g('tb-r');
    if(tbr) tbr.insertBefore(btn, tbr.firstChild);
  }
  showPanel(r.nav[0].id);
}

function exitViewAs(){
  if(!_viewAsRole) return;
  _viewAsRole = null; _viewAsName = null;
  // Restore Amelia nav
  buildSB(ROLES.amelia.nav);
  var tb = g('tb-un'); if(tb) tb.textContent = ROLES.amelia.name;
  var av = g('tb-av'); if(av){ av.style.background = ROLES.amelia.color; av.textContent = 'AA'; }
  var exitBtn = g('view-as-exit-btn');
  if(exitBtn) exitBtn.remove();
  showPanel('team-admin');
}

function bTeamAdmin(){
  if(S.role !== 'amelia'){ inject('<div style="padding:2rem;color:var(--wg)">Access restricted.</div>'); return; }
  _adminEditingKey = null;

  // Role → display info map
  var roleInfo = {
    amelia:  { label:'Candidate',          color:'var(--si)'  },
    laneea:  { label:'Campaign Mgr · Stylist', color:'var(--lv)'  },
    trainer: { label:'Fitness Coach',      color:'var(--sg2)' },
    finance: { label:'Finance & Operations',color:'var(--go)'  },
    hmu:     { label:'Hair & Makeup',      color:'var(--bl)'  },
    sponsor: { label:'Sponsor Portal',     color:'var(--si)'  },
    contributor:{ label:'Contributor',     color:'var(--go)'  },
  };

  var profiles = getAllProfiles();
  var keys = Object.keys(profiles);

  var rows = keys.map(function(key){
    var p = profiles[key];
    if(!p || !p.name) return '';
    var initials = String(p.name||'?').split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase();
    var ri = roleInfo[key] || roleInfo[p.role] || { label: p.roleLabel||p.category||'', color:'var(--si)' };
    var photoHtml = p.photo
      ? '<div style="width:44px;height:44px;border-radius:50%;background:url('+p.photo+') center/cover;border:2px solid var(--iv3);flex-shrink:0"></div>'
      : '<div style="width:44px;height:44px;border-radius:50%;background:'+ri.color+';border:2px solid var(--iv3);display:flex;align-items:center;justify-content:center;font-family:var(--fm);font-size:.6rem;font-weight:700;color:white;flex-shrink:0">'+initials+'</div>';
    var pubBadge = p.displayOnPublic!==false
      ? '<span style="font-family:var(--fm);font-size:.46rem;padding:.18rem .45rem;background:var(--sgp);color:var(--sg);border-radius:3px;letter-spacing:1px">Public</span>'
      : '<span style="font-family:var(--fm);font-size:.46rem;padding:.18rem .45rem;background:var(--iv2);color:var(--muted);border-radius:3px;letter-spacing:1px">Hidden</span>';
    // Can we enter this role's dashboard?
    var canEnter = ROLES[key] && key !== 'amelia';
    return '<div style="display:flex;align-items:center;gap:.85rem;padding:.85rem 1rem;border-bottom:0.5px solid var(--iv3);background:var(--wh)">' +
      photoHtml +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:.85rem;font-weight:600;color:var(--ink);margin-bottom:.1rem">'+escHtml(p.name)+'</div>' +
        '<div style="font-size:.7rem;color:var(--muted)">'+escHtml(ri.label)+'</div>' +
      '</div>' +
      pubBadge +
      '<div style="display:flex;gap:.4rem;margin-left:.5rem">' +
        (canEnter ? '<button class="btn bg" style="font-size:.52rem;padding:.22rem .65rem;min-height:28px" onclick="enterViewAs(\''+key+'\',\''+escHtml(p.name)+'\')">Enter Dashboard</button>' : '') +
        '<button class="btn bg" style="font-size:.52rem;padding:.22rem .65rem;min-height:28px" onclick="openTeamAdminEdit(\''+key+'\')">Edit Profile</button>' +
      '</div>' +
    '</div>';
  }).filter(Boolean).join('');

  inject(
    '<div class="ph"><div><div class="ph-tag">Team Admin</div><div class="ph-title">Team <em>Roster</em></div></div></div>' +
    '<div class="pb">' +
    '<div style="font-size:.78rem;color:var(--muted);margin-bottom:1rem;line-height:1.6">' +
      'Enter any team member\'s dashboard to see exactly what they see. Edit their profile to update what appears on the public campaign site.' +
    '</div>' +
    '<div class="card" style="padding:0;overflow:hidden;margin-bottom:1rem">' +
      (rows || '<div style="padding:1.5rem;font-size:.8rem;color:var(--muted)">No profiles yet. Team members need to log in first.</div>') +
    '</div>' +
    '<div style="padding:.85rem 1rem;background:var(--sip);border-radius:8px;border:0.5px solid var(--sil)">' +
      '<div style="font-size:.72rem;color:var(--si);line-height:1.7">' +
        '<strong>Public site syncs live.</strong> Team members marked Public appear on the campaign site Team section. Their photo, name, role, and bio update immediately when saved.' +
      '</div>' +
    '</div>' +
    '</div>'
  );
}

function openTeamAdminEdit(key){
  _adminEditingKey = key;
  bTeamAdminEdit(key);
}

function bTeamAdminEdit(key){
  var profiles = getAllProfiles();
  var p = profiles[key] || {};
  var initials = String(p.name||'?').split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase();

  inject(
    '<div style="padding:1.5rem 1.75rem;max-width:680px">' +

    // Back button
    '<button class="btn bg" onclick="_adminEditingKey=null;bTeamAdmin()" style="margin-bottom:1.2rem">← All Profiles</button>' +

    // Header
    '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">' +
      (p.photo
        ? '<div style="width:64px;height:64px;border-radius:50%;background:url('+p.photo+') center/cover;border:2px solid var(--ch4);flex-shrink:0"></div>'
        : '<div style="width:64px;height:64px;border-radius:50%;background:rgba(240,216,152,.12);border:2px solid var(--ch4);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-style:italic;color:var(--ch);font-size:1.5rem;flex-shrink:0">'+initials+'</div>'
      ) +
      '<div>' +
        '<div style="font-family:var(--fd);font-size:1.3rem;font-style:italic;color:var(--ch)">'+escHtml(p.name||key)+'</div>' +
        '<div style="font-size:.74rem;color:var(--st)">'+escHtml(p.roleLabel||p.category||'')+'</div>' +
      '</div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="cl">Edit Profile</div>' +

      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Display Name</div>' +
        '<input id="adm-name" class="fi" value="'+escHtml(p.name||'')+'" style="width:100%">' +
      '</div>' +
      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Role / Title</div>' +
        '<input id="adm-role" class="fi" value="'+escHtml(p.roleLabel||'')+'" style="width:100%">' +
      '</div>' +
      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Bio</div>' +
        '<textarea id="adm-bio" class="ft" style="width:100%;min-height:80px;resize:vertical">'+escHtml(p.bio||'')+'</textarea>' +
      '</div>' +
      '<div style="margin-bottom:.85rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.3rem">Sort Order</div>' +
        '<input id="adm-order" class="fi" type="number" min="1" max="20" value="'+(p.sortOrder||10)+'" style="width:80px">' +
      '</div>' +
      '<div style="margin-bottom:1rem">' +
        '<label style="display:flex;align-items:center;gap:.5rem;font-size:.74rem;color:var(--st);cursor:pointer">' +
          '<input type="checkbox" id="adm-public" '+(p.displayOnPublic!==false?'checked':'')+' style="width:14px;height:14px">' +
          'Show on public campaign site' +
        '</label>' +
      '</div>' +

      // Photo upload
      '<div style="margin-bottom:1rem">' +
        '<div style="font-size:.68rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--wg);margin-bottom:.4rem">Profile Photo</div>' +
        '<label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.72rem;color:var(--wg);border:1px solid rgba(240,216,152,.2);padding:.35rem .8rem;border-radius:5px">' +
          '📷 Upload Photo' +
          '<input type="file" accept="image/*" style="display:none" onchange="adminUploadPhoto(event,\''+key+'\')">' +
        '</label>' +
        (p.photo ? ' <span style="font-size:.68rem;color:var(--ch)">✓ Photo set</span>' : '') +
      '</div>' +

      '<button class="btn bp" onclick="saveAdminProfile(\''+key+'\')" style="width:100%;padding:.7rem">Save Changes →</button>' +
    '</div>' +

    '</div>'
  );
}

function saveAdminProfile(key){
  var profiles = getAllProfiles();
  if(!profiles[key]) profiles[key] = {};
  profiles[key].name         = (document.getElementById('adm-name').value||'').trim();
  profiles[key].roleLabel    = (document.getElementById('adm-role').value||'').trim();
  profiles[key].bio          = (document.getElementById('adm-bio').value||'').trim();
  profiles[key].sortOrder    = parseInt(document.getElementById('adm-order').value)||10;
  profiles[key].displayOnPublic = document.getElementById('adm-public').checked;
  profiles[key].updatedAt    = new Date().toISOString();
  lsSave(PROFILE_KEY, profiles);
  localStorage.setItem('chq-team-public', JSON.stringify(buildPublicTeamData()));
  showToast('Profile saved \u2713');
  bTeamAdminEdit(key);
}

function adminUploadPhoto(e, key){
  var file = e.target.files && e.target.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ showToast('Photo must be under 2MB'); return; }
  var reader = new FileReader();
  reader.onload = function(ev){
    var profiles = getAllProfiles();
    if(!profiles[key]) profiles[key] = {};
    profiles[key].photo = ev.target.result;
    profiles[key].updatedAt = new Date().toISOString();
    lsSave(PROFILE_KEY, profiles);
    localStorage.setItem('chq-team-public', JSON.stringify(buildPublicTeamData()));
    showToast('Photo saved \u2713');
    bTeamAdminEdit(key);
  };
  reader.readAsDataURL(file);
}




// ═══ ORIGINAL CODEX PANEL FUNCTIONS ═════════════════════════

// (from original app.js)
function bMessages(){
  var msgs=Array.isArray(S.messages)?S.messages:[];
  var isPortal=!!S.portalProfile;
  var channel=isPortal?getPortalWorkspaceKey():'';
  if(isPortal){
    msgs=msgs.filter(function(m){
      return m.from===channel||m.to===channel||m.from===S.role||m.to===S.role||m.to==='team'||m.from==='team';
    });
  }
  var avC={amelia:'var(--ch)',laneea:'var(--lv)',hmu:'var(--bl)',trainer:'var(--sg)',team:'var(--tz4)'};
  if(isPortal)avC[channel]=ROLES[S.role].color;
  inject(
    '<div style="display:flex;flex-direction:column;height:100%">' +
    '<div class="ph"><div><div class="ph-tag">'+(isPortal?'Direct':'Team')+'</div><div class="ph-title"><em>'+(isPortal?'Workspace Chat':'Messages')+'</em></div></div>' +
    (isPortal?'':'<div class="ph-acts"><button class="btn bp" onclick="openM(\'m-msg\')">+ New</button></div>') +
    '</div>' +
    '<div class="pb" style="flex:1;overflow-y:auto">' +
    '<div class="msg-l">' +
    msgs.map(function(m){
      var fromKey=m.from===channel?(S.portalProfile.name||ROLES[S.role].name):m.from;
      var fromAbbr=m.from===channel?String(S.portalProfile.name||ROLES[S.role].name).split(' ').map(function(x){return x.charAt(0);}).join('').slice(0,2).toUpperCase():m.from.slice(0,2).toUpperCase();
      return '<div class="msg '+((m.from===S.role||m.from===channel)?'me':'')+'">' +
        '<div class="msg-av" style="background:'+(avC[m.from]||'var(--du)')+'">'+fromAbbr+'</div>' +
        '<div><div class="msg-bub">'+m.text+'</div><div class="msg-meta">'+fromKey+' · '+m.time+'</div></div>' +
        '</div>';
    }).join('') +
    '</div></div>' +
    '<div class="msg-compose">' +
    '<input class="msg-input" id="quick-msg" placeholder="'+(isPortal?'Message Amelia...':'Message the team...')+'" onkeydown="if(event.key===\'Enter\')quickSend()">' +
    '<button class="msg-send" onclick="quickSend()">Send</button>' +
    '</div></div>'
  );
}

// (from original app.js)
function bFiles(){
  var isPortal=!!S.portalProfile;
  var workspaceFolder=isPortal?getPortalWorkspaceLabel():'';
  window._fileFolder=isPortal?workspaceFolder:(window._fileFolder||'All');
  inject(
    '<div class="ph"><div><div class="ph-tag">'+(isPortal?'Workspace':'Shared')+'</div><div class="ph-title"><em>'+(isPortal?'File Sharing':'Files')+'</em></div></div>' +
    '<div class="ph-acts"><label class="btn bp" style="cursor:pointer">+ Upload<input type="file" multiple style="display:none" onchange="handleUpload(event)"></label></div></div>' +
    '<div class="pb">' +
    (isPortal?
      '<div class="card" style="margin-bottom:1rem"><div class="cl">Shared Folder</div><div style="font-family:var(--fd);font-size:1.05rem;font-style:italic;color:var(--tz);margin-bottom:.25rem">'+workspaceFolder+'</div><div style="font-size:.76rem;color:var(--wg);line-height:1.7">Upload photos, PDFs, invoices, sponsor assets, call sheets, or selects for this workspace only.</div></div>'
      :renderContactsCard()) +
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
    (isPortal?'':'<div style="display:flex;gap:.35rem;margin-bottom:.85rem;flex-wrap:wrap" id="folder-tabs">' +
    ['All','Competition','Sponsors','Press','Looks','Personal'].map(function(f){
      return '<button class="cal-tab '+(( window._fileFolder||'All')===f?'on':'')+'" onclick="window._fileFolder=\''+f+'\';renderFileList()">'+f+'</button>';
    }).join('') +
    '</div>') +
    '<div id="uploaded-files"></div>' +
    '</div>'
  );
  renderFileList();
}

// (from original app.js)
function bBoard(){
  var fallbackBoard={
    columns:[
      {id:'sponsors',title:'Sponsor Outreach',color:'var(--ch2)',cards:[]},
      {id:'competition',title:'Competition Prep',color:'var(--tz3)',cards:[]},
      {id:'general',title:'General / Notes',color:'var(--bl2)',cards:[]},
    ]
  };
  var rawBoard=lsGet('chq-board',fallbackBoard)||fallbackBoard;
  var boardData={
    columns:Array.isArray(rawBoard.columns)&&rawBoard.columns.length?rawBoard.columns.map(function(col,i){
      var fb=fallbackBoard.columns[i]||{id:'col_'+i,title:'Column',color:'var(--tz4)',cards:[]};
      return {
        id:(col&&col.id)||fb.id,
        title:(col&&col.title)||fb.title,
        color:(col&&col.color)||fb.color,
        cards:Array.isArray(col&&col.cards)?col.cards:[]
      };
    }):fallbackBoard.columns.slice()
  };
  lsWriteLocal('chq-board',boardData);

  inject(
    '<div class="ph"><div><div class="ph-tag">Team Workspace</div><div class="ph-title"><em>Discussion</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="addBoardCard()">+ Add Card</button><button class="btn bc" onclick="addBoardColumn()">+ Column</button></div></div>' +
    '<div class="board-strip">' +
    boardData.columns.map(function(col){
      return '<div class="board-col" id="bcol-'+col.id+'" data-col="'+col.id+'" style="min-width:240px;max-width:240px;flex-shrink:0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;text-transform:uppercase;color:'+col.color+';font-weight:700">'+col.title+
        ' <span style="background:'+col.color+'22;color:'+col.color+';border-radius:3px;padding:.05rem .35rem;font-size:.48rem">'+col.cards.length+'</span></div>' +
        '<button onclick="addCardToCol(\''+col.id+'\')" style="background:none;border:none;color:var(--wg);cursor:pointer;font-size:1.1rem;line-height:1;padding:0 .2rem">+</button>' +
        '</div>' +
        '<div class="board-cards" id="bcards-'+col.id+'" style="display:flex;flex-direction:column;gap:.45rem;min-height:60px">' +
        col.cards.map(function(card){return renderBoardCard(card,col.id);}).join('') +
        '</div>' +
        '</div>';
    }).join('') +
    '</div>'
  );
}

// (from original app.js)
function bSocial(){
  var defaults={
    strategy:{ig:'',yt:'',substack:'',tiktok:''},
    pillars:['Clean Energy & Policy','Fashion Accountability','Personal Story','Behind the Scenes','Library of Morenita'],
    cadence:{ig:'3x per week',yt:'1x per week',substack:'1x per week',tiktok:'Paused — relaunching for competition'},
    metrics:{ig_followers:'1.4K',ig_goal:'100K',yt_followers:'0',yt_goal:'5K',substack_subs:'0',substack_goal:'1K'},
    calendar:[],
    videos:[
      {id:1,title:'Why I Entered a Pageant',platform:'YouTube',status:'planned',notes:'Walk and talk, ocean background. No script, just talking points. Film this week.'},
      {id:2,title:'SB 707 Explained',platform:'YouTube',status:'planned',notes:'Desk setup. Policy explainer. Text overlays for the numbers.'},
      {id:3,title:'What Keel Labs Is Doing With Algae',platform:'YouTube',status:'planned',notes:'Nature location. Engineer meets innovator energy.'},
      {id:4,title:'The Supply Chain of What You Are Wearing',platform:'YouTube',status:'planned',notes:'B-roll heavy. Investigative tone.'},
      {id:5,title:'Cello, Engineering, and Why I Need Both',platform:'YouTube',status:'planned',notes:'Film at home. Cello in frame. Most personal video.'},
      {id:6,title:'San Diego as a Clean Fashion Capital',platform:'YouTube',status:'planned',notes:'Film around SD. City + ocean + tech. Local pride.'},
    ]
  };
  var saved=lsGet('chq-social',null)||{};
  var sd={
    strategy:Object.assign({},defaults.strategy,saved.strategy||{}),
    pillars:Array.isArray(saved.pillars)&&saved.pillars.length?saved.pillars:defaults.pillars.slice(),
    cadence:Object.assign({},defaults.cadence,saved.cadence||{}),
    metrics:Object.assign({},defaults.metrics,saved.metrics||{}),
    calendar:Array.isArray(saved.calendar)?saved.calendar:defaults.calendar.slice(),
    videos:Array.isArray(saved.videos)&&saved.videos.length?saved.videos:defaults.videos.slice()
  };
  var socialStrategy=sd.strategy&&typeof sd.strategy==='object'?sd.strategy:defaults.strategy;
  var socialPillars=Array.isArray(sd.pillars)?sd.pillars:defaults.pillars.slice();
  var socialCadence=sd.cadence&&typeof sd.cadence==='object'?sd.cadence:defaults.cadence;
  var socialMetrics=sd.metrics&&typeof sd.metrics==='object'?sd.metrics:defaults.metrics;
  var socialVideos=Array.isArray(sd.videos)?sd.videos:defaults.videos.slice();
  lsWriteLocal('chq-social',{
    strategy:socialStrategy,
    pillars:socialPillars,
    cadence:socialCadence,
    metrics:socialMetrics,
    calendar:Array.isArray(sd.calendar)?sd.calendar:[],
    videos:socialVideos
  });

  var statColors={ig:'var(--lv2)',yt:'var(--bl2)',substack:'var(--ch2)',tiktok:'var(--sg2)'};
  var platforms=['ig','yt','substack'];
  var platformLabels={ig:'Instagram',yt:'YouTube',substack:'Substack'};

  inject(
    '<div class="ph"><div><div class="ph-tag">Platform</div><div class="ph-title"><em>Social Media</em></div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="saveSocial()">Save</button></div></div>' +
    '<div class="pb">' +

    // METRICS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Growth Tracker</div>' +
    '<div class="g4" style="margin-bottom:1.25rem">' +
    '<div class="stat st-lv"><div class="sn" id="sm-ig-f">'+socialMetrics.ig_followers+'</div><div class="sl">Instagram</div><div class="prog"><div class="pf" style="background:var(--lv2);width:'+Math.min(100,Math.round((parseFloat(socialMetrics.ig_followers)||0)/(parseFloat(socialMetrics.ig_goal)||100)*100))+'%"></div></div><div class="pl">Goal: '+socialMetrics.ig_goal+'</div></div>' +
    '<div class="stat st-bl"><div class="sn" id="sm-yt-f">'+socialMetrics.yt_followers+'</div><div class="sl">YouTube</div><div class="prog"><div class="pf" style="background:var(--bl2);width:'+Math.min(100,Math.round((parseFloat(socialMetrics.yt_followers)||0)/(parseFloat(socialMetrics.yt_goal)||5000)*100))+'%"></div></div><div class="pl">Goal: '+socialMetrics.yt_goal+'</div></div>' +
    '<div class="stat st-ch"><div class="sn" id="sm-sub-f">'+socialMetrics.substack_subs+'</div><div class="sl">Substack</div><div class="prog"><div class="pf pf-c" style="width:'+Math.min(100,Math.round((parseFloat(socialMetrics.substack_subs)||0)/(parseFloat(socialMetrics.substack_goal)||1000)*100))+'%"></div></div><div class="pl">Goal: '+socialMetrics.substack_goal+'</div></div>' +
    '<div class="stat st-tz"><div class="sn">'+((parseFloat(socialMetrics.ig_followers)||0)+(parseFloat(socialMetrics.yt_followers)||0)+'').replace(/\B(?=(\d{3})+(?!\d))/g,',')+'</div><div class="sl">Total Reach</div></div>' +
    '</div>' +

    // UPDATE METRICS
    '<div class="card" style="margin-bottom:1.25rem">' +
    '<div class="cl">Update Numbers</div>' +
    '<div class="g4">' +
    ['ig_followers','yt_followers','substack_subs'].map(function(k){
      var labels={ig_followers:'IG Followers',yt_followers:'YT Subscribers',substack_subs:'Substack Subs'};
      return '<div class="fg" style="margin-bottom:0"><label>'+labels[k]+'</label><input class="fi" id="sm-inp-'+k+'" value="'+socialMetrics[k]+'" style="font-size:.8rem" oninput="updateSocialMetric(\''+k+'\',this.value)"></div>';
    }).join('') +
    '</div></div>' +

    // CONTENT PILLARS
    '<div class="g2" style="margin-bottom:1.25rem">' +
    '<div class="card">' +
    '<div class="cl">Content Pillars</div>' +
    socialPillars.map(function(p,i){
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid var(--ch4)">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:var(--tz3);flex-shrink:0"></div>' +
        '<span style="font-size:.8rem;color:var(--ink);flex:1">'+p+'</span>' +
        '</div>';
    }).join('') +
    '</div>' +

    '<div class="card">' +
    '<div class="cl">Posting Cadence</div>' +
    Object.keys(socialCadence).map(function(k){
      var labels={ig:'Instagram',yt:'YouTube',substack:'Substack',tiktok:'TikTok'};
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem 0;border-bottom:1px solid var(--ch4)">' +
        '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:1px;color:var(--wg);min-width:70px">'+labels[k]+'</div>' +
        '<input style="border:none;outline:none;font-size:.78rem;color:var(--st);background:transparent;flex:1" value="'+socialCadence[k]+'" onblur="updateSocialCadence(\''+k+'\',this.value)">' +
        '</div>';
    }).join('') +
    '</div>' +
    '</div>' +

    // PLATFORM STRATEGY
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Platform Strategy</div>' +
    '<div style="display:flex;flex-direction:column;gap:.65rem;margin-bottom:1.25rem">' +
    platforms.map(function(k){
      var tips={ig:'Visual platform. Aesthetic consistency. Reels get reach. Carousels get saves. Stories get intimacy. Link in bio drives everything else.',yt:'Long-form essay videos. 8-15 minutes. SEO matters here — title and description. Each video is a Library of Morenita article brought to life.',substack:'Your most loyal audience. Write like you talk. One exclusive paragraph per post that is not in the app or on IG. Build the list before you need it.'};
      return '<div class="card" style="border-left:3px solid '+statColors[k]+';padding:.85rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:'+statColors[k]+';text-transform:uppercase;margin-bottom:.4rem">'+platformLabels[k]+'</div>' +
        '<div style="font-family:var(--fm);font-size:.55rem;color:var(--wg);margin-bottom:.45rem;line-height:1.6">'+tips[k]+'</div>' +
        '<textarea class="social-strategy" data-key="'+k+'" placeholder="Your specific strategy notes for '+platformLabels[k]+'..." style="width:100%;min-height:65px;border:1.5px dashed var(--du);border-radius:3px;padding:.5rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:var(--ch5)">'+( socialStrategy[k]||'')+'</textarea>' +
        '</div>';
    }).join('') +
    '</div>' +

    // VIDEO PRODUCTION PIPELINE
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">YouTube Video Pipeline</div>' +
    '<div style="display:flex;flex-direction:column;gap:.45rem;margin-bottom:1.25rem" id="video-pipeline">' +
    socialVideos.map(function(v,i){
      var sc={planned:'var(--du)',filming:'var(--ch2)',editing:'var(--lv2)',published:'var(--sg2)'};
      return '<div class="card" style="padding:.75rem;border-left:3px solid '+(sc[v.status]||'var(--du)')+'">' +
        '<div style="display:flex;align-items:center;gap:.65rem;flex-wrap:wrap">' +
        '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);min-width:18px">'+(i+1)+'</div>' +
        '<div style="flex:1;font-size:.82rem;font-weight:600;color:var(--ink)">'+v.title+'</div>' +
        '<select onchange="updateVideoStatus('+v.id+',this.value)" style="font-family:var(--fm);font-size:.55rem;border:1px solid var(--du);border-radius:3px;padding:.2rem .45rem;background:var(--wh);color:'+(sc[v.status]||'var(--du)')+';outline:none">' +
        ['planned','filming','editing','published'].map(function(s){return '<option value="'+s+'" '+(v.status===s?'selected':'')+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>';}).join('') +
        '</select>' +
        '</div>' +
        '<div style="font-size:.72rem;color:var(--wg);margin-top:.25rem;padding-left:1.35rem">'+v.notes+'</div>' +
        '</div>';
    }).join('') +
    '</div>' +

    // CROSS-POST SYSTEM
    '<div class="card" style="margin-bottom:1.25rem;border-top:3px solid var(--tz3)">' +
    '<div class="cl">Cross-Post System</div>' +
    '<div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:.5rem;align-items:center;font-family:var(--fm);font-size:.5rem;color:var(--wg);text-transform:uppercase;padding:.35rem 0;border-bottom:2px solid var(--ch4);margin-bottom:.35rem">' +
    '<div>Content</div><div>Library</div><div>Substack</div><div>YouTube</div><div>IG Reel</div>' +
    '</div>' +
    [
      {title:'Why I Entered a Pageant',lib:true,sub:true,yt:true,ig:true},
      {title:'SB 707 Explained',lib:true,sub:true,yt:true,ig:true},
      {title:'Keel Labs & Algae',lib:true,sub:true,yt:true,ig:false},
      {title:'Supply Chain Story',lib:true,sub:true,yt:true,ig:true},
      {title:'Cello & Engineering',lib:true,sub:true,yt:true,ig:true},
      {title:'SD Clean Fashion Capital',lib:true,sub:true,yt:true,ig:false},
    ].map(function(r){
      return '<div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:.5rem;align-items:center;padding:.3rem 0;border-bottom:1px solid var(--ch4)">' +
        '<div style="font-size:.75rem;color:var(--st)">'+r.title+'</div>' +
        '<div style="text-align:center">'+(r.lib?'✓':'—')+'</div>' +
        '<div style="text-align:center">'+(r.sub?'✓':'—')+'</div>' +
        '<div style="text-align:center">'+(r.yt?'✓':'—')+'</div>' +
        '<div style="text-align:center">'+(r.ig?'✓':'—')+'</div>' +
        '</div>';
    }).join('') +
    '</div>' +

    // FILMING TIPS
    '<div class="card" style="margin-bottom:1.5rem;background:var(--tz);border-radius:3px">' +
    '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:3px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.65rem">iPhone Filming Setup</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem">' +
    [
      {label:'Settings',text:'4K 24fps. Lock exposure before recording. ProRes if your phone supports it.'},
      {label:'Audio',text:'Bluetooth mic always on. Test before every shoot. Audio makes or breaks it.'},
      {label:'Locations',text:'Ocean for materials/sustainability. Desk for policy. Walking for personal essays.'},
      {label:'Aesthetic',text:'Natural light only. Golden hour or overcast. Tanzanite + champagne wardrobe tones.'},
    ].map(function(t){
      return '<div><div style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:rgba(240,216,152,.4);text-transform:uppercase;margin-bottom:.2rem">'+t.label+'</div>' +
        '<div style="font-size:.75rem;color:rgba(216,212,236,.7);line-height:1.6">'+t.text+'</div></div>';
    }).join('') +
    '</div></div>' +

    // BRAND ASSETS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Brand Assets</div>' +
    '<div class="g2" style="margin-bottom:1.5rem">' +
    Object.entries(DA).map(function(entry){
      var k=entry[0],a=entry[1];
      return '<div class="card" style="padding:.85rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">' +
        '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase">'+a.title+'</div>' +
        '<button class="btn bg" style="font-size:.52rem;padding:.18rem .5rem" onclick="copyAsset(\'sba-'+k+'\',this)">Copy</button>' +
        '</div>' +
        '<textarea class="ba-ta" id="sba-'+k+'" oninput="S.brand[\''+k+'\']=this.value" style="min-height:55px;font-size:.75rem">'+(S.brand[k]||a.text)+'</textarea>' +
        '</div>';
    }).join('') +
    '<div class="card" style="padding:.85rem;grid-column:1/-1">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">' +
    '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase">Voice Principles</div>' +
    '<button class="btn bg" style="font-size:.52rem;padding:.18rem .5rem" onclick="copyAsset(\'sba-voice\',this)">Copy</button>' +
    '</div>' +
    '<textarea class="ba-ta" id="sba-voice" oninput="S.brand[\'voice\']=this.value" style="min-height:45px;font-size:.75rem">'+(S.brand.voice||'Name the number. Name the bill. State, do not apologize. Curious, never preachy. Not for a crown, but for a microphone.')+'</textarea>' +
    '</div>' +
    '</div>' +

    '</div>' // close pb
  );

  // Wire up strategy textareas
  document.querySelectorAll('.social-strategy').forEach(function(el){
    el.addEventListener('blur',function(){
      var sd2=lsGet('chq-social',{strategy:{}});
      if(!sd2.strategy)sd2.strategy={};
      sd2.strategy[el.dataset.key]=el.value;
      lsSave('chq-social',sd2);
    });
  });
}

// (from original app.js)
function bInbox(){
  var inbox=lsGet('chq-inbox',[]);
  var tagColors={link:'var(--tz3)',idea:'var(--ch2)',sponsor:'var(--sg2)',urgent:'var(--bl2)',fyi:'var(--wg)'};

  inject(
    '<div class="ph"><div><div class="ph-tag">Amelia & Laneea</div><div class="ph-title"><em>Shared Inbox</em></div></div>' +
    '<div class="ph-acts">' +
    '<button class="btn bp" onclick="toggleQC()">+ Drop Something</button>' +
    '</div></div>' +
    '<div class="pb">' +

    // COMPOSE
    '<div class="card" style="margin-bottom:.85rem">' +
    '<div style="display:flex;gap:.5rem;align-items:flex-start">' +
    '<div class="tb-av" style="background:var(--ch);color:var(--ink);flex-shrink:0;margin-top:.15rem">'+( S.role==='amelia'?'AA':'LL')+'</div>' +
    '<div style="flex:1">' +
    '<textarea id="inbox-compose" placeholder="Drop a link, idea, update, or question for the team..." style="width:100%;min-height:70px;border:1.5px solid var(--du);border-radius:3px;padding:.55rem .75rem;font-family:var(--fb);font-size:.82rem;color:var(--ink);line-height:1.7;resize:none;outline:none;background:var(--ch6)"></textarea>' +
    '<div style="display:flex;gap:.35rem;margin-top:.35rem;flex-wrap:wrap">' +
    ['link','idea','sponsor','urgent','fyi'].map(function(t){
      return '<button class="inbox-tag-btn" data-tag="'+t+'" onclick="toggleInboxTag(this)" style="font-family:var(--fm);font-size:.48rem;letter-spacing:1px;padding:.15rem .5rem;border-radius:3px;border:1px solid var(--du);background:transparent;color:var(--wg);cursor:pointer;text-transform:uppercase">'+t+'</button>';
    }).join('') +
    '<button onclick="sendInbox()" style="margin-left:auto;background:var(--tz);color:var(--ch);border:none;border-radius:3px;padding:.3rem .9rem;font-family:var(--fb);font-size:.67rem;font-weight:600;cursor:pointer">Send</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // FEED
    '<div style="display:flex;flex-direction:column;gap:.5rem" id="inbox-feed">' +
    (inbox.length?
    inbox.slice().reverse().map(function(m){
      var isMe=m.from===S.role;
      var isUnread=!m.readBy||m.readBy.indexOf(S.role)<0;
      return '<div id="inm-'+m.id+'" style="background:var(--wh);border-radius:3px;padding:.85rem 1rem;border-left:3px solid '+(isMe?'var(--tz3)':'var(--ch3)')+';box-shadow:0 1px 6px rgba(46,37,96,.06);'+(isUnread?'border-right:3px solid var(--tz4)':'') +'">' +
        '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">' +
        '<div class="tb-av" style="background:'+(isMe?'var(--ch)':'var(--lv)')+';color:var(--ink);width:20px;height:20px;font-size:.48rem">'+(m.from==='amelia'?'AA':'LL')+'</div>' +
        '<div style="font-size:.75rem;font-weight:600;color:var(--ink)">'+(m.from==='amelia'?'Amelia':'Laneea')+'</div>' +
        (m.tag?'<span style="font-family:var(--fm);font-size:.44rem;letter-spacing:1px;text-transform:uppercase;color:'+(tagColors[m.tag]||'var(--wg)')+';background:'+(tagColors[m.tag]||'var(--wg)')+'22;padding:.1rem .35rem;border-radius:3px">'+m.tag+'</span>':'') +
        '<div style="margin-left:auto;font-family:var(--fm);font-size:.5rem;color:var(--wg)">'+m.date+' '+m.time+'</div>' +
        '</div>' +
        '<div style="font-size:.82rem;color:var(--st);line-height:1.65;word-break:break-word">'+linkify(m.text)+'</div>' +
        (!isMe?'<button onclick="markInboxRead('+m.id+')" style="margin-top:.4rem;background:none;border:none;font-family:var(--fm);font-size:.48rem;color:var(--wg);cursor:pointer;letter-spacing:1px;text-transform:uppercase">Mark read</button>':'') +
        '</div>';
    }).join(''):
    '<div style="text-align:center;padding:3rem;font-family:var(--fd);font-style:italic;color:var(--wg)">The inbox is empty — drop something in to get started</div>'
    ) +
    '</div>' +
    '</div>'
  );

  // Mark all as read on open
  var inbox2=lsGet('chq-inbox',[]);
  inbox2.forEach(function(m){
    if(!m.readBy)m.readBy=[];
    if(m.readBy.indexOf(S.role)<0)m.readBy.push(S.role);
  });
  lsSave('chq-inbox',inbox2);
}

// (from original app.js)
function bDeliverables(){inject('<div class="ph"><div><div class="ph-tag">Sponsor</div><div class="ph-title">Your <em>Deliverables</em></div></div></div><div class="pb">'+buildDelivCards()+'</div>');}

// (from original app.js)
function bCompProgress(){
  inject('<div class="ph"><div><div class="ph-tag">Sponsor View</div><div class="ph-title">Competition <em>Progress</em></div></div></div><div class="pb"><div class="card">' +
    [{label:'Entry Secured',done:true,note:'Miss Temecula USA 2026'},{label:'Coach Engaged',done:true,note:'Weekly sessions'},{label:'Wardrobe In Progress',done:false,note:'With Laneea'},{label:'YouTube Channel Launch',done:false,note:'Starting from 0'},{label:'Competition Week',done:false,note:'July 10-12 · Grand Hyatt Indian Wells'}].map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--du)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong>'+p.note+'</div></div>';
    }).join('') +
    '</div></div>');
}

// (from original app.js)
function bAdvocacy(){
  var advDefaults={
    energy:{stance:'SB 100 is law. Net-zero is the target. My platform is the bridge between legislation and lived reality — specifically in the textile supply chains that still run on fossil fuels.',stats:['65% of clothing is polyester — derived from crude oil','SB 100 mandates 100% clean energy by 2045','Textile mills rank among the most energy-intensive manufacturers','Green-collar jobs are the economic argument for transition'],notes:'',progress:'Developing',img:''},
    fashion:{stance:'Every garment has a carbon cost. I advocate for the policy that makes brands pay it — not the planet. SB 707 is the mechanism. EPR is the framework.',stats:['Fashion = 10% of global carbon emissions','SB 707 shifts textile waste costs from taxpayers to brands','85% of textiles end up in landfills','Polyester takes 200+ years to decompose'],notes:'',progress:'Refined',img:''},
    justice:{stance:'The communities closest to textile mills and fast fashion warehouses bear the greatest environmental burden. Clean fashion is not just a climate argument — it is a justice argument.',stats:['Low-income communities are 3x more likely to live near polluting facilities','California SB 535 directs cap-and-trade revenue to disadvantaged communities','Fast fashion workers earn an average $3/day globally','CA leads with the strongest environmental justice framework in the US'],notes:'',progress:'Drafting',img:''},
    solarpunk:{stance:'Solarpunk is not a utopia. It is a building permit. Library of Morenita is solarpunk infrastructure — a digital archive designed not to burn.',stats:['Most creative work disappears within a generation','The Library of Alexandria held 400,000+ scrolls — and burned','Circular economy design could eliminate 45% of global emissions','Beauty and sustainability are not opposing forces'],notes:'',progress:'Concept',img:''},
  };
  var advSaved=lsGet('chq-adv',{});
  var adv={};
  ['energy','fashion','justice','solarpunk'].forEach(function(k){
    adv[k]=Object.assign({},advDefaults[k],advSaved[k]||{});
    if(!Array.isArray(adv[k].stats)) adv[k].stats=advDefaults[k].stats;
  });
  var sections=[
    {key:'energy',icon:'⚡',title:'Clean Energy & EV',subtitle:'SB 100 · Net-Zero · Textile Mills',accent:'var(--ch3)',accentRaw:'#C8A84C',accentBg:'var(--ch4)'},
    {key:'fashion',icon:'🌿',title:'Fashion Accountability',subtitle:'SB 707 · EPR · Fashion Miles',accent:'var(--sg2)',accentRaw:'#5A8A52',accentBg:'rgba(90,138,82,.08)'},
    {key:'justice',icon:'🌍',title:'Environmental Justice',subtitle:'Frontline Communities · Equity · Policy',accent:'var(--lv2)',accentRaw:'#9880C8',accentBg:'rgba(152,128,200,.08)'},
    {key:'solarpunk',icon:'✦',title:'Solarpunk & Sustainable Tech',subtitle:'Library of Morenita · Circular Design',accent:'var(--tz3)',accentRaw:'#6B5FBA',accentBg:'var(--tz5)'},
  ];
  var stages=['Concept','Drafting','Developing','Refined','Ready'];
  var html='<div class="ph"><div><div class="ph-tag">Platform</div><div class="ph-title"><em>Advocacy</em></div></div>'+
    '<div class="ph-acts"><span style="font-family:var(--fm);font-size:.55rem;color:var(--wg);font-style:italic">ameliaarabe.com/advocacy — coming soon</span></div></div>'+
    '<div class="pb">';
  sections.forEach(function(sec){
    var d=adv[sec.key];
    var hasImg=d.img&&d.img.length>0;
    html+=
      '<div class="adv-section" data-key="'+sec.key+'" style="margin-bottom:2rem;border-radius:3px;overflow:hidden;box-shadow:0 2px 16px rgba(46,37,96,.08);border:1px solid rgba(221,208,184,.25)">'+
      '<div style="position:relative;height:200px;background:linear-gradient(135deg,var(--tz) 0%,var(--tz2) 60%,'+sec.accentRaw+'44 100%);overflow:hidden">'+
      (hasImg?'<img src="'+d.img+'" style="width:100%;height:100%;object-fit:cover;opacity:.85">':
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.5rem">'+
        '<div style="font-size:2.5rem;opacity:.25">'+sec.icon+'</div>'+
        '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase">Add a photo for this section</div>'+
        '</div>')+
      '<div style="position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(20,16,40,.75))"></div>'+
      '<div style="position:absolute;bottom:0;left:0;right:0;padding:1.25rem 1.75rem">'+
      '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:4px;color:rgba(240,216,152,.45);text-transform:uppercase;margin-bottom:.3rem">'+sec.subtitle+'</div>'+
      '<div style="font-family:var(--fd);font-size:clamp(1.4rem,3vw,2rem);font-style:italic;color:var(--ch);line-height:1.1;font-weight:300">'+sec.title+'</div>'+
      '</div>'+
      '<label class="adv-img-btn" data-key="'+sec.key+'" style="position:absolute;top:.65rem;right:.65rem;background:rgba(20,16,40,.55);border:1px solid rgba(240,216,152,.2);border-radius:3px;padding:.22rem .6rem;font-family:var(--fm);font-size:.44rem;color:rgba(240,216,152,.65);cursor:pointer;letter-spacing:1px;text-transform:uppercase">'+
      (hasImg?'Change':'+ Photo')+
      '<input type="file" accept="image/*" style="display:none" class="adv-img-input" data-key="'+sec.key+'"></label>'+
      (hasImg?'<button class="adv-img-clear" data-key="'+sec.key+'" style="position:absolute;top:.65rem;left:.65rem;background:rgba(20,16,40,.55);border:1px solid rgba(240,216,152,.2);border-radius:3px;padding:.22rem .6rem;font-family:var(--fm);font-size:.44rem;color:rgba(240,216,152,.65);cursor:pointer;letter-spacing:1px;text-transform:uppercase">Remove</button>':'')+
      '</div>'+
      '<div style="background:var(--ch6);padding:.55rem 1.5rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;border-bottom:1px solid rgba(221,208,184,.2)">'+
      '<span style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-right:.25rem;flex-shrink:0">Stage</span>'+
      stages.map(function(s){
        var active=d.progress===s;
        return '<button class="adv-stage-btn" data-key="'+sec.key+'" data-stage="'+s+'" data-accent="'+sec.accentRaw+'" style="font-family:var(--fm);font-size:.44rem;letter-spacing:1px;padding:.2rem .6rem;border-radius:3px;border:1px solid '+(active?sec.accentRaw:'var(--du)')+';background:'+(active?sec.accentRaw:'transparent')+';color:'+(active?'white':'var(--wg)')+';cursor:pointer;transition:all .15s;text-transform:uppercase">'+s+'</button>';
      }).join('')+
      '</div>'+
      '<div style="padding:1.35rem 1.75rem;background:var(--wh)">'+
      '<div style="display:grid;grid-template-columns:1.15fr 1fr;gap:1.5rem;margin-bottom:1.25rem">'+
      '<div>'+
      '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:'+sec.accent+';text-transform:uppercase;margin-bottom:.5rem">Public Stance</div>'+
      '<div class="adv-stance" data-key="'+sec.key+'" contenteditable="true" style="font-family:var(--fd);font-size:.98rem;font-style:italic;color:var(--ink);line-height:1.75;outline:none;border-left:2px solid '+sec.accent+';padding:.85rem 1rem;background:'+sec.accentBg+';border-radius:0 3px 3px 0;min-height:90px">'+d.stance+'</div>'+
      '</div>'+
      '<div>'+
      '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.5rem">Key Facts</div>'+
      '<div class="adv-stats-grid" data-key="'+sec.key+'">'+
      d.stats.map(function(stat,si){
        return '<div class="adv-stat-item" data-key="'+sec.key+'" data-idx="'+si+'" contenteditable="true" style="font-family:var(--fb);font-size:.72rem;color:var(--ink);line-height:1.5;padding:.5rem .7rem;margin-bottom:.35rem;background:var(--ch5);border-radius:3px;border-left:2px solid '+sec.accent+';outline:none">'+stat+'</div>';
      }).join('')+
      '<button class="adv-add-stat" data-key="'+sec.key+'" data-accent="'+sec.accentRaw+'" style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;color:var(--wg);background:transparent;border:1px dashed var(--du);border-radius:3px;padding:.25rem .7rem;cursor:pointer;width:100%;text-transform:uppercase;margin-top:.15rem">+ Add Fact</button>'+
      '</div>'+
      '</div>'+
      '</div>'+
      '<div style="font-family:var(--fm);font-size:.44rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.35rem">Working Notes <span style="opacity:.4;text-transform:none;letter-spacing:0;font-size:.6rem;font-family:var(--fb)">— private</span></div>'+
      '<textarea class="adv-notes" data-key="'+sec.key+'" placeholder="Research, quotes, talking points in progress..." style="width:100%;border:1.5px dashed var(--du);border-radius:3px;padding:.7rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:#FEFCF9;min-height:70px">'+d.notes+'</textarea>'+
      '</div></div>';
  });
  html+='</div>';
  inject(html);
  document.querySelectorAll('.adv-img-input').forEach(function(inp){
    inp.addEventListener('change',function(){
      var key=inp.dataset.key;
      var file=inp.files[0];if(!file)return;
      var r=new FileReader();
      r.onload=function(ev){saveAdv(key,'img',ev.target.result);bAdvocacy();};
      r.readAsDataURL(file);
    });
  });
  document.querySelectorAll('.adv-img-clear').forEach(function(btn){
    btn.addEventListener('click',function(){saveAdv(btn.dataset.key,'img','');bAdvocacy();});
  });
  document.querySelectorAll('.adv-stage-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var key=btn.dataset.key,stage=btn.dataset.stage,acc=btn.dataset.accent;
      saveAdv(key,'progress',stage);
      document.querySelectorAll('.adv-stage-btn[data-key="'+key+'"]').forEach(function(b){
        var active=b.dataset.stage===stage;
        b.style.background=active?acc:'transparent';
        b.style.borderColor=active?acc:'var(--du)';
        b.style.color=active?'white':'var(--wg)';
      });
    });
  });
  document.querySelectorAll('.adv-stance').forEach(function(el){
    el.addEventListener('blur',function(){saveAdv(el.dataset.key,'stance',el.textContent.trim());});
  });
  document.querySelectorAll('.adv-stat-item').forEach(function(el){
    el.addEventListener('blur',function(){
      var key=el.dataset.key;
      var stats=Array.from(document.querySelectorAll('.adv-stat-item[data-key="'+key+'"]')).map(function(i){return i.textContent.trim();});
      saveAdv(key,'stats',stats);
    });
  });
  document.querySelectorAll('.adv-add-stat').forEach(function(btn){
    btn.addEventListener('click',function(){
      var key=btn.dataset.key,acc=btn.dataset.accent;
      var div=document.createElement('div');
      div.className='adv-stat-item';div.dataset.key=key;div.contentEditable='true';
      div.style.cssText='font-family:var(--fb);font-size:.72rem;color:var(--ink);line-height:1.5;padding:.5rem .7rem;margin-bottom:.35rem;background:var(--ch5);border-radius:3px;border-left:2px solid '+acc+';outline:none';
      div.textContent='New fact...';
      btn.parentElement.insertBefore(div,btn);div.focus();
      div.addEventListener('blur',function(){
        var stats=Array.from(document.querySelectorAll('.adv-stat-item[data-key="'+key+'"]')).map(function(i){return i.textContent.trim();});
        saveAdv(key,'stats',stats);
      });
    });
  });
  document.querySelectorAll('.adv-notes').forEach(function(el){
    el.addEventListener('blur',function(){saveAdv(el.dataset.key,'notes',el.value);});
  });
}

// (from original app.js)
function quickSend(){
  var inp=g('quick-msg');if(!inp||!inp.value.trim())return;
  var from=S.portalProfile?getPortalWorkspaceKey():S.role;
  var to=S.portalProfile?'amelia':'team';
  var m={id:Date.now(),from:from,to:to,text:inp.value.trim(),time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  S.messages.push(m);lsSave('chq-ms',S.messages);inp.value='';bMessages();
}

// (from original app.js)
function sendMsg(){
  var body=g('msg-body').value.trim();if(!body)return;
  var m={id:Date.now(),from:S.role,to:g('msg-to').value,text:body,time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})};
  S.messages.push(m);lsSave('chq-ms',S.messages);closeM('m-msg');g('msg-body').value='';bMessages();
}

// (from original app.js)
function handleUpload(e){
  var isPortal=!!S.portalProfile;
  Array.from(e.target.files).forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){
      FILE_STORE.push({id:Date.now()+Math.floor(Math.random()*1000000),name:file.name,size:file.size,type:file.type,data:ev.target.result,folder:isPortal?getPortalWorkspaceLabel():(window._fileFolder&&window._fileFolder!=='All'?window._fileFolder:'Personal')});
      renderFileList();
      sbSaveFiles();
    };
    r.readAsDataURL(file);
  });
}

// (from original app.js)
function renderFileList(){
  var c=g('uploaded-files');if(!c)return;
  var isPortal=!!S.portalProfile;
  var folder=isPortal?getPortalWorkspaceLabel():(window._fileFolder||'All');
  var filtered=folder==='All'?FILE_STORE:FILE_STORE.filter(function(f){return (f.folder||'Personal')===folder;});
  if(!filtered.length){c.innerHTML='<div style="text-align:center;padding:2rem;font-family:var(--fd);font-style:italic;color:var(--wg)">No files in '+folder+' yet</div>';return;}
  c.innerHTML=filtered.map(function(f,i){var realIdx=FILE_STORE.indexOf(f);
    var ext=f.name.split('.').pop().toLowerCase();
    var ico=(['jpg','jpeg','png','gif','webp'].includes(ext)?'🖼':ext==='pdf'?'📄':(['mp3','wav','ogg','m4a'].includes(ext))?'🎵':(['mp4','mov','webm'].includes(ext))?'🎬':'📎');
    return '<div class="f-item" onclick="openFile('+realIdx+')" style="cursor:pointer">'+
      '<div class="f-ico">'+ico+'</div>'+
      '<div style="flex:1"><div class="f-nm">'+f.name+'</div><div class="f-mt">'+( f.size/1024).toFixed(1)+' KB · click to view</div></div>'+
      '<div class="f-acts"><button class="btn bg" style="font-size:.58rem" onclick="event.stopPropagation();openFile('+realIdx+')">View</button>'+
      '<button class="btn bg" style="font-size:.58rem" onclick="event.stopPropagation();downloadFile('+realIdx+')">↓</button>'+
      '<button class="btn bg" style="font-size:.58rem;color:var(--bl2)" onclick="event.stopPropagation();removeFile('+realIdx+')">×</button></div></div>';
  }).join('');
}

// (from original app.js)
function buildDelivCards(){
  return [{title:'Instagram Feature Post',due:'Apr 15',status:'pending'},{title:'YouTube Short (Launch)',due:'Apr 1',status:'overdue'},{title:'Logo on Advocacy One-Pager',due:'Mar 31',status:'done'},{title:'Named in Press Materials',due:'Ongoing',status:'done'}].map(function(d){
    return '<div class="dv-card '+d.status+'"><div class="dv-ti">'+d.title+'</div><div class="dv-du">Due: '+d.due+'</div>' +
      '<span class="dv-st ds-'+(d.status==='pending'?'p':d.status==='done'?'d':'o')+'">'+(d.status==='done'?'Complete':d.status==='overdue'?'Overdue':'Pending')+'</span></div>';
  }).join('');
}

// (from original app.js)
function getSpTabContent(spTab, raised){
  if(spTab==='accounts') return renderPortalAccounts();
  if(spTab==='pitch') return renderSpPitchDecks();
  if(spTab==='emails') return renderSpEmails();
  if(spTab==='objections') return renderSpObjections();
  var html = '';
  html += '<div class="g4" style="margin-bottom:.85rem">';
  html += '<div class="stat st-tz"><div class="sn">'+S.sponsors.length+'</div><div class="sl">Total</div></div>';
  html += '<div class="stat st-ch"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='meeting';}).length+'</div><div class="sl">Meeting Set</div></div>';
  html += '<div class="stat st-sg"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='closed';}).length+'</div><div class="sl">Closed</div></div>';
  html += '<div class="stat st-bl"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">';
  ['all','new','contacted','meeting','closed','declined'].forEach(function(f){
    var label = f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1);
    var cls = f===spFilter?'btn bp':'btn bg';
    html += '<button class="'+cls+'" data-f="'+f+'" onclick="spFilter=this.getAttribute(String.fromCharCode(100,97,116,97,45,102));bSponsors()">'+label+'</button>';
  });
  html += '</div>';
  html += '<div class="card" style="padding:0;overflow:hidden">';
  html += renderSponsorsTable();
  html += '</div>';
  return html;
}




// bLookbook
function bLookbook(){
  var published=getPublishedPosts().slice(0,4);
  var links=getLookbookLinks();
  var meta=getLookbookMeta();
  var heroSrc=getPortfolioHeroSrc();
  inject(
    '<div class="ph"><div><div class="ph-tag">Public · Portfolio</div><div class="ph-title"><em>Editorial Portfolio</em></div></div>' +
    '<div class="ph-acts">' +
    '<button class="btn bg" onclick="previewLookbook()">Preview Public Page</button>' +
    '<button class="btn bg" onclick="openPublicPortfolioRoute()">Open Public Route</button>' +
    '<label class="btn bp" style="cursor:pointer">+ Upload Look<input type="file" accept="image/*" multiple style="display:none" onchange="addLookbookImg(event)"></label>' +
    '</div></div>' +
    '<div class="pb">' +
    '<div class="portfolio-hero-card" style="margin-bottom:1.1rem">' +
    '<div class="portfolio-hero-copy">' +
    '<div class="lib-front-kicker">Editorial Portfolio</div>' +
    '<div class="lib-front-title">A more professional portfolio built around image, writing, and platform.</div>' +
    '<div class="portfolio-hero-subtitle">'+meta.subtitle+'</div>' +
    '<div class="lib-front-sub">This is the only forward-facing portfolio page now. It carries the visual story, your core bio, social links, and selected published essays in one cohesive presentation.</div>' +
    '<div class="portfolio-link-row">' +
    '<button class="pc-link" onclick="window.open(\''+links.ig+'\',\'_blank\')">Instagram</button>' +
    '<button class="pc-link" onclick="window.open(\''+links.yt+'\',\'_blank\')">YouTube</button>' +
    '<button class="pc-link" onclick="window.open(\''+links.gh+'\',\'_blank\')">GitHub</button>' +
    '<button class="pc-link" onclick="window.open(\''+links.tech+'\',\'_blank\')">Technical Portfolio</button>' +
    '</div></div>' +
    '<div class="portfolio-hero-image">'+(heroSrc?'<img src="'+heroSrc+'" alt="Portfolio hero">':'')+'</div>' +
    '</div>' +

    // CURATED LOOKS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Curated Looks — Upload Your Photos</div>' +
    '<div class="mb-grid" id="lb-grid" style="margin-bottom:1.5rem">' +
    getLookbookImgs().map(function(m,i){
      return '<div class="mb-item" style="aspect-ratio:2/3">' +
        '<img src="'+m.src+'" alt="'+m.caption+'">' +
        '<div class="mb-lbl">'+m.caption+'</div>' +
        '<button class="mb-rm" onclick="removeLookbookImg('+i+')">×</button>' +
        '</div>';
    }).join('') +
    '<label class="mb-item mb-add" style="aspect-ratio:2/3">' +
    '<input type="file" accept="image/*" multiple style="display:none" onchange="addLookbookImg(event)">' +
    '<div style="font-size:1.3rem;color:var(--wg)">+</div>' +
    '<span style="font-family:var(--fm);font-size:.52rem;color:var(--wg);letter-spacing:1px;text-transform:uppercase">Add Photo</span>' +
    '</label>' +
    '</div>' +

    // SOCIAL LINKS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Profile And Portfolio Links</div>' +
    '<div class="g3" style="margin-bottom:1.5rem">' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--tz3);text-transform:uppercase;margin-bottom:.5rem">📸 Instagram</div>' +
    '<input class="fi" id="lb-ig" value="'+links.ig+'" placeholder="https://instagram.com/ameliavarabe">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Sponsors will see a direct link to your profile</div>' +
    '</div>' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--bl2);text-transform:uppercase;margin-bottom:.5rem">▶️ YouTube</div>' +
    '<input class="fi" id="lb-yt" value="'+links.yt+'" placeholder="https://youtube.com/@ameliavarabe">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Sponsors will see a direct link to your channel</div>' +
    '</div>' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--sg2);text-transform:uppercase;margin-bottom:.5rem">⌘ GitHub</div>' +
    '<input class="fi" id="lb-gh" value="'+links.gh+'" placeholder="https://github.com/ameliavarabe">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">For the engineering side of the portfolio</div>' +
    '</div>' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--ch3);text-transform:uppercase;margin-bottom:.5rem">⌁ Technical Portfolio</div>' +
    '<input class="fi" id="lb-tech" value="'+links.tech+'" placeholder="https://yourdomain.com">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Primary link for your official engineering portfolio site</div>' +
    '</div>' +
    '</div>' +

    // PORTFOLIO SUBTITLE
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Portfolio Subtitle</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
    '<input class="fi" id="lb-subtitle" value="'+meta.subtitle.replace(/"/g,'&quot;')+'" placeholder="Student Engineer · Net-Zero Hardware · Cellist · Policy Advocate">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Short professional line under your name in the portfolio hero</div>' +
    '</div>' +

    // BIO FOR SPONSORS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Sponsor-Facing Bio</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
    '<textarea id="lb-bio" style="width:100%;min-height:90px;border:none;outline:none;font-family:var(--fd);font-size:.95rem;font-style:italic;color:var(--ink);line-height:1.8;resize:vertical;background:transparent" placeholder="What sponsors read when they open the lookbook...">'+(lsGet('chq-lb-bio','')||'Amelia Arabe is a Filipina-American student engineer, cellist, and Miss Temecula USA 2026 candidate based in San Diego. Her platform is clean energy and textile accountability policy. She competes not for a crown — but for a microphone.')+'</textarea>' +
    '</div>' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Published Essays In Portfolio</div>' +
    '<div class="lib-grid" style="margin-bottom:1.5rem">' +
    published.map(function(p){
      var cat=libCats[p.cat]||{lbl:p.tag,bg:'var(--tz5)'};
      return '<div class="lib-card" '+(S.role==='amelia'?'onclick="editPost('+p.id+')"':'')+'>' +
        '<div class="lib-cover" style="background:'+cat.bg+'">' +
        (p.cover?'<img src="'+p.cover+'">':'') +
        '<div class="lib-overlay"></div>' +
        '<div class="lib-cover-text"><div class="lib-cat">'+p.tag+'</div><div class="lib-title-sm">'+p.title+'</div></div>' +
        '</div>' +
        '<div class="lib-meta"><span class="lib-date">'+fdate(p.date)+'</span><span class="lib-status ls-p">Essay</span></div>' +
        '</div>';
    }).join('') +
    '</div>' +
    '<button class="btn bp" onclick="saveLookbookData()">Save Portfolio</button>' +
    '</div>'
  );
}



// ═══ MISSING HELPERS FROM ORIGINAL ════════════════════════
// FILE_STORE
var FILE_STORE=[];

// isPublicPortfolioRoute
function isPublicPortfolioRoute(){
  try{
    var qp=new URLSearchParams(window.location.search||'');
    var view=(qp.get('view')||'').toLowerCase();
    var hash=(window.location.hash||'').replace(/^#/,'').toLowerCase();
    return view==='portfolio'||hash==='portfolio';
  }catch(e){
    return false;
  }
}

// renderPublicPortfolioRoute
function renderPublicPortfolioRoute(){
  var login=g('login');
  var app=g('app');
  if(login)login.style.display='none';
  if(app)app.style.display='none';
  seed();
  loadFromSupabase().then(function(){
    document.open();
    document.write(buildPublicPortfolioHTML());
    document.close();
  });
}

// getMorningGreeting
function getMorningGreeting(){
  var h=new Date().getHours();
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  if(h<12) return 'Good morning, Amelia. '+days+' days to crown.';
  if(h<17) return 'Good afternoon, Amelia. '+days+' days to crown.';
  return 'Good evening, Amelia. '+days+' days to crown.';
}

// linkify
function linkify(text){
  return text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:var(--tz3);text-decoration:underline">$1</a>');
}

// _quotes
var _quotes=[
  {text:'Out beyond ideas of wrongdoing and rightdoing, there is a field. I will meet you there.',author:'Rumi'},
  {text:'You are not a drop in the ocean. You are the entire ocean in a drop.',author:'Rumi'},
  {text:'The wound is the place where the light enters you.',author:'Rumi'},
  {text:'I am deliberate and afraid of nothing.',author:'Audre Lorde'},
  {text:'When I dare to be powerful, to use my strength in the service of my vision, then it becomes less and less important whether I am afraid.',author:'Audre Lorde'},
  {text:'You are enough. You have always been enough.',author:'Unknown'},
  {text:'She remembered who she was and the game changed.',author:'Lalah Delia'},
  {text:'The most courageous act is still to think for yourself. Aloud.',author:'Coco Chanel'},
  {text:'I am not afraid of storms, for I am learning how to sail my ship.',author:'Louisa May Alcott'},
  {text:'You carry so much love in your heart. Give some to yourself.',author:'Unknown'},
];

// ═══ CAMPAIGN SITE EDITOR ═══════════════════════════════════════

function bCampaignEditor(){
  var gallery=lsGet('chq-pub-gallery',[]);
  var heroSrc=localStorage.getItem('chq-pub-hero')||'';
  var posts=lsGet('chq-po',[]);
  var published=posts.filter(function(p){return p.status==='published';}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  var t=lsGet('chq-pub-text',{});
  var D={
    heroEyebrow:'Miss Temecula Valley USA 2026 \u00b7 Competing for Miss California USA',
    heroName:'Amelia Arabe',
    heroTitle:'Engineer \u00b7 Artist \u00b7 Cellist \u00b7 Builder',
    heroBio:'I believe the crown is a tool \u2014 a platform to do real work in the world. I\'m running to bring solar energy and green infrastructure to communities that have been left behind, to engineer solutions that actually serve people, and to push fashion sustainability from runway aspiration to federal policy.',
    heroTag0:'Green Energy Access',heroTag1:'Community Infrastructure',heroTag2:'Fashion Sustainability Policy',heroTag3:'Riverside, CA',heroTag4:'Software Engineer',
    aboutText1:'I grew up believing that the pursuit of knowledge and the pursuit of happiness are the same pursuit. I\'m a senior software engineer, co-founder, oil painter, and cellist \u2014 and I move through the world convinced that human creations are most beautiful when the process behind them cultivates healthy human connections.',
    aboutText2:'I build systems that breathe. At Ballmecca and across the teams I\'ve led, I\'ve learned that the best infrastructure \u2014 technical or human \u2014 is the kind that holds space for people to fully show up. That\'s the leadership I bring to this campaign.',
    cred0:'Senior Software Engineer & Co-founder, Ballmecca',cred1:'Computer Engineering, Loyola University Maryland',cred2:'Co-President, Society of Women Engineers',cred3:'Cellist \u00b7 Oil painter \u00b7 Riverside, California',cred4:'Building tools for a greener, more human-centered world',
    platformIntro:'The crown is a microphone. I intend to use it to amplify the communities who have been engineered out of prosperity \u2014 and to build real solutions alongside them.',
    pqText:'I am not running to be beautiful on a stage. I am running to build something that lasts after the crown comes off.',
    pillar1Title:'Green Energy Access',pillar1Text:'Solar panels, microgrids, and renewable infrastructure built in and for underserved communities. Not charity \u2014 engineering. Real partnerships with municipalities, nonprofits, and clean energy companies to bring power to the people who need it most.',
    pillar2Title:'Community Infrastructure',pillar2Text:'Where energy alone isn\'t the answer, we engineer the solution that is. Clean water systems, connectivity infrastructure, sustainable housing materials \u2014 the platform adapts to what the community actually needs, built with their voices at the table.',
    pillar3Title:'Fashion Sustainability Policy',pillar3Text:'Fashion is the second most polluting industry on earth. It doesn\'t have to be. I\'m pushing for transparency legislation, recycled textile requirements, and supply chain accountability \u2014 from runway to regulation.'
  };
  var em=S.emActive;
  var IS_on ='border:0.5px solid var(--iv3);border-radius:3px;padding:.32rem .55rem;font-family:var(--fb);font-size:.75rem;color:var(--ink);background:var(--wh);outline:none;width:100%;box-sizing:border-box';
  var IS_off='border:0.5px solid var(--iv3);border-radius:3px;padding:.32rem .55rem;font-family:var(--fb);font-size:.75rem;color:var(--muted);background:var(--iv2);outline:none;width:100%;box-sizing:border-box;cursor:default';
  var IS=em?IS_on:IS_off;
  var dis=em?'':' disabled';
  var LS='font-family:var(--fm);font-size:.48rem;letter-spacing:1px;text-transform:uppercase;color:var(--muted)';
  var SH='font-size:.58rem;font-family:var(--fm);letter-spacing:2px;text-transform:uppercase;color:var(--si);padding-bottom:.4rem;margin-bottom:.75rem;border-bottom:0.5px solid var(--iv3)';
  function ci(lbl,key){
    return '<div style="display:flex;flex-direction:column;gap:.18rem"><label style="'+LS+'">'+lbl+'</label>'+
      '<input data-ctkey="'+key+'" value="'+escHtml(t[key]||D[key]||'')+'" style="'+IS+'"'+dis+'></div>';
  }
  function cta(lbl,key,h){
    return '<div style="display:flex;flex-direction:column;gap:.18rem"><label style="'+LS+'">'+lbl+'</label>'+
      '<textarea data-ctkey="'+key+'" style="'+IS+';min-height:'+(h||60)+'px;resize:'+(em?'vertical':'none')+'"'+dis+'>'+escHtml(t[key]||D[key]||'')+'</textarea></div>';
  }
  var textHtml=
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.65rem">Site Text Content</div>'+
    '<div class="card" id="camp-text-section" style="margin-bottom:1.5rem;display:flex;flex-direction:column;gap:1.35rem">'+
      (!em ? '<div style="font-size:.72rem;color:var(--muted);font-style:italic;text-align:center;padding:.35rem 0">Enable Edit Mode to edit site text</div>' : '')+
      '<div>'+
        '<div style="'+SH+'">Hero</div>'+
        '<div style="display:flex;flex-direction:column;gap:.55rem">'+
          ci('Eyebrow','heroEyebrow')+
          ci('Name (H1)','heroName')+
          ci('Title line','heroTitle')+
          cta('Bio paragraph','heroBio',72)+
          '<div><label style="display:block;'+LS+';margin-bottom:.3rem">Tags</label>'+
          '<div style="display:flex;flex-direction:column;gap:.28rem">'+
          ['heroTag0','heroTag1','heroTag2','heroTag3','heroTag4'].map(function(k){return '<input data-ctkey="'+k+'" value="'+escHtml(t[k]||D[k]||'')+'" style="'+IS+'"'+dis+'>';}).join('')+
          '</div></div>'+
        '</div>'+
      '</div>'+
      '<div>'+
        '<div style="'+SH+'">About</div>'+
        '<div style="display:flex;flex-direction:column;gap:.55rem">'+
          cta('Bio paragraph 1','aboutText1',68)+
          cta('Bio paragraph 2','aboutText2',68)+
          '<div><label style="display:block;'+LS+';margin-bottom:.3rem">Credentials</label>'+
          '<div style="display:flex;flex-direction:column;gap:.28rem">'+
          ['cred0','cred1','cred2','cred3','cred4'].map(function(k){return '<input data-ctkey="'+k+'" value="'+escHtml(t[k]||D[k]||'')+'" style="'+IS+'"'+dis+'>';}).join('')+
          '</div></div>'+
        '</div>'+
      '</div>'+
      '<div>'+
        '<div style="'+SH+'">Platform</div>'+
        '<div style="display:flex;flex-direction:column;gap:.55rem">'+
          cta('Intro paragraph','platformIntro',58)+
          cta('Pull quote','pqText',52)+
          [[1,'pillar1Title','pillar1Text'],[2,'pillar2Title','pillar2Text'],[3,'pillar3Title','pillar3Text']].map(function(p){
            return '<div style="background:var(--iv2);border-radius:3px;padding:.75rem;display:flex;flex-direction:column;gap:.4rem">'+
              '<div style="font-family:var(--fm);font-size:.46rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)">Pillar '+p[0]+'</div>'+
              '<input data-ctkey="'+p[1]+'" value="'+escHtml(t[p[1]]||D[p[1]]||'')+'" style="'+IS+';font-weight:500"'+dis+'>'+
              '<textarea data-ctkey="'+p[2]+'" style="'+IS+';min-height:58px;resize:'+(em?'vertical':'none')+'"'+dis+'>'+escHtml(t[p[2]]||D[p[2]]||'')+'</textarea>'+
            '</div>';
          }).join('')+
        '</div>'+
      '</div>'+
      (em ? '<button onclick="saveCampaignTextAll()" class="btn bp" style="width:100%;padding:.65rem;margin-top:.25rem">Save Text to Site &rarr;</button>' : '')+
    '</div>';

  inject(
    '<div class="ph"><div><div class="ph-tag">Amelia</div><div class="ph-title">Campaign <em>Site Editor</em></div></div>' +
    '<div class="ph-acts"><a href="public.html" target="_blank" class="btn bg" style="text-decoration:none">View Site ↗</a></div></div>' +
    '<div class="pb">' +

    // ── HERO IMAGE ──────────────────────────────────────
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.65rem">Hero Image</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
      '<div style="display:flex;align-items:flex-start;gap:1.25rem">' +
        '<div style="width:120px;height:80px;border-radius:4px;overflow:hidden;flex-shrink:0;background:var(--iv3);border:0.5px solid var(--iv4)">' +
          (heroSrc ? '<img src="'+heroSrc+'" style="width:100%;height:100%;object-fit:cover">' : '<div style="width:100%;height:100%;background:url(assets/portfolio-hero.jpeg) center/cover"></div>') +
        '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:.78rem;color:var(--ink);font-weight:500;margin-bottom:.3rem">Full-page hero background</div>' +
          '<div style="font-size:.72rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">Appears on the public site hero section. Best as a portrait photo, at least 1200px wide.</div>' +
          '<label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;background:var(--iv2);border:0.5px solid var(--iv3);border-radius:3px;padding:.35rem .75rem;font-family:var(--fm);font-size:.55rem;letter-spacing:1px;color:var(--muted);text-transform:uppercase">' +
            'Upload New Image<input type="file" accept="image/*" style="display:none" onchange="uploadCampaignHero(event)">' +
          '</label>' +
          (heroSrc ? '<button onclick="clearCampaignHero()" style="margin-left:.5rem;background:transparent;border:0.5px solid var(--iv4);border-radius:3px;padding:.35rem .65rem;font-family:var(--fm);font-size:.5rem;color:var(--muted);cursor:pointer;letter-spacing:1px;text-transform:uppercase">Reset to default</button>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +

    // ── SITE TEXT ────────────────────────────────────────
    textHtml +

    // ── GALLERY ─────────────────────────────────────────
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.65rem">Photo Gallery</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
      '<div style="font-size:.72rem;color:var(--muted);margin-bottom:1rem;line-height:1.6">These appear in the Journey section of the public site. First photo is featured large.</div>' +
      (gallery.length ?
        '<div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem" id="gallery-list">' +
        gallery.map(function(p,i){
          return '<div style="display:flex;align-items:center;gap:.75rem;padding:.6rem .75rem;background:var(--iv2);border-radius:3px;border:0.5px solid var(--iv3)">' +
            '<div style="width:52px;height:36px;border-radius:2px;overflow:hidden;flex-shrink:0;background:var(--iv3)">' +
              '<img src="'+p.src+'" style="width:100%;height:100%;object-fit:cover">' +
            '</div>' +
            '<input value="'+escHtml(p.caption||'')+'" placeholder="Caption..." ' +
              'style="flex:1;border:0.5px solid var(--iv3);border-radius:3px;padding:.3rem .55rem;font-family:var(--fb);font-size:.75rem;color:var(--ink);background:var(--wh);outline:none" ' +
              'onchange="updateGalleryCaption('+i+',this.value)">' +
            '<button onclick="removeGalleryPhoto('+i+')" style="background:transparent;border:0.5px solid var(--iv4);border-radius:3px;padding:.25rem .55rem;font-family:var(--fm);font-size:.5rem;color:var(--muted);cursor:pointer;text-transform:uppercase;letter-spacing:1px;flex-shrink:0">Remove</button>' +
          '</div>';
        }).join('') +
        '</div>'
      : '<div style="font-size:.75rem;color:var(--faint);font-style:italic;margin-bottom:1rem">No photos added yet.</div>') +
      '<label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer;background:var(--sip);border:0.5px solid var(--sil);border-radius:3px;padding:.4rem .85rem;font-family:var(--fm);font-size:.55rem;letter-spacing:1px;color:var(--si);text-transform:uppercase">' +
        '+ Add Photo<input type="file" accept="image/*" multiple style="display:none" onchange="addGalleryPhotos(event)">' +
      '</label>' +
    '</div>' +

    // ── QUICK POST ───────────────────────────────────────
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.65rem">Post an Update</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
      '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.85rem;line-height:1.6">Published posts appear in the Writing &amp; Essays section of the public site.</div>' +
      '<div style="margin-bottom:.65rem">' +
        '<input id="qp-title" class="fi" placeholder="Post title..." style="width:100%;margin-bottom:.5rem">' +
        '<select id="qp-cat" class="fs" style="width:100%;margin-bottom:.5rem">' +
          '<option value="energy">Clean Energy</option>' +
          '<option value="fashion">Fashion Accountability</option>' +
          '<option value="wellness">Beauty & Wellness</option>' +
          '<option value="fitness">Fitness & Movement</option>' +
          '<option value="morenita">Library of Morenita</option>' +
          '<option value="solarpunk">Solarpunk</option>' +
        '</select>' +
        '<textarea id="qp-body" class="ft" placeholder="Write your post..." style="width:100%;min-height:120px;resize:vertical"></textarea>' +
      '</div>' +
      '<button onclick="quickPublishPost()" class="btn bp" style="width:100%;padding:.65rem">Publish to Site &rarr;</button>' +
    '</div>' +

    // ── PUBLISHED POSTS ──────────────────────────────────
    (published.length ?
      '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--muted);text-transform:uppercase;margin-bottom:.65rem">Live on Site ('+published.length+')</div>' +
      '<div style="display:flex;flex-direction:column;gap:.4rem;margin-bottom:1.5rem">' +
      published.map(function(p){
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.65rem .85rem;background:var(--wh);border-radius:3px;border:0.5px solid var(--iv3)">' +
          '<div>' +
            '<div style="font-size:.8rem;font-weight:500;color:var(--ink)">'+escHtml(p.title)+'</div>' +
            '<div style="font-family:var(--fm);font-size:.5rem;color:var(--muted);margin-top:.1rem;letter-spacing:1px;text-transform:uppercase">'+(p.tag||p.cat||'Essay')+' \u00b7 '+fdate(p.date)+'</div>' +
          '</div>' +
          '<button onclick="unpublishPost('+p.id+')" style="background:transparent;border:0.5px solid var(--iv4);border-radius:3px;padding:.22rem .6rem;font-family:var(--fm);font-size:.48rem;color:var(--muted);cursor:pointer;text-transform:uppercase;letter-spacing:1px">Unpublish</button>' +
        '</div>';
      }).join('') +
      '</div>'
    : '') +

    '</div>'
  );
}

function uploadCampaignHero(e){
  var file=e.target.files&&e.target.files[0];
  if(!file)return;
  if(file.size>20*1024*1024){showToast('Image must be under 20MB');return;}
  var r=new FileReader();
  r.onload=function(ev){
    var img=new Image();
    img.onload=function(){
      var MAX=1400;
      var w=img.width,h=img.height;
      if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
      var canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      var dataUrl=canvas.toDataURL('image/jpeg',0.82);
      // save immediately with default position so image shows right away
      try{
        localStorage.setItem('chq-pub-hero',dataUrl);
        localStorage.setItem('chq-pub-hero-pos','50% 18%');
      }catch(ex){
        showToast('Image too large to store \u2014 try a smaller file');
        return;
      }
      showToast('Hero image updated \u2713');
      bCampaignEditor();
      // attempt face detection async to refine crop position
      if('FaceDetector' in window){
        try{
          var fd=new FaceDetector({fastMode:true});
          var done=false;
          fd.detect(canvas).then(function(faces){
            if(done)return; done=true;
            if(faces&&faces.length){
              var f=faces[0].boundingBox;
              var cx=Math.round((f.x+f.width/2)/w*100);
              var cy=Math.round((f.y+f.height*0.1)/h*100);
              localStorage.setItem('chq-pub-hero-pos',cx+'% '+Math.max(5,Math.min(cy,60))+'%');
            }
          }).catch(function(){});
          // safety timeout — if API hangs for 4s, leave default position
          setTimeout(function(){done=true;},4000);
        }catch(ex){}
      }
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(file);
}

function clearCampaignHero(){
  localStorage.removeItem('chq-pub-hero');
  localStorage.removeItem('chq-pub-hero-pos');
  showToast('Reset to default');
  bCampaignEditor();
}

function addGalleryPhotos(e){
  var files=Array.from(e.target.files||[]);
  if(!files.length)return;
  var gallery=lsGet('chq-pub-gallery',[]);
  var loaded=0;
  files.forEach(function(file){
    if(file.size>5*1024*1024){showToast('Skipped file over 5MB');loaded++;if(loaded===files.length)bCampaignEditor();return;}
    var r=new FileReader();
    r.onload=function(ev){
      gallery.push({src:ev.target.result,caption:''});
      loaded++;
      if(loaded===files.length){lsSave('chq-pub-gallery',gallery);showToast('Photo'+(files.length>1?'s':'')+' added \u2713');bCampaignEditor();}
    };
    r.readAsDataURL(file);
  });
}

function removeGalleryPhoto(idx){
  var gallery=lsGet('chq-pub-gallery',[]);
  gallery.splice(idx,1);
  lsSave('chq-pub-gallery',gallery);
  bCampaignEditor();
}

function updateGalleryCaption(idx,val){
  var gallery=lsGet('chq-pub-gallery',[]);
  if(gallery[idx])gallery[idx].caption=val;
  lsSave('chq-pub-gallery',gallery);
}

function saveCampaignText(key,val){
  var t=lsGet('chq-pub-text',{});
  t[key]=val;
  lsSave('chq-pub-text',t);
}

function saveCampaignTextAll(){
  var section=document.getElementById('camp-text-section');
  if(!section)return;
  var t=lsGet('chq-pub-text',{});
  section.querySelectorAll('[data-ctkey]').forEach(function(el){
    t[el.getAttribute('data-ctkey')]=el.value;
  });
  lsSave('chq-pub-text',t);
  showToast('Site text saved \u2713');
}

function quickPublishPost(){
  var title=(g('qp-title').value||'').trim();
  var body=(g('qp-body').value||'').trim();
  var cat=g('qp-cat').value||'energy';
  if(!title||!body){showToast('Title and body required');return;}
  var catLabels={energy:'Clean Energy',fashion:'Fashion Accountability',wellness:'Beauty & Wellness',fitness:'Fitness & Movement',morenita:'Library of Morenita',solarpunk:'Solarpunk'};
  var posts=lsGet('chq-po',[]);
  posts.push({id:Date.now(),title:title,body:body,cat:cat,tag:catLabels[cat]||cat,status:'published',date:new Date().toISOString().split('T')[0]});
  lsSave('chq-po',posts);
  S.posts=posts;
  showToast('Published \u2713');
  bCampaignEditor();
}

function unpublishPost(id){
  var posts=lsGet('chq-po',[]);
  var p=posts.find(function(x){return x.id===id;});
  if(p)p.status='draft';
  lsSave('chq-po',posts);
  S.posts=posts;
  showToast('Moved to drafts');
  bCampaignEditor();
}

function getBriefAlerts(){
  var alerts=[];
  var today=new Date().toISOString().split('T')[0];
  // Today's calendar events
  var todayEvs=(S.calEvents||[]).filter(function(e){return e.date===today;});
  if(todayEvs.length) alerts.push('<span style="font-family:var(--fm);font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;padding:.2rem .65rem;border-radius:20px;background:rgba(201,168,76,.15);color:rgba(201,168,76,.85);border:0.5px solid rgba(201,168,76,.3)">'+todayEvs.length+' event'+(todayEvs.length>1?'s':'')+' today</span>');
  // Sponsors in meeting
  var meetings=(S.sponsors||[]).filter(function(s){return s.status==='meeting';});
  if(meetings.length) alerts.push('<span style="font-family:var(--fm);font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;padding:.2rem .65rem;border-radius:20px;background:rgba(90,138,82,.12);color:var(--sg2);border:0.5px solid rgba(90,138,82,.25)">'+meetings.length+' meeting'+(meetings.length>1?'s':'')+' set</span>');
  // Undone todos
  var myTodos=(S.todos&&S.todos.amelia)||[];
  var undone=myTodos.filter(function(t){return !t.done;});
  if(undone.length) alerts.push('<span style="font-family:var(--fm);font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;padding:.2rem .65rem;border-radius:20px;background:rgba(152,128,200,.1);color:var(--lv2);border:0.5px solid rgba(152,128,200,.2)">'+undone.length+' open task'+(undone.length>1?'s':'')+'</span>');
  return alerts.join('');
}

// ═══ PREVIOUSLY MISSING FUNCTIONS ══════════════════════════════

function toggleSearch(){
  var el=g('search-overlay');
  if(!el)return;
  var visible=el.style.display!=='none';
  el.style.display=visible?'none':'block';
  if(!visible){var inp=g('search-input');if(inp){inp.value='';inp.focus();}g('search-results').innerHTML='';}
}

function runSearch(val){
  var out=g('search-results');if(!out)return;
  val=(val||'').toLowerCase().trim();
  if(!val){out.innerHTML='';return;}
  var results=[];
  (S.sponsors||[]).forEach(function(s){if((s.name||'').toLowerCase().indexOf(val)>=0||(s.industry||'').toLowerCase().indexOf(val)>=0)results.push({label:s.name,sub:s.industry||s.status,action:"showPanel('sponsors')"});});
  (S.posts||[]).forEach(function(p){if((p.title||'').toLowerCase().indexOf(val)>=0||(p.body||'').toLowerCase().indexOf(val)>=0)results.push({label:p.title,sub:'Essay · '+(p.status||'draft'),action:"showPanel('library')"});});
  (S.calEvents||[]).forEach(function(e){if((e.title||'').toLowerCase().indexOf(val)>=0)results.push({label:e.title,sub:'Event · '+e.date,action:"showPanel('calendar')"});});
  if(!results.length){out.innerHTML='<div style="color:rgba(216,212,236,.45);font-family:var(--fb);font-size:.8rem;padding:.5rem">No results for "'+val+'"</div>';return;}
  out.innerHTML=results.slice(0,12).map(function(r){
    return '<div onclick="toggleSearch();'+r.action+'" style="background:rgba(255,255,255,.07);border-radius:3px;padding:.6rem .85rem;cursor:pointer;border:1px solid rgba(216,212,236,.1)">' +
      '<div style="font-family:var(--fb);font-size:.82rem;color:var(--ch)">'+r.label+'</div>' +
      '<div style="font-family:var(--fm);font-size:.55rem;color:rgba(216,212,236,.45);margin-top:.15rem">'+r.sub+'</div></div>';
  }).join('');
}

function toggleQC(){
  var el=g('qc-overlay');if(!el)return;
  var visible=el.style.display!=='none';
  el.style.display=visible?'none':'block';
  if(!visible){var t=g('qc-text');if(t){t.value='';t.focus();}}
}

function submitQC(){
  var text=(g('qc-text').value||'').trim();
  if(!text)return;
  var board=lsGet('chq-board',{columns:[]});
  if(!Array.isArray(board.columns)) board.columns=[];
  var general=board.columns.find(function(c){return c.id==='general';});
  if(!general){general={id:'general',title:'General / Notes',color:'var(--bl2)',cards:[]};board.columns.push(general);}
  if(!Array.isArray(general.cards)) general.cards=[];
  general.cards.push({id:Date.now(),text:text,author:S.role,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})});
  lsSave('chq-board',board);
  showToast('Added to Discussion →');
  toggleQC();
}

function addWorkout(){
  var day=g('wk-day').value;
  var focus=(g('wk-focus').value||'').trim();
  if(!focus)return;
  var rawEx=(g('wk-exercises').value||'').trim();
  var exercises=rawEx?rawEx.split('\n').map(function(line){
    var parts=line.split('·');
    return {name:(parts[0]||'').trim(),sets:(parts[1]||'').trim()};
  }).filter(function(e){return e.name;}):[];
  var notes=(g('wk-notes').value||'').trim();
  S.workouts.push({id:Date.now(),day:day,focus:focus,exercises:exercises,notes:notes});
  lsSave('chq-wk',S.workouts);
  closeM('m-workout');
  ['wk-focus','wk-exercises','wk-notes'].forEach(function(id){var el=g(id);if(el)el.value='';});
  bBody();
}

function deleteCalEvent(){
  if(!S._editingEvId)return;
  S.calEvents=S.calEvents.filter(function(e){return e.id!==S._editingEvId;});
  S._editingEvId=null;
  lsSave('chq-ce',S.calEvents);
  var sb=document.querySelector('#m-ev .btn.bp');if(sb)sb.textContent='Save';
  closeM('m-ev');
  bCalendar();
}

function saveLookbookData(){
  var bio=(g('lb-bio').value||'').trim();
  lsSave('chq-lb-bio',bio);
  showToast('Portfolio saved');
}

function toggleInboxTag(el){
  var active=el.classList.contains('active');
  document.querySelectorAll('.inbox-tag-btn').forEach(function(b){b.classList.remove('active');b.style.background='transparent';b.style.color='var(--wg)';b.style.borderColor='var(--du)';});
  if(!active){el.classList.add('active');el.style.background='var(--tz5)';el.style.color='var(--tz3)';el.style.borderColor='var(--tz3)';}
}

function sendInbox(){
  var text=(g('inbox-compose').value||'').trim();
  if(!text)return;
  var activeTag=document.querySelector('.inbox-tag-btn.active');
  var tag=activeTag?activeTag.dataset.tag:null;
  var inbox=lsGet('chq-inbox',[]);
  inbox.push({id:Date.now(),from:S.role,text:text,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),tag:tag,readBy:[S.role]});
  lsSave('chq-inbox',inbox);
  g('inbox-compose').value='';
  document.querySelectorAll('.inbox-tag-btn').forEach(function(b){b.classList.remove('active');b.style.background='transparent';b.style.color='var(--wg)';b.style.borderColor='var(--du)';});
  bInbox();
}

