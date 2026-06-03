// ═══ EightBornV — Auth & Navigation (API-based) ═══

function renderNav(){
  document.getElementById('main-nav').innerHTML='<div class="ni">'+
    '<a onclick="go(\'home\')" style="display:flex;align-items:center;gap:10px;cursor:pointer"><div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--v),var(--m));display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-weight:700;font-size:20px" class="fd">8B</span></div><span class="fd" style="font-weight:700;font-size:28px">Eightborn<span style="color:var(--v)">V</span> Arena</span></a>'+
    '<div class="nls" style="gap:4px;flex-wrap:nowrap"><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="home" onclick="go(\'home\')">⚡ Ana Sayfa</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="games" onclick="go(\'games\')">🎮 Oyunlar</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="lb" onclick="go(\'lb\')">🏆 Sıralama</button><button class="nl" style="font-size:18px;padding:10px 18px;white-space:nowrap" data-p="contact" onclick="go(\'contact\')">📬 Bize Ulaşın</button>'+(curUser&&curUser.role==='ADMIN'?'<button class="nl" data-p="admin" onclick="go(\'admin\')" style="color:var(--pk);font-size:18px;padding:10px 18px;white-space:nowrap">🛡️ Admin</button>':'')+'<a id="discord-link" href="#" target="_blank" style="display:none;font-size:18px;padding:10px 18px;white-space:nowrap;text-decoration:none;color:#5865F2;font-weight:600;border-radius:10px;background:#5865F210" onclick="">🎮 Discord</a></div>'+
    (curUser?
      '<div style="display:flex;align-items:center;gap:12px;padding:10px 18px;border-radius:14px;background:var(--bg3)"><a id="nav-profile-link" style="display:flex;align-items:center;gap:12px;cursor:pointer;text-decoration:none;color:inherit"><div style="width:40px;height:40px;border-radius:10px;background:#8b5cf620;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--v)">'+esc(curUser.username)[0].toUpperCase()+'</div><div><div style="font-size:16px;font-weight:600">'+esc(curUser.username)+'</div><div style="font-size:13px;color:var(--m)">Puan: '+curUser.best_score+'</div></div></a><button class="btn bg" style="padding:6px 14px;font-size:14px;margin-left:8px;color:var(--pk);border:1px solid var(--pk);border-radius:8px" onclick="doLogout()">Çıkış</button></div>'
    :
      '<div style="display:flex;gap:10px"><button class="btn bs" style="font-size:16px;padding:10px 20px" onclick="go(\'login\')">Giriş</button><button class="btn bp bsm" onclick="go(\'register\')">Kayıt Ol</button></div>'
    )+
  '</div>';
  // Attach profile link click handler
  var profLink = document.getElementById('nav-profile-link');
  if (profLink) profLink.addEventListener('click', function(e) { e.preventDefault(); go('profile'); });
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
  window.scrollTo({top:0,behavior:'smooth'});if(p==='lb')rLB();if(p==='profile'){if(curUser)renderProfile(curUser.username);else{toast('Giriş yapmalısın!',false);go('login');return}};if(p==='admin'){if(!curUser||curUser.role!=='ADMIN'){toast('Admin yetkisi gerekli!',false);go('home');return}rAdm()};
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

// ═══ PROFILE PAGE ═══
async function renderProfile(username) {
  var el = document.getElementById('profile-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:80px 0"><div style="font-size:48px;margin-bottom:12px">⏳</div><p style="color:var(--t3)">Profil yükleniyor...</p></div>';
  
  try {
    var data = await apiGet('/profile/' + encodeURIComponent(username));
    if (data.error) { el.innerHTML = '<div style="text-align:center;padding:80px 0"><div style="font-size:48px;margin-bottom:12px">😔</div><p style="color:var(--t3)">' + esc(data.error) + '</p></div>'; return; }
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:80px 0"><div style="font-size:48px;margin-bottom:12px">❌</div><p style="color:var(--t3)">Profil yüklenemedi.</p></div>';
    return;
  }
  
  var u = data.user;
  var stats = data.gameStats || [];
  var recent = data.recentGames || [];
  var rank = data.rank;
  
  // Game type display names
  var gameNames = {QUOTE:'Replik Bil',FACE:'Yüzden Bil',MEMORY:'Eightborn Moruq',DIE:'Kim Hayatta Kalacak',TEAM:'Ekibini Kur',FATE:'Kaderini Seç',WHO:'Sen Kimsin',STORY:'Chat Kaderini Belirler'};
  var gameEmojis = {QUOTE:'💬',FACE:'🤔',MEMORY:'🧠',DIE:'⚔️',TEAM:'👥',FATE:'🎲',WHO:'🪞',STORY:'🎬'};
  
  // Member since
  var since = new Date(u.created_at);
  var sinceStr = since.toLocaleDateString('tr-TR', {year:'numeric',month:'long',day:'numeric'});
  
  // Last active
  var lastAct = u.last_active ? new Date(u.last_active) : null;
  var lastActStr = lastAct ? timeAgo(lastAct) : 'Bilinmiyor';
  
  // Total games from game_scores
  var totalGames = 0;
  var totalPoints = 0;
  stats.forEach(function(s) { totalGames += parseInt(s.count); totalPoints += parseInt(s.total_score || 0); });
  
  // Role badge
  var roleBadge = '';
  if (u.role === 'ADMIN') roleBadge = '<span style="padding:4px 12px;border-radius:6px;background:#ff544d20;color:#ff544d;font-size:12px;font-weight:700">🛡️ ADMIN</span>';
  else if (u.streamer) roleBadge = '<span style="padding:4px 12px;border-radius:6px;background:#c084fc20;color:#c084fc;font-size:12px;font-weight:700">🎥 YAYINCI</span>';
  else roleBadge = '<span style="padding:4px 12px;border-radius:6px;background:#3cddc720;color:#3cddc7;font-size:12px;font-weight:700">👤 ÜYE</span>';
  
  // ═══ RENDER ═══
  var html = '';
  
  // Header card
  html += '<div style="text-align:center;padding:40px 0 24px">' +
    '<div style="width:88px;height:88px;border-radius:22px;background:linear-gradient(135deg,#8b5cf6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;color:#fff;margin:0 auto 16px">' + esc(u.username)[0].toUpperCase() + '</div>' +
    '<h2 class="fd" style="font-size:32px;font-weight:700">' + esc(u.username) + '</h2>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px">' + roleBadge + '</div>' +
    '<p style="color:var(--t3);font-size:14px;margin-top:8px">Üyelik: ' + sinceStr + ' · Son aktif: ' + lastActStr + '</p>' +
    '</div>';
  
  // Stats cards
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">';
  
  html += '<div class="cg" style="text-align:center;padding:20px"><div style="font-size:28px;font-weight:800;color:var(--t1)">' + (rank || '—') + '</div><div style="font-size:13px;color:var(--t3);margin-top:4px">Sıralama</div></div>';
  html += '<div class="cg" style="text-align:center;padding:20px"><div style="font-size:28px;font-weight:800;color:var(--v)">' + u.best_score + '</div><div style="font-size:13px;color:var(--t3);margin-top:4px">En İyi Skor</div></div>';
  html += '<div class="cg" style="text-align:center;padding:20px"><div style="font-size:28px;font-weight:800;color:var(--m)">' + totalGames + '</div><div style="font-size:13px;color:var(--t3);margin-top:4px">Toplam Oyun</div></div>';
  html += '<div class="cg" style="text-align:center;padding:20px"><div style="font-size:28px;font-weight:800;color:#ffb95f">' + totalPoints + '</div><div style="font-size:13px;color:var(--t3);margin-top:4px">Toplam Puan</div></div>';
  
  html += '</div>';
  
  // Game breakdown
  if (stats.length > 0) {
    html += '<div class="cg" style="padding:24px;margin-bottom:24px">' +
      '<h3 class="fd" style="font-size:18px;font-weight:700;margin-bottom:16px">🎮 Oyun Dağılımı</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">';
    
    stats.forEach(function(s) {
      var name = gameNames[s.game_type] || s.game_type;
      var emoji = gameEmojis[s.game_type] || '🎮';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;background:var(--bg2);border:1px solid var(--b1)">' +
        '<div style="font-size:24px">' + emoji + '</div>' +
        '<div style="flex:1"><div style="font-weight:600;font-size:14px">' + esc(name) + '</div><div style="font-size:12px;color:var(--t3)">' + s.count + ' oyun · ' + (s.total_score || 0) + ' puan</div></div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--v)">' + (s.best_score || 0) + '</div>' +
        '</div>';
    });
    
    html += '</div></div>';
  }
  
  // Recent games
  if (recent.length > 0) {
    html += '<div class="cg" style="padding:24px">' +
      '<h3 class="fd" style="font-size:18px;font-weight:700;margin-bottom:16px">📋 Son Oyunlar</h3>';
    
    recent.forEach(function(g) {
      var name = gameNames[g.game_type] || g.game_type;
      var emoji = gameEmojis[g.game_type] || '🎮';
      var pct = g.total > 0 ? Math.round(g.score / g.total * 100) : 0;
      var pctColor = pct >= 80 ? 'var(--m)' : pct >= 50 ? '#ffb95f' : 'var(--pk)';
      var ago = timeAgo(new Date(g.played_at));
      
      html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;border-bottom:1px solid var(--b1)">' +
        '<div style="font-size:20px">' + emoji + '</div>' +
        '<div style="flex:1"><span style="font-weight:600;font-size:14px">' + esc(name) + '</span></div>' +
        '<div style="text-align:right"><div style="font-weight:700;color:' + pctColor + '">' + g.score + '/' + g.total + ' <span style="font-size:12px">(%' + pct + ')</span></div><div style="font-size:11px;color:var(--t3)">' + ago + '</div></div>' +
        '</div>';
    });
    
    html += '</div>';
  }
  
  el.innerHTML = html;
}

// Time ago helper
function timeAgo(date) {
  var now = new Date();
  var diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
  if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' gün önce';
  return Math.floor(diff / 2592000) + ' ay önce';
}
