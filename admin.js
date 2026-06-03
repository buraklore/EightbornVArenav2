// ═══ ADMIN (simplified for focus on tournament) ═══
const AT=[{k:'games',l:'Oyunlar',i:'🎮'},{k:'ranking',l:'Sıralama',i:'🏆'},{k:'users',l:'Kullanıcılar',i:'👤'},{k:'gameedit',l:'Oyun Düzenle',i:'✏️'},{k:'questions',l:'Sorular',i:'❓'},{k:'whoChars',l:'WHO Sonuçları',i:'🪞'},{k:'ads',l:'Reklamlar',i:'📢'},{k:'msgs',l:'Mesajlar',i:'📨'},{k:'hero',l:'Hero Görseli',i:'🖼️'},{k:'discord',l:'Discord',i:'🎮'},{k:'footerpages',l:'Footer Sayfaları',i:'📄'},{k:'chars',l:'Karakterler',i:'⚔️'},{k:'seo',l:'SEO',i:'🔍'}];
function rAdm(){document.getElementById('adm-nav').innerHTML=AT.map(t=>'<button class="nl'+(aTab===t.k?' a':'')+'" style="justify-content:flex-start;width:100%;font-size:15px;padding:12px 16px" onclick="aTab=\''+t.k+'\';rAdm()">'+t.i+' '+t.l+'</button>').join('');const e=document.getElementById('adm-c');({chars:aChars,questions:aQuestions,games:aGames,ranking:aRanking,users:aUsers,ads:aAds,msgs:aMsgs,gameedit:aGameEdit,hero:aHero,discord:aDiscord,footerpages:aFooterPages,seo:aSeo,whoChars:aWhoChars})[aTab](e)}

function aChars(e){
  if(!window._dataReady){
    e.innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)">Karakterler yükleniyor...</div>';
    setTimeout(function(){aChars(e);},500);
    return;
  }
  var noDbId=chars.filter(function(c){return !c.dbId && c.a;});
  if(noDbId.length>0){
    e.innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)">Karakterler veritabanına aktarılıyor... ('+noDbId.length+')</div>';
    var done=0;
    noDbId.forEach(function(c){
      apiSaveCharacter({n:c.n,s:c.s||'',rep:c.rep||'',tip:c.tip||'',g:c.g||'M',a:c.a!==false,img:c.img||'',origName:c.n,origSurname:c.s||''}).then(function(r){
        if(r.id){c.dbId=r.id;}
        done++;if(done>=noDbId.length){toast(done+' karakter aktarıldı.');aChars(e);}
      }).catch(function(){done++;if(done>=noDbId.length)aChars(e);});
    });
    return;
  }
  var sortedChars=chars.slice().sort(function(a,b){return (a.n+' '+a.s).localeCompare(b.n+' '+b.s,'tr')});
  e.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">⚔️ Karakterler <span class="badge bv">'+chars.length+'</span> <span style="font-size:11px;color:var(--t3);font-weight:400;margin-left:8px">👨 '+chars.filter(x=>x.g==="M").length+' erkek · 👩 '+chars.filter(x=>x.g==="F").length+' kadın · ✅ '+chars.filter(x=>x.a!==false).length+' aktif · ❌ '+chars.filter(x=>x.a===false).length+' pasif · 💬 '+chars.filter(x=>x.rep&&x.rep.trim()).length+' replik</span></h3><button class="btn bp bsm" onclick="cMod()">+ Ekle</button></div><div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--b1);font-size:11px;color:var(--t3)"><th style="text-align:left;padding:10px 14px">Foto</th><th style="text-align:left;padding:10px">Karakter</th><th style="text-align:center;padding:10px">Cinsiyet</th><th style="text-align:center;padding:10px">Durum</th><th style="text-align:right;padding:10px 14px;width:90px">İşlem</th></tr></thead><tbody>'+sortedChars.map(c=>'<tr style="border-bottom:1px solid #2a2a3a20" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'"><td style="padding:8px 14px"><div style="width:44px;height:44px;border-radius:10px;overflow:hidden">'+cp(c,44)+'</div></td><td style="padding:8px 10px"><div style="font-size:13px;font-weight:500">'+esc(c.n)+' '+esc(c.s)+'</div>'+(c.rep?'<div style="font-size:11px;color:var(--t3);font-style:italic;margin-top:2px">\"'+esc(c.rep)+'\"</div>':'')+'</td><td style="padding:8px;text-align:center">'+(c.g==='F'?'<span style="font-size:13px;padding:4px 10px;border-radius:8px;background:rgba(255,84,77,0.08);color:#ff544d">👩 Kadın</span>':'<span style="font-size:13px;padding:4px 10px;border-radius:8px;background:#60a5fa20;color:#60a5fa">👨 Erkek</span>')+'</td><td style="padding:8px;text-align:center"><span class="badge '+(c.a?'bm2':'bpk')+'">'+(c.a?'Aktif':'Pasif')+'</span></td><td style="padding:8px 14px;text-align:right"><button class="btn bg bsm" style="padding:3px 6px" onclick="cMod(\''+(c.dbId||c.id)+'\')">✏️</button> <button class="btn bg bsm" style="padding:3px 6px;color:var(--pk)" onclick="delChar(\''+c.id+'\','+(c.dbId||'null')+')">🗑️</button></td></tr>').join('')+'</tbody></table></div>'}

function delChar(localId, dbId) {
  if (!confirm('Bu karakteri silmek istediğine emin misin?')) return;
  var c = chars.find(function(x){ return x.id == localId; });
  if (!c) return;
  
  if (dbId && dbId !== 'null') {
    // DB character — delete from DB then save as deleted
    apiDeleteCharacter(dbId).then(function(r) {
      // Also save to deleted list so data.js chars don't come back
      saveDeletedChar(c);
      chars = chars.filter(function(x) { return x.id != localId; });
      toast('Kalıcı olarak silindi.');
      aChars(document.getElementById('adm-c'));
    });
  } else {
    // data.js character — save to deleted list in DB
    saveDeletedChar(c);
    chars = chars.filter(function(x) { return x.id != localId; });
    toast('Kalıcı olarak silindi.');
    aChars(document.getElementById('adm-c'));
  }
}

function saveDeletedChar(c) {
  var key = (c.n||'') + '|' + (c.s||'');
  apiGet('/game-config').then(function(r) {
    var deleted = [];
    try { deleted = JSON.parse(r.deleted_chars || '[]'); } catch(e){}
    if (deleted.indexOf(key) === -1) deleted.push(key);
    apiPost('/game-config', {key:'deleted_chars', value:JSON.stringify(deleted)});
  });
}

function cMod(id){const c=id?chars.find(x=>x.dbId==id||x.id==id):null;
var avSrc=c?c._av||mkAv(c):'';
modal('<h3 class="fd">'+(c?'Düzenle':'Yeni Karakter')+'<button class="close" onclick="closeModal()">\u2715</button></h3>'+
'<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">'+
'<div id="pbox" style="width:100px;height:100px;border-radius:16px;overflow:hidden;border:2px solid var(--b1);flex-shrink:0;background:var(--bg3)">'+(avSrc?'<img src="'+avSrc+'" style="width:100%;height:100%;object-fit:cover">':'<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--t3);font-size:11px">Fotoğraf\nyok</div>')+'</div>'+
'<div style="flex:1"><label class="lbl">Karakter Fotoğrafı</label><div style="display:flex;gap:8px"><button class="btn bs bsm" onclick="document.getElementById(\'cfile\').click()">📷 Dosya Seç</button><span style="font-size:10px;color:var(--t3);align-self:center">veya otomatik avatar</span></div><input type="file" id="cfile" accept="image/*" style="display:none" onchange="pvFile(this)"><input type="hidden" id="cimg" value="'+(c?.img||'')+'"></div></div>'+
'<div class="form-row"><div class="form-group"><label class="lbl">Ad *</label><input class="inp" id="cn" value="'+(c?.n||'')+'"></div><div class="form-group"><label class="lbl">Soyad</label><input class="inp" id="cs" value="'+(c?.s||'')+'"></div></div>'+
'<div class="form-row"><div class="form-group"><label class="lbl">Cinsiyet *</label><select class="inp" id="cg"><option value="M"'+(c?.g==='M'||!c?' selected':'')+'>\ud83d\udc68 Erkek</option><option value="F"'+(c?.g==='F'?' selected':'')+'>\ud83d\udc69 Kad\u0131n</option></select></div><div class="form-group"><label class="lbl">Kişilik Tipi</label><input class="inp" id="ctip" value="'+(c?.tip||'')+'" placeholder="örn: kavgacı, sinirli, araba seven..."></div></div>'+
'<div class="form-group"><label class="lbl">Replik</label><textarea class="inp" id="crep" placeholder="Karakterin ikonik repli\u011fi...">'+(c?.rep||'')+'</textarea></div>'+
'<div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="chk" id="ca" '+(c?.a!==false?'checked':'')+'> <span style="font-size:13px">Aktif</span></label></div>'+
'<button class="btn bp" style="width:100%" onclick="cSav(\''+(id||'')+'\')">'+(c?'\ud83d\udcbe G\u00fcncelle':'\u2795 Ekle')+'</button>')}
function pvUrl(v){document.getElementById('pbox').innerHTML=v?'<img src="'+v+'" style="width:100%;height:100%;object-fit:cover">':'<div style="color:var(--t3);font-size:12px;padding:16px;text-align:center">📷 Fotoğraf yükle</div>'}
function pvFile(i){if(!i.files[0])return;var file=i.files[0];var img=new Image();var reader=new FileReader();reader.onload=function(e){img.onload=function(){var canvas=document.createElement('canvas');var max=400;var w=img.width;var h=img.height;if(w>max){h=Math.round(h*(max/w));w=max}if(h>max){w=Math.round(w*(max/h));h=max}canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);var compressed=canvas.toDataURL('image/jpeg',0.75);document.getElementById('pbox').innerHTML='<img src="'+compressed+'" style="width:100%;height:100%;object-fit:cover">';document.getElementById('cimg').value=compressed};img.src=e.target.result};reader.readAsDataURL(file)}
function cSav(id){
  var n=document.getElementById('cn').value.trim();
  if(!n){toast('Ad zorunlu!',false);return}
  var origChar=id?chars.find(function(x){return String(x.dbId)==String(id)||String(x.id)==String(id)}):null;
  var numericId=null;
  if(origChar&&origChar.dbId)numericId=parseInt(origChar.dbId);
  if(!numericId&&id)numericId=parseInt(id);
  if(isNaN(numericId))numericId=null;
  
  var d={
    name:sanitize(n,30),
    surname:sanitize(document.getElementById('cs').value,30),
    rep:sanitize(document.getElementById('crep').value,200),
    tip:sanitize(document.getElementById('ctip').value,100),
    active:document.getElementById('ca').checked,
    img:document.getElementById('cimg').value.trim(),
    gender:document.getElementById('cg').value
  };
  if(numericId)d.id=numericId;
  if(origChar){d.origName=origChar.n;d.origSurname=origChar.s||'';}
  
  apiSaveCharacter(d).then(function(r){
    if(r.error){toast(r.error,false);return}
    if(origChar){
      origChar.n=d.name;origChar.s=d.surname;origChar.rep=d.rep;
      origChar.tip=d.tip;origChar.a=d.active;origChar.img=d.img;origChar.g=d.gender;
      if(r.id)origChar.dbId=r.id;
    }else{
      chars.push({id:r.id,dbId:r.id,n:d.name,s:d.surname,rep:d.rep,tip:d.tip,a:d.active,img:d.img,g:d.gender});
    }
    initAvatars();toast(origChar?'Güncellendi (ID:'+r.id+')':'Eklendi.');closeModal();aChars(document.getElementById('adm-c'));
  }).catch(function(){toast('Kayıt hatası',false)})
}

