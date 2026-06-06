// ═══════════════════════════════════════════════════
// RP SİMÜLASYONU — "Şehir Hayatı"
// Seçim tabanlı yaşam simülasyonu. Şehre sıfırdan gelirsin; her tur bir olay + seçenek.
// Statlar: 💰 Para · 👑 İtibar (0-100) · 🔥 Tehlike (0-100). 🔥 100 olursa içeri düşersin.
// Senaryo alanları: {id, start?, w?(ağırlık), once?(varsayılan true), req?, role?/char?, title, text, choices[]}
//   req: {flags:[], not:[], minM,maxM,minR,maxR,minH,maxH}
//   choice: {t:'etiket', m,r,h (stat değişimi), set:[], clear:[], out:'sonuç metni', ch:{p, ok:{...}, no:{...}}}
//   text içinde {char} → o turda sahnelenen gerçek karakterin adı (role/char varsa)
// ═══════════════════════════════════════════════════
var rpsimState = null;
var _rpsimAllowed = null; // admin'in seçtiği karakter id'leri (null/boş = tüm aktif karakterler)
function _rpsimLoadConfig(){
  if (typeof apiGet !== 'function') return;
  apiGet('/rpsim/config').then(function(r){
    _rpsimAllowed = (r && r.char_ids && r.char_ids.length) ? r.char_ids.map(String) : null;
  }).catch(function(){ _rpsimAllowed = null; });
}

