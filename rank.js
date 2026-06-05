// ═══════════════════════════════════════════════════
// KARAKTER SIRALA — RANK GAME
// Rastgele bir kriter + 5 karakter → sürükle/sırala → topluluk uyuşması
// ═══════════════════════════════════════════════════
let rkState = null;

function _rkNotif(emoji, text, isGood) {
  if (typeof showGameNotif === 'function') { showGameNotif(emoji, text, isGood); }
}
function _rkCharById(id) {
  var sid = String(id);
  return chars.find(function(c){ return String(c.dbId || c.id) === sid; }) || null;
}
function _rkCid(c) { return String(c.dbId || c.id); }

// ── Sıralama havuzu ──
// Admin panelinden seçilen karakter havuzundan (rkState.poolIds) tur başına rkState.roundSize karakter seçilir.
// Havuz seçilmemişse tüm aktif karakterler kullanılır — karakter-bazlı skorlama sayesinde bu da çalışır
// (uzlaşı, tam aynı ikilinin değil karakterlerin küresel kazanma oranıyla oluşur).
function _rkPool() {
  var active = chars.filter(function(c){ return c.a; });
  var ids = (rkState && rkState.poolIds) ? rkState.poolIds : null;
  if (ids && ids.length >= 2) {
    var set = {}; ids.forEach(function(x){ set[String(x)] = 1; });
    var cur = active.filter(function(c){ return set[_rkCid(c)]; });
    if (cur.length >= 2) return cur;
  }
  return active;
}

function rankStart() {
  if (typeof checkBanned === 'function' && checkBanned()) return;
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">' +
      '<div style="width:100px;height:100px;border-radius:24px;background:rgba(255,185,95,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(255,185,95,0.15)">🎯</div>' +
      '<h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">KARAKTER SIRALA</h2>' +
      '<div style="width:80px;height:4px;background:linear-gradient(90deg,#ffb95f,#ff544d);margin:0 auto 20px;border-radius:2px"></div>' +
      '<p style="font-size:16px;color:#9a969e;margin-bottom:8px;max-width:540px;margin-left:auto;margin-right:auto;line-height:1.7">Her turda bir <b style="color:#ffb95f">soru</b> ve 5 karakter gelir. Sürükle ya da oklarla sırala — sonra topluluk ne demiş gör!</p>' +
      '<p style="font-size:14px;color:#6a6878;margin-bottom:32px">Seçili karakterler her soruda farklı sıraya girer; oynadıkça topluluğun ortak sıralaması belirginleşir.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">' +
        _rkModeBtn(3, 'Hızlı', '3 Tur', false) +
        _rkModeBtn(5, 'Klasik', '5 Tur', true) +
        _rkModeBtn(10, 'Maraton', '10 Tur', false) +
      '</div>' +
    '</div>';
}

function _rkModeBtn(rounds, title, sub, primary) {
  var base = primary
    ? 'background:linear-gradient(135deg,#ffb95f,#ff544d);border:none;color:#1b1b24;box-shadow:0 0 24px rgba(255,84,77,0.25)'
    : 'background:#1f1f28;border:1px solid rgba(91,64,61,0.12);color:#e4e1ee';
  return '<button style="padding:18px 34px;border-radius:14px;font-weight:800;cursor:pointer;transition:all .2s;letter-spacing:1px;min-width:130px;' + base + '" ' +
    (primary ? '' : 'onmouseover="this.style.borderColor=\'#ffb95f\';this.style.background=\'#292933\'" onmouseout="this.style.borderColor=\'rgba(91,64,61,0.12)\';this.style.background=\'#1f1f28\'" ') +
    'onclick="rankBegin(' + rounds + ')">' +
    '<div style="font-size:18px">' + title + '</div>' +
    '<div style="font-size:12px;opacity:.8;font-weight:600;margin-top:2px">' + sub + '</div>' +
    '</button>';
}

