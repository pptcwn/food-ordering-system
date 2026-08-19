import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@food-ordering/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MinioService } from '../../src/storage/minio.service';
import { InMemoryStorageSpy } from './storage-spy';

export interface AuthzFixture {
  branchAId: string;
  branchBId: string;
  customerAId: string;
  customerBId: string;
  kitchenAId: string;
  kitchenBId: string;
  adminAId: string;
  deliveryAId: string;
  deliveryStaffAId: string;
  foreignCartItemId: string;
  productBId: string;
  foreignPaymentOrderId: string;
  foreignDeliveryId: string;
  foreignOrderId: string;
  customerAToken: string;
  kitchenAToken: string;
  adminAToken: string;
  deliveryAToken: string;
  expiredCustomerToken: string;
  fallbackSecretToken: string;
}

export interface AuthzHarness {
  app: INestApplication;
  prisma: PrismaService;
  storage: InMemoryStorageSpy;
  fixture: AuthzFixture;
  close(): Promise<void>;
}

function requireFixtureEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'AUTHZ_TEST_DB_NAME',
    'AUTHZ_TEST_POSTGRES_PORT',
    'AUTHZ_TEST_REDIS_PORT',
    'JWT_SECRET',
    'JWT_FALLBACK_SECRET',
  ];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required authz fixture variable: ${key}`);
  }

  const databaseName = process.env.AUTHZ_TEST_DB_NAME!;
  const postgresPort = process.env.AUTHZ_TEST_POSTGRES_PORT!;
  const redisPort = process.env.AUTHZ_TEST_REDIS_PORT!;
  if (
    !process.env.DATABASE_URL!.includes(databaseName) ||
    !process.env.DATABASE_URL!.includes(`127.0.0.1:${postgresPort}`) ||
    process.env.REDIS_URL !== `redis://127.0.0.1:${redisPort}/0`
  ) {
    throw new Error('Refusing to run authz tests against a non-generated disposable fixture');
  }
}

export async function createAuthzHarness(): Promise<AuthzHarness> {
  requireFixtureEnvironment();
  const storage = new InMemoryStorageSpy();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MinioService)
    .useValue(storage)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  const fixture = await createFixture(prisma);
  return {
    app,
    prisma,
    storage,
    fixture,
    close: () => app.close(),
  };
}

async function createFixture(prisma: PrismaService): Promise<AuthzFixture> {
  const suffix = `${process.env.AUTHZ_TEST_DB_NAME!.replace('food_authz_', '')}-${randomUUID().slice(0, 8)}`;
  const [branchA, branchB] = await Promise.all([
    prisma.branch.create({ data: { name: `Authz Branch A ${suffix}`, code: `AUTHZ-A-${suffix}` } }),
    prisma.branch.create({ data: { name: `Authz Branch B ${suffix}`, code: `AUTHZ-B-${suffix}` } }),
  ]);
  const [customerA, customerB, kitchenA, kitchenB, adminA, deliveryA] = await Promise.all([
    prisma.user.create({ data: { name: 'Authz Customer A', role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { name: 'Authz Customer B', role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { name: 'Authz Kitchen A', role: UserRole.KITCHEN } }),
    prisma.user.create({ data: { name: 'Authz Kitchen B', role: UserRole.KITCHEN } }),
    prisma.user.create({ data: { name: 'Authz Admin A', role: UserRole.ADMIN } }),
    prisma.user.create({ data: { name: 'Authz Delivery A', role: UserRole.DELIVERY } }),
  ]);
  await prisma.staff.createMany({
    data: [
      { userId: kitchenA.id, branchId: branchA.id, role: UserRole.KITCHEN },
      { userId: kitchenB.id, branchId: branchB.id, role: UserRole.KITCHEN },
      { userId: adminA.id, branchId: branchA.id, role: UserRole.ADMIN },
      { userId: deliveryA.id, branchId: branchA.id, role: UserRole.DELIVERY },
    ],
  });
  const foreignOrder = await prisma.order.create({
    data: {
      orderNo: `AUTHZ-${suffix}`,
      userId: customerB.id,
      branchId: branchB.id,
      subtotal: 100,
      discount: 0,
      deliveryFee: 0,
      total: 100,
      customerName: 'Authz Customer B',
      customerPhone: '0000000000',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const category = await prisma.category.create({ data: { name: `Authz Category ${suffix}` } });
  const productB = await prisma.product.create({
    data: { categoryId: category.id, branchId: branchB.id, name: `Authz Product B ${suffix}`, basePrice: 100 },
  });
  const cartB = await prisma.cart.create({ data: { userId: customerB.id, branchId: branchB.id } });
  const foreignCartItem = await prisma.cartItem.create({
    data: { cartId: cartB.id, productId: productB.id, quantity: 1 },
  });
  await prisma.payment.create({ data: { orderId: foreignOrder.id, amount: 100 } });
  const foreignDelivery = await prisma.delivery.create({ data: { orderId: foreignOrder.id } });
  const deliveryStaffA = await prisma.deliveryStaff.create({
    data: { branchId: branchA.id, name: `Authz Rider A ${suffix}`, phone: '0812345678' },
  });
  const currentJwt = new JwtService({ secret: process.env.JWT_SECRET! });
  const fallbackJwt = new JwtService({ secret: process.env.JWT_FALLBACK_SECRET! });
  return {
    branchAId: branchA.id,
    branchBId: branchB.id,
    customerAId: customerA.id,
    customerBId: customerB.id,
    kitchenAId: kitchenA.id,
    kitchenBId: kitchenB.id,
    adminAId: adminA.id,
    deliveryAId: deliveryA.id,
    deliveryStaffAId: deliveryStaffA.id,
    foreignCartItemId: foreignCartItem.id,
    productBId: productB.id,
    foreignPaymentOrderId: foreignOrder.id,
    foreignDeliveryId: foreignDelivery.id,
    foreignOrderId: foreignOrder.id,
    customerAToken: currentJwt.sign({ sub: customerA.id, role: UserRole.CUSTOMER }),
    kitchenAToken: currentJwt.sign({ sub: kitchenA.id, role: UserRole.KITCHEN }),
    adminAToken: currentJwt.sign({ sub: adminA.id, role: UserRole.ADMIN }),
    deliveryAToken: currentJwt.sign({ sub: deliveryA.id, role: UserRole.DELIVERY }),
    expiredCustomerToken: currentJwt.sign(
      { sub: customerA.id, role: UserRole.CUSTOMER },
      { expiresIn: -60 },
    ),
    fallbackSecretToken: fallbackJwt.sign({ sub: customerA.id, role: UserRole.CUSTOMER }),
  };
}
