// ═══ STREAMER GAME — Live Chat Game Mode ═══
var streamState = null;
var gameTimers = [];
window.addEventListener("load", function(){ if(typeof streamCleanup==="function") streamCleanup(); });
window.addEventListener("beforeunload", function(){ if(typeof streamCleanup==="function") streamCleanup(); });
window.addEventListener("pagehide", function(){ if(typeof streamCleanup==="function") streamCleanup(); });
var chatPollTimer = null;
var roundTimer = null;
var lastChatTs = '';
var _processedMsgs = new Set(); // Dedup: processed message hashes
var _chatPollErrors = 0; // Consecutive error counter

function streamStart() {
  var ag = document.getElementById('ag');
  
  // Permission check
  if (!curUser) {
    ag.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="cg" style="text-align:center;padding:60px 40px;max-width:800px"><div style="font-size:80px;margin-bottom:16px">\ud83d\udd12</div><h3 class="fd" style="font-size:28px;font-weight:700;margin-bottom:12px">Giri\u015f Gerekli</h3><p style="font-size:16px;color:var(--t2);margin-bottom:20px">Streamer Game i\u00e7in giri\u015f yapmal\u0131s\u0131n.</p><button class="btn bp" style="font-size:16px;padding:12px 28px" onclick="go(\'login\')">' + 'Giri\u015f Yap</button></div></div>';
    return;
  }
  
  if (curUser.role !== 'ADMIN' && !curUser.streamer) {
    ag.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="cg" style="text-align:center;padding:60px 40px;max-width:800px"><div style="font-size:80px;margin-bottom:16px">\ud83c\udfa5</div><h3 class="fd" style="font-size:28px;font-weight:700;margin-bottom:12px">Yay\u0131nc\u0131 Yetkisi Gerekli</h3><p style="font-size:16px;color:var(--t2);margin-bottom:20px">Bu oyunu sadece yay\u0131nc\u0131 yetkisine sahip kullan\u0131c\u0131lar a\u00e7abilir.</p><button class="btn bp" style="font-size:16px;padding:12px 28px" onclick="streamerApply()">\ud83d\udce8 Yay\u0131nc\u0131 Ba\u015fvurusu Yap</button></div></div>';
    return;
  }
  // Load custom names directly (don't rely on game-router timing)
  var _gameImgs = window._gameImgs || {};
  var _cn = window._customGameNames || {};
  if (Object.keys(_cn).length === 0 && typeof apiGet === 'function') {
    apiGet('/game-names').then(function(r) {
      window._customGameNames = r.games || {};
      streamStart(); // Re-render with loaded names
    }).catch(function(){});
    if (Object.keys(_cn).length === 0) {
      // Show loading while names load
    }
  }
  var _sn = function(key, fallback) { var cn = window._customGameNames || {}; return cn['S_'+key+'_name'] || fallback; };
  var _sd = function(key, fallback) { var cn = window._customGameNames || {}; return cn['S_'+key+'_desc'] || fallback; };
  ag.innerHTML = 
    '<div style="text-align:center;padding:20px 0">' +
    '<div style="width:92px;height:92px;border-radius:20px;background:rgba(255,84,77,.08);display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 16px;border:1px solid #ffffff0a">\ud83c\udfa5</div>' +
    '<h2 class="fd" style="font-weight:700;font-size:48px">Yay\u0131nc\u0131 Oyunlar\u0131</h2></div>' +
    '<div style="text-align:center;padding:40px 0">' +
    '<p style="font-size:18px;color:var(--t2);margin-bottom:32px">Bir oyun se\u00e7 ve canl\u0131 yay\u0131nda chat ile oyna!</p>' +
    
    // ═══ DÜELLO BANNER — full width above other games ═══
    '<div onclick="streamSetup(\'DUEL\')" style="max-width:1400px;margin:0 auto 28px;padding:0 24px;cursor:pointer">' +
      '<div style="position:relative;border-radius:20px;overflow:hidden;border:2px solid rgba(255,84,77,0.3);background:linear-gradient(135deg,#1a1025,#1f1028,#251520);padding:36px 48px;display:flex;align-items:center;gap:40px;transition:all .3s;box-shadow:0 8px 32px rgba(255,84,77,0.1)" onmouseover="this.style.borderColor=\'#ff544d\';this.style.boxShadow=\'0 12px 48px rgba(255,84,77,0.2)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'rgba(255,84,77,0.3)\';this.style.boxShadow=\'0 8px 32px rgba(255,84,77,0.1)\';this.style.transform=\'\'">' +
        '<div style="position:absolute;top:0;right:0;width:300px;height:100%;background:linear-gradient(135deg,transparent,rgba(255,84,77,0.05));pointer-events:none"></div>' +
        '<div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,#ff544d20,#ff544d10);display:flex;align-items:center;justify-content:center;font-size:40px;flex-shrink:0;border:1px solid rgba(255,84,77,0.2)">⚔️</div>' +
        '<div style="flex:1">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">' +
            '<h3 class="fd" style="font-size:28px;font-weight:800;letter-spacing:1px">' + _sn('DUEL','D\u00fcello Olu\u015ftur') + '</h3>' +
            '<span style="padding:4px 14px;border-radius:8px;background:linear-gradient(135deg,#ff544d,#ff6b6b);color:#fff;font-size:11px;font-weight:800;letter-spacing:2px">YENİ</span>' +
          '</div>' +
          '<p style="font-size:16px;color:#9a969e;max-width:600px">' + _sd('DUEL','Kendi d\u00fcellonu olu\u015ftur! Karakterleri se\u00e7, ba\u015fl\u0131k belirle, chat veya bireysel oyna.') + '</p>' +
        '</div>' +
        '<div style="flex-shrink:0;padding:14px 32px;border-radius:12px;background:linear-gradient(135deg,#ff544d,#ff6b6b);color:#fff;font-weight:800;font-size:14px;letter-spacing:2px;text-transform:uppercase">OYNA →</div>' +
      '</div>' +
    '</div>' +
    
    // ═══ Other games grid ═══
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1400px;margin:0 auto;padding:0 24px">' +
    '<div class="gc-new" onclick="streamSetup(\'QUOTE\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.QUOTE||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83d\udcac\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('QUOTE','Replik Bil') +'</h3><p>'+ _sd('QUOTE','Repli\u011fi kime ait?') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'FACE\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.FACE||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83e\udd14\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('FACE','Y\u00fczden Bil') +'</h3><p>'+ _sd('FACE','Karakteri tan\u0131!') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'MEMORY\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.MEM||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83e\udde0\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('MEMORY','Eightborn Moruq') +'</h3><p>'+ _sd('MEMORY','EightbornV hakk\u0131nda ne kadar bilgilisin?') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'STORY\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.FATE||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83c\udfac\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('STORY','Chat Kaderini Belirler') +'</h3><p>'+ _sd('STORY','Hikayeni chat belirler!') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'CDIE\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.DIE||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\u2694\ufe0f\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('CDIE','Kim Hayatta Kalacak') +'</h3><p>'+ _sd('CDIE','Chat CK\'y\u0131 belirler!') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'CTEAM\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.TEAM||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83d\udc65\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('CTEAM','Ekibini Kur') +'</h3><p>'+ _sd('CTEAM','Ekibi chat belirler!') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '<div class="gc-new" onclick="streamSetup(\'CFATE\')"><div class="gc-i" style="background:#1f1f28"><img src="'+(_gameImgs.FATE||'')+'" style="width:100%;height:100%;object-fit:cover;opacity:0.7" onerror="this.parentElement.innerHTML=\'\ud83c\udfb2\'"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1f1f28,transparent)"></div></div><h3>'+ _sn('CFATE','Kaderini Se\u00e7') +'</h3><p>'+ _sd('CFATE','Kaderi chat belirler!') +'</p><div class="diff" style="background:rgba(255,84,77,.08);color:#ffb4ac">\u0130NTERAKT\u0130F</div></div>' +
    '</div></div>';
}

