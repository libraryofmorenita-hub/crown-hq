

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
  'chq-social':'social',
  'chq-inbox':'inbox',
  'chq-fitness':'fitness',
  'chq-peace':'peace',
  'chq-role-pages':'role_pages',
  'chq-contacts':'contacts'
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
  var kvKeys=['goals','todos','answers','brand','adv','gd','timeline','appts','mood','dashMood','quiz','pitch','board','lookbook_imgs','lookbook_links','lookbook_bio','social','inbox','fitness','peace','role_pages','contacts'];
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
    if(kv.social)lsWriteLocal('chq-social',kv.social);
    if(kv.inbox)lsWriteLocal('chq-inbox',kv.inbox);
    if(kv.fitness)lsWriteLocal('chq-fitness',kv.fitness);
    if(kv.peace)lsWriteLocal('chq-peace',kv.peace);
    if(kv.role_pages)lsWriteLocal('chq-role-pages',kv.role_pages);
    if(kv.contacts)lsWriteLocal('chq-contacts',kv.contacts);
    SB_SYNC_SUSPENDED=false;
  }).catch(function(e){SB_SYNC_SUSPENDED=false;console.log('Supabase load failed',e);});
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
function lsSave(k,v){
  lsWriteLocal(k,v);
  if(SB_SYNC_SUSPENDED)return;
  if(k==='chq-sp')sbSaveSponsors();
  else if(k==='chq-ce')sbSaveEvents();
  else if(k==='chq-po')sbSavePosts();
  else if(k==='chq-lk')sbSaveLooks();
  else if(k==='chq-wk')sbSaveWorkouts();
  else if(k==='chq-ms')sbSaveMessages();
  else if(k==='chq-gl')sbSaveKV('goals',v);
  else if(k==='chq-td')sbSaveKV('todos',v);
  else if(k==='chq-an')sbSaveKV('answers',v);
  else if(k==='chq-br')sbSaveKV('brand',v);
  else if(k==='chq-adv')sbSaveKV('adv',v);
  else if(k==='chq-gd')sbSaveKV('gd',v);
  else if(k==='chq-timeline')sbSaveKV('timeline',v);
  else if(SB_KV_MAP[k])sbSaveKV(SB_KV_MAP[k],v);
}
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

