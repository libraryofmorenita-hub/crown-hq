// ═══ ADVOCACY ════════════════════════════════════════════════
// Crown HQ — advocacy.js

function bAdvocacy(){

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