window.RPSIM = {
  start: { money: 250, rep: 10, heat: 0 },
  runLength: 12,
  modes: [ {r:8,t:'Kısa',s:'8 Tur'}, {r:12,t:'Klasik',s:'12 Tur'}, {r:18,t:'Uzun',s:'18 Tur'} ],

  scenarios: [
    // ── BAŞLANGIÇ ──
    { id:'arrival', start:true, title:'Şehre İlk Adım', char:true,
      text:'Otobüsten indin, cebinde birkaç kuruş var. Garajın önünde {char} sana bakıp sırıtıyor: "Yeni misin? Bu şehir ya seni yapar ya batırır."',
      choices:[
        { t:'İş arayıp temiz başla', r:8, out:'Doğru başlangıç. İnsanlar çalışkanları sever.' },
        { t:'"Kolay para" yollarını sor', h:12, set:['merakli'], out:'{char} kaşını kaldırdı: "Bak sen... gözün açıkmış."'.replace('{char}','O') },
        { t:'Önce şehri tanı, kimseye güvenme', r:5, set:['temkinli'], out:'Gözlerini açık tuttun. Bu şehirde bilgi paradan değerli.' }
      ]
    },

    // ── SUÇ / KOLAY PARA ──
    { id:'sahte_evrak', role:'Manipülatif', title:'Liman Teklifi',
      text:'Limanda {char} sahte evrak işinde ortaklık öneriyor. Para büyük ama polis kokuyor.',
      choices:[
        { t:'Kabul et', m:350, h:25, set:['adam_ortak'], out:'Cebin doldu ama artık adların listede.' },
        { t:'Reddet, temiz kal', r:10, out:'"Korkak." dedi arkandan. Ama vicdanın rahat.' },
        { t:'İhbar et, polisin gözüne gir', r:18, h:-8, set:['polis_dostu','adam_dusman'], out:'{char} kelepçelendi. Karakolda adın "iyi vatandaş"a çıktı.'.replace('{char}','Adam') }
      ]
    },
    { id:'soygun', role:'Kavgacı', title:'Banka Önü', req:{maxR:70},
      text:'{char} sana banka soygununda şoförlük teklif ediyor. "Sadece direksiyon. Gerisi bizde."',
      choices:[
        { t:'Direksiyona geç', ch:{ p:0.55, ok:{m:900,h:30,set:['soyguncu'],out:'Lastikler cayırdadı, kaçtınız! Cebin para dolu, kalbin küt küt.'}, no:{h:45,r:-10,out:'Alarm çaldı, ekipler sardı. Zar zor sıvıştın ama yüzün kameralarda.'} } },
        { t:'"Ben bu işte yokum"', out:'Omuz silktin. Bazı kapılar kapalı kalmalı.' },
        { t:'Parayı al, son anda ekibi sat', m:200, h:15, r:-15, set:['hain_tohumu'], out:'Avansı cebe attın, ihbarı yaptın. Para senin... ama düşmanların oldu.' }
      ]
    },
    { id:'uyusturucu', role:'Paracı', title:'Arka Sokak', req:{maxR:75},
      text:'{char} ucuza mal verip "sen sat, kâr ortak" diyor. Sokakta talep çok.',
      choices:[
        { t:'Sat ve büyü', m:500, h:35, set:['torbaci'], out:'Para hızlı geldi. Ama bu işin sonu ya hapis ya mezar.' },
        { t:'Bir kerelik dene, sonra bırak', ch:{ p:0.6, ok:{m:300,h:15,out:'Tek seferde iyi para. Sonra elini çektin.'}, no:{h:30,r:-8,out:'İlk satışta sivil polise denk geldin. Kıl payı kaçtın.'} } },
        { t:'Teklifi geri çevir', r:8, out:'"Yazık, gözün açıktı" dedi. Sen yoluna baktın.' }
      ]
    },
    { id:'araba_calma', role:'Araba Delisi', title:'Gece Garajı',
      text:'{char} lüks bir aracın anahtarını sallıyor: "Çek gitsin, parçala, köşeyi dön."',
      choices:[
        { t:'Aracı çal', ch:{ p:0.5, ok:{m:650,h:25,set:['hirsiz'],out:'Araç tüter, cebin dolar. Tertemiz iş.'}, no:{h:40,r:-12,out:'Alarm, takip, kovalamaca... Aracı bıraktın, suçun kaldı.'} } },
        { t:'"Riskli, ben pas"', out:'{char} başını salladı: "Ödleğe bak."'.replace('{char}','O') },
        { t:'Aracı çal ama sahibine geri sat', m:400, h:20, r:5, set:['kurnaz'], out:'Hem çaldın hem fidye aldın. Şeytanın bile aklına gelmezdi.' }
      ]
    },
    { id:'kacakcilik', role:'Soğukkanlı', title:'Sınırda Yük', req:{maxR:80},
      text:'{char} sınırdan "soru sorulmayan" bir yük geçirecek birini arıyor. Ödeme dolgun.',
      choices:[
        { t:'Yükü taşı', ch:{ p:0.65, ok:{m:700,h:20,set:['kacakci'],out:'Yük yerine ulaştı. Cebin de.'}, no:{h:45,r:-15,out:'Kontrol noktası... Yük yakalandı, ucu ucuna sıvıştın.'} } },
        { t:'Reddet', r:6, out:'Bazı yükler insanı dibe çeker. Bırakmayı bildin.' }
      ]
    },

    // ── POLİS / HUKUK ──
    { id:'rusvet', title:'Devriye Durdurdu', req:{minH:30},
      text:'Bir devriye seni kenara çekti. Üstünü arayacaklar; üstünde işlerine yarar şeyler var.',
      choices:[
        { t:'Rüşvet teklif et', m:-300, h:-30, out:'Para el değiştirdi, mesele kapandı. Şimdilik.' },
        { t:'Hukuki hakkını kullan, sustun', ch:{ p:0.5, ok:{h:-10,r:5,out:'Bir şey bulamadılar, saygıyla bıraktılar.'}, no:{h:20,r:-8,out:'Üstün arandı, kayda geçtin. İşler kızıştı.'} } },
        { t:'Kaç!', ch:{ p:0.4, ok:{h:10,r:8,set:['kacak_kahraman'],out:'Ara sokaklara daldın, kaybettin onları. Adın sokakta efsane oldu.'}, no:{h:40,r:-15,out:'Yakalandın. Kaçmak suçunu katladı.'} } }
      ]
    },
    { id:'polis_teklif', role:'Şüpheci', title:'Karakola Çağrıldın', req:{minH:25,not:['kostebek']},
      text:'Bir komiser seni çağırdı: "Sokağı biliyorsun. Bize bilgi ver, dosyaların temizlensin."',
      choices:[
        { t:'Köstebek ol, anlaş', h:-35, r:-10, set:['kostebek','polis_dostu'], out:'Dosyaların eridi ama artık iki ateş arasındasın.' },
        { t:'Reddet, sokağa ihanet etme', r:15, set:['sokak_sadik'], out:'"Şerefli çıktın" dedi sokak. Bu para etmez ama yüzün ak.' },
        { t:'Oyala, iki tarafı da idare et', ch:{ p:0.5, ok:{r:5,h:-10,set:['cifte_oyun'],out:'İkisini de idare ettin. Tehlikeli ama işe yaradı.'}, no:{r:-20,h:15,set:['ifsa_oldu'],out:'Çifte oyunun patladı, iki taraf da sana sırt çevirdi.'} } }
      ]
    },
    { id:'mahkeme', title:'Mahkeme Günü', req:{minH:55},
      text:'Üst üste suçlar birikti, hakim karşısındasın. Avukatın "ya para ya yatarsın" diyor.',
      choices:[
        { t:'İyi avukat tut', m:-800, h:-40, out:'Para konuştu, ceza ertelendi. Kasan boşaldı ama dışarıdasın.' },
        { t:'Kendini savun', ch:{ p:0.35, ok:{h:-25,r:10,out:'Diliyle herkesi büyüledin, beraat! Şehir bunu konuşacak.'}, no:{h:25,r:-15,set:['sabikali'],out:'Savunman tutmadı, sabıkan kabardı.'} } }
      ]
    },

    // ── İŞ / TİCARET ──
    { id:'dukkan', title:'Boş Dükkan', req:{minM:600},
      text:'Merkezde kiralık bir dükkan var. Açarsan düzenli gelir, ama sermaye ister.',
      choices:[
        { t:'Dükkanı aç', m:-600, r:12, set:['dukkan_sahibi'], out:'Kepenkleri açtın. Artık şehirde bir yerin var.' },
        { t:'Şimdilik biriktir', out:'Acele etmedin. Doğru zaman gelir.' }
      ]
    },
    { id:'dukkan_buyut', req:{flags:['dukkan_sahibi'],minM:500}, title:'İkinci Şube',
      text:'Dükkan tuttu! İkinci şube açma vakti mi, yoksa kârı cebe mi?',
      choices:[
        { t:'Şube aç, imparatorluk kur', m:-500, r:18, set:['isadami'], out:'İkinci tabela asıldı. İnsanlar sana "patron" demeye başladı.' },
        { t:'Kârı topla, küçük kal', m:400, out:'Riske girmedin, kasayı doldurdun.' }
      ]
    },
    { id:'yatirim', role:'Hesapçı', title:'Yatırım Tüyosu',
      text:'{char} "garanti" bir yatırım fırsatından bahsediyor. Gözleri parlıyor.',
      choices:[
        { t:'Paranı yatır', ch:{ p:0.5, ok:{m:800,r:8,out:'Tüyo tuttu! Para katlandı.'}, no:{m:-500,out:'"Garanti" dedikleri çöktü. Cebin yandı.'} } },
        { t:'Az bir miktar dene', ch:{ p:0.55, ok:{m:250,out:'Küçük ama tatlı kâr.'}, no:{m:-150,out:'Az kaybettin, dersini aldın.'} } },
        { t:'Sahtekarlık sezip uzak dur', r:6, out:'İçgüdün haklıydı; iş birkaç gün sonra battı.' }
      ]
    },
    { id:'dolandiricilik', role:'Manipülatif', title:'Kolay Av', req:{maxR:80},
      text:'{char} saf bir zengini dolandırma planı kurmuş, senden ortak istiyor.',
      choices:[
        { t:'Tuzağı kur', ch:{ p:0.6, ok:{m:600,h:15,r:-5,set:['dolandirici'],out:'Adam farkına bile varmadı. Para sizin.'}, no:{h:30,r:-15,out:'Av meğer avcıymış, tuzak tersine döndü.'} } },
        { t:'Reddet', r:8, out:'Birini kandırmak sana göre değil.' }
      ]
    },

    // ── SOSYAL / İLİŞKİ ──
    { id:'dostluk', role:'Sadık', title:'Gerçek Dost',
      text:'{char} zor gününde yanında durdu, hiçbir şey istemeden. "Bu şehirde sırtını dayayacak biri lazım."',
      choices:[
        { t:'Dostluğu kabul et', r:12, set:['dostu_var'], out:'{char} ile yolların kesişti. Artık yalnız değilsin.'.replace('{char}','O') },
        { t:'Mesafeli kal', set:['yalniz_kurt'], out:'Kimseye güvenmedin. Belki güvenli, belki yalnız.' }
      ]
    },
    { id:'ihanet', role:'Hain', title:'Sırtından Bıçak', req:{flags:['dostu_var']},
      text:'Güvendiğin biri, {char}, seni arkadan sattı. Şimdi karşında sırıtıyor.',
      choices:[
        { t:'İntikam al', h:25, r:10, set:['intikamci'], out:'Hesabı sordun. Sokak senden korkmaya başladı.' },
        { t:'Affet, yoluna bak', r:8, clear:['dostu_var'], out:'Affetmek güçtür. Ama kalbin hafifledi.' },
        { t:'Soğukkanlıca planla', ch:{ p:0.6, ok:{r:15,m:200,set:['hesap_gunu'],out:'Sabırla kapana kıstırdın. İntikam soğuk yenen bir yemek.'}, no:{h:20,r:-10,out:'Planın sızdı, işler kontrolden çıktı.'} } }
      ]
    },
    { id:'romantik', role:'Romantik', title:'Beklenmedik Karşılaşma',
      text:'{char} ile bakışlarınız bir kafede kesişti. Şehrin gürültüsü bir an sustu.',
      choices:[
        { t:'Numarasını iste', ch:{ p:0.6, ok:{r:8,set:['ask'],out:'Gülümsedi ve numarasını verdi. Şehir bir anda güzelleşti.'}, no:{r:-3,out:'Kibarca reddetti. Olur böyle.'} } },
        { t:'Uzaktan izle, cesaret edemedin', out:'Bazı anlar kaçar. Belki bir dahakine.' }
      ]
    },
    { id:'dugun', req:{flags:['ask'],minM:400}, title:'Büyük Karar',
      text:'İlişki ciddileşti. Görkemli bir düğün mü, sade bir nikah mı, yoksa kaçmak mı?',
      choices:[
        { t:'Görkemli düğün yap', m:-700, r:20, set:['evli','halk_sevgilisi'], out:'Bütün şehir davetliydi. Adın ağızlara düştü.' },
        { t:'Sade nikah', m:-150, r:10, set:['evli'], out:'Gösterişsiz ama mutlu. En önemlisi bu.' },
        { t:'Son anda kaç', r:-20, set:['kacak_damat'], out:'Salondan kaçtın. Şehir bunu asla unutmayacak.' }
      ]
    },
    { id:'kavga', role:'Sinirli', title:'Barda Gerginlik',
      text:'{char} barda sana çattı, herkes izliyor. Gözler üstünde.',
      choices:[
        { t:'Yumruğu patlat', ch:{ p:0.55, ok:{r:12,h:15,set:['sert'],out:'Tek vuruşta yere serdin. Bara sessizlik çöktü, sonra alkış.'}, no:{r:-10,h:10,out:'Kavgayı kaybettin, hem caka hem itibar gitti.'} } },
        { t:'Sakin ol, gururunu yut', r:-5, out:'Geri çekildin. Bazıları "korkak" dedi, bazıları "olgun".' },
        { t:'Lafla geçiştir, dalga geç', ch:{ p:0.6, ok:{r:10,out:'Esprinle bütün barı güldürdün, adam rezil oldu.'}, no:{r:-8,h:5,out:'Şakan tutmadı, ortam daha da gerildi.'} } }
      ]
    },

    // ── KUMAR / ŞANS ──
    { id:'kumar', title:'Gece Kumarhanesi', req:{minM:200},
      text:'Yeraltı kumarhanesinde masa seni çağırıyor. Şans bu gece senden yana mı?',
      choices:[
        { t:'Büyük oyna', ch:{ p:0.4, ok:{m:1200,r:8,set:['kumarbaz_sansli'],out:'Masayı süpürdün! Krupiyenin yüzü düştü.'}, no:{m:-700,set:['kumar_borcu'],out:'Her şeyi kaybettin. Hatta biraz da borçlandın.'} } },
        { t:'Temkinli oyna', ch:{ p:0.55, ok:{m:300,out:'Ölçülü kazanç, masadan zararsız kalktın.'}, no:{m:-200,out:'Az kaybettin, kapıyı zamanında buldun.'} } },
        { t:'İzlemekle yetin', out:'Cebine güvendin, masaya değil. Akıllıca.' }
      ]
    },
    { id:'kumar_borc', req:{flags:['kumar_borcu']}, title:'Tahsildar', role:'Psikopat',
      text:'Kumar borcun için {char} kapına dayandı. Gözünde merhamet yok.',
      choices:[
        { t:'Borcu öde', m:-600, clear:['kumar_borcu'], out:'Son kuruşuna kadar ödedin. Ucuz kurtuldun sayılır.' },
        { t:'Süre iste', ch:{ p:0.45, ok:{h:10,out:'Bir hafta daha verdi. Şimdilik nefes aldın.'}, no:{h:30,r:-15,set:['dayak_yedi'],out:'Süre yok dedi. O gece pahalıya patladı.'} } },
        { t:'Karşı koy', ch:{ p:0.4, ok:{r:15,h:20,set:['korkusuz'],out:'Adamı kapından kovdun. Sokak bunu duydu.'}, no:{h:35,r:-20,m:-300,out:'Yanlış adama kafa tuttun. Bedeli ağır oldu.'} } }
      ]
    },
    { id:'piyango', title:'Sokak Satıcısı', w:0.7,
      text:'Köşedeki satıcı "bugünün şanslı bileti" diye tutturmuş. Birkaç kuruş.',
      choices:[
        { t:'Bilet al', ch:{ p:0.25, ok:{m:500,r:5,out:'İnanılmaz, tuttu! Şans bugün seninle.'}, no:{m:-50,out:'Yine boş çıktı. E, denemekten zarar gelmez.'} } },
        { t:'Boşver, yürü', out:'Şansını boşa harcamadın.' }
      ]
    },

    // ── YAYINCILIK / ŞÖHRET ──
    { id:'yayin', role:'Karizmatik', title:'Kamera Karşısı',
      text:'{char} "sende karizma var, yayın aç, şehir seni izlesin" diyor.',
      choices:[
        { t:'Yayına başla', ch:{ p:0.55, ok:{r:18,m:200,set:['yayinci'],out:'İlk yayında izleyici patladı! Şehrin yeni yüzü sensin.'}, no:{r:-5,out:'Kimse izlemedi. Sahne herkese göre değil.'} } },
        { t:'Kamera senlik değil', out:'Işıklar başkasının olsun, sen gölgede kal.' }
      ]
    },
    { id:'klip', req:{flags:['yayinci']}, title:'Viral An',
      text:'Yayında beklenmedik bir an yaşandı. Klip viral olma potansiyeli taşıyor.',
      choices:[
        { t:'Drama yarat, izlenme avla', r:-8, m:400, set:['drama_kralı'], out:'Klip patladı! Para geldi ama "ucuz şöhret" damgası da.' },
        { t:'Dürüst içerik üret', r:15, set:['saygin_yayinci'], out:'Kaliteyle büyüdün. İzleyicin sana saygı duyuyor.' }
      ]
    },

    // ── ŞİDDET / BÖLGE ──
    { id:'harac', role:'Silah Delisi', title:'Haraç Çetesi', req:{maxR:75},
      text:'{char} esnaftan haraç topluyor, "yanımda ol, pay senin" diyor.',
      choices:[
        { t:'Çeteye katıl', m:400, h:30, r:-12, set:['mafya_uye'], out:'Artık korkulansın. Ama esnaf sana lanet okuyor.' },
        { t:'Esnafı koru, çeteye karşı dur', ch:{ p:0.5, ok:{r:25,h:20,set:['halk_kahramani','mahalle_koruyucusu'],out:'Çeteyi kovdun! Mahalle seni omuzlarında taşıdı.'}, no:{h:30,r:-10,m:-200,out:'Kahramanlık pahalıya patladı, dayak yedin.'} } },
        { t:'Görmezden gel', out:'Sen karışmadın. Ama sessizliğin de bir seçim.' }
      ]
    },
    { id:'bolge_savasi', req:{flags:['mafya_uye'],minH:30}, title:'Bölge Savaşı', role:'Asi',
      text:'İki çete bölge için kapıştı, {char} seni ön saflara sürüyor. Kurşunlar havada.',
      choices:[
        { t:'Cesurca savaş', ch:{ p:0.45, ok:{r:20,h:25,set:['savas_kahramani'],out:'Bölgeyi kazandınız, adın korkuyla anılıyor.'}, no:{h:35,r:-15,set:['agir_yarali'],out:'Kurşun yedin, zar zor kurtuldun. Hastane masrafı cabası.'} } },
        { t:'Arkada dur, idare et', r:-8, out:'Ön saflara çıkmadın. Bazıları "ödlek" dedi.' },
        { t:'Çeteden kop, taraf değiştir', ch:{ p:0.5, ok:{r:5,h:-15,clear:['mafya_uye'],set:['donek'],out:'Doğru anda saf değiştirdin. Hayatta kaldın ama "dönek"sin.'}, no:{h:30,r:-20,set:['ihanet_yedi'],out:'İhanetini fark ettiler. İki taraf da peşinde.'} } }
      ]
    },
    { id:'suikast', req:{flags:['mafya_uye'],minH:50}, title:'Karanlık Emir', role:'Psikopat',
      text:'{char} sana bir "iş" veriyor: bir rakibi ortadan kaldıracaksın. Geri dönüşü yok.',
      choices:[
        { t:'Emri yerine getir', ch:{ p:0.5, ok:{m:1500,h:40,r:-10,set:['katil','baron_adayi'],out:'İş bitti. Cebin doldu ama ruhunda bir leke kaldı.'}, no:{h:50,r:-25,set:['aranan'],out:'İş ters gitti, her yerde aranıyorsun.'} } },
        { t:'Reddet, çizgini çek', r:15, h:10, set:['vicdanli','emir_reddetti'], out:'"Ben katil değilim" dedin. {char} dişlerini gıcırdattı ama saygı duydu.'.replace('{char}','O') }
      ]
    },

    // ── İYİLİK / İTİBAR ──
    { id:'yardim', title:'Yağmurda Bir Çocuk', w:0.9,
      text:'Sokakta üşüyen bir çocuk gördün. Kimse durmuyor.',
      choices:[
        { t:'Yardım et, sahip çık', m:-100, r:18, set:['merhametli'], out:'Çocuğa kol kanat gerdin. Bu şehirde iyilik nadirdir; insanlar fark etti.' },
        { t:'Yoluna devam et', r:-5, out:'Durmadın. İçinde küçük bir burukluk kaldı.' }
      ]
    },
    { id:'bagis', title:'Mahalle Toplantısı', req:{minM:500},
      text:'Mahalle, hastalanan bir esnaf için yardım topluyor. Gözler ceplerde.',
      choices:[
        { t:'Cömertçe bağışla', m:-400, r:20, set:['halk_sevgilisi'], out:'Eli açıklığın dilden dile dolaştı. Halk seni sevdi.' },
        { t:'Az bir şey ver', m:-50, r:5, out:'Bir şeyler verdin, gönlün rahat.' },
        { t:'Görmezden gel', r:-8, out:'Cüzdanın kapalı kaldı. Bazı bakışlar üstüne çevrildi.' }
      ]
    },
    { id:'sahit', title:'Tanık Olmak', req:{minH:0}, role:'Korkak',
      text:'Gözünün önünde {char} haksızlığa uğradı. İfade verirsen riske girersin.',
      choices:[
        { t:'Tanıklık et, doğruyu söyle', r:15, h:8, set:['durust'], out:'Doğruyu söyledin. Risk aldın ama vicdanın temiz.' },
        { t:'"Bir şey görmedim"', r:-8, out:'Sustun. Güvenli ama içine sinmedi.' }
      ]
    },

    // ── HAYAT / RASTGELE ──
    { id:'miras', title:'Beklenmedik Mektup', w:0.6,
      text:'Tanımadığın uzak bir akrabadan miras kaldığını öğrendin. Noter seni bekliyor.',
      choices:[
        { t:'Mirası al', m:700, r:5, out:'Hayat bazen gülümser. Cebin bir anda doldu.' },
        { t:'Reddet, "kirli para istemem"', r:12, set:['onurlu'], out:'Geçmişin gölgesini almak istemedin. Onurun yerinde.' }
      ]
    },
    { id:'kaza', title:'Trafik Kazası', w:0.7,
      text:'Karşıdan gelen araç sana çarptı. Sürücü panikle "anlaşalım" diyor.',
      choices:[
        { t:'Anlaş, parayı al', m:300, out:'Cebine biraz para girdi, mesele tatlıya bağlandı.' },
        { t:'Tutanak tut, hakkını ara', ch:{ p:0.6, ok:{m:600,r:5,out:'Haklı çıktın, tazminat aldın.'}, no:{m:-100,h:5,out:'İşler uzadı, masraf çıktı.'} } },
        { t:'Boşver, kibar davran', r:8, out:'Kavga etmedin. Sürücü minnettar kaldı.' }
      ]
    },
    { id:'hastalik', title:'Sağlık Uyarısı', req:{minH:40}, w:0.8,
      text:'Stres ve tehlikeli hayat seni yordu, doktor "yavaşla" diyor.',
      choices:[
        { t:'Bir süre düşük profil çiz', h:-25, m:-100, out:'Dinlendin, ortalık yatıştı. Sağlık her şeyden önce.' },
        { t:'Aldırma, devam et', h:8, r:5, set:['delikanli'], out:'"Bana bir şey olmaz" dedin. Risk seninle.' }
      ]
    },
    { id:'eski_dost', title:'Geçmişten Biri', role:'Vicdanlı',
      text:'{char}, yıllar önce tanıdığın biri, kapına geldi. Yardıma ihtiyacı var.',
      choices:[
        { t:'Elini uzat', m:-200, r:12, set:['sadik_dost'], out:'Geçmişe sahip çıktın. {char} gözleri dolu teşekkür etti.'.replace('{char}','O') },
        { t:'Kapıyı kapat', r:-8, out:'Geçmişi içeri almadın. Belki doğru, belki acımasız.' }
      ]
    },

    // ── GEÇ OYUN / GÜÇ HAMLELERİ ──
    { id:'taht_hamle', req:{minR:60,minM:1500,maxH:65}, title:'Tahta Oynamak', role:'Lider',
      text:'Şehrin önde gelenleri seni masaya çağırdı. {char}: "Krallık boş. İstersen senin."',
      choices:[
        { t:'Tahtı talep et', ch:{ p:0.6, ok:{r:25,m:500,set:['sehrin_krali'],out:'Masaya yumruğunu vurdun, kimse karşı çıkamadı. Şehir senindir!'}, no:{r:-15,h:20,set:['basarisiz_darbe'],out:'Hamlen erken oldu, rakipler birleşti, geri püskürtüldün.'} } },
        { t:'Gücü perde arkasından kullan', r:10, m:300, set:['gizli_patron'], out:'Tahtı istemedin ama ipler senin elinde. Asıl güç görünmeyendir.' },
        { t:'Reddet, sade kal', r:5, out:'"Taç ağır gelir" dedin. Belki de en bilgesi buydu.' }
      ]
    },
    { id:'baron_yukselis', req:{flags:['baron_adayi'],minM:1000}, title:'Baronun Yükselişi', role:'Manipülatif',
      text:'Yaptığın işler seni zirveye taşıdı. {char} diz çöküp "emret patron" diyor.',
      choices:[
        { t:'İmparatorluğu ilan et', r:15, h:15, set:['baron'], out:'Artık yeraltının baronusun. Adın korkuyla fısıldanıyor.' },
        { t:'Emekli ol, parayı götür', m:800, h:-30, set:['emekli_baron'], out:'Zirvede bıraktın. Cebin dolu, sırtın temiz.' }
      ]
    },
    { id:'kacis', req:{minH:70,minM:800}, title:'Son Çıkış', role:'Soğukkanlı',
      text:'Tehlike tavan yaptı, ensende boza pişiyor. {char} sahte pasaport ve bir uçak bileti uzatıyor.',
      choices:[
        { t:'Şehri terk et, kaç', m:-700, h:-50, set:['kacti'], out:'Gece yarısı şehri arkanda bıraktın. Özgürsün ama sürgünsün.' },
        { t:'Kal, sonuna kadar göğüsle', set:['kalan'], out:'Kaçmadın. Ne olursa olsun bu senin şehrin.' }
      ]
    },
    { id:'final_secim', req:{minR:50}, title:'Halkın Çağrısı', w:0.8,
      text:'Halk meydanda toplandı, senin adını haykırıyor. Bir konuşma her şeyi değiştirebilir.',
      choices:[
        { t:'Halka liderlik et', r:18, set:['halk_lideri'], out:'Sözlerin meydanı tutuşturdu. Sen artık bir simgesin.' },
        { t:'Alçakgönüllü kal', r:8, out:'Sahneyi reddettin. Mütevazılığın da bir güç.' }
      ]
    }
  ],

  // ── SONLAR (sırayla kontrol edilir; ilk uyan kazanır; en alttaki her zaman uyar) ──
  endings: [
    { id:'jail', emoji:'🚔', title:'İçeri Düştün', color:'#ff544d', cond:{busted:true},
      text:'Tehlike tavan yaptı ve şafak baskınıyla içeri alındın. Şehir hayatı parmaklıklar ardında bitti — ama efsaneler hapisten de doğar.' },
    { id:'kacti', emoji:'✈️', title:'Sürgün', color:'#60a5fa', cond:{flags:['kacti']},
      text:'Sahte pasaportla şehri terk ettin. Özgürsün ama bir daha asla evine dönemeyeceksin. Bazen kazanmak, oyunu terk etmektir.' },
    { id:'kral', emoji:'👑', title:'Şehrin Kralı', color:'#ffd98a', cond:{minM:2500,minR:75,maxH:65},
      text:'Sıfırdan geldin, şehri avucunun içine aldın. Para, itibar, güç — hepsi senin. Tahtın sağlam, adın efsane.' },
    { id:'baron', emoji:'🔫', title:'Yeraltı Baronu', color:'#ff8a80', cond:{flags:['baron']},
      text:'Karanlık yollardan zirveye tırmandın. Şehrin gölgeleri sana ait; adın fısıltıyla, korkuyla anılıyor.' },
    { id:'mudur', emoji:'👮', title:'Emniyetin Adamı', color:'#3cddc7', cond:{flags:['polis_dostu'],minR:55,maxH:35},
      text:'Doğru tarafta durdun, kanunun gözünde değerlisin. Şehri içeriden temizledin — kimileri kahraman, kimileri köstebek der.' },
    { id:'kahraman', emoji:'🦸', title:'Halkın Kahramanı', color:'#ffb95f', cond:{flags:['halk_kahramani'],minR:65},
      text:'Zayıfın yanında durdun, çeteye kafa tuttun. Mahalle adını dualarla anıyor. Bu şehirde gerçek güç, sevgidir.' },
    { id:'yayinci', emoji:'🎤', title:'Şehrin Sesi', color:'#a78bfa', cond:{flags:['saygin_yayinci'],minR:55},
      text:'Kameranın karşısında şehri büyüledin. Binler seni izliyor, sözün dinleniyor. Şöhret ışıkları üstünde.' },
    { id:'patron', emoji:'💼', title:'Beyaz Yakalı Patron', color:'#ffd98a', cond:{minM:3000,maxH:45},
      text:'Tabela üstüne tabela astın, temiz parayla imparatorluk kurdun. Takım elbisen lekesiz, kasan dolu.' },
    { id:'isadami', emoji:'🏢', title:'Saygın İş İnsanı', color:'#3cddc7', cond:{flags:['isadami'],minR:45},
      text:'Dükkanın şubelere dönüştü. Riskten uzak, alın teriyle bir hayat kurdun. Herkes sana "patron" diyor.' },
    { id:'kostebek', emoji:'🐀', title:'Köstebek', color:'#9a969e', cond:{flags:['kostebek']},
      text:'İki ateş arasında oynadın. Hayatta kaldın ama ne sokak ne kanun sana tam güveniyor. Yalnız bir yol seçtin.' },
    { id:'sevgili', emoji:'❤️', title:'Şehrin Sevileni', color:'#ffb4ac', cond:{flags:['halk_sevgilisi'],minR:50},
      text:'Ne en zengin ne en güçlüsün — ama bu şehir seni seviyor. Bir yuvan, bir çevren, huzurun var. Belki de asıl zenginlik bu.' },
    { id:'efsane_sokak', emoji:'🥊', title:'Sokağın Efsanesi', color:'#ff8a80', cond:{minR:60},
      text:'Yumruğunla, lafınla, duruşunla saygı kazandın. Cebin çok dolu olmasa da sokakta adın geçince herkes susar.' },
    { id:'soytari', emoji:'🤡', title:'Şehrin Soytarısı', color:'#ff544d', cond:{maxR:20,maxM:200},
      text:'Ne para, ne itibar... Herkesin güldüğü, kimsenin ciddiye almadığı bir tip oldun. Şehir seni bir fıkra gibi anlatıyor. Ama hey — en azından unutulmadın!' },
    { id:'besparasiz', emoji:'💸', title:'Beş Parasız', color:'#9a969e', cond:{maxM:60},
      text:'Cebin bomboş, hayallerin dağıldı. Şehir acımasızdı. Ama nefes alıyorsun — ve bu şehirde yarın hep yeni bir şanstır.' },
    { id:'vatandas', emoji:'🌆', title:'Sıradan Bir Vatandaş', color:'#cfcdd6', cond:{},
      text:'Ne kral ne soytarı oldun. Kalabalığın içinde, sıradan ama dürüst bir hayat sürdün. Şehir döner, sen de onunla birlikte.' }
  ]
};

