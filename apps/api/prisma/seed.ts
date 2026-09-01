// Seed del único USUARIO_ADMIN del portafolio (Sprint 0 / UC-01) y de los
// catálogos iniciales de Sprint 1 (Tecnologia, PlataformaRed — soporte de
// UC-03 y UC-06).
//
// Usa ADMIN_EMAIL y ADMIN_PASSWORD_SEED desde variables de entorno (nunca hardcodeadas ni
// commiteadas en texto plano) y guarda la contraseña siempre hasheada con bcrypt.
// Idempotente: puede correrse muchas veces (upsert por email / por nombre, sin duplicar).
//
// Ejecutar con: npx prisma db seed   (usa el comando configurado en prisma7.config.ts)

import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BCRYPT_SALT_ROUNDS = 12;

/** UC-03: catálogo inicial de tecnologías (docs/plan-tecnico.md, Sprint 1). */
const TECNOLOGIAS_SEMILLA = [
  'React',
  'NestJS',
  'TypeScript',
  'PostgreSQL',
  'Prisma',
  'Node.js',
  'Tailwind CSS',
  'Docker',
];

/**
 * UC-06: catálogo inicial de plataformas de red social. `icono` es un
 * string simple que el frontend mapeará a un ícono real más adelante, no
 * requiere ninguna librería de íconos en el backend.
 */
const PLATAFORMAS_RED_SEMILLA = [
  { nombre: 'LinkedIn', icono_defecto: 'linkedin' },
  { nombre: 'GitHub', icono_defecto: 'github' },
  { nombre: 'Twitter/X', icono_defecto: 'twitter' },
  { nombre: 'Correo', icono_defecto: 'mail' },
  { nombre: 'Sitio personal', icono_defecto: 'link' },
];

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

    for (const nombre of TECNOLOGIAS_SEMILLA) {
      await prisma.tecnologia.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      });
    }
    console.log(
      `Catálogo de tecnologías listo (${TECNOLOGIAS_SEMILLA.length}).`,
    );

    for (const plataforma of PLATAFORMAS_RED_SEMILLA) {
      await prisma.plataformaRed.upsert({
        where: { nombre: plataforma.nombre },
        update: { icono_defecto: plataforma.icono_defecto },
        create: plataforma,
      });
    }
    console.log(
      `Catálogo de plataformas de red listo (${PLATAFORMAS_RED_SEMILLA.length}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Error corriendo el seed:', error);
  process.exit(1);
});
