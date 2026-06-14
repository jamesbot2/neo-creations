# 🏃 Subway Surfer - Neo Edition

> 3D 无限跑酷网页游戏 / 3D endless runner web game  
> Three.js + Node.js 账号系统  
> Made by Neo 🤖 for James

---

## 🌐 在线游玩 / Play Online

| 链接 | 说明 |
|---|---|
| **http://35.212.200.85:3000/** | 🏆 主服务器（推荐）— 登录/游戏/后台一体 |
| **http://35.212.200.85:3000/admin** | 🔧 后台管理面板 |
| **http://35.212.200.85:3000/verify-codes** | 🔑 查看注册验证码 |
| **https://jamesbot2.github.io/subway-surfer/** | 🌍 GitHub Pages（可能不是最新） |
| **http://35.212.200.85:8080/** | 🔄 自动跳转到 :3000 |

> ⚠️ 服务器 IP `35.212.200.85` 可能会变，如果访问不了请联系 Neo

---

## 📁 项目结构

```
subway-surfer/
├── game/                     # 游戏模块（模块化拆分）
│   ├── constants.js          # 游戏常量
│   ├── state.js              # 游戏状态对象
│   ├── audio.js              # 音效 + 背景音乐系统
│   ├── textures.js           # 纹理生成
│   ├── scene.js              # Three.js 场景/相机/灯光/渲染器
│   ├── player.js             # 玩家模型
│   ├── track.js              # 轨道系统
│   ├── buildings.js          # 场景建筑 + 主题系统 + 障碍物生成
│   ├── obstacles.js          # 障碍物类型（火车/路障/无人机/闸门）
│   ├── coins.js              # 金币系统
│   ├── particles.js          # 粒子效果
│   ├── collision.js          # 碰撞检测 + 赛博模式
│   ├── ui.js                 # UI 系统（菜单/HUD/商店/Settings）
│   ├── homelander.js         # 祖国人彩蛋
│   ├── controls.js           # 键盘/触控/手机按钮控制
│   ├── police.js             # 🚔 警察追踪系统
│   ├── account.js            # 账号系统（登录/注册/Profile/存档）
│   └── main.js               # 主游戏循环 + 初始化
├── server/
│   ├── account-server.js     # 账号服务器（注册/登录/存档/Admin）
│   ├── static-server.js      # 静态文件服务器
│   └── data/users.json       # 用户数据库
├── signin.html               # 独立登录/注册页面
├── game.html                 # 游戏页面（含登录检查）
├── index.html                # 入口（重定向到 signin）
├── style.css                 # 样式
└── start-servers.sh          # 一键启动双服务器
```

---

## 🎮 游戏机制

### 操作 Controls
| 操作 | 桌面 | 手机 |
|---|---|---|
| 左移 | ← / A | 左滑 / ◀ |
| 右移 | → / D | 右滑 / ▶ |
| 跳跃 | ↑ / W / Space | 上滑 / ▲ |
| 翻滚 | ↓ / S | 下滑 / ▼ |
| 暂停 | Esc / P | ⏸ |
| FPV | 👁 按钮 | 👁 按钮 |
| 控制台 | ` | >_ 按钮 |
| 菜单 | M | — |

### 障碍物
- 🚂 **火车** — 跳跃或登上车顶
- 🧱 ~~路障~~（已移除，太难躲）
- 🚪 **钻底闸门** — 翻滚通过
- 🚧 **全车道路障** — 跳跃通过
- 🚁 **低空无人机** — 跳跃或翻滚

### 商店能力
| 能力 | 价格 | 效果 |
|---|---|---|
| 🦘 **二段跳** | 10,000 credits | 空中再来一次跳跃 |
| 🚀 **喷气背包** | 50,000 credits | 空中悬浮30s，冷却15s |
| 🏃 **屋顶行走** | 100,000 credits | 障碍物顶行走，侧面撞到才死 |

### 500px 赛博模式
速度达到 48× 时，全场景变为黑白未来科技风。

---

## 🔐 账号系统

### 功能
- **注册**：用户名 + 邮箱 + 密码 + 图形验证码
- **登录**：邮箱 + 密码 + 记住我
- **邮箱验证**：注册后输入验证码验证邮箱
- **云存档**：每 30s 自动保存 + 结算保存
- **Profile**：查看金币/信用点/技能/每难度最远距离/跑步次数

### 后台管理
**http://35.212.200.85:3000/admin**
- 查看所有用户（邮箱/用户名/密码/数据）
- 修改密码
- 删除用户
- 验证用户
- 设置金币数量
- **http://35.212.200.85:3000/verify-codes** — 查看验证码

### API 接口
| 接口 | 方法 | 功能 |
|---|---|---|
| `/api/register` | POST | 注册 |
| `/api/verify-code` | POST | 验证邮箱 |
| `/api/login` | POST | 登录 |
| `/api/save` | POST | 保存存档 |
| `/api/load` | GET | 加载存档 |
| `/api/leaderboard` | GET | 排行榜 |
| `/api/admin-delete-user` | POST | 删除用户 |
| `/api/admin-reset-password` | POST | 重置密码 |
| `/api/admin-verify-user` | POST | 验证用户 |
| `/api/admin-set-coins` | POST | 设置金币 |

---

## 🆚 PVP 比赛系统 (Phase 2)

多人实时对战，基于 WebSocket + 现有账号系统 token 认证。

### 启动命令

```bash
cd subway-surfer
node server/pvp-server.js
```

默认端口 **3001**，可通过 `PVP_PORT` 环境变量覆盖：

```bash
PVP_PORT=4000 node server/pvp-server.js
```

### WebSocket 地址

```
ws://<host>:3001
```

### 消息协议

所有消息均为 JSON。

#### 1️⃣ 认证

```json
// client → server
{ "type": "hello", "token": "<login-token>" }

