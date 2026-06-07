// ═══════════════════════════════════════════════════
// 🕵️ DEDEKTİF DOSYASI — interaktif vaka çözme oyunu
// ═══════════════════════════════════════════════════
var detState = null;

function _detEnsureStyle() {
  if (typeof document === 'undefined' || document.getElementById('det-style')) return;
  var st = document.createElement('style');
  st.id = 'det-style';
  st.textContent =
    '@keyframes detFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '@keyframes detStamp{0%{opacity:0;transform:scale(1.8) rotate(-18deg)}60%{transform:scale(.92) rotate(-12deg)}100%{opacity:1;transform:scale(1) rotate(-12deg)}}' +
    '.det-fade{animation:detFade .4s ease both}' +
    '.det-mono{font-family:ui-monospace,Menlo,Consolas,monospace}' +
    '.det-folder{background:linear-gradient(135deg,#211c14,#1a1814);border:1px solid #3a3024;border-radius:14px;transition:transform .15s ease,border-color .15s ease;cursor:pointer}' +
    '.det-folder:hover{transform:translateY(-3px);border-color:#caa46a}' +
    '.det-tab{padding:12px 18px;border-radius:10px 10px 0 0;font-weight:700;font-size:15px;cursor:pointer;border:1px solid transparent;border-bottom:none;color:#9a969e;background:transparent;transition:all .15s}' +
    '.det-tab.on{background:#16140f;border-color:#3a3024;color:#e8d9b5}' +
    '.det-card{background:#16140f;border:1px solid #3a3024;border-radius:12px}' +
    '.det-ev{background:#15130e;border:1px solid #352c1f;border-left:4px solid #caa46a;border-radius:10px;transition:transform .12s}' +
    '.det-ev:hover{transform:translateX(2px)}' +
    '.det-chip{padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #3a3024;color:#bdb6a6;background:#16140f;transition:all .15s}' +
    '.det-chip.on{background:#caa46a;color:#1a1612;border-color:#caa46a}' +
    '.det-accuse{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#1b1b24;border:1px solid #3a3a46;border-radius:12px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .15s}' +
    '.det-accuse:hover{border-color:#ff544d;background:#241a1a;transform:translateY(-2px)}' +
    '.det-ov{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;animation:detFade .2s ease both}' +
    '.det-ov-box{background:#14120e;border:1px solid #3a3024;border-radius:18px;max-width:520px;width:100%;max-height:88vh;overflow-y:auto;padding:26px}' +
    '.det-stamp{display:inline-block;border:3px solid #3cdd8c;color:#3cdd8c;font-weight:800;letter-spacing:2px;padding:4px 12px;border-radius:6px;transform:rotate(-12deg);animation:detStamp .5s ease both;font-family:ui-monospace,monospace}' +
    '.det-pin{width:10px;height:10px;border-radius:50%;background:#ff544d;box-shadow:0 0 0 3px rgba(255,84,77,.2);display:inline-block}';
  (document.head || document.body).appendChild(st);
}

function _detImg(url, size) {
  size = size || 80;
  if (url) return '<img src="' + esc(url) + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:cover;border-radius:10px" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'\\ud83d\\udc64\'">';
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:10px;background:#26221a;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.45) + 'px;color:#6a6450">\ud83d\udc64</div>';
}
function _detDiff(d) {
  var m = { easy: ['Kolay', '#3cdd8c'], medium: ['Orta', '#ffb95f'], hard: ['Zor', '#ff6a63'] };
  var x = m[d] || m.easy;
  return '<span class="det-mono" style="font-size:12px;font-weight:700;letter-spacing:1px;padding:3px 10px;border-radius:6px;background:' + x[1] + '20;color:' + x[1] + ';border:1px solid ' + x[1] + '40">' + x[0].toUpperCase() + '</span>';
}
function _detCat(cat) {
  return ({
    camera: ['\ud83d\udcf9', 'Kamera Kayıtları'], phone: ['\ud83d\udcf1', 'Telefon Kayıtları'],
    gps: ['\ud83d\ude97', 'GPS Verileri'], witness: ['\ud83d\udc64', 'Tanık İfadeleri'],
    forensic: ['\ud83d\udd2c', 'Adli Bulgular'], other: ['\ud83d\uddc2\ufe0f', 'Diğer']
  })[cat] || ['\ud83d\uddc2\ufe0f', 'Diğer'];
}