// ═══════════════════════════════════════════════════
// MOTOR
// ═══════════════════════════════════════════════════
function _rpCid(c){ return String(c.dbId || c.id); }
function _rpActive(){
  var all = (typeof chars !== 'undefined' ? chars : []).filter(function(c){ return c.a; });
  if (_rpsimAllowed && _rpsimAllowed.length) {
    var set = {}; _rpsimAllowed.forEach(function(x){ set[String(x)] = 1; });
    var sel = all.filter(function(c){ return set[_rpCid(c)]; });
    if (sel.length) return sel; // sadece admin'in belirlediği karakterler
  }
  return all;
}
function _rpEsc(s){ return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }

function _rpPickChar(role){
  var active = _rpActive(); if (!active.length) return null;
  var used = (rpsimState && rpsimState.usedChars) ? rpsimState.usedChars : {};
  var pool = active;
  if (role) { var br = active.filter(function(c){ return c.tip === role; }); if (br.length) pool = br; }
  var fresh = pool.filter(function(c){ return !used[_rpCid(c)]; });
  var arr = fresh.length ? fresh : pool;
  var c = arr[Math.floor(Math.random() * arr.length)];
  if (c && rpsimState) rpsimState.usedChars[_rpCid(c)] = 1;
  return c || null;
}
function _rpClamp(){
  var s = rpsimState.stats;
  s.money = Math.max(0, Math.round(s.money));
  s.rep = Math.max(0, Math.min(100, Math.round(s.rep)));
  s.heat = Math.max(0, Math.min(100, Math.round(s.heat)));
}
function _rpApply(eff){
  if (!eff) return;
  var s = rpsimState.stats;
  if (eff.m) s.money += eff.m;
  if (eff.r) s.rep += eff.r;
  if (eff.h) s.heat += eff.h;
  if (eff.set) eff.set.forEach(function(f){ rpsimState.flags[f] = 1; });
  if (eff.clear) eff.clear.forEach(function(f){ delete rpsimState.flags[f]; });
  _rpClamp();
}
function _rpReqOk(req){
  if (!req) return true;
  var s = rpsimState.stats, f = rpsimState.flags;
  if (req.flags) { for (var i = 0; i < req.flags.length; i++) if (!f[req.flags[i]]) return false; }
  if (req.not) { for (var j = 0; j < req.not.length; j++) if (f[req.not[j]]) return false; }
  if (req.minM != null && s.money < req.minM) return false;
  if (req.maxM != null && s.money > req.maxM) return false;
  if (req.minR != null && s.rep < req.minR) return false;
  if (req.maxR != null && s.rep > req.maxR) return false;
  if (req.minH != null && s.heat < req.minH) return false;
  if (req.maxH != null && s.heat > req.maxH) return false;
  return true;
}
function _rpEndOk(c){
  if (!c) return true;
  if (c.busted) return false; // busted yalnız doğrudan tetiklenir
  var s = rpsimState.stats, f = rpsimState.flags;
  if (c.flags) { for (var i = 0; i < c.flags.length; i++) if (!f[c.flags[i]]) return false; }
  if (c.not) { for (var j = 0; j < c.not.length; j++) if (f[c.not[j]]) return false; }
  if (c.minM != null && s.money < c.minM) return false;
  if (c.maxM != null && s.money > c.maxM) return false;
  if (c.minR != null && s.rep < c.minR) return false;
  if (c.maxR != null && s.rep > c.maxR) return false;
  if (c.minH != null && s.heat < c.minH) return false;
  if (c.maxH != null && s.heat > c.maxH) return false;
  return true;
}