// ═══ SEED DATA ═══════════════════════════════════════════════
function seed(){
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
      {id:2,date:'2026-03-26',time:'07:00',title:'Strength + Posture',who:'Fitness Trainer',type:'fitness',notes:'Glutes, core, back. 75 min.'},
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
    {id:1,title:'The Morning That Changes Everything',tag:'Beauty & Wellness',cat:'wellness',date:'2026-03-21',status:'published',cover:'',body:'<div class="mag-hero">The Morning That<br>Changes <em>Everything</em></div><div class="mag-byline">By Amelia Arabe · Beauty & Wellness · March 2026</div><p class="mag-drop">I used to think my mornings were the problem. Too scattered, too ambitious, too many tabs open in my head before I even made coffee. I have ADHD, which means my brain moves fast and my hands sometimes forget to follow. But I have learned something important: structure is not the enemy of freedom. Structure is what makes freedom possible.</p><div class="mag-pq">"A beautiful day starts with a beautiful morning. Non-negotiable."</div><p>My morning does not begin with my phone. It begins with water — a full glass before anything else. Then I make something beautiful to eat. Not elaborate. Beautiful. There is a difference. A sliced mango arranged on a white plate. Eggs cooked slowly with herbs. Matcha in my favorite cup. I am a breakfast girl. I take it seriously.</p><p>After breakfast, I rotate through my hobbies. Not all of them every day — that would be chaos. But I have learned to anchor my mornings with at least one creative practice. Monday is cello. Tuesday is drawing. Wednesday is voice warm-ups. Thursday is painting. Friday is photography. The weekends are ocean days when possible — freediving, snorkeling, just being near the water that inspires everything I make.</p><p>Then movement. Pilates or yoga for posture and core. Tennis for joy and stamina. Walking always. The body is the instrument. I treat it like one.</p>'},
    {id:2,title:'SB 707 and What It Actually Means for Fashion',tag:'Fashion Accountability',cat:'fashion',date:'2026-03-19',status:'published',cover:'',body:'<div class="mag-hero">SB 707 and What<br>It Actually <em>Means</em></div><div class="mag-byline">By Amelia Arabe · Fashion Accountability · March 2026</div><p class="mag-drop">Fashion is the second most polluting industry on Earth. I say this not to be dramatic but because it is a fact I cite constantly and I believe in citing facts correctly. Ten percent of global carbon emissions. Eighty-five percent of textiles end up in landfills. The fashion industry uses 93 billion cubic meters of water annually. These numbers are not abstractions. They are the cost of what we wear.</p><div class="mag-pq">"Every garment has a carbon cost. I advocate for the policy that makes brands pay it — not the planet."</div><p>SB 707 — the Responsible Textile Producer Program — is California\'s answer to this. It is an Extended Producer Responsibility law. What that means in plain language: the brands that make the clothes become financially responsible for what happens when those clothes are no longer worn. The cost of textile waste management shifts from California taxpayers to the companies creating the waste.</p><p>This is not a punishment for fashion. It is an incentive to design differently. When waste becomes expensive, longevity becomes profitable. When disposal costs money, circularity makes sense. SB 707 does not tell brands what to design. It changes what makes good business sense to design.</p><p>As an engineer, I find this elegant. You do not have to convince every designer to care about the planet. You change the economic structure so that caring about the planet is the rational choice.</p>'},
    {id:3,title:'SB 100 and the Bridge to Lived Reality',tag:'Clean Energy & EV Policy',cat:'energy',date:'2026-03-17',status:'published',cover:'',body:'<div class="mag-hero">SB 100 and the<br>Bridge to <em>Lived Reality</em></div><div class="mag-byline">By Amelia Arabe · Clean Energy Policy · March 2026</div><p class="mag-drop">California passed SB 100 in 2018. It mandated 100 percent clean energy by 2045. This is law. Not aspiration — law. And yet the gap between what the law requires and what people experience in their daily lives remains enormous. That gap is where I work. That gap is my platform.</p><div class="mag-pq">"SB 100 is law. Net-zero is the target. My platform is the bridge between legislation and lived reality."</div><p>Polyester makes up 65 percent of all clothing manufactured globally. It is derived from crude oil. The textile mills that produce it are among the most energy-intensive manufacturing facilities in existence. A transition to renewable energy in those mills is not a fashion story. It is an energy story. It is a climate story. It is the story of what SB 100 actually means when you follow it downstream into the supply chains that shape what we wear.</p><p>Green-collar jobs are the economic argument. California positioning itself as the clean fashion capital of North America is the industry argument. And the moral argument is simple: we already have the technology. Solar-powered mills exist. Bio-based fibers exist. ECONYL regeneration exists. The problem is not technical. It is political will, investment, and the courage to connect the dots.</p>'},
    {id:4,title:'A Solarpunk Glossary for the Uninitiated',tag:'Solarpunk & Sustainable Tech',cat:'solarpunk',date:'2026-03-15',status:'published',cover:'',body:'<div class="mag-hero">A Solarpunk Glossary<br>for the <em>Uninitiated</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita · March 2026</div><p class="mag-drop">Solarpunk is an aesthetic and a political project. It imagines futures that are not dystopian. This seems simple. It is not. Most science fiction about the future imagines collapse, hierarchy, scarcity. Solarpunk imagines abundance, community, beauty. It asks: what if the future was actually good? And then it tries to build it.</p><div class="mag-pq">"I am not describing a utopia. I am describing a building permit."</div><p><strong>Circular economy</strong> — a system where waste from one process becomes input for another. Nothing discarded; everything cycled. The opposite of our current linear model of take, make, dispose.</p><p><strong>ECONYL</strong> — a regenerated nylon fiber made from ocean plastic waste, fishing nets, fabric scraps. My swimsuit of choice for competition. It is beautiful and it has a story.</p><p><strong>Bio-based fiber</strong> — textiles derived from plant sources rather than petroleum. Linen, hemp, organic cotton, Tencel from eucalyptus wood pulp. Each with different properties, different tradeoffs, different futures.</p><p><strong>Extended Producer Responsibility (EPR)</strong> — a policy framework that makes manufacturers responsible for the end-of-life management of their products. SB 707 is an EPR law. It is the policy mechanism that makes circular economy possible at scale.</p>'},
    {id:5,title:'The Athlete Body as an Art Form',tag:'Fitness & Movement',cat:'fitness',date:'2026-03-13',status:'published',cover:'',body:'<div class="mag-hero">The Athlete Body<br>as an <em>Art Form</em></div><div class="mag-byline">By Amelia Arabe · Fitness & Movement · March 2026</div><p class="mag-drop">I want an athlete body. I say this without apology. I want to be strong. I want stamina. I want the kind of physical ease that comes from consistent training over time — the ease that lets you walk across a stage in heels after a full day of competition without your posture collapsing. I want to swim in the ocean without tiring. I want to serve an ace.</p><div class="mag-pq">"Train like an athlete. Move like an artist. The body is the instrument."</div><p>My movement practice has five pillars. Pilates for core, posture, and the long lean strength that photographs beautifully. Tennis for joy, stamina, and the competitive edge that transfers to everything. Yoga for flexibility, breath, and the stillness that makes presence possible. Swimming for full-body conditioning and the connection to water that feeds my soul. And walking — always walking — because it is the practice that clears my head and gives me my best ideas.</p><p>I do not train to punish my body. I train to know what it can do. There is a difference, and it took me a long time to learn it. The athlete body I want is not an aesthetic project alone. It is a capacity project. I want to be capable. Capable of competing. Capable of performing. Capable of carrying myself through whatever the next stage of my life requires.</p>'},
    {id:6,title:'The Library of Alexandria Rebuilt',tag:'Library of Morenita',cat:'morenita',date:'2026-03-10',status:'published',cover:'',body:'<div class="mag-hero">The Library of<br>Alexandria <em>Rebuilt</em></div><div class="mag-byline">By Amelia Arabe · Library of Morenita · March 2026</div><p class="mag-drop">The Library of Alexandria was the most important knowledge repository of the ancient world. Scholars traveled from across the Mediterranean to read there. It held works by Euclid, Archimedes, Sophocles, hundreds of thousands of scrolls. Then it burned. Not once but several times over centuries, each fire taking something irreplaceable.</p><div class="mag-pq">"Cultural infrastructure for the next century. The kind that does not burn."</div><p>Library of Morenita is my answer to that problem. It is a sustainable digital archive — sustainable meaning it is designed to last, to be maintained, to survive the fires that consume most creative work. Most of what artists and thinkers produce disappears. It goes unpublished, unshared, unseen. It exists on hard drives that fail and in notebooks that get lost and in conversations that no one recorded.</p><p>I am building something that does not burn. A place for ideas, for research, for the writing and music and visual work of people whose names the world does not know yet. I am the founding editor and curator. I am also, inevitably, one of the first subjects — building the infrastructure by becoming an example of what the infrastructure can hold.</p><p>The Morenita Prototype, my journal calls it. Amelia Arabe is building the infrastructure for the next generation of renaissance leaders — she is proving it works by becoming one.</p>'},
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
var PASSWORDS={amelia:'serph',laneea:'withlove'};
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

// ═══ ROLES ═══════════════════════════════════════════════════
var ROLES={
  amelia:{name:'Amelia Arabe',abbr:'AA',color:'var(--ch)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'dashboard'},
      {ico:'📚',lbl:'Library',id:'library'},
      {ico:'💰',lbl:'Sponsors',id:'sponsors',badge:true},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'🎤',lbl:'Interview Prep',id:'quiz'},
      {ico:'📣',lbl:'Advocacy',id:'advocacy'},
      {ico:'🖼',lbl:'Mood Board',id:'moodboard'},
      {ico:'👗',lbl:'Looks',id:'looks'},
      {ico:'💪',lbl:'Fitness',id:'fitness'},
      {ico:'🕊',lbl:'Peace',id:'peace'},
      {ico:'📱',lbl:'Social Media',id:'social'},
      {ico:'📬',lbl:'Inbox',id:'inbox'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
      {ico:'🔗',lbl:'Lookbook',id:'lookbook'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['timeline','sponsors','looks','brand','dashboard','workouts','appointments','goals','todos','library']
  },
  laneea:{name:'Laneea Love',abbr:'LL',color:'var(--lv)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'laneea-dash'},
      {ico:'💰',lbl:'Sponsors',id:'sponsors',badge:true},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'👗',lbl:'Looks & Styling',id:'looks'},
      {ico:'🖼',lbl:'Mood Board',id:'moodboard'},
      {ico:'📬',lbl:'Inbox',id:'inbox'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
      {ico:'🔗',lbl:'Lookbook',id:'lookbook'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['sponsors','looks','appointments','todos']
  },
  hmu:{name:'Hair & Makeup',abbr:'HM',color:'var(--bl)',
    nav:[
      {ico:'🏠',lbl:'Dashboard',id:'hmu-dash'},
      {ico:'👗',lbl:'Event Looks',id:'looks'},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'🖼',lbl:'Inspiration',id:'moodboard'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
    ],
    editable:['looks','todos']
  },
  trainer:{name:'Trainer',abbr:'TR',color:'var(--sg)',
    nav:[
      {ico:'💪',lbl:'Fitness',id:'fitness'},
      {ico:'📅',lbl:'Calendar',id:'calendar'},
      {ico:'🗂',lbl:'Discussion',id:'board'},
    ],
    editable:['workouts','todos']
  },
  sponsor:{name:'Sponsor',abbr:'SP',color:'var(--ch3)',
    nav:[
      {ico:'🏠',lbl:'My Portal',id:'sponsor-portal'},
      {ico:'📋',lbl:'Deliverables',id:'deliverables'},
      {ico:'📊',lbl:'Progress',id:'comp-progress'},
    ],
    editable:[]
  },
  contributor:{name:'Contributor',abbr:'CO',color:'var(--tz4)',
    nav:[
      {ico:'📚',lbl:'Library',id:'library'},
      {ico:'🖼',lbl:'Mood Board',id:'moodboard'},
      {ico:'📁',lbl:'Files',id:'files'},
    ],
    editable:['library','todos']
  }
};

// ═══ LOGIN/LOGOUT ═════════════════════════════════════════════
function doLogin(role){
  S.role=role;
  seed();
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('on');
  var r=ROLES[role];
  g('tb-av').textContent=r.abbr;
  g('tb-av').style.background=r.color;
  g('tb-un').textContent=r.name;
  g('tb-date').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase();
  buildSB(r.nav);
  loadFromSupabase().then(function(){showPanel(r.nav[0].id);});
  // show edit btn if editable
  var eb=g('em-btn');
  if(eb) eb.style.display=(r.editable&&r.editable.length)?'block':'none';
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  if(days<=30) document.body.classList.add('countdown-urgent');
  else document.body.classList.remove('countdown-urgent');
  var cd=g('sb-countdown');if(cd)cd.textContent=days;
  var pg=g('sb-prog');if(pg)pg.style.width=Math.min(100,Math.round(((112-days)/112)*100))+'%';
  var rn=g('sb-role-name');if(rn)rn.textContent=r.name;
}

function doSwitch(){
  S.role=null; S.emActive=false;
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
var PANELS={
  'dashboard':bDash,'laneea-dash':bLaneaDash,'hmu-dash':bHMUDash,
  'sponsor-portal':bSponsorPortal,'sponsors':bSponsors,'calendar':bCalendar,
  'library':bLibrary,'quiz':bQuiz,'brand':bBrand,'moodboard':bMoodboard,
  'looks':bLooks,'fitness':bFitness,'messages':bMessages,'files':bFiles,
  'deliverables':bDeliverables,'comp-progress':bCompProgress,'advocacy':bAdvocacy,'board':bBoard,'lookbook':bLookbook,'social':bSocial,'inbox':bInbox,'peace':bPeace
};

function showPanel(id,navEl){
  document.querySelectorAll('.nav-i').forEach(function(n){n.classList.remove('on');});
  if(navEl) navEl.classList.add('on');
  else{var n=g('ni-'+id);if(n)n.classList.add('on');}
  g('main').innerHTML='';
  if(PANELS[id]) PANELS[id]();
  else bPlaceholder(id);
  closeSB();
  if(S.emActive) setTimeout(applyEM,80);
}

// ═══ HELPERS ══════════════════════════════════════════════════
function g(id){return document.getElementById(id);}
function inject(html){g('main').innerHTML=html;}
function rerenderKeepScroll(renderFn){
  var main=g('main');
  var top=main?main.scrollTop:0;
  renderFn();
  if(main){
    main.scrollTop=top;
    requestAnimationFrame(function(){main.scrollTop=top;});
  }
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
    '<div class="reg-head">Miss Temecula USA 2026 confirmed</div>' +
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
    {dot:'var(--du)',date:'Jul 10',text:'Miss Temecula USA 2026',idx:5},
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
    '<div class="oath-text" data-e="oath:seraphim:text">'+(goals.oath||'Miss Temecula USA 2026. Miss California USA 2026. Miss USA. Miss Universe. I am not competing. I am arriving.')+'</div>' +
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
  var rp=getRolePages().laneea;
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  bPlaceholderDash('laneea',
    rp.quote,
    '<div class="g3">' +
    '<div class="stat st-ch"><div class="sn">$'+raised.toLocaleString()+'</div><div class="sl">Raised</div></div>' +
    '<div class="stat st-tz"><div class="sn">'+S.sponsors.filter(function(s){return s.status==='meeting';}).length+'</div><div class="sl">Meetings Set</div></div>' +
    '<div class="stat st-bl"><div class="sn">'+S.appts.length+'</div><div class="sl">Appointments</div></div>' +
    '</div>'
  );
}

function bHMUDash(){
  var rp=getRolePages().hmu;
  bPlaceholderDash('hmu',
    rp.quote,
    '<div style="background:var(--tz);border-radius:11px;padding:1.25rem">' +
    rp.schedule.map(function(t,idx){
      return '<div style="display:grid;grid-template-columns:48px 1fr;gap:.75rem;padding:.55rem 0;border-bottom:1px solid rgba(240,216,152,.07)">' +
        '<span style="font-family:var(--fm);font-size:.58rem;color:var(--ch2)" data-e="rolepage:hmu:date'+idx+'">'+t.date+'</span>' +
        '<div><div style="font-size:.82rem;font-weight:600;color:var(--wh)" data-e="rolepage:hmu:ev'+idx+'">'+t.ev+'</div><div style="font-size:.72rem;color:var(--ch)" data-e="rolepage:hmu:look'+idx+'">'+t.look+'</div></div></div>';
    }).join('') +
    '</div>'
  );
}

function bSponsorPortal(){
  inject(
    '<div style="padding:0">' +
    '<div style="background:var(--tz);padding:2rem 1.75rem">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:4px;color:rgba(240,216,152,.35);text-transform:uppercase;margin-bottom:.5rem">Sponsor Portal</div>' +
    '<div style="font-family:var(--fd);font-size:1.8rem;font-style:italic;color:var(--ch);margin-bottom:.65rem">You are not sponsoring a pageant.<br>You are funding a platform.</div>' +
    '<div style="font-size:.82rem;line-height:1.8;color:rgba(254,252,247,.6)">Thank you for investing in Amelia Arabe\'s Miss Temecula USA 2026 campaign. Your support puts clean energy and fashion accountability policy on a national stage. We are honored to have you in this room with us.</div>' +
    '<div style="font-family:var(--fm);font-size:.55rem;color:rgba(240,216,152,.3);margin-top:.85rem">— Amelia Arabe & Laneea Love</div>' +
    '</div>' +
    '<div style="padding:1.35rem 1.75rem">' +
    '<div class="g2">' +
    '<div><div class="cl">Your Deliverables</div>'+buildDelivCards()+'</div>' +
    '<div class="card"><div class="cl">Competition Progress</div>' +
    [{label:'Entry Secured',done:true,note:'Miss Temecula USA 2026'},{label:'Coach Engaged',done:true,note:'Weekly sessions'},{label:'Wardrobe In Progress',done:false,note:'With Laneea'},{label:'YouTube Channel Launch',done:false,note:'Starting from 0'},{label:'Competition Week',done:false,note:'July 10-12 · Grand Hyatt Indian Wells'}].map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--du)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong>'+p.note+'</div></div>';
    }).join('') +
    '</div>' +
    '</div>' +
    '</div></div>'
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
  html += '<table class="sp-tbl"><thead><tr><th>Company</th><th>Ask</th><th>Status</th><th>Notes</th><th></th></tr></thead>';
  html += '<tbody>'+renderSpRows()+'</tbody></table>';
  html += '</div>';
  return html;
}

function bSponsors(){
  var spTab=window._spTab||'tracker';
  var raised=S.sponsors.filter(function(s){return s.status==='closed';}).reduce(function(a,s){return a+(s.amount||0);},0);
  var tabBar='<div style="display:flex;gap:0;border-bottom:2px solid var(--ch4);background:var(--wh);padding:0 1.75rem;flex-shrink:0">';
  var spTabs=[{t:'tracker',l:'Pipeline'},{t:'pitch',l:'Pitch Decks'},{t:'emails',l:'Email Templates'},{t:'objections',l:'Objections'}];
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
    cold:{subject:'An invitation — Amelia Arabe x [Company]',body:'Hi [Name], My name is Laneea Love — I manage Amelia Arabe, Miss Temecula USA 2026 candidate. Her platform is clean energy and textile accountability policy. Would you be open to a 15-minute call? With gratitude, Laneea Love'},
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

function bLibrary(){
  var cats=Object.keys(libCats);
  inject(
    '<div class="ph"><div><div class="ph-tag">Library of Morenita</div><div class="ph-title">The <em>Library</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="newPost()">+ New Article</button></div></div>' +
    '<div class="pb">' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.85rem;flex-wrap:wrap">' +
    '<button class="cal-tab '+(libCatFilter==='all'?'on':'')+'" onclick="libCatFilter=\'all\';bLibrary()">All</button>' +
    cats.map(function(c){return '<button class="cal-tab '+(libCatFilter===c?'on':'')+'" onclick="libCatFilter=\''+c+'\';bLibrary()">'+libCats[c].lbl+'</button>';}).join('') +
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
    '<button class="btn bg" onclick="bLibrary()" style="flex-shrink:0">← Library</button>' +
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
  var btn=g('post-status-btn');if(btn)btn.textContent=p.status==='published'?'Published':'Draft';
  lsSave('chq-po',S.posts);
  showToast('Status updated');
}
function savePost(){
  var p=S.posts.find(function(x){return x.id===S.editingPostId;});
  var body=g('ed-body'),title=g('post-title');
  if(p&&body)p.body=body.innerHTML;
  if(p&&title)p.title=title.value;
  lsSave('chq-po',S.posts);
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
  li:{head:'li',title:'LinkedIn Headline',platform:'LinkedIn',text:"Student Engineer · Net-Zero Hardware Design · Founder, Library of Morenita · Miss Temecula USA 2026 · San Diego"},
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
      return '<div class="look-card">' +
        '<div class="look-img">' +
        (l.img?'<img src="'+l.img+'" alt="'+l.title+'">' :
        '<div class="look-add-img"><label style="cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.3rem;color:var(--wg)">' +
        '<input type="file" accept="image/*" style="display:none" onchange="setLookImg('+l.id+',event)">' +
        '<div style="font-size:1.4rem">📷</div>' +
        '<div style="font-family:var(--fm);font-size:.55rem;letter-spacing:1px;text-transform:uppercase">Add image</div>' +
        '</label></div>') +
        '</div>' +
        '<div class="look-body">' +
        '<div class="look-ev" data-e="look:'+l.id+':event">'+l.event+'</div>' +
        '<div class="look-title" data-e="look:'+l.id+':title">'+l.title+'</div>' +
        '<div class="look-desc" data-e="look:'+l.id+':desc">'+l.desc+'</div>' +
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
function addLook(){S.looks.push({id:Date.now(),event:'New Event',round:'Competition',title:'New Look',desc:'Describe this look...',img:''});lsSave('chq-lk',S.looks);bLooks();}
function removeLook(id){S.looks=S.looks.filter(function(x){return x.id!==id;});lsSave('chq-lk',S.looks);bLooks();}

// ═══ FITNESS ═════════════════════════════════════════════════
function bFitness(){
  var saved=lsGet('chq-fitness',null)||{};
  var fd={
    days:saved.days&&typeof saved.days==='object'?saved.days:{},
    measurements:saved.measurements&&typeof saved.measurements==='object'?saved.measurements:{},
    nutrition:saved.nutrition&&typeof saved.nutrition==='object'?saved.nutrition:{},
    rituals:saved.rituals&&typeof saved.rituals==='object'?saved.rituals:{},
    weight:saved.weight||'',
    quit:saved.quit&&typeof saved.quit==='object'?saved.quit:{}
  };
  lsWriteLocal('chq-fitness',fd);

  var today=new Date().toLocaleDateString('en-US',{weekday:'short'}).toLowerCase();
  var daysClean=0;
  if(fd.quit&&fd.quit.startDate){
    daysClean=Math.floor((new Date()-new Date(fd.quit.startDate))/(1000*60*60*24));
  }

  var split=[
    {day:'Mon',key:'mon',focus:'Core Circuit',color:'var(--tz3)',exercises:[
      {name:'Dead Bugs',sets:'3x12',note:'Lower back flat. This builds the corset.'},
      {name:'Hollow Body Hold',sets:'3x30s',note:'Ribs down. The waist wraps here.'},
      {name:'Pallof Press',sets:'3x12 each',note:'Anti-rotation. Builds the taper.'},
      {name:'Side Plank + Hip Dip',sets:'3x15 each',note:'Obliques. This is the curve.'},
      {name:'Single Leg RDL',sets:'3x10 each',note:'Balance + posterior chain.'},
      {name:'Bicycle Crunch',sets:'3x20',note:'Controlled. Elbow to knee.'},
    ]},
    {day:'Tue',key:'tue',focus:'Swim',color:'var(--bl2)',exercises:[
      {name:'Freestyle Laps',sets:'20 min',note:'Long and lean. Think elongation.'},
      {name:'Butterfly Arms',sets:'4x25m',note:'Shoulders and lats. Creates the V-taper.'},
      {name:'Kickboard Legs',sets:'4x25m',note:'Quads and glutes activated.'},
      {name:'Cool Down Float',sets:'5 min',note:'Breathe. Let your body reset.'},
    ]},
    {day:'Wed',key:'wed',focus:'Legs + Barre',color:'var(--sg2)',exercises:[
      {name:'Bulgarian Split Squat',sets:'4x10 each',note:'Rear foot elevated. Go deep.'},
      {name:'Glute Bridge + Hold',sets:'4x15',note:'Squeeze at top 2 seconds.'},
      {name:'Lateral Band Walks',sets:'3x20 each way',note:'Band above knees. Burn.'},
      {name:'Relevé Holds',sets:'3x30s',note:'Ballet. Calves and balance.'},
      {name:'Arabesque Pulses',sets:'3x20 each',note:'Glute and hip flexor length.'},
      {name:'Plié Squats',sets:'3x15',note:'Turnout. Inner thigh activation.'},
    ]},
    {day:'Thu',key:'thu',focus:'Tennis',color:'var(--ch2)',exercises:[
      {name:'Serve Practice',sets:'20 min',note:'Shoulder rotation. Core drives power.'},
      {name:'Footwork Drills',sets:'15 min',note:'Explosive lateral movement.'},
      {name:'Rally Sets',sets:'3 sets',note:'Cardio base. Rotational core.'},
      {name:'Cool Down Stretch',sets:'10 min',note:'Hip flexors and shoulders.'},
    ]},
    {day:'Fri',key:'fri',focus:'Arms + Core',color:'var(--lv2)',exercises:[
      {name:'Port de Bras with Weights',sets:'3x12',note:'Ballet arms. 2-3lb. Slow and deliberate.'},
      {name:'Swimmer Lat Pulldown',sets:'4x12',note:'V-taper. Waist looks smaller instantly.'},
      {name:'Overhead Press',sets:'3x10',note:'Shoulders and posture.'},
      {name:'Tricep Dip',sets:'3x12',note:'Back of arm. Lean and sculpted.'},
      {name:'Resistance Band Row',sets:'3x15',note:'Posture muscles. Stage presence.'},
      {name:'Plank to Downdog',sets:'3x10',note:'Core + shoulder mobility.'},
    ]},
    {day:'Sat',key:'sat',focus:'Swim + Ballet',color:'var(--ir2)',exercises:[
      {name:'Freestyle Endurance',sets:'30 min',note:'Build your base. Think long.'},
      {name:'Full Barre',sets:'45-60 min',note:'YouTube barre counts. Non-negotiable.'},
      {name:'Stretching Flow',sets:'15 min',note:'Hips, hamstrings, shoulders.'},
    ]},
    {day:'Sun',key:'sun',focus:'Active Recovery',color:'var(--du)',exercises:[
      {name:'Ocean or Beach Walk',sets:'30-45 min',note:'Clear your head. This is medicine.'},
      {name:'Yoga Flow',sets:'20 min',note:'YouTube. Any beginner flow.'},
      {name:'Full Body Stretch',sets:'15 min',note:'Every muscle. Breathe into it.'},
    ]},
  ];

  inject(
    '<div class="ph"><div><div class="ph-tag">Miss Universe Campaign</div><div class="ph-title">Body by <em>Design</em></div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="saveFitnessLog()">Save</button></div></div>' +
    '<div class="pb">' +

    // VISION
    '<div style="background:var(--tz);border-radius:3px;padding:1.35rem;margin-bottom:.85rem;position:relative;overflow:hidden">' +
    '<div style="position:absolute;top:-30%;right:-10%;width:50%;height:200%;background:radial-gradient(circle,rgba(240,216,152,.05) 0%,transparent 65%);pointer-events:none"></div>' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.3rem">The Vision</div>' +
    '<div style="font-family:var(--fd);font-size:1.15rem;font-style:italic;color:var(--ch);line-height:1.6">Strong core. Tiny waist. Ballet arms.<br>Swimmer shoulders. Tennis legs.<br>The body that walks into Miss Universe.</div>' +
    '</div>' +

    // STATS
    '<div class="g4" style="margin-bottom:.85rem">' +
    '<div class="stat st-sg"><div class="sn">'+(daysClean||0)+'</div><div class="sl">Days Clear</div></div>' +
    '<div class="stat st-tz"><div style="font-family:var(--fd);font-size:1.5rem;font-style:italic;color:var(--tz)">'+(fd.measurements.waist||'—')+'"</div><div class="sl">Waist</div></div>' +
    '<div class="stat st-ch"><div style="font-family:var(--fd);font-size:1.5rem;font-style:italic;color:var(--tz)">'+(fd.measurements.hips||'—')+'"</div><div class="sl">Hips</div></div>' +
    '<div class="stat st-bl"><div style="font-family:var(--fd);font-size:1.5rem;font-style:italic;color:var(--tz)">'+(fd.weight||'—')+'</div><div class="sl">Weight</div></div>' +
    '</div>' +

    // MEASUREMENTS + CLARITY
    '<div class="g2" style="margin-bottom:.85rem">' +
    '<div class="card"><div class="cl">Track Your Body</div>' +
    ['waist','hips','arms','thighs'].map(function(m){
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid var(--ch4)">' +
        '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);text-transform:uppercase;min-width:52px">'+m+'</div>' +
        '<input id="m-'+m+'" value="'+(fd.measurements[m]||'')+'" placeholder="inches" style="border:none;outline:none;font-family:var(--fd);font-size:.9rem;font-style:italic;color:var(--tz);background:transparent;flex:1" onblur="saveFitnessField(\'measurements\',\''+m+'\',this.value)">' +
        '<div style="font-family:var(--fm);font-size:.48rem;color:var(--du)">in</div>' +
        '</div>';
    }).join('') +
    '<div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);text-transform:uppercase;min-width:52px">weight</div>' +
    '<input id="m-weight" value="'+(fd.weight||'')+'" placeholder="lbs" style="border:none;outline:none;font-family:var(--fd);font-size:.9rem;font-style:italic;color:var(--tz);background:transparent;flex:1" onblur="saveFitnessWeight(this.value)">' +
    '<div style="font-family:var(--fm);font-size:.48rem;color:var(--du)">lbs</div>' +
    '</div>' +
    '</div>' +
    '<div class="card" style="border-left:4px solid var(--sg2)">' +
    '<div class="cl">Clarity Tracker</div>' +
    '<div style="font-family:var(--fd);font-size:2.8rem;font-style:italic;color:var(--sg2);line-height:1;margin-bottom:.2rem">'+(daysClean||0)+'</div>' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">days clear</div>' +
    (fd.quit&&fd.quit.startDate?'<div style="font-size:.75rem;color:var(--st);margin-bottom:.5rem">Since '+new Date(fd.quit.startDate).toLocaleDateString('en-US',{month:'long',day:'numeric'})+'</div>':'')+
    '<div class="fg"><label>Start Date</label><input type="date" value="'+(fd.quit&&fd.quit.startDate||'')+'" style="width:100%;padding:.35rem .65rem;border:1px solid var(--du);border-radius:3px;font-family:var(--fb);font-size:.75rem;color:var(--ink);background:var(--wh);outline:none" onchange="saveFitnessQuit(this.value)"></div>' +
    '<div style="font-size:.72rem;color:var(--wg);font-style:italic;line-height:1.5;margin-top:.35rem">Cortisol stores fat at the waist specifically. Clarity is the fastest path to the body you want.</div>' +
    '</div>' +
    '</div>' +

    // DAILY NUTRITION
    '<div class="card" style="margin-bottom:.85rem">' +
    '<div class="cl">Daily Nutrition</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">' +
    [
      {k:'breakfast',l:'Protein breakfast within 30 min of waking',n:'Stops the cortisol spike'},
      {k:'water',l:'Water before coffee',n:'Every single morning'},
      {k:'snacks',l:'Smart snacks only today',n:'Almonds, fruit, hummus'},
      {k:'dinner',l:'Cooked dinner tonight',n:'20 minutes. Non-negotiable.'},
    ].map(function(n){
      var done=fd.nutrition&&fd.nutrition[n.k];
      return '<div onclick="saveFitnessNutrition(\''+n.k+'\')" style="padding:.55rem .65rem;background:'+(done?'rgba(90,138,82,.08)':'var(--ch5)')+';border-radius:3px;cursor:pointer;border:1px solid '+(done?'var(--sg2)':'transparent')+';display:flex;gap:.45rem;align-items:flex-start">' +
        '<div style="width:16px;height:16px;border-radius:50%;border:1.5px solid '+(done?'var(--sg2)':'var(--du)')+';background:'+(done?'var(--sg2)':'transparent')+';flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center">'+(done?'<div style="width:5px;height:5px;border-radius:50%;background:white"></div>':'')+'</div>' +
        '<div><div style="font-size:.75rem;font-weight:600;color:var(--ink)">'+n.l+'</div><div style="font-family:var(--fm);font-size:.5rem;color:var(--wg)">'+n.n+'</div></div>' +
        '</div>';
    }).join('') +
    '</div>' +
    '</div>' +

    // SKIN + HAIR RITUALS
    '<div class="g2" style="margin-bottom:.85rem">' +
    buildSkinCard('Morning Ritual','morn',['Water before coffee','Vitamin C serum','Moisturizer + SPF 30','Omega-3 supplement','Collagen powder in drink'],fd) +
    buildSkinCard('Night Ritual','night',['Double cleanse','Retinol or niacinamide','Heavy moisturizer','Silk pillowcase','Magnesium supplement'],fd) +
    '</div>' +

    // WEEKLY TRAINING
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Weekly Training Split</div>' +
    '<div style="display:flex;flex-direction:column;gap:.65rem;margin-bottom:.85rem">' +
    split.map(function(s){
      var done=fd.days&&fd.days[s.key]&&fd.days[s.key].done;
      return '<div style="border-radius:3px;overflow:hidden;box-shadow:0 2px 8px rgba(46,37,96,.06)">' +
        '<div style="background:'+s.color+';padding:.6rem 1rem;display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-family:var(--fm);font-size:.48rem;letter-spacing:3px;color:rgba(255,255,255,.55);text-transform:uppercase">'+s.day+'</div>' +
        '<div style="font-family:var(--fd);font-size:1.05rem;font-style:italic;color:white">'+s.focus+'</div></div>' +
        '<div onclick="saveFitnessDay(\''+s.key+'\')" style="width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:'+(done?'rgba(255,255,255,.85)':'transparent')+';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
        (done?'<div style="color:'+s.color+';font-size:.7rem;font-weight:700">✓</div>':'') +
        '</div>' +
        '</div>' +
        '<div style="background:var(--wh);padding:.75rem 1rem">' +
        s.exercises.map(function(e){
          return '<div style="display:flex;gap:.65rem;padding:.3rem 0;border-bottom:1px solid var(--ch4);align-items:flex-start">' +
            '<div style="flex:1"><div style="font-size:.78rem;font-weight:600;color:var(--ink)">'+e.name+'</div>' +
            '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.1rem">'+e.note+'</div></div>' +
            '<div style="font-family:var(--fm);font-size:.55rem;color:'+s.color+';white-space:nowrap;flex-shrink:0">'+e.sets+'</div>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }).join('') +
    '</div>' +

    // NUTRITION GUIDE
    '<div class="card" style="margin-bottom:1.5rem">' +
    '<div class="cl">Nutrition for the Body You Are Building</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">' +
    [
      {t:'Breakfast — every day',c:'var(--tz3)',i:['2-3 eggs any style','Greek yogurt + berries','Protein shake if rushed','Coffee or matcha AFTER eating']},
      {t:'Smart Snacks',c:'var(--ch2)',i:['Almonds — handful','Apple + almond butter','Hummus + cucumber','Protein bar, low sugar']},
      {t:'Dinner — cook every night',c:'var(--sg2)',i:['Lean protein: chicken, fish, tofu','Roasted vegetables','Rice or sweet potato','This is 20 minutes. You can.']},
      {t:'What to cut',c:'var(--bl2)',i:['Alcohol — cortisol + bloat','Sugary drinks','Processed snacks','Skipping meals stores fat']},
    ].map(function(g){
      return '<div style="background:var(--ch5);border-radius:3px;padding:.75rem;border-left:3px solid '+g.c+'">' +
        '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:'+g.c+';text-transform:uppercase;margin-bottom:.4rem">'+g.t+'</div>' +
        g.i.map(function(item){return '<div style="display:flex;gap:.4rem;padding:.18rem 0"><div style="width:4px;height:4px;border-radius:50%;background:'+g.c+';flex-shrink:0;margin-top:5px"></div><div style="font-size:.72rem;color:var(--st);line-height:1.5">'+item+'</div></div>';}).join('') +
        '</div>';
    }).join('') +
    '</div>' +
    '</div>' +

    '</div>'
  );
}

function buildSkinCard(title,key,items,fd){
  var r=fd.rituals&&fd.rituals[key]||{};
  return '<div class="card"><div class="cl">'+title+'</div>' +
    items.map(function(item,i){
      var done=r[i];
      return '<div onclick="saveFitnessRitual(\''+key+'\','+i+')" style="display:flex;align-items:center;gap:.45rem;padding:.3rem 0;border-bottom:1px solid var(--ch4);cursor:pointer">' +
        '<div class="todo-cb '+(done?'done':'')+'" style="flex-shrink:0"></div>' +
        '<div style="font-size:.75rem;color:var(--st);'+(done?'text-decoration:line-through;opacity:.5':'')+'">'+item+'</div>' +
        '</div>';
    }).join('') +
    '</div>';
}

function saveFitnessField(section,key,val){var fd=lsGet('chq-fitness',{});if(!fd[section])fd[section]={};fd[section][key]=val;lsSave('chq-fitness',fd);}
function saveFitnessWeight(val){var fd=lsGet('chq-fitness',{});fd.weight=val;lsSave('chq-fitness',fd);}
function saveFitnessDay(key){var fd=lsGet('chq-fitness',{days:{}});if(!fd.days)fd.days={};if(!fd.days[key])fd.days[key]={done:false};fd.days[key].done=!fd.days[key].done;lsSave('chq-fitness',fd);rerenderKeepScroll(bFitness);}
function saveFitnessNutrition(key){var fd=lsGet('chq-fitness',{nutrition:{}});if(!fd.nutrition)fd.nutrition={};fd.nutrition[key]=!fd.nutrition[key];lsSave('chq-fitness',fd);rerenderKeepScroll(bFitness);}
function saveFitnessRitual(key,idx){var fd=lsGet('chq-fitness',{rituals:{}});if(!fd.rituals)fd.rituals={};if(!fd.rituals[key])fd.rituals[key]={};fd.rituals[key][idx]=!fd.rituals[key][idx];lsSave('chq-fitness',fd);rerenderKeepScroll(bFitness);}
function saveFitnessQuit(val){var fd=lsGet('chq-fitness',{quit:{}});if(!fd.quit)fd.quit={};fd.quit.startDate=val;lsSave('chq-fitness',fd);rerenderKeepScroll(bFitness);}
function saveFitnessLog(){showToast('Saved');}


function addWorkout(){
  var exs=g('wk-exercises').value.split('\n').filter(Boolean).map(function(l){var p=l.split('·');return{name:(p[0]||'').trim(),sets:(p[1]||'').trim()};});
  var w={id:Date.now(),day:g('wk-day').value,focus:g('wk-focus').value,exercises:exs,notes:g('wk-notes').value};
  if(!w.focus)return;
  S.workouts.push(w);lsSave('chq-wk',S.workouts);closeM('m-workout');bFitness();
}

// ═══ MESSAGES ════════════════════════════════════════════════
function bMessages(){
  var msgs=Array.isArray(S.messages)?S.messages:[];
  var avC={amelia:'var(--ch)',laneea:'var(--lv)',hmu:'var(--bl)',trainer:'var(--sg)',team:'var(--tz4)'};
  inject(
    '<div style="display:flex;flex-direction:column;height:100%">' +
    '<div class="ph"><div><div class="ph-tag">Team</div><div class="ph-title"><em>Messages</em></div></div>' +
    '<div class="ph-acts"><button class="btn bp" onclick="openM(\'m-msg\')">+ New</button></div></div>' +
    '<div class="pb" style="flex:1;overflow-y:auto">' +
    '<div class="msg-l">' +
    msgs.map(function(m){
      return '<div class="msg '+(m.from===S.role?'me':'')+'">' +
        '<div class="msg-av" style="background:'+(avC[m.from]||'var(--du)')+'">'+m.from.slice(0,2).toUpperCase()+'</div>' +
        '<div><div class="msg-bub">'+m.text+'</div><div class="msg-meta">'+m.from+' · '+m.time+'</div></div>' +
        '</div>';
    }).join('') +
    '</div></div>' +
    '<div style="padding:.65rem 1.75rem;border-top:1px solid var(--du);background:var(--wh);display:flex;gap:.45rem">' +
    '<input class="msg-input" id="quick-msg" placeholder="Message the team..." onkeydown="if(event.key===\'Enter\')quickSend()">' +
    '<button class="msg-send" onclick="quickSend()">Send</button>' +
    '</div></div>'
  );
}
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
var FILE_STORE=[];
function bFiles(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Shared</div><div class="ph-title"><em>Files</em></div></div>' +
    '<div class="ph-acts"><label class="btn bp" style="cursor:pointer">+ Upload<input type="file" multiple style="display:none" onchange="handleUpload(event)"></label></div></div>' +
    '<div class="pb">' +
    renderContactsCard() +
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
      return '<button class="cal-tab '+(( window._fileFolder||'All')===f?'on':'')+'" onclick="window._fileFolder=\''+f+'\';renderFileList()">'+f+'</button>';
    }).join('') +
    '</div>' +
    '<div id="uploaded-files"></div>' +
    '</div>'
  );
  renderFileList();
}
function renderFileList(){
  var c=g('uploaded-files');if(!c)return;
  var folder=window._fileFolder||'All';
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
function handleUpload(e){
  Array.from(e.target.files).forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){
      FILE_STORE.push({id:Date.now()+Math.floor(Math.random()*1000000),name:file.name,size:file.size,type:file.type,data:ev.target.result,folder:window._fileFolder&&window._fileFolder!=='All'?window._fileFolder:'Personal'});
      renderFileList();
      sbSaveFiles();
    };
    r.readAsDataURL(file);
  });
}
function openFile(i){
  var f=FILE_STORE[i];var vw=g('file-viewer'),vc=g('fv-content'),vn=g('fv-name');
  if(!vw||!vc||!vn)return;
  vn.textContent=f.name;
  var ext=f.name.split('.').pop().toLowerCase();
  if(['jpg','jpeg','png','gif','webp'].includes(ext)){vc.innerHTML='<img src="'+f.data+'" style="max-width:100%;max-height:60vh;display:block;margin:0 auto">';}
  else if(ext==='pdf'){vc.innerHTML='<iframe src="'+f.data+'" style="width:100%;height:60vh;border:none"></iframe>';}
  else if(['mp3','wav','ogg','m4a'].includes(ext)){vc.innerHTML='<audio controls src="'+f.data+'" style="width:100%;margin:.5rem 0"></audio>';}
  else if(['mp4','mov','webm'].includes(ext)){vc.innerHTML='<video controls src="'+f.data+'" style="max-width:100%;max-height:55vh;display:block;margin:0 auto"></video>';}
  else{vc.innerHTML='<div style="font-family:var(--fm);font-size:.75rem;color:rgba(254,252,247,.4);text-align:center;padding:2rem">Preview not available — <button class="btn bc" onclick="downloadFile('+i+')" style="margin-left:.35rem;font-size:.65rem">Download</button></div>';}
  vw.style.display='block';vw.scrollIntoView({behavior:'smooth',block:'start'});
}
function closeFileViewer(){var v=g('file-viewer');if(v)v.style.display='none';}
function removeFile(i){FILE_STORE.splice(i,1);renderFileList();sbSaveFiles();}
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
    [{label:'Entry Secured',done:true,note:'Miss Temecula USA 2026'},{label:'Coach Engaged',done:true,note:'Weekly sessions'},{label:'Wardrobe In Progress',done:false,note:'With Laneea'},{label:'YouTube Channel Launch',done:false,note:'Starting from 0'},{label:'Competition Week',done:false,note:'July 10-12 · Grand Hyatt Indian Wells'}].map(function(p){
      return '<div class="tl"><div class="tl-d" style="background:'+(p.done?'var(--sg2)':'var(--du)')+'"></div><div class="tl-t"><strong>'+p.label+'</strong>'+p.note+'</div></div>';
    }).join('') +
    '</div></div>');
}
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
function saveAdv(key,field,val){
  var adv=lsGet('chq-adv',{});
  if(!adv[key])adv[key]={};
  adv[key][field]=val;
  lsSave('chq-adv',adv);
  showToast();
}
function setAdvImg(key,e){
  var file=e.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(ev){saveAdv(key,'img',ev.target.result);bAdvocacy();};
  r.readAsDataURL(file);
}
function clearAdvImg(key){saveAdv(key,'img','');bAdvocacy();}

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
  var db=g('ev-del-btn');if(db)db.style.display='inline-block';
  openM('m-ev');
}
function deleteCalEvent(){
  if(!S._editingEvId)return;
  if(!confirm('Remove this event?'))return;
  S.calEvents=S.calEvents.filter(function(x){return x.id!==S._editingEvId;});
  lsSave('chq-ce',S.calEvents);
  S._editingEvId=null;
  closeM('m-ev');
  bCalendar();
}

function bPitch(){
  var pitchData=lsGet('chq-pitch',{
    brainstorm:'',
    mainPoints:'',
    followUps:[],
    decks:{
      general:{name:'General / Universal',color:'var(--tz3)',notes:''},
      energy:{name:'Clean Energy & EV',color:'var(--ch2)',notes:''},
      fashion:{name:'Fashion & Sustainability',color:'var(--sg2)',notes:''},
      local:{name:'Local San Diego',color:'var(--bl2)',notes:''},
    },
    emails:{
      cold:{subject:'An invitation — Amelia Arabe x [Company]',body:'Hi [Name],\n\nMy name is Laneea Love — I manage Amelia Arabe, a Filipina-American student engineer and Miss Temecula USA 2026 candidate based in San Diego.\n\nAmelia\'s platform is clean energy and textile accountability policy. She is building an audience that cares deeply about the same things [Company] stands for.\n\nWe are offering a limited number of sponsorship partnerships — visibility, alignment, and a seat at the table for something that matters.\n\nWould you be open to a 15-minute call this week?\n\nWith gratitude,\nLaneea Love\nManager, Amelia Arabe'},
      followUp:{subject:'Following up — Amelia Arabe partnership',body:'Hi [Name],\n\nJust following up on my note from [DATE]. I know inboxes get full.\n\nAmelia competes July 10-12 in Miss California USA 2026. We have a few sponsorship spots remaining and wanted to make sure [Company] had the chance to be part of it.\n\nHappy to send a one-pager or jump on a quick call — whatever works best for you.\n\nBest,\nLaneea Love'},
      postMeeting:{subject:'Great connecting — next steps',body:'Hi [Name],\n\nThank you so much for your time today. It was genuinely exciting to talk about [specific thing discussed].\n\nAs discussed, here are our partnership tiers:\n— [Tier 1]: [Deliverable]\n— [Tier 2]: [Deliverable]\n\nI\'ll follow up [DATE] unless I hear from you first.\n\nWith gratitude,\nLaneea Love'},
    },
    objections:{
      budget:{q:'We don\'t have budget for this.',a:'Totally understand — and this doesn\'t have to be cash. Product placement, a gifted item, or a co-branded social post all count as partnership. We are flexible on structure.'},
      audience:{q:'Your audience is too small.',a:'Amelia\'s TikTok has 95K followers — currently dormant and relaunching for the competition. Her Instagram is 1.4K and growing fast. More importantly, her audience is highly engaged and values-aligned with sustainability brands. Quality over quantity.'},
      pageant:{q:'We don\'t typically sponsor pageants.',a:'This isn\'t a typical pageant partnership. Amelia is an engineer with a policy platform — SB 100, SB 707, EPR legislation. Your brand isn\'t sponsoring a crown. It\'s backing a climate advocate on a national stage.'},
      timing:{q:'The timing isn\'t right.',a:'The competition is July 10-12 — that\'s our deadline too. We\'re offering early partners the best placement and the most lead time for co-created content. The window is real.'},
      notFit:{q:'I\'m not sure it\'s a fit for us.',a:'Tell me more about what a good fit looks like for you. We\'ve built this partnership to be flexible — we can find an angle that works whether your priority is brand awareness, social content, community goodwill, or something else entirely.'},
    },
    meetingChecklist:[
      {id:1,text:'Research company — recent news, sustainability angle, decision maker name',done:false},
      {id:2,text:'Print or send pitch deck in advance',done:false},
      {id:3,text:'Prepare Amelia\'s one-liner for this specific sponsor',done:false},
      {id:4,text:'Know their ask range — what tier fits their budget',done:false},
      {id:5,text:'Have contract / LOI ready to send same day',done:false},
      {id:6,text:'Follow up within 24 hours',done:false},
      {id:7,text:'Log outcome in Sponsor Tracker',done:false},
    ]
  });

  var saved=lsGet('chq-pitch',null);
  if(saved) pitchData=Object.assign(pitchData,saved);

  var deckKeys=['general','energy','fashion','local'];
  var emailKeys=['cold','followUp','postMeeting'];
  var objKeys=['budget','audience','pageant','timing','notFit'];

  inject(
    '<div class="ph"><div><div class="ph-tag">Laneea & Amelia</div><div class="ph-title"><em>Pitch</em> HQ</div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="savePitch()">Save All</button></div></div>' +
    '<div class="pb">' +

    // MAIN POINTS
    '<div class="card" style="margin-bottom:.85rem;border-left:4px solid var(--tz3)">' +
    '<div class="cl">The Overarching Pitch — Main Points</div>' +
    '<textarea id="pitch-main" placeholder="The three things every sponsor needs to hear..." style="width:100%;min-height:90px;border:none;outline:none;font-family:var(--fd);font-size:.95rem;font-style:italic;color:var(--ink);line-height:1.8;resize:vertical;background:transparent">'+( pitchData.mainPoints||'')+'</textarea>' +
    '</div>' +

    // PITCH DECKS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Pitch Decks</div>' +
    '<div class="g2" style="margin-bottom:.85rem">' +
    deckKeys.map(function(k){
      var d=pitchData.decks[k];
      return '<div class="card" style="border-top:3px solid '+d.color+';padding:.85rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:'+d.color+';text-transform:uppercase">'+d.name+'</div>' +
        '<label class="btn bp" style="cursor:pointer;font-size:.55rem;padding:.25rem .65rem">Upload PDF<input type="file" accept=".pdf,application/pdf" style="display:none" class="deck-upload" data-key="'+k+'"></label>' +
        '</div>' +
        '<div id="deck-file-'+k+'" style="font-family:var(--fm);font-size:.55rem;color:var(--wg);margin-bottom:.45rem;min-height:18px">'+(pitchData.decks[k].fileName?'📄 '+pitchData.decks[k].fileName:'No PDF uploaded')+'</div>' +
        '<textarea class="deck-notes" data-key="'+k+'" placeholder="Key talking points for this deck..." style="width:100%;min-height:70px;border:1.5px dashed var(--du);border-radius:3px;padding:.55rem .7rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:var(--ch5)">'+( d.notes||'')+'</textarea>' +
        (pitchData.decks[k].pdf?'<button class="btn bg" style="font-size:.55rem;margin-top:.4rem" onclick="viewDeckPDF(\''+k+'\')">View PDF</button>':'') +
        '</div>';
    }).join('') +
    '</div>' +

    // FOLLOW-UP TRACKER
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Follow-Up Tracker</div>' +
    '<div class="card" style="margin-bottom:.85rem;padding:0;overflow:hidden">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>' +
    '<th style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase;padding:.5rem .75rem;text-align:left;border-bottom:2px solid var(--ch6);background:var(--ch5)">Company</th>' +
    '<th style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase;padding:.5rem .75rem;text-align:left;border-bottom:2px solid var(--ch6);background:var(--ch5)">Contact</th>' +
    '<th style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase;padding:.5rem .75rem;text-align:left;border-bottom:2px solid var(--ch6);background:var(--ch5)">Last Touch</th>' +
    '<th style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase;padding:.5rem .75rem;text-align:left;border-bottom:2px solid var(--ch6);background:var(--ch5)">Follow-Up Date</th>' +
    '<th style="font-family:var(--fm);font-size:.48rem;letter-spacing:2px;color:var(--wg);text-transform:uppercase;padding:.5rem .75rem;text-align:left;border-bottom:2px solid var(--ch6);background:var(--ch5)">Status</th>' +
    '<th style="background:var(--ch5);border-bottom:2px solid var(--ch6)"></th>' +
    '</tr></thead>' +
    '<tbody id="followup-rows">' +
    (pitchData.followUps&&pitchData.followUps.length?pitchData.followUps.map(function(f,i){return renderFollowUpRow(f,i);}).join(''):'') +
    '</tbody></table>' +
    '<div style="padding:.65rem .75rem;border-top:1px solid var(--ch4)">' +
    '<button class="btn bp" style="font-size:.6rem" onclick="addFollowUp()">+ Add Company</button>' +
    '</div>' +
    '</div>' +

    // EMAIL TEMPLATES
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Email Templates</div>' +
    '<div style="display:flex;flex-direction:column;gap:.65rem;margin-bottom:.85rem">' +
    emailKeys.map(function(k){
      var e=pitchData.emails[k];
      var labels={cold:'Cold Outreach',followUp:'Follow-Up',postMeeting:'Post-Meeting'};
      var colors={cold:'var(--tz3)',followUp:'var(--ch2)',postMeeting:'var(--sg2)'};
      return '<div class="card" style="border-left:3px solid '+colors[k]+';padding:.85rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">' +
        '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:'+colors[k]+';text-transform:uppercase">'+labels[k]+'</div>' +
        '<button class="btn bg" style="font-size:.55rem;padding:.2rem .6rem" onclick="copyPitchEmail(\'email-body-'+k+'\',this)">Copy</button>' +
        '</div>' +
        '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-bottom:.3rem">Subject</div>' +
        '<input class="email-subj" data-key="'+k+'" value="'+e.subject.replace(/"/g,'&quot;')+'" style="width:100%;border:1px solid var(--du);border-radius:3px;padding:.35rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--ink);background:var(--wh);outline:none;margin-bottom:.5rem">' +
        '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-bottom:.3rem">Body</div>' +
        '<textarea class="email-body" id="email-body-'+k+'" data-key="'+k+'" style="width:100%;min-height:110px;border:1px solid var(--du);border-radius:3px;padding:.5rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.75;resize:vertical;outline:none;background:var(--wh)">'+e.body+'</textarea>' +
        '</div>';
    }).join('') +
    '</div>' +

    // OBJECTION RESPONSES
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">When They Say No — Objection Responses</div>' +
    '<div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:.85rem">' +
    objKeys.map(function(k){
      var o=pitchData.objections[k];
      return '<div class="card" style="padding:.85rem">' +
        '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:2px;color:var(--bl2);text-transform:uppercase;margin-bottom:.3rem">They say</div>' +
        '<div style="font-family:var(--fd);font-style:italic;font-size:.88rem;color:var(--ink);margin-bottom:.55rem;border-left:2px solid var(--bl);padding-left:.65rem">'+o.q+'</div>' +
        '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:2px;color:var(--sg2);text-transform:uppercase;margin-bottom:.3rem">You say</div>' +
        '<textarea class="obj-response" data-key="'+k+'" style="width:100%;min-height:60px;border:1.5px solid var(--ch4);border-radius:3px;padding:.5rem .65rem;font-family:var(--fb);font-size:.75rem;color:var(--st);line-height:1.7;resize:vertical;outline:none;background:var(--ch5)">'+o.a+'</textarea>' +
        '</div>';
    }).join('') +
    '</div>' +

    // MEETING CHECKLIST
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Meeting Prep Checklist</div>' +
    '<div class="card" style="margin-bottom:.85rem" id="meeting-checklist">' +
    pitchData.meetingChecklist.map(function(t,i){
      return '<div class="todo-item" id="mc-'+t.id+'">' +
        '<div class="todo-cb '+(t.done?'done':'')+'" onclick="toggleMC('+t.id+',this)"></div>' +
        '<span class="todo-txt '+(t.done?'done':'')+'">'+t.text+'</span>' +
        '</div>';
    }).join('') +
    '<div class="todo-add-row" style="margin-top:.5rem">' +
    '<input class="todo-inp" id="mc-inp" placeholder="Add checklist item...">' +
    '<button class="btn bp" style="font-size:.6rem;padding:.3rem .75rem" onclick="addMCItem()">+ Add</button>' +
    '</div>' +
    '</div>' +

    // BRAINSTORM
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Brainstorm — Working Space</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
    '<textarea id="pitch-brainstorm" placeholder="Dump everything here. Ideas, leads, strategy, random thoughts..." style="width:100%;min-height:200px;border:none;outline:none;font-family:var(--fb);font-size:.82rem;color:var(--st);line-height:1.85;resize:vertical;background:transparent">'+( pitchData.brainstorm||'')+'</textarea>' +
    '</div>' +

    '</div>' // close pb
  );

  // PDF upload handlers
  document.querySelectorAll('.deck-upload').forEach(function(inp){
    inp.addEventListener('change',function(){
      var key=inp.dataset.key;
      var file=inp.files[0];if(!file)return;
      var r=new FileReader();
      r.onload=function(ev){
        var pd=lsGet('chq-pitch',{});
        if(!pd.decks)pd.decks={};
        if(!pd.decks[key])pd.decks[key]={};
        pd.decks[key].pdf=ev.target.result;
        pd.decks[key].fileName=file.name;
        lsSave('chq-pitch',pd);
        var lbl=document.getElementById('deck-file-'+key);
        if(lbl)lbl.textContent='📄 '+file.name;
        showToast('PDF uploaded');
      };
      r.readAsDataURL(file);
    });
  });
}

function renderFollowUpRow(f,i){
  var today=new Date().toISOString().split('T')[0];
  var overdue=f.followUpDate&&f.followUpDate<today&&f.status!=='closed';
  var sc={new:'var(--tz3)',contacted:'var(--ch2)',meeting:'var(--sg2)',closed:'var(--sg2)',overdue:'var(--bl2)'};
  return '<tr id="fu-'+f.id+'" style="'+(overdue?'background:rgba(136,120,184,.06)':'')+'">' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><input style="border:none;outline:none;font-family:var(--fb);font-size:.77rem;font-weight:600;color:var(--ink);background:transparent;width:100%" value="'+(f.company||'').replace(/"/g,'&quot;')+'" onblur="updateFU('+f.id+',\'company\',this.value)" placeholder="Company"></td>' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><input style="border:none;outline:none;font-family:var(--fb);font-size:.75rem;color:var(--st);background:transparent;width:100%" value="'+(f.contact||'').replace(/"/g,'&quot;')+'" onblur="updateFU('+f.id+',\'contact\',this.value)" placeholder="Name / email"></td>' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><input style="border:none;outline:none;font-family:var(--fb);font-size:.75rem;color:var(--st);background:transparent;width:100%" value="'+(f.lastTouch||'').replace(/"/g,'&quot;')+'" onblur="updateFU('+f.id+',\'lastTouch\',this.value)" placeholder="e.g. Emailed Mar 20"></td>' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><input type="date" style="border:none;outline:none;font-family:var(--fm);font-size:.72rem;color:'+(overdue?'var(--bl2)':'var(--st)')+';background:transparent" value="'+(f.followUpDate||'')+'" onchange="updateFU('+f.id+',\'followUpDate\',this.value)"></td>' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><select style="border:none;outline:none;font-family:var(--fm);font-size:.65rem;color:'+(sc[f.status]||'var(--wg)')+';background:transparent;cursor:pointer" onchange="updateFU('+f.id+',\'status\',this.value)">' +
    ['new','contacted','meeting','closed'].map(function(s){return '<option value="'+s+'" '+(f.status===s?'selected':'')+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>';}).join('') +
    '</select></td>' +
    '<td style="padding:.55rem .75rem;border-bottom:1px solid var(--ch4)"><button onclick="removeFU('+f.id+')" style="background:none;border:none;color:var(--du);cursor:pointer;font-size:.9rem">×</button></td>' +
    '</tr>';
}

function addFollowUp(){
  var pd=lsGet('chq-pitch',{});
  if(!pd.followUps)pd.followUps=[];
  var id=Date.now();
  var f={id:id,company:'',contact:'',lastTouch:'',followUpDate:'',status:'new'};
  pd.followUps.push(f);
  lsSave('chq-pitch',pd);
  var tbody=document.getElementById('followup-rows');
  if(tbody){
    var tr=document.createElement('tr');
    tr.id='fu-'+id;
    tr.innerHTML=renderFollowUpRow(f,pd.followUps.length-1).replace(/^<tr[^>]*>/,'').replace(/<\/tr>$/,'');
    tbody.appendChild(tr);
  }
}

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
  var bm=document.getElementById('pitch-brainstorm');
  var mp=document.getElementById('pitch-main');
  if(bm)pd.brainstorm=bm.value;
  if(mp)pd.mainPoints=mp.value;
  // deck notes
  document.querySelectorAll('.deck-notes').forEach(function(el){
    if(!pd.decks)pd.decks={};
    if(!pd.decks[el.dataset.key])pd.decks[el.dataset.key]={};
    pd.decks[el.dataset.key].notes=el.value;
  });
  // email subjects + bodies
  document.querySelectorAll('.email-subj').forEach(function(el){
    if(!pd.emails)pd.emails={};
    if(!pd.emails[el.dataset.key])pd.emails[el.dataset.key]={};
    pd.emails[el.dataset.key].subject=el.value;
  });
  document.querySelectorAll('.email-body').forEach(function(el){
    if(!pd.emails)pd.emails={};
    if(!pd.emails[el.dataset.key])pd.emails[el.dataset.key]={};
    pd.emails[el.dataset.key].body=el.value;
  });
  // objection responses
  document.querySelectorAll('.obj-response').forEach(function(el){
    if(!pd.objections)pd.objections={};
    if(!pd.objections[el.dataset.key])pd.objections[el.dataset.key]={};
    pd.objections[el.dataset.key].a=el.value;
  });
  lsSave('chq-pitch',pd);
  showToast('Pitch HQ saved');
}


