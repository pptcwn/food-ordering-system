#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Food Ordering System — GCP Compute Engine Deploy Script"
echo "=========================================================="

# Remove any broken docker apt repo from previous attempts
sudo rm -f /etc/apt/sources.list.d/docker.list

# 1. Install Docker & Docker Compose via official Docker script (auto-detects Debian 12 / Ubuntu)
echo "📦 1/5 Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg git ufw
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER || true
fi

# 2. Configure Firewall
echo "🛡️ 2/5 Configuring UFW Firewall ports..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw allow 3000/tcp || true
sudo ufw allow 4000/tcp || true
sudo ufw allow 9000/tcp || true
sudo ufw allow 9001/tcp || true
sudo ufw allow 3001/tcp || true

# 3. Create .env if not exists
if [ ! -f .env ]; then
  echo "📝 3/5 Creating default .env from .env.example..."
  cp .env.example .env
  # Update default public URLs to GCP External IP
  sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://34.126.172.168:4000/api|g" .env
  sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=http://34.126.172.168:4000|g" .env
fi

# 4. Build and Launch Containers
echo "🐳 4/5 Starting Docker Compose Production Stack..."
sudo docker compose -f docker-compose.prod.yml up -d --build

# 5. Run Database Migrations
echo "🗄️ 5/5 Running Prisma Database Migrations..."
sleep 8
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy || true

echo "=========================================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=========================================================="
echo "🌐 Frontend (Customer App & Admin): http://34.126.172.168:3000"
echo "⚙️ Backend API & Docs:              http://34.126.172.168:4000/docs"
echo "🗄️ MinIO Storage Console:          http://34.126.172.168:9001"
echo "📊 Uptime Kuma Monitoring:          http://34.126.172.168:3001"
echo "=========================================================="
