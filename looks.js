// ═══ LOOKS ════════════════════════════════════════════════
// Crown HQ — looks.js

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
        '<div class="look-ev">'+l.event+'</div>' +
        '<div class="look-title" data-e="look:'+l.id+':title">'+l.title+'</div>' +
        '<div class="look-desc" data-e="look:'+l.id+':desc">'+l.desc+'</div>' +
        '<button class="btn bd" style="margin-top:.65rem;font-size:.6rem" onclick="removeLook('+l.id+')">Remove</button>' +
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
    '<textarea id="lb-bio" style="width:100%;min-height:90px;border:none;outline:none;font-family:var(--fd);font-size:.95rem;font-style:italic;color:var(--ink);line-height:1.8;resize:vertical;background:transparent" placeholder="What sponsors read when they open the lookbook...">'+(lsGet('chq-lb-bio','')||'Amelia Arabe is a Filipina-American student engineer, cellist, and Miss California USA 2026 candidate based in San Diego. Her platform is clean energy and textile accountability policy. She competes not for a crown — but for a microphone.')+'</textarea>' +
    '</div>' +
    '<button class="btn bp" onclick="saveLookbookData()">Save Lookbook</button>' +
    '</div>'
  );
}


function getLookbookImgs(){return lsGet('chq-lb-imgs',[]);}


function addLookbookImg(e){

function removeLookbookImg(i){
  var imgs=getLookbookImgs();
  imgs.splice(i,1);
  lsSave('chq-lb-imgs',imgs);
  bLookbook();
}


function saveLookbookData(){

function previewLookbook(){
  var imgs=getLookbookImgs();