// ═══ ADMIN SORULAR ═══
function aQuestions(e){
  if(!window._dataReady){
    e.innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)">Sorular yükleniyor...</div>';
    setTimeout(function(){aQuestions(e);},500);
    return;
  }
  renderQuestions(e);
}

function renderQuestions(e){
  e.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">❓ Hafıza Oyunu Soruları <span class="badge bgl">'+memQs.length+'</span></h3><button class="btn bp bsm" onclick="mqMod()">+ Soru Ekle</button></div>'+
  memQs.map(function(q,i){return '<div class="card" style="margin-bottom:8px;padding:14px 16px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="flex:1"><p style="font-size:14px;font-weight:500">'+(i+1)+'. '+esc(q.q)+'</p><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">'+q.o.map(function(o,oi){return '<span style="font-size:11px;padding:3px 8px;border-radius:6px;'+(oi===q.ci?'background:#3cddc715;color:var(--m);font-weight:600':'background:var(--bg3);color:var(--t3)')+'">'+String.fromCharCode(65+oi)+') '+o+'</span>'}).join('')+'</div></div><div style="display:flex;gap:4px;margin-left:8px"><button class="btn bg bsm" style="padding:3px 6px" onclick="mqMod(\''+(q.dbId||q.id)+'\')">✏️</button><button class="btn bg bsm" style="padding:3px 6px;color:var(--pk)" onclick="apiDeleteQuestion('+(q.dbId||q.id)+').then(function(){memQs=memQs.filter(function(x){return (x.dbId||x.id)!='+(q.dbId||q.id)+'});toast(\'Silindi.\');aQuestions(document.getElementById(\'adm-c\'))})">🗑️</button></div></div></div>'}).join('')+
  (memQs.length===0?'<div class="card" style="text-align:center;padding:40px;color:var(--t3)">Henüz soru yok. Soru ekleyin.</div>':'')+wqSection()
}

