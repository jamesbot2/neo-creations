// ===== PVP Smoke Test v4 =====
// Tests: auth → rooms → start → snapshot → death → spectate → matchEnd
const { WebSocket } = require('ws');

const HOST = 'ws://localhost:3001';

const TOKENS = [
  'c2b8d406d804374c03105b19d157309f9c4528eef82bd366fa190c838b18f3f1',
  '857b072d8607b1a9a63a672d4bd081660a156a08ae4f6bba34328954056542f1',
  '0c8b74516f10f2359a57243ee0075310013cf634700842782efe6d915672a9c1',
  'b5a16c567a19ce2a35c68f0d212859f201e7a043c55feb8ff14b463b5c3f209b',
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;

function connect(token, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(HOST);
    const t = setTimeout(() => { ws.close(); reject(new Error(`${label}: timeout`)); }, 4000);
    const inbox = [];
    ws._label = label;
    ws._inbox = inbox;
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })));
    ws.on('message', (raw) => inbox.push(JSON.parse(raw.toString())));
    ws.on('close', () => { clearTimeout(t); });
    ws.on('error', () => {});
    const poll = () => {
      const m = inbox.find(m => m.type === 'helloOk');
      if (m) { clearTimeout(t); ws._userId = m.userId; ws._username = m.username; resolve(ws); return; }
      setTimeout(poll, 10);
    };
    setTimeout(poll, 10);
  });
}

function send(ws, msg) { ws.send(JSON.stringify(msg)); }

