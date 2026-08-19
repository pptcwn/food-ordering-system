# Production Hardening — Program SPEC

> **Program-level (umbrella) SPEC.** This document is written once for the whole hardening program and governs every subsequent phase.

## Summary

Make the food-ordering service safe and dependable for customers and staff before broader product work continues. Customers must be able to place and pay for orders without another person accessing or changing them; staff must receive trustworthy, branch-specific updates; and the business must have repeatable proof that changes can be deployed and kept working.

## User Stories / Jobs To Be Done

- As a customer, I want only my own cart, order, payment evidence, and delivery details to be accessible to me, so that my personal information and orders stay private.
- As a customer, I want the payment result to reflect a real, matching transfer, so that I know whether my order can proceed and do not pay twice.
- As kitchen and delivery staff, I want to see and change only the orders assigned to my branch and role, so that work is accurate and no other branch is affected.
- As a restaurant manager, I want order progress to follow valid steps and reach staff promptly, so that customers receive accurate status updates.
- As an operator, I want releases and checks to be repeatable, so that a deployment cannot silently lose data, skip required changes, or reintroduce critical risks.

## What The User Wants (Behavioral Outcomes)

- A missing, invalid, expired, or insufficient login must not grant access to protected customer or staff actions.
- Every customer and staff action must be limited to the information and branch they are entitled to use.
- An order is accepted only after its payment evidence satisfies the restaurant's stated matching rules; uncertain evidence is clearly held for review rather than treated as paid.
- Customers and staff see consistent order numbers, amounts, and statuses wherever they interact with an order.
- Order progress follows the intended journey. A person cannot jump an order to an unrelated state or act outside their role.
- Payment confirmation and order updates reach the appropriate people promptly, without exposing another branch's information.
- Releases apply all required data changes predictably, and routine checks prove critical flows before a release is trusted.
- Run, test, and deployment guidance describes the system as it actually works.

## Flow / State Diagram

```text
[Customer opens ordering service]
              |
              v
       {identity is valid?} -- no --> [deny access or offer permitted guest flow]
              |
             yes
              v
 [customer edits own cart and creates own order]
              |
              v
 [customer submits payment evidence]
              |
              v
 {evidence matches order and receiving branch?}
       | yes                              | no / uncertain
       v                                  v
[payment confirmed]              [reject or hold for review]
       |                                  |
       v                                  v
[notify only the correct branch]  [show clear next action]
       |
       v
[valid kitchen and delivery progress] --> [customer sees current status]
```

## Acceptance Criteria (Testable Outcomes)

- AC1: A visitor with no valid identity cannot use protected customer or staff actions, and is never treated as a privileged staff member.
  proven by: new authentication-denial integration gate, based on the current smoke-test request flow
  strategy: Fully-Automated

- AC2: A customer cannot view, alter, upload evidence for, or otherwise act on another customer's cart, order, payment, or delivery information.
  proven by: new customer-ownership integration gate, covering the current cart and order smoke-test flows with two separate identities
  strategy: Fully-Automated

- AC3: A staff member cannot read or change orders, payments, or live updates belonging to another branch or a role outside their authority.
  proven by: new staff-role-and-branch-isolation integration gate
  strategy: Fully-Automated

- AC4: Invalid, incomplete, duplicate, mismatched, late, or already-used payment evidence does not mark an order paid; the customer receives a clear failure or review outcome.
  proven by: new payment-evidence integration gate, derived from the documented payment matching rules
  strategy: Fully-Automated

- AC5: Payment confirmation is accepted only when the receiving account, amount, time, order state, and transaction uniqueness match the receiving branch's rules.
  proven by: new payment-matching integration gate
  strategy: Fully-Automated

- AC6: The payment code shown to a customer reflects the selected branch's configured receiving details rather than a shared or fixed destination.
  proven by: new branch-payment-details integration gate
  strategy: Fully-Automated

- AC7: The ordering screens and service responses present one consistent order identifier, amount, and status for a newly created order and when it is retrieved later.
  proven by: new order-contract integration gate extending the current create-and-fetch smoke-test flow
  strategy: Fully-Automated

