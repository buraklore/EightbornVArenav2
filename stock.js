// ═══════════════════════════════════════════════════
// KARAKTER BORSASI — STOCK MARKET
// Sanal hisse, günlük 100 bütçe, al/sat, haftalık sıralama
// ═══════════════════════════════════════════════════
let skState = null;

// Oyunlardan çağrılır: seçilen karakterlerin fiyatını hafifçe yükseltir (fire-and-forget, defansif)
window.stockNoteSelections = function(ids) {
  try {
    if (!ids) return;
    if (!Array.isArray(ids)) ids = [ids];
    var clean = ids.map(function(x){ return String(x); }).filter(Boolean);
    if (!clean.length || typeof apiPost !== 'function') return;
    apiPost('/stock/select', { ids: clean }).catch(function(){});
  } catch (e) {}
};

function _skMoney(n) {
  n = Number(n) || 0;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function _skChangeHtml(pct, withArrow) {
  pct = Number(pct) || 0;
  var col = pct > 0 ? '#3cddc7' : (pct < 0 ? '#ff544d' : '#9a969e');
  var arrow = withArrow ? (pct > 0 ? '▲ ' : (pct < 0 ? '▼ ' : '')) : '';
  var sign = pct > 0 ? '+' : '';
  return '<span style="color:' + col + ';font-weight:700">' + arrow + sign + pct.toFixed(2) + '%</span>';
}
function _skCharObj(row) {
  var sid = String(row.char_id);
  var local = chars.find(function(c){ return String(c.dbId || c.id) === sid; });
  if (local) return local;
  return { id: sid, n: row.name || 'Karakter', s: row.surname || '', g: row.gender || 'M', img: row.img || '', tip: row.tip || '' };
}

function stockStart() {
  if (typeof checkBanned === 'function' && checkBanned()) return;
  var ag = document.getElementById('ag');
  var loggedIn = (typeof curUser !== 'undefined' && curUser);
  function feat(emoji, title, desc) {
    return '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.15);border-radius:14px;padding:18px 16px;text-align:center">' +
      '<div style="font-size:34px;margin-bottom:8px">' + emoji + '</div>' +
      '<div style="font-size:15px;font-weight:700;color:#e4e1ee;margin-bottom:4px">' + title + '</div>' +
      '<div style="font-size:13px;color:#9a969e;line-height:1.5">' + desc + '</div>' +
    '</div>';
  }
  function step(n, txt) {
    return '<div style="display:flex;align-items:center;gap:12px">' +
      '<div class="fd" style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#3cddc7,#60a5fa);color:#0d0d14;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + n + '</div>' +
      '<div style="font-size:14px;color:#cfcdd6;line-height:1.5;text-align:left">' + txt + '</div>' +
    '</div>';
  }
  ag.innerHTML =
    '<div style="max-width:880px;margin:0 auto;padding:32px 20px 56px">' +
      '<div style="text-align:center;margin-bottom:32px">' +
        '<div style="width:100px;height:100px;border-radius:24px;background:rgba(60,221,199,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 22px;border:1px solid rgba(60,221,199,0.15)">📈</div>' +
        '<h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">KARAKTER BORSASI</h2>' +
        '<div style="width:80px;height:4px;background:linear-gradient(90deg,#3cddc7,#60a5fa);margin:0 auto 20px;border-radius:2px"></div>' +
        '<p style="font-size:17px;color:#9a969e;max-width:600px;margin:0 auto;line-height:1.7">Karakterlerin <b style="color:#3cddc7">sanal hisselerini</b> al-sat. Ucuzken al, değerlenince sat, portföyünü büyüt ve şehrin en zengin yatırımcısı ol!</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:32px">' +
        feat('🪙', 'Her Gün 100 Coin', 'Giriş yapınca her gün otomatik bütçe hesabına eklenir.') +
        feat('📊', '200+ Karakter', 'Her hisse 100 Coin\'den başlar. Arz-talebe göre fiyat değişir.') +
        feat('🔥', 'Oyunlar Fiyatı Etkiler', 'Diğer oyunlarda çok seçilen karakterlerin değeri yükselir.') +
        feat('🏆', 'Haftalık Sıralama', 'Portföy değerine göre en zengin yatırımcılar listelenir.') +
      '</div>' +
      '<div style="background:#16161d;border:1px solid rgba(91,64,61,0.15);border-radius:18px;padding:26px 24px;margin-bottom:32px">' +
        '<h3 class="fd" style="font-size:22px;letter-spacing:1px;color:#e4e1ee;text-align:center;margin-bottom:20px">NASIL ÇALIŞIR?</h3>' +
        '<div style="display:flex;flex-direction:column;gap:16px;max-width:560px;margin:0 auto">' +
          step(1, '<b style="color:#e4e1ee">Piyasayı incele.</b> Karakterleri fiyata, yükselişe veya düşüşe göre sırala; aradığını ara.') +
          step(2, '<b style="color:#e4e1ee">Hisse al.</b> Bütçenle düşük gördüğün karakterlere yatırım yap. Alım fiyatı bir miktar yükseltir.') +
          step(3, '<b style="color:#e4e1ee">Değerlenmesini bekle.</b> Karakter oyunlarda popülerleştikçe veya başkaları aldıkça fiyatı artar.') +
          step(4, '<b style="color:#e4e1ee">Sat ve kâr et.</b> Yüksekken satarak Coin kazan. Portföyünü büyüt, sıralamada yüksel.') +
        '</div>' +
      '</div>' +
      '<div style="text-align:center">' +
        '<button class="btn bp" style="padding:18px 56px;font-size:19px;letter-spacing:1px;background:linear-gradient(135deg,#3cddc7,#60a5fa);border:none;color:#0d0d14;box-shadow:0 0 28px rgba(60,221,199,0.25)" onclick="stockEnter()">📈 Borsaya Gir</button>' +
        (!loggedIn ? '<p style="font-size:13px;color:#6a6878;margin-top:14px">Fiyatları girişsiz de inceleyebilirsin. İşlem yapmak ve günlük 100 Coin almak için <a style="color:#ffb4ac;cursor:pointer;text-decoration:underline" onclick="go(\'login\')">giriş yap</a>.</p>' : '') +
        '<div style="display:flex;align-items:center;gap:10px;justify-content:center;background:rgba(255,84,77,0.06);border:1px solid rgba(255,84,77,0.18);border-radius:12px;padding:12px 18px;margin:22px auto 0;max-width:560px">' +
          '<span style="font-size:18px;flex-shrink:0">⚠️</span>' +
          '<span style="font-size:13px;color:#9a969e;line-height:1.5;text-align:left">Bu tamamen <b style="color:#ffb4ac">sanal bir oyundur</b>. Coin ve hisseler gerçek değildir, <b style="color:#ffb4ac">gerçek para kazandırmaz</b> ve gerçek parayla ilişkisi yoktur.</span>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function stockEnter() {
  if (typeof checkBanned === 'function' && checkBanned()) return;
  skState = { tab: 'market', market: [], portfolio: null, sort: 'price', q: '', page: 1, loading: true };
  _skRenderShell();
  _skLoad();
}

function _skRenderShell() {
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="max-width:1180px;margin:0 auto;padding:18px 18px 56px;width:100%">' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:18px">' +
        '<span style="font-size:28px">📈</span><span class="fd" style="font-size:26px;letter-spacing:2px;color:#e4e1ee">KARAKTER BORSASI</span>' +
      '</div>' +
      '<div id="sk-tabs" style="display:flex;gap:8px;justify-content:center;margin-bottom:20px;flex-wrap:wrap"></div>' +
      '<div id="sk-body" style="min-height:240px"><div style="text-align:center;padding:60px;color:#6a6878">Borsa yükleniyor...</div></div>' +
    '</div>';
  _skRenderTabs();
}

function _skRenderTabs() {
  var el = document.getElementById('sk-tabs');
  if (!el) return;
  var tabs = [['market', '📊 Piyasa'], ['portfolio', '💼 Portföyüm'], ['leaderboard', '🏆 Sıralama']];
  el.innerHTML = tabs.map(function(t) {
    var active = skState.tab === t[0];
    return '<button onclick="stockTab(\'' + t[0] + '\')" style="padding:11px 24px;border-radius:50px;font-size:13px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:all .2s;border:1px solid ' + (active ? 'rgba(255,180,172,0.25)' : 'transparent') + ';' + (active ? 'background:#292933;color:#ffb4ac;box-shadow:0 0 15px rgba(255,180,172,0.1)' : 'background:#1b1b24;color:#6a6878') + '">' + t[1] + '</button>';
  }).join('');
}

function stockTab(t) {
  if (!skState) return;
  skState.tab = t;
  _skRenderTabs();
  _skRenderBody();
}

function _skLoad(cb) {
  var tasks = [apiGet('/stock/market')];
  var loggedIn = (typeof curUser !== 'undefined' && curUser);
  if (loggedIn) tasks.push(apiGet('/stock/portfolio'));
  Promise.all(tasks).then(function(res) {
    skState.market = (res[0] && res[0].market) ? res[0].market : [];
    if (loggedIn && res[1] && !res[1].error) {
      skState.portfolio = res[1];
      if (res[1].granted) toast('🪙 Günlük 100 Coin hesabına eklendi!');
    }
    skState.loading = false;
    if (cb) cb();
    _skRenderBody();
  }).catch(function() {
    skState.loading = false;
    var b = document.getElementById('sk-body');
    if (b) b.innerHTML = '<div style="text-align:center;padding:60px;color:#ffb4ac">Borsa yüklenemedi. Tekrar deneyin.</div>';
  });
}

function _skRenderBody() {
  if (!skState) return;
  if (skState.tab === 'market') renderStockMarket();
  else if (skState.tab === 'portfolio') renderStockPortfolio();
  else if (skState.tab === 'leaderboard') renderStockLeaderboard();
}

// ── PİYASA ──
function renderStockMarket() {
  var b = document.getElementById('sk-body');
  if (!b) return;
  var p = skState.portfolio;
  var cashBar = '';
  if (typeof curUser !== 'undefined' && curUser && p) {
    cashBar = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(135deg,rgba(255,185,95,0.08),rgba(255,84,77,0.05));border:1px solid rgba(255,185,95,0.18);border-radius:14px;padding:14px 18px;margin-bottom:16px">' +
      '<div><div style="font-size:12px;color:#6a6878;text-transform:uppercase;letter-spacing:1px;font-weight:600">Nakit</div><div class="fd" style="font-size:26px;color:#ffb95f">🪙 ' + _skMoney(p.cash) + ' Coin</div></div>' +
      '<div style="text-align:right"><div style="font-size:12px;color:#6a6878;text-transform:uppercase;letter-spacing:1px;font-weight:600">Toplam Varlık</div><div class="fd" style="font-size:26px;color:#e4e1ee">' + _skMoney(p.total) + ' Coin</div></div>' +
      '</div>';
  } else if (typeof curUser === 'undefined' || !curUser) {
    cashBar = '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.15);border-radius:14px;padding:14px 18px;margin-bottom:16px;text-align:center;font-size:14px;color:#9a969e">Fiyatları inceliyorsun. İşlem yapmak ve günlük <b style="color:#ffb95f">100 Coin</b> almak için <a style="color:#ffb4ac;cursor:pointer;text-decoration:underline" onclick="go(\'login\')">giriş yap</a>.</div>';
  }

  var sortBtns = [['price', 'En Değerli'], ['gain', 'En Çok Yükselen'], ['loss', 'En Çok Düşen'], ['name', 'İsim']];
  var controls = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">' +
    '<input id="sk-search" class="inp" placeholder="🔍 Karakter ara..." value="' + esc(skState.q) + '" style="flex:1;min-width:160px;padding:12px 16px" oninput="skState.q=this.value;skState.page=1;_skRenderMarketList()">' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">' + sortBtns.map(function(sb){
      var active = skState.sort === sb[0];
      return '<button onclick="skState.sort=\'' + sb[0] + '\';skState.page=1;renderStockMarket()" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ' + (active ? 'rgba(255,180,172,0.25)' : 'rgba(91,64,61,0.15)') + ';background:' + (active ? '#292933' : '#1b1b24') + ';color:' + (active ? '#ffb4ac' : '#6a6878') + '">' + sb[1] + '</button>';
    }).join('') + '</div>';

  b.innerHTML = cashBar + controls + '<div id="sk-market-list"></div>' +
    '<p style="text-align:center;font-size:11px;color:#4a4858;margin-top:24px">⚠️ Sanal oyun — Coin ve hisseler gerçek değildir, gerçek para kazandırmaz.</p>';
  _skRenderMarketList();
}

