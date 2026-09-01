// Seed del único USUARIO_ADMIN del portafolio (Sprint 0 / UC-01).
//
// Usa ADMIN_EMAIL y ADMIN_PASSWORD_SEED desde variables de entorno (nunca hardcodeadas ni
// commiteadas en texto plano) y guarda la contraseña siempre hasheada con bcrypt.
// Idempotente: puede correrse muchas veces (upsert por email).
//
// Ejecutar con: npx prisma db seed   (usa el comando configurado en prisma7.config.ts)

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BCRYPT_SALT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const passwordSeed = process.env.ADMIN_PASSWORD_SEED;

  if (!email || !passwordSeed) {
    throw new Error(
      'Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD_SEED en el entorno. Definilos en apps/api/.env antes de correr el seed.',
    );
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(passwordSeed, BCRYPT_SALT_ROUNDS);

    const admin = await prisma.usuarioAdmin.upsert({
      where: { email },
      update: {
        // No se sobrescribe la contraseña ni los contadores de bloqueo en corridas repetidas
        // del seed sobre un admin ya existente; solo se asegura que el registro exista.
      },
      create: {
        email,
        password_hash: passwordHash,
        nombre: 'Administrador',
        rol: 'admin',
      },
    });

    console.log(`Usuario admin listo: ${admin.email} (id: ${admin.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Error corriendo el seed de USUARIO_ADMIN:', error);
  process.exit(1);
});
