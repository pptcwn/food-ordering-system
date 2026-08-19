---
name: plan:phase-01-identity-access
description: "Phase 01: deny fail-open access and enforce ownership, role, and server-authoritative branch scope."
date: 18-08-26
metadata:
  node_type: memory
  type: phase-plan
  feature: production-hardening
  phase: phase-01
---

# Phase 01 — Identity, Authorization, Ownership, and Branch Scope

**Program:** Production Hardening · **Status:** ⏳ PLANNED · **Date:** 18-08-26 · **Complexity**: PHASE PROGRAM / high-risk trust-boundary phase · **Report:** `phase-01-identity-access_REPORT_18-08-26.md`

## Overview

Phase 01 is the first executable phase of the frozen Production Hardening program. It establishes fail-closed REST identity, customer ownership, staff role checks, and persisted branch isolation without changing payment matching, order-contract semantics, lifecycle policy, WebSocket transport, migrations, broad CI, or later-phase documentation. Its planned proof boundary is the isolated authorization fixture and verification evidence already defined below.

## Purpose

Remove fail-open identity behavior and establish the authorization policy that all REST callers must follow. Customer actions require a verified customer identity; staff actions require a verified staff identity, permitted role, and server-authoritative branch scope. This phase establishes the trust boundary required by later payment, lifecycle, realtime, and test-expansion phases.

## Entry Gate

- Frozen SPEC and umbrella plan present; no prior phase required.
- Fresh RESEARCH must confirm each route implementation and web caller named below before EXECUTE.
- `process/context/tests/all-tests.md` is absent. The Phase 01 harness decision remains provisional until fresh research identifies the installed test runner and dependency capability.

## Authorization Decisions

- Apply authentication globally to API routes, then use one explicit public-route decorator or a centrally maintained allowlist. EXECUTE must select one mechanism and document the exact implementation after source discovery; it must not rely on a guard's implicit fall-through.
- Explicit public routes are limited to health, verified LINE webhook receipt, authentication exchange endpoints, public branch/menu/product reads, and delivery-fee calculation. The LINE webhook remains public only because it independently verifies its required signature; it is never a user-authentication bypass.
- Resolve the guest model by removing anonymous mutable `x-session-id` authority from cart, checkout, order, payment, and upload actions. A permitted guest may read only the documented public catalog and fee-estimate routes. A customer must authenticate through the supported LINE identity exchange before a cart is created or changed, checkout occurs, or an order/payment is read or changed. If source research proves a supported anonymous draft-cart requirement, it must use a server-issued opaque, expiry-bound, non-privileged draft capability and requires a plan supplement before implementation.
- JWT verification accepts only configured, non-empty runtime secrets/keys. Missing, malformed, expired, or fallback-secret tokens are unauthenticated (`401`) and must never synthesize a user, role, branch, or default administrator.
- Remove default-admin bootstrap/default-password login behavior. Initial privileged-user provisioning requires an explicit deployment-time bootstrap procedure with required environment configuration; startup and login fail safely if it is absent or invalid. Secrets are required configuration, never source fallbacks.
- The authenticated server principal is authoritative. For every non-`SUPER_ADMIN` staff action, effective branch scope derives from the persisted `user.staff.branchId`, not request `branchId`, `staffId`, body fields, or token display claims. Such fields may be accepted only as equality-constrained filters and otherwise return `403`. `SUPER_ADMIN` may act across branches only after normal authentication and role proof; its cross-branch selection remains auditable.
- Customer resource lookups compose the caller's user ID into the query predicate. A foreign or non-existent customer resource has the same normalized `404` response where revealing existence would be unsafe. Staff cross-branch attempts return `403`; absent/invalid identity returns `401`; valid identity lacking a permitted role returns `403`.

## Public/Protected Route Matrix

The matrix is the Phase 01 policy target. Route shape and web caller names are source-derived from the current controllers and `apps/web/src`; fresh research must add any route not represented here before EXECUTE. `Public` means no JWT but still applies the listed route-specific proof.

