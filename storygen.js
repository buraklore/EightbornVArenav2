// ═══════════════════════════════════════════════════
// KARAKTER HİKAYESİ OLUŞTURUCU — Yayıncı Oyunu (CSTORY)
// Akış: yayıncı ad+soyad girer → 10 soru → chat oylar (1/2/3/4) →
//       cevaplardan özgün, tutarlı, RP'ye uygun bir karakter hikâyesi üretilir.
// Hikâye motoru tamamen istemci tarafında çalışır; soru havuzu API'den gelir.
// streamer.js çatısını kullanır: startCVoteTimer, processChatVote, pause, updateChatPanel.
// ═══════════════════════════════════════════════════

// ───────────────────────── HİKÂYE MOTORU ─────────────────────────
// Kategori anahtarı → hikâye bölümü
var SGEN_SECTION_OF = {
  cocukluk: 'cocukluk', genclik: 'genclik', donum: 'donum',
  kariyer: 'kariyer', sosyal: 'sosyal', kisilik: 'kisilik', gelecek: 'gelecek'
};
var SGEN_SECTION_TITLES = {
  cocukluk: 'Çocukluk', genclik: 'Gençlik', donum: 'İlk Dönüm Noktası',
  kariyer: 'Kariyer', sosyal: 'Dostları ve Düşmanları', kisilik: 'Kişiliği',
  gunumuz: 'Günümüz', gelecek: 'Gelecek Hedefleri'
};
var SGEN_SECTION_ORDER = ['cocukluk', 'genclik', 'donum', 'kariyer', 'sosyal', 'kisilik', 'gunumuz', 'gelecek'];

function _sgCap(s) {
  s = (s || '').trim(); if (!s) return '';
  for (var i = 0; i < s.length; i++) { if (/[a-zA-ZçğıiöşüÇĞİÖŞÜ]/.test(s[i])) return s.slice(0, i) + s[i].toLocaleUpperCase('tr-TR') + s.slice(i + 1); }
  return s;
}
// Bir bankadan, aynı hikâyede tekrar etmeyecek biçimde seçer (banka tükenirse sıfırlar).
function _sgPickU(arr, rng, used) {
  var avail = arr.filter(function (x) { return used.indexOf(x) < 0; });
  if (!avail.length) { avail = arr; }
  var pick = avail[Math.floor(rng() * avail.length)] || avail[0];
  used.push(pick);
  return pick;
}
function _sgClamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(n))); }

// ───────────────────────── HİKÂYE MOTORU (zengin anlatı) ─────────────────────────
// Tohumlanmış rastgelelik: aynı karakter + aynı cevaplar => aynı hikâye, farklı seçimler => farklı hikâye.
function _sgRng(seedStr) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function _sgPick(arr, rng) { return arr[Math.floor(rng() * arr.length)] || arr[0]; }
function _sgDot(s) { s = (s || '').trim(); if (!s) return ''; return /[.!?…]$/.test(s) ? s : s + '.'; }
function _sgSub(t, full, first) { return t.split('{name}').join(full).split('{first}').join(first); }

