import { PrismaClient, UserRole, OrderType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@foodordering.com' },
    update: {},
    create: {
      email: 'admin@foodordering.com',
      name: 'System Admin',
      phone: '0812345678',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('✅ Created Super Admin:', adminUser.email);

  // 2. Create Initial Branch (Rama 9)
  const branch = await prisma.branch.upsert({
    where: { code: 'BKK-RAMA9' },
    update: {},
    create: {
      name: 'สาขาพระราม 9 (Rama 9)',
      code: 'BKK-RAMA9',
      address: '99/1 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
      latitude: 13.7573,
      longitude: 100.5654,
      openingTime: '10:00',
      closingTime: '22:00',
      lastOrderTime: '21:30',
      telegramEnabled: true,
      telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '-1001234567890',
      paymentReceiverType: 'PROMPTPAY',
      paymentReceiverValue: '0812345678',
      paymentReceiverName: 'นาย สั่งอาหาร ตัวอย่าง',
      paymentReceiverBank: 'KBANK',
      openingHours: {
        create: [
          { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 2, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 3, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 4, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 5, openTime: '10:00', closeTime: '22:00', isClosed: false },
          { dayOfWeek: 6, openTime: '10:00', closeTime: '22:00', isClosed: false },
        ],
      },
    },
  });
  console.log('✅ Created Branch:', branch.name);

  // 3. Create Categories
  const catFriedChicken = await prisma.category.create({
    data: {
      name: 'ไก่ทอด & เมนูซิกเนเจอร์',
      description: 'ไก่ทอดกรอบสูตรเด็ด คลุกเคล้าเครื่องเทศเข้มข้น',
      sortOrder: 1,
    },
  });

  const catSnacks = await prisma.category.create({
    data: {
      name: 'ของทานเล่น',
      description: 'ทานเล่นเพลินๆ แกล้มมื้อหลัก',
      sortOrder: 2,
    },
  });

  const catBeverages = await prisma.category.create({
    data: {
      name: 'เครื่องดื่ม & ของหวาน',
      description: 'เครื่องดื่มเย็นสดชื่น ดับร้อน',
      sortOrder: 3,
    },
  });
  console.log('✅ Created Categories');

  // 4. Create Modifier Groups & Modifiers
  const spicinessGroup = await prisma.modifierGroup.create({
    data: {
      name: 'ระดับความเผ็ด',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      modifiers: {
        create: [
          { name: 'ไม่เผ็ด', price: 0, sortOrder: 1 },
          { name: 'เผ็ดน้อย', price: 0, sortOrder: 2 },
          { name: 'เผ็ดกลาง (แนะนำ)', price: 0, sortOrder: 3 },
          { name: 'เผ็ดมาก (พ่นไฟ)', price: 0, sortOrder: 4 },
        ],
      },
    },
  });

  const toppingGroup = await prisma.modifierGroup.create({
    data: {
      name: 'ท็อปปิ้งเพิ่มเติม',
      minSelect: 0,
      maxSelect: 3,
      isRequired: false,
      modifiers: {
        create: [
          { name: 'ชีสดิปเยิ้มๆ', price: 15, sortOrder: 1 },
          { name: 'ผงหม่าล่าเข้มข้น x2', price: 10, sortOrder: 2 },
          { name: 'หอมเจียวกรอบ', price: 10, sortOrder: 3 },
        ],
      },
    },
  });
  console.log('✅ Created Modifier Groups & Modifiers');

  // 5. Create Sample Products
  const malaChicken = await prisma.product.create({
    data: {
      categoryId: catFriedChicken.id,
      name: 'ไก่ทอดหม่าล่าสะท้านทรวง',
      description: 'ไก่ทอดกรอบนอกนุ่มใน คลุกผงหม่าล่าแท้สไตล์เสฉวน ชาลิ้นสะใจ',
      basePrice: 89,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
      modifierGroups: {
        create: [
          { modifierGroupId: spicinessGroup.id, sortOrder: 1 },
          { modifierGroupId: toppingGroup.id, sortOrder: 2 },
        ],
      },
      variants: {
        create: [
          { name: 'เซ็ต 4 ชิ้น (เดี่ยว)', price: 89, isDefault: true, sortOrder: 1 },
          { name: 'เซ็ต 8 ชิ้น (จุใจ)', price: 169, isDefault: false, sortOrder: 2 },
          { name: 'เซ็ตปาร์ตี้ 16 ชิ้น', price: 319, isDefault: false, sortOrder: 3 },
        ],
      },
    },
  });

  const porkBelly = await prisma.product.create({
    data: {
      categoryId: catFriedChicken.id,
      name: 'สามชั้นคั่วพริกเกลือ',
      description: 'หมูสามชั้นทอดกรอบคั่วพริกกระเทียมหอมๆ รสชาติจัดจ้าน',
      basePrice: 119,
      isAvailable: true,
      isActive: true,
      sortOrder: 2,
      modifierGroups: {
        create: [{ modifierGroupId: spicinessGroup.id, sortOrder: 1 }],
      },
    },
  });

  const frenchFries = await prisma.product.create({
    data: {
      categoryId: catSnacks.id,
      name: 'เฟรนช์ฟรายส์ชีสชีส',
      description: 'มันฝรั่งแท่งทอดกรอบ ราดซอสเชดด้าชีสเข้มข้น',
      basePrice: 59,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  const lemonTea = await prisma.product.create({
    data: {
      categoryId: catBeverages.id,
      name: 'ชามะนาวแท้ เย็นชื่นใจ',
      description: 'ชามะนาวต้มสด บีบมะนาวแป้นสดแท้ 100%',
      basePrice: 35,
      isAvailable: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('✅ Created Sample Products:', [malaChicken.name, porkBelly.name, frenchFries.name, lemonTea.name]);

  // 6. Create Delivery Staff
  const staff = await prisma.deliveryStaff.create({
    data: {
      branchId: branch.id,
      name: 'สมชาย วิ่งไว (Rider 01)',
      phone: '0899999999',
      status: 'AVAILABLE',
      isActive: true,
    },
  });
  console.log('✅ Created Delivery Staff:', staff.name);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
