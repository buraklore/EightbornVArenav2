// ═══ GAME CARDS ═══
let GD=[{t:'STREAM',e:'🎬',d:'Chatinizle oynayabileceğiniz interaktif oyunlar',gr:'linear-gradient(135deg,#ff544d,#ff544d)',on:true,isNew:true},{t:'DIE',e:'⚔️',d:'Son hayatta kalan kim?',gr:'linear-gradient(135deg,#ff544d,#ff544d)',on:true},{t:'TEAM',e:'👥',d:'8 kişilik ekibini oluştur ve geri kalan herkesi CK&#39;la!',gr:'linear-gradient(135deg,#60a5fa,#3cddc7)',on:true},{t:'FATE',e:'🎲',d:'Flört mü edeceksin yoksa ihanet mi?',gr:'linear-gradient(135deg,#ff544d,#ff544d)',on:true},{t:'FACE',e:'🤔',d:'Karakterlerin fotoğraflarından isimlerini tahmin et!',gr:'linear-gradient(135deg,#3cddc7,#3cddc7)',on:true},{t:'QUOTE',e:'💬',d:'Bu repliğin hangi karaktere ait olduğunu bilebilecek misin?',gr:'linear-gradient(135deg,#ffb95f,#ffb95f)',on:true},{t:'MEM',e:'🧠',d:'Eightborn hakkında ne kadar bilgilisin?',gr:'linear-gradient(135deg,#818cf8,#60a5fa)',on:true},{t:'WHO',e:'❓',d:'Hangi Eightborn karakterine benzediğini bul!',gr:'linear-gradient(135deg,#ffb4ac,#ff544d)',on:true},{t:'RANK',e:'🎯',d:'Karakterleri bir kritere göre sırala, toplulukla yarış!',gr:'linear-gradient(135deg,#ffb95f,#ff544d)',on:true,isNew:true},{t:'STOCK',e:'📈',d:'Sanal borsada karakter hisselerine yatırım yap!',gr:'linear-gradient(135deg,#3cddc7,#60a5fa)',on:true,isNew:true}];
let TEAM_MAX=8;
let CHAR_TYPES=['Lider', 'Yalancı', 'Dedikoducu', 'Korkak', 'Cesur', 'Aptal', 'Kavgacı', 'Araba Delisi', 'Silah Delisi', 'Sadık', 'Hain', 'Cimri', 'Hovarda', 'Soğukkanlı', 'Sinirli', 'Tembel', 'Çalışkan', 'Romantik', 'Kıskanç', 'Şüpheci', 'Maceracı', 'Karizmatik', 'Manipülatif', 'Fedakar', 'Bencil', 'Asi', 'Paracı', 'Hesapçı', 'Vicdanlı', 'Psikopat'];
let GN={DIE:'Kim Hayatta Kalacak',TEAM:'Ekibini Kur',FATE:'Kaderini Seç',FACE:'Yüzden Bil',QUOTE:'Replik Bil',MEM:'Eightborn Moruq',WHO:'Sen Kimsin?',STREAM:'Yayıncı Oyunları',RANK:'Karakter Sırala',STOCK:'Karakter Borsası'};
function gcH(){
  var diffs = {STREAM:'İNTERAKTİF !',DIE:'Kolay',TEAM:'Kolay',FATE:'Kolay',FACE:'Zor',QUOTE:'Zor',MEM:'Çok Zor',WHO:'KEŞFET!',RANK:'YENİ!',STOCK:'YENİ!'};
  var diffColors = {STREAM:'rgba(255,84,77,.08);color:#ffb4ac',DIE:'rgba(45,212,191,.08);color:#2dd4bf',TEAM:'rgba(45,212,191,.08);color:#2dd4bf',FATE:'rgba(45,212,191,.08);color:#2dd4bf',FACE:'rgba(255,84,77,.08);color:#ffb4ac',QUOTE:'rgba(255,84,77,.08);color:#ffb4ac',MEM:'rgba(255,84,77,.08);color:#ffb4ac',WHO:'rgba(139,92,246,.08);color:#ffb4ac',RANK:'rgba(255,185,95,.08);color:#ffb95f',STOCK:'rgba(60,221,199,.08);color:#3cddc7'};
  var iconBg = {STREAM:'rgba(232,67,62,.12)',DIE:'rgba(245,158,11,.1)',TEAM:'rgba(139,92,246,.1)',FATE:'rgba(255,84,77,.08)',FACE:'rgba(45,212,191,.1)',QUOTE:'rgba(245,158,11,.1)',MEM:'rgba(96,165,250,.1)',WHO:'rgba(139,92,246,.1)',RANK:'rgba(255,185,95,.1)',STOCK:'rgba(60,221,199,.1)'};
  
  return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1400px;margin:0 auto;padding:0 24px">' + GD.filter(function(g){return g.on}).map(function(g,i){
    var isStreamer = g.t === 'STREAM';
    var streamerClass = isStreamer ? 'background:linear-gradient(135deg,rgba(232,67,62,.05),rgba(139,92,246,.05));border-color:rgba(232,67,62,.15)' : '';
    
    return '<div style="background:var(--bg2);border:1px solid #ffffff06;border-radius:16px;padding:32px 24px;text-align:center;cursor:pointer;transition:all .25s;position:relative;overflow:hidden;' + streamerClass + '" onclick="playDirect(\''+g.t+'\')" onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 16px 48px rgba(0,0,0,.35)\';this.style.borderColor=\'' + (isStreamer ? '#ff544d' : '#ffffff14') + '\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';this.style.borderColor=\'' + (isStreamer ? 'rgba(255,84,77,.15)' : '#ffffff06') + '\'">' +
    (isStreamer ? '<div style="position:absolute;top:12px;right:12px;font-size:11px;font-weight:800;letter-spacing:.5px;padding:4px 10px;border-radius:6px;background:#ff544d;color:#fff">CANLI YAYIN</div>' : '') +
    '<div style="width:68px;height:68px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;background:' + (iconBg[g.t]||'rgba(139,92,246,.1)') + '">' + g.e + '</div>' +
    '<h3 style="font-size:17px;font-weight:700;margin-bottom:6px">' + GN[g.t] + '</h3>' +
    '<p style="font-size:14px;color:var(--t2);line-height:1.5;margin-bottom:12px">' + g.d + '</p>' +
    '<span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 12px;border-radius:6px;background:' + (diffColors[g.t]||'rgba(45,212,191,.08);color:#2dd4bf') + '">' + (diffs[g.t]||'') + '</span>' +
    '</div>';
  }).join('') + '</div>';
}
document.getElementById('hg').innerHTML=gcH();document.getElementById('gg').innerHTML=gcH();

// Play from any page
function playDirect(t){
  // Wait for API data to load
  if (!window._dataReady) {
    toast('Veriler yükleniyor, lütfen bekleyin...');
    var _waitCount = 0;
    var _waitTimer = setInterval(function(){
      _waitCount++;
      if (window._dataReady) { clearInterval(_waitTimer); playDirect(t); }
      else if (_waitCount > 30) { clearInterval(_waitTimer); toast('Veri yüklenemedi, sayfayı yenileyin.', false); }
    }, 300);
    return;
  }
  // Hide all pages
  document.querySelectorAll('[id^="p-"]').forEach(function(e){e.classList.add('hid');e.style.display='none'});
  // Show games page
  var gp=document.getElementById('p-games');
  if(gp){gp.classList.remove('hid');gp.style.display='';}
  // Reset game page elements
  var ag=document.getElementById('ag');if(ag)ag.classList.add('hid');
  var gg=document.getElementById('gg');if(gg)gg.style.display='';
  var gh=document.getElementById('games-hdr');if(gh)gh.style.display='';
  // Update nav
  document.querySelectorAll('.nl').forEach(function(l){l.classList.remove('a')});
  document.querySelectorAll('.mob-nav a').forEach(function(a){a.classList.remove('on')});
  var ma=document.querySelectorAll('.mob-nav a');if(ma&&ma[1])ma[1].classList.add('on');
  window.scrollTo({top:0,behavior:'smooth'});
  // Start game
  try{play(t);}catch(e){console.error('play error:',e);}
}

function play(t){
  document.getElementById('ag').classList.remove('hid');
  document.getElementById('gg').style.display='none';
  document.getElementById('games-hdr').style.display='none';
  var gc=document.getElementById('games-con');gc.style.maxWidth='none';gc.style.padding='0';
  if(t==='STREAM') { if(window._pushUrl) window._pushUrl('streamer-menu'); }
  else { if(window._pushUrl) window._pushUrl('game', t); }
  if(t==='DIE')dieStart();else if(t==='TEAM')teamStart();else if(t==='FATE')fateStart();else if(t==='FACE')faceStart();else if(t==='QUOTE')quoteStart();else if(t==='MEM')memStart();else if(t==='WHO')whoStart();else if(t==='STREAM')streamStart();else if(t==='RANK')rankStart();else if(t==='STOCK')stockStart();else genericGame(t);
}
function bk(){
  document.getElementById('ag').classList.add('hid');
  document.getElementById('gg').style.display='';
  document.getElementById('games-hdr').style.display='';
  var gc=document.getElementById('games-con');gc.style.maxWidth='';gc.style.padding='';
  tState=null;dState=null;tmState=null;ftState=null;fcState=null;rqState=null;mState=null;whState=null;rkState=null;skState=null;
  if(window._pushUrl) window._pushUrl('games');
}