// ── GİRİŞ: ZORLUK SEÇİMİ ──
function detStart() {
  if (typeof checkBanned === 'function' && checkBanned()) return;
  _detEnsureStyle();
  detState = null;
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px;color:var(--t2)">Yükleniyor...</div>';
  var statsP = (typeof curUser !== 'undefined' && curUser) ? apiGet('/detective/stats').catch(function(){ return null; }) : Promise.resolve(null);
  Promise.all([apiGet('/detective/cases').catch(function(){ return null; }), statsP]).then(function(res) {
    var data = res[0] || {}, stats = res[1] || { solved: 0, perfect: 0 };
    var counts = { easy: 0, medium: 0, hard: 0 };
    (data.cases || []).forEach(function(c) { if (counts[c.difficulty] != null) counts[c.difficulty]++; });
    renderDetDifficulty(counts, stats);
  }).catch(function() {
    ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Yüklenemedi. Tekrar deneyin.</div>';
  });
}

function renderDetDifficulty(counts, stats) {
  _detEnsureStyle();
  var ag = document.getElementById('ag');
  var diffs = [
    { k: 'easy', name: 'KOLAY', col: '#3cdd8c', icon: '\ud83d\udfe2', desc: '3 şüpheli \u00b7 4 kanıt', sub: 'Yeni başlayan dedektifler için' },
    { k: 'medium', name: 'ORTA', col: '#ffb95f', icon: '\ud83d\udfe1', desc: '5 şüpheli \u00b7 8 kanıt', sub: 'Dikkat ve eleme gerektirir' },
    { k: 'hard', name: 'ZOR', col: '#ff6a63', icon: '\ud83d\udd34', desc: '8 şüpheli \u00b7 12 kanıt', sub: 'Gerçek dedektiflere göre' }
  ];
  var cards = diffs.map(function(d) {
    var n = counts[d.k] || 0;
    return '<div class="det-folder det-fade" onclick="detPickDifficulty(\'' + d.k + '\')" style="padding:26px;cursor:pointer;border-color:' + d.col + '40">' +
      '<div style="font-size:46px;line-height:1;margin-bottom:10px">' + d.icon + '</div>' +
      '<h3 class="fd" style="font-size:30px;color:' + d.col + ';margin-bottom:4px;letter-spacing:1px">' + d.name + '</h3>' +
      '<div class="det-mono" style="font-size:12px;color:#bdb6a6;letter-spacing:1px;margin-bottom:6px">' + d.desc + '</div>' +
      '<p style="font-size:13px;color:#8a8474;margin-bottom:16px">' + d.sub + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:12px;color:#7a7568">\ud83d\udcc1 ' + n + ' vaka</span>' +
        '<span class="btn bp" style="padding:9px 20px;font-size:14px;background:' + d.col + ';color:#1a1612;border:none">BAŞLA \u2192</span>' +
      '</div>' +
    '</div>';
  }).join('');

  ag.innerHTML =
    '<div class="det-fade" style="max-width:1000px;margin:0 auto;padding:14px 18px 56px">' +
      '<div style="text-align:center;margin-bottom:10px">' +
        '<div style="font-size:54px;line-height:1">\ud83d\udd75\ufe0f</div>' +
        '<h2 class="fd" style="font-size:clamp(34px,5vw,52px);letter-spacing:1px;color:#f0e6cf">DEDEKTİF DOSYASI</h2>' +
        '<p style="color:#bdb6a6;font-size:16px;max-width:580px;margin:6px auto 0">Bir zorluk seç; sana rastgele bir vaka açılır. Kanıtları incele, şüphelileri sorgula, mantığını kullan ve <b style="color:#caa46a">gerçek suçluyu</b> bul. İlk denemede bulursan en yüksek puanı kaparsın!</p>' +
        ((typeof curUser !== 'undefined' && curUser) ? '<p class="det-mono" style="font-size:13px;color:#7a7568;margin-top:8px">Çözülen vaka: <b style="color:#3cdd8c">' + stats.solved + '</b> \u00b7 Kusursuz: <b style="color:#caa46a">' + stats.perfect + '</b></p>' : '<p style="font-size:13px;color:#7a7568;margin-top:8px">İlerlemenin kaydedilmesi için giriş yapmalısın.</p>') +
      '</div>' +
      '<div style="width:90px;height:4px;background:linear-gradient(90deg,#caa46a,#ff544d);margin:14px auto 22px;border-radius:2px"></div>' +
      _detAch(stats) +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px">' + cards + '</div>' +
    '</div>';
}

