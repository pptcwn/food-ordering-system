# Food Ordering via LINE Official Account — System Blueprint

> Version: 1.0  
> Target: LINE OA + LIFF Food Ordering + Slip Verification + Kitchen + Delivery + Telegram Admin  
> Deployment: Self-hosted VPS with Docker Compose  
> Primary Stack: Next.js + NestJS + PostgreSQL + Prisma + Redis + BullMQ + MinIO

---

## 1. Project Overview

ระบบสั่งอาหารผ่าน LINE Official Account โดยลูกค้าเปิดหน้าสั่งอาหารผ่าน LIFF ภายใน LINE สามารถเลือกเมนู เพิ่มสินค้าในตะกร้า ชำระเงินด้วย QR/โอนเงิน อัปโหลดสลิป และให้ระบบตรวจสอบสลิปผ่าน Slip2Go API อัตโนมัติ

เมื่อมีออเดอร์ใหม่ ระบบแจ้งเตือน Admin ผ่าน Telegram และเมื่อชำระเงินสำเร็จ ออเดอร์จะถูกส่งเข้าสู่ Kitchen Dashboard จากนั้นสามารถเปลี่ยนสถานะเป็นกำลังทำ พร้อมจัดส่ง กำลังจัดส่ง และจัดส่งแล้ว

ระบบรองรับ Multi-branch ตั้งแต่โครงสร้างฐานข้อมูล แม้ MVP จะเริ่มจากร้านหรือสาขาเดียว

---

# 2. Core Goals

- ลูกค้าสั่งอาหารผ่าน LINE OA โดยไม่ต้องติดตั้งแอป
- ใช้ LINE LIFF เป็นหน้าร้านหลัก
- รองรับ Menu / Cart / Checkout
- รองรับ Pickup / Delivery / Dine-in ในโครงสร้างข้อมูล
- ชำระผ่าน QR / Bank Transfer
- อัปโหลดสลิป
- ตรวจสลิปผ่าน Slip2Go API
- ตรวจยอดเงิน ผู้รับ เวลา และสลิปซ้ำ
- แจ้ง Telegram Admin เมื่อมีออเดอร์
- แจ้ง LINE ลูกค้าเมื่อสถานะเปลี่ยน
- มี Kitchen Dashboard
- มี Delivery Dashboard
- สามารถกด "จัดส่งแล้ว"
- ใช้ MinIO เป็น Object Storage
- ใช้ PostgreSQL เป็นฐานข้อมูลหลัก
- ใช้ Redis + BullMQ สำหรับ Queue / Background Jobs
- Deploy บน VPS ส่วนตัวด้วย Docker Compose

---

# 3. Recommended Tech Stack

## 3.1 Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form
- Zod

ใช้สำหรับ:

- LINE LIFF Customer App
- Admin Dashboard
- Kitchen Dashboard
- Delivery Dashboard
- Order Tracking

---

## 3.2 LINE Integration

- LINE Official Account
- LINE LIFF SDK
- LINE Messaging API
- LINE Login / LIFF identity
- LINE Webhook

ใช้สำหรับ:

- Login ลูกค้า
- เปิดระบบสั่งอาหาร
- แจ้งสถานะออเดอร์
- แจ้งชำระเงิน
- แจ้งอาหารพร้อม
- แจ้งกำลังจัดส่ง
- แจ้งจัดส่งสำเร็จ

---

## 3.3 Backend

- NestJS
- TypeScript
- REST API
- Socket.IO / WebSocket

แนวทาง:

**Modular Monolith + Background Worker**

ไม่ใช้ Microservices ตั้งแต่ MVP

---

## 3.4 Database

- PostgreSQL
- Prisma ORM

เหตุผล:

- Order มี relation จำนวนมาก
- รองรับ transaction
- เหมาะกับข้อมูลการเงิน
- รองรับ unique constraints
- เหมาะกับ reporting

---

## 3.5 Cache / Queue

### Redis

ใช้สำหรับ:

- Cache Menu
- Temporary State
- BullMQ Storage
- Rate Limiting
- Short-lived Sessions

### BullMQ

Queue หลัก:

- `order-events`
- `payment-events`
- `notifications`
- `order-expiration`
- `reports`

---

## 3.6 Storage

ใช้:

**MinIO**

S3-compatible Object Storage แบบ Self-hosted

ใช้เก็บ:

- Product Images
- Category Images
- Payment Slips
- Receipts
- Delivery Proof

Buckets:

```text
food-products
food-slips
food-receipts
food-delivery
```

สิทธิ์แนะนำ:

```text
food-products   → Public / CDN-able
food-slips      → Private
food-receipts   → Private
food-delivery   → Private
```

ไฟล์ Private ให้เข้าผ่าน Presigned URL

แนะนำ expiration:

```text
5–15 นาที
```

---

# 4. High-Level Architecture

