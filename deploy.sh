#!/bin/bash
# 部署脚本 - 在百度云服务器上部署 english-learning-app
set -e

echo "=== 1. 安装 Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== 2. 安装 PM2 (进程管理) ==="
npm install -g pm2

echo "=== 3. 克隆项目 ==="
rm -rf /opt/english-learning-app
cd /opt
git clone https://github.com/yezini2000/english-learning-app.git
cd english-learning-app

echo "=== 4. 安装依赖 ==="
npm install

echo "=== 5. 构建项目 ==="
npm run build

echo "=== 6. 配置环境变量 ==="
cat > /opt/english-learning-app/server/.env << 'ENVFILE'
DATABASE_URL="file:./prisma/prod.db"
PORT=3000
OPENAI_API_KEY=sk-c63d5316850848ff8b3285e3e1ee9ed4
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
ENVFILE

echo "=== 7. 初始化数据库 ==="
cd /opt/english-learning-app/server
npx prisma generate
npx prisma db push

echo "=== 8. 启动应用 ==="
cd /opt/english-learning-app
pm2 delete english-learning-app 2>/dev/null || true
pm2 start server/dist/src/index.js --name english-learning-app
pm2 save
pm2 startup | tail -1 | bash

echo "=== 9. 安装 Nginx 反向代理 ==="
apt-get install -y nginx
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
NGINX
nginx -t && systemctl restart nginx

echo ""
echo "========================================="
echo "  部署完成！"
echo "  访问地址: http://106.12.48.23"
echo "========================================="