// Bölüm açılışları — sahneyi kurar, ismi (ek almadan) doğal biçimde içine örer.
var SGEN_OPENERS = {
  cocukluk: [
    'Her hikâyenin bir başlangıcı vardır; {name} için o başlangıç çocuklukta yazıldı.',
    '{name} adını sonradan herkese duyuracaktı, ama önce o da küçük bir çocuktu.',
    'Bu hikâye {name} ile başlıyor — ve daha ilk yıllardan, onun sıradan biri olmayacağı seziliyordu.',
    'Çocukluk çoğu insan için masumiyet demektir; {name} için ise bir okuldu.',
    'Şehrin uğultusu daha o yıllarda {name} adındaki çocuğun kulağına dolmuştu.'
  ],
  genclik: [
    'Çocukluk geride kaldı; sıra, ateşle imtihan edilen gençlik yıllarına gelmişti.',
    'Yıllar geçti, {first} büyüdü — ve gençlik ona hayatın sert yüzünü gösterdi.',
    'Gençlik herkes için bir dönüm noktasıdır; {first} için ise düpedüz bir sınavdı.',
    'Bir çocuğun bittiği, bir gencin doğduğu o eşikte {name} kendini sokağın ortasında buldu.'
  ],
  donum: [
    'Her hayatta bir an gelir, her şey değişir; {name} için o an çoktan kapıya dayanmıştı.',
    'Ve sonra, hiçbir şeyin eskisi gibi olmayacağı o gün geldi.',
    'Kaderin {name} için sakladığı kırılma, hiç beklenmedik bir anda yaşandı.',
    'Hayat onu rahat bırakmadı; bir gün gelip her şeyi alt üst eden o olayı önüne koydu.'
  ],
  kariyer: [
    'Hayat devam ediyordu ve {first} ekmeğini kazanmanın bir yolunu bulmak zorundaydı.',
    'Geçmişin izleri silinmiyordu, ama gelecek kurulmalıydı — ve bu, işten başlardı.',
    'Bu şehirde ayakta kalmak para isterdi; {name} da kendi yolunu çizmeye koyuldu.',
    'Kimi miras bir servete konar, kimi her şeyi sıfırdan kurar; {first} ikincisiydi.'
  ],
  sosyal: [
    'Hiç kimse bu şehirde tek başına ayakta kalamaz; {name} da dostlar ve düşmanlar edindi.',
    'Bir insanı dostları kadar düşmanları da tanımlar — ve {first} bu konuda eli boş değildi.',
    'Şehir kocaman bir satranç tahtasıysa, {name} de taşlarını dizmeye başlamıştı: yanında duranlar ve karşısında olanlar.',
    'Yalnız yürüdüğünü sanırdı, ama yolu boyunca hem sadık dostlar hem amansız hasımlar topladı.'
  ],
  kisilik: [
    'Peki tüm bu yaşananlar, {name} adında nasıl bir insan yaratmıştı?',
    'Bir insanın gerçek yüzü en çok zorlandığı anda ortaya çıkar; {first} de defalarca sınandı.',
    'Geçmiş onu yoğurmuştu; geriye nasıl bir karakter kaldığına yakından bakmak gerekiyordu.',
    'Onu tanımak, attığı adımları değil, o adımları attıran şeyi anlamakla mümkündü.'
  ],
  gelecek: [
    'Geçmiş yazılmıştı, bugün yaşanıyordu; geriye bir tek gelecek kalıyordu.',
    'Peki {name} bütün bunların ardından neyin peşindeydi?',
    'Her yolculuğun bir ufku vardır; {first} de gözlerini çoktan o ufka dikmişti.',
    'Bugüne kadar olanlar bir yana — asıl soru, {name} adındaki bu insanın nereye gittiğiydi.'
  ]
};
// Bölüm kapanışları — bir sonraki döneme köprü kurar, kişisel gelişimi vurgular.
var SGEN_CLOSERS = {
  cocukluk: [
    'Çocukluğunda atılan bu tohumlar, ileride filizlenip onu bambaşka biri yapacaktı.',
    'O ilk yıllar, içinde sönmeyecek bir kıvılcım bıraktı.',
    'İşte bu küçük dünyada, {first} adındaki çocuk sessizce şekillenmeye başladı.',
    'Henüz farkında değildi, ama bu yıllar geleceğinin temelini örüyordu.'
  ],
  genclik: [
    'Gençliğin bu fırtınalı günleri, onu çelikleştirerek olacaklara hazırladı.',
    'Artık o, çocukluğundaki kişi değildi; gençlik onu yeniden yoğurmuştu.',
    'Bu yıllarda verdiği kararlar, ileride önüne çıkacak bütün yolları belirleyecekti.',
    'Gençlik bittiğinde {first} artık ne istediğini biliyordu — ya da öyle sanıyordu.'
  ],
  donum: [
    'O günden sonra {first}, sanki bambaşka biri olarak uyandı hayata.',
    'Bu kırılma, onun içindeki bütün dengeleri yeniden kurdu.',
    'Artık geriye dönüş yoktu; bu olay hikâyesini ikiye bölmüştü — öncesi ve sonrası.',
    'O an, {name} adının altına çizilen kalın bir çizgi gibiydi.'
  ],
  kariyer: [
    'İşte bu yol, onun şehirdeki yerini yavaş yavaş belirledi.',
    'Kariyeri, karakterinin bir aynası oldu: nasıl biriyse öyle çalıştı.',
    'Bu seçimler, {name} adını şehrin belli çevrelerinde duyurmaya başladı.',
    'Çalışma biçimi, onun hem ekmeği hem imzası hâline geldi.'
  ],
  sosyal: [
    'Bu bağlar ve husumetler, yolculuğunun en belirleyici parçası oldu.',
    'Kimi sırtını yasladığı sağlam bir duvar, kimi ömürlük bir gölge olarak kaldı.',
    'Dostlukları da düşmanlıkları da, onu bugünkü konumuna taşıyan görünmez kuvvetlerdi.',
    'Etrafındaki bu insanlar olmadan, {name} bambaşka bir hikâye olurdu.'
  ],
  kisilik: [
    'İşte {name}, tüm bu çizgilerin birleşiminden doğan katmanlı bir karakterdi.',
    'Bu özellikler, onun hem en büyük gücü hem de en derin zaafıydı.',
    'Kısacası o, kolay çözülmeyen, ucu hep biraz açık kalan bir insandı.',
    'Onu basit bir kalıba sığdırmak isteyen herkes yanılırdı.'
  ],
  gelecek: [
    'Ve hikâye burada bitmiyor — {name} için bu, yalnızca yeni bir bölümün başlangıcı.',
    'Şehir onu izliyor; {first} ise kendi efsanesini yazmaya daha yeni başladı.',
    'Önünde uzun bir yol var; ama {name} o yolu kendi kurallarıyla yürümeye kararlı.',
    'Yarın ne getirir bilinmez, ama {first} sahneden inmeye hiç niyetli değil.'
  ]
};
// Parçaları birbirine bağlayan ifadeler (zaman zarfı içermez ki parçaların kendi zamanıyla çakışmasın).
var SGEN_CONN = ['Öte yandan, ', 'Bir yandan da, ', 'Dahası, ', 'Ne var ki, ', 'Aynı zamanda, ', 'Üstelik, ', 'Bununla birlikte, '];
// Araya serpiştirilen kısa düşünce cümleleri — uzunluk ve ritim katar.
var SGEN_REFLECT = [
  'Bu, onun en belirgin yanlarından biriydi.',
  'Zamanla bu özellik daha da derinleşti.',
  'Çevresindekiler bunu çok geçmeden fark etti.',
  'Bu seçim, ileride pek çok şeyi belirleyecekti.',
  'Onu tanıyanlar bu yönünü iyi bilirdi.',
  'İşte bu, hikâyesinin kilit taşlarından biriydi.',
  'Bu çizgi yıllar boyunca onunla kaldı.',
  'Geriye dönüp baktığında, bu anların hiçbirini değiştirmek istemezdi.'
];

// Bir bölümü zengin bir paragrafa dönüştür: açılış + örülmüş parçalar + köprü + kapanış.
function _sgPara(secKey, full, first, frags, rng, used) {
  frags = (frags || []).filter(function (f) { return f && f.trim(); });
  if (!frags.length) return '';
  used = used || [];
  var out = [];
  if (SGEN_OPENERS[secKey]) out.push(_sgSub(_sgPick(SGEN_OPENERS[secKey], rng), full, first));
  // ilk parça
  out.push(_sgDot(_sgCap(frags[0].trim())));
  // tek parçalıysa araya bir düşünce cümlesi koy (paragraf dolgun olsun)
  if (frags.length === 1) {
    out.push(_sgPickU(SGEN_REFLECT, rng, used));
  } else {
    // ikinci ve sonraki parçalar bağlayıcılarla
    for (var i = 1; i < frags.length; i++) {
      var conn = _sgPick(SGEN_CONN, rng);
      out.push(_sgDot(conn + frags[i].trim()));
      // çok parça varsa arada bir düşünce cümlesi
      if (i === 1 && frags.length >= 2 && rng() < 0.6) out.push(_sgPickU(SGEN_REFLECT, rng, used));
    }
  }
  if (SGEN_CLOSERS[secKey]) out.push(_sgSub(_sgPick(SGEN_CLOSERS[secKey], rng), full, first));
  return out.join(' ');
}

