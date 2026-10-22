import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { migrate } from './migrations';
import * as schema from './schema';

export const sqlite = openDatabaseSync('qazaflow.db');
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
migrate(sqlite);

export const db = drizzle(sqlite, { schema });
export { schema };
