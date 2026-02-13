import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import { useEffect } from 'react';

import * as extendedRelationalQuery from '../extensions/extendedRelationalQuery';
import { TDatabase as TDatabaseType, TSchema } from '../types';

type TDatabaseOpenerCallback<TDatabase> = (database: TDatabase) => void;
interface TDatabaseOpener<TDatabase> {
  databaseName: string;
  callback: TDatabaseOpenerCallback<TDatabase>;
  schema?: TSchema;
}

/**
 * Open the SQLite database and apply the Drizzle wrapper
 * @param {TDatabaseOpener} parameter
 * @returns
 */
function DatabaseOpener<TDatabase extends TDatabaseType>({
  databaseName,
  callback,
  schema,
}: TDatabaseOpener<TDatabase>) {
  extendedRelationalQuery;

  useEffect(() => {
    openDatabaseAsync(databaseName).then((db) => {
      const drizzleDb = drizzle(db, { schema }) as unknown as TDatabase;
      //console.log(`Opened database: ${databaseName}`, drizzleDb)
      callback(drizzleDb);
    });
  }, [databaseName]);

  return null;
}

export default DatabaseOpener;
