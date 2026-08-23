'use client';

import { useCallback } from 'react';

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore on unsupported devices
      }
    }
  }, []);

  return {
    /** Light tap - add to cart, toggle */
    light: useCallback(() => vibrate(10), [vibrate]),
    /** Medium feedback - confirm action */
    medium: useCallback(() => vibrate(25), [vibrate]),
    /** Heavy feedback - error, delete */
    heavy: useCallback(() => vibrate([30, 50, 30]), [vibrate]),
    /** Success pattern - order placed */
    success: useCallback(() => vibrate([10, 30, 10, 30, 50]), [vibrate]),
  };
}
