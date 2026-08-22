# Customer Fast-Ordering Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LINE LIFF customer flow menu-first, repeat-order aware, and fast to confirm through a one-page checkout built with customized shadcn/ui components.

**Architecture:** Retain the existing Nest API, React Query queries, WebSocket invalidation, and persisted Zustand store. Add a small customer-ordering presentation layer with pure eligibility helpers and reusable shadcn-based components; routes compose those components instead of duplicating state decisions. The checkout remains server-authoritative for pricing, availability, address, and payment creation.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, shadcn/ui, Radix UI, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-customer-fast-ordering-redesign-design.md`

## Global Constraints

- Preserve all existing API paths and Prisma schema; this is a customer UI change.
- Do not overwrite the pre-existing local edits in `apps/web/src/app/checkout/page.tsx`, `apps/web/src/app/onboarding/page.tsx`, `apps/web/src/app/layout.tsx`, or `apps/web/src/app/globals.css`; inspect and merge them intentionally before each affected edit.
- Use Thai-first, direct labels and at least 16px input text.
- Support `PICKUP` and `DELIVERY` from the menu header and checkout.
- Retain server-side validation before creating an order or payment QR.
- Keep interactive controls semantic, keyboard reachable, and usable at 360px wide.
- Respect `prefers-reduced-motion` and safe-area spacing for fixed actions.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/web/components.json` | shadcn/ui generation configuration using the existing `@/*` alias. |
| `apps/web/src/components/ui/*` | Generated and theme-customized primitive components. |
| `apps/web/src/lib/customer-ordering.ts` | Pure customer flow calculations and guards. |
| `apps/web/src/lib/customer-ordering.test.ts` | Unit coverage for the flow calculations. |
| `apps/web/src/components/customer/*` | Reusable order mode, repeat order, cart, fulfilment, summary, and timeline UI. |
| `apps/web/src/app/menu/page.tsx` | Menu-first route composition. |
| `apps/web/src/app/cart/page.tsx` | Cart editing route that enters the unified confirmation flow. |
| `apps/web/src/app/checkout/page.tsx` | One-page editable confirmation and order creation. |
| `apps/web/src/app/onboarding/page.tsx` | Missing-information recovery form. |
| `apps/web/src/app/orders/page.tsx` | Compact history and repeat-order entry point. |
| `apps/web/src/app/orders/[id]/page.tsx` | Status timeline and payment/tracking screen. |
| `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts` | Focused frontend component/unit test harness. |

### Task 1: Establish the shadcn and frontend-test foundations

**Files:**
- Create: `apps/web/components.json`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/sheet.tsx`
- Create: `apps/web/src/components/ui/tabs.tsx`
- Create: `apps/web/src/components/ui/radio-group.tsx`
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Create: `apps/web/src/components/ui/alert.tsx`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/utils.ts`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces `cn(...inputs: ClassValue[]): string` from `@/lib/utils` for all generated primitives.
- Produces `pnpm --filter @food-ordering/web test:ui` to execute Vitest once.

- [ ] **Step 1: Inspect the pre-existing customer UI diff and record its intent before generating primitives.**

Run: `git diff -- apps/web/src/app/globals.css apps/web/src/app/layout.tsx apps/web/src/app/checkout/page.tsx apps/web/src/app/onboarding/page.tsx`

Expected: the implementer can distinguish user-authored changes from this redesign before modifying shared styling or routes.

- [ ] **Step 2: Add the UI/test dependencies and scripts.**

Update `apps/web/package.json` so its scripts and development dependencies include:

```json
"test:ui": "vitest run",
"@radix-ui/react-dialog": "^1.1.6",
"@radix-ui/react-radio-group": "^1.2.3",
"@radix-ui/react-tabs": "^1.1.3",
"class-variance-authority": "^0.7.1",
"vitest": "^3.0.7",
"@testing-library/react": "^16.2.0",
"@testing-library/jest-dom": "^6.6.3",
"jsdom": "^26.0.0"
```