// ═══ BOARD (TRELLO STYLE) ════════════════════════════════════
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
    '<div style="display:flex;gap:.75rem;overflow-x:auto;padding:1.25rem 1.75rem;min-height:calc(100vh - 140px);align-items:flex-start;-webkit-overflow-scrolling:touch">' +
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

function renderBoardCard(card,colId){
  var tagColors={sponsor:'var(--ch2)',event:'var(--sg2)',content:'var(--bl2)',urgent:'var(--bl2)',idea:'var(--tz3)'};
  return '<div class="board-card" id="bcard-'+card.id+'" style="background:var(--wh);border-radius:3px;padding:.75rem;box-shadow:0 2px 8px rgba(46,37,96,.08);border-left:3px solid var(--du);cursor:pointer" onclick="editBoardCard(\''+card.id+'\',\''+colId+'\')">' +
    (card.tag?'<span style="font-family:var(--fm);font-size:.44rem;letter-spacing:2px;text-transform:uppercase;color:'+(tagColors[card.tag]||'var(--wg)')+';background:'+(tagColors[card.tag]||'var(--wg)')+'22;padding:.1rem .4rem;border-radius:3px;display:inline-block;margin-bottom:.35rem">'+card.tag+'</span>':'') +
    '<div style="font-size:.82rem;font-weight:600;color:var(--ink);margin-bottom:'+(card.body?'.3rem':'0')+'">'+card.title+'</div>' +
    (card.body?'<div style="font-size:.72rem;color:var(--wg);line-height:1.5;white-space:pre-wrap">'+card.body.substring(0,80)+(card.body.length>80?'...':'')+'</div>':'') +
    (card.due?'<div style="font-family:var(--fm);font-size:.5rem;color:var(--ch2);margin-top:.35rem">📅 '+card.due+'</div>':'') +
    (card.who?'<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.15rem">👤 '+card.who+'</div>':'') +
    '</div>';
}

