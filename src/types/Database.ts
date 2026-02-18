import { Relations } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { ReactNode } from 'react';

export type TSchema = Record<string, SQLiteTable | Relations>;
export type TDatabase<Schema extends TSchema = Record<string, SQLiteTable | Relations>> =
  | BetterSQLite3Database<Schema>
  | ExpoSQLiteDatabase<Schema>;
export type TErrorHandler = (database: TDatabase, details: string, whenWhile: string) => ReactNode;
export interface TMigrations {
  journal: {
    entries: {
      idx: number;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, string>;
}
export type TSeeder = <TDatabase>(database: TDatabase) => Promise<void>;
