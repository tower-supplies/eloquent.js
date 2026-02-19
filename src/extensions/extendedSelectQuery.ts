import { eq, inArray, Many, notInArray, One, Relation } from 'drizzle-orm';
import { SQLiteColumn, SQLiteSelectBase } from 'drizzle-orm/sqlite-core';
import { SQLiteRunResult } from 'expo-sqlite';

import Model from '../classes/Model';
import { TAttributes as Attributes, TDatabase } from '../types';

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

export interface TOperator {}

export type TSelectQueryExtended<TAttributes, TModel> = {
  // Original methods which need aliasing for reuse
  _original_all: (placeholderValues: any) => TAttributes[];
  _original_where: (where: any) => void;
  // Original methods which now return this type
  groupBy: (groupBy: any) => TSelectQueryExtended<TAttributes, TModel>;
  having: (having: any) => TSelectQueryExtended<TAttributes, TModel>;
  limit: (limit: any) => TSelectQueryExtended<TAttributes, TModel>;
  orderBy: (orderBy: any) => TSelectQueryExtended<TAttributes, TModel>;
  // New methods
  hydrate: () => Promise<TModel[]>;
  where: (field: any, operator?: TOperator, value?: any) => TSelectQueryExtended<TAttributes, TModel>;
  whereIn: (field: SQLiteColumn, values: (number | string)[] | undefined) => TSelectQueryExtended<TAttributes, TModel>;
  whereNotIn: (
    field: SQLiteColumn,
    values: (number | string)[] | undefined
  ) => TSelectQueryExtended<TAttributes, TModel>;
  // Relations
  withRelations: string[];
  with: (relationName: string) => TSelectQueryExtended<TAttributes, TModel>;
} & TSelectQuery<TAttributes>;

const extendSelectQuery = <T extends TDatabase, TAttributes extends Attributes, TModel extends Model<TAttributes, T>>(
  query: TSelectQuery<TAttributes>,
  model: TModel
): TSelectQueryExtended<TAttributes, TModel> => {
  const extendedSelectQuery = query as TSelectQueryExtended<TAttributes, TModel>;
  extendedSelectQuery.withRelations = [];

  // Copy original methods, which we'll replace with our own implementations
  extendedSelectQuery._original_all = query.all;
  extendedSelectQuery._original_where = query.where;

  // Then => this.execute
  // Execute => this.all
  // All => this._prepare().all(placeholderValues);

  extendedSelectQuery.all = (placeholderValues): TAttributes[] => {
    //console.log('Relational row mapping:', extendedSelectQuery.useRelationalRowMap);
    const rows = extendedSelectQuery._original_all(placeholderValues);
    if (extendedSelectQuery.withRelations.length) {
      return model.relationalRowMapper(rows, extendedSelectQuery.withRelations);
    }
    return rows;
  };

  /**
   * Hydration of raw results (JSON) back to their respective classes
   *
   * @returns {Promise<TModel[]>}
   */
  extendedSelectQuery.hydrate = async (): Promise<TModel[]> => {
    const rows = await extendedSelectQuery;
    return model.hydrate(rows);
  };

  /**
   * `where` helper
   *
   * @param {any} field
   * @param {TOperator} operator
   * @param {any} value
   * @returns {TQueryExtended<TAttributes>}
   */
  extendedSelectQuery.where = (
    field: any,
    operator?: TOperator,
    value?: any
  ): TSelectQueryExtended<TAttributes, TModel> => {
    if (field instanceof SQLiteColumn || typeof field === 'string') {
      console.log('Custom where implementation');
    } else {
      // Pass through directly to select query; Drizzle ORM format
      extendedSelectQuery._original_where(field);
    }
    return extendedSelectQuery;
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
    if (values?.length) {
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
    if (values?.length) {
      extendedSelectQuery.where(notInArray(field, values));
    }
    return extendedSelectQuery;
  };

  /**
   * Resolve relation and model instances from relation name
   *
   * @param {string} relationName
   * @returns {{ relation: Relation<string>|undefined, toModel: any, fromModel: any }}
   */
  const resolveRelation = (
    relationName: string
  ): {
    relation: Relation<string> | undefined;
    toModel: any;
    fromModel: any;
  } => {
    let relation: Relation<string> | undefined;
    let toModel: any;
    let fromModel = model;

    // Support dot.notation and drill down to the required relation
    const parts = relationName.split('.');
    if (parts.length > 1) {
      const nestedParts = [];
      while (parts.length) {
        const part = parts.shift();
        if (part) {
          nestedParts.push(part);

          if (parts.length) {
            // Nested relation, check that parent exists
            const parentRelation = nestedParts.join('.');
            if (!extendedSelectQuery.withRelations.includes(parentRelation)) {
              throw Error(`Parent relation (${parentRelation}) is missing`);
            }
            fromModel = fromModel.getRelatedModel(part, true);
          } else if (part) {
            // Final part
            relation = fromModel.getTableRelation(part);
            toModel = fromModel.getRelatedModel(part, true);
          }
        }
      }
    } else {
      // Root relation
      relation = model.getTableRelation(relationName);
      toModel = model.getRelatedModel(relationName, true);
    }

    return { relation, toModel, fromModel };
  };

  /**
   * `with` helper for eager-loading relationships
   *
   * @param {string} relationName
   */
  extendedSelectQuery.with = (relationName: string): TSelectQueryExtended<TAttributes, TModel> => {
    const { relation, toModel, fromModel } = resolveRelation(relationName);
    if (relation && toModel) {
      // Need to use relational row mapping to process the results
      extendedSelectQuery.withRelations.push(relationName);

      // Attempt to lazy load relation
      if (relation instanceof Many) {
        // Find the inverse relation so we know which field to use
        const modelRelations: Record<string, Relation<string>> = toModel.getTableRelations();
        const inverseRelation = Object.values(modelRelations).find(
          ({ referencedTable }) => referencedTable === fromModel.getTableDefinition()
        );

        if (inverseRelation && inverseRelation instanceof One && inverseRelation.config) {
          const { referencedTable } = relation;
          const { fields, references } = inverseRelation.config;

          // Join the table
          query.leftJoin(referencedTable, eq(fields[0], references[0]));
        }
      } else if (relation instanceof One && relation.config) {
        const { referencedTable } = relation;
        const { fields, references } = relation.config;

        // Join the table
        query.leftJoin(referencedTable, eq(fields[0], references[0]));
      }
    }

    return extendedSelectQuery;
  };

  return extendedSelectQuery;
};

export default extendSelectQuery;
