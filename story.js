//v2
// ═══ CHAT KADERİNİ BELİRLER — 30 Interactive Stories ═══
var storyState = null;
var storyTimer = null;
var storyVoteTimer = null;

function S(t,a,b,ra,da,rb,db){return{text:t,a:a,b:b,ra:{text:ra,dmg:da,alive:true},rb:{text:rb,dmg:db,alive:true}};}

var STORY_TEMPLATES = [
function(N){return{title:N+"'in Sokak Hikayesi",scenes:[
S(N+" gece yarısı Los Santos sokaklarında yürüyor. Köşede şüpheli bir araba, içinden silah sesleri. Diğer tarafta eski arkadaşı el sallıyor.","Arabaya yaklaş","Arkadaşına git",N+" arabaya yaklaştı. İçeridekiler silah doğrulttu! Zor kaçtın.",1,N+"'in arkadaşı: 'Gel, büyük bir iş var' dedi.",0),
S(N+" bir mafya babasıyla yüz yüze. 'Limandaki konteyneri al, 500K senin.' Polis bölgeyi izliyor.","İşi kabul et","Reddet",N+" limana gitti ama polis baskın yaptı! Zar zor kaçtın.",1,"Akıllıca. Mafya babası sinirli ama "+N+"'i bıraktı.",0),
S(N+" polis kontrol noktasına denk geldi. Bagajda şüpheli malzeme var. Polis yaklaşıyor.","Gaza bas, kaç","Dur, blöf yap",N+" gaza bastı! Kovalamaca başladı! Dar sokaklarda drift atarak kaçtı.",1,"Sakin kaldın. Polis şüphelendi ama bıraktı. Soğukkanlılık!",0),
S("Gece kulübünde kavga! Biri bıçak çekti. "+N+" ortada.","Araya gir","Sessizce çık",N+" araya girdi ama bıçaklı saldırdı! Kolundan yaralandı.",1,N+" akıllıca çıktı ve polisi aradı. Güvende.",0),
S(N+" yer altı yarışına davet edildi. 100K ödül ama kurallar yok.","Yarışa gir","Bahis oyna",N+" yarışa girdi ve kazandı! Ama freni patladı.",1,"Bahis oynadın, kazanan tarafı tuttun! 25K!",0),
S("Silah tüccarı "+N+"'e teklif: 'Bu silahı al, 3 katına sat.' Çalıntı silah.","Satın al","Reddet",N+" silahı aldı. Satarken sivil polis yakaladı!",1,"Reddettim. Temiz kaldın.",0),
S(N+" şehrin tehlikeli bölgesinde kayboldu. GPS yok. Tünel mi çöp sahası mı?","Tünelden geç","Çöp sahasından geç","Tüneldeki evsizler yol gösterdi. Çıktın!",0,"Çöp sahasında kayarak düştün. Zor çıktın.",1),
S("Final! "+N+" mafyanın deposuna ulaştı. Kasa var ama 2 nöbetçi.","Sessizce gir","Önden dal","Sessizce girip kasayı açtın. "+N+" efsane oldu! 🏆",0,"Önden daldın! Nöbetçiler şaşırdı! "+N+" parayı kaptı! 🏆",1)
]}},
function(N){return{title:N+" vs Polis Teşkilatı",scenes:[
S(N+" sabah uyandı — kapı kırıldı! SWAT ekibi! 'Yanlış ev!' ama "+N+" pencereden atlamıştı.","Kaçmaya devam","Teslim ol","Çatılardan atlayarak 3 blok! Ayağını burktun.",1,"Teslim oldun. Yanlış baskın, serbest kaldın.",0),
S("Zırhlı araç durdu. Maskeli adamlar: 'Bizimle geliyorsun.'","Koş ve saklan","Sakin konuş","Dar sokaklara daldın! Çöp konteynerine saklandın. Geçtiler!",0,"Film çekimiymiş! Figüran oldun, 500$ kazandın!",0),
S("Dedektif: 'Seni tanıyorum, banka olayında vardın.' "+N+" orada müşteriydi.","Kaç","Masumiyetini kanıtla",N+" kaçtı! Arkadan ateş açıldı, kurşun kulağından geçti.",1,"Kamera kayıtlarını gösterdin. Polis özür diledi.",0),
S("Yeraltı poker turnuvası. Masada mafya lideri, baron, emekli polis.","All-in git","Fold et","All-in! 200K kazandın! Ama mafya lideri kötü bakıyor.",0,"Fold ettin ama konuşmalardan bilgi öğrendin.",0),
S("Gece mesaj: 'Köprü altına gel, yalnız. Zengin olacaksın.'","Git ama silahlı","Mesajı sil","Gittin. Adam sahte para çantası uzattı. Tehlikeli iş!",0,"Evde kaldın. Haberlerde köprü baskını gördün. Kıl payı!",0),
S(N+" çalıntı arabayla kovalamacada. Otoyol mu dağ yolu mu?","Otoyol","Dağ yolu","200 km/h! Helikopter geldi ama tırın arkasına saklandın.",0,"Virajda kaydın! Uçurumun kenarında durdun. Araba bitti.",1),
S(N+" mafya toplantısına sızdı. Patron: 'Aramızda casus var.'","Poker face","Masayı devir, kaç","Poker face! Patron başkasını sorguladı. Gizlilik korundu!",0,"Masayı devirdin! Kaos! Sırtından vuruldun ama kaçtın.",1),
S("Final! "+N+" kanıtları teslim edecek. Mafya binayı sardı. Çatıda helikopter, bodumda tünel.","Çatıya çık","Tünelden kaç","Helikoptere atladın! Mafya çöktü. "+N+" kahraman! 🏆",0,"2 km tünel. Çıkışta polis bekliyordu — plan işledi! "+N+" özgür! 🏆",0)
]}},
function(N){return{title:N+" ve Büyük Soygun",scenes:[
S(N+"'in eski arkadaşı aradı: 'Fleeca Bank, 2 milyon, 4 kişi. Var mısın?'","Ekibe katıl","Reddet","Ekibe katıldın. Garajda toplantı — plan detaylı ama riskli.",0,"Reddettin. Ama ertesi gün daha büyük teklif geldi.",0),
S("Plan yapılıyor. "+N+" sürücü mü yoksa içeri giren mi?","Sürücü ol","İçeri gir","Arabayı hazırladın. 3 dakikada çıkacaklar... alarm çaldı!",0,"İçeri girdin. Kamerayı kapattın ama sessiz alarm!",0),
S("Kaçarken polis yolu kesti. "+N+" direksiyonda, barikat önünde.","Barikatı yar","Arka sokaklara dal","Barikatı yardın! Tampon uçtu ama kaçtınız!",1,"Arka sokaklara! Polis izi kaybetti!",0),
S("Para bölüşümü. Biri fazla istiyor: 'Daha çok risk aldım!'","Fazla ver","Eşit böl","Fazla verdin. Adam sakinleşti ama zararda kaldın.",0,"Eşit böldün. Diğerleri destekledi. Adalet!",0),
S(N+" parayı saklamalı. Ormandaki kulübe mi kiralık kasa mı?","Ormana göm","Kasaya koy","Parayı gömdün ama biri takip ediyordu!",1,"Kasaya koydun. Güvenli ama kameralar her yerde.",0),
S("Polis kapıda. 'Rutin kontrol' diyorlar ama 3 dedektif.","Kapıyı aç","Arka kapıdan kaç","Evi aradılar, bulamadılar. Ter döktün!",0,"Kaçtın! Ama şüpheli oldun, arananlar listesinde.",1),
S("Ekipten biri itirafçı oldu. "+N+"'in ismini vermiş!","Sahte pasaportla uç","Denizden kaç","Havalimanında pasaport geçti! Uçağa bindin.",0,"Fırtınada denize açıldın. Karşı kıyıya ulaştın!",1),
S("Final! "+N+" yeni ülkede. Eski ekipten biri: 'Son bir iş.'","Son bir iş","Bu hayat bitti","10 milyon! "+N+" özel adada emekli! Efsane! 🏆",0,"Reddettim. Temiz sayfa. Durmak en büyük zafer! 🏆",0)
]}},
function(N){return{title:N+"'in Mafya Yükselişi",scenes:[
S(N+" mahallenin çocuğu. Abi teklif etti: 'Bu paketi karşıya bırak, 1000 lira.'","Paketi bırak","Reddet","Kolay paraydı. "+N+" bu dünyaya adım attı.",0,"Reddettim. Ama evine molotof atıldı!",1),
S("Patron çağırdı: 'Terfi — bölgenin tahsilat işi senin.'","Kabul et","Düşüneyim","10 dükkandan haraç topladın. Güç sarhoş ediyor.",0,"'Düşünme lüksün yok!' Zorla kabul ettin.",1),
S(N+"'in bölgesine rakip çete musallat oldu.","Rest çek","Patrona bildir","Rest çektin! Ama gece adamlarını gönderdiler.",1,"Patron 20 kişi gönderdi. Rakipler kaçtı ama patrona borçlusun.",0),
S("Yeni görev: şehrin en büyük gece kulübünü al.","Barışçıl teklif","Tehdit et","Barışçıl teklifin işe yaradı! Ortaklık kuruldu.",0,"Tehdit ettin. Sahibi kaçtı ama polise ihbar etti!",1),
S("Politikacı gizli buluşma istiyor.","Buluşmaya git","Tuzak, gitme","Rüşvet karşılığı koruma anlaştınız.",0,"Gitmedin. Politikacı gizli kamerayla gelmiş! Kıl payı!",0),
S("Patronun sağ kolu fısıldadı: 'Patron seni tasfiye edecek. Önce sen vur.'","Darbe planla","Patrona ihbar et","Gece baskını! Patron kaçtı. Taht "+N+"'in!",0,"İhbar ettin. Sağ kol ortadan kalktı. Sadakatin ödüllendirildi.",0),
S(N+" zirvedeyken FBI operasyonu başlattı.","Yurt dışına kaç","Kal, savaş","Offshore hesaplara aktardın. Yurt dışına kaçtın.",0,N+" avukat ordusu tuttu ama mahkeme uzuyor.",1),
S("Final! "+N+"'in kaderi belirleniyor.","İtirafçı ol","Sonuna kadar savaş","Yeni kimlik, yeni hayat. Ama geçmiş unutulur mu? 🏆",0,"Beraat! "+N+" artık dokunulmaz bir efsane! 🏆",0)
]}},
function(N){return{title:N+"'in Gece Kulübü İmparatorluğu",scenes:[
S(N+"'in hayali kendi kulübü. 50K birikmiş.","Küçük mekan aç","Zengin ortak bul","Küçük ama şirin mekan! İlk gece 20 kişi.",0,"Büyük mekan ama ortak her şeye karışıyor.",0),
S("Rakip kulüp DJ'leri kaçırıyor, kötü yorumlar yaydırıyor.","Daha iyi DJ bul","Rakibi uyar","Dünyaca ünlü DJ ile anlaştın! Sosyal medya patladı!",0,"Rakibi uyardın ama ciddiye almadı.",1),
S("Mafya geldi: 'Haftada 5K koruma parası.'","Öde","Reddet, kendi güvenliğini kur","Ödedin. Korunuyorsun ama kâr düştü.",0,"Kendi güvenlik ekibini kurdun! Mafya geri çekildi.",0),
S("TV kanalı belgesel çekmek istiyor.","Kabul et","Reddet","Belgesel yayınlandı! Ünün 10 katına çıktı!",0,"Sessiz kaldın. Sadık müşteri kitlesi oluşturdun.",0),
S("VIP gecede ünlü kavga çıkardı! Video internete düştü.","Ünlüyü yasakla","Örtbas et","Yasakladın. Medya seni övdü, saygınlık arttı!",0,"Örtbas ettin ama video viral! 'Tehlikeli' damgası.",1),
S("İkinci şube istiyor ama nakit yok.","Banka kredisi","Yeraltı parası","Kredi aldın. Faiz yüksek ama legal.",0,"Yeraltı parası — hızlı büyüme ama karanlık bağlar.",1),
S("Polis baskını! Kulüpte uyuşturucu — birileri yerleştirmiş.","Avukat tut","Polisle anlaş","Avukat delilleri çürüttü. Beraat!",0,"Polisle anlaştın. Rakip kulübü ihbar ettin — onlar kapandı!",0),
S("Final! Uluslararası zincir teklif: 'Markana 10 milyon.'","Sat, emekli ol","Reddet, kendi imparatorluğun","10 milyona sattın! "+N+" plajda emekli! 🏆",0,"5 yılda 50 şube! "+N+" global marka! 🏆",0)
]}},
function(N){return{title:N+" Yarış Efsanesi",scenes:[
S(N+"'in tutkusu arabalar. Garajında eski Nissan. Mahallede yeraltı yarışları.","Yarışa katıl","Önce modifiye et","Araba yavaş kaldı, son olarak bitirdin. Ama dikkat çektin!",0,"Turbo ve NOS taktın. Artık hazırsın!",0),
S("Sponsor teklifi: 'Sticker koy, 20K vereyim.'","Kabul et","Bağımsız kal","Araban profesyonel görünüyor!",0,"Para sıkıntın var ama özgürsün.",0),
S("Büyük gece! 50 araba, 500K ödül. Parkurda polis barikatı.","Alternatif rota","Barikatı yar","Gizli rotayı buldun! 3 arabayı geçtin!",0,"Barikatı yardın! Polis kovalıyor ama yarış devam!",1),
S(N+" kazandı ama rakip hile diyor. Video kanıt istiyor.","Videoyu göster","Umursama","Video gösterdin. Haklısın — saygınlık kazandın!",0,"Umursamadın. Para cebinde ama fısıltılar var.",1),
S("Pro takım teklif etti: 'Katıl, maaş + prim.'","Takıma katıl","Solo devam","Pro antrenman, pro araç. Seviye atladın!",0,"Kendi kuralların, kendi yolun.",0),
S("Şampiyona finali! Rakip çok hızlı. Son turda baş başa.","Nitroyu şimdi kullan","Son viraja sakla","Öne geçtin ama son virajda nitro bitti!",0,"Son virajda nitroyla geçtin! Mükemmel strateji!",0),
S(N+" şampiyon! Ama polis yeraltı yarışlarını kapattı.","Yasal yarışlara geç","Yeraltında devam","Temiz kariyer başladı.",0,"Daha çok para, daha çok risk.",1),
S("Final! "+N+"'in son yarışı. Rakibi en iyi arkadaşı. 1 milyon ödül.","Tam gaz","Yarışı ver, dostluk önemli","Fotofinişte kazandın! Arkadaşın elini sıktı. Gerçek dost! 🏆",0,"Arkadaşın kazandı ama jestini anladı. Kazancı bölüştünüz! 🏆",0)
]}},
function(N){return{title:N+" Hacker Operasyonu",scenes:[
S(N+" karanlık web'de ilan gördü: 'Hacker aranıyor, 100K garanti.'","Başvur","Geç, riskli","10 dakikada sistemi kırdın. İşe alındın!",0,"Geçtin. Ertesi gün kapın çaldı — seni buldular.",0),
S("İlk görev: bankanın güvenlik sistemini test et.","Sisteme sız","Sadece rapor yaz","30 saniyede tüm verilere eriştim! Patron memnun.",0,"Rapor yazdın. Dürüst ama patron 'sıkıcı' buldu.",0),
S("CEO'dan görev: 'Rakip şirketin sunucularına gir.'","Kabul et","Etik değil, reddet","Sunuculara girdin ama iz bıraktın!",1,"Reddettin. Etik hacker ünün yayılıyor!",0),
S("Ekranında 'Seni buldum' mesajı. Birisi "+N+"'i izliyor!","Karşı saldır","Sistemleri kapat, kaybol","Onu hackladin! Rakip grup. Savaş başladı.",0,"3 ay karanlıkta yaşadın. İzini kaybettirdin.",0),
S("Devlet teklif: 'Bizim için çalış, suçların silinsin.'","Kabul et","Bağımsız kal","İlk görev: terör hücresinin iletişimini çöz.",0,"Özgürsün ama her an yakalanabilirsin.",1),
S("Hedef: uluslararası silah kaçakçılığı ağı.","Sunucularına sız","Sahte kimlikle içeri gir","Tüm iletişim kayıtlarını ele geçirdin!",0,"Fiziksel toplantıya katıldın. Tehlikeli ama veri topladın.",1),
S(N+"'in arkadaşı yakalandı. Kurtarmak için polis sistemine girmeli.","Sisteme gir","Yasal yoldan kurtarma","Kaydını sildin ama FBI fark etti!",1,"Avukat tuttn. Uzun sürdü ama arkadaşın serbest.",0),
S("Final! "+N+" offshore hesapları ifşa etti. Tüm dünya şokta.","Kimliğini açıkla","Anonim kal",N+" dijital çağın Robin Hood'u! 🏆",0,"Kimse bilmiyor ama herkes arıyor. Gölgelerin efendisi! 🏆",0)
]}},
function(N){return{title:N+" Kaçakçılık Rotası",scenes:[
S(N+" limanda gece bekçisi. Şüpheli konteynerden sesler geliyor.","Aç","Patrona bildir","İçinde milyonluk kaçak elektronik!",0,"Patron: 'Görmezden gel.' Bu iş büyük...",0),
S("Patron: 'Yardım et, maaşının 10 katı.'","Kabul et","Polise ihbar","İlk teslimat başarılı. Cepler dolu!",0,"İhbar ettin ama patron öğrendi!",1),
S("Gümrükte sorun. Konteyner X-Ray'den geçecek.","Memuru rüşvetle","Sahte evrak","Rüşvet işe yaradı ama memur seni biliyor artık.",1,"Sahte evraklar mükemmel! Sorunsuz geçti.",0),
S("3 milyon dolarlık kargo kayboldu!","Çalınan malı ara","Patrona itiraf et","Depo bekçisi çalmış. Buldun ve geri aldın!",0,"Patron çıldırdı ama seni affetti. Son kez!",0),
S("Kartel çalışmak istiyor: '10 milyon kazanırsın.'","Kartelle çalış","Çok tehlikeli, reddet","Paralar büyüdü ama tehlike de büyüdü.",0,"Kartel kızgın ama başka birini buldular.",0),
S("Depoya SWAT baskını!","Gizli tünelden kaç","Teslim ol","Tünelden kaçtın! Yedek depodan devam.",0,"Avukat delil yetersizliğinden kurtardı.",0),
S(N+"'in ortağı ihanet etti, müşteri listesini rakibe sattı.","Ortakla yüzleş","Sessizce yeni rota kur","Ortağın itiraf etti. Bir daha güvenmeyeceksin.",0,"Yeni rota kurdun. Eski müşteriler seni tercih etti!",0),
S("Final! Son teslimat — 50 milyon dolarlık.","Son teslimatı yap","Bu dünyayı bırak","50 milyon! "+N+" tropikal adada emekli! 🏆",0,"Balıkçı kasabasında huzur. Gerçek zenginlik bu! 🏆",0)
]}},
function(N){return{title:N+" Hapisten Kaçış",scenes:[
S(N+" ağır ceza hapishanesinde. Hücre arkadaşı: 'Kaçış planım var.'","Planı dinle","Güvenme","Adam 6 aydır tünel kazıyormuş. Neredeyse bitmiş!",0,"Sessiz kaldın ama her gece duvar kazma sesi...",0),
S("Avluda çeteler var. Biriyle anlaşmak lazım.","Güçlü çeteye katıl","Tek başına kal","Korunuyorsun ama karşılığında 'işler' yapmalısın.",0,"Her gün dikkatli olmalısın ama özgürsün.",1),
S("Gardiyan: 'Bana yardım et, hücre değişikliği yapayım.'","Güven","Tuzak, reddet","Hücren değişti — tünele daha yakın!",0,"İyi ki — gardiyan muhbir çıktı!",0),
S("Tünel bitmek üzere ama gardiyan şüpheleniyor, arama yapacak.","Aramadan önce kaç","Tüneli kamufle et","Bu gece kaçış! Tünele gireceksin.",0,"Mükemmel kamufle! Arama geçti, bulamadılar.",0),
S("Kaçış gecesi! Tünelde ilerlerken tünel çöktü!","Kazarak devam et","Geri dön","2 saat kazdın! Dışarı çıktın. Özgürsün!",1,"Geri döndün. Havalandırmadan çıkış buldun!",0),
S(N+" dışarıda ama polis her yerde. Yol kenarında eski ahır.","Ahırda saklan","Koşmaya devam","Ahırda eski araba buldun. Anahtarı da var!",0,"Ormandan geçerek şehre ulaştın ama bitkinsin.",1),
S("Şehirde eski arkadaşa sığındın.","Sahte kimlik iste","Sınırı geç","Arkadaş sahte kimlik ayarladı. Yeni isim!",0,"Sınırda tanındın! Son anda kaçtın.",1),
S("Final! "+N+" yeni ülkede ama polisler arıyor.","Plastik cerrahi ol","Teslim ol, adil yargılanma","Yeni yüz, yeni kimlik! "+N+" özgür! 🏆",0,"Avukat harika çalıştı. Beraat! Gerçek özgürlük! 🏆",0)
]}},
function(N){return{title:N+" Dedektif Hikayesi",scenes:[
S(N+" emekli dedektif. Eski ortağı aradı: 'Çözülmemiş dosya, kurban eski komşun.'","Dosyayı al","Emekliyim, bırak","10 yıllık soğuk dava. Kanıtlar karmaşık.",0,"Reddettin ama gece uyuyamadın. Sabah dosyayı aldın.",0),
S("İlk ipucu: kurbanın son aradığı numara. Antikacı dükkana ait.","Antikacıya git","Kayıtları incele","Yaşlı adam seni garip garip süzdü.",0,"Dükkandan her gün aynı saatte arama yapılmış.",0),
S("Antikacının arka odasında gizli kapı! İçerde fotoğraflar.","Araştır","Polisi çağır","Fotoğraflarda kurban ve tanımadığın insanlar.",0,"Polisi çağırdın ama antikacı kaçtı!",1),
S("Fotoğraftaki biri şehrin ünlü avukatı!","Avukatla buluş","Gizlice takip et","'Eski hikaye, karıştırma' dedi. Tehditkâr!",0,"Takip ettin. Her gece limana gidiyor.",0),
S(N+" limana gizlice girdi. Kaçak sanat eseri deposu!","Fotoğraf çek","Daha fazla sız","Kanıt fotoğraflarını çektin!",0,"Güvenlik fark etti! Kaçarken düştün.",1),
S("Kanıtları topladın ama avukatın adamları takip ediyor.","Polise ver","Medyaya sızdır","Özel tim operasyonu başlatıldı.",0,"Ertesi gün manşetlerde! Patlak verdi!",0),
S("Avukat tutuklandı. "+N+" kilit tanık.","Mahkemede tanıklık et","Yazılı ifade ver","Tanıklık ettin! Jüri suçlu buldu.",0,"Yazılı ifade yeterli oldu. Mahkumiyet kesinleşti.",0),
S("Final! Dava çözüldü. "+N+"'in ünü yayıldı.","Dedektifliğe dön","Gerçekten emekli ol",N+"'in ajansı kuruldu! Çözülmemiş davaların kâbusu! 🏆",0,"Deniz kenarında kitabını yazdın. Best seller! 🏆",0)
]}},
function(N){return{title:N+" Gizli Ajan",scenes:[
S(N+" muhasebeci. Siyah takımlı adamlar: 'Ülken için seçildin.'","Kabul et","Şaka mı?","6 aylık eğitim başladı: silah, dövüş, gözetleme.",0,"Pasaportunu iptal ettiler. Başka seçenek yok.",0),
S("İlk görev: diplomatik partiye sız. Hedef: Rus büyükelçinin USB'si.","Garson kılığı","VIP davetli","Büyükelçinin masasına yaklaştın, USB'yi gördün!",0,"Büyükelçiyle bizzat tanıştın!",0),
S("USB'yi alırken alarm çaldı! Panik!","Kaosu kullan, kap","Geri çekil","USB'yi kaptın ve arka kapıdan çıktın!",0,"Kimse fark etmedi. Profesyonelce.",0),
S("USB'deki bilgi şok: kendi hükümetinde çifte ajan!","Üstlere bildir","Kendi araştır","Üstlerin de şüpheli çıktı!",1,N+" çifte ajanı buldu — bölüm şefi!",0),
S(N+" kimseye güvenemiyor. Tek güvendiği eski eğitmeni.","Eğitmene git","Yalnız çalış","Eğitmen de biliyormuş. 'İkimiz çözeceğiz.'",0,"Kanıtları topladın ama izleniyorsun.",1),
S("Çifte ajanı yakalamak için tuzak kurdun.","Pusu kur","Uzaktan izle ve kaydet","Çifte ajan geldi! Silahını çekti!",1,"Uzaktan kaydettin. Video kanıt!",0),
S(N+" yaralı ama çifte ajan yakalandı. Patronları intikam planlıyor.","Gizlen, iyileş","Saldırıya geç","3 hafta sonra iyileştin. İntikam zamanı!",0,"Patron grubunu tek tek çökerttim!",0),
S("Final! "+N+" ağı çökertti. Devlet başkanı ödül veriyor.","Ödülü kabul et","Kimliğim gizli kalsın",N+" ulusal kahraman! 🏆",0,"Gölgelerde çalışmaya devam. Gerçek ajan! 🏆",0)
]}},
function(N){return{title:N+" Zombi Apokalipsi",scenes:[
S("Sabah uyanan "+N+" şehrin boş olduğunu fark etti. Uzakta çığlıklar. Sokakta yürüyen ölüler!","Silah ara","Saklan","Polis arabasında tabanca buldun! 12 mermi.",0,"Bodrum kata saklandın. Güvende ama yalnız.",0),
S(N+" hayatta kalmaya çalışıyor. Süpermarkette yiyecek var ama zombiler de.","İçeri dal","Başka yer ara","3 koli konserve kaptın ama zombi ısırdı! Antivirüs lazım!",1,"Eczane buldun. İlaç ve su temin ettin.",0),
S("Telsizden ses: 'Askeri üste güvenli bölge var. Kuzeye gel.'","Askeri üsse git","Güvenme, ormana kaç","Yola çıktın. 50 km ama yollar zombi dolu.",0,"Ormanda kamp kurdun. Şimdilik güvende.",0),
S("Yolda bir grup hayatta kalana rastladın. 5 kişiler.","Gruba katıl","Yalnız devam et","Gruba katıldın. Güç birliği!",0,"Yalnız devam ettin. Kimseye güvenme.",0),
S("Dev zombi sürüsü geliyor! Köprüyü geçmeli ama köprü hasarlı.","Koşarak geç","Nehirden yüzerek geç","Köprü çöktü ama son anda karşıya atladın!",1,"Nehirde yüzdün. Soğuk ama karşıya geçtin.",0),
S("Askeri üs görünüyor ama kapılar kapalı. İçerden silah sesleri.","Kapıyı kır","Arka girişi ara","Kapıyı kırdın! İçeride askerler zombilerle savaşıyor.",0,"Arka girişi buldun. Sessizce sızdın.",0),
S("Üsteki bilim insanı: 'Antiserumum var ama lab yıkıldı.'","Lab'ı koru, antiserum üret","Helikopterle kaç","Lab'ı korudun! Antiserum üretimi başladı!",0,"Helikopterle kaçtın ama antiserum geride kaldı.",0),
S("Final! "+N+" insanlığın umudu. Antiserumu dağıtmalı.","Şehre geri dön, dağıt","Güvenli bölgede kal","Şehre döndün! Antiserum dağıtıldı. "+N+" insanlığı kurtardı! 🏆",1,"Güvenli bölgeden radyoyla koordine ettin. Dünya iyileşiyor! 🏆",0)
]}},
function(N){return{title:N+" Uzay Macerası",scenes:[
S(N+" ISS'de görev yapıyor. Gece vardiyasında alarm çaldı — oksijen kaçağı!","Manuel tamir et","Yedek sistemi devreye al","Dışarı çıkıp kaçağı yamadın! EVA yürüyüşü sırasında dünya muhteşem görünüyordu.",1,"Yedek sistem devrede. Ama asıl sistemi de tamir etmeli.",0),
S("Gizemli bir sinyal yakalandın. Kaynağı bilinmeyen bir frekans.","Sinyali takip et","Görmezden gel","Sinyali çözdün — koordinatlar var! Bir şey sizi çağırıyor.",0,"Görmezden geldin ama sinyal güçlenerek devam etti.",0),
S("Mürettebattan biri kayıp! Son görüldüğü yer kargo bölmesi.","Kargo bölmesine git","Kamerayı kontrol et","Onu buldun — bayılmış! Zehirli gaz sızıntısı vardı.",0,"Kamerada gördün — kendi isteğiyle kaçak bölmeye girmiş.",0),
S("Asteroid istasyona yaklaşıyor! 10 dakika var.","Motorları ateşle, kaçın","Asteroidi lazerle parçala","Motorlar ateşlendi! Son anda sıyrıldınız.",0,"Lazer asteroidi ikiye böldü! Ama parçalar hasar verdi.",1),
S("Sinyalin kaynağına ulaştınız. Devasa bir yapı — uzaylı mı?","İçeri gir","Uzaktan tara","İçeri girdin! Işıklar yandı, yapı aktif.",0,"Tarama yaptın — içeride yaşam belirtisi var!",0),
S("Yapının içinde antik bir teknoloji bulundu!","Teknolojiye dokun","Sadece kaydet","Dokunduğunda yapı canlandı! Bir mesaj var.",0,"Kaydettin. Dünya'ya gönderdin. Bilim dünyası çalkalandı!",0),
S("İstasyonla bağlantı koptu! "+N+" yapının içinde mahsur.","Güç kaynağını bul","Acil çıkış ara","Güç kaynağını buldun — iletişimi yeniden kurdun!",0,"Acil çıkıştan kaçtın ama değerli veriler geride kaldı.",0),
S("Final! "+N+" Dünya'ya döndü. Uzaylı teknolojisi insanlığı değiştirecek.","Bilgiyi paylaş","Gizli tut","Bilgiyi paylaştın! "+N+" insanlık tarihini değiştirdi! 🏆",0,"Gizli tuttun. Doğru zaman geldiğinde açıklayacaksın. 🏆",0)
]}},
function(N){return{title:N+" Futbol Yıldızı",scenes:[
S(N+" amatör ligde oynuyor. Scout tribünde izliyor.","En iyi performansını göster","Normal oyna","Hattrick yaptın! Scout not aldı.",0,"İyi oynadın ama öne çıkmadın.",0),
S("2. lig takımından davet geldi!","Transfer ol","Amatörde kal, gelişimini tamamla","Transfer oldun! Pro futbol başladı.",0,"Amatörde 1 yıl daha! Teknik olarak çok geliştin.",0),
S("İlk profesyonel maç. 40.000 seyirci.","Riskli oyna, fark yarat","Güvenli oyna","Muhteşem bir gol attın! Taraftarın yeni sevgilisi.",0,"Hatasız oynadın. Antrenör güvenini kazandın.",0),
S("Büyük kulüpten transfer teklifi: 5 milyon euro!","Transfer ol","Sadık kal, şampiyonluğu kazan","Büyük kulübe transfer! Ama bankta oturabilirsin.",0,"Sadık kaldın. Takımla şampiyon oldun!",0),
S("Sakatlık! Diz bağları koptu. 6 ay yok.","Acele et, 3 ayda dön","Sabırla iyileş","3 ayda döndün ama diz ağrıyor.",1,"6 ay sabrettin. Dizin yepyeni!",0),
S("Milli takım kadrosu açıklandı — "+N+" listede!","Forma için savaş","Takıma uyum sağla","11'de çıktın! Ama baskı büyük.",0,"Takıma uyum sağladın. Herkes seni seviyor.",0),
S("Dünya Kupası grup maçı. Penaltı! "+N+" vuracak.","Sağa vur","Ortadan vur","Sağa vurdun — gol! Stadyum patladı!",0,"Ortadan vurdun — kaleci düştü, gol! Soğukkanlılık!",0),
S("Final! "+N+" Dünya Kupası finalinde. 90. dakika, skor eşit.","Şut çek","Pas ver","Muhteşem bir şut! GOOOL! "+N+" dünya şampiyonu! 🏆",0,"Mükemmel pas! Takım arkadaşı attı! "+N+" asist kralı! 🏆",0)
]}},
function(N){return{title:N+" Rock Yıldızı",scenes:[
S(N+" garajda gitar çalıyor. Arkadaşı: 'Barda sahne var, çıkalım mı?'","Sahneye çık","Daha çok prova","Sahneye çıktın! 50 kişi dans etti. Gece muhteşemdi!",0,"3 ay prova yaptın. Mükemmel oldunuz!",0),
S("Plak şirketi demo istedi!","Demo gönder","Bağımsız kalıp kendin yap","Demo beğenildi! Kontrat teklifi geldi.",0,"Kendi single'ını çıkardın. Spotify'da 100K dinlenme!",0),
S("İlk turne! 20 şehir, 30 gün.","Hepsine git","Sadece büyük şehirler","Hepsine gittin! Yoruldun ama fanbase patladı.",1,"Büyük şehirlerde sold-out! Kaliteli turne.",0),
S("Hit şarkın viral oldu! Ama prodüktör değişiklik istiyor.","Kabul et","Kendi sesini koru","Değişiklik yaptın. Şarkı #1 oldu ama senin gibi hissetmiyor.",0,"Kendi sesini korudun. #3 oldu ama tamamen senin!",0),
S("Ünlü bir müzisyen düet teklif etti.","Kabul et","Solo devam","Düet! Worldwide hit! Ama onun gölgesinde kaldın.",0,"Solo devam. Kendi kimliğini korudun.",0),
S("Grup kavgası! Davulcu ayrılmak istiyor.","Barış yap","Bırak gitsin","Barış yaptın. Grup tekrar bir bütün!",0,"Gitti. Yeni davulcu buldun — daha iyi!",0),
S("Grammy'ye aday gösterildin!","Konuşma hazırla","Rahat ol, ne olursa olsun","Konuşma hazırladın. Ya kazanırsan!",0,"Rahat tuttun kendini. Müzik için yapıyorsun.",0),
S("Final! Grammy gecesi. "+N+"'in ismi okunuyor mu?","Sahneye çık","Bu an gerçek mi?","KAZANDIN! "+N+" Grammy ödüllü sanatçı! 🏆",0,"Gerçek! Sahneye çıktın, herkes ayakta! "+N+" efsane! 🏆",0)
]}},
function(N){return{title:N+" Aşçıbaşı",scenes:[
S(N+" mutfakta stajyer. Baş aşçı acımasız: 'Bu çorbayı döktün, tekrar yap!'","Tekrar yap","Kendi tarifimi deneyeyim","Tekrar yaptın. Mükemmel! Baş aşçı gülümsedi.",0,"Kendi tarifin daha iyi çıktı! Baş aşçı şaşırdı.",0),
S("Kendi restoranını açma fırsatı! Ama sermaye az.","Küçük mekan aç","Ortak bul","Küçük ama samimi bir mekan. İlk hafta dolu!",0,"Ortak bulundun. Büyük mekan ama ortak menüye karışıyor.",0),
S("Food critic geliyor! İncognito olarak yemek yiyecek.","Özel menü hazırla","Normal menüyle git","Özel menü muhteşemdi! 5/5 yıldız!",0,"Normal menün yeterli! 4/5 yıldız. Tutarlılık!",0),
S("Yemek yarışmasına davet edildin. 30 şef, canlı yayın.","Katıl","Redddet, restorana odaklan","Katıldın! İlk turda herkes seni izledi.",0,"Restorana odaklandın. Müşteri sayısı %200 arttı.",0),
S("Michelin müfettişi geldi (bu sefer biliyorsun).","Özel ilgi göster","Normal servis","Özel ilgi gösterdin — 1 Michelin yıldızı!",0,"Normal servis — yine de 1 yıldız! Tutarlılık ödüllendirildi.",0),
S("Rakip şef "+N+"'i karalıyor. Sosyal medyada saldırı.","Karşılık ver","Yemeklerinle cevap ver","Karşılık verdin. Drama büyüdü ama adın duyuldu.",0,"Sessiz kaldın. Yeni menün viral oldu! En iyi cevap!",0),
S("TV programı teklifi: '"+N+" ile Mutfak Sırları'","Kabul et","Restorana odaklan","Program tuttu! Milyonlar izliyor.",0,"Restoran genişledi. 2. şube açıldı.",0),
S("Final! Dünya Aşçıbaşı Şampiyonası. "+N+" finalde!","Risk al, fusion yap","Klasik Türk mutfağı","Fusion muhteşem! Jüri ayakta alkışladı. "+N+" dünya şampiyonu! 🏆",0,"Türk mutfağı büyüledi! "+N+" geleneği taşıdı! 🏆",0)
]}},
function(N){return{title:N+" Boksör",scenes:[
S(N+" spor salonunda çalışıyor. Antrenör: 'Sende yetenek var. Dövüşmek ister misin?'","Evet","Düşüneyim","İlk maçına hazırlık başladı!",0,"Düşündün ama sonra kabul ettin. İçindeki ateş söndürülemez.",0),
S("İlk maç! Rakip deneyimli, "+N+" çaylak.","Agresif başla","Savunmada kal","Agresif başladın! İlk raundda nakaut!",0,"Savunmada beklendi. 3. raundda fırsatı yakaladın, kazandın!",0),
S("Şike teklifi: 'Bu maçı kaybet, 50K senin.'","Kabul et","Reddet",N+" maçı kaybetti. 50K ama vicdan ağır.",1,"Reddettin! Dürüstlük. Maçı kazandın!",0),
S("Büyük rakip: 30 maç 30 galibiyet. Herkes "+N+"'in kaybedeceğini düşünüyor.","Özel taktik geliştir","Normal hazırlan","Özel taktik — rakibin zayıf noktasını buldun!",0,"Normal hazırlandın ama özgüvenin tam.",0),
S("Maç sırasında omzun çıktı! Doktor durdurmak istiyor.","Devam et","Durma, sağlığın önemli","Tek elle savaştın! Efsanevi ama omzun kötü.",1,"Durdun. Akıllıca. 2 ay sonra geri döndün.",0),
S("Geri dönüş maçı. Taraftarlar: '"+N+"! "+N+"!'","Taraftarın enerjisiyle savaş","Sakin kal, odaklan","Taraftarın enerjisi patlattı seni! Nakaut!",0,"Sakin kaldın. Teknik zafer, puanla kazandın.",0),
S("Dünya unvanı maçı teklifi geldi!","Kabul et","1 yıl daha bekle","Kabul ettin. 3 ay kamp!",0,"1 yıl bekldin. Fiziksel zirvedesin.",0),
S("Final! Dünya kemer maçı. 12 raund. Son raund, skorlar eşit.","Son yumruğu at","Savunmada bitir","SON YUMRUK! NAKAUT! "+N+" dünya şampiyonu! 🏆",1,"12 raund bitti. Puanla galip — "+N+" dünya şampiyonu! 🏆",0)
]}},
function(N){return{title:N+" Pilot",scenes:[
S(N+" uçuş okulunda. İlk solo uçuş bugün!","Kalkış yap","Bir tur daha simülatör","Kalkış yaptın! Rüzgar sert ama kontrol sende.",0,"Simülatörde mükemmel puan! Yarın uçacaksın.",0),
S("Ticari pilot lisansı aldın! İlk sefer: İstanbul-Londra.","Her şeyi kontrol et","Yardımcıya güven","Her şeyi kontrol ettin. Mükemmel uçuş!",0,"Yardımcına güvendin. Takım çalışması!",0),
S("Fırtına! Uçak sallanıyor, yolcular panik.","Fırtınadan geç","Rota değiştir","Fırtınadan geçtin! Türbülans yoğundu ama başardın.",1,"Rota değiştirdin. 40 dakika gecikme ama güvenli.",0),
S("Acil durum! Motor arızası, tek motorla uçuyorsun.","En yakın havalimanına in","Devam et, tamir dene","En yakın havalimanına indin. Alkışlar!",0,"Tamir denemesi işe yaramadı, acil iniş!",1),
S("Korsanlar! Uçakta şüpheli yolcu.","Gizlice haber ver","Kendin müdahale et","Gizlice haber verdin. Güvenlik hazır.",0,"Müdahale ettin! Korsanı etkisiz hale getirdin.",0),
S("VIP uçuş: devlet başkanını taşıyorsun.","Ekstra güvenlik","Normal uçuş","Ekstra güvenlik. Her şey mükemmel.",0,"Normal uçuş. Başkan rahat, sen profesyonelsin.",0),
S("Gece uçuşunda tüm elektronik arızalandı! Karanlıkta uçuyorsun.","Yıldızlara bakarak yönel","Acil iniş yap","Yıldızlarla navigasyon! Eski usul ama işe yaradı!",0,"Acil iniş yaptın. Güvenlik ilk!",0),
S("Final! "+N+"'in son uçuşu — emeklilik. Ama fırtına bastırdı.","Efsanevi iniş yap","Alternatif piste yönlen","Fırtınada mükemmel iniş! Herkes ayakta alkışladı. "+N+" efsane pilot! 🏆",0,"Alternatif pistte güvenli iniş. "+N+" her zaman doğru kararı verir! 🏆",0)
]}},
function(N){return{title:N+" Hayatta Kalma Adası",scenes:[
S(N+" gemi kazasından sağ kurtuldu. Issız adada uyanıyor. Sahilde tahta parçaları.","Barınak yap","Yiyecek ara","Tahtalardan barınak yaptın. Bu gece yağmur yağdı — kuru kaldın!",0,"Meyve ağaçları buldun! Muz ve hindistan cevizi. Tok!",0),
S("Su lazım! Derenin sesi geliyor ama orman karanlık.","Ormana gir","Yağmur suyu topla","Dereyi buldun! Temiz su. Ama ormanda bir şey hareket etti.",0,"Yapraklardan yağmur suyu topladın. Az ama yeterli.",0),
S("Gece vahşi hayvan sesleri! Kamp ateşin sönmek üzere.","Odun topla, ateşi büyüt","Ağaca çık","Ateşi büyüttün. Hayvanlar yaklaşmadı!",0,"Ağaca tırmandın. Güvende ama uyuyamadın.",1),
S("Sahilde başka bir kazazede! Yarı baygın.","Kurtarıp kampa getir","Uzak dur","Kurtardın! Doktor çıktı. İlaç bilgisi var!",0,"Uzak durdun ama vicdan sızladı. Geri dönüp aldın.",0),
S("Ufukta gemi! Ama çok uzakta. Sinyal ateşi yakmalısın.","Sinyal ateşi yak","Ayna ile sinyal gönder","Duman yükseldi! Ama gemi geçti... ya da öyle sandın.",0,"Ayna ile parlak sinyal! Gemi yavaşladı mı?",0),
S("Gemi sizi görmedi. Ama sahilde eski bir kayık buldunuz.","Kayığı tamir et","Radyo yapmaya çalış","Kayığı tamir ettiniz! Denize açılabilirsiniz.",0,"Uçak enkazından radyo parçaları buldun! Sinyal gönderdin.",0),
S("Fırtına geliyor! Büyük dalgalar.","Kayıkla yola çık","Adada kal, fırtınayı bekle","Fırtınada kayıkla savaştın! Zor ama karşı adaya ulaştın.",1,"Fırtınayı bekledin. Sabah deniz sakin.",0),
S("Final! "+N+" kurtarılmayı bekliyor. Ufukta helikopter!","Sinyal fişeği at","Kamp ateşi yak","Sinyal fişeği attın! Helikopter "+N+"'i gördü. KURTARILDIN! 🏆",0,"Kamp ateşi dumana sardı! Helikopter geldi. "+N+" EVE DÖNÜYOR! 🏆",0)
]}},
function(N){return{title:N+" Süper Kahraman",scenes:[
S(N+" laboratuvar kazasında garip güçler kazandı. Eller ışık yayıyor!","Güçleri test et","Sakla, kimse bilmesin","Test ettin! Duvarı deldin. Süper güç!",0,"Sakladın ama yanlışlıkla lambayı patlattın.",0),
S("Sokakta biri soygun yapıyor! "+N+" müdahale edebilir.","Müdahale et","Polisi çağır","Soyguncuyu durdurdun! Video viral oldu. 'Kim bu?'",0,"Polisi çağırdın. Yakalandı ama "+N+"'e ihtiyaç var.",0),
S("Kötü adam şehri tehdit ediyor. Belediye binasına bomba!","Bombayı etkisiz hale getir","İnsanları tahliye et","Güçlerinle bombayı etkisiz hale getirdin!",0,"Herkesi tahliye ettin. Bomba patladı ama can kaybı yok!",0),
S(N+" kimlik krizi yaşıyor. Normal mi yaşasın, kahraman mı?","Kahraman ol","Normal hayat","Kahraman olmaya karar verdin! Kostüm lazım.",0,"Normal hayata döndün. Ama şehir seni çağırıyor.",0),
S("Daha güçlü bir kötü adam ortaya çıktı! "+N+"'den güçlü.","Yüzleş","Takım kur","Yüzleştin ama yenildin. Geri çekilmek zorundasın.",1,"Takım kurdun! 3 kişilik süper ekip!",0),
S("Kötü adam şehri ele geçirdi. "+N+" son umut.","Tek başına saldır","Tuzak kur","Tek başına saldırdın! Savaş epik ama zor.",1,"Tuzak kurdun. Kötü adam düştü!",0),
S("İhanet! Takım arkadaşın kötü tarafta çıktı.","Onu ikna et","Savaş","İkna ettin! Geri döndü. Dostluk kazandı.",0,"Savaştın ve kazandın. Ama bir dost kaybettin.",1),
S("Final! "+N+" şehri kurtarmalı. Son savaş!","Tüm gücünü kullan","Stratejiyle savaş","Tüm gücünü kullandın! PATLAMA! Kötü adam yenildi. "+N+" şehrin kahramanı! 🏆",0,"Strateji mükemmel çalıştı! "+N+" gerçek bir süper kahraman! 🏆",0)
]}},
function(N){return{title:N+" Korsan Macerası",scenes:[
S(N+" limanda eski bir gemi buldu. Çürük ama tamir edilebilir.","Gemiyi tamir et","Yeni gemi çal","2 ayda tamir ettin! Güzel bir kalyonun var.",0,"Gece gemiyi çaldın. Hızlı ama arananlar listesinde.",1),
S("Mürettebat lazım! Limanda deneyimli denizciler.","Deneyimli mürettebat","Sadık ama çaylak","Deneyimli ekip! Ama sadakatleri belirsiz.",0,"Çaylak ama sadık! Onları eğiteceksin.",0),
S("İlk yağma! Ticaret gemisi ufukta.","Saldır","Barışçıl ticaret teklif et","Saldırdın! Altın ve baharat ele geçirdin.",0,"Ticaret teklif ettin. Kârlı ve kansız!",0),
S("Yaşlı bir denizci hazine haritası veriyor. 'Lanetli' diyor.","Haritayı takip et","Lanetli, dokunma","Haritayı takip ediyorsun! Gizemli ada...",0,"Dokunmadın. Ama mürettebat isyan etmek üzere.",1),
S("Dev dalgalar! Deniz canavarı mı yoksa fırtına mı?","Canavarla savaş","Kaçış rotası","Canavarla savaştın! Toplarla vurdun, kaçtı.",1,"Kaçtın! Canavar peşinizde ama hızlısınız.",0),
S("Kraliyet donanması! 5 gemi "+N+"'i arıyor.","Savaş","Kıyıya sığın ve saklan","Savaştın! 2 gemi batırdın ama geminiz hasar aldı.",1,"Kıyıya sığındın. Mağarada saklandın. Geçtiler!",0),
S("Mürettebattan biri ihanet etti! Donanmaya bilgi vermiş.","Haini cezalandır","Sürgün et","Cezalandırdın. Mürettebat korktu ama saygı duyuyor.",0,"Sürgün ettin. Adil ama merhamet gösterdin.",0),
S("Final! Hazine adası! "+N+" X'in işaret ettiği yerde kazıyor.","Kaz","Tuzak kontrol et","Kazdın! ALTIN! Sandıklar dolusu! "+N+" denizlerin kralı! 🏆",0,"Tuzağı buldun, etkisiz hale getirdin, sonra altını aldın! "+N+" akıllı korsan! 🏆",0)
]}},
function(N){return{title:N+" Zaman Yolcusu",scenes:[
S(N+" dedesinin bodrumunda garip bir makine buldu. Üstünde 'Kronos' yazıyor.","Düğmeye bas","Araştır önce","Düğmeye bastın! Işık, rüzgar... 1950'lerdesin!",0,"Araştırdın — deden zaman makinesi yapmış! Notları buldun.",0),
S(N+" geçmişte! Her şey farklı. Ama birini tanıdın — genç dedeniz!","Dedenle konuş","Uzak dur, tarihi bozma","Dedenle konuştun. 'Sen kimsin?' diye sordu.",0,"Uzak durdun ama dedenin kavga ettiğini gördün.",0),
S("Bir şeyi yanlışlıkla değiştirdin! Geleceğe döndüğünde her şey farklı.","Düzelt","Yeni gerçeklikte yaşa","Geçmişe geri döndün! Değişikliği düzelttin.",0,"Yeni gerçeklikte kaldın. Farklı ama ilginç.",0),
S("Gelecekten gelen biri "+N+"'i buldu: 'Zamanda oynamayı bırak!'","Dinle","Görmezden gel","Dinledin. Zaman paradoksları tehlikeli!",0,"Görmezden geldin. Ama zaman akışı bozuluyor.",1),
S(N+" geleceğe gitti — 2100 yılı! Uçan arabalar, yapay zeka her yerde.","Teknoloji öğren","Hemen dön","Gelecek teknolojisini öğrendin. Bu bilgi çok değerli.",0,"Döndün. Ama gördüklerin unutulmaz.",0),
S("Zaman makinesi bozuldu! "+N+" yanlış çağda mahsur.","Tamir et","Yardım ara","Tamir etmeye çalıştın. Eksik parça var!",0,"Bu çağda bir mucit buldun. Yardım ediyor!",0),
S("Zaman polisi "+N+"'i yakaladı: 'Mahkemeye çıkacaksın!'","Savun","Kaç","Kendini savundun. Makineyi iyi amaçla kullandığını kanıtladın.",0,"Kaçtın! Ama her çağda arananlar listesinde.",1),
S("Final! "+N+" kendi zamanına dönmeli. Son şans.","Düğmeye bas, eve dön","Zamanda kalıp dünyayı değiştir","Düğmeye bastın! EVE DÖNÜDÜM! "+N+" zamanın koruyucusu! 🏆",0,N+" zamanda kaldı ve dünyayı daha iyi bir yer yaptı! 🏆",0)
]}},
function(N){return{title:N+" Casino Soygunu",scenes:[
S(N+" Las Vegas'ta. Dev casinonun güvenlik açığını fark etti.","Soygun planla","Casinoda oyna","Soygun ekibi kurmaya başladın!",0,"Blackjack'te 50K kazandın! Ama daha fazlası var.",0),
S("Ekip: hacker, kasa uzmanı, sürücü. "+N+" beyindir.","Herkesi topla","Daha küçük ekip","5 kişilik ekip hazır! Plan detaylı.",0,"3 kişilik ekip. Az kişi, az risk.",0),
S("Casino'nun güvenlik sistemini öğrenmelisiniz. İçeri birini sokmak lazım.","Garson olarak gir","Müşteri olarak keşfet","Garson olarak girdin. Kamera açılarını öğrendin!",0,"VIP müşteri olarak girdin. Kasa odasını gördün!",0),
S("Soygun gecesi! Plan başladı. Elektrik kesilecek.","Elektriği kes","Ana girişten gir","Elektrik kesildi! Karanlıkta ilerliyorsun.",0,"Ana girişten girdin. Kalabalıkta kayboluyorsun.",0),
S("Kasaya ulaştın! Ama lazer güvenlik sistemi aktif.","Lazerlerden geç","Ayna ile yansıt","Akrobatik hareketlerle lazerlerden geçtin!",0,"Aynalarla lazerleri devre dışı bıraktın!",0),
S("Kasa açıldı! 50 milyon dolar. Ama alarm çaldı!","Parayı al ve kaç","Yarısını al, hızlı çık","Tüm parayı aldın! Ağır ama değerli.",0,"Yarısını aldın ve hızlıca çıktın!",0),
S("Kaçış! Polis her yerde. Helikopter havada.","Tünelden kaç","Kalabalığa karış","Tünelden kaçtın! Şehir dışına çıktın.",0,"Kalabalığa karıştın. Hiç kimse şüphelenmedi!",0),
S("Final! "+N+" parayı bölüşme zamanı.","Eşit böl","Kendine fazla al","Eşit böldün! Ekip sadık, herkes mutlu. "+N+" efsane soyguncul! 🏆",0,"Fazla aldın ama kimse itiraz etmedi. "+N+" Las Vegas'ın kâbusu! 🏆",0)
]}},
function(N){return{title:N+" Kripto Milyoneri",scenes:[
S(N+" Bitcoin hakkında makale okudu. 1000 doları var.","Hepsini Bitcoin'e yatır","Yarısını yatır","Hepsini yatırdın! Fiyat yükseliyor!",0,"Yarısını yatırdın. Temkinli ama akıllı.",0),
S("Bitcoin %300 yükseldi! "+N+" artık 4000 doları var.","Tut","Satıp kâr al","Tuttun! Fiyat yükselmeye devam.",0,"Kârı aldın. 3000$ kâr. Ama fiyat yükseldi...",0),
S("Arkadaşı yeni coin önerdi: 'Bu 100x yapacak!'","Yatırım yap","Güvenme","Yatırım yaptın! Coin 10x yaptı. Ama 100x değil.",0,"Güvenmedin. Coin çöktü. İyi ki almadın!",0),
S(N+" kendi coin projesini kurmak istiyor.","ICO başlat","Başkasının projesine katıl","ICO başlattın! 2 milyon dolar topladın.",0,"Başarılı projeye katıldın. Güvenli gelir.",0),
S("SEC soruşturma başlattı! Kripto projeler mercek altında.","Avukat tut","Her şeyi şeffaf yap","Avukat tutun. Yasal savaş başladı.",0,"Şeffaflık politikası izledin. SEC ikna oldu!",0),
S("Bear market! Tüm coinler %80 düştü.","Tut, sabırlı ol","Panikle sat","Tuttun. Sabır!",0,"Sattın. Zararda ama nakit elde.",1),
S("Yeni proje: DeFi platformu. "+N+" kodluyor.","Lansman yap","Daha fazla test et","Lansmanı yaptın! Kullanıcılar akın etti!",0,"Test ettin. Bug buldun ve düzelttin. Güvenli lansman!",0),
S("Final! "+N+"'in projesi piyasanın lideri oldu.","Borsaya açıl","Bağımsız kal","Borsaya açıldın! "+N+" kripto milyarderi! 🏆",0,"Bağımsız kaldın! "+N+" merkeziyetsiz dünyanın lideri! 🏆",0)
]}},
function(N){return{title:N+" Survivor Yarışması",scenes:[
S(N+" Survivor'a katıldı! 20 yarışmacı, ıssız ada.","Hemen ittifak kur","Tek başına gözlemle","İttifak kurdun! 4 kişilik güçlü grup.",0,"Gözlemledin. Herkesin zayıf noktasını öğrendin.",0),
S("İlk görev: balık tutma! En çok tutan dokunulmazlık kazanır.","Ağ yap","Elle tut","Ağ harika çalıştı! 15 balık tuttun, 1. oldun!",0,"Elle 3 balık tuttun. Az ama yeterli.",0),
S("Konsey gecesi! İttifakın birini elemek istiyor.","İttifaka uy","Farklı oy ver","İttifaka uydun. Hedef elendi.",0,"Farklı oy verdin. İttifak kızgın!",1),
S("Bireysel dokunulmazlık! Parkur: denge, tırmanma, yüzme.","Tam gaz","Enerji biriktir","Tam gaz gittin! Dokunulmazlık senin!",0,"Enerji biriktirdin. 3. olarak güvendesin.",0),
S("Takım birleşmesi! Artık herkes bireysel.","Yeni ittifak kur","Şampiyon rotasında ilerle","Yeni ittifak! Güçlü bir konum.",0,"Tek başına ilerliyorsun. Herkes seni hedef alıyor.",1),
S("Gizli dokunulmazlık idolü! "+N+" bir ipucu buldu.","İdolü ara","Boş ver","Buldun! Gizli idol cebinde.",0,"Aramadın. Başkası buldu.",0),
S("Final 4! Herkes "+N+"'i elemek istiyor.","İdolü kullan","Risk al, kullanma","İdolü kullandın! Sana atılan oylar geçersiz!",0,"Risk aldın ama dokunulmazlık kazandın! İdole gerek kalmadı.",0),
S("Final! "+N+" jüri önünde savunma yapacak.","Stratejiyi anlat","Dürüst ol","Stratejini anlattın. Jüri etkilendi. "+N+" SURVIVOR ŞAMPİYONU! 🏆",0,"Dürüst oldun. Jüri saygı duydu. "+N+" ŞAMPİYON! 🏆",0)
]}},
function(N){return{title:N+" Mahalle Kahramanı",scenes:[
S(N+"'in mahallesi zor durumda. Uyuşturucu satıcıları, çöpler, karanlık sokaklar.","Harekete geç","Belediyeyi ara","Komşuları topladın. 'Bu mahalleyi biz kurtaracağız!'",0,"Belediyeyi aradın. 'Bütçemiz yok' dediler.",0),
S("İlk adım: sokaklardaki çöpleri temizlemek.","Temizlik kampanyası başlat","Medyayı çağır","Temizlik kampanyası büyük ilgi gördü! 100 gönüllü!",0,"Medya geldi, haber yaptı. Belediye utandı, kamyon gönderdi!",0),
S("Uyuşturucu satıcıları "+N+"'i tehdit etti: 'Karışma!'","Geri adım atma","Polisle birlikte çalış","Geri adım atmadın! Komşular arkanda. Satıcılar tedirgin.",0,"Polisle çalıştın. Operasyon yapıldı, satıcılar yakalandı!",0),
S("Belediye başkanı "+N+"'le buluşmak istiyor.","Buluş","Güvenme","Buluştun. Başkan destek sözü verdi.",0,"Güvenmedin. Basın açıklaması yaptın, başkanı köşeye sıkıştırdın.",0),
S("Mahalle için park ve oyun alanı projesi hazırladın.","Bağış kampanyası","Belediyeden talep et","Bağış kampanyası viral oldu! 200K toplandı!",0,"Belediye mecbur kaldı, bütçe ayırdı.",0),
S("Rakip müteahhit mahalleyi yıkıp AVM yapmak istiyor!","Protesto düzenle","Yasal savaş başlat","Protesto büyüdü! Binlerce kişi katıldı!",0,"Avukat tutun. İmar planını iptal ettirdiniz!",0),
S("Seçim zamanı! Halk "+N+"'i aday göstermek istiyor.","Aday ol","Ben siyasetçi değilim","Aday oldun! Kampanya muhteşem gidiyor.",0,"Adaylığı reddettin ama desteklediğin kişi kazandı!",0),
S("Final! "+N+"'in mahallesi bambaşka bir yer. Yeşil, güvenli, mutlu.","Diğer mahallelere de yardım et","Burada kal, korumaya devam","Diğer mahallelere de el uzattın. "+N+" şehrin kahramanı! 🏆",0,"Mahalleyi korumaya devam ettin. "+N+" mahalle efsanesi! 🏆",0)
]}},
function(N){return{title:N+" Çiftlik Hayatı",scenes:[
S(N+" şehirden kaçıp köyde çiftlik satın aldı. Tarla boş, ev harap.","Evi tamir et","Tarlayı ekmeye başla","Evi tamir ettin! Artık yaşanabilir.",0,"Tarlaya domates ve biber ektin! 3 ay sonra hasat.",0),
S("İlk hasat! Ama fiyatlar düşük, satamıyorsun.","Pazar kur","Organik sertifika al","Köy pazarı kurdun! Direkt satış, kârlı!",0,"Organik sertifika aldın. Fiyatlar 3 katına çıktı!",0),
S("Kuraklık! Yağmur yağmıyor, ekinler soluyor.","Kuyu kaz","Damla sulama sistemi kur","Kuyu kazdın! 30 metrede su buldun!",0,"Damla sulama — su tasarrufu + verimli ekinler!",0),
S("Komşu kavgası! Keçilerin tarlana girip ekinleri yemiş.","Komşuyla konuş","Çit kur","Komşuyla konuştun. Özür diledi, zararı karşıladı.",0,"Çit kurdun. Artık hayvanlar giremez.",0),
S("Hayvan çiftliği kurmak istiyorsun. Tavuk mu inek mi?","Tavuk","İnek","50 tavuk aldın! Her gün yumurta.",0,"3 inek aldın! Süt ve peynir üretimi.",0),
S("Fırtına tarlayı harap etti! Ekinlerin yarısı gitti.","Sigorta parası al","Komşulardan yardım iste","Sigorta zararı karşıladı.",0,"Komşular yardım etti. Köy dayanışması!",0),
S("Şehirden market zinciri geldi: 'Tüm ürünlerini al, kontrat yapalım.'","Kabul et","Bağımsız kal","Kontrat imzaladın. Garantili gelir ama kuralları onlar koyuyor.",0,"Bağımsız kaldın. Kendi markanla devam!",0),
S("Final! "+N+"'in çiftliği 10 yıl sonra. Yeşil, bereketli, huzurlu.","Agro-turizm aç","Sadece çiftçilik","Agro-turizm açtın! Şehirliler akın ediyor. "+N+" hem zengin hem mutlu! 🏆",0,"Sade çiftçilik. "+N+" doğanın içinde huzuru buldu! 🏆",0)
]}},
function(N){return{title:N+" Sanal Dünya",scenes:[
S(N+" yeni VR oyunu 'Nexus' oynuyor. Ama çıkış butonu yok!","Çıkışı ara","Oyunu oyna, belki bitirince çıkarsın","Çıkış bulunamadı! Gerçekten mahsursun.",0,"Oynamaya devam ettin. Level 1 tamamlandı!",0),
S("Oyunda başka mahsur oyuncular var! 50 kişi.","Takım kur","Yalnız oyna","5 kişilik takım kurdun! Güçlü ekip.",0,"Yalnız ilerliyorsun. Hızlı ama riskli.",0),
S("İlk boss! Dev robot. Takım saldırıyor.","Önden saldır","Strateji kur","Önden saldırdın! Boss'un dikkatini çektin, takım vurdu.",1,"Strateji mükemmeldi! Boss 5 dakikada yenildi.",0),
S("Gizli bir kapı buldun. Arkasında oyunun kaynak kodu!","Kodu incele","Dokunma, tehlikeli","Kodu inceledin! Çıkış yolu kodda gizli.",0,"Dokunmadın. Ama merak ettin.",0),
S("Bug buldun! Duvardan geçiş yapabilirsin.","Bug'ı kullan","Rapor et","Bug'ı kullanarak gizli alana ulaştın! GM odası!",0,"Rapor ettin. Sistem güncellendi, ödül kazandın!",0),
S("Gerçek dünyadan mesaj geldi: 'Beyin dalgaların anormal!'","Acele et, çık","Sakin ol, çözümü bul","Acele ettin ama yanlış kapıya girdin!",1,"Sakin kaldın. Çözümü sistematik olarak buldun.",0),
S("Final boss! Oyunun yaratıcısının avatar'ı. "+N+"'den güçlü.","Tek başına savaş","Tüm oyuncuları topla","Tek başına savaştın! Epik ama zor.",1,"50 oyuncuyu topladın! Birlikte saldırdınız!",0),
S("Final! Boss yenildi. Çıkış portalı açıldı!","Portaldan geç","Son bir kez arkana bak",N+" portaldan geçti! Gerçek dünyaya döndün! 🏆",0,"Arkana baktın. Güzel anılar. Sonra portaldan geçtin. "+N+" gerçek dünyada! 🏆",0)
]}},
function(N){return{title:N+" Para Aklama",scenes:[
S(N+" küçük bir kafe işletiyor. Bir gün gizemli adam: 'Sana ayda 50K veririm, sadece bir hesap aç.'","Kabul et","Reddet","Kabul ettin. İlk ay 50K geldi. Kolay para.",0,"Reddettin. Adam gitti ama... başka bir teklifle döndü.",0),
S("Para artıyor ama nereden geldiği şüpheli. "+N+" sorular sormaya başladı.","Soru sorma, devam et","Araştır","Soru sormadın. Para akmaya devam ediyor.",0,"Araştırdın — uyuşturucu parası!",0),
S("Vergi müfettişi kafene geldi: 'Gelirleriniz anormal yüksek.'","Sahte belgeler göster","Dürüst ol","Sahte belgeler inandırıcıydı. Müfettiş gitti.",0,"Dürüst olamadın çünkü zaten bataksın. Yalan söyledin.",0),
S(N+" bu işten çıkmak istiyor ama patron bırakmıyor.","Polise git","Kaç","Polise gittin. Tanık korumaya aldılar!",0,"Kaçtın! Ama patron adamlarını gönderdi.",1),
S("Polis operasyonu başladı. "+N+" kilit tanık.","Tanıklık et","Sessiz kal","Tanıklık ettin. Patron tutuklandı!",0,"Sessiz kaldın. Patron serbest kaldı. Tehlike devam.",1),
S("Mahkeme süreci. Patron avukatları "+N+"'i tehdit ediyor.","Yılma","Anlaşma yap","Yılmadın! Tanıklığını sürdürdün.",0,"Anlaşma yaptın. Hafif ceza ama özgürsün.",0),
S(N+" temiz bir hayata başlamak istiyor.","Yeni şehirde başla","Aynı yerde devam","Yeni şehirde yeni kafe açtın!",0,"Aynı yerde devam. Yüzleşmek cesaret ister.",0),
S("Final! "+N+" artık temiz bir hayat yaşıyor.","Başkalarını uyar","Sessizce yaşa",N+" gençlere konuşmalar yapıyor. 'Kolay para diye bir şey yok!' 🏆",0,N+" sessizce yaşıyor. Huzurlu, temiz, özgür. 🏆",0)
]}},
function(N){return{title:N+" Son Görev",scenes:[
S(N+" emekli asker. Eski komutan aradı: 'Son bir görev. Ülke için.'","Kabul et","Emekliyim","Kabul ettin. Eğitim kampına geri döndün.",0,"Reddettin. Ama dosya kapının altından süzüldü.",0),
S("Görev: düşman topraklarında esir asker kurtarma.","Gizli operasyon","Diplomatik yol","Gizli operasyon planlandı. 4 kişilik ekip.",0,"Diplomatik yol denendi. Başarısız. Operasyon kaçınılmaz.",0),
S(N+" helikopterle bölgeye indi. Karanlık, soğuk.","Sessizce ilerle","Hızlı hareket et","Sessizce ilerliyorsun. Düşman fark etmedi.",0,"Hızlı hareket! Gürültü yaptın ama hedefe yaklaştın.",1),
S("Esir tutulan binayı buldun. İçeride 5 nöbetçi.","Tek tek etkisiz hale getir","Dikkat dağıt, içeri gir","Tek tek etkisiz hale getirdin! Profesyonel!",0,"Dikkat dağıttın. 3'ü koştu, 2'siyle ilgilendin.",0),
S("Esirler bulundu! 3 asker, yaralılar.","Hepsini al","En ağır yaralıyı taşı, diğerleri yürüsün","Hepsini aldın ama yavaşladınız.",0,"En ağır yaralıyı taşıdın. Diğerleri yürüdü. Hızlı!",0),
S("Çıkışta pusu! Düşman bekliyordu.","Ateşle cevap ver","Alternatif çıkış bul","Ateş açtın! Yoğun çatışma ama yolu açtın.",1,"Alternatif çıkış buldun. Sessizce kaçtınız!",0),
S("Helikopter buluşma noktasında bekliyordu ama pilot vurulmuş!","Helikopteri sen uç","Karadan devam et","Helikopteri uçurdun! Zor ama başardın.",0,"Karadan devam. 20 km yürüyüş ama güvendesiniz.",1),
S("Final! "+N+" esirleri güvenli bölgeye getirdi.","Madalya kabul et","Sessizce çekil","Madalya aldın! "+N+" ulusal kahraman! 🏆",0,"Sessizce çekildin. Kimse bilmiyor ama esirler özgür. "+N+" gerçek asker! 🏆",0)
]}},
];