function genericGame(t){const cs=pick(chars.filter(c=>c.a),4);const g=GD.find(x=>x.t===t);
document.getElementById('ag').innerHTML='<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 0"><button class="btn bg bsm" onclick="bk()">← Geri</button><div class="gi" style="background:'+g.gr+';width:72px;height:72px;font-size:36px">'+g.e+'</div><h2 class="fd" style="font-weight:700;font-size:24px">'+GN[t]+'</h2></div><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:100%;text-align:center"><p style="color:var(--t2);font-size:18px;margin-bottom:20px">'+g.d+'</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+cs.map(c=>'<div class="card" style="text-align:center;cursor:pointer;padding:36px 24px" onclick="gW()"><div style="width:220px;height:220px;border-radius:28px;overflow:hidden;margin:0 auto 16px;border:2px solid var(--b1)">'+cp(c,220)+'</div><h4 class="fd" style="font-size:32px;font-weight:600">'+esc(c.n)+' '+esc(c.s)+'</h4></div>').join('')+'</div></div></div>'}
function gW(){toast('Seçildi!');bk()}



// ═══ NEW HOMEPAGE OVERRIDE ═══
window.addEventListener('load', function() {

  // Inject fonts
  var _fl = document.createElement('link');
  _fl.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
  _fl.rel = 'stylesheet';
  document.head.appendChild(_fl);

  // ═══ SOUND SYSTEM ═══
  var _audioCtx=null;
  function _getAudio(){if(!_audioCtx)_audioCtx=new(window.AudioContext||window.webkitAudioContext)();return _audioCtx}
  window.playClick=function(){try{var c=_getAudio(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(800,c.currentTime);o.frequency.exponentialRampToValueAtTime(600,c.currentTime+.08);g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.1);o.start(c.currentTime);o.stop(c.currentTime+.1)}catch(e){}};
  window.playCorrect=function(){try{var c=_getAudio(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(880,c.currentTime);o.frequency.setValueAtTime(1100,c.currentTime+.1);g.gain.setValueAtTime(.15,c.currentTime);g.gain.setValueAtTime(.15,c.currentTime+.1);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.25);o.start(c.currentTime);o.stop(c.currentTime+.25)}catch(e){}};
  window.playWrong=function(){try{var c=_getAudio(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='square';o.frequency.setValueAtTime(200,c.currentTime);o.frequency.exponentialRampToValueAtTime(120,c.currentTime+.3);g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.3);o.start(c.currentTime);o.stop(c.currentTime+.3)}catch(e){}};
  document.addEventListener('click',function(e){var el=e.target;for(var i=0;i<5;i++){if(!el)break;if(el.tagName==='BUTTON'||el.classList.contains('btn')||el.classList.contains('gc-new')||el.onclick||el.style.cursor==='pointer'){playClick();return}el=el.parentElement}},true);
  var _oSGN=window.showGameNotif;window.showGameNotif=function(em,tx,ok){if(ok)playCorrect();else playWrong();if(typeof _oSGN==='function')_oSGN(em,tx,ok)};
  var _oSMN=window.showMemNotif;if(typeof showMemNotif==='function'){window.showMemNotif=function(em,tx,ok){if(ok)playCorrect();else playWrong();if(typeof _oSMN==='function')_oSMN(em,tx,ok)}}
  var _oT=window.toast;window.toast=function(m,ok){if(ok===false)playWrong();else if(m&&(m.includes('\u2705')||m.includes('Do\u011fru')))playCorrect();if(typeof _oT==='function')_oT(m,ok)};

  // Inject CSS matching approved demo exactly
  var _css = document.createElement('style');
  _css.textContent = '' +
    '.fd{font-family:Bebas Neue,sans-serif;letter-spacing:1px}' +
    '@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}' +

    // Game cards - exact demo values
    '.gc-new{background:#1f1f28;border-radius:16px;padding:4px;overflow:hidden;cursor:pointer;transition:all .3s;position:relative}' +
    '.gc-new::before{content:\'\';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ff544d,#3cddc7);opacity:.4;transition:.3s}' +
    '' +
    '.gc-new:hover{transform:translateY(-8px);box-shadow:0 20px 40px -15px rgba(255,84,77,0.2)}' +
    '.gc-new .gc-i{width:100%;height:192px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:64px;margin-bottom:16px;position:relative;overflow:hidden}' +
    '.gc-new h3{font-size:17px;font-weight:800;text-transform:uppercase;margin-bottom:4px;color:#e4e1ee;padding:0 16px}' +
    '.gc-new p{font-size:12px;color:#9a969e;margin-bottom:12px;padding:0 16px}' +
    '.gc-new .diff{display:block;margin:0 16px 16px;padding:8px 0;background:#292933;border-radius:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;transition:all .2s}.gc-new:hover .diff{background:#ff544d;color:#fff}' +
    '.gc-new.str{background:linear-gradient(135deg,rgba(255,84,77,.08),rgba(139,92,246,.08));border-color:rgba(232,67,62,.3);box-shadow:0 4px 24px rgba(232,67,62,.12)}' +
    '.gc-new.str::before{background:#ff544d;opacity:.7}' +
    '.gc-new.str:hover{border-color:#ffb4ac;box-shadow:0 20px 56px rgba(232,67,62,.15)}' +
    '.gc-new .ltag{position:absolute;top:14px;right:14px;font-size:13px;font-weight:800;letter-spacing:.5px;padding:6px 14px;border-radius:8px;background:#ff544d;color:#fff}' +

    // Responsive
    '@media(max-width:900px){' +
      'nav .nls{display:none!important}' +
      '#sec-home section{height:300px!important}' +
      '#sec-home section h1{font-size:32px!important}' +
      '#sec-home{flex-direction:column!important;padding-top:48px!important;gap:32px!important;text-align:center}' +
      '#sec-home .ht{width:100%!important}#sec-home .ht p{margin:0 auto 24px}#sec-home .ht .hbtns{justify-content:center}' +
      '#sec-home .hi{width:100%!important}' +
      '#home-stats{grid-template-columns:1fr 1fr!important}' +
      '.home-games-grid{grid-template-columns:1fr 1fr!important}' +
      '#sec-contact>div{flex-direction:column!important;padding:36px!important;gap:28px!important}' +
      '#sec-contact>div>div:last-child{max-width:100%!important;width:100%!important}' +
    '}' +
    '@media(max-width:500px){#home-stats{grid-template-columns:1fr!important}#sec-home h1{font-size:44px!important}}';
  document.head.appendChild(_css);

  // Override renderNav
  window.renderNav = function() {
    var navEl = document.getElementById('nav-root') || document.getElementById('main-nav');
    if (!navEl) return;
    navEl.innerHTML = '<nav style="position:relative;width:100%;z-index:100;background:#13131b;border-bottom:1px solid rgba(91,64,61,0.15);box-shadow:0 24px 48px -12px rgba(0,0,0,0.6)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;height:80px;padding:0 32px;max-width:100%">' +
        '<a onclick="window.location.href=window.location.origin+window.location.pathname" style="cursor:pointer;text-decoration:none"><span class="fd" style="font-size:30px;letter-spacing:2px;color:#ffb4ac">EIGHTBORNV ARENA</span></a>' +
        '<div class="nls" style="display:flex;align-items:center;gap:32px">' +
          '<button class="nl" data-p="home" onclick="goSec(\'home\')" style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#ffb4ac;border-bottom:2px solid #ffb4ac;padding:8px 4px;background:none;border-top:none;border-left:none;border-right:none">Arena</button>' +
          '<button class="nl" data-p="games" onclick="goSec(\'games\')" style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e4e1ee;padding:8px 4px;background:none;border:none">Oyunlar</button>' +
          '<button class="nl" data-p="lb" onclick="goSec(\'lb\')" style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e4e1ee;padding:8px 4px;background:none;border:none">Sıralama</button>' +
          '<button class="nl" data-p="contact" onclick="goSec(\'contact\')" style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e4e1ee;padding:8px 4px;background:none;border:none">İletişim</button>' +
          (typeof curUser!=='undefined'&&curUser&&curUser.role==='ADMIN'?'<button class="nl" data-p="admin" onclick="go(\'admin\')" style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#ffb95f;padding:8px 4px;background:none;border:none">Admin</button>':'') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<a id="discord-link" href="#" target="_blank" style="display:none;padding:10px 24px;border-radius:12px;background:#5865F2;color:#fff;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Discord</a>' +
          (typeof curUser!=='undefined'&&curUser?
            '<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-radius:12px;background:#1f1f28"><div data-profile="'+esc(curUser.username)+'" style="display:flex;align-items:center;gap:10px;cursor:pointer"><div style="width:36px;height:36px;border-radius:10px;background:rgba(255,84,77,0.12);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#ffb4ac">'+esc(curUser.username)[0].toUpperCase()+'</div><span style="font-size:14px;font-weight:600;color:#e4e1ee">'+esc(curUser.username)+'</span></div><button class="btn bg bsm" style="color:#ffb4ac;border:1px solid rgba(255,84,77,0.2)" onclick="doLogout()">Çıkış</button></div>'
          :
            '<button class="btn" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e4e1ee;background:none;border:none" onclick="go(\'login\')">Giriş Yap</button><button class="btn" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1b1b24;background:linear-gradient(135deg,#ffb4ac,#ff544d);box-shadow:0 0 20px rgba(255,84,77,0.3)" onclick="go(\'register\')">Kayıt Ol</button>'
          ) +
        '</div>' +
      '</div></nav>';
    if(typeof loadDiscord==='function') loadDiscord();
  };

  // goSec
  window.goSec = function(sec) {
    _bh();
    document.querySelectorAll('[id^="p-"]').forEach(function(e){e.classList.add('hid');e.style.display='none'});
    var _ph=document.getElementById('p-home');_ph.classList.remove('hid');_ph.style.display='block';
    document.querySelectorAll('.nl').forEach(function(l){l.classList.remove('a')});
    document.querySelectorAll('.mob-nav a').forEach(function(a){a.classList.remove('on')});
    var mm={home:0,games:1,lb:2,contact:3};var idx=mm[sec];
    if(idx!==undefined){var ma=document.querySelectorAll('.mob-nav a');if(ma[idx])ma[idx].classList.add('on');}
    _pushUrl(sec);
    setTimeout(function(){
      var el=document.getElementById('sec-'+sec);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      else window.scrollTo({top:0,behavior:'smooth'});
    },80);
    if(sec==='lb'&&typeof rLB==='function')rLB();
  };

  // Build home - exact demo layout
  function _bh() {
    var ph=document.getElementById('p-home');
    if(!ph||ph.dataset.built)return;
    ph.dataset.built='1';ph.className='pg';ph.style.cssText='display:block;padding:0;';

    // Game cards HTML
    var gamesHtml = _buildGameCards();

    ph.innerHTML =
    // HERO - Stitch Kinetic Monolith
    '<div style="max-width:100%;margin:0 auto;padding:32px 32px 0">' +
    '<section id="sec-home" style="position:relative;width:100%;border-radius:24px;overflow:hidden;max-width:1400px;margin:0 auto">' +
      '<div style="position:absolute;inset:0;background:linear-gradient(to right,#13131b,rgba(19,19,27,0.4),transparent);z-index:1"></div>' +
      '<div style="width:100%;height:320px;background:url(https://lh3.googleusercontent.com/aida-public/AB6AXuDwJFdJwTujjxripa-QE7ChUU1zEHhxw1lhjIqWmctLQic8g5zC2AKY3PT5VG5K6V4tjnt33JMfl6d2b9TIXnwcV4BNB3XNZx5cfOxyz0-vuevYeNXDf2m6t-aXnebPAv5Qusv54wii51wt97F9SvlTlPXsnqL9ro4ftbfIYWoxjQxfMLvLmxlDK2RH7C6PCWO_5qn7i34SdQ98HHT1hyTSufgKZd_CvHif6fZzCdiR1oltsDNnOthz9PVajXlu8NJA2_STNiNOw0U=w1400) center/cover;display:flex;align-items:center"></div>' +
      '<div style="position:absolute;inset:0;z-index:2;padding:48px;display:flex;flex-direction:column;justify-content:center;gap:20px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '' +
          '<span style="color:#3cddc7;font-weight:700;font-size:14px;letter-spacing:3px;text-transform:uppercase">İnteraktif Oyunlar</span>' +
        '</div>' +
        '<h1 class="fd" style="font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;max-width:700px;line-height:1">EIGHTBORN<span style="color:#ffb4ac">V</span> ARENA</h1>' +
        '<p style="color:#9a969e;max-width:480px;font-size:15px;line-height:1.7">Hangi Eightborn karakterine benzediğini bul! En sevdiğin karakteri hayatta tut ve Diğerlerini CK&#39;la! Chat ile birlikte yarış!</p>' +
        '<div style="display:flex;gap:16px;margin-top:8px">' +
          '<button class="btn" style="padding:16px 40px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#1b1b24" onclick="document.getElementById(\'sec-games\').scrollIntoView({behavior:\'smooth\'})">Oynamaya Başla</button>' +
          '<button class="btn" style="padding:16px 40px;background:#1f1f28;border:1px solid rgba(91,64,61,0.2);border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:13px;color:#e4e1ee" onclick="document.getElementById(\'sec-games\').scrollIntoView({behavior:\'smooth\'})">Oyunlara Göz At</button>' +
        '</div>' +
      '</div>' +
    '</section></div>' +

    // STATS
    '<div style="max-width:1400px;margin:0 auto;padding:24px 32px 0"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px" id="home-stats">' +
      '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:24px 26px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(255,84,77,.08);color:#ffb4ac;flex-shrink:0">\u2694\ufe0f</div><div><div class="fd" style="font-size:36px;line-height:1;color:#e4e1ee" data-s="chars">\u2014</div><div style="font-size:12px;color:#6a6878;margin-top:2px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Toplam Karakter</div></div></div>' +
      '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:24px 26px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(60,221,199,.08);color:#3cddc7;flex-shrink:0">\ud83c\udfae</div><div><div class="fd" style="font-size:36px;line-height:1;color:#e4e1ee" data-s="plays">\u2014</div><div style="font-size:12px;color:#6a6878;margin-top:2px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Toplam Oynama</div></div></div>' +
      '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:24px 26px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(255,185,95,.08);color:#ffb95f;flex-shrink:0">\ud83c\udfc6</div><div><div class="fd" style="font-size:36px;line-height:1;color:#e4e1ee" data-s="pts">\u2014</div><div style="font-size:12px;color:#6a6878;margin-top:2px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Kazanılan Puan</div></div></div>' +
      '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:24px 26px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(99,102,241,.08);color:#818cf8;flex-shrink:0">\ud83d\udcca</div><div><div class="fd" style="font-size:36px;line-height:1;color:#e4e1ee" data-s="modes">—</div><div style="font-size:12px;color:#6a6878;margin-top:2px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Aktif Oyun</div></div></div>' +
    '</div></div>' +

    // GAMES
    '<div style="max-width:1400px;margin:auto;padding:56px 32px 0" id="sec-games">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:40px"><div><h2 class="fd" style="font-size:42px;letter-spacing:2px;color:#ffb4ac">OYUNLAR</h2><div style="height:4px;width:80px;background:#ff544d;margin-top:4px;border-radius:2px"></div></div><p style="color:#6a6878;font-weight:500;font-size:14px;text-transform:uppercase;letter-spacing:2px">'+GD.filter(function(x){return x.on}).length+' AKTİF OYUN</p></div>' +
      '<div id="hg2" class="home-games-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px">' + gamesHtml + '</div>' +
    '</div>' +

    // LEADERBOARD
    '<div style="max-width:1400px;margin:auto;padding:56px 32px 0" id="sec-lb">' +
      '<div style="text-align:center;margin-bottom:40px"><h2 class="fd" style="font-size:52px;letter-spacing:3px;color:#e4e1ee">ARENA LİDERLERİ</h2><p style="color:#ffb4ac;font-weight:700;letter-spacing:3px;font-size:13px;text-transform:uppercase;margin-top:4px">EN İYİLERİN MEYDANI</p></div>' +
      '<div id="lbt"></div>' +
    '</div>' +

    // CONTACT
    '<div style="max-width:1400px;margin:auto;padding:48px 32px 56px" id="sec-contact"><div style="background:rgba(52,52,62,0.3);border:1px solid rgba(91,64,61,0.1);border-radius:24px;padding:48px;display:flex;gap:48px;align-items:flex-start"><div style="flex:1"><h2 class="fd" style="font-size:52px;letter-spacing:2px;margin-bottom:12px">BİZE ULAŞIN</h2><p style="font-size:17px;color:var(--t2);line-height:1.7">Sorularınız, önerileriniz veya hata bildirimleri için bize yazabilirsiniz. En kısa sürede dönüş yapacağız.</p></div><div style="flex:1;max-width:480px"><label class="lbl">Konu Başlığı</label><input class="inp" id="contact-title" placeholder="Örn: Karakter Fotoğrafı Hatası" maxlength="100"><label class="lbl" style="margin-top:4px">Açıklama</label><textarea class="inp" id="contact-desc" rows="5" placeholder="Detaylandırın..." maxlength="1000" style="min-height:150px"></textarea><button class="btn bp" style="width:100%;padding:16px;font-size:16px;border-radius:12px;margin-top:8px" onclick="sendContact()">Gönder</button></div></div></div>';

    if(typeof rLB==='function') setTimeout(rLB,500);
    // Apply custom game names from API
    if(typeof apiGet==='function'){
      apiGet('/game-names').then(function(r){
        var gn=r.games||{};
        window._customGameNames=gn;
        // Update home page game card names
        document.querySelectorAll('.gc-new h3, .gc-new p').forEach(function(el){});
        // Re-render home game cards with custom names
        var hg2=document.getElementById('hg2');
        if(hg2&&typeof _buildGameCards==='function') hg2.innerHTML=_buildGameCards();
      }).catch(function(){});
    }
    // Load real stats
    if(typeof apiGet==='function'){
      apiGet('/init-lite').then(function(r){
        var el=document.getElementById('home-stats');if(!el)return;
        var chars=r.characters?r.characters.length:218;
        var ce=el.querySelector('[data-s="chars"]');if(ce)ce.textContent=chars+'+';
        var me=el.querySelector('[data-s="modes"]');if(me)me.textContent=GD.filter(function(x){return x.on}).length;
      }).catch(function(){});
      Promise.all([
          apiGetGameLeaderboard('FACE'),
          apiGetGameLeaderboard('MEMORY'),
          apiGetGameLeaderboard('QUOTE')
        ]).then(function(results){
          var el=document.getElementById('home-stats');if(!el)return;
          var totalPlays=0;var totalPts=0;
          results.forEach(function(r){
            (r.leaderboard||[]).forEach(function(u){
              totalPlays+=parseInt(u.games_played||0);
              totalPts+=parseInt(u.total_score||0);
            });
          });
          var pe=el.querySelector('[data-s="plays"]');if(pe)pe.textContent=totalPlays.toLocaleString()+'+';
          var pte=el.querySelector('[data-s="pts"]');if(pte)pte.textContent=totalPts.toLocaleString()+'+';
        }).catch(function(){});
    }
  }

  // Build game cards for home page with new style
  window._buildGameCards = function() {
    window._gameImgs={'RANK':'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjYwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icmJnIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzIxMWEyMiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxNTEwMWEiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InJnbG93IiBjeD0iMC41IiBjeT0iMC40IiByPSIwLjYyIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmY4YTRkIiBzdG9wLW9wYWNpdHk9IjAuNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjAuNTUiIHN0b3AtY29sb3I9IiNmZjU0NGQiIHN0b3Atb3BhY2l0eT0iMC4xMyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZjU0NGQiIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icmdvbGQiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMGEwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmOWQzZCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icnNpbHZlciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlZGYwZjYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYjNiOWM4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJyYnJvbnplIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmYjA3OSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjOTZmMzAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjYwIiBmaWxsPSJ1cmwoI3JiZykiLz4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2MCIgZmlsbD0idXJsKCNyZ2xvdykiLz4KICA8cmVjdCB4PSI5MCIgeT0iMTUwIiB3aWR0aD0iNzAiIGhlaWdodD0iOTIiIHJ4PSI3IiBmaWxsPSJ1cmwoI3JzaWx2ZXIpIi8+CiAgPHRleHQgeD0iMTI1IiB5PSIyMDUiIGZvbnQtZmFtaWx5PSJBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9IjgwMCIgZmlsbD0iIzU2NWI2YSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+MjwvdGV4dD4KICA8cmVjdCB4PSIxNjUiIHk9IjExMiIgd2lkdGg9IjcwIiBoZWlnaHQ9IjEzMCIgcng9IjciIGZpbGw9InVybCgjcmdvbGQpIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIxODYiIGZvbnQtZmFtaWx5PSJBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0NCIgZm9udC13ZWlnaHQ9IjgwMCIgZmlsbD0iIzlhNWExNyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+MTwvdGV4dD4KICA8cmVjdCB4PSIyNDAiIHk9IjE3MCIgd2lkdGg9IjcwIiBoZWlnaHQ9IjcyIiByeD0iNyIgZmlsbD0idXJsKCNyYnJvbnplKSIvPgogIDx0ZXh0IHg9IjI3NSIgeT0iMjE4IiBmb250LWZhbWlseT0iQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZvbnQtd2VpZ2h0PSI4MDAiIGZpbGw9IiM3YTNmMTciIHRleHQtYW5jaG9yPSJtaWRkbGUiPjM8L3RleHQ+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAwLDY2KSI+CiAgICA8cGF0aCBkPSJNMCwtMzIgTDkuNCwtOS45IEwzMywtOS45IEwxMy45LDQuOCBMMjEuMSwyNy43IEwwLDEzLjUgTC0yMS4xLDI3LjcgTC0xMy45LDQuOCBMLTMzLC05LjkgTC05LjQsLTkuOSBaIiBmaWxsPSJ1cmwoI3Jnb2xkKSIgc3Ryb2tlPSIjZmZmMmRhIiBzdHJva2Utd2lkdGg9IjEuNiIvPgogIDwvZz4KPC9zdmc+Cg==','STOCK':'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjYwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ic2JnIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzE1MjEyYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwZjE4MjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InNnbG93IiBjeD0iMC41IiBjeT0iMC40IiByPSIwLjY2Ij4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjM2NkZGM3IiBzdG9wLW9wYWNpdHk9IjAuNDIiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwLjU1IiBzdG9wLWNvbG9yPSIjNjBhNWZhIiBzdG9wLW9wYWNpdHk9IjAuMTMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNjBhNWZhIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InN0cmVuZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjAiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMzY2RkYzciLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNjBhNWZhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJzY29pbiIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmUwYTAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmY5ZDNkIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2MCIgZmlsbD0idXJsKCNzYmcpIi8+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyNjAiIGZpbGw9InVybCgjc2dsb3cpIi8+CiAgPGcgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj4KICAgIDxsaW5lIHgxPSI2NCIgeTE9IjE1MCIgeDI9IjY0IiB5Mj0iMjA2IiBzdHJva2U9IiNmZjZhNjMiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iNTYiIHk9IjE2NCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjMyIiByeD0iMyIgZmlsbD0iI2ZmNTQ0ZCIvPgogICAgPGxpbmUgeDE9IjEwOCIgeTE9IjEyMCIgeDI9IjEwOCIgeTI9IjE4MiIgc3Ryb2tlPSIjMmZkNmJkIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxyZWN0IHg9IjEwMCIgeT0iMTM0IiB3aWR0aD0iMTYiIGhlaWdodD0iMzgiIHJ4PSIzIiBmaWxsPSIjMmZkNmJkIi8+CiAgICA8bGluZSB4MT0iMTUyIiB5MT0iOTYiIHgyPSIxNTIiIHkyPSIxNTQiIHN0cm9rZT0iIzJmZDZiZCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8cmVjdCB4PSIxNDQiIHk9IjEwOCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjM2IiByeD0iMyIgZmlsbD0iIzJmZDZiZCIvPgogICAgPGxpbmUgeDE9IjE5NiIgeTE9Ijg2IiB4Mj0iMTk2IiB5Mj0iMTM0IiBzdHJva2U9IiNmZjZhNjMiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMTg4IiB5PSI5NiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjI4IiByeD0iMyIgZmlsbD0iI2ZmNTQ0ZCIvPgogICAgPGxpbmUgeDE9IjI0MCIgeTE9IjU2IiB4Mj0iMjQwIiB5Mj0iMTE4IiBzdHJva2U9IiMyZmQ2YmQiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMjMyIiB5PSI3MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjQyIiByeD0iMyIgZmlsbD0iIzJmZDZiZCIvPgogIDwvZz4KICA8cGF0aCBkPSJNNTIsMTkwIEwxMDgsMTUwIEwxNTIsMTIwIEwyMDAsOTYgTDI2Miw2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI3N0cmVuZCkiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cGF0aCBkPSJNMjYyLDYwIEwyNDYsNjIgTDI1Nyw3NyBaIiBmaWxsPSIjNjBhNWZhIi8+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzE2LDE1MCkiPgogICAgPGNpcmNsZSByPSI0MiIgZmlsbD0idXJsKCNzY29pbikiIHN0cm9rZT0iI2ZmZjJkYSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8Y2lyY2xlIHI9IjMzIiBmaWxsPSJub25lIiBzdHJva2U9IiNjOTc3MmEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIvPgogICAgPHBhdGggZD0iTTAsLTE4IEwxMywzIEwtMTMsMyBaIiBmaWxsPSIjOWE1YTE3Ii8+CiAgICA8cmVjdCB4PSItOSIgeT0iNiIgd2lkdGg9IjE4IiBoZWlnaHQ9IjkiIHJ4PSIyIiBmaWxsPSIjOWE1YTE3Ii8+CiAgPC9nPgo8L3N2Zz4K','DIE':'https://lh3.googleusercontent.com/aida-public/AB6AXuDKm_y2kuhZBWzMXE9gpOoeyAyke2UiJQlbpTV39wKsTfh4spGS637e14SW8-dg3vDqXvy5V64Ysga5_u1SXfLjvYXkOcD69ctlPdLmUKzsSE7E9MPcQP0URkT3RfDHyMyiKtxO8KZMOxaZFBx_kCda6DfIfRZzntCP0AR25GGaQGC2CBCb9MJ1MKgXJLYAceZqNPE8LFkMcOdAQHf6XgN6MP4KeXOlMh9M_bZGEGLYRb8maaffrQKxzaDVE7c59v9zd6tYA6k8oI0','TEAM':'https://lh3.googleusercontent.com/aida-public/AB6AXuCBLPoOUU_av_lsdkx546t_E0pYnTS-rnj_Hs9eyzmc-MKwktHQcJSsYKdhYKuov4BqibppNG4tJh8h-oVl33V3RrDEE9Q-0oB62u-qK0NaCaEImAI5wRADkg42y6MLC-q2fQN3-AEf2kJtvQcRYEpc_I47XY8-e0sXAOPcCvoMmHgH5wZTO4s0EMLbrCGP_8qSp0Zlqi5e_B4x--8uNZgakTL4Nro2pDnhl33MltRsqCRluI9cHCqWFWfPTNKBF7ofY-63hzBDFxw','QUOTE':'https://lh3.googleusercontent.com/aida-public/AB6AXuD9eS3xZIo4edCjbNd2ioQ2Crubi_B0hGJEqsoskdIzxNseKPTeFHlgiHClqeDJGV-MEQPTTRvngesJmqyhU-jC-pqK6rrmslm11-dur8kI2CbuZ5sN6VtqiKhAd4Nj1b121NExdm_TULfFMBaknXN79AKP2fu2veB1e2aqT6gwkMKJy0-l4sFvUHtW3kk1WGMKXbBwYDzPF_dfEbSDVe2h_I5PEK3etLqf2mkrVIzoVChZARzRKKa1w-EWWdIHXJ4MVtX6b99Gwow','FATE':'https://lh3.googleusercontent.com/aida-public/AB6AXuDFJQA8tyu_JnPApEFCmm3XRi6gHYKMXB8ql80ChyKGNCa1FhcdaxEbEstzpXFzliBZoQ0NpFx0lo2F-mq47UIc5jQnD4Y-oidm__xHL3o-ERZQjBgG8v4_ezncE1NZtinnoBgdL4MQWxGDkQnZNx8z_E-3PnOzH64m-8Xddv5eGQ5L7auj5QHMdUeMM3YXbCdu8O-yUzaiG_qWe4-djeAOSoy12wx-6RuhpCr0vUJPkXvK5t2M-iXp7dl3-zE0iIksaG2UzHduYJw','FACE':'https://lh3.googleusercontent.com/aida-public/AB6AXuDvQ9Di9bP_ColmefBngNn5VXOCJ2SacjUaJiBkuMxNlGShGSw5ZrDhobVAGlJEBAjQ7CZpH_uHb_1fnjA4HYHjBkQI-79j88Dpgrelg8dGFyJjXwP-sridu7fBulk-Ae3NFH6vFfqZ7fqfvYq-QntwfGPyZ6hqiZ1fjsehHgjFdxJ-6TquH8PTzzlp77j92HGP7ZhMOHH6Y7Km3xaldO4TlY0ErgWmkNGerjkvwzKqTyCXzf1Cfnur7qebzMKsgdXPJVz7piYvC8w','MEM':'https://lh3.googleusercontent.com/aida-public/AB6AXuAWg1_FI9fGHC0qY1yZY7GKjd1s1fnaLQuojI_o6nTtDFQTl5QsI1zujxwLzd1YwNeNLYD2c4vYewnqJH-NjlDz89tY8DeVTezanKSLrsyXE1XMFX1GnFOzcz2zBGG7DsaXdC-E-aWC2aAYU05wqBk6YTEcCdFZZ31rFAiTk5b24qpmXBEolUxtr5ce5s3IbqF_cFRhyqbrpdvet1JGFMQE9zStHnRKLF7EtKZFmNqwRwW125yHrUtvMvgKbeEU9bKizyOslYl_kvo','WHO':'https://lh3.googleusercontent.com/aida-public/AB6AXuBlrD17Kmg2Fcp6XRN-Aacgzp_9_d8s2sapMmhMUVYzK7KLPPGbEoQNnBPVqcfpXzduHl4LW_hir8eX0Ht3FBztZCmMyNLtlLpopHFf04xBvEBLo4lzqZbCg7qVHyXp2uTeuTILJUKdQei2DvligEnE25reBRLAHI2OQtY9BZN2jaNQ9iF_CFXk8GR2V6P6BpSpJsRen5NKu2tFqT-AW6Q7wKHPM-Wo4YJXbmI7dpZ9-7JzNz1Ggw_ottrZ-zmeuGgf_vBxNS9lZHk','RPSIM':'https://lh3.googleusercontent.com/aida-public/AB6AXuDu-HuA2kWniY3BAi6MTdFFE2s9KZfTdqlWX92Wtb4UZbNZZ8_wYK-ArU1msK-Fo0lp4yY0-mq22KzWcboaQYwRe21GiDkQhEwU6iak-OxpRvbf1GAvbQ_quZKTf6XHEFovq0QUI37Wb70oJ0WeL2y0WfbET2M0x_DAmYAH5j8-iQ2XFI3a4o8pqDCCMnwX0LJMCWBhenmaNcxqoJw1gOPP5LsyyaMI9ap5vtwEwljebmXKL-lWbVm71fnU3XnMuan6IXGEJKqzpOc'};

    var games = [
      {e:'\ud83c\udfac',t:'STREAM',n:'Yayıncı Oyunları',d:'Chat ile interaktif 7 farklı oyun modu',diff:'İNTERAKTİF !',dc:'rgba(255,84,77,.08);color:#ffb4ac',ib:'linear-gradient(135deg,#292933,#1f1f28)',str:true},
      {e:'\u2694\ufe0f',t:'DIE',n:'Kim Hayatta Kalacak',d:'Karakterler birer birer eleniyor — sonuna kim kalacak?',diff:'Kolay',dc:'rgba(45,212,191,.08);color:#2dd4bf',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83d\udc65',t:'TEAM',n:'Ekibini Kur',d:'Hayalindeki dream team\'i oluştur ve paylaş',diff:'Kolay',dc:'rgba(45,212,191,.08);color:#2dd4bf',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83d\udcac',t:'QUOTE',n:'Replik Bil',d:'Efsane replikler — kime ait olduğunu tahmin et',diff:'Zor',dc:'rgba(255,84,77,.08);color:#ffb4ac',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83c\udfb2',t:'FATE',n:'Kaderini Seç',d:'Öldür, evlen, ghostla, kaç — kaderi sen belirle',diff:'Kolay',dc:'rgba(45,212,191,.08);color:#2dd4bf',ib:'rgba(255,84,77,.08)'},
      {e:'\ud83e\udd14',t:'FACE',n:'Yüzden Bil',d:'Bulanık fotoğraftan karakterin kim olduğunu bul',diff:'Zor',dc:'rgba(255,84,77,.08);color:#ffb4ac',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83e\udde0',t:'MEM',n:'Eightborn Moruq',d:'Sunucu hakkında ne kadar bilgilisin? Test et',diff:'Çok Zor',dc:'rgba(255,84,77,.08);color:#ffb4ac',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\u2753',t:'WHO',n:'Sen Kimsin?',d:'Kişilik testine gir — hangi karaktere benziyorsun?',diff:'KEŞFET!',dc:'rgba(139,92,246,.08);color:#8b5cf6',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83c\udfaf',t:'RANK',n:'Karakter Sırala',d:'Karakterleri kritere göre sırala, toplulukla yarış',diff:'YENİ!',dc:'rgba(255,185,95,.08);color:#ffb95f',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83d\udcc8',t:'STOCK',n:'Karakter Borsası',d:'Sanal borsada hisse al-sat, en zengin yatırımcı ol',diff:'YENİ!',dc:'rgba(60,221,199,.08);color:#3cddc7',ib:'linear-gradient(135deg,#292933,#1f1f28)'},
      {e:'\ud83c\udfae',t:'RPSIM',n:'RP Simülasyonu',d:'Şehrin kralı mı olacaksın soytarısı mı?',diff:'YAKINDA',dc:'rgba(100,100,100,.08);color:#666',ib:'linear-gradient(135deg,#292933,#1f1f28)',soon:true}
    ];
    // Apply custom names
    var cn=window._customGameNames||{};
    games.forEach(function(g){
      if(cn[g.t+'_name']) g.n=cn[g.t+'_name'];
      if(cn[g.t+'_desc']) g.d=cn[g.t+'_desc'];
    });
    var cn=window._customGameNames||{};games.forEach(function(g){if(cn[g.t+'_name'])g.n=cn[g.t+'_name'];if(cn[g.t+'_desc'])g.d=cn[g.t+'_desc'];});
    return games.filter(function(g){
      if(g.soon) return true;
      var gd=GD.find(function(x){return x.t===g.t});
      return gd&&gd.on;
    }).map(function(g){
      if(g.soon){
        return '<div class="gc-new" style="opacity:.5;cursor:default;pointer-events:none;position:relative"><div style="position:absolute;top:12px;right:12px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:6px;background:#666;color:#fff">YAKINDA</div><div class="gc-i" style="background:'+g.ib+'">'+g.e+'</div><h3>'+g.n+'</h3><p>'+g.d+'</p><span class="diff" style="background:'+g.dc+'">'+g.diff+'</span></div>';
      }
      if(g.str){
        return '<div style="grid-column:span 4;background:linear-gradient(135deg,rgba(255,84,77,.08),rgba(139,92,246,.06));border:2px solid rgba(255,84,77,.2);border-radius:20px;padding:36px 40px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(255,84,77,.08);display:flex;align-items:center;gap:32px" onclick="playDirect(\''+g.t+'\')" onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 16px 48px rgba(255,84,77,.15)\';this.style.borderColor=\'#ff544d\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 8px 32px rgba(255,84,77,.08)\';this.style.borderColor=\'rgba(255,84,77,.2)\'">' +
          '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ff544d,#818cf8)"></div>' +
          '<div style="position:absolute;top:14px;right:16px;font-size:13px;font-weight:800;letter-spacing:.5px;padding:6px 16px;border-radius:8px;background:#ff544d;color:#fff">\ud83d\udd34 CANLI YAYIN</div>' +
          '<div style="width:100px;height:100px;border-radius:22px;background:rgba(232,67,62,.15);display:flex;align-items:center;justify-content:center;font-size:48px;flex-shrink:0;border:1px solid rgba(255,84,77,.15)">'+g.e+'</div>' +
          '<div style="flex:1"><h3 style="font-size:26px;font-weight:800;color:#fff;margin-bottom:6px">'+g.n+'</h3><p style="font-size:16px;color:var(--t2);line-height:1.5">'+g.d+'</p><span style="display:inline-block;margin-top:10px;font-size:14px;font-weight:700;padding:6px 16px;border-radius:8px;background:rgba(255,84,77,.08);color:#ffb4ac">'+g.diff+'</span></div></div>';
      }
      var img=_gameImgs[g.t]||'';
      return '<div class="gc-new" onclick="playDirect(\''+g.t+'\')"><div class="gc-i" style="background:#1f1f28">'+(img?'<img src="'+img+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7;transition:opacity .3s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">':'<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:64px">'+g.e+'</div>')+'<div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3 style="font-size:18px">'+g.n+'</h3><p style="font-size:13px">'+g.d+'</p><span class="diff" style="background:'+g.dc+'">'+g.diff+'</span></div>';
    }).join('');
  }

  // Inject mobile nav
  if(!document.querySelector('.mob-nav')){var mn=document.createElement('div');mn.className='mob-nav';mn.innerHTML='<div class="mob-nav-inner"><a href="#" class="on" onclick="goSec(\'home\');return false"><span>\u26a1</span>Anasayfa</a><a href="#" onclick="goSec(\'games\');return false"><span>\ud83c\udfae</span>Oyunlar</a><a href="#" onclick="goSec(\'lb\');return false"><span>\ud83c\udfc6</span>Sıralama</a><a href="#" onclick="goSec(\'contact\');return false"><span>\ud83d\udcec</span>İletişim</a><a href="#" onclick="go(\'login\');return false"><span>\ud83d\udc64</span>Profil</a></div>';document.body.appendChild(mn);}

  // Override go - handle ALL page navigation
  // ═══ URL ROUTING ═══
  var _routeMap = {home:'/',oyunlar:'games',siralama:'lb',iletisim:'contact',giris:'login',kayit:'register',admin:'admin',profil:'profile'};
  var _reverseRoute = {home:'/',games:'/oyunlar',lb:'/siralama',contact:'/iletisim',login:'/giris',register:'/kayit',admin:'/admin',profile:'/profil'};
  var _gameUrls = {DIE:'/oyun/hayatta-kal',TEAM:'/oyun/ekibini-kur',QUOTE:'/oyun/replik-bil',FACE:'/oyun/yuzden-bil',MEM:'/oyun/eightborn-moruq',FATE:'/oyun/kaderini-sec',WHO:'/oyun/sen-kimsin',STREAM:'/yayinci',RANK:'/oyun/karakter-sirala',STOCK:'/oyun/borsa'};
  var _urlToGame = {'hayatta-kal':'DIE','ekibini-kur':'TEAM','replik-bil':'QUOTE','yuzden-bil':'FACE','eightborn-moruq':'MEM','kaderini-sec':'FATE','sen-kimsin':'WHO','karakter-sirala':'RANK','borsa':'STOCK'};
  var _skipPush = false;

  window._pushUrl = function(page, extra) {
    if (_skipPush) return;
    var hash = _reverseRoute[page] || '/';
    if (page === 'profile' && extra) hash = '/profil/' + encodeURIComponent(extra);
    if (page === 'game' && extra) hash = _gameUrls[extra] || '/oyunlar';
    if (page === 'streamer-menu') hash = '/yayinci';
    if (page === 'streamer-setup') hash = '/yayinci/kurulum';
    if (page === 'streamer-live') hash = '/yayinci/canli';
    var newHash = '#' + hash;
    if (window.location.hash !== newHash) {
      history.pushState({ page: page, extra: extra || null }, '', newHash);
    }
  };
  var _pushUrl = window._pushUrl;

  // Back button handler
  window.addEventListener('popstate', function(e) {
    _skipPush = true;
    try {
      if (e.state && e.state.page) {
        var pg = e.state.page;
        if (pg === 'profile' && e.state.extra) {
          window._profileTarget = e.state.extra;
          go('profile');
        } else if (pg === 'game' && e.state.extra) {
          playDirect(e.state.extra);
        } else if (pg === 'streamer-menu') {
          playDirect('STREAM');
        } else if (pg === 'streamer-setup' || pg === 'streamer-live') {
          // Back from setup/live → go to streamer menu
          if (typeof streamCleanup === 'function') streamCleanup();
          playDirect('STREAM');
        } else if (pg === 'home' || pg === 'lb' || pg === 'contact') {
          goSec(pg);
        } else {
          go(pg);
        }
      } else {
        _handleRoute();
      }
    } catch(err) { console.error('popstate error:', err); }
    _skipPush = false;
  });

  // Parse current hash and navigate
  function _handleRoute() {
    var hash = (window.location.hash || '').replace('#', '');
    if (!hash || hash === '/') { goSec('home'); return; }
    
    // /profil/username
    var profMatch = hash.match(/^\/profil\/(.+)$/);
    if (profMatch) {
      window._profileTarget = decodeURIComponent(profMatch[1]);
      _skipPush = true; go('profile'); _skipPush = false;
      return;
    }
    
    // /oyun/xxx — individual games
    var gameMatch = hash.match(/^\/oyun\/(.+)$/);
    if (gameMatch) {
      var gameType = _urlToGame[gameMatch[1]];
      if (gameType) { _skipPush = true; playDirect(gameType); _skipPush = false; return; }
    }
    
    // /yayinci — streamer menu or sub-pages
    if (hash === '/yayinci' || hash === '/yayinci/kurulum' || hash === '/yayinci/canli') {
      _skipPush = true; playDirect('STREAM'); _skipPush = false;
      return;
    }
    
    // Standard page mapping
    var parts = hash.replace(/^\//, '');
    var page = _routeMap[parts];
    if (page) {
      if (page === 'home' || page === 'lb' || page === 'contact') {
        _skipPush = true; goSec(page); _skipPush = false;
      } else {
        _skipPush = true; go(page); _skipPush = false;
      }
    } else {
      goSec('home');
    }
  }

  var _origGo=window.go;
  window.go=function(pg){
    if(pg==='home'||pg==='lb'||pg==='contact'){goSec(pg);return;}
    // Hide p-home first
    var _ph=document.getElementById('p-home');
    if(_ph){_ph.classList.add('hid');_ph.style.display='none';}
    // Admin: direct handling for reliability
    if(pg==='admin'){
      if(typeof curUser==='undefined'||!curUser||curUser.role!=='ADMIN'){if(typeof toast==='function')toast('Admin yetkisi gerekli!',false);goSec('home');return;}
      document.querySelectorAll('[id^="p-"]').forEach(function(e){e.classList.add('hid');e.style.display='none';});
      var pa=document.getElementById('p-admin');
      if(pa){pa.classList.remove('hid');pa.style.display='block';}
      window.scrollTo({top:0,behavior:'smooth'});
      _pushUrl('admin');
      if(typeof rAdm==='function')rAdm();
      return;
    }
    // Login, Register, Games, Profile: direct handling
    if(pg==='login'||pg==='register'||pg==='games'||pg==='profile'){
      document.querySelectorAll('[id^="p-"]').forEach(function(e){e.classList.add('hid');e.style.display='none';});
      var tp=document.getElementById('p-'+pg);
      if(tp){tp.classList.remove('hid');tp.style.display='block';}
      window.scrollTo({top:0,behavior:'smooth'});
      if(pg==='games'){
        var ag=document.getElementById('ag');if(ag)ag.classList.add('hid');
        var gg=document.getElementById('gg');if(gg)gg.style.display='';
        var gh=document.getElementById('games-hdr');if(gh)gh.style.display='';
        var gc=document.getElementById('games-con');if(gc){gc.style.maxWidth='';gc.style.padding='';}
        _pushUrl('games');
      }
      if(pg==='profile'){
        var _pu=window._profileTarget||(typeof curUser!=='undefined'&&curUser?curUser.username:'');
        window._profileTarget=null;
        if(_pu&&typeof renderProfile==='function'){
          renderProfile(_pu);
          _pushUrl('profile', _pu);
        } else { goSec('home'); return; }
      }
      if(pg==='login') _pushUrl('login');
      if(pg==='register') _pushUrl('register');
      return;
    }
    // Everything else: use original go
    if(typeof _origGo==='function'){try{_origGo(pg);}catch(e){console.error('go error:',e);}}
  };

  // Footer with policy links
  var footer=document.querySelector('footer');
  if(footer){
    footer.style.cssText='width:100%;border-top:1px solid rgba(91,64,61,0.08);background:#0d0d14;padding:32px 32px 24px;text-align:center';
    footer.innerHTML='<div style="max-width:1400px;margin:auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
      '<div style="font-size:13px;color:#4a4858">© ' + new Date().getFullYear() + ' EightbornV Arena</div>' +
      '<div style="display:flex;gap:20px;flex-wrap:wrap" id="footer-links"></div>' +
      '</div>';
    // Load footer pages from API
    if(typeof apiGet==='function'){
      apiGet('/footer-pages').then(function(r){
        var pages=r.pages||[];
        var el=document.getElementById('footer-links');
        if(!el||pages.length===0)return;
        el.innerHTML=pages.map(function(p){
          return '<a href="#" onclick="showFooterPage(\''+p.slug+'\');return false" style="font-size:13px;color:#6a6878;text-decoration:none;transition:color .2s;font-weight:500" onmouseover="this.style.color=\'#ffb4ac\'" onmouseout="this.style.color=\'#6a6878\'">'+p.title+'</a>';
        }).join('');
      }).catch(function(){});
    }
  }

  // Footer page popup
  window.showFooterPage=function(slug){
    if(typeof apiGet!=='function')return;
    apiGet('/footer-pages/'+slug).then(function(r){
      if(!r.page)return;
      var overlay=document.createElement('div');
      overlay.id='footer-modal';
      overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.onclick=function(e){if(e.target===overlay)overlay.remove()};
      overlay.innerHTML='<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.15);border-radius:20px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:40px;position:relative">' +
        '<button onclick="document.getElementById(\'footer-modal\').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#6a6878;font-size:24px;cursor:pointer">✕</button>' +
        '<h2 style="font-family:Bebas Neue,sans-serif;font-size:32px;letter-spacing:2px;color:#e4e1ee;margin-bottom:20px">'+r.page.title+'</h2>' +
        '<div style="font-size:15px;color:#9a969e;line-height:1.8;white-space:pre-wrap">'+r.page.content+'</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }).catch(function(){toast('Sayfa yüklenemedi',false)});
  };

  // Force load ads FIRST (before page build)
  if(typeof apiGet==='function'){
    apiGet('/init-lite').then(function(r){
      var ac=r.ads_config||r.ads;if(ac){
        try{if(typeof ac==='string')ac=JSON.parse(ac);}catch(e){}
        window.adConfig=ac;
        try{sessionStorage.setItem('ebv_ads',JSON.stringify(ac));}catch(e){}
        if(typeof applyAds==='function')applyAds();
      }
    }).catch(function(){});

    // Load SEO settings and apply to page meta
    apiGet('/seo').then(function(s){
      if(s.seo_title)document.title=s.seo_title;
      var metas={description:s.seo_description,keywords:s.seo_keywords,author:s.seo_author,robots:s.seo_robots,'theme-color':s.seo_themecolor};
      for(var n in metas){if(!metas[n])continue;var el=document.querySelector('meta[name="'+n+'"]');if(el)el.setAttribute('content',metas[n]);}
      var ogMap={'og:title':s.seo_ogtitle||s.seo_title,'og:description':s.seo_ogdesc||s.seo_description,'og:image':s.seo_ogimage};
      for(var p in ogMap){if(!ogMap[p])continue;var el=document.querySelector('meta[property="'+p+'"]');if(el)el.setAttribute('content',ogMap[p]);}
      var twMap={'twitter:title':s.seo_ogtitle||s.seo_title,'twitter:description':s.seo_ogdesc||s.seo_description,'twitter:image':s.seo_ogimage};
      for(var t in twMap){if(!twMap[t])continue;var el=document.querySelector('meta[name="'+t+'"]');if(el)el.setAttribute('content',twMap[t]);}
      if(s.seo_canonical){var link=document.querySelector('link[rel="canonical"]');if(link)link.setAttribute('href',s.seo_canonical);}
      if(s.seo_gsc){var m=document.createElement('meta');m.name='google-site-verification';m.content=s.seo_gsc;document.head.appendChild(m);}
      if(s.seo_gtm&&/^GTM-[A-Z0-9]{6,10}$/.test(s.seo_gtm)){var sc=document.createElement('script');sc.textContent="(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','"+s.seo_gtm+"')";document.head.appendChild(sc);}
      // Google AdSense — sadece ca-pub-XXXX formatı kabul edilir
      if(s.seo_adsense&&/^ca-pub-\d{10,20}$/.test(s.seo_adsense)){var adsc=document.createElement('script');adsc.async=true;adsc.crossOrigin='anonymous';adsc.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+s.seo_adsense;document.head.appendChild(adsc);var adm=document.createElement('meta');adm.name='google-adsense-account';adm.content=s.seo_adsense;document.head.appendChild(adm);}
      // Google Analytics — sadece G-XXXX veya UA-XXXX formatı kabul edilir
      if(s.seo_ga&&/^(G-[A-Z0-9]{6,12}|UA-\d{6,12}-\d{1,2})$/.test(s.seo_ga)){var gasc=document.createElement('script');gasc.async=true;gasc.src='https://www.googletagmanager.com/gtag/js?id='+s.seo_ga;document.head.appendChild(gasc);var gasc2=document.createElement('script');gasc2.textContent="window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','"+s.seo_ga+"')";document.head.appendChild(gasc2);}
    }).catch(function(){});
  }



  // ═══ GAME SCREEN CSS OVERRIDES ═══
  var _gameCss = document.createElement('style');
  _gameCss.textContent = 
    // Game container
    '#ag{background:#13131b}' +
    '#p-games .con{background:#13131b}' +
    
    // Game page wrapper 
    '.game-wrap{max-width:900px;margin:0 auto;padding:20px}' +
    
    // HUD Bar
    '.hud-bar{display:flex;gap:12px;margin-bottom:24px;padding:0 4px}' +
    '.hud-item{flex:1;background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:16px 20px;text-align:center}' +
    '.hud-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#6a6878;margin-bottom:4px}' +
    '.hud-val{font-family:Bebas Neue,sans-serif;font-size:28px;color:#e4e1ee;letter-spacing:1px}' +
    '.hud-val.accent{color:#ffb4ac}' +
    '.hud-val.teal{color:#3cddc7}' +
    '.hud-val.gold{color:#ffb95f}' +
    
    // Game title section
    '.game-title{text-align:center;margin-bottom:32px}' +
    '.game-title h2{font-family:Bebas Neue,sans-serif;font-size:clamp(32px,5vw,48px);letter-spacing:3px;color:#e4e1ee}' +
    '.game-title .gt-line{width:80px;height:4px;background:linear-gradient(90deg,#ff544d,#3cddc7);margin:8px auto 0;border-radius:2px}' +
    
    // Game card (character cards, answer cards)
    '.g-card{background:#1f1f28;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:24px;cursor:pointer;transition:all .3s;text-align:center;position:relative;overflow:hidden}' +
    '.g-card:hover{transform:translateY(-4px);box-shadow:0 16px 32px -8px rgba(255,84,77,0.12);border-color:rgba(255,84,77,0.2)}' +
    '.g-card img,.g-card .cp-wrap{border-radius:12px;overflow:hidden}' +
    
    // Answer option (A/B/C/D style)
    '.g-opt{background:#1f1f28;border:1px solid rgba(91,64,61,0.1);border-radius:16px;padding:20px 24px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:16px}' +
    '.g-opt:hover{background:#292933;border-color:rgba(255,84,77,0.2)}' +
    '.g-opt .opt-letter{width:40px;height:40px;border-radius:12px;background:#292933;display:flex;align-items:center;justify-content:center;font-weight:800;color:#ffb4ac;font-size:16px;flex-shrink:0}' +
    '.g-opt .opt-text{font-size:16px;font-weight:600;color:#e4e1ee}' +
    '.g-opt.correct{background:rgba(60,221,199,0.08);border-color:#3cddc7}' +
    '.g-opt.correct .opt-letter{background:rgba(60,221,199,0.15);color:#3cddc7}' +
    '.g-opt.wrong{background:rgba(255,84,77,0.08);border-color:#ff544d}' +
    '.g-opt.wrong .opt-letter{background:rgba(255,84,77,0.15);color:#ff544d}' +
    
    // Game action button
    '.g-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 40px;border-radius:12px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:2px;cursor:pointer;transition:all .2s;border:none}' +
    '.g-btn-primary{background:linear-gradient(135deg,#ffb4ac,#ff544d);color:#1b1b24;box-shadow:0 0 20px rgba(255,84,77,0.2)}.g-btn-primary:hover{box-shadow:0 0 30px rgba(255,84,77,0.3);transform:translateY(-2px)}' +
    '.g-btn-secondary{background:#292933;color:#e4e1ee;border:1px solid rgba(91,64,61,0.15)}.g-btn-secondary:hover{background:#34343e}' +
    
    // Result notification (centered overlay)
    '.g-notif{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:32px 56px;border-radius:20px;backdrop-filter:blur(20px)}' +
    '.g-notif.ok{background:rgba(60,221,199,0.12);border:2px solid rgba(60,221,199,0.25)}' +
    '.g-notif.fail{background:rgba(255,84,77,0.12);border:2px solid rgba(255,84,77,0.25)}' +
    '.g-notif .icon{font-size:48px;margin-bottom:8px}' +
    '.g-notif .msg{font-family:Bebas Neue,sans-serif;font-size:28px;letter-spacing:2px}' +
    '.g-notif.ok .msg{color:#3cddc7}' +
    '.g-notif.fail .msg{color:#ffb4ac}' +
    
    // VS badge
    '.vs-badge{width:64px;height:64px;border-radius:50%;background:#ff544d;display:flex;align-items:center;justify-content:center;font-family:Bebas Neue,sans-serif;font-size:24px;color:#fff;box-shadow:0 0 24px rgba(255,84,77,0.3);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5}' +
    
    // Result screen
    '.g-result{text-align:center;padding:48px 32px}' +
    '.g-result h2{font-family:Bebas Neue,sans-serif;font-size:52px;letter-spacing:3px;color:#e4e1ee;margin-bottom:8px}' +
    '.g-result .subtitle{font-size:18px;color:#9a969e;margin-bottom:32px}' +
    
    // Character photo styling
    '.ch-photo{border-radius:16px;overflow:hidden;border:1px solid rgba(91,64,61,0.15)}' +
    '.ch-photo:hover{border-color:rgba(255,84,77,0.3)}' +
    
    // Responsive
    '@media(max-width:768px){.hud-bar{flex-wrap:wrap}.hud-item{min-width:calc(50% - 8px)}}' +
    '@media(max-width:500px){.hud-item{min-width:100%}}';
  document.head.appendChild(_gameCss);

  // ═══ AUTH PAGE REDESIGN ═══
  function rebuildAuth(){
    var pl=document.getElementById('p-login');
    if(pl){pl.innerHTML='<div style="max-width:1000px;margin:auto;padding:40px 32px;display:flex;align-items:center;gap:0;min-height:calc(100vh - 120px)"><div style="flex:1;padding-right:60px"><div style="font-size:48px;margin-bottom:16px">\ud83d\udd10</div><h2 class="fd" style="font-size:clamp(36px,5vw,52px);letter-spacing:2px;line-height:1;margin-bottom:12px;color:#e4e1ee">GİRİŞ YAP</h2><p style="font-size:17px;color:var(--t2);line-height:1.7;margin-bottom:20px">Oyunlara katıl, skor kazan ve sıralamada yerini al.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\u2694\ufe0f 8+ Oyun</div><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\ud83c\udfc6 Sıralama Sistemi</div><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\ud83c\udfac Yayıncı Oyunları</div></div></div><div style="width:400px;flex-shrink:0;background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:20px;padding:40px"><h3 style="font-size:22px;font-weight:700;margin-bottom:24px;text-align:center">Hesabına Giriş Yap</h3><label class="lbl">E-posta veya Kullanıcı Adı</label><input class="inp" id="login-em" placeholder="ornek@email.com" maxlength="100" autocomplete="email" style="font-size:15px;padding:14px"><label class="lbl" style="margin-top:12px">Şifre</label><input class="inp" id="login-pw" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" maxlength="50" autocomplete="current-password" style="font-size:15px;padding:14px" onkeydown="if(event.key===\'Enter\')doLogin()"><button class="btn bp" style="width:100%;padding:16px;font-size:14px;margin-top:20px;border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(135deg,#ffb4ac,#ff544d);color:#1b1b24" onclick="doLogin()">Giriş Yap</button><p style="font-size:14px;color:var(--t3);margin-top:16px;text-align:center">Hesabın yok mu? <a style="color:var(--v);cursor:pointer;font-weight:600" onclick="go(\'register\')">Kayıt Ol</a></p></div></div>';}
    var pr=document.getElementById('p-register');
    if(pr){pr.innerHTML='<div style="max-width:1000px;margin:auto;padding:40px 32px;display:flex;align-items:center;gap:0;min-height:calc(100vh - 120px)"><div style="flex:1;padding-right:60px"><div style="font-size:48px;margin-bottom:16px">\u2728</div><h2 class="fd" style="font-size:clamp(36px,5vw,52px);letter-spacing:2px;line-height:1;margin-bottom:12px;color:#e4e1ee">KAYIT OL</h2><p style="font-size:17px;color:var(--t2);line-height:1.7;margin-bottom:20px">Hesap oluştur, skorlarını kaydet ve arkadaşlarınla yarış.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\ud83d\udcca Skorların Kaydedilir</div><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\ud83d\udc64 Profil Oluştur</div><div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;background:#1f1f28;font-size:12px;color:#9a969e;font-weight:600;letter-spacing:1px">\ud83d\udd25 Sıralamaya Gir</div></div></div><div style="width:400px;flex-shrink:0;background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:20px;padding:40px"><h3 style="font-size:22px;font-weight:700;margin-bottom:24px;text-align:center">Yeni Hesap Oluştur</h3><label class="lbl">Kullanıcı Adı</label><input class="inp" id="reg-nm" placeholder="ornek123" maxlength="20" autocomplete="username" style="font-size:15px;padding:14px"><label class="lbl" style="margin-top:12px">E-posta</label><input class="inp" id="reg-em" placeholder="ornek@email.com" maxlength="100" autocomplete="email" type="email" style="font-size:15px;padding:14px"><label class="lbl" style="margin-top:12px">Şifre</label><input class="inp" id="reg-pw" type="password" placeholder="Min 4 karakter" maxlength="50" autocomplete="new-password" style="font-size:15px;padding:14px"><label class="lbl" style="margin-top:12px">Şifre Tekrar</label><input class="inp" id="reg-pw2" type="password" placeholder="Şifreyi tekrar gir" maxlength="50" autocomplete="new-password" style="font-size:15px;padding:14px" onkeydown="if(event.key===\'Enter\')doRegister()"><button class="btn bp" style="width:100%;padding:16px;font-size:14px;margin-top:20px;border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(135deg,#ffb4ac,#ff544d);color:#1b1b24" onclick="doRegister()">Kayıt Ol</button><p style="font-size:14px;color:var(--t3);margin-top:16px;text-align:center">Zaten hesabın var mı? <a style="color:var(--v);cursor:pointer;font-weight:600" onclick="go(\'login\')">Giriş Yap</a></p></div></div>';}
  }
  var _authCss=document.createElement('style');
  _authCss.textContent='@media(max-width:768px){#p-login>div,#p-register>div{flex-direction:column!important;padding:24px 20px!important;gap:32px!important}#p-login>div>div:first-child,#p-register>div>div:first-child{padding-right:0!important;text-align:center}#p-login>div>div:last-child,#p-register>div>div:last-child{width:100%!important}}';
  document.head.appendChild(_authCss);

  // Build and render

  // Re-apply ads after login state changes
  var _origDoLogin = window.doLogin;
  if (typeof _origDoLogin === 'function') {
    window.doLogin = async function() {
      await _origDoLogin();
      if (typeof applyAds === 'function') setTimeout(applyAds, 300);
    };
  }
  var _origDoLogout = window.doLogout;
  if (typeof _origDoLogout === 'function') {
    window.doLogout = async function() {
      await _origDoLogout();
      if (typeof applyAds === 'function') setTimeout(applyAds, 300);
    };
  }

  renderNav();
  var _nav=document.getElementById("main-nav");if(_nav)_nav.classList.add("ready");
  rebuildAuth();
  _bh();
  // Re-apply ads after login state is known
  setTimeout(function(){if(typeof applyAds==='function')applyAds();},500);
  // Initial route: parse URL hash and navigate to correct page
  setTimeout(function(){
    var hash = window.location.hash;
    if (hash && hash !== '#' && hash !== '#/') {
      _skipPush = true;
      _handleRoute();
      _skipPush = false;
    } else {
      // Set initial state for home
      history.replaceState({ page: 'home' }, '', '#/');
    }
  }, 100);
});