```text
                         LINE Official Account
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                  Rich Menu               Messaging API
                     │                         │
                     ▼                         ▼
                  LIFF App                LINE Webhook
                     │
                     ▼
            ┌──────────────────┐
            │     Next.js      │
            │ Customer Web App │
            └────────┬─────────┘
                     │
                     │ REST API
                     ▼
            ┌──────────────────┐
            │      NestJS      │
            │    Backend API   │
            └───────┬──────────┘
                    │
       ┌────────────┼────────────────────────────┐
       │            │             │              │
       ▼            ▼             ▼              ▼
 PostgreSQL       Redis          MinIO         Slip2Go
                    │
                    ▼
                  BullMQ
                    │
                    ▼
             Background Worker
               │      │      │
               ▼      ▼      ▼
             LINE  Telegram  Jobs
                    │
                    ▼
              Admin / Branch
```

---

# 5. User Roles

```text
CUSTOMER
SUPER_ADMIN
ADMIN
BRANCH_MANAGER
KITCHEN
DELIVERY
STAFF
```

## CUSTOMER

- เปิด LIFF
- ดูเมนู
- สั่งอาหาร
- ชำระเงิน
- Upload Slip
- ดูสถานะออเดอร์

## ADMIN

- ดูออเดอร์
- แก้สินค้า
- แก้ราคา
- ดูการชำระเงิน
- ดูรายงาน

## KITCHEN

- ดูออเดอร์ที่ชำระแล้ว
- กดเริ่มทำ
- กดพร้อมส่ง

## DELIVERY

- ดูงานส่ง
- รับงาน
- เริ่มจัดส่ง
- กดจัดส่งแล้ว

---

# 6. Customer Flow

```text
Add LINE OA
 ↓
Rich Menu
 ↓
กด "สั่งอาหาร"
 ↓
Open LIFF
 ↓
เลือกสาขา
 ↓
ดูเมนู
 ↓
เลือกสินค้า
 ↓
Modifier / Topping
 ↓
Add to Cart
 ↓
Checkout
 ↓
เลือกรูปแบบรับสินค้า
 ↓
Create Order
 ↓
แสดง QR / Payment Information
 ↓
Upload Slip
 ↓
Slip2Go Verification
 ↓
Payment Verified
 ↓
Kitchen
 ↓
Preparing
 ↓
Ready
 ↓
Delivery
 ↓
Delivered
 ↓
Completed
```

---

# 7. Ordering Types

รองรับตั้งแต่ Database:

```text
PICKUP
DELIVERY
DINE_IN
```

MVP สามารถเปิดใช้งานเฉพาะ:

```text
PICKUP
DELIVERY
```

---

# 8. Menu System

โครงสร้าง:

```text
Branch
 └ Category
    └ Product
       ├ Variant
       └ Modifier Group
           └ Modifier
```

ตัวอย่าง:

```text
ไก่ทอดหม่าล่า

ราคา 49

ระดับความเผ็ด:
- ไม่เผ็ด
- เผ็ดน้อย
- เผ็ดกลาง
- เผ็ดมาก

Topping:
- ชีส +10
- หม่าล่าเพิ่ม +5
```

Product Fields:

```text
id
branch_id
category_id
name
description
image_url
base_price
is_available
is_active
sort_order
created_at
updated_at
```

---

# 9. Cart

Cart ต้องเก็บ:

```text
cart
cart_items
cart_item_modifiers
```

ตัวอย่างการคำนวณ:

```text
Subtotal
+ Modifier
+ Delivery Fee
- Discount
= Total
```

Backend ต้องเป็นผู้คำนวณราคาจริงเสมอ

Frontend ห้ามเป็น source of truth เรื่องราคา

---

# 10. Checkout

## Pickup

ข้อมูล:

```text
customer_name
phone
branch
pickup_time
note
```

## Delivery

ข้อมูล:

```text
customer_name
phone
address
latitude
longitude
delivery_note
```

---

# 11. Order Creation

ต้องสร้าง Order ก่อนชำระเงิน

เหตุผล:

- มี Order ID ก่อน
- จับคู่สลิปได้
- รู้ยอดที่ถูกต้อง
- รู้ Branch
- รู้บัญชีผู้รับ
- มีเวลา expire

ตัวอย่าง:

```text
Order No: XC260818-0042
Total: 247
Status: PENDING_PAYMENT
Payment Status: PENDING
```

---

# 12. Order State Machine

```text
DRAFT
 ↓
PENDING_PAYMENT
 ↓
PAYMENT_VERIFYING
 ↓
PAID
 ↓
CONFIRMED
 ↓
PREPARING
 ↓
READY
 ↓
OUT_FOR_DELIVERY
 ↓
DELIVERED
 ↓
COMPLETED
```

ทางเลือก:

```text
PENDING_PAYMENT
 ├ CANCELLED
 └ EXPIRED

PAYMENT_VERIFYING
 ├ PAYMENT_FAILED
 └ MANUAL_REVIEW

OUT_FOR_DELIVERY
 ├ DELIVERED
 └ DELIVERY_FAILED
```

