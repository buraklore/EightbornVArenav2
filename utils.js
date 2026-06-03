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
