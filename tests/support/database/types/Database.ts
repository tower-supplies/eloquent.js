import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from '../schema';

type TDatabase = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export default TDatabase;