| Method / route | Principal or permitted guest proof | Owner / branch predicate | Denial | Affected web caller |
|---|---|---|---|---|
| `GET /health` | Public health probe | No customer/staff data returned | `200` degraded status; not an auth denial | Deployment/runtime probe; no app page identified |
| `POST /webhooks/line` | Public only with valid `x-line-signature` over raw body | Webhook signature, not a user branch choice | `401` invalid/missing signature | LINE platform, not web UI |
| `POST /auth/line`, `POST /auth/admin/login`, `POST /auth/refresh` | Public exchange only; verified LINE/admin credentials or refresh-token proof | Server establishes principal; no caller-supplied role/branch accepted | normalized `401` invalid credentials/token | `app/login/page.tsx`, `app/admin/login/page.tsx` |
| `GET /branches`, `GET /branches/nearest`, `GET /branches/:id`, `GET /menu`, `GET /products/:id`, `POST /delivery/calculate-fee` | Permitted public catalog/estimate guest | No protected order/customer/staff data; branch ID is lookup/estimate only | normalized `404` for absent public resource or validation-safe `400` | `app/menu/page.tsx`, checkout/menu flow |
| `GET /cart`; `POST /cart/items`; `PATCH`/`DELETE /cart/items/:id`; `DELETE /cart` | Verified customer JWT | Cart and item lookup includes `userId = principal.id`; requested branch is catalog selection, never staff scope | `401` no valid identity; normalized `404` foreign item/cart; no write | `app/cart/page.tsx`, `app/menu/page.tsx`, `app/checkout/page.tsx`, `components/BottomNav.tsx` |
| `POST /orders` (checkout); `GET /orders/my-orders` | Verified customer JWT | Checkout consumes only caller-owned cart; list predicate includes caller user ID | `401` unauthenticated; normalized `404` missing/foreign cart; no order write | `app/checkout/page.tsx`, `app/orders/page.tsx` |
| `GET /orders/:id`, `GET /orders/:id/status` | Verified customer JWT | Order predicate includes `customerId/userId = principal.id`; status cannot become a public order-enumeration oracle | `401` unauthenticated; normalized `404` absent/foreign order | `app/orders/[id]/page.tsx` |
| `POST /orders/:id/payment/slip`, `GET /orders/:id/payment` | Verified customer JWT | Payment and slip lookup joins to caller-owned order; upload destination is derived server-side from that order | `401` unauthenticated; normalized `404` absent/foreign order/payment; no object write | `app/orders/[id]/page.tsx` |
| `POST /storage/upload` | Verified permitted staff role; exact role set to be confirmed against product-management policy | Product/banner destination derives from authorized branch/product context; no customer caller may upload | `401` unauthenticated; `403` wrong role/cross-branch; no object write | `app/admin/menu/page.tsx` |
| `GET /orders/admin/all`, `PATCH /orders/admin/:id/status`, `GET /admin/payments` | Verified staff role permitted by the eventual route policy | Non-super-admin query and record predicates enforce persisted `staff.branchId`; supplied `branchId` cannot widen scope | `401` unauthenticated; `403` wrong role/foreign branch | `app/admin/page.tsx`, `app/admin/payments/page.tsx`, `app/kitchen/page.tsx`, `app/delivery/page.tsx` |
| `GET`/`PATCH /kitchen/orders/**`, `PATCH /kitchen/products/:id/availability` | Verified `KITCHEN` or permitted manager/admin role | Persisted staff branch predicate for list, detail, order, and product | `401` unauthenticated; `403` wrong role/foreign branch | `app/kitchen/page.tsx` |
| `GET`/`POST`/`PATCH /admin/deliveries/**`; `GET /delivery/jobs`, `GET/PATCH /delivery/jobs/:id/**` | Verified permitted delivery/admin staff role | Persisted staff branch predicate; delivery rider's identity, not query `staffId`, selects its jobs; assignment cannot name foreign `deliveryStaffId` | `401` unauthenticated; `403` wrong role/foreign branch/foreign staff ID | `app/delivery/page.tsx` |

## Implementation Checklist

