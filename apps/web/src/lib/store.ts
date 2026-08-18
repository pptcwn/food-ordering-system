import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomerLocation {
  addressLine: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  note?: string;
}

interface AppState {
  customerName: string;
  customerPhone: string;
  orderType: 'DELIVERY' | 'PICKUP';
  location: CustomerLocation | null;
  activeBranchId: string | null;
  activeBranchName: string | null;
  cartCount: number;
  setCustomerInfo: (name: string, phone: string) => void;
  setOrderType: (type: 'DELIVERY' | 'PICKUP') => void;
  setLocation: (loc: CustomerLocation | null) => void;
  setActiveBranch: (id: string, name: string) => void;
  setCartCount: (count: number) => void;
  isProfileComplete: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      customerName: '',
      customerPhone: '',
      orderType: 'DELIVERY',
      location: null,
      activeBranchId: null,
      activeBranchName: null,
      cartCount: 0,
      setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),
      setOrderType: (type) => set({ orderType: type }),
      setLocation: (location) => set({ location }),
      setActiveBranch: (id, name) => set({ activeBranchId: id, activeBranchName: name }),
      setCartCount: (count) => set({ cartCount: count }),
      isProfileComplete: () => {
        const { customerName, customerPhone, location, orderType } = get();
        const hasName = customerName.trim().length > 0;
        const hasPhone = /^0[0-9]{8,9}$/.test(customerPhone.replace(/[^0-9]/g, ''));
        if (orderType === 'DELIVERY') {
          return hasName && hasPhone && location !== null && !!location.latitude;
        }
        return hasName && hasPhone;
      },
    }),
    {
      name: 'food_ordering_store',
    },
  ),
);