function mqMod(id){var q=id?memQs.find(function(x){return x.dbId==id||x.id===id}):null;
modal('<h3 class="fd">'+(q?'Soru Düzenle':'Yeni Soru')+'<button class="close" onclick="closeModal()">\u2715</button></h3>'+
'<div class="form-group"><label class="lbl">Soru *</label><textarea class="inp" id="mqq">'+(q?q.q:'')+'</textarea></div>'+
'<div class="form-group"><label class="lbl">Seçenekler (doğruyu işaretle)</label>'+
[0,1,2,3].map(function(i){return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input type="radio" name="mqc" value="'+i+'" '+(q?i===q.ci?'checked':'':i===0?'checked':'')+' style="accent-color:var(--m)"><input class="inp" id="mqo'+i+'" placeholder="Seçenek '+String.fromCharCode(65+i)+'" value="'+(q&&q.o[i]?q.o[i]:'')+'" style="flex:1"></div>'}).join('')+'</div>'+
'<button class="btn bp" style="width:100%" onclick="mqSav(\''+(id||'')+'\')">'+(q?'\ud83d\udcbe Güncelle':'\u2795 Ekle')+'</button>')}

function mqSav(editId){
  var q=sanitize(document.getElementById('mqq').value,300);
  if(!q){toast('Soru zorunlu!',false);return}
  var os=[0,1,2,3].map(function(i){return document.getElementById('mqo'+i).value.trim()}).filter(Boolean);
  if(os.length<2){toast('En az 2 seçenek girin!',false);return}
  var ci=parseInt(document.querySelector('input[name="mqc"]:checked').value);
  ci=Math.min(ci,os.length-1);
  
  var existing = editId ? memQs.find(function(x){return String(x.dbId)==String(editId)||String(x.id)==String(editId)}) : null;
  var numId = existing && existing.dbId ? parseInt(existing.dbId) : null;
  
  var data={question:q,option_a:os[0]||'',option_b:os[1]||'',option_c:os[2]||'',option_d:os[3]||'',correct_index:ci};
  if(numId){data.id=numId}
  
  apiSaveQuestion(data).then(function(r){
    if(r.error){toast(r.error,false);return}
    if(existing){if(existing.id&&isNaN(parseInt(existing.id)))saveReplacedQ(existing.id);existing.q=q;existing.o=os;existing.ci=ci;if(r.id){existing.dbId=r.id;existing.id=r.id;}}
    else{memQs.push({id:r.id,dbId:r.id,q:q,o:os,ci:ci})}
    toast(existing?'Güncellendi.':'Eklendi.');closeModal();aQuestions(document.getElementById('adm-c'));
  }).catch(function(){toast('Kayıt hatası',false)});
}

function saveReplacedQ(localId){
  apiGet('/game-config').then(function(r){
    var list=[];
    try{list=JSON.parse(r.replaced_qs||'[]')}catch(e){}
    if(list.indexOf(localId)===-1)list.push(localId);
    apiPost('/game-config',{key:'replaced_qs',value:JSON.stringify(list)});
  });
}


function aGames(e){
  var ac=chars.filter(function(c){return c.a}).length;
  e.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">🎮 Oyun Yönetimi <span class="badge bv">'+GD.length+' oyun</span></h3>'+
  '<p style="font-size:12px;color:var(--t3);margin-bottom:16px">Aktif karakter: <b style="color:var(--v)">'+ac+'</b> · Toplam soru: <b style="color:var(--bl)">'+memQs.length+'</b> · Kader seçeneği: <b style="color:var(--pk)">'+FATES.length+'</b> · Ekip maks: <b style="color:var(--m)">'+TEAM_MAX+'</b></p></div>'+
  GD.map(function(g){return '<div class="card" style="margin-bottom:10px;'+(g.on?'':'opacity:.45')+'"><div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:12px"><div class="gi" style="background:'+g.gr+';width:44px;height:44px;font-size:20px">'+g.e+'</div><div><p style="font-size:15px;font-weight:600" class="fd">'+esc(GN[g.t])+'</p><p style="font-size:12px;color:var(--t3)">'+g.d+'</p></div></div><div style="display:flex;align-items:center;gap:8px"><button class="btn bg bsm" onclick="gameEdit(\''+g.t+'\')">✏️ Düzenle</button><div class="tgl '+(g.on?'on':'off')+'" onclick="GD.find(function(x){return x.t===\''+g.t+'\'}).on=!GD.find(function(x){return x.t===\''+g.t+'\'}).on;rfCards();saveData();aGames(document.getElementById(\'adm-c\'))"></div></div></div></div>'}).join('')+
  '<div class="card" style="margin-top:16px"><h4 class="fd" style="font-size:14px;font-weight:600;margin-bottom:10px">⚙️ Genel Ayarlar</h4>'+
  '<div style="display:flex;gap:12px;flex-wrap:wrap">'+
  '<div style="flex:1;min-width:150px"><label class="lbl">Ekip Maks Kişi</label><input class="inp" type="number" value="'+TEAM_MAX+'" min="2" max="20" style="width:100px" onchange="TEAM_MAX=parseInt(this.value)||8;toast(\'Ekip maks: \'+TEAM_MAX)"></div>'+
  '</div></div>'
}

function rfCards(){var h=gcH();var hg=document.getElementById('hg');var gg=document.getElementById('gg');if(hg&&hg.innerHTML!==h)hg.innerHTML=h;if(gg&&gg.innerHTML!==h)gg.innerHTML=h}

function gameEdit(t){
  var g=GD.find(function(x){return x.t===t});
  var name=GN[t];
  var extra='';
  if(t==='FATE'){
    extra='<div class="form-group"><label class="lbl">Kader Seçenekleri</label>'+
    FATES.map(function(f,i){return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><input class="inp" id="fe'+i+'" value="'+f.name+'" style="flex:1"><input class="inp" id="fi'+i+'" value="'+f.emoji+'" style="width:60px;text-align:center" placeholder="emoji"></div>'}).join('')+
    '<button class="btn bs bsm" style="width:100%;margin-top:4px" onclick="addFate()">+ Kader Ekle</button></div>';
  }
  if(t==='MEM'){
    extra='<div style="padding:12px;background:var(--bg1);border-radius:10px;margin-bottom:14px"><p style="font-size:12px;color:var(--t2)">🧠 Hafıza Oyunu soruları "Sorular" sekmesinden yönetilir.</p><p style="font-size:12px;color:var(--t3);margin-top:4px">Şu an '+memQs.length+' soru mevcut.</p></div>';
  }
  modal('<h3 class="fd">'+g.e+' '+name+' Düzenle<button class="close" onclick="closeModal()">\u2715</button></h3>'+
  '<div class="form-group"><label class="lbl">Oyun Adı</label><input class="inp" id="ge-n" value="'+name+'"></div>'+
  '<div class="form-group"><label class="lbl">Açıklama</label><input class="inp" id="ge-d" value="'+g.d+'"></div>'+
  '<div class="form-row"><div class="form-group"><label class="lbl">Emoji</label><input class="inp" id="ge-e" value="'+g.e+'" style="text-align:center;font-size:24px"></div><div class="form-group"><label class="lbl">Durum</label><select class="inp" id="ge-on"><option value="1"'+(g.on?' selected':'')+'>Açık</option><option value="0"'+(!g.on?' selected':'')+'>Kapalı</option></select></div></div>'+
  extra+
  '<button class="btn bp" style="width:100%" onclick="gameSave(\''+t+'\')">\ud83d\udcbe Kaydet</button>')
}

function gameSave(t){
  var g=GD.find(function(x){return x.t===t});
  GN[t]=document.getElementById('ge-n').value.trim()||GN[t];
  g.d=document.getElementById('ge-d').value.trim()||g.d;
  g.e=document.getElementById('ge-e').value.trim()||g.e;
  g.on=document.getElementById('ge-on').value==='1';
  if(t==='FATE'){
    FATES.forEach(function(f,i){
      var ne=document.getElementById('fe'+i);
      var ni=document.getElementById('fi'+i);
      if(ne)f.name=ne.value.trim()||f.name;
      if(ni)f.emoji=ni.value.trim()||f.emoji;
    });
  }
  rfCards();saveData();closeModal();toast('Oyun güncellendi.');aGames(document.getElementById('adm-c'))
}

function addFate(){
  FATES.push({id:'f'+uid(),name:'Yeni Seçenek',emoji:'❓',color:'#'+Math.floor(Math.random()*16777215).toString(16)});
  saveData();closeModal();gameEdit('FATE');toast('Kader seçeneği eklendi.')
}

function aRanking(e){
  var games = [
    {key:'FACE',name:'🤔 Yüzden Bil'},
    {key:'MEMORY',name:'🧠 Eightborn Moruq'},
    {key:'QUOTE',name:'💬 Replik Bil'}
  ];
  
  e.innerHTML = '<div style="margin-bottom:16px"><h3 class="fd" style="font-size:15px">🏆 Oyun Sıralaması</h3></div>' +
    '<div style="display:flex;gap:6px;margin-bottom:16px">' +
    games.map(function(g){
      return '<button class="lb-tab'+(window._admRankGame===g.key?' on':'')+'" onclick="window._admRankGame=\''+g.key+'\';aRanking(document.getElementById(\'adm-c\'))">'+g.name+'</button>';
    }).join('') +
    '</div>' +
    '<div id="adm-rank-content"><div style="text-align:center;padding:40px;color:var(--t3)">Yükleniyor...</div></div>';
  
  if(!window._admRankGame) window._admRankGame = 'FACE';
  
  apiGetGameLeaderboard(window._admRankGame).then(function(r){
    var lb = r.leaderboard || [];
    var h = '';
    if(lb.length === 0){
      h = '<div class="card" style="text-align:center;padding:32px;color:var(--t3)">Henüz skor yok</div>';
    } else {
      h = '<div style="display:flex;flex-direction:column;gap:4px">';
      lb.forEach(function(u,i){
        var score = parseInt(u.total_score || u.score || 0);
        var games = parseInt(u.games_played || u.plays || 0);
        h += '<div class="card" style="display:flex;align-items:center;gap:12px;padding:12px">' +
          '<span style="font-family:Bebas Neue;font-size:20px;width:32px;text-align:center;color:'+(i<3?'var(--g)':'var(--t3)')+'">'+( i+1)+'</span>' +
          '<span style="flex:1;font-weight:600">'+esc(u.username)+'</span>' +
          '<span style="font-family:Bebas Neue;font-size:18px;color:var(--m)">'+score+'</span>' +
          '<span style="font-size:12px;color:var(--t3);width:40px;text-align:right">'+games+' oyun</span>' +
          '<button class="btn bg bsm" onclick="editGameScore('+u.user_id+',\''+esc(u.username)+'\',\''+window._admRankGame+'\','+score+')">✏️</button>' +
          '</div>';
      });
      h += '</div>';
    }
    document.getElementById('adm-rank-content').innerHTML = h;
  });
}

function editGameScore(userId, username, gameType, currentScore) {
  var newScore = prompt(username + ' - ' + gameType + ' puanı (şu an: ' + currentScore + '):', currentScore);
  if (newScore === null) return;
  newScore = parseInt(newScore);
  if (isNaN(newScore)) { toast('Geçersiz puan!', false); return; }
  
  apiPost('/admin/edit-game-score', { user_id: userId, game_type: gameType, score: newScore }).then(function(r){
    if(r.error) { toast(r.error, false); return; }
    toast('Puan güncellendi!');
    aRanking(document.getElementById('adm-c'));
  });
}

function wqSection(){
  var h='<div style="margin-top:32px;border-top:1px solid var(--b1);padding-top:24px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  h+='<h3 class="fd" style="font-weight:600;font-size:15px">\ud83e\ude9e Sen Kimsin? Soruları <span class="badge bv">'+whoQs.length+'</span></h3>';
  h+='<button class="btn bp bsm" onclick="wqMod()">+ Soru Ekle</button></div>';
  for(var i=0;i<whoQs.length;i++){
    var q=whoQs[i];
    h+='<div class="card" style="margin-bottom:8px;padding:14px 16px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="flex:1">';
    h+='<p style="font-size:14px;font-weight:500">'+(i+1)+'. '+esc(q.q)+'</p>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">';
    for(var oi=0;oi<q.o.length;oi++){
      h+='<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:var(--bg3);color:var(--t3)">'+String.fromCharCode(65+oi)+') '+esc(q.o[oi])+'</span>';
    }
    h+='</div></div><div style="display:flex;gap:4px;margin-left:8px">';
    h+='<button class="btn bg bsm" style="padding:3px 6px" onclick="wqMod(\''+(q.dbId||q.id)+'\')">\u270f\ufe0f</button>';
    h+='<button class="btn bg bsm" style="padding:3px 6px;color:var(--pk)" onclick="apiDeleteWhoQuestion('+(q.dbId||q.id)+').then(function(){whoQs=whoQs.filter(function(x){return (x.dbId||x.id)!='+(q.dbId||q.id)+'});toast(\'Silindi.\');aQuestions(document.getElementById(\'adm-c\'))})">\ud83d\uddd1\ufe0f</button>';
    h+='</div></div></div>';
  }
  if(whoQs.length===0) h+='<div class="card" style="text-align:center;padding:40px;color:var(--t3)">Henüz soru yok.</div>';
  h+='</div>';
  return h;
}

function editScore(uid,name,current){
  var score=prompt(name+' için yeni puan (şu an: '+current+'):');
  if(score===null)return;
  score=parseInt(score);
  if(isNaN(score)||score<0){toast('Geçersiz puan!',false);return}
  apiPost('/admin/update-score',{user_id:uid,score:score}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast(name+' puanı '+score+' yapıldı.');
    aRanking(document.getElementById('adm-c'));
  });
}

function aUsers(e){
  e.innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)">Y\u00fckleniyor...</div>';
  Promise.all([apiGetUsers(), apiGetStreamerRequests()]).then(function(results){
    var data = results[0];
    var reqData = results[1];
    if(data.error){e.innerHTML='<div class="card" style="padding:20px;color:var(--pk)">'+esc(data.error)+'</div>';return}
    var uu=data.users||[];
    var reqs=reqData.requests||[];
    
    var h='';
    
    // Streamer requests section
    if(reqs.length>0){
      h+='<div style="margin-bottom:24px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><h3 class="fd" style="font-weight:600;font-size:15px">\ud83c\udfa5 Yay\u0131nc\u0131 Ba\u015fvurular\u0131 <span class="badge" style="background:#ff000020;color:#ff4444">'+reqs.length+'</span></h3></div>';
      h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--b1);font-size:11px;color:var(--t3)"><th style="text-align:left;padding:10px 14px">Kullan\u0131c\u0131</th><th style="text-align:left;padding:10px">E-posta</th><th style="text-align:center;padding:10px">Tarih</th><th style="text-align:right;padding:10px 14px">\u0130\u015flem</th></tr></thead><tbody>';
      for(var ri=0;ri<reqs.length;ri++){
        var rq=reqs[ri];
        var rd=new Date(rq.created_at);
        h+='<tr style="border-bottom:1px solid #2a2a3a20"><td style="padding:10px 14px;font-weight:500">'+esc(rq.username)+'</td><td style="padding:10px;font-size:12px;color:var(--t2)">'+esc(rq.email)+'</td><td style="padding:10px;text-align:center;font-size:12px;color:var(--t3)">'+rd.toLocaleDateString('tr-TR')+'</td><td style="padding:10px 14px;text-align:right"><button class="btn bg bsm" style="color:var(--m)" onclick="approveStreamer('+rq.id+')">\u2705 Onayla</button> <button class="btn bg bsm" style="color:var(--pk)" onclick="rejectStreamer('+rq.id+')">\u274c Reddet</button></td></tr>';
      }
      h+='</tbody></table></div></div>';
    }
    
    // Users section
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">\ud83d\udc64 Kullan\u0131c\u0131 Y\u00f6netimi <span class="badge bv">'+uu.length+' kullan\u0131c\u0131</span></h3></div>';
    if(uu.length>0){
      h+='<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid var(--b1);font-size:11px;color:var(--t3)"><th style="text-align:left;padding:10px 14px">#</th><th style="text-align:left;padding:10px">Kullan\u0131c\u0131</th><th style="text-align:left;padding:10px">E-posta</th><th style="text-align:center;padding:10px">Rol</th><th style="text-align:center;padding:10px">Durum</th><th style="text-align:center;padding:10px">Kay\u0131t</th><th style="text-align:center;padding:10px">Son G\u00f6r\u00fclme</th><th style="text-align:right;padding:10px 14px">\u0130\u015flem</th></tr></thead><tbody>';
      for(var i=0;i<uu.length;i++){
        var u=uu[i];
        var d=new Date(u.created_at);
        var tarih=d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});
        h+='<tr style="border-bottom:1px solid #2a2a3a20">';
        h+='<td style="padding:10px 14px;font-weight:700">'+(i+1)+'</td>';
        h+='<td style="padding:10px"><div style="display:flex;align-items:center;gap:8px"><div style="width:32px;height:32px;border-radius:8px;background:'+(u.role==='ADMIN'?'#ff544d20':'#60a5fa20')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:'+(u.role==='ADMIN'?'var(--v)':'var(--bl)')+'">'+(u.username?u.username[0].toUpperCase():'-')+'</div><span style="font-weight:500">'+esc(u.username)+'</span>'+(u.streamer?' <span class="badge" style="background:#ff000020;color:#ff4444;font-size:9px">\ud83c\udfa5</span>':'')+'</div></td>';
        h+='<td style="padding:10px;font-size:12px;color:var(--t2)">'+esc(u.email)+'</td>';
        h+='<td style="padding:10px;text-align:center">'+(u.role==='ADMIN'?'<span class="badge bv">Admin</span>':u.streamer?'<span class="badge" style="background:rgba(255,68,68,0.08);color:#ff4444">Streamer</span>':'<span class="badge bgl">\u00dcye</span>')+'</td>';
        h+='<td style="padding:10px;text-align:center">';
        var isOnline = u.last_active && (Date.now() - new Date(u.last_active).getTime()) < 120000;
        if(u.banned){h+='<span style="font-size:12px;padding:3px 10px;border-radius:6px;background:rgba(255,84,77,0.08);color:#ff544d;font-weight:600">Yasakl\u0131</span>';}
        else{h+='<span style="font-size:12px;padding:3px 10px;border-radius:6px;background:'+(isOnline?'#3cddc715':'#ff980020')+';color:'+(isOnline?'var(--m)':'#ff9800')+';font-weight:600">'+(isOnline?'\ud83d\udfe2 Online':'\u26aa Offline')+'</span>';}
        h+='</td>';
        h+='<td style="padding:10px;text-align:center;font-size:12px;color:var(--t3)">'+tarih+'</td>';
        var la=u.last_active?new Date(u.last_active):null;
        var lastSeen=la?la.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+la.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'\u2014';
        h+='<td style="padding:10px;text-align:center;font-size:11px;color:var(--t2)">'+lastSeen+'</td>';
        h+='<td style="padding:10px 14px;text-align:right">';
        if(u.role!=='ADMIN'){
          h+='<button class="btn bg bsm" style="color:'+(u.streamer?'var(--t3)':'#ff4444')+';margin-right:4px" onclick="toggleStreamerPerm('+u.id+',this)">'+(u.streamer?'\ud83c\udfa5 Yay\u0131nc\u0131 Kald\u0131r':'\ud83c\udfa5 Yay\u0131nc\u0131 Yap')+'</button>';
          h+='<button class="btn bg bsm" style="color:'+(u.banned?'var(--m)':'var(--pk)')+';margin-right:4px" onclick="toggleBan('+u.id+',this)">'+(u.banned?'\u2705 Yasa\u011f\u0131 Kald\u0131r':'\ud83d\udeab Yasakla')+'</button>';
          h+='<button class="btn bg bsm" style="color:var(--v);margin-right:4px" onclick="sendNotif('+u.id+',\''+u.username+'\')">\ud83d\udce8 Bildirim</button>';
          h+='<button class="btn bg bsm" style="color:#ff0000" onclick="deleteUser('+u.id+',\''+u.username+'\')">\ud83d\uddd1 Sil</button>';
        } else {
          h+='<span style="font-size:11px;color:var(--t3)">\u2014</span>';
        }
        h+='</td></tr>';
      }
      h+='</tbody></table></div>';
    }
    e.innerHTML=h;
  });
}

