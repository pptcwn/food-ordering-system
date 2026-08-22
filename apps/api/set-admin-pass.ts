import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin1234', 12);
  const user = await prisma.user.updateMany({
    where: { email: 'admin@foodordering.com' },
    data: { passwordHash },
  });
  console.log('Updated admin password to: admin1234');
}

main().then(() => process.exit(0));