function rpsimStart(){
  if (typeof checkBanned === 'function' && checkBanned()) return;
  _rpsimLoadConfig();
  var ag = document.getElementById('ag');
  var D = window.RPSIM;
  var pre = '';
  try { if (typeof curUser === 'object' && curUser) pre = curUser.username || curUser.name || ''; } catch (e) {}
  var modes = D.modes.map(function(m){
    return '<button class="btn" onclick="rpsimBegin(' + m.r + ')" style="flex:1;min-width:130px;padding:16px;background:#1b1b24;border:1px solid rgba(167,139,250,0.25);color:#e4e1ee">' +
      '<div class="fd" style="font-size:18px;color:#a78bfa">' + m.t + '</div>' +
      '<div style="font-size:12px;color:#9a969e;margin-top:2px">' + m.s + '</div>' +
    '</button>';
  }).join('');
  ag.innerHTML =
    '<div style="max-width:680px;margin:0 auto;padding:40px 20px;text-align:center">' +
      '<div style="width:104px;height:104px;border-radius:26px;background:linear-gradient(135deg,rgba(167,139,250,0.12),rgba(255,185,95,0.08));display:flex;align-items:center;justify-content:center;font-size:54px;margin:0 auto 22px;border:1px solid rgba(167,139,250,0.2)">🎮</div>' +
      '<h2 style="font-family:Bebas Neue,sans-serif;font-size:clamp(40px,6vw,66px);letter-spacing:3px;color:#e4e1ee;margin-bottom:8px">RP SİMÜLASYONU</h2>' +
      '<div style="width:90px;height:4px;background:linear-gradient(90deg,#a78bfa,#ffb95f);margin:0 auto 20px;border-radius:2px"></div>' +
      '<p style="font-size:17px;color:#cfcdd6;line-height:1.7;max-width:520px;margin:0 auto 10px">Şehre sıfırdan geldin. Verdiğin her karar seni bir adım yukarı ya da aşağı taşıyacak. <b style="color:#ffd98a">Şehrin kralı mı</b> olacaksın, yoksa <b style="color:#ff8a80">soytarısı mı</b>?</p>' +
      '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin:22px 0 6px;font-size:14px">' +
        '<span style="color:#ffd98a">💰 Para</span><span style="color:#ffb95f">👑 İtibar</span><span style="color:#ff6a63">🔥 Tehlike</span>' +
      '</div>' +
      '<p style="font-size:12px;color:#6a6878;margin-bottom:24px">Dikkat: Tehlike 🔥 çok yükselirse içeri düşersin. Statlarına göre onlarca farklı sondan biriyle bitirirsin.</p>' +
      '<div style="max-width:340px;margin:0 auto 22px;text-align:left">' +
        '<label style="display:block;font-size:13px;color:#9a969e;margin-bottom:7px;text-align:center">Şehirdeki adın ne olsun?</label>' +
        '<input id="rp-name" maxlength="24" value="' + _rpEsc(pre) + '" placeholder="Adını yaz..." ' +
          'onkeydown="if(event.key===\'Enter\')rpsimBegin(12)" ' +
          'style="width:100%;padding:14px 16px;background:#1b1b24;border:1px solid rgba(167,139,250,0.3);border-radius:12px;color:#e4e1ee;font-size:16px;text-align:center;outline:none" ' +
          'onfocus="this.style.borderColor=\'#a78bfa\'" onblur="this.style.borderColor=\'rgba(167,139,250,0.3)\'">' +
      '</div>' +
      '<p style="font-size:13px;color:#6a6878;margin-bottom:10px">Mod seç ve şehre in:</p>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' + modes + '</div>' +
    '</div>';
  setTimeout(function(){ var el = document.getElementById('rp-name'); if (el && !el.value) el.focus(); }, 50);
}