function toggleStreamerPerm(userId, btn){
  apiToggleStreamer(userId).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast(r.streamer?'Yay\u0131nc\u0131 yetkisi verildi.':'Yay\u0131nc\u0131 yetkisi kald\u0131r\u0131ld\u0131.');
    aUsers(document.getElementById('adm-c'));
  });
}

function approveStreamer(reqId){
  apiApproveStreamer(reqId).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Ba\u015fvuru onayland\u0131!');
    aUsers(document.getElementById('adm-c'));
  });
}

function rejectStreamer(reqId){
  apiRejectStreamer(reqId).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Ba\u015fvuru reddedildi.');
    aUsers(document.getElementById('adm-c'));
  });
}

function toggleBan(userId,btn){
  if(!confirm(btn.textContent.indexOf('Yasakla')>=0?'Bu kullan\u0131c\u0131y\u0131 yasaklamak istedi\u011fine emin misin?':'Yasa\u011f\u0131 kald\u0131rmak istedi\u011fine emin misin?')) return;
  apiPost('/admin/ban-user/'+userId,{}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast(r.banned?'Kullan\u0131c\u0131 yasakland\u0131.':'Yasak kald\u0131r\u0131ld\u0131.');
    aUsers(document.getElementById('adm-c'));
  });
}

var adConfig = {left:{active:false,code:''},right:{active:false,code:''},footer:{active:false,code:''}};

function aAds(e) {
  apiGet('/game-config').then(function(r){
    if(r.ads_config) { try { adConfig = JSON.parse(r.ads_config); } catch(ex){} }
    renderAdsPanel(e);
  });
}

function renderAdsPanel(e) {
  var areas = [
    {key:'left',name:'Sol Kenar',icon:'◀️',desc:'Sayfanın sol tarafında sabit reklam alanı (160px genişlik)'},
    {key:'right',name:'Sağ Kenar',icon:'▶️',desc:'Sayfanın sağ tarafında sabit reklam alanı (160px genişlik)'},
    {key:'footer',name:'Footer',icon:'⬇️',desc:'Sayfanın alt kısmında footer üstü reklam alanı'}
  ];
  
  e.innerHTML = '<div style="margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">📢 Reklam Yönetimi</h3><p style="font-size:12px;color:var(--t3);margin-top:4px">Google AdSense veya özel reklam kodlarını buradan yönetin</p></div>' +
    areas.map(function(a) {
      var cfg = adConfig[a.key] || {active:false,code:''};
      return '<div class="card" style="padding:20px;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
          '<div><h4 class="fd" style="font-size:16px;font-weight:600">' + a.icon + ' ' + a.name + '</h4><p style="font-size:12px;color:var(--t3);margin-top:2px">' + a.desc + '</p></div>' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><span style="font-size:13px;color:' + (cfg.active ? 'var(--m)' : 'var(--t3)') + '">' + (cfg.active ? 'Aktif' : 'Pasif') + '</span>' +
          '<div onclick="toggleAd(\'' + a.key + '\')" style="width:48px;height:26px;border-radius:13px;background:' + (cfg.active ? 'var(--m)' : 'var(--bg3)') + ';position:relative;cursor:pointer;transition:all .3s"><div style="width:22px;height:22px;border-radius:11px;background:#fff;position:absolute;top:2px;' + (cfg.active ? 'right:2px' : 'left:2px') + ';transition:all .3s"></div></div></label>' +
        '</div>' +
        '<div style="margin-bottom:12px"><label class="lbl" style="font-size:12px">Reklam Kodu (HTML/JS)</label>' +
        '<textarea class="inp" id="ad-code-' + a.key + '" rows="4" style="font-family:monospace;font-size:12px;resize:vertical" placeholder="Google AdSense veya özel reklam kodunu buraya yapıştırın...">' + esc(cfg.code || '') + '</textarea></div>' +
        '<button class="btn bp bsm" onclick="saveAd(\'' + a.key + '\')">💾 Kaydet</button>' +
        '<div style="margin-top:12px;padding:12px;border-radius:10px;background:var(--bg3);text-align:center"><p style="font-size:11px;color:var(--t3);margin-bottom:8px">Önizleme:</p>' +
        (cfg.active && !cfg.code ? '<div style="padding:20px;border:2px dashed var(--v);border-radius:12px;background:linear-gradient(135deg,#ff544d08,#818cf808)"><p style="font-size:14px;font-weight:600;color:var(--v)">📢 Buraya reklam verebilirsiniz</p><p style="font-size:11px;color:var(--t3);margin-top:4px">Bu alan reklam için ayrılmıştır</p></div>' :
         cfg.active && cfg.code ? '<div style="padding:8px;border:1px solid var(--m);border-radius:8px"><span style="font-size:11px;color:var(--m)">✅ Reklam kodu aktif</span></div>' :
         '<div style="padding:8px;border:1px solid var(--t3);border-radius:8px;opacity:.5"><span style="font-size:11px;color:var(--t3)">⏸️ Alan pasif</span></div>') +
        '</div></div>';
    }).join('');
}

function toggleAd(key) {
  adConfig[key] = adConfig[key] || {active:false,code:''};
  adConfig[key].active = !adConfig[key].active;
  saveAdConfig();
}

function saveAd(key) {
  adConfig[key] = adConfig[key] || {active:false,code:''};
  adConfig[key].code = document.getElementById('ad-code-' + key).value;
  saveAdConfig();
}

function saveAdConfig() {
  apiPost('/game-config', {key:'ads_config', value:JSON.stringify(adConfig)}).then(function(){
    toast('Reklam ayarları kaydedildi!');
    aAds(document.getElementById('adm-c'));
    applyAds();
  });
}

function applyAds() {
  var _elMap = {left:'sb-left',right:'sb-right',footer:'bn-footer'};
  if (typeof curUser !== 'undefined' && curUser && (curUser.role === 'ADMIN')) {
    ['left','right','footer'].forEach(function(key){
      var el = document.getElementById(_elMap[key]);
      if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    });
    return;
  }
  ['left','right','footer'].forEach(function(key){
    var el = document.getElementById(_elMap[key]);
    if (!el) return;
    var cfg = adConfig[key] || {active:false,code:''};
    if (!cfg.active) { el.style.display = 'none'; return; }
    if (el.style.display === 'block' && el.style.opacity === '1') {
      return;
    }
    // Skip side ads on small screens
    if ((key === 'left' || key === 'right') && window.innerWidth < 1400) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.opacity = '1';
    if (cfg.code) {
      el.innerHTML = cfg.code;
      var scripts = el.querySelectorAll('script');
      scripts.forEach(function(s){
        var ns = document.createElement('script');
        if(s.src) ns.src = s.src; else ns.textContent = s.textContent;
        s.parentNode.replaceChild(ns, s);
      });
    } else if (key === 'footer') {
      el.innerHTML = '<div style="max-width:970px;margin:24px auto"><div style="text-align:center;border:2px dashed var(--v);border-radius:16px;background:linear-gradient(135deg,rgba(168,85,247,0.05),rgba(99,102,241,0.05));padding:20px;height:90px;display:flex;align-items:center;justify-content:center;gap:16px"><span style="font-size:32px">📢</span><h4 style="font-size:16px;font-weight:700;color:var(--v)">Buraya reklam verebilirsiniz</h4><p style="font-size:12px;color:var(--t3)">Bu alan reklam için ayrılmıştır</p><span style="font-size:11px;color:var(--t3);padding:4px 12px;border:1px solid var(--b1);border-radius:20px">970 × 90</span></div></div>';
    } else {
      el.innerHTML = '<div style="text-align:center;border:2px dashed var(--v);border-radius:16px;background:linear-gradient(135deg,rgba(168,85,247,0.05),rgba(99,102,241,0.05));padding:16px 12px;min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px"><span style="font-size:48px">📢</span><h4 style="font-size:15px;font-weight:700;color:var(--v)">Buraya reklam verebilirsiniz</h4><p style="font-size:12px;color:var(--t3)">Bu alan reklam için ayrılmıştır</p><span style="font-size:11px;color:var(--t3);padding:4px 12px;border:1px solid var(--b1);border-radius:20px">200 × 600</span></div>';
    }
  });
  smartAdPosition();
}

