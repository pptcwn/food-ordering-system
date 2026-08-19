# LINE Food Ordering Platform - All Context

Last updated: 2026-08-18

This file is the root context entrypoint for the repository.
It documents the architecture, data models, workflows, conventions, and operational procedures for the LINE Official Account Food Ordering platform.

---

## Project Overview

A complete end-to-end food ordering system designed for Thai restaurants and multi-branch operations.
Customers order through LINE LIFF without installing native mobile apps, complete QR/bank transfer payments, and upload payment slips for automated OCR verification via Slip2Go API.
Store staff and kitchen manage orders in realtime via WebSocket-powered Kitchen and Delivery dashboards, and administrators receive instant notifications via Telegram groups separated by branch.

### Target Audience & User Roles
- **CUSTOMER**: Accesses LINE LIFF App from LINE OA Rich Menu, browses menu, customizes modifiers, places orders, uploads slips, tracks live status.
- **SUPER_ADMIN / ADMIN**: Manages products, categories, pricing, availability (sold-out toggle), view payments, audit logs, and reports.
- **BRANCH_MANAGER**: Manages branch settings, branch-specific telegram alerts, and branch orders.
- **KITCHEN**: Uses Realtime Kitchen Dashboard (`/kitchen`) with sound alerts to mark orders `PREPARING` and `READY`.
- **DELIVERY**: Uses Delivery Dashboard to pick up orders, set `OUT_FOR_DELIVERY`, and mark `DELIVERED`.
- **STAFF**: General counter/store operations.

---

## Technology Stack

### Monorepo Structure (`pnpm`)
```text
food-ordering/
├── apps/
│   ├── web/      # Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Socket.IO Client
│   ├── api/      # NestJS REST API, WebSocket Gateway (Socket.IO), Prisma ORM, BullMQ Producer
│   └── worker/   # NestJS / BullMQ Background Consumer (Slip2Go verification, Telegram & LINE messaging)
└── packages/
    ├── database/ # Prisma schema, migrations, and seed scripts
    ├── types/    # Shared TypeScript interfaces, enums, DTOs, and event payloads
    ├── validation/# Shared Zod validation schemas
    └── config/   # Shared configuration constants
```

### Core Technologies
- **Language**: TypeScript (Node.js >= 22 / pnpm)
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, LINE LIFF SDK
- **Backend API**: NestJS (Modular Monolith) + Socket.IO WebSockets
- **Background Worker**: BullMQ with Redis 7
- **Database**: PostgreSQL 16 with Prisma ORM
- **Object Storage**: MinIO (Self-hosted S3 compatible)
  - `food-products`: Public
  - `food-slips`: Private (5-15 min Presigned URLs)
  - `food-receipts`: Private
  - `food-delivery`: Private
- **Integrations**:
  - **LINE**: LIFF SDK, LINE Messaging API, LINE Login / ID Token verification, LINE Webhooks
  - **Slip2Go**: Automated bank transfer slip OCR verification
  - **Telegram Bot API**: Instant order alerts sent to branch-specific and HQ chat groups
  - **Infrastructure**: Google Cloud Compute Engine (GCP VM), Docker Compose, GitHub Actions CI/CD

---

## Key Workflows & State Machines

### 1. Order State Machine
`DRAFT` -> `PENDING_PAYMENT` -> `PAYMENT_VERIFYING` -> `PAID` -> `CONFIRMED` -> `PREPARING` -> `READY` -> `OUT_FOR_DELIVERY` -> `DELIVERED` -> `COMPLETED`
- Alternate branch: `PENDING_PAYMENT` -> `CANCELLED` / `EXPIRED`
- Alternate branch: `PAYMENT_VERIFYING` -> `PAYMENT_FAILED` / `MANUAL_REVIEW`
- Alternate branch: `OUT_FOR_DELIVERY` -> `DELIVERY_FAILED`

### 2. Payment State Machine
`PENDING` -> `VERIFYING` -> `VERIFIED` (or `FAILED`, `MANUAL_REVIEW`, `REFUNDED`)
- **Anti-Duplicate Slip Constraint**: `UNIQUE(transaction_ref)` in `payments` table guarantees idempotent slip processing at the database level.
- **Slip Validation Rules**:
  1. Valid Slip format from Slip2Go
  2. Duplicate check against `transaction_ref`
  3. Receiver account matches branch configuration
  4. Transfer amount exactly matches calculated Order total
  5. Transfer timestamp >= Order `created_at` timestamp
  6. Order is not expired and not already paid

### 3. Product Availability (Sold Out Toggle)
- Kitchen or Admin can toggle `is_available: false` immediately for any product.
- Backend clears Redis cache (`menu:branch:{branchId}`) and emits WebSocket event `product.availability.changed`.
- LIFF and Kitchen UI update instantly; checkout endpoint strictly re-validates `is_available` to prevent race conditions.

---

## Repository Routing & Next Steps

| Task Area | Primary Path |
|---|---|
| Database & Schema | `packages/database/prisma/schema.prisma` |
| Shared Types & Enums | `packages/types/src/index.ts` |
| NestJS Backend API | `apps/api/src/` |
| BullMQ Worker | `apps/worker/src/` |
| Next.js Frontend | `apps/web/src/` |
| Environment & Docker | `docker-compose.yml`, `.env.example` |

## Testing and Quality
Please refer to process/context/tests/all-tests.md for the comprehensive testing strategy, runner configurations, required services, and the AC15 critical flow E2E regression suite. Tests are fully automated in the CI pipeline (GitHub Actions).