function rankBegin(rounds) {
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px;color:#9a969e">Sorular yükleniyor...</div>';
  Promise.all([apiGet('/rank/criteria'), apiGet('/rank/config').catch(function(){ return {}; })]).then(function(res) {
    var r = res[0] || {};
    var cfg = res[1] || {};
    var criteria = (r && r.criteria) ? r.criteria : [];
    if (!criteria.length) {
      ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Henüz kriter eklenmemiş. Lütfen daha sonra tekrar deneyin.<br><br><button class="btn bg" onclick="bk()">← Geri</button></div>';
      return;
    }
    var roundSize = (cfg && cfg.round_size) ? cfg.round_size : 5;
    var poolIds = (cfg && cfg.pool_ids && cfg.pool_ids.length) ? cfg.pool_ids.map(String) : null;
    // Etkin havuz boyutu (seçili havuz varsa onunla, yoksa tüm aktiflerle)
    var active = chars.filter(function(c){ return c.a; });
    var poolCount = poolIds ? active.filter(function(c){ return poolIds.indexOf(_rkCid(c)) !== -1; }).length : active.length;
    if (poolCount < roundSize) {
      ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Havuzda yeterli karakter yok (en az ' + roundSize + ' gerekli).<br><br><button class="btn bg" onclick="bk()">← Geri</button></div>';
      return;
    }
    rkState = {
      criteria: criteria,
      poolIds: poolIds,
      roundSize: roundSize,
      totalRounds: rounds,
      round: 0,
      points: [],          // her turun puanı (0-100)
      history: [],         // {criterion, order, consensus, agreement, first, submissions}
      criterion: null,
      order: [],
      lastCritId: null,
      submitting: false,
      _drag: null
    };
    rankNewRound();
  }).catch(function() {
    ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Bağlantı hatası.<br><br><button class="btn bg" onclick="bk()">← Geri</button></div>';
  });
}

function rankNewRound() {
  var s = rkState;
  if (!s) return;
  if (s.round >= s.totalRounds) { renderRankResult(); return; }
  s.round++;
  s.submitting = false;
  s._drag = null;

  // Rastgele kriter (mümkünse art arda aynısını verme)
  var crit = s.criteria[Math.floor(Math.random() * s.criteria.length)];
  if (s.criteria.length > 1 && String(crit.id) === String(s.lastCritId)) {
    crit = s.criteria[Math.floor(Math.random() * s.criteria.length)];
  }
  s.lastCritId = crit.id;
  s.criterion = crit;

  // Havuzdan tur başına N karakter (admin ayarı; varsayılan 5)
  var pool = _rkPool();
  var rs = Math.min(rkState.roundSize || 5, pool.length);
  var picked = shuf(pool).slice(0, rs);
  s.order = picked.map(_rkCid);

  renderRankRound();
}

