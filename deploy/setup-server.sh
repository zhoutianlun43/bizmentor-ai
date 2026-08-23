#!/usr/bin/env bash
# =============================================================
# BizMentor 服务器一次性初始化（以 root 在腾讯云 Lighthouse 控制台终端执行）
# 用法: bash setup-server.sh "ssh-ed25519 AAAA...你的公钥"
# 安全：仅使用 SSH Key；不设置 root 密码登录；防火墙只开 22/80/443
# =============================================================
set -euo pipefail

PUBKEY="${1:?用法: bash setup-server.sh \"<ssh-ed25519 公钥>\"}"
DEPLOY_USER="bizmentor"

echo "==> [1/6] 系统更新与基础工具"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates gnupg apt-transport-https

echo "==> [2/6] 创建部署用户并安装 SSH Key"
id -u "$DEPLOY_USER" &>/dev/null || useradd -m -s /bin/bash "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
echo "$PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
echo "    公钥已安装到 /home/$DEPLOY_USER/.ssh/authorized_keys"

echo "==> [2b/6] 部署用户免密 sudo（用于管理 systemd / Caddy）"
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/bizmentor
chmod 440 /etc/sudoers.d/bizmentor

echo "==> [3/6] 防火墙：仅 22/80/443"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "==> [4/6] Node.js 24 + pnpm"
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
npm install -g pnpm@11
node --version && pnpm --version

echo "==> [5/6] Caddy"
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy
caddy version

echo "==> [6/6] SSH 加固（禁用密码登录 / root 密码登录）"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

echo "初始化完成。接下来从本地执行: bash deploy/deploy-app.sh <服务器IP> <域名>"
