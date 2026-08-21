type SessionStorage = Pick<Storage, 'getItem' | 'setItem'>;

type BootstrapDevDemoSessionOptions = {
  enabled: boolean;
  login: () => Promise<{ accessToken?: string } | null | undefined>;
  storage: SessionStorage;
};

export async function bootstrapDevDemoSession({
  enabled,
  login,
  storage,
}: BootstrapDevDemoSessionOptions): Promise<void> {
  if (!enabled || storage.getItem('access_token')) return;

  const result = await login();
  if (result?.accessToken) storage.setItem('access_token', result.accessToken);
}