Run: `pnpm install --lockfile-only`

Expected: lockfile resolves the new direct dependencies without changing unrelated workspace manifests.

- [ ] **Step 3: Configure shadcn/ui for the existing alias and Tailwind application.**

Create `components.json` with `tsx: true`, `rsc: true`, `tailwind.css: "src/app/globals.css"`, `tailwind.config: "tailwind.config.ts"`, `aliases.components: "@/components"`, and `aliases.utils: "@/lib/utils"`. Extend `utils.ts` as follows while retaining `formatPrice`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Run: `pnpm --filter @food-ordering/web exec tsc --noEmit`

Expected: `cn` is importable as `@/lib/utils` and the existing application still typechecks.

- [ ] **Step 4: Generate and customize the primitives.**

Generate Button, Input, Sheet, Tabs, RadioGroup, Skeleton, and Alert with shadcn CLI. Use `cn` in every generated component. Customize only the shared tokens/classes necessary for the spec: herb-green selected/primary state, warm neutral surface, 16px form controls, visible `focus-visible` ring, and disabled opacity.

Run: `pnpm dlx shadcn@latest add button input sheet tabs radio-group skeleton alert --cwd apps/web`

Expected: components are added beneath `apps/web/src/components/ui/`; no route imports are changed in this step.

- [ ] **Step 5: Add the focused test runner.**

Create `vitest.config.ts` with the `@` alias and jsdom environment, and `src/test/setup.ts` with:

```ts
import '@testing-library/jest-dom/vitest';
```

Set the config test setup file to `src/test/setup.ts` and include `src/**/*.test.ts?(x)`.

Run: `pnpm --filter @food-ordering/web test:ui`

Expected: Vitest discovers zero tests and exits successfully.

- [ ] **Step 6: Commit the isolated foundation.**

```bash
git add -- apps/web/package.json pnpm-lock.yaml apps/web/components.json apps/web/src/components/ui apps/web/src/lib/utils.ts apps/web/src/app/globals.css apps/web/vitest.config.ts apps/web/src/test/setup.ts
git commit -m "feat(web): add shadcn customer UI foundation"
```

### Task 2: Define and test customer-flow decisions

**Files:**
- Create: `apps/web/src/lib/customer-ordering.ts`
- Create: `apps/web/src/lib/customer-ordering.test.ts`
- Modify: `apps/web/src/lib/store.ts`

**Interfaces:**
- Produces `isCustomerProfileReady(input)`, `isFulfilmentReady(input)`, `getLatestReorderableOrder(orders)`, and `getCheckoutBlocker(input)`.
- Consumes the persisted `CustomerLocation` and `orderType` fields already defined by `useAppStore`.

- [ ] **Step 1: Write the failing customer-flow tests.**

```ts
it('allows pickup with identity but blocks delivery without an address', () => {
  expect(isFulfilmentReady({ orderType: 'PICKUP', location: null })).toBe(true);
  expect(isFulfilmentReady({ orderType: 'DELIVERY', location: null })).toBe(false);
});

it('returns the newest completed order that still has items', () => {
  expect(getLatestReorderableOrder(orders)?.id).toBe('newest-paid-order');
});
```

Run: `pnpm --filter @food-ordering/web test:ui -- customer-ordering.test.ts`

Expected: FAIL because `customer-ordering.ts` does not exist.

- [ ] **Step 2: Implement pure guards with no React dependency.**

```ts
export function isFulfilmentReady(input: { orderType: 'PICKUP' | 'DELIVERY'; location: CustomerLocation | null }) {
  return input.orderType === 'PICKUP' || Boolean(input.location?.addressLine.trim() && input.location.latitude);
}

export function getCheckoutBlocker(input: CheckoutGuardInput): string | null {
  if (input.itemCount === 0) return 'ตะกร้าสินค้าว่างอยู่';
  if (!isCustomerProfileReady(input)) return 'กรุณากรอกชื่อและเบอร์โทรก่อนสั่งอาหาร';
  if (!isFulfilmentReady(input)) return 'กรุณาเพิ่มที่อยู่จัดส่งก่อนยืนยันออเดอร์';
  if (input.hasUnavailableItem) return 'มีสินค้าหมดในตะกร้า กรุณาลบรายการนั้นออก';
  return null;
}
```

