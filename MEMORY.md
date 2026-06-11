# MEMORY.md - Long-Term Memory

## GitHub 仓库功能说明

### jamesbot2/neo-creations 🏠 — 工作区仓库
- **远程名**: `origin`
- **URL**: `https://github.com/jamesbot2/neo-creations.git`
- **分支**: main
- **用途**: Neo 的工作区根目录（AGENTS.md、SOUL.md、USER.md、TOOLS.md、MEMORY.md、memory/、技能、子项目等）
- **README**: "Things Neo made 🤖"
- **Token 位置**: 内嵌在 `~/.openclaw/workspace/.git/config` 的 remote URL 中
- **推什么**: 日常工作、文档、记忆、学习记录、子项目开发

### jamesbot2/subway-surfer 🎮 — 游戏仓库
- **远程名**: `gh-pages`
- **URL**: `https://github.com/jamesbot2/subway-surfer.git`
- **分支**: main
- **用途**: 仅 subway-surfer 3D 跑酷游戏
- **内容**: game/、server/、game.js、index.html、signin.html、style.css、start-servers.sh 等游戏文件
- **本地路径**: `~/.openclaw/workspace/subway-surfer/`
- **⚠️ 推时注意**: 只推游戏文件！绝不可推 AGENTS.md、SOUL.md、memory/ 等工作区文件
- **已清理**: 2026-06-11 force push 清除了误推的整个工作区内容

## Subway Surfer 游戏
- 3D 无限跑酷，Three.js + Node.js
- 完整账号系统（注册/登录/邮箱验证/云存档）
- 服务器跑在 GCP 机器上（:3000 游戏，:8080 静态）
- 本地路径: `~/workspace/subway-surfer/`

## GCP 云主机
- Debian 13 (trixie)
- 公网 IP: 35.212.200.85
- 内网 IP: 10.138.0.2
- Tailscale IP: 100.112.240.25
- 用户: ejimm363

### 游戏功能
- 主菜单有排行榜（🏆 LEADERBOARD）：显示各难度最远距离 + 装备技能
- 祖国人模式下距离/金币/credit 不计入记录
- 返回到主菜单自动退出祖国人模式
- 刷新页面自动回到普通模式

### 防火墙（已收紧）
- `allow-game-server` — TCP 3000, 8080
- `allow-shadowsocks` — TCP+UDP 8388
- `default-allow-ssh` — TCP 22
- 其他端口全部封锁
- `abc` 规则（0.0.0.0/0 全放行）已删除

### SSH
- 密钥登录 ✅ / 禁 root ✅ / 自动安全更新 ✅

### Shadowsocks 翻墙
- 端口 8388 (TCP+UDP)
- 加密: chacha20-ietf-poly1305
- 密码: rKbJDTiZZWM3PzVVQvNdQ==
- systemd 开机自启
- Clash Verge 客户端已配好

### OpenClaw Dashboard
- 只能通过 Tailscale 访问: http://100.112.240.25:18789
- 仍有更新可用（2026.5.28）

## Account System Template

subwaysurfer 项目的登录系统（含邮箱验证、图形验证码、账号密码、云端存档、管理面板）已经拆成可复用模板。

- 纯 Node.js http 单文件，无框架，~600 行
- 自绘 SVG 验证码（无第三方库）
- PBKDF2+SHA256 密码哈希
- nodemailer 163 SMTP 发邮件
- JSON 文件存储
- 6 个 API 端点 + 1 个管理面板

详细文档：`memory/account-system-template.md`
