#!/usr/bin/env node
// Sube un archivo local (el dump generado por backup-db.sh) a la carpeta
// `backups/` del mismo bucket S3 que usa S3MediaStorageService (ver
// apps/api/src/modules/media/storage/s3-media-storage.service.ts) — mismas
// variables de entorno (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// AWS_REGION, S3_BUCKET_NAME), reutilizando el SDK ya presente en
// apps/api (@aws-sdk/client-s3, dependencia de producción).
//
// No se invoca solo: lo llama apps/api/scripts/backup-db.sh.
// Uso: node upload-backup-to-s3.js <ruta-local> <key-s3>
'use strict';

const { readFileSync } = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function main() {
  const [, , filePath, key] = process.argv;
  if (!filePath || !key) {
    console.error('Uso: node upload-backup-to-s3.js <ruta-local> <key-s3>');
    process.exit(1);
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    console.error('[backup] Falta S3_BUCKET_NAME en el entorno.');
    process.exit(1);
  }

  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  const body = readFileSync(filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
    }),
  );

  console.log(`[backup] Subido a s3://${bucket}/${key}`);
}

main().catch((err) => {
  console.error('[backup] Error subiendo el backup a S3:', err);
  process.exit(1);
});