function addCardToCol(colId){
  var title=prompt('Card title:');
  if(!title)return;
  var bd=lsGet('chq-board',{columns:[]});
  var col=bd.columns.find(function(c){return c.id===colId;});
  if(!col)return;
  var card={id:Date.now(),title:title,body:'',tag:'',due:'',who:''};
  col.cards.push(card);
  lsSave('chq-board',bd);
  var container=document.getElementById('bcards-'+colId);
  if(container){
    var div=document.createElement('div');
    div.innerHTML=renderBoardCard(card,colId);
    container.appendChild(div.firstChild);
  }
  // update count
  var colEl=document.getElementById('bcol-'+colId);
  if(colEl){var cnt=colEl.querySelector('span');if(cnt)cnt.textContent=col.cards.length;}
}

function addBoardCard(){
  var bd=lsGet('chq-board',{columns:[]});
  if(!bd.columns||!bd.columns.length)return;
  addCardToCol(bd.columns[0].id);
}

function addBoardColumn(){
  var title=prompt('Column name:');
  if(!title)return;
  var bd=lsGet('chq-board',{columns:[]});
  var id='col_'+Date.now();
  bd.columns.push({id:id,title:title,color:'var(--tz4)',cards:[]});
  lsSave('chq-board',bd);
  bBoard();
}

