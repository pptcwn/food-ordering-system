const BASE_URL = process.env.API_URL || 'http://34.126.172.168:3000/api';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

async function request(path: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    const errMsg = json?.message || json?.error || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);
  }

  if (json && json.success !== undefined && json.data !== undefined) {
    return json.data;
  }
  return json;
}

async function test(suite: string, name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      suite,
      name,
      passed: true,
      durationMs,
      details,
    });
    console.log(`  ✅ [PASS] ${suite} > ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const errMsg = err.message || JSON.stringify(err);
    results.push({
      suite,
      name,
      passed: false,
      durationMs,
      error: errMsg,
    });
    console.log(`  ❌ [FAIL] ${suite} > ${name} (${durationMs}ms) -> ${errMsg}`);
  }
}

async function runSmokeTests() {
  console.log(`\n🚀 Starting Full System Smoke Test against ${BASE_URL}...\n`);

  const guestSessionId = 'smoke_test_' + Date.now();
  const authHeaders = { 'x-session-id': guestSessionId };

  let testBranchId = '';
  let testProductId = '';
  let testCartItemId = '';
  let testOrderId = '';

  // 1. Health & Infrastructure
  await test('Infrastructure', 'API Health Check via Port 3000 Proxy', async () => {
    const data = await request('/health');
    return data;
  });

  // 2. Branches & GPS
  await test('Branches', 'Get All Branches', async () => {
    const branches = await request('/branches');
    if (!Array.isArray(branches) || branches.length === 0) {
      throw new Error('No branches returned in database');
    }
    testBranchId = branches[0].id;
    return { totalBranches: branches.length, firstBranch: branches[0].name };
  });

  await test('Branches', 'Find Nearest Branch by GPS', async () => {
    const nearest = await request('/branches/nearest?lat=13.7563&lng=100.5018');
    if (!nearest || !nearest.id) {
      throw new Error('Nearest branch calculation failed');
    }
    return { name: nearest.name, distanceKm: nearest.distanceKm };
  });

  // 3. Menu & Products Catalog
  await test('Menu Catalog', 'Get Full Categorized Menu', async () => {
    const menu = await request(`/menu?branchId=${testBranchId}`);
    if (!Array.isArray(menu)) {
      throw new Error('Menu is not an array');
    }
    for (const cat of menu) {
      if (cat.products && cat.products.length > 0) {
        testProductId = cat.products[0].id;
        break;
      }
    }
    return { totalCategories: menu.length, sampleProductId: testProductId };
  });

  await test('Menu Catalog', 'Get Product Details by ID', async () => {
    if (!testProductId) throw new Error('No product ID found to query');
    const product = await request(`/products/${testProductId}`);
    if (!product || !product.name) throw new Error('Product not found');
    return { name: product.name, price: product.basePrice };
  });

  // 4. Cart Lifecycle
  await test('Cart Lifecycle', 'Add Item to Cart', async () => {
    if (!testProductId || !testBranchId) throw new Error('Missing product or branch');
    const cart = await request('/cart/items', {
      method: 'POST',
      headers: authHeaders,
      body: {
        branchId: testBranchId,
        productId: testProductId,
        quantity: 2,
        specialNote: 'Smoke Test Item (No Spicy)',
      },
    });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Item not added to cart');
    }
    testCartItemId = cart.items[0].id;
    return { totalItems: cart.totalItems, subtotal: cart.subtotal };
  });

  await test('Cart Lifecycle', 'Update Item Quantity in Cart', async () => {
    if (!testCartItemId) throw new Error('No cart item ID');
    const cart = await request(`/cart/items/${testCartItemId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { quantity: 3 },
    });
    return { totalItems: cart.totalItems, subtotal: cart.subtotal };
  });

  await test('Cart Lifecycle', 'Get Active Cart Summary', async () => {
    const cart = await request('/cart', { headers: authHeaders });
    if (!cart || cart.totalItems < 1) throw new Error('Cart is empty');
    return { totalItems: cart.totalItems, subtotal: cart.subtotal };
  });

  // 5. Delivery Fee Calculation
  await test('Delivery Engine', 'Calculate Dynamic Delivery Fee', async () => {
    const fee = await request('/delivery/calculate-fee', {
      method: 'POST',
      body: {
        branchId: testBranchId,
        latitude: 13.7563,
        longitude: 100.5018,
      },
    });
    return fee;
  });

  // 6. Order Creation & Verification
  await test('Order Flow', 'Create New Food Order', async () => {
    const order = await request('/orders', {
      method: 'POST',
      headers: authHeaders,
      body: {
        branchId: testBranchId,
        orderType: 'DELIVERY',
        customerName: 'คุณทดสอบระบบ (Smoke Tester)',
        customerPhone: '0812345678',
        deliveryAddress: 'ตึก G Tower พระราม 9 กรุงเทพฯ',
        deliveryLatitude: 13.7573,
        deliveryLongitude: 100.5654,
        note: 'ทดสอบ Smoke Test อัตโนมัติ',
      },
    });
    if (!order || !order.id) throw new Error('Order creation failed');
    testOrderId = order.id;
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.orderStatus,
    };
  });

  await test('Order Flow', 'Fetch Order Details by ID', async () => {
    if (!testOrderId) throw new Error('No order ID');
    const order = await request(`/orders/${testOrderId}`, { headers: authHeaders });
    if (!order || order.id !== testOrderId) throw new Error('Order lookup failed');
    return { orderNumber: order.orderNumber, status: order.orderStatus };
  });

  // 7. Kitchen & Rider Status Pipeline
  await test('Kitchen KDS', 'Move Order to PREPARING', async () => {
    if (!testOrderId) throw new Error('No order ID');
    const order = await request(`/orders/admin/${testOrderId}/status`, {
      method: 'PATCH',
      body: {
        status: 'PREPARING',
        changedBy: 'KITCHEN_STAFF',
      },
    });
    return { status: order.orderStatus };
  });

  await test('Kitchen KDS', 'Move Order to READY', async () => {
    if (!testOrderId) throw new Error('No order ID');
    const order = await request(`/orders/admin/${testOrderId}/status`, {
      method: 'PATCH',
      body: {
        status: 'READY',
        changedBy: 'KITCHEN_STAFF',
      },
    });
    return { status: order.orderStatus };
  });

  await test('Rider Dispatch', 'Move Order to OUT_FOR_DELIVERY', async () => {
    if (!testOrderId) throw new Error('No order ID');
    const order = await request(`/orders/admin/${testOrderId}/status`, {
      method: 'PATCH',
      body: {
        status: 'OUT_FOR_DELIVERY',
        changedBy: 'RIDER_STAFF',
      },
    });
    return { status: order.orderStatus };
  });

  await test('Rider Dispatch', 'Move Order to DELIVERED', async () => {
    if (!testOrderId) throw new Error('No order ID');
    const order = await request(`/orders/admin/${testOrderId}/status`, {
      method: 'PATCH',
      body: {
        status: 'DELIVERED',
        changedBy: 'RIDER_STAFF',
        reason: 'Delivered successfully in smoke test',
      },
    });
    return { status: order.orderStatus };
  });

  // Print Final Summary Table
  console.log('\n========================================');
  console.log('📊 LIVE SMOKE TEST SUMMARY');
  console.log('========================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed:      ${passed} ✅`);
  console.log(`Failed:      ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