---

# 13. Payment State

```text
PENDING
VERIFYING
VERIFIED
FAILED
MANUAL_REVIEW
REFUNDED
```

---

# 14. Slip2Go Integration

Integration Flow:

```text
Customer Upload Slip
 ↓
NestJS
 ↓
Upload Original Slip → MinIO
 ↓
Create Payment Verification Job
 ↓
BullMQ
 ↓
Worker
 ↓
Slip2Go API
 ↓
Validate Business Rules
 ↓
DB Transaction
 ↓
Payment VERIFIED
 ↓
Order PAID
 ↓
Kitchen + Notifications
```

---

# 15. Slip Validation Rules

ต้องตรวจอย่างน้อย:

```text
1. Slip Valid
2. Duplicate Check
3. Receiver Match
4. Amount Match
5. Transfer Time >= Order Created At
```

เพิ่มเติม:

```text
Order ยังไม่หมดเวลา
Order ยังไม่ถูกชำระ
Branch Receiver ต้องถูกต้อง
Currency ต้องถูกต้อง
```

---

# 16. Duplicate Slip Protection

เก็บ:

```text
slip2go_reference_id
transaction_ref
```

ตั้ง Database Constraint:

```sql
UNIQUE(transaction_ref)
```

Flow:

```text
Slip2Go
 ↓
transaction_ref
 ↓
Database
 ↓
มีแล้ว?
 ├ YES → Reject Duplicate
 └ NO  → Verify Payment
```

ต้องใช้ Database unique constraint เพื่อกัน race condition

---

# 17. Payment Transaction

หลัง Slip ผ่าน:

```text
BEGIN TRANSACTION

payment.status = VERIFIED
payment.verified_at = NOW()

order.payment_status = PAID
order.order_status = PAID

insert order_status_log

create kitchen event

COMMIT
```

จากนั้นค่อย enqueue notifications

---

# 18. Telegram Admin Notification

ใช้ Telegram Bot API

Environment:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

แนะนำ Events:

```text
ORDER_CREATED
PAYMENT_VERIFIED
PAYMENT_FAILED
ORDER_CANCELLED
DELIVERY_COMPLETED
```

## New Order

```text
🛒 ออเดอร์ใหม่

Order: #XC260818-0042
สาขา: พระราม 9

ลูกค้า: Beam
ประเภท: Delivery

รายการ:
• ไก่ทอดหม่าล่า x2
• สามชั้น x1

ยอดรวม: ฿167

สถานะ:
🟡 รอชำระเงิน
```

## Payment Success

```text
✅ ชำระเงินสำเร็จ

Order: #XC260818-0042
ยอด: ฿167

Slip2Go: VERIFIED
สถานะ: ส่งเข้าครัวแล้ว
```

## Delivery Success

```text
✅ จัดส่งสำเร็จ

Order: #XC260818-0042
ผู้จัดส่ง: Staff A

สถานะ: DELIVERED
```

---

# 19. Telegram Multi-Branch

ใน Branch:

```text
telegram_enabled
telegram_chat_id
```

Flow:

```text
Order
 ↓
branch_id
 ↓
Branch.telegram_chat_id
 ↓
Telegram Group
```

สามารถเพิ่ม HQ Group:

```text
Branch Group
+
HQ Admin Group
```

---

# 20. Kitchen Dashboard

Route:

```text
/kitchen
```

แสดงเฉพาะ Order ที่จ่ายแล้ว

สถานะ:

```text
CONFIRMED
PREPARING
READY
```

ปุ่ม:

```text
[ เริ่มทำอาหาร ]
[ พร้อมส่ง / พร้อมรับ ]
```

Kitchen Card:

```text
#0042
08:31

Delivery

ไก่ทอดหม่าล่า x2
 └ เผ็ดกลาง

สามชั้น x1
 └ เผ็ดมาก

หมายเหตุ:
ไม่ใส่ต้นหอม

[ เริ่มทำอาหาร ]
```

---

# 21. Realtime Kitchen

ใช้:

```text
Socket.IO
```

เมื่อ Order Paid:

```text
Backend
 ↓
WebSocket Event
 ↓
Kitchen Display
 ↓
New Order
```

Event:

```text
order.created
order.paid
order.status.changed
```

---

# 22. Delivery System

## Delivery Status

```text
UNASSIGNED
ASSIGNED
PICKED_UP
OUT_FOR_DELIVERY
DELIVERED
FAILED
CANCELLED
```

---

# 23. Delivery Dashboard Routes

Frontend:

```text
/admin/delivery
/admin/delivery/pending
/admin/delivery/active
/admin/delivery/completed
```

Driver / Staff:

```text
/delivery/login
/delivery/jobs
/delivery/jobs/:id
```

---

# 24. Delivery Flow

