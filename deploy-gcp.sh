#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Food Ordering System — GCP Compute Engine Deploy Script"
echo "=========================================================="

# 0. Expand Linux filesystem partition to use full 50GB disk
echo "💾 0/6 Expanding Linux partition to use full 50GB disk..."
sudo apt-get update -y
sudo apt-get install -y cloud-guest-utils
sudo growpart /dev/sda 1 || true
sudo resize2fs /dev/sda1 || true
sudo growpart /dev/nvme0n1 1 || true
sudo resize2fs /dev/nvme0n1p1 || true

# Clean old cache
sudo apt-get clean || true
sudo rm -rf /tmp/* || true
docker system prune -af || true

# 1. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
  echo "📦 1/6 Installing Docker & Docker Compose..."
  sudo apt-get install -y ca-certificates curl gnupg git ufw
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER || true
  sudo chmod 666 /var/run/docker.sock || true
fi

# 2. Configure Firewall
echo "🛡️ 2/6 Configuring UFW Firewall ports..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw allow 3000/tcp || true
sudo ufw allow 4000/tcp || true
sudo ufw allow 9000/tcp || true
sudo ufw allow 9001/tcp || true
sudo ufw allow 3001/tcp || true

# 3. Create .env if not exists and ensure public endpoints use the HTTPS domain.
if [ ! -f .env ]; then
  echo "📝 3/6 Creating default .env from .env.example..."
  cp .env.example .env
  # Update default public URLs to GCP External IP
  sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://34.126.172.168:4000/api|g" .env
  sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=http://34.126.172.168:4000|g" .env
fi

set_env_value() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

set_env_value CLIENT_URL https://xinchao.minstance.cloud
set_env_value NEXT_PUBLIC_API_URL /api
set_env_value NEXT_PUBLIC_WS_URL https://xinchao.minstance.cloud
set_env_value MINIO_PUBLIC_PRODUCTS_URL https://xinchao.minstance.cloud
set_env_value MINIO_PUBLIC_PRESIGNED_URL https://xinchao.minstance.cloud
set_env_value MINIO_BROWSER_REDIRECT_URL http://34.126.172.168:9001

# 4. Build and Launch Containers sequentially to save RAM & avoid disk locks
echo "🐳 4/6 Starting Database, Redis, MinIO & Monitoring Stack..."
docker compose -f docker-compose.prod.yml up -d postgres redis minio uptime-kuma
sleep 5

echo "🔨 5/6 Building API, Worker, and Web Containers..."
docker compose -f docker-compose.prod.yml build api

# Apply migrations from the new API image before starting the API service.
# A new Prisma schema can otherwise make the running API restart before `exec` can run.
echo "🗄️ 6/6 Running Prisma Database Migrations..."
docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @food-ordering/database exec prisma migrate resolve --applied 000000000000_baseline --schema=prisma/schema.prisma || true
if ! docker compose -f docker-compose.prod.yml run --rm --no-deps api pnpm --filter @food-ordering/database exec prisma migrate deploy --schema=prisma/schema.prisma; then
  docker compose -f docker-compose.prod.yml logs --tail=200 api || true
  exit 1
fi
docker compose -f docker-compose.prod.yml up -d api
sleep 3
docker compose -f docker-compose.prod.yml build worker
docker compose -f docker-compose.prod.yml up -d worker
sleep 3
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d web
docker compose -f docker-compose.prod.yml up -d caddy

docker builder prune -f || true

echo "=========================================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=========================================================="
echo "🌐 Frontend (Customer App & Admin): https://xinchao.minstance.cloud"
echo "⚙️ Backend API & Docs:              https://xinchao.minstance.cloud/docs"
echo "🗄️ MinIO Storage Console:          http://127.0.0.1:9001"
echo "📊 Uptime Kuma Monitoring:          http://34.126.172.168:3001"
echo "=========================================================="
