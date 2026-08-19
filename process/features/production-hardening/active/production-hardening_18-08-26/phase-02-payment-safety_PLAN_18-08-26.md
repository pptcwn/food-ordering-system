---
name: plan:phase-02-payment-safety
description: "Phase 02: make branch payment details and slip verification safe and deterministic."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-02 }
---
# Phase 02 — Payment Safety and Branch Receiving Details
**Status:** ⏳ PLANNED · **Report:** `phase-02-payment-safety_REPORT_18-08-26.md`
## Purpose
Accept payment evidence only when it matches the selected branch, order, amount, time, and unique transaction; uncertain evidence remains reviewable, never paid.
## Entry Gate
- Phase 01 exit gate verified; payment/upload ownership protections are live and regression-tested.
## Implementation Checklist
1. [ ] Research exact payment model and current branch/account fields in `packages/database/prisma/schema.prisma`, API payment service, QR display, and `apps/worker/src/processors/payment-events.processor.ts`.
2. [ ] Define one branch receiving-detail source and make QR rendering retrieve it for the selected branch; reject missing/inactive detail safely.
3. [ ] Remove production-accepting simulated/mock-slip fallback; constrain any test double to isolated test configuration.
4. [ ] Verify receiver account, exact amount, created/expiry time, permitted order/payment state, and transaction uniqueness atomically before marking paid.
5. [ ] Preserve failed/manual-review states with customer-safe reason and audit correlation; prevent duplicate/replay processing.
6. [ ] Add payment-match and branch-detail integration scenarios, including duplicate, late, mismatched, incomplete, provider failure, and concurrent replay.
7. [ ] Verify database state and customer outcome in disposable environment; do not call a live provider.
## Exit Gate
- `payment-evidence integration gate` proves AC4 (Fully-Automated); `payment-matching integration gate` proves AC5 (Fully-Automated); `branch-payment-details integration gate` proves AC6 (Fully-Automated).
- Hybrid disposable DB/worker check proves transaction uniqueness and manual-review persistence; agent probe confirms QR and error language identify no sensitive account data beyond intended payment detail.
## Blockers
- Phase 01 not VERIFIED; source lacks a safe branch-account model; provider sandbox/test double cannot be isolated; migration required before Phase 06 safety plan is reconciled.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- `apps/api/src/payments/**`, payment QR/order display path, `apps/worker/src/processors/payment-events.processor.ts`, `packages/database/prisma/schema.prisma` (design input only; schema application is Phase 06), Phase 07 tests.
## Public Contracts
- Payment result is `verified`, `failed`, or `manual review`; no success result is emitted for uncertain evidence. QR destination is branch-specific.
## Blast Radius
Critical payment/worker/API surface. Owns payment matching; it must not implement websocket fan-out (Phase 05) or migration deployment (Phase 06).
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Payment-evidence negative matrix | Fully-Automated | AC4 |
| Receiver/amount/time/state/uniqueness matrix | Fully-Automated | AC5 |
| Branch-specific QR/details retrieval | Fully-Automated | AC6 |
| Disposable worker + DB transaction check | Hybrid | AC4–AC5 |
| Customer/payment-detail disclosure probe | Agent-Probe | AC4–AC6 |
## Test Infra Improvement Notes
Same `TIER_ASSIGNMENTS_BLOCKED` baseline; Phase 07 owns canonical runner. No live Slip2Go cost/request is an acceptable proof substitute.
## Resume and Execution Handoff
- Selected plan: this file after Phase 01 report and exit evidence. Validate contract: pending. Fresh research must confirm actual model/worker interfaces before implementation.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
