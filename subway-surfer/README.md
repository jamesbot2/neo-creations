# 🏃 Subway Surfer - Neo Edition

> 3D 无限跑酷网页游戏 / 3D endless runner web game  
> Three.js + Node.js 账号系统  
> Made by Neo 🤖 for James

---

## 🌐 在线游玩 / Play Online

**https://jamesbot2.github.io/subway-surfer/** (GitHub Pages)  
**http://35.212.200.85:3000/** (主服务器，推荐)  
**http://35.212.200.85:8080/** (会自动跳转到 :3000)

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

## 🚨 已知问题 / Bug

### 1. 音量滑块数值不持久
**现象**：拖动音量滑块后关闭再打开 Shop，数值恢复为默认值。  
**原因**：`game/ui.js` 中 `showShop()` 重建 Shop HTML 时读取 `SG.state.musicVolume`，但该字段在 `game/state.js` 中未定义。虽然 `oninput` 事件设置了 `SG.state.musicVolume`，但 Shop 重新打开时 `SG` 对象引用可能不一致或值未正确保留。  
**源代码**：`game/ui.js` 第 86-87 行（音量滑块 HTML 生成），`game/state.js`（缺少 musicVolume/sfxVolume 初始化）  
**状态**：已尝试修复（改用 localStorage 直读+`nextElementSibling`），等待验证。

### 2. Profile 页面只显示 Credits 和 Coins
**现象**：Profile 页面中 Email、技能、跑步次数、每难度最远距离均不显示。  
**原因**：`game/account.js` 中的 `loadAccountData()` 在游戏初始化时通过 fetch 从服务器加载数据。但 Profile 页面可能在 fetch 完成前就已创建，且创建后不刷新内容。另外 `SG.account.email` 在游戏页面加载时从 `localStorage` 读取，若登录跳转时未正确保存则为空。  
**源代码**：`game/account.js` 第 74-84 行（`doLogin` 数据加载）、第 154-195 行（`showProfile`）、第 198-215 行（`loadAccountData`）  
**状态**：已尝试修复（Profile 打开时先调 `loadAccountData` 再渲染），等待验证。

### 3. 游戏首次加载黑屏
**现象**：打开 `game.html` 后页面全黑，无法渲染 Three.js 场景。  
**原因**：`game/ui.js` 中引用了已删除的 DOM 元素 `accBtnMenu`，该变量为 `undefined`，导致 JavaScript 错误中断初始化。  
**源代码**：`game/ui.js` 第 393 行（已修复删除）  
**状态**：✅ 已修复

### 4. 初始化顺序问题
**现象**：模块化拆分后 `account.js` 在 `main.js` 之前加载，导致 `var origInit = SG.init` 捕获 `undefined`。  
**源代码**：`game.html` 脚本加载顺序（已修复：`account.js` 在 `main.js` 之后）  
**状态**：✅ 已修复

### 5. 背景颜色代码放错文件
**现象**：模块化重构时背景颜色更新代码被放入 `homelander.js` 的 `updateHomelander()` 中，只在 Homelander 模式下执行。  
**源代码**：`game/homelander.js` → `game/main.js`（已移回主更新循环）  
**状态**：✅ 已修复

### 6. 签名页按钮无响应
**现象**：登录/注册按钮点击无反应。  
**原因**：JavaScript 变量提升导致 `switchTab` 覆盖冲突。  
**源代码**：`signin.html`（已完全重写）  
**状态**：✅ 已修复

---

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
