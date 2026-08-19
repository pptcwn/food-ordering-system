---
name: plan:production-hardening-umbrella
description: "Eight-phase, risk-first hardening program for the food ordering platform."
date: 18-08-26
metadata:
  node_type: memory
  type: umbrella
  feature: production-hardening
  phase: umbrella
---

# Production Hardening — Umbrella Plan

**Status:** ⏳ PLANNED · **Program type:** Phase program · **Scope:** frozen SPEC AC1–AC17 only.

## Program Goal Charter

North star:
- Make customer orders, payments, staff operations, releases, and evidence safe and dependable across branches.

Definition of done:
- A valid identity and permitted branch/role are required for protected work; payment acceptance is branch-matched and idempotent; order contracts and transitions are consistent; isolated realtime works; migration/runtime and critical regression gates are repeatable; operators can run documented safe checks.

What "verified" means (program level):
- Each phase has a non-placeholder validate contract, its automated/hybrid/agent-probe gates and regression evidence recorded, database/state and error paths checked, and user confirmation where the phase exposes UI or production evidence.

Scope tiers → phase mapping:
- Tier 1 trust and money safety → Phases 01–02.
- Tier 2 contract, lifecycle, and realtime safety → Phases 03–05.
- Tier 3 release confidence and operations → Phases 06–08.
- This program retires Tiers 1–3.

Explicitly out of scope:
- New payment methods, product redesign, provider replacement, pricing/policy changes, and broad historical-data repair.

Hard safety constraints:
- Never deploy, mutate production data/storage, invoke live costful providers, expose secrets, reset databases, or run destructive migrations in this program without a separate explicit approval.
- Preserve supported roles and existing customer workflows; keep process artifacts separate from execution commits and commit each completed phase before advancing.

## Stable Program Goal

```text
TARGET: Complete the frozen Production Hardening SPEC AC1–AC17 through eight sequentially validated phases.
PER-PHASE LOOP: RESEARCH → INNOVATE → PLAN-SUPPLEMENT → PVL → EXECUTE → EVL → UPDATE-PROCESS; validate is never skipped.
HARD STOPS: no selected plan, placeholder validate contract, unresolved dependency without backlog route, or any irreversible/outward-facing action.
SAFETY: no production deploy/data mutation, destructive reset/migration, secrets exposure, or live/costful provider gate.
TEST GATES: automated / hybrid / agent-probe; known gaps remain CONDITIONAL with a follow-up, never terminal PASS.
VALIDATE CONTRACT: vc-validate-agent writes each selected phase contract before EXECUTE.
START: Phase 01, RESEARCH. Every subagent first runs vc-context-discovery and vc-plan-discovery; every phase end runs vc-agent-strategy-compare.
```

## Phase Ordering

| Phase | Selected plan | Depends on | SPEC criteria | Green check proves |
|---|---|---|---|---|
| 01 Identity and access | `phase-01-identity-access_PLAN_18-08-26.md` | — | AC1–AC3 | no fail-open identity, ownership/branch scope enforced |
| 02 Payment safety | `phase-02-payment-safety_PLAN_18-08-26.md` | 01 | AC4–AC6 | only matching branch payments can progress |
| 03 API contract/validation | `phase-03-api-contract-validation_PLAN_18-08-26.md` | 01 | AC7–AC8 | consistent safe order input/output |
| 04 Order lifecycle | `phase-04-order-lifecycle_PLAN_18-08-26.md` | 01,03 | AC9–AC10 | valid role-specific transitions and availability |
| 05 Realtime isolation | `phase-05-realtime-isolation_PLAN_18-08-26.md` | 01,02,04 | AC11–AC12 | only entitled branch connections receive events |
| 06 Migrations/runtime | `phase-06-migrations-runtime_PLAN_18-08-26.md` | 02–05 | AC13–AC14 | fresh environments are reproducible and compatible |
| 07 Test/CI | `phase-07-test-ci_PLAN_18-08-26.md` | 01–06 | AC15 | critical flows are isolated automated gates |
| 08 Operator docs | `phase-08-operator-docs_PLAN_18-08-26.md` | 06–07 | AC16–AC17 | operator guidance and safe release evidence are usable |

## Current Execution State

- Current phase: 03 of 08 — API contract/validation
- Current loop step: RESEARCH
- Phase status: ⏳ PLANNED
- Validate-contract status: pending
- Program net gate: PENDING
- Next and only selected action: run fresh research for `phase-03-api-contract-validation_PLAN_18-08-26.md`; do not execute any phase yet.

## Phase Loop Progress

Every phase follows `R → I → P → PVL → E → EVL → UP`; later phases rerun research because the repository may drift. Durable report destinations are flat beside their plan as `phase-NN-*_REPORT_18-08-26.md`.

## Pre-PVL Conflict Resolution

`apps/api/src/auth/**` is Phase 01-owned; payment processors are Phase 02-owned; order contract mapper/DTOs are Phase 03-owned; lifecycle policy is Phase 04-owned; gateway/room authorization is Phase 05-owned; Prisma/runtime is Phase 06-owned; test harness/CI is Phase 07-owned; operator docs are Phase 08-owned. Cross-phase consumers are parallel-safe only after their declared dependency exits; no concurrent execution is authorized.

## Risks and Constraints

- Critical: auth or payment changes may break existing clients; preserve explicit permitted guest flow only if research proves it exists, otherwise deny.
- Critical: no test router exists (`process/context/tests/all-tests.md` absent); tier assignments are `TIER_ASSIGNMENTS_BLOCKED` until Phase 07 establishes an evidence-backed runner.
- High: absent migration history prevents unsafe broad reconciliation; Phase 06 must use a disposable database and never reset shared/prod state.

## Resume and Execution Handoff

- Selected plan: `process/features/production-hardening/active/production-hardening_18-08-26/phase-03-api-contract-validation_PLAN_18-08-26.md`
- Last completed: Phase 02 EXECUTE and process update.
- Validate contract: pending for Phase 03.
- Context loaded: frozen SPEC, `all-context.md`, development protocols, plan templates.
- Fresh-agent next step: re-read Phase 03 and current API request/response validation logic, then report research; do not infer a different phase.

## Validate Contract

(placeholder — vc-validate-agent writes per selected phase before EXECUTE)
