import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { runMigrations } from '../../src/lib/pg-migrate';

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL tidak ditemukan di file .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🚀 Memulai eksekusi migrasi PostgreSQL...');
    await runMigrations(pool);
    console.log('✅ Migrasi database PostgreSQL selesai dengan sukses!');
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