function streamSetup(mode) {
  var ag = document.getElementById('ag');
  var isStory = mode === 'STORY';
  var modeNames = {QUOTE:'Replik Bil',FACE:'Yüzden Bil',MEMORY:'Eightborn Moruq',STORY:'Chat Kaderini Belirler',CDIE:'Kim Hayatta Kalacak',CTEAM:'Ekibini Kur',CFATE:'Kaderini Seç',DUEL:'Düello Oluştur'};
  if(window._pushUrl) window._pushUrl('streamer-setup');
  
  // Calculate max counts for dynamic options
  var repCount = chars.filter(function(c){return c.a && c.rep && c.rep.trim()}).length;
  var photoCount = chars.filter(function(c){return c.a && c.img && (c.img.startsWith('/images/')||c.img.startsWith('data:image'))}).length;
  var quizCount = memQs.length;
  var totalChars = chars.filter(function(c){return c.a}).length;
  
  var extraField = '';
  
  if (isStory) {
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">👤 Karakter İsmi</label><input class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="story-name" placeholder="Örn: Burak"></div>';
  } else if (mode === 'QUOTE') {
    var opts = '';
    if(repCount>=10) opts+='<option value="10">10 Replik</option>';
    if(repCount>=20) opts+='<option value="20">20 Replik</option>';
    opts+='<option value="'+repCount+'">Tümü ('+repCount+' Replik)</option>';
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">💬 Replik Sayısı</label><select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-count">'+opts+'</select></div>';
  } else if (mode === 'FACE') {
    var opts = '';
    if(photoCount>=10) opts+='<option value="10">10 Karakter</option>';
    if(photoCount>=20) opts+='<option value="20">20 Karakter</option>';
    opts+='<option value="'+photoCount+'">Tümü ('+photoCount+' Fotoğraf)</option>';
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">🤔 Karakter Sayısı</label><select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-count">'+opts+'</select></div>';
  } else if (mode === 'MEMORY') {
    var opts = '';
    if(quizCount>=10) opts+='<option value="10">10 Soru</option>';
    if(quizCount>=20) opts+='<option value="20">20 Soru</option>';
    opts+='<option value="'+quizCount+'">Tümü ('+quizCount+' Soru)</option>';
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">🧠 Soru Sayısı</label><select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-count">'+opts+'</select></div>';
  } else if (mode === 'CDIE' || mode === 'CTEAM') {
    var opts = '';
    if(totalChars>=16) opts+='<option value="16">16 Karakter</option>';
    if(totalChars>=32) opts+='<option value="32">32 Karakter</option>';
    if(totalChars>=64) opts+='<option value="64">64 Karakter</option>';
    opts+='<option value="'+totalChars+'">Tüm Karakterler ('+totalChars+')</option>';
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">👥 Karakter Sayısı</label><select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-count">'+opts+'</select></div>';
  } else if (mode === 'CFATE') {
    extraField = '<div class="form-group" style="margin-bottom:28px"><label class="lbl" style="font-size:20px;margin-bottom:10px">⚧ Cinsiyetiniz</label><select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-count"><option value="M">Erkek (Karşınıza Kadın Karakterler Çıkar)</option><option value="F">Kadın (Karşınıza Erkek Karakterler Çıkar)</option></select></div>';
  } else if (mode === 'DUEL') {
    var charListHtml = '';
    var activeChars = chars.filter(function(c){ return c.a; });
    activeChars.forEach(function(c, i) {
      var cId = (c.n + '|' + c.s).replace(/'/g, "\\'");
      charListHtml += '<label class="duel-char-item" data-name="' + esc(c.n + ' ' + c.s).toLowerCase() + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid var(--b1);transition:all .2s">' +
        '<input type="checkbox" class="duel-char-cb" value="' + i + '" style="width:20px;height:20px;accent-color:#ff544d;flex-shrink:0">' +
        '<div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0">' + cp(c, 36) + '</div>' +
        '<span style="font-weight:600;font-size:14px">' + esc(c.n) + ' ' + esc(c.s) + '</span></label>';
    });
    extraField =
      '<div class="form-group" style="margin-bottom:20px">' +
        '<label class="lbl" style="font-size:20px;margin-bottom:10px">🎮 Oyun Modu</label>' +
        '<select class="inp" style="font-size:20px;padding:18px;border-radius:16px" id="duel-play-mode" onchange="duelToggleChat()">' +
          '<option value="chat">🌐 Chat ile Oyna (Canlı Yayın)</option>' +
          '<option value="solo">🎮 Bireysel Oyna</option>' +
        '</select>' +
      '</div>' +
      '<div id="duel-chat-fields">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">' +
          '<div class="form-group"><label class="lbl" style="font-size:18px;margin-bottom:10px">🌐 Platform</label>' +
          '<select class="inp" style="font-size:18px;padding:16px;border-radius:14px" id="stream-platform" onchange="duelAutoFillUrl()"><option value="youtube">▶️ YouTube</option><option value="kick">🟢 Kick</option></select></div>' +
          '<div class="form-group"><label class="lbl" style="font-size:18px;margin-bottom:10px">🔗 Yayın Linki</label>' +
          '<input class="inp" style="font-size:18px;padding:16px;border-radius:14px" id="stream-url" placeholder="https://youtube.com/watch?v=..."></div>' +
        '</div>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:20px">' +
        '<label class="lbl" style="font-size:20px;margin-bottom:10px">⚔️ Düello Başlığı</label>' +
        '<input class="inp" style="font-size:20px;padding:18px;border-radius:16px" id="duel-title" placeholder="Örn: Hangisi daha zengin?">' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:20px">' +
        '<label class="lbl" style="font-size:20px;margin-bottom:10px">👥 Karakter Seç <span id="duel-count" style="font-size:14px;color:var(--t3)">(0 seçildi — en az 4)</span></label>' +
        '<input class="inp" style="font-size:16px;padding:14px;border-radius:12px;margin-bottom:12px" id="duel-search" placeholder="🔍 Karakter ara..." oninput="duelFilterChars()">' +
        '<div style="display:flex;gap:8px;margin-bottom:12px">' +
          '<button type="button" style="font-size:12px;padding:6px 14px;border-radius:8px;border:1px solid var(--b1);background:var(--bg3);color:var(--t1);cursor:pointer" onclick="duelSelectAll(true)">Tümünü Seç</button>' +
          '<button type="button" style="font-size:12px;padding:6px 14px;border-radius:8px;border:1px solid var(--b1);background:var(--bg3);color:var(--t1);cursor:pointer" onclick="duelSelectAll(false)">Tümünü Kaldır</button>' +
        '</div>' +
        '<div id="duel-char-list" style="max-height:350px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px;border:1px solid var(--b1);border-radius:14px;background:var(--bg2)">' +
          charListHtml +
        '</div>' +
      '</div>';
  }
  
  if (mode === 'DUEL') {
    // ═══ DUEL: 2-column layout with saved duels panel ═══
    ag.innerHTML = 
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 0">' +
      '<h2 class="fd" style="font-weight:700;font-size:28px">⚔️ ' + modeNames[mode] + '</h2></div>' +
      '<div style="display:flex;gap:20px;padding:0 20px;max-width:1400px;margin:0 auto">' +
      
      // LEFT: Setup form
      '<div style="flex:1;min-width:0">' +
      '<div class="cg" style="padding:32px;border-radius:20px">' +
      '<div style="text-align:left">' +
      '<input type="hidden" id="stream-mode" value="DUEL">' +
      extraField +
      '<div style="display:flex;gap:12px;margin-top:16px">' +
        '<button class="btn bp" style="flex:1;font-size:20px;padding:18px;border-radius:14px;background:linear-gradient(135deg,#ff544d,#ff544d);box-shadow:0 8px 32px #ff544d40" onclick="streamConnect()">🚀 Oyunu Başlat</button>' +
        '<button type="button" style="padding:18px 28px;border-radius:14px;border:2px solid #3cddc740;background:#3cddc710;color:#3cddc7;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s" onclick="duelSaveConfig()" onmouseover="this.style.borderColor=\'#3cddc7\'" onmouseout="this.style.borderColor=\'#3cddc740\'">💾 Kaydet</button>' +
      '</div>' +
      '</div></div></div>' +
      
      // RIGHT: Saved duels panel
      '<div style="width:340px;flex-shrink:0">' +
      '<div class="cg" style="padding:20px;border-radius:20px;position:sticky;top:20px">' +
        '<h3 class="fd" style="font-size:18px;font-weight:700;margin-bottom:12px">📋 Kayıtlı Düellolar</h3>' +
        '<div id="duel-library" style="max-height:600px;overflow-y:auto"><div style="text-align:center;padding:20px;color:var(--t3)">Yükleniyor...</div></div>' +
      '</div>' +
      
      // Streamer link save section
      '<div class="cg" style="padding:16px;border-radius:16px;margin-top:12px">' +
        '<h4 style="font-size:14px;font-weight:600;color:var(--t2);margin-bottom:8px">🔗 Yayın Linklerini Kaydet</h4>' +
        '<input class="inp" style="font-size:13px;padding:10px;border-radius:8px;margin-bottom:6px" id="save-yt-url" placeholder="YouTube linki">' +
        '<input class="inp" style="font-size:13px;padding:10px;border-radius:8px;margin-bottom:6px" id="save-kick-url" placeholder="Kick linki">' +
        '<button type="button" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--b1);background:var(--bg3);color:var(--t1);font-size:12px;font-weight:600;cursor:pointer" onclick="duelSaveLinks()">Linkleri Kaydet</button>' +
      '</div>' +
      '</div>' +
      
      '</div>';
    
    // Load saved duels and streamer links
    duelLoadLibrary();
    duelLoadLinks();
  } else {
    // ═══ OTHER MODES: Standard single-column layout ═══
    ag.innerHTML = 
      '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 0">' +
      '<h2 class="fd" style="font-weight:700;font-size:28px">' + modeNames[mode] + '</h2></div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
      '<div class="cg" style="text-align:center;padding:48px 40px;max-width:1100px;width:100%;border-radius:24px">' +
      '<div style="text-align:left;max-width:1000px;margin:0 auto">' +
      '<input type="hidden" id="stream-mode" value="' + mode + '">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">' +
        '<div class="form-group"><label class="lbl" style="font-size:20px;margin-bottom:10px">🌐 Platform</label>' +
        '<select class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-platform"><option value="youtube">▶️ YouTube</option><option value="kick">🟢 Kick</option></select></div>' +
        '<div class="form-group"><label class="lbl" style="font-size:20px;margin-bottom:10px">🔗 Yayın Linki veya Kanal Adı</label>' +
        '<input class="inp" style="font-size:22px;padding:20px;border-radius:16px" id="stream-url" placeholder="https://youtube.com/watch?v=... veya kanal adı"></div>' +
      '</div>' +
      extraField +
      '<button class="btn bp" style="width:100%;font-size:26px;padding:22px;border-radius:16px;margin-top:12px;background:linear-gradient(135deg,#ff544d,#ff544d);box-shadow:0 8px 32px #ff544d40" onclick="streamConnect()">🚀 Oyunu Başlat</button>' +
      '</div></div>';
  }
}

// ═══ DUEL HELPER FUNCTIONS ═══
function duelToggleChat() {
  var mode = document.getElementById('duel-play-mode').value;
  var chatFields = document.getElementById('duel-chat-fields');
  if (chatFields) chatFields.style.display = mode === 'chat' ? 'block' : 'none';
}

function duelFilterChars() {
  var q = (document.getElementById('duel-search').value || '').toLowerCase().trim();
  var items = document.querySelectorAll('.duel-char-item');
  items.forEach(function(el) {
    var name = el.getAttribute('data-name') || '';
    el.style.display = (!q || name.indexOf(q) >= 0) ? 'flex' : 'none';
  });
}

function duelSelectAll(select) {
  document.querySelectorAll('.duel-char-cb').forEach(function(cb) {
    var item = cb.closest('.duel-char-item');
    if (item && item.style.display !== 'none') {
      cb.checked = select;
      item.style.borderColor = select ? '#ff544d' : 'var(--b1)';
      item.style.background = select ? 'rgba(255,84,77,0.05)' : 'transparent';
    }
  });
  duelUpdateCount();
}

function duelUpdateCount() {
  var count = document.querySelectorAll('.duel-char-cb:checked').length;
  var el = document.getElementById('duel-count');
  if (el) {
    var color = count >= 4 ? 'var(--m)' : 'var(--pk)';
    el.innerHTML = '<span style="color:' + color + '">(' + count + ' seçildi' + (count < 4 ? ' — en az 4' : ' ✅') + ')</span>';
  }
}

// Attach change listeners after setup renders
document.addEventListener('change', function(e) {
  if (e.target && e.target.classList.contains('duel-char-cb')) {
    var item = e.target.closest('.duel-char-item');
    if (item) {
      item.style.borderColor = e.target.checked ? '#ff544d' : 'var(--b1)';
      item.style.background = e.target.checked ? 'rgba(255,84,77,0.05)' : 'transparent';
    }
    duelUpdateCount();
  }
});

// ═══ DUEL LIBRARY (Saved Duels) ═══
var _savedDuels = [];

async function duelLoadLibrary() {
  var el = document.getElementById('duel-library');
  if (!el) return;
  try {
    var data = await apiGet('/duels');
    _savedDuels = data.duels || [];
    if (_savedDuels.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--t3)"><div style="font-size:32px;margin-bottom:8px">📭</div><p style="font-size:13px">Henüz kayıtlı düello yok.</p><p style="font-size:11px;margin-top:4px">İlk düellonu oluştur ve kaydet!</p></div>';
      return;
    }
    // Group by creator
    var grouped = {};
    _savedDuels.forEach(function(d) {
      if (!grouped[d.creator_username]) grouped[d.creator_username] = [];
      grouped[d.creator_username].push(d);
    });
    var h = '';
    for (var username in grouped) {
      h += '<div style="margin-bottom:14px">' +
        '<div style="font-size:12px;font-weight:700;color:var(--v);margin-bottom:6px;padding:4px 0;border-bottom:1px solid var(--b1)">📌 ' + esc(username) + '</div>';
      grouped[username].forEach(function(d) {
        var charCount = d.characters ? d.characters.length : 0;
        var isOwn = curUser && curUser.username === d.creator_username;
        h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--b1);margin-bottom:4px;transition:all .2s;background:var(--bg2)" onclick="duelApplyConfig(' + d.id + ')" onmouseover="this.style.borderColor=\'#ff544d\';this.style.background=\'rgba(255,84,77,0.03)\'" onmouseout="this.style.borderColor=\'var(--b1)\';this.style.background=\'var(--bg2)\'">' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">⚔️ ' + esc(d.title) + '</div>' +
          '<div style="font-size:11px;color:var(--t3)">' + charCount + ' karakter</div></div>' +
          (isOwn ? '<div onclick="event.stopPropagation();duelDeleteConfig(' + d.id + ')" style="width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;color:var(--t3);flex-shrink:0" onmouseover="this.style.color=\'#ff544d\'" onmouseout="this.style.color=\'var(--t3)\'">🗑️</div>' : '') +
          '</div>';
      });
      h += '</div>';
    }
    el.innerHTML = h;
  } catch(e) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--t3)">Yüklenemedi</div>';
  }
}

function duelApplyConfig(duelId) {
  var duel = _savedDuels.find(function(d) { return d.id === duelId; });
  if (!duel) return;
  
  // Set title
  var titleEl = document.getElementById('duel-title');
  if (titleEl) titleEl.value = duel.title;
  
  // Uncheck all first
  duelSelectAll(false);
  
  // Check matching characters
  var activeChars = chars.filter(function(c) { return c.a; });
  var charNames = duel.characters || [];
  document.querySelectorAll('.duel-char-cb').forEach(function(cb) {
    var idx = parseInt(cb.value);
    var c = activeChars[idx];
    if (!c) return;
    var key = c.n + '|' + c.s;
    var nameStr = c.n + ' ' + c.s;
    if (charNames.indexOf(key) >= 0 || charNames.indexOf(nameStr) >= 0) {
      cb.checked = true;
      var item = cb.closest('.duel-char-item');
      if (item) { item.style.borderColor = '#ff544d'; item.style.background = 'rgba(255,84,77,0.05)'; }
    }
  });
  duelUpdateCount();
  toast('✅ "' + duel.title + '" yüklendi!');
}

async function duelSaveConfig() {
  var title = (document.getElementById('duel-title').value || '').trim();
  if (!title) { toast('Başlık gerekli!', false); return; }
  
  var selected = [];
  var activeChars = chars.filter(function(c) { return c.a; });
  document.querySelectorAll('.duel-char-cb:checked').forEach(function(cb) {
    var idx = parseInt(cb.value);
    var c = activeChars[idx];
    if (c) selected.push(c.n + '|' + c.s);
  });
  if (selected.length < 4) { toast('En az 4 karakter seç!', false); return; }
  
  try {
    var r = await apiPost('/duels', { title: title, characters: selected });
    if (r.success) {
      toast('💾 Düello kaydedildi!');
      duelLoadLibrary();
    } else { toast(r.error || 'Kaydedilemedi', false); }
  } catch(e) { toast('Kaydedilemedi', false); }
}

async function duelDeleteConfig(duelId) {
  if (!confirm('Bu düelloyu silmek istediğine emin misin?')) return;
  try {
    await apiDelete('/duels/' + duelId);
    toast('🗑️ Silindi');
    duelLoadLibrary();
  } catch(e) { toast('Silinemedi', false); }
}

// ═══ STREAMER LINK MANAGEMENT ═══
function duelAutoFillUrl() {
  var platform = document.getElementById('stream-platform').value;
  var urlEl = document.getElementById('stream-url');
  var ytEl = document.getElementById('save-yt-url');
  var kickEl = document.getElementById('save-kick-url');
  if (!urlEl) return;
  if (platform === 'youtube' && ytEl && ytEl.value) urlEl.value = ytEl.value;
  else if (platform === 'kick' && kickEl && kickEl.value) urlEl.value = kickEl.value;
}

