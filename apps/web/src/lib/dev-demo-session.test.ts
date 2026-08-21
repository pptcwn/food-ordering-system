import { describe, expect, it, vi } from 'vitest';

import { bootstrapDevDemoSession } from './dev-demo-session';

describe('bootstrapDevDemoSession', () => {
  it('stores the dev customer token before protected pages render', async () => {
    const storage = new Map<string, string>();
    const login = vi.fn().mockResolvedValue({ accessToken: 'demo-token' });

    await bootstrapDevDemoSession({
      enabled: true,
      login,
      storage: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
      },
    });

    expect(login).toHaveBeenCalledOnce();
    expect(storage.get('access_token')).toBe('demo-token');
  });
});