// "Günümüz" bölümü — baskın istatistik + isim üzerinden zengin biçimde sentezlenir (çelişki üretmez).
function _sgGunumuz(full, first, stats, rng) {
  var axes = [
    { k: 'leader', hi: 'Bugün {name}, etrafına insan toplayan, sözü dinlenen bir figür hâline geldi', lo: 'Bugün {name}, kimsenin gölgesine sığmayan, kendi yolunda yürüyen bir yalnız' },
    { k: 'crime', hi: 'şehrin karanlık işlerinde adı sıkça anılıyor', lo: 'tüm baskıya rağmen elini temiz tutmayı başardı' },
    { k: 'chaos', hi: 'nereye gitse ardında bir fırtına bırakıyor', lo: 'gürültüden uzak, sakin sularda yüzmeyi seçiyor' },
    { k: 'smart', hi: 'her hamlesini önceden hesaplayan keskin zekâsıyla tanınıyor', lo: 'kararlarını kitaplardan değil, sokağın öğrettiği içgüdüyle veriyor' },
    { k: 'trust', hi: 'verdiği sözü tutmasıyla çevresinde sağlam bir güven kurdu', lo: 'kimseye tam güvenmeyen, herkesi bir kol mesafede tutan biri olarak biliniyor' }
  ];
  var lead = _sgSub(stats.leader >= 50 ? axes[0].hi : axes[0].lo, full, first);
  var rest = axes.slice(1).map(function (a) { return { txt: stats[a.k] >= 50 ? a.hi : a.lo, dist: Math.abs(stats[a.k] - 50) }; })
                 .sort(function (a, b) { return b.dist - a.dist; });
  var body = lead + '. ' + _sgCap(rest[0].txt) + '; ' + rest[1].txt + '. ' + _sgCap(rest[2].txt) + '.';
  var close;
  if (stats.crime >= 62 || stats.chaos >= 68) close = 'Şehir onun adını duyduğunda bir adım geri çekiliyor — çünkü ' + first + ' adındaki bu insanın nereye kadar gideceğini kimse kestiremiyor.';
  else if (stats.trust >= 62) close = 'Bugün ona güvenenlerin sayısı, karşısında durmaya cesaret edenlerden çok daha fazla.';
  else if (stats.leader >= 62) close = 'Artık birçok kapı ona kendiliğinden aralanıyor; gerisini de zamanla açmaya kararlı.';
  else close = 'Hikâyesi henüz tamamlanmadı; bugünü, yarını için attığı sessiz bir basamak olarak görüyor.';
  return body + ' ' + close;
}

// Özet — istatistik profilinden, ismi içine örerek kısa bir tanım
function _sgSummary(full, first, stats) {
  var arr = [
    { k: 'crime', hi: 'tehlikeli', lo: 'temiz kalpli' },
    { k: 'leader', hi: 'doğuştan lider', lo: 'yalnız bir kurt' },
    { k: 'smart', hi: 'kurnaz ve zeki', lo: 'içgüdüleriyle hareket eden' },
    { k: 'chaos', hi: 'öngörülemez', lo: 'soğukkanlı' },
    { k: 'trust', hi: 'sözüne güvenilir', lo: 'kolay güvenmeyen' }
  ];
  var s = arr.map(function (a) { return { txt: stats[a.k] >= 50 ? a.hi : a.lo, dist: Math.abs(stats[a.k] - 50) }; })
             .sort(function (a, b) { return b.dist - a.dist; });
  var goal;
  if (stats.leader >= 60 && stats.crime >= 55) goal = 'şehrin tepesine oynayan';
  else if (stats.crime >= 60) goal = 'kuralları kendi koyan';
  else if (stats.trust >= 60) goal = 'sadakatiyle yol alan';
  else if (stats.smart >= 62) goal = 'aklıyla ayakta kalan';
  else goal = 'kendi hikâyesini yazan';
  return full + ', ' + goal + '; ' + s[0].txt + ', ' + s[1].txt + ' bir karakter. Yokluktan mı geldi bolluktan mı bilinmez, ama bugün geldiği yeri kendi elleriyle kazandı — ve hikâyesi henüz bitmiş değil.';
}

// Ana motor: cevaplardan tam hikâye + istatistik üret
// answers: [{cat, optText, frag, cr, tr, ld, sm, ch}]
function SGEN_build(name, surname, answers) {
  name = (name || '').trim(); surname = (surname || '').trim();
  var full = (name + ' ' + surname).trim() || 'Bilinmeyen Biri';
  var first = name || full.split(' ')[0];
  // 1) İstatistikler
  var sum = { cr: 0, tr: 0, ld: 0, sm: 0, ch: 0 };
  answers.forEach(function (a) { sum.cr += a.cr | 0; sum.tr += a.tr | 0; sum.ld += a.ld | 0; sum.sm += a.sm | 0; sum.ch += a.ch | 0; });
  var stats = {
    crime:  _sgClamp(36 + sum.cr * 3.8, 3, 99),
    trust:  _sgClamp(50 + sum.tr * 3.8, 3, 99),
    leader: _sgClamp(38 + sum.ld * 3.7, 3, 99),
    smart:  _sgClamp(43 + sum.sm * 3.8, 3, 99),
    chaos:  _sgClamp(38 + sum.ch * 4.2, 3, 99)
  };
  // 2) Parçaları bölümlere göre grupla (soru sırası korunur)
  var fragsBy = {};
  answers.forEach(function (a) { var sec = SGEN_SECTION_OF[a.cat] || 'kisilik'; (fragsBy[sec] = fragsBy[sec] || []).push(a.frag); });
  // 3) Tohumlu rng (aynı girdi => aynı hikâye)
  var rng = _sgRng(full + '::' + answers.map(function (a) { return a.frag; }).join('|'));
  var usedReflect = [];
  // 4) Bölümleri yaz
  var sections = {};
  ['cocukluk', 'genclik', 'donum', 'kariyer', 'sosyal', 'kisilik', 'gelecek'].forEach(function (sec) {
    if (fragsBy[sec] && fragsBy[sec].length) sections[sec] = _sgPara(sec, full, first, fragsBy[sec], rng, usedReflect);
  });
  sections.gunumuz = _sgGunumuz(full, first, stats, rng);
  var summary = _sgSummary(full, first, stats);
  return { name: full, summary: summary, sections: sections, stats: stats };
}

