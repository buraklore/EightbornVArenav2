var aTab = 'chars';
var nid = 100;
var API_BASE = '/api';

function apiHeaders() { return { 'Content-Type': 'application/json' }; }

async function apiGet(path) {
  try { var r = await fetch(API_BASE + path, { headers: apiHeaders(), credentials: 'include' }); if (r.status === 401) { curUser = null; } return await r.json(); }
  catch (e) { return { error: 'Baglanti hatasi.' }; }
}
async function apiPost(path, data) {
  try { var r = await fetch(API_BASE + path, { method: 'POST', headers: apiHeaders(), credentials: 'include', body: JSON.stringify(data) }); if (r.status === 401) { curUser = null; } return await r.json(); }
  catch (e) { return { error: 'Baglanti hatasi.' }; }
}
async function apiDelete(path) {
  try { var r = await fetch(API_BASE + path, { method: 'DELETE', headers: apiHeaders(), credentials: 'include' }); return await r.json(); }
  catch (e) { return { error: 'Baglanti hatasi.' }; }
}

async function apiLogin(email, password) { var r = await apiPost('/auth/login', { email: email, password: password }); if (r.user) { curUser = r.user; } return r; }
async function apiRegister(username, email, password) { var r = await apiPost('/auth/register', { username: username, email: email, password: password }); if (r.user) { curUser = r.user; } return r; }
async function apiLogout() { await apiPost('/auth/logout', {}); curUser = null; }
async function apiGetMe() { var r = await apiGet('/auth/me'); if (r.user) { curUser = r.user; return r.user; } return null; }

async function apiSaveScore(gameType, score, total) { return await apiPost('/scores/save', { game_type: gameType, score: score, total: total }); }
async function apiGetLeaderboard() { return await apiGet('/scores/leaderboard'); }

async function apiToggleStreamer(id) { return await apiPost('/admin/toggle-streamer/' + id, {}); }
async function apiRequestStreamer() { return await apiPost('/stream/request', {}); }
async function apiGetStreamerRequests() { return await apiGet('/admin/streamer-requests'); }
async function apiApproveStreamer(id) { return await apiPost('/admin/approve-streamer/' + id, {}); }
async function apiRejectStreamer(id) { return await apiPost('/admin/reject-streamer/' + id, {}); }
async function apiGetGameLeaderboard(game) { return await apiGet('/scores/game-leaderboard?game=' + game); }

async function apiGetCharacters() { return await apiGet('/characters'); }
async function apiSaveCharacter(data) { return await apiPost('/characters', data); }
async function apiDeleteCharacter(id) { return await apiDelete('/characters/' + id); }

async function apiGetQuestions() { return await apiGet('/questions'); }
async function apiSaveQuestion(data) { return await apiPost('/questions', data); }
async function apiDeleteQuestion(id) { return await apiDelete('/questions/' + id); }

async function apiGetWhoQuestions() { return await apiGet('/who-questions'); }
async function apiSaveWhoQuestion(data) { return await apiPost('/who-questions', data); }
async function apiDeleteWhoQuestion(id) { return await apiDelete('/who-questions/' + id); }

async function apiSaveGameConfig(config) { return await apiPost('/game-config', { config: config }); }
async function apiGetGameConfig() { return await apiGet('/game-config'); }

async function apiGetStats() { return await apiGet('/admin/stats'); }
async function apiGetUsers() { return await apiGet('/admin/users'); }
async function apiResetLeaderboard() { return await apiPost('/admin/reset-leaderboard', {}); }
async function apiResetUserScore(id) { return await apiPost('/admin/reset-user/' + id, {}); }
async function apiDeleteUser(id) { return await apiDelete('/admin/user/' + id); }

function dbCharToLocal(c) {
  return { id: c.id, n: c.name, s: c.surname || '', g: c.gender || 'M', rep: c.rep || '', tip: c.tip || '', img: c.img || '', a: c.active !== false };
}
function dbQuizToLocal(q) {
  var opts = [q.option_a, q.option_b];
  if (q.option_c) opts.push(q.option_c);
  if (q.option_d) opts.push(q.option_d);
  return { id: q.id, q: q.question, o: opts, ci: q.correct_index || 0 };
}
function dbWhoToLocal(q) {
  var opts = [q.option_a, q.option_b];
  if (q.option_c) opts.push(q.option_c);
  if (q.option_d) opts.push(q.option_d);
  return { id: q.id, q: q.question, o: opts };
}