async function duelLoadLinks() {
  try {
    var data = await apiGet('/streamer-link');
    var ytEl = document.getElementById('save-yt-url');
    var kickEl = document.getElementById('save-kick-url');
    var streamUrlEl = document.getElementById('stream-url');
    if (ytEl && data.youtube_url) ytEl.value = data.youtube_url;
    if (kickEl && data.kick_url) kickEl.value = data.kick_url;
    // Auto-fill stream URL if available
    if (streamUrlEl && data.youtube_url) streamUrlEl.value = data.youtube_url;
  } catch(e) {}
}

async function duelSaveLinks() {
  var yt = (document.getElementById('save-yt-url').value || '').trim();
  var kick = (document.getElementById('save-kick-url').value || '').trim();
  try {
    var r = await apiPost('/streamer-link', { youtube_url: yt, kick_url: kick });
    if (r.success) toast('🔗 Linkler kaydedildi!');
    else toast(r.error || 'Kaydedilemedi', false);
  } catch(e) { toast('Kaydedilemedi', false); }
}

// ═══ PAUSE / RESUME SYSTEM ═══
function toggleStreamPause() {
  if (!streamState || !streamState.active) return;
  streamState.paused = !streamState.paused;
  
  var btn = document.getElementById('pause-btn');
  var overlay = document.getElementById('pause-overlay');
  
  if (streamState.paused) {
    if (btn) { btn.innerHTML = '▶️ Devam Et'; btn.style.background = 'linear-gradient(135deg,#3cddc7,#36c4b0)'; btn.style.color = '#1a1a2e'; }
    if (!overlay) {
      var ov = document.createElement('div');
      ov.id = 'pause-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
      ov.innerHTML = '<div style="text-align:center"><div style="font-size:80px;margin-bottom:16px">⏸️</div><h2 style="font-size:36px;font-weight:800;color:#fff;margin-bottom:12px">DURAKLATILDI</h2><p style="font-size:16px;color:rgba(255,255,255,0.6)">Zamanlayıcı ve oylar duraklatıldı</p><button onclick="toggleStreamPause()" style="margin-top:24px;padding:16px 48px;border-radius:14px;border:none;background:linear-gradient(135deg,#3cddc7,#36c4b0);color:#1a1a2e;font-size:20px;font-weight:800;cursor:pointer">▶️ Devam Et</button></div>';
      document.body.appendChild(ov);
    }
  } else {
    if (btn) { btn.innerHTML = '⏸️ Duraklat'; btn.style.background = ''; btn.style.color = ''; }
    if (overlay) overlay.remove();
  }
}

// Floating pause button — auto-injected when a streamer game is active
function showPauseButton() {
  if (document.getElementById('pause-btn-float')) return;
  var btn = document.createElement('div');
  btn.id = 'pause-btn-float';
  btn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9998;display:flex;gap:8px';
  btn.innerHTML = '<button id="pause-btn" onclick="toggleStreamPause()" style="padding:10px 20px;border-radius:12px;border:2px solid rgba(255,255,255,0.15);background:rgba(30,30,46,0.9);color:#e4e1ee;font-size:14px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);transition:all .2s;display:flex;align-items:center;gap:6px" onmouseover="this.style.borderColor=\'#ff544d\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.15)\'">⏸️ Duraklat</button>';
  document.body.appendChild(btn);
}

function hidePauseButton() {
  var btn = document.getElementById('pause-btn-float');
  if (btn) btn.remove();
  var overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.remove();
}

async function streamConnect() {
  if(typeof checkBanned==="function"&&checkBanned())return;
  var platform = document.getElementById('stream-platform').value;
  var url = document.getElementById('stream-url').value.trim();
  var mode = document.getElementById('stream-mode').value;
  var countEl = document.getElementById('stream-count'); var count = countEl ? parseInt(countEl.value) : 10;
  
  if (!url) { toast('Yay\u0131n linki gerekli!', false); return; }
  
  // Extract channel/video info
  var channelId = '';
  if (platform === 'youtube') {
    var match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/live\/([^?]+)/);
    if (match) channelId = match[1];
    else channelId = url;
  } else {
    channelId = url.replace(/https?:\/\/(www\.)?kick\.com\/?/i, '').replace(/\//g, '');
  }
  
  if (!channelId) { toast('Ge\u00e7erli bir link gir!', false); return; }
  
  // Prepare questions based on mode — ALL modes use A/B/C/D options
  var questions = [];
  if (mode === 'QUOTE') {
    var withRep = chars.filter(function(c) { return c.a && c.rep && c.rep.trim(); });
    if (withRep.length < 4) { toast('En az 4 replikli karakter gerekli!', false); return; }
    questions = shuf(withRep).slice(0, count).map(function(c) {
      var others = shuf(chars.filter(function(x){ return x.a && x.rep && x.rep.trim() && !(x.n === c.n && x.s === c.s); })).slice(0, 3);
      var opts = shuf([c].concat(others));
      var ci = opts.findIndex(function(x){ return x.n === c.n && x.s === c.s; });
      var letter = String.fromCharCode(65 + ci);
      return { type: 'QUOTE', display: c.rep, options: opts.map(function(x){ return x.n + ' ' + x.s; }), optionChars: opts, correctIndex: ci, answer: letter.toLowerCase(), answerDisplay: letter + ') ' + c.n + ' ' + c.s, character: c };
    });
  } else if (mode === 'FACE') {
    var active = chars.filter(function(c) { return c.a && c.img && (c.img.startsWith('/images/')||c.img.startsWith('data:image')); });
    if (active.length < 4) { toast('En az 4 aktif karakter gerekli!', false); return; }
    questions = shuf(active).slice(0, count).map(function(c) {
      var others = shuf(chars.filter(function(x){ return x.a && x.img && (x.img.startsWith('/images/')||x.img.startsWith('data:image')) && !(x.n === c.n && x.s === c.s); })).slice(0, 3);
      var opts = shuf([c].concat(others));
      var ci = opts.findIndex(function(x){ return x.n === c.n && x.s === c.s; });
      var letter = String.fromCharCode(65 + ci);
      return { type: 'FACE', display: c, options: opts.map(function(x){ return x.n + ' ' + x.s; }), optionChars: opts, correctIndex: ci, answer: letter.toLowerCase(), answerDisplay: letter + ') ' + c.n + ' ' + c.s, character: c };
    });
  } else if (mode === 'MEMORY') {
    if (memQs.length < 4) { toast('En az 4 soru gerekli!', false); return; }
    questions = shuf([].concat(memQs)).slice(0, count).map(function(q) {
      var correctLetter = String.fromCharCode(65 + q.ci);
      return { type: 'MEMORY', display: q.q, options: q.o, correctIndex: q.ci, answer: correctLetter.toLowerCase(), answerDisplay: correctLetter + ') ' + q.o[q.ci] };
    });
  }
  
  if (mode === 'CDIE' || mode === 'CTEAM' || mode === 'CFATE' || mode === 'DUEL') {
    var countVal = (mode !== 'DUEL' && document.getElementById('stream-count')) ? document.getElementById('stream-count').value : '';
    var duelTitle = '';
    var pool = [];
    if (mode === 'DUEL') {
      // Read düello title and selected characters
      duelTitle = (document.getElementById('duel-title').value || '').trim();
      if (!duelTitle) { toast('Düello başlığı gerekli!', false); return; }
      var duelPlayMode = document.getElementById('duel-play-mode').value;
      var selected = [];
      document.querySelectorAll('.duel-char-cb:checked').forEach(function(cb) {
        var idx = parseInt(cb.value);
        var activeChars = chars.filter(function(c){ return c.a; });
        if (activeChars[idx]) selected.push(activeChars[idx]);
      });
      if (selected.length < 4) { toast('En az 4 karakter seçmelisin!', false); return; }
      if (selected.length % 2 !== 0) { selected = selected.slice(0, selected.length - 1); }
      pool = shuf(selected);
      
      // Solo mode — no chat needed
      if (duelPlayMode === 'solo') {
        streamState = { platform:'solo', channelId:'', mode:'DUEL', active:true, pool:pool, alive:[].concat(pool), eliminated:[], currentPair:null, votes:{}, voters:{}, voteTimer:null, phase:'READY', chatMessages:[], duelTitle:duelTitle, duelRound:1, duelSolo:true };
        if(window._pushUrl) window._pushUrl('streamer-live'); showPauseButton();
        nextDuelRound();
        return;
      }
      
      // Chat mode — require platform/URL
      var platformEl = document.getElementById('stream-platform');
      var urlEl = document.getElementById('stream-url');
      if (!platformEl || !urlEl || !urlEl.value.trim()) { toast('Chat modu için yayın linki gerekli!', false); return; }
      platform = platformEl.value;
      url = urlEl.value.trim();
      // Re-extract channelId for DUEL chat mode
      if (platform === 'youtube') {
        var match2 = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/) || url.match(/live\/([^?]+)/);
        channelId = match2 ? match2[1] : url;
      } else {
        channelId = url.replace(/https?:\/\/(www\.)?kick\.com\/?/i, '').replace(/\//g, '');
      }
      if (!channelId) { toast('Geçerli bir link gir!', false); return; }
    } else if (mode === 'CFATE') {
      var opposite = countVal === 'M' ? 'F' : 'M';
      pool = shuf(chars.filter(function(c){return c.a && c.g === opposite})).slice(0,8);
    } else {
      pool = shuf(chars.filter(function(c){return c.a})).slice(0, parseInt(countVal));
    }
    streamState = { platform:platform, channelId:channelId, mode:mode, active:true, pool:pool, alive:[].concat(pool), eliminated:[], team:[], currentPair:null, currentChar:null, votes:{}, voters:{}, voteTimer:null, phase:'READY', chatMessages:[], duelTitle:duelTitle, duelRound:1, fates:[{id:'f1',name:'\u00d6ld\u00fcr',emoji:'\ud83d\udd2a',color:'#ff544d',chars:[]},{id:'f2',name:'Evlen',emoji:'\ud83d\udc8d',color:'#3cddc7',chars:[]},{id:'f3',name:'\u0130hanet Et',emoji:'\ud83d\udc94',color:'#ff6b6b',chars:[]},{id:'f4',name:'Fl\u00f6rt Et',emoji:'\ud83d\ude18',color:'#ffa07a',chars:[]},{id:'f5',name:'Ghostla',emoji:'\ud83d\udc7b',color:'#888',chars:[]},{id:'f6',name:'\u00d6p',emoji:'\ud83d\udc8b',color:'#e91e90',chars:[]},{id:'f7',name:'Tokat At',emoji:'\ud83e\udd4a',color:'#ff4444',chars:[]},{id:'f8',name:'Ka\u00e7',emoji:'\ud83c\udfc3',color:'#4ecdc4',chars:[]}],passFate:{id:'f9',name:'Pas',emoji:'\u23ed\ufe0f',color:'#666',chars:[],maxUses:3,used:0},usedFates:[] };
    if (platform === 'youtube') {
      var initRes = await apiPost('/stream/youtube-init', { videoId: channelId });
      if (initRes.error) { toast('YouTube ba\u011flant\u0131 hatas\u0131: ' + initRes.error, false); return; }
      streamState.liveChatId = initRes.liveChatId;
      startChatPolling();
    } else { startKickChat(channelId); }
    if(window._pushUrl) window._pushUrl('streamer-live'); showPauseButton();
    if (mode==='DUEL') nextDuelRound();
    else if (mode==='CDIE') nextCDieRound();
    else if (mode==='CTEAM') nextCTeamRound();
    else nextCFateRound();
    return;
  }

  if (mode === 'STORY') {
    // Story mode - different flow
    streamState = { platform: platform, channelId: channelId, mode: 'STORY', active: true };
    if (platform === 'youtube') {
      var initRes = await apiPost('/stream/youtube-init', { videoId: channelId });
      if (initRes.error) { toast('YouTube ba\u011flant\u0131 hatas\u0131: ' + initRes.error, false); return; }
      streamState.liveChatId = initRes.liveChatId;
      startChatPolling();
    } else {
      startKickChat(channelId);
    }
    if(window._pushUrl) window._pushUrl('streamer-live'); showPauseButton();
    startStoryMode(platform, channelId);
    return;
  }
  if (questions.length === 0) { toast('Yeterli soru yok!', false); return; }
  
  streamState = {
    platform: platform,
    channelId: channelId,
    mode: mode,
    questions: questions,
    current: 0,
    scores: {},
    chatMessages: [],
    roundWinner: null,
    active: true,
    startedAt: Date.now(),
    roundAnswers: {},   // anti-spam: user -> their first answer this round
    userCooldowns: {}   // anti-spam: user -> last message timestamp
  };
  
  // Connect to chat
  if (platform === 'youtube') {
    var initRes = await apiPost('/stream/youtube-init', { videoId: channelId });
    if (initRes.error) { toast('YouTube ba\u011flant\u0131 hatas\u0131: ' + initRes.error, false); return; }
    streamState.liveChatId = initRes.liveChatId;
    startChatPolling();
  } else {
    startKickChat(channelId);
  }
  if(window._pushUrl) window._pushUrl('streamer-live'); showPauseButton();
  
  renderStreamRound();
  startQuestionTimeout();
}