function renderRankRound() {
  var s = rkState;
  var ag = document.getElementById('ag');
  var totalScore = s.points.reduce(function(a, b){ return a + b; }, 0);

  // Tur ilerleme çubuğu (segmentli)
  var segs = '';
  for (var i = 1; i <= s.totalRounds; i++) {
    var done = i < s.round, cur = i === s.round;
    segs += '<div style="flex:1;height:6px;border-radius:3px;background:' + (done ? '#ffb95f' : (cur ? 'linear-gradient(90deg,#ffb95f,#ff544d)' : '#26262f')) + ';transition:background .3s"></div>';
  }

  ag.innerHTML =
    '<div style="max-width:780px;margin:0 auto;padding:10px 18px 52px;width:100%">' +
      // Üst: tur + puan (çıkış butonu yok — üst menüden çıkılır)
      '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:22px">' +
        '<div style="display:inline-flex;align-items:center;gap:12px;background:#1b1b24;border:1px solid rgba(91,64,61,0.18);border-radius:50px;padding:9px 22px">' +
          '<span class="fd" style="font-size:17px;letter-spacing:2px;color:#e4e1ee">TUR ' + s.round + '/' + s.totalRounds + '</span>' +
          '<span style="width:5px;height:5px;border-radius:50%;background:#6a6878"></span>' +
          '<span style="font-size:15px;color:#ffb95f;font-weight:800">🎯 ' + totalScore + ' puan</span>' +
        '</div>' +
        '<div style="display:flex;gap:5px;width:100%;max-width:420px">' + segs + '</div>' +
      '</div>' +
      // Kriter
      '<div style="text-align:center;margin-bottom:18px">' +
        '<div style="font-size:54px;line-height:1;margin-bottom:10px">' + (s.criterion.emoji || '🏆') + '</div>' +
        '<h1 class="fd" style="font-size:clamp(32px,5.5vw,50px);letter-spacing:1px;color:#e4e1ee;line-height:1.05">' + esc(s.criterion.label) + '</h1>' +
        '<p style="font-size:15px;color:#9a969e;margin-top:12px">En çok olanı <b style="color:#3cddc7">en üste</b>, en az olanı <b style="color:#ff544d">en alta</b> sırala</p>' +
      '</div>' +
      // Puanlama ipucu
      '<div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(255,185,95,0.06),rgba(255,84,77,0.04));border:1px solid rgba(255,185,95,0.14);border-radius:12px;padding:11px 16px;margin-bottom:8px">' +
        '<span style="font-size:20px;flex-shrink:0">🏆</span>' +
        '<span style="font-size:13px;color:#9a969e;line-height:1.5">Sıralaman topluluğun ortalamasına ne kadar <b style="color:#ffb95f">yakınsa</b> o kadar çok puan kazanırsın. Sürükle-bırak ya da <b style="color:#e4e1ee">▲ ▼</b> tuşlarını kullan.</span>' +
      '</div>' +
      '<div id="rank-list" style="margin:16px 0 20px"></div>' +
      '<button class="btn bp" style="width:100%;padding:17px;font-size:18px" onclick="rankSubmit()">Sıralamayı Onayla →</button>' +
    '</div>';
  renderRankList();
}

function renderRankList() {
  var s = rkState;
  var el = document.getElementById('rank-list');
  if (!el) return;
  var n = s.order.length;
  var medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = s.order.map(function(id, i) {
    var c = _rkCharById(id);
    if (!c) return '';
    var rankBadge = i < 3 ? medals[i] : (i + 1);
    return '<div class="rank-row" draggable="true" data-pos="' + i + '" ' +
      'ondragstart="rankDragStart(event,' + i + ')" ondragover="rankDragOver(event,' + i + ')" ondragleave="rankDragLeave(event,' + i + ')" ondrop="rankDrop(event,' + i + ')" ondragend="rankDragEnd(event)" ' +
      'style="display:flex;align-items:center;gap:14px;background:#1f1f28;border:1px solid rgba(91,64,61,0.15);border-radius:15px;padding:12px 16px;margin-bottom:11px;cursor:grab;transition:border-color .15s,transform .1s,box-shadow .15s">' +
        '<div class="fd" style="width:42px;text-align:center;font-size:' + (i < 3 ? '28' : '22') + 'px;color:#ffb95f;flex-shrink:0">' + rankBadge + '</div>' +
        '<div style="width:62px;height:62px;border-radius:12px;overflow:hidden;flex-shrink:0;border:1px solid rgba(91,64,61,0.2)">' + cp(c, 62) + '</div>' +
        '<div style="flex:1;min-width:0;text-align:left">' +
          '<div style="font-size:18px;font-weight:700;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2">' + esc(c.n) + ' ' + esc(c.s) + '</div>' +
        '</div>' +
        '<div style="font-size:20px;color:#4a4858;flex-shrink:0;padding:0 2px">⠿</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">' +
          '<button onclick="rankMove(' + i + ',-1)" ' + (i === 0 ? 'disabled' : '') + ' style="width:40px;height:30px;border-radius:8px;border:1px solid rgba(91,64,61,0.2);background:' + (i === 0 ? '#16161d;color:#3a3a44' : '#292933;color:#e4e1ee') + ';cursor:' + (i === 0 ? 'default' : 'pointer') + ';font-size:13px;display:flex;align-items:center;justify-content:center" aria-label="Yukarı">▲</button>' +
          '<button onclick="rankMove(' + i + ',1)" ' + (i === n - 1 ? 'disabled' : '') + ' style="width:40px;height:30px;border-radius:8px;border:1px solid rgba(91,64,61,0.2);background:' + (i === n - 1 ? '#16161d;color:#3a3a44' : '#292933;color:#e4e1ee') + ';cursor:' + (i === n - 1 ? 'default' : 'pointer') + ';font-size:13px;display:flex;align-items:center;justify-content:center" aria-label="Aşağı">▼</button>' +
        '</div>' +
      '</div>';
  }).join('');
}