// ── ZORLUK SEÇİLDİ: RASTGELE VAKA AÇ ──
function detPickDifficulty(diff) {
  _detEnsureStyle();
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px;color:var(--t2)">Vaka hazırlanıyor...</div>';
  apiGet('/detective/by-difficulty?difficulty=' + encodeURIComponent(diff)).then(function(data) {
    if (!data || !data.case) { ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Bu zorlukta vaka bulunamadı.</div>'; return; }
    detState = {
      case: data.case,
      progress: data.progress || { attempts: 0, solved: false, done: false, tried: [] },
      reveal: data.reveal || null,
      tab: 'suspects', evCat: 'all', notes: '', difficulty: diff
    };
    if (data.all_done && typeof toast === 'function') toast('Bu zorluktaki tüm vakaları çözdün! Tekrar oynuyorsun.');
    renderDetCase();
  }).catch(function() { ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Vaka açılamadı. Tekrar deneyin.</div>'; });
}

function _detAch(stats) {
  var defs = [
    { k: 'first', i: '\ud83e\uddfe', t: 'İlk Vaka', d: '1 vaka çöz', on: stats.solved >= 1 },
    { k: 'ten', i: '\ud83d\udcc1', t: '10 Vaka', d: '10 vaka çöz', on: stats.solved >= 10 },
    { k: 'hunter', i: '\ud83e\udd15', t: 'Seri Katil Avcısı', d: '5 vaka çöz', on: stats.solved >= 5 },
    { k: 'master', i: '\ud83c\udf96\ufe0f', t: 'Dedektif Ustası', d: '20 vaka çöz', on: stats.solved >= 20 },
    { k: 'perfect', i: '\ud83d\udcaf', t: 'Kusursuz Çözüm', d: 'İlk denemede çöz', on: stats.perfect >= 1 }
  ];
  return '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:0 auto 26px;max-width:760px">' +
    defs.map(function(a) {
      return '<div title="' + esc(a.d) + '" style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;border:1px solid ' + (a.on ? '#caa46a55' : '#2a2620') + ';background:' + (a.on ? '#caa46a14' : '#14120e') + ';opacity:' + (a.on ? '1' : '.45') + '">' +
        '<span style="font-size:20px;filter:' + (a.on ? 'none' : 'grayscale(1)') + '">' + a.i + '</span>' +
        '<div><div style="font-size:13px;font-weight:700;color:' + (a.on ? '#e8d9b5' : '#7a7568') + '">' + a.t + '</div><div style="font-size:10px;color:#6a6450">' + (a.on ? 'AÇILDI' : a.d) + '</div></div>' +
      '</div>';
    }).join('') + '</div>';
}

function renderDetList(cases, stats) {
  _detEnsureStyle();
  var ag = document.getElementById('ag');
  var cards = cases.length ? cases.map(function(c) {
    var no = 'DOSYA #' + String(c.id).padStart(3, '0');
    return '<div class="det-folder det-fade" onclick="detOpenCase(' + c.id + ')" style="padding:20px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<span class="det-mono" style="font-size:13px;letter-spacing:2px;color:#caa46a">' + no + '</span>' + _detDiff(c.difficulty) +
      '</div>' +
      '<h3 class="fd" style="font-size:24px;color:#f0e6cf;margin-bottom:4px">' + esc(c.title) + '</h3>' +
      '<div class="det-mono" style="font-size:12px;color:#ff8a80;letter-spacing:1px;margin-bottom:10px">\u25a0 ' + esc(c.event_type || 'Vaka').toUpperCase() + '</div>' +
      '<p style="font-size:14px;color:#bdb6a6;line-height:1.6;margin-bottom:14px">' + esc((c.summary || '').slice(0, 120)) + ((c.summary || '').length > 120 ? '...' : '') + '</p>' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:12px;color:#7a7568">\ud83d\udc65 ' + c.suspects + ' şüpheli \u00b7 \ud83d\udd0d ' + c.evidence + ' kanıt</span>' +
        '<span class="btn bp" style="padding:8px 18px;font-size:14px;background:#caa46a;color:#1a1612;border:none">DOSYAYI AÇ \u2192</span>' +
      '</div>' +
    '</div>';
  }).join('') : '<div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--t3)">Henüz vaka eklenmemiş. Admin panelinden vaka ekleyebilirsin.</div>';

  ag.innerHTML =
    '<div class="det-fade" style="max-width:1000px;margin:0 auto;padding:14px 18px 56px">' +
      '<div style="text-align:center;margin-bottom:10px">' +
        '<div style="font-size:54px;line-height:1">\ud83d\udd75\ufe0f</div>' +
        '<h2 class="fd" style="font-size:clamp(34px,5vw,52px);letter-spacing:1px;color:#f0e6cf">DEDEKTİF DOSYASI</h2>' +
        '<p style="color:#bdb6a6;font-size:16px;max-width:560px;margin:6px auto 0">Kanıtları incele, şüphelileri sorgula, mantığını kullan ve <b style="color:#caa46a">gerçek suçluyu</b> bul. İlk denemede bulursan en yüksek puanı kaparsın!</p>' +
        ((typeof curUser !== 'undefined' && curUser) ? '<p class="det-mono" style="font-size:13px;color:#7a7568;margin-top:8px">Çözülen vaka: <b style="color:#3cdd8c">' + stats.solved + '</b> \u00b7 Kusursuz: <b style="color:#caa46a">' + stats.perfect + '</b></p>' : '') +
      '</div>' +
      '<div style="width:90px;height:4px;background:linear-gradient(90deg,#caa46a,#ff544d);margin:14px auto 22px;border-radius:2px"></div>' +
      _detAch(stats) +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">' + cards + '</div>' +
    '</div>';
}

// ── VAKA PANOSU ──
function detOpenCase(id) {
  _detEnsureStyle();
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px;color:var(--t2)">Dosya açılıyor...</div>';
  apiGet('/detective/case?id=' + id).then(function(data) {
    if (!data || !data.case) { ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Vaka bulunamadı.</div>'; return; }
    detState = {
      case: data.case,
      progress: data.progress || { attempts: 0, solved: false, done: false, tried: [] },
      reveal: data.reveal || null,
      tab: 'suspects', evCat: 'all', notes: ''
    };
    renderDetCase();
  }).catch(function() { ag.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Dosya açılamadı.</div>'; });
}

function detTab(t) { if (detState) { detState.tab = t; renderDetCase(); } }
function detEvCat(c) { if (detState) { detState.evCat = c; renderDetCase(); } }
function detSetNote(v) { if (detState) detState.notes = v; }

function _detSuspectsHtml() {
  var s = detState.case;
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">' +
    s.suspects.map(function(su) {
      return '<div class="det-card" style="padding:16px;display:flex;flex-direction:column;gap:4px">' +
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px">' +
          '<div style="position:relative">' + _detImg(su.img, 64) + '</div>' +
          '<div><div class="fd" style="font-size:18px;color:#f0e6cf">' + esc(su.name) + '</div>' +
          '<div style="font-size:12px;color:#caa46a">' + esc(su.profession || '') + '</div></div>' +
        '</div>' +
        '<p style="font-size:13px;color:#bdb6a6;line-height:1.6;margin:0">' + esc(su.background || '') + '</p>' +
      '</div>';
    }).join('') + '</div>';
}

function _detEvidenceHtml() {
  var ev = detState.case.evidence || [];
  var cats = ['all']; ev.forEach(function(e) { if (cats.indexOf(e.category) === -1) cats.push(e.category); });
  var chips = cats.map(function(c) {
    var label = c === 'all' ? '\ud83d\udcc2 Tümü' : (_detCat(c)[0] + ' ' + _detCat(c)[1]);
    return '<span class="det-chip ' + (detState.evCat === c ? 'on' : '') + '" onclick="detEvCat(\'' + c + '\')">' + label + '</span>';
  }).join('');
  var shown = ev.filter(function(e) { return detState.evCat === 'all' || e.category === detState.evCat; });
  var cards = shown.length ? shown.map(function(e) {
    var meta = _detCat(e.category);
    return '<div class="det-ev" style="padding:14px 16px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
        '<span style="font-size:18px">' + meta[0] + '</span>' +
        '<span class="det-mono" style="font-size:11px;letter-spacing:1px;color:#caa46a">' + meta[1].toUpperCase() + '</span>' +
        (e.title ? '<span style="font-size:14px;font-weight:700;color:#e8d9b5;margin-left:auto">' + esc(e.title) + '</span>' : '') +
      '</div>' +
      '<p style="font-size:14px;color:#cfc8b8;line-height:1.7;margin:0">' + esc(e.content || '') + '</p>' +
    '</div>';
  }).join('') : '<div style="padding:30px;text-align:center;color:var(--t3)">Bu kategoride kanıt yok.</div>';
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' + chips + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:12px">' + cards + '</div>';
}

function _detNotesHtml() {
  return '<div class="det-card" style="padding:16px">' +
    '<div style="font-size:13px;color:#caa46a;margin-bottom:8px">\ud83d\udcdd Dedektif Notların (sadece sana özel, sayfada tutulur)</div>' +
    '<textarea oninput="detSetNote(this.value)" placeholder="Şüpheleri, bağlantıları, çelişkileri buraya yaz..." style="width:100%;min-height:240px;background:#0f0e0a;border:1px solid #352c1f;border-radius:10px;color:#e8d9b5;font-size:15px;line-height:1.7;padding:14px;resize:vertical;outline:none;font-family:ui-monospace,monospace">' + esc(detState.notes || '') + '</textarea>' +
  '</div>';
}

function renderDetCase() {
  _detEnsureStyle();
  var s = detState, c = s.case, ag = document.getElementById('ag');
  var no = 'DOSYA #' + String(c.id).padStart(3, '0');
  var used = s.progress.attempts || 0;
  var done = s.progress.done;
  var dots = '';
  for (var i = 0; i < 3; i++) dots += '<span style="width:14px;height:14px;border-radius:50%;display:inline-block;margin:0 3px;background:' + (i < used ? '#ff544d' : 'transparent') + ';border:2px solid ' + (i < used ? '#ff544d' : '#5a5040') + '"></span>';

  var body = s.tab === 'suspects' ? _detSuspectsHtml() : (s.tab === 'evidence' ? _detEvidenceHtml() : _detNotesHtml());

  var actionBtn;
  if (done) {
    actionBtn = '<button class="btn bp" style="width:100%;padding:18px;font-size:18px;background:linear-gradient(135deg,#3cdd8c,#2bb673);border:none" onclick="detShowReveal()">\ud83d\udcc4 ÇÖZÜMÜ GÖR</button>';
  } else {
    actionBtn = '<button class="btn bp" style="width:100%;padding:18px;font-size:18px;background:linear-gradient(135deg,#ff544d,#d63a33);border:none" onclick="detPick()">\ud83d\udd0d SUÇLUYU SEÇ</button>';
  }

  ag.innerHTML =
    '<div class="det-fade" style="max-width:920px;margin:0 auto;padding:10px 18px 56px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
        '<button class="btn bg bsm" onclick="detStart()">\u2190 Zorluk Seç</button>' +
        (done ? '<span class="det-stamp" style="margin-left:auto">' + (s.progress.solved ? 'ÇÖZÜLDÜ' : 'KAPANDI') + '</span>' : '') +
      '</div>' +
      // dosya başlığı
      '<div style="background:linear-gradient(135deg,#221c14,#191712);border:1px solid #3a3024;border-radius:16px;padding:22px 24px;margin-bottom:18px;position:relative;overflow:hidden">' +
        '<div style="position:absolute;top:-10px;right:-10px;font-size:120px;opacity:.05">\ud83d\udd75\ufe0f</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
          '<span class="det-mono" style="font-size:15px;letter-spacing:3px;color:#caa46a">' + no + '</span>' + _detDiff(c.difficulty) +
        '</div>' +
        '<h2 class="fd" style="font-size:clamp(28px,4vw,42px);color:#f0e6cf;margin-bottom:8px">' + esc(c.title) + '</h2>' +
        '<div style="margin-bottom:10px"><span class="det-mono" style="font-size:12px;color:#ff8a80;letter-spacing:1px">OLAY: ' + esc(c.event_type || '').toUpperCase() + '</span></div>' +
        '<p style="font-size:16px;color:#cfc8b8;line-height:1.8;margin-bottom:12px">' + esc(c.summary || '') + '</p>' +
        '<div class="det-mono" style="font-size:13px;color:#ffb95f;border-top:1px dashed #3a3024;padding-top:10px">DURUM: ' + esc(c.status_text || 'Soruşturma sürüyor.') + '</div>' +
      '</div>' +
      // hak göstergesi
      (done ? '' : '<div style="text-align:center;margin-bottom:14px"><span style="font-size:13px;color:#9a969e">Suçlama hakkın: </span>' + dots + ' <span style="font-size:12px;color:#7a7568">(' + (3 - used) + ' hak kaldı)</span></div>') +
      // sekmeler
      '<div style="display:flex;gap:4px;border-bottom:1px solid #3a3024;margin-bottom:18px;flex-wrap:wrap">' +
        '<div class="det-tab ' + (s.tab === 'suspects' ? 'on' : '') + '" onclick="detTab(\'suspects\')">\ud83d\udd75\ufe0f ŞÜPHELİLER (' + c.suspects.length + ')</div>' +
        '<div class="det-tab ' + (s.tab === 'evidence' ? 'on' : '') + '" onclick="detTab(\'evidence\')">\ud83d\udd0d KANITLAR (' + (c.evidence || []).length + ')</div>' +
        '<div class="det-tab ' + (s.tab === 'notes' ? 'on' : '') + '" onclick="detTab(\'notes\')">\ud83d\udcdd NOTLARIM</div>' +
      '</div>' +
      '<div style="min-height:200px;margin-bottom:24px">' + body + '</div>' +
      actionBtn +
    '</div>';
}

// ── SUÇLAMA ──
function detPick() {
  var s = detState; if (!s) return;
  if (typeof curUser === 'undefined' || !curUser) { toast('Suçluyu seçmek için giriş yapmalısın!', false); if (typeof go === 'function') go('login'); return; }
  var cards = s.case.suspects.map(function(su) {
    return '<button class="det-accuse" onclick="detConfirm(' + su.id + ')">' +
      _detImg(su.img, 48) +
      '<div><div class="fd" style="font-size:17px;color:#f0e6cf">' + esc(su.name) + '</div><div style="font-size:12px;color:#caa46a">' + esc(su.profession || '') + '</div></div>' +
      '<span style="margin-left:auto;font-size:22px;color:#ff544d">\u261b</span>' +
    '</button>';
  }).join('');
  _detModal('<div style="text-align:center;margin-bottom:16px"><div style="font-size:40px">\u2696\ufe0f</div><h3 class="fd" style="font-size:26px;color:#f0e6cf">Suçluyu Seç</h3><p style="font-size:14px;color:#bdb6a6">Kararını ver. Doğru tahmin yüksek puan, yanlış tahmin -10 puandır.</p></div>' +
    cards + '<button class="btn bg" style="width:100%;padding:12px;margin-top:6px" onclick="detCloseModal()">Vazgeç</button>');
}

function detConfirm(suspectId) {
  var su = null; detState.case.suspects.forEach(function(x) { if (x.id === suspectId) su = x; });
  if (!su) return;
  _detModal('<div style="text-align:center">' +
    '<div style="font-size:40px;margin-bottom:6px">\u2757</div>' +
    '<h3 class="fd" style="font-size:24px;color:#f0e6cf;margin-bottom:8px">Emin misin?</h3>' +
    '<div style="margin:14px auto;display:flex;flex-direction:column;align-items:center;gap:8px">' + _detImg(su.img, 90) +
      '<div class="fd" style="font-size:22px;color:#ff8a80">' + esc(su.name) + '</div>' +
      '<div style="font-size:13px;color:#caa46a">' + esc(su.profession || '') + '</div></div>' +
    '<p style="font-size:14px;color:#bdb6a6;margin-bottom:18px">Bu kişiyi suçluyorsun. Karar kesindir.</p>' +
    '<div style="display:flex;gap:10px">' +
      '<button class="btn bg" style="flex:1;padding:14px" onclick="detPick()">\u2190 Geri</button>' +
      '<button class="btn bp" style="flex:1;padding:14px;background:linear-gradient(135deg,#ff544d,#d63a33);border:none" onclick="detSubmitGuess(' + suspectId + ')">Suçla \ud83d\udd28</button>' +
    '</div></div>');
}

function detSubmitGuess(suspectId) {
  detCloseModal();
  var s = detState; if (!s) return;
  apiPost('/detective/guess', { case_id: s.case.id, suspect_id: suspectId }).then(function(r) {
    if (!r || r.error) { toast((r && r.error) || 'İşlenemedi.', false); return; }
    s.progress.attempts = r.attempt_no || (s.progress.attempts + 1);
    if (r.completed) {
      s.progress.done = true; s.progress.solved = !!r.correct; s.reveal = r;
      renderDetResult(r);
    } else {
      toast('\u274c Yanlış tahmin! ' + r.delta + ' puan \u00b7 ' + r.remaining + ' hakkın kaldı.', false);
      renderDetCase();
    }
  }).catch(function() { toast('Bağlantı hatası.', false); });
}

function detShowReveal() {
  var s = detState; if (!s || !s.reveal) { toast('Çözüm bulunamadı.', false); return; }
  var r = s.reveal; r.correct = s.progress.solved;
  renderDetResult(r);
}

// ── SONUÇ EKRANI ──
function renderDetResult(r) {
  _detEnsureStyle();
  var ag = document.getElementById('ag');
  var correct = !!r.correct;
  var col = correct ? '#3cdd8c' : '#ff6a63';
  var head = correct ? '\u2705 VAKA ÇÖZÜLDÜ!' : '\u274c YANLIŞ SUÇLAMA';
  var pts = (typeof r.case_points === 'number') ? r.case_points : null;
  var key = r.key_evidence || [], red = r.misleading_evidence || [], comm = r.community || { percent: 0, total: 0 };

  function evList(arr, color) {
    if (!arr.length) return '<div style="font-size:13px;color:var(--t3)">—</div>';
    return arr.map(function(e) {
      var meta = _detCat(e.category);
      return '<div style="background:#15130e;border:1px solid ' + color + '33;border-left:3px solid ' + color + ';border-radius:8px;padding:10px 12px;margin-bottom:8px">' +
        '<div style="font-size:12px;color:' + color + ';font-weight:700;margin-bottom:3px">' + meta[0] + ' ' + (e.title ? esc(e.title) : meta[1]) + '</div>' +
        '<div style="font-size:13px;color:#cfc8b8;line-height:1.6">' + esc(e.content || '') + '</div>' +
      '</div>';
    }).join('');
  }

  ag.innerHTML =
    '<div class="det-fade" style="max-width:760px;margin:0 auto;padding:20px 18px 56px">' +
      '<div style="text-align:center;margin-bottom:22px">' +
        '<div style="font-size:64px;line-height:1">' + (correct ? '\ud83d\udd75\ufe0f' : '\ud83d\udcc1') + '</div>' +
        '<h2 class="fd" style="font-size:clamp(30px,5vw,46px);color:' + col + ';letter-spacing:1px">' + head + '</h2>' +
        (pts !== null ? '<div style="font-size:22px;font-weight:800;color:#caa46a;margin-top:4px">+' + pts + ' puan</div>' : '') +
      '</div>' +
      // gerçek suçlu
      (r.culprit ? '<div style="background:linear-gradient(135deg,#221c14,#191712);border:1px solid ' + col + '55;border-radius:16px;padding:22px;text-align:center;margin-bottom:18px">' +
        '<div class="det-mono" style="font-size:12px;letter-spacing:2px;color:#ff8a80;margin-bottom:12px">\u25a0 GERÇEK SUÇLU \u25a0</div>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px">' + _detImg(r.culprit.img, 110) +
          '<div class="fd" style="font-size:28px;color:#f0e6cf">' + esc(r.culprit.name) + '</div>' +
          '<div style="font-size:14px;color:#caa46a">' + esc(r.culprit.profession || '') + '</div></div>' +
      '</div>' : '') +
      // çözüm
      (r.solution ? '<div class="det-card" style="padding:18px 20px;margin-bottom:18px">' +
        '<div style="font-size:14px;font-weight:700;color:#caa46a;margin-bottom:8px">\ud83e\udde9 ÇÖZÜM</div>' +
        '<p style="font-size:15px;color:#cfc8b8;line-height:1.8;margin:0">' + esc(r.solution) + '</p></div>' : '') +
      // kilit + yanıltıcı kanıtlar
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">' +
        '<div class="det-card" style="padding:16px"><div style="font-size:13px;font-weight:700;color:#3cdd8c;margin-bottom:10px">\ud83d\udd11 KİLİT KANITLAR</div>' + evList(key, '#3cdd8c') + '</div>' +
        '<div class="det-card" style="padding:16px"><div style="font-size:13px;font-weight:700;color:#ff6a63;margin-bottom:10px">\ud83c\udfad YANILTICI İPUÇLARI</div>' + evList(red, '#ff6a63') + '</div>' +
      '</div>' +
      // topluluk
      '<div class="det-card" style="padding:18px 20px;margin-bottom:22px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:14px;color:#bdb6a6">\ud83d\udc65 Topluluğun <b style="color:#caa46a">%' + comm.percent + '</b>\'i seninle aynı kişiyi seçti</span>' +
          '<span style="font-size:12px;color:#7a7568">' + comm.total + ' dedektif</span>' +
        '</div>' +
        '<div style="height:10px;background:#0f0e0a;border-radius:6px;overflow:hidden"><div style="width:' + comm.percent + '%;height:100%;background:linear-gradient(90deg,#caa46a,#ff544d);border-radius:6px;transition:width .5s"></div></div>' +
      '</div>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn bp" style="padding:15px 28px;font-size:16px;background:#caa46a;color:#1a1612;border:none" onclick="detPickDifficulty(\'' + ((detState && detState.difficulty) || 'easy') + '\')">\ud83d\udd04 Aynı Zorlukta Yeni Vaka</button>' +
        '<button class="btn bg" style="padding:15px 28px;font-size:16px" onclick="detStart()">\ud83d\udcc2 Zorluk Seç</button>' +
        '<button class="btn bg" style="padding:15px 28px;font-size:16px" onclick="(typeof go===\'function\')&&go(\'lb\')">\ud83c\udfc6 Sıralama</button>' +
      '</div>' +
    '</div>';
}

// ── modal yardımcıları ──
function _detModal(inner) {
  detCloseModal();
  var ov = document.createElement('div');
  ov.id = 'det-modal'; ov.className = 'det-ov';
  ov.onclick = function(e) { if (e.target === ov) detCloseModal(); };
  ov.innerHTML = '<div class="det-ov-box">' + inner + '</div>';
  document.body.appendChild(ov);
}
function detCloseModal() { var m = document.getElementById('det-modal'); if (m) m.remove(); }
