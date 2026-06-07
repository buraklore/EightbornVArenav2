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
  await query("DELETE FROM streamer_requests WHERE user_id = $1", [userId]);
  await query("DELETE FROM notifications WHERE user_id = $1", [userId]);
  await query("DELETE FROM contact_messages WHERE user_id = $1", [userId]);
  await query("DELETE FROM game_scores WHERE user_id = $1", [userId]);
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
async function getDetectiveProgress(userId, caseId) {
  var r = await query("SELECT suspect_id, attempt_no, correct, delta FROM detective_guesses WHERE user_id=$1 AND case_id=$2 ORDER BY attempt_no", [userId, caseId]);
  var solved = r.rows.some(function(x){ return x.correct; });
  return { attempts: r.rows.length, solved: solved, done: solved || r.rows.length >= 3, tried: r.rows.map(function(x){ return x.suspect_id; }) };
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
  var cr = await query("SELECT id, culprit_id, solution FROM detective_cases WHERE id=$1 AND active=true", [caseId]);
  if (!cr.rows[0]) return { error: 'Vaka bulunamadi.' };
  var cas = cr.rows[0];
  var sv = await query("SELECT id FROM detective_suspects WHERE id=$1 AND case_id=$2", [suspectId, caseId]);
  if (!sv.rows[0]) return { error: 'Gecersiz supheli.' };
  var prev = await query("SELECT attempt_no, correct, suspect_id FROM detective_guesses WHERE user_id=$1 AND case_id=$2 ORDER BY attempt_no", [userId, caseId]);
  var attempts = prev.rows.length;
  var alreadySolved = prev.rows.some(function(x){ return x.correct; });
  if (alreadySolved || attempts >= 3) {
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
  if (correct || attemptNo >= 3) {
    var sumr = await query("SELECT COALESCE(SUM(delta),0) AS s FROM detective_guesses WHERE user_id=$1 AND case_id=$2", [userId, caseId]);
    var net = Math.max(0, Math.min(100, parseInt(sumr.rows[0].s)));
    try { await saveScore(userId, 'DETECTIVE', net, 100); } catch (e) {}
    var rev = await _detectiveReveal(caseId, cas, suspectId);
    rev.completed = true; rev.correct = correct; rev.attempt_no = attemptNo; rev.delta = delta; rev.case_points = net;
    return rev;
  }
  return { completed: false, correct: false, attempt_no: attemptNo, delta: delta, remaining: 3 - attemptNo };
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
  var cr = await query("SELECT id, culprit_id, solution FROM detective_cases WHERE id=$1 AND active=true", [caseId]);
  if (!cr.rows[0]) return { error: 'Vaka bulunamadi.' };
  var cas = cr.rows[0];
  var sv = await query("SELECT id FROM detective_suspects WHERE id=$1 AND case_id=$2", [suspectId, caseId]);
  if (!sv.rows[0]) return { error: 'Gecersiz supheli.' };
  var correct = String(suspectId) === String(cas.culprit_id);
  var MAX = 2;
  var att = parseInt(attempt) || 1;
  // İlk yanlış tahminde çözümü/suçluyu SIZDIRMA — sadece yanlış olduğunu bildir
  if (!correct && att < MAX) return { correct: false, final: false, attempt: att, remaining: MAX - att };
  var rev = await _detectiveReveal(caseId, cas, suspectId);
  rev.correct = correct;
  rev.final = true;
  rev.attempt = att;
  return rev;
}

// ═══════════════════════════════════════════════════
// DEDEKTİF — 30 VAKA (şüpheliler/tanıklar gerçek karakterlerden atanır)
// {S1..Sn} = şüpheli karakterler, {W1..W2} = tanık karakterleri
// ═══════════════════════════════════════════════════
var DET_CASES = [
  // ───────── KOLAY (10): 3 şüpheli, 4 kanıt ─────────
  { t:"Gece Yarısı Galerisi", e:"Araç Hırsızlığı", d:"easy", st:"Fail henüz bulunamadı, üç kişi sorgulanıyor.", nS:3, nW:1, c:2,
    sum:"Gece saat 02:15te şehrin merkezindeki lüks bir galeriden spor araba çalındı. Alarm devre dışı bırakılmış, kapıda zorlama izi yok. İçeriden bilgisi olan biri şüpheli görünüyor.",
    sol:"Suçlu {S3}. Alarm şifresini yalnızca eski çalışanlar biliyordu ve GPS verisi olay saatinde aracını galerinin arka sokağında gösteriyor. {S1} başka şehirdeki bir düğündeydi, {S2} ise olay anında görüntülü görüşmedeydi.",
    S:[["Galeri sahibi","Aracı sigortalı; o gece başka şehirdeki bir düğündeydi."],["Gece güvenliği","Kameraları o yönetiyor; olay sırasında kayıtlar kısa süre kapanmış."],["Eski galeri çalışanı","Altı ay önce kovuldu, maddi sıkıntıda ve galeriye yakın oturuyor."]],
    E:[["camera","Kamera Kaydı","Saat 02:10ta kameralar dört dakika kapanıyor; sistemi yalnızca şifreyi bilen biri kapatabilir.",1,0],
       ["gps","GPS Verisi","{S3} adlı kişinin aracı 01:50 ile 02:40 arası galerinin arka sokağında kayıtlı; diğer iki kişinin aracı evlerinde.",1,0],
       ["phone","Telefon Kaydı","{S2} olay saatinde annesiyle görüntülü görüşmede; {S1} başka şehirden baz veriyor.",1,0],
       ["witness","Tanık {W1}","{W1}, galerinin önünde kırmızı bir ceket gördüğünü söylüyor; ama mahallede kırmızı ceket çok yaygın.",0,1]] },

  { t:"Pazar Yerinde Kapkaç", e:"Kapkaç", d:"easy", st:"Çanta kalabalıkta kapıldı, fail koşarak kayboldu.", nS:3, nW:1, c:1,
    sum:"Kalabalık semt pazarında bir kadının çantası aniden kapıldı ve hırsız koşarak kalabalığa karıştı. Görgü tanıkları failin hızlı koştuğunu söylüyor.",
    sol:"Suçlu {S2}. Güvenlik kamerası onu çantayla koşarken net şekilde yakaladı ve olay yerindeki spor ayakkabı izi onunla uyuşuyor. {S1} tezgahının başında satış yapıyordu, {S3} ise bastonla zor yürüyor.",
    S:[["Seyyar satıcı","Olay anında kendi tezgahının başında satış yapıyordu."],["İşsiz genç","Hızlı koşabilir; son zamanlarda ciddi para sıkıntısı çekiyor."],["Emekli komşu","Bastonla zor yürüyen yaşlı bir adam."]],
    E:[["camera","Kamera","{S2} adlı kişi çantayı kapıp kalabalığın arasında koşarken görülüyor.",1,0],
       ["forensic","Ayak İzi","Olay yerindeki spor ayakkabı izinin ölçüsü {S2} ile uyuşuyor.",1,0],
       ["witness","Tanık {W1}","{W1}, kaçan kişinin genç ve çok hızlı olduğunu söylüyor.",1,0],
       ["phone","Eski Kayıt","{S1} geçen yıl bir hırsızlık dedikodusuyla anılmıştı, ama o gün pazarda satış yapıyordu.",0,1]] },

  { t:"Köşedeki Bakkal", e:"Dükkan Soygunu", d:"easy", st:"Kasadaki para gece çalındı, kapı anahtarla açılmış.", nS:3, nW:1, c:0,
    sum:"Mahalle bakkalının kasası gece boşaltıldı. Kapıda kırma izi yok, anahtarla açılmış. Kasayı yalnızca birkaç kişi biliyordu.",
    sol:"Suçlu {S1}. Yedek anahtar sadece ondaydı ve banka kaydına göre soygun gecesi hesabına büyük nakit yatırdı. {S2} o gece nöbette hastanedeydi, {S3} ise şehir dışındaydı.",
    S:[["Bakkalın ortağı","Dükkanın yedek anahtarı onda; son aylarda borçları arttı."],["Komşu esnaf","Yan dükkanın sahibi; o gece hastanede nöbetteydi."],["Eski çırak","İşten ayrılmıştı; olay gecesi şehir dışındaydı."]],
    E:[["forensic","Anahtar","Kapı zorlanmamış, yedek anahtarla açılmış; yedek anahtar {S1} adlı kişide.",1,0],
       ["phone","Banka Kaydı","{S1} adlı kişi soygun gecesi hesabına beklenmedik bir nakit yatırdı.",1,0],
       ["witness","Tanık {W1}","{W1}, gece dükkanın ışığının kısa süre yandığını ama anahtar sesi duyduğunu söylüyor.",1,0],
       ["camera","Sokak Kamerası","Karşı sokaktaki kamerada {S3} benzeri biri görünüyor, ama o kişi o gece başka şehirdeydi.",0,1]] },

  { t:"Sahte Çağrı", e:"Telefon Dolandırıcılığı", d:"easy", st:"Yaşlı bir kadın telefonda kandırılıp parasını kaptırdı.", nS:3, nW:1, c:1,
    sum:"Yaşlı bir kadın, kendini banka görevlisi tanıtan birinin telefonuyla kandırıldı ve tüm parasını sahte bir hesaba aktardı. Arama bir telefon kulübesinden değil, kişisel hattan yapılmış.",
    sol:"Suçlu {S2}. Arama kayıtları dolandırıcı numaranın ona ait olduğunu, paranın da onun eriştiği bir hesaba geçtiğini gösteriyor. {S1} arama saatinde iş yerinde kamerayla sabit; ses yüzünden akraba {S3} adlı kişiden şüphelenilse de hat ona değil {S2} adlı kişiye kayıtlı.",
    S:[["Komşu genç","İşsiz; başkalarının adına hat açtığı biliniyor."],["Eski tahsilatçı","İkna kabiliyeti yüksek; üzerine kayıtlı çok sayıda hat var."],["Akraba","Kadının uzaktan akrabası; o hafta telefonunu kaybetmişti."]],
    E:[["phone","Arama Kaydı","Dolandırıcı numara {S2} adına kayıtlı bir hattan arıyor.",1,0],
       ["phone","Para Transferi","Aktarılan para {S2} adlı kişinin eriştiği bir hesaba düşmüş.",1,0],
       ["witness","Tanık {W1}","{W1}, telefondaki sesin yaşlıca olduğunu söylüyor; bu yüzden akraba {S3} adlı kişiden şüphelenildi.",0,1],
       ["camera","İş Yeri Kamerası","{S1} arama saatinde iş yerinde çalışırken kamerada görünüyor.",1,0]] },

  { t:"Apartman Otoparkı", e:"Motosiklet Hırsızlığı", d:"easy", st:"Otoparktan pahalı bir motosiklet kayboldu.", nS:3, nW:1, c:2,
    sum:"Kapalı otoparktan pahalı bir motosiklet çalındı. Bariyer kartı kullanılmış, yani sakinlerden biri ya da kartı olan biri içeri girmiş.",
    sol:"Suçlu {S3}. Bariyer kaydı onun kartının olay saatinde kullanıldığını, kamera da motosikleti iterek götüren kişiyi gösteriyor. {S1} tatildeydi, {S2} ise gece vardiyasındaydı.",
    S:[["Üst kat komşusu","O hafta şehir dışında tatildeydi."],["Kapı görevlisi","Gece vardiyasında giriş kulübesindeydi."],["Yeni taşınan kiracı","Borçları var; garaja kolay erişimi olan bir kartı bulunuyor."]],
    E:[["camera","Otopark Kamerası","Motosikleti sessizce iterek dışarı çıkaran kişinin boyu ve montu {S3} ile uyuşuyor.",1,0],
       ["gps","Bariyer Kaydı","Olay saatinde {S3} adlı kişinin bariyer kartı okutulmuş.",1,0],
       ["phone","Mesaj","{S1} o gün tatil beldesinden mesaj atmış; konumu şehir dışında.",1,0],
       ["witness","Tanık {W1}","{W1}, gece bir gürültü duyduğunu ama {S2} adlı kişiyi kulübede gördüğünü söylüyor.",0,1]] },

  { t:"Kayıp Tasma", e:"Kayıp Köpek", d:"easy", st:"Pahalı cins bir köpek parktan kayboldu.", nS:3, nW:1, c:1,
    sum:"Bir ailenin pahalı cins köpeği parkta tasması çözülerek alındı. Çevrede onu alıp götüren biri görülmüş.",
    sol:"Suçlu {S2}. Kamera onu köpeği kucaklayıp götürürken çekti ve evinin yakınında aynı köpek görüldü. {S1} köpeği gerçekten arıyordu, {S3} ise olay saatinde işteydi.",
    S:[["Köpek gezdiricisi","Köpeği o gün gezdiriyordu; sonra panikle aramaya başladı."],["Komşu","Hayvan alıp satıyor; borçları var."],["Park görevlisi","Olay saatinde park girişinde çalışıyordu."]],
    E:[["camera","Park Kamerası","{S2} adlı kişi köpeği kucağına alıp hızla parktan çıkarken görülüyor.",1,0],
       ["witness","Tanık {W1}","{W1}, aynı köpeği {S2} adlı kişinin evinin yakınında gördüğünü söylüyor.",1,0],
       ["phone","Konum","{S3} olay saatinde iş yerinde; telefon baz kaydı bunu doğruluyor.",1,0],
       ["gps","İlan","{S1} kayıp ilanı vermiş ve köpeği bulana ödül koymuş; gerçekten arıyor.",0,1]] },

  { t:"Markette Eksik Para", e:"Hırsızlık", d:"easy", st:"Marketin kasasından her gün bir miktar para eksiliyor.", nS:3, nW:1, c:0,
    sum:"Bir markette günlük hesaplar tutmuyor; kasadan düzenli olarak az miktar para eksiliyor. Şüphe üç çalışanın üzerinde.",
    sol:"Suçlu {S1}. Kasa kayıtları açıkların yalnızca onun vardiyasında oluştuğunu, kamera da kasadan para aldığı anı gösteriyor. {S2} sadece depoda çalışıyor, {S3} ise o günlerde izindeydi.",
    S:[["Kasiyer","Tek başına kasaya bakıyor; harcamaları son zamanlarda arttı."],["Depo görevlisi","Kasaya hiç dokunmaz, sadece depoda çalışır."],["Reyon görevlisi","Açıkların oluştuğu günlerde yıllık izindeydi."]],
    E:[["camera","Kamera","{S1} adlı kişi kasadan para alıp cebine koyarken kısa bir anda görülüyor.",1,0],
       ["phone","Kasa Kaydı","Para açıkları yalnızca {S1} adlı kişinin vardiyasında oluşuyor.",1,0],
       ["witness","Tanık {W1}","{W1}, {S3} adlı kişinin o günlerde markette hiç olmadığını doğruluyor.",1,0],
       ["forensic","Depo Defteri","Depoda da küçük bir sayım farkı var ama bu {S2} ile değil, eski kayıtla ilgili.",0,1]] },

  { t:"Boş Duvar", e:"Vandalizm", d:"easy", st:"Yeni boyanan okul duvarı bir gecede sprey ile karalandı.", nS:3, nW:1, c:2,
    sum:"Belediyenin yeni boyadığı okul duvarı gece sprey boyayla tahrip edildi. Boya kokusu hâlâ taze.",
    sol:"Suçlu {S3}. Elindeki ve montundaki sprey boya izleri duvardakiyle aynı renk ve kamera onu gece duvarın önünde gösteriyor. {S1} ailesiyle evdeydi, {S2} ise başka mahallede maçtaydı.",
    S:[["Mahalleli öğrenci","Olay gecesi ailesiyle birlikte evindeydi."],["Komşu genç","Başka mahallede bir halı saha maçındaydı."],["Sokak çizeri","Daha önce izinsiz duvar boyamaktan uyarı almıştı."]],
    E:[["forensic","Boya İzi","{S3} adlı kişinin elinde ve montunda duvardakiyle aynı sprey boya bulundu.",1,0],
       ["camera","Kamera","Gece duvarın önünde sprey sallayan kişinin boyu {S3} ile uyuşuyor.",1,0],
       ["phone","Konum","{S2} olay saatinde halı saha bölgesinde baz veriyor.",1,0],
       ["witness","Tanık {W1}","{W1}, duvarda eski bir karalama daha gördüğünü söylüyor ama o aylar öncesine ait.",0,1]] },

  { t:"Otobüste Cüzdan", e:"Yankesicilik", d:"easy", st:"Kalabalık otobüste bir yolcunun cüzdanı çalındı.", nS:3, nW:1, c:1,
    sum:"Tıklım tıklım bir otobüste yolcunun cüzdanı cebinden alındı. Hırsız bir sonraki durakta inmiş.",
    sol:"Suçlu {S2}. Otobüs kamerası onun ele yakın durduğunu ve durakta aceleyle indiğini gösteriyor; çalınan kartlardan biri onun kullandığı bir markette denenmiş. {S1} en arkada oturuyordu, {S3} ise hiç inmedi.",
    S:[["Ayakta yolcu","Mağdurun hemen yanında, ele çok yakın duruyordu."],["Oturan yolcu","En arkada oturuyordu; mağdura uzaktı."],["Düzenli yolcu","Sondaki durağa kadar inmeden gitti."]],
    E:[["camera","Otobüs Kamerası","{S2} adlı kişi mağdurun cebine yakın duruyor ve cüzdanın alındığı durakta aceleyle iniyor.",1,0],
       ["phone","Kart Denemesi","Çalınan kartlardan biri {S2} adlı kişinin sık gittiği bir markette denenmiş.",1,0],
       ["witness","Tanık {W1}","{W1}, sondaki durakta inen telaşlı bir yolcu gördüğünü söylüyor.",1,0],
       ["forensic","Koltuk","En arka koltukta yabancı bir parmak izi var ama bu eski bir yolcuya ait.",0,1]] },

  { t:"Konser Kapısı", e:"Sahte Bilet Dolandırıcılığı", d:"easy", st:"Onlarca kişi sahte biletle konsere alınmadı.", nS:3, nW:1, c:0,
    sum:"Kapalı gişe bir konserde onlarca kişi sahte bilet yüzünden içeri alınamadı. Biletler kapı önünde nakit satılmış.",
    sol:"Suçlu {S1}. Sahte biletlerin QR kodları onun telefonundan üretilmiş ve kapı kamerası onu nakit toplarken çekmiş. {S2} gerçek bir bilet alıp içeri girmiş, {S3} ise o gece çalışıyordu.",
    S:[["Bilet karaborsacısı","Kapı önünde nakit bilet satıyordu; geçmişinde benzer şikayetler var."],["Konser izleyicisi","Gerçek bir bilet alıp içeri girdi."],["Güvenlik görevlisi","O gece başka bir kapıda görevliydi."]],
    E:[["phone","QR Kaydı","Sahte biletlerin kodları {S1} adlı kişinin telefonunda üretilmiş.",1,0],
       ["camera","Kapı Kamerası","{S1} adlı kişi kapı önünde nakit karşılığı bilet dağıtırken görülüyor.",1,0],
       ["witness","Tanık {W1}","{W1}, {S2} adlı kişinin geçerli biletle turnikeden geçtiğini doğruluyor.",1,0],
       ["gps","Vardiya","{S3} olay saatinde başka bir kapıda nöbette; vardiya kaydı var.",0,1]] },

  // ───────── ORTA (10): 5 şüpheli, 8 kanıt ─────────
  { t:"Konaktaki Son Akşam", e:"Cinayet", d:"medium", st:"Şüpheli ölüm; beş davetli ifade veriyor.", nS:5, nW:1, c:1,
    sum:"Zengin iş adamı, kendi konağında verdiği yemekli davetin ardından çalışma odasında ölü bulundu. Ölüm saati gece 23:40 civarı. Odanın penceresi içeriden kilitli, kapı yalnızca bir kez açılmış.",
    sol:"Katil {S2}. Adli bulgular şarap kadehinde sadece onun parmak izini gösteriyor ve bina kaydı herkes salondayken onun 23:35te çalışma odası katına çıktığını kaydetmiş. Telefon kaydı cinayetten hemen önce kurbanla sert bir tartışma yaptıklarını doğruluyor. Diğerlerinin fiziksel kanıtı yok.",
    S:[["Eşi","Evlilikleri sorunluydu; mirasın büyük kısmı ona kalıyor."],["İş ortağı","Şirkette büyük bir borç anlaşmazlığı vardı; o akşam kurbanla baş başa konuştu."],["Yeğeni","Kumar borçları var, sürekli para isterdi."],["Aşçı","Yemeği o hazırladı; tüm gece mutfaktan çıkmadığını söylüyor."],["Özel sekreter","Kurbanın işlerini bilirdi; notları toparlamak için geç saate kadar kaldı."]],
    E:[["forensic","Parmak İzi","Kurbanın yanındaki şarap kadehinde yalnızca {S2} adlı kişinin parmak izi var.",1,0],
       ["gps","Bina Hareketi","Giriş kayıtlarına göre 23:35te çalışma odası katına çıkan tek kişi {S2}.",1,0],
       ["phone","Telefon Kaydı","Kurban ile {S2} arasında 23:20de gergin, altı dakikalık bir görüşme var.",1,0],
       ["witness","Tanık {W1}","{W1}, eşin tüm akşam salonda misafirlerle olduğunu doğruluyor.",1,0],
       ["camera","Salon Kamerası","Yeğen ve sekreter olay saatinde salonda görünüyor.",1,0],
       ["forensic","Eşarp","Odada eşe ait bir eşarp bulundu ama günler öncesine ait ve oda ev sahiplerinin eşyalarıyla dolu.",0,1],
       ["witness","Tanık: Garson","Bir garson, yeğenin amcasıyla yüksek sesle tartıştığını söylüyor; ama bu akşamın başında, herkesin önünde olmuş.",0,1],
       ["forensic","Mutfak","Aşçının önlüğünde leke var ama bu yemek sosu; laboratuvar doğruladı.",0,0]] },

  { t:"Vitrindeki Boşluk", e:"Kuyumcu Soygunu", d:"medium", st:"Kuyumcunun kasası gündüz vakti boşaltıldı.", nS:5, nW:1, c:3,
    sum:"İşlek bir kuyumcu, öğle molasında soyuldu. Alarm çalmadı, kasa şifreyle açıldı. İçeriden destek alındığı düşünülüyor.",
    sol:"Soyguncu {S4}. Alarmı geçici kapatan kod onun terminalinden girilmiş ve kaçış aracının plakası ona ait. {S1} öğle molasında bankadaydı, {S2} müşteriyle ilgileniyordu, {S5} ise hastaydı ve gelmemişti.",
    S:[["Kuyumcu sahibi","Sigortası yüksek ama o gün bankada işlem yapıyordu."],["Tezgahtar","Soygun anında bir müşteriyle ilgileniyordu."],["Güvenlik","Alarm sistemini bilir; o gün erken çıkmıştı."],["Muhasebeci","Kasa ve alarm terminaline erişimi var; son aylarda borçlandı."],["Temizlikçi","O gün hasta olduğu için iş yerine hiç gelmemişti."]],
    E:[["phone","Alarm Logu","Alarmı geçici devre dışı bırakan kod {S4} adlı kişinin terminalinden girilmiş.",1,0],
       ["gps","Plaka","Kaçış aracının plakası {S4} adlı kişiye kayıtlı bir araca ait.",1,0],
       ["camera","Banka Kamerası","{S1} soygun saatinde bankada işlem yapıyor.",1,0],
       ["witness","Tanık {W1}","{W1}, tezgahtarın o sırada bir müşteriyle uğraştığını doğruluyor.",1,0],
       ["phone","Devamsızlık","{S5} adlı kişi o gün hastalık nedeniyle hiç gelmemiş; mesaj kaydı var.",1,0],
       ["forensic","Eldiven","Kasada pudralı eldiven izi var; {S4} adlı kişinin çekmecesinde aynı tür eldiven bulundu.",1,0],
       ["camera","Sokak","Güvenliğin erken çıktığı görülüyor ama bu her zamanki mesai saatinde olmuş.",0,1],
       ["witness","Dedikodu","Sahibin sigortayı yeni artırdığı konuşuluyor; fakat poliçe aylar önce yapılmış.",0,1]] },

  { t:"Okuldan Dönmeyen Çocuk", e:"Kaçırılma", d:"medium", st:"Bir çocuk okul çıkışı kayboldu; fidye istenmedi.", nS:5, nW:1, c:2,
    sum:"İlkokul çıkışında bir çocuk eve dönmedi. Fidye talebi gelmedi. Çocuğun tanıdığı biriyle gönüllü gittiği düşünülüyor.",
    sol:"Suçlu {S3}. Okul kamerası çocuğun onun aracına bindiğini, GPS de aracın şehir dışına çıktığını gösteriyor. {S1} o saatte derste, {S2} markette, {S5} ise başka şehirdeydi.",
    S:[["Sınıf öğretmeni","Çocuk kaybolduğunda hâlâ ders veriyordu."],["Komşu","O sırada markette alışverişteydi; fişi var."],["Servis şoförü","Çocuğu tanıyor; o gün servis dışı kendi aracıyla gelmişti."],["Veli","Velayet anlaşmazlığı var ama o gün şehir dışındaydı."],["Kantinci","Olay saatinde başka şehirde akraba ziyaretindeydi."]],
    E:[["camera","Okul Kamerası","Çocuk, {S3} adlı kişinin aracına kendi isteğiyle biniyor.",1,0],
       ["gps","Araç GPS","{S3} adlı kişinin aracı okul çıkışından sonra şehir dışına yöneliyor.",1,0],
       ["phone","Ders Kaydı","{S1} çocuğun kaybolduğu saatte sınıfta ders veriyor.",1,0],
       ["forensic","Market Fişi","{S2} adlı kişinin o saate ait market fişi var.",1,0],
       ["phone","Baz Kaydı","{S5} olay saatinde başka şehirde baz veriyor.",1,0],
       ["witness","Tanık {W1}","{W1}, çocuğun servis dışı bir araca bindiğini gördüğünü söylüyor.",1,0],
       ["phone","Velayet","Velinin velayet davası var diye şüpheleniliyor ama o gün uçakta olduğu kanıtlı.",0,1],
       ["camera","Kantin","Kantincinin ortalıkta olmaması dikkat çekti ama izinli olduğu belgeli.",0,1]] },

  { t:"Fabrikada Arıza", e:"Şirket İçi Sabotaj", d:"medium", st:"Üretim hattı kasıtlı olarak durduruldu.", nS:5, nW:1, c:4,
    sum:"Bir fabrikada üretim hattı gece kasıtlı sabote edildi; kontrol paneline yetkisiz erişim olmuş. Şirket büyük zarara uğradı.",
    sol:"Sabotajcı {S5}. Sistem kaydı yetkisiz girişin onun şifresiyle yapıldığını, kamera da gece panel odasına girdiğini gösteriyor. Yakında işten çıkarılacağını öğrenmişti. Diğerlerinin o saatte sağlam mazereti var.",
    S:[["Vardiya amiri","Gece nöbetinde ama olay anında güvenlikle birlikteydi."],["Bakım teknisyeni","Panele erişebilir; ama o gece izinliydi."],["Mühendis","Sistemi tasarladı; olay saatinde evde görüntülü toplantıdaydı."],["Depo şefi","Panel odasına erişimi yok."],["İşten çıkarılacak operatör","Yakında kovulacağını öğrenmişti; panel şifresi hâlâ aktifti."]],
    E:[["phone","Sistem Logu","Yetkisiz giriş {S5} adlı kişinin şifresiyle yapılmış.",1,0],
       ["camera","Panel Odası","Gece panel odasına giren kişinin boyu ve montu {S5} ile uyuşuyor.",1,0],
       ["witness","Tanık {W1}","{W1}, vardiya amirinin olay anında güvenlik kulübesinde olduğunu doğruluyor.",1,0],
       ["phone","İzin Kaydı","{S2} adlı kişi o gece izinli; giriş kaydı yok.",1,0],
       ["phone","Toplantı","{S3} olay saatinde evden görüntülü toplantıda.",1,0],
       ["gps","Erişim","{S4} adlı kişinin panel odasına yetkisi bulunmuyor.",1,0],
       ["forensic","Alet","Panelde bir tornavida izi var; bakım teknisyenine benziyor ama o marka tüm teknisyenlerde standart.",0,1],
       ["witness","Söylenti","Mühendisin şirketle anlaşmazlığı konuşuluyor ama bu aylar öncesine ait.",0,1]] },

  { t:"Zarftaki Tehdit", e:"Şantaj", d:"medium", st:"Bir iş insanına özel fotoğraflarla şantaj yapılıyor.", nS:5, nW:1, c:0,
    sum:"Tanınmış bir iş insanına, özel fotoğraflarını yayınlamakla tehdit eden şantaj mektupları geliyor. Mektuplar elden bırakılıyor.",
    sol:"Şantajcı {S1}. Mektuplardaki parmak izi ve onun bilgisayarındaki fotoğraf dosyaları suçu ortaya koyuyor; ödeme istenen hesap da onunla bağlantılı. Diğer dört kişinin fotoğraflara erişimi yoktu.",
    S:[["Eski asistan","İş insanının özel arşivine erişimi vardı; kovulduktan sonra kin besliyor."],["Şoför","Sadece aracı kullanır, arşive erişimi yok."],["Rakip iş insanı","Husumetli ama o dönem yurt dışındaydı."],["Komşu","Olayla ilgisi olduğuna dair bir bağ bulunamadı."],["Gazeteci","Haber peşinde ama fotoğraflara hiç ulaşamadı."]],
    E:[["forensic","Parmak İzi","Şantaj zarfında {S1} adlı kişinin parmak izi bulundu.",1,0],
       ["phone","Dosya","{S1} adlı kişinin bilgisayarında şantajda kullanılan fotoğrafların asılları çıktı.",1,0],
       ["phone","Hesap","Ödeme istenen hesap {S1} adlı kişiyle bağlantılı.",1,0],
       ["gps","Erişim","{S2} adlı kişinin özel arşive hiçbir erişimi yok.",1,0],
       ["phone","Pasaport","{S3} şantaj döneminde yurt dışındaydı; giriş çıkış kaydı var.",1,0],
       ["witness","Tanık {W1}","{W1}, zarfı bırakan kişinin {S1} adlı kişiye benzediğini söylüyor.",1,0],
       ["forensic","Mürekkep","Mektuplardaki kalem sıradan bir marka; herkeste bulunabilir, ayırt edici değil.",0,1],
       ["witness","Söylenti","Gazetecinin haber kovaladığı konuşuluyor ama fotoğraflara eriştiğine dair kanıt yok.",0,1]] },

  { t:"Sızıntı", e:"Polis Muhbirliği", d:"medium", st:"Polis operasyonları sürekli önceden sızıyor.", nS:5, nW:1, c:2,
    sum:"Bir ekibin operasyonları defalarca son anda boşa çıktı; bilgiler dışarı sızıyor. Sızıntının ekibin içinden olduğu kesin.",
    sol:"Muhbir {S3}. Telefon kayıtları her operasyon öncesi şüpheli bir numarayla görüştüğünü, banka kaydı da düzenli nakit aldığını gösteriyor. Diğerlerinin görüşme ya da finans kaydında anormallik yok.",
    S:[["Ekip lideri","Tüm bilgilere erişimi var ama hesapları temiz, görüşmeleri normal."],["Genç memur","Yeni katıldı; bazı operasyonlardan haberi bile yoktu."],["Telsiz operatörü","Her operasyonu bilir; son aylarda açıklanamayan nakit girişleri var."],["Analist","Veriye erişir ama operasyon saatlerinde hep ofisteydi."],["Saha memuru","Sadece sahada; planlama detaylarını görmez."]],
    E:[["phone","Arama Kaydı","{S3} adlı kişi her operasyon arifesinde aynı şüpheli numarayla görüşmüş.",1,0],
       ["phone","Banka","{S3} adlı kişinin hesabına düzenli, açıklanamayan nakit giriyor.",1,0],
       ["gps","Erişim","{S2} adlı kişi sızan operasyonların bir kısmından haberdar bile değildi.",1,0],
       ["camera","Ofis","{S4} operasyon saatlerinde ofiste analiz başında görünüyor.",1,0],
       ["witness","Tanık {W1}","{W1}, telsiz operatörünün gizli görüşmeler yaptığını fark ettiğini söylüyor.",1,0],
       ["gps","Yetki","{S5} adlı kişi planlama detaylarını görmüyor, yalnızca saha emri alıyor.",1,0],
       ["phone","Lider","Ekip liderinin çok bilgisi var diye şüpheleniliyor ama finans ve görüşme kaydı tertemiz.",0,1],
       ["forensic","USB","Ofiste sahipsiz bir USB bulundu ama içi boş ve kime ait olduğu belirsiz.",0,1]] },

  { t:"Göldeki Sessizlik", e:"Kayıp Kişi", d:"medium", st:"Tekne gezisine çıkan biri geri dönmedi.", nS:5, nW:1, c:3,
    sum:"Beş arkadaş göl kenarında kamp yaptı; sabah biri ortada yoktu. Boğulma süsü verilmiş olabilir; kişinin son görülme yeri iskele.",
    sol:"Sorumlu {S4}. Kurbanla aralarında büyük bir para alacağı vardı; GPS onun gece iskeleye gittiğini, ayakkabı izi de orada onunkiyle uyuşuyor. Diğerleri çadırlarındaydı ve bunu doğrulayan kayıtlar var.",
    S:[["Kamp arkadaşı","Gece çadırında uyuyordu; yanındaki bunu doğruluyor."],["Tekne sahibi","Tekne kayıtlı ama o gece kasabada eczanedeydi."],["Eski sevgili","Ayrılmışlardı ama gece boyunca ateş başında diğerleriyleydi."],["Borçlu arkadaş","Kurbana büyük borcu vardı; gece tek başına dışarı çıktı."],["Komşu kampçı","Yan çadırdaydı; olayla bağı bulunamadı."]],
    E:[["gps","Telefon Konumu","{S4} adlı kişinin telefonu gece yarısı iskele bölgesine gidiyor.",1,0],
       ["forensic","Ayak İzi","İskeledeki çamurlu ayak izi {S4} adlı kişinin botuyla uyuşuyor.",1,0],
       ["phone","Borç","{S4} adlı kişinin kurbana büyük bir borcu olduğu mesajlardan anlaşılıyor.",1,0],
       ["witness","Tanık {W1}","{W1}, gece iskeleye doğru yürüyen tek bir kişi gördüğünü söylüyor.",1,0],
       ["camera","Kasaba","{S2} gece kasabadaki eczanenin kamerasında görünüyor.",1,0],
       ["witness","Ateş Başı","{S1} ve {S3} adlı kişiler gece boyunca ateş başında birlikteydi.",1,0],
       ["forensic","Can Yeleği","Suda bir can yeleği bulundu ama bu eski ve kime ait olduğu belirsiz.",0,1],
       ["phone","Eski Sevgili","Ayrılık yüzünden eski sevgiliden şüphelenildi ama o gece grupla birlikteydi.",0,1]] },

  { t:"Hesaptaki Açık", e:"Banka Dolandırıcılığı", d:"medium", st:"Müşteri hesaplarından küçük tutarlar sızdırılıyor.", nS:5, nW:1, c:1,
    sum:"Bir bankada çok sayıda müşteri hesabından küçük tutarlar fark edilmeden çekilmiş. İşlem içeriden, yetkili bir terminalden yapılmış.",
    sol:"Dolandırıcı {S2}. Sistem kaydı sahte işlemlerin onun kullanıcı oturumundan açıldığını, paranın da onun açtığı sahte hesaba aktığını gösteriyor. Diğerlerinin oturum kaydı ya da erişimi olayla uyuşmuyor.",
    S:[["Şube müdürü","Yetkisi geniş ama işlem saatlerinde toplantıdaydı."],["Gişe görevlisi","Sahte işlemler onun oturumundan yapılmış; yeni araba aldı."],["Çağrı merkezi","Sadece telefonla destek verir, işlem yetkisi yok."],["BT görevlisi","Sisteme erişir ama o hafta başka şubedeydi."],["Stajyer","İşlem yapma yetkisi bulunmuyor."]],
    E:[["phone","Sistem Logu","Sahte işlemler {S2} adlı kişinin oturumundan açılmış.",1,0],
       ["phone","Hesap","Sızdırılan para {S2} adlı kişinin açtığı sahte bir hesaba gitmiş.",1,0],
       ["camera","Toplantı","{S1} işlem saatlerinde yönetim toplantısında görünüyor.",1,0],
       ["gps","Erişim","{S3} adlı kişinin hiçbir işlem yetkisi yok.",1,0],
       ["phone","Lokasyon","{S4} o hafta başka şubede çalışıyordu; giriş kaydı orada.",1,0],
       ["witness","Tanık {W1}","{W1}, gişe görevlisinin son zamanlarda gösterişli harcamalar yaptığını söylüyor.",1,0],
       ["forensic","Klavye","Terminalde birden çok parmak izi var ama ortak kullanılan bir cihaz olduğu için ayırt edici değil.",0,1],
       ["phone","Stajyer","Stajyerin geç saatlere kaldığı görüldü ama yetkisi olmadığı için işlem yapamaz.",0,1]] },

  { t:"Limandaki Konteyner", e:"Araç Kaçakçılığı", d:"medium", st:"Çalıntı araçlar konteynerle yurt dışına çıkarılıyor.", nS:5, nW:1, c:4,
    sum:"Limanda bir konteynerde çalıntı araçlar bulundu. Konteynerin belgeleri sahte; içeriden bir görevlinin onayıyla geçmiş.",
    sol:"Sorumlu {S5}. Gümrük kaydı sahte onayın onun koduyla verildiğini, kamera da gece konteyner sahasında olduğunu gösteriyor; hesabına büyük nakit geçmiş. Diğerlerinin mazereti ya da yetki dışılığı kanıtlı.",
    S:[["Liman işçisi","Konteyneri taşıdı ama belge onaylama yetkisi yok."],["Vinç operatörü","Sadece yükleme yapar; sahaya gece girmedi."],["Nakliyeci","Aracı sürer; o gece başka limanda kaydı var."],["Komisyoncu","Evrak hazırlar ama gümrük onayını veremez."],["Gümrük memuru","Sahte onayı verebilecek tek yetkili; hesabına büyük nakit girdi."]],
    E:[["phone","Gümrük Logu","Sahte onay {S5} adlı kişinin koduyla sisteme girilmiş.",1,0],
       ["camera","Saha Kamerası","{S5} adlı kişi gece konteyner sahasında görülüyor.",1,0],
       ["phone","Banka","{S5} adlı kişinin hesabına olaydan sonra büyük nakit girmiş.",1,0],
       ["gps","Yetki","{S1} adlı kişinin belge onaylama yetkisi bulunmuyor.",1,0],
       ["gps","Konum","{S3} o gece başka bir limanda; giriş kaydı var.",1,0],
       ["witness","Tanık {W1}","{W1}, gece sahada üniformalı bir görevli gördüğünü söylüyor.",1,0],
       ["forensic","Mühür","Konteynerde sahte mühür var; komisyoncuya atfedildi ama mühür kalıbı onda bulunamadı.",0,1],
       ["camera","Vinç","Vinç operatörünün geç saatte görülmesi şüphe çekti ama mesai kaydı normaldi.",0,1]] },

  { t:"Akşam Yemeğinde Zehir", e:"Zehirleme", d:"medium", st:"Bir konuk yemekte zehirlendi, ucuz atlattı.", nS:5, nW:1, c:2,
    sum:"Bir akşam yemeğinde konuklardan biri zehirlendi ama hayatta kaldı. Zehir yalnızca onun tabağına konmuş; mutfağa erişen biri şüpheli.",
    sol:"Suçlu {S3}. Kurbanın tabağını o hazırlayıp servis etti; mutfakta bulunan zehir kalıntısı onun çantasındakiyle aynı ve aralarında bilinen bir husumet var. Diğerlerinin mutfağa erişimi ya da fırsatı yoktu.",
    S:[["Ev sahibi","Yemeği ısmarladı ama tabaklara hiç dokunmadı."],["Garson","Tabakları taşıdı ama hangi tabağın kime gittiğini bilmiyordu."],["Kurbanın rakibi","Kurbanın tabağını hazırlayıp servis etti; aralarında husumet var."],["Komşu","Mutfağa hiç girmedi, salonda oturdu."],["Aşçı yardımcısı","Sadece bulaşıkla ilgilendi, yemeğe karışmadı."]],
    E:[["forensic","Zehir Kalıntısı","Mutfakta bulunan zehir, {S3} adlı kişinin çantasındaki maddeyle aynı.",1,0],
       ["witness","Tanık {W1}","{W1}, kurbanın tabağını {S3} adlı kişinin hazırlayıp götürdüğünü gördüğünü söylüyor.",1,0],
       ["phone","Husumet","{S3} ile kurban arasında geçmişe dayanan bir husumet mesajlardan belli.",1,0],
       ["camera","Salon","{S4} adlı kişi tüm akşam salonda; mutfağa hiç girmedi.",1,0],
       ["gps","Erişim","{S1} adlı kişi yemeğe ısmarladı ama tabaklarla teması olmadı.",1,0],
       ["witness","Servis","Garson tabakları taşıdı ama dağıtımı şefe bıraktığını söylüyor.",1,0],
       ["forensic","Şarap","Şarapta da acı bir tat arandı ama analiz temiz çıktı; şarap zehirli değil.",0,1],
       ["phone","Aşçı Yardımcısı","Yardımcının mutfakta olması şüphe çekti ama yalnızca bulaşıkla ilgilendiği kamerada görülüyor.",0,1]] },

  // ───────── ZOR (10): 8 şüpheli, 12 kanıt ─────────
  { t:"Üç Kurban", e:"Seri Cinayet", d:"hard", st:"Aynı yöntemle üç cinayet; katil aramızda.", nS:8, nW:2, c:5,
    sum:"Bir mahallede üç kişi aynı yöntemle öldürüldü. Her olay yerinde aynı tür düğüm ve aynı marka eldiven izi var. Katil kurbanların hepsini tanıyan biri.",
    sol:"Katil {S6}. Üç kurbanın da ortak bağlantısı yalnızca onunla kesişiyor; olay saatlerinin hiçbirinde mazereti yok, evinde olay yerindekiyle aynı ip ve eldiven bulundu, GPS onu üç gece de olay yerlerine yakın gösteriyor. Diğer yedi kişinin en az bir cinayette sağlam mazereti var.",
    S:[["Komşu emlakçı","İlk cinayet gecesi başka şehirde toplantıdaydı."],["Kurbanların doktoru","Üçünü de tanırdı ama her gece nöbet kaydı hastanede."],["Market sahibi","İkinci cinayet saatinde dükkanı kamerada açıktı."],["Kuryeci","Rotaları kayıtlı; cinayet saatlerinde uzak semtlerdeydi."],["Eski mahalle bekçisi","Düğüm bilgisi var ama üçüncü gece hastanedeydi."],["İşsiz tamirci","Üç kurbanla da husumeti vardı; hiçbir gece mazereti yok, ip ve eldiveni evinde bulundu."],["Öğretmen","Cinayet gecelerinde sınav okuyordu; dijital kayıt var."],["Apartman yöneticisi","Üçüncü kurbanı tanımıyordu bile."]],
    E:[["forensic","Düğüm","Üç olay yerinde de aynı özel düğüm var; {S6} adlı kişinin evinde aynı düğümle bağlı ip bulundu.",1,0],
       ["forensic","Eldiven","Olay yerlerindeki eldiven izi {S6} adlı kişinin evindeki eldivenlerle aynı marka ve beden.",1,0],
       ["gps","Konum","{S6} adlı kişi üç cinayet gecesinde de olay yerlerine çok yakın baz veriyor.",1,0],
       ["phone","Bağlantı","Üç kurbanın ortak husumeti tek bir kişide kesişiyor: {S6}.",1,0],
       ["phone","Toplantı","{S1} ilk cinayet gecesi başka şehirde otelde kayıtlı.",1,0],
       ["phone","Nöbet","{S2} üç gece de hastane nöbet listesinde.",1,0],
       ["camera","Dükkan","{S3} ikinci cinayet saatinde dükkanında kamerada görünüyor.",1,0],
       ["gps","Rota","{S4} cinayet saatlerinde uzak semtlerde teslimat yapıyor.",1,0],
       ["witness","Tanık {W1}","{W1}, üç gece de olay yerlerinin yakınında benzer bir adam gördüğünü söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, eski bekçinin üçüncü gece hastanede yattığını doğruluyor.",1,0],
       ["forensic","İp Markası","Bekçinin düğüm bildiği için şüphelenildi ama o tür ip her nalburda satılıyor.",0,1],
       ["phone","Doktor","Doktorun üç kurbanı tanıması şüphe çekti ama nöbet kayıtları onu temize çıkarıyor.",0,1]] },

  { t:"Kasadaki Hayalet", e:"Büyük Banka Soygunu", d:"hard", st:"Kasa dairesi profesyonelce boşaltıldı.", nS:8, nW:2, c:2,
    sum:"Bir bankanın kasa dairesi hafta sonu boşaltıldı. Alarm dışarıdan değil, içeriden devre dışı bırakılmış; planın ayrıntısını yalnızca birkaç kişi biliyordu.",
    sol:"Soyguncu {S3}. Kasa giriş kaydı hafta sonu yalnızca onun kartının kullanıldığını, güvenlik yazılımını kapatan komutun da onun bilgisayarından girildiğini gösteriyor; hesabına şüpheli para girişi var. Diğerlerinin kart, konum ya da yetki kaydı olayla uyuşmuyor.",
    S:[["Banka müdürü","Kasa şifresini bilir ama hafta sonu yurt dışındaydı, pasaport kaydı var."],["Güvenlik şefi","Alarmı bilir; o hafta sonu hastanedeydi."],["Sistem yöneticisi","Güvenlik yazılımına tam erişimi var; hafta sonu kartı kasada okutuldu, hesabına nakit girdi."],["Veznedar","Kasaya girer ama hafta sonu erişim yetkisi kapalıydı."],["Temizlik görevlisi","Kasa katına çıkamaz."],["Eski çalışan","Kovulmuştu; ama kartı çoktan iptal edilmişti."],["Kurye","Sadece zemin kata gelir."],["Stajyer","Kasa sistemine hiç erişimi yok."]],
    E:[["gps","Kart Kaydı","Hafta sonu kasa dairesine yalnızca {S3} adlı kişinin kartı okutulmuş.",1,0],
       ["phone","Komut Logu","Güvenlik yazılımını kapatan komut {S3} adlı kişinin bilgisayarından girilmiş.",1,0],
       ["phone","Banka Hesabı","{S3} adlı kişinin hesabına soygundan sonra büyük, açıklanamayan nakit girmiş.",1,0],
       ["phone","Pasaport","{S1} hafta sonu yurt dışındaydı; giriş çıkış kaydı var.",1,0],
       ["phone","Hastane","{S2} o hafta sonu hastanede yatıyordu.",1,0],
       ["gps","Yetki","{S4} adlı kişinin hafta sonu kasa erişim yetkisi kapalıydı.",1,0],
       ["gps","Erişim","{S5} adlı kişi kasa katına çıkamıyor.",1,0],
       ["phone","İptal Kart","{S6} adlı kişinin kartı kovulduğunda iptal edilmiş; kullanılamaz.",1,0],
       ["witness","Tanık {W1}","{W1}, hafta sonu binaya giren tek kişinin sistem yöneticisi olduğunu söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, eski çalışanın o gün başka şehirde olduğunu doğruluyor.",1,0],
       ["forensic","Maske","Kasada bir maske bulundu ama üzerinde kullanışlı bir iz yok.",0,1],
       ["phone","Müdür Şüphesi","Müdür şifreyi bildiği için şüphelenildi ama yurt dışı kaydı kesin.",0,1]] },

  { t:"Sahnedeki Suikast", e:"Suikast", d:"hard", st:"Bir konuşmacı sahnede vuruldu; fail kalabalıkta.", nS:8, nW:2, c:6,
    sum:"Kalabalık bir etkinlikte konuşmacı sahnede silahla vuruldu. Atışın arka koridordan yapıldığı, failin görevli kartıyla içeri girdiği anlaşıldı.",
    sol:"Suikastçı {S7}. Sahte görevli kartı onun adına basılmış, atış açısı arka koridordaki konumuyla uyuşuyor ve elinde barut artığı bulundu; kurbanla siyasi husumeti vardı. Diğerlerinin konumu, kartı ya da el testi olayla uyuşmuyor.",
    S:[["Etkinlik organizatörü","Sahne önünde, herkesin gözü önündeydi."],["Kameraman","Çekim alanında sabit kamerada görünüyor."],["Güvenlik amiri","Atış anında ana kapıda telsizdeydi."],["Konuk gazeteci","Ön sırada oturuyordu; el testi temiz."],["Ses teknisyeni","Ses masasında, kamerada sabit."],["Garson","İkram alanında, koridora hiç girmedi."],["Husumetli aktivist","Sahte görevli kartıyla arka koridordaydı; elinde barut artığı bulundu."],["Sahne görevlisi","Atış anında sahne arkasında ışıkla ilgileniyordu, tanığı var."]],
    E:[["forensic","Barut Artığı","{S7} adlı kişinin elinde ve kolunda barut artığı bulundu.",1,0],
       ["forensic","Atış Açısı","Kurşunun geliş açısı arka koridordaki konumla, yani {S7} adlı kişinin durduğu yerle uyuşuyor.",1,0],
       ["phone","Sahte Kart","İçeri sokulan sahte görevli kartı {S7} adlı kişinin adına basılmış.",1,0],
       ["phone","Husumet","{S7} adlı kişinin kurbanla siyasi husumeti mesajlardan anlaşılıyor.",1,0],
       ["camera","Sahne Önü","{S1} atış anında sahne önünde kameraya yakalanıyor.",1,0],
       ["camera","Çekim","{S2} sabit kamera arkasında görünüyor.",1,0],
       ["phone","Telsiz","{S3} atış anında ana kapıdan telsiz konuşması yapıyor.",1,0],
       ["forensic","El Testi","{S4} adlı kişinin el testi tertemiz çıktı.",1,0],
       ["witness","Tanık {W1}","{W1}, arka koridorda görevli yeleği giymiş yabancı birini gördüğünü söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, sahne görevlisinin atış anında ışık panosunda olduğunu doğruluyor.",1,0],
       ["forensic","Kovan","Koridorda bir kovan bulundu; marka yaygın olduğu için tek başına kimseyi göstermiyor.",0,1],
       ["phone","Gazeteci","Gazetecinin husumeti olduğu konuşuldu ama el testi ve yeri onu temize çıkarıyor.",0,1]] },

  { t:"Gümrüğün Gölgesi", e:"Organize Kaçakçılık", d:"hard", st:"Yasak mallar düzenli olarak gümrükten geçiyor.", nS:8, nW:2, c:3,
    sum:"Bir gümrük noktasından yasak mallar aylardır fark edilmeden geçiyor. Tarama kayıtları kasıtlı silinmiş; içeride bir bağlantı olduğu kesin.",
    sol:"Sorumlu {S4}. Silinen tarama kayıtlarının log izi onun kullanıcısına çıkıyor, şüpheli kamyonların geçtiği vardiyalar hep onunki ve hesabına düzenli nakit giriyor. Diğerlerinin yetki, vardiya ya da konum kaydı olayla uyuşmuyor.",
    S:[["Gümrük şefi","Yetkisi geniş ama şüpheli geçişlerin hiçbirinde vardiyada değildi."],["Tarama operatörü","Cihazı kullanır ama log silme yetkisi yok."],["Bekçi","Sadece bariyerde durur; sisteme erişemez."],["Vardiya amiri","Kayıt silme yetkisi var; şüpheli geçişler hep onun vardiyasında, hesabına nakit giriyor."],["Veteriner kontrol","Sadece canlı hayvan bakar, yük taramasına karışmaz."],["Evrak memuru","Belge girer ama tarama loglarına erişemez."],["Forklift operatörü","Yükleme yapar; gece vardiyasına hiç kalmadı."],["Stajyer","Hiçbir sisteme yetkisi yok."]],
    E:[["phone","Log İzi","Silinen tarama kayıtlarının log izi {S4} adlı kişinin kullanıcısına çıkıyor.",1,0],
       ["gps","Vardiya","Şüpheli kamyonların geçtiği tüm vardiyalar {S4} adlı kişinin nöbetine denk geliyor.",1,0],
       ["phone","Banka","{S4} adlı kişinin hesabına düzenli, açıklanamayan nakit giriyor.",1,0],
       ["gps","Vardiya Dışı","{S1} şüpheli geçişlerin hiçbirinde görevde değildi.",1,0],
       ["gps","Yetki","{S2} adlı kişinin log silme yetkisi yok.",1,0],
       ["gps","Erişim","{S3} adlı kişi sisteme hiç erişemiyor.",1,0],
       ["gps","Görev","{S5} yalnızca canlı hayvan kontrolü yapıyor, yük taramasına girmiyor.",1,0],
       ["phone","Belge","{S6} adlı kişi belge girer ama tarama loglarına erişemez.",1,0],
       ["witness","Tanık {W1}","{W1}, gece şüpheli kamyonları hep aynı amirin geçirdiğini söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, forklift operatörünün gece vardiyasına hiç kalmadığını doğruluyor.",1,0],
       ["forensic","Telsiz","Sahada sahipsiz bir telsiz bulundu ama kime ait olduğu belirlenemedi.",0,1],
       ["phone","Şef Şüphesi","Şefin yetkisi geniş diye şüphelenildi ama vardiya dışı olduğu kanıtlı.",0,1]] },

  { t:"Ormandaki İz", e:"Kayıp Kişi", d:"hard", st:"Doğa yürüyüşüne çıkan biri geri dönmedi.", nS:8, nW:2, c:7,
    sum:"Sekiz kişilik bir grup doğa yürüyüşüne çıktı; biri kamp yerine dönmedi. Patikada boğuşma izleri ve sürüklenme bulundu. Kazadan çok, kasıt şüphesi var.",
    sol:"Sorumlu {S8}. Kurbanla aralarında büyük bir miras kavgası vardı; GPS onu olay saatinde patikanın o bölümünde tek başına gösteriyor, botunun izi sürüklenme izinin yanında ve ceketinde kurbanın DNA örneği çıktı. Diğerlerinin konumu ya da mazereti olayla uyuşmuyor.",
    S:[["Rehber","Grubun önündeydi; telsiz kaydı bunu doğruluyor."],["Kampçı","Kamp yerinde yemek hazırlıyordu, iki kişi şahit."],["Fotoğrafçı","Manzara noktasında, fotoğraf zaman damgaları sabit yeri gösteriyor."],["Doktor","İlk yardım çantasıyla geride ama başka bir yürüyüşçüyle birlikteydi."],["Sırt çantacı","Su almak için dereye inmişti, izleri dere yönünde."],["Yeni katılan","Grubu yeni tanıyor; kurbanı tanımıyordu bile."],["Eski dost","Husumetliydi ama olay saatinde kampta telsizle konuşuyordu."],["Mirasçı akraba","Kurbanla büyük miras kavgası var; olay saatinde patikada tek başınaydı."]],
    E:[["forensic","DNA","{S8} adlı kişinin ceketinde kurbana ait DNA örneği bulundu.",1,0],
       ["gps","Konum","{S8} adlı kişi olay saatinde patikanın o bölümünde tek başına baz veriyor.",1,0],
       ["forensic","Bot İzi","Sürüklenme izinin yanındaki bot izi {S8} adlı kişinin ayakkabısıyla uyuşuyor.",1,0],
       ["phone","Miras","{S8} ile kurban arasında büyük bir miras kavgası mesajlardan belli.",1,0],
       ["phone","Telsiz","{S1} olay saatinde grubun önünde telsiz konuşuyor.",1,0],
       ["witness","Tanık {W1}","{W1}, kampçının olay saatinde yemek başında olduğunu doğruluyor.",1,0],
       ["camera","Zaman Damgası","{S3} adlı kişinin fotoğrafları olay saatinde manzara noktasını gösteriyor.",1,0],
       ["gps","Dere","{S5} adlı kişinin izleri dere yönünde; patikadan uzaklaşmış.",1,0],
       ["phone","Yeni Katılan","{S6} grubu yeni tanıyor; kurbanla hiçbir bağı yok.",1,0],
       ["witness","Tanık {W2}","{W2}, eski dostun olay saatinde kampta telsizle konuştuğunu söylüyor.",1,0],
       ["forensic","Baston","Patikada bir baston bulundu ama kime ait olduğu belirsiz, üstünde iz yok.",0,1],
       ["phone","Eski Dost","Eski dostun husumeti yüzünden şüphelenildi ama telsiz kaydı onu temize çıkarıyor.",0,1]] },

  { t:"Sızan Tasarım", e:"Kurumsal Casusluk", d:"hard", st:"Gizli ürün tasarımı rakibe sızdırıldı.", nS:8, nW:2, c:1,
    sum:"Bir şirketin piyasaya çıkmamış gizli tasarımı rakip firmaya sızdı. Dosyaya yalnızca sınırlı sayıda kişi erişebiliyordu; kopya gece dışarı taşınmış.",
    sol:"Casus {S2}. Erişim kaydı dosyayı son indiren ve gece bir USBye kopyalayanın o olduğunu, kamera da gece ofiste tek başına olduğunu gösteriyor; rakip firmadan hesabına ödeme geçmiş. Diğerlerinin erişimi, konumu ya da kaydı olayla uyuşmuyor.",
    S:[["Proje müdürü","Erişimi var ama o gece yurt dışı uçuşundaydı."],["Kıdemli tasarımcı","Dosyayı gece USBye kopyaladı; rakipten hesabına ödeme geçti."],["BT uzmanı","Sisteme erişir ama o akşam evden hiç bağlanmadı, log yok."],["Pazarlama müdürü","Tasarım dosyasına erişim yetkisi yok."],["Asistan","Sadece takvim yönetir, dosyaya giremez."],["Stajyer tasarımcı","Erişimi kısıtlı; yalnızca taslakları görebiliyor."],["Güvenlik görevlisi","Dosya sistemine hiç erişemez."],["Muhasebeci","Mali kayıtlara bakar, tasarıma değil."]],
    E:[["phone","Erişim Kaydı","Gizli dosyayı son indiren ve gece kopyalayan kişi {S2}.",1,0],
       ["camera","Ofis Kamerası","{S2} adlı kişi gece ofiste tek başına, bilgisayar başında görülüyor.",1,0],
       ["phone","Ödeme","Rakip firmadan {S2} adlı kişinin hesabına gizli bir ödeme geçmiş.",1,0],
       ["phone","Uçuş","{S1} o gece yurt dışı uçuşunda; biniş kartı var.",1,0],
       ["phone","Bağlantı Yok","{S3} o akşam sisteme hiç bağlanmamış; log boş.",1,0],
       ["gps","Yetki","{S4} adlı kişinin tasarım dosyasına erişimi yok.",1,0],
       ["gps","Erişim","{S5} yalnızca takvim yönetiyor, dosyaya giremiyor.",1,0],
       ["gps","Kısıtlı","{S6} adlı kişi sadece taslakları görebiliyor, ana dosyayı değil.",1,0],
       ["witness","Tanık {W1}","{W1}, gece geç saatte ofiste yalnızca bir tasarımcının kaldığını söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, BT uzmanının o akşam ofise hiç gelmediğini doğruluyor.",1,0],
       ["forensic","USB","Ofiste boş bir USB kutusu bulundu ama parmak izi ortak alandan karışık çıktı.",0,1],
       ["phone","Müdür Şüphesi","Proje müdürünün erişimi olduğu için şüphelenildi ama uçuş kaydı kesin.",0,1]] },

  { t:"Fidye Notu", e:"Kaçırma ve Fidye", d:"hard", st:"Bir iş insanının çocuğu kaçırıldı, fidye istendi.", nS:8, nW:2, c:4,
    sum:"Zengin bir ailenin çocuğu kaçırıldı ve fidye istendi. Fidye notu evin içinden bilgiyle yazılmış; aileyi yakından tanıyan biri işin içinde.",
    sol:"Sorumlu {S5}. Fidye notundaki ayrıntılar yalnızca onun bildiği aile sırlarını içeriyor, kullandığı telefonun baz kaydı çocuğun tutulduğu eve gidiyor ve fidye hesabı onunla bağlantılı. Diğerlerinin konumu ya da bilgisi olayla uyuşmuyor.",
    S:[["Aile şoförü","Çocuğu okuldan o alırdı ama o gün hastanede raporluydu."],["Dadı","Evin sırlarını bilir ama kaçırma anında ailenin yanındaydı."],["Bahçıvan","Eve girer ama aile sırlarını bilmez."],["Aşçı","Mutfaktaydı, iki kişi şahit."],["Eski muhasebeci","Aile sırlarını bilir; telefonu çocuğun tutulduğu eve gidiyor, fidye hesabı onunla bağlantılı."],["Komşu","Aileyle yüzeysel tanışıklığı var."],["Özel öğretmen","Çocuğu tanır ama olay saatinde başka öğrencideydi."],["Güvenlik","Kapıdaydı; kamera onu yerinde gösteriyor."]],
    E:[["phone","Not Detayı","Fidye notundaki aile sırları yalnızca {S5} adlı kişinin bildiği bilgiler.",1,0],
       ["gps","Baz Kaydı","{S5} adlı kişinin telefonu çocuğun tutulduğu eve gidiyor.",1,0],
       ["phone","Fidye Hesabı","İstenen fidye hesabı {S5} adlı kişiyle bağlantılı.",1,0],
       ["phone","Rapor","{S1} kaçırma günü hastanede raporlu; kaydı var.",1,0],
       ["witness","Tanık {W1}","{W1}, dadının kaçırma anında ailenin yanında olduğunu doğruluyor.",1,0],
       ["gps","Bilgi","{S3} adlı kişi eve girer ama aile sırlarını bilmiyor.",1,0],
       ["witness","Mutfak","{S4} olay saatinde mutfakta; iki kişi şahit.",1,0],
       ["gps","Konum","{S7} olay saatinde başka bir öğrencisinin evinde.",1,0],
       ["camera","Kapı","{S8} adlı kişi kapıda kamerada sabit duruyor.",1,0],
       ["witness","Tanık {W2}","{W2}, eski muhasebecinin aileye kin beslediğini söylüyor.",1,0],
       ["forensic","Kağıt","Fidye notu sıradan bir kağıda yazılmış; markası ayırt edici değil.",0,1],
       ["phone","Komşu Şüphesi","Komşudan şüphelenildi ama aileyle yalnızca yüzeysel tanışıklığı olduğu anlaşıldı.",0,1]] },

  { t:"Müzedeki Boş Çerçeve", e:"Sanat Eseri Hırsızlığı", d:"hard", st:"Değerli bir tablo geceleyin çerçevesinden alındı.", nS:8, nW:2, c:0,
    sum:"Bir müzeden değerli bir tablo gece çalındı. Alarm bakım için kapatılmış, kamera döngüye alınmış; içeriden teknik bilgisi olan biri gerekli.",
    sol:"Hırsız {S1}. Kamerayı döngüye alan komut onun terminalinden girilmiş, alarmı bakım moduna alan kayıt da ona ait; aracında tabloya ait özel ambalaj bulundu. Diğerlerinin yetki, konum ya da kaydı olayla uyuşmuyor.",
    S:[["Güvenlik teknisyeni","Kamera ve alarm sistemini yönetir; gece terminalden komut girdi, aracında özel ambalaj bulundu."],["Müze müdürü","Şifreleri bilir ama o gece bir galada, kamerada görünüyor."],["Restoratör","Tabloya erişir ama gece müzede değildi, kart kaydı yok."],["Bekçi","Sadece turla dolaşır; sisteme erişemez."],["Rehber","Gündüz çalışır, gece yetkisi yok."],["Temizlikçi","Salonlara girer ama teknik sisteme erişemez."],["Kurator","Eserleri bilir ama o gece şehir dışındaydı."],["Stajyer","Hiçbir sisteme yetkisi yok."]],
    E:[["phone","Kamera Komutu","Kamerayı döngüye alan komut {S1} adlı kişinin terminalinden girilmiş.",1,0],
       ["phone","Alarm Logu","Alarmı bakım moduna alan kayıt {S1} adlı kişiye ait.",1,0],
       ["forensic","Ambalaj","{S1} adlı kişinin aracında çalınan tabloya uygun özel ambalaj malzemesi bulundu.",1,0],
       ["camera","Gala","{S2} o gece bir galada kameraya yakalanıyor.",1,0],
       ["gps","Kart","{S3} adlı kişinin gece müzeye giriş kaydı yok.",1,0],
       ["gps","Erişim","{S4} adlı kişi teknik sisteme erişemiyor.",1,0],
       ["gps","Yetki","{S5} adlı kişinin gece yetkisi yok.",1,0],
       ["gps","Sistem","{S6} adlı kişi salonlara girer ama teknik panele erişemez.",1,0],
       ["phone","Şehir Dışı","{S7} o gece şehir dışındaydı; konum kaydı var.",1,0],
       ["witness","Tanık {W1}","{W1}, gece teknik odaya giren tek kişinin güvenlik teknisyeni olduğunu söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, restoratörün o gece müzeye hiç gelmediğini doğruluyor.",1,0],
       ["forensic","Eldiven","Çerçevede eldiven izi var ama tüm personel aynı eldiveni kullandığı için ayırt edici değil.",0,1]] },

  { t:"Hayalet Hesaplar", e:"Siber Dolandırıcılık Ağı", d:"hard", st:"Sahte hesaplarla büyük çaplı dolandırıcılık yapılıyor.", nS:8, nW:2, c:6,
    sum:"Bir şirketin altyapısı kullanılarak sahte hesaplarla büyük çaplı dolandırıcılık yapıldı. İçeriden sunucuya erişen biri sahte hesapları açmış ve izleri silmeye çalışmış.",
    sol:"Sorumlu {S7}. Sunucu logları sahte hesapları açan ve iz silmeye çalışan oturumun ona ait olduğunu, VPN kaydı da onun ev IPsine çıktığını gösteriyor; kripto cüzdanı dolandırılan parayla bağlantılı. Diğerlerinin erişimi, konumu ya da kaydı olayla uyuşmuyor.",
    S:[["Yazılım takım lideri","Erişimi geniş ama olay haftası ücretli izindeydi, sisteme hiç bağlanmadı."],["Veritabanı yöneticisi","Sunucuya erişir ama oturum kayıtları temiz, anormallik yok."],["Ağ uzmanı","Sadece ağ donanımına bakar, hesap sistemine giremez."],["Destek görevlisi","Yalnızca kullanıcı şifresi sıfırlar, hesap açamaz."],["Tester","Test ortamına erişir, canlı sisteme değil."],["Sistem mimarı","Tasarımı bilir ama olay saatlerinde konferansta, kamerada."],["Kıdemli geliştirici","Sahte hesapları açan oturum ona ait; VPN ev IPsine çıkıyor, kripto cüzdanı dolandırılan parayla bağlantılı."],["Stajyer","Yalnızca okuma yetkisi var, yazma yetkisi yok."]],
    E:[["phone","Sunucu Logu","Sahte hesapları açan ve iz silen oturum {S7} adlı kişinin kullanıcısına ait.",1,0],
       ["gps","VPN Kaydı","Saldırıda kullanılan VPN bağlantısı {S7} adlı kişinin ev IPsine çıkıyor.",1,0],
       ["phone","Kripto Cüzdan","{S7} adlı kişinin kripto cüzdanı dolandırılan parayla bağlantılı.",1,0],
       ["phone","İzin","{S1} olay haftası ücretli izinde; sisteme hiç bağlanmamış.",1,0],
       ["phone","Temiz Log","{S2} adlı kişinin oturum kayıtlarında hiçbir anormallik yok.",1,0],
       ["gps","Yetki","{S3} adlı kişi hesap sistemine giremiyor, yalnızca ağ donanımına bakıyor.",1,0],
       ["gps","Erişim","{S4} yalnızca şifre sıfırlar, hesap açamaz.",1,0],
       ["gps","Ortam","{S5} adlı kişi yalnızca test ortamına erişir, canlı sisteme değil.",1,0],
       ["camera","Konferans","{S6} olay saatlerinde bir konferansta, kamerada görünüyor.",1,0],
       ["witness","Tanık {W1}","{W1}, geç saatlerde sisteme bağlı kalan tek kişinin kıdemli geliştirici olduğunu söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, takım liderinin o hafta hiç ofise gelmediğini doğruluyor.",1,0],
       ["forensic","Cihaz","Ortak bir dizüstü bilgisayarda izler var ama herkes kullandığı için ayırt edici değil.",0,1]] },

  { t:"Köprü Altındaki İnfaz", e:"Mafya İnfazı", d:"hard", st:"Bir tetikçi köprü altında infaz edildi.", nS:8, nW:2, c:3,
    sum:"Bir suç örgütünün adamı köprü altında infaz edildi. Olay profesyonelce işlenmiş; örgüt içinden bir hesaplaşma olduğu düşünülüyor. Failin kurbanla geçmiş husumeti olan biri olduğu kesin.",
    sol:"Tetikçi {S4}. Kurbanla aralarında eski bir kan davası vardı; balistik silahın daha önce ona bağlanan bir olayla aynı olduğunu, GPS onu olay saatinde köprü altında gösteriyor ve elinde barut artığı bulundu. Diğerlerinin konumu ya da mazereti olayla uyuşmuyor.",
    S:[["Örgüt muhasebecisi","Para işlerine bakar; olay saatinde kumarhanede kamerada."],["Şoför","Araç kullanır ama o gece başka şehirde teslimattaydı."],["Koruma","Patronun yanındaydı; iki kişi şahit."],["Husumetli tetikçi","Kurbanla eski kan davası var; olay saatinde köprü altında, elinde barut artığı bulundu."],["Bar işletmecisi","Barı açıktı, kamerada görünüyor."],["Haberci","Mesaj taşır ama silah kullanmaz, olay saatinde uzaktaydı."],["Eski ortak","Husumetliydi ama o gece hastanede yatıyordu."],["Tefeci","Borç toplar; olay saatinde başka semtte tanıkla birlikte."]],
    E:[["forensic","Balistik","İnfazda kullanılan silah, daha önce {S4} adlı kişiye bağlanan bir olayla aynı.",1,0],
       ["gps","Konum","{S4} adlı kişi olay saatinde köprü altı bölgesinde baz veriyor.",1,0],
       ["forensic","Barut Artığı","{S4} adlı kişinin elinde barut artığı bulundu.",1,0],
       ["phone","Kan Davası","{S4} ile kurban arasında eski bir kan davası olduğu biliniyor.",1,0],
       ["camera","Kumarhane","{S1} olay saatinde kumarhanede kameraya yakalanıyor.",1,0],
       ["gps","Teslimat","{S2} o gece başka şehirde teslimatta; konum kaydı var.",1,0],
       ["witness","Koruma","{S3} olay saatinde patronun yanında; iki kişi şahit.",1,0],
       ["gps","Uzak","{S6} olay saatinde olay yerinden uzakta baz veriyor.",1,0],
       ["phone","Hastane","{S7} o gece hastanede yatıyordu.",1,0],
       ["witness","Tanık {W1}","{W1}, köprü altından silah sesi gelmeden önce oradan ayrılan tek bir adam gördüğünü söylüyor.",1,0],
       ["witness","Tanık {W2}","{W2}, tefecinin olay saatinde başka semtte olduğunu doğruluyor.",1,0],
       ["forensic","İzmarit","Olay yerinde izmarit bulundu ama DNA karışık çıktı, tek kişiyi göstermiyor.",0,1]] }
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
  if (ver === 'chars30') return;
  var r = await _runDetectiveSeed();
  if (r.ok) { await setConfig('detective_seed_v', 'chars30'); console.log('Dedektif: ' + r.count + ' vaka seed edildi (havuz: ' + r.poolSize + ' karakter).'); }
  else console.warn('Dedektif: havuzda yeterli karakter yok (' + r.poolSize + '/' + r.min + '), seed atlandı.');
}
// Admin tetikler: vakaları mevcut havuzla baştan oluşturur (ilerleme sıfırlanır)
async function regenerateDetectiveCases() {
  var r = await _runDetectiveSeed();
  if (r.ok) await setConfig('detective_seed_v', 'chars30');
  return r;
}

async function getDetectiveNextCase(userId, difficulty) {
  var cr = await query("SELECT id FROM detective_cases WHERE active=true AND difficulty=$1 ORDER BY id", [difficulty]);
  var ids = cr.rows.map(function (r) { return r.id; });
  if (!ids.length) return null;
  var chosen, allDone = false;
  if (userId) {
    var doneR = await query("SELECT DISTINCT case_id FROM detective_guesses WHERE user_id=$1 AND (correct=true OR attempt_no>=3)", [userId]);
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
