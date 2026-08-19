import request from 'supertest';
import { AuthzHarness, createAuthzHarness } from './authz-harness';

describe('AC1 authentication-denial integration gate', () => {
  let harness: AuthzHarness;

  beforeAll(async () => {
    harness = await createAuthzHarness();
  });

  afterAll(async () => {
    await harness?.close();
  });

  it.each([
    ['absent token', undefined],
    ['malformed token', 'Bearer not-a-jwt'],
  ])('rejects %s on a protected staff route without a write', async (_name, authorization) => {
    const before = await harness.prisma.order.count();
    const response = await request(harness.app.getHttpServer())
      .get('/orders/admin/all')
      .set(authorization ? { authorization } : {});

    expect(response.status).toBe(401);
    expect(await harness.prisma.order.count()).toBe(before);
    harness.storage.assertNoWrites();
  });

  it.each(['expiredCustomerToken', 'fallbackSecretToken'] as const)(
    'rejects %s without a write',
    async (tokenName) => {
      const before = await harness.prisma.order.count();
      const response = await request(harness.app.getHttpServer())
        .get('/orders/admin/all')
        .set('authorization', `Bearer ${harness.fixture[tokenName]}`);

      expect(response.status).toBe(401);
      expect(await harness.prisma.order.count()).toBe(before);
      harness.storage.assertNoWrites();
    },
  );
});