function _skRenderMarketList() {
  var el = document.getElementById('sk-market-list');
  if (!el) return;
  var list = skState.market.slice();
  var q = (skState.q || '').trim().toLowerCase();
  if (q) {
    list = list.filter(function(r){ return ((r.name || '') + ' ' + (r.surname || '')).toLowerCase().indexOf(q) !== -1; });
  }
  if (skState.sort === 'price') list.sort(function(a, b){ return b.price - a.price; });
  else if (skState.sort === 'gain') list.sort(function(a, b){ return b.change_pct - a.change_pct; });
  else if (skState.sort === 'loss') list.sort(function(a, b){ return a.change_pct - b.change_pct; });
  else if (skState.sort === 'name') list.sort(function(a, b){ return (a.name || '').localeCompare(b.name || '', 'tr'); });

  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#6a6878">Sonuç yok.</div>'; return; }

  // Sayfalama (sayfa başına 10)
  var per = 10;
  var totalPages = Math.max(1, Math.ceil(list.length / per));
  if (!skState.page || skState.page < 1) skState.page = 1;
  if (skState.page > totalPages) skState.page = totalPages;
  var startIdx = (skState.page - 1) * per;
  var pageItems = list.slice(startIdx, startIdx + per);

  var loggedIn = (typeof curUser !== 'undefined' && curUser);
  var grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:11px">' + pageItems.map(function(r, idx) {
    var c = _skCharObj(r);
    var globalRank = startIdx + idx + 1;
    return '<div style="display:flex;align-items:center;gap:13px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:13px;padding:11px 15px">' +
      '<div class="fd" style="width:26px;text-align:center;font-size:15px;color:#4a4858;flex-shrink:0">' + globalRank + '</div>' +
      '<div style="width:52px;height:52px;border-radius:11px;overflow:hidden;flex-shrink:0;border:1px solid rgba(91,64,61,0.2)">' + cp(c, 52) + '</div>' +
      '<div style="flex:1;min-width:0;text-align:left">' +
        '<div style="font-size:16px;font-weight:700;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.name) + ' ' + esc(r.surname || '') + '</div>' +
        '<div style="font-size:12px;color:#6a6878;margin-top:2px">' + _skChangeHtml(r.change_pct, true) + '</div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0;min-width:74px"><div class="fd" style="font-size:23px;color:#e4e1ee;line-height:1">' + _skMoney(r.price) + '</div><div style="font-size:10px;color:#6a6878;letter-spacing:.5px">COIN</div></div>' +
      '<button class="btn ' + (loggedIn ? 'bp' : 'bs') + ' bsm" style="flex-shrink:0;padding:10px 18px" onclick="' + (loggedIn ? 'stockTradeModal(\'' + esc(String(r.char_id)) + '\')' : 'go(\'login\')') + '">İşlem</button>' +
      '</div>';
  }).join('') + '</div>';

  // Sayfalama kontrolleri
  var pager = '';
  if (totalPages > 1) {
    pager = '<div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:20px">' +
      '<button onclick="stockPage(-1)" ' + (skState.page === 1 ? 'disabled' : '') + ' style="width:44px;height:44px;border-radius:11px;border:1px solid rgba(91,64,61,0.2);background:' + (skState.page === 1 ? '#16161d;color:#3a3a44' : '#292933;color:#e4e1ee') + ';cursor:' + (skState.page === 1 ? 'default' : 'pointer') + ';font-size:20px;display:flex;align-items:center;justify-content:center">‹</button>' +
      '<div style="text-align:center;min-width:150px"><div class="fd" style="font-size:18px;letter-spacing:1px;color:#e4e1ee">SAYFA ' + skState.page + ' / ' + totalPages + '</div><div style="font-size:12px;color:#6a6878">toplam ' + list.length + ' karakter</div></div>' +
      '<button onclick="stockPage(1)" ' + (skState.page === totalPages ? 'disabled' : '') + ' style="width:44px;height:44px;border-radius:11px;border:1px solid rgba(91,64,61,0.2);background:' + (skState.page === totalPages ? '#16161d;color:#3a3a44' : '#292933;color:#e4e1ee') + ';cursor:' + (skState.page === totalPages ? 'default' : 'pointer') + ';font-size:20px;display:flex;align-items:center;justify-content:center">›</button>' +
    '</div>';
  }

  el.innerHTML = grid + pager;
}