// ───────────────────────── OYUN KURULUMU (PLAN) ─────────────────────────
function _sgShuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// pool: {categories, plan, questions:[{id,cat,text,opts:[{t,frag,cr,tr,ld,sm,ch}]}]}
// Plan'a göre her kategoriden rastgele soru çekip 10 soruluk akışı kurar (kronolojik sırada).
function SGEN_makePlan(pool) {
  var plan = pool.plan || {};
  var byCat = {};
  (pool.questions || []).forEach(function(q) { (byCat[q.cat] = byCat[q.cat] || []).push(q); });
  var catOrder = (pool.categories || []).slice().sort(function(a, b) { return (a.ord || 0) - (b.ord || 0); }).map(function(c) { return c.key; });
  // plan'da olup kategori listesinde olmayanları da ekle
  Object.keys(plan).forEach(function(k) { if (catOrder.indexOf(k) < 0) catOrder.push(k); });
  var selected = [];
  catOrder.forEach(function(cat) {
    var want = plan[cat] || 0;
    if (want <= 0) return;
    var avail = _sgShuffle(byCat[cat] || []).slice(0, want);
    avail.forEach(function(q) { selected.push(q); });
  });
  // Plan hiç soru vermediyse (ör. config bozuk) havuzdan rastgele 10 al
  if (!selected.length) selected = _sgShuffle(pool.questions || []).slice(0, 10);
  // Her sorunun seçeneklerini de hafifçe karıştır (oy 1-4 çeşitlensin)
  return selected.map(function(q) { return { id: q.id, cat: q.cat, text: q.text, opts: _sgShuffle(q.opts || []) }; });
}

// ───────────────────────── YAYINCI OYUN AKIŞI (CSTORY) ─────────────────────────
var _sgCols = ['#a78bfa', '#60a5fa', '#3cddc7', '#ffb95f'];
var _sgCatColor = { cocukluk: '#5ad1a5', genclik: '#60a5fa', donum: '#ff9d6b', kariyer: '#ffb95f', sosyal: '#c4b5fd', kisilik: '#f0a3c0', gelecek: '#7ee0ff' };
function _sgCatName(pool, key) { var c = (pool.categories || []).find(function(x) { return x.key === key; }); return c ? c.name : key; }

function nextCStoryRound() {
  var s = streamState; if (!s || !s.active || !s.sg) return;
  var sg = s.sg;
  if (sg.idx >= sg.plan.length) { renderCStoryResult(); return; }
  s.chatMessages = [];
  renderCStoryRound();
  if (sg.voteSeconds > 0) {
    startCVoteTimer(sg.voteSeconds, function() { resolveCStoryVote(); });
  } else {
    // Manuel mod: süre yok, oylar açık; yayıncı seçer
    s.phase = 'VOTING'; s.votes = {}; s.voters = {};
    updateCStoryVoteBar();
  }
}

function renderCStoryRound() {
  var s = streamState; if (!s || !s.active || !s.sg) return;
  var sg = s.sg; var ag = document.getElementById('ag');
  var q = sg.plan[sg.idx];
  var catCol = _sgCatColor[q.cat] || '#a78bfa';
  var catName = _sgCatName(sg.pool, q.cat);
  var opts = q.opts.map(function(o, i) {
    var col = _sgCols[i % 4];
    return '<div onclick="streamerForceCStory(' + i + ')" style="display:flex;align-items:center;gap:14px;background:' + col + '12;border:2px solid ' + col + '33;border-radius:14px;padding:15px 18px;margin-bottom:10px;cursor:pointer;text-align:left;transition:all .2s" onmouseover="this.style.borderColor=\'' + col + '\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'' + col + '33\';this.style.transform=\'\'">' +
      '<span style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:' + col + ';color:#13131b;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:17px">' + (i + 1) + '</span>' +
      '<span style="flex:1;font-size:17px;color:#e8e6ef;font-weight:600;line-height:1.4">' + esc(o.t) + '</span>' +
    '</div>';
  }).join('');
  var timerTxt = sg.voteSeconds > 0 ? (sg.voteSeconds + 's') : '∞';
  ag.innerHTML =
    '<div style="display:flex;gap:20px;padding:18px">' +
      '<div style="flex:1;min-width:0">' +
        '<h2 class="fd" style="font-size:26px;text-align:center;margin-bottom:4px">📖 Karakter Hikayesi — Chat</h2>' +
        '<p style="text-align:center;color:var(--t2);font-size:15px;margin-bottom:4px">👤 <b style="color:#e4e1ee">' + esc(sg.name) + '</b> · SORU ' + (sg.idx + 1) + ' / ' + sg.plan.length + '</p>' +
        '<p style="text-align:center;color:#c4b5fd;font-size:17px;font-weight:700;margin-bottom:12px">Hikâyeyi chat yazıyor! <b>1, 2, 3</b> ya da <b>4</b> yaz</p>' +
        '<div style="text-align:center;margin-bottom:14px"><span style="font-size:13px;font-weight:800;letter-spacing:1px;padding:4px 14px;border-radius:8px;background:' + catCol + '20;color:' + catCol + ';border:1px solid ' + catCol + '40">' + esc(catName.toLocaleUpperCase('tr-TR')) + '</span></div>' +
        '<div style="background:linear-gradient(135deg,rgba(167,139,250,0.08),rgba(96,165,250,0.03));border:1px solid rgba(167,139,250,0.16);border-radius:16px;padding:22px 24px;margin:0 auto 18px;max-width:720px"><h3 class="fd" style="font-size:clamp(22px,3vw,30px);color:#f0e9ff;text-align:center;margin:0;line-height:1.35">' + esc(q.text) + '</h3></div>' +
        '<div style="max-width:680px;margin:0 auto">' + opts + '</div>' +
        '<div id="cvote-bar" style="max-width:700px;margin:14px auto 8px"></div>' +
        '<div style="text-align:center;font-size:40px;font-weight:800;color:var(--pk)" id="cvote-timer">' + timerTxt + '</div>' +
        (sg.voteSeconds > 0 ? '' : '<p style="text-align:center;font-size:13px;color:var(--t3)">Manuel mod — süre yok, seçeneğe tıklayarak ilerle</p>') +
      '</div>' +
      '<div style="width:300px;flex-shrink:0">' +
        '<div class="cg" style="margin-bottom:12px;padding:16px"><h4 style="font-size:14px;color:var(--m);margin-bottom:10px">📊 Oy Dağılımı</h4><div id="cvote-stats"></div></div>' +
        '<div class="cg" style="padding:16px"><h4 style="font-size:14px;color:var(--pk);margin-bottom:8px">💬 Chat</h4><div id="chat-msgs" style="height:250px;overflow-y:auto;font-size:13px"></div></div>' +
      '</div>' +
    '</div>';
  updateCStoryVoteBar();
  if (typeof updateChatPanel === 'function') updateChatPanel();
}

