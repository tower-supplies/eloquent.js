import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { ReactNode } from 'react';

export type TDatabase = BetterSQLite3Database<Record<string, unknown>> | ExpoSQLiteDatabase<Record<string, unknown>>;
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