```text
READY
 ↓
Assign Delivery Staff
 ↓
ASSIGNED
 ↓
Driver Pickup
 ↓
OUT_FOR_DELIVERY
 ↓
กด "จัดส่งแล้ว"
 ↓
DELIVERED
 ↓
COMPLETED
```

---

# 25. Delivery API

```http
GET    /api/admin/deliveries
GET    /api/admin/deliveries/:id

POST   /api/admin/deliveries/:id/assign

PATCH  /api/admin/deliveries/:id/pickup
PATCH  /api/admin/deliveries/:id/out-for-delivery
PATCH  /api/admin/deliveries/:id/delivered
PATCH  /api/admin/deliveries/:id/failed
```

Order status route:

```http
PATCH /api/admin/orders/:id/status
```

Payload:

```json
{
  "status": "OUT_FOR_DELIVERY"
}
```

จัดส่งแล้ว:

```json
{
  "status": "DELIVERED"
}
```

---

# 26. Delivery Completed Logic

เมื่อกด:

**จัดส่งแล้ว**

Backend:

```text
Validate Delivery
 ↓
Delivery.status = DELIVERED
 ↓
Set delivered_at
 ↓
Order.status = DELIVERED
 ↓
Order Status Log
 ↓
Notification Queue
 ↓
LINE Customer
 ↓
Telegram Admin
```

---

# 27. Delivery Staff Table

```text
delivery_staff

id
branch_id
name
phone
status
is_active
created_at
updated_at
```

---

# 28. Deliveries Table

```text
deliveries

id
order_id
delivery_staff_id

status

assigned_at
picked_up_at
out_for_delivery_at
delivered_at

note

created_at
updated_at
```

---

# 29. Delivery Proof

รองรับ Phase ต่อไป:

```text
Photo Proof
Customer Signature
OTP
GPS Location
```

เก็บไฟล์ใน:

```text
food-delivery
```

---

# 30. LINE Notifications

Events:

```text
ORDER_CREATED
PAYMENT_VERIFIED
ORDER_CONFIRMED
ORDER_PREPARING
ORDER_READY
OUT_FOR_DELIVERY
DELIVERED
ORDER_CANCELLED
```

ตัวอย่าง:

```text
✅ จัดส่งอาหารเรียบร้อยแล้ว

Order #XC260818-0042

ขอบคุณที่สั่งอาหารกับเรา
```

---

# 31. Main API Routes

## Customer

```http
GET    /api/menu
GET    /api/products/:id

POST   /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id

POST   /api/orders
GET    /api/orders/:id

POST   /api/orders/:id/payment/slip
GET    /api/orders/:id/status
```

---

# 32. Admin API

```http
GET    /api/admin/orders
GET    /api/admin/orders/:id

PATCH  /api/admin/orders/:id/status

POST   /api/admin/products
PATCH  /api/admin/products/:id
PATCH  /api/admin/products/:id/availability

POST   /api/admin/categories
PATCH  /api/admin/categories/:id

POST   /api/admin/promotions

GET    /api/admin/payments
GET    /api/admin/reports/sales
```

---

# 33. Integration API

```http
POST /webhooks/line

POST /integrations/slip2go/verify

POST /internal/notifications/telegram
```

Internal API ไม่จำเป็นต้อง expose public หาก Worker ใช้ shared service

---

# 34. Backend Modules

```text
src/

auth/
users/

line/
telegram/

branches/

categories/
products/
modifiers/

cart/

orders/
payments/

slip2go/

promotions/

kitchen/
delivery/

notifications/

storage/
minio/

reports/

queue/
websocket/
```

---

# 35. Suggested NestJS Modules

```text
AuthModule
UsersModule

LineModule
TelegramModule

BranchesModule

CategoriesModule
ProductsModule
ModifiersModule

CartModule

OrdersModule
PaymentsModule
Slip2GoModule

KitchenModule
DeliveryModule

NotificationsModule

StorageModule
QueueModule

ReportsModule
```

---

# 36. Recommended Monorepo

```text
food-ordering/

apps/

  web/
    Next.js

  api/
    NestJS

  worker/
    NestJS Worker

packages/

  database/
    Prisma

  types/

  validation/

  ui/

  config/
```

Package manager:

```text
pnpm
```

Optional:

```text
Turborepo
```

---

# 37. Database Tables

Core:

```text
users
line_users

branches

categories
products
product_variants

modifier_groups
modifiers
product_modifier_groups

carts
cart_items
cart_item_modifiers

orders
order_items
order_item_modifiers

payments
payment_slips

addresses

delivery_staff
deliveries

promotions
coupons

order_status_logs

notification_logs

staff
roles
permissions
```

---

# 38. Orders Table

```text
orders

id
order_no

line_user_id
branch_id

order_type

subtotal
discount
delivery_fee
total

payment_status
order_status

customer_name
customer_phone

address_id

note

expires_at

paid_at
confirmed_at
preparing_at
ready_at
out_for_delivery_at
delivered_at
completed_at

created_at
updated_at
```

