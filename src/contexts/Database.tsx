import { createContext, ReactNode, useContext, useEffect, useReducer, useState } from 'react';

import { DatabaseInitialising, DatabaseMigrations, DatabaseOpener } from '../components';
import { DatabaseChangeType, ModelsActionType } from '../enums';
import { modelsReducer } from '../reducers';
import {
  TDatabaseModels,
  TDatabase as TDatabaseType,
  TErrorHandler,
  TMigrations,
  TModels as TModelsType,
  TOnChangeModel,
  TSchema,
  TSeeder,
} from '../types';

interface TProviderProps {
  children: ReactNode;
  databaseName: string;
  databaseModels: TDatabaseModels;
  errorHandler: TErrorHandler;
  migrations?: TMigrations;
  schema?: TSchema;
  seeder?: TSeeder;
  Initialising?: ReactNode;
  PleaseWait?: ReactNode;
}

interface TDatabaseContext<TDatabase extends TDatabaseType, TModels> {
  database: TDatabase | null;
  models: TModels;
  onChange: TOnChangeModel | null;
}

const DatabaseContext = createContext<TDatabaseContext<any, any>>({
  database: undefined as any,
  models: {} as any,
  onChange: null,
});

/**
 * Context hook with generic type
 * @returns {TDatabaseContext<TDatabaseType, TModels>}
 */
export function useDatabaseContext<
  TDatabase extends TDatabaseType,
  TModels extends TModelsType<TDatabaseModels>,
>(): TDatabaseContext<TDatabase, TModels> {
  const context = useContext<TDatabaseContext<TDatabase, TModels>>(DatabaseContext);

  if (context === undefined) {
    throw new Error('No database context provided');
  }

  return context;
}

/**
 * Provides database access, the order of operation is:
 *  - Open database, after which database is in context
 *  - Apply migrations
 *  - Register models in context
 * @param {TProviderProps} props
 * @returns
 */
const DatabaseProvider = <TDatabase extends TDatabaseType, TModels extends TModelsType<TDatabaseModels>>({
  children,
  databaseName,
  databaseModels,
  errorHandler,
  migrations,
  seeder,
  schema,
  Initialising,
  PleaseWait,
}: TProviderProps) => {
  const [database, setDatabase] = useState<TDatabase | null>(null);
  const [migrated, setMigrated] = useState<boolean>(false);
  const [models, setModels] = useReducer(modelsReducer, {} as TModels);

  /**
   * Register a model in the given container
   * @param {TModels} container
   * @param {TModelType} modelKey
   * @param {TModel} model
   * @param {TDb} database
   * @param {TOnChangeModel} onChange
   * @param {TModels} models
   */
  function registerModel<K extends keyof typeof databaseModels>(
    container: TModels,
    database: TDatabase,
    schema: TSchema,
    models: TDatabaseModels,
    modelKey: K,
    model: (typeof databaseModels)[K],
    onChange: TOnChangeModel
  ) {
    container[modelKey] = new model({}, database, schema, models, onChange) as TModels[K];
  }

  /**
   * Automatic refresh/update of context when database changes are saved
   * @param {DatabaseChangeType} changeType
   * @param {Model} model
   */
  function onChange<T>(changeType: DatabaseChangeType, model: T) {
    if (database) {
      const modelKey = model?.constructor.name.toLowerCase()!;
      const payload: TModels = {} as TModels;
      registerModel(
        payload,
        database,
        schema as unknown as TSchema,
        databaseModels,
        modelKey,
        databaseModels[modelKey],
        onChange
      );
      setModels({ type: ModelsActionType.CHANGE_MODELS, payload });
    }
  }

  /**
   * Operations to be executed after database has been opened and any migrations applied
   * e.g. register models in context
   */
  useEffect(() => {
    if (database && migrated) {
      // Register the models in container/context
      const payload: TModels = {} as TModels;
      for (const key of Object.keys(databaseModels) as (keyof typeof databaseModels)[]) {
        registerModel(
          payload,
          database,
          schema as unknown as TSchema,
          databaseModels,
          key,
          databaseModels[key],
          onChange
        );
      }

      // Update the provider to include the models
      setModels({ type: ModelsActionType.REGISTER_MODELS, payload });
    }
  }, [database, migrated]);

  return (
    <DatabaseContext.Provider value={{ database, models, onChange }}>
      <DatabaseOpener<TDatabase> databaseName={databaseName} callback={setDatabase} schema={schema} />
      {database && migrations && (
        <DatabaseMigrations<TDatabase>
          database={database}
          callback={setMigrated}
          errorHandler={errorHandler}
          migrations={migrations}
          seeder={seeder}
          PleaseWait={PleaseWait}
        />
      )}
      {database && migrated ? <>{children}</> : (Initialising ?? <DatabaseInitialising />)}
    </DatabaseContext.Provider>
  );
};

export { DatabaseContext, DatabaseProvider };
