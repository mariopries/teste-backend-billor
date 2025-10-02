import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  const adminEmail = 'admin@demo.com';
  const adminPassword = 'admin123';
  const passwordHash = sha256(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin',
      email: adminEmail,
      password_hash: passwordHash,
    },
  });

  console.log('Seed completed. Demo user:');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword} (SHA256 hashed in DB)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