1. [ ] Re-inventory `apps/api/src/auth/**`, global app/guard wiring, controllers, and matching services for cart, checkout/order detail/status, payment upload/detail, storage upload, kitchen, delivery, and admin list/detail; reconcile every discovered route against the Route Matrix before changing behavior.
2. [ ] Select and implement the global authentication boundary with the explicit public decorator/allowlist defined above; ensure only health, LINE webhook, credential exchanges, permitted catalog reads, and fee estimation are public, and preserve webhook signature verification as an independent gate.
3. [ ] Replace fail-open behavior in `apps/api/src/auth/jwt-auth.guard.ts` and identity issuance in `apps/api/src/auth/auth.service.ts`: reject absent, malformed, expired, and fallback-secret tokens; remove synthesized `SUPER_ADMIN`, default-admin bootstrap/default-password acceptance, and JWT secret fallbacks; require safe privileged-user provisioning and required environment configuration.
4. [ ] Make the verified server principal the only authority for customer ownership and staff branch scope. Build/reuse guarded lookup helpers so customer reads/writes join caller ID, while non-super-admin staff actions derive effective branch from persisted `user.staff.branchId`; reject supplied foreign `branchId` or `staffId` and constrain valid supplied filters to the authoritative branch.
5. [ ] Apply the customer predicate to cart/item mutations, checkout's active-cart consumption, order detail/status/history, and payment detail/slip upload. Normalize foreign/not-found customer resource denials to prevent enumeration and ensure a rejected request changes neither rows nor object storage.
6. [ ] Apply role plus persisted-branch predicates to admin order/payment list/detail/action routes, kitchen order/product routes, and delivery list/detail/assignment/rider routes. Ensure delivery job selection derives from the current rider, not query `staffId`, and assignment rejects foreign staff IDs.
7. [ ] Resolve the current guest session behavior: remove anonymous mutable session authority from all customer state-changing/protected routes, update the affected web callers to authenticate before those calls, and stop only if RESEARCH proves an explicit anonymous draft-cart product requirement that needs a follow-up supplement.
8. [ ] Establish the executable boundary before any source or test edit: prepend `E:\Nodejs` to the current PowerShell process `PATH`, invoke only `E:\Nodejs\node.exe --version`, then invoke the existing Corepack shim `E:\Nodejs\node_modules\corepack\shims\nodewin\pnpm.cmd --version`. This is a no-network availability check. If the shim is unusable or attempts to download/activate a package manager, stop and obtain an explicit network/install decision; do not run `corepack prepare`, `corepack enable`, `npm install -g`, or a package-manager command that can fetch implicitly.
9. [ ] Select the API runner from verified local dependencies only. Current manifests provide `@nestjs/testing`, TypeScript, Prisma, and `tsx`, but no runner/config/script; `node_modules/.bin` contains only TypeScript tools and `apps/api/node_modules/.bin` contains Nest CLI support, not a runner. If the Corepack check succeeds and no installed runner is discovered, record the required scoped installation decision before mutating the lockfile: add `jest`, `ts-jest`, `@types/jest`, `supertest`, and `@types/supertest` only as `apps/api` development dependencies, then create the API-only test script/config/bootstrap. If dependency installation cannot be performed without network approval or lockfile integrity cannot be preserved, stop Phase 01 before source edits; never substitute `test_smoke.ts` or a live HTTP target.
10. [ ] Create the dedicated, disposable fixture only after the runner decision: add a new test-only compose file (planned path `docker-compose.authz-test.yml`) with Postgres and Redis services only; no `container_name`, no `restart`, no `env_file: .env`, no inheritance from `docker-compose.yml`/`docker-compose.prod.yml`, no MinIO/provider/API/worker/web service, and only anonymous volumes (`/var/lib/postgresql/data`, `/data`). Generate a per-run temporary environment file outside version control with a UUID-derived compose project name, test-only database name, generated non-secret test JWT values, and non-default unique host ports; use that same generated file for all fixture commands. The API test process must receive a `DATABASE_URL` and Redis URL assembled solely from those generated values plus an in-memory storage spy/fake endpoint, never a MinIO endpoint.
11. [ ] Validate fixture identity before `up`: render only the new compose file with its temporary environment, then fail closed unless (a) every service name is test-only, (b) no declared or rendered volume name equals `postgres_data`, `redis_data`, `minio_data`, or `uptime_kuma_data`, (c) no service has `container_name`, `restart`, `env_file`, or an external network, (d) rendered `DATABASE_URL` and Redis URL contain the generated project/ports and do not equal values from `.env`/`.env.example`, and (e) the selected host ports are unbound. Do not start the stack when any check cannot be inspected or fails.
12. [ ] Start only the rendered disposable project, wait for its Postgres/Redis health, apply the schema to the generated test database without seeding shared data, and run the API bootstrap against the temporary environment. The test bootstrap must generate two customers, two branches, staff records/roles, owned and foreign records, and valid/invalid/expired/fallback-secret JWT fixtures; it must replace object storage with an in-process spy that can assert no write occurred. No LINE, Slip2Go, Telegram, MinIO, or externally hosted endpoint is reachable from this harness.
13. [ ] Add isolated authorization gates with two customer identities, two staff branches, permitted/wrong roles, and the generated JWT fixtures. Assert the matrix's precise `401`, `403`, and normalized `404` outcomes; after every rejected mutation, query only the generated test database and storage spy to prove no row/object changed. The runner command must target the new API test config/path only, never the monorepo-wide `pnpm test` until Phase 07 owns it.
14. [ ] Teardown in a `finally`/equivalent lifecycle path: stop the exact UUID-named compose project with the exact generated compose file and temporary env, remove only anonymous volumes created by that project, delete the temporary env file, and verify the default compose projects/volumes remain untouched. Never invoke `docker compose down -v` without `-p <generated-project> -f docker-compose.authz-test.yml --env-file <generated-temp-env>`; never invoke `docker volume prune`, `docker system prune`, `docker compose -f docker-compose.yml down -v`, `docker compose -f docker-compose.prod.yml down -v`, `prisma migrate reset`, `prisma db push` without the generated test URL, or `test_smoke.ts`.
15. [ ] Run the selected API type/build check and the isolated authorization command only after the runner, render validation, health, schema application, and fixture identity checks have passed. Record exact executable paths, the runner decision, generated-project evidence (with no secrets), rendered-config safety result, setup/teardown result, and all gate outcomes in the Phase 01 report. If Docker, Corepack/pnpm, or the scoped dependency installation cannot establish this non-production fixture, record `BLOCKED`, clean up only the known UUID project if created, and do not edit application authorization code or fall back to live smoke.