function rpsimBegin(rounds){
  var nameEl = document.getElementById('rp-name');
  var name = nameEl ? (nameEl.value || '').trim() : '';
  if (!name) { if (typeof toast === 'function') toast('Önce şehirdeki adını gir.', false); if (nameEl) nameEl.focus(); return; }
  if (name.length > 24) name = name.slice(0, 24);
  var D = window.RPSIM;
  rpsimState = {
    stats: { money: D.start.money, rep: D.start.rep, heat: D.start.heat },
    flags: {}, used: {}, usedChars: {},
    turn: 0, totalRounds: rounds || D.runLength,
    cur: null, curChar: null, end: null,
    playerName: name
  };
  rpsimNext();
}

function rpsimNext(){
  var s = rpsimState; if (!s) return;
  if (s.stats.heat >= 100) { return rpsimEnd(true); }
  s.turn++;
  if (s.turn > s.totalRounds) { return rpsimEnd(false); }
  var D = window.RPSIM;
  var pool = D.scenarios.filter(function(sc){
    if (sc.once !== false && s.used[sc.id]) return false;
    if (sc.start && s.turn !== 1) return false;
    if (!sc.start && s.turn === 1) return false; // 1. tur sadece başlangıç(lar)
    return _rpReqOk(sc.req);
  });
  if (!pool.length) { return rpsimEnd(false); }
  var total = 0; pool.forEach(function(sc){ total += (sc.w || 1); });
  var rnd = Math.random() * total, pick = pool[0];
  for (var i = 0; i < pool.length; i++) { rnd -= (pool[i].w || 1); if (rnd <= 0) { pick = pool[i]; break; } }
  s.cur = pick; s.used[pick.id] = 1;
  s.curChar = (pick.role || pick.char) ? _rpPickChar(pick.role) : null;
  s._roll = null;
  renderRpsimScenario();
}