function startChatPolling() {
  if (chatPollTimer) { clearTimeout(chatPollTimer); chatPollTimer = null; }
  _processedMsgs = new Set();
  _chatPollErrors = 0;
  lastChatTs = '';
  streamState._pollInterval = 2000;
  streamState._chatReady = false; // First poll = warmup, skip old messages
  
  // Initial warmup poll — gets pageToken baseline without processing old messages
  gameTimers.push(setTimeout(function() {
    pollChatOnce().then(function() {
      if (streamState) {
        streamState._chatReady = true;
        toast('✅ Chat bağlandı!');
      }
      scheduleNextPoll();
    });
  }, 800));
  
  function scheduleNextPoll() {
    if (!streamState || !streamState.active) return;
    var interval = Math.max(streamState._pollInterval || 2000, 1500);
    interval = Math.min(interval, 5000);
    chatPollTimer = setTimeout(function() {
      pollChatOnce().then(function() { scheduleNextPoll(); });
    }, interval);
  }
}

async function pollChatOnce() {
  if (!streamState || !streamState.active) return;
  if (streamState.platform !== 'youtube' || !streamState.liveChatId) return;
  
  try {
    var res = await apiGet('/stream/youtube-chat?chatId=' + streamState.liveChatId + '&after=' + encodeURIComponent(lastChatTs || ''));
    if (res.error) {
      _chatPollErrors++;
      if (_chatPollErrors >= 5) {
        console.warn('Chat poll errors:', _chatPollErrors, '- attempting reconnect');
        try {
          var reInit = await apiPost('/stream/youtube-init', { videoId: streamState.channelId });
          if (reInit.liveChatId) {
            streamState.liveChatId = reInit.liveChatId;
            lastChatTs = '';
            _processedMsgs = new Set();
            _chatPollErrors = 0;
            streamState._chatReady = false; // re-warmup after reconnect
          }
        } catch(e) {}
      }
      return;
    }
    _chatPollErrors = 0;
    
    if (res.pollingMs) {
      streamState._pollInterval = res.pollingMs;
    }
    
    // WARMUP: First poll after connecting — skip all existing messages, only save the pageToken
    // This prevents old messages from previous games from being processed
    if (!streamState._chatReady) {
      if (res.nextPageToken) lastChatTs = res.nextPageToken;
      streamState._chatReady = true; // Warmup done — next poll will process messages normally
      return;
    }
    
    if (res.messages && res.messages.length > 0) {
      res.messages.forEach(function(m) {
        var msgKey = m.id || ((m.author || '') + '::' + (m.text || '').trim() + '::' + Date.now());
        
        if (_processedMsgs.has(msgKey)) return;
        _processedMsgs.add(msgKey);
        
        if (_processedMsgs.size > 1000) {
          var arr = Array.from(_processedMsgs);
          _processedMsgs = new Set(arr.slice(arr.length - 500));
        }
        
        var cleanText = (m.text || '').trim();
        if (!cleanText || !m.author) return;
        
        processStreamMessage(m.author, cleanText);
      });
    }
    if (res.nextPageToken) lastChatTs = res.nextPageToken;
  } catch(e) {
    _chatPollErrors++;
    console.error('Chat poll error:', e);
  }
}

function startKickChat(channelName) {
  // Kick uses Pusher WebSocket
  var ws = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.6.0&flash=false');
  streamState.kickWs = ws;
  
  ws.onopen = function() {
    // First get chatroom ID
    fetch('https://kick.com/api/v2/channels/' + channelName)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.chatroom && data.chatroom.id) {
          var subMsg = JSON.stringify({ event: 'pusher:subscribe', data: { channel: 'chatrooms.' + data.chatroom.id + '.v2' } });
          ws.send(subMsg);
          streamState.kickChatroomId = data.chatroom.id;
          toast('\u2705 Kick chat ba\u011fland\u0131!');
        }
      }).catch(function() { toast('Kick kanal bulunamad\u0131', false); });
  };
  
  ws.onmessage = function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.event === 'App\\Events\\ChatMessageEvent') {
        var msgData = JSON.parse(data.data);
        var author = msgData.sender.username;
        var content = (msgData.content || '').trim();
        if (!content || !author) return;
        
        // Dedup using Kick message id
        var msgKey = msgData.id || (author + '::' + content + '::' + Date.now());
        if (_processedMsgs.has(msgKey)) return;
        _processedMsgs.add(msgKey);
        if (_processedMsgs.size > 1000) {
          var arr = Array.from(_processedMsgs);
          _processedMsgs = new Set(arr.slice(arr.length - 500));
        }
        
        processStreamMessage(author, content);
      }
    } catch (e) {}
  };
  
  ws.onerror = function() { toast('Kick WebSocket hatas\u0131', false); };
}

function processStreamMessage(author, text) {
  if (!streamState || !streamState.active) return;
  if (streamState.paused) return; // ⏸️ Skip when paused
  if (streamState.mode === 'STORY') { processStoryChatMessage(author, text); return; }
  if (streamState.mode === 'CDIE' || streamState.mode === 'CTEAM' || streamState.mode === 'CFATE' || streamState.mode === 'DUEL') { processChatVote(author, text); return; }
  if (streamState.roundWinner) return;
  
  var q = streamState.questions[streamState.current];
  if (!q) return;
  
  var normalizedText = text.trim().toLowerCase();
  author = author.trim();
  var now = Date.now();
  
  // ── Only process valid answer letters (A/B/C/D) — ignore everything else ──
  var validLetters = ['a','b','c','d'];
  if (validLetters.indexOf(normalizedText) < 0) return; // not an answer, ignore completely
  
  // ── Anti-Spam: One answer per user per round ──
  if (streamState.roundAnswers[author]) {
    // Already answered — show as locked in chat
    streamState.chatMessages.push({ author: author, text: normalizedText.toUpperCase(), time: now, status: 'duplicate' });
    if (streamState.chatMessages.length > 100) streamState.chatMessages.shift();
    updateStreamChat();
    return;
  }
  
  // ── Anti-Spam: Per-user cooldown (1.5s) ──
  if (streamState.userCooldowns[author] && now - streamState.userCooldowns[author] < 1500) {
    return; // cooldown — silently ignore
  }
  
  // ── Lock answer and process ──
  streamState.userCooldowns[author] = now;
  streamState.roundAnswers[author] = normalizedText;
  
  var answerLower = q.answer.toLowerCase();
  var isCorrect = normalizedText === answerLower;
  
  streamState.chatMessages.push({ author: author, text: normalizedText.toUpperCase(), time: now, status: isCorrect ? 'correct' : 'wrong' });
  if (streamState.chatMessages.length > 100) streamState.chatMessages.shift();
  
  updateAnswerCounter();
  updateStreamChat();
  
  if (isCorrect) {
    streamState.roundWinner = author;
    if (!streamState.scores[author]) streamState.scores[author] = 0;
    streamState.scores[author]++;
    
    if (streamState._questionTimeout) { clearTimeout(streamState._questionTimeout); streamState._questionTimeout = null; }
    
    renderStreamRound();
    
    roundTimer = setTimeout(function() {
      showStreamTransition(function() {
        streamState.current++;
        streamState.roundWinner = null;
        streamState.roundAnswers = {};
        streamState.chatMessages = [];
        if (streamState.current >= streamState.questions.length) {
          renderStreamFinal();
        } else {
          renderStreamRound();
          startQuestionTimeout();
        }
      });
    }, 2000);
  }
}

function updateAnswerCounter() {
  var el = document.getElementById('answer-counter');
  if (!el || !streamState) return;
  var q = streamState.questions[streamState.current];
  if (!q) return;
  var total = Object.keys(streamState.roundAnswers).length;
  var correct = 0;
  var wrong = 0;
  var ansLower = q.answer.toLowerCase();
  for (var u in streamState.roundAnswers) {
    if (streamState.roundAnswers[u] === ansLower) correct++;
    else wrong++;
  }
  el.innerHTML = '<span style="color:var(--t2)">\ud83d\udc65 ' + total + ' ki\u015fi cevaplad\u0131</span>' +
    (streamState.roundWinner ? '' : ' <span style="color:var(--t3);font-size:12px">\u00b7 \u2705 ' + correct + ' do\u011fru \u00b7 \u274c ' + wrong + ' yanl\u0131\u015f</span>');
}

// ═══ YAYINCI MANUAL SKIP ═══

// Quiz games: Yayıncı şıkka tıklayarak soruyu geçer
function streamerSkipQuiz() {
  if (!streamState || !streamState.active || streamState.roundWinner) return;
  var q = streamState.questions[streamState.current];
  if (!q) return;
  
  // Clear timeout
  if (streamState._questionTimeout) { clearTimeout(streamState._questionTimeout); streamState._questionTimeout = null; }
  
  // Show correct answer, mark as streamer skip
  streamState.roundWinner = '\ud83c\udfa5 Yay\u0131nc\u0131 Ge\u00e7ti';
  renderStreamRound();
  
  roundTimer = setTimeout(function() {
    showStreamTransition(function() {
      streamState.current++;
      streamState.roundWinner = null;
      streamState.roundAnswers = {};
      streamState.chatMessages = [];
      if (streamState.current >= streamState.questions.length) {
        renderStreamFinal();
      } else {
        renderStreamRound();
        startQuestionTimeout();
      }
    });
  }, 2000);
}

// Vote games (CDIE/CTEAM): Yayıncı A veya B'ye tıklayarak oylamayı bitirir
function streamerForceVote(choice) {
  if (!streamState || !streamState.active || streamState.phase !== 'VOTING') return;
  
  // Stop the vote timer
  if (streamState.voteTimer) { clearInterval(streamState.voteTimer); streamState.voteTimer = null; }
  streamState.phase = 'RESULT';
  
  // Force the chosen side to win
  streamState.votes[choice] = (streamState.votes[choice] || 0) + 99999;
  
  if (streamState.mode === 'CDIE') resolveCDieVote();
  else if (streamState.mode === 'CTEAM') resolveCTeamVote();
  else if (streamState.mode === 'DUEL') resolveDuelVote();
}

// CFATE: Yayıncı bir kadere tıklayarak oylamayı bitirir
function streamerForceFate(fateId) {
  if (!streamState || !streamState.active || streamState.phase !== 'VOTING') return;
  
  if (streamState.voteTimer) { clearInterval(streamState.voteTimer); streamState.voteTimer = null; }
  streamState.phase = 'RESULT';
  
  streamState.votes[fateId] = (streamState.votes[fateId] || 0) + 99999;
  resolveCFateVote();
}

// 60-second question timeout — if nobody answers, skip to next
function startQuestionTimeout() {
  if (streamState._questionTimeout) clearInterval(streamState._questionTimeout);
  var remaining = 60;
  streamState._questionTimeout = setInterval(function() {
    if (!streamState || !streamState.active || streamState.roundWinner) { clearInterval(streamState._questionTimeout); return; }
    if (streamState.paused) return; // ⏸️ Skip tick when paused
    remaining--;
    if (remaining <= 0) {
      clearInterval(streamState._questionTimeout);
      streamState.roundWinner = '—';
      renderStreamRound();
      roundTimer = setTimeout(function() {
        showStreamTransition(function() {
          streamState.current++;
          streamState.roundWinner = null;
          streamState.roundAnswers = {};
          streamState.chatMessages = [];
          if (streamState.current >= streamState.questions.length) {
            renderStreamFinal();
          } else {
            renderStreamRound();
            startQuestionTimeout();
          }
        });
      }, 2000);
    }
  }, 1000);
}

// 5-second transition screen between questions
function showStreamTransition(callback) {
  var ag = document.getElementById('ag');
  var countdown = 5;
  var transDiv = document.createElement('div');
  transDiv.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(19,19,27,0.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center';
  transDiv.innerHTML = '<div style="text-align:center"><div style="font-size:64px;margin-bottom:16px">⏳</div><h2 class="fd" style="font-size:44px;color:#e4e1ee;margin-bottom:8px">Yeni Soru Geliyor!</h2><p style="font-size:28px;color:var(--m);font-weight:700" id="trans-count">' + countdown + '</p></div>';
  document.body.appendChild(transDiv);
  
  var transTimer = setInterval(function() {
    countdown--;
    var el = document.getElementById('trans-count');
    if (el) el.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(transTimer);
      if (transDiv.parentNode) transDiv.remove();
      callback();
    }
  }, 1000);
  gameTimers.push(transTimer);
}

