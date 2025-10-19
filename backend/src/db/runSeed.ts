import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const seedsDir = path.resolve(__dirname, '../../seeds');
  const files = fs.readdirSync(seedsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
    logger.info({ file }, 'Running seed');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error({ error, file }, 'Seed failed');
      throw error;
    }
  }

  logger.info('Seed complete');
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'Seed runner failed');
  process.exit(1);
});