---

# 39. Payments Table

```text
payments

id
order_id

provider
amount
currency

status

slip2go_reference_id
transaction_ref

transfer_datetime

sender_name
sender_bank

receiver_name
receiver_bank

raw_response

verified_at

created_at
updated_at
```

Constraint:

```sql
UNIQUE(transaction_ref)
```

---

# 40. Payment Slips Table

```text
payment_slips

id
payment_id

bucket
object_key
mime_type
size

uploaded_at
created_at
```

ห้ามเก็บ direct public URL สำหรับ private files

---

# 41. Notification Logs

```text
notification_logs

id

channel
event_type

order_id

recipient

status
retry_count

provider_message_id
error_message

sent_at
created_at
```

Channel:

```text
LINE
TELEGRAM
EMAIL
SMS
```

MVP ใช้:

```text
LINE
TELEGRAM
```

---

# 42. Branches Table

```text
branches

id
name
code

is_active

address
latitude
longitude

opening_time
closing_time
last_order_time

telegram_enabled
telegram_chat_id

payment_receiver_type
payment_receiver_value

created_at
updated_at
```

---

# 43. Product Availability / Sold Out Toggle

ระบบต้องรองรับการ **เปิด/ปิดสถานะสินค้าหมดแบบทันที** โดยไม่ลบสินค้าออกจากระบบ

ใช้ field:

```text
is_available
```

สถานะ:

```text
ON  → AVAILABLE / ขายได้
OFF → SOLD OUT / สินค้าหมด
```

ผู้ที่สามารถเปลี่ยนสถานะ:

```text
SUPER_ADMIN
ADMIN
BRANCH_MANAGER
KITCHEN
```

ตัวอย่าง UI ฝั่ง Admin / Kitchen:

```text
สามชั้นหม่าล่า

สถานะสินค้า

🟢 ขายอยู่
[ ปิดสินค้า / สินค้าหมด ]
```

เมื่อกดปิด:

```text
สามชั้นหม่าล่า

🔴 สินค้าหมด
[ เปิดขายอีกครั้ง ]
```

Frontend ลูกค้าต้องเห็นผลทันที:

```text
สามชั้นหม่าล่า
฿39

สินค้าหมด

[ เพิ่มลงตะกร้า ]  ← Disabled
```

หรือสามารถแสดงสินค้าจางลงพร้อม Badge:

```text
SOLD OUT
```

โดยสินค้า **ยังคงอยู่ในเมนู** เพื่อให้ลูกค้าเห็นว่าร้านมีสินค้านี้ แต่ไม่สามารถเพิ่มลงตะกร้าได้

---

## 43.1 Product Availability API

Admin / Kitchen:

```http
PATCH /api/admin/products/:id/availability
```

เปิดขาย:

```json
{
  "is_available": true
}
```

สินค้าหมด:

```json
{
  "is_available": false
}
```

สามารถเพิ่ม endpoint แบบ action ได้หากต้องการ:

```http
PATCH /api/admin/products/:id/mark-sold-out
PATCH /api/admin/products/:id/mark-available
```

แต่แนะนำให้ใช้ endpoint `availability` กลางเพื่อลด route ที่ซ้ำซ้อน

---

## 43.2 Availability Validation

Backend ต้องตรวจ `is_available` อีกครั้งทุกครั้งที่:

```text
Add to Cart
Checkout
Create Order
```

ห้ามเชื่อสถานะจาก Frontend เพียงอย่างเดียว

ตัวอย่าง:

```text
Customer Add Product
 ↓
Backend Load Product
 ↓
is_active = true ?
 ↓
is_available = true ?
 ↓
YES → Add to Cart

NO → Reject
      PRODUCT_SOLD_OUT
```

ถ้าสินค้าถูกปิดหลังจากลูกค้าใส่ไว้ใน Cart แล้ว:

```text
Cart
 ↓
Checkout
 ↓
Revalidate Products
 ↓
พบสินค้าหมด
 ↓
แจ้งลูกค้าให้แก้ Cart ก่อนสร้าง Order
```

ตัวอย่าง response:

```json
{
  "code": "PRODUCT_SOLD_OUT",
  "message": "มีสินค้าบางรายการหมดแล้ว",
  "products": [
    {
      "id": "product_uuid",
      "name": "สามชั้นหม่าล่า"
    }
  ]
}
```

---

## 43.3 Realtime Sold Out

ใช้ Socket.IO แจ้งสถานะสินค้าไปยัง LIFF และ Dashboard

Event:

```text
product.availability.changed
```

Payload ตัวอย่าง:

```json
{
  "productId": "product_uuid",
  "branchId": "branch_uuid",
  "isAvailable": false
}
```

Flow:

```text
Kitchen กด "สินค้าหมด"
 ↓
NestJS Update PostgreSQL
 ↓
Clear Redis Menu Cache
 ↓
Emit WebSocket Event
 ↓
LIFF Menu Update
 ↓
สินค้าเปลี่ยนเป็น SOLD OUT
```