function generateStory(playerName) {
  var idx = Math.floor(Math.random() * STORY_TEMPLATES.length);
  return STORY_TEMPLATES[idx](playerName);
}

function startStoryMode(platform, channelId) {
  var playerName = document.getElementById('story-name') ? document.getElementById('story-name').value.trim() : 'Oyuncu';
  if (!playerName) { toast('Karakter ismi gir!', false); return; }
  
  var story = generateStory(playerName);
  
  storyState = {
    platform: platform,
    channelId: channelId,
    story: story,
    current: 0,
    lives: 3,
    maxLives: 3,
    votesA: 0,
    votesB: 0,
    voters: {},
    phase: 'SHOW',
    chatMessages: [],
    active: true
  };
  
  renderStoryScene();
}

function processStoryChatMessage(author, text) {
  if (!storyState || !storyState.active || storyState.phase !== 'VOTING') return;
  
  text = text.trim().toUpperCase();
  if (text !== 'A' && text !== 'B') return;
  if (storyState.voters[author]) return;
  
  storyState.voters[author] = text;
  if (text === 'A') storyState.votesA++;
  else storyState.votesB++;
  
  storyState.chatMessages.push({ author: author, text: text, time: Date.now() });
  if (storyState.chatMessages.length > 50) storyState.chatMessages.shift();
  
  updateStoryVoteUI();
}

