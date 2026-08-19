---
name: plan:phase-05-realtime-isolation
description: "Phase 05: authenticate WebSocket rooms and deliver payment updates only to the correct branch."
date: 18-08-26
metadata: { node_type: memory, type: phase-plan, feature: production-hardening, phase: phase-05 }
---
# Phase 05 — Authenticated, Branch-Isolated Realtime
**Status:** ⏳ PLANNED · **Report:** `phase-05-realtime-isolation_REPORT_18-08-26.md`
## Purpose
Authorize the live connection before it joins a branch room and carry a verified payment confirmation through to exactly the entitled staff and customer path.
## Entry Gate
- Phases 01, 02, and 04 VERIFIED, including stable role/branch, payment, and lifecycle contracts.
## Implementation Checklist
1. [ ] Map gateway handshake, room join, emitted events, client subscriptions, worker notification jobs, and failed/retry paths.
2. [ ] Authenticate connection with the Phase 01 identity verifier; derive role/branch server-side and deny unauthenticated or mismatched joins.
3. [ ] Namespace rooms/events by verified branch and minimize payloads to necessary order fields.
4. [ ] Connect verified payment result to branch notification and order event dispatch only after Phase 02 acceptance and Phase 04 state transition.
5. [ ] Add connection rejection, cross-branch non-delivery, correct-branch prompt delivery, reconnect, duplicate-event, and provider-failure tests.
## Exit Gate
- `branch-realtime delivery integration gate` proves AC11 (Fully-Automated); `live-update authorization integration gate` proves AC12 (Fully-Automated); hybrid disposable Socket.IO/Redis run and agent staff dashboard observation complete proof.
## Blockers
- Dependencies not verified; gateway cannot verify identity from safe handshake data; event transport cannot be tested without isolated Redis/socket target.
## Phase Loop Progress
- [ ] 1. RESEARCH
- [ ] 2. INNOVATE
- [ ] 3. PLAN-SUPPLEMENT
- [ ] 4. PVL
- [ ] 5. EXECUTE
- [ ] 6. EVL
- [ ] 7. UPDATE PROCESS
## Touchpoints
- `apps/api/src/websocket/events.gateway.ts`, order/payment event publishers, `apps/worker/src/processors/notifications.processor.ts`, web socket clients, Phase 07 tests.
## Public Contracts
- Protected socket connections require verified identity; rooms are not client-authoritative; event payload is branch-scoped and versioned only if research finds external consumers.
## Blast Radius
High-risk realtime trust boundary and async notification path. No payment matching changes (02) or lifecycle changes (04).
## Verification Evidence
| Gate / Scenario | Strategy | Proves SPEC criterion |
|---|---|---|
| Verified payment reaches exactly its branch | Fully-Automated | AC11 |
| Invalid/wrong-branch connection gets no protected event | Fully-Automated | AC12 |
| Disposable Redis/Socket.IO notification path | Hybrid | AC11–AC12 |
| Staff dashboard event/payload inspection | Agent-Probe | AC11–AC12 |
## Test Infra Improvement Notes
Phase 07 must create a controlled socket test target; no deployed gateway or live Telegram/LINE call is valid automation evidence.
## Resume and Execution Handoff
- Selected plan: this file only after 01/02/04 reports. Validate contract: pending. Start with gateway/event topology research.
## Validate Contract
(placeholder — vc-validate-agent writes this section before EXECUTE)