// server → client (成功)
{ "type": "helloOk", "userId": "...", "username": "...", "emailVerified": true }

// server → client (失败, 随后关闭连接)
{ "type": "error", "error": "invalid token" }
```

#### 2️⃣ 房间

```json
// 查看公开房间
client → server: { "type": "listRooms" }
server → client: { "type": "roomList", "rooms": [...] }

// 创建房间
client → server: { "type": "createRoom", "roomName": "Cyber Sprint" }
server → client: { "type": "roomUpdate", "room": {...} }

// 加入房间
client → server: { "type": "joinRoom", "roomId": "..." }
server → client: { "type": "roomUpdate", "room": {...} }  // 给自己
server → client: { "type": "roomUpdate", "room": {...} }  // 广播给房间其他人

// 离开房间
client → server: { "type": "leaveRoom" }

// 邀请（仅房主）
client → server: { "type": "invite", "roomId": "...", "toUserId": "..." }
server → target: { "type": "invite", "roomId": "...", "fromUserId": "...", "fromUsername": "..." }

// 回应邀请
client → server: { "type": "inviteResponse", "roomId": "...", "accept": true|false }

// 准备状态
client → server: { "type": "ready", "roomId": "...", "ready": true|false }
```

房间限制：最多 3 人、未 start 才能加入、不踢出房间。

#### 3️⃣ 比赛开始

```json
// 房主发起（需全员 ready、≥2 人）
client → server: { "type": "start", "roomId": "..." }

// 广播给所有人
server → client: {
  "type": "matchStart",
  "roomId": "...",
  "seed": "<256-bit-hex>",
  "players": [
    { "userId": "...", "username": "...", "lane": 0, "startOffset": 0, "characterId": "runner" }
  ]
}
```

每位玩家得到唯一的 `lane` (0/1/2) 和 `startOffset` (0/-4/-8)。

#### 4️⃣ 实时同步 (20Hz)

```json
// 客户端上报状态
client → server: {
  "type": "snapshot",
  "roomId": "...",
  "snapshot": {
    "lane": 1,
    "distance": 120,
    "isJumping": false,
    "isRolling": true,
    "alive": true,
    "spectating": false,
    "characterId": "runner",
    "timestamp": 1710000000000
  }
}

