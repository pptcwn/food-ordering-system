import request from 'supertest';
import { AuthzHarness, createAuthzHarness } from './authz-harness';

describe('AC3 staff-role-and-branch-isolation integration gate', () => {
  let harness: AuthzHarness;

  beforeAll(async () => {
    harness = await createAuthzHarness();
  });

  afterAll(async () => {
    await harness?.close();
  });

  it('rejects a branch-A kitchen principal attempting to list branch-B orders', async () => {
    const before = await harness.prisma.order.count();
    const response = await request(harness.app.getHttpServer())
      .get(`/orders/admin/all?branchId=${harness.fixture.branchBId}`)
      .set('authorization', `Bearer ${harness.fixture.kitchenAToken}`);

    expect(response.status).toBe(403);
    expect(await harness.prisma.order.count()).toBe(before);
    harness.storage.assertNoWrites();
  });

  it.each([
    ['kitchen list', 'get', `/kitchen/orders?branchId=${'branchBId'}`, 'kitchenAToken'],
    ['admin payment list', 'get', `/admin/payments?branchId=${'branchBId'}`, 'adminAToken'],
    ['delivery list', 'get', `/admin/deliveries?branchId=${'branchBId'}`, 'deliveryAToken'],
    ['delivery staff list', 'get', `/admin/deliveries/staff/list?branchId=${'branchBId'}`, 'deliveryAToken'],
  ] as const)('rejects foreign branch %s', async (_name, method, path, tokenName) => {
    const response = await request(harness.app.getHttpServer())[method](path.replace('branchBId', harness.fixture.branchBId))
      .set('authorization', `Bearer ${harness.fixture[tokenName]}`);
    expect(response.status).toBe(403);
    harness.storage.assertNoWrites();
  });

  it('rejects foreign branch product and delivery mutations without writes', async () => {
    const productBefore = await harness.prisma.product.findUniqueOrThrow({ where: { id: harness.fixture.productBId } });
    const productResponse = await request(harness.app.getHttpServer())
      .patch(`/kitchen/products/${harness.fixture.productBId}/availability`)
      .set('authorization', `Bearer ${harness.fixture.kitchenAToken}`)
      .send({ is_available: false });
    expect(productResponse.status).toBe(403);
    expect((await harness.prisma.product.findUniqueOrThrow({ where: { id: harness.fixture.productBId } })).isAvailable).toBe(productBefore.isAvailable);

    const deliveryResponse = await request(harness.app.getHttpServer())
      .patch(`/admin/deliveries/${harness.fixture.foreignDeliveryId}/pickup`)
      .set('authorization', `Bearer ${harness.fixture.deliveryAToken}`);
    expect(deliveryResponse.status).toBe(403);
    harness.storage.assertNoWrites();
  });
});