เมื่อเปิดขายอีกครั้ง:

```text
Kitchen กด "เปิดขาย"
 ↓
is_available = true
 ↓
Clear Cache
 ↓
WebSocket
 ↓
LIFF แสดงปุ่มเพิ่มสินค้าอีกครั้ง
```

---

## 43.4 Redis Cache Invalidation

ถ้ามีการ cache เมนู:

```text
menu:branch:{branchId}
```

ทุกครั้งที่เปลี่ยน availability ต้อง:

```text
UPDATE products
 ↓
DELETE menu:branch:{branchId}
 ↓
Emit product.availability.changed
```

เพื่อไม่ให้ลูกค้าเห็นสถานะเก่า

---

## 43.5 Optional Auto Sold Out

รองรับใน Phase ต่อไป:

```text
Stock = 0
 ↓
Auto set is_available = false
```

และเมื่อเติม Stock:

```text
Stock > 0
 ↓
เปิดขายอัตโนมัติ
```

แต่สำหรับ MVP ให้พนักงานกดเปิด/ปิดเองก่อน เพื่อไม่เพิ่มความซับซ้อนของ Inventory


---

# 44. Opening Hours

```text
branch_opening_hours

id
branch_id
day_of_week

open_time
close_time

is_closed
```

ก่อน Checkout Backend ต้องตรวจ:

```text
Branch Open?
Last Order Time?
Product Available?
```

---

# 45. Promotion Engine

รองรับ:

```text
Fixed Discount
Percentage Discount
Free Delivery
Minimum Spend
Buy X Get Y
Happy Hour
Branch Specific
Customer Specific
```

ไม่ hard-code promotion เข้า Product

---

# 46. Background Jobs

## Order Events

```text
ORDER_CREATED
ORDER_EXPIRED
ORDER_CANCELLED
```

## Payment Events

```text
VERIFY_SLIP
PAYMENT_VERIFIED
PAYMENT_FAILED
```

## Notifications

```text
SEND_LINE
SEND_TELEGRAM
```

## Delivery

```text
DELIVERY_ASSIGNED
DELIVERY_STARTED
DELIVERY_COMPLETED
```

---

# 47. Queue Architecture

```text
NestJS API
 ↓
PostgreSQL
 ↓
BullMQ
 ↓
Worker
 ├ Slip2Go
 ├ Telegram
 ├ LINE
 └ Cleanup Jobs
```

API response ต้องไม่รอ Telegram หรือ LINE

---

# 48. Order Creation Event

```text
POST /api/orders

 ↓

Create Order in DB

 ↓

Queue:
ORDER_CREATED

 ↓

Worker

 ├ Telegram Admin Notification
 └ Optional LINE Confirmation
```

---

# 49. Payment Verification Event

```text
Upload Slip
 ↓
Save MinIO
 ↓
Create Payment
 ↓
Queue VERIFY_SLIP
 ↓
Worker
 ↓
Slip2Go
 ↓
Database Transaction
 ↓
Queue:
PAYMENT_VERIFIED
 ↓
LINE + Telegram + Kitchen
```

---

# 50. MinIO Architecture

```text
NestJS
  │
  ▼
MinIO Client
  │
  ├ food-products
  ├ food-slips
  ├ food-receipts
  └ food-delivery
```

Environment:

```env
MINIO_ENDPOINT=
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_USE_SSL=false
```

Production แนะนำเปิดผ่าน internal Docker network

ไม่ expose MinIO API public โดยตรงหากไม่จำเป็น

---

# 51. Upload Security

ต้องตรวจ:

```text
MIME type
File size
Extension
Magic bytes
```

Payment Slip:

```text
jpg
jpeg
png
```

จำกัดขนาด เช่น:

```text
5 MB
```

Rename object ด้วย UUID

ตัวอย่าง:

```text
payment-slips/2026/08/18/{uuid}.jpg
```

---

# 52. Authentication

## Customer

```text
LIFF
 ↓
LINE Identity Token
 ↓
Backend Verification
 ↓
Internal Customer Session
```

ไม่ใช้ password สำหรับ customer

## Admin

```text
Email
Password
JWT Access Token
Refresh Token
```

พร้อม RBAC

---

# 53. Security Requirements

- Slip2Go Secret ห้ามอยู่ Frontend
- Telegram Bot Token ห้ามอยู่ Frontend
- LINE Channel Secret ห้ามอยู่ Frontend
- MinIO Secret ห้ามอยู่ Frontend
- ใช้ HTTPS
- Verify LINE Webhook Signature
- Rate Limit API
- Validate Input ทุก endpoint
- JWT Rotation / Refresh Token
- RBAC
- Audit Logs
- Database Backups
- Object Storage Backups
- Private Payment Slip Buckets
- Presigned URL สำหรับ private files
- ห้ามเชื่อยอดเงินจาก Frontend

---