function editBoardCard(cardId,colId){
  var bd=lsGet('chq-board',{columns:[]});
  var col=bd.columns.find(function(c){return c.id===colId;});
  if(!col)return;
  var card=col.cards.find(function(x){return String(x.id)===String(cardId);});
  if(!card)return;

  // Inline modal
  var tags=['sponsor','event','content','urgent','idea',''];
  var assignees=['Amelia','Laneea','Hair & MU','Trainer',''];
  var cols=bd.columns.map(function(c){return '<option value="'+c.id+'" '+(c.id===colId?'selected':'')+'>'+c.title+'</option>';}).join('');
  var ov=document.createElement('div');
  ov.className='ov on';ov.id='board-card-ov';
  ov.innerHTML='<div class="modal" style="max-width:420px">' +
    '<h3 style="margin-bottom:.75rem">Edit Card</h3>' +
    '<div class="fg"><label>Title</label><input class="fi" id="bc-title" value="'+card.title.replace(/"/g,'&quot;')+'"></div>' +
    '<div class="fg"><label>Notes</label><textarea class="ft" id="bc-body" style="min-height:80px">'+( card.body||'')+'</textarea></div>' +
    '<div class="fg-row">' +
    '<div class="fg"><label>Tag</label><select class="fs" id="bc-tag">' +
    tags.map(function(t){return '<option value="'+t+'" '+(card.tag===t?'selected':'')+'>'+( t||'None')+'</option>';}).join('')+
    '</select></div>' +
    '<div class="fg"><label>Move to</label><select class="fs" id="bc-col">'+cols+'</select></div>' +
    '</div>' +
    '<div class="fg-row">' +
    '<div class="fg"><label>Due Date</label><input class="fi" type="date" id="bc-due" value="'+(card.due||'')+'"></div>' +
    '<div class="fg"><label>Assigned to</label><input class="fi" id="bc-who" value="'+(card.who||'').replace(/"/g,'&quot;')+'" placeholder="Laneea / Amelia"></div>' +
    '</div>' +
    '<div class="m-acts">' +
    '<button class="btn bg" onclick="document.getElementById(\'board-card-ov\').remove()">Cancel</button>' +
    '<button class="btn bd" onclick="deleteBoardCard(\''+cardId+'\',\''+colId+'\')">Delete</button>' +
    '<button class="btn bp" onclick="saveBoardCard(\''+cardId+'\',\''+colId+'\')">Save</button>' +
    '</div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
}

function saveBoardCard(cardId,colId){
  var bd=lsGet('chq-board',{columns:[]});
  var newColId=document.getElementById('bc-col').value;
  var oldCol=bd.columns.find(function(c){return c.id===colId;});
  var newCol=bd.columns.find(function(c){return c.id===newColId;});
  if(!oldCol||!newCol)return;
  var idx=oldCol.cards.findIndex(function(x){return String(x.id)===String(cardId);});
  if(idx<0)return;
  var card=oldCol.cards[idx];
  card.title=document.getElementById('bc-title').value;
  card.body=document.getElementById('bc-body').value;
  card.tag=document.getElementById('bc-tag').value;
  card.due=document.getElementById('bc-due').value;
  card.who=document.getElementById('bc-who').value;
  if(newColId!==colId){
    oldCol.cards.splice(idx,1);
    newCol.cards.push(card);
  }
  lsSave('chq-board',bd);
  var ov=document.getElementById('board-card-ov');if(ov)ov.remove();
  bBoard();
}

function deleteBoardCard(cardId,colId){
  if(!confirm('Delete this card?'))return;
  var bd=lsGet('chq-board',{columns:[]});
  var col=bd.columns.find(function(c){return c.id===colId;});
  if(col)col.cards=col.cards.filter(function(x){return String(x.id)!==String(cardId);});
  lsSave('chq-board',bd);
  var ov=document.getElementById('board-card-ov');if(ov)ov.remove();
  bBoard();
}

// ═══ LOOKBOOK (PUBLIC) ═══════════════════════════════════════
function bLookbook(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Public · Sponsor Facing</div><div class="ph-title"><em>Lookbook</em></div></div>' +
    '<div class="ph-acts">' +
    '<button class="btn bg" onclick="previewLookbook()">Preview Public Page</button>' +
    '<label class="btn bp" style="cursor:pointer">+ Upload Look<input type="file" accept="image/*" multiple style="display:none" onchange="addLookbookImg(event)"></label>' +
    '</div></div>' +
    '<div class="pb">' +

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
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Social Media Links</div>' +
    '<div class="g2" style="margin-bottom:1.5rem">' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--tz3);text-transform:uppercase;margin-bottom:.5rem">📸 Instagram</div>' +
    '<input class="fi" id="lb-ig" value="'+(lsGet('chq-lb-links',{}).ig||'https://instagram.com/ameliavarabe')+'" placeholder="https://instagram.com/ameliavarabe">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Sponsors will see a direct link to your profile</div>' +
    '</div>' +
    '<div class="card">' +
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:2px;color:var(--bl2);text-transform:uppercase;margin-bottom:.5rem">▶️ YouTube</div>' +
    '<input class="fi" id="lb-yt" value="'+(lsGet('chq-lb-links',{}).yt||'https://youtube.com/@ameliavarabe')+'" placeholder="https://youtube.com/@ameliavarabe">' +
    '<div style="font-family:var(--fm);font-size:.5rem;color:var(--wg);margin-top:.35rem">Sponsors will see a direct link to your channel</div>' +
    '</div>' +
    '</div>' +

    // BIO FOR SPONSORS
    '<div style="font-family:var(--fm);font-size:.52rem;letter-spacing:3px;color:var(--wg);text-transform:uppercase;margin-bottom:.65rem">Sponsor-Facing Bio</div>' +
    '<div class="card" style="margin-bottom:1.5rem">' +
    '<textarea id="lb-bio" style="width:100%;min-height:90px;border:none;outline:none;font-family:var(--fd);font-size:.95rem;font-style:italic;color:var(--ink);line-height:1.8;resize:vertical;background:transparent" placeholder="What sponsors read when they open the lookbook...">'+(lsGet('chq-lb-bio','')||'Amelia Arabe is a Filipina-American student engineer, cellist, and Miss Temecula USA 2026 candidate based in San Diego. Her platform is clean energy and textile accountability policy. She competes not for a crown — but for a microphone.')+'</textarea>' +
    '</div>' +
    '<button class="btn bp" onclick="saveLookbookData()">Save Lookbook</button>' +
    '</div>'
  );
}

