// ===== SUBWAY SURFER - Shared Auth / Data Helpers =====
// Used by both account-server.js (HTTP) and pvp-server.js (WebSocket)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── File I/O ────────────────────────────────────────────────────────────────

function readDB(file) {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeDB(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readDB(USERS_FILE);
}

function saveUsers(users) {
  writeDB(USERS_FILE, users);
}

// ─── Token validation ────────────────────────────────────────────────────────

/**
 * Validate a Bearer token from HTTP headers (existing account-server usage).
 * Returns the user's email (key) if valid, or null.
 * @param {object} headers - req.headers from HTTP server
 * @returns {string|null} email
 */
function getAuthUser(headers) {
  const auth = headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  const users = getUsers();
  for (const email in users) {
    if (users[email].sessionToken === token && users[email].sessionExpires > Date.now()) {
      return email;
    }
  }
  return null;
}

/**
 * Validate a raw token string (for WebSocket PVP).
 * Returns the full user record + email, or null.
 * @param {string} token
 * @returns {{email:string, username:string, verified:boolean, ...}|null}
 */
function validateToken(token) {
  if (!token) return null;
  const users = getUsers();
  for (const email in users) {
    const user = users[email];
    if (user.sessionToken === token && user.sessionExpires > Date.now()) {
      return { ...user, email };
    }
  }
  return null;
}

// ─── Default game data ───────────────────────────────────────────────────────

function defaultGameData() {
  return {
    coins: 0,
    credits: 0,
    equippedAbility: 0,
    ownedAbilities: [0],
    maxDistance: 0,
    maxEasy: 0,
    maxMedium: 0,
    maxHard: 0,
    maxEasyAbility: 0,
    maxMediumAbility: 0,
    maxHardAbility: 0,
    runCount: 0,
    highScore: 0,
    totalCoins: 0,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  DATA_DIR,
  USERS_FILE,
  readDB,
  writeDB,
  getUsers,
  saveUsers,
  getAuthUser,
  validateToken,
  defaultGameData,
};
