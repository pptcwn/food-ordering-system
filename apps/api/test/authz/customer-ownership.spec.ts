import request from 'supertest';
import { AuthzHarness, createAuthzHarness } from './authz-harness';

describe('AC2 customer-ownership integration gate', () => {
  let harness: AuthzHarness;

  beforeAll(async () => {
    harness = await createAuthzHarness();
  });

  afterAll(async () => {
    await harness?.close();
  });

  it('normalizes Customer A access to Customer B order as not found without a write', async () => {
    const before = await harness.prisma.order.count();
    const response = await request(harness.app.getHttpServer())
      .get(`/orders/${harness.fixture.foreignOrderId}`)
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`);

    expect(response.status).toBe(404);
    expect(await harness.prisma.order.count()).toBe(before);
    harness.storage.assertNoWrites();
  });

  it('rejects Customer A mutations against Customer B cart and checkout without writes', async () => {
    const itemsBefore = await harness.prisma.cartItem.count();
    const ordersBefore = await harness.prisma.order.count();
    const mutation = await request(harness.app.getHttpServer())
      .patch(`/cart/items/${harness.fixture.foreignCartItemId}`)
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`)
      .send({ quantity: 2 });
    expect(mutation.status).toBe(404);
    expect(await harness.prisma.cartItem.count()).toBe(itemsBefore);

    const checkout = await request(harness.app.getHttpServer())
      .post('/orders')
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`)
      .send({ branchId: harness.fixture.branchBId, orderType: 'PICKUP', customerName: 'A', customerPhone: '0812345678' });
    expect(checkout.status).toBe(404);
    expect(await harness.prisma.order.count()).toBe(ordersBefore);
    harness.storage.assertNoWrites();
  });

  it('rejects Customer A payment reads and slip uploads for Customer B order without writes', async () => {
    const slipsBefore = await harness.prisma.paymentSlip.count();
    const detail = await request(harness.app.getHttpServer())
      .get(`/orders/${harness.fixture.foreignPaymentOrderId}/payment`)
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`);
    expect(detail.status).toBe(404);
    const upload = await request(harness.app.getHttpServer())
      .post(`/orders/${harness.fixture.foreignPaymentOrderId}/payment/slip`)
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`)
      .attach('slip', Buffer.from('not-a-slip'), 'slip.jpg');
    expect(upload.status).toBe(404);
    expect(await harness.prisma.paymentSlip.count()).toBe(slipsBefore);
    harness.storage.assertNoWrites();
  });

  it('denies customer storage uploads before storage writes', async () => {
    const response = await request(harness.app.getHttpServer())
      .post('/storage/upload')
      .set('authorization', `Bearer ${harness.fixture.customerAToken}`)
      .attach('file', Buffer.from('image'), 'image.jpg');
    expect(response.status).toBe(403);
    harness.storage.assertNoWrites();
  });
});