function getLookbookImgs(){
  var imgs=lsGet('chq-lb-imgs',[]);
  return Array.isArray(imgs)?imgs:[];
}

function addLookbookImg(e){
  var imgs=getLookbookImgs();
  Array.from(e.target.files).forEach(function(file){
    var r=new FileReader();
    r.onload=function(ev){
      imgs.push({src:ev.target.result,caption:file.name.split('.')[0].replace(/[-_]/g,' ')});
      lsSave('chq-lb-imgs',imgs);
      var grid=document.getElementById('lb-grid');
      if(grid){
        var m=imgs[imgs.length-1];var i=imgs.length-1;
        var div=document.createElement('div');
        div.className='mb-item';div.style.cssText='aspect-ratio:2/3';
        div.innerHTML='<img src="'+m.src+'"><div class="mb-lbl">'+m.caption+'</div><button class="mb-rm" onclick="removeLookbookImg('+i+')">×</button>';
        grid.insertBefore(div,grid.lastElementChild);
      }
      showToast('Photo added');
    };
    r.readAsDataURL(file);
  });
}

function removeLookbookImg(i){
  var imgs=getLookbookImgs();
  imgs.splice(i,1);
  lsSave('chq-lb-imgs',imgs);
  bLookbook();
}

function saveLookbookData(){
  var igEl=document.getElementById('lb-ig');
  var ytEl=document.getElementById('lb-yt');
  var bioEl=document.getElementById('lb-bio');
  if(igEl&&ytEl) lsSave('chq-lb-links',{ig:igEl.value,yt:ytEl.value});
  if(bioEl) lsSave('chq-lb-bio',bioEl.value);
  showToast('Lookbook saved');
}

function previewLookbook(){
  var imgs=getLookbookImgs();
  var links=lsGet('chq-lb-links',{ig:'https://instagram.com/ameliavarabe',yt:'https://youtube.com/@ameliavarabe'});
  var bio=lsGet('chq-lb-bio','Amelia Arabe is a Filipina-American student engineer, cellist, and Miss Temecula USA 2026 candidate based in San Diego.');

  var html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Amelia Arabe — Lookbook</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&family=Plus+Jakarta+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#1A1340;color:#F0EEF8;font-family:"Plus Jakarta Sans",sans-serif;min-height:100vh}' +
    '.hero{padding:4rem 2rem 3rem;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(74,63,138,.8) 0%,transparent 65%)}' +
    '.hero-tag{font-family:"DM Mono",monospace;font-size:.55rem;letter-spacing:6px;color:rgba(240,216,152,.4);text-transform:uppercase;margin-bottom:1rem}' +
    '.hero-name{font-family:"Cormorant",serif;font-size:clamp(3rem,8vw,5.5rem);font-style:italic;font-weight:300;color:#D8D4EC;line-height:1;margin-bottom:.5rem}' +
    '.hero-sub{font-family:"DM Mono",monospace;font-size:.6rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:2rem}' +
    '.hero-bio{font-family:"Cormorant",serif;font-size:1.1rem;font-style:italic;color:rgba(216,212,236,.7);max-width:600px;margin:0 auto 2rem;line-height:1.75}' +
    '.social-links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}' +
    '.slink{font-family:"DM Mono",monospace;font-size:.58rem;letter-spacing:2px;padding:.45rem 1.25rem;border-radius:3px;border:1px solid rgba(240,216,152,.2);color:rgba(240,216,152,.6);text-decoration:none;text-transform:uppercase;transition:all .2s}' +
    '.slink:hover{border-color:rgba(240,216,152,.5);color:rgba(240,216,152,.9);background:rgba(240,216,152,.05)}' +
    '.section{padding:3rem 2rem;max-width:1100px;margin:0 auto}' +
    '.section-label{font-family:"DM Mono",monospace;font-size:.52rem;letter-spacing:5px;color:rgba(216,212,236,.3);text-transform:uppercase;margin-bottom:1.5rem;text-align:center}' +
    '.look-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}' +
    '.look-item{border-radius:3px;overflow:hidden;aspect-ratio:2/3;position:relative}' +
    '.look-item img{width:100%;height:100%;object-fit:cover;transition:transform .4s}' +
    '.look-item:hover img{transform:scale(1.03)}' +
    '.look-cap{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(20,16,50,.8));padding:1rem .75rem .6rem;font-family:"DM Mono",monospace;font-size:.5rem;letter-spacing:2px;color:rgba(254,252,247,.7);text-transform:uppercase}' +
    '.footer{text-align:center;padding:3rem;font-family:"DM Mono",monospace;font-size:.5rem;letter-spacing:3px;color:rgba(240,216,152,.2);text-transform:uppercase}' +
    '@media(max-width:600px){.look-grid{grid-template-columns:1fr 1fr}.hero-name{font-size:2.8rem}}' +
    '</style></head><body>' +
    '<div class="hero">' +
    '<div class="hero-tag">Miss California USA 2026</div>' +
    '<div class="hero-name">Amelia Arabe</div>' +
    '<div class="hero-sub">Engineer · Cellist · Advocate · San Diego</div>' +
    '<div class="hero-bio">'+bio+'</div>' +
    '<div class="social-links">' +
    '<a class="slink" href="'+links.ig+'" target="_blank">📸 Instagram</a>' +
    '<a class="slink" href="'+links.yt+'" target="_blank">▶️ YouTube</a>' +
    '</div></div>' +
    (imgs.length?
      '<div class="section"><div class="section-label">Competition Looks</div>' +
      '<div class="look-grid">' +
      imgs.map(function(m){return '<div class="look-item"><img src="'+m.src+'" alt="'+m.caption+'"><div class="look-cap">'+m.caption+'</div></div>';}).join('') +
      '</div></div>':''
    ) +
    '<div class="footer">Amelia Arabe · Miss California USA 2026 · San Diego · Represented by Laneea Love</div>' +
    '</body></html>';

  var blob=new Blob([html],{type:'text/html'});
  var url=URL.createObjectURL(blob);
  window.open(url,'_blank');
}



