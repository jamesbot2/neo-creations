# 🏃 Subway Surfer - Neo Edition

> A 3D endless runner web game, built with Three.js.  
> Inspired by Subway Surfers. Created by Neo 🤖 for James.

## 🎮 Play

**https://jamesbot2.github.io/subway-surfer/**

---

## 🏗 Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| **Engine** | Three.js r128 (WebGL) |
| **Physics** | Custom AABB collision + parabolic jump |
| **Rendering** | Canvas-generated textures (no external assets) |
| **Audio** | Web Audio API (procedural sound) |
| **Hosting** | GitHub Pages |
| **CDN** | cdnjs → jsdelivr (fallback) |

### Project Structure

```
subway-surfer/
├── index.html     ← Entry point, loads Three.js CDN + game.js
├── style.css      ← Full-screen canvas layout, UI overlays, mobile controls
└── game.js        ← ~2200 lines, single-file game logic
```

### Code Architecture (game.js)

The game runs inside a single IIFE `(function() { ... })()` to avoid global scope pollution.

**Key Systems (in order):**

```
Constants → State → Texture Gen → Scene Setup → Player → Track → Buildings
→ Obstacles → Coins → Particles → Audio → Spawn Logic → UI → Controls
→ Collision → Game Flow → Update Loop → Camera → Render Loop → Init
```

#### 1. Game Loop

```
animate()
  └→ requestAnimationFrame(animate)  // recursive frame scheduler
  └→ update()                        // all game logic
  └→ renderer.render(scene, camera)  // always renders every frame
```

#### 2. Update Loop (`update()`)

```
gameOver? → camera shake decay → return
paused / not started? → return
↓
delta = clock.getDelta()
→ speed increase → score → UI refresh
→ move track segments (recycle)
→ move obstacles, coins, buildings
→ particles (move + cleanup)
→ player lane lerp (smooth switching)
→ jump physics (gravity + velocity)
→ roll height + squash
→ running animation (bob, arm/leg swing)
→ lane lean
→ coin collection
→ spawn obstacles (fill pipe)
→ collision detection
→ Homelander update (if active)
→ camera follow
```

#### 3. Coordinate System

```
+Z = behind the player (coming toward)
-Z = ahead (where the player runs)
+Y = up
+X = right
Camera at z=+7, looking toward z=-10
Player locked at z=0 (world moves around them)
```

- **3 lanes**: X positions at -2.2, 0, 2.2
- **Objects move in +Z direction** (toward camera, get cleaned up at z=+30)
- **Objects spawn at -Z** (ahead, fade in through fog)
- **Fog**: 60–120 units from camera (0x87CEEB sky blue)

#### 4. Obstacle Spawning ("Pipe Fill")

```
ahead = obstacles in z(-90, 0)
targetCount = min(6 + speed×6, 18)  // more at higher speed
if ahead.length < targetCount:
    pick lane, check zBlocked (no overlap within ±6)
    pick type: train(40%), barrier(15%), roll-under(45%)
    spawn at z = -(45 + speed×30) - random(15)
    spawn coins nearby
```

**Difficulty modes:**
- Easy: count ×0.4, gap ×2, 10 initial
- Medium: count ×0.7, 15 initial
- Hard: count ×1.0, 20 initial (default)

---

## 🎯 Game Mechanics

### Controls

| Action | Desktop | Mobile |
|---|---|---|
| Start | Space / Enter | Tap TAP TO START |
| Move Left | ← / A | Swipe left / tap left / ◀ btn |
| Move Right | → / D | Swipe right / tap right / ▶ btn |
| Jump | ↑ / W / Space | Swipe up / tap center / ▲ btn |
| Roll / Slide | ↓ / S | Swipe down / ▼ btn (hold to stay) |
| Pause | Esc / P | ⏸ button (top-left) |
| Console | ` (backtick) | >_ button (top-right) |
| FPV Toggle | 👁 button | 👁 button (top-right) |
| Main Menu | M | RETURN TO MENU (pause or game over) |

### Obstacles

| Type | Avoid by | Hitbox |
|---|---|---|
| 🚂 Train | Jump over | 2.4×1.8×6 |
| 🧱 Barrier | Jump over | 1.6×0.6×1.0 |
| 🚪 Roll-Under Gate | Roll/Slide under | 2.6×0.5×5 (top bar at y=1.4) |
| 🚂➕ Ramp Train | Run onto roof | Same as train + orange ramp at back |

### Power-Ups / Easter Eggs

| Command | Effect |
|---|---|
| `homelander` | 🦸 Fly as Homelander (WASD), laser eyes, invincible |
| `quit` | Exit Homelander mode |

### Difficulty Levels

| Level | Init Obstacles | Spawn Rate | Gap | Color |
|---|---|---|---|---|
| 🟢 EASY | 10 | 40% | 30 units | Green |
| 🟡 MEDIUM | 15 | 70% | 20 units | Yellow |
| 🔴 HARD | 20 | 100% | 15 units | Red (default) |

### Speed System

- **START_SPEED**: 0.35 (21 units/sec)
- **MAX_SPEED**: 2.25 (135 units/sec)
- **Display**: 1× → 50×
- **Colors**: White (<15×) → Orange (15-35×) → Red (>35×)
- **Acceleration**: 0.0005/frame (~63 sec to max)

---

## ✨ Features

### Ramp Trains (30% of trains)
- Orange ramp at back of train (z=+4.5)
- Run up → ride the roof (`state.onRoof = true`)
- Jump between roofs (any obstacle surface)
- Auto drop when roof ends

### First-Person View (FPV)
- Toggle with 👁 button
- Camera at eye level (y+1.3)
- Follows jump/roll height changes
- Player model hidden in FPV

### Hold-to-Roll
- Hold ↓ / S / mobile ▼ = stay sliding
- Release = stand up
- Swipe down = 400ms minimum roll
- Jump cancels roll, roll cancels jump

### Air Roll (Jump + ↓)
- 2.5× gravity while rolling mid-air
- Faster landing
- Keep sliding on touchdown

### Console (`)
- Type commands during gameplay
- `homelander` → fly as Homelander
- `quit` → exit Homelander
- Pauses game while open

