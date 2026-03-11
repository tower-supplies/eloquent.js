import {
  and,
  AnyColumn,
  eq,
  getTableColumns,
  inArray,
  Many,
  notInArray,
  One,
  or,
  Relation,
  SQL,
  Table,
} from 'drizzle-orm';
import { alias, SQLiteColumn, SQLiteSelectBase } from 'drizzle-orm/sqlite-core';
import { SQLiteRunResult } from 'expo-sqlite';

import { EloquentModel } from '../classes';
import { TAttributes as Attributes, TDatabase, TWhereOperator } from '../types';
import whereCriteria from './whereCriteria';

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

export type TSelectQueryExtended<TAttributes, TModel> = {
  // Original methods which now return this type
  groupBy: (groupBy: any) => TSelectQueryExtended<TAttributes, TModel>;
  having: (having: any) => TSelectQueryExtended<TAttributes, TModel>;
  limit: (limit: any) => TSelectQueryExtended<TAttributes, TModel>;
  orderBy: (orderBy: any) => TSelectQueryExtended<TAttributes, TModel>;
  // New methods
  hydrate: () => Promise<TModel[]>;
  orWhere: (field: unknown, operator?: TWhereOperator, value?: any) => TSelectQueryExtended<TAttributes, TModel>;
  where: (
    field: unknown,
    operator?: TWhereOperator,
    value?: any,
    and?: boolean
  ) => TSelectQueryExtended<TAttributes, TModel>;
  whereIn: (field: SQLiteColumn, values: (number | string)[] | undefined) => TSelectQueryExtended<TAttributes, TModel>;
  whereNotIn: (
    field: SQLiteColumn,
    values: (number | string)[] | undefined
  ) => TSelectQueryExtended<TAttributes, TModel>;
  // Relations
  with: (relationName: string | string[]) => TSelectQueryExtended<TAttributes, TModel>;
} & TSelectQuery<TAttributes>;

const extendSelectQuery = <
  T extends TDatabase,
  TAttributes extends Attributes,
  TModel extends EloquentModel<TAttributes, T>,