// ═══ SOCIAL MEDIA STRATEGY ═══════════════════════════════════
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

function updateSocialMetric(key,val){
  var sd=lsGet('chq-social',{metrics:{}});
  if(!sd.metrics)sd.metrics={};
  sd.metrics[key]=val;
  lsSave('chq-social',sd);
}

function updateSocialCadence(key,val){
  var sd=lsGet('chq-social',{cadence:{}});
  if(!sd.cadence)sd.cadence={};
  sd.cadence[key]=val;
  lsSave('chq-social',sd);
}

function updateVideoStatus(id,status){
  var sd=lsGet('chq-social',{videos:[]});
  if(!sd.videos)return;
  var v=sd.videos.find(function(x){return x.id===id;});
  if(v){v.status=status;lsSave('chq-social',sd);}
}

function saveSocial(){
  var sd=lsGet('chq-social',{strategy:{}});
  document.querySelectorAll('.social-strategy').forEach(function(el){
    if(!sd.strategy)sd.strategy={};
    sd.strategy[el.dataset.key]=el.value;
  });
  lsSave('chq-social',sd);
  showToast('Social strategy saved');
}



// ═══ MORNING BRIEF HELPERS ═══════════════════════════════════
function getMorningGreeting(){
  var h=new Date().getHours();
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  if(h<12) return 'Good morning, Amelia. '+days+' days to crown.';
  if(h<17) return 'Good afternoon, Amelia. '+days+' days to crown.';
  return 'Good evening, Amelia. '+days+' days to crown.';
}

function getBriefAlerts(){
  var alerts=[];
  var today=new Date().toISOString().split('T')[0];

  // Overdue todos
  var myTodos=(S.todos&&S.todos.amelia)||[];
  var overdue=myTodos.filter(function(t){return !t.done;}).length;
  if(overdue>0) alerts.push('<div style="background:rgba(155,142,216,.15);border:1px solid rgba(155,142,216,.25);border-radius:3px;padding:.25rem .65rem;font-family:var(--fm);font-size:.52rem;color:var(--ch)">'+overdue+' tasks open</div>');

  // Today events
  var todayEvs=(Array.isArray(S.calEvents)?S.calEvents:[]).filter(function(e){return e.date===today;});
  if(todayEvs.length>0) alerts.push('<div style="background:rgba(200,168,76,.12);border:1px solid rgba(200,168,76,.2);border-radius:3px;padding:.25rem .65rem;font-family:var(--fm);font-size:.52rem;color:var(--ch)">'+todayEvs.length+' event'+(todayEvs.length>1?'s':'')+' today</div>');

  // Unread inbox
  var inbox=lsGet('chq-inbox',[]);
  var unread=inbox.filter(function(m){return !m.readBy||m.readBy.indexOf('amelia')<0;});
  if(unread.length>0) alerts.push('<div style="background:rgba(136,120,184,.15);border:1px solid rgba(136,120,184,.25);border-radius:3px;padding:.25rem .65rem;font-family:var(--fm);font-size:.52rem;color:var(--ch)" onclick="showPanel(\'inbox\')" style="cursor:pointer">'+unread.length+' new in inbox</div>');

  // Competition countdown urgency
  var days=Math.ceil((new Date('2026-07-10')-new Date())/(1000*60*60*24));
  if(days<=30) alerts.push('<div style="background:rgba(212,132,122,.2);border:1px solid rgba(212,132,122,.3);border-radius:3px;padding:.25rem .65rem;font-family:var(--fm);font-size:.52rem;color:var(--ch);animation:pulse 2s infinite">'+days+' days left</div>');

  return alerts.join('');
}

// ═══ SEARCH ══════════════════════════════════════════════════
function toggleSearch(){
  var ov=document.getElementById('search-overlay');
  if(!ov)return;
  var isOpen=ov.style.display==='flex';
  ov.style.display=isOpen?'none':'flex';
  if(!isOpen){
    var inp=document.getElementById('search-input');
    if(inp){inp.value='';inp.focus();}
    document.getElementById('search-results').innerHTML='';
  }
}

function runSearch(q){
  q=q.toLowerCase().trim();
  var res=document.getElementById('search-results');
  if(!res)return;
  if(!q){res.innerHTML='';return;}

  var results=[];

  // Sponsors
  S.sponsors.forEach(function(s){
    if(s.name.toLowerCase().indexOf(q)>=0||( s.notes&&s.notes.toLowerCase().indexOf(q)>=0)){
      results.push({type:'Sponsor',icon:'💰',title:s.name,sub:s.status+' · '+s.ask,action:"window._spTab='tracker';showPanel('sponsors');toggleSearch()"});
    }
  });

  // Library
  S.posts.forEach(function(p){
    if(p.title.toLowerCase().indexOf(q)>=0||(p.tag&&p.tag.toLowerCase().indexOf(q)>=0)){
      results.push({type:'Article',icon:'📚',title:p.title,sub:p.tag+' · '+p.status,action:"editPost("+p.id+");toggleSearch()"});
    }
  });

  // Calendar
  S.calEvents.forEach(function(e){
    if(e.title.toLowerCase().indexOf(q)>=0||(e.who&&e.who.toLowerCase().indexOf(q)>=0)){
      results.push({type:'Event',icon:'📅',title:e.title,sub:e.date+(e.who?' · '+e.who:''),action:"showPanel('calendar');toggleSearch()"});
    }
  });

  // Board cards
  var bd=lsGet('chq-board',{columns:[]});
  (bd.columns||[]).forEach(function(col){
    (col.cards||[]).forEach(function(card){
      if(card.title.toLowerCase().indexOf(q)>=0||(card.body&&card.body.toLowerCase().indexOf(q)>=0)){
        results.push({type:'Board',icon:'🗂',title:card.title,sub:col.title+(card.who?' · '+card.who:''),action:"showPanel('board');toggleSearch()"});
      }
    });
  });

  // Inbox
  var inbox=lsGet('chq-inbox',[]);
  inbox.forEach(function(m){
    if(m.text.toLowerCase().indexOf(q)>=0){
      results.push({type:'Inbox',icon:'📬',title:m.text.substring(0,60)+(m.text.length>60?'...':''),sub:m.from+' · '+m.time,action:"showPanel('inbox');toggleSearch()"});
    }
  });

  if(!results.length){
    res.innerHTML='<div style="font-family:var(--fd);font-style:italic;font-size:.9rem;color:rgba(216,212,236,.4);text-align:center;padding:2rem">Nothing found for "'+q+'"</div>';
    return;
  }

  res.innerHTML=results.slice(0,12).map(function(r){
    return '<div onclick="'+r.action+'" style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:rgba(255,255,255,.05);border-radius:3px;cursor:pointer;border:1px solid rgba(216,212,236,.08);transition:background .15s" onmouseover="this.style.background=\'rgba(255,255,255,.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,.05)\'">' +
      '<div style="font-size:1.1rem">'+r.icon+'</div>' +
      '<div style="flex:1"><div style="font-size:.82rem;font-weight:600;color:var(--ch)">'+r.title+'</div><div style="font-family:var(--fm);font-size:.52rem;color:rgba(216,212,236,.4);margin-top:.1rem">'+r.type+' · '+r.sub+'</div></div>' +
      '<div style="font-family:var(--fm);font-size:.5rem;color:rgba(216,212,236,.3)">↵</div>' +
      '</div>';
  }).join('');
}

// Close search on ESC
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var so=document.getElementById('search-overlay');
    var qo=document.getElementById('qc-overlay');
    if(so&&so.style.display==='flex') toggleSearch();
    if(qo&&qo.style.display==='flex') toggleQC();
  }
});

// ═══ QUICK CAPTURE ════════════════════════════════════════════
function toggleQC(){
  var ov=document.getElementById('qc-overlay');
  if(!ov)return;
  var isOpen=ov.style.display==='flex';
  ov.style.display=isOpen?'none':'flex';
  if(!isOpen){
    var ta=document.getElementById('qc-text');
    if(ta){ta.value='';ta.focus();}
  }
}

function submitQC(){
  var ta=document.getElementById('qc-text');
  var dest=document.getElementById('qc-dest');
  if(!ta||!ta.value.trim())return;
  var text=ta.value.trim();
  var destination=dest?dest.value:'inbox';

  if(destination==='inbox'){
    var inbox=lsGet('chq-inbox',[]);
    inbox.push({id:Date.now(),from:S.role,text:text,time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),readBy:[S.role],tag:'',link:''});
    lsSave('chq-inbox',inbox);
  } else if(destination==='todo'){
    if(!S.todos[S.role])S.todos[S.role]=[];
    S.todos[S.role].push({id:Date.now(),text:text,done:false});
    lsSave('chq-td',S.todos);
  } else if(destination.indexOf('board-')===0){
    var colId=destination.replace('board-','');
    var bd=lsGet('chq-board',{columns:[]});
    var col=bd.columns.find(function(c){return c.id===colId;});
    if(col){col.cards.push({id:Date.now(),title:text,body:'',tag:'',due:'',who:S.role==='amelia'?'Amelia':'Laneea'});}
    lsSave('chq-board',bd);
  }

  showToast('Captured!');
  toggleQC();
}

// ═══ SHARED INBOX ═════════════════════════════════════════════
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

function linkify(text){
  return text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:var(--tz3);text-decoration:underline">$1</a>');
}

var _inboxTag='';
function toggleInboxTag(btn){
  var tag=btn.dataset.tag;
  document.querySelectorAll('.inbox-tag-btn').forEach(function(b){
    b.style.background='transparent';b.style.color='var(--wg)';b.style.borderColor='var(--du)';
  });
  if(_inboxTag===tag){_inboxTag='';return;}
  _inboxTag=tag;
  btn.style.background=btn.style.background||'var(--tz3)';
  btn.style.color='var(--tz)';
  btn.style.borderColor='var(--tz3)';
}

function sendInbox(){
  var ta=document.getElementById('inbox-compose');
  if(!ta||!ta.value.trim())return;
  var inbox=lsGet('chq-inbox',[]);
  var msg={id:Date.now(),from:S.role,text:ta.value.trim(),time:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}),readBy:[S.role],tag:_inboxTag};
  inbox.push(msg);
  lsSave('chq-inbox',inbox);
  _inboxTag='';
  ta.value='';
  bInbox();
}

function markInboxRead(id){
  var inbox=lsGet('chq-inbox',[]);
  var m=inbox.find(function(x){return x.id===id;});
  if(m){if(!m.readBy)m.readBy=[];if(m.readBy.indexOf(S.role)<0)m.readBy.push(S.role);}
  lsSave('chq-inbox',inbox);
  var el=document.getElementById('inm-'+id);
  if(el)el.style.borderRight='none';
}



// ═══ PEACE PAGE ══════════════════════════════════════════════
var _medTimer=null;
var _medSecs=0;
var _medRunning=false;
var _breathPhase=0;
var _breathTimer=null;

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

