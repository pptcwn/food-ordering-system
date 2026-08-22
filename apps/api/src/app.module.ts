import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { BranchesModule } from './branches/branches.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { DeliveryModule } from './delivery/delivery.module';
import { LineModule } from './line/line.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ExpensesModule } from './expenses/expenses.module';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    // Blueprint §53 — Rate Limiting (100 req/min for general API)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // 60 seconds window
        limit: 100,   // max 100 requests per window
      },
    ]),
    PrismaModule,
    StorageModule,
    QueueModule,
    HealthModule,
    WebsocketModule,
    AuthModule,
    CustomersModule,
    BranchesModule,
    CategoriesModule,
    ProductsModule,
    ModifiersModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReportsModule,
    // Blueprint §20, §34-35 — Dedicated Kitchen API
    KitchenModule,
    // Blueprint §22-28, §34-35 — Dedicated Delivery API
    DeliveryModule,
    // Blueprint §33, §53 — LINE Webhook + Messaging
    LineModule,
    // Blueprint §45, §71 — Promotions & Coupon Engine
    PromotionsModule,
    ExpensesModule,
    RevenueModule,
  ],
  providers: [
    // Global rate-limiting guard applied to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