## Negative-Case Matrix

| Scenario | Expected result | No-write proof |
|---|---|---|
| No token, malformed token, expired token, or token signed with a former/fallback secret on every protected route family | `401`, no principal/role/branch synthesized | No cart/order/payment/delivery/storage change |
| Customer A requests or mutates Customer B cart item/cart, order detail/status, payment detail/slip, or customer-scoped upload | normalized `404`, identical for foreign and absent resource | Customer B rows and test storage unchanged |
| Customer submits checkout for a cart not owned by caller | normalized `404` | No new order/payment rows |
| Valid customer calls staff/admin/kitchen/delivery/storage management route | `403` | No order status/product/delivery/object change |
| Valid staff role outside route permission calls a protected staff route | `403` | No affected row/object change |
| Non-super-admin supplies foreign `branchId`, foreign `staffId`, or targets foreign branch order/payment/delivery/product | `403` | No list leakage and no mutation/object write |
| Same staff action against nonexistent and foreign customer-owned resource | normalized `404` for customer scope; no ownership disclosure | No affected row/object change |

## Exit Gate

- AC1 proven by `authentication-denial integration gate` (strategy: Fully-Automated); AC2 by `customer-ownership integration gate` (strategy: Fully-Automated); AC3 by `staff-role-and-branch-isolation integration gate` (strategy: Fully-Automated).
- The Phase 01 harness gate is provisional until research confirms the runner and scripts: `isolated-api-authz-<confirmed-runner> [disposable-db + disposable-redis + generated-jwt-fixtures]`. It must run only against disposable resources, reset only those resources, and include no-write assertions after rejection.
- Hybrid disposable-database request run verifies no protected row changed after each denied request. Agent probe compares foreign versus absent customer-resource responses and confirms they are non-enumerating. WebSocket event authorization is not implemented in this phase; Phase 05 depends on this Phase 01 entitlement policy and must prove live-update isolation separately.
- Report records confirmed commands, fixture boundaries, state checks, errors, user-facing behavior, and the exact unimplemented proof, if any. No production access.

## Acceptance Criteria

