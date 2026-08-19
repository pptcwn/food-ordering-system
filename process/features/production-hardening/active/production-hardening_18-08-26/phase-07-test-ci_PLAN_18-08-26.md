---
name: plan:phase-07-test-ci
description: "Phase 07: establish isolated critical-flow regression tests and CI gates."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-07 }
---
# Phase 07 — Canonical Regression Suite and CI Gates
**Status:** ⏳ PLANNED · **Report:** `phase-07-test-ci_REPORT_18-08-26.md`
## Purpose
Replace reliance on the ad-hoc live smoke script with isolated, repeatable critical-flow checks that CI actually runs.
## Entry Gate
- Phases 01–06 VERIFIED, with reports naming stable contracts and disposable environment setup.
## Implementation Checklist
1. [ ] Establish `process/context/tests/all-tests.md` router and relevant deeper test docs from actual runner/harness evidence; record exact commands and required services.
2. [ ] Select/add an isolated test runner and fixtures for API, worker, DB, Redis, and Socket.IO without targeting production/shared business data.
3. [ ] Convert AC1–AC14 named gates into deterministic integration suites with two identities/branches and fresh seed state.
4. [ ] Add critical customer checkout/payment and staff progress journeys, including negative cases, as the AC15 regression gate.
5. [ ] Configure CI to run the new suite and fail on missing services or test failures; leave `test_smoke.ts` explicitly non-authoritative.
6. [ ] Capture coverage/gap report; any remaining external-provider/manual behavior gets a named Hybrid or Agent-Probe gate, not a vacuous green pass.
## Exit Gate
- `critical-flow automated regression gate` proves AC15 (Fully-Automated); hybrid clean-container rerun and agent inspection of CI artifacts verify isolation and reporting.
## Blockers
- Earlier contracts still drift; no disposable DB/Redis target; CI secret/provider dependency is required instead of a safe test double.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- Test context router/deeper docs, root/app package scripts, CI workflow files, new API/worker/socket integration test paths, fixture/compose test configuration, `test_smoke.ts` annotation or replacement guidance.
## Public Contracts
- CI check names and supported local commands are documented; tests use isolated data and do not require real payment/messaging provider credentials.
## Blast Radius
Test/CI infrastructure spanning all packages but does not modify product behavior. It resolves the current missing test-context blocker.
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Critical customer and staff regression suite | Fully-Automated | AC15 |
| Clean disposable container rerun | Hybrid | AC15 |
| CI artifact and isolation inspection | Agent-Probe | AC15 |
## Test Infra Improvement Notes
This phase owns resolution of the prior `TIER_ASSIGNMENTS_BLOCKED`: it must add the context router, runner mapping, exact commands, test data lifecycle, and a Known-Gap backlog rule. Known gaps may not mark AC15 PASS.
## Resume and Execution Handoff
- Selected plan: this file after Phase 06. Validate contract: pending. First research validates actual package manager and CI entrypoints rather than guessing them.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
