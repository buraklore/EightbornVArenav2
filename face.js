function showGameNotif(emoji,text,isGood){var old=document.getElementById("game-notif");if(old)old.remove();var n=document.createElement("div");n.id="game-notif";var bg=isGood?"rgba(60,221,199,0.15)":"rgba(255,84,77,0.15)";var border=isGood?"rgba(60,221,199,0.3)":"rgba(255,84,77,0.3)";var color=isGood?"#3cddc7":"#ff544d";n.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:"+bg+";border:2px solid "+border+";backdrop-filter:blur(12px)";n.innerHTML='<div style="font-size:48px;margin-bottom:8px">'+emoji+'</div><div style="font-size:24px;font-weight:700;color:'+color+'">'+text+'</div>';document.body.appendChild(n);setTimeout(function(){var el=document.getElementById("game-notif");if(el)el.remove()},1500)}
function showGameNotif(emoji,text,isGood){var old=document.getElementById("game-notif");if(old)old.remove();var n=document.createElement("div");n.id="game-notif";var bg=isGood?"rgba(60,221,199,0.15)":"rgba(255,84,77,0.15)";var border=isGood?"rgba(60,221,199,0.3)":"rgba(255,84,77,0.3)";var color=isGood?"#3cddc7":"#ff544d";n.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:"+bg+";border:2px solid "+border+";backdrop-filter:blur(12px)";n.innerHTML='<div style="font-size:48px;margin-bottom:8px">'+emoji+'</div><div style="font-size:24px;font-weight:700;color:'+color+'">'+text+'</div>';document.body.appendChild(n);setTimeout(function(){var el=document.getElementById("game-notif");if(el)el.remove()},1500)}
// ═══════════════════════════════════════════════════
// YÜZDEN BİL — FACE GUESS GAME
// ═══════════════════════════════════════════════════
let fcState = null;

function faceStart() {
  if(typeof checkBanned==="function"&&checkBanned())return;

  const active = chars.filter(c => c.a);
  const sizes = [16, 32, 64, 128].filter(s => s <= active.length);
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="width:100px;height:100px;border-radius:24px;background:rgba(60,221,199,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(60,221,199,0.12)">🤔</div>
      <h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">YÜZDEN BİL</h2>
      <div style="width:80px;height:4px;background:linear-gradient(90deg,#3cddc7,#ff544d);margin:0 auto 20px;border-radius:2px"></div>
      <p style="font-size:16px;color:#9a969e;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Bulanık karakter fotoğraflarından isimleri tahmin et. Ne kadar iyi tanıyorsun?</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#3cddc7';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initFace(16)">16 Karakter</button>
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#3cddc7';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initFace(32)">32 Karakter</button>
        <button style="padding:14px 36px;background:#1f1f28;border:1px solid rgba(91,64,61,0.12);border-radius:12px;font-weight:800;font-size:14px;color:#e4e1ee;cursor:pointer;transition:all .2s;letter-spacing:1px" onmouseover="this.style.borderColor='#3cddc7';this.style.background='#292933'" onmouseout="this.style.borderColor='rgba(91,64,61,0.12)';this.style.background='#1f1f28'" onclick="initFace(64)">64 Karakter</button>
        <button style="padding:14px 36px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border:none;border-radius:12px;font-weight:800;font-size:14px;color:#1b1b24;cursor:pointer;box-shadow:0 0 24px rgba(255,84,77,0.25);letter-spacing:1px" onclick="initFace()">Tüm Karakterler</button>
      </div>
    </div>`;
}

function initFace(size) {
  if(!size) size = chars.filter(c=>c.a).length;
  const pool = shuf(chars.filter(c => c.a)).slice(0, size);
  fcState = {
    size: pool.length,
    pool,
    remaining: [...pool],
    score: 0,
    correct: [],
    wrong: [],
    current: 0,
    picking: false,
  };
  renderFaceCard();
}

function renderFaceCard() {
  const s = fcState;
  if (!s || s.remaining.length === 0) { renderFaceResult(); return; }
  s.picking = false;
  
  const c = s.remaining[0];
  const done = s.correct.length + s.wrong.length;
  const total = s.size;
  const progressPct = Math.round((done / total) * 100);
  const av = (c.img && c.img.startsWith('/images/')) ? c.img : (c._av || mkAv(c));
  const ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="text-align:center;width:100%;max-width:700px">
        <div style="display:inline-flex;align-items:center;gap:12px;background:#1b1b24;border:1px solid rgba(91,64,61,0.15);border-radius:50px;padding:10px 24px;margin-bottom:20px">
          <span style="font-size:20px">👁</span>
          <span class="fd" style="font-size:20px;letter-spacing:3px;color:#e4e1ee">YÜZDEN BİL</span>
          <span style="width:6px;height:6px;border-radius:50%;background:#3cddc7"></span>
          <span style="font-size:14px;color:#ff544d;font-weight:700;letter-spacing:2px">${done + 1}/${total}</span>
          <span style="font-size:18px;margin-left:8px;color:#3cddc7;font-weight:700">${s.score || s.correct.length}⭐</span>
          <span style="font-size:18px;color:#ffb4ac;font-weight:700">${s.wrong.length}✗</span>
        </div>
        <h1 class="fd" style="font-size:clamp(52px,8vw,80px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">BU KİM?</h1>
        <p style="font-size:16px;color:#6a6878;letter-spacing:3px;font-weight:600;text-transform:uppercase;margin-bottom:24px">Karakteri Tanı, Ödülü Kap!</p>
        <div id="face-photo" style="max-width:500px;width:100%;margin:0 auto 28px;position:relative;border-radius:20px;overflow:hidden;background:#0d0d14">
          <div style="position:absolute;top:16px;left:16px;width:40px;height:40px;border-top:3px solid rgba(255,180,172,0.5);border-left:3px solid rgba(255,180,172,0.5);border-radius:6px 0 0 0;z-index:2"></div>
          <div style="position:absolute;bottom:16px;right:16px;width:40px;height:40px;border-bottom:3px solid rgba(255,180,172,0.5);border-right:3px solid rgba(255,180,172,0.5);border-radius:0 0 6px 0;z-index:2"></div>
          <img src="${av}" style="width:100%;height:auto;display:block;filter:blur(6px);transition:filter .8s ease" id="face-img">
        </div>
        <div style="display:flex;gap:0;max-width:560px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid rgba(91,64,61,0.15);background:#1b1b24" id="face-input-area">
          <input class="inp" id="face-answer" placeholder="Karakter ismini yazın..." style="flex:1;font-size:20px;padding:20px 24px;border:none;background:transparent;color:#e4e1ee" onkeydown="if(event.key==='Enter')faceGuess()">
          <button style="padding:20px 36px;font-size:16px;font-weight:800;letter-spacing:2px;text-transform:uppercase;background:linear-gradient(135deg,#ffb4ac,#ff544d);color:#1b1b24;border:none;cursor:pointer;transition:opacity .2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" onclick="faceGuess()">TAHMİN ET</button>
        </div>
        <p style="font-size:14px;color:#4a4858;margin-top:16px;letter-spacing:1px">Karakterin adını yaz</p>
        <div style="display:inline-block;padding:8px 16px;border-radius:8px;background:rgba(60,221,199,0.08);margin-top:12px">
          <span style="font-size:13px;color:#3cddc7;font-weight:600">Sadece Ad = 1 Puan &nbsp;|&nbsp; Ad + Soyad = 2 Puan</span>
        </div>
      </div>
    </div>`;
  
  setTimeout(() => document.getElementById('face-answer')?.focus(), 100);
}

function faceGuess() {
  const s = fcState;
  if (!s || s.picking) return;
  
  const input = document.getElementById('face-answer');
  if (!input) return;
  const answer = input.value.trim().toLowerCase();
  if (!answer) { toast('Bir isim yaz!', false); return; }
  
  s.picking = true;
  const c = s.remaining[0];
  const correct = (c.n + ' ' + c.s).toLowerCase();
  const firstName = c.n.toLowerCase().trim();
  const fullName = (c.n + ' ' + c.s).toLowerCase().trim();
  var points = 0;
  var isCorrect = false;
  if (answer.toLowerCase().trim() === fullName || answer === correct) {
    points = 2; isCorrect = true;
  } else if (answer.toLowerCase().trim() === firstName) {
    points = 1; isCorrect = true;
  }
  
  // Reveal photo
  const img = document.getElementById('face-img');
  if (img) img.style.filter = 'blur(0px)';
  
  // Show result overlay
  const photo = document.getElementById('face-photo');
  if (photo) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + (isCorrect ? 'rgba(60,221,199,0.15)' : 'rgba(255,84,77,0.15)') + ';border-radius:28px;animation:sci .3s ease';
    overlay.innerHTML = '<div style="font-size:64px">' + (isCorrect ? '✅' : '❌') + '</div>';
    photo.appendChild(overlay);
  }
  
  // Show name
  const inputArea = document.getElementById('face-input-area');
  if (inputArea) {
    inputArea.innerHTML = '<div style="width:100%;text-align:center;padding:16px;border-radius:14px;background:' + (isCorrect ? '#3cddc715;border:1px solid #3cddc730' : '#ff544d15;border:1px solid #ff544d30') + '">' +
      '<div style="font-size:28px;font-weight:700;color:' + (isCorrect ? '#3cddc7' : '#ffb4ac') + '" class="fd">' + (isCorrect ? '✅ Doğru!' : '❌ Yanlış!') + '</div>' +
      '<div style="font-size:20px;margin-top:6px;color:#e4e1ee">' + esc(c.n) + ' ' + esc(c.s) + '</div>' +
      
      '</div>';
  }
  
  if (isCorrect) { s.correct.push(c); s.score = (s.score || 0) + points; showGameNotif('✅', (points === 2 ? 'Mükemmel! +2 Puan' : 'Doğru! +1 Puan') + ' (' + c.n + ' ' + c.s + ')', true); }
  else { s.wrong.push(c); showGameNotif('❌', 'Yanlış! Doğru: ' + c.n + ' ' + c.s, false); }
  
  s.remaining = s.remaining.filter(x => x.id !== c.id);
  
  setTimeout(() => { s.picking = false; renderFaceCard(); }, 2000);
}

function renderFaceResult() {
  const s = fcState;
  const ag = document.getElementById('ag');
  const pct = s.size > 0 ? Math.round((s.correct.length / s.size) * 100) : 0;
  if (curUser) { apiSaveScore('FACE', s.correct.length, s.size).then(function(r){ if(r.best_score!==undefined){curUser.best_score=r.best_score;renderNav()} }); }
  
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg sci" style="text-align:center;padding:48px 36px;max-width:1100px;width:100%;position:relative;overflow:hidden" id="face-box">
        <div style="font-size:100px;margin-bottom:12px;animation:crownDrop .6s ease both">${pct >= 70 ? '🏆' : pct >= 40 ? '👏' : '😅'}</div>
        <h2 class="fd" style="font-size:44px;font-weight:700">Sonuç</h2>
        <p style="font-size:22px;color:#9a969e;margin-top:8px">${s.size} karakterden <b style="color:#3cddc7">${s.correct.length}</b> doğru — <b style="color:#ffb95f">${s.score || s.correct.length}</b> puan, <b style="color:#ffb4ac">${s.wrong.length}</b> yanlış</p>
        <div style="font-size:64px;font-weight:700;margin:20px 0;color:${pct >= 70 ? '#3cddc7' : pct >= 40 ? '#ffb95f' : '#ffb4ac'}" class="fd">%${pct}</div>
        
        ${s.correct.length > 0 ? '<div style="margin-top:20px"><p style="font-size:16px;color:#3cddc7;margin-bottom:12px">✅ Doğru Bilinenler</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          s.correct.map(c => '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:#3cddc710;border:1px solid #3cddc725;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;overflow:hidden">' + cp(c, 32) + '</div>' + esc(c.n) + ' ' + esc(c.s) + '</div>').join('') +
          '</div></div>' : ''}
        
        ${s.wrong.length > 0 ? '<div style="margin-top:16px"><p style="font-size:16px;color:#ffb4ac;margin-bottom:12px">❌ Yanlış Bilinenler</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          s.wrong.map(c => '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:#ff544d10;border:1px solid #ff544d25;font-size:14px"><div style="width:32px;height:32px;border-radius:8px;overflow:hidden">' + cp(c, 32) + '</div>' + esc(c.n) + ' ' + esc(c.s) + '</div>').join('') +
          '</div></div>' : ''}
        
        <div style="display:flex;justify-content:center;gap:12px;margin-top:32px">
          <button class="btn bp" onclick="faceStart()">🔄 Tekrar Oyna</button>
          
        </div>
      </div>
    </div>`;
  
  if (pct >= 70) {
    var box = document.getElementById('face-box');
    var colors = ['#3cddc7','#3cddc7','#3cddc7','#FFB800','#ff544d'];
    for (var i = 0; i < 25; i++) {
      var p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
      box.appendChild(p);
    }
  }
}