function updateStoryVoteUI() {
  var s = storyState;
  var total = s.votesA + s.votesB;
  var pctA = total > 0 ? Math.round((s.votesA / total) * 100) : 50;
  var pctB = total > 0 ? Math.round((s.votesB / total) * 100) : 50;
  
  var barEl = document.getElementById('story-vote-bar');
  if (barEl) barEl.innerHTML = '<div style="display:flex;height:40px;border-radius:12px;overflow:hidden;border:1px solid var(--b1)">' +
    '<div style="width:' + pctA + '%;background:linear-gradient(90deg,#3b82f6,#60a5fa);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;transition:width .3s">A ' + pctA + '%</div>' +
    '<div style="width:' + pctB + '%;background:linear-gradient(90deg,#ffb95f,#fbbf24);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#000;transition:width .3s">B ' + pctB + '%</div></div>' +
    '<div style="text-align:center;margin-top:8px;font-size:14px;color:var(--t3)">' + total + ' oy</div>';
  
  var chatEl = document.getElementById('story-chat');
  if (chatEl) {
    var msgs = s.chatMessages.slice(-12);
    chatEl.innerHTML = msgs.map(function(m) {
      var isA = m.text === 'A';
      return '<div style="padding:3px 8px;font-size:13px"><b style="color:' + (isA ? '#60a5fa' : '#fbbf24') + '">' + esc(m.author) + ':</b> <span style="font-weight:700;color:' + (isA ? '#3b82f6' : '#ffb95f') + '">' + m.text + '</span></div>';
    }).join('');
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}

function renderStoryScene() {
  var s = storyState;
  if (!s || s.current >= s.story.scenes.length) { renderStoryWin(); return; }
  
  var scene = s.story.scenes[s.current];
  var ag = document.getElementById('ag');
  var livesHtml = '';
  for (var i = 0; i < s.maxLives; i++) livesHtml += '<span style="font-size:28px">' + (i < s.lives ? '\u2764\ufe0f' : '\ud83d\udda4') + '</span>';
  
  s.votesA = 0;
  s.votesB = 0;
  s.voters = {};
  s.chatMessages = [];
  s.phase = 'SHOW';
  
  ag.innerHTML = 
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--b1)">' +
    '<div style="display:flex;align-items:center;gap:12px"><button class="btn bg bsm" onclick="streamStop()">\u2190 \u00c7\u0131k</button>' +
    '<span class="fd" style="font-weight:700;font-size:20px">\ud83c\udfac ' + esc(s.story.title) + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:16px"><div>' + livesHtml + '</div>' +
    '<span class="badge bv" style="font-size:14px">Sahne ' + (s.current + 1) + '/' + s.story.scenes.length + '</span>' +
    '<span class="badge" style="background:#ff000020;color:#ff4444;font-size:12px">\ud83d\udd34 CANLI</span></div></div>' +
    
    '<div style="display:flex;flex:1;min-height:0">' +
    
    '<div style="flex:1;display:flex;flex-direction:column;padding:24px">' +
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div style="max-width:700px;width:100%;text-align:center">' +
    '<p style="font-size:22px;color:var(--t1);line-height:1.7;margin-bottom:32px">' + esc(scene.text) + '</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">' +
    '<div id="story-opt-a" style="padding:24px;border-radius:16px;background:#3b82f610;border:2px solid #3b82f640;cursor:pointer;transition:all .2s" onclick="streamerForceStory(\'A\')" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'"><div style="font-size:14px;color:#60a5fa;font-weight:700;margin-bottom:8px">A SE\u00c7ENE\u011e\u0130</div><p style="font-size:18px;font-weight:600;color:var(--t1)">' + esc(scene.a) + '</p></div>' +
    '<div id="story-opt-b" style="padding:24px;border-radius:16px;background:#ffb95f10;border:2px solid #ffb95f40;cursor:pointer;transition:all .2s" onclick="streamerForceStory(\'B\')" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'\'"><div style="font-size:14px;color:#fbbf24;font-weight:700;margin-bottom:8px">B SE\u00c7ENE\u011e\u0130</div><p style="font-size:18px;font-weight:600;color:var(--t1)">' + esc(scene.b) + '</p></div></div>' +
    '<div id="story-vote-bar"></div>' +
    '<div id="story-countdown" style="margin-top:16px;font-size:48px;font-weight:700;color:var(--v)"></div>' +
    '</div></div></div>' +
    
    '<div style="width:280px;background:var(--bg2);border-left:1px solid var(--b1);display:flex;flex-direction:column">' +
    '<div style="padding:12px 16px;border-bottom:1px solid var(--b1);font-size:14px;font-weight:600">\ud83d\udcac Chat Oylar\u0131</div>' +
    '<div id="story-chat" style="flex:1;overflow-y:auto;padding:8px;font-size:13px"><p style="color:var(--t3);text-align:center;padding:20px">Chat\'e A veya B yaz\u0131n!</p></div></div>' +
    
    '</div>';
  
  setTimeout(function() {
    s.phase = 'VOTING';
    startStoryCountdown(60);
  }, 2000);
}

