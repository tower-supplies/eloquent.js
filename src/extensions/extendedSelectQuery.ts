import collect, { Collection } from 'collect.js';
import { inArray, notInArray } from 'drizzle-orm';
import { SQLiteColumn, SQLiteSelectBase } from 'drizzle-orm/sqlite-core';
import { SQLiteRunResult } from 'expo-sqlite';

import Model from '../classes/Model';
import { TDatabase } from '../types';

export type TSelectQuery<TAttributes> = SQLiteSelectBase<
  string,
  'sync',
  SQLiteRunResult,
  Record<string, SQLiteColumn<any, {}, {}>>,
  'single',
  Record<string, 'not-null'>,
  false,
  never,
  TAttributes[],
  Record<string, SQLiteColumn<any, {}, {}>>
>;

export type TSelectQueryExtended<TAttributes, TModel> = TSelectQuery<TAttributes> & {
  hydrate: () => Promise<Collection<TModel>>;
  whereIn: (field: SQLiteColumn, values: (number | string)[] | undefined) => TSelectQueryExtended<TAttributes, TModel>;
  whereNotIn: (
    field: SQLiteColumn,
    values: (number | string)[] | undefined
  ) => TSelectQueryExtended<TAttributes, TModel>;
};

const extendSelectQuery = <T extends TDatabase, TAttributes, TModel extends Model<TAttributes, T>>(
  query: TSelectQuery<TAttributes>,
  model: TModel
): TSelectQueryExtended<TAttributes, TModel> => {
  const extendedSelectQuery = query as TSelectQueryExtended<TAttributes, TModel>;

  // Then => this.execute
  // Execute => this.all
  // All => this._prepare().all(placeholderValues);

  /**
   * Hydration of raw results (JSON) back to their respective classes
   *
   * @returns {Promise<Collection<T>>}
   */
  extendedSelectQuery.hydrate = async (): Promise<Collection<TModel>> => {
    const rows = await extendedSelectQuery;
    return collect(model.hydrate(rows));
  };

  /**
   * `whereIn` helper for matching against values in an array
   *
   * @param {SQLiteColumn} field
   * @param {(string|number)[]} values
   * @returns {TQueryExtended<TAttributes>}
   */
  extendedSelectQuery.whereIn = (
    field: SQLiteColumn,
    values: (number | string)[] | undefined
  ): TSelectQueryExtended<TAttributes, TModel> => {
    if (values) {
      extendedSelectQuery.where(inArray(field, values));
    }
    return extendedSelectQuery;
  };

  /**
   * `whereNotIn` helper for matching against values not in an array
   *
   * @param {SQLiteColumn} field
   * @param {(string|number)[]} values
   * @returns {TQueryExtended<TAttributes>}
   */
  extendedSelectQuery.whereNotIn = (
    field: SQLiteColumn,
    values: (number | string)[] | undefined
  ): TSelectQueryExtended<TAttributes, TModel> => {
    if (values) {
      extendedSelectQuery.where(notInArray(field, values));
    }
    return extendedSelectQuery;
  };

  return extendedSelectQuery;
};

export default extendSelectQuery;