Choose a reorderable order only when it has at least one item and a terminal successful status (`COMPLETED` or `DELIVERED`), sorted by `createdAt` descending.

- [ ] **Step 3: Refactor the store to call the shared readiness rule.**

Replace the duplicated body of `isProfileComplete` with `isCustomerProfileReady(get())`. Keep the persisted keys and store public methods unchanged.

Run: `pnpm --filter @food-ordering/web test:ui -- customer-ordering.test.ts; pnpm --filter @food-ordering/web exec tsc --noEmit`

Expected: all new guard tests pass and route consumers retain the same store API.

- [ ] **Step 4: Commit the flow layer.**

```bash
git add -- apps/web/src/lib/customer-ordering.ts apps/web/src/lib/customer-ordering.test.ts apps/web/src/lib/store.ts
git commit -m "feat(web): centralize customer checkout guards"
```

### Task 3: Build shared fast-ordering components

**Files:**
- Create: `apps/web/src/components/customer/order-mode-switch.tsx`
- Create: `apps/web/src/components/customer/quick-reorder.tsx`
- Create: `apps/web/src/components/customer/sticky-cart-bar.tsx`
- Create: `apps/web/src/components/customer/fulfilment-summary.tsx`
- Create: `apps/web/src/components/customer/order-summary.tsx`
- Create: `apps/web/src/components/customer/order-timeline.tsx`
- Create: `apps/web/src/components/customer/fast-ordering-components.test.tsx`

**Interfaces:**
- `OrderModeSwitch({ value, onValueChange, pickupLabel, deliveryLabel })` emits `'PICKUP' | 'DELIVERY'`.
- `QuickReorder({ order, isPending, onAdd })` never renders when `order` is null.
- `StickyCartBar({ itemCount, total, onOpen })` renders nothing for `itemCount === 0`.
- `FulfilmentSummary({ orderType, branchName, addressLine, onEdit })` renders an edit button.

- [ ] **Step 1: Write the shared component tests.**

```tsx
it('does not render the cart bar for an empty cart', () => {
  render(<StickyCartBar itemCount={0} total={0} onOpen={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /ตะกร้า/i })).not.toBeInTheDocument();
});

it('switches the fulfilment mode through keyboard-accessible radios', async () => {
  const onValueChange = vi.fn();
  render(<OrderModeSwitch value="PICKUP" onValueChange={onValueChange} pickupLabel="รับที่ร้าน" deliveryLabel="จัดส่ง" />);
  await userEvent.click(screen.getByRole('radio', { name: 'จัดส่ง' }));
  expect(onValueChange).toHaveBeenCalledWith('DELIVERY');
});
```

Run: `pnpm --filter @food-ordering/web test:ui -- fast-ordering-components.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 2: Implement the reusable components on shadcn primitives.**

Use `RadioGroup` for mode selection, `Button` for actions, `Skeleton` for loading call sites, and `Separator`/plain semantic lists for summaries. The sticky bar must use `fixed inset-x-0 bottom-0` with `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, `aria-label="เปิดตะกร้า 3 รายการ"`, and no animation under reduced motion. The timeline receives only normalized statuses and maps each to Thai label/text through a typed record.

- [ ] **Step 3: Make all tests pass.**

Run: `pnpm --filter @food-ordering/web test:ui -- fast-ordering-components.test.tsx`

Expected: tests prove empty-cart hiding, mode change, quick-reorder absence, checkout total, and timeline current-state semantics.

- [ ] **Step 4: Commit the shared customer components.**

