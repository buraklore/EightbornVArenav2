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
  getStreamerLink: getStreamerLink, saveStreamerLink: saveStreamerLink
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