function updateCStoryVoteBar() {
  var s = streamState; if (!s || !s.sg) return;
  var q = s.sg.plan[s.sg.idx]; if (!q) return;
  var n = q.opts.length;
  var total = 0; for (var i = 0; i < n; i++) total += (s.votes[String(i + 1)] || 0);
  var t = total || 1;
  var stats = document.getElementById('cvote-stats');
  if (!stats) return;
  var sh = '<div style="font-size:11px;color:var(--t3);margin-bottom:8px">Toplam ' + total + ' oy · chat 1-' + n + ' yazar</div>';
  for (var i = 0; i < n; i++) {
    var col = _sgCols[i % 4]; var v = s.votes[String(i + 1)] || 0; var p = Math.round(v / t * 100);
    sh += '<div style="padding:7px 9px;border-radius:8px;background:' + col + '12;border:1px solid ' + col + '30;margin-bottom:6px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;color:' + col + '"><span>' + (i + 1) + ') ' + esc((q.opts[i].t || '').slice(0, 26)) + (q.opts[i].t.length > 26 ? '…' : '') + '</span><span>' + p + '%</span></div><div style="height:5px;background:var(--bg3);border-radius:3px;margin-top:5px"><div style="height:100%;background:' + col + ';border-radius:3px;width:' + p + '%;transition:width .3s"></div></div></div>';
  }
  stats.innerHTML = sh;
  // canlı oy çubuğu (ana sütun)
  var bar = document.getElementById('cvote-bar');
  if (bar) {
    var bh = '';
    for (var j = 0; j < n; j++) { var c2 = _sgCols[j % 4]; var v2 = s.votes[String(j + 1)] || 0; var p2 = Math.round(v2 / t * 100);
      bh += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:12px;font-weight:800;color:' + c2 + ';width:18px">' + (j + 1) + '</span><div style="flex:1;height:9px;background:var(--bg3);border-radius:5px;overflow:hidden"><div style="height:100%;background:' + c2 + ';width:' + p2 + '%;transition:width .3s"></div></div><span style="font-size:12px;color:var(--t3);width:38px;text-align:right">' + v2 + ' oy</span></div>';
    }
    bar.innerHTML = bh;
  }
}

// Yayıncı bir seçeneğe tıklayarak oylamayı bitirir (manuel seçim)
function streamerForceCStory(idx) {
  var s = streamState; if (!s || !s.active || !s.sg) return;
  if (s.phase === 'RESULT') return;
  if (s.voteTimer) { clearInterval(s.voteTimer); s.voteTimer = null; }
  s.phase = 'RESULT';
  resolveCStoryVote(idx);
}

function resolveCStoryVote(forcedIdx) {
  var s = streamState; if (!s || !s.active || !s.sg) return;
  if (s.voteTimer) { clearInterval(s.voteTimer); s.voteTimer = null; }
  s.phase = 'RESULT';
  var sg = s.sg; var q = sg.plan[sg.idx]; var n = q.opts.length;
  var win = 0;
  sg._forced = (typeof forcedIdx === 'number');
  if (sg._forced) { win = forcedIdx; }
  else {
    var maxV = -1;
    for (var i = 0; i < n; i++) { var v = s.votes[String(i + 1)] || 0; if (v > maxV) { maxV = v; win = i; } }
    if (maxV <= 0) win = Math.floor(Math.random() * n);
  }
  var opt = q.opts[win];
  sg.answers.push({ cat: q.cat, optText: opt.t, frag: opt.frag, cr: opt.cr | 0, tr: opt.tr | 0, ld: opt.ld | 0, sm: opt.sm | 0, ch: opt.ch | 0 });
  renderCStoryPick(win);
}

// Seçim sonucu: kazanan şıkkı vurgula, kısa beklemeyle sıradakine geç
function renderCStoryPick(winIdx) {
  var s = streamState; if (!s || !s.sg) return;
  var sg = s.sg; var ag = document.getElementById('ag'); var q = sg.plan[sg.idx];
  var col = _sgCols[winIdx % 4];
  var total = 0, n = q.opts.length; for (var i = 0; i < n; i++) total += (s.votes[String(i + 1)] || 0);
  var winVotes = s.votes[String(winIdx + 1)] || 0;
  var pct = total > 0 ? Math.round(Math.min(winVotes, total) / total * 100) : 0;
  var last = sg.idx + 1 >= sg.plan.length;
  var forced = !!sg._forced;
  var capLabel = forced ? '🎬 YAYINCI SEÇTİ' : '✅ CHAT SEÇTİ';
  var capDetail = forced ? 'yayıncı seçimi' : (total > 0 ? (winVotes + ' oy · %' + pct) : 'oy gelmedi — rastgele seçildi');
  ag.innerHTML =
    '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px">' +
      '<div style="max-width:680px;width:100%;text-align:center">' +
        '<p style="font-size:14px;color:var(--t3);margin-bottom:6px">👤 ' + esc(sg.name) + ' · SORU ' + (sg.idx + 1) + ' / ' + sg.plan.length + '</p>' +
        '<div style="font-size:13px;color:var(--t2);margin-bottom:14px">' + esc(q.text) + '</div>' +
        '<div class="rp-pop" style="background:#1b1b24;border:2px solid ' + col + '66;border-radius:18px;padding:26px 24px;box-shadow:0 10px 40px ' + col + '14">' +
          '<div style="font-size:12px;letter-spacing:1.5px;color:' + col + ';font-weight:800;margin-bottom:12px">' + capLabel + '</div>' +
          '<div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:8px"><span style="width:40px;height:40px;border-radius:50%;background:' + col + ';color:#13131b;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:20px">' + (winIdx + 1) + '</span><span class="fd" style="font-size:22px;color:#f0e9ff">' + esc(q.opts[winIdx].t) + '</span></div>' +
          '<div style="font-size:13px;color:var(--t3)">' + capDetail + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:24px;flex-wrap:wrap">' +
          '<button class="btn bp" style="font-size:18px;padding:14px 38px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none" onclick="cstoryAdvance()">' + (last ? '📜 Hikâyeyi Oluştur' : 'Sonraki Soru ▶') + '</button>' +
          '<span style="font-size:15px;color:var(--t3)">Otomatik: <b id="cstory-next-count" style="color:#c4b5fd">4</b>s</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  _cstoryStartAdvance(4);
}

