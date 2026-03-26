// ═══ LIBRARY ════════════════════════════════════════════════
// Crown HQ — library.js

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

function newPost(){

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

function insImg(e){

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
