# Phase Blast Radius Registry

Single-owner planning strategy: the environment does not provide a coordinated planning team API, so these plan artifacts were produced serially to prevent concurrent-write conflicts. Execution remains sequential because all later phases depend on earlier security and contract guarantees.

## Phase 01

Primary ownership: `apps/api/src/auth/**`, access guards/decorators, controllers/services enforcing customer/staff ownership and branch scope.

## Phase 02

Primary ownership: payment verification and branch receiving-detail use in `apps/api/src/payments/**`, `apps/worker/src/processors/payment-events.processor.ts`, and payment display path.

## Phase 03

Primary ownership: DTO/validation schemas, order response mapper, shared order types, and customer order UI API adapter.

## Phase 04

Primary ownership: order and delivery transition policy, branch availability enforcement, and kitchen/delivery action callers.

## Phase 05

Primary ownership: `apps/api/src/websocket/events.gateway.ts`, authenticated room membership, event payload filtering, and payment-to-notification dispatch.

## Phase 06

Primary ownership: `packages/database/prisma/**`, Docker/CI/runtime version declarations and reproducible seed/migration scripts.

## Phase 07

Primary ownership: isolated test harness, critical-flow integration tests, and CI test gates. It consumes prior contracts without changing their behavior.

## Phase 08

Primary ownership: README/operator runbooks, context correction, and non-destructive production evidence procedure. No product behavior changes.

## Potential Blast Radius Conflicts

Phase 02 and Phase 05 both consume payment-confirmation events; Phase 02 owns payment correctness and Phase 05 owns fan-out/room delivery. Phase 03 and Phase 04 both consume order state; Phase 03 owns the canonical shape, Phase 04 owns allowed transitions. Later phases must not alter earlier owned contracts without returning through their selected plan.
