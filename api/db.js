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
  await query("CREATE TABLE IF NOT EXISTS stock_wallets (user_id INTEGER PRIMARY KEY REFERENCES users(id), cash NUMERIC(14,2) DEFAULT 1000, last_grant DATE, week_start_value NUMERIC(14,2), week_start DATE)");
  await query("CREATE TABLE IF NOT EXISTS stock_holdings (user_id INTEGER NOT NULL REFERENCES users(id), char_id VARCHAR(20) NOT NULL, shares INTEGER DEFAULT 0, avg_cost NUMERIC(12,2) DEFAULT 0, PRIMARY KEY (user_id, char_id))");
  await query("CREATE TABLE IF NOT EXISTS stock_tx (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), char_id VARCHAR(20), side VARCHAR(4), shares INTEGER, price NUMERIC(12,2), created_at TIMESTAMP DEFAULT NOW())");

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
  // Karakter Borsası
  ensureWallet: ensureWallet, getStockMarket: getStockMarket, getStockPortfolio: getStockPortfolio,
  tradeStock: tradeStock, noteStockSelections: noteStockSelections, getStockLeaderboard: getStockLeaderboard,
  ensureStockCycle: ensureStockCycle, getStockCycleInfo: getStockCycleInfo,
  adminSetStockPrice: adminSetStockPrice, adminSetUserCash: adminSetUserCash, getAdminStockWallets: getAdminStockWallets
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
  // Bu kritere ait, bu karakterleri içeren mevcut oyları çek
  var existing = await query(
    "SELECT char_a, char_b, a_over_b, b_over_a FROM rank_votes WHERE criterion_id = $1 AND char_a = ANY($2) AND char_b = ANY($2)",
    [criterionId, ids]
  );
  var votesMap = {};
  existing.rows.forEach(function(row){ votesMap[row.char_a + '|' + row.char_b] = row; });

  var winTally = {};
  ids.forEach(function(id){ winTally[id] = 0; });

  var concordant = 0, dataPairs = 0;
  pairs.forEach(function(p){
    var row = votesMap[p.lo + '|' + p.hi];
    var aOverB = row ? parseInt(row.a_over_b) : 0; // lo, hi'nin üstünde
    var bOverA = row ? parseInt(row.b_over_a) : 0; // hi, lo'nun üstünde
    var total = aOverB + bOverA;
    var userSaysLoOverHi = (p.x === p.lo);
    if (total > 0) {
      dataPairs++;
      var commLoOverHi = aOverB >= bOverA; // eşitlikte lo
      if (userSaysLoOverHi === commLoOverHi) concordant++;
      var pLo = aOverB / total;
      winTally[p.lo] += pLo;
      winTally[p.hi] += (1 - pLo);
    } else {
      winTally[p.lo] += 0.5;
      winTally[p.hi] += 0.5;
    }
  });

  var agreement = dataPairs > 0 ? Math.round((concordant / dataPairs) * 100) : null;

  // Oyları kaydet (UPSERT)
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

  // Topluluk uzlaşı sıralaması (kazanma payına göre azalan)
  var consensus = ids.slice().sort(function(a, b){
    var d = winTally[b] - winTally[a];
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
