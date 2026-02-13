import { Relations } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

type TSchema = Record<string, SQLiteTable | Relations>;

export default TSchema;
