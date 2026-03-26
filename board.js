// ═══ BOARD ════════════════════════════════════════════════
// Crown HQ — board.js

function bBoard(){

function renderBoardCard(card,colId){

function addCardToCol(colId){
  var title=prompt('Card title:');
  if(!title)return;

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

function saveBoardCard(cardId,colId){
  var bd=lsGet('chq-board',{columns:[]});

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

function linkify(text){
  return text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" style="color:var(--tz3);text-decoration:underline">$1</a>');
}


var _inboxTag='';

function toggleInboxTag(btn){

function sendInbox(){
  var ta=document.getElementById('inbox-compose');
  if(!ta||!ta.value.trim())return;
  var inbox=lsGet('chq-inbox',[]);

function markInboxRead(id){
  var inbox=lsGet('chq-inbox',[]);
  var m=inbox.find(function(x){return x.id===id;});
  if(m){if(!m.readBy)m.readBy=[];if(m.readBy.indexOf(S.role)<0)m.readBy.push(S.role);}
  lsSave('chq-inbox',inbox);
  var el=document.getElementById('inm-'+id);
  if(el)el.style.borderRight='none';
}



function toggleSearch(){
  var ov=document.getElementById('search-overlay');
  if(!ov)return;

function runSearch(q){
  q=q.toLowerCase().trim();

function toggleQC(){
  var ov=document.getElementById('qc-overlay');
  if(!ov)return;
  var isOpen=ov.style.display==='flex';
  ov.style.display=isOpen?'none':'flex';
  if(!isOpen){

function submitQC(){
  var ta=document.getElementById('qc-text');
