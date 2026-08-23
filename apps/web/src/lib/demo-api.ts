export const demoBranches = [{ id: 'branch-siam', name: 'ครัวใบกะเพรา · สยาม', address: '88 ถนนพระราม 1 ปทุมวัน กรุงเทพฯ', storefrontHeadline: 'ครัวไทยรสมือแม่ วัตถุดิบสดทุกเช้า', storefrontSubheadline: 'ปรุงใหม่ทุกจาน · ส่งถึงคุณใน 25–35 นาที', storefrontThemeColor: '#205c45', freeDeliveryDistanceKm: 3, deliveryFeePerKm: 8 }];

const options = (prefix: string) => ({ variants: [{ id: `${prefix}-regular`, name: 'ธรรมดา', price: 89 }, { id: `${prefix}-special`, name: 'พิเศษ', price: 109 }], modifierGroups: [{ id: `${prefix}-spice`, name: 'ระดับความเผ็ด', minSelect: 1, maxSelect: 1, modifiers: [{ id: `${prefix}-mild`, name: 'เผ็ดน้อย', price: 0 }, { id: `${prefix}-hot`, name: 'เผ็ดแบบไทย', price: 0 }] }] });
export const demoCategories = [
  { id: 'recommended', name: 'เมนูแนะนำ', products: [
    { id: 'p1', name: 'กะเพราเนื้อวากิวไข่ดาว', description: 'เนื้อผัดพริกแห้ง ใบกะเพรากรอบ ไข่ดาวขอบฟู', basePrice: 129, salePrice: 109, imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.9, ...options('p1') },
    { id: 'p2', name: 'ข้าวผัดต้มยำกุ้ง', description: 'กุ้งสด คั่วเครื่องต้มยำ หอมมะนาวแท้', basePrice: 119, imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.8, ...options('p2') },
    { id: 'p3', name: 'ผัดไทยกุ้งสด', description: 'เส้นจันท์เหนียวนุ่ม ซอสสูตรบ้านเรา', basePrice: 109, imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.9, ...options('p3') },
  ]},
  { id: 'curry', name: 'ต้มยำ & แกง', products: [
    { id: 'p4', name: 'ต้มยำกุ้งน้ำข้น', description: 'สมุนไพรไทยและกุ้งแม่น้ำ น้ำซุปเข้มข้น', basePrice: 189, imageUrl: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.7, ...options('p4') },
    { id: 'p5', name: 'แกงเขียวหวานไก่', description: 'พริกแกงตำสด กะทิหอม เสิร์ฟพร้อมข้าว', basePrice: 99, imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.8, ...options('p5') },
  ]},
  { id: 'drink', name: 'เครื่องดื่ม & ของหวาน', products: [
    { id: 'p6', name: 'ชาไทยครีมนมสด', description: 'ชาไทยเข้ม หวานน้อย ครีมนมสด', basePrice: 65, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&auto=format&fit=crop&q=85', isAvailable: true, rating: 4.8, variants: [], modifierGroups: [] },
  ]},
];

export const demoOrders = [{ id: 'order-2408', orderNo: 'BAI-2408', status: 'PREPARING', orderType: 'DELIVERY', customerName: 'คุณมีนา', customerPhone: '0891234567', total: 347, createdAt: new Date().toISOString(), estimatedMinutes: 18, branch: demoBranches[0], items: [{ productId: 'p1', productName: 'กะเพราเนื้อวากิวไข่ดาว', quantity: 2, unitPrice: 109 }, { productId: 'p6', productName: 'ชาไทยครีมนมสด', quantity: 2, unitPrice: 65 }] }];

export const demoDashboard = { today: { revenue: 18420, orders: 86, avgOrderValue: 214, customers: 72 }, activeOrders: 12, preparingOrders: 7, readyOrders: 5, topProducts: demoCategories[0].products.map((product, index) => ({ ...product, quantity: 32 - index * 7, revenue: (32 - index * 7) * Number('salePrice' in product ? product.salePrice : product.basePrice) })), recentOrders: demoOrders };

export function getDemoResponse(url = ''): any {
  const path = url.split('?')[0];
  if (path === '/branches') return demoBranches;
  if (path.startsWith('/branches/')) return demoBranches[0];
  if (path === '/menu' || path.startsWith('/menu?')) return demoCategories;
  if (path === '/cart') return { id: 'demo-cart', items: [], totalItems: 0, subtotal: 0, discount: 0, deliveryFee: 0, total: 0 };
  if (path.includes('/orders/my-orders')) return demoOrders;
  if (path === '/orders' || path.includes('/admin/orders')) return demoOrders;
  if (path.startsWith('/orders/')) return demoOrders[0];
  if (path.includes('/admin/dashboard')) return demoDashboard;
  if (path.includes('/admin/customers')) return [{ id: 'c1', name: 'มีนา ใจดี', phone: '0891234567', _count: { orders: 12, addresses: 2 } }, { id: 'c2', name: 'นนท์ นักชิม', phone: '0815557288', _count: { orders: 8, addresses: 1 } }];
  if (path.includes('/admin/payments')) return [{ id: 'pay1', status: 'VERIFYING', amount: 347, createdAt: new Date().toISOString(), order: demoOrders[0] }];
  if (path.includes('/admin/promotions')) return [{ id: 'promo1', name: 'อิ่มคุ้มมื้อเที่ยง', description: 'ลด 15% เมื่อครบ 250 บาท', type: 'PERCENTAGE_DISCOUNT', discountValue: 15, isActive: true, coupons: [{ id: 'cp1', code: 'THAIFOOD15', maxUsage: 100, usageCount: 38, isActive: true }] }];
  if (path.includes('/kitchen') || path.includes('/orders/branch')) return demoOrders;
  if (path.includes('/deliver')) return demoOrders;
  if (path.includes('/expenses/summary')) return { totals: { total: 42380, vatAmount: 2772, subtotal: 39608 } };
  if (path.includes('/expenses/vendors')) return [{ id: 'v1', name: 'ตลาดสดสามย่าน', phone: '021234567' }];
  if (path.includes('/expenses')) return [{ id: 'e1', description: 'วัตถุดิบสดประจำวัน', category: 'วัตถุดิบ', subtotal: 5600, vatAmount: 392, total: 5992, status: 'CONFIRMED', expenseDate: new Date().toISOString(), attachments: [] }];
  if (path.includes('/revenue/system')) return { totals: { food: 18420, delivery: 1240, discount: 680, total: 18980 }, orders: demoOrders };
  if (path.includes('/revenue/summary')) return { gross: 62450, deductions: 11241, net: 51209 };
  if (path.includes('/revenue')) return [];
  return [];
}

export const isDemoMode = () => typeof window !== 'undefined' && (localStorage.getItem('ux_demo_mode') ?? 'true') === 'true';
