// ═══ SOCIAL ════════════════════════════════════════════════
// Crown HQ — social.js

var DA={
  ig:{head:'ig',title:'Instagram Bio',platform:'@ameliavarabe',text:"engineer building the future\ncellist. miss california usa '26\nfounder @libraryofmorenita\ni learned to find the light. bask in it\nsan diego"},
  press:{head:'press',title:'Press Bio',platform:'Third person',text:"Amelia Arabe is a Filipina-American student engineer, classically trained cellist, and 2026 candidate for Miss California USA based in San Diego.\n\nShe is the founder of Library of Morenita — a sustainable digital archive built for the next century.\n\nA Top Model award winner at Miss Philippines USA, Amelia brings engineering precision and performance presence to every stage.\n\nShe competes not for a crown, but for a microphone.\n\nRepresented by Laneea Love."},
  sub:{head:'sub',title:'Substack',platform:'Library of Morenita',text:"Dispatches from the intersection of engineering, culture, and the planet.\n\nFor people who build things, wear things, and wonder about the systems behind both.\n\nBy Amelia Arabe — engineer, cellist, she/they. San Diego."},
  li:{head:'li',title:'LinkedIn Headline',platform:'LinkedIn',text:"Student Engineer · Net-Zero Hardware Design · Founder, Library of Morenita · Miss California USA 2026 Candidate · San Diego"},
};


function bBrand(){
  inject(
    '<div class="ph"><div><div class="ph-tag">Identity</div><div class="ph-title"><em>Brand</em> Assets</div></div>' +
    '<div class="ph-acts"><button class="btn bc" onclick="saveAllBrand()">Save All</button></div></div>' +
    '<div class="pb"><div class="g2">' +
    Object.entries(DA).map(function(entry){

function saveAllBrand(){lsSave('chq-br',S.brand);showToast('Brand saved');}

function copyAsset(id,btn){
  var el=g(id);if(!el)return;
  navigator.clipboard.writeText(el.value||el.innerText);
  btn.textContent='Copied!';btn.classList.add('cp');
  setTimeout(function(){btn.textContent='Copy';btn.classList.remove('cp');},2000);
}

// ═══ MOODBOARD ═══════════════════════════════════════════════

function bSocial(){

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
