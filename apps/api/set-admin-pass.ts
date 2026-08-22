import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD_HASH are required');
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      name: 'PPTCWN Admin',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      name: 'PPTCWN Admin',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`Provisioned active super admin: ${email}`);
}

main().then(() => process.exit(0));