function _rpText(t){
  var name = rpsimState.curChar ? ((rpsimState.curChar.n || '') + ' ' + (rpsimState.curChar.s || '')).trim() : 'tanımadığın biri';
  var pname = (rpsimState && rpsimState.playerName) ? rpsimState.playerName : 'sen';
  return _rpEsc(t)
    .replace(/\{char\}/g, '<b style="color:#e4e1ee">' + _rpEsc(name) + '</b>')
    .replace(/\{name\}/g, '<b style="color:#a78bfa">' + _rpEsc(pname) + '</b>');
}
function _rpEnsureStyle(){
  if (typeof document === 'undefined' || document.getElementById('rpsim-style')) return;
  var st = document.createElement('style');
  st.id = 'rpsim-style';
  st.textContent =
    '@keyframes rpFade{from{opacity:0}to{opacity:1}}' +
    '@keyframes rpFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}' +
    '@keyframes rpPop{0%{opacity:0;transform:scale(.82)}60%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}' +
    '@keyframes rpGlow{0%,100%{box-shadow:0 0 20px rgba(167,139,250,.18)}50%{box-shadow:0 0 38px rgba(167,139,250,.42)}}' +
    '.rp-fade{animation:rpFade .4s ease both}' +
    '.rp-fadeup{animation:rpFadeUp .45s ease both}' +
    '.rp-pop{animation:rpPop .5s cubic-bezier(.2,.9,.3,1.3) both}' +
    '.rp-choice{transition:transform .15s ease,border-color .15s ease,background .15s ease}' +
    '.rp-choice:hover{transform:translateY(-2px);border-color:#a78bfa !important;background:#2a2433 !important}' +
    '.rp-choice:hover .rp-arrow{transform:translateX(4px);color:#a78bfa}' +
    '.rp-avatar{animation:rpGlow 2.8s ease-in-out infinite}';
  (document.head || document.body).appendChild(st);
}
function _rpStatBar(){
  var s = rpsimState.stats;
  function bar(v, col){ return '<div style="height:6px;border-radius:4px;background:#2a2a35;overflow:hidden;margin-top:8px"><div style="width:' + v + '%;height:100%;background:' + col + ';border-radius:4px;transition:width .4s ease"></div></div>'; }
  function card(emoji, label, val, col, barHtml){
    return '<div style="flex:1;min-width:96px;background:#1b1b24;border:1px solid rgba(91,64,61,0.2);border-radius:14px;padding:13px 15px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:19px">' + emoji + '</span><span class="fd" style="font-size:23px;color:' + col + ';line-height:1">' + val + '</span></div>' +
      '<div style="font-size:10px;letter-spacing:1.2px;color:#6a6878;margin-top:4px">' + label + '</div>' + (barHtml || '') +
    '</div>';
  }
  var heatCol = s.heat >= 70 ? '#ff544d' : '#ff8a80';
  return '<div style="display:flex;gap:10px;width:100%">' +
    card('💰', 'PARA', s.money, '#ffd98a', '') +
    card('👑', 'İTİBAR', s.rep, '#ffb95f', bar(s.rep, '#ffb95f')) +
    card('🔥', 'TEHLİKE', s.heat, heatCol, bar(s.heat, 'linear-gradient(90deg,#ffb95f,#ff544d)')) +
  '</div>';
}
function _rpDeltaRow(d){
  if (!d) return '';
  var chips = [];
  function chip(emoji, label, val, good){
    var col = good ? '#7ee0c8' : '#ff8a80';
    var arrow = val > 0 ? '▲' : '▼';
    var sign = val > 0 ? '+' : '';
    return '<div class="rp-pop" style="display:flex;flex-direction:column;align-items:center;gap:3px;background:' + (good ? 'rgba(60,221,199,0.08)' : 'rgba(255,84,77,0.08)') + ';border:1px solid ' + col + '40;border-radius:13px;padding:11px 18px;min-width:80px">' +
      '<div style="font-size:11px;color:#9a969e;letter-spacing:.5px">' + emoji + ' ' + label + '</div>' +
      '<div class="fd" style="font-size:20px;color:' + col + '">' + arrow + ' ' + sign + val + '</div>' +
    '</div>';
  }
  if (d.m) chips.push(chip('💰', 'Para', d.m, d.m > 0));
  if (d.r) chips.push(chip('👑', 'İtibar', d.r, d.r > 0));
  if (d.h) chips.push(chip('🔥', 'Tehlike', d.h, d.h < 0)); // tehlikenin azalması iyidir
  if (!chips.length) return '<div style="margin-top:18px;font-size:13px;color:#6a6878">Tablolar değişmedi — ama her seçim bir iz bırakır.</div>';
  return '<div style="display:flex;gap:11px;justify-content:center;flex-wrap:wrap;margin-top:22px">' + chips.join('') + '</div>';
}