- AC8: Invalid or malformed ordering input is rejected with clear, safe feedback before it creates or changes an order.
  proven by: new invalid-order-input integration gate
  strategy: Fully-Automated

- AC9: Only the permitted next step in an order's lifecycle is accepted, and only the matching staff role can perform that step.
  proven by: new order-transition-and-role integration gate extending the current kitchen and rider smoke-test sequence
  strategy: Fully-Automated

- AC10: An order cannot progress when the selected branch is unavailable for the requested fulfillment, and the customer is told what to do next.
  proven by: new branch-availability order integration gate
  strategy: Fully-Automated

- AC11: After payment is confirmed, the correct branch receives the order update promptly; other branches do not receive its details.
  proven by: new branch-realtime delivery integration gate
  strategy: Fully-Automated

- AC12: A live-update connection without valid staff identity or correct branch membership receives no protected order updates.
  proven by: new live-update authorization integration gate
  strategy: Fully-Automated

- AC13: A fresh environment can apply the required data changes without silently skipping any, and it starts with the expected baseline data.
  proven by: new clean-environment migration-and-seed gate
  strategy: Fully-Automated

- AC14: The supported build, runtime, and continuous-check environments use mutually compatible versions and fail clearly when a required service is unavailable.
  proven by: new environment-consistency gate
  strategy: Fully-Automated

- AC15: The critical customer order journey and the staff order-progress journey are exercised automatically before the program is closed; a passing check cannot rely only on the existing live smoke test.
  proven by: critical-flow automated regression gate
  strategy: Fully-Automated

- AC16: The published run, test, and deployment instructions are usable by an operator and match the checked behavior of the service.
  proven by: operator documentation walkthrough against the automated gates
  strategy: Hybrid

- AC17: Delivery of a production release is accompanied by a controlled, non-destructive live check of the customer-facing health and order-status experience.
  proven by: production release smoke evidence using a dedicated safe test account or order
  strategy: Hybrid

## Out Of Scope

- Adding new customer-facing ordering features, payment methods, loyalty programs, or reporting features.
- Redesigning the menu, customer interface, kitchen interface, or delivery interface beyond changes needed to communicate safe validation and status outcomes.
- Replacing external payment, messaging, or hosting providers.
- Retrofitting historical records beyond the repair or preservation required to safely introduce the program's changes.
- Changing pricing, delivery coverage, or restaurant business policy except where existing rules must be enforced consistently.

## Constraints

- Work proceeds in this risk order: identity and ownership; payment safety; input and contract consistency; order progression; branch-isolated live updates; data and release consistency; automated checks; then documentation.
- The program must preserve the supported customer, manager, kitchen, and delivery roles and their existing business responsibilities.
- No phase may claim a critical flow is safe solely because it builds, type-checks, or receives a successful network response.
- Automatable behavior must receive an automated integration or end-to-end gate. Manual or live evidence is supplemental only where a real external service or production environment is involved.
- Existing operational data and supported customer workflows must be protected during release work.
- The current repository has no test-context router and only one ad-hoc live smoke script; the program must establish verification evidence without representing that baseline as comprehensive automated coverage.
- This is an umbrella requirement document. Later phases may record newly found gaps for follow-up but must not alter this document after planning begins.

## Open Questions

- None

## Background / Research Findings

- The service spans customer ordering, staff operation, background payment handling, shared data, and live updates across a multi-branch restaurant workflow.
- Research identified a fail-open access path capable of assigning privileged access when identity is absent or invalid, along with incomplete ownership protection.
- Payment research found incomplete receiving-account checks and a path that can accept simulated payment evidence; branch payment details are not consistently isolated.
- The customer and service sides disagree on some order fields, while status updates can bypass the intended progression.
- Live-update rooms lack sufficient identity and branch controls, and a confirmed payment does not complete every required notification path.
- Required data-change history is absent even though releases expect it; runtime-version and context documentation disagree.
- The repository currently has one ad-hoc `test_smoke.ts` script that sends requests to a live service and exercises health, branch lookup, menu, cart, order creation, retrieval, and several staff status changes. It is useful evidence of the current flow, but it is not an isolated automated test suite and does not cover the critical negative cases above.
- User direction: "แก้ตามลำดับเลย" — fix everything in the stated risk order.