// Ads loaded via initData in api.js

function sendNotif(uid,name){
  modal('<h3 class="fd">📢 Bildirim Gönder — '+esc(name)+'<button class="close" onclick="closeModal()">✕</button></h3>'+
  '<div class="form-group"><label class="lbl">Mesaj *</label><textarea class="inp" id="notif-msg" rows="3" placeholder="Kullanıcının göreceği bildirim mesajı..."></textarea></div>'+
  '<button class="btn bp" style="width:100%" onclick="doSendNotif('+uid+')">📢 Gönder</button>');
}

function doSendNotif(uid){
  var msg=document.getElementById('notif-msg').value.trim();
  if(!msg){toast('Mesaj gerekli!',false);return}
  apiPost('/notifications/send',{user_id:uid,message:msg}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Bildirim gönderildi!');closeModal();
  });
}

function aMsgs(e){
  e.innerHTML='<div style="text-align:center;padding:20px;color:var(--t2)">Yükleniyor...</div>';
  apiGet('/contact/messages').then(function(r){
    var msgs=r.messages||[];
    e.innerHTML='<div style="margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">📨 Gelen Mesajlar <span class="badge bgl">'+msgs.length+'</span></h3></div>'+
    (msgs.length===0?'<div class="card" style="text-align:center;padding:40px;color:var(--t3)">Henüz mesaj yok.</div>':
    msgs.map(function(m){
      var d=new Date(m.created_at);
      var tarih=d.toLocaleDateString('tr-TR')+' '+d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
      return '<div class="card" style="margin-bottom:10px;padding:16px"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="flex:1"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="badge bv" style="font-size:11px">'+esc(m.username||'Anonim')+'</span><span style="font-size:11px;color:var(--t3)">'+tarih+'</span></div><h4 style="font-size:15px;font-weight:600;margin-bottom:4px">'+esc(m.title)+'</h4><p style="font-size:13px;color:var(--t2)">'+esc(m.description)+'</p></div><button class="btn bg bsm" style="padding:4px 8px;color:var(--pk);margin-left:12px" onclick="delMsg('+m.id+')">🗑️</button></div></div>'
    }).join(''));
  });
}

function delMsg(id){
  if(!confirm('Bu mesajı silmek istediğine emin misin?'))return;
  apiDelete('/contact/'+id).then(function(){toast('Silindi.');aMsgs(document.getElementById('adm-c'));});
}

function wqMod(id){var q=id?whoQs.find(function(x){return x.dbId==id||x.id==id}):null;
modal('<h3 class="fd">'+(q?'Soru Düzenle':'Yeni Sen Kimsin Sorusu')+'<button class="close" onclick="closeModal()">\u2715</button></h3>'+
'<div class="form-group"><label class="lbl">Soru *</label><textarea class="inp" id="wqq">'+(q?q.q:'')+'</textarea></div>'+
'<div class="form-group"><label class="lbl">Seçenekler (4 adet)</label>'+
[0,1,2,3].map(function(i){return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="color:var(--t3);font-size:12px;min-width:20px">'+String.fromCharCode(65+i)+')</span><input class="inp" id="wqo'+i+'" placeholder="Seçenek '+String.fromCharCode(65+i)+'" value="'+(q&&q.o[i]?q.o[i]:'')+'" style="flex:1"></div>'}).join('')+'</div>'+
'<button class="btn bp" style="width:100%" onclick="wqSav(\''+(q&&q.dbId?q.dbId:id||'')+'\')">\ud83d\udcbe '+(q?'Güncelle':'Ekle')+'</button>')}

function wqSav(id){var q=sanitize(document.getElementById('wqq').value,300);if(!q){toast('Soru zorunlu!',false);return}
var os=[0,1,2,3].map(function(i){return document.getElementById('wqo'+i).value.trim()}).filter(Boolean);
if(os.length<2){toast('En az 2 seçenek girin!',false);return}
var existing=id?whoQs.find(function(x){return x.dbId==id||x.id==id}):null;
var numId=existing&&existing.dbId?parseInt(existing.dbId):null;
var data={question:q,option_a:os[0]||'',option_b:os[1]||'',option_c:os[2]||'',option_d:os[3]||''};
if(numId){data.id=numId}
apiSaveWhoQuestion(data).then(function(r){
  if(r.error){toast(r.error,false);return}
  if(existing){existing.q=q;existing.o=os;if(r.id)existing.dbId=r.id;}
  else{whoQs.push({id:r.id,dbId:r.id,q:q,o:os})}
  toast(existing?'Güncellendi.':'Eklendi.');closeModal();aQuestions(document.getElementById('adm-c'));
}).catch(function(){toast('Kayıt hatası',false)})}

function deleteUser(uid,name){
  if(!confirm(name+' kullanıcısını silmek istediğine emin misin?\n\nBu işlem geri alınamaz! Tüm verileri silinecek.'))return;
  if(!confirm('EMIN MISIN? '+name+' kalıcı olarak silinecek!'))return;
  apiDelete('/admin/users/'+uid).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast(name+' silindi.');
    aUsers(document.getElementById('adm-c'));
  });
}

function aDiscord(e){
  apiGet('/discord').then(function(r){
    var link=r.link||'';
    e.innerHTML='<div style="margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">🎮 Discord Ayarları</h3></div>'+
    '<div class="card" style="padding:24px">'+
    '<div class="form-group"><label class="lbl">Discord Linki</label><input class="inp" id="discord-input" value="'+link+'" placeholder="https://discord.gg/..."></div>'+
    '<button class="btn bp" style="width:100%" onclick="saveDiscord()">💾 Kaydet</button>'+
    '</div>';
  });
}

function saveDiscord(){
  var link=document.getElementById('discord-input').value.trim();
  apiPost('/discord',{link:link}).then(function(r){
    if(r.error){toast(r.error,false);return}
    window._discordLink=link;
    var dl=document.getElementById('discord-link');
    if(dl){if(link){dl.href=link;dl.style.display='inline-flex';}else{dl.style.display='none';}}
    toast('Discord linki kaydedildi!');
  });
}

function aHero(e){
  apiGet('/discord').then(function(r){
    var heroImg = window._heroImage || '';
    e.innerHTML='<div style="margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">🖼️ Hero Görseli Ayarları</h3></div>'+
    '<div class="card" style="padding:24px">'+
    '<p style="font-size:13px;color:var(--t2);margin-bottom:16px">Ana sayfada sağ üstte görünen büyük görsel. Önerilen boyut: <b>1920×1080px</b> (16:9 oran), max 2MB.</p>'+
    '<div class="form-group"><label class="lbl">Görsel URL veya Base64</label><textarea class="inp" id="hero-img-input" rows="3" placeholder="https://... veya dosya yükle">'+(heroImg||'')+'</textarea></div>'+
    '<div style="display:flex;gap:8px"><button class="btn bp" onclick="saveHeroImage()">💾 Kaydet</button><button class="btn bs" onclick="document.getElementById(&quot;hero-file&quot;).click()">📷 Dosya Seç</button></div>'+
    '<input type="file" id="hero-file" accept="image/*" style="display:none" onchange="uploadHeroFile(this)">'+
    (heroImg?'<div style="margin-top:16px;border-radius:12px;overflow:hidden;border:1px solid rgba(91,64,61,0.1)"><img src="'+heroImg+'" style="width:100%;max-height:300px;object-fit:cover"></div>':'')+
    '</div>';
  });
}

function uploadHeroFile(input){
  if(!input.files[0])return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      var max=1920;var w=img.width;var h=img.height;
      if(w>max){h=Math.round(h*(max/w));w=max}
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      var compressed=canvas.toDataURL('image/jpeg',0.8);
      document.getElementById('hero-img-input').value=compressed;
      toast('Görsel yüklendi, Kaydet butonuna bas.');
    };img.src=e.target.result;
  };reader.readAsDataURL(input.files[0]);
}

function saveHeroImage(){
  var img=document.getElementById('hero-img-input').value.trim();
  apiPost('/hero-image',{image:img}).then(function(r){
    if(r.error){toast(r.error,false);return}
    window._heroImage=img;
    toast('Hero görseli kaydedildi!');
    aHero(document.getElementById('adm-c'));
  });
  // Smart ad positioning - only show if they fit
  smartAdPosition();
}