function updateStreamChat() {
  var chatEl = document.getElementById('stream-chat');
  if (!chatEl) return;
  var h = '';
  var msgs = streamState.chatMessages.slice(-30); // show more since only answers now
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var statusIcon = '';
    var msgStyle = 'padding:5px 10px;font-size:13px;margin-bottom:2px;border-radius:6px;';
    var letterColors = {A:'#60a5fa',B:'#ffb95f',C:'#3cddc7',D:'#c084fc'};
    var letterColor = letterColors[m.text] || 'var(--t1)';
    
    if (m.status === 'correct') {
      statusIcon = ' \u2705';
      msgStyle += 'background:rgba(60,221,199,0.1);border:1px solid rgba(60,221,199,0.15);';
    } else if (m.status === 'wrong') {
      statusIcon = ' \u274c';
      msgStyle += 'background:rgba(255,84,77,0.05);';
    } else if (m.status === 'duplicate') {
      statusIcon = ' \ud83d\udd12';
      msgStyle += 'opacity:0.35;';
    }
    
    h += '<div style="' + msgStyle + '"><b style="color:' + letterColor + '">' + esc(m.text) + '</b> <span style="color:var(--t2)">' + esc(m.author) + '</span>' + statusIcon + '</div>';
  }
  chatEl.innerHTML = h;
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderStreamRound() {
  var s = streamState;
  var q = s.questions[s.current];
  var ag = document.getElementById('ag');
  
  var questionHtml = '';
  var letters = ['A','B','C','D'];
  var letterColors = ['#60a5fa','#ffb95f','#3cddc7','#c084fc'];
  
  if (q.type === 'QUOTE') {
    var clickable = !s.roundWinner;
    questionHtml = '<div style="font-size:64px;margin-bottom:24px">\ud83d\udcac</div>' +
      '<p style="font-size:28px;font-weight:500;font-style:italic;color:var(--t1);line-height:1.5">\u201c' + esc(q.display) + '\u201d</p>' +
      '<p style="font-size:18px;color:var(--t3);margin-top:16px;margin-bottom:16px">Bu replik kime ait? Do\u011fru \u015f\u0131kk\u0131 chat\u2019e yaz\u0131n! <b style="color:var(--v)">(A, B, C veya D)</b></p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:800px;margin:0 auto">' +
      q.options.map(function(name, i) {
        var ch = q.optionChars[i];
        var isCorrectOpt = i === q.correctIndex && s.roundWinner;
        var borderCol = isCorrectOpt ? '#3cddc7' : 'var(--b1)';
        var bgCol = isCorrectOpt ? 'rgba(60,221,199,0.08)' : 'var(--bg3)';
        return '<div style="padding:14px;border-radius:12px;background:'+bgCol+';border:2px solid '+borderCol+';font-size:16px;display:flex;align-items:center;gap:10px;transition:all .3s;'+(clickable?'cursor:pointer':'')+ '" '+(clickable?'onclick="streamerSkipQuiz()" onmouseover="this.style.borderColor=\'#ff544d\'" onmouseout="this.style.borderColor=\'var(--b1)\'"':'')+'>'+
          '<div style="width:40px;height:40px;border-radius:10px;background:'+letterColors[i]+'20;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:'+letterColors[i]+';flex-shrink:0">' + letters[i] + '</div>' +
          '<div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0">' + cp(ch, 36) + '</div>' +
          '<span style="font-weight:600">' + esc(name) + '</span>' +
          (isCorrectOpt ? ' <span style="color:var(--m);font-size:14px;margin-left:auto">\u2705</span>' : '') +
          '</div>';
      }).join('') +
      '</div>';
  } else if (q.type === 'FACE') {
    var c = q.display;
    var clickable = !s.roundWinner;
    questionHtml = '<div style="width:500px;height:500px;border-radius:24px;overflow:hidden;margin:0 auto 20px;border:3px solid var(--b1);filter:blur(12px)">' + cp(c, 500) + '</div>' +
      '<p style="font-size:18px;color:var(--t3);margin-bottom:16px">Bu karakter kim? Do\u011fru \u015f\u0131kk\u0131 chat\u2019e yaz\u0131n! <b style="color:var(--v)">(A, B, C veya D)</b></p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:800px;margin:0 auto">' +
      q.options.map(function(name, i) {
        var ch = q.optionChars[i];
        var isCorrectOpt = i === q.correctIndex && s.roundWinner;
        var borderCol = isCorrectOpt ? '#3cddc7' : 'var(--b1)';
        var bgCol = isCorrectOpt ? 'rgba(60,221,199,0.08)' : 'var(--bg3)';
        return '<div style="padding:14px;border-radius:12px;background:'+bgCol+';border:2px solid '+borderCol+';font-size:16px;display:flex;align-items:center;gap:10px;transition:all .3s;'+(clickable?'cursor:pointer':'')+ '" '+(clickable?'onclick="streamerSkipQuiz()" onmouseover="this.style.borderColor=\'#ff544d\'" onmouseout="this.style.borderColor=\'var(--b1)\'"':'')+'>'+
          '<div style="width:40px;height:40px;border-radius:10px;background:'+letterColors[i]+'20;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:'+letterColors[i]+';flex-shrink:0">' + letters[i] + '</div>' +
          '<div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0">' + cp(ch, 36) + '</div>' +
          '<span style="font-weight:600">' + esc(name) + '</span>' +
          (isCorrectOpt ? ' <span style="color:var(--m);font-size:14px;margin-left:auto">\u2705</span>' : '') +
          '</div>';
      }).join('') +
      '</div>';
  } else if (q.type === 'MEMORY') {
    var clickable = !s.roundWinner;
    questionHtml = '<div style="font-size:64px;margin-bottom:24px">\ud83e\udde0</div>' +
      '<p style="font-size:24px;font-weight:600;color:var(--t1);margin-bottom:20px">' + esc(q.display) + '</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:800px;margin:0 auto">' +
      q.options.map(function(o, i) {
        var isCorrectOpt = i === q.correctIndex && s.roundWinner;
        var borderCol = isCorrectOpt ? '#3cddc7' : 'var(--b1)';
        var bgCol = isCorrectOpt ? 'rgba(60,221,199,0.08)' : 'var(--bg3)';
        return '<div style="padding:14px;border-radius:12px;background:'+bgCol+';border:2px solid '+borderCol+';font-size:16px;display:flex;align-items:center;gap:10px;transition:all .3s;'+(clickable?'cursor:pointer':'')+ '" '+(clickable?'onclick="streamerSkipQuiz()" onmouseover="this.style.borderColor=\'#ff544d\'" onmouseout="this.style.borderColor=\'var(--b1)\'"':'')+'>'+
          '<div style="width:40px;height:40px;border-radius:10px;background:'+letterColors[i]+'20;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:'+letterColors[i]+';flex-shrink:0">' + letters[i] + '</div>' +
          '<span style="font-weight:600">' + esc(o) + '</span>' +
          (isCorrectOpt ? ' <span style="color:var(--m);font-size:14px;margin-left:auto">\u2705</span>' : '') +
          '</div>';
      }).join('') +
      '</div><p style="font-size:18px;color:var(--t3);margin-top:16px">Do\u011fru \u015f\u0131kk\u0131n harfini chat\u2019e yaz\u0131n! <b style="color:var(--v)">(A, B, C veya D)</b></p>';
  }
  
  var winnerHtml = '';
  if (s.roundWinner) {
    var isTimeout = s.roundWinner === '—';
    winnerHtml = '<div style="margin-top:20px;padding:16px;border-radius:14px;background:' + (isTimeout ? '#ff544d15' : '#3cddc715') + ';border:1px solid ' + (isTimeout ? '#ff544d30' : '#3cddc730') + '">' +
      '<div style="font-size:32px;margin-bottom:8px">' + (isTimeout ? '⏰' : '\ud83c\udfc6') + '</div>' +
      '<p style="font-size:20px;font-weight:700;color:' + (isTimeout ? 'var(--pk)' : 'var(--m)') + '">' + (isTimeout ? 'Süre doldu! Kimse bilemedi.' : esc(s.roundWinner) + ' kazand\u0131!') + '</p>' +
      '<p style="font-size:16px;color:var(--t2)">Do\u011fru cevap: ' + esc(q.answerDisplay) + '</p>' +
      '<p style="font-size:14px;color:var(--t3);margin-top:8px">Yeni soru 5 saniye sonra...</p></div>';
  }
  
  // Build scoreboard
  var sorted = Object.keys(s.scores).sort(function(a, b) { return s.scores[b] - s.scores[a]; });
  var scoreHtml = '<div style="font-size:14px;font-weight:700;color:var(--t2);margin-bottom:8px">\ud83c\udfc6 Skor Tablosu</div>';
  if (sorted.length === 0) {
    scoreHtml += '<p style="font-size:14px;color:#9a969e">Hen\u00fcz kimse puan almad\u0131</p>';
  } else {
    for (var i = 0; i < Math.min(sorted.length, 10); i++) {
      var medal = i < 3 ? ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'][i] : (i + 1) + '.';
      scoreHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>' + medal + ' ' + esc(sorted[i]) + '</span><span style="color:var(--m);font-weight:700">' + s.scores[sorted[i]] + '</span></div>';
    }
  }
  
  // Answer counter for current round
  var ansCount = Object.keys(s.roundAnswers || {}).length;
  var counterHtml = '<div id="answer-counter" style="text-align:center;margin-top:12px;font-size:14px;font-weight:600">' +
    (ansCount > 0 ? '<span style="color:var(--t2)">\ud83d\udc65 ' + ansCount + ' ki\u015fi cevaplad\u0131</span>' : '<span style="color:var(--t3)">\ud83d\udc65 Hen\u00fcz kimse cevaplamad\u0131</span>') +
    '</div>';

  ag.innerHTML = 
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px">' +
    '<div style="display:flex;align-items:center;gap:12px"><button class="btn bg bsm" onclick="streamStop()">\u2190 Bitir</button>' +
    '<div class="gi" style="background:linear-gradient(135deg,#ff0000,#cc0000);width:44px;height:44px;font-size:20px">\ud83c\udfa5</div>' +
    '<span class="fd" style="font-weight:700;font-size:20px">Streamer Game</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px;color:var(--t3)">Soru</span><span class="badge bv" style="font-size:16px">' + (s.current + 1) + '/' + s.questions.length + '</span>' +
    '<span class="badge" style="background:#ff000020;color:#ff4444;font-size:12px">\ud83d\udd34 CANLI</span></div></div>' +
    
    '<div style="display:flex;gap:16px;padding:0 20px;flex:1;min-height:0">' +
    
    // Left: Question area
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div class="cg" style="text-align:center;padding:40px;width:100%">' +
    questionHtml + winnerHtml + counterHtml +
    '</div></div>' +
    
    // Right: Chat + Scoreboard side by side
    '<div style="width:580px;display:flex;gap:12px;flex-shrink:0">' +
    '<div style="flex:1;background:var(--bg2);border-radius:14px;border:1px solid var(--b1);display:flex;flex-direction:column;overflow:hidden">' +
    '<div style="padding:10px 14px;border-bottom:1px solid var(--b1);display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600;color:var(--t2)">\ud83d\udcdd Cevaplar</span><span style="font-size:10px;color:var(--t3);background:var(--bg3);padding:3px 8px;border-radius:6px">\ud83d\udd12 Ki\u015fi ba\u015f\u0131 1 hak</span></div>' +
    '<div id="stream-chat" style="flex:1;overflow-y:auto;padding:8px;max-height:400px"></div></div>' +
    '<div style="width:210px;background:var(--bg2);border-radius:14px;border:1px solid var(--b1);padding:14px;flex-shrink:0">' +
    scoreHtml + '</div></div>' +
    
    '</div>';
  
  updateStreamChat();
}

function renderStreamFinal() {
  var s = streamState;
  var ag = document.getElementById('ag');
  
  var sorted = Object.keys(s.scores).sort(function(a, b) { return s.scores[b] - s.scores[a]; });
  
  var podium = '';
  for (var i = 0; i < Math.min(sorted.length, 10); i++) {
    var medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    var colors = ['var(--g)', '#d1d5db', '#b45309'];
    podium += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-radius:12px;margin-bottom:8px;background:' + (i < 3 ? 'var(--bg3)' : 'transparent') + ';border:1px solid var(--b1)">' +
      '<div style="display:flex;align-items:center;gap:12px"><span style="font-size:' + (i < 3 ? '28px' : '18px') + '">' + (i < 3 ? medals[i] : (i + 1) + '.') + '</span><span style="font-size:' + (i < 3 ? '20px' : '16px') + ';font-weight:' + (i < 3 ? '700' : '500') + '">' + esc(sorted[i]) + '</span></div>' +
      '<span style="font-size:' + (i < 3 ? '24px' : '18px') + ';font-weight:700;color:var(--m)">' + s.scores[sorted[i]] + ' puan</span></div>';
  }
  
  ag.innerHTML = 
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div class="cg" style="text-align:center;padding:40px;max-width:700px;width:100%">' +
    '<div style="font-size:80px;margin-bottom:16px">\ud83c\udfc6</div>' +
    '<h2 class="fd" style="font-size:64px;font-weight:700;margin-bottom:8px">Oyun Bitti!</h2>' +
    '<p style="font-size:18px;color:var(--t2);margin-bottom:24px">' + s.questions.length + ' soru tamamland\u0131</p>' +
    (sorted.length > 0 ? '<div style="text-align:left;max-width:800px;margin:0 auto">' + podium + '</div>' : '<p style="font-size:16px;color:var(--t3)">Kimse puan alamad\u0131</p>') +
    '<button class="btn bp" style="margin-top:24px;font-size:16px;padding:12px 28px" onclick="streamStop()">Ana Sayfaya D\u00f6n</button>' +
    '</div></div>';
  
  streamCleanup();
}