- **AC1 — Fail-closed authentication:** Protected REST routes reject absent, malformed, expired, and fallback-secret JWTs with `401`; they never synthesize a user, role, branch, or administrator. **proven by:** Authentication-denial integration gate. **strategy:** Fully-Automated.
- **AC2 — Customer ownership isolation:** One customer cannot read or mutate another customer's cart, checkout input, order, payment, slip, or customer-scoped upload; foreign and absent protected customer resources return the normalized `404` contract and denied requests create no row or object. **proven by:** Customer-ownership integration gate. **strategy:** Fully-Automated.
- **AC3 — Staff role and branch isolation:** A wrong-role or foreign-branch staff principal cannot list or mutate protected admin, kitchen, delivery, payment, product, or storage state; client-supplied `branchId` or `staffId` cannot widen authority. **proven by:** Staff-role-and-branch-isolation integration gate. **strategy:** Fully-Automated.

## Phase Completion Rules

Phase 01 can be marked complete only when all three acceptance criteria above have passing isolated evidence, the disposable fixture safety and teardown gates pass, and the Phase 01 report records the exact executable commands and no-write proof. A conditional validate contract, missing runner, unavailable isolated fixture, failed cleanup, or any unproven Hybrid gate keeps this phase active and blocks later-phase reliance on its trust boundary.

## Dependencies and Security Risks

- Phase 02, 03, 04, and 05 consume the Phase 01 principal/branch policy. Phase 05 owns WebSocket transport implementation but must reuse the documented identity, role, and branch entitlement rules.
- Critical risk: a global guard can accidentally protect provider callbacks or valid public catalog pages. Mitigation: exact allowlist plus route-matrix tests, and the webhook's separate signature test.
- Critical risk: staff-supplied identifiers can widen data scope. Mitigation: derive effective branch/rider identity from persisted server principal and test foreign IDs as denial cases.
- Critical risk: a rejected multipart request could persist an object before authorization. Mitigation: authorize/own the parent order before accepting or persisting the file, and assert storage no-write behavior.
- Rollback: preserve a pre-change deployment artifact/configuration. If a verified supported caller fails after rollout, restore the prior application artifact only after confirming it does not re-enable fail-open access; no database or shared-storage rollback/reset belongs to this phase.

## Phase Loop Progress

- [ ] 1. RESEARCH — context/test availability and plan drift checked
- [ ] 2. INNOVATE — approach and decision summary recorded
- [x] 3. PLAN-SUPPLEMENT — PVL blockers incorporated; route matrix, authority decisions, harness, and negative gates added
- [ ] 4. PVL — validate contract written
- [ ] 5. EXECUTE — section gates green
- [ ] 6. EVL — regression/follow-up evidence recorded
- [ ] 7. UPDATE PROCESS — report, umbrella update, commit checkpoint

## Touchpoints

- Confirmed source touchpoints: `apps/api/src/auth/jwt-auth.guard.ts`, `apps/api/src/auth/auth.service.ts`, app/global guard wiring to be discovered, `apps/api/src/cart/{cart.controller,cart.service}.ts`, `apps/api/src/orders/{orders.controller,orders.service}.ts`, `apps/api/src/payments/{payments.controller,payments.service}.ts`, `apps/api/src/storage/{storage.controller,minio.service}.ts`, `apps/api/src/kitchen/{kitchen.controller,kitchen.service}.ts`, and `apps/api/src/delivery/{delivery.controller,delivery.service}.ts`.
- Confirmed web callers requiring contract review: `apps/web/src/app/{cart,checkout,menu,orders}/**`, `apps/web/src/app/orders/[id]/page.tsx`, `apps/web/src/app/{admin,kitchen,delivery}/**`, and `apps/web/src/components/BottomNav.tsx`.
- Test harness files/runner script paths are deliberately not invented; Step 8 must establish them from the actual package manifests and current test surface.

## Public Contracts