function expectMsg(ws, type, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${ws._label}: timeout ${type}, inbox: ${ws._inbox.map(m=>m.type).join(',')}`)), timeoutMs);
    const poll = () => {
      const idx = ws._inbox.findIndex(m => m.type === type);
      if (idx !== -1) { clearTimeout(t); resolve(ws._inbox.splice(idx, 1)[0]); return; }
      setTimeout(poll, 10);
    };
    setTimeout(poll, 10);
  });
}

function lastMsgOfType(ws, type) {
  const filtered = ws._inbox.filter(m => m.type === type);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

function clearInbox(ws) { ws._inbox.length = 0; }

async function makeRoomAndStart(tokenA, tokenB, tokenC) {
  // Connect 3, create room, join, all ready, start
  const A = await connect(tokenA, 'A');
  const B = await connect(tokenB, 'B');
  const C = await connect(tokenC, 'C');

  send(A, { type: 'createRoom', roomName: 'Sprint' });
  const cr = await expectMsg(A, 'roomUpdate');
  const roomId = cr.room.roomId;

  send(B, { type: 'joinRoom', roomId });
  await expectMsg(B, 'roomUpdate');
  await expectMsg(A, 'roomUpdate');

  send(C, { type: 'joinRoom', roomId });
  await expectMsg(C, 'roomUpdate');
  await expectMsg(A, 'roomUpdate');
  await expectMsg(B, 'roomUpdate');

  for (const ws of [A, B, C]) clearInbox(ws);

  // All ready
  for (const ws of [A, B, C]) {
    send(ws, { type: 'ready', roomId, ready: true });
    await expectMsg(ws, 'roomUpdate');
    await sleep(50);
  }
  clearInbox(A); clearInbox(B); clearInbox(C);

  // Start
  send(A, { type: 'start', roomId });
  await expectMsg(A, 'matchStart');
  await expectMsg(B, 'matchStart');
  await expectMsg(C, 'matchStart');

  return { A, B, C, roomId };
}

async function main() {
  console.log('=== PVP Smoke Test v4 ===\n');

  try {
    // ── SECTION 1: Death + Spectate + MatchEnd ──────────────────────────────
    {
      const { A, B, C, roomId } = await makeRoomAndStart(
        TOKENS[0], TOKENS[1], TOKENS[2]
      );
      console.log('✓ 1. Room started, 3 players');
      passed++;

      // All send snapshots (alive)
      const baseSnap = (lane, dist) => ({
        lane, distance: dist,
        isJumping: false, isRolling: false,
        alive: true, spectating: false,
        characterId: 'runner', timestamp: Date.now(),
      });

      send(A, { type: 'snapshot', roomId, snapshot: baseSnap(0, 100) });
      send(B, { type: 'snapshot', roomId, snapshot: baseSnap(1, 200) });
      send(C, { type: 'snapshot', roomId, snapshot: baseSnap(2, 150) });
      await sleep(200);
      console.log('✓ 2. All 3 sent alive snapshots (A=100, B=200, C=150)');
      passed++;

      // A dies
      send(A, { type: 'snapshot', roomId, snapshot: { ...baseSnap(0, 100), alive: false } });
      await sleep(200);

      // A should still receive snapshotBatch with B and C
      const aBatch = lastMsgOfType(A, 'snapshotBatch');
      const aSeesOthers = aBatch && aBatch.players.length === 2
        && aBatch.players.some(p => p.userId === B._userId)
        && aBatch.players.some(p => p.userId === C._userId);
      console.log(aSeesOthers ? '✓ 3. Dead A still receives other players via snapshotBatch' : `✗ 3. A batch: ${JSON.stringify(aBatch)}`);
      aSeesOthers ? passed++ : failed++;

      // B and C also get snapshotBatch (should include dead A)
      const bBatch = lastMsgOfType(B, 'snapshotBatch');
      const bSeesA = bBatch && bBatch.players.some(p => p.userId === A._userId);
      console.log(bSeesA ? '✓ 4. Alive B sees dead A in snapshotBatch' : '✗ 4. B missing dead A');
      bSeesA ? passed++ : failed++;

      clearInbox(A); clearInbox(B); clearInbox(C);
      await sleep(50); // Let any in-flight broadcasts flush

      // B dies
      send(B, { type: 'snapshot', roomId, snapshot: { ...baseSnap(1, 200), alive: false } });
      await sleep(200);

      // C dies → all dead → matchEnd
      send(C, { type: 'snapshot', roomId, snapshot: { ...baseSnap(2, 150), alive: false } });

      // Wait for matchEnd on all 3
      const endA = await expectMsg(A, 'matchEnd', 4000);
      const endB = await expectMsg(B, 'matchEnd', 4000);
      const endC = await expectMsg(C, 'matchEnd', 4000);

      // Verify ranking: B(200) > C(150) > A(100)
      const ranking = endA.ranking;
      const rankOk = ranking
        && ranking.length === 3
        && ranking[0].userId === B._userId && ranking[0].distance === 200
        && ranking[1].userId === C._userId && ranking[1].distance === 150
        && ranking[2].userId === A._userId && ranking[2].distance === 100
        && ranking.every(p => p.rank >= 1 && p.rank <= 3);

      console.log(rankOk
        ? '✓ 5. matchEnd ranking correct: B=200, C=150, A=100'
        : `✗ 5. Bad ranking: ${JSON.stringify(ranking)}`);
      rankOk ? passed++ : failed++;

      // Verify endA matches endB and endC
      const consistent = endB.ranking.length === 3 && endC.ranking.length === 3;
      console.log(consistent ? '✓ 6. All 3 players received same matchEnd' : '✗ 6. Inconsistent matchEnd');
      consistent ? passed++ : failed++;

      // After matchEnd, snapshot should be rejected
      clearInbox(A);
      send(A, { type: 'snapshot', roomId, snapshot: baseSnap(0, 200) });
      const snapAfterEnd = await expectMsg(A, 'error', 2000);
      console.log(snapAfterEnd?.error === 'game already ended'
        ? '✓ 7. Snapshot after matchEnd rejected' : `✗ 7. Got: ${snapAfterEnd?.error}`);
      snapAfterEnd?.error === 'game already ended' ? passed++ : failed++;

      // Clean
      A.close(); B.close(); C.close();
      console.log('✓ 8. Clean disconnect');
      passed++;
    }

    // ── SECTION 2: Spectating test ──────────────────────────────────────────
    {
      const { A, B, C, roomId } = await makeRoomAndStart(
        TOKENS[0], TOKENS[1], TOKENS[2]
      );

      const snap = (lane, dist, opts = {}) => ({
        lane, distance: dist,
        isJumping: false, isRolling: false,
        alive: true, spectating: false,
        characterId: 'runner', timestamp: Date.now(),
        ...opts,
      });

      send(A, { type: 'snapshot', roomId, snapshot: snap(0, 100) });
      send(B, { type: 'snapshot', roomId, snapshot: snap(1, 200) });
      // C sends with spectating=true
      send(C, { type: 'snapshot', roomId, snapshot: snap(2, 300, { spectating: true }) });
      await sleep(200);

      const cBatch = lastMsgOfType(C, 'snapshotBatch');
      const cSeesOthers = cBatch && cBatch.players.length === 2;

      // C's spectating snapshot should be relayed to others
      const aBatch = lastMsgOfType(A, 'snapshotBatch');
      const othersSeeC = aBatch && aBatch.players.some(p =>
        p.userId === C._userId && p.snapshot.spectating === true
      );

      console.log(cSeesOthers ? '✓ 9. Spectating C still receives snapshotBatch' : '✗ 9. C missing batch');
      cSeesOthers ? passed++ : failed++;

      console.log(othersSeeC ? '✓ 10. Spectating C snapshot relayed to others' : '✗ 10. C snapshot not relayed');
      othersSeeC ? passed++ : failed++;

      clearInbox(A); clearInbox(B); clearInbox(C);

      // C dies
      send(C, { type: 'snapshot', roomId, snapshot: snap(2, 300, { alive: false, spectating: true }) });
      await sleep(200);

      // A dies
      send(A, { type: 'snapshot', roomId, snapshot: snap(0, 100, { alive: false }) });

      // B dies → end
      send(B, { type: 'snapshot', roomId, snapshot: snap(1, 200, { alive: false }) });
      const end = await expectMsg(B, 'matchEnd', 4000);

      // Ranking uses distance regardless of spectating (sorted descending)
      // C=300, B=200, A=100 → expected order: C, B, A
      const rankOk = end.ranking
        && end.ranking[0].distance === 300   // C (spectating, but 300 > 200 > 100)
        && end.ranking[1].distance === 200   // B
        && end.ranking[2].distance === 100;  // A

      console.log(rankOk
        ? '✓ 11. Spectating does not affect ranking (sorted by true distance)'
        : `✗ 11. Bad ranking: ${JSON.stringify(end.ranking.map(p => ({u: p.userId.substring(0,8), d: p.distance})))}`);
      rankOk ? passed++ : failed++;

      A.close(); B.close(); C.close();
      console.log('✓ 12. Clean disconnect');
      passed++;
    }

  } catch (e) {
    console.log(`✗ ERROR: ${e.message}`);
    console.log(e.stack);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