function renderRpsimScenario(){
  _rpEnsureStyle();
  var s = rpsimState;
  var ag = document.getElementById('ag');
  var sc = s.cur;
  var segs = '';
  for (var i = 1; i <= s.totalRounds; i++) {
    var done = i < s.turn, cur = i === s.turn;
    segs += '<div style="flex:1;height:6px;border-radius:3px;background:' + (done ? '#a78bfa' : (cur ? 'linear-gradient(90deg,#a78bfa,#ffb95f)' : '#26262f')) + '"></div>';
  }
  var charBlock = '';
  if (s.curChar) {
    charBlock = '<div class="rp-fadeup" style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px">' +
      '<div class="rp-avatar" style="width:112px;height:112px;border-radius:50%;overflow:hidden;border:3px solid rgba(167,139,250,0.4)">' + (typeof cp === 'function' ? cp(s.curChar, 112) : '') + '</div>' +
      '<div style="font-size:16px;color:#e4e1ee;font-weight:700;margin-top:11px">' + _rpEsc((s.curChar.n || '') + ' ' + (s.curChar.s || '')) + '</div>' +
      (s.curChar.tip ? '<div style="font-size:12px;color:#a78bfa;margin-top:3px;letter-spacing:.5px;text-transform:uppercase">' + _rpEsc(s.curChar.tip) + '</div>' : '') +
    '</div>';
  }
  var choices = sc.choices.map(function(ch, idx){
    return '<button class="rp-choice rp-fade" onclick="rpsimChoose(' + idx + ')" style="display:flex;align-items:center;gap:15px;width:100%;text-align:left;background:#1f1f28;border:1px solid rgba(91,64,61,0.22);border-radius:14px;padding:18px 20px;margin-bottom:12px;cursor:pointer;animation-delay:' + (idx * 70) + 'ms">' +
      '<span style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:rgba(167,139,250,0.14);color:#a78bfa;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px">' + (idx + 1) + '</span>' +
      '<span style="flex:1;font-size:16px;color:#e4e1ee;font-weight:600;line-height:1.45">' + _rpEsc(ch.t) + '</span>' +
      '<span class="rp-arrow" style="flex-shrink:0;font-size:24px;color:#6a6878;transition:all .15s">›</span>' +
    '</button>';
  }).join('');
  ag.innerHTML =
    '<div style="max-width:840px;margin:0 auto;padding:8px 18px 56px;width:100%">' +
      '<div style="margin-bottom:24px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
          '<span class="fd" style="font-size:15px;letter-spacing:1.5px;color:#cfcdd6">👤 ' + _rpEsc(s.playerName || '') + '</span>' +
          '<span class="fd" style="font-size:15px;letter-spacing:1.5px;color:#9a969e">TUR ' + s.turn + ' / ' + s.totalRounds + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:18px">' + segs + '</div>' +
        _rpStatBar() +
      '</div>' +
      charBlock +
      '<div class="rp-fadeup" style="text-align:center;margin-bottom:12px"><h2 class="fd" style="font-size:clamp(30px,5vw,48px);color:#e4e1ee;letter-spacing:.5px;line-height:1.08">' + _rpEsc(sc.title) + '</h2></div>' +
      '<div class="rp-fadeup" style="background:linear-gradient(135deg,rgba(167,139,250,0.07),rgba(255,185,95,0.03));border:1px solid rgba(167,139,250,0.14);border-radius:18px;padding:24px 28px;margin:0 auto 28px;max-width:680px">' +
        '<p style="font-size:18px;color:#e8e6ef;line-height:1.8;text-align:center;margin:0">' + _rpText(sc.text) + '</p>' +
      '</div>' +
      '<div>' + choices + '</div>' +
    '</div>';
}