function streamStop() {
  streamCleanup();
  bk();
}

function streamCleanup() {
  gameTimers.forEach(function(t){clearTimeout(t);clearInterval(t);}); gameTimers=[];
  hidePauseButton();
  if (chatPollTimer) { clearTimeout(chatPollTimer); clearInterval(chatPollTimer); chatPollTimer = null; }
  if (typeof storyTimer!=='undefined'&&storyTimer) { clearInterval(storyTimer); storyTimer=null; }
  if (typeof storyVoteTimer!=='undefined'&&storyVoteTimer) { clearInterval(storyVoteTimer); storyVoteTimer=null; }
  if (typeof roundTimer!=='undefined'&&roundTimer) { clearTimeout(roundTimer); roundTimer=null; }
  if (roundTimer) { clearTimeout(roundTimer); roundTimer = null; }
  if (streamState && streamState._questionTimeout) { clearTimeout(streamState._questionTimeout); }
  if (streamState && streamState.kickWs) { try { streamState.kickWs.close(); } catch(e){} }
  if (streamState && streamState.voteTimer) { clearInterval(streamState.voteTimer); }
  if (streamState) streamState.active = false;
  streamState = null;
  lastChatTs = '';
  _processedMsgs = new Set();
  _chatPollErrors = 0;
  document.querySelectorAll('[style*="z-index:9998"]').forEach(function(el){ el.remove(); });
}


function streamerApply() {
  apiRequestStreamer().then(function(r) {
    if (r.error) { toast(r.error, false); return; }
    toast('Ba\u015fvurun g\u00f6nderildi! Admin onay\u0131 bekleniyor.');
    var ag = document.getElementById('ag');
    ag.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="cg" style="text-align:center;padding:60px 40px;max-width:800px"><div style="font-size:80px;margin-bottom:16px">\u2705</div><h3 class="fd" style="font-size:28px;font-weight:700;margin-bottom:12px">Ba\u015fvuru G\u00f6nderildi</h3><p style="font-size:16px;color:var(--t2)">Admin onaylad\u0131\u011f\u0131nda Streamer Game\u2019i a\u00e7abileceksin.</p></div></div>';
  });
}

// ═══ CHAT VOTE PROCESSING ═══
function processChatVote(author, text) {
  var s = streamState;
  if (!s || !s.active || s.phase !== 'VOTING') return;
  if (s.paused) return; // ⏸️ Skip when paused
  var rawText = text.trim();
  var upperText = rawText.toUpperCase();
  var lowerText = rawText.toLowerCase();
  
  // Already voted — ignore silently
  if (s.voters[author]) return;

  var isValidVote = false;
  var voteDisplay = '';

  if (s.mode === 'CDIE' || s.mode === 'CTEAM' || s.mode === 'DUEL') {
    if (upperText === 'A' || upperText === 'B') {
      s.voters[author] = upperText;
      s.votes[upperText] = (s.votes[upperText]||0)+1;
      isValidVote = true;
      voteDisplay = upperText;
      updateCVoteBar();
    }
  } else if (s.mode === 'CFATE') {
    var fateMap = {};
    s.fates.forEach(function(f,i){ fateMap[String(i+1)] = f.id; });
    var nameMap = {
      'oldur':'Öldür','öldür':'Öldür','evlen':'Evlen','ihanet':'İhanet Et',
      'flort':'Flört Et','flört':'Flört Et','ghost':'Ghostla','ghostla':'Ghostla',
      'op':'Öp','öp':'Öp','tokat':'Tokat At','kac':'Kaç','kaç':'Kaç','pas':'Pas'
    };
    var pasAvail = s.passFate && s.passFate.used < s.passFate.maxUses;
    if (pasAvail) fateMap[String(s.fates.length+1)] = 'f9';
    
    var key = fateMap[rawText];
    if (!key) {
      var fName = nameMap[lowerText];
      if (fName === 'Pas' && pasAvail) { key = 'f9'; }
      else if (fName) { var mf = s.fates.find(function(f){return f.name === fName}); if(mf) key = mf.id; }
    }
    
    var validKeys = s.fates.map(function(f){return f.id});
    if (pasAvail) validKeys.push('f9');
    if (key && validKeys.indexOf(key) >= 0) {
      s.voters[author] = key;
      s.votes[key] = (s.votes[key]||0)+1;
      isValidVote = true;
      // Find display name for the vote
      var votedFate = s.fates.find(function(f){return f.id === key}) || s.passFate;
      voteDisplay = votedFate ? votedFate.emoji + ' ' + votedFate.name : rawText;
      updateCFateVoteBar();
    }
  }
  
  // Only add valid votes to chat panel
  if (isValidVote) {
    s.chatMessages.push({author:author, text:voteDisplay, time:Date.now()});
    if (s.chatMessages.length > 100) s.chatMessages.shift();
    updateChatPanel();
  }
}

// ═══ DÜELLO (DUEL) ═══
function nextDuelRound() {
  var s = streamState;
  if (!s || !s.active) return;
  if (s.alive.length <= 1) { renderDuelWinner(); return; }
  
  // If odd number, give last one a bye to next round
  if (s.alive.length % 2 !== 0) {
    var byeChar = s.alive.pop();
    if (!s._nextRound) s._nextRound = [];
    s._nextRound.push(byeChar);
  }
  
  var pair = s.alive.splice(0, 2);
  if (pair.length < 2) { renderDuelWinner(); return; }
  s.currentPair = pair;
  s.chatMessages = [];
  var c1 = pair[0], c2 = pair[1];
  var ag = document.getElementById('ag');
  
  // Calculate round info
  var totalInRound = (s.alive.length + 2 + (s._nextRound ? s._nextRound.length : 0));
  var roundName = '';
  if (totalInRound <= 2) roundName = '🏆 FINAL';
  else if (totalInRound <= 4) roundName = '⚔️ Yarı Final';
  else if (totalInRound <= 8) roundName = '🗡️ Çeyrek Final';
  else roundName = '⚔️ Tur ' + s.duelRound;
  
  var isSolo = s.duelSolo;
  
  // Card section (shared by both modes)
  var cardsHtml =
    '<h2 class="fd" style="font-size:28px;margin-bottom:6px;text-align:center">⚔️ ' + esc(s.duelTitle) + '</h2>' +
    '<p style="color:var(--t2);font-size:16px;text-align:center;margin-bottom:6px">' + roundName + ' · ' + totalInRound + ' karakter kaldı</p>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:16px">' +
      '<div class="cg sci" style="width:380px;padding:24px;text-align:center;cursor:pointer" onclick="' + (isSolo ? 'duelSoloPick(\'A\')' : 'streamerForceVote(\'A\')') + '" onmouseover="this.style.borderColor=\'#60a5fa\'" onmouseout="this.style.borderColor=\'\'"><div style="font-size:24px;color:#60a5fa;font-weight:800;margin-bottom:8px">A</div><div style="max-width:350px;border-radius:14px;overflow:hidden;margin:0 auto 10px">' + cp(c1, 350) + '</div><h3 class="fd" style="font-size:24px">' + esc(c1.n) + ' ' + esc(c1.s) + '</h3></div>' +
      '<div class="t-vs fl fd" style="background:linear-gradient(135deg,#ff544d30,#ff544d10);border-color:#ff544d40;font-size:20px">VS</div>' +
      '<div class="cg sci" style="width:380px;padding:24px;text-align:center;cursor:pointer" onclick="' + (isSolo ? 'duelSoloPick(\'B\')' : 'streamerForceVote(\'B\')') + '" onmouseover="this.style.borderColor=\'#ffb95f\'" onmouseout="this.style.borderColor=\'\'"><div style="font-size:24px;color:#ffb95f;font-weight:800;margin-bottom:8px">B</div><div style="max-width:350px;border-radius:14px;overflow:hidden;margin:0 auto 10px">' + cp(c2, 350) + '</div><h3 class="fd" style="font-size:24px">' + esc(c2.n) + ' ' + esc(c2.s) + '</h3></div>' +
    '</div>';
  
  if (isSolo) {
    // Solo mode — full width, no chat, no timer, just click
    ag.innerHTML =
      '<div style="padding:20px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
        '<div style="display:flex;gap:8px"><button class="btn bg bsm" onclick="streamStop()">← Bitir</button></div>' +
        '<span class="badge" style="background:#c084fc20;color:#c084fc;font-size:12px">🎮 Bireysel</span>' +
      '</div>' +
      cardsHtml +
      '<p style="text-align:center;font-size:18px;color:var(--t3);margin-top:12px">Seçimini yap — bir karaktere tıkla!</p>' +
      '</div>';
  } else {
    // Chat mode — with sidebar
    ag.innerHTML =
      '<div style="display:flex;gap:20px;padding:20px">' +
      '<div style="flex:1">' +
      cardsHtml +
      '<div id="cvote-bar" style="max-width:600px;margin:0 auto"></div>' +
      '<p style="text-align:center;font-size:18px;color:var(--t3);margin-top:12px">Chat\'e <b style="color:#60a5fa">A</b> veya <b style="color:#ffb95f">B</b> yazın! ⏱️ <span id="cvote-timer" style="font-weight:800;color:var(--v)">60</span>s</p>' +
      '</div>' +
      '<div style="width:260px;display:flex;flex-direction:column;gap:12px;flex-shrink:0">' +
        '<div style="background:var(--bg2);border-radius:14px;border:1px solid var(--b1);padding:14px"><h4 style="font-size:14px;font-weight:600;color:var(--t2);margin-bottom:10px">📊 Oylama</h4><div id="cvote-stats"></div></div>' +
        '<div style="background:var(--bg2);border-radius:14px;border:1px solid var(--b1);padding:14px;flex:1;display:flex;flex-direction:column;overflow:hidden"><h4 style="font-size:14px;font-weight:600;color:var(--t2);margin-bottom:8px">💬 Chat Oyları</h4><div id="chat-msgs" style="flex:1;overflow-y:auto;max-height:300px"></div></div>' +
      '</div></div>';
    
    startCVoteTimer(60, resolveDuelVote);
  }
}

// Solo mode: user clicks A or B directly
function duelSoloPick(choice) {
  if (!streamState || !streamState.active) return;
  var c1 = streamState.currentPair[0], c2 = streamState.currentPair[1];
  var winner = choice === 'A' ? c1 : c2;
  var loser = choice === 'A' ? c2 : c1;
  
  if (!streamState._nextRound) streamState._nextRound = [];
  streamState._nextRound.push(winner);
  streamState.eliminated.push(loser);
  
  showCNotif('⚔️', esc(winner.n) + ' ' + esc(winner.s) + ' kazandı!', true);
  
  if (streamState.alive.length === 0) {
    streamState.alive = shuf(streamState._nextRound);
    streamState._nextRound = [];
    streamState.duelRound++;
  }
  
  setTimeout(function() {
    showStreamTransition(function() {
      nextDuelRound();
    });
  }, 1500);
}

function resolveDuelVote() {
  var s = streamState;
  if (!s || !s.active) return;
  var a = s.votes['A']||0, b = s.votes['B']||0;
  var c1 = s.currentPair[0], c2 = s.currentPair[1];
  
  // Determine winner (tie goes to A)
  var winner, loser;
  if (a >= b) { winner = c1; loser = c2; }
  else { winner = c2; loser = c1; }
  
  // Track for next round
  if (!s._nextRound) s._nextRound = [];
  s._nextRound.push(winner);
  s.eliminated.push(loser);
  
  // Show result notification
  showCNotif('⚔️', esc(winner.n) + ' ' + esc(winner.s) + ' kazandı! (' + Math.max(a,b) + ' - ' + Math.min(a,b) + ')', true);
  
  // Check if current round is complete (no more alive pairs)
  if (s.alive.length === 0) {
    // Round complete — advance winners to next round
    s.alive = shuf(s._nextRound);
    s._nextRound = [];
    s.duelRound++;
  }
  
  // Short delay then next match
  setTimeout(function() {
    showStreamTransition(function() {
      nextDuelRound();
    });
  }, 2500);
}