- REST authentication contract: protected endpoints require a verified configured JWT and return `401` for absent/malformed/expired/fallback-secret credentials; no implicit admin or anonymous mutable session exists.
- Customer authorization contract: customer-scoped routes use the server principal as the sole owner authority and return normalized `404` for a foreign or missing protected customer resource.
- Staff authorization contract: non-super-admin effective branch scope comes from persisted `user.staff.branchId`; `branchId` and `staffId` supplied by the client cannot broaden scope and are rejected with `403` when foreign.
- Public-route contract: only the Route Matrix's explicit public endpoints are callable without a JWT; LINE webhook processing additionally requires valid signature proof.
- WebSocket dependency contract: Phase 05 must apply the same principal/role/branch entitlement policy before joining rooms or emitting protected events; no Phase 01 gateway implementation is authorized.

## Blast Radius

High-risk API trust boundary spanning authentication, all customer state, staff branch-scoped operations, and object-storage write authorization. Phase 01 owns auth predicates, ownership predicates, branch derivation, and their minimum isolated proof. It may update directly affected web callers solely to remove reliance on anonymous mutable sessions; it may not change payment matching (Phase 02), order contract names/DTO semantics (Phase 03), lifecycle policy (Phase 04), WebSocket transport (Phase 05), migrations/runtime (Phase 06), or broad CI expansion (Phase 07).

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Authentication-denial integration gate: absent, malformed, expired, and fallback-secret JWT across protected route families | Fully-Automated | AC1 |
| Customer-ownership integration gate: two identities cover cart, checkout, order detail/status, payment detail/slip, and upload denial | Fully-Automated | AC2 |
| Staff-role-and-branch-isolation integration gate: admin/kitchen/delivery/payment actions with wrong role, foreign branch, and foreign staff ID | Fully-Automated | AC3 |
| `isolated-api-authz-<confirmed-runner>` rendered, UUID-project Postgres/Redis fixture plus rejected-mutation DB/storage no-write assertions | Hybrid | AC1–AC3 |
| Fixture-safety preflight and teardown gate: rendered compose denies persistent volumes/default `.env`, then removes only UUID-project anonymous volumes | Hybrid | AC1–AC3 |
| Foreign-versus-absent customer-resource response comparison and affected web caller safe-feedback inspection | Agent-Probe | AC1–AC3 |

## Test Infra Improvement Notes

`process/context/tests/all-tests.md` remains absent, and the project still has no configured API test runner, test script, or API bootstrap. The confirmed process-local Node executable is `E:\Nodejs\node.exe` (v24.18.1); the only candidate pnpm path is `E:\Nodejs\node_modules\corepack\shims\nodewin\pnpm.cmd`, which has not yet been invoked. Corepack availability must be checked without network first. Root declares `pnpm@9.15.4`; no runner is present in `node_modules/.bin` or `apps/api/node_modules/.bin`.

**Blocking fixture decision:** do not implement Phase 01 source changes until the availability check either proves a runner can be configured from local dependencies or an explicit network decision authorizes the narrowly scoped API dev-dependency installation. The harness must use a new test-only compose file and a generated UUID project/env, anonymous volumes only, non-default generated ports, an in-process storage spy, and cleanup scoped to that UUID project. Existing `docker-compose.yml` and `docker-compose.prod.yml` are permanently prohibited test targets because both declare persistent named PostgreSQL/Redis/MinIO volumes (and production additionally includes application services and `uptime_kuma_data`). `test_smoke.ts` remains a live mutation script and is prohibited. If Docker is unavailable, compose render cannot prove the fixture isolated, or pnpm cannot establish the runner without an approved scoped install, record `BLOCKED`; Phase 01 may not use live smoke, shared databases, or provider storage as a substitute.

## Resume and Execution Handoff

- **Selected plan file:** `process/features/production-hardening/active/production-hardening_18-08-26/phase-01-identity-access_PLAN_18-08-26.md`.
- **Last completed phase/step:** Phase 01 inner-loop Step 3, second PLAN-SUPPLEMENT; PVL must re-run against this revised plan.
- **Validate-contract status:** conditional contract remains unchanged by this supplement; the next validator must decide whether its discovery checkpoint needs revision.
- **Supporting context loaded:** frozen Phase 01 SPEC and umbrella plan; `process/context/all-context.md`; root/API/database manifests; `pnpm-lock.yaml` and `pnpm-workspace.yaml`; `.env.example`; `docker-compose.yml`; `docker-compose.prod.yml`; Prisma schema; `apps/api/src/main.ts`; `apps/api/src/app.module.ts`; and current controller/web-caller discovery. `process/context/tests/all-tests.md` is absent.
- **Fresh-agent next step:** first activate `E:\Nodejs` only in the current process and run the no-network Node/Corepack availability checks. Next select only an installed runner or obtain the explicit scoped-install decision. Before any source edit, create/render the isolated compose fixture, prove all five safety predicates in checklist Step 11, and stop/clean only the generated project on failure. Never use default compose files, their named volumes, `.env`, provider services, or `test_smoke.ts`.

