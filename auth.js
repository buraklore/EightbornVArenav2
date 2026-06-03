// ═══ EightBornV — Auth & Navigation (API-based) ═══

function renderNav(){
  document.getElementById('main-nav').innerHTML='<div class="ni">'+
    '<a onclick="go(\'home\')" style="display:flex;align-items:center;gap:10px;cursor:pointer"><div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--v),var(--m));display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-weight:700;font-size:20px" class="fd">8B</span></div><span class="fd" style="font-weight:700;font-size:28px">Eightborn<span style="color:var(--v)">V</span> Arena</span></a>'+
    '<div class="nls" style="gap:4px;flex-wrap:nowrap"><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="home" onclick="go(\'home\')">⚡ Ana Sayfa</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="games" onclick="go(\'games\')">🎮 Oyunlar</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="lb" onclick="go(\'lb\')">🏆 Sıralama</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="contact" onclick="go(\'contact\')">📬 Bize Ulaşın</button>'+(curUser&&curUser.role==='ADMIN'?'<button class="nl" data-p="admin" onclick="go(\'admin\')" style="color:var(--pk);font-size:18px;padding:10px 18px;white-space:nowrap">🛡️ Admin</button>':'')+'<a id="discord-link" href="#" target="_blank" style="display:none;font-size:18px;padding:10px 18px;white-space:nowrap;text-decoration:none;color:#5865F2;font-weight:600;border-radius:10px;background:#5865F210" onclick="">🎮 Discord</a></div>'+
    (curUser?
      '<div style="display:flex;align-items:center;gap:12px;padding:10px 18px;border-radius:14px;background:var(--bg3)"><div style="width:40px;height:40px;border-radius:10px;background:#8b5cf620;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--v)">'+esc(curUser.username)[0].toUpperCase()+'</div><div><div style="font-size:16px;font-weight:600">'+esc(curUser.username)+'</div><div style="font-size:13px;color:var(--m)">Puan: '+curUser.best_score+'</div></div><button class="btn bg" style="padding:6px 14px;font-size:14px;margin-left:8px;color:var(--pk);border:1px solid var(--pk);border-radius:8px" onclick="doLogout()">Çıkış</button></div>'
    :
      '<div style="display:flex;gap:10px"><button class="btn bs" style="font-size:16px;padding:10px 20px" onclick="go(\'login\')">Giriş</button><button class="btn bp bsm" onclick="go(\'register\')">Kayıt Ol</button></div>'
    )+
  '</div>';
}

// ═══ AUTH ═══
async function doLogin(){
  var em=document.getElementById('login-em').value.trim(); // email or username
  var pw=document.getElementById('login-pw').value.trim();
  if(!em||!pw){toast('E-posta ve şifre gerekli!',false);return}
  var r=await apiLogin(em,pw);
  if(r.error){toast(r.error,false);return}
  try{sessionStorage.setItem('ebv_user',JSON.stringify(curUser));}catch(e){}renderNav();toast('Hoş geldin, '+esc(curUser.username)+'!');go('home');
}

async function doRegister(){
  var nm=document.getElementById('reg-nm').value.trim();
  var em=document.getElementById('reg-em').value.trim();
  var pw=document.getElementById('reg-pw').value.trim();
  var pw2=document.getElementById('reg-pw2').value.trim();
  if(!nm||!em||!pw){toast('Tüm alanları doldur!',false);return}
  if(pw!==pw2){toast('Şifreler eşleşmiyor!',false);return}
  var r=await apiRegister(nm,em,pw);
  if(r.error){toast(r.error,false);return}
  try{sessionStorage.setItem('ebv_user',JSON.stringify(curUser));}catch(e){}renderNav();toast('Hoş geldin, '+esc(curUser.username)+'!');go('home');
}

async function doLogout(){sessionStorage.removeItem('ebv_user');await apiLogout();renderNav();toast('Çıkış yapıldı.');go('home')}

