# Customer Fast-Ordering Redesign

## Goal

Redesign the customer-facing LINE LIFF experience so a customer can find food,
add it to the cart, and begin payment with the fewest possible decisions. The
same flow must work for both first-time customers and returning customers.

## Scope

Customer routes only:

- `/` and `/menu`
- `/onboarding`
- `/cart` and `/checkout`
- `/orders` and `/orders/[id]`

Admin, kitchen, delivery, order-state transitions, payment verification, API
contracts, and the database schema are out of scope unless a small UI-only
integration gap is discovered during implementation.

## Chosen Experience

Use a **hybrid, menu-first** experience.

1. The customer enters the menu immediately.
2. The active branch and fulfilment mode are retained from the last usable
   choice and shown in the header.
3. Returning customers see a compact most-recent-order shortcut above the menu.
   It is absent when there is no relevant history.
4. Customers add products without leaving the menu. A persistent cart bar
   exposes item count, total, and the next action at every point in the list.
5. Checkout is one editable confirmation screen, not a multi-step wizard.

This preserves a direct path for first-time customers while removing repeat
work for returning customers.

## Visual Direction

The interface is a calm, high-clarity "kitchen ready" surface:

- Deep herb green (`#1F5D45`) is reserved for primary actions and selected
  states.
- Warm off-white (`#F6F7F4`) is the page surface; white is for actionable
  content groups.
- Sand (`#EEE1CB`) is used sparingly for food or promotion emphasis.
- Slate/ink neutrals provide high legibility for names, prices, and order
  status.
- Price, elapsed/estimated time, and primary action always remain visually
  dominant over supporting copy.

The implementation should retain the existing Thai-first copy and avoid
decorative UI that delays menu scanning. Inputs use at least 16px text to avoid
mobile browser zoom.

## Route Designs

### Menu

The header contains the current branch and a compact `OrderModeSwitch` for
`PICKUP` versus `DELIVERY`. It shows the best available estimate; selecting
delivery reveals an address requirement only when it is needed.

The page body, in order, is:

1. Search.
2. `QuickReorder` when the customer has a previous eligible order.
3. Horizontal category navigation.
4. Product list with price, availability, and a single add action.

Product details open in a shadcn `Sheet` on mobile. Required modifiers are
validated before the item can be added. Realtime availability events continue
to invalidate the existing menu and cart queries.

`StickyCartBar` is rendered when the cart contains one or more items. It is
fixed above the safe-area inset and includes item count, total, and a clear
"view cart" action.

### Onboarding

Onboarding is a short recovery path, not an entry gate to browse food. It asks
only for missing essentials: display name, phone if required, fulfilment mode,
and delivery address when delivery is selected. Completed information is saved
to the existing customer/store state and the customer returns to the menu.

### Cart and Checkout

Cart editing and confirmation become a coherent one-page checkout. The page
groups information in this sequence:

1. Fulfilment: branch, pickup/delivery, address, and estimate.
2. Item summary with inline quantity, modifier/note summary, and edit/remove
   controls.
3. Promotion/coupon input when the current product supports it.
4. Payment method and complete price summary.

The default values come from the last valid store state. Each group exposes an
explicit edit action instead of adding mandatory intermediate steps. A fixed
primary action reads `ยืนยันและรับ QR` and includes the payable total. It is
disabled with a specific corrective message if delivery has no address, the
cart is empty, or an item has become unavailable.

### Orders

Order history is a concise list. An order detail has a clear status timeline,
order summary, payment state, and one repeat-order action. Support/contact
actions appear only when payment or fulfilment requires attention.

## Component Plan

Use shadcn/ui primitives, styled through the project theme rather than copied
as stock components:

| Component | Base primitive | Responsibility |
| --- | --- | --- |
| `OrderModeSwitch` | Tabs or RadioGroup | Change and display pickup/delivery mode. |
| `QuickReorder` | Button, Badge | Add the last eligible order through the existing cart path. |
| `ProductDetailSheet` | Sheet, ScrollArea | Choose variants/modifiers and add a product. |
| `StickyCartBar` | Button | Persistent cart total and next action. |
| `FulfilmentSummary` | Card, Dialog | Summarize and edit branch/address/mode. |
| `OrderSummary` | Separator, Button | Editable line items and total. |
| `CheckoutActionBar` | Button | Fixed payment-confirmation CTA. |
| `OrderTimeline` | Badge, Separator | Read order progress without interpretation. |

Loading views use `Skeleton`; status/errors use `Alert`, inline field help, and
the existing toast pattern. Dialogs and sheets must restore focus when closed.

## Data and Error Handling

No backend contract changes are planned. Existing React Query APIs, Zustand
store state, and WebSocket invalidation remain the data path.

- Load a retained branch, mode, and valid address as defaults.
- Do not show quick reorder until its data is available; its absence must not
  block menu rendering.
- Re-fetch menu/cart after product availability events.
- Before confirmation, preserve server-side validation of price, availability,
  address, and payment eligibility.
- Show actionable errors in context, for example: "สินค้านี้หมดแล้ว
  กรุณาลบออกจากตะกร้า" with an immediate removal action.

## Accessibility and Responsive Behaviour

- Mobile first at 360px wide and above, with a visible safe-area offset for
  fixed actions.
- Semantic buttons and labels; no clickable non-button controls.
- Full keyboard traversal and visible focus states.
- Respect reduced-motion preferences; visual feedback must not rely on motion.
- Sufficient contrast for text, status, and disabled states.

## Verification

Add or update targeted UI tests for:

1. A new customer can browse the menu, choose pickup, add an item, and reach
   QR confirmation without unnecessary onboarding.
2. A returning customer can add a repeat order and reach checkout from the
   sticky cart bar.
3. A delivery customer must provide a valid address before confirmation.
4. A product becoming unavailable updates the menu/cart and blocks payment.
5. The customer pages remain usable at 360px and support keyboard focus.

Run the affected web typecheck/build and relevant existing API/order/payment
tests after implementation.

## Explicit Non-goals

- Changing the payment provider or slip-verification rules.
- Changing staff/admin/kitchen/delivery interfaces.
- Adding a new recommendation engine, favorites system, or API endpoint.
- Replacing the existing authentication or LINE LIFF integration.