## Inner Loop Refresh Note

- **Refresh trigger:** remaining EXECUTE blocker: no exact safe method to construct an isolated API authorization fixture after Node discovery.
- **Changed sections:** Implementation Checklist; Verification Evidence; Test Infra Improvement Notes; Resume and Execution Handoff; Inner Loop Refresh Note.
- **Decision preserved:** Phase 01 owns REST identity/ownership/branch entitlement only. WebSocket transport remains Phase 05; broad CI expansion remains Phase 07.
- **Open validation condition:** runner choice remains evidence-gated: current dependencies have no runner, Corepack must be available without network or an explicit scoped-install decision is required. PVL must evaluate the exact compose isolation/preflight/teardown contract before source edits resume.

## Validate Contract

Status: CONDITIONAL
Date: 18-08-26
date: 2026-08-18
generated-by: outer-pvl
supersedes: 2026-08-18 (outer-pvl) — outer PVL has current evidence after the second plan supplement

Parallel strategy: sequential
Rationale: 4/7 signals (auth/API trust boundary, phase-program dependency, container fixture, and more than five source touchpoints); the only authorized work is a strict discovery-to-fixture chain, so parallel edits could invalidate the isolation proof.

### Mandatory discovery checkpoint — the only authorized initial EXECUTE work

1. **No application authorization source edit is authorized yet.** Do not edit any file under `apps/api/src/auth/`, controllers, services, web callers, or production compose files until Steps 2–5 succeed and are recorded in the Phase 01 report.
2. In the current process only, prepend `E:\Nodejs` to `PATH`, run `E:\Nodejs\node.exe --version`, then run `E:\Nodejs\node_modules\corepack\shims\nodewin\pnpm.cmd --version`. This is availability-only and must make no network request. If it attempts activation/download or is unusable, stop and obtain an explicit scoped network/install decision.
3. Inspect only verified local manifests, lockfile, API bootstrap, source-owned test paths, and installed binaries. Select an installed runner or record the explicit decision required to add only `jest`, `ts-jest`, `@types/jest`, `supertest`, and `@types/supertest` as `apps/api` development dependencies. Do not mutate the lockfile before that decision.
4. After a runner decision, create and render only `docker-compose.authz-test.yml` with a generated UUID compose project, temporary non-versioned environment file, anonymous volumes, generated database/Redis/JWT values, and generated unbound ports. Before `up`, prove every Step 11 safety predicate: test-only services, no prohibited volume, no `container_name`/`restart`/`env_file`/external network, generated DB/Redis values distinct from `.env` values, and unbound ports.
5. If and only if the render proof passes, start the UUID project, wait for its Postgres/Redis health, use only the generated test URLs, install an in-process storage spy, and record exact setup and UUID-scoped teardown commands. Build the three Hybrid authorization gates red before any authorization implementation. If any prerequisite fails or cannot be inspected, clean up only that known UUID project if created, record `BLOCKED`, and stop without source edits.

### Exact no-live safety boundary

- Never run `test_smoke.ts`: its default target is `http://34.126.172.168:3000/api` and it creates carts, orders, and status transitions.
- Do not call live LINE, Slip2Go, Telegram, MinIO, or any externally hosted API; do not use shared, staging, or production Postgres/Redis/object storage.
- Do not deploy, seed/reset shared data, run migrations, disclose secrets, or write an object outside the discovered fake/disposable storage fixture.
- Rejected-request assertions must query only the disposable fixture and storage spy; failure or uncertainty about fixture identity is a hard stop.

### Test gates

