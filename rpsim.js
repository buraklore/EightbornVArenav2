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
    { id:'kiralik_oda', start:true, role:'Cimri', title:'Kiralık Oda',
      text:'Şehirdeki ilk gecen. {char} sana harap bir oda gösteriyor: "İki ay peşin, yoksa kapı orada." Cebinde ancak yarısı var.',
      choices:[
        { t:'Kalanına borç sözü ver', h:5, set:['borclu_kira'], out:'Adam homurdandı ama anahtarı verdi. Borç artık boynunda.' },
        { t:'Pazarlık et, gözünün içine bak', ch:{ p:0.55, ok:{m:-60,r:8,set:['ikna_kabiliyeti'],out:'Dilini iyi kullandın, tek aya indirdi. İlk küçük zaferin.'}, no:{m:-120,r:-4,out:'Adam taş gibiydi: "Param pazarlık tanımaz." Yarısını zar zor denkleştirdin.'} } },
        { t:'Boş ver, parkta sabahla', r:5, h:-3, set:['temkinli'], out:'Bankta üşüdün ama paran cebinde kaldı. Şehre temkinli giriyorsun.' }
      ]
    },
    { id:'ilk_is_ilani', start:true, char:true, title:'İş İlanları Panosu',
      text:'Sabahın köründe iş ilanları panosunun önündesin. {char} yanına sokulup fısıldıyor: "Pano boş ver, ben sana iş bulurum... gerçek iş."',
      choices:[
        { t:'Panodaki temiz işe başvur', r:8, m:40, set:['calisan'], out:'Bir kafede işe girdin. Az para, temiz vicdan, doğru başlangıç.' },
        { t:'Onu dinle, "gerçek iş" neymiş bak', h:10, set:['merakli'], out:'Adam sırıttı: "Aferin, gözün açık. Yakında konuşuruz." Tehlikeye ilk adım.' },
        { t:'İkisine de güvenme, kendi yolunu çiz', r:5, set:['bagimsiz'], out:'Kimsenin adamı olmadan başladın. Zor ama tamamen senin.' }
      ]
    },
    { id:'ilk_gece_test', start:true, role:'Asi', title:'Sokağın Sınavı',
      text:'Daha valizini açmadan sokağın delikanlısı {char} önünü kesti: "Burası benim sokağım. Geçiş için ne verirsin?"',
      choices:[
        { t:'Gözünü kırpmadan üstüne yürü', ch:{ p:0.5, ok:{r:10,h:8,set:['gozu_kara'],out:'Bir adım geri attı: "Tamam tamam, dost olalım." Sokakta nam saldın.'}, no:{r:-6,h:8,out:'İş itişmeye döndü, biraz hırpalandın. Ama korkmadığını gördüler.'} } },
        { t:'Şakaya vur, gülümseyip geç', r:6, set:['karizma_kivilcimi'], out:'Lafı tatlıya bağladın. "Komikmişsin" dedi, yol verdi.' },
        { t:'Birkaç kuruş ver, olay çıkarma', m:-30, set:['temkinli'], out:'Ufak parayla sıyrıldın. Bazen huzur ucuza gelir.' }
      ]
    },
    { id:'eski_tanidik', start:true, role:'Sadık', title:'Tanıdık Bir Yüz',
      text:'Otogarda hiç beklemediğin biri: {char}, memleketten bir tanıdık. "Sen de mi buralara düştün? Gel, sana etrafı göstereyim."',
      choices:[
        { t:'Peşine takıl, ona güven', r:6, set:['dostu_var'], out:'Kapıları sana açtı. Bu şehirde yalnız değilsin artık.' },
        { t:'Teşekkür et ama mesafeli dur', r:4, set:['temkinli'], out:'Selamı aldın, yolunu ayırdın. Eski tanıdık her zaman dost olmaz.' },
        { t:'Hemen ondan borç iste', m:60, r:-5, set:['borclu'], out:'Eline biraz para tutuşturdu ama yüzü asıldı. İlk izlenim böyle olmaz.' }
      ]
    },
    { id:'op_garaj', start:true, role:'Çalışkan', title:'Garaj Kapısı',
      text:'Şehirde ilk sabahın. {char} yağ içindeki ellerini siliyor: "Çırak mı arıyorsun? Bana yardım et, sana kalacak yer de ayarlarım."',
      choices:[
        { t:'Kollarını sıva, işe gir', r:8, m:40, set:['calisan'], out:'Akşama kadar çalıştın, eline biraz para ve bir yatak geçti. Dürüst başlangıç.' },
        { t:'"Daha iyi planlarım var" de', r:4, set:['hirsli'], out:'Adam omuz silkti: "Nasıl bilirsen." Büyük hayallerle yola koyuldun.' },
        { t:'Aletlerden birini cebe at', m:120, r:-8, h:8, set:['eli_egri'], out:'Pahalı bir alet cebinde. Ama {char} sayar gibi baktı arkandan.' }
      ]
    },
    { id:'op_dolmus', start:true, char:true, title:'Dolmuştaki Çanta',
      text:'Şehre giren dolmuşta {char} inerken koltuğun altında dolu bir çanta unuttu. Kimse fark etmedi.',
      choices:[
        { t:'Arkasından koş, çantayı ver', r:14, set:['durust'], out:'Nefes nefese yetiştirdin. "Sağ ol evlat" dedi, cebine harçlık sıkıştırdı.' },
        { t:'İçine bak, sonra karar ver', h:6, ch:{ p:0.5, ok:{m:160,out:'İçinden bir tomar para çıktı, kimse görmeden cebe indi.'}, no:{r:-6,out:'Tam bakarken biri gördü: "O senin değil!" Mahcup bıraktın.'} } },
        { t:'Şoföre teslim et', r:8, out:'"Sahibi arar bulur" dedin. Doğru olanı yaptın, içine sinerek indin.' }
      ]
    },
    { id:'op_market_acik', start:true, role:'Cimri', title:'Kasada Açık',
      text:'İlk alışverişinde kasada {char} suratını astı: "Paran yetmiyor delikanlı, ya bir şey bırak ya tamamla."',
      choices:[
        { t:'Birkaç şeyi geri koy', r:4, set:['idareli'], out:'Mahcup ama dik durdun. Az ama paranla aldın.' },
        { t:'Tatlı dille veresiye iste', ch:{ p:0.5, ok:{r:8,set:['dilbaz'],out:'Adamı yumuşattın: "Bir dahakine getir." Defterine yazdı.'}, no:{r:-4,out:'"Burada veresiye yok" dedi sertçe. Eli boş çıktın.'} } },
        { t:'Sıra arkanı görmeden cebe indir', m:40, r:-8, h:10, set:['eli_egri'], out:'Bir paket cebinde. Kapıdan çıkarken kalbin küt küt attı.' }
      ]
    },
    { id:'op_kanepe', start:true, role:'Sadık', title:'Misafir Kanepesi',
      text:'Kalacak yerin yok. {char} kapısını açtı: "Kanepe senin. Ama bir iyilik isteyeceğim, olur mu?"',
      choices:[
        { t:'"Tabii, ne istersen" de', r:8, set:['dostu_var'], out:'Minnet borcun oldu ama bir dostun da var artık. Bu şehirde paha biçilmez.' },
        { t:'Önce iyiliği bir duy', r:4, set:['temkinli'], out:'"Önce dinleyeyim" dedin. Akıllıca; her kapı bedava değil.' },
        { t:'Teşekkür et, otele git', m:-80, set:['bagimsiz'], out:'Kimseye borçlanmadın ama cebin inceldi. Bağımsızlığın bedeli.' }
      ]
    },
    { id:'op_sokak_muzik', start:true, role:'Karizmatik', title:'Sokak Müziği',
      text:'Meydanda çalan {char} sana göz kırptı: "Sesin var mı? Gel beraber çalalım, kasayı paylaşırız."',
      choices:[
        { t:'Mikrofonu kap, sahne al', ch:{ p:0.55, ok:{m:120,r:12,set:['sahne_yildizi'],out:'Kalabalık toplandı, şapka doldu! İlk günden meydanı tuttun.'}, no:{r:-5,out:'Sesin kısıldı, birkaç kişi güldü. Yine de denedin.'} } },
        { t:'Şapkayı dolaştır, ona eşlik et', m:60, r:6, out:'Sen toplarken o çaldı. Az ama hoş bir başlangıç parası.' },
        { t:'İzleyip geç', out:'Müziğin tadını çıkardın ama gölgede kaldın. Sahne sıranı bekliyor.' }
      ]
    },
    { id:'op_bilinmeyen_numara', start:true, char:true, title:'Bilinmeyen Numara',
      text:'Telefonun çaldı, tanımadığın bir numara. {char} öteki uçtan: "Şehre yeni geldin değil mi? Sana kolay para işi var."',
      choices:[
        { t:'"Anlat bakalım" de', h:10, set:['merakli'], out:'Sesini kıstı, bir adres verdi. Tehlikeye ilk adımı attın.' },
        { t:'Numarayı kapat, engelle', r:6, set:['temkinli'], out:'"Yanlış numara" deyip kapattın. Bu şehirde her teklif tuzak olabilir.' },
        { t:'Numarayı kaydet, sonra düşün', set:['kapida_firsat'], out:'Belki lazım olur diye kaydettin. Karar sonraya kaldı.' }
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
    },

    // ── GÜNLÜK HAYAT / SOKAK (yeni; çoğu eşiksiz, erken oyunda çıkar) ──
    { id:'kayip_cuzdan', char:true, title:'Kayıp Cüzdan',
      text:'Yolda tıka basa dolu bir cüzdan buldun: kimlik ve bir tomar para. {char} uzaktan seni süzüyor.',
      choices:[
        { t:'Sahibini bul, olduğu gibi teslim et', r:15, m:30, set:['durust'], out:'Adam minnettar kaldı, küçük bir bahşiş verdi. İyiliğin dilden dile dolaştı.' },
        { t:'Parayı al, cüzdanı çöpe at', m:220, r:-12, h:5, out:'Cebin doldu ama içine bir sıkıntı çöktü. {char} her şeyi gördü.' },
        { t:'Parayı al ama kimliği postala', m:180, r:-3, out:'Hem para cebinde hem vicdanın yarı rahat. Gri bölgede yaşamayı öğreniyorsun.' }
      ]
    },
    { id:'yankesici', role:'Asi', title:'Otobüste El',
      text:'Tıklım tıklım otobüste bir el cebine daldı! {char} telefonunu kapıp koşmaya başladı.',
      choices:[
        { t:'Peşinden koş!', ch:{ p:0.5, ok:{r:10,set:['hizli_ayak'],out:'İki sokak sonra yakaladın, telefonu geri aldın. Nefes nefese ama gururlusun.'}, no:{h:10,r:-5,out:'Köşeyi dönerken kaybettin. Hem telefon gitti hem nefesin.'} } },
        { t:'Bağır, kalabalığı harekete geçir', r:8, ch:{ p:0.55, ok:{out:'Birkaç kişi yankesiciyi kıstırdı, telefonun geri geldi. Halk kahramanı oldun.'}, no:{r:-3,out:'Kimse kılını kıpırdatmadı. Şehir böyle işte.'} } },
        { t:'Boş ver, eski telefondu zaten', m:-50, out:'Üzülmedin bile. Yenisini alırsın, baş ağrısı istemezsin.' }
      ]
    },
    { id:'viral_video', char:true, title:'Kamera Sende',
      text:'Sokakta öyle bir an yaşandı ki {char} telefonu sana çevirdi: "Bu video patlar, poz ver!"',
      choices:[
        { t:'Kameraya kral gibi poz ver', r:12, set:['taniniyor'], out:'Video bir gecede yayıldı, sokakta tanınmaya başladın.' },
        { t:'Telefonu kap, "çekme dedim!"', h:10, r:-5, out:'Ortalık gerildi. Kimi "kibirli" dedi, kimi "haklı".' },
        { t:'Gülüp uzaklaş', out:'Şöhret peşinde değilsin, sessizce yoluna gittin.' }
      ]
    },
    { id:'komsu_kavgasi', role:'Sinirli', title:'Gece Yarısı Gürültü',
      text:'Gece yarısı duvar küt küt: {char} müziği sonuna kadar açmış. Kapısını çaldın.',
      choices:[
        { t:'Sakince rica et', r:8, set:['uzlasmaci'], out:'Beklemediği kadar kibardın. Sesi kıstı: "Kusura bakma komşu."' },
        { t:'Sert çık, ayar ver', h:12, ch:{ p:0.5, ok:{r:5,out:'Gözünü budaktan sakınmadın, adam sindi. Bir daha çıt çıkmadı.'}, no:{r:-8,h:8,out:'Laf lafı açtı, az kalsın yumruklaşıyordunuz. Tüm bina ayaktaydı.'} } },
        { t:'Yönetimi/polisi ara', r:-3, set:['polis_dostu'], out:'Şikayet ettin, ses kesildi. Ama komşun artık sana ters bakıyor.' }
      ]
    },
    { id:'sokak_yarisi', role:'Araba Delisi', title:'Gece Yarışı',
      text:'{char} motorunun gazını sıkıp meydan okudu: "Şehrin sonuna kadar yarış. Kaybeden 500 öder."',
      choices:[
        { t:'Gaza bas, yarış!', ch:{ p:0.5, ok:{m:500,r:10,h:10,set:['asfalt_kovboyu'],out:'Son virajı sıyırıp önce geçtin! Hem cebin hem adın büyüdü.'}, no:{m:-500,h:15,out:'Lastiğin kaydı, ikinci geldin. Hem para hem gurur gitti.'} } },
        { t:'Yarışma ama bahse oyna', ch:{ p:0.5, ok:{m:200,out:'Başkasına oynadın, isabet! Riski başkası aldı, parayı sen topladın.'}, no:{m:-150,out:'Yanlış ata oynadın, cebin sızladı.'} } },
        { t:'Aklını kullan, reddet', r:-4, out:'Arkandan "korkak" diye seslendiler. Ama sağ salim evdesin.' }
      ]
    },
    { id:'acik_mikrofon', char:true, title:'Açık Mikrofon Gecesi',
      text:'Mahalle kahvesinde açık mikrofon gecesi. {char} seni sahneye doğru itekliyor: "Hadi, bir şeyler yap!"',
      choices:[
        { t:'Sahneye çık, kalbini ortaya koy', ch:{ p:0.55, ok:{r:15,set:['sahne_yildizi'],out:'Salon ayağa kalktı! O gece herkes adını öğrendi.'}, no:{r:-8,out:'Sesin titredi, espriler tutmadı. Yine de denedin.'} } },
        { t:'Arkadaşını sahneye yolla', r:6, out:'Onu öne sürdün, alkışı paylaştınız. İyi bir dost hareketi.' },
        { t:'Köşede izlemeyi yeğle', out:'Sahne senlik değil. Çayını yudumlayıp keyfine baktın.' }
      ]
    },
    { id:'falci', char:true, title:'Köşedeki Falcı',
      text:'Loş bir köşede {char} elini uzatıyor: "Otur, falına bakayım. Geleceğin avucunda yazıyor."',
      choices:[
        { t:'Para ver, baktır', m:-60, set:['kismetli'], out:'"Önünde büyük bir kapı açılacak" dedi. İnandın mı bilinmez ama içine umut doldu.' },
        { t:'Gülüp geç, "boş işler"', r:3, out:'Falcı arkandan söylendi. Sen aklına güveniyorsun.' },
        { t:'Geleceğini sor, sonra kendin yaz', r:6, out:'"Geleceğimi ben kurarım" dedin. Falcı bile gülümsedi.' }
      ]
    },
    { id:'kira_zammi', role:'Cimri', title:'Kira Zammı',
      text:'Ev sahibin {char} kapıda: "Piyasa böyle, kira bu aydan zamlı." Cebine yeni bir darbe.',
      choices:[
        { t:'Sesini çıkarma, öde', m:-250, out:'Homurdanarak ödedin. Şehir pahalı, sen de yorgunsun.' },
        { t:'Pazarlık masasına otur', ch:{ p:0.5, ok:{m:-80,r:5,out:'Tatlı dille zammı yarıya indirdin. Diline sağlık.'}, no:{m:-250,r:-3,out:'Adam inat etti, tam zammı ödedin. Bir de surat astı.'} } },
        { t:'Taşın, daha ucuz yer bul', m:-100, h:-5, set:['gezgin'], out:'Eşyaları topladın, daha sakin bir köşeye yerleştin. Yük hafifledi.' }
      ]
    },
    { id:'kripto_tuyo', role:'Hesapçı', title:'İçeriden Tüyo',
      text:'{char} telefonunu gösterdi: "Şu coin uçuşa geçecek, içeriden bilgi. Ne koyarsan üçe katlar."',
      choices:[
        { t:'Var gücünle yatır', ch:{ p:0.4, ok:{m:600,set:['sansli_yatirimci'],out:'Grafik tavana vurdu! Cebin bir gecede şişti, inanılmaz.'}, no:{m:-400,out:'Coin çakıldı. "İçeriden bilgi" dediği şey duman çıktı.'} } },
        { t:'Azıcık dene, kalanı sakla', ch:{ p:0.5, ok:{m:200,out:'Küçük oynadın, küçük kazandın. Ama kazanç kazançtır.'}, no:{m:-120,out:'Az kaybettin. Temkin seni büyük zarardan kurtardı.'} } },
        { t:'"Bedava akıl pahalıya patlar", reddet', r:6, out:'{char} ısrar etti, sen direndin. Sonra coin battı, haklı çıktın.' }
      ]
    },
    { id:'sahte_saat', role:'Paracı', title:'Valizdeki Saatler',
      text:'{char} valizini açtı, içi ışıl ışıl "marka" saatlerle dolu: "Al sat, kâr katlanır. Kimse anlamaz."',
      choices:[
        { t:'Bir parti al, sokakta sat', ch:{ p:0.55, ok:{m:350,h:10,set:['seyyar_satici'],out:'Saatler kapış kapış gitti, cebin doldu. Kimse fark etmedi.'}, no:{m:-150,h:15,out:'Bir müşteri zabıtaymış. Malları kaptırdın, zar zor sıvıştın.'} } },
        { t:'Tek al, kendine tak', m:-90, set:['gosterisli'], out:'Bileğinde sahte de olsa parlıyor. Görüntü de bir sermayedir.' },
        { t:'"Sahtecilik bana göre değil"', r:5, out:'Teklifi geri çevirdin. Temiz para yavaş gelir ama rahat uyutur.' }
      ]
    },
    { id:'dilenci_cocuk', char:true, title:'Köşedeki Çocuk',
      text:'Köşede üşüyen bir çocuk eline bakıyor. {char} "boş ver, numaradır" diye dürtüyor seni.',
      choices:[
        { t:'Cebindekini paylaş', m:-40, r:15, set:['merhametli'], out:'Çocuğun gözleri parladı. Belki numaraydı belki değil ama vicdanın huzurlu.' },
        { t:'Para verme, sıcak yemek al', m:-25, r:10, out:'Eline poşeti tutuşturdun: "Para değil, karnın doysun."' },
        { t:'Yürü, görmezden gel', r:-8, out:'Adımını hızlandırdın. Ama o bakış aklından çıkmadı.' }
      ]
    },
    { id:'sokak_kopegi', title:'Topal Köpek',
      text:'Topal bir sokak köpeği peşine takıldı; kuyruğunu sallayıp gözlerini sana dikti.',
      choices:[
        { t:'Sahiplen, yanına al', m:-50, r:8, set:['can_dostu'], out:'Artık bir yol arkadaşın var. Bu şehirde koşulsuz sevgi nadirdir.' },
        { t:'Mama alıp bırak', m:-20, r:6, out:'Karnını doyurdun, başını okşadın. O da gözleriyle teşekkür etti.' },
        { t:'Kov, başından savsana', r:-5, out:'Ayağını yere vurdun, köpek mahzun uzaklaştı. İçin biraz cız etti.' }
      ]
    },
    { id:'kuyrukta_kaynak', role:'Bencil', title:'Sıra Kaynatan',
      text:'Saatlerdir sıradasın; tam sıra sana gelmişken {char} hiç sıkılmadan önüne geçti.',
      choices:[
        { t:'Sessizce yut, olay çıkarma', out:'İçini çektin, sıranı korumaya çalıştın. Bazen susmak yorucudur.' },
        { t:'Kibarca ama net uyar', r:8, ch:{ p:0.6, ok:{out:'"Haklısın, pardon" deyip geri çekildi. Mantıkla kazandın.'}, no:{r:-3,h:5,out:'Surat astı, lafı uzattı, sıra yine karıştı.'} } },
        { t:'Sesini yükselt, hesap sor', h:10, r:-5, out:'Ortalık karıştı, herkes döndü baktı. Haklıydın ama görüntü kötüydü.' }
      ]
    },
    { id:'tahsildar', role:'Sinirli', title:'Kapıdaki Tahsildar',
      text:'Kapın yumruklandı. {char}: "Filancanın borcu sana yazılmış diyorlar. Ya ödersin ya da..."',
      choices:[
        { t:'Yanlışlığı sakince anlat', r:6, ch:{ p:0.55, ok:{out:'Belgeyi gösterdin, yanıldığını anladı: "Kusura bakma." Mesele kapandı.'}, no:{h:10,out:'Dinlemedi bile: "Bahane istemem." Kapına bir tekme atıp gitti.'} } },
        { t:'Bir kısmını öde, başından savsana', m:-150, h:-5, out:'Cebinden çıktı ama bir daha gelmediler. Huzuru satın aldın.' },
        { t:'Kapıyı yüzüne kapat', h:15, r:-3, set:['inatci'], out:'"Ben kimseye borçlu değilim!" dedin. Ama bunun peşini bırakmazlar.' }
      ]
    },
    { id:'gizli_polis', role:'Şüpheci', title:'Sessiz Teklif', req:{minH:15},
      text:'Issız bir kafede {char} karşına oturdu, rozetini usulca gösterdi: "Bize bilgi ver, dosyan temizlensin."',
      choices:[
        { t:'Anlaşmayı kabul et', h:-20, r:-5, set:['muhbir','polis_dostu'], out:'Dosyan hafifledi ama artık iki ateş arasındasın. Sokak muhbir sevmez.' },
        { t:'"Ben kimseyi satmam", reddet', r:10, set:['sokak_adami'], out:'Ayağa kalktın, çıktın. Sokakta sözün artık daha çok geçiyor.' },
        { t:'Oyala, çift taraflı oyna', m:150, h:10, set:['cift_tarafli'], out:'Hem ondan para sızdırdın hem kimseyi tam ele vermedin. Tehlikeli bir dans.' }
      ]
    },
    { id:'hayir_galasi', role:'Karizmatik', title:'Hayır Gecesi', req:{minM:300},
      text:'Şehrin sosyetesinden {char} seni şık bir hayır gecesine çağırdı: "Doğru insanlar orada olacak."',
      choices:[
        { t:'Cömert bir bağış yap, parla', m:-300, r:18, set:['hayirsever'], out:'Adın sahneden anons edildi. Bir gecede saygın biri oldun.' },
        { t:'Sadece ağ kur, el sıkış', r:10, set:['baglantili'], out:'Cebini açmadan doğru elleri sıktın. Tanıdık bu şehirde altından değerli.' },
        { t:'Bedava büfeye dadan, sıvış', h:5, r:-6, out:'Karnını doyurdun, garsonun ters bakışıyla kaçtın. Komik ama ucuz kaçtı.' }
      ]
    },
    { id:'bahis_iddia', role:'Maceracı', title:'İddiaya Var mısın?',
      text:'{char} sırıtarak bir kâğıt uzattı: "İddiaya var mısın? Şu çılgın şeyi yaparsan para senin."',
      choices:[
        { t:'Kabul et, biraz çıldır', ch:{ p:0.55, ok:{m:200,r:8,set:['gozu_pek'],out:'Yaptın ve kazandın! Herkes kahkahayla seni omuzladı.'}, no:{r:-5,h:5,out:'Rezil oldun, iddiayı kaybettin. Ama efsane bir hikâyen oldu.'} } },
        { t:'Parayı ortaya koy, kafa kafaya', ch:{ p:0.5, ok:{m:250,out:'Soğukkanlılığın kazandırdı, masadaki parayı topladın.'}, no:{m:-200,out:'Son anda tereddüt ettin, kaybettin. Cesaret yarım kalmaz.'} } },
        { t:'"Çocukluk etme", reddet', r:-3, out:'Olgun davrandın. Kimi "sıkıcı" dedi ama paran cebinde.' }
      ]
    },
    { id:'eski_sevgili', role:'Kıskanç', title:'Beklenmedik Karşılaşma',
      text:'Bir kafede {char} karşına dikildi, gözleri öfkeli: "Demek beni unutup buralarda keyif yapıyorsun?"',
      choices:[
        { t:'Sakin ol, konuşarak çöz', r:8, set:['olgun'], out:'Sesini yükseltmedin, dinledin. Gerginlik yavaşça dağıldı.' },
        { t:'Net ol, "yollarımız ayrıldı"', r:5, set:['net_sinir'], out:'Kibar ama kesin konuştun. Sınır koymak da bir olgunluk.' },
        { t:'Lafa laf, eski defterleri aç', h:10, r:-6, out:'Tartışma büyüdü, herkes size baktı. İkiniz de yorgun düştünüz.' }
      ]
    },
    { id:'sadik_dost_borc', role:'Sadık', title:'Dostun Eli',
      text:'{char} mahcup bir yüzle yanına geldi: "Başım dertte, biraz borç verebilir misin? Söz, öderim."',
      choices:[
        { t:'Gözünü kırpmadan ver', m:-200, r:10, set:['dostu_var','comert'], out:'Parayı uzattın. {char} sarıldı: "Bunu unutmam." Gerçek dostluk böyle başlar.' },
        { t:'Elinden geleni ver', m:-80, r:6, set:['dostu_var'], out:'Az ama gönülden verdin. "Yeter de artar" dedi minnetle.' },
        { t:'Üzgünüm, kendi derdim başımdan aşkın', r:-8, set:['yalniz_kurt'], out:'Geri çevirdin. {char} anlayışla başını salladı ama gözlerinde kırgınlık vardı.' }
      ]
    },
    { id:'influencer_isbirligi', role:'Hovarda', title:'Parlak Teklif', req:{minR:20},
      text:'Pırıltılı bir influencer olan {char} sana yanaştı: "Hesabın yükseliyor. Beraber bir tanıtım yapalım; para da var, şöhret de."',
      choices:[
        { t:'Anlaşmayı kap', m:300, h:5, set:['taniniyor'], out:'Ortak paylaşım patladı; takipçin de cebin de büyüdü.' },
        { t:'Sıkı pazarlık et', ch:{ p:0.5, ok:{m:500,r:5,out:'Değerini bildin, ücreti katladın. Tam bir profesyonel gibi konuştun.'}, no:{r:-5,out:'Fazla diretince vazgeçti: "Başkasıyla yaparım." Fırsat kaçtı.'} } },
        { t:'"İmajımı satmam", reddet', r:8, set:['ilkeli'], out:'Parlak teklifi elinin tersiyle ittin. İlkelerinin fiyat etiketi yok.' }
      ]
    },

    // ── GÜNLÜK HAYAT 2 / DAHA FAZLA SENARYO (çoğu eşiksiz, erken oyunda çıkar) ──
    { id:'paket_tasi', role:'Şüpheci', title:'Şu Paketi Tut',
      text:'{char} elindeki kahverengi paketi sana uzattı: "Birkaç saat sende dursun, sorma içinde ne var. Karşılığını alırsın."',
      choices:[
        { t:'Tut, soru sorma', m:150, h:18, set:['adamlari_taniyor'], out:'Paket sende kaldı, cebine para girdi. Ama içinde ne olduğunu bilmemek huzur kaçırıyor.' },
        { t:'"İçini görmeden olmaz" de', ch:{ p:0.5, ok:{r:8,out:'Açtırdın; sıradan bir koliydi. Adam "temkinliymişsin" diye saygı duydu.'}, no:{h:8,r:-4,out:'Sinirlendi: "Güven yoksa iş de yok." Surat asıp gitti.'} } },
        { t:'Reddet, bulaşma', r:5, set:['temiz'], out:'"Kusura bakma, taşımam" dedin. Belki para kaçtı ama belan da kaçtı.' }
      ]
    },
    { id:'kurye', char:true, title:'Kurye Telaşı',
      text:'Elinde sıcak paket, müşteri {char} aramada: "Geç kaldın!" Trafik kilit, süre azalıyor.',
      choices:[
        { t:'Gaza bas, kestirmeden uç', ch:{ p:0.5, ok:{m:80,r:6,set:['hizci'],out:'Tam vaktinde yetiştin, bahşişi de kaptın. Adrenalin tavan.'}, no:{h:12,m:-30,out:'Köşede az kalsın çarpıyordun, paket dağıldı. Bahşiş yok, azar var.'} } },
        { t:'Kurallara uy, sakin git', m:30, out:'Biraz geç ama sağ salim teslim ettin. Düşük bahşiş, sıfır risk.' },
        { t:'Yolda bir lokma kendine ayır', m:20, r:-5, out:'Açlığa dayanamadın, paketten bir şey aşırdın. Müşteri eksik fark etti.' }
      ]
    },
    { id:'tikla_kazan', role:'Manipülatif', title:'Tıkla Kazan',
      text:'{char} telefonunu salladı: "Şu linke tıkla, anında 1000 kazandın diyor! Sadece kart bilgisi istiyor."',
      choices:[
        { t:'Hemen tıkla, bilgileri gir', m:-200, r:-5, h:5, out:'Hesabından para uçtu. "Kazandın" yazısı tuzakmış. Ders pahalıya patladı.' },
        { t:'"Dolandırıcılık bu" de, uzak dur', r:8, set:['uyanik'], out:'Tuzağı gördün. {char} sonra parasını kaptırınca sana hak verdi.' },
        { t:'Linki başkasına yolla', r:-10, h:5, out:'Belayı başkasına pasladın. Kısa süre sonra herkes sana ters bakmaya başladı.' }
      ]
    },
    { id:'piramit', role:'Karizmatik', title:'Hızlı Zengin Ağı',
      text:'{char} parlak bir sunum açtı: "Üç kişi bul, onlar da üçer bulsun, paralar sana aksın! Sisteme giriş sadece 300."',
      choices:[
        { t:'300 öde, sisteme gir', m:-300, ch:{ p:0.3, ok:{m:500,set:['sebekeci'],out:'Şans eseri birkaç kişi buldun, paran döndü. Ama kumar gibiydi.'}, no:{r:-6,out:'Kimseyi ikna edemedin, paran çöpe gitti. Piramidin altında kaldın.'} } },
        { t:'"Bu bir piramit" de, çık', r:8, set:['uyanik'], out:'Tuzağı yüzüne söyledin. Birkaç kişi seni dinleyip vazgeçti.' },
        { t:'Sen de birkaç enayi bul', m:200, r:-12, h:5, set:['sebekeci'], out:'Tanıdıklarını soktun, üstünden para kıydın. Ama güvenini yitirdin.' }
      ]
    },
    { id:'seminer', role:'Manipülatif', title:'Başarı Semineri',
      text:'Salon dolu, sahnedeki {char} bağırıyor: "Zengin olmak bir karar! Bugün kaydolana özel indirim!"',
      choices:[
        { t:'Coşkuya kapıl, kaydol', m:-150, r:3, out:'Motivasyon doldun ama cebin boşaldı. Slaytlar güzeldi, faturası acı.' },
        { t:'Bedava kısmı dinle, çık', r:5, set:['idareli'], out:'İşine yarayan birkaç şeyi bedavaya kaptın, paranı korudun.' },
        { t:'Arka sırada uyukla', r:-3, out:'Sıkıldın, kestirdin. Çıkışta ne öğrendiğini bile hatırlamıyorsun.' }
      ]
    },
    { id:'tezgah', char:true, title:'Sokak Tezgahı',
      text:'Boş bir köşe buldun. {char} yan tezgahtan seslendi: "Burada satış iyidir ama zabıta gelirse koş!"',
      choices:[
        { t:'Tezgahı kur, sat', ch:{ p:0.6, ok:{m:180,set:['esnaf'],out:'Mal güzel gitti, günü kârla kapattın. Sokağın yeni esnafı sensin.'}, no:{m:-60,h:8,out:'Zabıta bastı, tezgahı toplayamadan kaçtın. Biraz mal gitti.'} } },
        { t:'Önce izin işini araştır', m:-40, r:6, set:['kurali_seven'], out:'Harç yatırdın, yasal kurdun. Yavaş ama gönlün rahat.' },
        { t:'Vazgeç, riskli', out:'Köşeyi bıraktın. Belki para kaçtı ama dert de.' }
      ]
    },
    { id:'bahsis', char:true, title:'Yanlış Bahşiş',
      text:'Garson olduğun masada {char} hesabı öderken yanlışlıkla on katı bahşiş bıraktı, fark etmeden çıktı.',
      choices:[
        { t:'Arkasından koş, fazlayı ver', r:14, m:20, set:['durust'], out:'"Fazla bıraktınız" dedin. Hayran kaldı, küçük ama hak edilmiş bahşiş verdi.' },
        { t:'Cebe at, ses çıkarma', m:200, r:-8, out:'Kimse görmedi, para sende. Ama içinde küçük bir sızı kaldı.' },
        { t:'Patronla paylaş', m:90, r:5, out:'Dürüstçe bildirip böldünüz. Patronun gözünde adamın oldun.' }
      ]
    },
    { id:'otopark_cezasi', role:'Sinirli', title:'Otopark Cezası',
      text:'Aracına ceza yazan memur {char} kâğıdı uzattı: "Yanlış yere park, imzala bakalım."',
      choices:[
        { t:'Sakince itiraz et', ch:{ p:0.5, ok:{r:6,out:'Mantıklı konuştun, levha gerçekten yokmuş. Cezayı yırttı.'}, no:{m:-80,out:'Dinlemedi, cezayı kesti. En azından kibar kaldın.'} } },
        { t:'Sus, cezayı öde', m:-80, out:'Tartışmaya değmez dedin, ödedin. Canın sıkkın ama temiz.' },
        { t:'Memurla ağız dalaşına gir', h:12, r:-5, out:'Sesini yükselttin, iş büyüdü. Hem ceza hem baş ağrısı.' }
      ]
    },
    { id:'trafik_durdurma', role:'Soğukkanlı', title:'Yol Kontrolü', req:{minH:10},
      text:'Devriye seni kenara çekti. {char} camına eğildi: "Ehliyet, ruhsat. Bir de bagajı açalım."',
      choices:[
        { t:'Soğukkanlı ol, belgeleri ver', ch:{ p:0.6, ok:{h:-10,out:'Sakinliğin işe yaradı, bir şey bulamadı: "İyi yolculuklar." Rahat bir nefes.'}, no:{h:8,out:'Tedirginliğini sezdi, uzun uzun aradı. Bir şey çıkmadı ama terledin.'} } },
        { t:'Sıvışmak için gaza bas', h:25, r:-8, set:['aranan'], out:'Kaçtın ama plakanı aldılar. Artık adın listede.' },
        { t:'Tatlı dille muhabbete gir', r:5, h:-5, set:['polis_dostu'], out:'Memurla iki çift laf, gülümseme. Seni rahat bıraktı.' }
      ]
    },
    { id:'protesto', char:true, title:'Yolu Kapatan Kalabalık',
      text:'Meydan kalabalık, {char} pankartı sallıyor: "Gel aramıza, sesini duyur!" Polis de tetikte.',
      choices:[
        { t:'Kalabalığa katıl', r:10, h:10, set:['halk_adami'], out:'Sloganlara karıştın, halk seni sevdi ama polis fişledi.' },
        { t:'Kenardan izle, karışma', out:'Olanları izledin, sessiz kaldın. Ne kahraman ne suçlu.' },
        { t:'Telefonla çek, yayınla', r:6, ch:{ p:0.5, ok:{set:['taniniyor'],out:'Görüntülerin yayıldı, takipçin arttı.'}, no:{h:8,out:'Polis çektiğini görünce peşine düştü, zor sıvıştın.'} } }
      ]
    },
    { id:'elektrik_kesintisi', title:'Elektrik Kesintisi',
      text:'Tüm mahalle karanlığa gömüldü. Sokakta kıpırtılar, bazı dükkanların kepenkleri aralık.',
      choices:[
        { t:'Komşulara mum dağıt', m:-20, r:12, set:['merhametli'], out:'Karanlıkta elinden tutan oldun. Mahalle seni konuştu.' },
        { t:'Açık kepenklerden faydalan', m:180, r:-12, h:18, set:['eli_egri'], out:'Karanlıktan istifade ettin, cebin doldu. Ama biri gölgeni gördü.' },
        { t:'Evde otur, geçmesini bekle', out:'Mum ışığında bekledin. Sıkıcı ama sorunsuz bir geceydi.' }
      ]
    },
    { id:'kayip_kedi', title:'Kayıp Kedi İlanı',
      text:'Direkte bir ilan: "Kedimi bulana ödül." Az ileride tarif edilen kedi bir çöpün başında.',
      choices:[
        { t:'Yakala, sahibine götür', m:80, r:10, set:['iyi_kalp'], out:'Kediyi kucağında getirdin, sahibi ağladı, ödülü verdi. Tatlı bir gün.' },
        { t:'Doyur ama elleme', m:-15, r:5, out:'Karnını doyurdun, sahibine yerini haber verdin. Sade ama iyi.' },
        { t:'Görmezden gel', out:'Yoluna devam ettin. Kedi arkandan miyavladı.' }
      ]
    },
    { id:'yasli_komsu', role:'Vicdanlı', title:'Yardıma Muhtaç Komşu',
      text:'Üst kattaki yaşlı komşu {char} merdivende zorlanıyor: "Evladım, şu poşetleri taşır mısın?"',
      choices:[
        { t:'Poşetleri taşı, hatırını sor', r:12, set:['hurmetli'], out:'Yardım ettin, duacı oldu. Mahallede saygın bir yer edindin.' },
        { t:'Taşı ama harçlık iste', m:30, r:-3, out:'Yardım ettin ama para isteyince yüzü düştü. Garip bir an oldu.' },
        { t:'Acelem var deyip geç', r:-6, out:'Geçip gittin. Arkandan iç çekti, sen de biraz utandın.' }
      ]
    },
    { id:'kayip_cocuk', char:true, title:'Kaybolan Çocuk',
      text:'Kalabalıkta ağlayan bir çocuk eteğine yapıştı. Anne baba ortada yok, {char} de duruma şaşkın.',
      choices:[
        { t:'Güvenliğe götür, sakinleştir', r:14, set:['guvenilir'], out:'Çocuğu güvenliğe teslim ettin, ailesi sarıldı. Herkes seni alkışladı.' },
        { t:'Anonsa kadar yanında kal', r:10, out:'Elini tutup bekledin. Annesi gelince gözyaşlarıyla teşekkür etti.' },
        { t:'Başkası ilgilensin, uzaklaş', r:-8, out:'Sıvıştın. Çocuğun ağlaması kulağında kaldı.' }
      ]
    },
    { id:'taklit_bilet', role:'Paracı', title:'Sahte Konser Bileti',
      text:'{char} destesini gösterdi: "Konser kapalı gişe! Bu sahte biletleri kapıda sat, üç katı kâr."',
      choices:[
        { t:'Kapıda sat', ch:{ p:0.5, ok:{m:300,h:12,set:['vurguncu'],out:'Biletler kapış kapış, cebin doldu. Kapıdan uzaklaşırken sırıttın.'}, no:{m:-100,h:18,r:-6,out:'Bir alıcı sahte olduğunu anladı, ortalık karıştı. Zor kaçtın.'} } },
        { t:'Sadece birini al, kendin git', m:-60, r:3, out:'Riske girmedin, bir bilet alıp konsere gittin. Gece keyifliydi.' },
        { t:'"Sahtecilik yok" de', r:6, set:['durust'], out:'Teklifi reddettin. {char} omuz silkip başkasını aradı.' }
      ]
    },
    { id:'grafiti', role:'Asi', title:'Duvar Boş',
      text:'Sprey elinde {char} koca bir duvarı gösterdi: "Adını buraya yaz, şehir seni konuşsun. Ama yakalanma."',
      choices:[
        { t:'Geceyi boya, imza at', ch:{ p:0.55, ok:{r:10,set:['sokak_sanatcisi'],out:'Sabah herkes duvarına baktı. Sokakta bir efsane doğdu.'}, no:{h:15,r:-4,out:'Devriye bastı, spreyle yakalandın. Az kalsın içeri giriyordun.'} } },
        { t:'İzinli bir duvara çiz', r:8, set:['sanatci'], out:'Belediyenin verdiği duvara çizdin. Hem yasal hem alkış aldın.' },
        { t:'Spreyi geri ver', out:'"Bana göre değil" dedin. Duvar bomboş kaldı, sen temiz.' }
      ]
    },
    { id:'gozcu', role:'Korkak', title:'Sadece Gözcülük',
      text:'{char} fısıldadı: "İş basit, sen sadece köşede dur, polis gelirse haber ver. Payını alırsın."',
      choices:[
        { t:'Köşeye geç, gözcülük yap', m:150, h:20, set:['suc_ortagi'], out:'İş bitti, payını aldın. Ama artık sen de o işin içindesin.' },
        { t:'"Bulaşmam" de, çek git', r:6, set:['temiz'], out:'Geri çekildin. Para kaçtı ama sabıka da kaçtı.' },
        { t:'Kabul et ama ortada kaybol', m:-10, r:-5, h:8, out:'Söz verip ekmeyi denedin; yarı yolda tüydün. Kimse memnun kalmadı.' }
      ]
    },
    { id:'kamerasiz_dukkan', role:'Hain', title:'Kamerasız Dükkan',
      text:'{char} dirsek attı: "Şu dükkanda kamera yok, kasa da dolu. İkimize yeter."',
      choices:[
        { t:'Birlikte gir, kasayı boşalt', m:350, h:30, set:['hirsiz'], out:'Hızlı ve sessiz; cepler doldu. Ama artık geri dönüşü olmayan bir yola girdin.' },
        { t:'"Yapma, değmez" de', r:8, out:'Onu vazgeçirmeye çalıştın. Belki dinledi belki dinlemedi ama sen temizsin.' },
        { t:'Dükkan sahibini uyar', r:12, h:-5, set:['polis_dostu'], out:'Sessizce sahibini uyardın. {char} planı suya düştü, sokakta saygın oldun.' }
      ]
    },
    { id:'piyango_kazi', char:true, title:'Kazı Kazan',
      text:'Bayide {char} bir kazı kazan uzattı: "Hadi şansını dene, belki bugün günündür."',
      choices:[
        { t:'Al, kazı', m:-20, ch:{ p:0.35, ok:{m:200,set:['sansli'],out:'Üç aynı sembol! Küçük ama tatlı bir ikramiye cebinde.'}, no:{out:'Hiçbir şey çıkmadı. 20 lira dumana gitti, gülüp geçtin.'} } },
        { t:'Üç tane al, garantile', m:-60, ch:{ p:0.6, ok:{m:150,out:'Birinden ufak bir ikramiye çıktı, zararını kapattın.'}, no:{out:'Üçü de boş. Şans bugün başka kapıda.'} } },
        { t:'"Şans oyununa para yok" de', r:4, out:'Parana kıyamadın. Bazen kazanmak, oynamamaktır.' }
      ]
    },
    { id:'sokak_sihirbazi', role:'Maceracı', title:'Üç Kâğıt',
      text:'{char} üç bardağı hızla karıştırdı: "Topu bul, paranı ikiye katla. Gözün hızlı mı?"',
      choices:[
        { t:'Oyna, bahse gir', m:-50, ch:{ p:0.35, ok:{m:200,out:'Doğru bardağı seçtin! Etraf alkışladı, paran katlandı.'}, no:{out:'Top hiç orada değildi. Klasik tuzak, cebin sızladı.'} } },
        { t:'Numarayı izle, kapma', r:6, set:['uyanik'], out:'El çabukluğunu çözdün, oynamadın. Adam "uyanıkmışsın" dedi.' },
        { t:'Kalabalığı uyar', r:8, h:5, out:'"Bu tuzak!" diye bağırdın. Sihirbaz toparlanıp kayboldu.' }
      ]
    },
    { id:'poker_gece', role:'Hesapçı', title:'Poker Gecesi',
      text:'Loş bir masada {char} kartları dağıttı: "Gir oyuna, ama soğukkanlı ol. Burada duygusal olan kaybeder."',
      choices:[
        { t:'Hesaplı oyna', ch:{ p:0.5, ok:{m:250,set:['kumarbaz'],out:'Blöfü zamanında yaptın, masayı topladın. Soğukkanlılık kazandırdı.'}, no:{m:-200,out:'Eline güvendin ama tuzağa düştün. Cebin hafifledi.'} } },
        { t:'Küçük oyna, izle', ch:{ p:0.55, ok:{m:80,out:'Az koydun, az kazandın. Tecrübe biriktirdin.'}, no:{m:-60,out:'Küçük kayıplarla kalktın. Akıllıca.'} } },
        { t:'Masaya oturma', r:3, out:'"Bu gece olmaz" dedin. Cüzdanın sana teşekkür etti.' }
      ]
    },
    { id:'bilek_guresi', role:'Cesur', title:'Bilek Güreşi',
      text:'Mekânın ortasında {char} kolunu masaya koydu: "Yenersen para senin, yenilirsen ödersin. Var mısın?"',
      choices:[
        { t:'Kabul et, bileğe yüklen', ch:{ p:0.5, ok:{m:150,r:8,set:['guclu'],out:'Masaya yapıştırdın! Mekân ayağa kalktı, paran ve namın arttı.'}, no:{m:-100,r:-3,out:'Bileğin büküldü, kaybettin. Gururun biraz incindi.'} } },
        { t:'Şakaya vur, reddet', r:3, out:'Gülerek geçtin. Kimse zorlamadı, gece akışına döndü.' },
        { t:'Bahsi yükselt, restle', ch:{ p:0.45, ok:{m:300,r:10,out:'Yüksek bahis, büyük zafer! Efsane bir an yaşattın.'}, no:{m:-250,out:'Hırsın ağır bastı, büyük kaybettin. Pahalı bir ders.'} } }
      ]
    },
    { id:'karaoke', char:true, title:'Karaoke Yarışması',
      text:'Sahnede mikrofon boş, {char} seni dürtüyor: "Yarışma var, kazanan ödülü kapıyor. Çık hadi!"',
      choices:[
        { t:'Sahneye çık, bas sesi', ch:{ p:0.5, ok:{m:120,r:14,set:['sahne_yildizi'],out:'Salonu coşturdun, birinci oldun! Ödül ve alkış senin.'}, no:{r:-6,out:'Notalar kaçtı, biraz utandın. Ama cesaretine herkes saygı duydu.'} } },
        { t:'Düet teklif et', r:8, out:'Birini sahneye çektin, beraber söylediniz. Eğlence ikiye katlandı.' },
        { t:'İzleyici kal', out:'Sahne korkusu ağır bastı. Çayını içip izledin.' }
      ]
    },
    { id:'yemek_yarisi', role:'Aptal', title:'Yemek Yarışı',
      text:'{char} kocaman bir tabak gösterdi: "On dakikada bitirirsen para senin. Miden bu işe var mı?"',
      choices:[
        { t:'Saldır tabağa', ch:{ p:0.5, ok:{m:120,r:6,set:['obur'],out:'Son lokmayı da götürdün! Kalabalık tezahürat yaptı, ödül senin.'}, no:{m:-40,r:-3,h:3,out:'Yarıda pes ettin, midene de kötü oldu. Komik ama acı.'} } },
        { t:'Tabağı paylaşmayı öner', r:5, out:'Yarışı şölene çevirdin. Kazanan yok ama herkes doydu, güldü.' },
        { t:'"Bu mideyi riske atmam" de', r:2, out:'Aklını kullandın. Hafif bir şeyler atıştırıp keyfine baktın.' }
      ]
    },
    { id:'spor_salonu', role:'Hovarda', title:'Salon Üyeliği',
      text:'Parlak eşofmanlı {char} broşür sıkıştırdı: "Bir yıllık üyelikte mega indirim! Hemen imzala, sonra pişman olursun."',
      choices:[
        { t:'Hemen imzala', m:-200, r:5, set:['formda'], out:'Bir yıllık üyelik cebinden çıktı. Belki gidersin, belki gitmezsin.' },
        { t:'Önce deneme dersi iste', r:6, set:['idareli'], out:'Bedava deneme kopardın, taahhüde girmedin. Akıllı hamle.' },
        { t:'Kibarca reddet', out:'"Düşüneyim" deyip kaçtın. Cebin de dizlerin de rahat.' }
      ]
    },
    { id:'doktor_faturasi', title:'Hastane Faturası',
      text:'Posta kutunda kalın bir zarf: geçen haftaki muayenenin faturası, hiç beklemediğin kadar kabarık.',
      choices:[
        { t:'Tamamını öde', m:-250, r:3, set:['sorumlu'], out:'Borcunu kapattın. Cebin yandı ama için rahat.' },
        { t:'Taksitlendirmeye çalış', ch:{ p:0.6, ok:{m:-80,out:'İdareyle konuştun, taksite böldüler. Yük hafifledi.'}, no:{m:-200,out:'Taksit çıkmadı, yine de bir kısmını ödedin.'} } },
        { t:'Faturayı görmezden gel', h:8, r:-5, set:['borclu'], out:'Zarfı çekmeceye attın. Şimdilik rahat ama borç büyüyor.' }
      ]
    },
    { id:'tefeci', role:'Paracı', title:'Tefecinin Kapısı',
      text:'Darda kaldın, {char} gülümsedi: "Para mı lazım? Anında veririm. Ama faizi ağırdır, geç kalma."',
      choices:[
        { t:'Borç al, idare et', m:250, h:12, set:['tefeci_borcu'], out:'Cebin doldu ama artık tefecinin defterindesin. Geceleri rahat uyuyamazsın.' },
        { t:'"Faizine gelemem" de', r:5, set:['temkinli'], out:'Teklifi reddettin. Zor ama temiz; tefeciden uzak durmak akıllıcadır.' },
        { t:'Küçük bir miktar al', m:90, h:5, set:['tefeci_borcu'], out:'Az aldın, riski kıstın. Yine de o defterde bir satırsın artık.' }
      ]
    },
    { id:'rehinci', char:true, title:'Rehinci Dükkanı',
      text:'Cebin delik. Rehinci {char} saatine baktı: "Bunu bırak, sana avans vereyim. İstersen sonra geri alırsın."',
      choices:[
        { t:'Saati rehin bırak', m:120, set:['rehinde_esya'], out:'Eline para geçti ama saatin vitrinde kaldı. Geri almak başka bahara.' },
        { t:'Pazarlık et', ch:{ p:0.5, ok:{m:180,r:3,out:'Tatlı dille fiyatı yükselttin. Diline sağlık.'}, no:{m:90,out:'Adam inat etti, düşük fiyata razı oldun.'} } },
        { t:'Vazgeç, saatini koru', r:3, out:'"Bu bana hatıra" deyip çıktın. Cebin boş ama gönlün tok.' }
      ]
    },
    { id:'cift_para', role:'Manipülatif', title:'Parayı İkiye Katla',
      text:'Sokakta {char} sırnaştı: "Bana 100 ver, beş dakikada 200 yapıp getireyim. Güven bana."',
      choices:[
        { t:'Ver, bekle', m:-100, ch:{ p:0.2, ok:{m:300,out:'Şaşırtıcı ama gerçekten katlayıp getirdi! Bugün şanslı günün.'}, no:{r:-5,out:'Köşeyi dönünce kayboldu. Klasik tuzak, 100 gitti.'} } },
        { t:'"Önce sen göster" de', r:6, set:['uyanik'], out:'Mantığı tersine çevirdin. Adam bocaladı, sıvıştı. Sen kazandın.' },
        { t:'Gül, yürü', r:3, out:'Numarayı yedin bile. Hiç durmadan yoluna gittin.' }
      ]
    },
    { id:'dedikodu', role:'Dedikoducu', title:'Arkandan Konuşulan',
      text:'{char} fısır fısır: "Senin hakkında dolaşan şu dedikoduyu duydun mu? Herkes konuşuyor."',
      choices:[
        { t:'Sakin kal, ciddiye alma', r:8, set:['olgun'], out:'Omuz silktin: "Konuşan konuşsun." Duruşun saygı kazandırdı.' },
        { t:'Kaynağı bul, yüzleş', ch:{ p:0.5, ok:{r:10,out:'Dedikoducuyu buldun, mantıkla susturdun. İtibarın yükseldi.'}, no:{h:8,r:-4,out:'Yüzleşme kavgaya döndü, dedikodu daha da büyüdü.'} } },
        { t:'Sen de karşı dedikodu yay', r:-8, h:5, set:['fitneci'], out:'Ateşe ateşle karşılık verdin. Ortalık karıştı, kimse temiz çıkmadı.' }
      ]
    },
    { id:'grup_sohbeti', char:true, title:'Grup Sohbeti Kavgası',
      text:'Telefonun titriyor: arkadaş grubunda büyük kavga çıkmış. {char} senden taraf tutmanı istiyor.',
      choices:[
        { t:'Arabuluculuk yap', r:10, set:['arabulucu'], out:'Sakinleştirici mesajlar yazdın, ortalık yatıştı. Herkes sana minnettar.' },
        { t:'Bir tarafı tut', r:-4, h:5, set:['tarafli'], out:'Net taraf seçtin; bir grup sevdi, diğeri küstü. Bedeli oldu.' },
        { t:'Gruptan sessizce çık', r:2, set:['mesafeli'], out:'Bildirimleri kapatıp çekildin. Huzurlu ama biraz yalnız.' }
      ]
    },
    { id:'kor_randevu', role:'Romantik', title:'Kör Randevu',
      text:'Bir arkadaşın ayarladı: karşında {char}, gözleri parlıyor. "Demek o meşhur sensin."',
      choices:[
        { t:'Kendin ol, sohbeti aç', r:10, set:['cana_yakin'], out:'Doğal davrandın, akşam güzel geçti. Belki bir başlangıç.' },
        { t:'Hava atmaya çalış', ch:{ p:0.45, ok:{r:6,out:'Esprilerin tuttu, etkilendi. Şans yaver gitti.'}, no:{r:-6,out:'Fazla abarttın, sahteliğini sezdi. Akşam sönük bitti.'} } },
        { t:'Erken bahane uydur, kaç', r:-3, out:'Tedirgin oldun, çekip gittin. Belki bir fırsatı kaçırdın.' }
      ]
    },
    { id:'oda_arkadasi', role:'Tembel', title:'Dağınık Oda Arkadaşı',
      text:'Eve geldin, ortalık savaş alanı. {char} kanepeye yayılmış: "Sonra toplarım abi, kafan rahat olsun."',
      choices:[
        { t:'Sakince kural koy', r:8, set:['duzenli'], out:'Net ama kırmadan konuştun. Bir çizelge yaptınız, ev düzene girdi.' },
        { t:'Sinirlen, kavga et', h:10, r:-5, out:'Bağırış çağırış. Oda toplandı ama aranıza buzlar girdi.' },
        { t:'Sen toplayıp geç', r:3, out:'Söylenmeden topladın. Ev temiz ama içten içe bıkkınsın.' }
      ]
    },
    { id:'unlu_goruldu', char:true, title:'Ünlüyle Karşılaşma',
      text:'Kafede ünlü biri oturuyor. {char} dürtüyor: "Bak şuna! Hemen bir şeyler yap, fotoğraf çek!"',
      choices:[
        { t:'Saygılı davran, rahatsız etme', r:10, set:['centilmen'], out:'Göz teması ve hafif bir selam. Ünlü gülümseyip teşekkür etti.' },
        { t:'Fotoğraf iste', ch:{ p:0.6, ok:{r:8,set:['taniniyor'],out:'Kabul etti! Fotoğrafı paylaşınca takipçin arttı.'}, no:{r:-4,out:'"Bugün olmaz" dedi kibarca. Biraz mahcup oldun.'} } },
        { t:'Gizlice çekip yay', r:-8, h:5, out:'İzinsiz çektin, paylaştın. Bazıları ayıpladı, tadın kaçtı.' }
      ]
    },
    { id:'hayran', char:true, title:'Seni Tanıyan Hayran', req:{minR:25},
      text:'Sokakta {char} heyecanla yanına koştu: "Sen o meşhur kişisin değil mi? Seni takip ediyorum!"',
      choices:[
        { t:'Sıcak davran, sohbet et', r:12, set:['sevilen'], out:'Hayranınla iki çift laf ettin, fotoğraf çektirdin. Sevgin katlandı.' },
        { t:'Kısa kes, yürü', r:-4, out:'Soğuk davrandın, yüzü düştü. Bir hayran kırıldı.' },
        { t:'İmza ver, hava at', r:6, h:3, out:'Yıldız edasıyla imza attın. Hoş ama biraz fazla kasıldın.' }
      ]
    },
    { id:'yetenek_avcisi', role:'Karizmatik', title:'Yetenek Avcısı', req:{minR:20},
      text:'Şık giyimli {char} kartını uzattı: "Seni izledim, potansiyelin var. Bir programa çıkmak ister misin?"',
      choices:[
        { t:'Fırsatı değerlendir', r:14, set:['unlu_yolu'], out:'Programa çıktın, adın duyuldu. Yıldızın parlamaya başladı.' },
        { t:'Şüpheyle yaklaş, araştır', r:6, set:['temkinli'], out:'Önce sözleşmeyi okudun. Akıllıca; her parlak teklif altın değil.' },
        { t:'"Şöhret bana göre değil" de', r:4, out:'Sakin hayatı seçtin. Bazıları için huzur, şöhretten kıymetli.' }
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
