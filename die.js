// ═══════════════════════════════════════════════════
// İLK KİM CK YER — 1v1 ELIMINATION FORMAT
// ═══════════════════════════════════════════════════
let dState = null;

function dieStart() {
  if(typeof checkBanned==="function"&&checkBanned())return;

  const active = chars.filter(c => c.a);
  const sizes = [16, 32, 64, 128].filter(s => s <= active.length);
  
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="width:100px;height:100px;border-radius:24px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(255,84,77,0.12)">⚔️</div>
      <h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">KİM HAYATTA KALACAK?</h2>
      <div style="width:80px;height:4px;background:linear-gradient(90deg,#ff544d,#3cddc7);margin:0 auto 20px;border-radius:2px"></div>
      <p style="font-size:16px;color:#9a969e;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Karakterler arenaya giriyor. Eleme turlarından geçecek, sonunda tek bir hayatta kalan olacak.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#ff544d';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initDie(16)">16 Karakter</button>
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#ff544d';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initDie(32)">32 Karakter</button>
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#ff544d';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initDie(64)">64 Karakter</button>
        <button style="padding:14px 36px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border:none;border-radius:12px;font-weight:800;font-size:14px;color:#1b1b24;cursor:pointer;box-shadow:0 0 24px rgba(255,84,77,0.25);letter-spacing:1px" onclick="initDie()">Tüm Karakterler</button>
      </div>
    </div>`;
}

function initDie(size) {
  if(!size) size = chars.filter(c=>c.a).length;
  const pool = shuf(chars.filter(c => c.a)).slice(0, size);
  dState = {
    size: pool.length,
    pool: [...pool],
    alive: [...pool],
    eliminated: [],
    matchIndex: 0,
    
  };
  nextDieMatch();
}

function nextDieMatch() {
  const s = dState;
  if (s.alive.length <= 1) { renderDieSurvivor(); return; }
  
  // Pick 2 random from alive
  const pair = pick(s.alive, 2);
  s.currentPair = pair;
  renderDieMatch();
}

function getDieStageName() {
  const rem = dState.alive.length;
  if (rem === 2) return '🏆 FİNAL — Son 2!';
  if (rem === 3) return '🔥 Son 3 kaldı!';
  if (rem === 4) return '⚡ Son 4';
  if (rem <= 8) return '💀 Son ' + rem;
  return '💀 ' + rem + ' karakter hayatta';
}

function renderDieMatch() {
  const s = dState;
  const [c1, c2] = s.currentPair;
  const rem = s.alive.length;
  const elimCount = s.eliminated.length;
  const total = s.size;
  const progressPct = Math.round((elimCount / (total - 1)) * 100);
  const ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:16px 24px;background:#1b1b24;border-radius:16px;border:1px solid rgba(91,64,61,0.08);margin-bottom:20px">
      
      <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:28px;border:1px solid rgba(255,84,77,0.1)">💀</div>
      <div style="flex:1">
        <h2 class="fd" style="font-weight:700;font-size:36px;letter-spacing:2px;color:#e4e1ee">${getDieStageName()}</h2>
        <p style="font-size:12px;color:#6a6878">Eleme ${elimCount + 1}/${total - 1}</p>
      </div>
      
    </div>
    <div style="margin:8px 0 12px">
      <div style="height:10px;background:#1f1f28;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,#ff544d,#ff544d);border-radius:3px;transition:width .5s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#6a6878;margin-top:4px">
        <span>${total} başladı</span><span>${rem} hayatta</span>
      </div>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;width:100%">
        <p style="font-size:26px;color:#ffb4ac;margin-bottom:28px;font-weight:500">☠️ Hangisi CK yiyecek? Tıkla ve ele!</p>
        <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:20px;flex-wrap:wrap" id="die-match">
          <div class="t-card sci" id="dc1" style="width:440px;padding:44px" onclick="dieKill('${c1.id}','${c2.id}')">
            <div style="max-width:600px;width:100%;border-radius:20px;margin:0 auto 14px;border:3px solid rgba(91,64,61,0.08);display:flex;align-items:center;justify-content:center;transition:all .3s">
              ${cp(c1, 500)}
            </div>
            <h3 class="fd" style="font-weight:700;font-size:34px">${esc(c1.n)} ${esc(c1.s)}</h3>
            
            
            <div style="margin-top:12px;font-size:18px;color:#ffb4ac;opacity:.5">☠️ CK'la</div>
          </div>
          <div class="t-vs fl fd" style="background:linear-gradient(135deg,#ff544d30,#ff544d10);border-color:#ff544d40">VS</div>
          <div class="t-card sci" id="dc2" style="width:440px;padding:44px;animation-delay:.1s" onclick="dieKill('${c2.id}','${c1.id}')">
            <div style="max-width:600px;width:100%;border-radius:20px;margin:0 auto 14px;border:3px solid rgba(91,64,61,0.08);display:flex;align-items:center;justify-content:center;transition:all .3s">
              ${cp(c2, 500)}
            </div>
            <h3 class="fd" style="font-weight:700;font-size:34px">${esc(c2.n)} ${esc(c2.s)}</h3>
            
            
            <div style="margin-top:12px;font-size:18px;color:#ffb4ac;opacity:.5">☠️ CK'la</div>
          </div>
        </div>
      </div>
    </div>`;
}

