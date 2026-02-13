import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { ReactNode, useEffect } from 'react';
import { Text, View } from 'react-native';

import { TDatabase, TErrorHandler, TMigrations, TSeeder } from '../types';

type TDatabaseMigrationsCallback = (migrated: boolean) => void;
interface TDatabaseMigrations<TDatabase> {
  database: TDatabase;
  errorHandler: TErrorHandler;
  callback: TDatabaseMigrationsCallback;
  migrations: TMigrations;
  seeder?: TSeeder;
  Migrating?: ReactNode;
}

/**
 * Apply the database migrations
 * @param {TDatabaseMigrations} parameter
 * @returns
 */
function DatabaseMigrations<T extends TDatabase>({
  database,
  errorHandler,
  callback,
  migrations,
  seeder,
  Migrating,
}: TDatabaseMigrations<T>) {
  const { success, error } = useMigrations(database, migrations);

  useEffect(() => {
    if (!success) {
      // Migrations in progress
      return;
    }

    // Finished migrations; seed the tables where relevant
    if (seeder) {
      seeder(database).then(() => callback(true));
    } else {
      callback(true);
    }
  }, [success]);

  // Show error
  if (error) {
    return errorHandler(database, error.message, 'during database initialisation');
  }

  // Show migration in progresss
  if (!success) {
    return (
      Migrating ?? (
        <View>
          <Text>Migrations are in progress...</Text>
        </View>
      )
    );
  }

  // Finished migrations
  return null;
}

export default DatabaseMigrations;