function rpsimChoose(i){
  var s = rpsimState; if (!s || !s.cur) return;
  var ch = s.cur.choices[i]; if (!ch) return;
  var before = { money: s.stats.money, rep: s.stats.rep, heat: s.stats.heat };
  var outcome = ch.out || '';
  if (ch.ch) {
    var roll = Math.random() < ch.ch.p;
    var br = roll ? ch.ch.ok : ch.ch.no;
    _rpApply(br);
    if (br && br.out) outcome = br.out;
    s._roll = roll;
  } else {
    _rpApply(ch);
    s._roll = null;
  }
  s._delta = { m: s.stats.money - before.money, r: s.stats.rep - before.rep, h: s.stats.heat - before.heat };
  if (outcome || s._delta.m || s._delta.r || s._delta.h) renderRpsimOutcome(outcome);
  else rpsimNext();
}

function renderRpsimOutcome(text){
  _rpEnsureStyle();
  var s = rpsimState;
  var ag = document.getElementById('ag');
  var busted = s.stats.heat >= 100;
  var roll = s._roll;
  var headEmoji, headText, col;
  if (roll === true) { headEmoji = '🎉'; headText = 'ŞANS SENDEN YANA!'; col = '#3cddc7'; }
  else if (roll === false) { headEmoji = '💥'; headText = 'TERS GİTTİ!'; col = '#ff6a63'; }
  else { headEmoji = '🎬'; headText = 'KARARIN'; col = '#a78bfa'; }
  ag.innerHTML =
    '<div style="max-width:680px;margin:0 auto;padding:22px 18px 56px;width:100%">' +
      '<div style="margin-bottom:24px">' + _rpStatBar() + '</div>' +
      '<div class="rp-pop" style="background:#1b1b24;border:1px solid ' + col + '55;border-radius:20px;padding:32px 28px;text-align:center;box-shadow:0 10px 40px ' + col + '14">' +
        '<div style="font-size:50px;line-height:1;margin-bottom:8px">' + headEmoji + '</div>' +
        '<div style="font-size:13px;font-weight:800;letter-spacing:1.5px;color:' + col + ';margin-bottom:16px">' + headText + '</div>' +
        '<p style="font-size:18px;color:#e8e6ef;line-height:1.75;margin:0">' + _rpText(text || '') + '</p>' +
        _rpDeltaRow(s._delta) +
      '</div>' +
      (busted ? '<p style="text-align:center;color:#ff6a63;font-size:14px;margin-top:18px;font-weight:600">🚔 Tehlike tavan yaptı, işler kontrolden çıkıyor...</p>' : '') +
      '<button class="btn bp rp-fade" style="width:100%;padding:18px;font-size:18px;margin-top:22px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none;animation-delay:.28s" onclick="rpsimNext()">' + (busted ? 'Sonu Gör →' : 'Devam →') + '</button>' +
    '</div>';
}

function rpsimEnd(busted){
  var s = rpsimState, D = window.RPSIM;
  var end = null;
  if (busted) { for (var b = 0; b < D.endings.length; b++) { if (D.endings[b].cond && D.endings[b].cond.busted) { end = D.endings[b]; break; } } }
  if (!end) { for (var i = 0; i < D.endings.length; i++) { if (_rpEndOk(D.endings[i].cond)) { end = D.endings[i]; break; } } }
  if (!end) end = D.endings[D.endings.length - 1];
  s.end = end;
  renderRpsimEnd(end);
}

function renderRpsimEnd(end){
  var s = rpsimState;
  var ag = document.getElementById('ag');
  var st = s.stats;
  function statBox(emoji, label, val, col){
    return '<div style="flex:1;min-width:90px;background:#1b1b24;border:1px solid rgba(91,64,61,0.18);border-radius:12px;padding:14px;text-align:center">' +
      '<div style="font-size:22px">' + emoji + '</div>' +
      '<div class="fd" style="font-size:22px;color:' + col + ';margin-top:4px">' + val + '</div>' +
      '<div style="font-size:11px;color:#6a6878;letter-spacing:.5px">' + label + '</div>' +
    '</div>';
  }
  _rpEnsureStyle();
  ag.innerHTML =
    '<div class="rp-fadeup" style="max-width:640px;margin:0 auto;padding:34px 20px 56px;width:100%;text-align:center">' +
      '<div style="font-size:13px;letter-spacing:2px;color:#9a969e;margin-bottom:8px">' + _rpEsc((s.playerName || '').toUpperCase()) + ' · ŞEHİRDEKİ HİKAYEN BİTTİ</div>' +
      '<div class="rp-pop" style="font-size:92px;line-height:1;margin:14px 0 6px;filter:drop-shadow(0 0 30px ' + end.color + '66)">' + end.emoji + '</div>' +
      '<h2 class="fd rp-pop" style="font-size:clamp(36px,6.5vw,60px);letter-spacing:1px;color:' + end.color + ';margin-bottom:6px">' + _rpEsc(end.title) + '</h2>' +
      '<div style="width:80px;height:4px;background:' + end.color + ';margin:0 auto 20px;border-radius:2px;opacity:.7"></div>' +
      '<p style="font-size:17px;color:#cfcdd6;line-height:1.8;max-width:540px;margin:0 auto 28px">' + _rpEsc(end.text) + '</p>' +
      '<div style="display:flex;gap:10px;margin-bottom:26px">' +
        statBox('💰', 'PARA', st.money, '#ffd98a') +
        statBox('👑', 'İTİBAR', st.rep, '#ffb95f') +
        statBox('🔥', 'TEHLİKE', st.heat, '#ff6a63') +
      '</div>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn bp" style="padding:16px 32px;font-size:16px;background:linear-gradient(135deg,#a78bfa,#8b5cf6);border:none" onclick="rpsimStart()">🔄 Tekrar Oyna</button>' +
        '<button class="btn bg" style="padding:16px 32px;font-size:16px" onclick="rpsimShare()">📤 Paylaş</button>' +
      '</div>' +
    '</div>';
}

function rpsimShare(){
  var s = rpsimState; if (!s || !s.end) return;
  var st = s.stats;
  var txt = '🎮 EightbornV RP Simülasyonu\n' + (st && s.playerName ? s.playerName + ' — ' : '') + 'Unvanım: ' + s.end.emoji + ' ' + s.end.title + '\n💰 ' + st.money + '  👑 ' + st.rep + '  🔥 ' + st.heat + '\nSen şehirde ne olacaksın?';
  var full = txt + (typeof location !== 'undefined' ? '\n' + location.origin : '');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(full).then(function(){ if (typeof toast === 'function') toast('📋 Sonucun panoya kopyalandı!'); }, function(){ if (typeof toast === 'function') toast('Kopyalanamadı.', false); });
  } else if (typeof toast === 'function') { toast('Paylaşım metni hazır.'); }
}