# 54. Idempotency

Order Creation และ Payment Verification ควรรองรับ idempotency

เช่น Header:

```http
Idempotency-Key: uuid
```

เพื่อป้องกัน:

```text
Double Click
Network Retry
Duplicate Order
```

---

# 55. Concurrency Protection

กรณีสลิปเดียวกันถูก Upload พร้อมกัน:

ใช้:

```text
Database Transaction
+
UNIQUE(transaction_ref)
```

ไม่พึ่ง application check เพียงอย่างเดียว

---

# 56. WebSocket Events

```text
order.created
order.paid
order.status.changed

product.availability.changed

kitchen.new_order
kitchen.order_updated

delivery.assigned
delivery.status_changed
```

---

# 57. Admin Routes

```text
/admin

/admin/orders
/admin/orders/:id

/admin/products
/admin/categories
/admin/modifiers

/admin/payments

/admin/kitchen

/admin/delivery
/admin/delivery/pending
/admin/delivery/active
/admin/delivery/completed

/admin/customers

/admin/promotions

/admin/reports

/admin/settings
```

---

# 58. Customer Routes

```text
/
 /menu
 /product/:id
 /cart
 /checkout

 /orders
 /orders/:id

 /orders/:id/payment
 /orders/:id/status
```

---

# 59. LIFF Rich Menu

แนะนำ:

```text
┌───────────────────────────────┐
│ 🍜 สั่งอาหาร │ 🧾 ออเดอร์ของฉัน │
├──────────────┼────────────────┤
│ 🎁 โปรโมชั่น │ ☎ ติดต่อร้าน       │
└───────────────────────────────┘
```

---

# 60. Order Number

Format ตัวอย่าง:

```text
XC260818-0042
```

ประกอบด้วย:

```text
Prefix
YYMMDD
Sequence
```

อย่าใช้ Order Number เป็น Primary Key

ใช้ UUID เป็น PK

---

# 61. Deployment

OS:

```text
Ubuntu 24.04 LTS
```

Infrastructure:

```text
Docker
Docker Compose
Nginx
```

---

# 62. Docker Services

```text
food-ordering

├ nginx
├ web
├ api
├ worker
├ postgres
├ redis
├ minio
└ uptime-kuma
```

Optional:

```text
minio-console
```

---

# 63. Production Topology

```text
Internet
   │
   ▼
Nginx
   │
   ├ app.example.com      → Next.js
   ├ api.example.com      → NestJS
   └ admin.example.com    → Next.js

Docker Network
   │
   ├ PostgreSQL
   ├ Redis
   ├ MinIO
   └ Worker

External APIs
   │
   ├ LINE
   ├ Telegram
   └ Slip2Go
```

---

# 64. Initial VPS Specification

MVP:

```text
4 vCPU
8 GB RAM
100 GB NVMe
```

รองรับ:

```text
Next.js
NestJS
Worker
PostgreSQL
Redis
MinIO
Nginx
```

เริ่มต้นเครื่องเดียวก่อน

---

# 65. Future Scaling

เมื่อระบบโต:

```text
Server 1
Web + API

Server 2
PostgreSQL

Server 3
Worker + Redis

Server 4
MinIO
```

หรือใช้ MinIO cluster ภายหลัง

---

# 66. Backup Strategy

## PostgreSQL

```text
Daily Backup
Weekly Full Backup
Off-site Copy
```

## MinIO

ควร Backup:

```text
food-slips
food-receipts
food-delivery
```

ไป storage อีกเครื่องหรืออีก location

---

# 67. Monitoring

ใช้:

```text
Uptime Kuma
Sentry
Docker Logs
Nginx Logs
```

Monitor:

```text
Web
API
PostgreSQL
Redis
MinIO
Worker
Slip Verification Failures
Telegram Failures
LINE Failures
```

---

# 68. Logging

ทุก request สำคัญควรมี:

```text
request_id
user_id
order_id
branch_id
```

ห้าม log:

```text
password
JWT
API secret
Telegram bot token
LINE secret
MinIO secret
```

---

# 69. Suggested Environment Variables

```env
NODE_ENV=production

DATABASE_URL=

REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_LIFF_ID=

TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=

SLIP2GO_API_URL=
SLIP2GO_API_SECRET=

MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_USE_SSL=

MINIO_PRODUCTS_BUCKET=food-products
MINIO_SLIPS_BUCKET=food-slips
MINIO_RECEIPTS_BUCKET=food-receipts
MINIO_DELIVERY_BUCKET=food-delivery
```

---

# 70. MVP Scope

## Phase 1

ต้องมี:

```text
LINE OA
LIFF

Menu
Product
Modifier

Cart
Checkout

Pickup
Delivery

Create Order

PromptPay / Transfer

Upload Slip
MinIO
Slip2Go

Telegram Admin Notification

Order Management

Kitchen Dashboard

Delivery Dashboard
จัดส่งแล้ว

LINE Notifications

Admin Product Management
```

