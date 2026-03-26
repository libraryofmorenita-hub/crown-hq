// ═══ AUTH ════════════════════════════════════════════════
// Crown HQ — auth.js

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
      {ico:'🏠',lbl:'Dashboard',id:'trainer-dash'},
      {ico:'💪',lbl:'Workouts',id:'fitness'},
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

function doSwitch(){
  S.role=null; S.emActive=false;
  document.body.classList.remove('em');
  var eb=g('em-btn'); if(eb){eb.classList.remove('on');eb.textContent='Edit Mode';}
  document.getElementById('login').style.display='flex';
  document.getElementById('app').classList.remove('on');
  // reset pw overlays
  ['amelia','laneea'].forEach(function(r){

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
  'dashboard':bDash,'laneea-dash':bLaneaDash,'hmu-dash':bHMUDash,'trainer-dash':bTrainerDash,
  'sponsor-portal':bSponsorPortal,'sponsors':bSponsors,'calendar':bCalendar,
  'library':bLibrary,'quiz':bQuiz,'brand':bBrand,'moodboard':bMoodboard,
  'looks':bLooks,'fitness':bFitness,'messages':bMessages,'files':bFiles,
  'deliverables':bDeliverables,'comp-progress':bCompProgress,'advocacy':bAdvocacy,'board':bBoard,'lookbook':bLookbook,'social':bSocial,'inbox':bInbox
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

function openM(id){g(id).classList.add('on');}

function closeM(id){g(id).classList.remove('on');}

function fdate(d){if(!d)return'';var dt=new Date(d+'T12:00:00');return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});}

function showToast(msg){var t=g('toast');if(!t)return;t.textContent=msg||'Saved';t.classList.add('on');clearTimeout(window._tt);window._tt=setTimeout(function(){t.classList.remove('on');},1800);}

// ═══ AMELIA DASHBOARD ════════════════════════════════════════
