// ═══════════════════════════════════════════════════
// EKİP KURMA — TEAM BUILDING GAME
// ═══════════════════════════════════════════════════
let tmState = null;

function teamStart() {
  const active = chars.filter(c => c.a);
  const sizes = [16, 32, 64, 128].filter(s => s <= active.length);
  
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="width:100px;height:100px;border-radius:24px;background:rgba(96,165,250,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(96,165,250,0.12)">👥</div>
      <h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">EKİBİNİ KUR</h2>
      <div style="width:80px;height:4px;background:linear-gradient(90deg,#60a5fa,#3cddc7);margin:0 auto 20px;border-radius:2px"></div>
      <p style="font-size:16px;color:#9a969e;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Hayalindeki 8 kişilik dream team\'i oluştur!</p>
      <button style="padding:16px 48px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:14px;color:#1b1b24;border:none;cursor:pointer;box-shadow:0 0 24px rgba(255,84,77,0.25)" onclick="initTeam()">OYNA</button>
    </div>`;
}

function initTeam(size) {
  if(!size) size = chars.filter(c=>c.a).length;
  const pool = shuf(chars.filter(c => c.a)).slice(0, size);
  tmState = {
    size: size || chars.filter(c=>c.a).length,
    pool,
    remaining: [...pool],
    team: [],
    eliminated: [],
    index: 0,
    
  };
  renderTeamCard();
}

function renderTeamCard() {
  const s = tmState;
  if (!s || s.remaining.length === 0 || s.team.length >= TEAM_MAX) { 
    // Auto-CK all remaining if team is full
    if (s && s.remaining.length > 0) {
      s.eliminated = s.eliminated.concat(s.remaining);
      s.remaining = [];
    }
    renderTeamResult(); return; 
  }
  
  const c = s.remaining[0];
  const done = s.team.length + s.eliminated.length;
  const total = s.size;
  const progressPct = Math.round((done / total) * 100);
  const teamFull = s.team.length >= TEAM_MAX;
  const ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 20px">
      
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(91,64,61,0.1)">👥</div>
      <div style="flex:1">
        <h2 class="fd" style="font-weight:700;font-size:28px;letter-spacing:2px;color:#e4e1ee">EKIBINI KUR</h2>
        <p style="font-size:12px;color:#6a6878">${done + 1}/${total} karakter</p>
      </div>
      <div style="text-align:right"><div class="fd" style="font-size:28px;font-weight:700;color:#3cddc7">${s.team.length}/${TEAM_MAX} 👥</div></div>
    </div>
    <div style="margin:8px 20px 12px">
      <div style="height:8px;background:#1f1f28;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,#60a5fa,#06b6d4);border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>
    <div style="flex:1;display:flex;gap:24px;padding:0 20px">
      <!-- LEFT: Team list -->
      <div style="width:260px;flex-shrink:0;overflow-y:auto">
        <div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.08);border-radius:16px;padding:16px;height:100%">
          <h3 class="fd" style="font-size:18px;font-weight:700;color:#3cddc7;margin-bottom:12px;display:flex;align-items:center;gap:8px">👥 Ekibin <span style="font-size:14px;color:#6a6878;font-weight:400">(${s.team.length})</span></h3>
          ${s.team.length === 0 ? '<p style="font-size:13px;color:#6a6878;text-align:center;padding:20px 0">Henüz kimse yok</p>' : 
            s.team.map((t, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:#1f1f28;margin-bottom:6px">
                <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0">${cp(t, 36)}</div>
                <div>
                  <div style="font-size:13px;font-weight:600">${t.n} ${t.s}</div>
                  
                </div>
              </div>
            `).join('')}
        </div>
      </div>
      
      <!-- CENTER: Character card -->
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="text-align:center" id="team-card-area">
          <div class="cg sci" style="padding:48px;display:inline-block;min-width:400px">
            <div style="max-width:600px;width:100%;border-radius:20px;margin:0 auto 20px;border:3px solid rgba(91,64,61,0.08);display:flex;align-items:center;justify-content:center">
              ${cp(c, 500)}
            </div>
            <h3 class="fd" style="font-size:36px;font-weight:700">${esc(c.n)} ${esc(c.s)}</h3>
            
            
            
            
            <div style="display:flex;gap:16px;margin-top:28px;justify-content:center">
              <button class="btn" style="background:#3cddc720;color:#3cddc7;border:2px solid #3cddc740;padding:16px 36px;font-size:18px;font-weight:600;border-radius:14px" onclick="teamPick('add','${c.id}')">
                👥 Ekibime Al
              </button>
              <button class="btn" style="background:#ff544d15;color:#ffb4ac;border:2px solid #ff544d30;padding:16px 36px;font-size:18px;font-weight:600;border-radius:14px" onclick="teamPick('ck','${c.id}')">
                💀 CK Ver
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- RIGHT: CK Sidebar -->
      <div style="width:260px;flex-shrink:0;overflow-y:auto">
        <div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.08);border-radius:16px;padding:16px;height:100%">
          <h3 class="fd" style="font-size:18px;font-weight:700;color:#ffb4ac;margin-bottom:12px">☠️ CK Verilenler <span style="font-size:14px;color:#6a6878;font-weight:400">(${s.eliminated.length})</span></h3>
          ${s.eliminated.length === 0 ? '<p style="font-size:13px;color:#6a6878;text-align:center;padding:20px 0">Henüz kimse yok</p>' :
            s.eliminated.map(e => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;background:#ff544d08;border:1px solid #ff544d15;margin-bottom:6px">
                <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0;filter:grayscale(1)">${cp(e, 36)}</div>
                <div style="font-size:13px;font-weight:600;color:#ffb4ac;text-decoration:line-through">${e.n} ${e.s}</div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>`;
}

function teamPick(action, charId) {
  const s = tmState;
  if (!s || Date.now() - (s.lastPick||0) < 600) return;
  s.lastPick = Date.now();
  
  const c = s.remaining.find(x => x.id == charId);
  if (!c) return;
  s.remaining = s.remaining.filter(x => x.id != charId);
  
  if (action === 'add') {
    s.team.push(c);
    if (s.team.length >= TEAM_MAX) {
      showTeamNotif('👥', c.n + ' ekibine katıldı!', 'Ekip tamamlandı!', true);
    } else {
      showTeamNotif('👥', c.n + ' ekibine katıldı!', s.team.length + '/' + TEAM_MAX, true);
    }
  } else {
    s.eliminated.push(c);
    showTeamNotif('☠️', c.n + ' ' + c.s, 'CK yedi!', false);
  }
  
  s.cooldown = true;
  setTimeout(() => renderTeamCard(), 1500);
}

function showTeamNotif(emoji, name, sub, isGood) {
  var old = document.getElementById('team-notif');
  if (old) old.remove();
  var n = document.createElement('div');
  n.id = 'team-notif';
  var bg = isGood ? 'rgba(60,221,199,0.2)' : 'rgba(255,84,77,0.2)';
  var border = isGood ? 'rgba(60,221,199,0.4)' : 'rgba(255,84,77,0.4)';
  var color = isGood ? '#3cddc7' : '#ff544d';
  n.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:'+bg+';border:2px solid '+border+';backdrop-filter:blur(12px)';
  n.innerHTML = '<div style="font-size:56px;margin-bottom:8px">'+emoji+'</div><div style="font-size:28px;font-weight:700;color:'+color+'">'+name+'</div><div style="font-size:18px;color:#9a969e;margin-top:4px">'+sub+'</div>';
  document.body.appendChild(n);
  setTimeout(function() { var el = document.getElementById('team-notif'); if (el) el.remove(); }, 1400);
}

function renderTeamResult() {
  const s = tmState;
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg sci" style="text-align:center;padding:60px 40px;max-width:1100px;width:100%;position:relative;overflow:hidden" id="team-box">
        <div style="font-size:120px;margin-bottom:16px;animation:crownDrop .6s ease both">👥</div>
        <h2 class="fd" style="font-size:48px;font-weight:700;letter-spacing:3px;color:#e4e1ee">Ekibin Hazır!</h2>
        <p style="font-size:20px;color:#9a969e;margin-top:8px">${s.size} karakterden <b style="color:#3cddc7">${s.team.length}</b> kişilik ekip kurdun</p>
        
        
        
        <div style="margin-top:28px">
          <h3 class="fd" style="font-size:24px;font-weight:600;color:#3cddc7;margin-bottom:16px">👥 Ekibin (${s.team.length})</h3>
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
            ${s.team.map(c => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;background:#3cddc710;border:1px solid #3cddc725;font-size:14px">
                <div style="width:32px;height:32px;border-radius:8px;overflow:hidden">${cp(c, 32)}</div>
                <span style="font-weight:500">${esc(c.n)} ${esc(c.s)}</span>
                
              </div>
            `).join('')}
          </div>
        </div>
        
        ${s.eliminated.length > 0 ? `
          <div style="margin-top:20px">
            <p style="font-size:14px;color:#ffb4ac;margin-bottom:10px">☠️ CK Verilenler (${s.eliminated.length})</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
              ${s.eliminated.map(c => `
                <div style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:#1f1f28;font-size:12px;opacity:.5">
                  <div style="width:20px;height:20px;border-radius:5px;overflow:hidden;filter:grayscale(.6)">${cp(c, 20)}</div>
                  <span style="text-decoration:line-through">${esc(c.n)}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
        
        <div style="display:flex;justify-content:center;gap:12px;margin-top:32px">
          <button class="btn bp" onclick="teamStart()">🔄 Yeni Oyun</button>
          
        </div>
      </div>
    </div>`;
  
  var box = document.getElementById('team-box');
  var colors = ['#60a5fa','#3cddc7','#06b6d4','#FFB800','#ff544d'];
  for (var i = 0; i < 30; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
    box.appendChild(p);
  }
}