>(
  query: TSelectQuery<TAttributes>,
  model: TModel
): TSelectQueryExtended<TAttributes, TModel> => {
  const extendedSelectQuery = query as TSelectQueryExtended<TAttributes, TModel> & {
    // Original methods which need aliasing for reuse
    _original_all: (placeholderValues: any) => TAttributes[];
    _original_where: (where: any) => void;
    // Properties which we don't need to expose
    existingConditions: SQL | undefined;
    withRelations: Record<string, string>;
  };
  extendedSelectQuery.withRelations = {};

  // Copy original methods, which we'll replace with our own implementations
  extendedSelectQuery._original_all = query.all;
  extendedSelectQuery._original_where = query.where;

  // Then => this.execute
  // Execute => this.all
  // All => this._prepare().all(placeholderValues);

  extendedSelectQuery.all = (placeholderValues): TAttributes[] => {
    //console.log('Relational row mapping:', extendedSelectQuery.useRelationalRowMap);
    const rows = extendedSelectQuery._original_all(placeholderValues);
    if (Object.keys(extendedSelectQuery.withRelations).length) {
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
   * `orWhere` helper
   *
   * @param {SQLiteColumn|string|function} field
   * @param {WhereOperator|unknown} operator
   * @param {unknown} value
   * @returns {TQueryExtended<TAttributes>}
   */
  extendedSelectQuery.orWhere = (
    field: unknown,
    operator?: TWhereOperator | unknown,
    value?: unknown
  ): TSelectQueryExtended<TAttributes, TModel> => {
    if (field instanceof SQLiteColumn || typeof field === 'string') {
      // If value is not provided assume operator is the value and use equals
      if (value === undefined && operator) {
        return extendedSelectQuery.orWhere(field, '=', operator);
      }

      if (operator) {
        return extendedSelectQuery.where(field, operator as TWhereOperator, value, false);
      }
    }

    return extendedSelectQuery.where(field, undefined, value, false);
  };

  /**
   * `where` helper
   *
   * @param {unknown} field
   * @param {WhereOperator|unknown} operator
   * @param {unknown} value
   * @param {boolean} andConditions
   * @returns {TQueryExtended<TAttributes>}
   */
  extendedSelectQuery.where = (
    field: unknown,
    operator?: TWhereOperator | unknown,
    value?: unknown,
    andConditions = true
  ): TSelectQueryExtended<TAttributes, TModel> => {
    if (field instanceof SQLiteColumn || typeof field === 'string') {
      // If value is not provided assume operator is the value and use equals
      if (value === undefined && operator) {
        return extendedSelectQuery.where(field, '=', operator, !!andConditions);
      }

      // Check if field provided as dot.notation
      let columns: Record<string, SQLiteColumn<any, {}, {}>> = model.getTableColumns();
      let columnName: string | undefined = typeof field === 'string' ? field : undefined;
      if (typeof field === 'string') {
        const matches = /(.*)\.(.*)/.exec(field);
        if (matches) {
          columnName = matches[2];

          const { toModel } = resolveRelation(matches[1]);
          if (toModel) {
            const tableDefinition = toModel.getTableDefinition();
            const aliasedTable = alias(tableDefinition, matches[1]);
            columns = getTableColumns(aliasedTable as typeof tableDefinition);
          }
        }
      }

      const column =
        field instanceof SQLiteColumn ? field : Object.values(columns).find(({ name }) => name === columnName);
      if (!column) {
        throw new Error(`Unable to find column: ${field}`);
      }

      if (operator) {
        const condition = whereCriteria(column, operator as TWhereOperator, value);
        if (condition) {
          const withExistingConditions = andConditions ? and : or;
          extendedSelectQuery.existingConditions = extendedSelectQuery.existingConditions
            ? withExistingConditions(extendedSelectQuery.existingConditions, condition)
            : condition;
        }
        extendedSelectQuery._original_where(extendedSelectQuery.existingConditions);
      }
    } else {
      if (field instanceof SQL) {
        const withExistingConditions = andConditions ? and : or;
        extendedSelectQuery.existingConditions = extendedSelectQuery.existingConditions
          ? withExistingConditions(extendedSelectQuery.existingConditions, field)
          : field;

        extendedSelectQuery._original_where(extendedSelectQuery.existingConditions);
      } else {
        // Pass through directly to select query; Drizzle ORM format
        extendedSelectQuery._original_where(field);
      }
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
            if (!Object.values(extendedSelectQuery.withRelations).includes(parentRelation)) {
              throw Error(`Parent relation (${parentRelation}) is missing`);
            }
            fromModel = fromModel.getRelatedModel(part);
          } else if (part) {
            // Final part
            relation = fromModel.getTableRelation(part);
            toModel = fromModel.getRelatedModel(part);
          }
        }
      }
    } else {
      // Root relation
      relation = model.getTableRelation(relationName);
      toModel = model.getRelatedModel(relationName);
    }

    return { relation, toModel, fromModel };
  };

  /**
   * Internal method to resolve source field for relationships
   *
   * @param {Table} sourceTable
   * @param {AnyColumn} field
   * @param {string} relationName
   * @param {Record<string, string>} relations
   * @returns
   */
  const resolveSourceField = (
    sourceTable: Table,
    field: AnyColumn,
    relationName: string,
    relations: Record<string, string>
  ): AnyColumn => {
    const matches = /(.*)\.(.*)/.exec(relationName);
    if (matches) {
      // Find source table index
      const sourceTableAlias = model.relationTableAlias(matches[1], relations);
      const sourceAlias = alias(sourceTable, sourceTableAlias);
      return Object.values(sourceAlias).find(({ name }) => name === field.name) ?? field;
    }
    return field;
  };

  /**
   * `with` helper for eager-loading relationships
   *
   * @param {string|string[]} withRelation
   */
  extendedSelectQuery.with = (withRelation: string | string[]): TSelectQueryExtended<TAttributes, TModel> => {
    // Support multiple relations, in array
    if (Array.isArray(withRelation)) {
      withRelation.forEach((name) => extendedSelectQuery.with(name));
      return extendedSelectQuery;
    }

    // Check if alias is provided in relation
    let relationName: string;
    let tableAlias: string | undefined = undefined;
    const aliasMatch = /(.*) (?:as|AS) (.*)/.exec(withRelation);
    if (aliasMatch) {
      relationName = aliasMatch[1];
      tableAlias = aliasMatch[2];
    } else {
      relationName = withRelation;
    }

    const relations = extendedSelectQuery.withRelations;
    const { relation, toModel, fromModel } = resolveRelation(relationName);
    if (relation && toModel) {
      // Need to use relational row mapping to process the results
      const relationTableAlias = tableAlias ?? `t${Object.keys(relations).length}`;
      relations[relationTableAlias] = relationName;

      // Attempt to lazy load relation
      if (relation instanceof Many) {
        // Find the inverse relation so we know which field to use
        const modelRelations: Record<string, Relation<string>> = toModel.getTableRelations();
        const inverseRelation = Object.values(modelRelations).find((modelRelation) => {
          const { referencedTable } = modelRelation;
          return (
            referencedTable === fromModel.getTableDefinition() &&
            (modelRelation.relationName === relation.relationName || !modelRelation.relationName)
          );
        });

        if (inverseRelation && inverseRelation instanceof One && inverseRelation.config) {
          const { referencedTable, sourceTable } = relation;
          const { fields, references } = inverseRelation.config; // Inverse of normal fields <=> references

          // Join the table, using aliases
          const referenceAlias = alias(referencedTable, relationTableAlias);

          // Build criteria
          const wheres: SQL[] = [];
          const andWheres: SQL[] = [];
          references.forEach((reference, index) => {
            const sourceField = resolveSourceField(sourceTable, references[index], relationName, relations);
            const referenceField =
              Object.values(referenceAlias).find(({ name }) => name === fields[index].name) ?? fields[index];
            if (reference instanceof SQL) {
              andWheres.push(eq(referenceField, reference));
            } else {
              wheres.push(eq(sourceField, referenceField));
            }
          });
          query.leftJoin(referenceAlias, andWheres.length ? and(...wheres, ...andWheres) : and(...wheres));
        }
      } else if (relation instanceof One && relation.config) {
        const { referencedTable, sourceTable } = relation;
        const { fields, references } = relation.config;

        // Join the table, using aliases
        const referenceAlias = alias(referencedTable, relationTableAlias);

        // Build criteria
        const wheres: SQL[] = [];
        const andWheres: SQL[] = [];
        references.forEach((reference, index) => {
          const sourceField = resolveSourceField(sourceTable, fields[index], relationName, relations);
          const referenceField =
            Object.values(referenceAlias).find(({ name }) => name === references[index].name) ?? references[index];
          if (reference instanceof SQL) {
            andWheres.push(eq(sourceField, reference));
          } else {
            wheres.push(eq(referenceField, sourceField));
          }
        });
        query.leftJoin(referenceAlias, andWheres.length ? and(...wheres, ...andWheres) : and(...wheres));
      }
    }

    return extendedSelectQuery;
  };

  return extendedSelectQuery;
};

export default extendSelectQuery;
