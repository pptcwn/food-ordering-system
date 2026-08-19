# Food Ordering System

A monorepo for a LINE Official Account Food Ordering System built with Next.js, NestJS, and Prisma.

## 🛠 Prerequisites
- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Docker**: For running Postgres, Redis, and MinIO locally.

## 🚀 Local Development

### 1. Start Infrastructure
Start the required databases and storage services:
`bash
docker compose up -d postgres redis minio
`

### 2. Environment Variables
Copy the .env.example to .env in the root directory and fill in the required values (JWT secrets, LINE tokens, etc.).

### 3. Install Dependencies
`bash
pnpm install
`

### 4. Database Setup
Push the schema to the database and seed it with baseline data (e.g., admin users, menus, branches):
`bash
pnpm --filter @food-ordering/database db:push
pnpm --filter @food-ordering/database db:seed
`

### 5. Start the Application
Run all services concurrently (API, Web, Worker):
`bash
pnpm dev
`
- API: http://localhost:4000
- Web (Frontend): http://localhost:3000
- Prisma Studio: pnpm --filter @food-ordering/database db:studio

## 🧪 Testing

The repository uses Jest for Unit and E2E testing. 

`bash
pnpm test
`
*Note: The E2E tests require a running Postgres database. In CI, a disposable database is automatically provisioned.*

## 📦 Deployment & CI/CD

Deployment is fully automated via **GitHub Actions** (.github/workflows/deploy.yml). 
1. Pushing to the main branch triggers the 	est-and-verify job.
2. If tests pass, it triggers the deploy-to-gcp job which connects to the GCP VM via SSH.
3. The VM executes deploy-gcp.sh, pulling the latest code, running Prisma migrations safely (migrate deploy), and restarting the Docker Compose production services.

## 📝 Release Checklist & Production Smoke Test (AC17)

Before confirming a release is fully operational in production, an authorized operator should perform the following safe checks. **Do not use real customer data for smoke tests.**

### 1. Migration Pre-flight
- [ ] Check GitHub Actions for any migration failures. The deployment is designed to fail-closed if 
px prisma migrate deploy fails.

### 2. Service Health
- [ ] Verify API is reachable.
- [ ] Verify Web UI loads without 500 errors.

### 3. Safe Checkout Smoke Test
Using a designated test account (e.g., 	est_e2e@foodordering.com):
- [ ] Add an item to the cart and proceed to checkout.
- [ ] Verify the payment QR code/PromptPay payload is generated.
- [ ] Cancel the order (or simulate payment using a sandbox Slip2Go).
- [ ] Ensure the order status reflects accurately in the system.

### 4. Rollback Plan
- If a migration fails: The system does not deploy the new code. Fix the schema locally and push a new commit.
- If code fails post-deployment: Revert the git commit on main (git revert) and allow CI to redeploy the previous stable version. *Do not attempt to prisma migrate resolve or downgrade migrations manually without reviewing Prisma's downgrade guide.*
