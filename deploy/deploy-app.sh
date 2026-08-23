#!/usr/bin/env bash
# =============================================================
# BizMentor 应用部署（在本地 Windows Git Bash 或 WSL 执行）
# 用法: bash deploy/deploy-app.sh <服务器IP> <域名> [部署用户]
# 例:   bash deploy/deploy-app.sh 1.2.3.4 bizmentor.ai
# 安全：Key 只存在于服务器 /opt/bizmentor/.env.production；本脚本不打印 Key
# =============================================================
set -euo pipefail

SERVER_IP="${1:?用法: bash deploy/deploy-app.sh <服务器IP> <域名> [部署用户]}"
DOMAIN="${2:?缺少域名}"
DEPLOY_USER="${3:-bizmentor}"
SSH_KEY="$HOME/.ssh/id_ed25519_bizmentor"
APP_DIR="/opt/bizmentor"
REMOTE="$DEPLOY_USER@$SERVER_IP"

echo "==> [1/6] SSH 连通性检查"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE" "echo OK && . /etc/os-release && echo \"$PRETTY_NAME\" && nproc && free -h | head -2 && df -h / | tail -1"

echo "==> [2/6] 上传代码（排除 node_modules/.next/.git 等）"
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.test-dist --exclude=.data --exclude=outputs -czf /tmp/bizmentor-src.tgz .
ssh -i "$SSH_KEY" "$REMOTE" "mkdir -p $APP_DIR"
scp -i "$SSH_KEY" /tmp/bizmentor-src.tgz "$REMOTE:/tmp/bizmentor-src.tgz"
ssh -i "$SSH_KEY" "$REMOTE" "tar -xzf /tmp/bizmentor-src.tgz -C $APP_DIR && chown -R $DEPLOY_USER:$DEPLOY_USER $APP_DIR"
unlink /tmp/bizmentor-src.tgz 2>/dev/null || true

echo "==> [3/6] 生产环境变量"
ssh -i "$SSH_KEY" "$REMOTE" "test -f $APP_DIR/.env.production && echo 'env OK' || echo '缺少 .env.production'"

echo "==> [4/6] 安装依赖 + 构建"
ssh -i "$SSH_KEY" "$REMOTE" "cd $APP_DIR && pnpm install --frozen-lockfile 2>&1 | tail -3"
ssh -i "$SSH_KEY" "$REMOTE" "cd $APP_DIR && pnpm build 2>&1 | tail -8"

echo "==> [5/6] 安装 systemd 服务并启动"
ssh -i "$SSH_KEY" "$REMOTE" "sudo cp $APP_DIR/deploy/bizmentor.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now bizmentor && sleep 3 && sudo systemctl is-active bizmentor"

echo "==> [6/6] 配置 Caddy（替换域名占位符）"
ssh -i "$SSH_KEY" "$REMOTE" "sed 's/DOMAIN_PLACEHOLDER/$DOMAIN/' $APP_DIR/deploy/Caddyfile | sudo tee /etc/caddy/Caddyfile > /dev/null && sudo systemctl reload caddy && sleep 3 && sudo systemctl is-active caddy"

echo "部署完成。验证: https://$DOMAIN"