```bash
git add -- apps/web/src/components/customer apps/web/src/components/ui/separator.tsx
git commit -m "feat(web): add reusable fast-ordering components"
```

### Task 4: Compose the menu-first and onboarding experience

**Files:**
- Modify: `apps/web/src/app/menu/page.tsx`
- Modify: `apps/web/src/app/onboarding/page.tsx`
- Modify: `apps/web/src/components/BottomNav.tsx`
- Test: `apps/web/src/components/customer/fast-ordering-components.test.tsx`

**Interfaces:**
- Consumes Task 2 guards and Task 3 `OrderModeSwitch`, `QuickReorder`, and `StickyCartBar`.
- Uses the existing `/menu`, `/cart`, `/orders/my-orders`, `/cart/items`, and `/branches` API calls.

- [ ] **Step 1: Add a failing route-composition test for persistent cart entry.**

```tsx
it('opens cart from the menu sticky bar with the current item count and total', async () => {
  render(<StickyCartBar itemCount={3} total={254} onOpen={onOpen} />);
  await userEvent.click(screen.getByRole('button', { name: /เปิดตะกร้า 3 รายการ/i }));
  expect(onOpen).toHaveBeenCalledOnce();
});
```

Run: `pnpm --filter @food-ordering/web test:ui -- fast-ordering-components.test.tsx`

Expected: the test is already supported by Task 3; this confirms menu integration uses the tested contract rather than a duplicate cart control.

- [ ] **Step 2: Recompose `/menu` around the shared controls.**

Place `OrderModeSwitch` beside branch selection; update the existing Zustand `setOrderType` directly. When delivery lacks a valid address, the mode control routes to onboarding after the customer explicitly selects delivery. Query `/orders/my-orders` independently and derive the optional `QuickReorder` entry with `getLatestReorderableOrder`; its mutation reuses the existing per-item `/cart/items` payload and then invalidates `['cart']`. Replace the old product modal shell with shadcn `Sheet`, preserving variant/modifier constraints and the product-availability socket listener. Render `StickyCartBar` from the existing cart query and route it to `/cart`.

- [ ] **Step 3: Reduce onboarding to missing essentials.**

Keep the existing profile and location API mutations. Initialize all fields from Zustand. For pickup, hide address fields and save profile then return to `/menu`; for delivery, require trimmed `addressLine`, latitude, and longitude before calling the location mutation. Keep current-location lookup as an optional button and surface its failure inside `Alert`.

- [ ] **Step 4: Align bottom navigation with the persistent cart.**

Keep the cart destination in `BottomNav`, but do not duplicate a total or primary CTA there. It shows a count badge only; the menu sticky bar owns the visible total and checkout path.

- [ ] **Step 5: Verify menu and onboarding behaviour.**

Run: `pnpm --filter @food-ordering/web test:ui; pnpm --filter @food-ordering/web exec tsc --noEmit`

Expected: all component/guard tests pass and the route composition typechecks without API contract changes.

- [ ] **Step 6: Commit the menu/onboarding slice.**

```bash
git add -- apps/web/src/app/menu/page.tsx apps/web/src/app/onboarding/page.tsx apps/web/src/components/BottomNav.tsx apps/web/src/components/customer/fast-ordering-components.test.tsx
git commit -m "feat(web): streamline menu and onboarding ordering flow"
```

### Task 5: Deliver the one-page confirmation and order tracking experience

**Files:**
- Modify: `apps/web/src/app/cart/page.tsx`
- Modify: `apps/web/src/app/checkout/page.tsx`
- Modify: `apps/web/src/app/orders/page.tsx`
- Modify: `apps/web/src/app/orders/[id]/page.tsx`
- Test: `apps/web/src/lib/customer-ordering.test.ts`
- Test: `apps/web/src/components/customer/fast-ordering-components.test.tsx`