function _cstoryStartAdvance(sec) {
  var s = streamState; if (!s) return;
  if (s._sgAdv) { clearInterval(s._sgAdv); s._sgAdv = null; }
  var remaining = sec;
  var el = document.getElementById('cstory-next-count'); if (el) el.textContent = remaining;
  s._sgAdv = setInterval(function() {
    if (!streamState || !streamState.active) { clearInterval(s._sgAdv); s._sgAdv = null; return; }
    if (streamState.paused) return;
    remaining--;
    var e = document.getElementById('cstory-next-count'); if (e) e.textContent = Math.max(remaining, 0);
    if (remaining <= 0) { clearInterval(s._sgAdv); s._sgAdv = null; cstoryAdvance(); }
  }, 1000);
  if (typeof gameTimers !== 'undefined' && gameTimers.push) gameTimers.push(s._sgAdv);
}

function cstoryAdvance() {
  var s = streamState; if (!s || !s.active || !s.sg) return;
  if (s._sgAdv) { clearInterval(s._sgAdv); s._sgAdv = null; }
  s.sg.idx++;
  nextCStoryRound();
}

// ───────────────────────── SONUÇ EKRANI ─────────────────────────
function _sgStatBar(label, emoji, val, col) {
  return '<div style="margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:5px"><span style="color:#e4e1ee">' + emoji + ' ' + label + '</span><span style="color:' + col + '">%' + val + '</span></div>' +
    '<div style="height:12px;background:var(--bg3);border-radius:7px;overflow:hidden"><div style="height:100%;width:' + val + '%;background:linear-gradient(90deg,' + col + 'aa,' + col + ');border-radius:7px;transition:width .8s"></div></div>' +
  '</div>';
}

// Sonuç ekranı HTML'i — hem yayıncı hem solo modda kullanılır
function SGEN_resultHTML(story, headerLabel, buttonsHtml) {
  var st = story.stats;
  var statsHtml =
    _sgStatBar('Suç İşleme İhtimali', '🔪', st.crime, '#ff6a63') +
    _sgStatBar('Güvenilirlik', '🤝', st.trust, '#3cdd8c') +
    _sgStatBar('Liderlik', '👑', st.leader, '#ffb95f') +
    _sgStatBar('Zekâ', '🧠', st.smart, '#60a5fa') +
    _sgStatBar('Kaos Seviyesi', '🔥', st.chaos, '#c4b5fd');
  var sectionsHtml = SGEN_SECTION_ORDER.filter(function(sec) { return story.sections[sec]; }).map(function(sec) {
    return '<div style="margin-bottom:18px">' +
      '<h3 class="fd" style="font-size:19px;color:#c4b5fd;margin-bottom:7px;display:flex;align-items:center;gap:8px"><span style="width:6px;height:20px;background:#a78bfa;border-radius:3px;display:inline-block"></span>' + SGEN_SECTION_TITLES[sec] + '</h3>' +
      '<p style="font-size:15.5px;color:#cfcdd6;line-height:1.8;margin:0">' + esc(story.sections[sec]) + '</p>' +
    '</div>';
  }).join('');
  return '<div style="flex:1;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto">' +
      '<div style="max-width:880px;width:100%">' +
        '<div style="text-align:center;margin-bottom:20px">' +
          '<div style="font-size:13px;letter-spacing:2px;color:#9a969e;margin-bottom:6px">' + headerLabel + '</div>' +
          '<h2 class="fd" style="font-size:clamp(30px,5vw,46px);color:#f0e9ff;letter-spacing:1px">' + esc(story.name) + '</h2>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:240px 1fr;gap:20px;margin-bottom:22px" class="sg-result-top">' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            '<div style="aspect-ratio:1/1;border:2px dashed #4a4660;border-radius:18px;background:linear-gradient(135deg,#1b1b24,#15131d);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#6a6878"><div style="font-size:54px;opacity:.5">📷</div><div style="font-size:13px;text-align:center;padding:0 12px">Karakter Fotoğrafı<br><span style="font-size:11px;opacity:.7">(buraya görsel eklenebilir)</span></div></div>' +
          '</div>' +
          '<div>' +
            '<div style="background:#1b1b24;border:1px solid #352c44;border-radius:16px;padding:18px 20px;margin-bottom:14px">' +
              '<div style="font-size:13px;font-weight:700;color:#a78bfa;letter-spacing:.5px;margin-bottom:8px">📝 KARAKTER ÖZETİ</div>' +
              '<p style="font-size:16px;color:#e4e1ee;line-height:1.7;margin:0">' + esc(story.summary) + '</p>' +
            '</div>' +
            '<div style="background:#1b1b24;border:1px solid #352c44;border-radius:16px;padding:18px 20px">' +
              '<div style="font-size:13px;font-weight:700;color:#ffb95f;letter-spacing:.5px;margin-bottom:14px">📊 KARAKTER İSTATİSTİKLERİ</div>' +
              statsHtml +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="background:linear-gradient(135deg,#191721,#15131d);border:1px solid #2e2840;border-radius:18px;padding:24px 26px;margin-bottom:22px">' +
          '<div style="text-align:center;font-size:13px;letter-spacing:2px;color:#a78bfa;font-weight:700;margin-bottom:18px">📖 TAM HİKÂYE</div>' +
          sectionsHtml +
        '</div>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding-bottom:10px">' + buttonsHtml + '</div>' +
      '</div>' +
    '</div>';
}

// Hikâyeyi düz metne çevir (kopyalama için)
function _sgBuildCopyText(story) {
  var lines = [story.name, '', story.summary, ''];
  lines.push('— İSTATİSTİKLER —');
  lines.push('Suç İşleme İhtimali: %' + story.stats.crime);
  lines.push('Güvenilirlik: %' + story.stats.trust);
  lines.push('Liderlik: %' + story.stats.leader);
  lines.push('Zekâ: %' + story.stats.smart);
  lines.push('Kaos Seviyesi: %' + story.stats.chaos);
  lines.push('');
  SGEN_SECTION_ORDER.forEach(function(sec) {
    if (story.sections[sec]) { lines.push('• ' + SGEN_SECTION_TITLES[sec].toLocaleUpperCase('tr-TR')); lines.push(story.sections[sec]); lines.push(''); }
  });
  return lines.join('\n');
}
function _sgDoCopy(story) {
  if (!story) return;
  var text = _sgBuildCopyText(story);
  function done() { if (typeof toast === 'function') toast('Hikâye panoya kopyalandı!', true); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function() { _sgFallbackCopy(text); done(); });
  } else { _sgFallbackCopy(text); done(); }
}

