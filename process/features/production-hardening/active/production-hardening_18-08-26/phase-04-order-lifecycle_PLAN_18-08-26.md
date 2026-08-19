---
name: plan:phase-04-order-lifecycle
description: "Phase 04: enforce permitted order transitions, staff roles, and branch availability."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-04 }
---
# Phase 04 — Order and Delivery Lifecycle
**Status:** ⏳ PLANNED · **Report:** `phase-04-order-lifecycle_REPORT_18-08-26.md`
## Purpose
Make the documented lifecycle executable: only a permitted role may move its branch order to its next allowed state, and unavailable fulfillment is rejected before progression.
## Entry Gate
- Phases 01 and 03 VERIFIED; canonical status/value contract available.
## Implementation Checklist
1. [ ] Reconcile actual Prisma enums and current status callers with documented order/payment/delivery transitions.
2. [ ] Implement a single transition policy mapping current state + action + role + branch to allowed next state; retire generic bypasses.
3. [ ] Enforce branch operating/fulfillment availability at checkout and relevant progression points with explicit customer next action.
4. [ ] Update kitchen/delivery callers to request named actions rather than arbitrary statuses.
5. [ ] Add tests for every legal path and representative skip/wrong-role/wrong-branch/closed-branch failures; verify no invalid state persisted.
## Exit Gate
- `order-transition-and-role integration gate` proves AC9 (Fully-Automated); `branch-availability order integration gate` proves AC10 (Fully-Automated); disposable DB state-history check and staff/customer experience probe complete evidence.
## Blockers
- Phase 03 contract unsettled; lifecycle business rule conflicts found; branch availability source is missing or ambiguous.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- `apps/api/src/orders/**`, delivery/kitchen controllers/services, branch settings/service, kitchen/delivery web action callers, `packages/types/src/index.ts`, Phase 07 tests.
## Public Contracts
- Status mutation accepts named allowed action or validated target only; forbidden transition returns safe conflict/forbidden result; availability result explains next action.
## Blast Radius
High-risk state machine. Phase owns transition rules, not auth primitives (01) or realtime delivery (05).
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Legal/illegal transition and role matrix | Fully-Automated | AC9 |
| Closed/unavailable branch checkout matrix | Fully-Automated | AC10 |
| Disposable DB state transition audit | Hybrid | AC9–AC10 |
| Kitchen/delivery/customer status feedback probe | Agent-Probe | AC9–AC10 |
## Test Infra Improvement Notes
Exact runner remains blocked by absent router; Phase 07 converts these gate names into executable deterministic commands.
## Resume and Execution Handoff
- Selected plan: this file after reports for 01 and 03. Validate contract: pending. Do not add unreviewed status values.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
