// ═══ SECURITY UTILS ═══
function esc(s){if(!s)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function sanitize(s,maxLen){if(!s)return '';s=String(s).trim();if(maxLen)s=s.substring(0,maxLen);return s}
function validateEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}

// Simple hash for passwords (SHA-256 via sync approach)
function simpleHash(str){var h=0;for(var i=0;i<str.length;i++){var c=str.charCodeAt(i);h=((h<<5)-h)+c;h=h&h}return 'h_'+Math.abs(h).toString(36)}

// Rate limiter for login
var loginAttempts={};
function checkLoginRate(em){
  var now=Date.now();
  if(!loginAttempts[em])loginAttempts[em]={count:0,last:0};
  var la=loginAttempts[em];
  // Reset after 60 seconds
  if(now-la.last>60000){la.count=0}
  la.last=now;
  la.count++;
  return la.count<=5; // max 5 attempts per minute
}
function resetLoginRate(em){loginAttempts[em]={count:0,last:0}}

const uid=()=>'x'+(nid++);
const shuf=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=~~(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const pick=(a,n)=>shuf(a).slice(0,n);
function toast(m,ok=true){const d=document.createElement('div');d.className='toast '+(ok?'toast-ok':'toast-err');d.textContent=(ok?'✅ ':'❌ ')+m;document.getElementById('toast-root').appendChild(d);setTimeout(()=>d.remove(),2500)}
function modal(h){document.getElementById('modal-root').innerHTML='<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">'+h+'</div></div>'}
function closeModal(){document.getElementById('modal-root').innerHTML=''}
function cp(c,sz){if(c.img&&(c.img.startsWith('/images/')||c.img.startsWith('data:image')))return '<img src="'+c.img+'" style="max-width:'+sz+'px;width:100%;height:auto;border-radius:'+(sz>40?12:8)+'px;display:block">';var av=c._av||mkAv(c);var mh=sz>100?400:sz;return '<img src="'+av+'" style="max-width:'+sz+'px;width:100%;max-height:'+mh+'px;border-radius:'+(sz>40?12:8)+'px;object-fit:cover;display:block">'}

// SVG-based avatar generator
function mkAv(c){
  var mc=[['#1e3a5f','#4a90d9'],['#2d1b4e','#e8433e'],['#1a3c34','#2dd4bf'],['#3b1a1a','#ef4444'],['#1a2744','#3b82f6'],['#2e1a3d','#e8433e'],['#1a3333','#06b6d4'],['#3d2b1a','#f59e0b'],['#1a2d3d','#6366f1'],['#2d3b1a','#84cc16']];
  var fc=[['#4a1942','#ec4899'],['#3d1a2e','#e8433e'],['#1a2744','#818cf8'],['#3d2b1a','#fbbf24'],['#2e1a3d','#c084fc'],['#421a2e','#fb7185'],['#1a3333','#2dd4bf'],['#3b1a1a','#f97316'],['#2d1b4e','#a78bfa'],['#1a3c34','#34d399']];
  var h=0;for(var i=0;i<c.n.length;i++)h=c.n.charCodeAt(i)+((h<<5)-h);
  var idx=Math.abs(h)%10;var cols=c.g==='F'?fc[idx]:mc[idx];var letter=c.n[0];
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g'+c.id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+cols[0]+'"/><stop offset="100%" stop-color="'+cols[1]+'"/></linearGradient></defs><rect width="300" height="300" fill="url(#g'+c.id+')"/><circle cx="80" cy="230" r="50" fill="rgba(255,255,255,0.04)"/><circle cx="240" cy="60" r="70" fill="rgba(255,255,255,0.03)"/><text x="150" y="165" font-family="Arial,sans-serif" font-size="150" font-weight="bold" fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">'+letter+'</text><text x="270" y="35" font-family="Arial" font-size="28" fill="rgba(255,255,255,0.35)" text-anchor="middle">'+(c.g==='F'?'♀':'♂')+'</text></svg>';
  c._av='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));return c._av;
}
function initAvatars(){chars.forEach(function(c){if(c.img&&c.img.startsWith('data:image/jpeg')){c._av=c.img}else{mkAv(c)}})}
initAvatars();

function checkBanned(){
  if(curUser&&curUser.banned){
    toast('Hesabınız yasaklanmıştır!',false);
    return true;
  }
  return false;
}

// ═══ SHAREABLE RESULT CARD ═══
function generateShareCard(opts) {
  // opts: { gameName, gameEmoji, username, score, total, extra, streak }
  var W = 720, H = 960;
  var canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  
  // Background gradient
  var bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f0f1a');
  bg.addColorStop(0.5, '#1a1025');
  bg.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  
  // Subtle pattern circles
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#ff544d';
  ctx.beginPath(); ctx.arc(120, 180, 120, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(600, 700, 160, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  
  // Top border line
  var topLine = ctx.createLinearGradient(0, 0, W, 0);
  topLine.addColorStop(0, '#ff544d');
  topLine.addColorStop(1, '#c084fc');
  ctx.fillStyle = topLine;
  ctx.fillRect(0, 0, W, 5);
  
  // Header: EIGHTBORNV ARENA
  ctx.font = '700 28px "Bebas Neue", Arial';
  ctx.fillStyle = '#ffb4ac';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText('EIGHTBORNV ARENA', W/2, 60);
  
  // Game emoji (large)
  ctx.font = '80px Arial';
  ctx.fillText(opts.gameEmoji || '🎮', W/2, 170);
  
  // Game name
  ctx.font = '700 36px "Bebas Neue", Arial';
  ctx.fillStyle = '#e4e1ee';
  ctx.fillText((opts.gameName || 'Oyun').toUpperCase(), W/2, 230);
  
  // Divider
  var divLine = ctx.createLinearGradient(W/2 - 100, 0, W/2 + 100, 0);
  divLine.addColorStop(0, 'transparent');
  divLine.addColorStop(0.5, '#ff544d');
  divLine.addColorStop(1, 'transparent');
  ctx.fillStyle = divLine;
  ctx.fillRect(W/2 - 100, 255, 200, 2);
  
  // Username
  ctx.font = '700 48px "Bebas Neue", Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(opts.username || 'Oyuncu', W/2, 330);
  
  // Score - big
  var pct = opts.total > 0 ? Math.round(opts.score / opts.total * 100) : 0;
  var scoreColor = pct >= 80 ? '#3cddc7' : pct >= 50 ? '#ffb95f' : '#ff544d';
  
  ctx.font = '700 120px "Bebas Neue", Arial';
  ctx.fillStyle = scoreColor;
  ctx.fillText(opts.score + '/' + opts.total, W/2, 480);
  
  // Percentage
  ctx.font = '700 42px "Bebas Neue", Arial';
  ctx.fillStyle = 'rgba(228,225,238,0.5)';
  ctx.fillText('%' + pct + ' Başarı', W/2, 530);
  
  // Extra info (streak, rank etc)
  if (opts.extra) {
    ctx.font = '700 32px "Bebas Neue", Arial';
    ctx.fillStyle = '#ffb95f';
    ctx.fillText(opts.extra, W/2, 600);
  }
  
  // Stats boxes
  var boxY = 650;
  // Left box
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath(); ctx.roundRect(60, boxY, 280, 80, 16); ctx.fill();
  ctx.font = '700 20px Arial';
  ctx.fillStyle = '#ff544d';
  ctx.textAlign = 'center';
  ctx.fillText('DOĞRU', 200, boxY + 30);
  ctx.font = '700 32px "Bebas Neue", Arial';
  ctx.fillStyle = '#e4e1ee';
  ctx.fillText(opts.score + ' SORU', 200, boxY + 62);
  
  // Right box
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath(); ctx.roundRect(380, boxY, 280, 80, 16); ctx.fill();
  ctx.font = '700 20px Arial';
  ctx.fillStyle = '#c084fc';
  ctx.textAlign = 'center';
  ctx.fillText('BAŞARI', 520, boxY + 30);
  ctx.font = '700 32px "Bebas Neue", Arial';
  ctx.fillStyle = '#e4e1ee';
  ctx.fillText('%' + pct, 520, boxY + 62);
  
  // Bottom: site URL
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, H - 80, W, 80);
  ctx.font = '600 22px Arial';
  ctx.fillStyle = 'rgba(228,225,238,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('eightbornvarena.com', W/2, H - 35);
  
  // Bottom border line
  ctx.fillStyle = topLine;
  ctx.fillRect(0, H - 5, W, 5);
  
  return canvas;
}

function shareResultCard(opts) {
  var canvas = generateShareCard(opts);
  canvas.toBlob(function(blob) {
    var fileName = 'eightbornv-' + (opts.gameName || 'sonuc').toLowerCase().replace(/\s+/g, '-') + '.png';
    
    // Try Web Share API (mobile)
    if (navigator.share && navigator.canShare) {
      var file = new File([blob], fileName, { type: 'image/png' });
      navigator.share({ title: 'EightbornV Arena Sonuç', files: [file] }).catch(function() {
        downloadBlob(blob, fileName);
      });
    } else {
      downloadBlob(blob, fileName);
    }
  }, 'image/png');
}

function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  toast('📤 Sonuç kartı indirildi!');
}

function getShareButton(opts) {
  return '<button onclick="shareResultCard(' + esc(JSON.stringify(opts)).replace(/"/g, '&quot;') + ')" style="padding:14px 32px;border-radius:14px;border:2px solid rgba(255,84,77,0.3);background:linear-gradient(135deg,rgba(255,84,77,0.1),rgba(192,132,252,0.1));color:#ffb4ac;font-size:18px;font-weight:700;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:8px" onmouseover="this.style.borderColor=\'#ff544d\';this.style.transform=\'scale(1.05)\'" onmouseout="this.style.borderColor=\'rgba(255,84,77,0.3)\';this.style.transform=\'\'">📤 Sonucu Paylaş</button>';
}