function rankMove(i, dir) {
  var s = rkState;
  if (!s || s.submitting) return;
  var j = i + dir;
  if (j < 0 || j >= s.order.length) return;
  var tmp = s.order[i];
  s.order[i] = s.order[j];
  s.order[j] = tmp;
  if (typeof playClick === 'function') playClick();
  renderRankList();
}

// ── HTML5 sürükle-bırak (masaüstü) ──
function rankDragStart(e, i) {
  var s = rkState;
  if (!s || s.submitting) { e.preventDefault(); return; }
  s._drag = i;
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); } catch (err) {}
  var row = e.currentTarget;
  if (row) { row.style.opacity = '0.4'; }
}
function rankDragOver(e, i) {
  e.preventDefault();
  try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
  var row = e.currentTarget;
  if (row) { row.style.borderColor = '#ffb95f'; row.style.boxShadow = '0 0 0 2px rgba(255,185,95,0.25)'; }
}
function rankDragLeave(e, i) {
  var row = e.currentTarget;
  if (row) { row.style.borderColor = 'rgba(91,64,61,0.15)'; row.style.boxShadow = 'none'; }
}
function rankDrop(e, j) {
  e.preventDefault();
  var s = rkState;
  if (!s || s.submitting || s._drag === null) return;
  var from = s._drag, to = j;
  s._drag = null;
  if (from === to) { renderRankList(); return; }
  var arr = s.order.slice();
  var item = arr.splice(from, 1)[0];
  arr.splice(to, 0, item);
  s.order = arr;
  if (typeof playClick === 'function') playClick();
  renderRankList();
}
function rankDragEnd(e) {
  var s = rkState;
  if (s) s._drag = null;
  renderRankList();
}

function rankSubmit() {
  var s = rkState;
  if (!s || s.submitting) return;
  s.submitting = true;
  var critId = s.criterion.id;
  var order = s.order.slice();
  apiPost('/rank/score', { criterion_id: critId, order: order }).then(function(r) {
    if (!r || r.error) {
      s.submitting = false;
      toast((r && r.error) ? r.error : 'Gönderilemedi.', false);
      return;
    }
    var pts = (r.agreement === null || r.agreement === undefined) ? 100 : r.agreement;
    s.points.push(pts);
    s.history.push({
      criterion: s.criterion,
      order: order,
      consensus: r.consensus || order,
      agreement: r.agreement,
      first: !!r.first,
      submissions: r.submissions || 1,
      points: pts,
      dataPairs: r.data_pairs || 0,
      totalPairs: r.total_pairs || 0
    });
    renderRankReveal(s.history[s.history.length - 1]);
  }).catch(function() {
    s.submitting = false;
    toast('Bağlantı hatası.', false);
  });
}