function startStoryCountdown(seconds) {
  var remaining = seconds;
  var el = document.getElementById('story-countdown');
  if (el) el.textContent = remaining;
  
  if (storyTimer) clearInterval(storyTimer);
  storyTimer = setInterval(function() {
    remaining--;
    var el = document.getElementById('story-countdown');
    if (el) {
      el.textContent = remaining;
      if (remaining <= 5) el.style.color = '#ff544d';
    }
    if (remaining <= 0) {
      clearInterval(storyTimer);
      resolveStoryVote();
    }
  }, 1000);
}

// Yayıncı A veya B'ye tıklayarak sahneyi geçer
function streamerForceStory(choice) {
  if (!storyState || !storyState.active || storyState.phase !== 'VOTING') return;
  // Stop countdown
  if (storyTimer) { clearInterval(storyTimer); storyTimer = null; }
  // Force the chosen option to win
  if (choice === 'A') storyState.votesA += 99999;
  else storyState.votesB += 99999;
  resolveStoryVote();
}

function resolveStoryVote() {
  var s = storyState;
  if (!s) return;
  s.phase = 'RESULT';
  
  var scene = s.story.scenes[s.current];
  var choice = s.votesA >= s.votesB ? 'A' : 'B';
  var result = choice === 'A' ? scene.ra : scene.rb;
  
  if (result.dmg > 0) s.lives -= result.dmg;
  
  var optEl = document.getElementById(choice === 'A' ? 'story-opt-a' : 'story-opt-b');
  if (optEl) { optEl.style.borderColor = '#3cddc7'; optEl.style.background = '#3cddc715'; }
  var otherEl = document.getElementById(choice === 'A' ? 'story-opt-b' : 'story-opt-a');
  if (otherEl) { otherEl.style.opacity = '0.3'; }
  
  var cdEl = document.getElementById('story-countdown');
  if (cdEl) {
    var dmgHtml = result.dmg > 0 ? '<div style="font-size:20px;color:#ff544d;margin-top:8px">\u26a0\ufe0f -' + result.dmg + ' can!</div>' : '<div style="font-size:20px;color:var(--m);margin-top:8px">\u2705 Hasars\u0131z!</div>';
    cdEl.innerHTML = '<div style="font-size:20px;font-weight:500;color:var(--t1);line-height:1.6;max-width:500px;margin:0 auto">' + esc(result.text) + dmgHtml + '</div>';
    cdEl.style.color = '';
  }
  
  if (s.lives <= 0) {
    if(typeof gameTimers!=='undefined') gameTimers.push(setTimeout(function() { if(storyState&&storyState.active) renderStoryDeath(); }, 4000));
  } else {
    s.current++;
    if(typeof gameTimers!=='undefined') gameTimers.push(setTimeout(function() { if(storyState&&storyState.active) renderStoryScene(); }, 5000));
  }
}

