'use client';

import liff from '@line/liff';
import { apiClient } from './api';

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

let isLiffInitialized = false;

export async function initLiff(liffId?: string): Promise<LineProfile | null> {
  if (typeof window === 'undefined') return null;

  const targetLiffId =
    liffId ||
    process.env.NEXT_PUBLIC_LIFF_ID ||
    process.env.LIFF_ID ||
    '';

  if (!targetLiffId) {
    console.log('ℹ️ LIFF ID not provided, running in Web/Guest mode');
    return null;
  }

  try {
    if (!isLiffInitialized) {
      await liff.init({ liffId: targetLiffId });
      isLiffInitialized = true;
    }

    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      const idToken = liff.getIDToken();

      // Silent sync with backend to get customer profile & saved addresses
      if (idToken) {
        try {
          const authRes: any = await apiClient.post('/auth/line', { idToken });
          if (authRes && authRes.accessToken) {
            localStorage.setItem('access_token', authRes.accessToken);
          }
        } catch (e) {
          console.warn('Line backend sync notice:', e);
        }
      }

      return profile;
    } else if (liff.isInClient()) {
      liff.login();
    }
  } catch (error) {
    console.error('LIFF initialization error:', error);
  }

  return null;
}

export function isLiffInClient(): boolean {
  if (typeof window === 'undefined') return false;
  return liff.isInClient();
}