function dieKill(deadId, survivorId) {
  const s = dState;
  if (!s || Date.now() - (s.lastPick||0) < 600) return;
  s.lastPick = Date.now();
  
  const deadChar = s.alive.find(c => c.id == deadId);
  if (!deadChar) return;
  const survChar = s.alive.find(c => c.id == survivorId);
  

  
  // Animate dead card
  const deadEl = document.getElementById(deadId === s.currentPair[0].id ? 'dc1' : 'dc2');
  const survEl = document.getElementById(deadId === s.currentPair[0].id ? 'dc2' : 'dc1');
  
  if(deadEl) {
    deadEl.style.borderColor = '#ffb4ac';
    deadEl.style.background = '#ff544d12';
    deadEl.querySelector('div').style.borderColor = '#ffb4ac';
    deadEl.style.pointerEvents = 'none';
    const skull = document.createElement('div');
    skull.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:96px;background:rgba(10,10,15,.75);border-radius:20px;animation:sci .3s ease';
    skull.textContent = '💀';
    deadEl.appendChild(skull);
    setTimeout(() => { deadEl.style.opacity = '0'; deadEl.style.transform = 'scale(0.7) translateY(20px)'; }, 500);
  }
  if(survEl) {
    survEl.style.borderColor = '#3cddc7';
    survEl.style.background = '#3cddc708';
    survEl.style.pointerEvents = 'none';
    const crown = document.createElement('div');
    crown.style.cssText = 'position:absolute;top:-6px;left:50%;transform:translateX(-50%);font-size:24px;animation:crownDrop .4s ease both';
    crown.textContent = '✓'; crown.style.color = '#3cddc7';
    survEl.appendChild(crown);
  }
  
  // Remove existing CK notification
    var oldNotif = document.getElementById('ck-notif');
    if (oldNotif) oldNotif.remove();
    // Show centered CK notification - no movement, block clicks
    var oldNotif = document.getElementById('ck-notif');
    if (oldNotif) oldNotif.remove();
    var notif = document.createElement('div');
    notif.id = 'ck-notif';
    notif.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:rgba(255,84,77,0.2);border:2px solid rgba(255,84,77,0.4);backdrop-filter:blur(12px)';
    notif.innerHTML = '<div style="font-size:56px;margin-bottom:8px">☠️</div><div style="font-size:32px;font-weight:700;color:#ff544d">' + deadChar.n + ' ' + deadChar.s + '</div><div style="font-size:22px;color:#9a969e;margin-top:4px">CK yedi!</div>';
    document.body.appendChild(notif);
    setTimeout(function() { var n = document.getElementById('ck-notif'); if (n) n.remove(); }, 1400);
  
  setTimeout(() => {
    s.alive = s.alive.filter(c => c.id != deadId);
    s.eliminated.push(deadChar);
    nextDieMatch();
  }, 1500);
}

function renderDieSurvivor() {
  const s = dState;
  const survivor = s.alive[0];
  // Track survival win
  if(typeof apiPost==='function'){apiPost('/survival-win',{character_name:survivor.n+' '+survivor.s}).catch(function(){});}
  // Borsa: hayatta kalan karakter "seçilmiş" sayılır → fiyatı hafifçe yükselir
  if(typeof window.stockNoteSelections==='function'){window.stockNoteSelections([String(survivor.dbId||survivor.id)]);}
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center"><div class="cg sci" style="text-align:center;padding:60px 32px;max-width:1100px;width:100%;position:relative;overflow:hidden" id="surv-box">
      <div style="font-size:120px;margin-bottom:16px;animation:crownDrop .6s ease both">🏆</div>
      <p style="font-size:14px;color:#3cddc7;margin-bottom:16px;font-weight:500">Tek hayatta kalan!</p>
      <div style="max-width:500px;width:100%;border-radius:20px;margin:0 auto 16px;border:3px solid #3cddc7;box-shadow:0 0 50px #3cddc730">
        ${cp(survivor, 300)}
      </div>
      <h2 class="fd" style="font-size:52px;font-weight:700;letter-spacing:3px;color:#e4e1ee">${esc(survivor.n)} ${esc(survivor.s)}</h2>
      
      
      
      
      <div style="margin-top:16px;display:flex;gap:16px;justify-content:center;font-size:13px;color:#9a969e">
        <span>💀 ${s.size} karakter</span>
        <span>☠️ ${s.eliminated.length} düello</span>
        <span>🏆 1 hayatta kalan</span>
      </div>
      
      <div style="margin-top:24px">
        <p style="font-size:11px;color:#6a6878;margin-bottom:10px">Eleme sırası (ilk → son)</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center">
          ${s.eliminated.map((c, i) => `
            <div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:8px;background:#1f1f28;font-size:10px;opacity:${0.3 + (i / s.eliminated.length) * 0.5}">
              <span style="color:#ffb4ac">☠️</span>
              <div style="width:18px;height:18px;border-radius:5px;overflow:hidden;filter:grayscale(.6)">${cp(c, 18)}</div>
              ${esc(c.n)}
            </div>
            ${i < s.eliminated.length - 1 ? '<span style="color:#6a6878;font-size:10px">→</span>' : ''}
          `).join('')}
          <span style="color:#6a6878;font-size:10px">→</span>
          <div style="display:flex;align-items:center;gap:3px;padding:3px 10px;border-radius:8px;background:#3cddc715;border:1px solid #3cddc730;font-size:10px;color:#3cddc7;font-weight:600">
            <span>🏆</span>
            <div style="width:18px;height:18px;border-radius:5px;overflow:hidden">${cp(survivor, 18)}</div>
            ${survivor.n}
          </div>
        </div>
      </div>
      
      <div style="display:flex;justify-content:center;gap:10px;margin-top:28px">
        <button class="btn bp" onclick="dieStart()">🔄 Yeni Oyun</button>
        
      </div>
    </div></div>`;
  
  var box = document.getElementById('surv-box');
  var colors = ['#ff544d','#3cddc7','#ff544d','#FFB800','#ff544d'];
  for (var i = 0; i < 30; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
    box.appendChild(p);
  }
}
