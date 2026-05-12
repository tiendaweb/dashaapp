import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');
const dbFile = process.env.SQLITE_FILE || 'backend/data/app.sqlite';

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = createDb(dbFile);

try {
  const [batchNo, log] = await db.migrate.latest({ directory: migrationsDir });
  console.log(`Migraciones aplicadas en lote ${batchNo}: ${log.length}`);
  log.forEach((name) => console.log(` - ${name}`));
} catch (error) {
  console.error('Error ejecutando migraciones SQLite:', error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
