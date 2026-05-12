import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedsDir = path.resolve(__dirname, '../../seeds');
const dbFile = process.env.SQLITE_FILE || 'backend/data/app.sqlite';

const db = createDb(dbFile);

try {
  const files = await db.seed.run({ directory: seedsDir });
  console.log(`Seeds ejecutados: ${files[0].length}`);
  files[0].forEach((name) => console.log(` - ${name}`));
} catch (error) {
  console.error('Error ejecutando seed SQLite:', error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