function aGameEdit(e){
  var gameTypes = [
    {t:'DIE',n:'Kim Hayatta Kalacak',d:'Son hayatta kalan kim?'},
    {t:'TEAM',n:'Ekibini Kur',d:'8 kişilik ekibini oluştur'},
    {t:'QUOTE',n:'Replik Bil',d:'Bu repliğin hangi karaktere ait?'},
    {t:'FATE',n:'Kaderini Seç',d:'Öldür, evlen, ghostla, kaç'},
    {t:'FACE',n:'Yüzden Bil',d:'Bulanık fotoğraftan tanı'},
    {t:'MEM',n:'Eightborn Moruq',d:'Sunucu bilgi yarışması'},
    {t:'WHO',n:'Sen Kimsin?',d:'Hangi karaktere benziyorsun?'},
    {t:'STREAM',n:'Yayıncı Oyunları',d:'Chat ile interaktif oyunlar'}];
  var streamerTypes = [
    {t:'S_QUOTE',n:'Replik Bil (Yayıncı)',d:'Repliği kime ait?'},
    {t:'S_FACE',n:'Yüzden Bil (Yayıncı)',d:'Karakteri tanı!'},
    {t:'S_MEMORY',n:'Eightborn Moruq (Yayıncı)',d:'Bilgini test et'},
    {t:'S_STORY',n:'Chat Kaderini Belirler',d:'Hikayeni chat belirler'},
    {t:'S_CDIE',n:'Kim Hayatta Kalacak (Yayıncı)',d:'Chat CK belirler'},
    {t:'S_CTEAM',n:'Ekibini Kur (Yayıncı)',d:'Ekibi chat belirler'},
    {t:'S_CFATE',n:'Kaderini Seç (Yayıncı)',d:'Kaderi chat belirler'}
  ];
  
  // Load saved names from config
  apiGet('/game-names').then(function(r){
    var saved = r.games || {};
    var h = '<div style="margin-bottom:16px"><h3 class="fd" style="font-size:15px">✏️ Oyun İsim ve Açıklamalarını Düzenle</h3><p style="font-size:12px;color:var(--t2);margin-top:4px">Ana sayfa ve Yayıncı Oyunları sayfasında görünen isim ve açıklamalar</p></div>';
    
    gameTypes.forEach(function(g){
      var sn = saved[g.t+'_name'] || g.n;
      var sd = saved[g.t+'_desc'] || g.d;
      h += '<div class="card" style="padding:16px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><span style="font-size:20px">' + (GD.find(function(x){return x.t===g.t})||{e:'🎮'}).e + '</span><strong style="font-size:14px">' + g.t + '</strong></div>' +
        '<div class="form-row"><div class="form-group"><label class="lbl">Oyun Adı</label><input class="inp" id="gn-'+g.t+'" value="'+sn.replace(/"/g,'&quot;')+'" placeholder="'+g.n+'"></div>' +
        '<div class="form-group"><label class="lbl">Açıklama</label><input class="inp" id="gd-'+g.t+'" value="'+sd.replace(/"/g,'&quot;')+'" placeholder="'+g.d+'"></div></div></div>';
    });
    
    h += '<div style="margin:24px 0 16px;border-top:1px solid rgba(91,64,61,0.1);padding-top:16px"><h3 class="fd" style="font-size:15px">🎬 Yayıncı Oyunları İçeriği</h3></div>';
    streamerTypes.forEach(function(g){
      var sn = saved[g.t+'_name'] || g.n;
      var sd = saved[g.t+'_desc'] || g.d;
      h += '<div class="card" style="padding:16px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:8px"><span style="font-size:20px">🎬</span><strong style="font-size:14px">' + g.t + '</strong></div>' +
        '<div class="form-row"><div class="form-group"><label class="lbl">Oyun Adı</label><input class="inp" id="gn-'+g.t+'" value="'+sn.replace(/"/g,'&quot;')+'" placeholder="'+g.n+'"></div>' +
        '<div class="form-group"><label class="lbl">Açıklama</label><input class="inp" id="gd-'+g.t+'" value="'+sd.replace(/"/g,'&quot;')+'" placeholder="'+g.d+'"></div></div></div>';
    });
    h += '<button class="btn bp" style="margin-top:12px;width:100%;padding:14px" onclick="saveGameNames()">💾 Tümünü Kaydet</button>';
    e.innerHTML = h;
  }).catch(function(){
    e.innerHTML = '<div class="card" style="padding:24px;text-align:center;color:var(--pk)">Yüklenemedi</div>';
  });
}

function saveGameNames(){
  var types = ['DIE','TEAM','QUOTE','FATE','FACE','MEM','WHO','STREAM','S_QUOTE','S_FACE','S_MEMORY','S_STORY','S_CDIE','S_CTEAM','S_CFATE'];
  var data = {};
  types.forEach(function(t){
    var nameEl = document.getElementById('gn-'+t);
    var descEl = document.getElementById('gd-'+t);
    if(nameEl && nameEl.value.trim()) data[t+'_name'] = nameEl.value.trim();
    if(descEl && descEl.value.trim()) data[t+'_desc'] = descEl.value.trim();
  });
  apiPost('/game-names', {games:data}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Oyun isimleri kaydedildi! Sayfa yenilenince uygulanır.');
  }).catch(function(){toast('Kaydedilemedi!',false)});
}

function aFooterPages(e){
  apiGet('/footer-pages').then(function(r){
    var pages=r.pages||[];
    var h='<div style="margin-bottom:16px"><h3 class="fd" style="font-size:15px">📄 Footer Sayfaları</h3><p style="font-size:12px;color:var(--t2);margin-top:4px">Gizlilik İlkesi, Kullanım Şartları vb. footer linklerini yönetin</p></div>';
    
    h+='<button class="btn bp bsm" style="margin-bottom:16px" onclick="addFooterPage()">+ Yeni Sayfa Ekle</button>';
    
    if(pages.length===0){
      h+='<div class="card" style="padding:32px;text-align:center;color:var(--t3)">Henüz sayfa eklenmemiş</div>';
    } else {
      pages.forEach(function(p,i){
        h+='<div class="card" style="padding:16px;margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
            '<div><strong style="font-size:15px">'+esc(p.title)+'</strong> <span style="font-size:11px;color:var(--t3);margin-left:8px">slug: '+esc(p.slug)+'</span></div>' +
            '<div style="display:flex;gap:6px">' +
              '<button class="btn bg bsm" onclick="editFooterPage(\''+p.slug+'\')">✏️ Düzenle</button>' +
              '<button class="btn bg bsm" style="color:var(--pk)" onclick="delFooterPage(\''+p.slug+'\')">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div style="font-size:13px;color:var(--t2);max-height:80px;overflow:hidden;white-space:pre-wrap">'+esc((p.content||'').substring(0,200))+(p.content&&p.content.length>200?'...':'')+'</div>' +
        '</div>';
      });
    }
    e.innerHTML=h;
  }).catch(function(){e.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--pk)">Yüklenemedi</div>'});
}

function addFooterPage(){
  var title=prompt('Sayfa Başlığı (örn: Gizlilik İlkesi):');
  if(!title)return;
  var slug=title.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  editFooterPageModal(slug,title,'');
}

function editFooterPage(slug){
  apiGet('/footer-pages/'+slug).then(function(r){
    if(!r.page){toast('Sayfa bulunamadı',false);return}
    editFooterPageModal(slug,r.page.title,r.page.content);
  });
}

function editFooterPageModal(slug,title,content){
  var old=document.getElementById('fp-modal');if(old)old.remove();
  var m=document.createElement('div');
  m.id='fp-modal';
  m.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--bg2);border:1px solid var(--b1);border-radius:20px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;padding:32px">' +
    '<h3 class="fd" style="font-size:18px;margin-bottom:16px">📄 Sayfa Düzenle</h3>' +
    '<label class="lbl">Başlık</label><input class="inp" id="fp-title" value="'+esc(title)+'" placeholder="Gizlilik İlkesi">' +
    '<label class="lbl" style="margin-top:8px">Slug (URL)</label><input class="inp" id="fp-slug" value="'+esc(slug)+'" placeholder="gizlilik-ilkesi" style="color:var(--t3)">' +
    '<label class="lbl" style="margin-top:8px">İçerik</label><textarea class="inp" id="fp-content" rows="12" style="min-height:250px;font-size:14px;line-height:1.7" placeholder="Sayfa içeriğini yazın...">'+esc(content)+'</textarea>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
      '<button class="btn bp" style="flex:1;padding:14px" onclick="saveFooterPage()">💾 Kaydet</button>' +
      '<button class="btn bg" style="padding:14px 24px" onclick="document.getElementById(\'fp-modal\').remove()">İptal</button>' +
    '</div></div>';
  document.body.appendChild(m);
}

function saveFooterPage(){
  var title=document.getElementById('fp-title').value.trim();
  var slug=document.getElementById('fp-slug').value.trim();
  var content=document.getElementById('fp-content').value;
  if(!title||!slug){toast('Başlık ve slug gerekli',false);return}
  apiPost('/footer-pages',{slug:slug,title:title,content:content}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Sayfa kaydedildi!');
    document.getElementById('fp-modal').remove();
    aFooterPages(document.getElementById('adm-c'));
  }).catch(function(){toast('Kaydedilemedi',false)});
}

function delFooterPage(slug){
  if(!confirm('Bu sayfayı silmek istediğinize emin misiniz?'))return;
  apiPost('/footer-pages/delete',{slug:slug}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Sayfa silindi');
    aFooterPages(document.getElementById('adm-c'));
  }).catch(function(){toast('Silinemedi',false)});
}

function smartAdPosition(){
  var adL=document.getElementById('sb-left');
  var adR=document.getElementById('sb-right');
  if(!adL||!adR)return;
  var screenW=window.innerWidth;
  
  // Determine ad width based on screen size (matching CSS media queries)
  var adW = 0;
  if(screenW >= 1600) adW = 180;
  else if(screenW >= 1400) adW = 120;
  
  if(adW > 0){
    adL.classList.add('sb-ok');adL.style.width=adW+'px';
    adR.classList.add('sb-ok');adR.style.width=adW+'px';
    // Clear conflicting inline styles from index.html
    adL.style.right='';adL.style.left='';
    adR.style.left='';adR.style.right='';
  } else {
    adL.classList.remove('sb-ok');
    adR.classList.remove('sb-ok');
  }
}
window.addEventListener('resize',function(){smartAdPosition();if(typeof applyAds==='function')applyAds()});

// ═══ SEO ADMIN TAB ═══
function aSeo(e){
  e.innerHTML='<div style="text-align:center;padding:40px;color:var(--t2)">SEO ayarları yükleniyor...</div>';
  apiGet('/seo').then(function(s){
    var title=s.seo_title||'EightbornV Arena \u2014 Roleplay Karakter Oyunlar\u0131';
    var desc=s.seo_description||'EightbornV FiveM RP sunucusunun interaktif oyun platformu. 200+ karakter ile Replik Bil, Y\u00fczden Bil, Ekibini Kur ve daha fazlas\u0131. Hemen oyna!';
    var keys=s.seo_keywords||'eightbornv, eightborn, fivem, roleplay, rp, arena, oyun, karakter, replik bil, y\u00fczden bil, ekibini kur, kaderini se\u00e7, gta rp, fivem t\u00fcrk, eightborn moruq';
    var ogimg=s.seo_ogimage||'https://eightbornvarena.com/icon-512.png';
    var canon=s.seo_canonical||'https://eightbornvarena.com/';
    var ogtitle=s.seo_ogtitle||'EightbornV Arena \u2014 Roleplay Karakter Oyunlar\u0131';
    var ogdesc=s.seo_ogdesc||'200+ karakter ile Replik Bil, Y\u00fczden Bil, Ekibini Kur ve daha fazlas\u0131. Hemen oyna!';
    var robots=s.seo_robots||'index, follow';
    var author=s.seo_author||'EightbornV Arena';
    var themecolor=s.seo_themecolor||'#ff544d';
    var gtm=s.seo_gtm||'';
    var gsc=s.seo_gsc||'';
    var adsense=s.seo_adsense||'';
    var ga=s.seo_ga||'';

    e.innerHTML=
    '<div style="margin-bottom:16px"><h3 class="fd" style="font-weight:600;font-size:15px">🔍 SEO Ayarları</h3><p style="font-size:12px;color:var(--t3);margin-top:4px">Arama motorları için site meta verilerini yönet</p></div>'+

    // Google Preview
    '<div class="card" style="padding:20px;margin-bottom:20px">'+
      '<p style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">📊 Google Arama Önizlemesi</p>'+
      '<div id="seo-preview" style="background:#fff;border-radius:12px;padding:20px;max-width:600px">'+
        '<div style="font-size:11px;color:#202124;font-family:arial;margin-bottom:2px">eightbornvarena.com</div>'+
        '<div id="seo-pv-title" style="font-size:20px;color:#1a0dab;font-family:arial;margin-bottom:4px;cursor:pointer;line-height:1.3">'+(title||'EightbornV Arena — Roleplay Arenası')+'</div>'+
        '<div id="seo-pv-desc" style="font-size:14px;color:#4d5156;font-family:arial;line-height:1.5">'+(desc||'EightbornV Roleplay sunucusunun interaktif oyun platformu.')+'</div>'+
      '</div>'+
    '</div>'+

    // Basic SEO
    '<div class="card" style="padding:24px;margin-bottom:16px">'+
      '<p style="font-size:13px;font-weight:700;color:var(--v);margin-bottom:16px">📝 Temel SEO</p>'+
      '<div class="form-group"><label class="lbl">Sayfa Başlığı (Title) <span style="font-size:10px;color:var(--t3);font-weight:400">— max 60 karakter önerilir</span></label><input class="inp" id="seo-title" value="'+esc(title)+'" placeholder="EightbornV Arena — Roleplay Arenası" maxlength="70" oninput="seoPreview()"></div>'+
      '<div class="form-group"><label class="lbl">Açıklama (Description) <span style="font-size:10px;color:var(--t3);font-weight:400">— max 160 karakter önerilir</span></label><textarea class="inp" id="seo-desc" rows="3" placeholder="EightbornV Roleplay sunucusunun interaktif oyun platformu..." maxlength="200" oninput="seoPreview()">'+esc(desc)+'</textarea><div style="text-align:right;font-size:10px;color:var(--t3);margin-top:2px"><span id="seo-desc-count">'+desc.length+'</span>/160</div></div>'+
      '<div class="form-group"><label class="lbl">Anahtar Kelimeler (Keywords) <span style="font-size:10px;color:var(--t3);font-weight:400">— virgülle ayır</span></label><input class="inp" id="seo-keywords" value="'+esc(keys)+'" placeholder="eightbornv, roleplay, fivem, arena, oyun"></div>'+
      '<div class="form-row">'+
        '<div class="form-group"><label class="lbl">Yazar (Author)</label><input class="inp" id="seo-author" value="'+esc(author)+'" placeholder="EightbornV Arena"></div>'+
        '<div class="form-group"><label class="lbl">Robots</label><select class="inp" id="seo-robots"><option value="index, follow"'+(robots==='index, follow'?' selected':'')+'>index, follow</option><option value="noindex, follow"'+(robots==='noindex, follow'?' selected':'')+'>noindex, follow</option><option value="index, nofollow"'+(robots==='index, nofollow'?' selected':'')+'>index, nofollow</option><option value="noindex, nofollow"'+(robots==='noindex, nofollow'?' selected':'')+'>noindex, nofollow</option></select></div>'+
      '</div>'+
      '<div class="form-group"><label class="lbl">Canonical URL</label><input class="inp" id="seo-canonical" value="'+esc(canon)+'" placeholder="https://eightbornvarena.com/"></div>'+
    '</div>'+

    // Open Graph
    '<div class="card" style="padding:24px;margin-bottom:16px">'+
      '<p style="font-size:13px;font-weight:700;color:var(--v);margin-bottom:16px">🌐 Open Graph (Sosyal Medya Paylaşım)</p>'+
      '<div class="form-group"><label class="lbl">OG Başlık <span style="font-size:10px;color:var(--t3);font-weight:400">— boş bırakırsan ana başlık kullanılır</span></label><input class="inp" id="seo-ogtitle" value="'+esc(ogtitle)+'" placeholder="EightbornV Arena"></div>'+
      '<div class="form-group"><label class="lbl">OG Açıklama</label><input class="inp" id="seo-ogdesc" value="'+esc(ogdesc)+'" placeholder="200+ karakter ile oyna!"></div>'+
      '<div class="form-group"><label class="lbl">OG Görsel URL <span style="font-size:10px;color:var(--t3);font-weight:400">— 1200×630px önerilir</span></label><input class="inp" id="seo-ogimage" value="'+esc(ogimg)+'" placeholder="https://eightbornvarena.com/icon-512.png"></div>'+
      (ogimg?'<div style="margin-top:8px;border-radius:8px;overflow:hidden;border:1px solid rgba(91,64,61,0.1);max-width:300px"><img src="'+ogimg+'" style="width:100%;height:auto"></div>':'')+
    '</div>'+

    // Google Services
    '<div class="card" style="padding:24px;margin-bottom:16px">'+
      '<p style="font-size:13px;font-weight:700;color:var(--v);margin-bottom:4px">🔗 Google Servisleri</p>'+
      '<p style="font-size:11px;color:var(--t3);margin-bottom:16px">Sadece ID girilir, script\'ler otomatik ve güvenli şekilde eklenir.</p>'+
      '<div class="form-group"><label class="lbl">Google AdSense Publisher ID <span style="font-size:10px;color:var(--t3);font-weight:400">— site doğrulama + reklam</span></label><input class="inp" id="seo-adsense" value="'+esc(adsense)+'" placeholder="ca-pub-1234567890123456" maxlength="30"><p style="font-size:10px;color:var(--t3);margin-top:4px">AdSense hesabınızdan Publisher ID\'yi kopyalayın. Format: <b>ca-pub-XXXXXXXXXXXXXXXX</b></p></div>'+
      '<div class="form-group"><label class="lbl">Google Analytics Measurement ID <span style="font-size:10px;color:var(--t3);font-weight:400">— ziyaretçi analizi</span></label><input class="inp" id="seo-ga" value="'+esc(ga)+'" placeholder="G-XXXXXXXXXX" maxlength="20"><p style="font-size:10px;color:var(--t3);margin-top:4px">GA4 hesabınızdan Measurement ID\'yi kopyalayın. Format: <b>G-XXXXXXXXXX</b></p></div>'+
      '<div class="form-group"><label class="lbl">Google Tag Manager ID <span style="font-size:10px;color:var(--t3);font-weight:400">— opsiyonel</span></label><input class="inp" id="seo-gtm" value="'+esc(gtm)+'" placeholder="GTM-XXXXXXX" maxlength="15"></div>'+
    '</div>'+

    // Extras
    '<div class="card" style="padding:24px;margin-bottom:16px">'+
      '<p style="font-size:13px;font-weight:700;color:var(--v);margin-bottom:16px">⚙️ Gelişmiş</p>'+
      '<div class="form-row">'+
        '<div class="form-group"><label class="lbl">Tema Rengi</label><div style="display:flex;gap:8px;align-items:center"><input class="inp" id="seo-themecolor" value="'+esc(themecolor)+'" placeholder="#ff544d" style="flex:1"><input type="color" value="'+themecolor+'" style="width:40px;height:36px;border:none;border-radius:8px;cursor:pointer" onchange="document.getElementById(\'seo-themecolor\').value=this.value"></div></div>'+
        '<div class="form-group"><label class="lbl">Google Search Console Doğrulama</label><input class="inp" id="seo-gsc" value="'+esc(gsc)+'" placeholder="google-site-verification meta content"></div>'+
      '</div>'+
    '</div>'+

    // Status
    '<div class="card" style="padding:20px;margin-bottom:16px">'+
      '<p style="font-size:13px;font-weight:700;color:var(--v);margin-bottom:12px">✅ SEO Durum Kontrolü</p>'+
      '<div id="seo-status"></div>'+
    '</div>'+

    '<button class="btn bp" style="width:100%;padding:16px;font-size:16px" onclick="saveSeo()">💾 SEO Ayarlarını Kaydet</button>';

    seoPreview();
    seoStatusCheck();
  }).catch(function(err){
    e.innerHTML='<div style="text-align:center;padding:40px;color:var(--pk)">SEO ayarları yüklenirken hata oluştu. <button class="btn bs bsm" onclick="aSeo(document.getElementById(\'adm-c\'))">Tekrar Dene</button></div>';
  });
}

function seoPreview(){
  var t=document.getElementById('seo-title');
  var d=document.getElementById('seo-desc');
  if(!t||!d)return;
  var pt=document.getElementById('seo-pv-title');
  var pd=document.getElementById('seo-pv-desc');
  var dc=document.getElementById('seo-desc-count');
  if(pt)pt.textContent=t.value||'EightbornV Arena — Roleplay Arenası';
  if(pd)pd.textContent=d.value||'EightbornV Roleplay sunucusunun interaktif oyun platformu.';
  if(dc)dc.textContent=d.value.length;
}

function seoStatusCheck(){
  var el=document.getElementById('seo-status');if(!el)return;
  var checks=[];
  var title=document.getElementById('seo-title')?.value||'';
  var desc=document.getElementById('seo-desc')?.value||'';
  var keys=document.getElementById('seo-keywords')?.value||'';
  var ogimg=document.getElementById('seo-ogimage')?.value||'';
  var canon=document.getElementById('seo-canonical')?.value||'';

  checks.push({ok:title.length>0&&title.length<=60,t:'Başlık',m:title.length===0?'Başlık belirlenmemiş (varsayılan kullanılacak)':title.length>60?'Başlık çok uzun ('+title.length+'/60)':'Başlık uygun ('+title.length+'/60)'});
  checks.push({ok:desc.length>=80&&desc.length<=160,t:'Açıklama',m:desc.length===0?'Açıklama belirlenmemiş':desc.length<80?'Açıklama çok kısa ('+desc.length+'/80 min)':desc.length>160?'Açıklama çok uzun ('+desc.length+'/160)':'Açıklama uygun ('+desc.length+' karakter)'});
  checks.push({ok:keys.length>0,t:'Anahtar Kelimeler',m:keys.length===0?'Anahtar kelime belirlenmemiş':'Anahtar kelimeler mevcut'});
  checks.push({ok:ogimg.length>0,t:'OG Görsel',m:ogimg.length===0?'Sosyal medya görseli belirlenmemiş':'OG görseli mevcut'});
  checks.push({ok:canon.length>0,t:'Canonical URL',m:canon.length===0?'Canonical URL belirlenmemiş (varsayılan kullanılacak)':'Canonical URL mevcut'});
  checks.push({ok:true,t:'Favicon',m:'Favicon mevcut (favicon.svg + favicon.ico)'});
  checks.push({ok:true,t:'Robots.txt',m:'robots.txt mevcut'});
  checks.push({ok:true,t:'Sitemap',m:'sitemap.xml mevcut'});
  checks.push({ok:true,t:'Structured Data',m:'JSON-LD yapılandırılmış veri mevcut'});

  var score=checks.filter(function(c){return c.ok}).length;
  var total=checks.length;
  var pct=Math.round((score/total)*100);
  var color=pct>=80?'#3cddc7':pct>=50?'#ffb95f':'#ff544d';

  el.innerHTML='<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">'+
    '<div style="font-size:36px;font-weight:700;color:'+color+'" class="fd">'+pct+'%</div>'+
    '<div style="flex:1"><div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;transition:width .5s"></div></div><div style="font-size:11px;color:var(--t3);margin-top:4px">'+score+'/'+total+' kontrol geçti</div></div></div>'+
    checks.map(function(c){return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(91,64,61,0.06)"><span style="font-size:16px">'+(c.ok?'✅':'⚠️')+'</span><span style="font-size:12px;color:'+(c.ok?'var(--t2)':'#ffb95f')+'">'+c.m+'</span></div>'}).join('');
}

function saveSeo(){
  var data={
    seo_title:document.getElementById('seo-title')?.value||'',
    seo_description:document.getElementById('seo-desc')?.value||'',
    seo_keywords:document.getElementById('seo-keywords')?.value||'',
    seo_ogimage:document.getElementById('seo-ogimage')?.value||'',
    seo_canonical:document.getElementById('seo-canonical')?.value||'',
    seo_ogtitle:document.getElementById('seo-ogtitle')?.value||'',
    seo_ogdesc:document.getElementById('seo-ogdesc')?.value||'',
    seo_robots:document.getElementById('seo-robots')?.value||'index, follow',
    seo_author:document.getElementById('seo-author')?.value||'',
    seo_themecolor:document.getElementById('seo-themecolor')?.value||'#ff544d',
    seo_gtm:document.getElementById('seo-gtm')?.value||'',
    seo_gsc:document.getElementById('seo-gsc')?.value||'',
    seo_adsense:document.getElementById('seo-adsense')?.value||'',
    seo_ga:document.getElementById('seo-ga')?.value||''
  };
  apiPost('/seo',data).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('SEO ayarları kaydedildi!');
    applySeoMeta(data);
    seoStatusCheck();
  }).catch(function(){toast('SEO kaydedilemedi',false)});
}

function applySeoMeta(s){
  if(s.seo_title)document.title=s.seo_title;
  var metas={
    'description':s.seo_description,
    'keywords':s.seo_keywords,
    'author':s.seo_author,
    'robots':s.seo_robots,
    'theme-color':s.seo_themecolor
  };
  for(var name in metas){
    if(!metas[name])continue;
    var el=document.querySelector('meta[name="'+name+'"]');
    if(el)el.setAttribute('content',metas[name]);
  }
  var ogMetas={
    'og:title':s.seo_ogtitle||s.seo_title,
    'og:description':s.seo_ogdesc||s.seo_description,
    'og:image':s.seo_ogimage
  };
  for(var prop in ogMetas){
    if(!ogMetas[prop])continue;
    var el=document.querySelector('meta[property="'+prop+'"]');
    if(el)el.setAttribute('content',ogMetas[prop]);
  }
  var twMetas={
    'twitter:title':s.seo_ogtitle||s.seo_title,
    'twitter:description':s.seo_ogdesc||s.seo_description,
    'twitter:image':s.seo_ogimage
  };
  for(var n in twMetas){
    if(!twMetas[n])continue;
    var el=document.querySelector('meta[name="'+n+'"]');
    if(el)el.setAttribute('content',twMetas[n]);
  }
  if(s.seo_canonical){
    var link=document.querySelector('link[rel="canonical"]');
    if(link)link.setAttribute('href',s.seo_canonical);
  }
}

// ═══ WHO SONUÇ KARAKTERLERİ ═══
var _whoResultChars = [];

function aWhoChars(e) {
  // Load saved selection
  apiGet('/game-config').then(function(r) {
    try {
      var saved = r.config && r.config.WHO_RESULT_CHARS ? r.config.WHO_RESULT_CHARS : [];
      _whoResultChars = saved;
    } catch(ex) { _whoResultChars = []; }
    renderWhoCharPanel(e);
  }).catch(function(){ renderWhoCharPanel(e); });
}

function renderWhoCharPanel(e) {
  var active = chars.filter(function(c){ return c.a; }).sort(function(a,b){ return (a.n+' '+a.s).localeCompare(b.n+' '+b.s,'tr'); });
  var selectedCount = _whoResultChars.length;

  e.innerHTML = '<div style="margin-bottom:20px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
    '<div><h3 class="fd" style="font-weight:600;font-size:15px">🪞 "Hangi EightbornV Karakterisin?" Sonuç Karakterleri</h3>' +
    '<p style="font-size:12px;color:var(--t3);margin-top:4px">Kişilik testi sonucunda çıkabilecek karakterleri seçin. Tam olarak 20 karakter seçmelisiniz.</p></div>' +
    '<div style="display:flex;align-items:center;gap:12px">' +
    '<span class="badge ' + (selectedCount === 20 ? 'bm2' : 'bpk') + '" style="font-size:14px;padding:6px 14px">' + selectedCount + '/20 seçili</span>' +
    '<button class="btn bp bsm" onclick="saveWhoResultChars()" ' + (selectedCount !== 20 ? 'style="opacity:0.5" title="20 karakter seçmelisiniz"' : '') + '>💾 Kaydet</button>' +
    '</div></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
    '<input class="inp" id="who-char-search" placeholder="🔍 Karakter ara..." style="max-width:300px;font-size:14px;padding:10px" oninput="filterWhoChars()">' +
    '<button class="btn bg bsm" onclick="clearWhoSelection()">🗑️ Seçimi Temizle</button>' +
    '</div></div>' +
    '<div class="card" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead>' +
    '<tr style="border-bottom:1px solid var(--b1);font-size:11px;color:var(--t3)">' +
    '<th style="text-align:center;padding:10px;width:50px">Seç</th>' +
    '<th style="text-align:left;padding:10px;width:60px">Foto</th>' +
    '<th style="text-align:left;padding:10px">Karakter</th>' +
    '<th style="text-align:center;padding:10px">Cinsiyet</th>' +
    '<th style="text-align:center;padding:10px">Tip</th>' +
    '</tr></thead><tbody id="who-char-tbody">' +
    active.map(function(c) {
      var key = (c.n || '') + '|' + (c.s || '');
      var isChecked = _whoResultChars.indexOf(key) >= 0;
      return '<tr class="who-char-row" data-name="' + esc(c.n + ' ' + c.s).toLowerCase() + '" style="border-bottom:1px solid #2a2a3a20;' + (isChecked ? 'background:rgba(60,221,199,0.04)' : '') + '" onmouseover="this.style.background=\'' + (isChecked ? 'rgba(60,221,199,0.08)' : 'var(--bg3)') + '\'" onmouseout="this.style.background=\'' + (isChecked ? 'rgba(60,221,199,0.04)' : '') + '\'">' +
        '<td style="padding:8px;text-align:center"><input type="checkbox" class="chk who-chk" data-key="' + esc(key) + '" ' + (isChecked ? 'checked' : '') + ' onchange="toggleWhoChar(this)"></td>' +
        '<td style="padding:8px"><div style="width:40px;height:40px;border-radius:8px;overflow:hidden">' + cp(c, 40) + '</div></td>' +
        '<td style="padding:8px"><div style="font-size:13px;font-weight:500">' + esc(c.n) + ' ' + esc(c.s) + '</div></td>' +
        '<td style="padding:8px;text-align:center">' + (c.g === 'F' ? '<span style="font-size:12px;color:#ff544d">👩</span>' : '<span style="font-size:12px;color:#60a5fa">👨</span>') + '</td>' +
        '<td style="padding:8px;text-align:center"><span style="font-size:12px;color:var(--t2)">' + esc(c.tip || '-') + '</span></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></div>';
}

function toggleWhoChar(cb) {
  var key = cb.dataset.key;
  if (cb.checked) {
    if (_whoResultChars.length >= 20) {
      cb.checked = false;
      toast('Maksimum 20 karakter seçebilirsiniz!', false);
      return;
    }
    if (_whoResultChars.indexOf(key) < 0) _whoResultChars.push(key);
  } else {
    _whoResultChars = _whoResultChars.filter(function(k){ return k !== key; });
  }
  // Update counter
  var badge = document.querySelector('.bm2,.bpk');
  if (badge) {
    badge.textContent = _whoResultChars.length + '/20 seçili';
    badge.className = 'badge ' + (_whoResultChars.length === 20 ? 'bm2' : 'bpk');
  }
  // Update row background
  var row = cb.closest('tr');
  if (row) {
    row.style.background = cb.checked ? 'rgba(60,221,199,0.04)' : '';
  }
}

function clearWhoSelection() {
  _whoResultChars = [];
  document.querySelectorAll('.who-chk').forEach(function(c){ c.checked = false; });
  aWhoChars(document.getElementById('adm-c'));
}

function filterWhoChars() {
  var q = (document.getElementById('who-char-search').value || '').toLowerCase();
  document.querySelectorAll('.who-char-row').forEach(function(row) {
    row.style.display = !q || row.dataset.name.indexOf(q) >= 0 ? '' : 'none';
  });
}

function saveWhoResultChars() {
  if (_whoResultChars.length !== 20) {
    toast('Tam olarak 20 karakter seçmelisiniz! Şu an: ' + _whoResultChars.length, false);
    return;
  }
  var config = { GD: GD.map(function(g){ return {t:g.t,on:g.on,d:g.d,e:g.e}; }), TEAM_MAX: TEAM_MAX, GN: GN, WHO_RESULT_CHARS: _whoResultChars };
  apiSaveGameConfig(config).then(function(r) {
    if (r.error) { toast('Kayıt hatası: ' + r.error, false); return; }
    toast('WHO sonuç karakterleri kaydedildi! (' + _whoResultChars.length + ' karakter)');
    // Update local cache
    window._whoResultChars = _whoResultChars.slice();
  });
}
