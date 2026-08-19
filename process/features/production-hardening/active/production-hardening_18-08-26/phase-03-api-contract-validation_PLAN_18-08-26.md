---
name: plan:phase-03-api-contract-validation
description: "Phase 03: validate inputs and publish one canonical order contract."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-03 }
---
# Phase 03 — Input Validation and Canonical Order Contract
**Status:** ⏳ PLANNED · **Report:** `phase-03-api-contract-validation_REPORT_18-08-26.md`
## Purpose
Define a single order representation consumed by API and web, and reject malformed input before state changes.
## Entry Gate
- Phase 01 VERIFIED; existing client/API order fields and DTO paths inventoried in fresh research.
## Implementation Checklist
1. [ ] Inventory create/fetch/update order payloads and UI adapters; record each mismatch (`orderNo`/`orderNumber`, totals, statuses) before change.
2. [ ] Choose a version-neutral canonical response mapper in API/shared types; preserve a deliberate compatibility adapter only where research proves active callers need it.
3. [ ] Bind DTO validation at Nest boundary using installed validation tooling and validate nested items, IDs, quantities, addresses, branch, payment metadata, and enum states.
4. [ ] Recalculate server-side order totals from authorized menu data; never trust client totals.
5. [ ] Update web order creation/retrieval display to use canonical identifiers, amounts, and statuses and safe validation errors.
6. [ ] Add contract and malformed-input tests with snapshot/shape assertions plus no-write database checks.
## Exit Gate
- `order-contract integration gate` proves AC7 (Fully-Automated); `invalid-order-input integration gate` proves AC8 (Fully-Automated). Hybrid disposable DB no-write check and agent UI error probe complete the proof boundary.
## Blockers
- Phase 01 not verified; contract consumers unknown; required client compatibility would need an unapproved public version change.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- `apps/api/src/main.ts`, order DTO/controller/service files, `packages/types/src/index.ts`, `packages/validation/**`, customer order/cart API callers, Phase 07 tests.
## Public Contracts
- Canonical order identifier, amount, and status names are documented in shared type/API response; invalid input returns safe field-level 4xx feedback.
## Blast Radius
High-risk public order API and customer UI contract. Does not define lifecycle transition policy (Phase 04).
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Create then fetch canonical order shape | Fully-Automated | AC7 |
| Malformed/nested/order-total input rejection | Fully-Automated | AC8 |
| Disposable DB no-write and calculated-total check | Hybrid | AC7–AC8 |
| Customer validation-error render probe | Agent-Probe | AC8 |
## Test Infra Improvement Notes
`TIER_ASSIGNMENTS_BLOCKED` until Phase 07 supplies routing/runner; exact commands are a PVL requirement, not guessed here.
## Resume and Execution Handoff
- Selected plan: this file after Phase 01. Validate contract: pending. Read all current order DTOs and web callers before deciding compatibility.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