**Interfaces:**
- Consumes `getCheckoutBlocker`, `FulfilmentSummary`, `OrderSummary`, and `OrderTimeline`.
- Preserves the existing `POST /orders`, `GET /orders/:id/payment/qr`, `POST /orders/:id/payment/slip`, and `/orders/my-orders` endpoints.

- [ ] **Step 1: Extend the failing guard tests for confirmation blockers.**

```ts
it.each([
  [{ itemCount: 0, hasUnavailableItem: false, orderType: 'PICKUP' }, 'ตะกร้าสินค้าว่างอยู่'],
  [{ itemCount: 1, hasUnavailableItem: true, orderType: 'PICKUP' }, 'มีสินค้าหมดในตะกร้า กรุณาลบรายการนั้นออก'],
])('returns an actionable checkout blocker', (input, message) => {
  expect(getCheckoutBlocker(completeInput(input))).toBe(message);
});
```

Run: `pnpm --filter @food-ordering/web test:ui -- customer-ordering.test.ts`

Expected: FAIL until the exact Thai blocker mapping exists.

- [ ] **Step 2: Convert cart to an editor and checkout to one confirmation screen.**

Keep all existing quantity, removal, and promotion mutations in `/cart`. At `/checkout`, compose `FulfilmentSummary`, `OrderSummary`, the existing payment method presentation, and the final total in one scrollable page. Render a fixed `CheckoutActionBar` whose button is disabled when `getCheckoutBlocker` returns text, and render that text adjacent to the action. Retain `createOrderMutation`; on success invalidate `['cart']` then replace to `/orders/${res.id}`. Do not create the QR on the client before the server creates the order.

- [ ] **Step 3: Make history and details action-oriented.**

In `/orders`, keep existing active/history filtering and replace per-card status decoration with `OrderTimeline` summary state and a reusable repeat order action. In `/orders/[id]`, retain QR, slip upload, demo simulation, and Socket.IO refresh; replace the duplicated status visualization with `OrderTimeline`, then present payment controls only for eligible payment statuses. Keep the existing `router.push('/menu')` repeat/corrective routes.

- [ ] **Step 4: Pass the guard and component tests.**

Run: `pnpm --filter @food-ordering/web test:ui; pnpm --filter @food-ordering/web exec tsc --noEmit`

Expected: checkout blocking messages, cart action visibility, timeline semantics, and all TypeScript imports pass.

- [ ] **Step 5: Run production-equivalent frontend and affected API verification.**

Run: `pnpm --filter @food-ordering/web build; pnpm --filter @food-ordering/api test -- --runInBand test/orders/lifecycle.spec.ts test/payment/payment-safety.spec.ts`

Expected: Next production build succeeds; order lifecycle and payment safety tests remain green because backend contracts are unchanged.

- [ ] **Step 6: Commit the checkout and tracking slice.**

```bash
git add -- apps/web/src/app/cart/page.tsx apps/web/src/app/checkout/page.tsx apps/web/src/app/orders/page.tsx 'apps/web/src/app/orders/[id]/page.tsx' apps/web/src/lib/customer-ordering.test.ts apps/web/src/components/customer/fast-ordering-components.test.tsx
git commit -m "feat(web): add fast confirmation and order tracking UI"
```

## Plan Self-Review

- **Spec coverage:** Task 1 provides shadcn and tests; Task 2 defines persisted-state and checkout guards; Task 3 covers reusable components; Task 4 covers menu, repeat ordering, pickup/delivery, onboarding, sticky cart; Task 5 covers one-page confirmation, errors, history, timeline, QR/slip preservation, typecheck, build, and affected API tests.
- **Placeholder scan:** No deferred implementation markers or generic test instructions remain. Exact paths, function contracts, assertions, commands, and commits are defined.
- **Type consistency:** `OrderModeSwitch` emits the existing store union; `isFulfilmentReady` uses `CustomerLocation`; `getCheckoutBlocker` is the sole blocker API consumed by checkout; cart and order data stay `any` only at existing API boundaries until domain response types are introduced separately.
