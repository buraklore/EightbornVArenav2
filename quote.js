function showGameNotif(emoji,text,isGood){var old=document.getElementById("game-notif");if(old)old.remove();var n=document.createElement("div");n.id="game-notif";var bg=isGood?"rgba(60,221,199,0.15)":"rgba(255,84,77,0.15)";var border=isGood?"rgba(60,221,199,0.3)":"rgba(255,84,77,0.3)";var color=isGood?"#3cddc7":"#ff544d";n.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:"+bg+";border:2px solid "+border+";backdrop-filter:blur(12px)";n.innerHTML='<div style="font-size:48px;margin-bottom:8px">'+emoji+'</div><div style="font-size:24px;font-weight:700;color:'+color+'">'+text+'</div>';document.body.appendChild(n);setTimeout(function(){var el=document.getElementById("game-notif");if(el)el.remove()},1500)}
// ═══════════════════════════════════════════════════
// REPLİK BİL — QUOTE GUESS GAME
// ═══════════════════════════════════════════════════
let rqState = null;

function quoteStart() {
  if(!chars || chars.length === 0){toast('Veriler yükleniyor, lütfen bekleyin...',false);setTimeout(function(){go('home')},1500);return;}
  if(typeof checkBanned==="function"&&checkBanned())return;

  const withRep = chars.filter(c => c.a && c.rep && c.rep.trim());
  const sizes = [5, 10, 15, 20].filter(s => s <= withRep.length);
  const ag = document.getElementById('ag');
  
  if (withRep.length < 4) {
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="width:100px;height:100px;border-radius:24px;background:rgba(255,185,95,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(255,185,95,0.12)">💬</div>
      <h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">REPLİK BİL</h2>
      <div style="width:80px;height:4px;background:linear-gradient(90deg,#ffb95f,#ff544d);margin:0 auto 20px;border-radius:2px"></div>
      <p style="font-size:16px;color:#9a969e;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Efsane repliklerin kime ait olduğunu tahmin et!</p>
      <button style="padding:16px 48px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:14px;color:#1b1b24;border:none;cursor:pointer;box-shadow:0 0 24px rgba(255,84,77,0.25)" onclick="initQuote()">OYNA</button>
    </div>`;
    return;
  }
  
  ag.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:16px 24px;background:#1b1b24;border-radius:16px;border:1px solid rgba(91,64,61,0.08);margin-bottom:20px">
      
      <div style="background:rgba(255,185,95,0.08);width:80px;height:80px;border-radius:22px;font-size:42px;border:1px solid rgba(255,185,95,0.15)">💬</div>
      <h2 class="fd" style="font-weight:700;font-size:42px;letter-spacing:3px;color:#e4e1ee">REPLİK BİL</h2><div style="width:80px;height:4px;background:linear-gradient(90deg,#ffb95f,#ff544d);margin:8px auto;border-radius:2px"></div>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg" style="text-align:center;padding:60px 40px;max-width:1100px;width:100%">
        <div style="font-size:120px;margin-bottom:20px">💬</div>
        <h3 class="fd" style="font-size:48px;font-weight:700;letter-spacing:3px;color:#e4e1ee;margin-bottom:14px">Replik Bil</h3>
        <p style="font-size:20px;color:#9a969e;margin-bottom:10px">Repliği oku, hangi karaktere ait olduğunu tahmin et!</p>
        <p style="font-size:18px;color:#6a6878;margin-bottom:32px">${withRep.length} replikli karakter mevcut</p>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(sizes.length, 4)},1fr);gap:16px;max-width:1000px;margin:0 auto">
          ${sizes.map(s => `<div class="t-size-btn" onclick="initQuote(${s})">
              <div class="fd" style="font-size:80px;font-weight:700;color:#ffb95f">${s}</div>
              <div style="font-size:18px;color:#9a969e;margin-top:8px">soru</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

function initQuote(size) {
  if(!size) size = 999;
  const uniqueRep = chars.filter(c => c.a && c.rep && c.rep.trim()).filter((c, i, arr) => arr.findIndex(x => x.rep === c.rep) === i);
  const withRep = shuf(uniqueRep).slice(0, size);
  rqState = {
    size: withRep.length,
    questions: withRep,
    remaining: [...withRep],
    correct: [],
    wrong: [],
    picking: false,
  };
  renderQuoteCard();
}

function renderQuoteCard() {
  const s = rqState;
  if (!s || s.remaining.length === 0) { renderQuoteResult(); return; }
  s.picking = false;
  
  const c = s.remaining[0];
  const done = s.correct.length + s.wrong.length;
  const total = s.size;
  const progressPct = Math.round((done / total) * 100);
  
  // Build 4 options: 1 correct + 3 random wrong
  const others = shuf(chars.filter(x => x.a && x.id !== c.id)).slice(0, 3);
  const options = shuf([c, ...others]);
  
  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 20px">
      
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(91,64,61,0.1)">💬</div>
      <div style="flex:1">
        <h2 class="fd" style="font-weight:700;font-size:28px;letter-spacing:2px;color:#e4e1ee">REPLIK BIL</h2>
        <p style="font-size:12px;color:#6a6878">${done + 1}/${total} soru</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:24px;font-weight:700"><span style="color:#3cddc7">${s.correct.length}✓</span> <span style="color:#ffb4ac">${s.wrong.length}✗</span></div>
      </div>
    </div>
    <div style="margin:8px 20px 12px">
      <div style="height:8px;background:#1f1f28;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,#ffb95f,#ffb95f);border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center;width:100%;max-width:800px;padding:0 20px">
        <div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.08);border-radius:20px;padding:36px 32px;margin-bottom:28px">
          <div style="font-size:32px;margin-bottom:12px">💬</div>
          <p style="font-size:28px;font-weight:500;font-style:italic;color:#e4e1ee;line-height:1.4">"${esc(c.rep)}"</p>
        </div>
        <p style="font-size:18px;color:#9a969e;margin-bottom:20px">Bu replik kime ait?</p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px" id="quote-opts">
          ${options.map(o => `
            <div class="card" id="qo-${o.id}" style="cursor:pointer;padding:20px;display:flex;align-items:center;gap:16px;transition:all .3s" onclick="quoteGuess('${o.id}','${c.id}')">
              
              <div style="text-align:left">
                <div class="fd" style="font-size:20px;font-weight:600">${o.n} ${o.s}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function quoteGuess(guessId, correctId) {
  const s = rqState;
  if (!s || s.picking) return;
  s.picking = true;
  
  const c = s.remaining[0];
  const isCorrect = guessId === correctId;
  
  // Highlight correct and wrong
  document.querySelectorAll('[id^="qo-"]').forEach(el => {
    el.style.pointerEvents = 'none';
    const oid = el.id.replace('qo-', '');
    if (oid === correctId) {
      el.style.borderColor = '#3cddc7';
      el.style.background = '#3cddc712';
      el.innerHTML = '<div style="font-size:32px;margin-right:8px">✅</div>' + el.innerHTML;
    } else if (oid === guessId && !isCorrect) {
      el.style.borderColor = '#ffb4ac';
      el.style.background = '#ff544d12';
      el.style.opacity = '0.6';
      el.innerHTML = '<div style="font-size:32px;margin-right:8px">❌</div>' + el.innerHTML;
    } else {
      el.style.opacity = '0.3';
    }
  });
  
  if (isCorrect) { s.correct.push(c); showGameNotif('✅', 'Doğru! ' + c.n + ' ' + c.s, true); }
  else { s.wrong.push(c); showGameNotif('❌', 'Yanlış! Doğru: ' + c.n + ' ' + c.s, false); }
  
  s.remaining = s.remaining.filter(x => x.id !== c.id);
  
  setTimeout(() => { s.picking = false; renderQuoteCard(); }, 1800);
}

function renderQuoteResult() {
  const s = rqState;
  const pct = s.size > 0 ? Math.round((s.correct.length / s.size) * 100) : 0;
  const ag = document.getElementById('ag');
  if (curUser) { apiSaveScore('QUOTE', s.correct.length, s.size).then(function(r){ if(r.best_score!==undefined){curUser.best_score=r.best_score;renderNav()} }); }
  
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg sci" style="text-align:center;padding:48px 36px;max-width:1100px;width:100%;position:relative;overflow:hidden" id="quote-box">
        <div style="font-size:100px;margin-bottom:12px;animation:crownDrop .6s ease both">${pct >= 70 ? '🏆' : pct >= 40 ? '👏' : '😅'}</div>
        <h2 class="fd" style="font-size:44px;font-weight:700">Sonuç</h2>
        <p style="font-size:22px;color:#9a969e;margin-top:8px">${s.size} replikten <b style="color:#3cddc7">${s.correct.length}</b> doğru, <b style="color:#ffb4ac">${s.wrong.length}</b> yanlış</p>
        <div style="font-size:64px;font-weight:700;margin:20px 0;color:${pct >= 70 ? '#3cddc7' : pct >= 40 ? '#ffb95f' : '#ffb4ac'}" class="fd">%${pct}</div>
        
        ${s.correct.length > 0 ? '<div style="margin-top:20px"><p style="font-size:16px;color:#3cddc7;margin-bottom:12px">✅ Doğru</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          s.correct.map(c => '<div style="display:flex;align-items:center;gap:6px;padding:12px 20px;border-radius:12px;background:#3cddc710;border:1px solid #3cddc725;font-size:20px;font-weight:600"><div style="width:32px;height:32px;border-radius:8px;overflow:hidden">' + cp(c, 32) + '</div>' + esc(c.n) + ' ' + esc(c.s) + '</div>').join('') +
          '</div></div>' : ''}
        
        ${s.wrong.length > 0 ? '<div style="margin-top:16px"><p style="font-size:16px;color:#ffb4ac;margin-bottom:12px">❌ Yanlış</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          s.wrong.map(c => '<div style="display:flex;align-items:center;gap:6px;padding:12px 20px;border-radius:12px;background:#ff544d10;border:1px solid #ff544d25;font-size:20px;font-weight:600"><div style="width:32px;height:32px;border-radius:8px;overflow:hidden">' + cp(c, 32) + '</div>' + esc(c.n) + ' ' + esc(c.s) + '</div>').join('') +
          '</div></div>' : ''}
        
        <div style="display:flex;justify-content:center;gap:12px;margin-top:32px">
          <button class="btn bp" onclick="quoteStart()">🔄 Tekrar Oyna</button>
          <button onclick="shareResultCard({gameName:'Replik Bil',gameEmoji:'💬',username:'${curUser?esc(curUser.username):'Oyuncu'}',score:${s.correct.length},total:${s.size}})" style="padding:14px 32px;border-radius:14px;border:2px solid rgba(255,84,77,0.3);background:linear-gradient(135deg,rgba(255,84,77,0.1),rgba(192,132,252,0.1));color:#ffb4ac;font-size:18px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px">📤 Paylaş</button>
        </div>
      </div>
    </div>`;
  
  if (pct >= 70) {
    var box = document.getElementById('quote-box');
    var colors = ['#ffb95f','#ffb95f','#FFB800','#3cddc7','#ff544d'];
    for (var i = 0; i < 25; i++) {
      var p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
      box.appendChild(p);
    }
  }
}
