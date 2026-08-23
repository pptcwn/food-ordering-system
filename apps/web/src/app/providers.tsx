'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { bootstrapDevDemoSession } from '@/lib/dev-demo-session';
import { FeedbackProvider } from '@/components/ui/feedback-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isDemoSessionReady, setIsDemoSessionReady] = useState(
    process.env.NEXT_PUBLIC_DEV_DEMO_ENABLED !== 'true',
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    if (!localStorage.getItem('ux_demo_mode')) localStorage.setItem('ux_demo_mode', 'true');
    if (!localStorage.getItem('access_token')) localStorage.setItem('access_token', 'ux-demo-token');
    if (!localStorage.getItem('admin_user')) localStorage.setItem('admin_user', JSON.stringify({ role: 'SUPER_ADMIN', name: 'ผู้จัดการร้าน' }));
    if (process.env.NEXT_PUBLIC_DEV_DEMO_ENABLED !== 'true') return;

    bootstrapDevDemoSession({
      enabled: true,
      login: () => apiClient.post('/auth/dev/customer'),
      storage: localStorage,
    })
      .catch((error) => console.warn('Development demo login unavailable:', error))
      .finally(() => setIsDemoSessionReady(true));
  }, []);

  return <QueryClientProvider client={queryClient}><FeedbackProvider>{isDemoSessionReady ? children : null}</FeedbackProvider></QueryClientProvider>;
}
