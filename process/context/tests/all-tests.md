# Test Context & Strategy Router

## 🎯 Scope
This document outlines the canonical testing strategy, test runner configurations, required services, and execution commands for the Food Ordering Monorepo.

## 🚀 Quick Start
Run all automated tests across the monorepo:
```bash
pnpm test
```
*Note: The API tests mock the database using SQLite or Jest mocks by default where applicable, or require a local Postgres instance if running full E2E suites.*

## 🧪 Testing Layers
1. **API Contract Validation (Phase 03)**
   - **Path**: `apps/api/test/orders/api-contract.spec.ts`
   - **Runner**: Jest
   - **Goal**: Verifies Zod validation pipes reject malformed payloads before they reach controllers.

2. **Order Lifecycle State Machine (Phase 04)**
   - **Path**: `apps/api/test/orders/lifecycle.spec.ts`
   - **Runner**: Jest
   - **Goal**: Proves role-based state transition matrices (e.g., KITCHEN cannot mark orders as DELIVERED).

3. **Realtime Isolation & WebSocket (Phase 05)**
   - **Path**: `apps/api/test/websocket/realtime-isolation.spec.ts`
   - **Runner**: Jest
   - **Goal**: Ensures clients with invalid JWT tokens are rejected, and events are strictly routed to respective branch namespaces (no global broadcast).

4. **Payment Safety (Phase 02)**
   - **Path**: `apps/api/test/payment/payment-safety.spec.ts`
   - **Runner**: Jest
   - **Goal**: Business rules validation on PromptPay slips (mismatched amount, invalid receiver, expired transfer).

5. **Critical Flow E2E Regression (Phase 07)**
   - **Path**: `apps/api/test/e2e/checkout-flow.e2e-spec.ts`
   - **Runner**: Jest / Supertest
   - **Goal**: Simulates a complete customer checkout journey, from cart to KITCHEN acceptance, asserting API responses and state changes.

## ⚙️ CI/CD Integration
Tests are strictly gated in GitHub Actions (`.github/workflows/deploy.yml`). The `test-and-verify` job will execute `pnpm test`. If any test fails, deployment to Google Cloud is blocked.

## ⚠️ Known Gaps
- Line Messaging API webhooks are tested using mocked responses (Hybrid Agent-Probe).
- Actual slip OCR extraction reliability relies on external Slip2Go sandbox; network outages will fail-closed.
- E2E tests currently require a running local or disposable database. CI sets up a lightweight Postgres service container during the run.
