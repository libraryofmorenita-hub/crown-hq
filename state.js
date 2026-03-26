// ═══ STATE ════════════════════════════════════════════════
// Crown HQ — state.js

var SB_URL='https://haqfxrcsszjwiyrchqnm.supabase.co';

var SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcWZ4cmNzc3pqd2l5cmNocW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDY5NjIsImV4cCI6MjA4OTg4Mjk2Mn0.eioSLntQ0E1mIxUC_r4kmmVbzrIi-d69LLO4rnn0Nlg';

function sbFetch(table,method,body,match){

function sbGet(table){return sbFetch(table,'GET',null,'order=id');}

function sbUpsert(table,rows){if(!rows||!rows.length)return Promise.resolve();return sbFetch(table,'POST',rows);}

function sbGetKV(key){
  return fetch(SB_URL+'/rest/v1/app_data?key=eq.'+encodeURIComponent(key),{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}})
  .then(function(r){return r.json();}).then(function(rows){return rows&&rows.length?rows[0].value:null;}).catch(function(){return null;});
}

function sbSetKV(key,value){
  return fetch(SB_URL+'/rest/v1/app_data',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},body:JSON.stringify({key:key,value:value,updated_at:new Date().toISOString()})}).catch(function(){});
}

function loadFromSupabase(){
  return Promise.all([sbGet('sponsors'),sbGet('calendar_events'),sbGet('posts'),sbGet('looks'),sbGet('workouts'),sbGet('messages'),sbGet('files'),sbGet('mood_board')])
  .then(function(results){

function sbSaveSponsors(){sbUpsert('sponsors',S.sponsors.map(function(s){return{id:s.id,name:s.name,cat:s.cat,ask:s.ask,status:s.status,amount:s.amount||0,notes:s.notes||'',link:s.link||'',updated_at:new Date().toISOString()};}));}

function sbSaveEvents(){sbUpsert('calendar_events',S.calEvents.map(function(e){return{id:e.id,title:e.title,date:e.date,time:e.time||'',dur:e.dur||1,type:e.type||'coach',who:e.who||'',updated_at:new Date().toISOString()};}));}

function sbSavePosts(){sbUpsert('posts',S.posts.map(function(p){return{id:p.id,title:p.title,tag:p.tag||'',cat:p.cat||'',date:p.date||'',status:p.status||'draft',cover:p.cover||'',body:p.body||'',updated_at:new Date().toISOString()};}));}

function sbSaveLooks(){sbUpsert('looks',S.looks.map(function(l){return{id:l.id,event_name:l.event||'',round_name:l.round||'',title:l.title||'',description:l.desc||'',img:l.img||'',updated_at:new Date().toISOString()};}));}

function sbSaveWorkouts(){sbUpsert('workouts',S.workouts.map(function(w){return{id:w.id,day:w.day||'',focus:w.focus||'',exercises:w.exercises||[],notes:w.notes||'',updated_at:new Date().toISOString()};}));}

function sbSaveMessages(){sbUpsert('messages',S.messages.map(function(m){return{id:m.id,from_role:m.from||'',to_role:m.to||'',body:m.text||'',time:m.time||'',updated_at:new Date().toISOString()};}));}

function sbSaveFiles(){sbUpsert('files',FILE_STORE.map(function(f,i){return{id:Date.now()+i,name:f.name,size:f.size,file_type:f.type,data:f.data,updated_at:new Date().toISOString()};}));}

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

function lsSave(k,v){
  try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}
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
}

function sv(k,v){S[k]=v;lsSave('chq-'+k.replace(/[A-Z]/g,function(c){return '-'+c.toLowerCase();}).replace('chq-',''),v);}

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
  if(!S.appts.length){  if(!S.appts.length){
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
        {id:1,text:'Pay $500 deposit by March 31',done:false},
        {id:2,text:'Post one YouTube Short this week',done:false},
        {id:3,text:'Walk into Lucid Motors SD with printed deck',done:false},
        {id:4,text:'Email Paired Power and SD Community Power',done:false},
        {id:5,text:'Book Kristen Axmaker meeting',done:true},
      ],
      laneea:[
        {id:1,text:'Confirm H2OM swimsuit sizing',done:false},
        {id:2,text:'Research sustainable gown designers SD',done:false},
        {id:3,text:'Book HMU trial for gown night look',done:true},
        {id:4,text:'Prepare wardrobe one-pager for sponsors',done:false},
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