### Best Score (localStorage)
- Persists across sessions
- Displayed on HUD and Game Over screen

### Obstacle Overlap Prevention
- `zBlocked` check: ±6 units before any spawn
- Barrier not placed near roll-under gates
- Roll-under not placed near ramp trains
- Spawn skipped if Z is occupied

### Mobile Controls
- Cross-layout (▲ top, ◀ ▼ ▶ bottom row)
- Touch zones: tap left/right third for lanes
- Swipe detection for all actions
- Hold ▼ for sustained roll

---

## 🐛 Known Issues / Todo

### Bugs
- **Telegram in-app browser**: WebGL works inconsistently; some WebViews block CDN or lack GPU acceleration
- **Mobile console keyboard**: After dismissing and reopening, some mobile keyboards don't trigger on first tap
- **Obstacle overlap edge case**: Double obstacles (2 lanes at same Z) can clip visually at lane boundaries (±0.2 unit)
- **Homelander left/right on some browsers**: Direct keydown movement works in Playwright tests but reported non-functional on certain browser/keyboard configurations; the update-loop fallback (WASD reads `keys[]`) should cover these cases but may need further debugging
- **Swipe-up-to-jump latency**: On low-end mobile devices, touch event processing may introduce ~100ms delay

### Missing Features
- **Real Subway Surfers-style obstacles**: Moving trains, barriers that shift lanes
- **Power-ups**: 2× multiplier, magnet, hoverboard, shield
- **Mission system**: Daily challenges, score targets
- **Character skins**: Unlockable characters with different models
- **Sound toggle**: Mute button missing
- **High-score leaderboard**: No global rankings
- **Pause overlay responsiveness**: TAP TO CONTINUE doesn't always register on first tap on some devices
- **Obstacle variety**: Only 3 types + ramp trains; could use more (low-flying drones, gap jumps, lane-wide barriers)
- **Ramp boarding detection**: Works for forward approach but not for side-approach or reverse
- **Roof mechanics**: Jumping between roofs is functional but janky; fall-off detection is Z-bound only, doesn't consider X movement

### Performance
- **No LOD system**: All obstacles at full detail regardless of distance
- **Particle cleanup**: Laser beam particles in Homelander mode are not properly disposed
- **Mobile frame rate**: Struggles on devices with weak GPUs (no shadow maps helps but fog + many draw calls still heavy)
- **Buildings**: Simple colored boxes but still ~30 draw calls per frame; could be batched

### UX
- **No tutorial**: New players don't know controls without reading README
- **No pause icon on mobile**: ⏸ button is small and hard to tap
- **Console button conflict**: >_ and 👁 buttons overlap in some screen sizes
- **Font loading**: Uses system fonts; no custom web font loaded

---

## 🔧 Development

### Run Locally
```bash
# Clone
git clone https://github.com/jamesbot2/subway-surfer.git
cd subway-surfer

# Serve with any HTTP server
python3 -m http.server 8080
# Or
npx serve .
```

Then open `http://localhost:8080` in a browser.

### Build / Deploy
```bash
# Push to GitHub → GitHub Pages auto-deploys
git push origin main
```

No build step required. The game is pure HTML/CSS/JS.

### Testing
```bash
# Requires Playwright
npx playwright install chromium
node test.js
```

---

## 📜 License

MIT — feel free to fork, modify, and share.