function renderRankReveal(h) {
  var s = rkState;
  var ag = document.getElementById('ag');
  var isLast = s.round >= s.totalRounds;
  var medals = ['🥇', '🥈', '🥉'];

  // Kullanıcının sıralamasındaki her karakterin topluluk sırasındaki yerini bul (uyum görseli için)
  var consensusPos = {};
  h.consensus.forEach(function(id, idx){ consensusPos[String(id)] = idx; });

  var yourList = h.order.map(function(id, i) {
    var c = _rkCharById(id);
    if (!c) return '';
    var cPos = consensusPos[String(id)];
    var diff = (cPos === undefined) ? null : Math.abs(cPos - i);
    var dotColor = diff === null ? '#6a6878' : (diff === 0 ? '#3cddc7' : (diff === 1 ? '#ffb95f' : '#ff544d'));
    var badge = i < 3 ? medals[i] : (i + 1);
    return '<div style="display:flex;align-items:center;gap:10px;background:#1b1b24;border:1px solid rgba(91,64,61,0.12);border-radius:11px;padding:8px 10px;margin-bottom:7px">' +
      '<div class="fd" style="width:28px;text-align:center;font-size:18px;color:#ffb95f;flex-shrink:0">' + badge + '</div>' +
      '<div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0">' + cp(c, 40) + '</div>' +
      '<div style="flex:1;min-width:0;text-align:left;font-size:14px;font-weight:600;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.n) + ' ' + esc(c.s) + '</div>' +
      '<div title="Topluluk sırasına uzaklık" style="width:10px;height:10px;border-radius:50%;background:' + dotColor + ';flex-shrink:0"></div>' +
      '</div>';
  }).join('');

  var consList = h.consensus.map(function(id, i) {
    var c = _rkCharById(id);
    if (!c) return '';
    var badge = i < 3 ? medals[i] : (i + 1);
    return '<div style="display:flex;align-items:center;gap:10px;background:#1b1b24;border:1px solid rgba(91,64,61,0.12);border-radius:11px;padding:8px 10px;margin-bottom:7px">' +
      '<div class="fd" style="width:28px;text-align:center;font-size:18px;color:#3cddc7;flex-shrink:0">' + badge + '</div>' +
      '<div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0">' + cp(c, 40) + '</div>' +
      '<div style="flex:1;min-width:0;text-align:left;font-size:14px;font-weight:600;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.n) + ' ' + esc(c.s) + '</div>' +
      '</div>';
  }).join('');

  var headline, headColor, sub;
  if (h.first) {
    headline = '🎖️ İlk oyuncu!';
    headColor = '#ffb95f';
    sub = 'Bu beşliyi bu soruda ilk sıralayan sensin. Topluluk verisi oluşmaya başladı!';
  } else {
    headColor = h.agreement >= 70 ? '#3cddc7' : (h.agreement >= 40 ? '#ffb95f' : '#ff544d');
    headline = '%' + h.agreement + ' uyum';
    sub = 'Bu soruya toplam <b style="color:#e4e1ee">' + h.submissions + '</b> kişi oy verdi';
  }

  ag.innerHTML =
    '<div style="max-width:760px;margin:0 auto;padding:16px 16px 40px">' +
      '<div style="text-align:center;margin-bottom:16px">' +
        '<div style="font-size:34px;margin-bottom:4px">' + (h.criterion.emoji || '🏆') + '</div>' +
        '<p style="font-size:15px;color:#9a969e">' + esc(h.criterion.label) + '</p>' +
        '<div class="fd" style="font-size:clamp(40px,8vw,60px);color:' + headColor + ';line-height:1.1;margin-top:6px">' + headline + '</div>' +
        '<p style="font-size:14px;color:#9a969e;margin-top:4px">' + sub + '</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px">' +
        '<div><p style="font-size:13px;font-weight:700;color:#ffb95f;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;text-align:center">Senin Sıralaman</p>' + yourList + '</div>' +
        '<div><p style="font-size:13px;font-weight:700;color:#3cddc7;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;text-align:center">Topluluk</p>' + consList + '</div>' +
      '</div>' +
      '<button class="btn bp" style="width:100%;padding:16px;font-size:17px" onclick="rankNewRound()">' + (isLast ? '🏁 Sonuçları Gör' : 'Sıradaki Tur →') + '</button>' +
    '</div>';
}

