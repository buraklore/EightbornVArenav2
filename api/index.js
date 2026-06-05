var express = require('express');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var db = require('./db');

var app = express();

// #2 Security: JWT secret — env zorunlu, yoksa her cold start'ta random üretilir (token'lar redeploy'da geçersiz olur)
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[SECURITY] JWT_SECRET env degiskeni ayarlanmamis! Gecici random secret kullaniliyor — her redeploy token\'lari gecersiz kilar. Vercel > Settings > Environment Variables > JWT_SECRET ekleyin.');
}

var dbReady = false;
async function ensureDb() { if (!dbReady) { await db.init(); dbReady = true; } }

// #3 Security: CORS — sadece kendi domain'lerine izin ver
var ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://eightbornvarena.com,https://www.eightbornvarena.com,https://eightbornvarena.vercel.app').split(',');
app.use(cors({ origin: function(origin, cb) { if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) cb(null, true); else cb(null, false); }, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// #13 Security: Security headers
app.use(function(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function generateToken(user) { return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' }); }
function auth(req, res, next) { var token = null; if (req.cookies && req.cookies.ebv_token) token = req.cookies.ebv_token; if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1]; if (!token) return res.status(401).json({ error: 'Giris yapmalsin.' }); try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch (e) { res.status(401).json({ error: 'Oturum suresi doldu.' }); } }
function adm(req, res, next) { if (!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin yetkisi gerekli.' }); next(); }
function setCookie(res, user) { res.cookie('ebv_token', generateToken(user), { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 604800000 }); }

app.get('/api/init', async function(req, res) { try { await ensureDb(); var ch = await db.getAllCharacters(false); var qq = await db.getAllQuestions(); var wq = await db.getAllWhoQuestions(); var gc = await db.getConfig('games'); var del = await db.getConfig('deleted_chars'); var ads = await db.getConfig('ads_config'); var rqs = await db.getConfig('replaced_qs'); var discord = await db.getDiscordLink(); var heroImg = await db.getConfig("hero_image");
    var seoTitle = await db.getConfig('seo_title'); var seoDesc = await db.getConfig('seo_description'); var seoKeys = await db.getConfig('seo_keywords'); var seoOgImg = await db.getConfig('seo_ogimage');
    var gnR = await db.query("SELECT key, value FROM game_config WHERE key LIKE 'game_%'"); var gameNames = {}; gnR.rows.forEach(function(r){ gameNames[r.key.replace('game_','')] = r.value; }); res.json({ characters: ch, quizQuestions: qq, whoQuestions: wq, gameConfig: gc ? JSON.parse(gc) : null, deleted_chars: del || null, ads_config: ads || null, replaced_qs: rqs || null, discord: discord || "", hero_image: heroImg || "", game_names: gameNames || {}, seo: { title: seoTitle || '', description: seoDesc || '', keywords: seoKeys || '', ogimage: seoOgImg || '' } }); } catch (e) { console.error(e.message); res.status(500).json({ error: 'Init failed.' }); } });


// Fast init - no base64 images, parallel queries
app.get('/api/init-lite', async function(req, res) {
  try {
    await ensureDb();
    var [ch, qq, wq, gc, ads, discord, gnR] = await Promise.all([
      db.getAllCharactersLite(),
      db.getAllQuestions(),
      db.getAllWhoQuestions(),
      db.getConfig('games'),
      db.getConfig('ads_config'),
      db.getDiscordLink(),
      db.query("SELECT key, value FROM game_config WHERE key LIKE 'game_%'")
    ]);
    var gameNames = {};
    gnR.rows.forEach(function(r){ gameNames[r.key.replace('game_','')] = r.value; });
    res.json({ characters: ch, quizQuestions: qq, whoQuestions: wq, gameConfig: gc ? JSON.parse(gc) : null, ads_config: ads || null, discord: discord || "", game_names: gameNames || {} });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Init failed.' }); }
});

// Separate endpoint for character images (loaded on demand)
app.get('/api/char-images', async function(req, res) {
  try {
    await ensureDb();
    var r = await db.query("SELECT id, img FROM characters WHERE img != '' AND img IS NOT NULL AND img LIKE 'data:%'");
    var map = {};
    r.rows.forEach(function(row) { map[row.id] = row.img; });
    res.json({ images: map });
  } catch(e) { res.json({ images: {} }); }
});

app.post('/api/auth/register', async function(req, res) { try { await ensureDb(); var username = (req.body.username || '').trim().substring(0, 20); var email = (req.body.email || '').trim().substring(0, 100).toLowerCase(); var password = (req.body.password || '').trim(); if (!username || !email || !password) return res.status(400).json({ error: 'Tum alanlari doldur.' }); if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Kullanici adi 3-20 karakter.' }); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Gecerli e-posta gir.' }); if (password.length < 4 || password.length > 50) return res.status(400).json({ error: 'Sifre 4-50 karakter.' }); if (await db.findUserByEmail(email) || await db.findUserByUsername(username)) return res.status(400).json({ error: 'Bu bilgilerle kayit yapilamiyor.' }); var userId = await db.createUser(username, email, password); var user = await db.findUserById(userId); setCookie(res, user); res.json({ user: { id: user.id, username: user.username, role: user.role, best_score: 0, games_played: 0 } }); } catch (e) { console.error(e.message); res.status(500).json({ error: 'Kayit basarisiz.' }); } });
app.post('/api/auth/login', async function(req, res) { try { await ensureDb(); var email = (req.body.email || '').trim().toLowerCase(); var password = (req.body.password || '').trim(); if (!email || !password) return res.status(400).json({ error: 'E-posta ve sifre gerekli.' }); var user = await db.findUserByEmail(email); if (!user) user = await db.findUserByUsername(email); if (!user || !db.verifyPassword(password, user.password)) return res.status(401).json({ error: 'E-posta veya sifre hatali.' }); if (user.banned) return res.status(403).json({ error: 'Hesabiniz yasaklanmistir.' }); setCookie(res, user); res.json({ user: { id: user.id, username: user.username, role: user.role, best_score: user.best_score, games_played: user.games_played } }); } catch (e) { console.error(e.message); res.status(500).json({ error: 'Giris basarisiz.' }); } });
app.get('/api/auth/me', auth, async function(req, res) { try { await ensureDb(); var user = await db.findUserById(req.user.id); if (!user) return res.status(404).json({ error: 'Bulunamadi.' }); if (user.banned) return res.status(403).json({ error: 'Hesabiniz yasaklanmistir.' }); res.json({ user: user }); } catch (e) { res.status(500).json({ error: 'Hata.' }); } });
app.post('/api/auth/logout', function(req, res) { res.clearCookie('ebv_token'); res.json({ success: true }); });

app.post('/api/scores/save', auth, async function(req, res) { try { await ensureDb(); var score = req.body.score; var validGames = ['MEMORY','FACE','QUOTE','RANK']; if (!validGames.includes(req.body.game_type) || typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Gecersiz.' }); var total = req.body.game_type === "MEMORY" ? await db.getQuestionCount() : (req.body.total || score); if (score > total) return res.status(400).json({ error: 'Gecersiz skor.' }); await db.saveScore(req.user.id, req.body.game_type, score, total); var user = await db.findUserById(req.user.id); res.json({ success: true, best_score: user.best_score, games_played: user.games_played }); } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });
app.get('/api/scores/game-leaderboard', async function(req, res) {
  try { await ensureDb(); var gt = req.query.game || 'MEMORY'; var lb = await db.getGameLeaderboard(gt); res.json({ leaderboard: lb, game_type: gt }); }
  catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); }
});

app.get('/api/scores/leaderboard', async function(req, res) { try { await ensureDb(); res.json({ leaderboard: await db.getLeaderboard(), total_questions: await db.getQuestionCount() }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });

app.get('/api/characters', async function(req, res) { try { await ensureDb(); res.json({ characters: await db.getAllCharacters(false) }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.get('/api/characters/admin', auth, adm, async function(req, res) { try { await ensureDb(); res.json({ characters: await db.getAllCharacters(true) }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.post('/api/characters', auth, adm, async function(req, res) { try { await ensureDb(); var d = req.body; var name = (d.name || d.n || '').trim().substring(0, 30); if (!name) return res.status(400).json({ error: 'Ad zorunlu.' }); var cid = await db.upsertCharacter({ id: d.id, origName: d.origName, origSurname: d.origSurname, name: name, surname: (d.surname || d.s || '').trim().substring(0, 50), gender: (d.gender || d.g) === 'F' ? 'F' : 'M', rep: (d.rep || '').trim().substring(0, 200), tip: (d.tip || '').trim().substring(0, 100), img: d.img || '', active: d.active !== false && d.a !== false }); res.json({ success: true, id: cid }); } catch (e) { console.error(e.message); res.status(500).json({ error: 'Kaydedilemedi.' }); } });
app.delete('/api/characters/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.deleteCharacter(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); } });

app.get('/api/questions', async function(req, res) { try { await ensureDb(); res.json({ questions: await db.getAllQuestions() }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.post('/api/questions', auth, adm, async function(req, res) { try { await ensureDb(); var d = req.body; var q = (d.question || '').trim().substring(0, 300); if (!q) return res.status(400).json({ error: 'Soru zorunlu.' }); var qid = await db.upsertQuestion({ id: d.id, question: q, option_a: (d.option_a || '').substring(0, 100), option_b: (d.option_b || '').substring(0, 100), option_c: (d.option_c || '').substring(0, 100), option_d: (d.option_d || '').substring(0, 100), correct_index: d.correct_index || 0 }); res.json({ success: true, id: qid }); } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });
app.delete('/api/questions/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.deleteQuestion(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); } });

app.get('/api/who-questions', async function(req, res) { try { await ensureDb(); res.json({ questions: await db.getAllWhoQuestions() }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.post('/api/who-questions', auth, adm, async function(req, res) { try { await ensureDb(); var d = req.body; var q = (d.question || '').trim().substring(0, 300); if (!q) return res.status(400).json({ error: 'Soru zorunlu.' }); var qid = await db.upsertWhoQuestion({ id: d.id, question: q, option_a: (d.option_a || '').substring(0, 100), option_b: (d.option_b || '').substring(0, 100), option_c: (d.option_c || '').substring(0, 100), option_d: (d.option_d || '').substring(0, 100) }); res.json({ success: true, id: qid }); } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });
app.delete('/api/who-questions/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.deleteWhoQuestion(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); } });

app.get('/api/game-config', async function(req, res) { try { await ensureDb(); var v = await db.getConfig('games'); var ads = await db.getConfig('ads_config'); var del = await db.getConfig('deleted_chars'); var rqs2 = await db.getConfig('replaced_qs'); res.json({ config: v ? JSON.parse(v) : null, ads_config: ads || null, deleted_chars: del || null, replaced_qs: rqs2 || null }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.post('/api/game-config', auth, adm, async function(req, res) { try { await ensureDb(); if (req.body.key === 'ads_config') { await db.setConfig('ads_config', req.body.value); } else if (req.body.key === 'deleted_chars') { await db.setConfig('deleted_chars', req.body.value); } else if (req.body.key === 'replaced_qs') { await db.setConfig('replaced_qs', req.body.value); } else { await db.setConfig('games', JSON.stringify(req.body.config)); } res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });

app.get('/api/admin/users', auth, adm, async function(req, res) { try { await ensureDb(); res.json({ users: await db.getAllUsers() }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });
app.post('/api/admin/ban-user/:id', auth, adm, async function(req, res) { try { await ensureDb(); var userId = parseInt(req.params.id); var user = await db.findUserById(userId); if (!user) return res.status(404).json({ error: 'Bulunamadi.' }); if (user.role === 'ADMIN') return res.status(403).json({ error: 'Admin yasaklanamaz.' }); var nb = !user.banned; await db.banUser(userId, nb); res.json({ success: true, banned: nb }); } catch (e) { res.status(500).json({ error: 'Basarisiz.' }); } });
app.post('/api/admin/reset-leaderboard', auth, adm, async function(req, res) { try { await ensureDb(); await db.resetLeaderboard(); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sifirlanamadi.' }); } });
app.post('/api/admin/reset-user/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.resetUserScore(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Sifirlanamadi.' }); } });



app.post('/api/admin/toggle-streamer/:id', auth, adm, async function(req, res) {
  try { await ensureDb(); var newVal = await db.toggleStreamer(parseInt(req.params.id)); res.json({ success: true, streamer: newVal }); }
  catch (e) { res.status(500).json({ error: 'Basarisiz.' }); }
});

app.post('/api/stream/request', auth, async function(req, res) {
  try { await ensureDb(); var result = await db.requestStreamer(req.user.id, req.user.username); if (result.error === 'already_pending') return res.status(400).json({ error: 'Zaten bekleyen basvurunuz var.' }); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: 'Basvuru gonderilemedi.' }); }
});

app.get('/api/admin/streamer-requests', auth, adm, async function(req, res) {
  try { await ensureDb(); res.json({ requests: await db.getStreamerRequests() }); }
  catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); }
});

app.post('/api/admin/approve-streamer/:id', auth, adm, async function(req, res) {
  try { await ensureDb(); await db.handleStreamerRequest(parseInt(req.params.id), true); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: 'Basarisiz.' }); }
});

app.post('/api/admin/reject-streamer/:id', auth, adm, async function(req, res) {
  try { await ensureDb(); await db.handleStreamerRequest(parseInt(req.params.id), false); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: 'Basarisiz.' }); }
});

app.post('/api/stream/youtube-init', async function(req, res) {
  try {
    var apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'YouTube API key ayarlanmamis. Vercel env YOUTUBE_API_KEY ekleyin.' });
    var videoId = req.body.videoId;
    var r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=' + videoId + '&key=' + apiKey);
    var data = await r.json();
    if (!data.items || !data.items[0] || !data.items[0].liveStreamingDetails) return res.status(400).json({ error: 'Canli yayin bulunamadi.' });
    var chatId = data.items[0].liveStreamingDetails.activeLiveChatId;
    if (!chatId) return res.status(400).json({ error: 'Chat aktif degil.' });
    res.json({ liveChatId: chatId });
  } catch (e) { res.status(500).json({ error: 'YouTube baglanti hatasi.' }); }
});

app.get('/api/stream/youtube-chat', async function(req, res) {
  try {
    var apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'API key yok.' });
    var chatId = req.query.chatId;
    var pageToken = req.query.after || '';
    var url = 'https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=' + chatId + '&part=snippet,authorDetails&maxResults=2000&key=' + apiKey;
    if (pageToken) url += '&pageToken=' + pageToken;
    var r = await fetch(url);
    var data = await r.json();
    var messages = (data.items || []).map(function(m) { return { id: m.id, author: m.authorDetails.displayName, text: m.snippet.displayMessage }; });
    res.json({ messages: messages, nextPageToken: data.nextPageToken || '', pollingMs: data.pollingIntervalMillis || 2000 });
  } catch (e) { res.status(500).json({ error: 'Chat okunamadi.' }); }
});


// Notifications
app.post('/api/notifications/send', auth, adm, async function(req, res) { try { await ensureDb(); var uid = req.body.user_id; var msg = (req.body.message || '').trim(); if (!uid || !msg) return res.status(400).json({ error: 'Kullanıcı ve mesaj gerekli.' }); var id = await db.createNotification(uid, msg); res.json({ success: true, id: id }); } catch (e) { res.status(500).json({ error: 'Gönderilemedi.' }); } });
app.get('/api/notifications', auth, async function(req, res) { try { await ensureDb(); var notifs = await db.getUserNotifications(req.user.id); res.json({ notifications: notifs }); } catch (e) { res.json({ notifications: [] }); } });
app.post('/api/notifications/read', auth, async function(req, res) { try { await ensureDb(); var notif = await db.query("SELECT user_id FROM notifications WHERE id = $1", [req.body.id]); if (!notif.rows[0] || notif.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Yetki yok.' }); await db.markNotificationRead(req.body.id); res.json({ success: true }); } catch (e) { res.json({ success: false }); } });

// Contact Messages
app.post('/api/contact', async function(req, res) { try { await ensureDb(); var title = (req.body.title || '').trim().substring(0, 100); var desc = (req.body.description || '').trim().substring(0, 1000); if (!title || !desc) return res.status(400).json({ error: 'Başlık ve açıklama gerekli.' }); var uid = null; var uname = 'Anonim'; try { var token = req.cookies && req.cookies.ebv_token; if (token) { var decoded = jwt.verify(token, JWT_SECRET); uid = decoded.id; uname = decoded.username; } } catch(e){} var id = await db.createContactMessage(uid, uname, title, desc); res.json({ success: true, id: id }); } catch (e) { res.status(500).json({ error: 'Gönderilemedi.' }); } });
app.get('/api/contact/messages', auth, adm, async function(req, res) { try { await ensureDb(); var msgs = await db.getAllContactMessages(); res.json({ messages: msgs }); } catch (e) { res.json({ messages: [] }); } });
app.delete('/api/contact/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.deleteContactMessage(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); } });

// Update user score
app.post('/api/admin/update-score', auth, adm, async function(req, res) { try { await ensureDb(); await db.updateUserScore(req.body.user_id, parseInt(req.body.score) || 0); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Güncellenemedi.' }); } });


// Heartbeat
app.post('/api/heartbeat', auth, async function(req, res) { try { await ensureDb(); await db.updateLastActive(req.user.id); res.json({ ok: true }); } catch (e) { res.json({ ok: false }); } });

app.delete('/api/admin/users/:id', auth, adm, async function(req, res) { try { await ensureDb(); await db.deleteUser(parseInt(req.params.id)); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); } });

app.get('/api/discord', async function(req, res) { try { await ensureDb(); var link = await db.getDiscordLink(); res.json({ link: link }); } catch(e) { res.json({ link: '' }); } });
app.post('/api/discord', auth, adm, async function(req, res) { try { await ensureDb(); await db.setDiscordLink(req.body.link || ''); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });

app.get('/api/scores/timed-leaderboard', async function(req, res) { try { await ensureDb(); var period = req.query.period || 'alltime'; var lb = await db.getTimedLeaderboard(period); res.json({ leaderboard: lb, period: period }); } catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); } });

app.get('/api/hero-image', async function(req, res) { try { await ensureDb(); var img = await db.getConfig('hero_image'); res.json({ image: img || '' }); } catch(e) { res.json({ image: '' }); } });
app.post('/api/hero-image', auth, adm, async function(req, res) { try { await ensureDb(); await db.setConfig('hero_image', req.body.image || ''); res.json({ success: true }); } catch(e) { res.status(500).json({ error: 'Kaydedilemedi.' }); } });

// ═══ SEO SETTINGS ═══
app.get('/api/seo', async function(req, res) {
  try {
    await ensureDb();
    var keys = ['seo_title','seo_description','seo_keywords','seo_ogimage','seo_canonical','seo_ogtitle','seo_ogdesc','seo_robots','seo_author','seo_themecolor','seo_gtm','seo_gsc','seo_adsense','seo_ga'];
    var result = {};
    for (var i = 0; i < keys.length; i++) {
      var v = await db.getConfig(keys[i]);
      result[keys[i]] = v || '';
    }
    res.json(result);
  } catch(e) { res.status(500).json({ error: 'SEO ayarları yüklenemedi.' }); }
});
app.post('/api/seo', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var allowed = ['seo_title','seo_description','seo_keywords','seo_ogimage','seo_canonical','seo_ogtitle','seo_ogdesc','seo_robots','seo_author','seo_themecolor','seo_gtm','seo_gsc','seo_adsense','seo_ga'];
    var data = req.body;
    // Security: Validate Google IDs format
    if (data.seo_adsense && !/^ca-pub-\d{10,20}$/.test(data.seo_adsense.trim())) return res.status(400).json({ error: 'AdSense ID formatı hatalı. Örnek: ca-pub-1234567890123456' });
    if (data.seo_ga && !/^(G-[A-Z0-9]{6,12}|UA-\d{6,12}-\d{1,2})$/.test(data.seo_ga.trim())) return res.status(400).json({ error: 'Analytics ID formatı hatalı. Örnek: G-XXXXXXXXXX' });
    if (data.seo_gtm && data.seo_gtm.trim() && !/^GTM-[A-Z0-9]{6,10}$/.test(data.seo_gtm.trim())) return res.status(400).json({ error: 'GTM ID formatı hatalı. Örnek: GTM-XXXXXXX' });
    for (var i = 0; i < allowed.length; i++) {
      if (data[allowed[i]] !== undefined) {
        await db.setConfig(allowed[i], data[allowed[i]]);
      }
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'SEO ayarları kaydedilemedi.' }); }
});

app.get('/api/game-names', async function(req, res) {
  try {
    await ensureDb();
    var r = await db.query("SELECT key, value FROM game_config WHERE key LIKE 'game_%'");
    var games = {};
    r.rows.forEach(function(row){ games[row.key.replace('game_','')] = row.value; });
    res.json({ games: games });
  } catch(e) { res.json({ games: {} }); }
});

app.post('/api/game-names', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var games = req.body.games || {};
    for (var key in games) {
      await db.setConfig('game_' + key, games[key]);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Kaydedilemedi.' }); }
});

app.post('/api/admin/update-username', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var userId = req.body.user_id;
    var newName = req.body.username;
    if (!userId || !newName) return res.status(400).json({ error: 'user_id ve username gerekli' });
    await db.query("UPDATE users SET username = $1 WHERE id = $2", [newName, userId]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Güncellenemedi: ' + e.message }); }
});

app.post('/api/admin/edit-game-score', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var userId = req.body.user_id;
    var gameType = req.body.game_type;
    var score = parseInt(req.body.score);
    if (!userId || !gameType || isNaN(score)) return res.status(400).json({ error: 'Eksik parametre' });
    
    // Delete existing scores for this user+game and insert new
    await db.query("DELETE FROM game_scores WHERE user_id = $1 AND game_type = $2", [userId, gameType]);
    if (score > 0) {
      await db.query("INSERT INTO game_scores (user_id, game_type, score, total, played_at) VALUES ($1, $2, $3, 1, NOW())", [userId, gameType, score]);
    }
    
    // Also update best_score in users table
    var best = await db.query("SELECT COALESCE(SUM(score),0) as total FROM game_scores WHERE user_id = $1", [userId]);
    await db.query("UPDATE users SET best_score = $1 WHERE id = $2", [parseInt(best.rows[0].total), userId]);
    
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Güncellenemedi: ' + e.message }); }
});

// MIGRATION ENDPOINT - remove after use
// #1 Security: Migrate endpoint — admin only
app.post('/api/migrate', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var bcrypt = require('bcryptjs');
    var results = [];
    
    // 1. Reset admin password
    if (req.body.admin_password) {
      var hash = bcrypt.hashSync(req.body.admin_password, 10);
      await db.query("UPDATE users SET password = $1, username = $2 WHERE email = $3", [hash, req.body.admin_username || 'ancuez', process.env.ADMIN_EMAIL || 'burakerolonline@gmail.com']);
      results.push('Admin password reset');
    }
    
    // 2. Import characters
    if (req.body.characters && req.body.characters.length > 0) {
      for (var c of req.body.characters) {
        var exists = await db.query("SELECT id FROM characters WHERE name = $1 AND surname = $2", [c.name, c.surname || '']);
        if (exists.rows.length === 0) {
          await db.query("INSERT INTO characters (name, surname, gender, rep, tip, img, active) VALUES ($1,$2,$3,$4,$5,$6,$7)", 
            [c.name, c.surname||'', c.gender||'M', c.rep||'', c.tip||'', c.img||'', c.active!==false]);
          results.push('Char: ' + c.name);
        } else {
          // Update rep and img if missing
          await db.query("UPDATE characters SET rep = COALESCE(NULLIF($1,''), rep), img = COALESCE(NULLIF($2,''), img), tip = COALESCE(NULLIF($3,''), tip) WHERE name = $4 AND surname = $5",
            [c.rep||'', c.img||'', c.tip||'', c.name, c.surname||'']);
        }
      }
      results.push('Characters done: ' + req.body.characters.length);
    }
    
    // 3. Import quiz questions
    if (req.body.quizQuestions && req.body.quizQuestions.length > 0) {
      await db.query("DELETE FROM quiz_questions");
      for (var q of req.body.quizQuestions) {
        await db.query("INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, correct_index) VALUES ($1,$2,$3,$4,$5,$6)",
          [q.question, q.option_a, q.option_b, q.option_c||'', q.option_d||'', q.correct_index||0]);
      }
      results.push('Quiz: ' + req.body.quizQuestions.length);
    }
    
    // 4. Import who questions
    if (req.body.whoQuestions && req.body.whoQuestions.length > 0) {
      await db.query("DELETE FROM who_questions");
      for (var w of req.body.whoQuestions) {
        await db.query("INSERT INTO who_questions (question, option_a, option_b, option_c, option_d) VALUES ($1,$2,$3,$4,$5)",
          [w.question, w.option_a, w.option_b, w.option_c||'', w.option_d||'']);
      }
      results.push('Who: ' + req.body.whoQuestions.length);
    }
    
    // 5. Import game config
    if (req.body.gameConfig) {
      await db.setConfig('games', JSON.stringify(req.body.gameConfig));
      results.push('GameConfig set');
    }
    
    // 6. Import ads config
    if (req.body.ads_config) {
      await db.setConfig('ads_config', req.body.ads_config);
      results.push('Ads config set');
    }
    
    // 7. Clean survival data
    if (req.body.clean_survival) {
      await db.query("DELETE FROM game_config WHERE key LIKE 'surv_%'");
      results.push('Survival data cleaned');
    }
    
    // 8. Import game names
    if (req.body.game_names) {
      for (var key in req.body.game_names) {
        if (key !== 'games') {
          await db.setConfig('game_' + key, req.body.game_names[key]);
        }
      }
      results.push('Game names set');
    }
    
    res.json({ success: true, results: results });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Footer Pages
app.get('/api/footer-pages', async function(req, res) {
  try {
    await ensureDb();
    var r = await db.query("SELECT key, value FROM game_config WHERE key LIKE 'fp_%' ORDER BY key");
    var pages = [];
    var map = {};
    r.rows.forEach(function(row) {
      var parts = row.key.replace('fp_', '').split('__');
      var slug = parts[0];
      var field = parts[1] || 'content';
      if (!map[slug]) map[slug] = { slug: slug };
      map[slug][field] = row.value;
    });
    for (var s in map) pages.push(map[s]);
    res.json({ pages: pages });
  } catch(e) { res.json({ pages: [] }); }
});

app.get('/api/footer-pages/:slug', async function(req, res) {
  try {
    await ensureDb();
    var slug = req.params.slug;
    // #10 Security: Slug doğrulama — sadece alfanümerik ve tire
    if (!/^[a-z0-9\-]+$/.test(slug)) return res.json({ page: null });
    var title = await db.getConfig('fp_' + slug + '__title');
    var content = await db.getConfig('fp_' + slug + '__content');
    if (!title) return res.json({ page: null });
    res.json({ page: { slug: slug, title: title, content: content || '' } });
  } catch(e) { res.json({ page: null }); }
});

app.post('/api/footer-pages', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var slug = (req.body.slug || '').trim().toLowerCase();
    var title = (req.body.title || '').trim();
    var content = req.body.content || '';
    if (!slug || !title) return res.status(400).json({ error: 'Slug ve baslik gerekli' });
    if (!/^[a-z0-9\-]+$/.test(slug)) return res.status(400).json({ error: 'Slug sadece harf, rakam ve tire icermeli' });
    await db.setConfig('fp_' + slug + '__title', title);
    await db.setConfig('fp_' + slug + '__content', content);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/footer-pages/delete', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var slug = (req.body.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug gerekli' });
    await db.query("DELETE FROM game_config WHERE key LIKE $1", ['fp_' + slug + '__%']);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Survival tracking
app.post('/api/survival-win', async function(req, res) {
  try {
    await ensureDb();
    var name = (req.body.character_name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    // Increment survival count in game_config
    var key = 'surv_' + name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9 ]/g, '').replace(/ /g, '_');
    var cur = await db.getConfig(key);
    var count = cur ? parseInt(cur) + 1 : 1;
    await db.setConfig(key, String(count));
    res.json({ success: true, count: count });
  } catch(e) { res.json({ success: false }); }
});

app.get('/api/survival-leaderboard', async function(req, res) {
  try {
    await ensureDb();
    var r = await db.query("SELECT key, value FROM game_config WHERE key LIKE 'surv_%' ORDER BY CAST(value AS INTEGER) DESC LIMIT 10");
    var lb = r.rows.map(function(row) {
      return { name: row.key.replace('surv_', '').replace(/_/g, ' '), wins: parseInt(row.value) };
    });
    res.json({ leaderboard: lb });
  } catch(e) { res.json({ leaderboard: [] }); }
});

// ═══ SAVED DUELS ═══
app.get('/api/duels', async function(req, res) {
  try { await ensureDb(); res.json({ duels: await db.getDuels() }); }
  catch (e) { res.status(500).json({ error: 'Düellolar yüklenemedi.' }); }
});

app.post('/api/duels', auth, async function(req, res) {
  try {
    await ensureDb();
    var title = (req.body.title || '').trim();
    var characters = req.body.characters || [];
    if (!title || characters.length < 4) return res.status(400).json({ error: 'Başlık ve en az 4 karakter gerekli.' });
    var duel = await db.saveDuel(req.user.id, req.user.username, title, characters);
    res.json({ success: true, id: duel.id });
  } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); }
});

app.delete('/api/duels/:id', auth, async function(req, res) {
  try {
    await ensureDb();
    await db.deleteDuel(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Silinemedi.' }); }
});

// ═══ STREAMER LINKS ═══
app.get('/api/streamer-link', auth, async function(req, res) {
  try { await ensureDb(); res.json(await db.getStreamerLink(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Yüklenemedi.' }); }
});

app.post('/api/streamer-link', auth, async function(req, res) {
  try {
    await ensureDb();
    await db.saveStreamerLink(req.user.id, req.body.youtube_url, req.body.kick_url);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Kaydedilemedi.' }); }
});

// ═══ PROFILE ═══
app.get('/api/profile/:username', async function(req, res) {
  try {
    await ensureDb();
    var username = (req.params.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Kullanıcı adı gerekli.' });
    var profile = await db.getUserProfile(username);
    if (!profile) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json(profile);
  } catch (e) {
    console.error('Profile error:', e.message);
    res.status(500).json({ error: 'Profil yüklenemedi.' });
  }
});

// ═══════════════════════════════════════════════════════════
// KARAKTER SIRALA (RANK)
// ═══════════════════════════════════════════════════════════
app.get('/api/rank/criteria', async function(req, res) {
  try { await ensureDb(); res.json({ criteria: await db.getRankCriteria(false) }); }
  catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); }
});
app.get('/api/rank/criteria/admin', auth, adm, async function(req, res) {
  try { await ensureDb(); res.json({ criteria: await db.getRankCriteria(true) }); }
  catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); }
});
app.post('/api/rank/criteria', auth, adm, async function(req, res) {
  try {
    await ensureDb();
    var label = (req.body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Kriter metni zorunlu.' });
    var id = await db.upsertRankCriterion({ id: req.body.id, label: label, emoji: req.body.emoji, active: req.body.active });
    res.json({ success: true, id: id });
  } catch (e) { console.error(e.message); res.status(500).json({ error: 'Kaydedilemedi.' }); }
});
app.delete('/api/rank/criteria/:id', auth, adm, async function(req, res) {
  try { await ensureDb(); await db.deleteRankCriterion(parseInt(req.params.id)); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: 'Silinemedi.' }); }
});
// Bir turun sıralamasını kaydeder ve topluluk uyuşma oranını döner (giriş gerektirmez — veri herkesten toplanır)
app.post('/api/rank/score', async function(req, res) {
  try {
    await ensureDb();
    var critId = parseInt(req.body.criterion_id);
    var order = req.body.order;
    if (!critId || isNaN(critId)) return res.status(400).json({ error: 'Gecersiz kriter.' });
    if (!Array.isArray(order) || order.length < 2 || order.length > 8) return res.status(400).json({ error: 'Gecersiz siralama.' });
    // Benzersiz, geçerli string id'ler
    var seen = {}; var clean = [];
    for (var i = 0; i < order.length; i++) {
      var s = String(order[i]).trim();
      if (!s || s.length > 20 || seen[s]) return res.status(400).json({ error: 'Gecersiz siralama.' });
      seen[s] = true; clean.push(s);
    }
    // Kriter gerçekten var mı?
    var crit = await db.query("SELECT id FROM rank_criteria WHERE id = $1", [critId]);
    if (crit.rows.length === 0) return res.status(404).json({ error: 'Kriter bulunamadi.' });
    var result = await db.scoreAndRecordRanking(critId, clean);
    res.json(result);
  } catch (e) { console.error('rank/score:', e.message); res.status(500).json({ error: 'Islenemedi.' }); }
});

// ═══════════════════════════════════════════════════════════
// KARAKTER BORSASI (STOCK)
// ═══════════════════════════════════════════════════════════
app.get('/api/stock/market', async function(req, res) {
  try { await ensureDb(); res.json({ market: await db.getStockMarket() }); }
  catch (e) { console.error('stock/market:', e.message); res.status(500).json({ error: 'Piyasa yuklenemedi.' }); }
});
app.get('/api/stock/portfolio', auth, async function(req, res) {
  try { await ensureDb(); res.json(await db.getStockPortfolio(req.user.id)); }
  catch (e) { console.error('stock/portfolio:', e.message); res.status(500).json({ error: 'Portfoy yuklenemedi.' }); }
});
app.post('/api/stock/trade', auth, async function(req, res) {
  try {
    await ensureDb();
    var charId = req.body.char_id;
    var side = req.body.side;
    var shares = parseInt(req.body.shares);
    if (!charId) return res.status(400).json({ error: 'Karakter gerekli.' });
    var result = await db.tradeStock(req.user.id, charId, side, shares);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (e) { console.error('stock/trade:', e.message); res.status(500).json({ error: 'Islem basarisiz.' }); }
});
app.post('/api/stock/select', async function(req, res) {
  try { await ensureDb(); var r = await db.noteStockSelections(req.body.ids || []); res.json({ success: true, updated: r.updated }); }
  catch (e) { res.json({ success: false }); }
});
app.get('/api/stock/leaderboard', async function(req, res) {
  try { await ensureDb(); res.json({ leaderboard: await db.getStockLeaderboard() }); }
  catch (e) { res.status(500).json({ error: 'Yuklenemedi.' }); }
});

// #12 Security: module.exports dosya sonunda — tüm route'lar kayıtlı
module.exports = app;
