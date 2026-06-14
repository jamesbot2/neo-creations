// ===== SUBWAY SURFER - PVP Server v4 (Phase 2) =====
// WebSocket-based PVP match server, authenticated via existing account tokens
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { validateToken } = require('./auth.js');

const PORT = parseInt(process.env.PVP_PORT, 10) || 3001;
const MAX_PLAYERS = 3;
const ROOM_IDLE_TIMEOUT = 1000 * 60 * 30;   // 30 min
const SNAPSHOT_INTERVAL = 50;                // 50 ms = 20 Hz
const MAX_DISTANCE_PER_TICK = 50;            // anti-cheat: max distance increase per snapshot
const LANES = [0, 1, 2];
const START_OFFSETS = [0, -4, -8];

// ─── State ───────────────────────────────────────────────────────────────────

/** Map<userId (email), { userId, username, emailVerified, joinedAt }> */
const onlineUsers = new Map();

/** Map<WebSocket, userId (email)> */
const clients = new Map();

/**
 * Map<roomId, Room>
 * @typedef {Object} Room
 * @property {string} roomId
 * @property {string} roomName
 * @property {string} hostId            - email
 * @property {Map<string, Player>} players
 * @property {number} maxPlayers
 * @property {boolean} started
 * @property {boolean} ended
 * @property {string|null} seed
 * @property {number} createdAt
 *
 * @typedef {Object} Player
 * @property {string} userId
 * @property {string} username
 * @property {WebSocket} ws
 * @property {boolean} ready
 * @property {number} lane              - assigned on matchStart
 * @property {number} startOffset
 * @property {string} characterId
 * @property {object|null} snapshot     - latest received snapshot
 * @property {number} snapshotTime
 * @property {boolean} dead             - true once alive=false received
 */
const rooms = new Map();

/** Map<roomId, interval> - snapshot broadcast timers */
const snapshotTimers = new Map();

let nextRoomId = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function send(ws, data) {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastRoom(room, data, excludeWs) {
  const msg = JSON.stringify(data);
  for (const [, player] of room.players) {
    if (player.ws !== excludeWs && player.ws.readyState === 1) {
      player.ws.send(msg);
    }
  }
}

function makeRoomId() {
  return 'room_' + (nextRoomId++);
}

function makeRoomSnapshot(room) {
  const players = [];
  for (const [, p] of room.players) {
    players.push({ userId: p.userId, username: p.username, ready: p.ready });
  }
  return {
    roomId: room.roomId,
    roomName: room.roomName,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    started: room.started,
    ended: room.ended,
  };
}

function broadcastRoomUpdate(room) {
  broadcastRoom(room, { type: 'roomUpdate', room: makeRoomSnapshot(room) });
}

function listRooms() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.started || room.ended) continue;
    list.push({
      roomId: room.roomId,
      roomName: room.roomName,
      hostId: room.hostId,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      started: room.started,
    });
  }
  return list;
}

/** Get userId for a ws, or send error + return null */
function requireAuth(ws) {
  const userId = clients.get(ws);
  if (!userId) {
    send(ws, { type: 'error', error: 'not authenticated' });
    return null;
  }
  return userId;
}

/** Shuffle array in-place (Fisher-Yates) */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Check if all players in a started room are dead */
function allPlayersDead(room) {
  for (const [, p] of room.players) {
    if (!p.dead) return false;
  }
  return true;
}

// ─── Match End ───────────────────────────────────────────────────────────────

function endMatch(room) {
  if (room.ended) return;
  room.ended = true;

  stopSnapshotBroadcast(room.roomId);

  // Build ranking sorted by distance descending
  const ranking = [...room.players.values()]
    .map(p => ({
      userId: p.userId,
      username: p.username,
      distance: p.snapshot ? Math.floor(p.snapshot.distance) : 0,
      lane: p.lane,
      startOffset: p.startOffset,
    }))
    .sort((a, b) => b.distance - a.distance);

  // Assign rank positions
  ranking.forEach((p, i) => { p.rank = i + 1; });

  broadcastRoom(room, {
    type: 'matchEnd',
    roomId: room.roomId,
    ranking,
  });
}

// ─── Snapshot Broadcast System ──────────────────────────────────────────────

