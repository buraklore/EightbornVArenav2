function showGameNotif(emoji,text,isGood){var old=document.getElementById("game-notif");if(old)old.remove();var n=document.createElement("div");n.id="game-notif";var bg=isGood?"rgba(60,221,199,0.15)":"rgba(255,84,77,0.15)";var border=isGood?"rgba(60,221,199,0.3)":"rgba(255,84,77,0.3)";var color=isGood?"#3cddc7":"#ff544d";n.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;text-align:center;padding:28px 56px;border-radius:20px;background:"+bg+";border:2px solid "+border+";backdrop-filter:blur(12px)";n.innerHTML='<div style="font-size:48px;margin-bottom:8px">'+emoji+'</div><div style="font-size:24px;font-weight:700;color:'+color+'">'+text+'</div>';document.body.appendChild(n);setTimeout(function(){var el=document.getElementById("game-notif");if(el)el.remove()},1500)}
// ═══════════════════════════════════════════════════
// KADERİNİ SEÇ — FATE GAME
// ═══════════════════════════════════════════════════
let ftState = null;
let FATES = [
  {id:'kill',name:'Öldür',emoji:'🗡️',color:'#ff544d'},
  {id:'marry',name:'Evlen',emoji:'💍',color:'#FFB800'},
  {id:'cheat',name:'İhanet Et',emoji:'🐍',color:'#ff544d'},
  {id:'flirt',name:'Flört Et',emoji:'😏',color:'#ff544d'},
  {id:'ghost',name:'Ghostla',emoji:'👻',color:'#6B7280'},
  {id:'kiss',name:'Öp',emoji:'💋',color:'#ff544d'},
  {id:'slap',name:'Tokat At',emoji:'👋',color:'#f97316'},
  {id:'run',name:'Kaç',emoji:'🏃',color:'#3cddc7'},
];

function fateStart() {
  if(typeof checkBanned==="function"&&checkBanned())return;

  var maleCount = chars.filter(function(c){return c.a && c.g==='M'}).length;
  var femaleCount = chars.filter(function(c){return c.a && c.g==='F'}).length;

  const ag = document.getElementById('ag');
  ag.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:40px 20px;text-align:center">
      <div style="width:100px;height:100px;border-radius:24px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:52px;margin:0 auto 24px;border:1px solid rgba(255,84,77,0.12)">🎲</div>
      <h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:4px;color:#e4e1ee;margin-bottom:8px">KADERİNİ SEÇ</h2>
      <div style="width:80px;height:4px;background:linear-gradient(90deg,#ff544d,#ffb95f);margin:0 auto 20px;border-radius:2px"></div>
      <p style="font-size:16px;color:#9a969e;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Öldür, evlen, ghostla veya kaç — kaderi sen belirle!</p>
      
      <div style="margin-bottom:28px">
        <p style="font-size:14px;color:#6a6878;margin-bottom:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700">Cinsiyetiniz</p>
        <div style="display:flex;gap:12px;justify-content:center" id="fate-gender">
          <button onclick="document.querySelectorAll('#fate-gender button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(96,165,250,0.1)';this.style.borderColor='#60a5fa';this.style.color='#60a5fa';window._fateGender='M'" style="padding:14px 32px;border-radius:12px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s">👨 Erkek <span style="font-size:11px;opacity:.6">(Karşınıza kadın karakterler çıkar)</span></button>
          <button onclick="document.querySelectorAll('#fate-gender button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(255,84,77,0.1)';this.style.borderColor='#ff544d';this.style.color='#ff544d';window._fateGender='F'" style="padding:14px 32px;border-radius:12px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s">👩 Kadın <span style="font-size:11px;opacity:.6">(Karşınıza erkek karakterler çıkar)</span></button>
        </div>
      </div>

      <div style="margin-bottom:32px">
        <p style="font-size:14px;color:#6a6878;margin-bottom:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700">Karakter Sayısı</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap" id="fate-size">
          <button onclick="document.querySelectorAll('#fate-size button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(60,221,199,0.1)';this.style.borderColor='#3cddc7';this.style.color='#3cddc7';window._fateSize=16" style="padding:12px 28px;border-radius:10px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer">16</button>
          <button onclick="document.querySelectorAll('#fate-size button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(60,221,199,0.1)';this.style.borderColor='#3cddc7';this.style.color='#3cddc7';window._fateSize=32" style="padding:12px 28px;border-radius:10px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer">32</button>
          <button onclick="document.querySelectorAll('#fate-size button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(60,221,199,0.1)';this.style.borderColor='#3cddc7';this.style.color='#3cddc7';window._fateSize=64" style="padding:12px 28px;border-radius:10px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer">64</button>
          <button onclick="document.querySelectorAll('#fate-size button').forEach(function(b){b.style.background='#1f1f28';b.style.borderColor='rgba(91,64,61,0.15)';b.style.color='#9a969e'});this.style.background='rgba(60,221,199,0.1)';this.style.borderColor='#3cddc7';this.style.color='#3cddc7';window._fateSize=9999" style="padding:12px 28px;border-radius:10px;border:2px solid rgba(91,64,61,0.15);background:#1f1f28;color:#9a969e;font-size:15px;font-weight:700;cursor:pointer">Tüm Karakterler</button>
        </div>
      </div>

      <button style="padding:16px 48px;background:linear-gradient(135deg,#ffb4ac,#ff544d);border-radius:12px;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:14px;color:#1b1b24;border:none;cursor:pointer;box-shadow:0 0 24px rgba(255,84,77,0.25)" onclick="if(!window._fateGender){toast('Cinsiyet seçin!',false);return}if(!window._fateSize){toast('Karakter sayısı seçin!',false);return}initFate(window._fateGender,window._fateSize)">OYNA</button>
    </div>`;
  window._fateGender = null;
  window._fateSize = null;
}

function initFate(myGender, size) {
  const opposite = myGender === 'M' ? 'F' : 'M';
  var maxSize = size || 16;
  const pool = shuf(chars.filter(c => c.a && c.g === opposite)).slice(0, maxSize);
  
  if (pool.length < 8) {
    toast('Yeterli karşı cinsiyet karakter yok! (' + pool.length + '/8 min)', false);
    return;
  }
  
  ftState = {
    myGender,
    pool,
    remaining: [...pool],
    fates: FATES.map(f => ({...f, char: null})),
    passed: [],
    passesLeft: 3,
    lastPick: 0,
  };
  renderFateCard();
}

function fateAvailable() {
  return ftState.fates.filter(f => !f.char);
}

function fateAllDone() {
  return fateAvailable().length === 0;
}

function renderFateCard() {
  const s = ftState;
  if (!s) return;
  if (fateAllDone() || s.remaining.length === 0) { renderFateResult(); return; }
  
  const c = s.remaining[0];
  const usedCount = s.fates.filter(f => f.char).length;
  const available = fateAvailable();
  const ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 20px">
      
      <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,84,77,0.06);display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(91,64,61,0.1)">🎭</div>
      <div style="flex:1">
        <h2 class="fd" style="font-weight:700;font-size:28px;letter-spacing:2px;color:#e4e1ee">KADERINI SEÇ</h2>
        <p style="font-size:12px;color:#6a6878">${usedCount}/8 kader atandı · ${s.passesLeft} pas hakkı</p>
      </div>
      <div style="text-align:right"><div class="fd" style="font-size:24px;font-weight:700;color:#ffb4ac">${usedCount}/8 🎭</div></div>
    </div>
    <div style="flex:1;display:flex;gap:24px;padding:0 20px;overflow-y:auto">
      
      <!-- LEFT: Assigned fates -->
      <div style="width:400px;flex-shrink:0;overflow-y:auto">
        <div style="background:#1b1b24;border:1px solid rgba(91,64,61,0.08);border-radius:16px;padding:16px;height:100%">
          <h3 class="fd" style="font-size:16px;font-weight:700;color:#ffb4ac;margin-bottom:12px">🎭 Kaderler</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${s.fates.map(f => `
            <div style="padding:6px;border-radius:10px;background:${f.char ? f.color+'12' : '#1f1f28'};border:1px solid ${f.char ? f.color+'30' : 'transparent'};${!f.char?'opacity:.4':''}">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:14px">${f.emoji}</span>
                <div style="font-size:11px;font-weight:600;color:${f.char ? f.color : '#6a6878'}">${f.name}</div>
              </div>
              ${f.char ? '<div style="border-radius:8px;overflow:hidden">' + cp(f.char, 200) + '</div><div style="font-size:10px;color:#9a969e;margin-top:2px">' + f.char.n + ' ' + f.char.s + '</div>' : '<div style="font-size:9px;color:#6a6878">Boş</div>'}
            </div>
          `).join('')}
          </div>
          ${s.passed.length > 0 ? `
            <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(91,64,61,0.08)">
              <p style="font-size:11px;color:#6a6878;margin-bottom:6px">⏭️ Pas geçilenler (${s.passed.length})</p>
              ${s.passed.map(p => '<div style="font-size:11px;color:#6a6878;padding:2px 0">• ' + p.n + ' ' + p.s + '</div>').join('')}
            </div>` : ''}
        </div>
      </div>
      
      <!-- RIGHT: Character + fate buttons -->
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="text-align:center;width:100%;max-width:700px">
          <div class="cg sci" style="padding:40px;display:inline-block;min-width:420px">
            <div style="max-width:500px;width:100%;max-height:400px;border-radius:24px;margin:0 auto 16px;border:3px solid rgba(91,64,61,0.08);overflow:hidden">
              ${cp(c, 500)}
            </div>
            <h3 class="fd" style="font-size:34px;font-weight:700">${esc(c.n)} ${esc(c.s)}</h3>
            
            
            
          </div>
          
          <div style="margin-top:24px">
            <p style="font-size:16px;color:#9a969e;margin-bottom:16px">${esc(c.n)} için kaderini seç:</p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
              ${available.map(f => `
                <button class="btn" style="background:${f.color}15;color:${f.color};border:2px solid ${f.color}40;padding:14px 24px;font-size:16px;font-weight:600;border-radius:12px;min-width:140px" onclick="fatePick('${f.id}','${c.id}')">
                  ${f.emoji} ${f.name}
                </button>
              `).join('')}
            </div>
            ${s.passesLeft > 0 ? `
              <button class="btn bg" style="margin-top:16px;font-size:14px;color:#6a6878;border:1px dashed rgba(91,64,61,0.12);padding:10px 28px;border-radius:10px" onclick="fatePas('${c.id}')">
                ⏭️ Pas Geç (${s.passesLeft} hak kaldı)
              </button>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function fatePick(fateId, charId) {
  const s = ftState;
  if (!s || Date.now() - s.lastPick < 500) return;
  s.lastPick = Date.now();
  
  const c = s.remaining.find(x => x.id == charId);
  if (!c) return;
  
  const fate = s.fates.find(f => f.id === fateId);
  if (!fate || fate.char) return;
  
  fate.char = c;
  s.remaining = s.remaining.filter(x => x.id != charId);
  
  showGameNotif(fate.emoji, c.n + ' \u2192 ' + fate.name, true);
  
  setTimeout(() => renderFateCard(), 400);
}

function fatePas(charId) {
  const s = ftState;
  if (!s || Date.now() - s.lastPick < 500 || s.passesLeft <= 0) return;
  s.lastPick = Date.now();
  
  const c = s.remaining.find(x => x.id == charId);
  if (!c) return;
  
  s.passesLeft--;
  s.passed.push(c);
  s.remaining = s.remaining.filter(x => x.id != charId);
  
  showGameNotif('⏭️', c.n + ' pas geçildi! (' + s.passesLeft + ' hak kaldı)', true);
  
  setTimeout(() => renderFateCard(), 400);
}

function renderFateResult() {
  const s = ftState;
  const ag = document.getElementById('ag');
  
  ag.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center">
      <div class="cg sci" style="text-align:center;padding:48px 36px;max-width:900px;width:100%;position:relative;overflow:hidden" id="fate-box">
        <div style="font-size:100px;margin-bottom:12px;animation:crownDrop .6s ease both">🎭</div>
        <h2 class="fd" style="font-size:44px;font-weight:700">Kaderler Belirlendi!</h2>
        <p style="font-size:18px;color:#9a969e;margin-top:8px">${s.fates.filter(f=>f.char).length} kader atandı${s.passed.length > 0 ? ' · ' + s.passed.length + ' pas' : ''}</p>
        
        <div style="margin-top:28px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:700px;margin-left:auto;margin-right:auto">
          ${s.fates.filter(f => f.char).map(f => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:${f.color}10;border:1px solid ${f.color}25;text-align:left">
              <span style="font-size:32px">${f.emoji}</span>
              <div style="flex:1">
                <div style="font-size:16px;font-weight:700;color:${f.color}">${f.name}</div>
                <div style="font-size:14px;color:#e4e1ee;margin-top:2px">${f.char.n} ${f.char.s}</div>
                
              </div>
              <div style="width:100%;max-width:300px;border-radius:14px;overflow:hidden">${cp(f.char, 400)}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="display:flex;justify-content:center;gap:12px;margin-top:32px">
          <button class="btn bp" onclick="fateStart()">🔄 Tekrar Oyna</button>
          
        </div>
      </div>
    </div>`;
  
  var box = document.getElementById('fate-box');
  var colors = ['#ff544d','#ff544d','#FFB800','#ff544d','#3cddc7'];
  for (var i = 0; i < 25; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = 'left:'+Math.random()*100+'%;top:'+(60+Math.random()*30)+'%;background:'+colors[i%5]+';animation-delay:'+Math.random()*.5+'s;animation-duration:'+(1+Math.random())+'s;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;border-radius:'+(Math.random()>.5?'50%':'2px');
    box.appendChild(p);
  }
}