// ── Yayıncı modu sonuç ──
function renderCStoryResult() {
  var s = streamState; if (!s || !s.sg) return;
  var sg = s.sg; var ag = document.getElementById('ag');
  var story = SGEN_build(sg.firstName, sg.lastName, sg.answers);
  s.sg.story = story;
  if (s.voteTimer) { clearInterval(s.voteTimer); s.voteTimer = null; }
  if (s._sgAdv) { clearInterval(s._sgAdv); s._sgAdv = null; }
  var buttons =
    '<button class="btn bp" style="font-size:18px;padding:14px 32px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none" onclick="cstoryNewGame()">🔄 Yeni Karakter</button>' +
    '<button class="btn" style="font-size:18px;padding:14px 28px;background:var(--bg3);border:1px solid var(--b1);color:var(--t1)" onclick="cstoryCopyStory()">📋 Hikâyeyi Kopyala</button>' +
    '<button class="btn" style="font-size:18px;padding:14px 28px;background:var(--bg3);border:1px solid var(--b1);color:var(--t1)" onclick="streamStop()">🏠 Ana Sayfa</button>';
  ag.innerHTML = SGEN_resultHTML(story, 'CHAT\'İN YARATTIĞI KARAKTER', buttons);
  if (typeof streamCleanup === 'function') streamCleanup();
}