function startSnapshotBroadcast(room) {
  if (snapshotTimers.has(room.roomId)) return;

  const timer = setInterval(() => {
    const r = rooms.get(room.roomId);
    if (!r || !r.started || r.ended) {
      clearInterval(timer);
      snapshotTimers.delete(room.roomId);
      return;
    }

    // Build per-player snapshot batches (exclude self)
    for (const [, player] of r.players) {
      if (player.ws.readyState !== 1) continue;

      const others = [];
      for (const [, other] of r.players) {
        if (other.userId === player.userId) continue;
        if (!other.snapshot) continue;
        others.push({
          userId: other.userId,
          username: other.username,
          snapshot: other.snapshot,
        });
      }

      if (others.length === 0) continue;
      send(player.ws, {
        type: 'snapshotBatch',
        roomId: r.roomId,
        players: others,
      });
    }
  }, SNAPSHOT_INTERVAL);

  snapshotTimers.set(room.roomId, timer);
}

function stopSnapshotBroadcast(roomId) {
  const timer = snapshotTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    snapshotTimers.delete(roomId);
  }
}

// ─── Room lifecycle helpers ──────────────────────────────────────────────────

function removeUserFromRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.delete(userId);

  if (room.players.size === 0) {
    stopSnapshotBroadcast(roomId);
    rooms.delete(roomId);
    return;
  }

  if (room.started && !room.ended && room.players.size < 2) {
    stopSnapshotBroadcast(roomId);
  }

  if (room.hostId === userId) {
    const first = room.players.values().next().value;
    if (first) {
      room.hostId = first.userId;
    }
  }

  broadcastRoomUpdate(room);
}

function cleanupUser(userId) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(userId)) {
      removeUserFromRoom(roomId, userId);
      return;
    }
  }
}

function findRoomByUser(userId) {
  for (const room of rooms.values()) {
    if (room.players.has(userId)) return room;
  }
  return null;
}

function sendRoomSnapshot(ws, room) {
  send(ws, { type: 'roomUpdate', room: makeRoomSnapshot(room) });
}

// Clean up stale empty rooms
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_IDLE_TIMEOUT && room.players.size === 0) {
      stopSnapshotBroadcast(id);
      rooms.delete(id);
    }
  }
}, 60_000);

// ─── Message handlers ────────────────────────────────────────────────────────

const handlers = {};

handlers.hello = (ws, msg) => {
  const { token } = msg;
  if (!token) {
    send(ws, { type: 'error', error: 'token required' });
    ws.close(4001, 'no token');
    return;
  }

  const user = validateToken(token);
  if (!user) {
    send(ws, { type: 'error', error: 'invalid token' });
    ws.close(4001, 'invalid token');
    return;
  }

  const userId = user.email;
  const username = user.username || userId.split('@')[0];
  const emailVerified = !!user.verified;

  const oldWs = [...clients.entries()].find(([, uid]) => uid === userId)?.[0];
  if (oldWs && oldWs !== ws) {
    send(oldWs, { type: 'error', error: 'kicked: duplicate login' });
    oldWs.close(4001, 'duplicate login');
  }

  clients.set(ws, userId);
  onlineUsers.set(userId, { userId, username, emailVerified, joinedAt: Date.now() });

  send(ws, { type: 'helloOk', userId, username, emailVerified });
};

handlers.listRooms = (ws) => {
  if (!requireAuth(ws)) return;
  send(ws, { type: 'roomList', rooms: listRooms() });
};

handlers.createRoom = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const roomName = (msg.roomName || '').trim();
  if (!roomName) {
    send(ws, { type: 'error', error: 'roomName required' });
    return;
  }
  if (roomName.length > 32) {
    send(ws, { type: 'error', error: 'roomName too long (max 32)' });
    return;
  }

  if (findRoomByUser(userId)) {
    send(ws, { type: 'error', error: 'already in a room' });
    return;
  }

  const userInfo = onlineUsers.get(userId);
  const username = userInfo ? userInfo.username : userId.split('@')[0];

  const roomId = makeRoomId();
  const room = {
    roomId,
    roomName,
    hostId: userId,
    players: new Map(),
    maxPlayers: MAX_PLAYERS,
    started: false,
    ended: false,
    seed: null,
    createdAt: Date.now(),
  };

  room.players.set(userId, {
    userId, username, ws, ready: false,
    lane: -1, startOffset: 0, characterId: 'runner',
    snapshot: null, snapshotTime: 0, dead: false,
  });
  rooms.set(roomId, room);

  sendRoomSnapshot(ws, room);
};