| criterion id | behavior | strategy | proving test | gap-resolution |
|---|---|---|---|---|
| AC1 | Protected REST routes reject absent, malformed, expired, and fallback-secret JWTs without synthesizing a principal. | Hybrid | Confirmed isolated API command against the rendered UUID Postgres/Redis fixture; assert `401` and no DB/object write across protected route families. | B — exact command and harness must be established before application source edits. |
| AC2 | Customer A cannot read or mutate Customer B's cart, checkout, order, payment, slip, or customer-scoped upload. | Hybrid | Confirmed isolated API command uses two generated identities and asserts normalized `404` plus unchanged generated DB/storage spy after every denial. | B — exact command and harness must be established before application source edits. |
| AC3 | Wrong-role or foreign-branch staff requests cannot list or change admin, kitchen, delivery, payment, product, or object-storage state. | Hybrid | Confirmed isolated API command uses persisted disposable staff records in two branches and asserts `403`, no list leakage, and no DB/storage write. | B — exact command and harness must be established before application source edits. |
| AC1–AC3 | Foreign and absent customer resources have indistinguishable normalized denials; changed callers do not recreate anonymous mutable authority. | Agent-Probe | After the isolated runner passes, compare denial status/body shape and inspect each changed caller for token-required behavior; record evidence in the Phase 01 report. | B — run after implementation; not runtime authorization proof alone. |

High-risk class: auth/identity and permission/trust-boundary. Minimum tier is Hybrid. The three Hybrid rows are mandatory and currently unproven; the discovery checkpoint is the only reason the gate is CONDITIONAL rather than PASS.

Legacy line form:
- Auth, customer ownership, staff branch scope: hybrid — exact isolated command and disposable fixture preconditions are discovery-required before source edits.
- Response normalization and caller review: agent-probe — compare foreign and absent denials after isolated gate runs.

Dimension findings:
- Infra fit: PASS — the API and compose touchpoints exist; the new test-only compose fixture is mechanically specified and its render/teardown preflight must pass before application edits.
- Test coverage: CONCERN — `process/context/tests/all-tests.md`, a confirmed runner, test script, and runtime fixture evidence are absent. This contract permits only their safe discovery/construction, not an authorization change.
- Breaking changes: PASS — the route matrix explicitly classifies public endpoints and documents expected `401`/`403`/normalized `404` contracts plus caller groups; later WebSocket, order-contract, lifecycle, and CI work remains outside Phase 01 ownership.
- Security surface: PASS — fail-open admin fallback removal, required secrets, server-side predicates, and no-write denial checks are defined; source changes remain locked until the isolated proof fixture passes.
- Section 1 — route inventory and public boundary: PASS — controller and `AppModule` targets are present; the matrix prevents accidentally protecting the LINE webhook or allowed catalog reads.
- Section 2 — identity and authorization predicates: PASS — guard/auth service, cart, order, payment, storage, kitchen, and delivery targets are present; multipart authorization is explicitly before persistence.
- Section 3 — isolated proof foundation: CONCERN — runner, Docker availability, render proof, and teardown remain unproven runtime hypotheses. They are a hard stop for all authorization-source edits, not a reason to use shared/live infrastructure.

Open gaps:
- Confirmed local test runner, command, source test bootstrap, and disposable fixture implementation are absent. This is in-scope for Phase 01's minimum security proof and is not a known-gap or a waiver.
- `test_smoke.ts` is a live mutation script, not a test gate; it remains prohibited.
- Broad regression-suite and CI expansion are Phase 07 scope. WebSocket entitlement proof is Phase 05 scope.

What This Coverage Does NOT Prove:
- This contract does not yet prove any runtime authorization result, secret validation, database predicate, storage no-write behavior, or UI behavior; those require the discovered isolated Hybrid gates.
- The agent probe does not prove transport-level WebSocket authorization, load behavior, or live provider behavior.
- Static source inspection does not prove the local runner, Docker render, health checks, or UUID-scoped teardown work until the discovery checkpoint is run.

Gate: CONDITIONAL (initial EXECUTE may perform only the discovery/runner/fixture preflight above. Any auth, controller, service, web-caller, or other application source change is BLOCKED until the runner, rendered UUID fixture, safety predicates, health, and teardown evidence pass.)
Accepted by: user — `ENTER EXECUTE MODE`; accepted concern: local runner, Docker fixture, and teardown are not yet runtime-proven, with the execution scope explicitly limited to discovery and isolated fixture construction.