async function initData() {
  window._dataReady = false;
  try {
    var r = await apiGet('/init-lite');
    if (r.error) { console.log('initData: API error, using local data'); return; }
    if (r.characters && r.characters.length > 0) {
      var dbChars = r.characters.map(dbCharToLocal);
      if (dbChars.length >= 100) {
        // DB has enough chars — replace data.js entirely
        chars = dbChars.map(function(dc){ dc.dbId = dc.id; return dc; });
      } else {
        // DB has few chars — merge with data.js
        for (var i = 0; i < dbChars.length; i++) {
          var dc = dbChars[i];
          var existing = chars.find(function(c) { return c.n === dc.n && c.s === dc.s; });
          if (existing) {
            existing.n = dc.n; existing.s = dc.s;
            if (dc.rep) existing.rep = dc.rep;
            if (dc.tip) existing.tip = dc.tip;
            if (dc.img) existing.img = dc.img;
            existing.a = dc.a; existing.g = dc.g; existing.dbId = dc.id;
          } else {
            dc.dbId = dc.id; chars.push(dc);
          }
        }
      }
      if (typeof initAvatars === "function") initAvatars();
    }
    if (r.quizQuestions && r.quizQuestions.length >= 10) {
      var dbQs = r.quizQuestions.map(dbQuizToLocal);
      memQs = dbQs.map(function(dq){ dq.dbId = dq.id; return dq; });
    } else if (r.quizQuestions && r.quizQuestions.length > 0) {
      var dbQs = r.quizQuestions.map(dbQuizToLocal);
      for (var qi = 0; qi < dbQs.length; qi++) {
        var dq = dbQs[qi];
        var exq = memQs.find(function(m){ return m.q === dq.q; });
        if (exq) { exq.q=dq.q; exq.o=dq.o; exq.ci=dq.ci; exq.dbId=dq.id; }
        else { dq.dbId=dq.id; memQs.push(dq); }
      }
    }
    if (r.whoQuestions && r.whoQuestions.length >= 10) {
      var dbWqs = r.whoQuestions.map(dbWhoToLocal);
      whoQs = dbWqs.map(function(dq){ dq.dbId = dq.id; return dq; });
    } else if (r.whoQuestions && r.whoQuestions.length > 0) {
      var dbWqs = r.whoQuestions.map(dbWhoToLocal);
      for (var wi = 0; wi < dbWqs.length; wi++) {
        var dw = dbWqs[wi];
        var exw = whoQs.find(function(w){ return w.q === dw.q; });
        if (exw) { exw.q=dw.q; exw.o=dw.o; exw.dbId=dw.id; }
        else { dw.dbId=dw.id; whoQs.push(dw); }
      }
    }
    if (r.gameConfig) {
      if (r.gameConfig.GD) {
        for (var i = 0; i < GD.length; i++) {
          var saved = r.gameConfig.GD.find(function(x) { return x.t === GD[i].t; });
          if (saved) { GD[i].on = saved.on; if (saved.d) GD[i].d = saved.d; if (saved.e) GD[i].e = saved.e; }
        }
      }
      if (r.gameConfig.TEAM_MAX) TEAM_MAX = r.gameConfig.TEAM_MAX;
      if (r.gameConfig.GN) { for (var k in r.gameConfig.GN) { GN[k] = r.gameConfig.GN[k]; } }
      // Set defaults only if not already set from DB
      if(!GN['STREAM'])GN['STREAM']='Yayıncı Oyunları';if(!GN['TEAM'])GN['TEAM']='Ekibini Kur';if(!GN['MEM'])GN['MEM']='Eightborn Moruq';if(!GN['WHO'])GN['WHO']='Hangi Eightborn Karakterisin?';
      if (r.gameConfig.WHO_RESULT_CHARS) { window._whoResultChars = r.gameConfig.WHO_RESULT_CHARS; }
    }
    // Filter deleted characters
    if (r.deleted_chars) {
      try {
        var deleted = JSON.parse(r.deleted_chars);
        chars = chars.filter(function(c) {
          var key = (c.n||'') + '|' + (c.s||'');
          return deleted.indexOf(key) === -1;
        });
      } catch(e){}
    }
    // Load ads
    if (r.ads_config) {
      try { adConfig = JSON.parse(r.ads_config); sessionStorage.setItem('ebv_ads',r.ads_config); } catch(e){}
    if(r.discord) window._discordLink = r.discord;
    if(r.hero_image) window._heroImage = r.hero_image;
    }
    // Apply ads after config is loaded
    if(typeof applyAds === 'function') applyAds();
    // rfCards removed — cards rendered once by game-router.js
  } catch (e) { console.error('initData error:', e); window._dataReady = true; }
  window._dataReady = true;
  // Load character images in background (non-blocking)
  apiGet('/char-images').then(function(imgData){
    var images = imgData.images || {};
    chars.forEach(function(c){
      if(images[c.dbId || c.id]){
        c.img = images[c.dbId || c.id];
      }
    });
    if(typeof initAvatars === 'function') initAvatars();
  }).catch(function(){});

}

async function initSession() {
  var wasUser = curUser ? curUser.username : null;
  try { await apiGetMe(); } catch(e) {}
  try { await initData(); } catch(e) {}
  var nowUser = curUser ? curUser.username : null;
  try { if(curUser) sessionStorage.setItem('ebv_user',JSON.stringify(curUser)); else sessionStorage.removeItem('ebv_user'); } catch(e){}
  if (wasUser !== nowUser && typeof renderNav === 'function') renderNav();
}

function saveData() {
  apiSaveGameConfig({ GD: GD.map(function(g) { return { t: g.t, on: g.on, d: g.d, e: g.e }; }), TEAM_MAX: TEAM_MAX, GN: GN });
}

async function apiGetTimedLeaderboard(period) { return await apiGet('/scores/timed-leaderboard?period=' + period); }