function stockPage(delta) {
  if (!skState) return;
  skState.page = (skState.page || 1) + delta;
  if (skState.page < 1) skState.page = 1;
  _skRenderMarketList();
  // Liste başına yumuşak kaydır
  var b = document.getElementById('sk-market-list');
  if (b && b.scrollIntoView) { try { b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
}

// ── PORTFÖY ──
function renderStockPortfolio() {
  var b = document.getElementById('sk-body');
  if (!b) return;
  if (typeof curUser === 'undefined' || !curUser) {
    b.innerHTML = '<div style="text-align:center;padding:60px 20px"><div style="font-size:56px;margin-bottom:16px">💼</div><p style="font-size:17px;color:#e4e1ee;margin-bottom:8px">Portföyünü görmek için giriş yap</p><p style="font-size:14px;color:#6a6878;margin-bottom:24px">Her gün 100 Coin sanal bütçe seni bekliyor.</p><button class="btn bp" onclick="go(\'login\')">Giriş Yap</button></div>';
    return;
  }
  var p = skState.portfolio;
  if (!p) { b.innerHTML = '<div style="text-align:center;padding:60px;color:#6a6878">Portföy yükleniyor...</div>'; return; }

  var wkCol = p.week_change > 0 ? '#3cddc7' : (p.week_change < 0 ? '#ff544d' : '#9a969e');
  var wkSign = p.week_change > 0 ? '+' : '';

  var summary = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
    '<div style="background:linear-gradient(135deg,rgba(255,185,95,0.08),rgba(255,84,77,0.05));border:1px solid rgba(255,185,95,0.18);border-radius:14px;padding:16px 18px">' +
      '<div style="font-size:12px;color:#6a6878;text-transform:uppercase;letter-spacing:1px;font-weight:600">Toplam Varlık</div>' +
      '<div class="fd" style="font-size:32px;color:#e4e1ee">' + _skMoney(p.total) + ' <span style="font-size:16px;color:#6a6878">Coin</span></div>' +
      '<div style="font-size:13px;margin-top:4px;color:' + wkCol + ';font-weight:700">Bu hafta: ' + wkSign + _skMoney(p.week_change) + ' Coin (' + wkSign + (p.week_change_pct).toFixed(2) + '%)</div>' +
    '</div>' +
    '<div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.15);border-radius:14px;padding:16px 18px">' +
      '<div style="font-size:12px;color:#6a6878;text-transform:uppercase;letter-spacing:1px;font-weight:600">Nakit</div>' +
      '<div class="fd" style="font-size:32px;color:#ffb95f">🪙 ' + _skMoney(p.cash) + '</div>' +
      '<div style="font-size:13px;margin-top:4px;color:#6a6878">Hisse değeri: ' + _skMoney(p.holdings_value) + ' Coin</div>' +
    '</div>' +
  '</div>';

  var holdingsHtml;
  if (!p.holdings.length) {
    holdingsHtml = '<div style="text-align:center;padding:40px 20px;background:#1b1b24;border:1px solid rgba(91,64,61,0.12);border-radius:14px"><div style="font-size:44px;margin-bottom:10px">📥</div><p style="font-size:15px;color:#9a969e;margin-bottom:6px">Henüz hissen yok</p><p style="font-size:13px;color:#6a6878;margin-bottom:18px">Piyasadan karakter hissesi al, değer kazandıkça kâr et.</p><button class="btn bp bsm" onclick="stockTab(\'market\')">📊 Piyasaya Git</button></div>';
  } else {
    holdingsHtml = '<p style="font-size:13px;font-weight:700;color:#9a969e;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Hisselerim</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:10px">' + p.holdings.map(function(h) {
      var c = _skCharObj(h);
      var pl = (h.price - h.avg_cost) * h.shares;
      var plPct = h.avg_cost > 0 ? ((h.price / h.avg_cost - 1) * 100) : 0;
      var plCol = pl > 0 ? '#3cddc7' : (pl < 0 ? '#ff544d' : '#9a969e');
      var plSign = pl > 0 ? '+' : '';
      return '<div style="display:flex;align-items:center;gap:12px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:13px;padding:10px 14px">' +
        '<div style="width:46px;height:46px;border-radius:10px;overflow:hidden;flex-shrink:0;border:1px solid rgba(91,64,61,0.2)">' + cp(c, 46) + '</div>' +
        '<div style="flex:1;min-width:0;text-align:left">' +
          '<div style="font-size:14px;font-weight:700;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.n) + ' ' + esc(c.s) + '</div>' +
          '<div style="font-size:12px;color:#6a6878">' + h.shares + ' hisse · ort. ' + _skMoney(h.avg_cost) + ' Coin</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0"><div class="fd" style="font-size:18px;color:#e4e1ee">' + _skMoney(h.value) + ' Coin</div><div style="font-size:12px;color:' + plCol + ';font-weight:700">' + plSign + _skMoney(pl) + ' (' + plSign + plPct.toFixed(1) + '%)</div></div>' +
        '<button class="btn bs bsm" style="flex-shrink:0;padding:9px 14px" onclick="stockTradeModal(\'' + esc(String(h.char_id)) + '\')">İşlem</button>' +
        '</div>';
    }).join('') + '</div>';
  }
  b.innerHTML = summary + holdingsHtml;
}

// ── SIRALAMA ──
function renderStockLeaderboard() {
  var b = document.getElementById('sk-body');
  if (!b) return;
  b.innerHTML = '<div style="text-align:center;padding:40px;color:#6a6878">Yükleniyor...</div>';

  // En çok yükselen hisseler (mevcut market verisinden)
  var movers = skState.market.slice().filter(function(r){ return r.change_pct > 0; }).sort(function(a, b){ return b.change_pct - a.change_pct; }).slice(0, 5);
  var moversHtml = '';
  if (movers.length) {
    moversHtml = '<p style="font-size:13px;font-weight:700;color:#3cddc7;text-transform:uppercase;letter-spacing:1px;margin:4px 0 10px">🔥 Günün Yükselenleri</p>' +
      '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:22px">' + movers.map(function(r) {
        var c = _skCharObj(r);
        return '<div style="flex-shrink:0;width:120px;background:#1f1f28;border:1px solid rgba(60,221,199,0.18);border-radius:13px;padding:12px;text-align:center">' +
          '<div style="width:48px;height:48px;border-radius:10px;overflow:hidden;margin:0 auto 8px">' + cp(c, 48) + '</div>' +
          '<div style="font-size:12px;font-weight:700;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.name) + '</div>' +
          '<div class="fd" style="font-size:17px;color:#e4e1ee;margin-top:2px">' + _skMoney(r.price) + ' Coin</div>' +
          '<div style="font-size:12px">' + _skChangeHtml(r.change_pct, true) + '</div>' +
          '</div>';
      }).join('') + '</div>';
  }

  apiGet('/stock/leaderboard').then(function(r) {
    var lb = (r && r.leaderboard) ? r.leaderboard : [];
    var champion = (r && r.champion) ? r.champion : '';
    var daysLeft = (r && typeof r.days_left === 'number') ? r.days_left : null;
    var cycleDays = (r && r.cycle_days) ? r.cycle_days : 15;
    var seasonBanner = '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 20px;background:linear-gradient(135deg,rgba(255,185,95,0.07),rgba(96,165,250,0.05));border:1px solid rgba(255,185,95,0.16);border-radius:14px;padding:13px 18px;margin-bottom:20px;text-align:center">';
    if (daysLeft !== null) seasonBanner += '<span style="font-size:13px;color:#9a969e">🏆 ' + cycleDays + ' günlük sezon — ' + (daysLeft > 0 ? '<b style="color:#ffb95f">' + daysLeft + ' gün</b> sonra sıfırlanır' : '<b style="color:#ffb95f">bugün sıfırlanıyor</b>') + '</span>';
    if (champion) seasonBanner += '<span style="font-size:13px;color:#9a969e">👑 Sezon şampiyonu: <b style="color:#ffd700">' + esc(champion) + '</b></span>';
    seasonBanner += '</div>';
    var head = seasonBanner + moversHtml + '<p style="font-size:13px;font-weight:700;color:#ffb4ac;text-transform:uppercase;letter-spacing:1px;margin:4px 0 10px">💰 En Zengin Yatırımcılar</p>';
    if (!lb.length) {
      b.innerHTML = head + '<div style="text-align:center;padding:48px;color:#6a6878"><div style="font-size:48px;margin-bottom:12px">📈</div>Henüz yatırımcı yok. İlk sen ol!</div>';
      return;
    }
    var rows = '<div style="overflow:hidden;border-radius:16px;background:#0d0d16">' +
      '<div style="display:grid;grid-template-columns:70px 1fr 130px 110px;padding:16px 20px;background:#292933;font-size:11px;font-weight:800;color:#ffb4ac;letter-spacing:1.5px;text-transform:uppercase"><span>SIRA</span><span>YATIRIMCI</span><span style="text-align:right">VARLIK</span><span style="text-align:right">BU HAFTA</span></div>';
    lb.forEach(function(u, i) {
      var rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      var rankBg = i === 0 ? 'background:rgba(255,180,172,.15);color:#ffb4ac' : i === 1 ? 'background:rgba(168,184,208,.1);color:#a8b8d0' : i === 2 ? 'background:rgba(205,127,50,.1);color:#cd7f32' : 'background:#1f1f28;color:#6a6878';
      var wkCol = u.week_change > 0 ? '#3cddc7' : (u.week_change < 0 ? '#ff544d' : '#6a6878');
      var wkSign = u.week_change > 0 ? '+' : '';
      var isMe = (typeof curUser !== 'undefined' && curUser && curUser.username === u.username);
      var isChamp = champion && u.username === champion;
      rows += '<div style="display:grid;grid-template-columns:70px 1fr 130px 110px;align-items:center;padding:15px 20px;border-bottom:1px solid rgba(91,64,61,0.06);' + (isMe ? 'background:rgba(255,185,95,0.06)' : '') + '">' +
        '<div><span style="display:inline-flex;width:32px;height:32px;border-radius:8px;align-items:center;justify-content:center;font-weight:700;font-size:' + (i < 3 ? '24' : '14') + 'px;' + rankBg + '">' + rankEmoji + '</span></div>' +
        '<div style="font-size:15px;font-weight:600;color:#e4e1ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (isChamp ? '<span title="Sezon şampiyonu">👑</span> ' : '') + esc(u.username) + (isMe ? ' <span style="font-size:11px;color:#ffb95f">(sen)</span>' : '') + '</div>' +
        '<div style="text-align:right;font-family:Bebas Neue,sans-serif;font-size:20px;color:#e4e1ee">' + _skMoney(u.total) + ' Coin</div>' +
        '<div style="text-align:right;font-size:13px;font-weight:700;color:' + wkCol + '">' + wkSign + (u.week_change_pct).toFixed(1) + '%</div>' +
        '</div>';
    });
    rows += '</div>';
    b.innerHTML = head + rows;
  }).catch(function() {
    b.innerHTML = moversHtml + '<div style="text-align:center;padding:40px;color:#ffb4ac">Sıralama yüklenemedi.</div>';
  });
}

// ── İŞLEM (AL/SAT) MODALI ──
function stockTradeModal(charId) {
  if (typeof curUser === 'undefined' || !curUser) { go('login'); return; }
  charId = String(charId);
  var row = skState.market.find(function(r){ return String(r.char_id) === charId; });
  if (!row) { toast('Karakter bulunamadı.', false); return; }
  var p = skState.portfolio || { cash: 0, holdings: [] };
  var holding = (p.holdings || []).find(function(h){ return String(h.char_id) === charId; });
  var owned = holding ? holding.shares : 0;
  var c = _skCharObj(row);
  skState._modalChar = charId;

  modal(
    '<h3 class="fd" style="display:flex;align-items:center;gap:10px">' +
      '<div style="width:40px;height:40px;border-radius:9px;overflow:hidden">' + cp(c, 40) + '</div>' +
      '<span>' + esc(c.n) + ' ' + esc(c.s) + '</span>' +
      '<button class="close" onclick="closeModal()">\u2715</button></h3>' +
    '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:14px">' +
      '<div style="flex:1;background:var(--bg1);border-radius:10px;padding:10px 12px;text-align:center"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">Fiyat</div><div class="fd" style="font-size:22px;color:#e4e1ee" id="sk-m-price">' + _skMoney(row.price) + ' Coin</div></div>' +
      '<div style="flex:1;background:var(--bg1);border-radius:10px;padding:10px 12px;text-align:center"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">Nakit</div><div class="fd" style="font-size:22px;color:#ffb95f" id="sk-m-cash">' + _skMoney(p.cash) + '</div></div>' +
      '<div style="flex:1;background:var(--bg1);border-radius:10px;padding:10px 12px;text-align:center"><div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px">Hissen</div><div class="fd" style="font-size:22px;color:#3cddc7" id="sk-m-owned">' + owned + '</div></div>' +
    '</div>' +
    '<div class="form-group"><label class="lbl">Adet</label>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<button class="btn bs" style="padding:10px 16px;font-size:18px" onclick="_skQty(-1)">−</button>' +
        '<input class="inp" id="sk-qty" type="number" min="1" value="1" style="text-align:center;font-size:18px" oninput="_skQtyInfo()">' +
        '<button class="btn bs" style="padding:10px 16px;font-size:18px" onclick="_skQty(1)">+</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:8px">' +
        '<button class="btn bg bsm" style="flex:1" onclick="_skQtySet(5)">5</button>' +
        '<button class="btn bg bsm" style="flex:1" onclick="_skQtySet(10)">10</button>' +
        '<button class="btn bg bsm" style="flex:1" onclick="_skQtySet(25)">25</button>' +
        '<button class="btn bg bsm" style="flex:1" onclick="_skMaxBuy()">Maks Al</button>' +
      '</div>' +
    '</div>' +
    '<div id="sk-qty-info" style="text-align:center;font-size:13px;color:var(--t2);margin-bottom:14px"></div>' +
    '<div style="display:flex;gap:10px">' +
      '<button class="btn bp" style="flex:1;padding:14px" onclick="stockDoTrade(\'buy\')">📈 AL</button>' +
      '<button class="btn" style="flex:1;padding:14px;background:#292933;color:' + (owned > 0 ? '#ff544d' : '#4a4858') + ';border:1px solid rgba(255,84,77,0.2)" ' + (owned > 0 ? '' : 'disabled') + ' onclick="stockDoTrade(\'sell\')">📉 SAT</button>' +
    '</div>'
  );
  _skQtyInfo();
}

function _skQty(delta) {
  var i = document.getElementById('sk-qty');
  if (!i) return;
  var v = parseInt(i.value) || 0;
  v = Math.max(1, v + delta);
  i.value = v;
  _skQtyInfo();
}
function _skQtySet(v) {
  var i = document.getElementById('sk-qty');
  if (i) { i.value = v; _skQtyInfo(); }
}
function _skMaxBuy() {
  var charId = skState._modalChar;
  var row = skState.market.find(function(r){ return String(r.char_id) === charId; });
  var p = skState.portfolio;
  if (!row || !p || row.price <= 0) return;
  var max = Math.floor(p.cash / row.price);
  var i = document.getElementById('sk-qty');
  if (i) { i.value = Math.max(1, max); _skQtyInfo(); }
}
function _skQtyInfo() {
  var charId = skState._modalChar;
  var row = skState.market.find(function(r){ return String(r.char_id) === charId; });
  var info = document.getElementById('sk-qty-info');
  var i = document.getElementById('sk-qty');
  if (!row || !info || !i) return;
  var qty = Math.max(1, parseInt(i.value) || 1);
  var cost = qty * row.price;
  info.innerHTML = 'Toplam: <b style="color:#e4e1ee">' + _skMoney(cost) + ' Coin</b>';
}

function stockDoTrade(side) {
  var charId = skState._modalChar;
  var i = document.getElementById('sk-qty');
  if (!charId || !i) return;
  var qty = Math.max(1, parseInt(i.value) || 1);
  apiPost('/stock/trade', { char_id: charId, side: side, shares: qty }).then(function(r) {
    if (!r || r.error) { toast((r && r.error) ? r.error : 'İşlem başarısız.', false); return; }
    if (side === 'buy') {
      toast('📈 ' + qty + ' hisse alındı! (' + _skMoney(r.cost) + ' Coin)');
      if (typeof playCorrect === 'function') playCorrect();
    } else {
      toast('📉 ' + qty + ' hisse satıldı! (' + _skMoney(r.proceeds) + ' Coin)');
      if (typeof playClick === 'function') playClick();
    }
    closeModal();
    // Piyasa + portföyü tazele, ardından aynı sekmeyi yeniden çiz
    _skLoad();
  }).catch(function() { toast('Bağlantı hatası.', false); });
}