function bPeace(){
  var defaults={
    gratitude:{},
    journal:{},
    sleep:{},
    quitDate:'',
    copy:{
      gratitudeTitle:'Three Things',
      gratitudePrompt:'Name three things that softened, strengthened, or surprised you today.',
      gratitudePlaceholder:'I am grateful for...',
      journalTitle:'Journal',
      journalPrompt:'Let the page hold what your body is still trying to say.',
      journalPlaceholder:'This space is yours. No one else reads this.',
      windDownTitle:'Wind Down',
      windDownPrompt:'Build a softer landing into sleep.',
      windDownItems:[
        'No screens 30 min before bed',
        'Magnesium supplement',
        'Light stretch or legs up the wall',
        'Room cool and dark',
        'Set tomorrow intention'
      ]
    }
  };
  var saved=lsGet('chq-peace',null)||{};
  var pd={
    gratitude:saved.gratitude&&typeof saved.gratitude==='object'?saved.gratitude:{},
    journal:saved.journal&&typeof saved.journal==='object'?saved.journal:{},
    sleep:saved.sleep&&typeof saved.sleep==='object'?saved.sleep:{},
    quitDate:saved.quitDate||'',
    copy:Object.assign({},defaults.copy,saved.copy&&typeof saved.copy==='object'?saved.copy:{})
  };
  if(!Array.isArray(pd.copy.windDownItems))pd.copy.windDownItems=defaults.copy.windDownItems.slice();
  pd.copy.windDownItems=defaults.copy.windDownItems.map(function(item,idx){
    return pd.copy.windDownItems[idx]||item;
  });
  lsWriteLocal('chq-peace',pd);

  var today=new Date().toISOString().split('T')[0];
  var todayGrat=Array.isArray(pd.gratitude&&pd.gratitude[today])?pd.gratitude[today]:['','',''];
  var todayJournal=pd.journal&&pd.journal[today]||'';
  var todaySleep=pd.sleep&&typeof pd.sleep[today]==='object'&&pd.sleep[today]?pd.sleep[today]:{};
  var quoteIdx=new Date().getDate()%_quotes.length;
  var quote=_quotes[quoteIdx];

  // Days clean
  var daysClean=0;
  var fd=lsGet('chq-fitness',{});
  if(fd.quit&&fd.quit.startDate){
    daysClean=Math.floor((new Date()-new Date(fd.quit.startDate))/(1000*60*60*24));
  }

  inject(
    '<div style="background:var(--tz);min-height:100%;padding:1.5rem 1.75rem;display:flex;flex-direction:column;gap:1.25rem">' +

    // QUOTE
    '<div style="background:rgba(255,255,255,.04);border-radius:3px;padding:1.5rem;border-left:3px solid rgba(240,216,152,.3);text-align:center">' +
    '<div style="font-family:var(--fd);font-size:1.15rem;font-style:italic;color:var(--ch);line-height:1.75;margin-bottom:.65rem">'+quote.text+'</div>' +
    '<div style="font-family:var(--fm);font-size:.5rem;letter-spacing:3px;color:rgba(240,216,152,.3);text-transform:uppercase">— '+quote.author+'</div>' +
    '</div>' +

    // CLARITY TRACKER
    '<div style="background:rgba(255,255,255,.04);border-radius:3px;padding:1.25rem;text-align:center">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.35rem">Clarity</div>' +
    '<div style="font-family:var(--fd);font-size:3rem;font-style:italic;color:'+(daysClean>0?'var(--sg)':'rgba(240,216,152,.3)')+';line-height:1">'+daysClean+'</div>' +
    '<div style="font-family:var(--fm);font-size:.52rem;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.65rem">days of clarity</div>' +
    '<div style="font-size:.78rem;color:rgba(216,212,236,.5);font-style:italic;line-height:1.5">The waist you want is on the other side of this number growing.</div>' +
    '</div>' +

    // MEDITATION TIMER
    '<div style="background:rgba(255,255,255,.04);border-radius:3px;padding:1.25rem">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.85rem;text-align:center">Meditation</div>' +
    '<div style="display:flex;gap:.5rem;justify-content:center;margin-bottom:.85rem">' +
    [5,10,20].map(function(m){
      return '<button onclick="startMed('+m+')" style="background:rgba(255,255,255,.06);border:1px solid rgba(216,212,236,.15);border-radius:3px;padding:.45rem .9rem;font-family:var(--fm);font-size:.6rem;color:rgba(216,212,236,.6);cursor:pointer;letter-spacing:2px;text-transform:uppercase">'+m+' min</button>';
    }).join('') +
    '</div>' +
    '<div id="med-display" style="text-align:center">' +
    '<div id="med-circle" style="width:100px;height:100px;border-radius:50%;border:2px solid rgba(240,216,152,.2);margin:0 auto .85rem;display:flex;align-items:center;justify-content:center;transition:all 1s">' +
    '<div id="med-time" style="font-family:var(--fd);font-size:1.5rem;font-style:italic;color:rgba(240,216,152,.6)">—</div>' +
    '</div>' +
    '<button id="med-btn" onclick="toggleMed()" style="background:transparent;border:1px solid rgba(216,212,236,.2);border-radius:3px;padding:.35rem .85rem;font-family:var(--fm);font-size:.55rem;color:rgba(216,212,236,.4);cursor:pointer;letter-spacing:2px;text-transform:uppercase">Start</button>' +
    '</div>' +
    '</div>' +

    // BOX BREATHING
    '<div style="background:rgba(255,255,255,.04);border-radius:3px;padding:1.25rem">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(240,216,152,.3);text-transform:uppercase;margin-bottom:.65rem;text-align:center">Box Breathing — 4 counts each</div>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap">' +
    '<div id="breath-circle" style="width:120px;height:120px;border-radius:50%;border:2px solid rgba(200,192,232,.3);display:flex;align-items:center;justify-content:center;transition:all 4s;flex-shrink:0">' +
    '<div id="breath-label" style="font-family:var(--fd);font-size:.95rem;font-style:italic;color:rgba(216,212,236,.5);text-align:center">Breathe</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:.35rem">' +
    ['Inhale — 4 counts','Hold — 4 counts','Exhale — 4 counts','Hold — 4 counts'].map(function(s,i){
      return '<div style="font-family:var(--fm);font-size:.52rem;color:rgba(216,212,236,.3);letter-spacing:1px">'+s+'</div>';
    }).join('') +
    '</div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:.65rem">' +
    '<button onclick="startBreath()" id="breath-btn" style="background:transparent;border:1px solid rgba(216,212,236,.2);border-radius:3px;padding:.35rem .85rem;font-family:var(--fm);font-size:.55rem;color:rgba(216,212,236,.4);cursor:pointer;letter-spacing:2px;text-transform:uppercase">Begin</button>' +
    '</div>' +
    '</div>' +

    // GRATITUDE
    '<div style="background:linear-gradient(180deg,rgba(133,101,184,.2),rgba(82,56,128,.18));border:1px solid rgba(180,154,230,.16);border-radius:3px;padding:1.25rem;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(222,202,255,.6);text-transform:uppercase;margin-bottom:.3rem"><span data-e="peace:copy:gratitudeTitle">'+pd.copy.gratitudeTitle+'</span> — '+new Date().toLocaleDateString('en-US',{month:'long',day:'numeric'})+'</div>' +
    '<div style="font-size:.75rem;color:rgba(229,220,248,.68);font-style:italic;line-height:1.7;margin-bottom:.7rem" data-e="peace:copy:gratitudePrompt">'+pd.copy.gratitudePrompt+'</div>' +
    [0,1,2].map(function(i){
      return '<div style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.45rem">' +
        '<div style="font-family:var(--fd);font-size:1.1rem;font-style:italic;color:rgba(222,202,255,.58);flex-shrink:0;margin-top:2px">'+(i+1)+'.</div>' +
        '<input id="grat-'+i+'" value="'+( todayGrat[i]||'')+'" placeholder="'+pd.copy.gratitudePlaceholder.replace(/"/g,'&quot;')+'" style="background:transparent;border:none;border-bottom:1px solid rgba(208,188,244,.18);outline:none;font-family:var(--fd);font-size:.9rem;font-style:italic;color:rgba(244,239,255,.9);width:100%;padding:.25rem 0" onblur="saveGratitude('+i+',this.value)">' +
        '</div>';
    }).join('') +
    '<div style="margin-top:.35rem;font-size:.68rem;color:rgba(202,183,234,.55)" data-e="peace:copy:gratitudePlaceholder">'+pd.copy.gratitudePlaceholder+'</div>' +
    '</div>' +

    // JOURNAL
    '<div style="background:linear-gradient(180deg,rgba(120,86,180,.24),rgba(70,42,112,.2));border:1px solid rgba(180,154,230,.16);border-radius:3px;padding:1.25rem;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(222,202,255,.6);text-transform:uppercase;margin-bottom:.3rem" data-e="peace:copy:journalTitle">'+pd.copy.journalTitle+'</div>' +
    '<div style="font-size:.75rem;color:rgba(229,220,248,.68);font-style:italic;line-height:1.7;margin-bottom:.7rem" data-e="peace:copy:journalPrompt">'+pd.copy.journalPrompt+'</div>' +
    '<textarea id="peace-journal" placeholder="'+pd.copy.journalPlaceholder.replace(/"/g,'&quot;')+'" style="width:100%;min-height:150px;background:rgba(255,255,255,.02);border:1px solid rgba(208,188,244,.12);outline:none;font-family:var(--fd);font-size:.9rem;font-style:italic;color:rgba(244,239,255,.82);line-height:1.85;resize:none;padding:.7rem .8rem;border-radius:3px" onblur="saveJournal(this.value)">'+todayJournal+'</textarea>' +
    '<div style="margin-top:.45rem;font-size:.68rem;color:rgba(202,183,234,.55)" data-e="peace:copy:journalPlaceholder">'+pd.copy.journalPlaceholder+'</div>' +
    '</div>' +

    // SLEEP CHECKLIST
    '<div style="background:linear-gradient(180deg,rgba(108,78,162,.24),rgba(61,38,104,.22));border:1px solid rgba(180,154,230,.16);border-radius:3px;padding:1.25rem;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)">' +
    '<div style="font-family:var(--fm);font-size:.48rem;letter-spacing:4px;color:rgba(222,202,255,.6);text-transform:uppercase;margin-bottom:.3rem" data-e="peace:copy:windDownTitle">'+pd.copy.windDownTitle+'</div>' +
    '<div style="font-size:.75rem;color:rgba(229,220,248,.68);font-style:italic;line-height:1.7;margin-bottom:.7rem" data-e="peace:copy:windDownPrompt">'+pd.copy.windDownPrompt+'</div>' +
    pd.copy.windDownItems.map(function(item,i){
      var done=todaySleep[i];
      return '<div onclick="toggleSleep('+i+')" style="display:flex;align-items:center;gap:.55rem;padding:.35rem 0;border-bottom:1px solid rgba(216,212,236,.07);cursor:pointer">' +
        '<div style="width:15px;height:15px;border-radius:50%;border:1px solid rgba(216,212,236,'+(done?'.75':'.28')+');background:'+(done?'rgba(170,130,236,.34)':'transparent')+';flex-shrink:0"></div>' +
        '<div style="font-size:.78rem;color:rgba(236,228,250,'+(done?'.84':'.54')+')" data-e="peace:wind:'+i+':label">'+item+'</div>' +
        '</div>';
    }).join('') +
    '</div>' +

    '</div>'
  );
}

function startMed(mins){
  _medSecs=mins*60;
  _medRunning=false;
  var el=document.getElementById('med-time');
  if(el){var m=Math.floor(_medSecs/60),s=_medSecs%60;el.textContent=m+':'+(s<10?'0':'')+s;}
  var btn=document.getElementById('med-btn');
  if(btn)btn.textContent='Start';
}

function toggleMed(){
  if(_medSecs<=0)return;
  _medRunning=!_medRunning;
  var btn=document.getElementById('med-btn');
  if(btn)btn.textContent=_medRunning?'Pause':'Resume';
  if(_medRunning){
    _medTimer=setInterval(function(){
      _medSecs--;
      var el=document.getElementById('med-time');
      if(el){var m=Math.floor(_medSecs/60),s=_medSecs%60;el.textContent=m+':'+(s<10?'0':'')+s;}
      var circ=document.getElementById('med-circle');
      if(circ){var pct=Math.sin(Date.now()/3000)*15;circ.style.transform='scale('+(1+pct/100)+')';}
      if(_medSecs<=0){
        clearInterval(_medTimer);_medRunning=false;
        var el2=document.getElementById('med-time');if(el2)el2.textContent='✓';
        var btn2=document.getElementById('med-btn');if(btn2)btn2.textContent='Done';
        showToast('Session complete');
      }
    },1000);
  } else {
    clearInterval(_medTimer);
  }
}

var _breathPhases=['Inhale','Hold','Exhale','Hold'];
var _breathIdx=0;
var _breathCount=0;
var _breathRunning=false;

function startBreath(){
  _breathRunning=!_breathRunning;
  var btn=document.getElementById('breath-btn');
  if(btn)btn.textContent=_breathRunning?'Stop':'Begin';
  if(!_breathRunning){clearInterval(_breathTimer);return;}
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
  if(phase==='Inhale'){circ.style.transform='scale(1.35)';circ.style.borderColor='rgba(200,192,232,.6)';}
  else if(phase==='Exhale'){circ.style.transform='scale(0.85)';circ.style.borderColor='rgba(200,192,232,.2)';}
  else{circ.style.transform='scale(1.1)';circ.style.borderColor='rgba(240,216,152,.3)';}
}

function saveGratitude(idx,val){
  var pd=lsGet('chq-peace',{gratitude:{}});
  var today=new Date().toISOString().split('T')[0];
  if(!pd.gratitude)pd.gratitude={};
  if(!pd.gratitude[today])pd.gratitude[today]=['','',''];
  pd.gratitude[today][idx]=val;
  lsSave('chq-peace',pd);
}

function saveJournal(val){
  var pd=lsGet('chq-peace',{journal:{}});
  var today=new Date().toISOString().split('T')[0];
  if(!pd.journal)pd.journal={};
  pd.journal[today]=val;
  lsSave('chq-peace',pd);
}

function toggleSleep(idx){
  var pd=lsGet('chq-peace',{sleep:{}});
  var today=new Date().toISOString().split('T')[0];
  if(!pd.sleep)pd.sleep={};
  if(!pd.sleep[today])pd.sleep[today]={};
  pd.sleep[today][idx]=!pd.sleep[today][idx];
  lsSave('chq-peace',pd);
  rerenderKeepScroll(bPeace);
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
  if(btn){btn.classList.toggle('on',S.emActive);btn.textContent=S.emActive?'Exit Edit Mode':'Edit Mode';}
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