// 服务端每 50ms 转发其他玩家状态
server → client: {
  "type": "snapshotBatch",
  "roomId": "...",
  "players": [
    { "userId": "...", "username": "...", "snapshot": {...} }
  ]
}
```

死亡玩家 (`alive: false`) 继续留在房间接收 `snapshotBatch`，用于观战。

#### 5️⃣ 比赛结束

当所有玩家 `alive: false` 时，服务端广播：

```json
server → client: {
  "type": "matchEnd",
  "roomId": "...",
  "ranking": [
    { "userId": "...", "username": "...", "distance": 900, "rank": 1 },
    { "userId": "...", "username": "...", "distance": 500, "rank": 2 }
  ]
}
```

排名按最高 distance 从高到低。结束后不再接收 `snapshot`。

#### 错误格式

```json
{ "type": "error", "error": "message" }
```

### 防作弊

| 检查 | 说明 |
|------|------|
| distance 不能倒退 | 上次距离 > 当前距离 → 拒绝 |
| 单次增长上限 ≤50 | 20Hz 上报，约 1000 单位/秒 |
| lane 必须 0/1/2 | 非法 lane → 拒绝 |
| distance ≥0 | 负数 → 拒绝 |
| 仅房间内玩家可发 snapshot | 不在房间 → 拒绝 |
| 仅 started 后可发 | 未开始 → 拒绝 |
| started 后不可加入 | 比赛中不再接收新人 |
| ended 后不可发 snapshot | 结算后拒绝 |

### 架构

```
server/
├── auth.js             ← 共享 token 校验 (被 account-server + pvp-server 共用)
├── account-server.js   ← HTTP: 注册/登录/存档/排行榜
├── pvp-server.js       ← WebSocket: 房间/比赛/实时同步
└── pvp-smoke.js        ← 集成测试
```

---

## 🚔 警察追踪系统

跑过 200m 后，一辆警车从后方追来：
- 初始距离 12m
- 缓慢逼近（约 90 秒追上）
- 金币收集可将警车推后 1m
- 距离 < 0.5m → GAME OVER
- HUD 显示 🚔 DISTANCE: Xm（绿→橙→红）
- 警笛声随距离靠近而响起

---

## 🌍 场景主题

| 分数 | 主题 | 背景色 | 两侧模型 |
|---|---|---|---|
| 0-500 | 🏙️ 城市 | 天蓝 | 长方体建筑 |
| 500-1500 | 🌲 森林 | 松绿 | 锥形树冠 + 灌木 |
| 1500-3000 | 🏜️ 沙漠 | 沙黄 | 仙人掌 + 岩石 |
| 3000+ | 🌊 海洋 | 深青 | 冰柱 + 冰山 |

---

## 🦸 彩蛋

输入 `homelander` 开启祖国人模式：
- WASD 飞行
- 从眼睛射出持续激光
- 激光烧毁障碍物
- 美国国旗披风
- `quit` 退出

---

## 🚨 已知问题 / Bug (2026-06-03)

### 1. Profile 数据加载不完整
**现象**：Profile 页面打开时，部分数据（best distances）显示为 0 或不完整。
**原因**：`loadAccountData()` 为异步 fetch，Profile HTML 在 fetch 返回前就已构建，导致状态未同步。
**当前修复**：`showProfile()` 现改为先显示 Loading，等待 `loadAccountData()` 回调完成后再通过 `_renderProfile()` 渲染。
**状态**：⚠️ 待验证

### 2. Leaderboard 玩家名称显示
**现象**：排行榜显示邮箱而非用户名。
**原因**：部分旧账号注册时未保存 username，服务端已补填为邮箱前缀。
**修复**：服务端 `/api/leaderboard` 返回 `name` 字段（`u.username \|\| 邮箱前缀`），客户端显示 `e.name`。
**状态**：⚠️ 待验证

### 3. 技能商店装备后技能效果叠加
**现象**：装备一个技能后，其他已购买技能仍生效。
**原因**：游戏逻辑检查 `canDoubleJump`/`canJetpack`/`canRoofWalk`（拥有标志）而非 `equippedAbility`（装备标志）。
**修复**：`controls.js`/`collision.js`/`main.js` 中所有技能触发点都加了 `equippedAbility === N` 检查。
**状态**：⚠️ 待验证

### 4. 设置页面音量滑块位置
**现象**：Settings 页面中音量滑块与百分比文字错位。
**原因**：内联 HTML 中 `<br>` 导致换行，`this.nextSibling` 获取到文本节点而非 SPAN 元素。
**修复**：改用 `querySelector` + `data-key` 属性绑定事件，滑块和百分比在同一行。
**状态**：⚠️ 待验证

## 🛡️ 安全性

- 注册/登录/验证码接口均设频率限制，防止滥用
- 请求体大小限制，防止内存攻击
- 后台管理面板需账号密码认证
- 验证码通过邮件发送，API 不再直接返回
- SSH 密码登录已禁用
- 服务器防火墙仅开放必要端口

## 🛠 本地开发

```bash
# 克隆
git clone https://github.com/jamesbot2/neo-creations.git
cd neo-creations/subway-surfer

# 启动游戏服务器（端口 8080）
node server/static-server.js

# 启动账号服务器（端口 3000）
node server/account-server.js

# 打开 http://localhost:3000
```

## 📜 License

MIT
