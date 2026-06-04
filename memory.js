// ═══════════════════════════════════════════════════
// HAFIZA OYUNU — QUIZ GAME
// ═══════════════════════════════════════════════════
let mState = null;

function memStart() {
  if(typeof checkBanned==="function"&&checkBanned())return;

  const total = memQs.length;
  const ag = document.getElementById('ag');
  if (total < 1) {
    ag.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:16px 24px;background:#1b1b24;border-radius:16px;border:1px solid rgba(91,64,61,0.08);margin-bottom:20px">
        
        <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:28px;border:1px solid rgba(255,84,77,0.1)">🧠</div>
        <h2 class="fd" style="font-weight:700;font-size:36px;letter-spacing:2px;color:#e4e1ee">EIGHTBORN MORUQ</h2>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div class="cg" style="text-align:center;padding:60px 40px;max-width:600px">
          <div style="font-size:80px;margin-bottom:16px">⚠️</div>
          <h3 class="fd" style="font-size:32px;font-weight:700">Soru Yok</h3>
          <p style="font-size:18px;color:#9a969e;margin-top:12px">Admin panelden soru ekleyin.</p>
        </div>
      </div>`;
    return;
  }
  ag.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:16px 24px;background:#1b1b24;border-radius:16px;border:1px solid rgba(91,64,61,0.08);margin-bottom:20px">
      
      <div style="width:56px;height:56px;border-radius:14px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:28px;border:1px solid rgba(255,84,77,0.1)">🧠</div>
      <h2 class="fd" style="font-weight:700;font-size:36px;letter-spacing:2px;color:#e4e1ee">EIGHTBORN MORUQ</h2>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg" style="text-align:center;padding:60px 40px;max-width:900px;width:100%">
        <div style="font-size:120px;margin-bottom:20px">🧠</div>
        <h3 class="fd" style="font-size:48px;font-weight:700;letter-spacing:3px;color:#e4e1ee;margin-bottom:14px">Eightborn Moruq</h3>
        <p style="font-size:20px;color:#9a969e;margin-bottom:12px">Toplam <b style="color:#60a5fa">${total}</b> soru seni bekliyor!</p>
        <p style="font-size:16px;color:#6a6878;margin-bottom:36px">Kaç tanesini doğru bileceksin?</p>
        <button class="btn bp" style="padding:20px 48px;font-size:22px;border-radius:16px" onclick="initMem()">🚀 Başla</button>
      </div>
    </div>`;
}

function initMem() {
  mState = {
    questions: shuf([...memQs].filter(function(q, i, arr) { return arr.findIndex(function(x) { return x.q === q.q; }) === i; })),
    current: 0,
    correct: 0,
    wrong: 0,
    answers: [],
    picking: false,
  };
  renderMemQ();
}

function renderMemQ() {
  var s = mState;
  if (!s || s.current >= s.questions.length) { renderMemResult(); return; }
  s.picking = false;
  
  var q = s.questions[s.current];
  var num = s.current + 1;
  var total = s.questions.length;
  var pct = Math.round((s.current / total) * 100);
  var ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:32px">
      <div class="hud-bar">
        <div class="hud-item"><div class="hud-label">Current XP</div><div class="hud-val accent">${s.correct * 150} / ${total * 150}</div><div style="height:4px;background:#292933;border-radius:2px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#ffb4ac,#ff544d);border-radius:2px;transition:width .5s"></div></div></div>
        <div class="hud-item"><div class="hud-label">Soru İlerleme</div><div class="hud-val teal">${num} / ${total}</div><div style="display:flex;gap:3px;margin-top:8px;justify-content:center">${Array.from({length:total},function(_,i){return '<div style="width:8px;height:8px;border-radius:50%;background:'+(i<s.current?'#3cddc7':i===s.current?'#ffb4ac':'#292933')+'"></div>';}).join('')}</div></div>
        <div class="hud-item"><div class="hud-label">Doğru</div><div class="hud-val teal">${s.correct}</div></div>
        <div class="hud-item"><div class="hud-label">Yanlış</div><div class="hud-val accent">${s.wrong}</div></div>
      </div>
      <div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.1);border-radius:20px;padding:48px 40px;margin-bottom:32px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <span style="background:#292933;padding:6px 16px;border-radius:8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#ffb4ac">SORU #${num}</span>
          
        </div>
        <p style="font-size:clamp(24px,4vw,36px);font-weight:700;color:#e4e1ee;line-height:1.4;font-family:Bebas Neue,sans-serif;letter-spacing:1px">${esc(q.q)}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" id="mem-opts">
        ${q.o.map(function(o, i) { return `
          <div class="g-opt" id="mo-${i}" onclick="memAnswer(${i})">
            <div class="opt-letter">${String.fromCharCode(65 + i)}.</div>
            <div class="opt-text">${o}</div>
          </div>
        `; }).join('')}
      </div>
    </div>`;
}

function showMemNotif(emoji, text, isGood) {
  var old = document.getElementById('mem-notif');
  if (old) old.remove();
  var n = document.createElement('div');
  n.id = 'mem-notif';
  var bg = isGood ? 'rgba(60,221,199,0.15)' : 'rgba(255,84,77,0.15)';
  var border = isGood ? 'rgba(60,221,199,0.3)' : 'rgba(255,84,77,0.3)';
  var color = isGood ? '#3cddc7' : '#ffb4ac';
  n.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:24px 48px;border-radius:20px;background:'+bg+';border:2px solid '+border+';backdrop-filter:blur(12px)';
  n.innerHTML = '<div style="font-size:48px;margin-bottom:8px">'+emoji+'</div><div style="font-size:24px;font-weight:700;color:'+color+'">'+text+'</div>';
  document.body.appendChild(n);
  setTimeout(function() { var el = document.getElementById('mem-notif'); if (el) el.remove(); }, 1200);
}

function memAnswer(idx) {
  var s = mState;
  if (!s || s.picking) return;
  s.picking = true;
  
  var q = s.questions[s.current];
  var isCorrect = idx === q.ci;
  
  // Highlight all options
  q.o.forEach(function(o, i) {
    var el = document.getElementById('mo-' + i);
    if (!el) return;
    el.style.pointerEvents = 'none';
    if (i === q.ci) {
      el.style.borderColor = '#3cddc7';
      el.style.background = '#3cddc712';
    } else if (i === idx && !isCorrect) {
      el.style.borderColor = '#ffb4ac';
      el.style.background = '#ff544d12';
      el.style.opacity = '0.6';
    } else {
      el.style.opacity = '0.3';
    }
  });
  
  if (isCorrect) { s.correct++; showMemNotif('✅', 'Doğru!', true); }
  else { s.wrong++; showMemNotif('❌', 'Yanlış! Doğru: ' + q.o[q.ci], false); }
  
  s.answers.push({ q: q, picked: idx, correct: isCorrect });
  s.current++;
  
  setTimeout(function() { s.picking = false; renderMemQ(); }, 1500);
}

function renderMemResult() {
  var s = mState;
  var total = s.questions.length;
  var pct = total > 0 ? Math.round((s.correct / total) * 100) : 0;
  
  // Save score to current user (keep best score)
  if(curUser){
    apiSaveScore('MEMORY', s.correct, total).then(function(r){ if(r.best_score!==undefined){curUser.best_score=r.best_score;curUser.games_played=r.games_played;renderNav()} })
  }
  var savedMsg = curUser ? (s.correct > (curUser.pt - s.correct + curUser.pt) ? '' : '') : '<p style="font-size:14px;color:#ffb95f;margin-top:12px">💡 Giriş yap ve skorun sıralamaya kaydedilsin!</p>';
  
  var ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg sci" style="text-align:center;padding:48px 36px;max-width:900px;width:100%;position:relative;overflow:hidden" id="mem-box">
        <div style="font-size:100px;margin-bottom:12px;animation:crownDrop .6s ease both">${pct >= 70 ? '🏆' : pct >= 40 ? '👏' : '😅'}</div>
        <h2 class="fd" style="font-size:44px;font-weight:700">Sonuç</h2>
        <p style="font-size:22px;color:#9a969e;margin-top:8px">${total} sorudan <b style="color:#3cddc7">${s.correct}</b> doğru, <b style="color:#ffb4ac">${s.wrong}</b> yanlış</p>
        <div style="font-size:80px;font-weight:700;margin:24px 0;color:${pct >= 70 ? '#3cddc7' : pct >= 40 ? '#ffb95f' : '#ffb4ac'}" class="fd">%${pct}</div>
        
        <div style="margin-top:24px;max-height:300px;overflow-y:auto;text-align:left">
          ${s.answers.map(function(a, i) {
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;margin-bottom:4px;background:' + (a.correct ? '#3cddc708' : '#ff544d08') + ';border:1px solid ' + (a.correct ? '#3cddc720' : '#ff544d20') + '"><span style="font-size:20px">' + (a.correct ? '✅' : '❌') + '</span><div style="flex:1"><div style="font-size:13px;font-weight:500">' + (i+1) + '. ' + a.q.q + '</div>' + (!a.correct ? '<div style="font-size:11px;color:#3cddc7;margin-top:2px">Doğru: ' + a.q.o[a.q.ci] + '</div>' : '') + '</div></div>';
          }).join('')}
        </div>
        
        <div style="display:flex;justify-content:center;gap:12px;margin-top:24px">
          ${curUser ? '<p style="font-size:14px;color:#3cddc7">✅ Skorun kaydedildi! (En iyi: '+curUser.best_score+'/'+total+')</p>' : '<p style="font-size:14px;color:#ffb95f">💡 Skorun kaydedilmedi — <a style="color:#ff544d;cursor:pointer;text-decoration:underline" onclick="go(\'login\')">giriş yap</a> ve sıralamaya gir!</p>'}
        </div>
        <div style="display:flex;justify-content:center;gap:12px;margin-top:16px">
          <button class="btn bp" onclick="memStart()">🔄 Tekrar Oyna</button>
          <button class="btn bs" onclick="go('lb')">🏆 Sıralama</button>
          <button onclick="shareResultCard({gameName:'Eightborn Moruq',gameEmoji:'🧠',username:'${curUser?esc(curUser.username):'Oyuncu'}',score:${s.correct},total:${total}})" style="padding:14px 32px;border-radius:14px;border:2px solid rgba(255,84,77,0.3);background:linear-gradient(135deg,rgba(255,84,77,0.1),rgba(192,132,252,0.1));color:#ffb4ac;font-size:18px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px">📤 Paylaş</button>
        </div>
      </div>
    </div>`;
  
  if (pct >= 70) {
    var box = document.getElementById('mem-box');
    var colors = ['#ff544d','#60a5fa','#3cddc7','#FFB800','#ff544d'];
    for (var i = 0; i < 25; i++) {
      var p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
      box.appendChild(p);
    }
  }
}
