const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
  getDetectiveStreamReveal: getDetectiveStreamReveal
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
    sol:"Sabotajcı {S2}. Değişiklik, yalnızca bakım nöbet listesindekilere verilen aylık servis PIN'iyle ve kart okutmadan — atölyedeki mekanik yedek anahtarla — yapıldı; iki erişim de bakım personelini gösteriyor ve o haftanın çizelgesinde nöbetçi olarak {S2} yazıyor. Panel odası pervazındaki SARMA tütün külü, paket sigara içen vardiya amirini değil, kendi tütününü saran teknisyeni işaret ediyor. En önemlisi: 'izinliydim' demesine rağmen telefonu 01:58–02:21 arasında atölye Wi-Fi'ına otomatik bağlanmış — cihazlar bilinen ağa kendiliğinden bağlanır, yalan burada patlıyor. Mühendisin 02:05'teki uzak bağlantısı başka hat için onaylı yama kaydıyla eşleşiyor; operatörün dolabındaki panel şeması ise sertifika sınavı çalışması — ikisi de parlak ama yanlış iz.",
    S:[["Vardiya amiri","Gece sahadaydı; paket sigara içer; sabotajın olduğu hatla ödül primi rekabeti vardı."],["Bakım teknisyeni","Kendi tütününü sarar; 'o hafta izinliydim, çizelge güncellenmedi' diyor; tazminat davası açmaya hazırlandığı konuşuluyor."],["Mühendis","Sistemi uzaktan yönetir; o gece evden çalıştığını söylüyor."],["Depo şefi","Panel yetkisi yok; gece sayım yapıyordu."],["Operatör","Yakında işten çıkarılacağını öğrendi; panel sertifika sınavına hazırlanıyor."]],
    E:[["other","Servis Modu","Kalibrasyon 02:13'te YEREL panelden, aylık değişen servis PIN'iyle bozulmuş. Bu ayın PIN'i yalnızca bakım nöbet listesindekilere verildi.",1,0],
       ["other","Kart Kaydı","Panel odası kapısında o gece hiç kart okutulmamış; oda, bakım atölyesinde asılı duran mekanik yedek anahtarla da açılabiliyor.",1,0],
       ["forensic","Pervazdaki Kül","Panel odasının pencere pervazında SARMA tütün külü ve yanmış kibrit çöpü bulundu; kül taze.",1,0],
       ["phone","Wi-Fi Kaydı","{S2}'nin telefonu 01:58–02:21 arasında 'FAB-ATOLYE' erişim noktasına OTOMATİK bağlanmış.",1,0],
       ["other","Nöbet Çizelgesi","O haftanın bakım nöbetçisi çizelgede {S2} görünüyor; kendisi 'izinliydim, çizelge güncellenmedi' diyor.",1,0],
       ["phone","Uzak Erişim","{S3}, 02:05'te sisteme uzaktan bağlanmış; oturum, başka bir hat için açılmış ONAYLI yama kaydıyla eşleşiyor.",0,1],
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
    sol:"Muhbir {S4}. Yedi operasyondan yalnızca dijital sistemde adresi işlenen beşi sızdı; kâğıt üzerinde planlanan ikisi sorunsuz geçti — yani sızıntı dijital aşamada ve erişim üç kişiyle sınırlı: lider, telsiz operatörü, analist. Uyarılar, merkeze 300 metredeki ankesörlerden 'tek çalıp kapatma' sinyaliyle gitti ve o dakikalarda avluya çıkışı beş günün BEŞİNDE de tutan tek isim analist ({S1} iki, {S3} üç gün). Para kendi hesabına değil, kardeşinin kumar borcuna aktı — 'abi sağol, borç bitti' mesajı bunu ele veriyor; finans taraması bu yüzden temiz göründü. Operatörün toplu parası veraset ödemesi, liderin kafe buluşması kayıtlı muhbir prosedürü — ikisi de tuzak.",
    S:[["Ekip lideri","Tüm operasyon bilgisine erişir; geçen hafta bir 'aracıyla' kafede görüntülendi."],["Genç memur","Yeni katıldı; sızan operasyonların bir kısmından haberi bile yoktu; sahaya yeni çıkıyor."],["Telsiz operatörü","Her operasyonu duyar; hesabına geçen ay toplu para girdi; sigara molalarında avluya çıkar."],["Analist","Adres ve hedef verilerini dijital sisteme o işler; kardeşinin kumar borcu olduğu biliniyordu; sigara içmez ama 'hava almaya' çıkar."],["Saha memuru","Plan detayını görmez, yalnızca operasyon emri alır."]],
    E:[["other","Sızıntı Deseni","Yedi operasyondan yalnızca dijital sistemde adresi işlenen BEŞİ sızdı; sadece kâğıt üzerinde planlanan ikisi sorunsuz geçti.",1,0],
       ["other","Erişim Matrisi","Dijital sistemde operasyon adreslerini önceden görebilenler: ekip lideri, telsiz operatörü ve analist.",1,0],
       ["phone","Tek Çalma","Her baskından 40–70 dakika önce, çetenin hattına merkeze 300 metre mesafedeki FARKLI ankesörlerden tek çalıp kapatılan aramalar gelmiş.",1,0],
       ["other","Avlu Kayıtları","Sinyal aralıklarında avluya çıkış: {S4} beş günün beşinde, {S3} üç gün, {S1} iki gün. Diğerlerinin çıkışı yok.",1,0],
       ["phone","Borç Mesajı","{S4}'ün kardeşinden gelen mesaj: 'abi sağol, borç bitti.' Borcun kapandığı tarih, üçüncü sızıntının ertesi günü.",1,0],
       ["phone","Operatör Nakdi","{S3}'ün hesabındaki toplu para, satılan tarlanın veraset ödemesiyle birebir eşleşiyor; tapu kaydı dosyada.",0,1],
       ["camera","Kafe Fotoğrafı","{S1}, sızıntı haftasında bir aracıyla kafede görüntülendi; görüşme, kayıtlı muhbir prosedürüne uygun ve raporlu çıktı.",0,1],
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
    sol:"Sorumlu {S3}. Yükleyici firmanın konteynerin içine koyduğu gizli takipçi, şüpheli seferlerin HEPSİNDE limana 3 km kala 'Karanlık Depo' arsasında 20–25 dakikalık duraklama gösteriyor; kantarlar arasındaki düzenli 1,4 tonluk fark da ikiz konteyner değişimini doğruluyor. Liman içi vinç ve istif kayıtları eksiksiz — değişim İÇERİDE olmamış; bu, vinç operatörünü ve saha personelini geriletiyor. Sevkiyat planındaki güzergâh sahilden inerken araç şüpheli günlerde sanayi yolundan dolaşmış ve rota tercihi sürücüye bırakılıyor. Arsa bekçisinin 'hep aynı şoför, akşamcı bir adam' tarifi tabloyu kapatıyor. Gümrükçünün hızlı onayları şüpheli-şüphesiz tüm dosyalarda aynı tembellik; vinççinin fazla mesaisi rutin yükleme.",
    S:[["Liman işçisi","Konteynerleri sahada taşır; belge onaylama yetkisi yok; gece vardiyasına yeni geçti."],["Vinç operatörü","Yüklemeleri yapar; şüpheli gecelerde fazla mesai kaydı var."],["Nakliyeci","Konteyneri limana getiren tır şoförü; güzergâhını kendisi seçer; akşamları sanayi kahvesinde oturur."],["Komisyoncu","Evrakları hazırlar; sahaya inmez; komisyonu ciro üzerinden alır."],["Gümrük memuru","Beyannamelere bakar; 'çok hızlı onaylıyor' diye şikâyet edilmiş."]],
    E:[["gps","Gizli Takipçi","Yükleyici firmanın konteyner içine koyduğu takipçi, şüpheli seferlerin hepsinde limana 3 km kala 'Karanlık Depo' arsasında 20–25 dakikalık duraklama kaydetmiş.",1,0],
       ["other","Tartı Farkı","Fabrika çıkış kantarı ile liman giriş kantarı arasında, yalnızca şüpheli konteynerlerde, düzenli 1,4 tonluk fark var.",1,0],
       ["other","Saha Sayımı","Liman içi vinç ve istif kayıtları eksiksiz; konteynerler liman içinde hiç yer değiştirmemiş — değişim dışarıda olmuş.",1,0],
       ["other","Rota Sapması","Sevkiyat planında güzergâh sahil yolundan; araç şüpheli günlerde sanayi yolundan dolaşmış. Firma kuralına göre rota tercihi sürücüye aittir.",1,0],
       ["witness","Tanık {W1} (arsa bekçisi)","Geceleri oraya bir tır yanaşır; şoför hep aynı, akşamcı bir adam, selam verir geçer. Kirayı da elden o öder.",1,0],
       ["other","Onay İstatistiği","{S5}, tüm beyannamelerde ortalamanın iki katı hızla onay veriyor; bu hız şüpheli-şüphesiz TÜM dosyalarda aynı.",0,1],
       ["phone","Fazla Mesai","{S2}'nin şüpheli gecelerdeki fazla mesaisi, vinç kayıtlarındaki rutin yüklemelerle birebir eşleşiyor.",0,1],
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

  // ───────── ZOR (10): 8 şüpheli · 12-14 kanıt · hiçbir kanıt suçluyu söylemez,
  // hiçbir şüpheli tek kanıtla aklanmaz; çözüm 3-4 bağımsız kısıtın kesişimi ─────────
  { t:"Üç Kurban", e:"Seri Cinayet", d:"hard", st:"Üç ölüm de 'doğal' sanılmıştı. Katil hâlâ siteden çıkmadı.", nS:8, nW:2, c:3,
    sum:"Aynı sitede üç yaşlı sakin, haftalar arayla 'kalp krizinden' öldü. Yeniden yapılan otopsiler üçünde de diz arkasında iğne izi buldu. Katil kurbanların kapısından zorla girmedi; çay içip fincanları bile yıkadı. Bu vakada kimse sana 'şu üçüne bak' demeyecek — herkese bakacaksın.",
    sol:"Katil {S4}. Cinayet aleti, sitedeki üç şeker hastasına dağıtılan partiden insülin ve eksilme 2. kurbanın buzdolabından — üstelik İLK ölümden de önce başlamış; bu, ilaca kapıda el koyabilen, teslim fişlerini kurban yerine imzalayan birini gösterir (son üç fişin imzası kurbanın eli değil). Diz arkası enjeksiyon eğitimli bir el ister; bu, kuryeyi ve temizlikçiyi geriletir. Tanık, 1. kurbanın yedek anahtarının yerini yalnızca 'bakımına gelen hanımın ve kızının' bildiğini söylüyor; saksının oynadığı da kayıtlı. Perşembe penceresinde 2. kurbanın katından inen 'açık renk iş kıyafetli, küçük çantalı' silüet tarife oturuyor. Elektrikçinin üç daireye girmesi korkutucu ama iş emirleri çift imzalı ve 3. ölüm gününde komşu sitedeydi; teknecinin arsa davası güçlü bir neden ama onu dairelere sokan tek iz yok. Eksik flakonlar + sahte imzalar + anahtar bilgisi + hafta içi gündüz serbestliği yalnızca bakım hemşiresinde kesişiyor.",
    S:[["Apartman yöneticisi","Ana anahtar onda; kurbanlarla aidat ve şikâyet gerginlikleri vardı; gündüzleri sitede dolaşır."],["Tekneci komşu","Bir kurbanla yıllardır süren arsa davası var; 'gündüzleri denizdeyim' diyor ama liman defteri dönüş saati yazmıyor."],["Kurye","Eczane paketleri dahil siteye her gün teslimat yapar; perşembe sabahı sitede taraması var."],["Bakım hemşiresi","İki kurbanın evine bakıma giderdi; ilaç teslimlerini çoğu kez kapıda o karşılar; geçen yıl 'hasta yakınından borç aldı' şikâyetleri kapatılmış."],["Dağcılık eğitmeni","Sitede oturur; ilk yardım sertifikası var; bir kurbanın yeğeniyle husumetliydi."],["Elektrik teknisyeni","Geçen ay üç dairede de pano bakımı yaptı; site sakini değil ama sürekli çağrılır."],["Emekli komşu","Kurbanlardan biriyle gürültü kavgası vardı; gündüzleri evde."],["Temizlikçi","Haftada iki gün ortak alanları ve bazı daireleri (2. kurban dahil) temizler; açık renk forma giyer."]],
    E:[["forensic","Yeniden Otopsi","Üç kurbanda da diz arkasında iğne izi; ölüm nedeni aşırı doz insülin. Enjeksiyon noktası, eğitimli bir elin tercihi.",1,0],
       ["other","Misafir Düzeni","Üç dairede de TV açık, çay servisi yapılmış, iki fincan yıkanıp rafa kaldırılmış — kurbanlar katili gündüz, kendi rızalarıyla içeri almış.",1,0],
       ["other","Ölüm Pencereleri","Tahmini saatler: 1. kurban salı 14–16, 2. kurban perşembe 10–12, 3. kurban pazartesi 15–17. Üçü de hafta içi GÜNDÜZ.",1,0],
       ["forensic","Seri Numarası","İnsülin, sitede üç şeker hastasına dağıtılan partiden. 2. kurbanın buzdolabında sayıma göre dört flakon eksik; İLK eksilme, 1. kurbanın ölümünden de önceye tarihleniyor.",1,0],
       ["other","Teslim İmzaları","2. kurbanın eczane teslim fişlerindeki son üç 'alındı' imzası, kurbanın el yazısıyla uyuşmuyor; paketleri çoğu kez kapıda başka biri teslim alıyormuş.",1,0],
       ["forensic","Saksı İzi","1. kurbanın kapısı zorlanmamış; paspas yanındaki saksı oynatılmış, altındaki toprak halkası kaymış — yedek anahtarın yeri BİLİNEREK kullanılmış.",1,0],
       ["other","Pano Servisleri","{S6} geçen ay üç dairede de pano bakımı yaptı; iş emirlerinin tamamı yönetici eşliğinde ve çift imzalı.",0,1],
       ["other","Komşu Site İş Emri","3. kurbanın öldüğü pazartesi {S6}, komşu sitede 14:00–18:00 arası müşteri imzalı bakımda görünüyor.",0,0],
       ["phone","Arsa Husumeti","{S2} ile 1. kurban arasında yıllardır süren arsa davası yazışmaları var; 'o gün denizdeydim' diyor ama liman defteri yalnızca çıkış saatlerini tutuyor.",0,1],
       ["other","Temizlik Çizelgesi","{S8} pazartesi 14:30–17:30 arası C blok merdivenlerini temizliyor; çizelgede 15:00 ve 17:00'de yönetici parafı var, ARA saatler boş.",1,0],
       ["witness","Tanık {W1}","Perşembe kuşluk vakti 2. kurbanın katından açık renk iş kıyafetli, elinde küçük çanta olan biri indi; yüzünü görmedim.",1,0],
       ["witness","Tanık {W2}","Rahmetli (1. kurban) saksılarını kimseye emanet etmezdi; yedek anahtarın yerini bir bakımına gelen hanım bilirdi, bir de kızı.",1,0],
       ["phone","Kurye Rotası","{S3}'ün el terminali perşembe 10:20'de sitede teslimat taraması gösteriyor; paketleri kapıya bırakıp gider.",0,1],
       ["other","Şikâyet Dosyası","{S4} hakkında geçen yıl iki kez 'hasta yakınından borç aldı' şikâyeti gelmiş; soruşturma delil yetersizliğinden kapanmış.",1,0]] },

  { t:"Kasadaki Hayalet", e:"Büyük Banka Soygunu", d:"hard", st:"Kasa açıldı ama o gece kimsenin 'girdiği' kayıtlı değil — kayıtlar silindi.", nS:8, nW:2, c:2,
    sum:"Bir bankanın kasası cumartesi gecesi boşaltıldı. Alarm çalmadı çünkü takvime önceden bir 'bakım penceresi' eklenmişti. O gecenin kart kayıtları silinmiş. Fail; şifreleri, ağları ve insanların tembelliklerini çok iyi tanıyor.",
    sol:"Soyguncu {S3}. Alarmı susturan 'bakım penceresi' salı 11:32'de, {S2}'nin panel hesabıyla eklendi — ama {S2} o saatte camlı toplantı odasındaydı ve şifresini klavyesinin altına yazdığı ofiste bilinen bir şakaydı. Değişiklik yönetim ağından yapıldı; bu ağa yalnızca sunucu odası ve kilitli şef odasındaki uçlardan girilir — yani fiilen sunucu odasından. Cumartesi 00:50–03:10 kayıtlarını silmek YÖNETİCİ yetkisi ister. Kasa, kodla değil, sunucu odasındaki çelik dolapta duran felaket kurtarma kitiyle (yedek anahtar + geçersiz kılma kodu) açıldı; pazartesi sayımında kitin mühür bandının 'yenilendiği' görüldü ve dolabın şifresi BT sorumluluğunda. Üstelik fail, izleme cihazı taşıyan paketleri ayırt etti; bu gizli liste yalnızca müdüre, baş kasiyere ve sistemi kuran BT'ye dağıtılmıştı. Şifre + ağ ucu + silme yetkisi + kit + izleme listesi tek isimde kesişiyor: {S3}. İcralık baş kasiyer, geç saate kalan müdür ve sokakta görüldüğü söylenen eski yardımcı — üçü de gölge, hiçbiri anahtar değil.",
    S:[["Banka müdürü","Kasa kodunu bilir; cuma 21:10'a kadar şubede kalmış, 'rapor bitiriyordum' diyor."],["Güvenlik şefi","Alarm panelinin yöneticisi; şifresini klavye altına yazmasıyla ünlü; salı 11:00–12:00 toplantıdaydı."],["Sistem yöneticisi (BT)","Sunucu odasında çalışır; kayıt silme yetkisi olan iki kişiden biri; sessiz, işine düşkün biri olarak bilinir."],["Veznedar","Kasa katına nadiren çıkar; cuma erken çıkmış."],["Baş kasiyer","Kasa kodunu bilen ikinci kişi; icralık iki dosyası var; cumartesi sabahı 'eksik evrak' diye şubeye uğramış."],["Gece temizlikçisi","Cuma 22:00'de işi bitirmiş; çıkışta alarmın 'kurulu' yandığını not etmiş."],["Kurye","Yalnızca zemin kata girer; kasa katına kartı geçmez."],["Eski şef yardımcısı","Üç ay önce kovuldu; giriş kartı iptal; cumartesi gecesi banka civarında görüldüğü iddia ediliyor."]],
    E:[["other","Bakım Penceresi","Alarm takvimine üç gün önce 'planlı bakım' eklenmiş: cumartesi 01:30–02:30. Değişiklik salı 11:32'de, YÖNETİM ağından yapılmış.",1,0],
       ["other","Şifre Sahibi","Takvim değişikliği {S2}'nin panel hesabıyla yapılmış görünüyor.",1,0],
       ["camera","Toplantı Kaydı","Salı 11:00–12:00 arasında {S2}, camlı toplantı odasında, masasından uzakta görülüyor.",1,0],
       ["witness","Tanık {W1}","Şefin şifresini klavyesinin altına yazması ofiste bilinen bir şakaydı; kaç kez uyardık, gülüp geçti.",1,0],
       ["other","Ağ Kısıtı","Yönetim ağına yalnızca sunucu odasındaki ve şef odasındaki uçlardan girilebiliyor; şef odası toplantı boyunca kilitliydi.",1,0],
       ["other","Kayıt Boşluğu","Cumartesi 00:50–03:10 arası kart geçiş kayıtları silinmiş; silme işlemi YÖNETİCİ yetkisi gerektirir ve bu yetki iki kişide var: güvenlik şefi ve BT.",1,0],
       ["other","FK Kiti","Felaket kurtarma kiti (yedek kasa anahtarı + geçersiz kılma kodu) sunucu odasındaki çelik dolapta durur; dolabın şifresi BT sorumluluğundadır. Pazartesi sayımında kitin mühür bandının YENİLENDİĞİ görüldü.",1,0],
       ["other","Sayım Tutanağı","Kasadan yalnızca seri takipli olmayan kullanılmış banknotlar alınmış; izleme cihazlı desteler yerinde bırakılmış. İzleme listesi gizli yazıyla yalnızca müdüre, baş kasiyere ve sistemi kuran BT'ye dağıtılmıştı.",1,0],
       ["phone","Borç Dosyası","{S5}'in icralık iki dosyası var; cuma akşamı 'sayım uzun sürdü' diyerek geç çıkmış.",0,1],
       ["other","Cumartesi Girişi","{S5}, cumartesi 09:05'te 'eksik evrak' diyerek şubeye girip 14 dakika kalmış; çıkarken elinde dosya görülmüş.",0,1],
       ["gps","Müdür Aracı","{S1}'in aracı cuma 21:10'a kadar şube otoparkında; kendisi 'rapor bitiriyordum' diyor, mesai kaydı yok.",0,1],
       ["witness","Tanık {W2}","Cumartesi gece yarısı bankanın arka sokağında eski yardımcıya ({S8}) benzeyen birini gördüm; emin değilim, karanlıktı.",0,1],
       ["other","Vardiya Notu","Cuma gece temizliği 22:00'de bitti; temizlikçi çıkış notuna alarmın 'KURULU' yandığını yazmış.",0,0]] },

  { t:"Sahnedeki Suikast", e:"Suikast", d:"hard", st:"Salonda patlama duyulmadı; tetik sesi yerine 20 saniyelik bir karartma var.", nS:8, nW:2, c:5,
    sum:"Kalabalık bir etkinlikte konuşmacı kürsüde vuruldu. Susturucu yüzünden kimse ses duymadı; atış anı yayın kaydından saptandı. Fail yüksek bir yerden ateş etti ve atıştan saniyeler önce salonun bir bölümü karartıldı. Soru şu: o karanlıkta KİM neredeydi?",
    sol:"Suikastçı {S6}. Merminin gömleğindeki dikroik filtre pulları, atışın IŞIK KÖPRÜSÜ armatür hattından yapıldığını gösteriyor; takip spotunu 20 saniyeliğine kısan komut da ana masadan değil, köprüdeki YEREL panelden verildi — akışta böyle bir adım yok. Köprüye çıkabilen iki rigger'dan {S8}, atıştan 42 saniye önce sahne SOLUNDAKİ kablolu interkomdan 'konfeti hazır' anonsunu yanıtladı; 70 metrelik yol artı 40 saniyelik tırmanışla köprüye yetişmesi fiziken imkânsız. {S6}'nın kanalı ise 20:36–20:44 arasında sessiz ve anlattığı 'spot arızası' hiçbir kayıtta yok; kelepçeye sıkıştırılmış silah yağlı bez ve ağabeyinin geçen yıl kaybettiği ışık ihalesi tabloyu tamamlıyor. Aktivistin elindeki barut güvenliğin ses bombasından; güvenlik amirinin kayıp 11 dakikası zemin katta geçti — yörünge 9–14 metre diyor; gazetecinin sert yazıları ise sadece mürekkep.",
    S:[["Etkinlik organizatörü","Sahne önünde, herkesin gözü önündeydi; etkinlik sigortasından sorumlu."],["Kameraman","Yüksek kamera platformunda canlı yayın çekiyordu."],["Güvenlik amiri","Ana kapıdan sorumlu; kurbanla geçen yıl tartışması olmuş; atış civarında 11 dakika yerinde yoktu."],["Konuk gazeteci","Ön sırada oturuyordu; kurban hakkında sert yazılar yazmıştı."],["Ses teknisyeni","Ses kabininde; ekipman kasalarının taşınmasından da sorumlu."],["Işık şefi (rigger)","Işık köprüsüne çıkma yetkisi olan iki kişiden biri; ağabeyinin firması geçen yıl bu mekânın ışık ihalesini kaybetti."],["Husumetli aktivist","Sahte kartla içeri girmiş; elinde barut izi çıktı; kurbanla bilinen husumeti var."],["Sahne görevlisi (rigger)","Köprüye çıkma yetkisi olan ikinci kişi; o gece konfeti düzeneğinden de sorumluydu."]],
    E:[["forensic","Balistik Rapor","Mermi 6.5 mm, sesaltı; susturucu kullanılmış — salonda patlama duyulmamasının nedeni bu. Atış anı, yayın karesine göre 20:41:12.",1,0],
       ["forensic","Yörünge Konisi","Yara açısı ve kürsü konumuna göre atış 9–14 metre yükseklikten yapıldı; zeminden ya da ön sıradan bu açı imkânsız.",1,0],
       ["forensic","Filtre Pulları","Mermi gömleğinde dikroik filtre camına ait mikro pullar var; bu filtreler salonda yalnızca IŞIK KÖPRÜSÜ armatürlerinde kullanılıyor.",1,0],
       ["other","Reji Kaydı","Takip spotu 20:40:55'te 20 saniyeliğine kısıldı; komut ana masadan değil, köprüdeki YEREL panelden verildi ve gösteri akışında böyle bir adım yok.",1,0],
       ["other","Rigger Listesi","İş güvenliği gereği ışık köprüsüne yalnızca iki yetkili çıkabilir: ışık şefi ve sahne görevlisi; merdiven kapısının kilidi sağlam.",1,0],
       ["other","İnterkom Dökümü","20:40:30'da 'konfeti hazır' anonsuna B kanalından yanıt verildi; B kanalı yalnızca sahne SOLUNDAKİ kablolu yaka ünitelerine bağlıdır.",1,0],
       ["other","Mesafe Hesabı","Sahne solundan köprü merdivenine yürüyüş 70 metre; tırmanış asgari 40 saniye sürüyor.",1,0],
       ["other","Sessiz Kanal","{S6}'nın interkom kanalı 20:36–20:44 arasında hiç ses vermemiş; kendisi 'spot arızasına baktım' diyor ama arıza kaydı açılmamış.",1,0],
       ["forensic","Bez Parçası","Köprü kelepçelerinden birine sıkıştırılmış, silah yağı kokan bir bez bulundu.",1,0],
       ["phone","İhale Notu","Mekânın ışık ihalesi geçen yıl el değiştirdi; kaybeden firmanın sahibi {S6}'nın ağabeyi.",1,0],
       ["forensic","Barut Testi","{S7}'nin elinde barut çıktı; partiküller güvenliğin kullandığı SES bombası tipiyle uyuşuyor, tüfek barutuyla değil.",0,1],
       ["other","Kapı Boşluğu","{S3}, 20:35–20:46 arasında ana kapıda görünmüyor; 'tuvaletteydim' diyor, koridor kamerası o bölümü çekmiyor.",0,1],
       ["phone","Sert Yazılar","{S4}'ün kurban hakkındaki eski köşe yazıları dosyaya eklendi.",0,1],
       ["witness","Tanık {W2}","{S2} atış anında platformda, vizörden hiç ayrılmadan çekiyordu; yayında iki eli de kameranın üzerinde görünüyor.",0,0]] },

  { t:"Gümrüğün Gölgesi", e:"Organize Kaçakçılık", d:"hard", st:"Yasak mal taramadan 'temiz' geçmiyor — tarama yokken geçiyor.", nS:8, nW:2, c:3,
    sum:"Bir gümrük kapısından aylardır yasak mal geçiyor. Cihaz sağlam, görüntüler temiz, mühürler yerinde. Sır şurada: kaçak konteynerler hep GÜNDE YEDİ DAKİKA süren bir pencereye denk geliyor. O pencereyi kim biliyor ve kamyonları oraya kim 'denk getiriyor'?",
    sol:"Asıl sorumlu {S4}. Kaçak konteynerler hep cihazın 11:00–11:07 öz-test penceresine — görüntünün arşivlenmediği yedi dakikaya — denk getirildi ve bu kamyonların kuyruk numaraları, varıştan dakikalar önce AMİR sınıfı PIN ile elle öne çekildi: bekçi terminal başında oturur ama PIN'i yok, operatörlerin de yok. Şüpheli geçişlerin TAMAMI A vardiyasında ve o vardiyanın amiri {S4}; kantincinin duyduğu 'on bire az kala şu plakayı öne al' telsizleri bunu doğruluyor. Stajyerin bildirdiği 'tuhaf renumara' kaydını da amir PIN'li bir hesap 'eğitim hatası' diye kapattı. Servet kendi hesabına değil, kayınpederin zeytinliğine aktı. Şefin paravan şirketi adaş çıktı ama imzaları dosyada kaldı; operatörün bahis borcu ve ekran kapatma huyu göz alıyor — ne var ki sıra oynatma yetkisi ikisinde de yok; raporlu teknisyen limana on dakika mesafede oturuyor ama PIN'i aylar önce donduruldu.",
    S:[["Gümrük şefi","Onay yetkisi geniş; adına kayıtlı görünen paravan şirket iddiası araştırılıyor."],["Tarama operatörü","Cihazı o kullanır; bahis sitelerine düzenli ödemeleri var; uyuklamakla ünlü."],["Bariyer bekçisi","Sıra düzenleme TERMİNALİNİN başında oturur ama amir PIN'i yok; geçişleri açar."],["Vardiya amiri (A)","A vardiyasını yönetir; sicili temiz görünür; kayınvalidesinin köyüne sık gider."],["Evrak memuru","Beyannameleri dosyalar; taramaya ve sıraya erişemez."],["Bakım teknisyeni","İki aydır raporlu; limana on dakika mesafede oturuyor; servis PIN'i rapor başında donduruldu."],["Forklift operatörü","Sahada yük taşır; ekran ve sıra sistemine erişemez."],["Stajyer","Sıra ekranında gördüğü bir tuhaflığı amirine bildirmişti."]],
    E:[["other","Saat Deseni","Şüpheli konteynerlerin tamamı kapıdan 11:00–11:07 arasında geçmiş — cihazın günlük ÖZ-TEST penceresi; bu yedi dakikada tarama görüntüsü arşivlenmiyor.",1,0],
       ["other","Sıra Oynaması","Aynı kamyonların kuyruk numaraları, varıştan dakikalar önce elle öne çekilmiş; bu işlem AMİR sınıfı PIN ister.",1,0],
       ["other","Vardiya Eşleşmesi","Şüpheli geçişlerin tamamı A vardiyasına denk geliyor; B vardiyasında tek bir şüpheli geçiş yok.",1,0],
       ["other","Kulübe Terminali","Sıra düzenleme ekranı bariyer kulübesindeki terminalde açılıyor; {S3} mesaisini orada geçirir ama amir PIN'i tanımlı değil.",1,0],
       ["other","Bülten Dağıtımı","Öz-test saatini güncelleyen bakım bülteni amirlere ve bakım teknisyenine gönderildi; operatörler pencereyi zaten ezbere bilir.",0,0],
       ["other","Tapu Sorgusu","{S4}'ün kayınpederi adına geçen ay zeytinlik alınmış; kayınpederin bilinen tek geliri emekli maaşı.",1,0],
       ["witness","Tanık {W2} (kantinci)","A vardiyası sabahları telsizden 'on bire az kala şu plakayı öne al' anonsu duyardık; şaka sanırdık, amirin sesiydi.",1,0],
       ["phone","Stajyer Bildirimi","{S8}, sıra ekranında 'tuhaf yeniden numaralandırma' gördüğünü bildirmiş; kayıt, amir PIN'li bir hesap tarafından 'eğitim hatası' diye kapatılmış.",1,0],
       ["phone","Şef Adaşı","{S1}'e atfedilen paravan şirketin sahibi aynı isimli başka biri çıktı; yine de şefin onay imzaları dosyada.",0,1],
       ["witness","Tanık {W1}","{S2} bazı kamyonlar geçerken ekranı kapatıp gerinirdi; uyuklamakla meşhurdur, kaç kez uyandırdım.",0,1],
       ["phone","Operatör Borcu","{S2}'nin bahis sitelerine düzenli ödemeleri dökümde görünüyor.",0,1],
       ["other","Teknisyen Durumu","{S6} iki aydır raporlu; limana on dakika mesafede oturuyor; servis PIN'i rapor başında dondurulmuş, yeniden açma talebi yok.",0,1],
       ["other","Arşiv Boşluğu","Öz-test penceresindeki geçişlerin yalnızca kapı fotoğrafı var, tarama görüntüsü yok; fotoğraflarda mühürler sağlam görünüyor.",0,0]] },

  { t:"Ormandaki İz", e:"Kayıp Kişi", d:"hard", st:"Fotoğraflar birini aklıyor gibi — makinenin saati doğruysa.", nS:8, nW:2, c:4,
    sum:"Grup yürüyüşünden biri dönmedi; telefonu en son patika dışındaki Kayalık Burnu'ndan sinyal verdi. Herkesin bir fotoğrafı, bir imzası, bir tanığı var. Ama kanıtların saatleri birbiriyle konuşunca hikâye değişiyor.",
    sol:"Sorumlu {S5}. İlk bakışta 13:30 ve 13:50 damgalı grup fotoğrafları onu aklıyor; ama karelerden birinde kampın duvar saati 12:43'ü gösteriyor — makine 47 dakika İLERİ, yani o kareler kayıp penceresinden ÖNCE çekildi ve rehberin 14:30 yoklama notu {S5}'in 'fotoğraf çekmeye takıldığını' yazıyor. Kurbanın son sinyali 13:54'te, ancak kestirmeyi bilenin 15 dakikada ulaşabileceği burundan geldi; çantadaki emniyet halkası dağcı usulü tek hamlede kesilmişti ve tanık, döküntüden inen TURUNCU ASTARLI montu gördü — {S5}'in yeşil montunun astarı turuncudur. Neden de hazır: kurban, ortak uygulamalarında korunan bölge izlerinin gizlice satıldığını açıklamak üzereydi. İş ortağının tek karelik fotokapan görüntüsü ve sigorta lehdarlığı cazip bir tuzak; görevlinin 40 dakikalık telsiz boşluğu ise o öğlen HERKESİ kapsayan röle arızası.",
    S:[["İş ortağı","Kurbanla ortak iş sigortasının tek lehdarı; çıkıştan önce kurbanla tartıştığı görülmüş; gruptan ayrı, ana patikada yürüyordu."],["Tur rehberi","Grubu yönetti; yoklama defterini o tutar; bölgeyi ve kestirmeleri bilir."],["Kurbanın eşi","Kamp alanında kaldı; mutfak çadırında gönüllülere yardım etti."],["Acemi kampçı","İlk kampı; gruptan hiç ayrılmadığı söyleniyor; patikaları bilmez."],["Deneyimli patika dostu","Bölgeyi avucunun içi gibi bilir; amatör dağcıdır; kurbanla rota uygulaması ortaklığı var; yeşil montunun astarı turuncudur."],["Park görevlisi","Kulübede telsiz başında oturur; servis yolunun anahtarı ondadır."],["Doğa fotoğrafçısı","Ana patikada sabit noktadan çekim yapıyordu; tripodu kurulu kaldı."],["Sırt çantacı genç","Grubun en önünde, hızlı yürüyen bir genç; kimseyle konuşmadı."]],
    E:[["gps","Son Sinyal","Kurbanın telefonu son kez 13:54'te, patika dışındaki Kayalık Burnu'ndan sinyal verdi.",1,0],
       ["other","Kestirme Bilgisi","Burna iki yol var: bir saatlik servis yolu ya da kaya döküntüsü üzerinden, yerini bilenin 15 dakikada geçeceği işaretsiz kestirme.",1,0],
       ["camera","Grup Fotoğrafları","{S5}, 13:30 ve 13:50 damgalı karelerde grubun içinde gülümserken görünüyor.",1,0],
       ["forensic","Saat Farkı","Karelerden birinde kampın duvar saati 12:43'ü gösterirken fotoğrafın damgası 13:30 — makinenin saati 47 dakika İLERİ.",1,0],
       ["other","Yoklama Defteri","Rehber 13:10 sayımında kurbanın gruptan ayrıldığını, 14:30 sayımında ise {S5}'in 'fotoğraf çekmeye takıldığını' not etmiş.",1,0],
       ["forensic","Kesik Halka","Kurbanın çantasındaki emniyet halkası önce gerilmiş, sonra dağcı usulü tek hamlede kesilmiş; düğüm artığı amatör işi değil.",1,0],
       ["phone","Uygulama Kavgası","Kurban, ortak oldukları rota uygulamasında korunan bölgelerin GPS izlerinin gizlice satıldığını fark etmiş; 'bunu herkese açıklayacağım' mesajı ortağına gitmiş.",1,0],
       ["camera","Fotokapan","{S1}, ana patikadaki fotokapanda 13:22'de tek karede görünüyor; öncesinde ve sonrasında kayıt yok.",0,1],
       ["phone","Sigorta Poliçesi","{S1}, kurbanla ortak iş sigortasının tek lehdarı; poliçe iki ay önce yenilenmiş.",0,1],
       ["other","Telsiz Arızası","O öğlen bölge telsiz rölesi 40 dakikalık arıza kaydı vermiş; {S6} dahil TÜM telsizler aynı aralıkta sessiz kalmış.",1,0],
       ["other","Ziyaretçi Defteri","{S6}'nın kulübe defterinde 13:05 ve 14:20'de ziyaretçi imzaları var; ara saatlerde kayıt yok.",0,0],
       ["witness","Tanık {W1}","Döküntü tarafından aşağı inen birini gördüm; yüzü seçilmiyordu ama montunun içi TURUNCU parladı, onu hatırlıyorum.",1,0],
       ["witness","Tanık {W2}","{S3} mutfak çadırında bizimle çorba kaynattı; ayrılmadı derim ama ben de gelip gidiyordum, yemin edemem.",0,0]] },

  { t:"Sızan Tasarım", e:"Kurumsal Casusluk", d:"hard", st:"Sızıntı bir dosya değil; bir FOTOĞRAF — ve fotoğrafın içinde saat var.", nS:8, nW:2, c:0,
    sum:"Gizli bir ürün tasarımı rakipte ortaya çıktı. Sızan şey dosya değil, ekrandan çekilmiş bir fotoğraf. O ekran tek bir odada, tek bir gün açıldı. Fotoğrafın köşesindeki saat, yansımadaki el ve bir bardak çay her şeyi anlatıyor — dinlemeyi bilene.",
    sol:"Sızdıran {S1}. Karedeki v0.9.3-RC filigranı, görüntünün yalnızca perşembe demosundaki İZOLE kioskta açıldığını gösteriyor ve ekranın köşesindeki saat aracı 16:47'yi gösteriyor — yani fotoğraf, 16:45–16:55 kahve arasında çekildi. Kiosk sensörü 16:46'da ekranı uyandırdı: odada biri kaldı. Kantin kamerası o dakikalarda {S2}, {S3}, {S4} ve {S6}'yı kuyrukta gösteriyor. Çerçevedeki yansımada bileğinde destek bandı olan bir el seçiliyor; bant kullanan iki kişiden {S6} kuyruktaydı. Temizlikçinin kiosk önünde bulduğu bardak ise kahve değil BİTKİ çayıydı — kantinde bitki çayı yalnızca kendi poşetini getirene demlenir ve poşet taşıyan tek kişi {S1}. 'Ödevi getirirsen süreç hızlanır' yazışması ve iki kez yarıda kesilen terfi nedeni tamamlıyor. Müdürün DLP alarmı eski bir broşür, stajyer söylentisi tutanaksız bir fısıltı.",
    S:[["Kıdemli tasarımcı","İki dönemdir terfi listesinden son anda çıkarıldı; bileğinde çizim yorgunluğundan destek bandı taşır; kantine kendi bitki çayı poşetini getirir."],["Proje müdürü","Tüm kaynak dosyalara erişir; geçen ay kişisel postasına dosya yolladığı için DLP alarmı almıştı."],["Pazarlama uzmanı","Yalnızca onaylı görselleri görür; demoya 'sunum dili' için katıldı."],["Stajyer tasarımcı","İzleme yetkisi var; demoda telefonuna el konulduğu söylentisi çıktı."],["Hukuk danışmanı","Tasarım dosyalarına erişimi yok; demoya katılmadı."],["Baskı sorumlusu","Çıktılar onun biriminden geçer; o da bilek desteği kullanır."],["Satış temsilcisi","İç tasarım sistemine giremez; demo günü müşterideydi."],["Ofis asistanı","Dosya yetkisi yok; toplantı düzenini o kurar."]],
    E:[["other","Filigran","Sızan karede v0.9.3-RC filigranı var; bu derleme YALNIZCA gözden geçirme odasındaki izole kioskta, perşembe 16:00 demosunda açıldı ve makineden hiç çıkmadı.",1,0],
       ["other","Tutanak","Demo tutanağı: 16:00 başlangıç, 16:45–16:55 kahve arası, 17:05 bitiş; katılım tasarım, ürün, pazarlama ve baskı birimlerinden.",1,0],
       ["other","Ekran Saati","Sızan karede kioskun saat aracı 16:47'yi gösteriyor — fotoğraf kahve arasında çekilmiş.",1,0],
       ["other","Sensör Kaydı","Kioskun yakınlık sensörü 16:46'da ekranı uyandırmış; ara boyunca odada en az bir kişi kalmış.",1,0],
       ["camera","Kantin Kamerası","16:45–16:55 kahve kuyruğunda {S2}, {S3}, {S4} ve {S6} açıkça görülüyor.",1,0],
       ["forensic","Yansıma","Karede, kioskun parlak çerçevesine düşen silik bir yansıma var: fotoğrafı çeken elin bileğinde koyu renk bir DESTEK BANDI seçiliyor.",1,0],
       ["other","Bilek Desteği","Şirkette bilek desteği kullandığı bilinen iki kişi var: kıdemli tasarımcı ve baskı sorumlusu.",1,0],
       ["witness","Tanık {W2} (temizlik görevlisi)","O akşam odayı toplarken kioskun önünde bir bardak buldum; kahve değil, BİTKİ çayıydı. Kantin bitki çayını yalnızca kendi poşetini getirene demler.",1,0],
       ["phone","Danışman Yazışması","{S1}'in, rakip şirkete bağlı bir 'kariyer danışmanıyla' yazışmasında 'ödevi getirirsen süreç hızlanır' cümlesi geçiyor.",1,0],
       ["other","Terfi Dosyası","{S1}, iki dönemdir terfi listesinden son anda çıkarılmış; itiraz dilekçeleri dosyada.",1,0],
       ["phone","DLP Alarmı","{S2} geçen ay kişisel postasına bir sunum yollamış; inceleme, dosyanın ESKİ ve kamuya açık bir broşür olduğunu gösterdi.",0,1],
       ["other","Stajyer Söylentisi","{S4}'ün telefonuna 'demoda fotoğraf çekiyor' diye el konulduğu konuşuldu; tutanaklarda böyle bir işlem yok.",0,1],
       ["witness","Tanık {W1}","Arada herkes çıktı sanıyordum; kapı bir kez de aranın ortasında açıldı ama kim girdi çıktı görmedim.",0,0]] },

  { t:"Fidye Notu", e:"Kaçırma ve Fidye", d:"hard", st:"Çocuk sağ salim bulundu. Fail, ailenin 'içinden' biri — ama hangisi?", nS:8, nW:2, c:2,
    sum:"Bir çocuk okul çıkışı kaçırıldı, aynı gece eski bir parça deposunda sağ salim bulundu. Fidye notunda yalnızca ev halkının bildiği lakap yazıyor. Çocuk, gittiği kişiye güveniyordu. Fidye araması bir araçtan yapıldı — ve arabanın radyosu açıktı.",
    sol:"Sorumlu {S3}. Fidye araması sırasında arkada tünel 'düt'leri ve 17:42'de yayınlanan 'D-100 ışıklarda yoğunluk' anonsu duyuluyor — arayan o dakikada D-100 üzerinde bir araçtaydı; oysa {S7} tam o saatte evde polise ifade veriyordu (tutanak imzalı). Çocuğun bulunduğu depo, geçen yaz AİLE ARACININ torpidosundan kaybolan eski anahtarlıkla, zorlamadan açıldı — kaybı tutanağa geçiren de 'aracı en son kullanan' kişiydi. Aile aracı o gün güzergâhtan sapıp sanayi bölgesine girdi; {S3}'ün anlattığı servis uğraması defterde yok. Fidye hattının kontörünü satan pompacı, alıcıyı 'hep cam suyu da alan müdavim' diye tarif etti — {S3}'ün bilinen alışkanlığı. Lakabı bilen, çocuğun güvendiği, o saatte D-100'de direksiyonda olan ve kayıp anahtarlığa ilk elden erişen tek isim aile şoförü. Muhasebecinin aylar önceki tehditleri ve öğretmenin talihsiz 'kapıda tanıdık var sandım' cümlesi ses getiren ama kapı açmayan izler.",
    S:[["İş ortağı","Babayla ortaklık kavgası vardı; pasaport kaydına göre olaydan iki gün önce yurt dışına çıkmış, dönüş kaydı yok."],["Çocuğun öğretmeni","Çocuğu okuldan tanır; çıkışta son gören kişi; 'kapıda bekleyen tanıdık var sandım' dedi."],["Aile şoförü","Çocuğun rutinini ve lakabını bilir; aile aracını o kullanır; benzinlikte her seferinde cam suyu almasıyla tanınan bir müdavimdir."],["Eski muhasebeci","Aileye kin besler; aylar önce tehdit mesajları atmıştı; dün 'şehirde görüldü' ihbarı geldi, doğrulanamadı."],["Bahçıvan","Evin dışında çalışır; eve girmez; küçük bir tüketici kredisi var, düzenli ödüyor."],["Komşu","Aileyle kapı komşusu; çocuğu uzaktan tanır."],["Dadı","Çocuğun lakabını ve rutinini bilir; olay akşamı evdeydi ve polise ilk ifadeyi o verdi."],["Aile avukatı","Mali işleri bilir; lakaptan haberdar olabilecek kadar yakın; o gün adliyede duruşma listesinde görünüyor."]],
    E:[["other","Nottaki Lakap","Fidye notunda çocuğun yalnızca ev içinde kullanılan lakabı yazıyor; iş, aileye yakın birinden çıkma.",1,0],
       ["witness","Tanık {W1}","Çocuk, tanıdığı birinin elinden tutup hiç direnmeden gitti; arabaya binerken gülüyordu bile.",1,0],
       ["phone","Arka Plan Sesi","Fidye aramasının arkasında tünel geçiş 'düt'leri ve 17:42'de yayınlanan 'D-100 ışıklarda yoğunluk' trafik anonsu duyuluyor — arayan o sırada D-100 üzerinde hareket hâlindeki bir araçtaydı.",1,0],
       ["other","İfade Tutanağı","17:30–18:05 arasında {S7}, evde polise ifade veriyordu; tutanakta saatler ve imzası işli.",1,0],
       ["other","Depo Kilidi","Çocuğun bulunduğu eski parça deposunun kilidi zorlanmadan, ESKİ tip bir anahtarla açılmış.",1,0],
       ["other","Kayıp Anahtarlık","Ailenin yazlık-depo anahtarlığı geçen yaz ARACIN torpido gözünden kaybolmuştu; kayıp tutanağına 'aracı en son kullanan fark etti' diye geçilmiş.",1,0],
       ["gps","Rota Sapması","Aile aracı o gün okul güzergâhından sapıp sanayi bölgesine girmiş; sürücüsü 'servise uğradım' dedi ama servisin defterinde o güne ait kayıt yok.",1,0],
       ["witness","Tanık {W2} (pompacı)","Fidye hattının kontörü bizden alındı; alan adam müdavimdir — ne zaman gelse bir de cam suyu alır, ondan aklımda.",1,0],
       ["phone","Eski Tehditler","{S4}'ün aylar önceki tehdit mesajları dosyada; dünkü 'şehirde görüldü' ihbarı doğrulanamadı.",0,1],
       ["other","İzin Sorusu","{S7}'nin o gün izinli olup olmadığı tartışılıyordu; bir hafta önceden onaylı izin formu dosyadan çıktı, ama izinli olmak evde olmadığı anlamına gelmiyor.",0,1],
       ["other","Okul Çıkışı","{S2}, çocuğu son gören kişi; 'kapıda bekleyen tanıdık var sandım, el salladı' diyor.",0,1],
       ["other","Adliye Listesi","{S8} o gün adliyede iki duruşmada görünüyor: 15:00 ve 18:30; aradaki saatler boş.",0,0],
       ["phone","Pasaport Kaydı","{S1}'in çıkış kaydı olaydan iki gün öncesi; dönüşe dair kayıt yok — ama kara yoluyla dönüş kayda girmeyebilir.",0,0]] },

  { t:"Müzedeki Boş Çerçeve", e:"Sanat Eseri Hırsızlığı", d:"hard", st:"Tablo dün gece çalınmadı; haftalardır zaten yerinde değildi.", nS:8, nW:2, c:2,
    sum:"Bir müzede tablonun sahte olduğu anlaşıldı. Herkes 'gece soygunu' konuşuyor; oysa sahtenin boyası, değişimin haftalar önce yapıldığını söylüyor. O haftalarda tablo neredeydi ve ona kim, hangi denetimden geçmeden dokunabildi?",
    sol:"Hırsız {S3}. Sahtenin boyası tam sertleşmemiş — değişim gece değil, 3–5 hafta önce yapıldı ve tablo tam o aralıkta DÖRT hafta boyunca temizlik için restorasyon atölyesindeydi; depoya hiç girmedi. İadede yalnızca 'UV hızlı kontrol' yapıldı, spektroskopi yapılmadı — bugünkü analiz sahtede modern bir bağlayıcı yakaladı. Sahte tuvalin nadir bronz raptiyeleri şehirdeki tek satıcı tarafından son üç ayda iki kişiye satılmış: nakit ödeyen bir hobi ressamı ve KURUM faturasıyla müze atölyesi — atölyede tek restoratör çalışır. Tablo içerideyken atölyenin gece giriş sayacı normalin iki katına çıktı ve tanık geç saatlere kadar şövale başında birini gördü; 'eser yakında müsait olur' yazıp silinen koleksiyoner mesajları da kurtarıldı. Küratörün katalog dokunuşu müdür onaylı bir ölçü düzeltmesi; teknisyenin gece komutu önceden zamanlanmış bakım görevi; temizlikçinin bezindeki pigment herkesin kullandığı temizlik sınıfından.",
    S:[["Güvenlik teknisyeni","Gece kamera komutu onun terminalinden girilmiş görünüyor; vardiyaları düzensiz."],["Müze müdürü","O gece galadaydı; bütçe kesintileri yüzünden yönetimle arası gergin."],["Restoratör","Atölyede TEK başına çalışır; tablo dört hafta onun elindeydi; özel koleksiyonerlere danışmanlık yaptığı söylenir."],["Bekçi","Gece turlarını atar; sanat bilgisi yok."],["Rehber","Gündüz çalışır; eserlerin hikâyelerini ezbere bilir."],["Temizlikçi","Atölye dahil tüm alanları temizler; arabasında pigment bulaşığı bez bulundu."],["Küratör","Katalogları o yazar; geçen ay tabloyla ilgili bir kaydı değiştirdi."],["Sigorta eksperi","Yıllık rapor için müzeye gelip gidiyor; değer biçme yetkisi var."]],
    E:[["forensic","Boya Kürü","Çerçevedeki sahtenin boyası tam sertleşmemiş; değişim dün gece değil, 3–5 HAFTA önce yapılmış.",1,0],
       ["other","Sergi Takvimi","Tablo tam o aralıkta DÖRT hafta sergiden indirilip temizlik için restorasyon atölyesindeydi; depoya hiç girmedi.",1,0],
       ["other","İade Kontrolü","Atölyeden iadede yalnızca 'UV hızlı kontrol' yapılmış; tutanakta spektroskopi yok. Bugünkü analiz sahtede tek bir MODERN bağlayıcı yakaladı.",1,0],
       ["forensic","Raptiye Tipi","Sahte tuvalin bronz raptiyeleri nadir bir tip; şehirdeki tek satıcının defterine göre son üç ayda iki alıcı var: nakit ödeyen bir hobi ressamı ve KURUM faturalı müze atölyesi.",1,0],
       ["other","Atölye Düzeni","Atölyede tek restoratör çalışır; malzeme dolabının ikinci anahtarı idarededir ama zimmet defterinde hiç hareket yok.",1,0],
       ["other","Giriş Sayacı","Atölye kapısının sayacı, tablo içerideyken gece girişlerini normalin İKİ katı saymış; sayaç kart eşleşmesi tutmaz, yalnızca adet sayar.",1,0],
       ["phone","Koleksiyoner Mesajı","'Eserin durumu çok iyi, yakında müsait olur' yazıp silinen mesajlar {S3}'ün telefonundan kurtarıldı.",1,0],
       ["witness","Tanık {W1}","Tablo atölyedeyken birkaç akşam ışıklar geç saate kadar yanıyordu; içeride şövale başında biri vardı, kim bilmem.",1,0],
       ["other","Katalog Düzeltmesi","{S7} geçen ay katalogda tabloyla ilgili bir kaydı değiştirdi.",0,1],
       ["phone","Onay Maili","Katalog değişikliğinin 'çerçeve ölçüsü düzeltmesi' olduğu ve müdür onayıyla yapıldığı yazışmalarda görülüyor.",0,0],
       ["other","Gece Komutu","Kamerayı döngüye alan gece komutu ilk bakışta {S1}'in terminalinden girilmiş görünüyor; inceleme, komutun ortak bakım hesabının ÖNCEDEN zamanlanmış görevi olduğunu gösterdi.",0,1],
       ["forensic","Lekeli Bez","{S6}'nın arabasında pigment bulaşığı bir bez bulundu; pigment, atölyede herkesin kullandığı temizlik sınıfından.",0,1],
       ["witness","Tanık {W2} (sigorta eksperi)","İade günü esere şöyle bir bakıldı; 'asıl kontrol sergi öncesi yapılır' dendi — yapılmadı, tutanağa da yazdırdım.",0,0]] },

  { t:"Hayalet Hesaplar", e:"Siber Dolandırıcılık Ağı", d:"hard", st:"Saldırgan binaya hiç girmedi. 'İçeride değildim' demek artık mazeret değil.", nS:8, nW:2, c:1,
    sum:"Bir şirketin altyapısında sahte hesaplar açıldı. İzler bir geliştiricinin ev adresine çıkıyor — ama o, işlemlerin yapıldığı gecelerin ikisinde okyanus üzerinde uçuyordu. Birisi suçu ustaca paketleyip ona teslim etti. Paketi saran ipin ucu, kapatılmış bir hata kaydında.",
    sol:"Sorumlu {S2}. Saldırı, iki hafta önce DEĞİŞTİRİLEN eski servis anahtarı ve {S7}'nin yenilenen ESKİ VPN sertifikasıyla yapıldı; ikisi de yalnızca iptal listesi geç senkronlanan 'eski düğümde' geçerliydi — ve o senkron gecikmesi için açılan #8841 numaralı kaydı açıp 'düzeltilmeyecek' diye kapatan kişi {S2}. {S7} iki gece uçaktaydı; ev IP'si ve cüzdan bağlantısı, suçu ona yıkmak için kurgulandı (aktarım tam uçuş saatinde yapılmış). Eski düğüme yalnızca bakım VPN'iyle ulaşılıyor; geçerli sertifikası olan üç kişiden {S6}'nın belgesi aylar önce dolmuş, {S3}'ün o hafta hiç oturumu yok. Dış sağlayıcı, bağlantıların MOBİL bir hattan geldiğini söylüyor ve {S2}'nin faturası tam o gecelerde 03:00–04:00 arasında veri patlaması gösteriyor — 'dizi indiriyordum' diyor. Binaya hiç girmemiş olması onu aklamıyor: bu suç zaten içeri girmeden işlendi.",
    S:[["Takım lideri","Olay haftası yıllık izindeydi; dönüşte olayı ilk raporlayan o oldu."],["Veritabanı yöneticisi","Hesap açma yetkisi var; o hafta izinliydi ve binaya hiç girmedi; izni şehirde geçirdiğini söylüyor."],["Ağ uzmanı","Servis anahtarlarının kasasını o yönetir; iç ağ yönlendirmesine hâkim."],["Destek görevlisi","Yalnızca şifre sıfırlama yetkisi var; gece vardiyasında çalışır."],["Tester","Test ortamına erişir; üretim sistemine yetkisi yok."],["Sistem mimarı","O hafta yurt dışında bir konferanstaydı; bakım sertifikasının süresi aylar önce dolmuş."],["Kıdemli geliştirici","Sahte oturumlar onun EV adresinden görünüyor; üç hafta önce 'şüpheli giriş' bildirmiş, VPN sertifikası yenilenmişti."],["Stajyer","Yalnızca okuma yetkisi; gece erişim kaydı yok."]],
    E:[["other","Servis Anahtarı","Sahte hesaplar parolayla değil, bir SERVİS anahtarıyla açılmış; anahtar kasasını {S3} yönetiyor.",1,0],
       ["other","Eski Anahtar","Kullanılan anahtar, iki hafta önce DEĞİŞTİRİLEN eski sürüm; eski sürüm yalnızca iptal listesi gecikmeli senkronlanan 'eski düğüm' üzerinde hâlâ geçerliydi.",1,0],
       ["other","Kapatılan Kayıt","Eski düğümün senkron gecikmesi için açılan #8841 numaralı hata kaydı, {S2} tarafından açılmış ve yine ONUN tarafından 'düzeltilmeyecek' diye kapatılmış.",1,0],
       ["gps","Uçuş Kaydı","Sahte oturumlar {S7}'nin ev IP'sinden görünüyor; ancak işlemlerin yapıldığı dört gecenin İKİSİNDE {S7} okyanus üzerinde uçuyordu (biniş kartı + uçak Wi-Fi kaydı).",1,0],
       ["other","Sertifika Notu","{S7} üç hafta önce 'şüpheli giriş' bildirmiş, VPN sertifikası yenilenmişti. Eski sertifika da tıpkı eski anahtar gibi yalnızca ESKİ düğümde geçerliydi.",1,0],
       ["other","Erişim Yolu","Eski düğüme yalnızca bakım VPN'i üzerinden girilebiliyor. Geçerli bakım sertifikası olanlar: {S2}, {S3} ve {S6} — {S6}'nın sertifikasının süresi aylar önce dolmuş.",1,0],
       ["other","Dış Sağlayıcı Logu","Bakım VPN'inin dış sağlayıcı kayıtlarına göre o gecelerdeki bağlantılar MOBİL bir hattan gelmiş; {S3}'ün o hafta hiç bakım oturumu yok.",1,0],
       ["phone","Veri Dökümü","{S2}'nin hat faturasında tam o gecelerde 03:00–04:00 arasında olağan dışı veri kullanımı var; kendisi 'dizi indiriyordum' diyor.",1,0],
       ["phone","Kripto Tuzağı","{S7}'nin cüzdanına bağlı görünen aktarım, o UÇAKTAYKEN yapılmış — bağlantı, suçu üzerine yıkmak için kurulmuş.",0,1],
       ["other","İzin Dilekçesi","{S2} o hafta izinliydi ve binaya hiç girmedi; izni şehirde geçirdiğini söylüyor.",0,1],
       ["witness","Tanık {W1} (gece bekçisi)","O geceler ofis bomboştu; 'iş içeriden' diyorlar ama içeride KİMSE yoktu, ben söyleyeyim.",1,0],
       ["other","Mimar Konferansı","{S6} o hafta yurt dışında konferanstaydı; konuşması kayıtlı ama saat dilimi farklı, gece saatlerini kapsamıyor.",0,0],
       ["other","Stajyer Yetkisi","{S8}'in yalnızca okuma yetkisi var; üretim sistemine erişim kaydı hiç oluşmamış.",0,0]] },

  { t:"Köprü Altındaki İnfaz", e:"Mafya İnfazı", d:"hard", st:"Kurban katiline el salladı. Katilin mazereti ise bir ceket kadar ince.", nS:8, nW:2, c:0,
    sum:"Bir örgüt adamı köprü altında, bir metreden yakın mesafeden vuruldu. Balistik bir tetikçiyi, defterler bir muhasebeciyi, dakikalar bir korumayı işaret ediyor. Ama kurban katilini görünce el sallamıştı — ve birinin 'kusursuz' mazereti, omuz ölçüsüne takılıyor.",
    sol:"Tetikçi {S1}. Kurban, katiline el sallayacak kadar güveniyordu ve ajandasındaki '23:30 — K.A. mutabakat' notu bir HESAP kapatma randevusuydu — defterleri tutan kişiyle. Pazartesi başlayacak dış denetim, {S1}'in yönettiği ara hesaplardaki ters kayıtları ortaya çıkaracaktı. Kumarhane mazereti ilk bakışta kusursuz: 22:00–01:00 masada görünüyor. Ama 23:15–00:45 arasındaki karelerde masadaki adamın yüzü hiç dönmüyor, omuz genişliği önceki karelerden 4 cm DAR ölçülüyor ve fişler 70 dakika boyunca kımıldamıyor — ceketi giyen bir dublör; garson da 'iki kez içki götürdüm, yüzünü görmeden eliyle itti' diyor. Köprü, kumarhaneye gece trafiğinde 12 dakika. Balistiğin gösterdiği silah örgütün kendi otoparkından 'çalınmıştı' ve {S4}'e o gece atılan sahte buluşma mesajıyla birlikte hazır bir günah keçisi paketiydi. Korumanın 12 dakikalık ayrılığı ise patronla aynı kapı kamerasında çözülüyor.",
    S:[["Örgüt muhasebecisi","Defterleri ve ara hesapları o tutar; kumar tutkunu olarak bilinir; o gece kumarhanedeydim diyor."],["Şoför","Patronun aracını kullanır; o gece patronu başka bir adrese bıraktı."],["Koruma","Kurbanın en güvendiği adamlardandı; o gece konvoyla görevdeydi."],["Husumetli tetikçi","Kurbanla kan davası var; balistik, ona kayıtlı bir silaha çıkıyor; 'tuzağa düşürüldüm' diyor."],["Bar işletmecisi","Köprüye yakın barın sahibi; o gece bar açıktı, içerideydi."],["Haberci","Örgüt içinde mesaj taşır; kurbanla son günlerde sık görüşmüştü."],["Eski ortak","Kurbanla yıllar önce yolları ayrılmıştı; o gece hastanede refakatçiydi, kayıt giriş saatini gösteriyor ama koridorlar serbest."],["Tefeci","Kurbanın borçlularındandı; o gece başka semtte olduğunu söylüyor, tanığı kendi adamı."]],
    E:[["forensic","Atış Mesafesi","Kurban bir metreden yakın mesafeden vuruldu; yanına silahlı yaklaşmasına izin verdiği biriydi.",1,0],
       ["witness","Tanık {W1}","Köprü tarafına yürüyen adamı kurban görünce EL SALLADI; telaş yoktu, tanıdık gibiydi.",1,0],
       ["other","Ajanda Notu","Kurbanın defterinde o gece için '23:30 — K.A. mutabakat' yazıyor; mutabakat, örgütte aylık hesap kapatma görüşmesi demektir.",1,0],
       ["phone","Denetim Mesajı","Kurban iki gün önce yakın çevresine 'pazartesi defterler dış denetime gidiyor' diye yazmış.",1,0],
       ["phone","Zimmet İzi","Defter incelemesinde, {S1}'in yönettiği iki ara hesapta açıklanamayan ters kayıtlar bulundu.",1,0],
       ["camera","Kumarhane Kaydı","{S1}, 22:00–01:00 arasında poker masasında görünüyor; kayıt kesintisiz.",1,0],
       ["forensic","Omuz Ölçümü","Aynı kayıtta 23:15–00:45 arasındaki karelerde masadaki adamın yüzü hiç dönmüyor; omuz genişliği önceki karelerden 4 cm DAR ölçülüyor ve fişler 70 dakika boyunca hiç oynamıyor.",1,0],
       ["other","Mesafe","Kumarhane ile köprü altı arası gece trafiğinde 12 dakika sürüyor.",1,0],
       ["witness","Tanık {W2} (kumarhane garsonu)","Bey masadan hiç kalkmadı derler; ben o gece iki kez içki götürdüm, ikisinde de yüzünü dönmeden eliyle itti. Hâlbuki her gelişinde bahşiş verir, iki laf ederdi.",1,0],
       ["forensic","Balistik","Mermi, {S4} adına kayıtlı ve aylar önce çalındığı bildirilen bir silahtan çıkma.",0,1],
       ["other","Hırsızlık Tutanağı","O silahın çalındığı yer örgütün KENDİ otoparkı; o gece kamera arızalıydı ve otoparka yalnızca üyeler girebiliyor.",1,0],
       ["phone","Sahte Çağrı","{S4}'e o gece köprü yakınına 'buluşma' çağrısı atılmış; mesajı atan hat kontörlü, sahibine ulaşılamıyor.",0,1],
       ["gps","Konvoy Kaydı","{S3}, 23:38–23:50 arasında konvoydan ayrı görünüyor; aynı dakikalarda patronun indiği adresin kapı kamerasında PATRONLA birlikte kayıtlı.",0,0],
       ["other","Bar Hesabı","{S5}'in barında o gece yoğunluk vardı; kasa hareketleri gece boyunca düzenli devam ediyor.",0,0]] }
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
  if (ver === 'detv2zorh1') return;
  var r = await _runDetectiveSeed();
  if (r.ok) { await setConfig('detective_seed_v', 'detv2zorh1'); console.log('Dedektif: ' + r.count + ' vaka seed edildi (havuz: ' + r.poolSize + ' karakter).'); }
  else console.warn('Dedektif: havuzda yeterli karakter yok (' + r.poolSize + '/' + r.min + '), seed atlandı.');
}
// Admin tetikler: vakaları mevcut havuzla baştan oluşturur (ilerleme sıfırlanır)
async function regenerateDetectiveCases() {
  var r = await _runDetectiveSeed();
  if (r.ok) await setConfig('detective_seed_v', 'detv2zorh1');
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
