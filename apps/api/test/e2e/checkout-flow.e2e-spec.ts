import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@food-ordering/types';

describe('Critical Checkout & Staff Progress Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  
  let branchId: string;
  let productId: string;
  let customerToken: string;
  let kitchenToken: string;
  let orderId: string;
  
  // Skip full E2E run if DATABASE_URL is not set (e.g., local without docker)
  // CI will have DATABASE_URL set and will run this.
  const shouldRun = !!process.env.DATABASE_URL;

  beforeAll(async () => {
    if (!shouldRun) return;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Setup Test Data
    const branch = await prisma.branch.findFirst({ where: { code: 'BKK-RAMA9' } });
    if (!branch) throw new Error('Seed data missing: Branch BKK-RAMA9 not found');
    branchId = branch.id;

    const product = await prisma.product.findFirst();
    if (!product) throw new Error('Seed data missing: No products found');
    productId = product.id;

    // Create Test Customer
    const customer = await prisma.user.upsert({
      where: { email: 'customer_e2e@test.com' },
      update: {},
      create: {
        email: 'customer_e2e@test.com',
        name: 'E2E Customer',
        phone: '0811111111',
        role: UserRole.CUSTOMER,
      }
    });

    // Create Test Kitchen Staff
    const kitchen = await prisma.user.upsert({
      where: { email: 'kitchen_e2e@test.com' },
      update: {},
      create: {
        email: 'kitchen_e2e@test.com',
        name: 'E2E Kitchen',
        phone: '0822222222',
        role: UserRole.KITCHEN,
        staff: {
          create: {
            branchId: branch.id,
            name: 'E2E Kitchen Staff'
          }
        }
      }
    });

    customerToken = jwtService.sign({ sub: customer.id, role: customer.role });
    kitchenToken = jwtService.sign({ sub: kitchen.id, role: kitchen.role });
  });

  afterAll(async () => {
    if (app) {
      await prisma.user.deleteMany({ where: { email: { contains: '_e2e@test.com' } } });
      await app.close();
    }
  });

  it('sanity check (bypass if no DB)', () => {
    expect(true).toBe(true);
  });

  if (shouldRun) {
    it('/orders/checkout (POST) - Customer creates an order', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          branchId,
          orderType: 'PICKUP',
          customerName: 'E2E Customer',
          customerPhone: '0811111111',
          paymentMethod: 'PROMPTPAY',
          items: [
            {
              productId,
              quantity: 2,
              price: 89,
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.orderNo).toBeDefined();
      expect(response.body.orderStatus).toBe('PENDING_PAYMENT');
      
      orderId = response.body.id;
    });

    it('/orders/admin/:id/status (PATCH) - Kitchen CANNOT accept unpaid order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/orders/admin/${orderId}/status`)
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(400); // Bad Request from OrderLifecycleService
    });
  }
});
