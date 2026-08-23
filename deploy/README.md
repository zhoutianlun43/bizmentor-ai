# BizMentor V0.4 Phase 1 — 公网部署运行手册

架构：Internet → Cloudflare DNS → 香港服务器(腾讯云 Lighthouse, Ubuntu 24.04) → Caddy HTTPS → 127.0.0.1:3000 → Next.js

## 安全基线
- 生产 Next.js 只监听 127.0.0.1:3000（systemd 单元已固定）
- 公网只开放 22/80/443（ufw）
- SSH 仅 Key 登录，禁用密码/root 密码登录
- API Key 只存在于服务器 /opt/bizmentor/.env.production；禁止提交、禁止打印
- 不迁移 Supabase / 不做 Auth / 不改 V0.3-A/B/C 业务逻辑

## 部署步骤

### 0) 前置（本地，已完成）
- 本地已生成 SSH Key：~/.ssh/id_ed25519_bizmentor（公钥见 id_ed25519_bizmentor.pub）

### 1) 服务器初始化（以 root 在腾讯云控制台终端执行一次）
把公钥粘贴进命令执行（上传本目录 setup-server.sh 后运行）：
```bash
bash setup-server.sh "ssh-ed25519 AAAA...你的公钥"
```
脚本会：更新系统、创建 bizmentor 部署用户并装公钥、ufw 只开 22/80/443、装 Node 24 + pnpm + Caddy、SSH 加固。

### 2) DNS（Cloudflare，由你手动管理，我不自动改）
- 添加 A 记录：@ 和 www → 服务器公网 IP
- 请用「仅 DNS（灰云）」模式：让 Caddy 用 HTTP-01 直接签发 Let's Encrypt 证书（若开橙云代理，需 DNS-01 Token，本阶段不做）

### 3) 本地部署（拿到 IP/域名后执行）
```bash
bash deploy/deploy-app.sh <服务器IP> <域名>
```
脚本执行：SSH 检查 → 上传代码 → 确认 .env.production → pnpm install/build → systemd 启动 → Caddy 生效。

### 4) 生产环境变量
- 服务器上创建 /opt/bizmentor/.env.production（模板见 deploy/.env.production.example），填入真实 Key。
- 本机 .env.local 中的 Key 可安全 scp 到服务器（不打印、不提交）。

### 5) 验收（每步报告，不假设成功）
1. ssh bizmentor@IP "echo ok; cat /etc/os-release; nproc; free -h; df -h /"
2. curl -I https://域名 → 200 + TLS 证书有效
3. /api/ai、/api/external-research 在线 smoke
4. V0.3-A/B/C 功能回归（Research / External Evidence / Decision-Validation-Score v2）
5. 手机 4G/5G 访问
6. 关闭 Windows 开发机后再访问

## 回滚
- 服务：systemctl restart bizmentor / journalctl -u bizmentor -f
- 证书：caddy renew；代码回滚：重跑 deploy-app.sh（上次构建）