function renderRankResult() {
  var s = rkState;
  var ag = document.getElementById('ag');
  var total = s.points.reduce(function(a, b){ return a + b; }, 0);
  var avg = s.points.length ? Math.round(total / s.points.length) : 0;
  var emoji = avg >= 70 ? '🏆' : (avg >= 40 ? '👏' : '🎯');

  if (typeof curUser !== 'undefined' && curUser) {
    apiSaveScore('RANK', avg, 100).then(function(r){
      if (r && r.best_score !== undefined) { curUser.best_score = r.best_score; if (typeof renderNav === 'function') renderNav(); }
    }).catch(function(){});
  }

  var rows = s.history.map(function(h, i) {
    var col = h.first ? '#ffb95f' : (h.points >= 70 ? '#3cddc7' : (h.points >= 40 ? '#ffb95f' : '#ff544d'));
    var label = h.first ? 'İlk oyuncu' : ('%' + h.agreement + ' uyum');
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:10px;padding:10px 14px;margin-bottom:7px">' +
      '<div style="display:flex;align-items:center;gap:10px;min-width:0"><span style="font-size:18px;flex-shrink:0">' + (h.criterion.emoji || '🏆') + '</span><span style="font-size:14px;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(h.criterion.label) + '</span></div>' +
      '<div style="display:flex;align-items:center;gap:12px;flex-shrink:0"><span style="font-size:13px;color:' + col + ';font-weight:700">' + label + '</span><span class="fd" style="font-size:20px;color:' + col + '">+' + h.points + '</span></div>' +
      '</div>';
  }).join('');

  ag.innerHTML =
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
      '<div class="cg sci" id="rank-box" style="text-align:center;padding:44px 32px;max-width:680px;width:100%;position:relative;overflow:hidden">' +
        '<div style="font-size:90px;margin-bottom:8px;animation:crownDrop .6s ease both">' + emoji + '</div>' +
        '<h2 class="fd" style="font-size:42px;font-weight:700">Sonuç</h2>' +
        '<p style="font-size:18px;color:#9a969e;margin-top:6px">' + s.totalRounds + ' turda topluluğa <b style="color:#ffb95f">%' + avg + '</b> uyum</p>' +
        '<div class="fd" style="font-size:64px;margin:16px 0;color:' + (avg >= 70 ? '#3cddc7' : (avg >= 40 ? '#ffb95f' : '#ff544d')) + '">' + total + ' <span style="font-size:28px;color:#6a6878">puan</span></div>' +
        '<div style="margin:18px 0;text-align:left">' + rows + '</div>' +
        '<div style="display:flex;justify-content:center;gap:12px;margin-top:24px;flex-wrap:wrap">' +
          '<button class="btn bp" onclick="rankStart()">🔄 Tekrar Oyna</button>' +
          '<button onclick="shareResultCard({gameName:\'Karakter Sırala\',gameEmoji:\'🎯\',username:\'' + (typeof curUser !== 'undefined' && curUser ? esc(curUser.username) : 'Oyuncu') + '\',score:' + avg + ',total:100})" style="padding:14px 32px;border-radius:14px;border:2px solid rgba(255,84,77,0.3);background:linear-gradient(135deg,rgba(255,84,77,0.1),rgba(192,132,252,0.1));color:#ffb4ac;font-size:18px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px">📤 Paylaş</button>' +
        '</div>' +
        (typeof curUser === 'undefined' || !curUser ? '<p style="font-size:13px;color:#6a6878;margin-top:16px">Skorunu kaydetmek ve sıralamaya girmek için <a style="color:#ffb4ac;cursor:pointer;text-decoration:underline" onclick="go(\'login\')">giriş yap</a></p>' : '') +
      '</div>' +
    '</div>';

  if (avg >= 70) {
    var box = document.getElementById('rank-box');
    var colors = ['#3cddc7', '#ffb95f', '#ff544d', '#FFB800', '#c084fc'];
    for (var i = 0; i < 25; i++) {
      var p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + (60 + Math.random() * 30) + '%;background:' + colors[i % 5] + ';animation-delay:' + Math.random() * .5 + 's;animation-duration:' + (1 + Math.random()) + 's;width:' + (4 + Math.random() * 6) + 'px;height:' + (4 + Math.random() * 6) + 'px;border-radius:' + (Math.random() > .5 ? '50%' : '2px');
      if (box) box.appendChild(p);
    }
  }
}