function cstoryCopyStory() {
  var s = streamState; if (!s || !s.sg || !s.sg.story) return;
  _sgDoCopy(s.sg.story);
}
function _sgFallbackCopy(text) {
  try { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (e) {}
}

// ═══════════════════════════════════════════════════
// SOLO MOD — normal oyunlar (oyuncu soruları kendisi cevaplar)
// ═══════════════════════════════════════════════════
var sgSoloState = null;

function _sgSoloBack() {
  if (typeof bk === 'function') bk();
}

// Kurulum ekranı: ad + soyad gir, başla
function storygenSoloStart() {
  sgSoloState = null;
  var ag = document.getElementById('ag');
  ag.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 0">' +
      '<button class="btn bg bsm" onclick="_sgSoloBack()">← Geri</button>' +
      '<div class="gi" style="background:linear-gradient(135deg,#a78bfa,#ffb95f);width:72px;height:72px;font-size:36px">📖</div>' +
      '<h2 class="fd" style="font-weight:700;font-size:24px">Karakter Hikayesi</h2>' +
    '</div>' +
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
      '<div class="cg" style="text-align:center;padding:44px 36px;max-width:620px;width:100%;border-radius:24px">' +
        '<div style="font-size:60px;margin-bottom:8px">📖</div>' +
        '<h3 class="fd" style="font-size:28px;margin-bottom:8px">Kendi RP Karakterini Yarat</h3>' +
        '<p style="font-size:16px;color:var(--t2);line-height:1.6;margin-bottom:24px">Bir ad-soyad gir, <b>10 soruyu</b> sen cevapla; sistem sana <b>tamamen özgün</b> bir roleplay karakter hikâyesi + suç, güven, liderlik, zekâ ve kaos istatistikleri üretsin. 100+ soruluk havuzdan her seferinde farklı!</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left;margin-bottom:20px">' +
          '<div class="form-group"><label class="lbl" style="font-size:18px;margin-bottom:8px">👤 Karakter Adı</label><input class="inp" style="font-size:20px;padding:16px;border-radius:14px" id="sgsolo-name" placeholder="Örn: Burak" maxlength="24"></div>' +
          '<div class="form-group"><label class="lbl" style="font-size:18px;margin-bottom:8px">👥 Karakter Soyadı</label><input class="inp" style="font-size:20px;padding:16px;border-radius:14px" id="sgsolo-surname" placeholder="Örn: Erol" maxlength="24"></div>' +
        '</div>' +
        '<button class="btn bp" style="width:100%;font-size:22px;padding:18px;border-radius:14px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none" onclick="_sgSoloBegin()">🚀 Başla</button>' +
      '</div>' +
    '</div>';
  setTimeout(function() { var el = document.getElementById('sgsolo-name'); if (el) el.focus(); }, 60);
}

function _sgSoloBegin() {
  if (typeof SGEN_makePlan !== 'function') { if (typeof toast === 'function') toast('Modül yüklenemedi.', false); return; }
  var name = ((document.getElementById('sgsolo-name') || {}).value || '').trim();
  var surname = ((document.getElementById('sgsolo-surname') || {}).value || '').trim();
  if (!name) { if (typeof toast === 'function') toast('Karakter adı gerekli!', false); return; }
  if (name.length > 24) name = name.slice(0, 24);
  if (surname.length > 24) surname = surname.slice(0, 24);
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:80px;color:var(--t2)">Sorular hazırlanıyor...</div>';
  apiGet('/storygen/pool').then(function(pool) {
    if (!pool || pool.error) { if (typeof toast === 'function') toast('Sunucuya ulaşılamadı — api dosyalarını yükleyip sunucuyu yeniden başlatın.', false); storygenSoloStart(); return; }
    if (!pool.questions || pool.questions.length < 4) { if (typeof toast === 'function') toast('Soru havuzu boş. storygen_seed.js dosyasını api/ klasörüne koyup sunucuyu yeniden başlatın (ya da admin panelden soru ekleyin).', false); storygenSoloStart(); return; }
    sgSoloState = { firstName: name, lastName: surname, name: (name + ' ' + surname).trim(), pool: pool, plan: SGEN_makePlan(pool), idx: 0, answers: [], story: null };
    _sgSoloRenderQ();
  }).catch(function() { if (typeof toast === 'function') toast('Bağlantı hatası — sunucu çalışıyor mu?', false); storygenSoloStart(); });
}

function _sgSoloRenderQ() {
  var ss = sgSoloState; if (!ss) return;
  if (ss.idx >= ss.plan.length) { _sgSoloResult(); return; }
  var ag = document.getElementById('ag'); var q = ss.plan[ss.idx];
  var catCol = _sgCatColor[q.cat] || '#a78bfa';
  var catName = _sgCatName(ss.pool, q.cat);
  var pct = Math.round(ss.idx / ss.plan.length * 100);
  var opts = q.opts.map(function(o, i) {
    var col = _sgCols[i % 4];
    return '<div onclick="sgSoloPick(' + i + ')" style="display:flex;align-items:center;gap:14px;background:' + col + '12;border:2px solid ' + col + '33;border-radius:14px;padding:16px 18px;margin-bottom:11px;cursor:pointer;text-align:left;transition:all .2s" onmouseover="this.style.borderColor=\'' + col + '\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'' + col + '33\';this.style.transform=\'\'">' +
      '<span style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:' + col + ';color:#13131b;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:17px">' + (i + 1) + '</span>' +
      '<span style="flex:1;font-size:17px;color:#e8e6ef;font-weight:600;line-height:1.4">' + esc(o.t) + '</span>' +
    '</div>';
  }).join('');
  ag.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 0">' +
      '<button class="btn bg bsm" onclick="_sgSoloBack()">← Geri</button>' +
      '<h2 class="fd" style="font-weight:700;font-size:22px">📖 ' + esc(ss.name) + '</h2>' +
    '</div>' +
    '<div style="flex:1;display:flex;align-items:flex-start;justify-content:center;padding:8px 16px;overflow-y:auto">' +
      '<div style="max-width:680px;width:100%">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
          '<div style="flex:1;height:8px;background:var(--bg3);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#a78bfa,#8b5cf6);border-radius:5px;transition:width .4s"></div></div>' +
          '<span style="font-size:14px;color:var(--t2);font-weight:700;white-space:nowrap">SORU ' + (ss.idx + 1) + ' / ' + ss.plan.length + '</span>' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:14px"><span style="font-size:13px;font-weight:800;letter-spacing:1px;padding:4px 14px;border-radius:8px;background:' + catCol + '20;color:' + catCol + ';border:1px solid ' + catCol + '40">' + esc(catName.toLocaleUpperCase('tr-TR')) + '</span></div>' +
        '<div style="background:linear-gradient(135deg,rgba(167,139,250,0.08),rgba(96,165,250,0.03));border:1px solid rgba(167,139,250,0.16);border-radius:16px;padding:22px 24px;margin:0 auto 20px"><h3 class="fd" style="font-size:clamp(22px,3vw,30px);color:#f0e9ff;text-align:center;margin:0;line-height:1.35">' + esc(q.text) + '</h3></div>' +
        opts +
      '</div>' +
    '</div>';
}

function sgSoloPick(i) {
  var ss = sgSoloState; if (!ss) return;
  var q = ss.plan[ss.idx]; if (!q || !q.opts[i]) return;
  var o = q.opts[i];
  ss.answers.push({ cat: q.cat, optText: o.t, frag: o.frag, cr: o.cr | 0, tr: o.tr | 0, ld: o.ld | 0, sm: o.sm | 0, ch: o.ch | 0 });
  ss.idx++;
  _sgSoloRenderQ();
}

function _sgSoloResult() {
  var ss = sgSoloState; if (!ss) return;
  var ag = document.getElementById('ag');
  var story = SGEN_build(ss.firstName, ss.lastName, ss.answers);
  ss.story = story;
  var buttons =
    '<button class="btn bp" style="font-size:18px;padding:14px 32px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none" onclick="storygenSoloStart()">🔄 Yeni Karakter</button>' +
    '<button class="btn" style="font-size:18px;padding:14px 28px;background:var(--bg3);border:1px solid var(--b1);color:var(--t1)" onclick="sgSoloCopy()">📋 Hikâyeyi Kopyala</button>' +
    '<button class="btn" style="font-size:18px;padding:14px 28px;background:var(--bg3);border:1px solid var(--b1);color:var(--t1)" onclick="_sgSoloBack()">🏠 Oyunlara Dön</button>';
  ag.innerHTML = SGEN_resultHTML(story, 'OLUŞTURDUĞUN KARAKTER', buttons);
}
function sgSoloCopy() { var ss = sgSoloState; if (ss && ss.story) _sgDoCopy(ss.story); }

function cstoryNewGame() {
  var s = streamState;
  if (!s || !s.sg) { if (typeof streamStart === 'function') streamStart(); return; }
  var sg = s.sg;
  // Aynı isim ve aynı ayarlarla yeni bir akış kur (yeni rastgele sorular)
  var ag = document.getElementById('ag');
  ag.innerHTML = '<div style="text-align:center;padding:60px;color:var(--t2)">Yeni karakter hazırlanıyor...</div>';
  apiGet('/storygen/pool').then(function(pool) {
    if (!pool || pool.error || !pool.questions || pool.questions.length < 4) { toast((pool && pool.error) || 'Soru havuzu yüklenemedi.', false); return; }
    s.sg = {
      firstName: sg.firstName, lastName: sg.lastName, name: sg.name,
      pool: pool, plan: SGEN_makePlan(pool), idx: 0, answers: [], voteSeconds: sg.voteSeconds, story: null
    };
    s.votes = {}; s.voters = {}; s.chatMessages = []; s.phase = 'VOTING';
    nextCStoryRound();
  }).catch(function() { toast('Havuz yüklenemedi.', false); });
}

// streamer.js bu fonksiyonları çağırır:
//   - launch: SGEN_makePlan + nextCStoryRound
//   - processChatVote: CSTORY dalı 1-4 oy
if (typeof window !== 'undefined') {
  window.SGEN_build = SGEN_build;
  window.SGEN_makePlan = SGEN_makePlan;
  window.nextCStoryRound = nextCStoryRound;
  window.streamerForceCStory = streamerForceCStory;
  window.cstoryAdvance = cstoryAdvance;
  window.cstoryNewGame = cstoryNewGame;
  window.cstoryCopyStory = cstoryCopyStory;
  window.updateCStoryVoteBar = updateCStoryVoteBar;
  // Solo mod (normal oyunlar)
  window.storygenSoloStart = storygenSoloStart;
  window._sgSoloBegin = _sgSoloBegin;
  window.sgSoloPick = sgSoloPick;
  window.sgSoloCopy = sgSoloCopy;
}
