#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Food Ordering System — GCP Compute Engine Deploy Script"
echo "=========================================================="

# 1. Update and install prerequisites
echo "📦 1/5 Installing Docker, Docker Compose, Git, and Nginx..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker $USER
fi

# 2. Configure Firewall
echo "🛡️ 2/5 Configuring Firewall ports (80, 443, 3000, 4000, 9000, 9001, 3001)..."
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
