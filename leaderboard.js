var lbGame = 'FACE';

async function rLB(){
  var lbt = document.getElementById('lbt');
  if(!lbt) return;
  lbt.innerHTML = '<div style="max-width:100%;margin:0 auto">' +
    '<div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px">' +
    lbGameBtn('FACE', '🤔 YÜZDEN BİL') +
    lbGameBtn('MEMORY', '🧠 EIGHTBORN MORUQ') +
    lbGameBtn('QUOTE', '💬 REPLİK BİL') +
    lbGameBtn('SURVIVAL', '⚔️ EN ÇOK HAYATTA KALAN KARAKTER') +
    '</div>' +
    '<div id="lb-content" style="min-height:200px"><div style="text-align:center;padding:40px;color:#6a6878">Yükleniyor...</div></div>' +
    '</div>';
  loadLbGame(lbGame);
}

function lbGameBtn(game, label) {
  var active = lbGame === game;
  return '<button onclick="lbGame=\'' + game + '\';rLB()" class="lb-tab' + (active ? ' on' : '') + '" style="padding:12px 32px;border-radius:50px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;transition:all .2s;' + (active ? 'background:#292933;color:#ffb4ac;border:1px solid rgba(255,180,172,0.2);box-shadow:0 0 15px rgba(255,180,172,0.1)' : 'background:none;color:#6a6878') + '">' + label + '</button>';
}

async function loadLbGame(game) {
  var el = document.getElementById('lb-content');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:#6a6878">Yükleniyor...</div>';

  if (game === 'SURVIVAL') {
    var sData = await apiGet('/survival-leaderboard');
    var slb = sData.leaderboard || [];
    if (slb.length === 0) { el.innerHTML = '<div style="text-align:center;padding:48px;color:#6a6878;font-size:16px"><div style="font-size:48px;margin-bottom:12px">⚔️</div>Henüz veri yok. Kim Hayatta Kalacak oyununu oynayın!</div>'; return; }
    var h = '<div style="overflow:hidden;border-radius:16px;background:#0d0d16">';
    h += '<div style="display:grid;grid-template-columns:80px 1fr 120px;padding:20px 24px;background:#292933;border-bottom:1px solid rgba(91,64,61,0.1);font-size:11px;font-weight:800;color:#ffb4ac;letter-spacing:2px;text-transform:uppercase">';
    h += '<span>SIRALAMA</span><span>KARAKTER</span><span style="text-align:right">KAZANMA</span></div>';
    slb.forEach(function(u, i) {
      var rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      var rankBg = i === 0 ? 'background:rgba(255,180,172,.15);color:#ffb4ac' : i === 1 ? 'background:rgba(168,184,208,.1);color:#a8b8d0' : i === 2 ? 'background:rgba(205,127,50,.1);color:#cd7f32' : 'background:#1f1f28;color:#6a6878';
      h += '<div style="display:grid;grid-template-columns:80px 1fr 120px;align-items:center;padding:16px 24px;border-bottom:1px solid rgba(91,64,61,0.06)">';
      h += '<div><span style="display:inline-flex;width:32px;height:32px;border-radius:8px;align-items:center;justify-content:center;font-weight:700;font-size:' + (i < 3 ? '28' : '14') + 'px;' + rankBg + '">' + (i < 3 ? rankEmoji : (i + 1)) + '</span></div>';
      h += '<div style="font-size:16px;font-weight:600;color:#e4e1ee">' + esc(u.name) + '</div>';
      h += '<div style="text-align:right;font-family:Bebas Neue,sans-serif;font-size:24px;color:#3cddc7">' + u.wins + '</div>';
      h += '</div>';
    });
    h += '</div>';
    el.innerHTML = h;
    return;
  }
  var data = await apiGetGameLeaderboard(game);
  if (data.error) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#ffb4ac">' + esc(data.error) + '</div>'; return; }

  var lb = data.leaderboard || [];
  if (lb.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:48px;color:#6a6878;font-size:16px"><div style="font-size:48px;margin-bottom:12px">\ud83c\udfc6</div>Henüz skor yok.</div>';
    return;
  }

  var h = '<div style="overflow:hidden;border-radius:16px;background:#0d0d16">';
  h += '<div style="display:grid;grid-template-columns:80px 1fr 120px 100px;padding:20px 24px;background:#292933;border-bottom:1px solid rgba(91,64,61,0.1);font-size:11px;font-weight:800;color:#ffb4ac;letter-spacing:2px;text-transform:uppercase">';
  h += '<span>SIRALAMA</span><span>OYUNCU</span><span style="text-align:center">PUAN</span><span style="text-align:right">OYUN</span></div>';

  lb.forEach(function(u, i) {
    var rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    var rankBg = i === 0 ? 'background:rgba(255,180,172,.15);color:#ffb4ac' : i === 1 ? 'background:rgba(168,184,208,.1);color:#a8b8d0' : i === 2 ? 'background:rgba(205,127,50,.1);color:#cd7f32' : 'background:#1f1f28;color:#6a6878';
    var score = parseInt(u.total_score || u.score || 0);
    var games = parseInt(u.games_played || u.plays || 0);

    h += '<div style="display:grid;grid-template-columns:80px 1fr 120px 100px;align-items:center;padding:20px 24px;border-bottom:1px solid rgba(91,64,61,0.05);transition:background .2s" onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'\'">';
    h += '<div style="display:flex;align-items:center;gap:8px"><span style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:' + (i < 3 ? '28' : '14') + 'px;' + rankBg + '">' + (i < 3 ? rankEmoji : (i + 1)) + '</span></div>';
    h += '<div style="display:flex;align-items:center">';
    h += '<span style="font-size:15px;font-weight:600;color:#e4e1ee">' + esc(u.username) + '</span></div>';
    h += '<div style="text-align:center;font-family:Bebas Neue,sans-serif;font-size:20px;color:#e4e1ee">' + score.toLocaleString() + '</div>';
    h += '<div style="text-align:right;color:#3cddc7;font-weight:700;font-size:14px">' + games + '</div>';
    h += '</div>';
  });

  h += '</div>';
  el.innerHTML = h;
}