---

# 71. Phase 2

```text
Coupon
Promotion

Google Maps

Delivery Fee by Distance

Customer Order History

Sales Reports

Member Points

Delivery Proof

Inventory Basic
```

---

# 72. Phase 3

```text
Multi Branch Advanced

Inventory / Recipe Cost

Automatic Stock Deduction

CRM

Customer Segmentation

Broadcast Automation

POS Integration

Driver Tracking

OTP Delivery Confirmation
```

---

# 73. Important Architecture Decisions

## Use Modular Monolith

เลือก:

```text
NestJS Modular Monolith
+
BullMQ Worker
```

แทน Microservices

---

## Use PostgreSQL

ไม่ใช้ MongoDB เป็น Primary DB

---

## Use MinIO

แทน Cloudflare R2 ตาม requirement

---

## Payment Verify on Backend Only

Frontend:

```text
LIFF
 ↓
Backend
 ↓
Slip2Go
```

ห้าม:

```text
LIFF
 ↓
Slip2Go
```

---

## Create Order Before Payment

ถูกต้อง:

```text
Create Order
 ↓
Payment
 ↓
Verify
```

ไม่ใช่:

```text
Payment
 ↓
Create Order
```

---

## Telegram via Queue

ถูกต้อง:

```text
Order
 ↓
DB
 ↓
Queue
 ↓
Telegram
```

ไม่ให้ Telegram API block Order API

---

# 74. Final Order Flow

```text
LINE OA
 ↓
LIFF
 ↓
Menu
 ↓
Cart
 ↓
Checkout
 ↓
Create Order
 ↓
Telegram Admin
 ↓
Payment
 ↓
Upload Slip
 ↓
MinIO
 ↓
Slip2Go
 ↓
Verified
 ↓
PAID
 ↓
Kitchen
 ↓
PREPARING
 ↓
READY
 ↓
Assign Delivery
 ↓
OUT_FOR_DELIVERY
 ↓
จัดส่งแล้ว
 ↓
DELIVERED
 ↓
LINE Notification
 ↓
Telegram Notification
 ↓
COMPLETED
```

---

# 75. Final Stack Summary

```text
LANGUAGE
TypeScript

FRONTEND
Next.js
React
Tailwind CSS
shadcn/ui

DATA FETCHING
TanStack Query

CLIENT STATE
Zustand

FORMS
React Hook Form
Zod

LINE
LINE Official Account
LIFF
Messaging API

BACKEND
NestJS

DATABASE
PostgreSQL

ORM
Prisma

CACHE
Redis

QUEUE
BullMQ

REALTIME
Socket.IO

PAYMENT VERIFICATION
Slip2Go

ADMIN NOTIFICATION
Telegram Bot API

OBJECT STORAGE
MinIO

AUTH
LINE Identity
JWT
Refresh Token
RBAC

INFRASTRUCTURE
Ubuntu VPS
Docker
Docker Compose
Nginx

MONITORING
Uptime Kuma
Sentry

CI/CD
GitHub Actions
```

---

# 76. Development Priority

ลำดับการพัฒนาแนะนำ:

```text
1. Database Schema
2. NestJS Core
3. Auth / LINE Identity
4. Branch / Menu / Product
5. Cart
6. Checkout
7. Order State Machine
8. MinIO
9. Payment + Slip2Go
10. Telegram Notification
11. Kitchen Dashboard
12. WebSocket
13. Delivery
14. LINE Messaging
15. Admin Dashboard
16. Reports
17. Monitoring / Backup
```

---

# 77. Definition of Done — MVP

MVP ถือว่าพร้อมใช้งานจริงเมื่อ:

- ลูกค้าเปิด LIFF จาก LINE OA ได้
- ดูเมนูได้
- Admin/Kitchen กดเปิด/ปิดสินค้าหมดได้
- LIFF แสดง SOLD OUT และปิดการสั่งสินค้าที่หมดได้
- เพิ่มสินค้าใน Cart ได้
- Checkout ได้
- สร้าง Order ได้
- Admin ได้รับ Telegram เมื่อมี Order
- ลูกค้า Upload Slip ได้
- Slip ถูกเก็บใน MinIO
- Slip2Go ตรวจ Slip ได้
- ระบบกันสลิปซ้ำได้
- Payment เปลี่ยนเป็น VERIFIED ได้
- Order ส่งเข้าครัวอัตโนมัติ
- Kitchen กด PREPARING / READY ได้
- Delivery รับงานได้
- Delivery กด OUT_FOR_DELIVERY ได้
- Delivery กด "จัดส่งแล้ว" ได้
- Order เปลี่ยน DELIVERED ได้
- ลูกค้าได้รับ LINE Notification
- Admin ได้รับ Telegram Notification
- ระบบมี Audit / Status Logs
- Services รันด้วย Docker Compose
- PostgreSQL และ MinIO มี Backup

---

# End of Blueprint