function renderStoryDeath() {
  var s = storyState;
  var ag = document.getElementById('ag');
  ag.innerHTML = 
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div style="text-align:center;padding:60px 40px;max-width:600px">' +
    '<div style="font-size:120px;margin-bottom:20px">\u2620\ufe0f</div>' +
    '<h2 class="fd" style="font-size:48px;font-weight:700;color:#ff544d;margin-bottom:12px">GAME OVER</h2>' +
    '<p style="font-size:22px;color:var(--t2);margin-bottom:8px">' + esc(s.story.title) + '</p>' +
    '<p style="font-size:18px;color:var(--t3)">Sahne ' + (s.current + 1) + '/' + s.story.scenes.length + ' - Canlar\u0131n t\u00fckendi!</p>' +
    '<p style="font-size:16px;color:var(--t3);margin-top:16px">Chat kaderini belirledi... ve bu sefer ac\u0131mas\u0131zd\u0131.</p>' +
    '<button class="btn bp" style="margin-top:28px;font-size:18px;padding:14px 32px" onclick="streamStop()">Ana Sayfaya D\u00f6n</button>' +
    '</div></div>';
  storyCleanup();
}

function renderStoryWin() {
  var s = storyState;
  var ag = document.getElementById('ag');
  var heartsLeft = '';
  for (var i = 0; i < s.lives; i++) heartsLeft += '\u2764\ufe0f';
  
  ag.innerHTML = 
    '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div style="text-align:center;padding:60px 40px;max-width:600px">' +
    '<div style="font-size:120px;margin-bottom:20px">\ud83c\udfc6</div>' +
    '<h2 class="fd" style="font-size:48px;font-weight:700;color:var(--m);margin-bottom:12px">KAZANDIN!</h2>' +
    '<p style="font-size:22px;color:var(--t2);margin-bottom:8px">' + esc(s.story.title) + '</p>' +
    '<p style="font-size:20px;margin-top:12px">' + heartsLeft + ' ' + s.lives + ' can kald\u0131</p>' +
    '<p style="font-size:16px;color:var(--t3);margin-top:16px">Chat kaderini belirledi ve ' + esc(s.story.title.split("'")[0]) + ' hayatta kald\u0131!</p>' +
    '<button class="btn bp" style="margin-top:28px;font-size:18px;padding:14px 32px" onclick="streamStop()">Ana Sayfaya D\u00f6n</button>' +
    '</div></div>';
  storyCleanup();
}

function storyCleanup() {
  if (storyTimer) { clearInterval(storyTimer); storyTimer = null; }
  if (storyState) storyState.active = false;
}