function renderDuelWinner() {
  var s = streamState;
  var ag = document.getElementById('ag');
  var champion = s.alive[0] || (s._nextRound && s._nextRound[0]);
  if (!champion) { streamStart(); return; }
  
  ag.innerHTML =
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div class="cg" style="text-align:center;padding:60px 40px;max-width:900px">' +
    '<div style="font-size:80px;margin-bottom:16px">🏆</div>' +
    '<h2 class="fd" style="font-size:36px;margin-bottom:8px">' + esc(s.duelTitle) + '</h2>' +
    '<p style="font-size:20px;color:var(--t3);margin-bottom:32px">Şampiyon belli oldu!</p>' +
    '<div style="max-width:400px;margin:0 auto;border-radius:20px;overflow:hidden;border:4px solid var(--g);box-shadow:0 0 60px rgba(255,215,0,0.3)">' + cp(champion, 400) + '</div>' +
    '<h3 class="fd" style="font-size:42px;margin-top:20px;background:linear-gradient(135deg,#ffd700,#ff8c00);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🏆 ' + esc(champion.n) + ' ' + esc(champion.s) + '</h3>' +
    '<p style="font-size:16px;color:var(--t3);margin-top:8px">' + s.pool.length + ' karakter arasından şampiyon!</p>' +
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:24px">' +
    s.eliminated.slice().reverse().slice(0, 8).map(function(c, i) {
      return '<div style="text-align:center;opacity:' + (0.7 - i * 0.05) + '"><div style="width:48px;height:48px;border-radius:10px;overflow:hidden;border:2px solid var(--b1)">' + cp(c, 48) + '</div><div style="font-size:10px;color:var(--t3);margin-top:2px">' + (i + 2) + '.</div></div>';
    }).join('') +
    '</div>' +
    '<button class="btn bp" style="margin-top:32px;font-size:18px;padding:14px 32px" onclick="streamStart()">← Yayıncı Oyunlarına Dön</button>' +
    '</div></div>';
}

// Also add DUEL to streamerForceVote
function updateCVoteBar() {
  var s = streamState;
  var a = s.votes['A']||0, b = s.votes['B']||0, total = a+b||1;
  var pA = Math.round(a/total*100), pB = Math.round(b/total*100);
  var bar = document.getElementById('cvote-bar');
  if (bar) bar.innerHTML = '<div style="display:flex;border-radius:12px;overflow:hidden;height:48px;font-weight:700;font-size:20px"><div style="background:#60a5fa;width:'+Math.max(pA,5)+'%;display:flex;align-items:center;justify-content:center;color:#fff;transition:width .3s">A '+pA+'%</div><div style="background:#ffb95f;width:'+Math.max(pB,5)+'%;display:flex;align-items:center;justify-content:center;color:#fff;transition:width .3s">B '+pB+'%</div></div><div style="text-align:center;font-size:14px;color:var(--t3);margin-top:6px">Toplam: '+total+' oy</div>';
  var stats = document.getElementById('cvote-stats');
  if (stats) stats.innerHTML = '<div style="padding:12px;border-radius:10px;background:#60a5fa15;border:1px solid #60a5fa30;margin-bottom:8px"><div style="font-size:16px;font-weight:700;color:#60a5fa">A) '+pA+'%</div><div style="height:6px;background:var(--bg3);border-radius:3px;margin-top:6px"><div style="height:100%;background:#60a5fa;border-radius:3px;width:'+pA+'%;transition:width .3s"></div></div><div style="font-size:12px;color:var(--t3);margin-top:4px">'+a+' oy</div></div><div style="padding:12px;border-radius:10px;background:#ffb95f15;border:1px solid #ffb95f30"><div style="font-size:16px;font-weight:700;color:#ffb95f">B) '+pB+'%</div><div style="height:6px;background:var(--bg3);border-radius:3px;margin-top:6px"><div style="height:100%;background:#ffb95f;border-radius:3px;width:'+pB+'%;transition:width .3s"></div></div><div style="font-size:12px;color:var(--t3);margin-top:4px">'+b+' oy</div></div>';
}

function updateCFateVoteBar() {
  var s = streamState;
  var bar = document.getElementById('cvote-bar');
  var stats = document.getElementById('cvote-stats');
  if (!bar && !stats) return;
  var fates = s.fates.concat(s.passFate && s.passFate.used < s.passFate.maxUses ? [s.passFate] : []);
  var total = 0;
  fates.forEach(function(f){ total += (s.votes[f.id]||0); });
  if (total === 0) total = 1;
  if (bar) {
    var html = '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">';
    fates.forEach(function(f){
      var count = s.votes[f.id]||0;
      var pct = Math.round(count/total*100);
      html += '<div style="padding:6px 12px;border-radius:8px;background:'+f.color+'20;border:2px solid '+f.color+'40;font-size:14px;font-weight:600;color:'+f.color+'">'+f.emoji+' '+pct+'%</div>';
    });
    html += '</div><div style="text-align:center;font-size:13px;color:var(--t3);margin-top:6px">Toplam: '+(total===1?0:total)+' oy</div>';
    bar.innerHTML = html;
  }
  if (stats) {
    var shtml = '';
    fates.forEach(function(f){
      var count = s.votes[f.id]||0;
      var pct = Math.round(count/total*100);
      shtml += '<div style="padding:8px;border-radius:8px;background:'+f.color+'10;border:1px solid '+f.color+'25;margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:'+f.color+'"><span>'+f.emoji+' '+f.name+'</span><span>'+pct+'%</span></div><div style="height:4px;background:var(--bg3);border-radius:2px;margin-top:4px"><div style="height:100%;background:'+f.color+';border-radius:2px;width:'+pct+'%;transition:width .3s"></div></div></div>';
    });
    stats.innerHTML = shtml;
  }
}

function startCVoteTimer(seconds, callback) {
  var s = streamState;
  s.phase = 'VOTING';
  s.votes = {};
  s.voters = {};
  var remaining = seconds;
  var timerEl = document.getElementById('cvote-timer');
  if (s.voteTimer) clearInterval(s.voteTimer);
  s.voteTimer = setInterval(function(){
    if (s.paused) return; // ⏸️ Skip tick when paused
    remaining--;
    if (timerEl) timerEl.textContent = remaining + 's';
    if (remaining <= 0) {
      clearInterval(s.voteTimer);
      s.phase = 'RESULT';
      callback();
    }
  }, 1000);
}

// ═══ KIM HAYATTA KALACAK (CHAT) ═══
function nextCDieRound() {
  var s = streamState;
  if (!s || !s.active) return;
  if (s.alive.length <= 1) { renderCDieWinner(); return; }
  var pair = s.alive.splice(0, 2);
  if (pair.length < 2) { s.alive = s.alive.concat(pair); renderCDieWinner(); return; }
  s.currentPair = pair;
  s.chatMessages = [];
  var c1 = pair[0], c2 = pair[1];
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="display:flex;gap:20px;padding:20px">'+
    '<div style="flex:1">'+
      '<h2 class="fd" style="font-size:28px;margin-bottom:6px;text-align:center">💀 Kim Hayatta Kalacak</h2>'+
      '<p style="color:var(--t2);font-size:16px;text-align:center;margin-bottom:6px">'+(s.alive.length+2)+' karakter · Eleme '+(s.eliminated.length+1)+'</p>'+
      '<p style="color:var(--pk);font-size:18px;font-weight:700;text-align:center;margin-bottom:16px">A veya B yaz!</p>'+
      '<div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:16px">'+
        '<div class="cg sci" style="width:380px;padding:24px;text-align:center;cursor:pointer" onclick="streamerForceVote(\'A\')" onmouseover="this.style.borderColor=\'#60a5fa\'" onmouseout="this.style.borderColor=\'\'"><div style="font-size:24px;color:#60a5fa;font-weight:800;margin-bottom:8px">A) CK\'la</div><div style="max-width:350px;border-radius:14px;overflow:hidden;margin:0 auto 10px">'+cp(c1,350)+'</div><h3 class="fd" style="font-size:24px">'+esc(c1.n)+' '+esc(c1.s)+'</h3></div>'+
        '<div class="t-vs fl fd" style="background:linear-gradient(135deg,#ff544d30,#ff544d10);border-color:#ff544d40;font-size:20px">VS</div>'+
        '<div class="cg sci" style="width:380px;padding:24px;text-align:center;cursor:pointer" onclick="streamerForceVote(\'B\')" onmouseover="this.style.borderColor=\'#ffb95f\'" onmouseout="this.style.borderColor=\'\'"><div style="font-size:24px;color:#ffb95f;font-weight:800;margin-bottom:8px">B) CK\'la</div><div style="max-width:350px;border-radius:14px;overflow:hidden;margin:0 auto 10px">'+cp(c2,350)+'</div><h3 class="fd" style="font-size:24px">'+esc(c2.n)+' '+esc(c2.s)+'</h3></div>'+
      '</div>'+
      '<div id="cvote-bar" style="max-width:500px;margin:0 auto 12px"></div>'+
      '<div style="font-size:40px;font-weight:800;color:var(--pk);text-align:center" id="cvote-timer">60s</div>'+
    '</div>'+
    '<div style="width:300px;flex-shrink:0">'+
      '<div class="cg" style="margin-bottom:12px;padding:16px"><h4 style="font-size:14px;color:var(--m);margin-bottom:10px">📊 Oy Dağılımı</h4><div id="cvote-stats"></div></div>'+
      '<div class="cg" style="padding:16px" id="chat-panel"><h4 style="font-size:14px;color:var(--pk);margin-bottom:8px">💬 Chat</h4><div id="chat-msgs" style="height:300px;overflow-y:auto;font-size:13px"></div></div>'+
    '</div>'+
    '</div>';
  startCVoteTimer(60, function(){ resolveCDieVote(); });
}

function resolveCDieVote() {
  var s = streamState;
  if (!s || !s.active) return;
  var a = s.votes['A']||0, b = s.votes['B']||0;
  var deadIdx = (a >= b) ? 0 : 1;
  if (a === 0 && b === 0) deadIdx = Math.random() < 0.5 ? 0 : 1;
  var dead = s.currentPair[deadIdx];
  var alive = s.currentPair[1-deadIdx];
  s.eliminated.push(dead);
  s.alive.push(alive);
  s.alive = shuf(s.alive);

  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px"><div style="font-size:64px;margin-bottom:16px">💀</div><h2 class="fd" style="font-size:40px;color:var(--pk)">'+esc(dead.n)+' '+esc(dead.s)+' CK yedi!</h2><p style="font-size:20px;color:var(--t2);margin-top:12px">A: '+(s.votes['A']||0)+' oy — B: '+(s.votes['B']||0)+' oy</p><p style="color:var(--m);font-size:18px;margin-top:8px">'+s.alive.length+' karakter kaldı</p></div>';
  gameTimers.push(setTimeout(function(){ if(streamState&&streamState.active){ showStreamTransition(function(){ nextCDieRound(); }); } }, 2000));
}

function renderCDieWinner() {
  var s = streamState;
  s.active = false;
  var w = s.alive[0] || s.pool[0];
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:40px"><div style="font-size:80px;margin-bottom:16px">🏆</div><h2 class="fd" style="font-size:48px;color:var(--m)">Son Hayatta Kalan!</h2><div style="max-width:500px;border-radius:20px;overflow:hidden;margin:20px auto;border:3px solid var(--m)">'+cp(w,500)+'</div><h3 class="fd" style="font-size:40px;margin-top:16px">'+esc(w.n)+' '+esc(w.s)+'</h3><p style="color:var(--t2);font-size:20px;margin-top:12px">'+s.pool.length+' karakterden chat\'in seçtiği hayatta kalan!</p><button class="btn bp" style="margin-top:24px;font-size:20px;padding:16px 40px" onclick="streamStart()">🔄 Ana Menü</button></div>';
}

