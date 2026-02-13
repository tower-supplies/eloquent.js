import collect, { Collection } from 'collect.js';
import { SQLiteSyncRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query';

import { TDatabaseModels, TModel, TModelType } from '../types';

/**
 * Extend the relation query builder, with hydration etc.
 */
declare module 'drizzle-orm/sqlite-core/query-builders/query' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface SQLiteSyncRelationalQuery<TResult> {
    hydrate<T extends TModel<TDatabaseModels, TModelType<TDatabaseModels>>>(model: T): Promise<Collection<T>>;
  }
}

/**
 * Hydration of raw results (JSON) back to their respective classes
 *
 * @param {T extends TModel<TModelType>} model
 * @returns
 */
SQLiteSyncRelationalQuery.prototype.hydrate = async function <
  T extends TModel<TDatabaseModels, TModelType<TDatabaseModels>>,
>(model: T & { hydrate: (rows: any) => T[] }): Promise<Collection<T>> {
  return this.then((rows) => collect(model.hydrate(rows)));
};
