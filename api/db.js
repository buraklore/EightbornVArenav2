const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
var STORYGEN_SEED = require('./storygen_seed.js').STORYGEN_SEED;

const pool = new Pool({
  connectionString: (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]*/g, ''),
  // #5 Security: SSL doğrulama — production'da DB sağlayıcı destekliyorsa DB_SSL_VERIFY=true yapın
  ssl: { rejectUnauthorized: process.env.DB_SSL_VERIFY === 'true' },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000
});

async function query(text, params) {
  for (var _r = 0; _r < 2; _r++) {
    try { return await pool.query(text, params); }
    catch(e) {
      if (_r < 1 && (e.message.includes('MaxClients') || e.message.includes('timeout') || e.message.includes('ECONNR'))) {
        await new Promise(r => setTimeout(r, 300));
        continue;
      }
      throw e;
    }
  }
}

async function init() {
  await query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(20) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(200) NOT NULL, role VARCHAR(10) DEFAULT 'USER', banned BOOLEAN DEFAULT false, best_score INTEGER DEFAULT 0, games_played INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), last_active TIMESTAMP DEFAULT NOW())");
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW()").catch(function(){});;
  await query("CREATE TABLE IF NOT EXISTS characters (id SERIAL PRIMARY KEY, name VARCHAR(30) NOT NULL, surname VARCHAR(50) DEFAULT '', gender VARCHAR(1) DEFAULT 'M', rep VARCHAR(200) DEFAULT '', tip VARCHAR(100) DEFAULT '', img TEXT DEFAULT '', active BOOLEAN DEFAULT true)");
  await query("CREATE TABLE IF NOT EXISTS quiz_questions (id SERIAL PRIMARY KEY, question VARCHAR(300) NOT NULL, option_a VARCHAR(100) NOT NULL, option_b VARCHAR(100) NOT NULL, option_c VARCHAR(100) DEFAULT '', option_d VARCHAR(100) DEFAULT '', correct_index INTEGER DEFAULT 0)");
  await query("CREATE TABLE IF NOT EXISTS who_questions (id SERIAL PRIMARY KEY, question VARCHAR(300) NOT NULL, option_a VARCHAR(100) NOT NULL, option_b VARCHAR(100) NOT NULL, option_c VARCHAR(100) DEFAULT '', option_d VARCHAR(100) DEFAULT '')");
  await query("CREATE TABLE IF NOT EXISTS game_config (key VARCHAR(50) PRIMARY KEY, value TEXT NOT NULL)");
  await query("CREATE TABLE IF NOT EXISTS game_scores (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), game_type VARCHAR(20) NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, played_at TIMESTAMP DEFAULT NOW())");
  try { await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false"); } catch(e) {}
  try { await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS streamer BOOLEAN DEFAULT false"); } catch(e) {}
  await query("CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), message TEXT NOT NULL, read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW(), last_active TIMESTAMP DEFAULT NOW())");
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW()").catch(function(){});;
  await query("CREATE TABLE IF NOT EXISTS contact_messages (id SERIAL PRIMARY KEY, user_id INTEGER, username VARCHAR(20), title VARCHAR(100) NOT NULL, description TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), last_active TIMESTAMP DEFAULT NOW())");
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW()").catch(function(){});;
  await query("CREATE TABLE IF NOT EXISTS streamer_requests (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), username VARCHAR(20) NOT NULL, status VARCHAR(10) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), last_active TIMESTAMP DEFAULT NOW())");
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW()").catch(function(){});
  // Saved duels table
  await query("CREATE TABLE IF NOT EXISTS saved_duels (id SERIAL PRIMARY KEY, creator_id INTEGER REFERENCES users(id), creator_username VARCHAR(20) NOT NULL, title VARCHAR(100) NOT NULL, characters TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())");
  // Streamer links table
  await query("CREATE TABLE IF NOT EXISTS streamer_links (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) UNIQUE, youtube_url VARCHAR(300) DEFAULT '', kick_url VARCHAR(300) DEFAULT '', updated_at TIMESTAMP DEFAULT NOW())");

  // ═══ KARAKTER SIRALA (RANK) ═══
  // Sıralama kriterleri (admin yönetir)
  await query("CREATE TABLE IF NOT EXISTS rank_criteria (id SERIAL PRIMARY KEY, label VARCHAR(150) NOT NULL, emoji VARCHAR(12) DEFAULT '🏆', active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())");
  // İkili (pairwise) topluluk oyları. char_a < char_b (string olarak kanonikleştirilir).
  await query("CREATE TABLE IF NOT EXISTS rank_votes (criterion_id INTEGER NOT NULL, char_a VARCHAR(20) NOT NULL, char_b VARCHAR(20) NOT NULL, a_over_b INTEGER DEFAULT 0, b_over_a INTEGER DEFAULT 0, PRIMARY KEY (criterion_id, char_a, char_b))");
  // 18 varsayılan kriteri yalnızca tablo boşsa ekle
  var rcCount = await query("SELECT COUNT(*) AS c FROM rank_criteria");
  if (parseInt(rcCount.rows[0].c) === 0) {
    var defaultCriteria = [
      ['Hangisi daha zengin?', '💰'], ['Hangisi daha tehlikeli?', '☠️'], ['Hangisi daha karizmatik?', '✨'],
      ['Hangisi daha güvenilir?', '🤝'], ['Hangisi daha zeki?', '🧠'], ['Hangisi daha iyi dövüşür?', '🥊'],
      ['Hangisi daha hain?', '🐍'], ['Hangisi daha cesur?', '🦁'], ['Hangisi daha komik?', '😂'],
      ['Hangisi daha gizemli?', '🌑'], ['Hangisi daha sadık?', '🐶'], ['Hangisi daha korkutucu?', '😱'],
      ['Hangisi daha romantik?', '💘'], ['Hangisi ile takılırdın?', '🍻'], ['Hangisi daha iyi lider?', '👑'],
      ['Hangisi daha çok drama çıkarır?', '🎭'], ['Hangisine güvenirsin?', '🔒'], ['Hangisi daha şanslı?', '🍀']
    ];
    for (var dci = 0; dci < defaultCriteria.length; dci++) {
      await query("INSERT INTO rank_criteria (label, emoji) VALUES ($1, $2)", [defaultCriteria[dci][0], defaultCriteria[dci][1]]);
    }
  }

  // ═══ KARAKTER BORSASI (STOCK) ═══
  // Hisse fiyatları. char_id, frontend'in gönderdiği kimliktir (dbId veya c-prefixli) — bu yüzden VARCHAR.
  await query("CREATE TABLE IF NOT EXISTS stock_prices (char_id VARCHAR(20) PRIMARY KEY, price NUMERIC(12,2) DEFAULT 100, prev_price NUMERIC(12,2) DEFAULT 100, shares_out INTEGER DEFAULT 0, pop_score INTEGER DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS stock_wallets (user_id INTEGER PRIMARY KEY REFERENCES users(id), cash NUMERIC(14,2) DEFAULT 1000, last_grant DATE, week_start_value NUMERIC(14,2), week_start DATE, last_played TIMESTAMP)");
  await query("ALTER TABLE stock_wallets ADD COLUMN IF NOT EXISTS last_played TIMESTAMP").catch(function(){});
  await query("CREATE TABLE IF NOT EXISTS stock_holdings (user_id INTEGER NOT NULL REFERENCES users(id), char_id VARCHAR(20) NOT NULL, shares INTEGER DEFAULT 0, avg_cost NUMERIC(12,2) DEFAULT 0, PRIMARY KEY (user_id, char_id))");
  await query("CREATE TABLE IF NOT EXISTS stock_tx (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), char_id VARCHAR(20), side VARCHAR(4), shares INTEGER, price NUMERIC(12,2), created_at TIMESTAMP DEFAULT NOW())");

  await detectiveInit();

  try { await storygenInit(); } catch (e) { console.error('storygenInit:', e.message); }

  var r = await query("SELECT id FROM users WHERE role = 'ADMIN'");
  if (r.rows.length === 0) {
    // #4 Security: Güçlü varsayılan şifre — env yoksa random üret
    var pw = process.env.ADMIN_PASSWORD;
    if (!pw) { pw = require('crypto').randomBytes(16).toString('hex'); console.warn('[SECURITY] ADMIN_PASSWORD env ayarlanmamis! Gecici sifre: ' + pw); }
    var hash = bcrypt.hashSync(pw, 10);
    // #14 Security: Admin email env'den alınır
    var adminEmail = process.env.ADMIN_EMAIL || 'burakerolonline@gmail.com';
    var adminUsername = process.env.ADMIN_USERNAME || 'boss';
    await query("INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'ADMIN')", [adminUsername, adminEmail, hash]);
  }
}

async function createUser(username, email, password) {
  var hash = bcrypt.hashSync(password, 10);
  var r = await query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id", [username, email, hash]);
  return r.rows[0].id;
}
async function findUserByEmail(email) { var r = await query("SELECT * FROM users WHERE email = $1", [email]); return r.rows[0] || null; }
async function findUserByUsername(username) { var r = await query("SELECT * FROM users WHERE LOWER(username) = LOWER($1)", [username]); return r.rows[0] || null; }
async function findUserById(id) { var r = await query("SELECT id, username, email, role, banned, streamer, best_score, games_played FROM users WHERE id = $1", [id]); return r.rows[0] || null; }
function verifyPassword(plain, hash) { return bcrypt.compareSync(plain, hash); }

async function saveScore(userId, gameType, score, total) {
  await query("INSERT INTO game_scores (user_id, game_type, score, total) VALUES ($1, $2, $3, $4)", [userId, gameType, score, total]);
  var r = await query("SELECT best_score FROM users WHERE id = $1", [userId]);
  if (score > r.rows[0].best_score) { await query("UPDATE users SET best_score = $1, games_played = games_played + 1 WHERE id = $2", [score, userId]); }
  else { await query("UPDATE users SET games_played = games_played + 1 WHERE id = $1", [userId]); }
}
async function getLeaderboard() { var r = await query("SELECT id, username, best_score, games_played FROM users WHERE best_score > 0 ORDER BY best_score DESC LIMIT 50"); return r.rows; }
async function getQuestionCount() { var r = await query("SELECT COUNT(*) as c FROM quiz_questions"); return parseInt(r.rows[0].c); }
async function resetLeaderboard() { await query("UPDATE users SET best_score = 0, games_played = 0 WHERE role != 'ADMIN'"); await query("DELETE FROM game_scores"); }
async function resetUserScore(userId) { await query("UPDATE users SET best_score = 0, games_played = 0 WHERE id = $1", [userId]); await query("DELETE FROM game_scores WHERE user_id = $1", [userId]); }
async function getRecentGame(userId) { var r = await query("SELECT played_at FROM game_scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 1", [userId]); return r.rows[0] || null; }

async function getAllCharacters(includePrivate) {
  var r = await query("SELECT * FROM characters ORDER BY id");
  if (!includePrivate) return r.rows.map(function(c) { return { id: c.id, name: c.name, surname: c.surname, gender: c.gender, rep: c.rep, tip: c.tip, img: c.img, active: c.active }; });
  return r.rows;
}
async function upsertCharacter(d) {
  var cName = d.name || d.n || '';
  var cSurname = d.surname || d.s || '';
  var cGender = d.gender || d.g || 'M';
  var cRep = d.rep || '';
  var cTip = d.tip || '';
  var cImg = d.img || '';
  var cActive = (d.active !== undefined) ? d.active : (d.a !== undefined ? d.a : true);
  var numId = (typeof d.id === 'number') ? d.id : parseInt(d.id);
  if (numId && !isNaN(numId)) {
    var check = await query("SELECT id FROM characters WHERE id = $1", [numId]);
    if (check.rows.length > 0) {
      await query("UPDATE characters SET name=$1, surname=$2, gender=$3, rep=$4, tip=$5, img=$6, active=$7 WHERE id=$8", [cName, cSurname, cGender, cRep, cTip, cImg, cActive, numId]);
      return numId;
    }
  }
  if (cName) {
    var existing = await query("SELECT id FROM characters WHERE LOWER(name)=LOWER($1) AND LOWER(surname)=LOWER($2)", [cName, cSurname]);
    if (existing.rows.length === 0 && d.origName) {
      existing = await query("SELECT id FROM characters WHERE LOWER(name)=LOWER($1) AND LOWER(surname)=LOWER($2)", [d.origName, d.origSurname || '']);
    }
    if (existing.rows.length > 0) {
      await query("UPDATE characters SET name=$1, surname=$2, gender=$3, rep=$4, tip=$5, img=$6, active=$7 WHERE id=$8", [cName, cSurname, cGender, cRep, cTip, cImg, cActive, existing.rows[0].id]);
      return existing.rows[0].id;
    }
  }
  var r = await query("INSERT INTO characters (name,surname,gender,rep,tip,img,active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", [cName, cSurname, cGender, cRep, cTip, cImg, cActive]);
  return r.rows[0].id;
}
async function deleteCharacter(id) { await query("DELETE FROM characters WHERE id = $1", [id]); }

async function getAllQuestions() { var r = await query("SELECT * FROM quiz_questions ORDER BY id"); return r.rows; }
async function upsertQuestion(d) {
  var numId = parseInt(d.id);
  if (numId && !isNaN(numId)) {
    var check = await query("SELECT id FROM quiz_questions WHERE id = $1", [numId]);
    if (check.rows.length > 0) { await query("UPDATE quiz_questions SET question=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5, correct_index=$6 WHERE id=$7", [d.question, d.option_a, d.option_b, d.option_c, d.option_d, d.correct_index, numId]); return numId; }
  }
  var r = await query("INSERT INTO quiz_questions (question,option_a,option_b,option_c,option_d,correct_index) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [d.question, d.option_a, d.option_b, d.option_c, d.option_d, d.correct_index]);
  return r.rows[0].id;
}
async function deleteQuestion(id) { await query("DELETE FROM quiz_questions WHERE id = $1", [id]); }

async function getAllWhoQuestions() { var r = await query("SELECT * FROM who_questions ORDER BY id"); return r.rows; }
async function upsertWhoQuestion(d) {
  var numId = parseInt(d.id);
  if (numId && !isNaN(numId)) {
    var check = await query("SELECT id FROM who_questions WHERE id = $1", [numId]);
    if (check.rows.length > 0) { await query("UPDATE who_questions SET question=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5 WHERE id=$6", [d.question, d.option_a, d.option_b, d.option_c, d.option_d, numId]); return numId; }
  }
  var r = await query("INSERT INTO who_questions (question,option_a,option_b,option_c,option_d) VALUES ($1,$2,$3,$4,$5) RETURNING id", [d.question, d.option_a, d.option_b, d.option_c, d.option_d]);
  return r.rows[0].id;
}
async function deleteWhoQuestion(id) { await query("DELETE FROM who_questions WHERE id = $1", [id]); }

async function getConfig(key) { var r = await query("SELECT value FROM game_config WHERE key = $1", [key]); return r.rows[0] ? r.rows[0].value : null; }
async function setConfig(key, value) { await query("INSERT INTO game_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2", [key, value]); }

async function getAllUsers() { var r = await query("SELECT id, username, email, role, banned, streamer, best_score, games_played, created_at, last_active FROM users ORDER BY created_at DESC"); return r.rows; }
async function banUser(id, banned) { await query("UPDATE users SET banned = $1 WHERE id = $2 AND role != 'ADMIN'", [banned, id]); }

async function getGameLeaderboard(gameType) {
  var r = await query("SELECT gs.user_id, u.username, SUM(gs.score) as total_score, COUNT(*) as games_played FROM game_scores gs JOIN users u ON gs.user_id = u.id WHERE gs.game_type = $1 GROUP BY gs.user_id, u.username ORDER BY total_score DESC LIMIT 50", [gameType]);
  return r.rows;
}

async function toggleStreamer(id) {
  var u = await query("SELECT streamer FROM users WHERE id = $1", [id]);
  if (!u.rows[0]) return false;
  var newVal = !u.rows[0].streamer;
  await query("UPDATE users SET streamer = $1 WHERE id = $2", [newVal, id]);
  return newVal;
}

async function requestStreamer(userId, username) {
  var existing = await query("SELECT id FROM streamer_requests WHERE user_id = $1 AND status = 'pending'", [userId]);
  if (existing.rows.length > 0) return { error: 'already_pending' };
  await query("INSERT INTO streamer_requests (user_id, username) VALUES ($1, $2)", [userId, username]);
  return { success: true };
}

async function getStreamerRequests() {
  var r = await query("SELECT sr.*, u.email FROM streamer_requests sr JOIN users u ON sr.user_id = u.id WHERE sr.status = 'pending' ORDER BY sr.created_at DESC");
  return r.rows;
}

async function handleStreamerRequest(requestId, approve) {
  var req = await query("SELECT * FROM streamer_requests WHERE id = $1", [requestId]);
  if (!req.rows[0]) return;
  await query("UPDATE streamer_requests SET status = $1 WHERE id = $2", [approve ? 'approved' : 'rejected', requestId]);
  if (approve) {
    await query("UPDATE users SET streamer = true WHERE id = $1", [req.rows[0].user_id]);
  }
}

  // Notifications
async function createNotification(userId, message) {
  var r = await query("INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING id", [userId, message]);
  return r.rows[0].id;
}
async function getUserNotifications(userId) {
  var r = await query("SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC", [userId]);
  return r.rows;
}
async function markNotificationRead(id) {
  await query("UPDATE notifications SET read = true WHERE id = $1", [id]);
}
// Contact Messages
async function createContactMessage(userId, username, title, description) {
  var r = await query("INSERT INTO contact_messages (user_id, username, title, description) VALUES ($1, $2, $3, $4) RETURNING id", [userId, username, title, description]);
  return r.rows[0].id;
}
async function getAllContactMessages() {
  var r = await query("SELECT * FROM contact_messages ORDER BY created_at DESC");
  return r.rows;
}
async function deleteContactMessage(id) {
  await query("DELETE FROM contact_messages WHERE id = $1", [id]);
}
// Update user score
async function updateLastActive(userId) {
  await query("UPDATE users SET last_active = NOW() WHERE id = $1", [userId]);
}

async function deleteUser(userId) {
  // Borsa: silinen hesabın (çoğu spam) elindeki hisseler piyasaya SATILMIŞ gibi işlenir.
  // Her karakter için, o hisseleri satmanın normal fiyat etkisi uygulanır → fiyat DÜŞER ve arz (shares_out) azalır.
  // Böylece spam alımlarıyla şişirilen fiyat geri çekilir. (Hesaba nakit yatmaz; hisseler piyasadan çıkar.)
  try {
    var hold = await query("SELECT char_id, SUM(shares) AS sh FROM stock_holdings WHERE user_id = $1 GROUP BY char_id", [userId]);
    for (var hi = 0; hi < hold.rows.length; hi++) {
      var cid = String(hold.rows[hi].char_id), sh = parseInt(hold.rows[hi].sh) || 0;
      if (sh <= 0) continue;
      var prRow = await query("SELECT price FROM stock_prices WHERE char_id = $1", [cid]);
      if (prRow.rows.length === 0) continue;
      var price = parseFloat(prRow.rows[0].price);
      var fDn = Math.min(0.25, 0.004 * sh);                 // satış fiyat etkisi (tradeStock ile aynı formül)
      var newPrice = Math.max(5, _round2(price * (1 - fDn))); // 5 Coin taban
      await query(
        "UPDATE stock_prices SET price = $1, prev_price = $2, shares_out = GREATEST(0, shares_out - $3), updated_at = NOW() WHERE char_id = $4",
        [newPrice, price, sh, cid]
      );
    }
  } catch (e) { if (!(e && e.code === '42P01')) throw e; }

  // Kullanıcıya bağlı TÜM alt kayıtları sil (users'a FK veren tablolar; aksi halde silme FK hatasıyla patlar).
  var childDeletes = [
    "DELETE FROM streamer_requests WHERE user_id = $1",
    "DELETE FROM streamer_links WHERE user_id = $1",
    "DELETE FROM notifications WHERE user_id = $1",
    "DELETE FROM contact_messages WHERE user_id = $1",
    "DELETE FROM game_scores WHERE user_id = $1",
    "DELETE FROM saved_duels WHERE creator_id = $1",
    "DELETE FROM detective_guesses WHERE user_id = $1",
    "DELETE FROM stock_tx WHERE user_id = $1",
    "DELETE FROM stock_holdings WHERE user_id = $1",
    "DELETE FROM stock_wallets WHERE user_id = $1"
  ];
  for (var i = 0; i < childDeletes.length; i++) {
    try { await query(childDeletes[i], [userId]); }
    catch (e) { if (e && e.code === '42P01') continue; throw e; } // tablo henüz yoksa atla, gerçek hatayı yükselt
  }
  await query("DELETE FROM users WHERE id = $1", [userId]);
}

async function getDiscordLink() {
  var r = await query("SELECT value FROM game_config WHERE key = 'discord_link'");
  return r.rows.length > 0 ? r.rows[0].value : '';
}
async function setDiscordLink(link) {
  var existing = await query("SELECT key FROM game_config WHERE key = 'discord_link'");
  if (existing.rows.length > 0) await query("UPDATE game_config SET value = $1 WHERE key = 'discord_link'", [link]);
  else await query("INSERT INTO game_config (key, value) VALUES ('discord_link', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [link]);
}

async function getTimedLeaderboard(period) {
  if (period === 'alltime') {
    // For alltime, use users.best_score (includes admin edits) + game_scores count
    var r = await query("SELECT u.id as user_id, u.username, u.best_score as total_score, COALESCE(g.cnt, 0) as games_played FROM users u LEFT JOIN (SELECT user_id, COUNT(*) as cnt FROM game_scores GROUP BY user_id) g ON g.user_id = u.id WHERE u.best_score > 0 ORDER BY u.best_score DESC LIMIT 50");
    return r.rows;
  }
  var dateFilter = '';
  if (period === 'daily') dateFilter = "AND gs.played_at >= NOW() - INTERVAL '1 day'";
  else if (period === 'weekly') dateFilter = "AND gs.played_at >= NOW() - INTERVAL '7 days'";
  else if (period === 'monthly') dateFilter = "AND gs.played_at >= NOW() - INTERVAL '30 days'";
  var r = await query("SELECT gs.user_id, u.username, SUM(gs.score) as total_score, COUNT(*) as games_played FROM game_scores gs JOIN users u ON gs.user_id = u.id WHERE 1=1 " + dateFilter + " GROUP BY gs.user_id, u.username ORDER BY total_score DESC LIMIT 50");
  return r.rows;
}

async function updateUserScore(userId, score) {
  await query("UPDATE users SET best_score = $1 WHERE id = $2", [score, userId]);
}


// ═══════════════════════════════════════════════════
// KARAKTER HİKAYESİ OLUŞTURUCU — tablolar, seed ve CRUD
// ═══════════════════════════════════════════════════
async function storygenInit() {
  await query("CREATE TABLE IF NOT EXISTS story_categories (id SERIAL PRIMARY KEY, ckey VARCHAR(30) UNIQUE NOT NULL, name VARCHAR(60) NOT NULL, ord INTEGER DEFAULT 0, active BOOLEAN DEFAULT true)");
  await query("CREATE TABLE IF NOT EXISTS story_questions (id SERIAL PRIMARY KEY, category_id INTEGER REFERENCES story_categories(id) ON DELETE CASCADE, text VARCHAR(300) NOT NULL, active BOOLEAN DEFAULT true, ord INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS story_options (id SERIAL PRIMARY KEY, question_id INTEGER REFERENCES story_questions(id) ON DELETE CASCADE, text VARCHAR(160) NOT NULL, frag TEXT DEFAULT '', cr INTEGER DEFAULT 0, tr INTEGER DEFAULT 0, ld INTEGER DEFAULT 0, sm INTEGER DEFAULT 0, ch INTEGER DEFAULT 0, ord INTEGER DEFAULT 0)");
  try { await _seedStorygenIfEmpty(); } catch (e) { console.error('storygen seed:', e.message); }
}

async function _seedStorygenIfEmpty() {
  // Admin içeriğini ASLA ezme: yalnızca soru tablosu boşsa seed et.
  var cnt = await query("SELECT COUNT(*)::int AS n FROM story_questions");
  if (cnt.rows[0].n > 0) return;
  var catId = {};
  for (var i = 0; i < STORYGEN_SEED.categories.length; i++) {
    var c = STORYGEN_SEED.categories[i];
    var cr = await query("INSERT INTO story_categories (ckey, name, ord, active) VALUES ($1,$2,$3,true) ON CONFLICT (ckey) DO UPDATE SET name=$2, ord=$3 RETURNING id", [c.key, c.name, c.ord || 0]);
    catId[c.key] = cr.rows[0].id;
  }
  for (var q = 0; q < STORYGEN_SEED.questions.length; q++) {
    var qq = STORYGEN_SEED.questions[q];
    if (!catId[qq.cat]) continue;
    var qr = await query("INSERT INTO story_questions (category_id, text, active, ord) VALUES ($1,$2,true,$3) RETURNING id", [catId[qq.cat], qq.q, q]);
    var qid = qr.rows[0].id;
    for (var o = 0; o < qq.opts.length; o++) {
      var op = qq.opts[o];
      await query("INSERT INTO story_options (question_id, text, frag, cr, tr, ld, sm, ch, ord) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [qid, op.t, op.frag || '', op.cr|0, op.tr|0, op.ld|0, op.sm|0, op.ch|0, o]);
    }
  }
  // Plan'ı config'e yaz (admin sonradan değiştirebilir)
  var existPlan = await getConfig('story_plan');
  if (!existPlan) await setConfig('story_plan', JSON.stringify(STORYGEN_SEED.plan));
  console.log('Karakter Hikayesi: ' + STORYGEN_SEED.questions.length + ' soru seed edildi.');
}

// Oyunun çekeceği havuz (yalnızca aktif kategori/soru/seçenek)
async function getStoryPool() {
  var cats = await query("SELECT id, ckey, name, ord FROM story_categories WHERE active=true ORDER BY ord, id");
  var qs = await query("SELECT q.id, q.text, q.category_id, c.ckey FROM story_questions q JOIN story_categories c ON c.id=q.category_id WHERE q.active=true AND c.active=true ORDER BY q.ord, q.id");
  var opts = await query("SELECT question_id, text, frag, cr, tr, ld, sm, ch FROM story_options ORDER BY ord, id");
  var byQ = {};
  opts.rows.forEach(function(o) { (byQ[o.question_id] = byQ[o.question_id] || []).push({ t: o.text, frag: o.frag, cr: o.cr, tr: o.tr, ld: o.ld, sm: o.sm, ch: o.ch }); });
  var questions = qs.rows.filter(function(q) { return (byQ[q.id] || []).length >= 2; }).map(function(q) {
    return { id: q.id, cat: q.ckey, text: q.text, opts: byQ[q.id] };
  });
  var planRaw = await getConfig('story_plan');
  var plan = STORYGEN_SEED.plan;
  if (planRaw) { try { plan = JSON.parse(planRaw); } catch (e) {} }
  return { categories: cats.rows.map(function(c) { return { key: c.ckey, name: c.name, ord: c.ord }; }), plan: plan, questions: questions };
}

// ── Admin CRUD ──
async function adminGetStoryContent() {
  var cats = await query("SELECT id, ckey, name, ord, active FROM story_categories ORDER BY ord, id");
  var qs = await query("SELECT id, category_id, text, active, ord FROM story_questions ORDER BY ord, id");
  var opts = await query("SELECT id, question_id, text, frag, cr, tr, ld, sm, ch, ord FROM story_options ORDER BY ord, id");
  var byQ = {};
  opts.rows.forEach(function(o) { (byQ[o.question_id] = byQ[o.question_id] || []).push(o); });
  var questions = qs.rows.map(function(q) { return { id: q.id, category_id: q.category_id, text: q.text, active: q.active, ord: q.ord, options: byQ[q.id] || [] }; });
  var planRaw = await getConfig('story_plan');
  var plan = STORYGEN_SEED.plan; if (planRaw) { try { plan = JSON.parse(planRaw); } catch (e) {} }
  return { categories: cats.rows, questions: questions, plan: plan };
}

async function upsertStoryCategory(data) {
  var name = (data.name || '').trim();
  if (!name) return { error: 'Kategori adı gerekli.' };
  if (data.id) {
    await query("UPDATE story_categories SET name=$1, ord=$2, active=$3 WHERE id=$4", [name, data.ord | 0, data.active !== false, parseInt(data.id)]);
    return { success: true, id: parseInt(data.id) };
  }
  var key = (data.ckey || name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || ('cat_' + Date.now());
  var r = await query("INSERT INTO story_categories (ckey, name, ord, active) VALUES ($1,$2,$3,$4) ON CONFLICT (ckey) DO UPDATE SET name=$2, ord=$3, active=$4 RETURNING id", [key, name, data.ord | 0, data.active !== false]);
  return { success: true, id: r.rows[0].id, ckey: key };
}

async function deleteStoryCategory(id) {
  await query("DELETE FROM story_categories WHERE id=$1", [parseInt(id)]);
  return { success: true };
}

async function upsertStoryQuestion(data) {
  var text = (data.text || '').trim();
  var catId = parseInt(data.category_id);
  if (!text || !catId) return { error: 'Soru metni ve kategori gerekli.' };
  var options = Array.isArray(data.options) ? data.options.filter(function(o) { return o && (o.text || '').trim(); }) : [];
  if (options.length < 2) return { error: 'En az 2 cevap seçeneği gerekli.' };
  var qid;
  if (data.id) {
    qid = parseInt(data.id);
    await query("UPDATE story_questions SET category_id=$1, text=$2, active=$3, ord=$4 WHERE id=$5", [catId, text, data.active !== false, data.ord | 0, qid]);
    await query("DELETE FROM story_options WHERE question_id=$1", [qid]);
  } else {
    var qr = await query("INSERT INTO story_questions (category_id, text, active, ord) VALUES ($1,$2,$3,$4) RETURNING id", [catId, text, data.active !== false, data.ord | 0]);
    qid = qr.rows[0].id;
  }
  for (var i = 0; i < options.length; i++) {
    var o = options[i];
    await query("INSERT INTO story_options (question_id, text, frag, cr, tr, ld, sm, ch, ord) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [qid, (o.text || '').trim().slice(0, 160), (o.frag || '').trim(), o.cr | 0, o.tr | 0, o.ld | 0, o.sm | 0, o.ch | 0, i]);
  }
  return { success: true, id: qid };
}

async function deleteStoryQuestion(id) {
  await query("DELETE FROM story_questions WHERE id=$1", [parseInt(id)]);
  return { success: true };
}

async function setStoryPlan(plan) {
  var clean = {};
  if (plan && typeof plan === 'object') { Object.keys(plan).forEach(function(k) { var v = parseInt(plan[k]); if (v > 0) clean[k] = v; }); }
  await setConfig('story_plan', JSON.stringify(clean));
  return { success: true, plan: clean };
}

module.exports = {
  init: init, query: query,
  createUser: createUser, findUserByEmail: findUserByEmail, findUserByUsername: findUserByUsername, findUserById: findUserById, verifyPassword: verifyPassword,
  saveScore: saveScore, getLeaderboard: getLeaderboard, getQuestionCount: getQuestionCount, resetLeaderboard: resetLeaderboard, resetUserScore: resetUserScore, getRecentGame: getRecentGame,
  getAllCharacters: getAllCharacters, getAllCharactersLite: getAllCharactersLite, upsertCharacter: upsertCharacter, deleteCharacter: deleteCharacter,
  getAllQuestions: getAllQuestions, upsertQuestion: upsertQuestion, deleteQuestion: deleteQuestion,
  getAllWhoQuestions: getAllWhoQuestions, upsertWhoQuestion: upsertWhoQuestion, deleteWhoQuestion: deleteWhoQuestion,
  getConfig: getConfig, setConfig: setConfig,
  getAllUsers: getAllUsers, banUser: banUser, getGameLeaderboard: getGameLeaderboard, getTimedLeaderboard: getTimedLeaderboard,
  toggleStreamer: toggleStreamer, requestStreamer: requestStreamer, getStreamerRequests: getStreamerRequests, handleStreamerRequest: handleStreamerRequest,
  createNotification: createNotification, getUserNotifications: getUserNotifications, markNotificationRead: markNotificationRead,
  createContactMessage: createContactMessage, getAllContactMessages: getAllContactMessages, deleteContactMessage: deleteContactMessage,
  updateUserScore: updateUserScore, updateLastActive: updateLastActive, deleteUser: deleteUser, getDiscordLink: getDiscordLink, setDiscordLink: setDiscordLink,
  getUserProfile: getUserProfile,
  saveDuel: saveDuel, getDuels: getDuels, deleteDuel: deleteDuel,
  getStreamerLink: getStreamerLink, saveStreamerLink: saveStreamerLink,
  // Karakter Sırala
  getRankCriteria: getRankCriteria, upsertRankCriterion: upsertRankCriterion, deleteRankCriterion: deleteRankCriterion,
  scoreAndRecordRanking: scoreAndRecordRanking,
  getRankConfig: getRankConfig, setRankConfig: setRankConfig,
  getRpsimConfig: getRpsimConfig, setRpsimConfig: setRpsimConfig,
  // Karakter Borsası
  ensureWallet: ensureWallet, getStockMarket: getStockMarket, getStockPortfolio: getStockPortfolio,
  tradeStock: tradeStock, noteStockSelections: noteStockSelections, getStockLeaderboard: getStockLeaderboard,
  ensureStockCycle: ensureStockCycle, getStockCycleInfo: getStockCycleInfo, getStockPlayState: getStockPlayState,
  adminSetStockPrice: adminSetStockPrice, adminSetUserCash: adminSetUserCash, getAdminStockWallets: getAdminStockWallets,
  getAdminStockHoldings: getAdminStockHoldings,
  // Dedektif Dosyası
  getDetectiveCases: getDetectiveCases, getDetectiveCase: getDetectiveCase, getDetectiveProgress: getDetectiveProgress,
  recordDetectiveGuess: recordDetectiveGuess, getDetectiveStats: getDetectiveStats,
  adminGetDetectiveCases: adminGetDetectiveCases, adminGetDetectiveCase: adminGetDetectiveCase,
  upsertDetectiveCase: upsertDetectiveCase, deleteDetectiveCase: deleteDetectiveCase,
  upsertDetectiveSuspect: upsertDetectiveSuspect, deleteDetectiveSuspect: deleteDetectiveSuspect,
  upsertDetectiveEvidence: upsertDetectiveEvidence, deleteDetectiveEvidence: deleteDetectiveEvidence,
  getDetectiveRevealForUser: getDetectiveRevealForUser, getDetectiveNextCase: getDetectiveNextCase,
  getDetectiveCharPool: getDetectiveCharPool, setDetectiveCharPool: setDetectiveCharPool, regenerateDetectiveCases: regenerateDetectiveCases,
  getDetectiveStreamReveal: getDetectiveStreamReveal,
  // Karakter Hikayesi Oluşturucu
  getStoryPool: getStoryPool, adminGetStoryContent: adminGetStoryContent,
  upsertStoryCategory: upsertStoryCategory, deleteStoryCategory: deleteStoryCategory,
  upsertStoryQuestion: upsertStoryQuestion, deleteStoryQuestion: deleteStoryQuestion,
  setStoryPlan: setStoryPlan
};

// ═══ SAVED DUELS ═══
async function saveDuel(userId, username, title, characters) {
  var r = await query("INSERT INTO saved_duels (creator_id, creator_username, title, characters) VALUES ($1, $2, $3, $4) RETURNING id", [userId, username, title, JSON.stringify(characters)]);
  return r.rows[0];
}

async function getDuels() {
  var r = await query("SELECT id, creator_id, creator_username, title, characters, created_at FROM saved_duels ORDER BY created_at DESC LIMIT 50");
  return r.rows.map(function(d) { try { d.characters = JSON.parse(d.characters); } catch(e) { d.characters = []; } return d; });
}

async function deleteDuel(duelId, userId) {
  await query("DELETE FROM saved_duels WHERE id = $1 AND creator_id = $2", [duelId, userId]);
}

// ═══ STREAMER LINKS ═══
async function getStreamerLink(userId) {
  var r = await query("SELECT youtube_url, kick_url FROM streamer_links WHERE user_id = $1", [userId]);
  return r.rows[0] || { youtube_url: '', kick_url: '' };
}

async function saveStreamerLink(userId, youtubeUrl, kickUrl) {
  await query("INSERT INTO streamer_links (user_id, youtube_url, kick_url, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET youtube_url = $2, kick_url = $3, updated_at = NOW()", [userId, youtubeUrl || '', kickUrl || '']);
}

async function getUserProfile(username) {
  // 1) User info
  var u = await query("SELECT id, username, role, streamer, best_score, games_played, created_at, last_active FROM users WHERE LOWER(username) = LOWER($1)", [username]);
  if (u.rows.length === 0) return null;
  var user = u.rows[0];

  // 2) Per-game stats
  var gs = await query("SELECT game_type, COUNT(*) as count, SUM(score) as total_score, MAX(score) as best_score FROM game_scores WHERE user_id = $1 GROUP BY game_type ORDER BY count DESC", [user.id]);

  // 3) Recent 20 games
  var recent = await query("SELECT game_type, score, total, played_at FROM game_scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 20", [user.id]);

  // 4) Leaderboard rank
  var rank = await query("SELECT COUNT(*) + 1 as rank FROM users WHERE best_score > $1 AND best_score > 0", [user.best_score]);

  return {
    user: user,
    gameStats: gs.rows,
    recentGames: recent.rows,
    rank: user.best_score > 0 ? parseInt(rank.rows[0].rank) : null
  };
}

async function getAllCharactersLite() {
  var r = await query("SELECT id, name, surname, gender, rep, tip, CASE WHEN img LIKE '/images/%' THEN img ELSE '' END as img, active FROM characters ORDER BY name");
  return r.rows;
}

// ═══════════════════════════════════════════════════════════
// KARAKTER SIRALA (RANK)
// ═══════════════════════════════════════════════════════════
async function getRankCriteria(includeInactive) {
  if (includeInactive) {
    var r = await query("SELECT id, label, emoji, active FROM rank_criteria ORDER BY id");
    return r.rows;
  }
  var r2 = await query("SELECT id, label, emoji FROM rank_criteria WHERE active = true ORDER BY id");
  return r2.rows;
}

async function upsertRankCriterion(d) {
  var label = (d.label || '').trim().substring(0, 150);
  var emoji = ((d.emoji || '').trim().substring(0, 12)) || '🏆';
  var active = (d.active !== false);
  var numId = parseInt(d.id);
  if (numId && !isNaN(numId)) {
    var chk = await query("SELECT id FROM rank_criteria WHERE id = $1", [numId]);
    if (chk.rows.length > 0) {
      await query("UPDATE rank_criteria SET label=$1, emoji=$2, active=$3 WHERE id=$4", [label, emoji, active, numId]);
      return numId;
    }
  }
  var r = await query("INSERT INTO rank_criteria (label, emoji, active) VALUES ($1,$2,$3) RETURNING id", [label, emoji, active]);
  return r.rows[0].id;
}

async function deleteRankCriterion(id) {
  await query("DELETE FROM rank_criteria WHERE id = $1", [id]);
  await query("DELETE FROM rank_votes WHERE criterion_id = $1", [id]);
}

// order: char id string dizisi, order[0] = en üst ("en çok"). Skoru ÖNCE hesaplar, SONRA oyları kaydeder.
async function scoreAndRecordRanking(criterionId, order) {
  var ids = order.map(String);
  var n = ids.length;
  var pairs = [];
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      var x = ids[i], y = ids[j]; // kullanıcı: x > y
      var lo = x < y ? x : y;
      var hi = x < y ? y : x;
      pairs.push({ x: x, y: y, lo: lo, hi: hi });
    }
  }

  // ── KARAKTER-BAZLI SKORLAMA ──
  // Her karakterin bu kriterdeki TÜM oylarını (herkese karşı) çek — sadece bu beşli içinde değil.
  // Böylece tam aynı ikili daha önce hiç gelmese bile, karakterlerin küresel kazanma oranıyla
  // topluluk sıralaması ve uyum hesaplanabilir.
  var existing = await query(
    "SELECT char_a, char_b, a_over_b, b_over_a FROM rank_votes WHERE criterion_id = $1 AND (char_a = ANY($2) OR char_b = ANY($2))",
    [criterionId, ids]
  );
  var wins = {}, games = {};
  ids.forEach(function(id){ wins[id] = 0; games[id] = 0; });
  existing.rows.forEach(function(row){
    var a = row.char_a, b = row.char_b;
    var ab = parseInt(row.a_over_b) || 0, ba = parseInt(row.b_over_a) || 0, tot = ab + ba;
    if (tot === 0) return;
    if (wins[a] !== undefined) { wins[a] += ab; games[a] += tot; }
    if (wins[b] !== undefined) { wins[b] += ba; games[b] += tot; }
  });
  // Laplace yumuşatmalı güç (win-rate): verisi olmayan = 0.5 (nötr), uçlar (1/1, 0/1) yumuşatılır
  function strength(id){ return (wins[id] + 1) / (games[id] + 2); }

  // Uyum: SADECE iki karakterin de verisi olan çiftler üzerinden (gerçek topluluk sinyali)
  var concordant = 0, dataPairs = 0;
  pairs.forEach(function(p){
    if (games[p.x] > 0 && games[p.y] > 0) {
      dataPairs++;
      // kullanıcı x'i y'nin üstüne koydu; topluluk x'i daha güçlü görüyorsa uyumlu
      if (strength(p.x) >= strength(p.y)) concordant++;
    }
  });
  var agreement = dataPairs > 0 ? Math.round((concordant / dataPairs) * 100) : null;

  // Oyları kaydet (UPSERT) — ham ikili veriyi biriktirmeye devam
  for (var k = 0; k < pairs.length; k++) {
    var pp = pairs[k];
    var incA = (pp.x === pp.lo) ? 1 : 0;
    var incB = (pp.x === pp.lo) ? 0 : 1;
    await query(
      "INSERT INTO rank_votes (criterion_id, char_a, char_b, a_over_b, b_over_a) VALUES ($1,$2,$3,$4,$5) " +
      "ON CONFLICT (criterion_id, char_a, char_b) DO UPDATE SET a_over_b = rank_votes.a_over_b + $4, b_over_a = rank_votes.b_over_a + $5",
      [criterionId, pp.lo, pp.hi, incA, incB]
    );
  }

  // Kritere ait gönderim sayacı
  var subKey = 'rank_subs_' + criterionId;
  var subCur = await getConfig(subKey);
  var subCount = subCur ? parseInt(subCur) + 1 : 1;
  await setConfig(subKey, String(subCount));

  // Topluluk uzlaşı sıralaması (küresel güce göre azalan)
  var consensus = ids.slice().sort(function(a, b){
    var d = strength(b) - strength(a);
    if (Math.abs(d) > 1e-9) return d;
    return ids.indexOf(a) - ids.indexOf(b);
  });

  return {
    agreement: agreement,
    data_pairs: dataPairs,
    total_pairs: pairs.length,
    submissions: subCount,
    consensus: consensus,
    first: agreement === null
  };
}

// ── Sıralama havuzu + tur ayarı (admin) ──
async function getRankConfig() {
  var poolRaw = await getConfig('rank_pool_ids');
  var sizeRaw = await getConfig('rank_round_size');
  var pool = [];
  if (poolRaw) { try { var p = JSON.parse(poolRaw); if (Array.isArray(p)) pool = p.map(String); } catch (e) {} }
  var size = sizeRaw ? parseInt(sizeRaw) : 5;
  if (!(size >= 2 && size <= 12)) size = 5;
  return { pool_ids: pool, round_size: size };
}
async function setRankConfig(poolIds, roundSize) {
  var size = parseInt(roundSize);
  if (!(size >= 2 && size <= 12)) return { error: 'Tur başına karakter sayısı 2–12 arasında olmalı.' };
  var pool = Array.isArray(poolIds) ? poolIds.map(String).filter(Boolean) : [];
  var seen = {}, uniq = [];
  pool.forEach(function(x){ if (!seen[x]) { seen[x] = 1; uniq.push(x); } });
  if (uniq.length > 0 && uniq.length < size) {
    return { error: 'Havuzdaki karakter sayısı (' + uniq.length + '), tur başına sayıdan (' + size + ') az olamaz.' };
  }
  await setConfig('rank_pool_ids', JSON.stringify(uniq));
  await setConfig('rank_round_size', String(size));
  return { success: true, pool_ids: uniq, round_size: size };
}

// ── RP Simülasyonu: etkileşilecek karakter havuzu (admin) ──
async function getRpsimConfig() {
  var raw = await getConfig('rpsim_char_ids');
  var ids = [];
  if (raw) { try { var p = JSON.parse(raw); if (Array.isArray(p)) ids = p.map(String); } catch (e) {} }
  return { char_ids: ids };
}
async function setRpsimConfig(charIds) {
  var ids = Array.isArray(charIds) ? charIds.map(String).filter(Boolean) : [];
  var seen = {}, uniq = [];
  ids.forEach(function(x){ if (!seen[x]) { seen[x] = 1; uniq.push(x); } });
  await setConfig('rpsim_char_ids', JSON.stringify(uniq));
  return { success: true, char_ids: uniq };
}

// ═══════════════════════════════════════════════════════════
// KARAKTER BORSASI (STOCK)
// ═══════════════════════════════════════════════════════════
function _today() { return new Date().toISOString().slice(0, 10); }
function _weekStart() {
  var d = new Date();
  var day = (d.getUTCDay() + 6) % 7; // Pazartesi = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
function _round2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
function _daysBetween(aStr, bStr) {
  var a = new Date(aStr + 'T00:00:00Z'), b = new Date(bStr + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}
var STOCK_CYCLE_DAYS = 15;
var STOCK_START_CASH = 1000; // tek seferlik başlangıç bütçesi (günlük hibe ayrı: 100)
// ── Oynama oturumu (üyeler, saatlik) ──
// İlk işlemde oturum başlar; SESSION boyunca al-sat serbest, sonra COOLDOWN dolana dek kilitli (gözatma her zaman serbest).
var STOCK_TRADE_SESSION_SEC = 900;   // 15 dk aktif işlem penceresi
var STOCK_TRADE_COOLDOWN_SEC = 3600; // 60 dk: bir sonraki oturuma kadar

async function _portfolioValue(userId, cash) {
  var r = await query("SELECT COALESCE(SUM(h.shares * p.price), 0) AS hv FROM stock_holdings h JOIN stock_prices p ON p.char_id = h.char_id WHERE h.user_id = $1", [userId]);
  return _round2((Number(cash) || 0) + parseFloat(r.rows[0].hv || 0));
}

// Cüzdanı garanti et + günlük 1000 hibe + haftalık snapshot
async function ensureWallet(userId) {
  var w = await query("SELECT user_id, cash, last_grant, week_start_value, week_start FROM stock_wallets WHERE user_id = $1", [userId]);
  if (w.rows.length === 0) {
    await query("INSERT INTO stock_wallets (user_id, cash, last_grant, week_start, week_start_value) VALUES ($1, 1000, $2, $3, 1000) ON CONFLICT (user_id) DO NOTHING", [userId, _today(), _weekStart()]);
    w = await query("SELECT user_id, cash, last_grant, week_start_value, week_start FROM stock_wallets WHERE user_id = $1", [userId]);
  }
  var wallet = w.rows[0];
  var today = _today();
  var lastGrant = wallet.last_grant ? new Date(wallet.last_grant).toISOString().slice(0, 10) : null;
  if (lastGrant !== today) {
    await query("UPDATE stock_wallets SET cash = cash + 100, last_grant = $1 WHERE user_id = $2", [today, userId]);
    wallet.cash = parseFloat(wallet.cash) + 100;
    wallet.last_grant = today;
    wallet._granted = true;
  }
  var wk = _weekStart();
  var curWeek = wallet.week_start ? new Date(wallet.week_start).toISOString().slice(0, 10) : null;
  if (curWeek !== wk) {
    var pv = await _portfolioValue(userId, parseFloat(wallet.cash));
    await query("UPDATE stock_wallets SET week_start = $1, week_start_value = $2 WHERE user_id = $3", [wk, pv, userId]);
    wallet.week_start = wk;
    wallet.week_start_value = pv;
  }
  return wallet;
}

// Tüm piyasa (karakterler tablosu evren; fiyatı olmayan 100). Günlük prev_price snapshot'ı (lazy).
async function getStockMarket() {
  var today = _today();
  var meta = await getConfig('stock_daily_date');
  if (meta !== today) {
    await query("UPDATE stock_prices SET prev_price = price");
    await setConfig('stock_daily_date', today);
  }
  var r = await query(
    "SELECT CAST(ch.id AS VARCHAR) AS char_id, ch.name, ch.surname, ch.gender, ch.tip, " +
    "CASE WHEN ch.img LIKE '/images/%' THEN ch.img ELSE '' END AS img, " +
    "COALESCE(p.price, 100) AS price, COALESCE(p.prev_price, 100) AS prev_price, " +
    "COALESCE(p.shares_out, 0) AS shares_out, COALESCE(p.pop_score, 0) AS pop_score " +
    "FROM characters ch LEFT JOIN stock_prices p ON p.char_id = CAST(ch.id AS VARCHAR) " +
    "WHERE ch.active = true ORDER BY ch.name"
  );
  return r.rows.map(function(row){
    var price = parseFloat(row.price), prev = parseFloat(row.prev_price);
    return {
      char_id: row.char_id, name: row.name, surname: row.surname, gender: row.gender, tip: row.tip, img: row.img,
      price: _round2(price), prev_price: _round2(prev),
      change: _round2(price - prev), change_pct: prev > 0 ? _round2((price - prev) / prev * 100) : 0,
      shares_out: parseInt(row.shares_out), pop_score: parseInt(row.pop_score)
    };
  });
}

async function getStockPortfolio(userId) {
  var wallet = await ensureWallet(userId);
  var h = await query("SELECT h.char_id, h.shares, h.avg_cost, p.price FROM stock_holdings h LEFT JOIN stock_prices p ON p.char_id = h.char_id WHERE h.user_id = $1 AND h.shares > 0 ORDER BY (h.shares * COALESCE(p.price,0)) DESC", [userId]);
  var cash = parseFloat(wallet.cash);
  var holdings = h.rows.map(function(row){
    var price = parseFloat(row.price != null ? row.price : 100);
    var shares = parseInt(row.shares);
    return { char_id: row.char_id, shares: shares, avg_cost: _round2(row.avg_cost), price: _round2(price), value: _round2(shares * price) };
  });
  var holdingsValue = holdings.reduce(function(s, x){ return s + x.value; }, 0);
  var total = _round2(cash + holdingsValue);
  var wsv = wallet.week_start_value != null ? parseFloat(wallet.week_start_value) : total;
  return {
    cash: _round2(cash),
    holdings: holdings,
    holdings_value: _round2(holdingsValue),
    total: total,
    week_start_value: _round2(wsv),
    week_change: _round2(total - wsv),
    week_change_pct: wsv > 0 ? _round2((total - wsv) / wsv * 100) : 0,
    granted: !!wallet._granted
  };
}

async function tradeStock(userId, charId, side, qty) {
  charId = String(charId);
  qty = parseInt(qty);
  if (!qty || qty < 1) return { error: 'Geçersiz adet.' };
  if (qty > 100000) return { error: 'Adet çok büyük.' };
  if (side !== 'buy' && side !== 'sell') return { error: 'Geçersiz işlem.' };

  await ensureWallet(userId);

  // ── Oynama oturumu kilidi: ilk işlem oturumu başlatır, SESSION sonrası COOLDOWN dolana dek kilitli ──
  var psRow = await query("SELECT last_played FROM stock_wallets WHERE user_id = $1", [userId]);
  var _lp = (psRow.rows.length && psRow.rows[0].last_played) ? new Date(psRow.rows[0].last_played).getTime() : null;
  var _elapsed = _lp ? (Date.now() - _lp) / 1000 : null;
  if (_elapsed === null || _elapsed >= STOCK_TRADE_COOLDOWN_SEC) {
    await query("UPDATE stock_wallets SET last_played = NOW() WHERE user_id = $1", [userId]); // yeni oturum
  } else if (_elapsed >= STOCK_TRADE_SESSION_SEC) {
    var _wait = Math.ceil(STOCK_TRADE_COOLDOWN_SEC - _elapsed);
    return { error: 'İşlem oturumun doldu. Yaklaşık ' + Math.max(1, Math.ceil(_wait / 60)) + ' dk sonra tekrar işlem yapabilirsin.', cooldown: true, wait_sec: _wait };
  } // aksi halde aktif oturum içinde — devam

  var pr = await query("SELECT price FROM stock_prices WHERE char_id = $1", [charId]);
  var price;
  if (pr.rows.length === 0) {
    var chk = await query("SELECT 1 FROM characters WHERE CAST(id AS VARCHAR) = $1 AND active = true", [charId]);
    if (chk.rows.length === 0) return { error: 'Karakter bulunamadı.' };
    await query("INSERT INTO stock_prices (char_id, price, prev_price) VALUES ($1, 100, 100) ON CONFLICT (char_id) DO NOTHING", [charId]);
    price = 100;
  } else {
    price = parseFloat(pr.rows[0].price);
  }

  var wRow = await query("SELECT cash FROM stock_wallets WHERE user_id = $1", [userId]);
  var cash = parseFloat(wRow.rows[0].cash);

  if (side === 'buy') {
    // Anti-arbitraj: alım, ETKİ SONRASI fiyattan gerçekleşir (kendi etkini ödersin).
    // Böylece resting fiyat = alım fiyatı → ne anlık sahte kâr olur ne de al-sat döngüsü kâr ettirir.
    var fUp = Math.min(0.25, 0.004 * qty);
    var execBuy = _round2(price * (1 + fUp));
    var cost = _round2(qty * execBuy);
    if (cash < cost) return { error: 'Yetersiz bakiye.' };
    var hRow = await query("SELECT shares, avg_cost FROM stock_holdings WHERE user_id = $1 AND char_id = $2", [userId, charId]);
    if (hRow.rows.length === 0) {
      await query("INSERT INTO stock_holdings (user_id, char_id, shares, avg_cost) VALUES ($1,$2,$3,$4)", [userId, charId, qty, execBuy]);
    } else {
      var oldShares = parseInt(hRow.rows[0].shares);
      var oldAvg = parseFloat(hRow.rows[0].avg_cost);
      var newShares = oldShares + qty;
      var newAvg = _round2((oldShares * oldAvg + qty * execBuy) / newShares);
      await query("UPDATE stock_holdings SET shares = $1, avg_cost = $2 WHERE user_id = $3 AND char_id = $4", [newShares, newAvg, userId, charId]);
    }
    await query("UPDATE stock_wallets SET cash = cash - $1 WHERE user_id = $2", [cost, userId]);
    await query("UPDATE stock_prices SET price = $1, shares_out = shares_out + $2, updated_at = NOW() WHERE char_id = $3", [execBuy, qty, charId]);
    await query("INSERT INTO stock_tx (user_id, char_id, side, shares, price) VALUES ($1,$2,'buy',$3,$4)", [userId, charId, qty, execBuy]);
    return { success: true, side: 'buy', shares: qty, price: execBuy, cost: cost, new_price: execBuy };
  } else {
    var hRow2 = await query("SELECT shares FROM stock_holdings WHERE user_id = $1 AND char_id = $2", [userId, charId]);
    var have = hRow2.rows.length ? parseInt(hRow2.rows[0].shares) : 0;
    if (have < qty) return { error: 'Yetersiz hisse.' };
    // Anti-arbitraj: satım, ETKİ SONRASI (düşürülmüş) fiyattan gerçekleşir.
    var fDn = Math.min(0.25, 0.004 * qty);
    var execSell = Math.max(5, _round2(price * (1 - fDn)));
    var proceeds = _round2(qty * execSell);
    await query("UPDATE stock_holdings SET shares = shares - $1 WHERE user_id = $2 AND char_id = $3", [qty, userId, charId]);
    await query("UPDATE stock_wallets SET cash = cash + $1 WHERE user_id = $2", [proceeds, userId]);
    await query("UPDATE stock_prices SET price = $1, shares_out = GREATEST(0, shares_out - $2), updated_at = NOW() WHERE char_id = $3", [execSell, qty, charId]);
    await query("INSERT INTO stock_tx (user_id, char_id, side, shares, price) VALUES ($1,$2,'sell',$3,$4)", [userId, charId, qty, execSell]);
    return { success: true, side: 'sell', shares: qty, price: execSell, proceeds: proceeds, new_price: execSell };
  }
}

// Oyunlardan gelen "seçim" sinyali: seçilen karakterlerin fiyatını hafifçe yükseltir
async function noteStockSelections(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return { updated: 0 };
  var uniq = [];
  ids.forEach(function(id){ var s = String(id); if (s && uniq.indexOf(s) === -1) uniq.push(s); });
  uniq = uniq.slice(0, 20);
  var updated = 0;
  for (var i = 0; i < uniq.length; i++) {
    var charId = uniq[i];
    var chk = await query("SELECT 1 FROM characters WHERE CAST(id AS VARCHAR) = $1 AND active = true", [charId]);
    if (chk.rows.length === 0) continue;
    var pr = await query("SELECT price FROM stock_prices WHERE char_id = $1", [charId]);
    if (pr.rows.length === 0) {
      await query("INSERT INTO stock_prices (char_id, price, prev_price, pop_score) VALUES ($1, 101, 100, 1) ON CONFLICT (char_id) DO NOTHING", [charId]);
    } else {
      var price = parseFloat(pr.rows[0].price);
      var newPrice = _round2(Math.min(price * 1.01, price + 50));
      await query("UPDATE stock_prices SET price = $1, pop_score = pop_score + 1, updated_at = NOW() WHERE char_id = $2", [newPrice, charId]);
    }
    updated++;
  }
  return { updated: updated };
}

async function getStockLeaderboard() {
  var r = await query(
    "SELECT u.id AS user_id, u.username, w.cash, w.week_start_value, " +
    "COALESCE(SUM(h.shares * COALESCE(p.price,0)), 0) AS holdings_value " +
    "FROM stock_wallets w JOIN users u ON u.id = w.user_id " +
    "LEFT JOIN stock_holdings h ON h.user_id = w.user_id " +
    "LEFT JOIN stock_prices p ON p.char_id = h.char_id " +
    "GROUP BY u.id, u.username, w.cash, w.week_start_value"
  );
  var rows = r.rows.map(function(row){
    var cash = parseFloat(row.cash || 0);
    var hv = parseFloat(row.holdings_value || 0);
    var total = _round2(cash + hv);
    var wsv = row.week_start_value != null ? parseFloat(row.week_start_value) : total;
    return {
      user_id: row.user_id, username: row.username,
      total: total, cash: _round2(cash), holdings_value: _round2(hv),
      week_change: _round2(total - wsv),
      week_change_pct: wsv > 0 ? _round2((total - wsv) / wsv * 100) : 0
    };
  });
  rows.sort(function(a, b){ return b.total - a.total; });
  return rows.slice(0, 50);
}

// ═══ 15 GÜNLÜK SEZON + ŞAMPİYON ═══
async function ensureStockCycle() {
  var today = _today();
  var start = await getConfig('stock_cycle_start');
  if (!start) { await setConfig('stock_cycle_start', today); return { reset: false }; }
  if (_daysBetween(start, today) >= STOCK_CYCLE_DAYS) {
    // Sıfırlamadan ÖNCE mevcut 1.'yi bu sezonun şampiyonu yap
    var lb = await getStockLeaderboard();
    var champ = (lb && lb.length && lb[0].total > STOCK_START_CASH) ? lb[0].username : '';
    // Herkesi sıfırla: hisseleri sil, nakdi başlangıca çek, fiyatları 100'e döndür
    await query("DELETE FROM stock_holdings");
    await query("UPDATE stock_wallets SET cash = $1, week_start_value = $1, week_start = $2, last_grant = $3", [STOCK_START_CASH, _weekStart(), today]);
    await query("UPDATE stock_prices SET price = 100, prev_price = 100, shares_out = 0, pop_score = 0, updated_at = NOW()");
    await setConfig('stock_champion', champ || '');
    await setConfig('stock_cycle_start', today);
    return { reset: true, champion: champ };
  }
  return { reset: false };
}

async function getStockCycleInfo() {
  var today = _today();
  var start = await getConfig('stock_cycle_start');
  var champ = await getConfig('stock_champion');
  var daysLeft = STOCK_CYCLE_DAYS;
  if (start) daysLeft = Math.max(0, STOCK_CYCLE_DAYS - _daysBetween(start, today));
  return { champion: champ || '', days_left: daysLeft, cycle_days: STOCK_CYCLE_DAYS };
}

// Üyenin işlem oturumu durumu: ready (yeni oturum açılabilir) / active (oturum içinde) / cooldown (kilitli)
async function getStockPlayState(userId) {
  await ensureWallet(userId);
  var r = await query("SELECT last_played FROM stock_wallets WHERE user_id = $1", [userId]);
  var lp = (r.rows.length && r.rows[0].last_played) ? new Date(r.rows[0].last_played).getTime() : null;
  var elapsed = lp ? (Date.now() - lp) / 1000 : null;
  var S = STOCK_TRADE_SESSION_SEC, C = STOCK_TRADE_COOLDOWN_SEC;
  if (elapsed === null || elapsed >= C) {
    return { state: 'ready', can_trade: true, session_left: S, cooldown_left: 0, session_sec: S, cooldown_sec: C };
  }
  if (elapsed < S) {
    return { state: 'active', can_trade: true, session_left: Math.ceil(S - elapsed), cooldown_left: 0, session_sec: S, cooldown_sec: C };
  }
  return { state: 'cooldown', can_trade: false, session_left: 0, cooldown_left: Math.ceil(C - elapsed), session_sec: S, cooldown_sec: C };
}

// ═══ ADMIN: borsa fiyatı / kullanıcı bakiyesi düzenleme ═══
async function adminSetStockPrice(charId, price) {
  charId = String(charId);
  price = _round2(price);
  if (!(price >= 1)) return { error: 'Geçersiz fiyat (en az 1).' };
  var chk = await query("SELECT 1 FROM characters WHERE CAST(id AS VARCHAR) = $1", [charId]);
  if (chk.rows.length === 0) return { error: 'Karakter bulunamadı.' };
  var ex = await query("SELECT 1 FROM stock_prices WHERE char_id = $1", [charId]);
  if (ex.rows.length === 0) {
    await query("INSERT INTO stock_prices (char_id, price, prev_price) VALUES ($1, $2, $2) ON CONFLICT (char_id) DO NOTHING", [charId, price]);
  } else {
    await query("UPDATE stock_prices SET price = $1, prev_price = $1, updated_at = NOW() WHERE char_id = $2", [price, charId]);
  }
  return { success: true, char_id: charId, price: price };
}

async function adminSetUserCash(userId, cash) {
  userId = parseInt(userId);
  cash = _round2(cash);
  if (!userId || cash < 0) return { error: 'Geçersiz değer.' };
  var u = await query("SELECT id FROM users WHERE id = $1", [userId]);
  if (u.rows.length === 0) return { error: 'Kullanıcı bulunamadı.' };
  var w = await query("SELECT user_id FROM stock_wallets WHERE user_id = $1", [userId]);
  if (w.rows.length === 0) {
    await query("INSERT INTO stock_wallets (user_id, cash, last_grant, week_start, week_start_value) VALUES ($1, $2, $3, $4, $2) ON CONFLICT (user_id) DO NOTHING", [userId, cash, _today(), _weekStart()]);
  } else {
    await query("UPDATE stock_wallets SET cash = $1 WHERE user_id = $2", [cash, userId]);
  }
  return { success: true, user_id: userId, cash: cash };
}

async function getAdminStockWallets() {
  var r = await query(
    "SELECT u.id AS user_id, u.username, COALESCE(w.cash, 0) AS cash, " +
    "COALESCE((SELECT SUM(h.shares * COALESCE(p.price,0)) FROM stock_holdings h LEFT JOIN stock_prices p ON p.char_id = h.char_id WHERE h.user_id = u.id), 0) AS holdings_value, " +
    "(w.user_id IS NOT NULL) AS has_wallet " +
    "FROM users u LEFT JOIN stock_wallets w ON w.user_id = u.id ORDER BY (COALESCE(w.cash,0)) DESC"
  );
  return r.rows.map(function(row){
    var cash = parseFloat(row.cash || 0), hv = parseFloat(row.holdings_value || 0);
    return { user_id: row.user_id, username: row.username, cash: _round2(cash), total: _round2(cash + hv), has_wallet: !!row.has_wallet };
  });
}

// Hangi kullanıcı hangi karakterin hissesini tutuyor (admin görünümü)
async function getAdminStockHoldings() {
  var r = await query(
    "SELECT h.user_id, u.username, h.char_id, h.shares, h.avg_cost, COALESCE(p.price, 0) AS price, " +
    "ch.name AS cname, ch.surname AS csurname, ch.img AS cimg, ch.gender AS cgender " +
    "FROM stock_holdings h " +
    "JOIN users u ON u.id = h.user_id " +
    "LEFT JOIN characters ch ON CAST(ch.id AS VARCHAR) = h.char_id OR CAST(ch.id AS VARCHAR) = regexp_replace(h.char_id, '^c', '') " +
    "LEFT JOIN stock_prices p ON p.char_id = h.char_id " +
    "WHERE h.shares > 0 " +
    "ORDER BY ch.name NULLS LAST, ch.surname NULLS LAST, h.shares DESC"
  );
  return r.rows.map(function(row){
    var shares = parseInt(row.shares) || 0, price = parseFloat(row.price) || 0;
    return {
      user_id: row.user_id, username: row.username, char_id: String(row.char_id),
      name: row.cname || '', surname: row.csurname || '', img: row.cimg || '', gender: row.cgender || 'M',
      shares: shares, avg_cost: _round2(parseFloat(row.avg_cost) || 0),
      price: _round2(price), value: _round2(shares * price)
    };
  });
}

// ═══════════════════════════════════════════════════
// DEDEKTİF DOSYASI
// ═══════════════════════════════════════════════════
async function detectiveInit() {
  await query("CREATE TABLE IF NOT EXISTS detective_cases (id SERIAL PRIMARY KEY, title VARCHAR(120) NOT NULL, event_type VARCHAR(50) DEFAULT '', summary TEXT DEFAULT '', status_text VARCHAR(200) DEFAULT '', difficulty VARCHAR(10) DEFAULT 'easy', culprit_id INTEGER, solution TEXT DEFAULT '', active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE TABLE IF NOT EXISTS detective_suspects (id SERIAL PRIMARY KEY, case_id INTEGER REFERENCES detective_cases(id) ON DELETE CASCADE, char_id INTEGER, name VARCHAR(60) NOT NULL, profession VARCHAR(80) DEFAULT '', background TEXT DEFAULT '', img TEXT DEFAULT '', ord INTEGER DEFAULT 0)");
  await query("CREATE TABLE IF NOT EXISTS detective_evidence (id SERIAL PRIMARY KEY, case_id INTEGER REFERENCES detective_cases(id) ON DELETE CASCADE, category VARCHAR(20) DEFAULT 'other', title VARCHAR(120) DEFAULT '', content TEXT DEFAULT '', important BOOLEAN DEFAULT false, misleading BOOLEAN DEFAULT false, ord INTEGER DEFAULT 0)");
  await query("CREATE TABLE IF NOT EXISTS detective_guesses (id SERIAL PRIMARY KEY, case_id INTEGER NOT NULL, user_id INTEGER NOT NULL, suspect_id INTEGER, attempt_no INTEGER DEFAULT 1, correct BOOLEAN DEFAULT false, delta INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())");
  await query("CREATE INDEX IF NOT EXISTS idx_det_guess_uc ON detective_guesses (user_id, case_id)");
  await query("ALTER TABLE detective_suspects ADD COLUMN IF NOT EXISTS char_id INTEGER");
  try { await seedDetectiveChars(); } catch (e) { console.error('seedDetectiveChars:', e.message); }
}

async function _seedCase(c, suspects, evidence, culpritIndex) {
  var cr = await query("INSERT INTO detective_cases (title,event_type,summary,status_text,difficulty,solution,active) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id",
    [c.title, c.event_type, c.summary, c.status_text, c.difficulty, c.solution]);
  var caseId = cr.rows[0].id, ids = [];
  for (var i = 0; i < suspects.length; i++) {
    var s = suspects[i];
    var sr = await query("INSERT INTO detective_suspects (case_id,name,profession,background,img,ord) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [caseId, s.name, s.profession, s.background, s.img || '', i]);
    ids.push(sr.rows[0].id);
  }
  await query("UPDATE detective_cases SET culprit_id=$1 WHERE id=$2", [ids[culpritIndex], caseId]);
  for (var j = 0; j < evidence.length; j++) {
    var e = evidence[j];
    await query("INSERT INTO detective_evidence (case_id,category,title,content,important,misleading,ord) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [caseId, e.category, e.title, e.content, !!e.important, !!e.misleading, j]);
  }
  return caseId;
}

async function seedDetective() {
  var c = await query("SELECT COUNT(*) AS n FROM detective_cases");
  if (parseInt(c.rows[0].n) > 0) return;

  // VAKA 1 — Araç Hırsızlığı (Kolay: 3 şüpheli, 4 kanıt)
  await _seedCase(
    { title: 'Gece Yarısı Galerisi', event_type: 'Araç Hırsızlığı', difficulty: 'easy',
      summary: 'Gece saat 02:15te şehrin merkezindeki lüks bir galeriden bir spor araba çalindi. Alarm devre disi birakilmis, kapida zorlama izi yok. Iceriden bilgisi olan biri sus gibi gorunuyor.',
      status_text: 'Fail henuz bulunamadi. Uc kisi sorgulaniyor.',
      solution: 'Hirsiz Volkan Demir. Alarmin sifresini sadece eski calisanlar biliyordu ve GPS verisi onun aracini olay saatinde galeri arkasinda gosteriyor. Telefon kaydi da olay aninda sustugunu, yani orada mesgul oldugunu dogruluyor. Selin gece vardiyasinda baskasiyla goruntulu konusuyordu; Eren ise sehir disindaydi.' },
    [
      { name: 'Eren Yildiz', profession: 'Galeri sahibi', background: 'Araci sigortali. Borclari var ama olay gecesi baska sehirdeki bir dugundeydi.' },
      { name: 'Selin Ak', profession: 'Gece guvenligi', background: 'Kameralari o yonetiyor. Olay sirasinda kayitlar kisa sure kapanmis.' },
      { name: 'Volkan Demir', profession: 'Eski galeri calisani', background: 'Alti ay once kovuldu. Maddi sikintida ve galeriye yakin bir mahallede yasiyor.' }
    ],
    [
      { category: 'camera', title: 'Kamera Kaydi', content: 'Saat 02:10da kameralar 4 dakika boyunca kapaniyor. Yeniden acildiginda araba çoktan gitmis. Kapatma, sistem sifresini bilen biri tarafindan yapilmis.', important: true },
      { category: 'gps', title: 'GPS Verisi', content: 'Volkan Demirin araci olay gecesi 01:50 - 02:40 arasi galerinin arka sokaginda kayitli. Selin ve Erenin araclari evlerinde.', important: true },
      { category: 'phone', title: 'Telefon Kayitlari', content: 'Selin 02:00 - 02:30 arasi annesiyle goruntulu gorusmede. Volkanin telefonu olay aninda hic kullanilmamis (cebe atilmis). Eren baska sehirde baz veriyor.', important: true },
      { category: 'witness', title: 'Tanik Ifadesi', content: 'Bir komsu, galerinin onunde gece geç saatte kirmizi bir ceket gordugunu soyluyor. Ancak mahallede kirmizi cekete sahip onlarca kisi var; bu detay yanlis yonlendirebilir.', misleading: true }
    ], 2);

  // VAKA 2 — Cinayet (Orta: 5 şüpheli, 6 kanıt)
  await _seedCase(
    { title: 'Konaktaki Son Aksam', event_type: 'Cinayet', difficulty: 'medium',
      summary: 'Zengin is adami Kemal Tan, kendi konaginda verdigi yemekli davetin ardindan calisma odasinda olu bulundu. Olum saati gece 23:40 civari. Odanin penceresi iceriden kilitli, kapi ise sadece bir kez acilmis.',
      status_text: 'Supheli olum. Bes davetli ifade veriyor.',
      solution: 'Katil ortagi Tarik Eren. Adli bulgular sarap kadehinde sadece onun parmak izini gosteriyor ve GPS, herkes salondayken onun 23:35te calisma odasi katina ciktigini kaydetmis. Telefon kaydi cinayetten hemen once Kemal ile sert bir tartisma yaptiklarini dogruluyor. Esi Aysenin gozyaslari ve yegenin mirastan pay beklentisi dikkat dagitan detaylar; ikisinin de fiziksel kaniti yok.' },
    [
      { name: 'Ayse Tan', profession: 'Esi', background: 'Evlilikleri sorunluydu. Cinayet duyulunca bayildi. Mirasin buyuk kismi ona kaliyor.' },
      { name: 'Tarik Eren', profession: 'Is ortagi', background: 'Sirkette buyuk bir borc anlasmazligi yasiyorlardi. O aksam Kemal ile bas basa konustu.' },
      { name: 'Deniz Tan', profession: 'Yegeni', background: 'Kumar borclari var, amcasindan surekli para isterdi. Mirastan pay bekliyor.' },
      { name: 'Murat Sahin', profession: 'Asci', background: 'Yemegi o hazirladi. Mutfaktan tum gece cikmadigini soyluyor.' },
      { name: 'Elif Kaya', profession: 'Ozel sekreter', background: 'Kemalin tum islerini bilirdi. O gece notlari toparlamak icin gec saate kadar kaldi.' }
    ],
    [
      { category: 'forensic', title: 'Parmak Izi', content: 'Olen kisinin yanindaki sarap kadehinde sadece Tarik Erenin parmak izi var. Kadeh, olum saatinde doldurulmus.', important: true },
      { category: 'gps', title: 'GPS / Bina Hareketi', content: 'Bina ici giris kayitlarina gore saat 23:35te calisma odasi katina cikan tek kisi Tarik. Digerleri salonda gorunuyor.', important: true },
      { category: 'phone', title: 'Telefon Kaydi', content: 'Kemal ile Tarik arasinda 23:20de 6 dakikalik gergin bir gorusme var. Sesli mesajda yuksek tonda tartisma duyuluyor.', important: true },
      { category: 'witness', title: 'Tanik: Asci', content: 'Murat, Aysenin tum aksam salonda misafirlerle oldugunu dogruluyor. Ayse hic ust kata cikmamis.', important: true },
      { category: 'witness', title: 'Tanik: Garson', content: 'Bir garson, Deniz Tanin amcasiyla yuksek sesle tartistigini gordugunu soyluyor. Ancak bu tartisma aksamin basinda, herkesin onunde olmus; cinayetle baglantisi yok.', misleading: true },
      { category: 'forensic', title: 'Adli Bulgu: Esarp', content: 'Olay odasinda Ayseye ait bir esarp bulundu. Fakat esarp gunler oncesine ait ve odanin her yerinde ev sahiplerinin esyalari var; tek basina kanit degil.', misleading: true }
    ], 1);
}

async function getDetectiveCases() {
  var r = await query("SELECT c.id, c.title, c.event_type, c.summary, c.status_text, c.difficulty, (SELECT COUNT(*) FROM detective_suspects s WHERE s.case_id=c.id) AS suspects, (SELECT COUNT(*) FROM detective_evidence e WHERE e.case_id=c.id) AS evidence FROM detective_cases c WHERE c.active=true ORDER BY c.id");
  return r.rows;
}
async function getDetectiveCase(id) {
  var cr = await query("SELECT id, title, event_type, summary, status_text, difficulty FROM detective_cases WHERE id=$1 AND active=true", [id]);
  if (!cr.rows[0]) return null;
  var c = cr.rows[0];
  c.suspects = (await query("SELECT id, name, profession, background, img FROM detective_suspects WHERE case_id=$1 ORDER BY ord, id", [id])).rows;
  c.evidence = (await query("SELECT id, category, title, content FROM detective_evidence WHERE case_id=$1 ORDER BY ord, id", [id])).rows;
  return c;
}
// Zorluğa göre tahmin hakkı: kolay 3, orta 2, zor 1 (zor mod gerçekten zor olsun)
function detMaxAttempts(difficulty) { return difficulty === 'hard' ? 1 : (difficulty === 'medium' ? 2 : 3); }
async function _detCaseDifficulty(caseId) {
  var r = await query("SELECT difficulty FROM detective_cases WHERE id=$1", [caseId]);
  return r.rows[0] ? r.rows[0].difficulty : 'easy';
}
async function getDetectiveProgress(userId, caseId) {
  var r = await query("SELECT suspect_id, attempt_no, correct, delta FROM detective_guesses WHERE user_id=$1 AND case_id=$2 ORDER BY attempt_no", [userId, caseId]);
  var solved = r.rows.some(function(x){ return x.correct; });
  var maxA = detMaxAttempts(await _detCaseDifficulty(caseId));
  return { attempts: r.rows.length, solved: solved, done: solved || r.rows.length >= maxA, max_attempts: maxA, tried: r.rows.map(function(x){ return x.suspect_id; }) };
}
async function getDetectiveCommunity(caseId, suspectId) {
  var r = await query("SELECT suspect_id, COUNT(*) AS n FROM (SELECT DISTINCT ON (user_id) user_id, suspect_id FROM detective_guesses WHERE case_id=$1 ORDER BY user_id, attempt_no) t GROUP BY suspect_id", [caseId]);
  var total = 0, match = 0;
  r.rows.forEach(function(x){ var n = parseInt(x.n); total += n; if (String(x.suspect_id) === String(suspectId)) match += n; });
  return { total: total, percent: total > 0 ? Math.round(match / total * 100) : 0 };
}
async function _detectiveReveal(caseId, cas, chosenSuspectId) {
  var culprit = null;
  if (cas.culprit_id) { var cr = await query("SELECT id,name,profession,img FROM detective_suspects WHERE id=$1", [cas.culprit_id]); culprit = cr.rows[0] || null; }
  var ev = (await query("SELECT id, category, title, content, important, misleading FROM detective_evidence WHERE case_id=$1 ORDER BY ord, id", [caseId])).rows;
  return {
    reveal: true, culprit: culprit, solution: cas.solution,
    key_evidence: ev.filter(function(e){ return e.important; }),
    misleading_evidence: ev.filter(function(e){ return e.misleading; }),
    community: await getDetectiveCommunity(caseId, chosenSuspectId || cas.culprit_id)
  };
}
async function recordDetectiveGuess(userId, caseId, suspectId) {
  var cr = await query("SELECT id, culprit_id, solution, difficulty FROM detective_cases WHERE id=$1 AND active=true", [caseId]);
  if (!cr.rows[0]) return { error: 'Vaka bulunamadi.' };
  var cas = cr.rows[0];
  var maxA = detMaxAttempts(cas.difficulty);
  var sv = await query("SELECT id FROM detective_suspects WHERE id=$1 AND case_id=$2", [suspectId, caseId]);
  if (!sv.rows[0]) return { error: 'Gecersiz supheli.' };
  var prev = await query("SELECT attempt_no, correct, suspect_id FROM detective_guesses WHERE user_id=$1 AND case_id=$2 ORDER BY attempt_no", [userId, caseId]);
  var attempts = prev.rows.length;
  var alreadySolved = prev.rows.some(function(x){ return x.correct; });
  if (alreadySolved || attempts >= maxA) {
    var lastSus = prev.rows.length ? prev.rows[prev.rows.length - 1].suspect_id : suspectId;
    var rev0 = await _detectiveReveal(caseId, cas, lastSus);
    rev0.completed = true; rev0.already = true; rev0.attempt_no = attempts; rev0.case_points = 0;
    rev0.correct = alreadySolved;
    return rev0;
  }
  var attemptNo = attempts + 1;
  var correct = String(suspectId) === String(cas.culprit_id);
  var delta = correct ? (attemptNo === 1 ? 100 : attemptNo === 2 ? 60 : 30) : -10;
  await query("INSERT INTO detective_guesses (case_id,user_id,suspect_id,attempt_no,correct,delta) VALUES ($1,$2,$3,$4,$5,$6)", [caseId, userId, suspectId, attemptNo, correct, delta]);
  if (correct || attemptNo >= maxA) {
    var sumr = await query("SELECT COALESCE(SUM(delta),0) AS s FROM detective_guesses WHERE user_id=$1 AND case_id=$2", [userId, caseId]);
    var net = Math.max(0, Math.min(100, parseInt(sumr.rows[0].s)));
    try { await saveScore(userId, 'DETECTIVE', net, 100); } catch (e) {}
    var rev = await _detectiveReveal(caseId, cas, suspectId);
    rev.completed = true; rev.correct = correct; rev.attempt_no = attemptNo; rev.delta = delta; rev.case_points = net; rev.max_attempts = maxA;
    return rev;
  }
  return { completed: false, correct: false, attempt_no: attemptNo, delta: delta, remaining: maxA - attemptNo, max_attempts: maxA };
}
async function getDetectiveStats(userId) {
  var r = await query("SELECT case_id, MAX(CASE WHEN correct THEN 1 ELSE 0 END) AS solved, MIN(CASE WHEN correct THEN attempt_no ELSE 99 END) AS fca FROM detective_guesses WHERE user_id=$1 GROUP BY case_id", [userId]);
  var solved = 0, perfect = 0;
  r.rows.forEach(function(x){ if (parseInt(x.solved) === 1) { solved++; if (parseInt(x.fca) === 1) perfect++; } });
  return { solved: solved, perfect: perfect };
}

// — Admin —
async function adminGetDetectiveCases() {
  var r = await query("SELECT c.id, c.title, c.event_type, c.difficulty, c.active, c.culprit_id, (SELECT COUNT(*) FROM detective_suspects s WHERE s.case_id=c.id) AS suspects, (SELECT COUNT(*) FROM detective_evidence e WHERE e.case_id=c.id) AS evidence FROM detective_cases c ORDER BY c.id DESC");
  return r.rows;
}
async function adminGetDetectiveCase(id) {
  var cr = await query("SELECT * FROM detective_cases WHERE id=$1", [id]);
  if (!cr.rows[0]) return null;
  var c = cr.rows[0];
  c.suspects = (await query("SELECT * FROM detective_suspects WHERE case_id=$1 ORDER BY ord,id", [id])).rows;
  c.evidence = (await query("SELECT * FROM detective_evidence WHERE case_id=$1 ORDER BY ord,id", [id])).rows;
  return c;
}
async function upsertDetectiveCase(d) {
  if (d.id) {
    await query("UPDATE detective_cases SET title=$1,event_type=$2,summary=$3,status_text=$4,difficulty=$5,solution=$6,active=$7,culprit_id=$8 WHERE id=$9",
      [d.title, d.event_type || '', d.summary || '', d.status_text || '', d.difficulty || 'easy', d.solution || '', d.active !== false, d.culprit_id || null, d.id]);
    return { id: d.id };
  }
  var r = await query("INSERT INTO detective_cases (title,event_type,summary,status_text,difficulty,solution,active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [d.title, d.event_type || '', d.summary || '', d.status_text || '', d.difficulty || 'easy', d.solution || '', d.active !== false]);
  return { id: r.rows[0].id };
}
async function deleteDetectiveCase(id) { await query("DELETE FROM detective_cases WHERE id=$1", [id]); }
async function upsertDetectiveSuspect(d) {
  var name = d.name || '', img = d.img || '', charId = d.char_id ? parseInt(d.char_id) : null;
  if (charId) {
    var ch = await query("SELECT name, surname, img FROM characters WHERE id=$1", [charId]);
    if (ch.rows[0]) { name = ((ch.rows[0].name || '') + ' ' + (ch.rows[0].surname || '')).trim(); img = ch.rows[0].img || ''; }
  }
  if (d.id) { await query("UPDATE detective_suspects SET char_id=$1,name=$2,profession=$3,background=$4,img=$5,ord=$6 WHERE id=$7", [charId, name, d.profession || '', d.background || '', img, d.ord || 0, d.id]); return { id: d.id }; }
  var r = await query("INSERT INTO detective_suspects (case_id,char_id,name,profession,background,img,ord) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", [d.case_id, charId, name, d.profession || '', d.background || '', img, d.ord || 0]);
  return { id: r.rows[0].id };
}
async function deleteDetectiveSuspect(id) {
  await query("UPDATE detective_cases SET culprit_id=NULL WHERE culprit_id=$1", [id]);
  await query("DELETE FROM detective_suspects WHERE id=$1", [id]);
}
async function upsertDetectiveEvidence(d) {
  if (d.id) { await query("UPDATE detective_evidence SET category=$1,title=$2,content=$3,important=$4,misleading=$5,ord=$6 WHERE id=$7", [d.category || 'other', d.title || '', d.content || '', !!d.important, !!d.misleading, d.ord || 0, d.id]); return { id: d.id }; }
  var r = await query("INSERT INTO detective_evidence (case_id,category,title,content,important,misleading,ord) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id", [d.case_id, d.category || 'other', d.title || '', d.content || '', !!d.important, !!d.misleading, d.ord || 0]);
  return { id: r.rows[0].id };
}
async function deleteDetectiveEvidence(id) { await query("DELETE FROM detective_evidence WHERE id=$1", [id]); }

async function getDetectiveRevealForUser(userId, caseId) {
  var cr = await query("SELECT id, culprit_id, solution FROM detective_cases WHERE id=$1", [caseId]);
  if (!cr.rows[0]) return null;
  var g = await query("SELECT suspect_id FROM detective_guesses WHERE user_id=$1 AND case_id=$2 ORDER BY attempt_no DESC LIMIT 1", [userId, caseId]);
  var chosen = g.rows[0] ? g.rows[0].suspect_id : cr.rows[0].culprit_id;
  var rev = await _detectiveReveal(caseId, cr.rows[0], chosen);
  rev.your_pick = chosen;
  return rev;
}
// Yayıncı modu: kaydetmeden doğru/yanlış + tam reveal döndürür (skora yazmaz)
async function getDetectiveStreamReveal(caseId, suspectId, attempt) {
  var cr = await query("SELECT id, culprit_id, solution, difficulty FROM detective_cases WHERE id=$1 AND active=true", [caseId]);
  if (!cr.rows[0]) return { error: 'Vaka bulunamadi.' };
  var cas = cr.rows[0];
  var sv = await query("SELECT id FROM detective_suspects WHERE id=$1 AND case_id=$2", [suspectId, caseId]);
  if (!sv.rows[0]) return { error: 'Gecersiz supheli.' };
  var correct = String(suspectId) === String(cas.culprit_id);
  var MAX = cas.difficulty === 'hard' ? 1 : 2; // zor modda TEK suçlama hakkı
  var att = parseInt(attempt) || 1;
  // İlk yanlış tahminde çözümü/suçluyu SIZDIRMA — sadece yanlış olduğunu bildir
  if (!correct && att < MAX) return { correct: false, final: false, attempt: att, remaining: MAX - att, max_attempts: MAX };
  var rev = await _detectiveReveal(caseId, cas, suspectId);
  rev.correct = correct;
  rev.final = true;
  rev.attempt = att;
  rev.max_attempts = MAX;
  return rev;
}

// ═══════════════════════════════════════════════════
// DEDEKTİF — 30 VAKA (şüpheliler/tanıklar gerçek karakterlerden atanır)
// {S1..Sn} = şüpheli karakterler, {W1..W2} = tanık karakterleri
//
// TASARIM KURALLARI (v2 — "kanıt suçluyu söylemez"):
// 1) Hiçbir kanıt faili doğrudan göstermez; kanıtlar nitelik, saat,
//    eşya ve bilgi verir, ismi oyuncu çıkarır.
// 2) Hiçbir şüpheli tek bir kanıtla %100 aklanmaz; mazeretler kısmi,
//    doğrulanamaz ya da birbirine bağlıdır.
// 3) Suçlu yalnızca 2-4 bağımsız kısıtın KESİŞİMİYLE bulunur; her kısıt
//    tek başına birden çok şüpheliye uyar.
// 4) Her vakada yüzeysel okumada daha suçlu görünen en az bir tuzak
//    şüpheli vardır; tuzağı çözen detay başka bir kanıtta saklıdır.
// 5) important=1: çıkarım zincirinin halkası · misleading=1: tuzak.
// ═══════════════════════════════════════════════════
var DET_CASES = [
  // ───────── KOLAY (10): 3 şüpheli · 4 kanıt · iki kanıtı birleştirmeden çözülmez ─────────
  { t:"Gece Yarısı Galerisi", e:"Araç Hırsızlığı", d:"easy", st:"Fail bulunamadı; üç kişi sorgulanıyor, kimse itiraf etmiyor.", nS:3, nW:1, c:1,
    sum:"Gece 02:15'te lüks bir galeriden spor araba çalındı. Alarm tek denemede kapatılmış, kapıda zorlama yok. Araç arka servis kapısından çıkarılmış. Kimin yaptığını hiçbir kayıt doğrudan söylemiyor; kayıtların ne ANLAMA geldiğini sen çözeceksin.",
    sol:"Suçlu {S2}. Alarm, geçen salı değiştirilen ve yalnızca aktif personelle paylaşılan şifreyle tek denemede kapatıldı — altı ay önce ayrılan {S3} bu şifreyi bilemezdi. Arka kapıyı açan kart N serisiydi; N serisi kartlar gece vardiyasına verilir, yönetim A serisi taşır — bu da galeri sahibi {S1}'i dışarıda bırakır. Yeni şifreyi bilen VE N serisi kart taşıyan tek kişi gece nöbetçisi {S2}'dir. {S3}'ün gece sokakta görülmesi yanıltıcıydı; zaten iki sokak ötede oturuyor.",
    S:[["Galeri sahibi","Aracın sigorta bedeli yüksek; o gece başka şehirde bir düğünde olduğunu söylüyor ama bunu doğrulayan yok. Kartı A serisi yönetim kartı."],["Gece güvenliği","O gece tek başına nöbetteydi; 'turdaydım, bir şey görmedim' diyor. Maaşının üç aydır geciktiği biliniyor."],["Eski galeri çalışanı","Altı ay önce kovuldu; galeriye iki sokak mesafede oturuyor ve borçları var."]],
    E:[["phone","Alarm Logu","Alarm 02:11'de TEK denemede, geçen salı değiştirilen yeni şifreyle kapatılmış. Yeni şifre yalnızca hâlâ çalışan personelle paylaşılmıştı.",1,0],
       ["other","Geçiş Kaydı","Arka servis kapısı 02:19'da N serisi bir kartla açılmış. Not: N serisi kartlar gece vardiyası personeline, A serisi kartlar yönetime verilir.",1,0],
       ["witness","Tanık {W1}","02:20 sularında kapı motorunun sessizce çalıştığını duydum; kırma, levye, cam sesi yoktu. İçeriden açar gibi.",0,0],
       ["other","Mahalle İhbarı","{S3} gece yarısı galerinin sokağında görülmüş; kendisi 'evime yürüyordum' diyor.",0,1]] },

  { t:"Pazar Yerinde Kapkaç", e:"Kapkaç", d:"easy", st:"Çanta kalabalıkta kapıldı; fail dar koridorlarda kayboldu.", nS:3, nW:1, c:2,
    sum:"Kalabalık semt pazarında 16:55'te bir kadının çantası kapıldı. Fail balık koridoruna dalıp gözden kayboldu. Kovalamaya çalışanlar koridorun sonunun duvar olduğunu sanıyordu — ama fail bir daha görülmedi.",
    sol:"Suçlu {S3}. Balık koridorunun sonu yükleme kapısına çıkar ve o kapı yalnızca 16:45–17:15 arasında kamyonlar için açılır; olayın tam o pencerede olması failin pazarı içeriden bildiğini gösterir. Buzlu zemindeki çelik burunlu bot izi, sandaletle tezgâhta duran {S1}'e değil, kasa taşırken bot giyen hamala uyar. {S2}'nin duvar boyunca koşması ilk bakışta şüpheli ama olay ANINDA dış duvardaydı, yani içeride çantayı kapan o olamaz — her akşamki antrenmanı.",
    S:[["Seyyar satıcı","Tezgâhını olay noktasının on metre yakınına kurar; gün boyu sandaletle çalışır; daha önce zabıtayla kavgası olmuş."],["İşsiz genç","Her akşam pazarın dış duvarı boyunca koşu antrenmanı yapar; ciddi para sıkıntısı çekiyor."],["Pazar hamalı","Kasaları yükleme kapısından taşır; çelik burunlu bot giyer; kumar borcu olduğu konuşuluyor."]],
    E:[["other","Kaçış Yolu","Fail balık koridoruna daldı. Koridorun sonu yükleme kapısına çıkar; bu kapı YALNIZCA 16:45–17:15 arası kamyon giriş-çıkışı için açık tutulur. Olay 16:55'te oldu.",1,0],
       ["forensic","Bot İzi","Buz havuzunun kenarındaki ıslak zeminde derin, çelik burunlu bir bot izi bulundu; iz taze.",1,0],
       ["camera","Park Kamerası","{S2}, 16:53–16:58 arasında pazarın DIŞ duvarı boyunca koşarken görüntülenmiş.",0,1],
       ["witness","Tanık {W1}","Kaçan kişi kalabalıkta kimseye çarpmadan, ara geçitleri ezbere bilir gibi koşuyordu.",1,0]] },

  { t:"Köşedeki Bakkal", e:"Dükkan Soygunu", d:"easy", st:"Kasa gece boşaltıldı; kapı anahtar kopyasıyla açılmış.", nS:3, nW:1, c:2,
    sum:"Mahalle bakkalının kasası gece boşaltıldı. Kapı zorlanmamış. Fail içeriyi iyi tanıyor gibi: kasanın gizli bölmesini bile bulmuş. Ama bir tuzağa da basmış.",
    sol:"Suçlu {S3}. Fail çekmecenin ALTINDAKİ gizli bölmeyi biliyordu — bunu yalnızca kasada çalışmış biri bilir; komşu esnaf {S2} elenir. Ama aynı fail, geçen hafta sigara rafının önüne döşenen sessiz basınç pedine bastı; yani dükkânın YENİ düzeninden habersizdi. Pedi bilen ortak {S1} ona basmazdı. Eski düzeni ezbere bilen ama altı aydır içeri girmeyen tek kişi eski çırak {S3}. Köpeğin hiç havlamaması da tanıdık birini doğruluyor.",
    S:[["Bakkalın ortağı","Akşam kasasını her gün o sayar; tedarikçilere borcu birikmiş. Geçen haftaki ped montajında dükkândaydı."],["Komşu esnaf","Yan dükkânın sahibi; bakkala sık girip çıkar ama tezgâhın arkasına hiç geçmez."],["Eski çırak","Altı ay önce ayrıldı; yıllarca kasada çalıştı; hâlâ aynı mahallede oturuyor ve iş arıyor."]],
    E:[["other","Gizli Bölme","Kasa çekmecesinin altındaki gizli bölme de boşaltılmış. Bu bölmeyi ancak kasada fiilen çalışmış biri bilebilir.",1,0],
       ["phone","Sessiz Alarm","Sigara rafının önüne GEÇEN HAFTA döşenen sessiz basınç pedi 03:12'de tetiklenmiş; fail pedin varlığından habersizdi.",1,0],
       ["witness","Tanık {W1}","Gece içeride bir ışık yanıp söndü; ama bakkalın köpeği bir kez bile havlamadı.",1,0],
       ["other","Borç Defteri","{S1}'in tedarikçilere ciddi borcu var; kasayı da en son hep o sayıyor.",0,1]] },

  { t:"Sahte Çağrı", e:"Telefon Dolandırıcılığı", d:"easy", st:"Yaşlı bir kadın telefonla kandırıldı; hat sahibi 'telefonum kayıp' diyor.", nS:3, nW:1, c:0,
    sum:"Yaşlı bir kadın, kendini banka görevlisi olarak tanıtan birine tüm parasını kaptırdı. Arama, {S3}'e kayıtlı bir hattan yapılmış — ama {S3} telefonunu geçen hafta kaybettiğini iddia ediyor. Hattın sahibi mi suçlu, yoksa telefonu bulan mı?",
    sol:"Suçlu {S1}. Hat {S3}'e kayıtlı ama telefon bir hafta önce mağdurun apartmanını ziyaret ederken kaybolmuştu ve arama anında sinyal tam o bloklardan geldi — {S3} ise şehrin öbür ucunda oturuyor. Arayan kişi maaş gününü ve şube adını biliyordu; mağdur bunları apartman merdiveninde komşularıyla konuşuyor. Hatta kontör yükleyen kişi büfecinin 'her sabah sigara almaya gelen müdavim genç' tarifine uyuyor. Merdiven sohbetini duyan, telefonu bulabilecek ve o büfenin müdavimi olan tek isim komşu {S1}. Sesin 'profesyonel' gelmesi {S2}'yi düşündürtüyor ama onu mahalleye bağlayan tek iz yok.",
    S:[["Komşu genç","Mağdurla aynı blokta oturur; köşedeki büfenin her sabahki müşterisi; aylardır işsiz."],["Eski tahsilatçı","Yıllarca telefonla tahsilat yaptı; ikna kabiliyeti dillere destan. Mahallede oturmuyor, mağduru tanımıyor."],["Akraba","Mağdurun yeğeni; şehrin öbür ucunda oturur. Geçen hafta teyzesini ziyarete geldiğinde telefonunu apartmanda düşürdüğünü söylüyor."]],
    E:[["phone","Numara Tespiti","Arama {S3} adına kayıtlı bir hattan yapılmış; {S3} telefonunu geçen haftaki ziyarette kaybettiğini iddia ediyor.",0,1],
       ["gps","Baz Verisi","Arama anında hat, MAĞDURUN oturduğu blokları kapsayan baz istasyonundan sinyal vermiş.",1,0],
       ["witness","Tanık {W1} (büfeci)","O hatta kontörü benden aldılar; alan kişi her sabah sigara almaya gelen müdavim bir gençti.",1,0],
       ["other","Konuşma Detayı","Arayan, maaş gününü ve şube adını biliyordu. Mağdur bu detayları apartman merdiveninde komşularıyla sohbet ederken sık sık anlatıyormuş.",1,0]] },

  { t:"Apartman Otoparkı", e:"Motosiklet Hırsızlığı", d:"easy", st:"Kapalı otoparktan motosiklet, bariyer hiç açılmadan kayboldu.", nS:3, nW:1, c:1,
    sum:"Pahalı bir motosiklet kapalı otoparktan çalındı ama bariyer kaydı o gece hiç açılmamış. Motosiklet iz bırakmadan buharlaşmadı — başka bir yoldan, iterek çıkarıldı.",
    sol:"Suçlu {S2}. Motosiklet depo koridorundan iterek çıkarıldı ve kapı arkadan yeniden kilitlendi; o koridorun anahtarı yalnızca depo kiracılarında ve bina görevlisinde var — bu, depo kiralamayan {S1}'i dışarıda bırakır. İzler 04:40–05:05 aralığına ait (05:05'te otomatik sulama zemini ıslatıyor, izler kuru zeminde). Oysa {S3}'ün aracı 04:10'da çıkmış ve ne araç kartı ne yaya fobu sabaha kadar yeniden giriş göstermiyor — o pencerede binada değildi. Koridor anahtarı olup içeride kalan tek kişi: bina görevlisi {S2}. Kafesteki motor parçaları eski ilanlara ait, yanıltıcı.",
    S:[["Üst kat komşusu","Motosiklet sahibiyle park yeri yüzünden iki kez tartışmıştı; depo kafesi kiralamıyor."],["Bina görevlisi","Tüm ortak alan anahtarları onda; maaşının üç aydır düzensiz yattığından yakınıyor."],["Yeni kiracı","Depo kafesi kiralıyor; internette ikinci el motor parçası satıyor; o sabah erkenden şehir dışına çıktığını söylüyor."]],
    E:[["other","Toz İzleri","Motosiklet bariyerden değil, depo koridorundan İTEREK çıkarılmış; koridor kapısı çıkıştan sonra yeniden kilitlenmiş. Bu koridorun anahtarı yalnızca depo kiracılarında ve bina görevlisindedir.",1,0],
       ["gps","Kart ve Fob Kayıtları","{S3}'ün aracı 04:10'da siteden çıkmış; araç kartı da yaya fobu da sabaha kadar YENİDEN GİRİŞ göstermiyor. Tekerlek izleri 04:40–05:05 aralığına tarihleniyor (05:05'teki otomatik sulamadan önce, kuru zemine basılmış).",1,0],
       ["witness","Tanık {W1}","Sabaha karşı koridorda birinin ağır bir şeyi ittiğini duydum; sonra kapı iki kez kilit sesi çıkardı.",0,0],
       ["other","Depo Kafesi","{S3}'ün kafesinde ikinci el motor parçaları bulundu; kendisi bunları aylardır internetten sattığını söylüyor, ilan tarihleri eski.",0,1]] },

  { t:"Kayıp Tasma", e:"Kayıp Köpek", d:"easy", st:"Pahalı cins köpek parktan alındı; tasması bankta bulundu.", nS:3, nW:1, c:0,
    sum:"Bir ailenin cins köpeği parkta kayboldu. Akıllı tasması bankın üzerinde, özenle sökülmüş hâlde bulundu. Kaybolduğunu bildiren kişi de şüpheliler arasında.",
    sol:"Suçlu {S1}. Tasma, markaya özel iki uçlu anahtarla zarar verilmeden söküldü — bu anahtarın yedeği gezdiricinin çantasında durur. Daha önemlisi {S1}, köpeğin 18:10'da çeşme meydanında kaçtığını söylüyor; oysa tasma verisi 17:42'den itibaren DOĞU kapısında sabitti, yani anlattığı hikâye verilerle çelişiyor. Tanığın 17:50'de gördüğü 'köpeğin tanıdığı, yanında sakin yürüdüğü kişi' de tabloyu tamamlıyor. {S2}'nin satış ilanları parlak bir şüphe ama tasmayı zarar vermeden açacak anahtar onda yok; {S3} batı girişindeki kulübedeydi ve doğu kapısı 900 metre uzakta.",
    S:[["Köpek gezdiricisi","Ailenin köpeğini iki yıldır gezdiriyor; markaya özel yedek tasma anahtarı onun çantasında durur; geçen ay başka bir müşterisini kaybetti, geliri düştü."],["Komşu","Hayvan alıp sattığı biliniyor; her gün bu parkta yürüyüş yapar."],["Park görevlisi","Batı girişindeki kulübede bilet keser; doğu kapısına nadiren gider."]],
    E:[["other","Tasma Verisi","Akıllı tasma 17:42–17:55 arasında DOĞU kapısında sabit sinyal vermiş; 17:55'te sökülerek kapanmış. Tasma, markaya özel iki uçlu anahtarla, zarar verilmeden açılmış hâlde bankta bulundu.",1,0],
       ["phone","İfade Tutanağı","{S1} ifadesinde köpeğin 18:10'da ÇEŞME MEYDANINDA tasmasını koparıp kaçtığını söylüyor.",1,0],
       ["witness","Tanık {W1}","17:50 civarı doğu kapısında köpeği gördüm; tanıdığı birinin yanında, gayet sakin yürüyordu.",1,0],
       ["other","Satış İlanları","{S2} geçen ay internette üç ayrı 'cins yavru' ilanı vermiş; her gün parkta dolaştığı da doğru.",0,1]] },

  { t:"Markette Eksik Para", e:"Hırsızlık", d:"easy", st:"Kasadan değil, kasaya GİDERKEN para eksiliyor.", nS:3, nW:1, c:1,
    sum:"Bir markette günlük hesaplar tutmuyor. İlginç olan şu: yazarkasa raporları fişlerle bire bir doğru — eksik, para çelik kasaya konduğunda ortaya çıkıyor. Para iki nokta arasında bir yerde buharlaşıyor.",
    sol:"Suçlu {S2}. Para tezgâhta değil, tezgâhtan çelik kasaya giden yolda kayboluyor ve eksik çıkan her gün çelik kasa, arka odadaki acil kolla 13:50'de erken açılmış — o kol depo alet dolabında durur. {S1} o saatlerde birkaç dakikada bir fiş kesiyordu, tezgâhtan ayrılamazdı; {S3} ise eksik günlerin ikisinde izindeydi, yani süreklilik ona uymuyor. Alet dolabına hâkim olup öğlen arka koridoru kullanan tek kişi depo görevlisi {S2}. Yeni telefon dedikodusu sadece dedikodu.",
    S:[["Kasiyer","Gün boyu yazarkasanın başında; geçen ay taksitle yeni telefon aldı, mahallede konuşuluyor."],["Depo görevlisi","Alet dolabı onun sorumluluğunda; öğle saatlerinde arka ofis koridorunu kullanır; ev sahibiyle kira davası var."],["Reyon görevlisi","Rafları düzenler; eksik çıkan günlerin ikisinde yıllık izindeydi."]],
    E:[["phone","Kasa-Kasa Farkı","Yazarkasa raporları fişlerle bire bir tutuyor; eksik, para ÇELİK kasaya konduğunda ortaya çıkıyor. Yani para tezgâh ile çelik kasa arasında kayboluyor.",1,0],
       ["other","Kasa Saati","Çelik kasa normalde 14:00'te açılır; eksik çıkan günlerin HEPSİNDE arka odadaki acil kolla 13:50'de elle erken açılmış. Kol, depo alet dolabında durur.",1,0],
       ["phone","Fiş Dökümü","Eksik çıkan günlerde 13:30–14:30 arasında yazarkasadan birkaç dakikada bir fiş kesilmiş; kasiyer koltuğu boş kalmamış.",1,0],
       ["witness","Tanık {W1}","{S1} geçen ay yeni telefon aldı; 'eli bollaştı' diye konuşuluyor mahallede.",0,1]] },

  { t:"Boş Duvar", e:"Vandalizm", d:"easy", st:"Yeni boyanan okul duvarı şablonla karalandı.", nS:3, nW:1, c:0,
    sum:"Belediyenin yeni boyadığı okul duvarına gece, şablonla basılmış bir yazı bırakıldı. Yazı müdürle alay ediyor — ve yalnızca okulun içindekilerin anlayacağı bir olaya gönderme yapıyor.",
    sol:"Suçlu {S1}. Yazı serbest elle değil, lazer kesim şablonla basılmış — {S3}'ün bilinen bütün işleri serbest el, tarz tutmuyor. Aynı desende şablonlar okulun resim atölyesinde duruyor ve atölye o akşam 11-A serisinden bir öğrenci kartıyla açılmış. Yazının içeriği de yalnızca öğrencilerin bildiği 'B koridoru süpürge dolabı' olayına gönderme yapıyor. 11-A'da okuyan, resim kulübünde olan ve müdürle disiplin meselesi yaşayan tek isim {S1}. Gece görülen 'spreyli adam' söylentisi {S3}'ü hedef gösteriyordu ama şablona da atölyeye de erişimi yok.",
    S:[["Mahalleli öğrenci","11-A sınıfında okuyor, resim kulübü üyesi; geçen dönem müdürle disiplin meselesi yaşadı."],["Komşu genç","Okulla ilgisi yok; akşamları halı sahada top oynar; daha önce duvar yazısıyla anılmamış."],["Sokak çizeri","Serbest elle, kıvrımlı imza işleriyle tanınır; izinsiz duvar boyamaktan iki kez uyarı aldı."]],
    E:[["forensic","Şablon İzi","Yazı, lazer kesim bir şablonla TEK seferde basılmış; kenarlarda taşma yok. Aynı desende şablonlar okulun resim atölyesinde saklanıyor.",1,0],
       ["other","Atölye Kaydı","Atölye o akşam etüt anahtarıyla açılmış; anahtarı alırken okutulan kart 11-A sınıf serisinden, imza ise karalanıp okunmaz hâlde.",1,0],
       ["other","Yazının İçeriği","Duvardaki espri, yalnızca öğrencilerin bildiği 'B koridoru süpürge dolabı' olayına gönderme yapıyor.",1,0],
       ["witness","Tanık {W1}","Geceleri duvar diplerinde sprey kutulu biri dolaşıyor; {S3} bu mahallede meşhurdur, ondan bilirim.",0,1]] },

  { t:"Otobüste Cüzdan", e:"Yankesicilik", d:"easy", st:"Kalabalık otobüste cüzdan kayboldu; boş hâlde araçta bulundu.", nS:3, nW:1, c:2,
    sum:"Tıka basa dolu bir otobüste yolcunun cüzdanı cebinden alındı. Cüzdan daha sonra boşaltılmış hâlde otobüsün İÇİNDE bulundu — fail parayı alıp cüzdanı saklamış ve normal yolcu gibi inmiş.",
    sol:"Suçlu {S3}. Cüzdan 4. durak (büfe alışverişi) ile 6. durak arasında, arka kapıdan bebek arabası binerken yaşanan izdihamda alındı ve ARKA kalorifer ızgarasına saklandı — yani fail arka platformdaydı; ön kapı direğindeki {S1} bu yüzden uzak kalıyor, eski gözaltı söylentisi yanıltıcı. Ertesi sabah cüzdandaki ulaşım kartının 07:06'da SANAYİ durağında okutulması, o duraktan her sabah binen düzenli yolcuyu işaret ediyor: {S3}. Emekli {S2} sabahları torun bakıyor; o saatte o durakta işi yok.",
    S:[["Ayakta yolcu","Ön kapı direğinde yolculuk ediyordu; iki yıl önce yankesicilik şüphesiyle gözaltına alınıp serbest bırakılmış."],["Oturan yolcu","Arka bankta oturan emekli; pazar arabasıyla biner, sabahları torunlarına bakar."],["Düzenli yolcu","Her sabah 07:00 sularında Sanayi durağından binip işe gider; o akşam arka kapı bölgesinde ayaktaydı; kredi kartı borcunu yeni yapılandırmış."]],
    E:[["other","Zaman Aralığı","Mağdur cüzdanını 4. durakta büfede kullandı, 6. durakta yokluğunu fark etti. Arada yalnızca arka kapıdan bir bebek arabası bindi ve ARKA platformda kısa bir izdiham yaşandı.",1,0],
       ["forensic","Cüzdan","Boşaltılmış cüzdan, arka kalorifer ızgarasının arkasına sıkıştırılmış hâlde bulundu.",1,0],
       ["phone","Kart Hareketi","Cüzdandaki ulaşım kartı ertesi sabah 07:06'da aynı hattın SANAYİ durağında okutulmuş.",1,0],
       ["witness","Tanık {W1}","İzdiham sırasında öndeki direkte duran genç ({S1}) mağdura doğru yaslanmıştı, gözüm ondaydı.",0,1]] },

  { t:"Konser Kapısı", e:"Sahte Bilet Dolandırıcılığı", d:"easy", st:"Onlarca kişi sahte biletle kapıdan döndü; satıcı 'ben de aldım' diyor.", nS:3, nW:1, c:2,
    sum:"Kapalı gişe bir konserde onlarca kişi sahte biletle içeri alınmadı. Biletleri kapı önünde satan adam belli — ama o 'bana toplu getiren oldu' diyor. Soru şu: sahteleri kim ÜRETTİ?",
    sol:"Sahteleri üreten {S3}. Kopyalanan biletlerin tamamı yalnızca CUMA günü gişeden satılan C blok serisi — internette hiç satılmayan bu blokun verisi gişeden sızdı. Sahteler gişedeki termal yazıcının rulosuna basılmış ve baskı üstbilgisi cuma 13:11'i gösteriyor; o gün gişe vardiyası tek kişilikti. {S1} satışı yapan görünür yüz ama baskı saatinde şehir dışındaydı ve gişe yazıcısına erişimi yok — onu suçlamak kolay tuzak. {S2} ise bileti kopyalanan müşterilerden biri.",
    S:[["Bilet karaborsacısı","Kapı önünde nakit satış yaptı; cuma akşamüstüne kadar başka şehirde olduğunu, biletleri 'toplu getiren birinden' aldığını söylüyor."],["Konser izleyicisi","C blok biletini cuma günü gişeden alan gruptan; turnikeden sorunsuz geçti."],["Gişe görevlisi","Konser organizasyonunda çalışıyor; cuma günü gişede TEK BAŞINA vardiyadaydı; kart borçları olduğu konuşuluyor."]],
    E:[["other","Klon Desen","Sahte biletlerin tamamı, yalnızca cuma günü gişeden satılan C blok biletlerinin kopyası. Bu blok internette hiç satışa açılmadı; veri gişeden sızmış olmalı.",1,0],
       ["forensic","Baskı Analizi","Sahteler, gişedeki termal yazıcının rulosuyla aynı kâğıda basılmış; baskı üstbilgisi CUMA 13:11'i gösteriyor.",1,0],
       ["other","Mesai Çizelgesi","Cuma günü gişe vardiyası tek kişilikti; yazıcıya mesai dışında erişim yok.",1,0],
       ["witness","Tanık {W1}","Biletleri kapıda {S1} satıyordu, elimle para verdim. 'Bana toplu getiren oldu' deyip duruyor.",0,1]] },

  // ───────── ORTA (10): 5 şüpheli · 8 kanıt · kısmi mazeretler, güçlü tuzaklar ─────────
  { t:"Konaktaki Son Akşam", e:"Cinayet", d:"medium", st:"Kadeh zehirliydi; beş kişiden hiçbirinin mazereti tam değil.", nS:5, nW:1, c:4,
    sum:"Zengin bir iş adamı, konağındaki davetin ardından çalışma odasında ölü bulundu. Zehir, her gece tek başına içtiği likör kadehinin İÇİNE önceden sürülmüştü. Herkesin bir hikâyesi var; hikâyelerden biri kurgu.",
    sol:"Katil {S5}. Zehir kadehe, kadeh 22:15'te yıkanıp kurutulduktan SONRA ince film hâlinde sürüldü; bunun için 22:30 tepsi servisi ile kurbanın odaya girdiği 23:10 arasında içeri girmek gerekiyordu ve koridor sensörü 22:47'de kimliği belirsiz bir giriş kaydetti. 22:50'de çekilen salon fotoğrafında olmayan iki kişi var: terasta sigara içtiğini söyleyen {S2} ve 'kütüphanede e-posta yazan' {S5}. Ne var ki e-postanın üstverisi 'zamanlanmış gönderim' gösteriyor — ileti 21:58'de yazılıp 22:45'e kurulmuş, yani mazeret önceden imal edilmiş. Terastaki taze izmaritler {S2}'yi destekliyor. Kadehteki nitril eldiven dokusu da mutfağın pamuklu eldivenlerini değil, üst kat ofis çekmecesini kullanan sekreteri işaret ediyor. Miras tartışması ve {S3}'ün reddedilen borç mesajı gürültülü ama boş izler.",
    S:[["Eşi","Evlilikleri sorunluydu; mirasın büyük kısmı ona kalıyor. Akşamın başında kurbanla kısa ve sert bir tartışma yaşadı."],["İş ortağı","Şirkette borç anlaşmazlığı vardı; fotoğraf çekilirken terasta sigara içtiğini söylüyor."],["Yeğeni","Kumar borçları var; o akşam 21:30'da amcasından son kez borç istedi, reddedildi."],["Aşçı","Yemeği o hazırladı; 22:30'da çalışma odasına likör tepsisini bırakan da o. Sonrasında tatlı servisindeydi."],["Özel sekreter","Kurbanın işlerini bilir; o akşam 'kütüphanede e-postaları bitiriyordum' diyor. Üst kat ofis malzemelerinden o sorumlu."]],
    E:[["forensic","Kadeh Analizi","Zehir şişede değil; kadehin iç çeperine, kadeh 22:15'te yıkanıp kurutulduktan SONRA ince film hâlinde sürülmüş.",1,0],
       ["other","Koridor Sensörü","Çalışma odası koridoru üç kez tetiklenmiş: 22:30 (tepsi servisi), 22:47 (kimliği belirsiz) ve 23:10 (kurban).",1,0],
       ["camera","Salon Fotoğrafı","Bir konuğun 22:50'de çektiği fotoğrafta {S1}, {S3} ve tatlı servisi yapan {S4} net görülüyor; {S2} ve {S5} karede yok.",1,0],
       ["phone","E-posta Üstverisi","{S5}'in 22:45'te kütüphaneden gönderilmiş görünen e-postasında 'zamanlanmış gönderim' etiketi var; ileti 21:58'de yazılmış.",1,0],
       ["other","Teras İzi","Terasta {S2}'nin içtiği markadan iki taze izmarit ve yarısı içilmiş bir kahve bulundu.",1,0],
       ["forensic","Eldiven Dokusu","Kadehteki filmde NİTRİL eldiven dokusu var. Mutfakta pamuklu eldiven kullanılıyor; nitril eldivenler üst kat ofis çekmecesinde duruyor.",1,0],
       ["phone","Borç Mesajı","{S3}, 21:30'da kurbandan 'son kez' borç istemiş ve ret cevabı almış; mesajlaşma öfkeli bitiyor.",0,1],
       ["witness","Tanık {W1} (garson)","Yemek başlarken {S1} ile kurban kısa ama sert tartıştı; 'miras' kelimesini duydum.",0,1]] },

  { t:"Vitrindeki Boşluk", e:"Kuyumcu Soygunu", d:"medium", st:"Kasa, sabah değiştirilen şifreyle ilk denemede açıldı.", nS:5, nW:1, c:1,
    sum:"İşlek bir kuyumcu öğle molasında soyuldu. Kasa şifresi aynı sabah değiştirilmişti ve kimseyle paylaşılmamıştı — ama soyguncu şifreyi İLK denemede doğru girdi. Şifreyi nasıl öğrendi?",
    sol:"Soyguncu {S2}. Sabah değiştirilen şifre kimseye söylenmedi ama tuş takımı, koridor aynasından YALNIZCA cila tezgâhında oturan birinin görebileceği açıda yansıyor — ve her sabah 09:00–09:30 arası o tezgâhta oturan kişi tezgâhtar. Soygun anında içeri giren silüet, anahtarı yalnız sahibi, tezgâhtar ve güvenlikte olan servis koridorunu kullandı; tanık lacivert iş önlüğü gördü. Önlük giyen iki kişiden {S5} o dakikalarda bankada fatura ödüyordu ve koridor anahtarı yok. Anahtar + önlük + ayna bilgisi tek isimde kesişiyor. Sahibinin yeni sigortası ve muhasebecinin reddedilen kasa talebi kulağa hoş gelen ama kapı açmayan şüpheler; güvenliğin erken çıkışı da telefon baz kaydıyla sahil yoluna düşüyor.",
    S:[["Kuyumcu sahibi","Şifreyi o sabah kendisi değiştirdi; sigorta poliçesini geçen ay yükselttiği ortaya çıktı."],["Tezgâhtar","Her sabah 09:00–09:30 arası cila tezgâhında çalışır; lacivert iş önlüğü giyer; bahis sitelerine üyeliği çıktı."],["Güvenlik görevlisi","Servis koridoru anahtarı taşır; o gün 12:40'ta izin alıp erken çıktı."],["Muhasebeci","Geçen hafta kasaya erişim yetkisi istemiş, reddedilmiş; kredi kartı borçları var."],["Temizlikçi","Lacivert iş önlüğü giyer; koridor anahtarı yok; öğle arasında dışarı çıkar."]],
    E:[["other","Şifre Zamanı","Kasa şifresi aynı sabah 09:00'da değiştirildi ve KİMSEYLE paylaşılmadı; soygunda ilk denemede doğru girildi, panik kodu kullanılmadı.",1,0],
       ["other","Ayna Açısı","Şifre tuş takımı, koridordaki boy aynasından yalnızca CİLA TEZGÂHINDA oturan birinin görebileceği açıda yansıyor.",1,0],
       ["camera","Kepenk Kamerası","13:01'de dört kişi öğle molasına çıkıyor; 13:08'de fırınla ortak servis koridorundan içeri giren bir silüet seçiliyor. Koridor kapısı yalnızca mağaza anahtarıyla açılır (anahtar: sahibi, tezgâhtar, güvenlik).",1,0],
       ["other","Kapı Sensörü","Arka kapı 13:12'de İÇERİDEN açıldı, 13:31'de kapandı; hiçbir kilitte zorlama yok.",1,0],
       ["witness","Tanık {W1} (fırın çırağı)","13:10 civarı koridordan LACİVERT iş önlüklü biri hızla geçti; yüzünü göremedim, başı öndeydi.",1,0],
       ["other","Banka Fişi","{S5}, 13:14'te bankada fatura ödemesi yapmış; fişteki saat net okunuyor.",1,0],
       ["gps","Erken Çıkış","{S3} 12:40'ta ayrılmış; telefonu 13:00–14:00 arasında sahil yolu hattında baz vermiş.",0,0],
       ["phone","Talep Yazısı","{S4} geçen hafta kasaya erişim yetkisi istemiş, sahibi reddetmiş; aynı hafta kart borcu yapılandırması yapmış.",0,1]] },

  { t:"Okuldan Dönmeyen Çocuk", e:"Kaçırılma", d:"medium", st:"Çocuk aynı gece sağ salim bulundu; faili kayıtlar değil, mantık bulacak.", nS:5, nW:1, c:2,
    sum:"İlkokul çıkışında bir çocuk eve dönmedi; aynı gece eski iskelede sağ salim bulundu. Çocuğu götüren kişi ailenin acil durum PAROLASINI biliyordu ve çocuk ona güvenerek gitti. Parolayı kimler bilebilirdi?",
    sol:"Sorumlu {S3}. Saat-telefona 12:40'ta gelen aramada ailenin parolası ('limonata') söylendi — parola yalnızca acil durum formunda yazılı; forma idare, sınıf öğretmeni ve SERVİS dosyası erişebilir. Ama arama okuldan değil, servis garajının yanındaki ankesörden yapıldı; öğretmenin arabası yok ve o saatte nöbetçiydi. İskeledeki kestaneci, çocuğu getiren yetişkinin kapısında 'çocuk kilidi' etiketi olan açık renk bir MİNİBÜSTEN indiğini söylüyor — bu, sedan kullanan veliyi de dışarıda bırakıyor. O gün servis turu iptal olduğu için şoförün öğleden sonrası boştu. Parola erişimi + minibüs + boş program yalnızca {S3}'te birleşiyor. Velinin akşam iskelede baz vermesi, ihbarı duyup aramaya koşmasıyla açıklanıyor; kantincinin kasa açığı bu olayla ilgisiz bir dedikodu.",
    S:[["Sınıf öğretmeni","Acil durum formlarına erişimi var; arabası yok, okula yürüyerek gelir; o gün öğle nöbetçisiydi."],["Komşu","Sabahları okul kapısında çocukla şakalaşır; o saatte iş yerinde olduğunu söylüyor, doğrulayan yok."],["Servis şoförü","Servis dosyası (acil durum formlarının kopyası dahil) onda durur; açık gri minibüs kullanır; o gün veli toplantısı nedeniyle tur iptaldi."],["Veli","Velayet davası süren baba; koyu renk bir sedan kullanır; 'tüm gün ofisteydim' diyor."],["Kantinci","Okul kantinini işletir; kasasında açık olduğu konuşuluyor; okuldan 17:30'da çıkar."]],
    E:[["other","Parola Detayı","Çocuğun saat-telefonuna 12:40'ta gelen aramada ailenin acil durum parolası ('limonata') söylenmiş. Parola yalnızca acil durum formunda yazılı; form kopyaları okul idaresinde, sınıf öğretmeninde ve SERVİS dosyasında bulunuyor.",1,0],
       ["phone","Arama Kaydı","12:40 araması, servis garajının yanındaki ankesörlü telefondan yapılmış.",1,0],
       ["other","Servis İptali","O gün servis turu veli toplantısı nedeniyle iptaldi; tüm öğrenciler yürüyerek ya da velileriyle çıktı.",1,0],
       ["camera","Kapı Kamerası","Çocuk 15:35'te okul kapısından çıkıp otobüs durağına değil ARKA sokağa yöneliyor; kamerada araç seçilmiyor.",1,0],
       ["witness","Tanık {W1} (iskele kestanecisi)","Kestaneyi alan yetişkin, kapısında 'çocuk kilidi' uyarı etiketi olan açık renk bir minibüsten indi; çocuk gayet keyifliydi.",1,0],
       ["gps","Veli Konumu","{S4}'ün telefonu 20:30'da iskele çevresinde baz vermiş; kayıp ihbarı 19:00'da yapılmıştı.",0,1],
       ["other","Kantin Söylentisi","{S5}'in kasasında o hafta açık olduğu konuşuluyor; kendisi reddediyor, tutanak yok.",0,1],
       ["phone","Sınıf Mesajı","Çocuk öğle arası sıra arkadaşına 'bugün sürpriz var, dondurma yiyeceğiz' demiş.",1,0]] },

  { t:"Fabrikada Arıza", e:"Şirket İçi Sabotaj", d:"medium", st:"'İzinliydim' diyen herkesin izini teknoloji tutmuyor.", nS:5, nW:1, c:1,
    sum:"Bir fabrikada üretim hattının kalibrasyonu gece 02:13'te yerel panelden bozuldu. Panele giriş için o aya özel servis PIN'i gerekiyor. Şüphelilerden biri 'o hafta izinliydim' diyor — ama izinli olmak, orada olmamak demek değil.",
    sol:"Sabotajcı {S2}. Değişiklik, yalnızca bakım nöbet listesindekilere verilen aylık servis PIN'iyle ve kart okutmadan — atölyedeki mekanik yedek anahtarla — yapıldı; iki erişim de bakım personelini gösteriyor ve o haftanın çizelgesinde nöbetçi olarak {S2} yazıyor. Panel odası pervazındaki SARMA tütün külü, paket sigara içen vardiya amirini değil, kendi tütününü saran teknisyeni işaret ediyor. En önemlisi: 'izinliydim' demesine rağmen telefonu 01:58–02:21 arasında atölye Wi-Fi'ına otomatik bağlanmış — cihazlar bilinen ağa kendiliğinden bağlanır, yalan burada patlıyor. Mühendisin uzak bağlantısı sonuna kadar şüpheli kaldı; soruşturmada oturumun dokunduğu hattın sabotajlı hat olmadığı anlaşıldı. Operatörün dolabındaki panel şeması da sertifika sınavı çalışması çıktı — ikisi de parlak ama yanlış izdi.",
    S:[["Vardiya amiri","Gece sahadaydı; paket sigara içer; sabotajın olduğu hatla ödül primi rekabeti vardı."],["Bakım teknisyeni","Kendi tütününü sarar; 'o hafta izinliydim, çizelge güncellenmedi' diyor; tazminat davası açmaya hazırlandığı konuşuluyor."],["Mühendis","Sistemi uzaktan yönetir; o gece evden çalıştığını söylüyor."],["Depo şefi","Panel yetkisi yok; gece sayım yapıyordu."],["Operatör","Yakında işten çıkarılacağını öğrendi; panel sertifika sınavına hazırlanıyor."]],
    E:[["other","Servis Modu","Kalibrasyon 02:13'te YEREL panelden, aylık değişen servis PIN'iyle bozulmuş. Bu ayın PIN'i yalnızca bakım nöbet listesindekilere verildi.",1,0],
       ["other","Kart Kaydı","Panel odası kapısında o gece hiç kart okutulmamış; oda, bakım atölyesinde asılı duran mekanik yedek anahtarla da açılabiliyor.",1,0],
       ["forensic","Pervazdaki Kül","Panel odasının pencere pervazında SARMA tütün külü ve yanmış kibrit çöpü bulundu; kül taze.",1,0],
       ["phone","Wi-Fi Kaydı","{S2}'nin telefonu 01:58–02:21 arasında 'FAB-ATOLYE' erişim noktasına OTOMATİK bağlanmış.",1,0],
       ["other","Nöbet Çizelgesi","O haftanın bakım nöbetçisi çizelgede {S2} görünüyor; kendisi 'izinliydim, çizelge güncellenmedi' diyor.",1,0],
       ["phone","Uzak Erişim","{S3}, 02:05'te sisteme uzaktan bağlanmış; 'başka hattın yamasıydı' diyor — yama kaydı sistemde var ama saat alanı boş bırakılmış.",0,1],
       ["other","Dolap Araması","{S5}'in dolabından panel şemasının çıktısı çıktı; kendisi sertifika sınavına çalıştığını söylüyor, sınav kaydı gerçekten var.",0,1],
       ["witness","Tanık {W1}","02:00 sularında atölye tarafında el feneri ışığı gördüm; 'bakımdır' deyip alarm vermedim.",1,0]] },

  { t:"Zarftaki Tehdit", e:"Şantaj", d:"medium", st:"Fotoğraflar dijital arşivden değil, evdeki albümden çıkma.", nS:5, nW:1, c:4,
    sum:"Tanınmış bir iş insanına özel fotoğraflarla şantaj yapılıyor. İlk bakışta herkes 'kovulan asistan' diyor. Ama fotoğrafların KAYNAĞI, mektupların BASILDIĞI saat ve aramanın ARKA PLAN sesi başka bir hikâye anlatıyor.",
    sol:"Şantajcı {S5}. Fotoğraflar dijital değil; karelerde albüm köşeliklerinin gölgesi ve kurutulmuş çiçek izi var — yani yalının kütüphanesindeki FİZİKSEL albümden tarandılar; albümü son bir yılda görebilenler ev konukları. Mektuplardaki gizli yazıcı noktaları baskıların hep SALI 19:00–21:00 arasında yapıldığını gösteriyor; bu saat, basın lokalinin üyelere ücretsiz yazıcı saati. Talimat aramasının arkasındaki martı sesleri ve 07:05 vapur düdüğü, sabahları o hatla geçen birini söylüyor. Albüm erişimi + salı baskısı + vapur rutini, üç hafta önce yalıda ev röportajı yapan {S5}'te kesişiyor. {S1}'in öfkeli mesajı sekiz ay önceye ait ve anahtarını iade etmişti; {S3}'ün karalama bütçesi gürültülü ama albüme uzanamıyor.",
    S:[["Eski asistan","Sekiz ay önce kovuldu; çıkarken 'bunu yanınıza bırakmam' demişti; ev anahtarını iade etti, şehir merkezinde oturuyor."],["Şoför","Eve girmez, garajı kullanır; aileyle arası iyi."],["Rakip iş insanı","Kurbanla husumetli; işlerini hep aracılarla yürütür, eve hiç gelmedi."],["Komşu","Yalının akşam yemeklerine sık katılan emekli bir komşu."],["Gazeteci","Üç hafta önce yalıda ev röportajı yaptı, kütüphanede fotoğraf çekti; basın lokali üyesi; karşı yakada oturur, sabahları 07:05 vapuruyla geçer."]],
    E:[["forensic","Tarama İzleri","Şantaj fotoğrafları dijital arşivden değil: karelerde albüm köşeliklerinin gölgesi ve kurutulmuş çiçek izi görünüyor — fiziksel albümden taranmışlar.",1,0],
       ["other","Albüm Konumu","Albüm, yalının kütüphanesinde durur; idare son bir yılın ev konuklarını listeledi (akşam yemekleri, bir ev röportajı, eski çalışanlar).",1,0],
       ["forensic","Yazıcı Noktaları","Mektuplardaki gizli takip noktalarına göre tüm baskılar SALI 19:00–21:00 aralığında yapılmış.",1,0],
       ["other","Basın Lokali","Şehir basın lokalinde üyelere ücretsiz yazıcı saati: salı akşamları 19:00–21:00.",1,0],
       ["phone","Ses Analizi","Talimat aramasının arka planında martı sesleri ve 07:05 sabah vapurunun çift düdük deseni tespit edildi.",1,0],
       ["phone","Eski Tehdit","{S1}, kovulduğu gün 'bunu yanınıza bırakmam' diye mesaj atmış; tarih sekiz ay öncesi.",0,1],
       ["other","Karalama Bütçesi","{S3}'ün, kurban aleyhine bir sosyal medya kampanyasına aracılar üzerinden para aktardığı tespit edildi.",0,1],
       ["witness","Tanık {W1} (komşu)","Zarfı bırakan kişi iki seferde de sabah 07:15 sularında geldi; yüzünü görmedim, iskele tarafından yürüyordu.",1,0]] },

  { t:"Sızıntı", e:"Polis Muhbirliği", d:"medium", st:"Para izini sürmek yetmiyor; para hiç 'ona' gitmemiş.", nS:5, nW:1, c:3,
    sum:"Bir ekibin operasyonları defalarca son anda boşa çıktı. Finans taraması herkes için temiz. Ama sızıntının DESENİ — hangi operasyonların sızdığı, uyarının NASIL gittiği ve paranın NEREYE aktığı — tek bir kişiyi anlatıyor.",
    sol:"Muhbir {S4}. Yedi operasyondan yalnızca dijital sistemde adresi işlenen beşi sızdı; kâğıt üzerinde planlanan ikisi sorunsuz geçti — yani sızıntı dijital aşamada ve erişim üç kişiyle sınırlı: lider, telsiz operatörü, analist. Uyarılar, merkeze 300 metredeki ankesörlerden 'tek çalıp kapatma' sinyaliyle gitti ve o dakikalarda avluya çıkışı beş günün BEŞİNDE de tutan tek isim analist ({S1} iki, {S3} üç gün). Para kendi hesabına değil, kardeşinin kumar borcuna aktı — 'abi sağol, borç bitti' mesajı bunu ele veriyor; finans taraması bu yüzden temiz göründü. Operatörün 'veraset' dediği para soruşturma sonunda tapu kaydıyla doğrulandı; liderin kafe buluşmasının raporlu bir muhbir teması olduğu da gizli dosyadan teyit edildi — ikisi de sonuna kadar oyalayan tuzaklardı.",
    S:[["Ekip lideri","Tüm operasyon bilgisine erişir; geçen hafta bir 'aracıyla' kafede görüntülendi."],["Genç memur","Yeni katıldı; sızan operasyonların bir kısmından haberi bile yoktu; sahaya yeni çıkıyor."],["Telsiz operatörü","Her operasyonu duyar; hesabına geçen ay toplu para girdi; sigara molalarında avluya çıkar."],["Analist","Adres ve hedef verilerini dijital sisteme o işler; kardeşinin kumar borcu olduğu biliniyordu; sigara içmez ama 'hava almaya' çıkar."],["Saha memuru","Plan detayını görmez, yalnızca operasyon emri alır."]],
    E:[["other","Sızıntı Deseni","Yedi operasyondan yalnızca dijital sistemde adresi işlenen BEŞİ sızdı; sadece kâğıt üzerinde planlanan ikisi sorunsuz geçti.",1,0],
       ["other","Erişim Matrisi","Dijital sistemde operasyon adreslerini önceden görebilenler: ekip lideri, telsiz operatörü ve analist.",1,0],
       ["phone","Tek Çalma","Her baskından 40–70 dakika önce, çetenin hattına merkeze 300 metre mesafedeki FARKLI ankesörlerden tek çalıp kapatılan aramalar gelmiş.",1,0],
       ["other","Avlu Kayıtları","Sinyal aralıklarında avluya çıkış: {S4} beş günün beşinde, {S3} üç gün, {S1} iki gün. Diğerlerinin çıkışı yok.",1,0],
       ["phone","Borç Mesajı","{S4}'ün kardeşinden gelen mesaj: 'abi sağol, borç bitti.' Borcun kapandığı tarih, üçüncü sızıntının ertesi günü.",1,0],
       ["phone","Operatör Nakdi","{S3}'ün hesabına geçen ay toplu para girmiş; kendisi 'veraset, tarla sattık' diyor — tapu sorgusu istendi, sonuç henüz gelmedi.",0,1],
       ["camera","Kafe Fotoğrafı","{S1}, sızıntı haftasında bir aracıyla kafede görüntülendi; 'kayıtlı muhbir temasıydı' deniyor — rapor gizlilik dereceli, dosyaya konmadı.",0,1],
       ["witness","Tanık {W1}","Baskın sabahlarından birinde {S4}'ü avluda gördüm; sigarası yoktu, ankesörlerin olduğu tarafa yürüyordu.",1,0]] },

  { t:"Göldeki Sessizlik", e:"Kayıp Kişi", d:"medium", st:"Sandal gece kullanılmış; kilidi açan anahtar hangi cepten çıktı?", nS:5, nW:1, c:1,
    sum:"Beş kişilik kamp grubundan biri gece kayboldu; son görüldüğü yer iskele. Sandal yerinde duruyor ama ıskarmozları ıslak. Kilit sağlam, zincir sağlam. Birinin hikâyesinde delik var.",
    sol:"Sorumlu {S2}. Sandal gece kullanılmış: ıskarmozlar sabah hâlâ ıslak, bordada taze çamur şeridi var. Asma kilit hasarsız açılmış ve yem kutusunun altındaki YEDEK anahtarın üzerindeki örümcek ağı bozulmamış — yani kapıyı açan, sahibinin kendi anahtarıydı. {S2}'nin 'kasabada eczanede ilaç bekledim' ifadesi de çürük: o hafta nöbet yan kasabadaydı, buradaki eczane 22:00'de kapandı. 00:40'ta sazlığa giden ritmik kürek sesi rotayı tamamlıyor. {S4}'ün borcu ve yalnız çadırı onu cazip hedef yapıyor ama sandala dokunduğunu gösteren tek iz yok; 00:08 selfie'si {S1}, {S3} ve {S5}'i ateş başında gösteriyor.",
    S:[["Kamp arkadaşı","Geceyi ateş başında geçirdiğini söylüyor; kurbanla aralarında bilinen bir sorun yok."],["Tekne sahibi","Sandalın tek anahtarı bende, yedeği kimse bilmez der; kurbanla iskele kira parası yüzünden tartışmıştı; gece 'kasabaya ilaç almaya' gittiğini söylüyor."],["Eski sevgili","Kurbanla yıllar önce ayrılmışlar; kampa ortak arkadaşlar yüzünden geldi."],["Borçlu arkadaş","Kurbana ciddi borcu vardı; 'erken yattım' diyor, çadırını tek başına kullanıyor."],["Komşu kampçı","Yan çadırda konaklayan, grubu o akşam tanımış bir kampçı."]],
    E:[["forensic","Iskarmoz İzleri","Sandalın ıskarmozları sabah hâlâ ıslaktı; bordada taze çamur şeridi var — sandal gece suya indirilmiş.",1,0],
       ["other","Kilit Durumu","Sandalın zinciri ve asma kilidi sağlam; kilit hasarsız açılıp yeniden kapatılmış.",1,0],
       ["forensic","Yedek Anahtar","Yem kutusunun altında saklanan yedek anahtarın üzerindeki örümcek ağı BOZULMAMIŞ; yedek hiç ellenmemiş.",1,0],
       ["camera","Ateş Başı Fotoğrafı","00:08'de çekilen selfie'de {S1}, {S3} ve {S5} ateşin başında görünüyor.",1,0],
       ["phone","Eczane İddiası","{S2}, 23:00–01:00 arasını kasabadaki eczanede geçirdiğini söylüyor. Kayıtlara göre o hafta nöbetçi eczane YAN kasabadaydı; buradaki 22:00'de kapanmış.",1,0],
       ["witness","Tanık {W1} (balıkçı)","00:40 sularında sazlık tarafına giden ritmik kürek gıcırtısı duydum; motor sesi yoktu.",1,0],
       ["phone","Borç Hatırlatması","{S4}, kurbana iki gün önce 'biraz daha süre ver' diye yazmış; kamp boyunca araları gergindi.",0,1],
       ["other","Çadır İfadesi","{S4} 23:00'te çadıra girdiğini söylüyor; bunu doğrulayan kimse yok.",0,1]] },

  { t:"Hesaptaki Açık", e:"Banka Dolandırıcılığı", d:"medium", st:"İşlemler gişecinin oturumundan — ama gişeci işlem ANINDA molada.", nS:5, nW:1, c:3,
    sum:"Bir bankada çok sayıda müşteri hesabından küçük tutarlar sızdırıldı. Tüm işlemler gişe görevlisinin oturumundan yapılmış. Açık ve net bir vaka gibi… ta ki işlemlerin saatlerine bakana kadar.",
    sol:"Dolandırıcı {S4}. Sahte işlemlerin TAMAMI, gişecinin oturumu açık unutulmuşken ve onun kayıtlı molalarına denk gelen dakikalarda yapılmış — oturum, kişiyi göstermiyor. Aynı dakikalarda terminale 'uzak destek' oturumları açılmış; bu aracı yalnızca BT kullanabilir. Belirleyici desen şu: geçen ay birebir aynı açıklar, {S4}'ün geçici görevle bulunduğu DİĞER şubede yaşandı ve o ayrılınca durdu — açıklar şubeyi değil, onu takip ediyor. Sahte hesabın evrakı da BT'nin bulunduğu ikinci kattaki fotokopinin bant izini taşıyor; gişe zemin kattadır. {S2}'nin yeni arabası taşıt kredili; müdürün iki işlemde yerinde görünmemesi ise tek başına hiçbir kapıyı açmıyor.",
    S:[["Şube müdürü","Yetkisi geniş; işlemlerin bir kısmında toplantıdaydı, ikisinde nerede olduğu belirsiz."],["Gişe görevlisi","Sahte işlemler onun oturumundan; geçen ay yeni araba aldı; molalarda oturumunu kapatmamasıyla ünlü."],["Çağrı merkezi görevlisi","Yalnızca telefon desteği verir; işlem ekranı yetkisi yok."],["BT görevlisi","Uzak destek aracını o kullanır; geçen ay iki hafta diğer şubede geçici görevdeydi; ikinci katta oturur."],["Stajyer","İşlem yetkisi yok; öğleden sonraları evrak tarar."]],
    E:[["other","Mola Deseni","Sahte işlemlerin tamamı, gişe oturumu AÇIK unutulmuşken ve gişecinin kayıtlı molalarına denk gelen dakikalarda yapılmış.",1,0],
       ["phone","Uzak Destek","Aynı dakikalarda gişe terminaline 'uzak destek' oturumları açılmış; kayıtlar o haftaki BT iş kuyruğuna düşmüş.",1,0],
       ["other","Yetki Matrisi","Uzak destek aracını yalnızca BT kullanabilir; çağrı merkezi ve stajyerin işlem ekranı yetkisi yok.",1,0],
       ["other","Şube Deseni","Geçen ay birebir aynı tip açıklar yalnızca {S4}'ün geçici görevle bulunduğu diğer şubede yaşanmış; o ayrılınca durmuş.",1,0],
       ["forensic","Fotokopi İzi","Sahte hesabın açılış evrakları, İKİNCİ kattaki fotokopinin tipik bant izini taşıyor; gişe zemin kattadır.",1,0],
       ["witness","Tanık {W1}","{S2} molaya çıkarken oturumunu kapatmaz; 'iki dakikaya dönüyorum' der gider, bütün şube bilir.",1,0],
       ["phone","Taşıt Kredisi","{S2}'nin yeni arabası için çekilmiş taşıt kredisi kaydı dosyada; taksitler düzenli ödeniyor.",0,1],
       ["camera","Toplantı Kaydı","{S1}, işlemlerin çoğunda toplantı salonunda görünüyor; iki işlem anında ise kamerada yok.",0,1]] },

  { t:"Limandaki Konteyner", e:"Araç Kaçakçılığı", d:"medium", st:"Liman tertemiz; kirli iş limana 3 kilometre kala dönüyor.", nS:5, nW:1, c:2,
    sum:"Limanda çalıntı araç dolu bir konteyner yakalandı. Mühürler sağlam, evrak geçerli, liman kayıtları eksiksiz. Peki yasak mal sisteme nereden giriyor? Cevap, limanın içinde değil.",
    sol:"Sorumlu {S3}. Yükleyici firmanın konteynerin içine koyduğu gizli takipçi, şüpheli seferlerin HEPSİNDE limana 3 km kala 'Karanlık Depo' arsasında 20–25 dakikalık duraklama gösteriyor; kantarlar arasındaki düzenli 1,4 tonluk fark da ikiz konteyner değişimini doğruluyor. Liman içi vinç ve istif kayıtları eksiksiz — değişim İÇERİDE olmamış; bu, vinç operatörünü ve saha personelini geriletiyor. Sevkiyat planındaki güzergâh sahilden inerken araç şüpheli günlerde sanayi yolundan dolaşmış ve rota tercihi sürücüye bırakılıyor. Arsa bekçisinin 'hep aynı şoför, akşamcı bir adam' tarifi tabloyu kapatıyor. Gümrükçünün hızlı onayları ve vinççinin fazla mesaisi sonuna kadar şüpheli kaldı; soruşturma sonunda onay hızının tüm dosyalarda aynı tembellik, mesailerin de rutin yükleme olduğu görüldü.",
    S:[["Liman işçisi","Konteynerleri sahada taşır; belge onaylama yetkisi yok; gece vardiyasına yeni geçti."],["Vinç operatörü","Yüklemeleri yapar; şüpheli gecelerde fazla mesai kaydı var."],["Nakliyeci","Konteyneri limana getiren tır şoförü; güzergâhını kendisi seçer; akşamları sanayi kahvesinde oturur."],["Komisyoncu","Evrakları hazırlar; sahaya inmez; komisyonu ciro üzerinden alır."],["Gümrük memuru","Beyannamelere bakar; 'çok hızlı onaylıyor' diye şikâyet edilmiş."]],
    E:[["gps","Gizli Takipçi","Yükleyici firmanın konteyner içine koyduğu takipçi, şüpheli seferlerin hepsinde limana 3 km kala 'Karanlık Depo' arsasında 20–25 dakikalık duraklama kaydetmiş.",1,0],
       ["other","Tartı Farkı","Fabrika çıkış kantarı ile liman giriş kantarı arasında, yalnızca şüpheli konteynerlerde, düzenli 1,4 tonluk fark var.",1,0],
       ["other","Saha Sayımı","Liman içi vinç ve istif kayıtları eksiksiz; konteynerler liman içinde hiç yer değiştirmemiş — değişim dışarıda olmuş.",1,0],
       ["other","Rota Sapması","Sevkiyat planında güzergâh sahil yolundan; araç şüpheli günlerde sanayi yolundan dolaşmış. Firma kuralına göre rota tercihi sürücüye aittir.",1,0],
       ["witness","Tanık {W1} (arsa bekçisi)","Geceleri oraya bir tır yanaşır; şoför hep aynı, akşamcı bir adam, selam verir geçer. Kirayı da elden o öder.",1,0],
       ["other","Onay İstatistiği","{S5}, beyannameleri ortalamanın iki katı hızla onaylıyor; iş yükünden mi, alışkanlıktan mı, başka bir şeyden mi — istatistik tek başına söylemiyor.",0,1],
       ["phone","Fazla Mesai","{S2}'nin şüpheli gecelerde fazla mesai kayıtları var; o saatlerde tam olarak ne yüklediği vinç loglarından dakika dakika çıkarılamıyor.",0,1],
       ["other","İşçi Söylentisi","{S1}'in gece vardiyasına kendi isteğiyle geçtiği, 'gündüzleri başka iş yapıyor' dendiği duyuldu.",0,0]] },

  { t:"Akşam Yemeğinde Zehir", e:"Zehirleme", d:"medium", st:"Zehir sürahide değil, tek bir bardakta — ve bardak yeni.", nS:5, nW:1, c:0,
    sum:"Bir akşam yemeğinde konuklardan biri zehirlendi, ucuz atlattı. Herkes aynı sürahiden içti ama yalnızca onun bardağı zehirliydi. Bardağı kimin doldurduğu değil, bardağın NEREDEN geldiği önemli.",
    sol:"Zehirleyen {S1}. Zehir sürahide değil; MAVİ bardağın iç çeperinde ve dolumdan en az İKİ saat önce sürülmüş ince bir film hâlinde. Bu evde baş misafire hep vitrindeki mavi bardak konur; orijinali o öğleden sonra kırılınca yedeği KİLİTLİ vitrinden çıktı — anahtar yalnızca ev sahibinde. Şerbet 20:55'te dolduruldu; tepsiyi hazırlayan {S5} ve garson {S2} eve 19:30'da geldiler, yani film onlardan önce uygulanmıştı. Baş misafire mavi bardak konacağını bilen, vitrini açabilen ve nar şerbetini menüye o sabah ekleyen tek kişi ev sahibi. {S3}'ün masada bardağı uzatması yalnızca kibarlık; iki yıllık ihale kavgası ise olta.",
    S:[["Ev sahibi","Vitrinin anahtarı onda; kurbanla yakında dağılacak ortak bir işi olduğu biliniyor; menüyü o sabah kendisi belirledi."],["Garson","Servis ekibinden; eve 19:30'da geldi, tepsiyi taşıdı; kimin nereye oturacağını bilmiyordu."],["Kurbanın rakibi","Kurbanla iki yıl önce ihale kavgası yaşamış bir davetli; masada bardağı kurbana uzattı."],["Komşu","Salondan neredeyse hiç ayrılmayan yaşlı bir davetli."],["Aşçı yardımcısı","Servis ekibinden; eve 19:30'da geldi; şerbeti 20:55'te doldurdu, tepsiyi hazırladı."]],
    E:[["forensic","Bardak Analizi","Sürahi temiz; zehir yalnızca kurbanın MAVİ bardağında. Madde, bardağın iç çeperine dolumdan en az İKİ saat önce ince film hâlinde sürülmüş ve kurumuş.",1,0],
       ["other","Mavi Bardak Geleneği","Bu evde baş misafire hep vitrindeki mavi bardak konur; bunu ev halkı ve sık gelen konuklar bilir.",1,0],
       ["forensic","Kırık Bardak","Mutfak çöpünde, o öğleden sonra kırılmış ORİJİNAL mavi bardağın parçaları bulundu.",1,0],
       ["other","Vitrin Kilidi","Yedek mavi bardağın alındığı vitrin kilitlidir ve zorlanmamış; anahtarı ev sahibinde durur.",1,0],
       ["other","Servis Saatleri","Şerbet 20:55'te dolduruldu; servis ekibi ({S2} ve {S5}) eve 19:30'da geldi; konuklar 20:00'de.",1,0],
       ["witness","Tanık {W1}","Masada bardağı kurbana {S3} uzattı; 'buyrun, şerbetin en güzeli size' dedi, herkes duydu.",0,1],
       ["phone","Eski Husumet","{S3} ile kurbanın iki yıl önceki ihale kavgasına ait öfkeli mesajlar dosyada.",0,1],
       ["other","Menü Notu","Menü o sabah ev sahibi tarafından belirlendi; nar şerbeti listeye SON anda eklendi.",1,0]] },

// ───────── ZOR (10): 8 şüpheli · 13-14 kanıt · v3 BELİRSİZLİK KURALLARI:
  // Hiçbir kanıt suçluyu söylemez VE hiçbir kanıt kimseyi kesin aklamaz.
  // Kayıtlar eksik, tanıklar emin değil, mazeretler doğrulanamaz, ölçümler hata paylı.
  // Suçsuzların üzerinde de sonuna kadar açıklanmayan şüpheler kalır (açık kapılar).
  // Suçlu, zayıf işaretlerin KESİŞİMİYLE "en tutarlı açıklama" olarak bulunur;
  // kesin doğrulama yalnızca çözüm metnindeki tutuklama-sonrası bulgulardadır. ─────
  { t:"Üç Kurban", e:"Seri Cinayet", d:"hard", st:"Üç ölüm de 'doğal' sanılmıştı. Kayıtlar eksik, ifadeler çelişiyor.", nS:8, nW:2, c:3,
    sum:"Aynı sitede üç yaşlı sakin, haftalar arayla 'kalp krizinden' öldü. Yeniden yapılan otopsiler üçünde de diz arkasında iğne izi buldu. Katil kapıları zorlamadı; çay içip fincanları bile yıkadı. Bu dosyada hiçbir kayıt tam, hiçbir tanık emin değil. Kesin kanıt arayan eli boş döner — sen işaretlerin nerede KESİŞTİĞİNE bak.",
    sol:"Katil {S4}. Tek başına hiçbir kanıt onu göstermiyordu; kesişim gösteriyordu: kurbanların gündüz vakti çay ikram edecek kadar güvendiği biri olması, iğnelerin düzgün ve tereddütsüz vurulması, insülin eksilmesinin ilaç teslimlerini çoğu kez kapıda karşılayan birine işaret etmesi ve titrek imzalı teslim fişleri. Elektrikçinin refakatsiz pano servisleri, teknecinin arsa davası ve temizlikçinin boş çizelge saatleri sonuna kadar şüpheli kaldı — ama hiçbirini kurbanların sofrasına oturtacak bir iz yoktu. Tutuklamadan sonra taşlar yerine oturdu: komşu site yöneticisi ifadesini netleştirip {S6}'nın pazartesi öğleden sonrayı orada geçirdiğini doğruladı, {S4}'ün çantasından 2. kurbanın partisinden bir flakon çıktı ve grafolog, teslim fişlerindeki imzaların {S4}'ün sol eliyle atılmış denemeleriyle uyuştuğunu raporladı.",
    S:[["Apartman yöneticisi","Ana anahtar onda; kurbanlarla aidat ve şikâyet gerginlikleri vardı; gündüzleri sitede dolaşır."],["Tekneci komşu","Bir kurbanla yıllardır süren arsa davası var; 'gündüzleri denizdeyim' diyor ama bunu doğrulayan yalnızca kendi sözü."],["Kurye","Eczane paketleri dahil siteye her gün teslimat yapar; bazen paketleri komşulara bırakır."],["Bakım hemşiresi","İki kurbanın evine bakıma giderdi; ilaç teslimlerini çoğu kez kapıda o karşılardı; geçen yıl hakkında kapatılmış borç şikâyetleri var."],["Dağcılık eğitmeni","Sitede oturur; ilk yardım sertifikası var; bir kurbanın yeğeniyle husumetliydi; gündüz programı belirsiz."],["Elektrik teknisyeni","Geçen ay üç dairede de pano bakımı yaptı; site sakini değil ama sürekli çağrılır."],["Emekli komşu","Kurbanlardan biriyle gürültü kavgası vardı; gündüzleri evde."],["Temizlikçi","Haftada iki gün ortak alanları ve bazı daireleri (2. kurban dahil) temizler; açık renk forma giyer."]],
    E:[["forensic","Yeniden Otopsi","Üç kurbanda da diz arkasında iğne izi; ölüm nedeni aşırı doz insülin. İzler düzgün ve tereddütsüz — sağlık eğitimi olan birini düşündürüyor; ama adli tabip 'düzenli iğne yapan bir hasta yakını da olabilir' notunu düştü.",1,0],
       ["other","Misafir Düzeni","Üç dairede de TV açık, çay servisi yapılmış, iki fincan yıkanıp rafa kaldırılmış — kurbanlar katili gündüz, kendi rızalarıyla içeri almış.",1,0],
       ["other","Ölüm Pencereleri","Tahmini saatler kesin değil: üçü de 'öğle ile akşamüstü arası' aralığına düşüyor; cesetler geç bulunduğu için adli tabip daha dar bir aralık veremiyor.",0,0],
       ["forensic","İlaç Sayımı","2. kurbanın buzdolabındaki insülin kutusunda eczane kayıtlarına göre 3 ila 5 flakon eksik görünüyor; ne zaman eksildiği belirsiz — kurbanın kendi kullanımı düzensizdi.",1,0],
       ["other","Teslim Fişleri","2. kurbanın son eczane teslim fişlerinden ikisindeki 'alındı' imzası titrek ve farklı duruyor. Grafolog: 'yaşlı elin kötü günü mü, başka bir el mi — bu örnekle kesin konuşamam.'",1,0],
       ["forensic","Saksı İzi","1. kurbanın kapısı zorlanmamış; paspas yanındaki saksı yerinden oynamış, altındaki toprak halkası kaymış. Ne zaman oynadığı bilinmiyor.",1,0],
       ["other","Pano Servisleri","{S6} geçen ay üç dairede de pano bakımı yaptı; iş emirleri var ama formların çoğunda refakatçi hanesi boş.",0,1],
       ["other","Komşu Site İfadesi","{S6}, 3. ölümün olduğu pazartesi öğleden sonrayı komşu sitede geçirdiğini söylüyor; oradaki yönetici 'geldi ama saatini hatırlamıyorum' dedi.",0,0],
       ["phone","Arsa Husumeti","{S2} ile 1. kurban arasında yıllardır süren arsa davası yazışmaları var; 'o gün denizdeydim' diyor; liman defteri yalnızca çıkış saatlerini tutuyor, dönüşler yazılmıyor.",0,1],
       ["other","Temizlik Çizelgesi","{S8} pazartesi öğleden sonra C blok merdivenlerindeydi; çizelgede iki yönetici parafı var, aradaki saatler boş. Kendisi 'aralıksız çalıştım' diyor.",0,1],
       ["witness","Tanık {W1}","Perşembe kuşluk vakti 2. kurbanın katından açık renk kıyafetli biri indi gibi geldi; üniforma mıydı, önlük müydü bilemem — gözlüğüm yanımda değildi.",1,0],
       ["witness","Tanık {W2}","Rahmetli (1. kurban) saksılarını kimseye emanet etmezdi. Yedek anahtarın yerini bakımına gelen hanım bilirdi sanırım; bir de eski bir komşusu vardı, o da bilebilir.",1,0],
       ["phone","Kurye Rotası","{S3}'ün el terminali perşembe kuşluk vakti sitede bir teslimat taraması gösteriyor; paketi kime bıraktığı kayıtlı değil.",0,1],
       ["other","Şikâyet Dosyası","{S4} hakkında geçen yıl iki kez 'hasta yakınından borç aldı' şikâyeti gelmiş; soruşturma delil yetersizliğinden kapanmış. Kendisi 'iftiraydı' diyor.",1,0]] },

  { t:"Kasadaki Hayalet", e:"Büyük Banka Soygunu", d:"hard", st:"Kasa açıldı, kayıtlar silindi; kimin yaptığına dair tek bir doğrudan iz yok.", nS:8, nW:2, c:2,
    sum:"Bir bankanın kasası cumartesi gecesi boşaltıldı. Alarm çalmadı çünkü takvime önceden bir 'bakım penceresi' eklenmişti. O gecenin kart kayıtları silinmiş, tutanaklar eksik, herkesin bir açıklaması var. Fail; şifreleri, ağları ve insanların tembelliklerini iyi tanıyor — ama izini tek bir kayda bırakmadı.",
    sol:"Soyguncu {S3}. Onu gösteren tek bir kayıt yoktu; tablo gösteriyordu: bakım penceresi şefin hesabıyla ama şefin toplantıda olduğu bir saatte eklendi — şifresi ofiste yarı açık bir sırdı, yani hesap herkesin olabilirdi; fakat değişikliğin yapıldığı yönetim ağına pratikte sunucu odasından girilir ve o odada gecesini geçirebilecek tek kişi sistem yöneticisidir. Kayıt silme yönetici sınıfı yetki ister; felaket kurtarma kitinin mühür bandı yenilenmişti ve kit, şifresi 'sistem ekibinde' olan dolapta duruyordu; izleme cihazlı destelerin yerinde bırakılması da gizli dağıtımdaki dar listeden birini işaret ediyordu. Cuma gecesi sunucu odasının sıcaklık alarmının elle susturulması ve pazartesi çöpünde cuma menüsünde olmayan bir sandviç ambalajı, o gece içeride birinin saatlerce oturduğunu fısıldıyordu. Baş kasiyerin 14 dakikalık cumartesi ziyareti, müdürün geç saate kalan aracı ve arka sokakta 'eski yardımcıya benzeyen' silüet sonuna kadar açık kaldı — tutuklamadan sonra dış firmadan gecikmeli gelen şifre kasası dökümü, çelik dolabın cuma 23:54'te {S3}'ün koduyla açıldığını gösterdi ve banknotların bir kısmı evindeki klima boşluğundan çıktı.",
    S:[["Banka müdürü","Kasa kodunu bilir; cuma akşamı geç saate kadar şubedeydi, 'rapor bitiriyordum' diyor; mesai kaydı tutulmamış."],["Güvenlik şefi","Alarm panelinin yöneticisi; şifresini klavye altına yazdığı ofiste bilinen bir şakaydı; salı sabahı toplantıda olduğu söyleniyor."],["Sistem yöneticisi (BT)","Sunucu odasında çalışır; sessiz, işine düşkün biri olarak bilinir; gece mesaileri kimseyi şaşırtmaz."],["Veznedar","Kasa katına nadiren çıkar; cuma erken çıktığını söylüyor."],["Baş kasiyer","Kasa kodunu bilen ikinci kişi; icralık iki dosyası var; cumartesi sabahı 'eksik evrak' diye şubeye uğradı."],["Gece temizlikçisi","Cuma 22:00'de işi bitirmiş; çıkışta alarmın 'kurulu' yandığını not etmiş."],["Kurye","Yalnızca zemin kata girer; kasa katına kartı geçmez deniyor — kart yetki listesi güncel değil."],["Eski şef yardımcısı","Üç ay önce kovuldu; giriş kartı iptal edildi sanılıyor; cumartesi gecesi banka civarında görüldüğü iddia ediliyor."]],
    E:[["other","Bakım Penceresi","Alarm takvimine üç gün önce 'planlı bakım' eklenmiş: cumartesi 01:30–02:30. Değişiklik {S2}'nin panel hesabıyla, salı öğleden önce yapılmış.",1,0],
       ["witness","Tanık {W1}","Şefin şifresi klavyesinin altında yazardı; kim görmüştür bilemem — açık konuşayım, yarımız biliyorduk galiba.",1,0],
       ["camera","Toplantı Kaydı","Salı sabahı {S2} bir ara camlı toplantı odasında görünüyor; kayıt saatleri ile takvim değişikliğinin tam dakikası birebir örtüşüyor mu, kamera saati ayarsız olduğu için net değil.",0,0],
       ["other","Ağ Kısıtı","Takvim değişikliği yönetim ağından yapılmış. Bu ağa sınırlı sayıda uçtan girilebiliyor; uç listesi geçen yılki kat taşınmasından beri güncellenmemiş — hangi odalarda canlı uç kaldığı tartışmalı.",1,0],
       ["other","Kayıt Boşluğu","Cumartesi 00:50–03:10 arası kart geçiş kayıtları silinmiş; silme YÖNETİCİ sınıfı bir hesapla yapılmış. O sınıfta kaç hesap olduğu konusunda BT ile güvenlik birimi farklı sayılar veriyor.",1,0],
       ["other","FK Kiti","Felaket kurtarma kiti (yedek kasa anahtarı + geçersiz kılma kodu) sunucu odasındaki çelik dolapta durur. Pazartesi sayımında mühür bandının yenilenmiş olduğu görüldü; bandın ne zaman değiştiği belirsiz — son envanter beş ay önce.",1,0],
       ["other","Dolap Şifresi","Çelik dolabın şifresi tutanağa göre 'sistem ekibinde'. Ekipte kimlerin sayıldığı belgeden belgeye değişiyor.",1,0],
       ["other","Sayım Tutanağı","Kasadan yalnızca seri takipli olmayan kullanılmış banknotlar alınmış; izleme cihazlı desteler yerinde. İzleme listesi dar bir dağıtımdaydı; dağıtım tutanağının ikinci sayfası dosyada yok.",1,0],
       ["other","Sıcaklık Alarmı","Sunucu odasının klima sistemi cuma gecesi bir sıcaklık uyarısı vermiş; uyarı, odadaki panelden ELLE susturulmuş. Saat kaydı tutulmuyor.",1,0],
       ["other","Çöp Detayı","Pazartesi sabahı sunucu katındaki çöpte, cuma menüsünde olmayan bir büfe sandviçinin ambalajı bulundu. Kimin attığı bilinmiyor.",0,0],
       ["other","Cumartesi Girişi","{S5}, cumartesi 09:05'te 'eksik evrak' diyerek şubeye girip 14 dakika kaldı; çıkarken elinde bir dosya görüldü. Ne götürdüğü tespit edilemedi.",0,1],
       ["gps","Müdür Aracı","{S1}'in aracı cuma gece geç saate kadar şube otoparkında görünüyor; kendisi 'rapor bitiriyordum' diyor; o saatlere ait başka kayıt yok.",0,1],
       ["witness","Tanık {W2}","Cumartesi gece yarısı bankanın arka sokağında eski yardımcıya ({S8}) benzeyen birini gördüm; emin değilim, karanlıktı, belki de değildi.",0,1],
       ["other","Kart İptali","{S8}'in giriş kartının iptal edildiği söyleniyor; iptal listesinin o haftaki sürümünde adı var, bir önceki sürümde yok — hangi sürümün sisteme yüklendiği belirsiz.",0,0]] },

  { t:"Sahnedeki Suikast", e:"Suikast", d:"hard", st:"Atış yüksekten geldi; yukarıda kimin olduğunu kimse görmedi.", nS:8, nW:2, c:5,
    sum:"Kalabalık bir etkinlikte konuşmacı kürsüde vuruldu. Susturucu yüzünden kimse ses duymadı; atış anı yayın kaydından saptandı. Fail yüksek bir yerden ateş etti ve atıştan saniyeler önce takip spotu kısıldı. Yukarı kimin çıktığını gören yok; aşağıda kimin eksik olduğunu da kimse tam hatırlamıyor.",
    sol:"Suikastçı {S6}. Kesin bir kanıt yoktu; kesişim vardı: mermi gömleğindeki dikroik pullar atışın ışık köprüsü hattından yapıldığını, spot komutunun köprüdeki yerel panelden verilmesi failin reji akışını ve paneli bildiğini söylüyordu — bu, işi bilen dar bir çevre demekti. Anonsa B kanalından gelen cızırtılı 'tamam' sesi {S8}'i aşağıda gösteriyor gibiydi ama ses kime aitti, kayıt karar verdirmiyordu; {S6}'nın kanalının tam o dakikalarda susması ve 'kulaklığım arızalıydı' demesine rağmen arıza kaydı açmaması ince ama ısrarlı bir uyumsuzluktu. Kelepçedeki yağ kokulu bez, ağabeyinin kaybettiği söylenen ışık ihalesi ve atış penceresinde kimsenin onu aşağıda hatırlamaması üst üste bindi. Güvenlik amirinin 11 dakikalık boşluğu, aktivistin elindeki barut ve kameramanın 'bir ara çantasına eğildiği' anlar sonuna kadar açık kaldı — tutuklamadan sonra köprü kelepçesinden alınan kısmi eldiven izi {S6}'nın atölye eldiveniyle eşleşti, evindeki torna yağı merminin gömleğindeki kalıntıyla uyuştu ve barut raporu aktivistin elindekinin ses bombası kalıntısı olduğunu doğruladı.",
    S:[["Etkinlik organizatörü","Sahne önünde, çok kişinin gözü önündeydi; etkinlik sigortasından sorumlu."],["Kameraman","Yüksek kamera platformunda canlı yayın çekiyordu; platform, köprü hattının karşısında."],["Güvenlik amiri","Ana kapıdan sorumlu; kurbanla geçen yıl tartışması olmuş; atış civarında 11 dakika yerinde görünmüyor, 'tuvaletteydim' diyor."],["Konuk gazeteci","Ön sırada oturuyordu; kurban hakkında sert yazılar yazmıştı."],["Ses teknisyeni","Ses kabinindeydi; ekipman kasalarının taşınmasından da sorumlu — kasalar köprü merdiveninin dibinde durur."],["Işık şefi (rigger)","Köprüde çalışma yetkisi olanlardan; ağabeyinin, mekânın ışık ihalesini kaybeden firmayla bağlantısı olduğu söyleniyor — ticaret kayıtları karışık."],["Husumetli aktivist","Sahte kartla içeri girmiş; elinde barut izi çıktı; kurbanla bilinen husumeti var."],["Sahne görevlisi (rigger)","Köprüde çalışma yetkisi olanlardan; o gece konfeti düzeneğinden de sorumluydu; sahne solunda görev yaptığını söylüyor."]],
    E:[["forensic","Balistik Rapor","Mermi 6.5 mm, sesaltı; susturucu kullanılmış. Atış anı, yayın karesine göre 20:41:12.",1,0],
       ["forensic","Yörünge Konisi","Yara açısına göre atış yüksekten, tahminen 9–14 metre aralığından yapıldı; zeminden ya da ön sıradan bu açı zor — imkânsız demek için kürsünün tam duruşu bilinmeli, o da kayıtlardan tam çıkarılamıyor.",1,0],
       ["forensic","Filtre Pulları","Mermi gömleğinde dikroik filtre camına ait mikro pullar var; bu filtreler salonda ağırlıklı olarak ışık köprüsü armatürlerinde kullanılıyor; depoda hurda filtre kasası da var.",1,0],
       ["other","Reji Kaydı","Takip spotu 20:40:55'te 20 saniyeliğine kısıldı; komut ana masadan değil, köprüdeki YEREL panelden girilmiş görünüyor. Gösteri akışında böyle bir adım yok; paneli kullanmayı bilen kaç kişi olduğu konusunda ekipler farklı şeyler söylüyor.",1,0],
       ["other","Köprü Erişimi","Köprüye çıkış iş güvenliği kuralıyla sınırlı; o gece merdiven kapısının anahtarı kimlerdeydi sorusuna prodüksiyon ile mekân yönetimi farklı isim listeleri veriyor. Kilitte zorlama yok.",1,0],
       ["other","İnterkom Dökümü","20:40:30'daki 'konfeti hazır' anonsuna B kanalından kısa, cızırtılı bir 'tamam' geldi. B kanalı çoğunlukla sahne solunda kullanılır ama yaka üniteleri zimmetli değil; sesin kime ait olduğu kayıttan anlaşılmıyor.",1,0],
       ["other","Tırmanış Süresi","Görevlilerle yapılan denemede sahne solundan köprüye ulaşmak 50 ila 80 saniye sürdü — deneme yapan kişiye göre değişiyor.",1,0],
       ["other","Sessiz Kanal","{S6}'nın interkom kanalı 20:36–20:44 arasında hiç ses vermemiş; kendisi 'kulaklığım arızalıydı' diyor. Arıza kaydı açmamış; ama o gece arıza listesine giren iki kulaklık daha var.",1,0],
       ["forensic","Bez Parçası","Köprü kelepçelerinden birine sıkıştırılmış bir bez bulundu; köpek 'silah yağı' tepkisi verdi, laboratuvar 'madeni yağ' diyor — sahne makineleri de madeni yağla yağlanıyor.",1,0],
       ["forensic","Barut Testi","{S7}'nin elinde barut izi çıktı; partikül tipinin tüfek barutu mu, ses bombası kalıntısı mı olduğu raporu haftalar sonra gelecek.",0,1],
       ["other","Kapı Boşluğu","{S3}, 20:35–20:46 arasında ana kapıda görünmüyor; 'tuvaletteydim' diyor; koridor kamerası o bölümü çekmiyor.",0,1],
       ["phone","Sert Yazılar","{S4}'ün kurban hakkındaki eski köşe yazıları dosyaya eklendi; son yazısı üç hafta önce.",0,1],
       ["witness","Tanık {W2}","{S2} platformdaydı, vizörden ayrılmadı sanırım; bir ara çantasına eğildi, ne aldı görmedim.",0,0],
       ["witness","Tanık {W1}","Atıştan önce köprü tarafında bir gölge oynadı gibi geldi; ışıklar gözümü alıyordu, yemin edemem.",0,0]] },

  { t:"Gümrüğün Gölgesi", e:"Organize Kaçakçılık", d:"hard", st:"Yedi dakikalık bir pencere ve PIN'ini herkesin bildiği söylenen bir sistem.", nS:8, nW:2, c:3,
    sum:"Bir gümrük kapısından aylardır yasak mal geçiyor. Cihaz sağlam, görüntüler temiz, mühürler yerinde. Kaçak konteynerler hep günde yedi dakika süren bir pencereye denk geliyor. Pencereyi bilenler çok; sırayı oynatabilenler az; PIN'lerin kimde olduğu ise bu kapıda yıllardır tartışma konusu.",
    sol:"Asıl sorumlu {S4}. Kaçak konteynerler hep cihazın öz-test penceresine denk getirildi ve kuyruk numaraları amir sınıfı bir PIN'le elle öne çekildi. PIN'ler kulübedeki deftere yazılıyordu — yani teoride bekçi, hatta o defteri gören herkes kullanabilirdi; bu kapı sonuna kadar açık kaldı. Ama desen konuşuyordu: şüpheli geçişlerin ezici çoğunluğu A vardiyasındaydı, devir-teslim arasına düşen iki geçiş bile A vardiyasının paydos saatine yapışıktı; stajyerin 'tuhaf yeniden numaralandırma' bildirimi amir sınıfı bir hesapça 'eğitim hatası' diye kapatılmıştı ve emekli maaşlı kayınpederin üzerine geçen ay zeytinlik alınmıştı. Telsizdeki 'şu plakayı öne al' sesinin kime ait olduğunu kantinci ayırt edemedi; operatörün bahis borcu ve ekran başında uyuklaması, raporlu teknisyenin 'donduruldu mu emin değiliz' denilen servis PIN'i ve şefin adaş paravan şirketi de sonuna kadar şüpheli kaldı. Tutuklamadan sonra bekçi, defterdeki amir PIN satırının bizzat {S4} tarafından sildirildiğini itiraf etti; arsa bekçisinin tarif ettiği gece kirasını elden ödeyen adamın eşkâli oturdu ve {S4}'ün ikinci telefonundan nakliye saatlerini bildiren mesajlar çıktı.",
    S:[["Gümrük şefi","Onay yetkisi geniş; adına kayıtlı görünen bir paravan şirket iddiası araştırılıyor — aynı isimli başka biri olabilir, vergi kaydı bekleniyor."],["Tarama operatörü","Cihazı o kullanır; bahis sitelerine düzenli ödemeleri var; ekran başında uyuklamakla ünlü."],["Bariyer bekçisi","Sıra düzenleme terminalinin başında oturur; 'PIN'im yok' diyor ama kulübedeki defteri herkesten iyi bilir."],["Vardiya amiri (A)","A vardiyasını yönetir; sicili temiz görünür; kayınvalidesinin köyüne sık gider."],["Evrak memuru","Beyannameleri dosyalar; taramaya ve sıraya erişimi olmadığı söyleniyor — yetki matrisi iki yıldır güncellenmemiş."],["Bakım teknisyeni","İki aydır raporlu; limana on dakika mesafede oturuyor; servis PIN'inin dondurulduğu söyleniyor."],["Forklift operatörü","Sahada yük taşır; sıra sistemine resmî erişimi yok."],["Stajyer","Sıra ekranında gördüğü bir tuhaflığı amirine bildirmişti; sonrasını 'takip etmedim' diyor."]],
    E:[["other","Saat Deseni","Şüpheli konteynerlerin tamamı kapıdan 11:00–11:07 arasında geçmiş — cihazın günlük öz-test penceresi; bu yedi dakikada tarama görüntüsü arşivlenmiyor. Pencereyi vardiyada çalışan hemen herkes bilir.",1,0],
       ["other","Sıra Oynaması","Aynı kamyonların kuyruk numaraları, varıştan dakikalar önce elle öne çekilmiş; işlem AMİR sınıfı bir PIN'le yapılmış. Denetim raporları, amir PIN'lerinin kulübedeki bir deftere yazılması alışkanlığını geçen yıl da eleştirmiş.",1,0],
       ["other","Vardiya Eşleşmesi","Şüpheli geçişlerin büyük çoğunluğu A vardiyasında; iki geçiş, A'nın paydosu ile B'nin başlaması arasındaki devir-teslim yarım saatine denk geliyor.",1,0],
       ["other","Kulübe Defteri","Sıra terminali bariyer kulübesinde; {S3} mesaisini orada geçirir. Defterin amir PIN'lerinin yazılı olduğu sayfası yırtılmış — ne zaman yırtıldığı bilinmiyor.",1,0],
       ["other","Tapu Sorgusu","{S4}'ün kayınpederi adına geçen ay zeytinlik alınmış; kayınpederin bilinen geliri emekli maaşı. Köyde 'miras payı sattı, oradan' diyenler de var; satış belgesi henüz bulunamadı.",1,0],
       ["witness","Tanık {W2} (kantinci)","Sabahları telsizden 'on bire az kala şu plakayı öne al' anonsu duyardık. Ses kiminkiydi diye sorarsanız — telsizde herkes birbirine benziyor, yemin etmem.",1,0],
       ["phone","Stajyer Bildirimi","{S8}, sıra ekranında 'tuhaf yeniden numaralandırma' gördüğünü bildirmiş; kayıt, amir sınıfı bir hesap tarafından 'eğitim hatası' diye kapatılmış. Hangi amir hesabı olduğu loglanmamış.",1,0],
       ["phone","Şef Adaşı","{S1}'e atfedilen paravan şirketin sahibinin aynı isimli başka biri olabileceği anlaşıldı; vergi kaydı bekleniyor. Şefin bazı hızlı onay imzaları yine de dosyada.",0,1],
       ["witness","Tanık {W1}","{S2} bazı kamyonlar geçerken ekran başında uyuklardı; kaç kez dürttüm. Para mı aldı, yorgun muydu — onu ben bilemem.",0,1],
       ["phone","Operatör Borcu","{S2}'nin bahis sitelerine düzenli ödemeleri dökümde görünüyor; son ay ödemeler artmış.",0,1],
       ["other","Teknisyen PIN'i","{S6}'nın servis PIN'inin rapor başında dondurulduğu söyleniyor; BT 'dondurma talebi açıldı, uygulandı mı teyit edemiyorum' dedi. Kendisi limana on dakika mesafede oturuyor.",0,1],
       ["other","Arşiv Boşluğu","Öz-test penceresindeki geçişlerin yalnızca kapı fotoğrafı var, tarama görüntüsü yok; fotoğraflarda mühürler sağlam görünüyor.",0,0],
       ["witness","Tanık (arsa bekçisi)","Limana üç kilometre kala bir arsaya geceleri tır yanaşır; kirayı elden ödeyen hep aynı adam — yüzünü sorma, akşam karanlığında gelir, selam verir geçer.",1,0]] },

  { t:"Ormandaki İz", e:"Kayıp Kişi", d:"hard", st:"Fotoğraflar birini aklıyor gibi — ama iki saatten hangisi doğru, bilen yok.", nS:8, nW:2, c:4,
    sum:"Grup yürüyüşünden biri dönmedi; telefonu en son patika dışındaki Kayalık Burnu'ndan sinyal verdi. Herkesin bir fotoğrafı, bir imzası, bir tanığı var — ve hiçbiri tam oturmuyor: makinenin saati mi ileri, duvar saati mi geri; mont turuncu muydu sarı mıydı; defterdeki satır o gün mü yazıldı? Bu vakada kanıtlar fısıldıyor, bağırmıyor.",
    sol:"Sorumlu {S5}. Onu suçlayan tek bir kesin kanıt yoktu — ama her belirsizlik aynı yöne eğiliyordu: burna 15 dakikada ulaştıran işaretsiz kestirmeyi bilen üç-beş kişiden biriydi; kurbanla ortak rota uygulamasında 'iz satışı' kavgası taslak mesajlarda duruyordu; grup fotoğrafları onu aklıyor gibiydi ama duvar saatiyle damga arasındaki 47 dakikalık fark iki yöne de okunabiliyordu ve rehberin 'fotoğraf çekmeye takıldı' notu, fotoğrafların kayıp penceresinden ÖNCE çekildiği okumasıyla birebir örtüşüyordu. Tanığın 'içi turuncu parladı' dediği mont, sigorta lehdarı iş ortağının tek karelik fotokapan görüntüsü, rehberin mürekkebi farklı duran 14:30 satırı ve görevlinin el yazısıyla sonradan eklenmiş görünen telsiz arıza saatleri — hepsi sonuna kadar masada kaldı. Tutuklamadan sonra dengeyi bozan bulgular geldi: ikinci fotoğraftaki gölge yönü, karelerin gerçekte öğleden ÖNCE çekildiğini gösterdi; döküntüdeki taze bot izi {S5}'in tabanıyla eşleşti ve kesilen emniyet halkasındaki tel artığı, çantasındaki çok amaçlı aletin ağzıyla uyuştu.",
    S:[["İş ortağı","Kurbanla ortak iş sigortasının tek lehdarı; çıkıştan önce kurbanla tartıştığı söyleniyor; gruptan ayrı, ana patikada yürüdüğünü söylüyor."],["Tur rehberi","Grubu yönetti; yoklama defterini o tutar; bölgeyi ve kestirmeleri bilir."],["Kurbanın eşi","Kamp alanında kaldığını, mutfak çadırında yardım ettiğini söylüyor."],["Acemi kampçı","İlk kampı; gruptan hiç ayrılmadığı söyleniyor; patikaları bilmez."],["Deneyimli patika dostu","Bölgeyi avucunun içi gibi bilir; amatör dağcıdır; kurbanla rota uygulaması ortaklığı var; yeşil montunun astarının turuncu olduğu söyleniyor — kendisi 'sarıdır' diyor."],["Park görevlisi","Kulübede telsiz başında oturur; servis yolunun anahtarı ondadır."],["Doğa fotoğrafçısı","Ana patikada sabit noktadan çekim yaptığını söylüyor; tripodu kurulu bulundu, kendisi başında değildi."],["Sırt çantacı genç","Grubun en önünde, hızlı yürüyen bir genç; kimseyle konuşmadı."]],
    E:[["gps","Son Sinyal","Kurbanın telefonu son kez 13:54'te, patika dışındaki Kayalık Burnu'nu kapsayan hücreden sinyal verdi; hücre geniş, nokta konum yok.",1,0],
       ["other","Kestirme Bilgisi","Burna iki yol var: bir saatlik servis yolu ya da kaya döküntüsü üzerinden, yerini bilenin 15 dakikada geçeceği işaretsiz kestirme. Kestirmeyi kimlerin bildiği tartışmalı — 'eski müdavimler bilir' deniyor.",1,0],
       ["camera","Grup Fotoğrafları","{S5}, 13:30 ve 13:50 damgalı karelerde grubun içinde görünüyor.",0,1],
       ["forensic","Saat Çelişkisi","Karelerden birinde kampın duvar saati 12:43'ü gösterirken damga 13:30. Makine mi 47 dakika ileri, duvar saati mi geri (pili eski) — kamp görevlisi 'o saat ara ara şaşar' dedi; kesin değil.",1,0],
       ["other","Yoklama Defteri","Rehberin defterinde 13:10 sayımında kurbanın gruptan ayrıldığı, 14:30 sayımında {S5}'in 'fotoğraf çekmeye takıldığı' yazıyor. 14:30 satırının mürekkebi diğer satırlardan farklı duruyor; rehber 'kalemim bitti, değiştirdim' diyor.",1,0],
       ["forensic","Kesik Halka","Kurbanın çantasındaki emniyet halkası önce gerilmiş, sonra tek hamlede kesilmiş. Bir eksper 'dağcı işi' diyor; ikincisi 'iyi bilenmiş herhangi bir bıçak da yapar' diyor.",1,0],
       ["phone","Uygulama Kavgası","Kurban, ortak oldukları rota uygulamasında korunan bölge izlerinin gizlice satıldığını fark etmiş; 'bunu açıklayacağım' mesajı telefonunda TASLAK klasöründe — gönderilip gönderilmediği belirsiz.",1,0],
       ["camera","Fotokapan","{S1}, ana patikadaki fotokapanda 13:22'de tek karede görünüyor; öncesi ve sonrası boş. Fotokapan hareketle tetiklenir, her geçeni yakalamayabilir.",0,1],
       ["phone","Sigorta Poliçesi","{S1}, kurbanla ortak iş sigortasının tek lehdarı; poliçe iki ay önce yenilenmiş; yenileme talebini kimin başlattığı poliçeden anlaşılmıyor.",0,1],
       ["other","Telsiz Arızası","Bölge telsiz rölesi o öğlen 40 dakikalık arıza kaydı vermiş; arıza saatleri tutanağa {S6}'nın el yazısıyla SONRADAN eklenmiş görünüyor. Kendisi 'akşam toparlarken yazdım' diyor.",0,1],
       ["other","Ziyaretçi Defteri","{S6}'nın kulübe defterinde 13:05 ve 14:20'de ziyaretçi imzaları var; ara saatlerde kayıt yok — ziyaretçi gelmemiş de olabilir.",0,0],
       ["witness","Tanık {W1}","Döküntü tarafından inen birini gördüm; montunun içi turuncu parladı sanki — ya da sarıydı, güneş vuruyordu. Bir de o gün yarım grup benzer yağmurluk giymişti, onu söyleyeyim.",1,0],
       ["witness","Tanık {W2}","{S3} mutfak çadırında bizimle çorba kaynattı; ayrılmadı derim ama ben de gelip gidiyordum, yemin edemem.",0,0],
       ["other","Tripod Detayı","{S7}'nin tripodu ana patikada kurulu bulundu; hafıza kartındaki çekimlerde 13:15–14:05 arası boş — kendisi 'pil değiştirmeye indim' diyor.",0,1]] },

  { t:"Sızan Tasarım", e:"Kurumsal Casusluk", d:"hard", st:"Sızan bir dosya değil, bir fotoğraf — ve fotoğrafı kimin çektiğini hiçbir kamera görmedi.", nS:8, nW:2, c:0,
    sum:"Gizli bir ürün tasarımı rakipte ortaya çıktı. Sızan şey dosya değil, ekrandan çekilmiş bir fotoğraf. O ekran tek bir odada, tek bir gün açıldı. Fotoğrafın köşesinde bir saat, çerçevesinde silik bir yansıma, önünde unutulmuş bir bardak var. Hepsi bir şey fısıldıyor; hiçbiri kesin konuşmuyor.",
    sol:"Sızdıran {S1}. Hiçbir kanıt tek başına onu göstermiyordu: bilekteki koyu şerit bant da olabilirdi saat de; bitki çayını dolaptaki unutulmuş poşetlerden herkes demletebilirdi; kantin görüntüsünde {S4}'ün olup olmadığı bile tartışmalıydı. Ama kesişim daralıyordu: ekran köşesindeki 16:47 ve sensörün 16:46'da uyanması, fotoğrafın kahve arasında, odada kalan biri tarafından çekildiğini söylüyordu; kamerada net seçilen {S2}, {S3} ve {S6} kuyruktaydı; geriye kalanlar içinde 'ödevi getirirsen süreç hızlanır' yazışması, iki kez yarıda kesilen terfi ve bileğinde destek bandı taşıma alışkanlığı yalnızca bir kişide üst üste biniyordu. Proje müdürünün sürümü belirlenemeyen DLP dosyası ve stajyerin tutanaksız 'emanete alınan cihaz' söylentisi sonuna kadar açık kaldı. Tutuklamadan sonra resim netleşti: rakip tarafın aracısı ifadesinde 'çizim elden geldi, gönderen tasarım ekibinden' dedi; {S1}'in evindeki eski telefonun galerisinde kırpılmamış orijinal kare bulundu — çerçevede bilek bandı ve bitki çayı bardağı net görünüyordu.",
    S:[["Kıdemli tasarımcı","İki dönemdir terfi listesinden son anda çıkarıldı; bileğinde zaman zaman destek bandı taşır; kantine kendi bitki çayı poşetini getirdiği olur."],["Proje müdürü","Tüm kaynak dosyalara erişir; geçen ay kişisel postasına dosya yolladığı için DLP alarmı almıştı."],["Pazarlama uzmanı","Yalnızca onaylı görselleri görür; demoya 'sunum dili' için katıldı."],["Stajyer tasarımcı","İzleme yetkisi var; demoda telefonuna el konulduğu söylentisi çıktı."],["Hukuk danışmanı","Tasarım dosyalarına erişimi yok; demoya katılmadığı söyleniyor — katılım listesi elle tutulmuş."],["Baskı sorumlusu","Çıktılar onun biriminden geçer; o da ara ara bilek desteği kullanır."],["Satış temsilcisi","İç tasarım sistemine giremez; demo günü müşteride olduğunu söylüyor, ziyaret raporu imzasız."],["Ofis asistanı","Dosya yetkisi yok; toplantı düzenini o kurar; demo odasına en son giren çıkan genelde odur."]],
    E:[["other","Filigran","Sızan karede v0.9.3-RC filigranı var; bu derleme yalnızca gözden geçirme odasındaki izole kioskta, perşembe 16:00 demosunda açıldı ve makineden çıkmadığı düşünülüyor — kioskun USB portu mühürlü ama mühür tarihi okunmuyor.",1,0],
       ["other","Tutanak","Demo tutanağı: 16:00 başlangıç, 16:45–16:55 kahve arası, 17:05 bitiş. Katılım listesi elle tutulmuş; iki isim sonradan araya sıkıştırılmış gibi duruyor.",1,0],
       ["other","Ekran Saati","Sızan karede kioskun saat aracı 16:47'yi gösteriyor — fotoğraf kahve arasında çekilmiş olmalı; kioskun saatinin doğru olduğu varsayılıyor, kimse kontrol etmemiş.",1,0],
       ["other","Sensör Kaydı","Kioskun yakınlık sensörü 16:46'da ekranı uyandırmış; ara boyunca odada en az bir kişi kalmış ya da biri girip çıkmış.",1,0],
       ["camera","Kantin Kamerası","16:45–16:55 kahve kuyruğunda {S2}, {S3} ve {S6} net seçiliyor; {S4}'ün görünüp görünmediği tartışmalı — görüntü kalabalık, kuyruğa girip çıkan var.",1,0],
       ["forensic","Yansıma","Karede, kioskun parlak çerçevesine düşen silik bir yansıma var: çeken elin bileğinde koyu bir ŞERİT seçiliyor — destek bandı mı, kol saati mi, bileklik mi, çözünürlük karar verdirmiyor.",1,0],
       ["other","Bilek Alışkanlığı","Ofiste bilek desteği kullandığı bilinen en az iki kişi var: kıdemli tasarımcı ve baskı sorumlusu; ara ara kullanan başkaları da olabilir, kimse liste tutmuyor.",1,0],
       ["witness","Tanık {W2} (temizlik görevlisi)","O akşam odayı toplarken kioskun önünde bir bardak buldum; kahve değil, bitki çayıydı. Kantin bitki çayını genelde kendi poşetini getirene demler ama dolapta unutulmuş poşetler de olur, oradan alan alır.",1,0],
       ["phone","Danışman Yazışması","{S1}'in, rakip şirkete bağlı olduğu iddia edilen bir 'kariyer danışmanıyla' yazışmasında 'ödevi getirirsen süreç hızlanır' cümlesi geçiyor; bağlam belirsiz — gerçek bir eğitim ödevi de olabilir.",1,0],
       ["other","Terfi Dosyası","{S1}, iki dönemdir terfi listesinden son anda çıkarılmış; itiraz dilekçeleri dosyada.",1,0],
       ["phone","DLP Alarmı","{S2} geçen ay kişisel postasına bir sunum yollamış; incelemede dosyanın hangi sürüm olduğu belirlenemedi. {S2} 'kamuya açık eski broşürdü' diyor.",0,1],
       ["other","Emanet Söylentisi","{S4}'ün telefonuna demoda el konulduğu konuşuldu; tutanak yok ama güvenlik o gün 'bir cihaz emanete alındı' kaydı düşmüş — kimin cihazı olduğu yazılmamış.",0,1],
       ["witness","Tanık {W1}","Arada herkes çıktı sanıyordum; kapı bir kez de aranın ortasında açıldı. Kim girdi çıktı görmedim, sırtım dönüktü.",0,0],
       ["other","Asistan Rutini","{S8} demo odasını ara sonunda havalandırmak için açtığını söylüyor; kapı sensörü aranın ortasındaki açılışı da ona mı ait gösteriyor, kayıt dakika bazında tutulmuyor.",0,1]] },

  { t:"Fidye Notu", e:"Kaçırma ve Fidye", d:"hard", st:"Çocuk sağ salim bulundu. Faili kimse görmedi; herkes 'tanıdık biriydi' diyor.", nS:8, nW:2, c:2,
    sum:"Bir çocuk okul çıkışı kaçırıldı, aynı gece eski bir parça deposunda sağ salim bulundu. Fidye notunda yalnızca ev halkının bildiği lakap yazıyor. Çocuk, gittiği kişiye güveniyordu. Fidye araması bir araçtan yapıldı; arabanın radyosu açıktı. Bu dosyada herkesin mazereti var — ve hiçbirinin tanığı yok.",
    sol:"Sorumlu {S3}. Hiçbir tanık onu görmedi; desen onu gösterdi: fidye aramasının arkasındaki tünel sesleri ve trafik anonsu, arayanı o saatlerde D-100 üzerinde bir araca koyuyordu — anonsun 17:42 mi 17:12 tekrarı mı olduğu tartışıldı ama iki ihtimalde de direksiyonda olan biri gerekiyordu. Çocuğun bulunduğu depo, geçen yaz aile aracının torpidosundan kaybolan eski anahtarlıkla açılmıştı ve o aracı o dönem hem şoför hem dadı kullanıyordu — bu kapı uzun süre iki yöne de açık kaldı; dadının ifade tutanağındaki saatlerin sekreter tarafından sonradan yazıldığının anlaşılması işi daha da bulandırdı. Ama lakabı bilen, çocuğun el sallayıp güleceği kadar yakın olan, o gün güzergâhtan sapıp sanayiye giren ve 'lastikçiye uğradım' deyip defterde kaydı çıkmayan tek kişi şoför olarak kalıyordu. Muhasebecinin eski tehditleri, avukatın boş duruşma arası ve öğretmenin 'kapıda tanıdık var sandım' cümlesi sonuna kadar masadaydı. Çözülme tutuklamadan sonra geldi: depo kirasını elden ödeyen adamın eşkâli {S3}'e oturdu, ankesör değil araç içi kontör hattının sim kartı yedek stepnenin altından çıktı ve çocuk, kendisine 'sürpriz gezi' diyen kişinin 'şoför amca' olduğunu sakince anlattı.",
    S:[["İş ortağı","Babayla ortaklık kavgası vardı; pasaport kaydına göre olaydan iki gün önce yurt dışına çıkmış; dönüş kaydı yok — kara yoluyla dönüş kayda girmeyebilir."],["Çocuğun öğretmeni","Çocuğu okuldan tanır; çıkışta son gören kişi; 'kapıda bekleyen tanıdık var sandım' dedi."],["Aile şoförü","Çocuğun rutinini ve lakabını bilir; aile aracını o kullanır; o gün 'lastikçiye uğradım' diyor."],["Eski muhasebeci","Aileye kin besler; aylar önce tehdit mesajları atmıştı; dün 'şehirde görüldü' ihbarı geldi, doğrulanamadı."],["Bahçıvan","Evin dışında çalışır; eve girmediği söyleniyor; küçük bir tüketici kredisi var, düzenli ödüyor."],["Komşu","Aileyle kapı komşusu; çocuğu uzaktan tanır; o saatlerde 'evdeydim' diyor, doğrulayan yok."],["Dadı","Çocuğun lakabını ve rutinini bilir; olay akşamı evde olduğunu söylüyor; aile aracını zaman zaman o da kullanır."],["Aile avukatı","Mali işleri bilir; lakaptan haberdar olabilecek kadar yakın; o gün adliyede iki duruşması var, arası boş."]],
    E:[["other","Nottaki Lakap","Fidye notunda çocuğun yalnızca ev içinde kullanılan lakabı yazıyor. Lakabı ev halkı dışında kimlerin duymuş olabileceği konusunda aile kendi içinde bile anlaşamıyor.",1,0],
       ["witness","Tanık {W1}","Çocuk, tanıdığı birinin elinden tutup hiç direnmeden gitti; arabaya binerken gülüyordu bile. Arabayı sorma — beyaz mıydı gri miydi, o saatte hepsi aynı.",1,0],
       ["phone","Arka Plan Sesi","Fidye aramasının arkasında tünel geçiş 'düt'leri ve bir trafik anonsu duyuluyor. Anons 17:42'de yayınlandı; ama radyo arşivine göre aynı anons 17:12'de de okunmuş — arayanın hangi tekrara denk geldiği kesin değil. İki durumda da arayan, D-100 hattında hareket hâlindeki bir araçtaydı.",1,0],
       ["other","İfade Tutanağı","{S7}, 17:30–18:05 arasında evde polise ifade verdiğini söylüyor. Tutanaktaki saatlerin, ifadeyi yazan sekreter tarafından SONRADAN doldurulduğu anlaşıldı; sekreter 'aşağı yukarı o saatlerdi' diyor.",0,1],
       ["other","Depo Kilidi","Çocuğun bulunduğu eski parça deposunun kilidi zorlanmadan, eski tip bir anahtarla açılmış.",1,0],
       ["other","Kayıp Anahtarlık","Ailenin yazlık-depo anahtarlığı geçen yaz aracın torpido gözünden kaybolmuştu. O dönem aracı ağırlıkla şoför, ara ara da dadı kullanıyordu; kayıp tutanağında 'fark eden: sürücü' yazıyor, isim yazmıyor.",1,0],
       ["gps","Rota Sapması","Aile aracı o gün okul güzergâhından sapıp sanayi bölgesine girmiş. Sürücüsü 'lastikçiye uğradım' dedi; lastikçi 'gelmiş olabilir, ben defter tutmam' dedi.",1,0],
       ["witness","Tanık {W2} (pompacı)","Fidye hattının kontörü bizden alındı. Alan kişi araçtan pek inmeden uzandı; tanıdık geldi ama buralarda çok şoför var, hepsi birbirine benzer. Cam suyu da aldıydı sanki — ya da o başka müşteriydi.",1,0],
       ["phone","Eski Tehditler","{S4}'ün aylar önceki tehdit mesajları dosyada; dünkü 'şehirde görüldü' ihbarı doğrulanamadı.",0,1],
       ["other","Okul Çıkışı","{S2}, çocuğu son gören kişi; 'kapıda bekleyen tanıdık var sandım, el salladı' diyor; kime el sallandığını görmemiş.",0,1],
       ["other","Adliye Listesi","{S8} o gün adliyede iki duruşmada görünüyor: 15:00 ve 18:30. Aradaki saatlerde nerede olduğuna dair kayıt yok; 'dosya okudum' diyor.",0,1],
       ["phone","Pasaport Kaydı","{S1}'in çıkış kaydı olaydan iki gün öncesi; dönüşe dair kayıt yok — kara yoluyla dönüş kayda girmeyebilir.",0,0],
       ["other","Servis Defteri","Sanayideki oto servislerin hiçbirinin defterinde o gün aile aracına ait kayıt yok; ancak bölgedeki küçük dükkânların yarısı defter tutmuyor.",1,0]] },

  { t:"Müzedeki Boş Çerçeve", e:"Sanat Eseri Hırsızlığı", d:"hard", st:"Tablo dün gece çalınmadı; haftalardır yerinde değildi. Kimin elindeydi — işte o liste uzun.", nS:8, nW:2, c:2,
    sum:"Bir müzede tablonun sahte olduğu anlaşıldı. Herkes 'gece soygunu' konuşuyor; oysa sahtenin boyası, değişimin haftalar önce yapıldığını söylüyor. O haftalarda tabloya kimler dokunabildi sorusunun cevabı sanıldığı kadar kısa değil: zimmet defterleri düzensiz, ikinci anahtarlar gezgin, gece sayaçları isimsiz.",
    sol:"Hırsız {S3}. Onu gösteren tek bir doğrudan iz yoktu: atölyeye stajyerler de giriyordu, ikinci anahtar idarede geziyordu, gece sayaçları isim tutmuyordu, ihbar maili isimsizdi. Ama çerçeve daralıyordu: boya kürü değişimi 3-5 hafta öncesine, sergi takvimi tabloyu tam o haftalarda atölyeye koyuyordu; iade yalnızca UV hızlı kontrolüyle yapılmıştı — bu eksikliği en iyi bilen, iadenin 'yeterli' sayılacağına güvenebilecek kişi içerideki bir elden başkası olamazdı. Nadir bronz raptiyelerin kurum faturalı satışının teslim imzası atölyeye aitti; tablo içerideyken gece girişleri ikiye katlanmış, tanık geç saatlerde şövale başında birini görmüştü. Küratörün gerekçesiz katalog düzeltmesi, teknisyenin 'açık kalan terminali' ve temizlikçinin pigmentli bezi sonuna kadar şüpheli kaldı — hiçbiri çözülmedi, ta ki tutuklama sonrasına kadar: spektroskopi, sahtedeki modern bağlayıcıyı atölye dolabındaki açılmış şişeyle eşledi; isimsiz ihbarın gönderildiği kafenin kamerasında {S3} seçildi ve özel koleksiyoner, 'durumu çok iyi, yakında müsait olur' mesajlarını onun numarasından aldığını ifade etti.",
    S:[["Güvenlik teknisyeni","Gece kamera komutları onun terminalinden girilebiliyor; vardiyaları düzensiz; 'terminalim açık kalır, herkes bilir' diyor."],["Müze müdürü","O gece galadaydı; bütçe kesintileri yüzünden yönetimle arası gergin."],["Restoratör","Atölyenin asıl çalışanı; tablo dört hafta onun sorumluluğundaydı; özel koleksiyonerlere danışmanlık yaptığı söylentisi var, kendisi reddediyor."],["Bekçi","Gece turlarını atar; sanat bilgisi yok; tur saatleri çizelgeyle her zaman tutmuyor."],["Rehber","Gündüz çalışır; eserlerin hikâyelerini ezbere bilir; atölyeye girdiği görülmemiş ama anahtar dolabının yeri herkesçe bilinir."],["Temizlikçi","Atölye dahil tüm alanları temizler; arabasında pigment bulaşığı bir bez bulundu."],["Küratör","Katalogları o yazar; geçen ay tabloyla ilgili bir kaydı değiştirdi; gerekçe dosyada yok."],["Sigorta eksperi","Yıllık rapor için müzeye gelip gidiyor; değer biçme yetkisi var; iade gününde müzedeydi."]],
    E:[["forensic","Boya Kürü","Çerçevedeki sahtenin boyası tam sertleşmemiş; değişim dün gece değil, 3–5 hafta önce yapılmış olmalı. Laboratuvar aralığı 'ortam nemine göre bir hafta oynayabilir' notuyla verdi.",1,0],
       ["other","Sergi Takvimi","Tablo tam o aralıkta dört hafta sergiden indirilip temizlik için restorasyon atölyesindeydi; depo kaydı yok. Atölyeye o haftalarda kimlerin girdiğine dair tutarlı bir liste çıkarılamadı.",1,0],
       ["other","İade Kontrolü","Atölyeden iadede yalnızca 'UV hızlı kontrol' yapılmış; tutanakta spektroskopi yok. Bugünkü analiz sahtede tek bir modern bağlayıcı yakaladı. Hızlı kontrolün kimin kararı olduğu tutanaktan anlaşılmıyor.",1,0],
       ["forensic","Raptiye Tipi","Sahte tuvalin bronz raptiyeleri nadir bir tip. Şehirdeki tek satıcının defterinde son aylarda birkaç satış var; ikisi nakit ve alıcısı kayıtsız, biri kurum faturalı: müze. Kurum siparişini idare verir, teslimi atölye alır — teslim imzası okunaksız.",1,0],
       ["other","Atölye Erişimi","Atölyede ağırlıklı olarak restoratör çalışır; dönem dönem stajyerler girer, nadiren küratör uğrar. Malzeme dolabının ikinci anahtarı idarededir; zimmet defteri düzensiz tutulmuş.",1,0],
       ["other","Giriş Sayacı","Atölye kapısının sayacı, tablo içerideyken gece girişlerini normalin iki katı saymış; sayaç kart eşleşmesi tutmaz, yalnızca adet sayar. Bekçinin gece turları da sayıma karışıyor olabilir.",1,0],
       ["phone","İhbar Maili","İsimsiz bir ihbar maili 'müzeden biri özel bir koleksiyonere eser ayarlıyor' diyor; isim verilmemiş, mail bir kafenin ağından atılmış.",1,0],
       ["witness","Tanık {W1}","Tablo atölyedeyken birkaç akşam ışıklar geç saate kadar yanıyordu; içeride şövale başında biri vardı. Kim derseniz — boyu posu normal, önlüklü sanki; oradan geçerken şöyle bir gördüm.",1,0],
       ["other","Katalog Düzeltmesi","{S7} geçen ay katalogda tabloyla ilgili bir kaydı değiştirdi; değişikliğin gerekçesi dosyada yok. Kendisi 'çerçeve ölçüsü düzeltmesiydi' diyor; onay yazışması bulunamadı.",0,1],
       ["other","Gece Komutu","Kamerayı döngüye alan gece komutu {S1}'in terminalinden girilmiş görünüyor. {S1} 'o saatte mesaide değildim, terminalim açık kalır' diyor; mesai kayıtları o hafta için eksik.",0,1],
       ["forensic","Lekeli Bez","{S6}'nın arabasında pigment bulaşığı bir bez bulundu; numune küçük olduğu için pigmentin sınıfı belirlenemedi.",0,1],
       ["witness","Tanık {W2} (sigorta eksperi)","İade günü esere şöyle bir bakıldı; 'asıl kontrol sergi öncesi yapılır' dendi — yapılmadı. Kimin dediğini hatırlamıyorum, ortam kalabalıktı.",0,0],
       ["other","Bekçi Turları","{S4}'ün gece tur çizelgesi ile elektronik nokta okutmaları üç gecede tutmuyor; kendisi 'cihaz bazen okumuyor' diyor — cihazın arıza geçmişi gerçekten var.",0,1]] },

  { t:"Hayalet Hesaplar", e:"Siber Dolandırıcılık Ağı", d:"hard", st:"Saldırgan binaya hiç girmedi. İçeride kimse yoktu — ve herkes şüpheli.", nS:8, nW:2, c:1,
    sum:"Bir şirketin altyapısında sahte hesaplar açıldı. İzler bir geliştiricinin ev adresine çıkıyor — ama o, işlemlerin yapıldığı gecelerin ikisinde okyanus üzerinde uçuyordu. Birisi suçu ustaca paketleyip ona teslim etti. Loglar eksik, listeler çelişkili, mahkeme kararları bekleniyor. Elinde kesin kanıt olmayacak; elinde desen olacak.",
    sol:"Sorumlu {S2}. Kanıtların hiçbiri tek başına yetmiyordu: bilet kaydının kapatan alanı bozuktu, sertifika listeleri çelişkiliydi, mobil hat tespiti mahkeme kararı bekliyordu, veri patlamasının 'gece tarifesi kampanyası' gibi masum bir açıklaması bile vardı. Ama desen tekti: saldırı, yalnızca senkron gecikmesi olan eski düğümde geçerli kalan eski anahtar ve eski sertifikayla yapılmıştı — bu incelikli zaaf, herkesin bildiği bir şey değildi; onu en iyi bilen, gecikme kaydını 'düzeltilmeyecek' diye kapatma kararının arkasındaki kişiydi ve kaydı açan {S2}'ydi. {S7}'ye kurulan tuzak, uçuş saatlerini bilen ekipten birini gösteriyordu; binaya hiç girmemek bu suçta mazeret değildi. Ağ uzmanının kasadaki gece görüntüleme kaydı, mimarın saat dilimi tartışmalı konferansı ve veri patlamasının tarife açıklaması sonuna kadar masada kaldı. Mahkeme kararıyla gelen sağlayıcı dökümü düğümü çözdü: bağlantıların yapıldığı mobil hat, {S2}'nin kayınbiraderi üzerine kayıtlı ikinci bir hattı; ve eski düğüme ait test imajı, onun kişisel bulut yedeğinden çıktı.",
    S:[["Takım lideri","Olay haftası yıllık izindeydi; dönüşte olayı ilk raporlayan o oldu."],["Veritabanı yöneticisi","Hesap açma yetkisi var; o hafta izinliydi ve binaya hiç girmedi; izni şehirde geçirdiğini söylüyor."],["Ağ uzmanı","Servis anahtarlarının kasasını o yönetir; iç ağ yönlendirmesine hâkim."],["Destek görevlisi","Yalnızca şifre sıfırlama yetkisi var; gece vardiyasında çalışır."],["Tester","Test ortamına erişir; üretim sistemine yetkisi olmadığı söyleniyor; yetki matrisi eski."],["Sistem mimarı","O hafta yurt dışında bir konferansta olduğunu söylüyor; bakım sertifikasının durumu listeden listeye değişiyor."],["Kıdemli geliştirici","Sahte oturumlar onun ev adresinden görünüyor; üç hafta önce 'şüpheli giriş' bildirmiş, VPN sertifikası yenilenmişti."],["Stajyer","Yalnızca okuma yetkisi; gece erişim kaydı görünmüyor — stajyer logları 30 günde siliniyor."]],
    E:[["other","Servis Anahtarı","Sahte hesaplar parolayla değil, bir servis anahtarıyla açılmış; anahtar kasasını {S3} yönetiyor; kasaya 'acil durum' erişimi olan başka roller de var, listesi güncel değil.",1,0],
       ["other","Eski Anahtar","Kullanılan anahtar, iki hafta önce değiştirilen ESKİ sürüm; eski sürüm yalnızca iptal listesi gecikmeli senkronlanan 'eski düğüm' üzerinde geçerliydi. Bu zaafı kaç kişinin bildiği belirsiz.",1,0],
       ["other","Kapatılan Kayıt","Eski düğümün senkron gecikmesi için açılan #8841 numaralı kayıt 'düzeltilmeyecek' diye kapatılmış. Kaydı açan kişi {S2}; kapatan kullanıcı alanı, sistem taşınırken bozulmuş — kapatma kararının kimden çıktığı kayıttan okunamıyor.",1,0],
       ["gps","Uçuş Kaydı","Sahte oturumlar {S7}'nin ev IP'sinden görünüyor; ancak işlemlerin yapıldığı dört gecenin ikisinde {S7} okyanus üzerinde uçuyordu (biniş kartı + uçak Wi-Fi kaydı).",1,0],
       ["other","Sertifika Notu","{S7} üç hafta önce 'şüpheli giriş' bildirmiş, VPN sertifikası yenilenmişti. Eski sertifika da tıpkı eski anahtar gibi yalnızca eski düğümde geçerliydi.",1,0],
       ["other","Erişim Yolu","Eski düğüme yalnızca bakım VPN'i üzerinden girilebiliyor. Bakım sertifikası 'altyapı ekibine' tanımlı; ekibin kimlerden oluştuğu konusunda İK'da iki farklı liste var, isimler birbirini tutmuyor.",1,0],
       ["other","Dış Sağlayıcı Logu","Bakım VPN'inin dış sağlayıcı kayıtlarına göre o gecelerdeki bağlantılar mobil şebeke bloklarından gelmiş; hangi hatlar olduğu mahkeme kararı bekliyor.",1,0],
       ["phone","Veri Dökümü","{S2}'nin hat faturasında tam o gecelerde 03:00–04:00 arasında olağan dışı veri kullanımı var; kendisi 'dizi indiriyordum' diyor. Operatörün o ay herkese tanımladığı gece tarifesi kampanyası da dökümde görünüyor.",1,0],
       ["phone","Kripto Tuzağı","{S7}'nin cüzdanına bağlı görünen aktarım, uçuş saatine denk geliyor — saat dilimi hesabı tartışmalı ama tuzak ihtimali ciddiye alındı: bağlantıyı kuran her kimse {S7}'nin programını biliyordu.",1,0],
       ["other","Kasa Görüntülemesi","Anahtar kasası erişim logunda {S3}'ün olağan dışı bir gece saatinde 'görüntüleme' kaydı var; kendisi 'rutin denetimdi' diyor; denetim takviminde o gece görünmüyor.",0,1],
       ["other","İzin Dilekçesi","{S2} o hafta izinliydi ve binaya hiç girmedi; izni şehirde geçirdiğini söylüyor. Bu suç için binada olmak gerekmiyor.",0,0],
       ["witness","Tanık {W1} (gece bekçisi)","O geceler ofis bomboştu; 'iş içeriden' diyorlar ama içeride kimse yoktu, ben söyleyeyim.",1,0],
       ["other","Mimar Konferansı","{S6} o hafta yurt dışında konferansta olduğunu söylüyor; konuşma kaydı var ama saat dilimi hesabı gece saatlerini kapsayıp kapsamadığını tartışmalı bırakıyor.",0,1],
       ["witness","Tanık {W2} (İK uzmanı)","Altyapı ekibi listesini iki kere güncelledik, ikisinde de farklı isimler çıktı; hangisi doğru diye sorarsanız — ikisi de eksik olabilir.",0,0]] },

  { t:"Köprü Altındaki İnfaz", e:"Mafya İnfazı", d:"hard", st:"Kurban katiline el salladı. Herkesin mazereti var; hiçbirinin tanığı tarafsız değil.", nS:8, nW:2, c:0,
    sum:"Bir örgüt adamı köprü altında, bir metreden yakın mesafeden vuruldu. Balistik bir tetikçiyi, defterler bir muhasebeciyi, dakikalar bir korumayı işaret ediyor. Kurban katilini görünce el sallamıştı. Kamera kayıtları karanlık, ölçümler hata paylı, tanıklar taraflı — bu dosyada kimse aklanmayacak; sen en tutarlı hikâyeyi bulacaksın.",
    sol:"Tetikçi {S1}. Kesin kanıt yoktu; tutarlılık vardı: kurban katiline el sallayacak kadar güveniyordu ve ajandasındaki '23:30 — K.A. mutabakat' notu, K.A. ne anlama gelirse gelsin, bir hesap görüşmesini düşündürüyordu — pazartesi başlayacak dış denetim, ara hesaplardaki ters kayıtları ortaya çıkaracaktı ve 'patronun sözlü talimatıydı' savunmasının yazılı izi yoktu. Kumarhane kaydı onu akşam boyu masada gösteriyordu; ama 23:15–00:45 arasında yüzü hiç dönmüyor, omuz ölçümü hata payıyla 'daha dar olabilir' raporlanıyor, fişler kımıldamıyor ve her gelişinde bahşiş verip iki laf eden adam o gece garsona elinin tersiyle 'istemez' diyordu. Köprü 12 dakikaydı. Korumanın karanlık kapı kamerasındaki 'benzeyen silüeti', çalıntı silah ve kontörlü çağrı paketiyle hazırlanmış tetikçi günah keçisi, bar işletmecisinin kamerasız arka deposu — hepsi sonuna kadar açık kaldı. Tutuklamadan sonra hesap kapandı: kumarhanenin tuvalet koridorundaki bakım kamerasında 23:18'de ceket değiştiren iki adam seçildi; dublörlük yapan adam yakalanıp 'ceketi giydim, masada oturdum, parasını aldım' diye ifade verdi ve {S1}'in ayakkabısındaki çamur, köprü altındaki dolgu toprağıyla eşleşti.",
    S:[["Örgüt muhasebecisi","Defterleri ve ara hesapları o tutar; kumar tutkunu olarak bilinir; o gece kumarhanede olduğunu söylüyor."],["Şoför","Patronun aracını kullanır; o gece patronu başka bir adrese bıraktığını söylüyor; araç takip cihazı o hafta 'arızalıydı'."],["Koruma","Kurbanın en güvendiği adamlardandı; o gece konvoyla görevdeydi; bir ara konvoydan ayrıldığı kayıtlı."],["Husumetli tetikçi","Kurbanla kan davası var; balistik, ona kayıtlı bir silaha çıkıyor; 'tuzağa düşürüldüm' diyor."],["Bar işletmecisi","Köprüye yakın barın sahibi; o gece bar açıktı; ara ara kamerasız arka depoya indiği biliniyor."],["Haberci","Örgüt içinde mesaj taşır; kurbanla son günlerde sık görüşmüştü; o gece nerede olduğu konusunda iki farklı ifade verdi."],["Eski ortak","Kurbanla yıllar önce yolları ayrılmıştı; o gece hastanede refakatçiydi; giriş kaydı var, koridorlar serbest."],["Tefeci","Kurbanın borçlularındandı; o gece başka semtte olduğunu söylüyor; tanığı kendi adamı."]],
    E:[["forensic","Atış Mesafesi","Kurban bir metreden yakın mesafeden vuruldu; yanına silahlı yaklaşmasına izin verdiği biriydi.",1,0],
       ["witness","Tanık {W1}","Köprü tarafına yürüyen adamı kurban görünce el salladı; telaş yoktu, tanıdık gibiydi. Adamın boyu mu — orta işte, herkes gibi.",1,0],
       ["other","Ajanda Notu","Kurbanın defterinde o gece için '23:30 — K.A. mutabakat' yazıyor. Mutabakat örgütte hesap görüşmesi demek; K.A.'nın 'köprü altı' mı, bir kişinin baş harfleri mi olduğu çözülemedi.",1,0],
       ["phone","Denetim Mesajı","Kurban iki gün önce yakın çevresine 'pazartesi defterler dış denetime gidiyor' diye yazmış.",1,0],
       ["phone","Zimmet İzi","Defter incelemesinde, {S1}'in yönettiği iki ara hesapta açıklanamayan ters kayıtlar bulundu. {S1} 'patronun sözlü talimatıydı, vergi düzeniydi' diyor; talimatın yazılı izi yok.",1,0],
       ["camera","Kumarhane Kaydı","{S1}, 22:00–01:00 arasında poker masasında görünüyor; kayıt kesintisiz.",0,1],
       ["forensic","Omuz Ölçümü","23:15–00:45 arasındaki karelerde masadaki adamın yüzü hiç dönmüyor. Omuz ölçümü, kamera açısı yüzünden 2–5 cm hata payıyla 'öncekinden daha dar OLABİLİR' diye raporlandı; fişler de o aralıkta hiç oynamıyor — krupiye 'saatlerce pas geçtiği olur, üslubudur' dedi.",1,0],
       ["other","Mesafe","Kumarhane ile köprü altı arası gece trafiğinde 12 dakika sürüyor.",1,0],
       ["witness","Tanık {W2} (kumarhane garsonu)","O gece iki kez içki götürdüm; ikisinde de yüzünü dönmeden eliyle itti. Hâlbuki her gelişinde bahşiş verir, iki laf ederdi. Garip dedim içimden — ama yorgundur belki, bilemem.",1,0],
       ["forensic","Balistik","Mermi, {S4} adına kayıtlı ve aylar önce çalındığı bildirilen bir silahtan çıkma.",0,1],
       ["other","Hırsızlık Tutanağı","O silahın çalındığı yer örgütün kendi otoparkı; o gece kamera arızalıydı. Otoparka kimlerin girebildiği konusunda 'üyeler' deniyor; misafir araçları da alındığı oluyor.",1,0],
       ["phone","Sahte Çağrı","{S4}'e o gece köprü yakınına 'buluşma' çağrısı atılmış; mesajı atan hat kontörlü, sahibine ulaşılamıyor.",0,1],
       ["gps","Konvoy Kaydı","{S3}, 23:38–23:50 arasında konvoydan ayrı görünüyor. Patronun indiği adresin kapı kamerasında patronun yanında bir silüet var — korumaya benziyor ama görüntü karanlık, kesin teşhis yapılamadı.",0,1],
       ["other","Bar Hesabı","{S5}'in barında o gece yoğunluk vardı; kasa hareketleri düzenli. İşletmecinin ara ara indiği arka depo tarafında kamera yok.",0,0]] }
];

function _detShuffle(arr) { var c = arr.slice(); for (var i = c.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = c[i]; c[i] = c[j]; c[j] = t; } return c; }

async function _seedCaseChar(tpl, pool) {
  var need = tpl.nS + (tpl.nW || 0);
  var cast = _detShuffle(pool).slice(0, Math.min(need, pool.length));
  while (cast.length < need) cast.push(pool[Math.floor(Math.random() * pool.length)]);
  var nameOf = function (ch) { return (((ch.name || '') + ' ' + (ch.surname || '')).trim()) || ('Karakter ' + ch.id); };
  var map = {};
  for (var i = 0; i < tpl.nS; i++) map['S' + (i + 1)] = nameOf(cast[i]);
  for (var w = 0; w < (tpl.nW || 0); w++) map['W' + (w + 1)] = nameOf(cast[tpl.nS + w]);
  var rep = function (s) { return (s || '').replace(/\{(S\d+|W\d+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); };
  var cr = await query("INSERT INTO detective_cases (title,event_type,summary,status_text,difficulty,solution,active) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id",
    [tpl.t, tpl.e, rep(tpl.sum), rep(tpl.st), tpl.d, rep(tpl.sol)]);
  var caseId = cr.rows[0].id, susIds = [];
  for (var s = 0; s < tpl.nS; s++) {
    var ch = cast[s], role = tpl.S[s];
    var sr = await query("INSERT INTO detective_suspects (case_id,char_id,name,profession,background,img,ord) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [caseId, ch.id, nameOf(ch), role[0], rep(role[1]), ch.img || '', s]);
    susIds.push(sr.rows[0].id);
  }
  await query("UPDATE detective_cases SET culprit_id=$1 WHERE id=$2", [susIds[tpl.c], caseId]);
  for (var e = 0; e < tpl.E.length; e++) {
    var ev = tpl.E[e];
    await query("INSERT INTO detective_evidence (case_id,category,title,content,important,misleading,ord) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [caseId, ev[0], ev[1], rep(ev[2]), !!ev[3], !!ev[4], e]);
  }
}

async function getDetectiveCharPoolIds() {
  var v = await getConfig('detective_char_pool');
  if (!v) return [];
  try { var a = JSON.parse(v); return Array.isArray(a) ? a.map(function (x) { return parseInt(x); }).filter(function (x) { return !isNaN(x); }) : []; }
  catch (e) { return []; }
}
async function setDetectiveCharPool(ids) {
  var clean = (Array.isArray(ids) ? ids : []).map(function (x) { return parseInt(x); }).filter(function (x) { return !isNaN(x); });
  // tekrarları temizle
  var seen = {}, uniq = []; clean.forEach(function (id) { if (!seen[id]) { seen[id] = true; uniq.push(id); } });
  await setConfig('detective_char_pool', JSON.stringify(uniq));
  return uniq;
}
async function getDetectiveCharPool() {
  var ids = await getDetectiveCharPoolIds();
  return { ids: ids };
}
// Havuza göre karakter listesini çöz (havuz boşsa tüm aktif karakterler)
async function _resolveDetectivePool() {
  var allR = await query("SELECT id, name, surname, img FROM characters WHERE active=true");
  var pool = allR.rows;
  var ids = await getDetectiveCharPoolIds();
  if (ids.length) { var set = {}; ids.forEach(function (id) { set[id] = true; }); pool = pool.filter(function (c) { return set[c.id]; }); }
  return pool;
}
async function _runDetectiveSeed() {
  var pool = await _resolveDetectivePool();
  var MIN = 10; // en zor vaka 8 şüpheli + 2 tanık = 10 farklı karakter ister
  if (pool.length < MIN) return { ok: false, reason: 'pool_small', poolSize: pool.length, min: MIN };
  await query("DELETE FROM detective_cases");
  await query("DELETE FROM detective_guesses");
  for (var ci = 0; ci < DET_CASES.length; ci++) {
    try { await _seedCaseChar(DET_CASES[ci], pool); } catch (e) { console.error('seed case ' + ci + ':', e.message); }
  }
  return { ok: true, count: DET_CASES.length, poolSize: pool.length };
}
async function seedDetectiveChars() {
  var ver = await getConfig('detective_seed_v');
  if (ver === 'detv3belirsiz1') return;
  var r = await _runDetectiveSeed();
  if (r.ok) { await setConfig('detective_seed_v', 'detv3belirsiz1'); console.log('Dedektif: ' + r.count + ' vaka seed edildi (havuz: ' + r.poolSize + ' karakter).'); }
  else console.warn('Dedektif: havuzda yeterli karakter yok (' + r.poolSize + '/' + r.min + '), seed atlandı.');
}
// Admin tetikler: vakaları mevcut havuzla baştan oluşturur (ilerleme sıfırlanır)
async function regenerateDetectiveCases() {
  var r = await _runDetectiveSeed();
  if (r.ok) await setConfig('detective_seed_v', 'detv3belirsiz1');
  return r;
}

async function getDetectiveNextCase(userId, difficulty) {
  var cr = await query("SELECT id FROM detective_cases WHERE active=true AND difficulty=$1 ORDER BY id", [difficulty]);
  var ids = cr.rows.map(function (r) { return r.id; });
  if (!ids.length) return null;
  var chosen, allDone = false;
  if (userId) {
    var doneR = await query("SELECT DISTINCT g.case_id FROM detective_guesses g JOIN detective_cases c ON c.id=g.case_id WHERE g.user_id=$1 AND (g.correct=true OR g.attempt_no >= CASE WHEN c.difficulty='hard' THEN 1 WHEN c.difficulty='medium' THEN 2 ELSE 3 END)", [userId]);
    var doneSet = {}; doneR.rows.forEach(function (r) { doneSet[r.case_id] = true; });
    var notDone = ids.filter(function (id) { return !doneSet[id]; });
    if (notDone.length) chosen = notDone[Math.floor(Math.random() * notDone.length)];
    else { allDone = true; chosen = ids[Math.floor(Math.random() * ids.length)]; }
  } else {
    chosen = ids[Math.floor(Math.random() * ids.length)];
  }
  var c = await getDetectiveCase(chosen);
  var out = { case: c, all_done: allDone };
  if (userId) { out.progress = await getDetectiveProgress(userId, chosen); if (out.progress && out.progress.done) out.reveal = await getDetectiveRevealForUser(userId, chosen); }
  return out;
}


