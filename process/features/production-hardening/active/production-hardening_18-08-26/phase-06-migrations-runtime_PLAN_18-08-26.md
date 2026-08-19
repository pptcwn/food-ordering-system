---
name: plan:phase-06-migrations-runtime
description: "Phase 06: establish reproducible migrations, seed data, and runtime/deployment consistency."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-06 }
---
# Phase 06 — Database Migration, Seed, Runtime, and Deployment Consistency
**Status:** ⏳ PLANNED · **Report:** `phase-06-migrations-runtime_REPORT_18-08-26.md`
## Purpose
Make a fresh disposable environment reproduce the supported schema and baseline data with aligned runtime versions and clear missing-service failures.
## Entry Gate
- Phases 02–05 VERIFIED; actual schema deltas and data assumptions documented by their reports.
## Implementation Checklist
1. [ ] Compare Prisma schema, existing migration history, seed script, package scripts, Docker compose, CI, and context claims; record immutable baseline.
2. [ ] Create only forward, reviewable Prisma migrations for approved schema deltas; never use reset, force push, or broad remote reconciliation.
3. [ ] Make seed deterministic and idempotent for disposable environments with stable branch/role/menu/payment-detail baseline.
4. [ ] Align supported Node/pnpm/runtime declarations and remove success-masking deployment behavior such as ignored migration failure.
5. [ ] Add fresh disposable Postgres migration+seed+startup checks and missing DB/Redis dependency failure checks.
## Exit Gate
- `clean-environment migration-and-seed gate` proves AC13 (Fully-Automated); `environment-consistency gate` proves AC14 (Fully-Automated); hybrid compose smoke and agent configuration review complete proof.
## Blockers
- Unknown production migration history; safe forward migration cannot be derived; shared database target is the only available environment; required service images unavailable.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/**`, `packages/database/prisma/seed.ts`, root/app package manifests, `docker-compose.yml`, `docker-compose.prod.yml`, CI files, `.env.example`.
## Public Contracts
- Supported local/CI runtime versions and migration command are explicit; migration failure fails closed; seed produces documented baseline only in disposable target.
## Blast Radius
Critical schema/runtime/deploy surface. No production migration execution and no unrelated config cleanup.
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Fresh migration then idempotent seed | Fully-Automated | AC13 |
| Runtime/version/service-unavailable matrix | Fully-Automated | AC14 |
| Disposable compose API/worker startup | Hybrid | AC13–AC14 |
| Config/documented-command review | Agent-Probe | AC14 |
## Test Infra Improvement Notes
Requires Phase 07 canonical harness; Phase 06 may establish reproducible test prerequisites but must not claim live DB/provider proof.
## Resume and Execution Handoff
- Selected plan: this file after phase 02–05 reports. Validate contract pending. Research must compare remote/local history read-only before authoring migration.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