function go(p){if(typeof streamCleanup==="function")streamCleanup();
  document.querySelectorAll('[id^="p-"]').forEach(function(e){e.classList.add('hid')});
  document.getElementById('p-'+p)?.classList.remove('hid');
  document.querySelectorAll('.nl').forEach(function(l){l.classList.toggle('a',l.dataset.p===p)});
  if(document.getElementById('ag')){document.getElementById('ag').classList.add('hid');if(document.getElementById('gg'))document.getElementById('gg').style.display='';if(document.getElementById('games-hdr'))document.getElementById('games-hdr').style.display='';var gc=document.getElementById('games-con');if(gc){gc.style.maxWidth='';gc.style.padding=''}}
  window.scrollTo({top:0,behavior:'smooth'});if(p==='lb')rLB();if(p==='admin'){if(!curUser||curUser.role!=='ADMIN'){toast('Admin yetkisi gerekli!',false);go('home');return}rAdm()};
}
try{var c=sessionStorage.getItem("ebv_user");if(c)curUser=JSON.parse(c);}catch(e){}
renderNav();go("home");
try{var ca=sessionStorage.getItem("ebv_ads");if(ca){adConfig=JSON.parse(ca);if(typeof applyAds==="function")applyAds();}}catch(e){}
initSession();

// Contact form
function sendContact(){
  var title=document.getElementById('contact-title').value.trim();
  var desc=document.getElementById('contact-desc').value.trim();
  if(!title||!desc){toast('Başlık ve açıklama gerekli!',false);return}
  apiPost('/contact',{title:title,description:desc}).then(function(r){
    if(r.error){toast(r.error,false);return}
    toast('Mesajınız gönderildi! Teşekkürler.');
    document.getElementById('contact-title').value='';
    document.getElementById('contact-desc').value='';
  });
}

// Check notifications
function checkNotifications(){
  if(!curUser)return;
  apiGet('/notifications').then(function(r){
    var notifs=r.notifications||[];
    if(notifs.length===0)return;
    notifs.forEach(function(n){
      showNotifPopup(n);
    });
  });
}

function showNotifPopup(n){
  var overlay=document.createElement('div');
  overlay.className='notif-overlay';
  overlay.id='notif-'+n.id;
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML='<div style="background:var(--bg2);border:2px solid var(--v);border-radius:20px;padding:36px;max-width:500px;width:90%;text-align:center;animation:fu .3s ease"><div style="font-size:48px;margin-bottom:12px">📢</div><h3 class="fd" style="font-size:24px;font-weight:700;margin-bottom:12px;color:var(--v)">Bildirim</h3><p style="font-size:16px;color:var(--t1);line-height:1.6;margin-bottom:24px">'+n.message.replace(/</g,'&lt;')+'</p><button class="btn bp" style="padding:12px 32px;font-size:16px" onclick="dismissNotif('+n.id+')">Tamam</button></div>';
  document.body.appendChild(overlay);
}

function dismissNotif(id){
  apiPost('/notifications/read',{id:id});
  var el=document.getElementById('notif-'+id);
  if(el)el.remove();
}

// Load discord link
function loadDiscord(){
  var dl=document.getElementById('discord-link');
  if(!dl)return;
  if(window._discordLink){dl.href=window._discordLink;dl.style.display='inline-flex';}
  else{
    apiGet('/discord').then(function(r){
      if(r.link){window._discordLink=r.link;dl.href=r.link;dl.style.display='inline-flex';}
    }).catch(function(){});
  }
}
setTimeout(loadDiscord,2000);

// Check notifications periodically (wait for session first)
setTimeout(function(){checkNotifications();},4000);
setInterval(function(){checkNotifications();},15000);

// Heartbeat - ping server every 60s
function heartbeat(){if(curUser)apiPost('/heartbeat',{}).catch(function(){});}
setInterval(heartbeat, 60000);
setTimeout(heartbeat, 3000);

// Periodic banned check
setInterval(function(){
  if(curUser&&!curUser.banned){
    apiGet('/auth/me').then(function(r){
      if(r.user&&r.user.banned){
        curUser.banned=true;
        toast('Hesabınız yasaklanmıştır!',false);
      }
    });
  }
},30000);