// ═══ EKİBİNİ KUR (CHAT) ═══
function nextCTeamRound() {
  var s = streamState;
  if (!s || !s.active) return;
  if (s.team.length >= 8 || s.alive.length === 0) { renderCTeamResult(); return; }
  s.currentChar = s.alive.shift();
  s.chatMessages = [];
  var c = s.currentChar;
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="display:flex;gap:16px;padding:20px">'+
    '<div style="width:220px;flex-shrink:0" class="cg"><h4 style="font-size:14px;color:var(--m);margin-bottom:10px">✅ Ekip ('+s.team.length+'/8)</h4>'+
      (s.team.length > 0 ? s.team.map(function(t){return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div style="width:32px;height:32px;border-radius:6px;overflow:hidden">'+cp(t,32)+'</div><span style="font-size:12px">'+esc(t.n)+'</span></div>';}).join('') : '<p style="font-size:12px;color:var(--t3)">Henüz kimse yok</p>')+
      '<div style="border-top:1px solid var(--b1);margin-top:10px;padding-top:10px"><h4 style="font-size:14px;color:var(--pk);margin-bottom:10px">💀 CK Yiyenler ('+s.eliminated.length+')</h4>'+
      (s.eliminated.length > 0 ? s.eliminated.slice(-8).map(function(t){return '<div style="font-size:11px;color:var(--t3);margin-bottom:4px;opacity:.6">☠️ '+esc(t.n)+'</div>';}).join('') : '<p style="font-size:12px;color:var(--t3)">-</p>')+
    '</div></div>'+
    '<div style="flex:1;text-align:center">'+
      '<h2 class="fd" style="font-size:28px;margin-bottom:6px">👥 Ekibini Kur — Chat</h2>'+
      '<p style="color:var(--m);font-size:18px;font-weight:700;margin-bottom:16px">A = Ekibe Al ✅ · B = CK Ver 💀</p>'+
      '<div class="cg sci" style="max-width:500px;margin:0 auto;padding:24px">'+
        '<div style="max-width:400px;border-radius:14px;overflow:hidden;margin:0 auto 12px">'+cp(c,400)+'</div>'+
        '<h3 class="fd" style="font-size:28px">'+esc(c.n)+' '+esc(c.s)+'</h3>'+
      '</div>'+
      '<div style="display:flex;gap:16px;justify-content:center;margin:16px 0"><div style="padding:12px 32px;border-radius:12px;background:#3cddc720;border:2px solid #3cddc740;font-size:20px;font-weight:700;color:var(--m);cursor:pointer;transition:all .2s" onclick="streamerForceVote(\'A\')" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'\'">A) Ekibe Al ✅</div><div style="padding:12px 32px;border-radius:12px;background:#ff544d20;border:2px solid #ff544d40;font-size:20px;font-weight:700;color:var(--pk);cursor:pointer;transition:all .2s" onclick="streamerForceVote(\'B\')" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'\'">B) CK Ver 💀</div></div>'+
      '<div id="cvote-bar" style="max-width:500px;margin:0 auto 12px"></div>'+
      '<div style="font-size:40px;font-weight:800;color:var(--pk)" id="cvote-timer">60s</div>'+
    '</div>'+
    '<div style="width:280px;flex-shrink:0">'+
      '<div class="cg" style="margin-bottom:12px;padding:16px"><h4 style="font-size:14px;color:var(--m);margin-bottom:10px">📊 Oy Dağılımı</h4><div id="cvote-stats"></div></div>'+
      '<div class="cg" style="padding:16px" id="chat-panel"><h4 style="font-size:14px;color:var(--pk);margin-bottom:8px">💬 Chat</h4><div id="chat-msgs" style="height:250px;overflow-y:auto;font-size:13px"></div></div>'+
    '</div>'+
    '</div>';
  startCVoteTimer(60, function(){ resolveCTeamVote(); });
}

function resolveCTeamVote() {
  var s = streamState;
  if (!s || !s.active) return;
  var a = s.votes['A']||0, b = s.votes['B']||0;
  var action = (a >= b) ? 'TEAM' : 'CK';
  if (a === 0 && b === 0) action = Math.random() < 0.5 ? 'TEAM' : 'CK';
  
  if (action === 'TEAM' && s.team.length < 8) {
    s.team.push(s.currentChar);
    showCNotif('✅', esc(s.currentChar.n)+' ekibe katıldı!', true);
  } else {
    s.eliminated.push(s.currentChar);
    showCNotif('💀', esc(s.currentChar.n)+' CK yedi!', false);
  }
  gameTimers.push(setTimeout(function(){ if(streamState&&streamState.active){ showStreamTransition(function(){ nextCTeamRound(); }); } }, 2500));
}

function renderCTeamResult() {
  var s = streamState;
  s.active = false;
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:40px"><div style="font-size:80px;margin-bottom:16px">🏆</div><h2 class="fd" style="font-size:44px;color:var(--m)">Chat\'in Seçtiği Ekip!</h2><div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin:24px auto;max-width:1200px">'+s.team.map(function(c){return '<div class="cg" style="width:250px;padding:16px;text-align:center"><div style="border-radius:12px;overflow:hidden;margin-bottom:8px">'+cp(c,250)+'</div><h4 class="fd" style="font-size:18px">'+esc(c.n)+' '+esc(c.s)+'</h4></div>';}).join('')+'</div><p style="color:var(--t2);font-size:18px;margin-top:16px">'+s.eliminated.length+' karakter CK yedi!</p><button class="btn bp" style="margin-top:24px;font-size:20px;padding:16px 40px" onclick="streamStart()">🔄 Ana Menü</button></div>';
}

// ═══ KADERİNİ SEÇ (CHAT) ═══
function nextCFateRound() {
  var s = streamState;
  if (!s || !s.active) return;
  if (s.alive.length === 0) { renderCFateResult(); return; }
  s.currentChar = s.alive.shift();
  s.chatMessages = [];
  var c = s.currentChar;
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="display:flex;gap:20px;padding:20px">'+
    '<div style="flex:1;text-align:center">'+
      '<h2 class="fd" style="font-size:28px;margin-bottom:6px">🎭 Kaderini Seç — Chat</h2>'+
      '<p style="color:var(--t2);font-size:16px;margin-bottom:6px">'+(s.pool.length - s.alive.length)+'/'+s.pool.length+' kader belirlendi</p>'+
      '<p style="color:var(--pk);font-size:16px;font-weight:700;margin-bottom:16px">1-8 arası yaz veya kader adını yaz!</p>'+
      '<div class="cg sci" style="max-width:500px;margin:0 auto;padding:24px">'+
        '<div style="max-width:400px;border-radius:14px;overflow:hidden;margin:0 auto 12px">'+cp(c,400)+'</div>'+
        '<h3 class="fd" style="font-size:28px">'+esc(c.n)+' '+esc(c.s)+'</h3>'+
      '</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0">'+
      s.fates.map(function(f,i){return '<div style="padding:8px 14px;border-radius:8px;background:'+f.color+'15;border:2px solid '+f.color+'30;font-size:15px;font-weight:600;color:'+f.color+';cursor:pointer;transition:all .2s" onclick="streamerForceFate(\''+f.id+'\')" onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'\'">'+(i+1)+') '+f.emoji+' '+f.name+'</div>';}).join('')+(s.passFate&&s.passFate.used<s.passFate.maxUses?'<div style="padding:8px 14px;border-radius:8px;background:#66615;border:2px solid #66630;font-size:15px;font-weight:600;color:#666;cursor:pointer;transition:all .2s" onclick="streamerForceFate(\'f9\')" onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'\'">'+(s.fates.length+1)+') ⏭️ Pas ('+s.passFate.used+'/'+s.passFate.maxUses+')</div>':'')+
    (s.usedFates&&s.usedFates.length>0?'<div style="margin-top:8px;font-size:12px;color:var(--t3)">Kullanılan: '+s.usedFates.map(function(f){return f.emoji+' '+f.name}).join(', ')+'</div>':'')+
      '</div>'+
      '<div id="cvote-bar" style="max-width:700px;margin:0 auto 12px"></div>'+
      '<div style="font-size:40px;font-weight:800;color:var(--pk)" id="cvote-timer">60s</div>'+
    '</div>'+
    '<div style="width:300px;flex-shrink:0">'+
      '<div class="cg" style="margin-bottom:12px;padding:16px"><h4 style="font-size:14px;color:var(--m);margin-bottom:10px">📊 Oy Dağılımı</h4><div id="cvote-stats"></div></div>'+
      '<div class="cg" style="padding:16px" id="chat-panel"><h4 style="font-size:14px;color:var(--pk);margin-bottom:8px">💬 Chat</h4><div id="chat-msgs" style="height:250px;overflow-y:auto;font-size:13px"></div></div>'+
    '</div>'+
    '</div>';
  startCVoteTimer(60, function(){ resolveCFateVote(); });
}

function resolveCFateVote() {
  var s = streamState;
  if (!s || !s.active) return;
  // Include Pas in voting if still available
  var allOpts = s.fates.slice();
  if (s.passFate && s.passFate.used < s.passFate.maxUses) allOpts.push(s.passFate);
  var maxVote = 0, maxFate = allOpts[0];
  allOpts.forEach(function(f){
    var v = s.votes[f.id]||0;
    if (v > maxVote) { maxVote = v; maxFate = f; }
  });
  if (maxVote === 0) maxFate = allOpts[Math.floor(Math.random()*allOpts.length)];
  
  if (maxFate.id === 'f9') {
    s.passFate.used++;
    s.passFate.chars.push(s.currentChar);
    showCNotif('⏭️', esc(s.currentChar.n)+' pas geçildi! ('+s.passFate.used+'/'+s.passFate.maxUses+')', true);
  } else {
    maxFate.chars.push(s.currentChar);
    s.usedFates.push({id:maxFate.id, name:maxFate.name, emoji:maxFate.emoji, color:maxFate.color, chars:maxFate.chars.slice()});
    s.fates = s.fates.filter(function(f){ return f.id !== maxFate.id; });
    showCNotif(maxFate.emoji, esc(s.currentChar.n)+' → '+maxFate.name+'!', true);
  }
  gameTimers.push(setTimeout(function(){ if(streamState&&streamState.active){ showStreamTransition(function(){ nextCFateRound(); }); } }, 2500));
}

function renderCFateResult() {
  var s = streamState;
  s.active = false;
  var ag = document.getElementById('ag');
  var allFates = s.usedFates.concat(s.fates);
  var assignedCount = s.usedFates.filter(function(f){return f.chars.length > 0}).length;
  var pasCount = s.passFate ? s.passFate.chars.length : 0;
  
  var html = '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div class="cg" style="text-align:center;padding:48px 36px;max-width:1000px;width:100%;position:relative;overflow:hidden">' +
    '<div style="font-size:100px;margin-bottom:12px">🎭</div>' +
    '<h2 class="fd" style="font-size:44px;font-weight:700">Chat\'in Belirlediği Kaderler!</h2>' +
    '<p style="font-size:18px;color:var(--t2);margin-top:8px">'+assignedCount+' kader atandı'+(pasCount > 0 ? ' · '+pasCount+' pas' : '')+'</p>' +
    '<div style="margin-top:28px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:800px;margin-left:auto;margin-right:auto">';
  
  s.usedFates.forEach(function(f){
    if (f.chars.length > 0) {
      f.chars.forEach(function(c){
        html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:'+f.color+'10;border:1px solid '+f.color+'25;text-align:left">' +
          '<span style="font-size:32px">'+f.emoji+'</span>' +
          '<div style="flex:1"><div style="font-size:16px;font-weight:700;color:'+f.color+'">'+f.name+'</div>' +
          '<div style="font-size:14px;color:var(--t1);margin-top:2px">'+esc(c.n)+' '+esc(c.s)+'</div></div>' +
          '<div style="width:60px;height:60px;border-radius:12px;overflow:hidden">'+cp(c,60)+'</div></div>';
      });
    }
  });
  
  if (pasCount > 0) {
    s.passFate.chars.forEach(function(c){
      html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#66610;border:1px solid #66625;text-align:left">' +
        '<span style="font-size:32px">⏭️</span>' +
        '<div style="flex:1"><div style="font-size:16px;font-weight:700;color:#666">Pas</div>' +
        '<div style="font-size:14px;color:var(--t1);margin-top:2px">'+esc(c.n)+' '+esc(c.s)+'</div></div>' +
        '<div style="width:60px;height:60px;border-radius:12px;overflow:hidden">'+cp(c,60)+'</div></div>';
    });
  }
  
  html += '</div><div style="display:flex;justify-content:center;gap:12px;margin-top:32px">' +
    '<button class="btn bp" style="font-size:20px;padding:16px 40px" onclick="streamStart()">🔄 Ana Menü</button></div></div></div>';
  ag.innerHTML = html;
}

// ═══ CHAT PANEL UPDATE ═══
function updateChatPanel() {
  var s = streamState;
  if (!s) return;
  var el = document.getElementById('chat-msgs');
  if (!el) return;
  var msgs = s.chatMessages.slice(-30);
  el.innerHTML = msgs.map(function(m){
    var color = '#c084fc';
    var upper = (m.text || '').trim().toUpperCase();
    if (upper === 'A') color = '#60a5fa';
    else if (upper === 'B') color = '#ffb95f';
    return '<div style="padding:4px 8px;font-size:13px;border-radius:4px;margin-bottom:1px"><b style="color:'+color+'">'+esc(m.text)+'</b> <span style="color:var(--t3)">'+esc(m.author)+'</span></div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

// ═══ NOTIFICATION ═══
function showCNotif(emoji, text, isGood) {
  var old = document.getElementById('c-notif');
  if (old) old.remove();
  var n = document.createElement('div');
  n.id = 'c-notif';
  var bg = isGood ? 'rgba(60,221,199,0.2)' : 'rgba(255,84,77,0.2)';
  var border = isGood ? 'rgba(60,221,199,0.4)' : 'rgba(255,84,77,0.4)';
  var color = isGood ? '#3cddc7' : '#ff544d';
  n.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:24px 48px;border-radius:20px;background:'+bg+';border:2px solid '+border+';backdrop-filter:blur(12px)';
  n.innerHTML = '<div style="font-size:56px;margin-bottom:8px">'+emoji+'</div><div style="font-size:28px;font-weight:700;color:'+color+'">'+text+'</div>';
  document.body.appendChild(n);
  gameTimers.push(setTimeout(function(){ var el = document.getElementById('c-notif'); if (el) el.remove(); }, 2000));
}