handlers.joinRoom = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId } = msg;
  if (!roomId) {
    send(ws, { type: 'error', error: 'roomId required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  if (room.started) {
    send(ws, { type: 'error', error: 'game already started' });
    return;
  }

  if (room.players.has(userId)) {
    send(ws, { type: 'error', error: 'already in this room' });
    return;
  }

  if (room.players.size >= room.maxPlayers) {
    send(ws, { type: 'error', error: 'room is full' });
    return;
  }

  const existingRoom = findRoomByUser(userId);
  if (existingRoom) {
    removeUserFromRoom(existingRoom.roomId, userId);
  }

  const userInfo = onlineUsers.get(userId);
  const username = userInfo ? userInfo.username : userId.split('@')[0];
  room.players.set(userId, {
    userId, username, ws, ready: false,
    lane: -1, startOffset: 0, characterId: 'runner',
    snapshot: null, snapshotTime: 0, dead: false,
  });

  sendRoomSnapshot(ws, room);
  broadcastRoomUpdate(room);
};

handlers.leaveRoom = (ws) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const room = findRoomByUser(userId);
  if (!room) {
    send(ws, { type: 'error', error: 'not in a room' });
    return;
  }

  removeUserFromRoom(room.roomId, userId);
};

handlers.invite = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId, toUserId } = msg;
  if (!roomId || !toUserId) {
    send(ws, { type: 'error', error: 'roomId and toUserId required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  if (room.hostId !== userId) {
    send(ws, { type: 'error', error: 'only host can invite' });
    return;
  }

  const targetUser = onlineUsers.get(toUserId);
  if (!targetUser) {
    send(ws, { type: 'error', error: 'user not online' });
    return;
  }

  if (room.players.has(toUserId)) {
    send(ws, { type: 'error', error: 'user already in room' });
    return;
  }

  if (room.players.size >= room.maxPlayers) {
    send(ws, { type: 'error', error: 'room is full' });
    return;
  }

  let targetWs = null;
  for (const [ws_, uid] of clients) {
    if (uid === toUserId) { targetWs = ws_; break; }
  }
  if (!targetWs) {
    send(ws, { type: 'error', error: 'user connection not found' });
    return;
  }

  const userInfo = onlineUsers.get(userId);
  const username = userInfo ? userInfo.username : userId.split('@')[0];

  send(targetWs, { type: 'invite', roomId, fromUserId: userId, fromUsername: username });
  send(ws, { type: 'inviteSent', roomId, toUserId });
};

handlers.inviteResponse = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId, accept } = msg;
  if (!roomId || accept === undefined || accept === null) {
    send(ws, { type: 'error', error: 'roomId and accept required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  if (accept === true) {
    if (room.started) {
      send(ws, { type: 'error', error: 'game already started' });
      return;
    }
    if (room.players.size >= room.maxPlayers) {
      send(ws, { type: 'error', error: 'room is full' });
      return;
    }
    if (room.players.has(userId)) {
      send(ws, { type: 'error', error: 'already in this room' });
      return;
    }

    const existingRoom = findRoomByUser(userId);
    if (existingRoom) {
      removeUserFromRoom(existingRoom.roomId, userId);
    }

    const userInfo = onlineUsers.get(userId);
    const username = userInfo ? userInfo.username : userId.split('@')[0];
    room.players.set(userId, {
      userId, username, ws, ready: false,
      lane: -1, startOffset: 0, characterId: 'runner',
      snapshot: null, snapshotTime: 0, dead: false,
    });

    sendRoomSnapshot(ws, room);
    broadcastRoomUpdate(room);
  }

  const hostWs = room.players.get(room.hostId)?.ws;
  if (hostWs) {
    send(hostWs, { type: 'inviteResponse', roomId, userId, accept: !!accept });
  }
};

handlers.ready = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId, ready } = msg;
  if (!roomId || ready === undefined || ready === null) {
    send(ws, { type: 'error', error: 'roomId and ready required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  const player = room.players.get(userId);
  if (!player) {
    send(ws, { type: 'error', error: 'not in this room' });
    return;
  }

  player.ready = !!ready;
  broadcastRoomUpdate(room);
};

// ─── Match Start ─────────────────────────────────────────────────────────────

handlers.start = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId } = msg;
  if (!roomId) {
    send(ws, { type: 'error', error: 'roomId required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  if (room.hostId !== userId) {
    send(ws, { type: 'error', error: 'only host can start' });
    return;
  }
  if (room.started) {
    send(ws, { type: 'error', error: 'game already started' });
    return;
  }
  if (room.players.size < 2) {
    send(ws, { type: 'error', error: 'need at least 2 players' });
    return;
  }

  let allReady = true;
  for (const [, p] of room.players) {
    if (!p.ready) { allReady = false; break; }
  }
  if (!allReady) {
    send(ws, { type: 'error', error: 'not all players ready' });
    return;
  }

  const seed = crypto.randomBytes(16).toString('hex');
  room.seed = seed;
  room.started = true;
  room.ended = false;

  const lanePool = shuffle([...LANES]);
  const offsetPool = shuffle([...START_OFFSETS]);
  const playerList = [...room.players.values()];
  const matchPlayers = [];

  for (let i = 0; i < playerList.length; i++) {
    const p = playerList[i];
    p.lane = lanePool[i % lanePool.length];
    p.startOffset = offsetPool[i % offsetPool.length];
    p.snapshot = null;
    p.snapshotTime = 0;
    p.dead = false;
    matchPlayers.push({
      userId: p.userId,
      username: p.username,
      lane: p.lane,
      startOffset: p.startOffset,
      characterId: p.characterId || 'runner',
    });
  }

  broadcastRoom(room, {
    type: 'matchStart',
    roomId,
    seed,
    players: matchPlayers,
  });

  startSnapshotBroadcast(room);
};

// ─── Snapshot ────────────────────────────────────────────────────────────────

handlers.snapshot = (ws, msg) => {
  const userId = requireAuth(ws);
  if (!userId) return;

  const { roomId, snapshot } = msg;
  if (!roomId || !snapshot) {
    send(ws, { type: 'error', error: 'roomId and snapshot required' });
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', error: 'room not found' });
    return;
  }

  if (!room.started) {
    send(ws, { type: 'error', error: 'game not started' });
    return;
  }

  if (room.ended) {
    send(ws, { type: 'error', error: 'game already ended' });
    return;
  }

  const player = room.players.get(userId);
  if (!player) {
    send(ws, { type: 'error', error: 'not in this room' });
    return;
  }

  // ── Anti-cheat ────────────────────────────────────────────────────────────

  const { lane, distance, isJumping, isRolling, alive, spectating, characterId, timestamp } = snapshot;

  if (typeof lane !== 'number' || ![0, 1, 2].includes(lane)) {
    send(ws, { type: 'error', error: 'invalid lane' });
    return;
  }

  if (typeof distance !== 'number' || distance < 0 || !Number.isFinite(distance)) {
    send(ws, { type: 'error', error: 'invalid distance' });
    return;
  }

  const prevDistance = player.snapshot ? player.snapshot.distance : 0;

  if (player.snapshot && player.snapshot.alive) {
    if (distance < prevDistance) {
      send(ws, { type: 'error', error: 'distance cannot decrease' });
      return;
    }
    if (distance - prevDistance > MAX_DISTANCE_PER_TICK) {
      send(ws, { type: 'error', error: 'distance increase too large' });
      return;
    }
  }

  // ── Store snapshot ────────────────────────────────────────────────────────

  const wasAlive = !player.dead;
  const nowDead = alive === false;

  player.snapshot = {
    lane,
    distance: Math.floor(distance),
    isJumping: !!isJumping,
    isRolling: !!isRolling,
    alive: alive !== false,
    spectating: !!spectating,
    characterId: characterId || 'runner',
    timestamp: timestamp || Date.now(),
  };
  player.snapshotTime = Date.now();

  // Track death
  if (nowDead && wasAlive) {
    player.dead = true;

    // Check if all players are dead → end match
    if (allPlayersDead(room)) {
      endMatch(room);
    }
  }
};

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({
    service: 'subway-surfer-pvp',
    status: 'running',
    onlineUsers: onlineUsers.size,
    activeRooms: rooms.size,
    rooms: listRooms(),
  }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', error: 'invalid JSON' });
      return;
    }

    const type = msg.type;
    if (!type) {
      send(ws, { type: 'error', error: 'missing type field' });
      return;
    }

    const handler = handlers[type];
    if (!handler) {
      send(ws, { type: 'error', error: `unknown message type: ${type}` });
      return;
    }

    handler(ws, msg);
  });

  ws.on('close', () => {
    const userId = clients.get(ws);
    if (userId) {
      cleanupUser(userId);
      onlineUsers.delete(userId);
      clients.delete(ws);
    }
  });

  ws.on('error', () => {});
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PVP] WebSocket server listening on port ${PORT}`);
  console.log(`[PVP] HTTP status: http://0.0.0.0:${PORT}/`);
});
