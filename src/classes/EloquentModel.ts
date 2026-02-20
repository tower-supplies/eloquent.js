import collect, { Collection } from 'collect.js';
import {
  and,
  createTableRelationsHelpers,
  eq,
  extractTablesRelationalConfig,
  getTableColumns,
  getTableName,
  Many,
  One,
  Relation,
  Relations,
  SQL,
} from 'drizzle-orm';
import { toCamelCase } from 'drizzle-orm/casing';
import { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { deepEqual } from 'fast-equals';
import Pluralize from 'pluralize';

import DatabaseChangeType from '../enums/DatabaseChangeType';
import extendSelectQuery, { TSelectQuery, TSelectQueryExtended } from '../extensions/extendedSelectQuery';
import { modelValidator } from '../rules';
import { TAttributes as Attributes, TDatabase, TDatabaseModels, TModelType, TOnChangeModel, TSchema } from '../types';
import { ucfirst } from '../utils';

/**
 * Sets property on an object
 * @param {object} object
 * @param {PropertyKey} key
 * @param {K} value
 */
function setProperty<T extends object, K extends PropertyKey, V extends K extends keyof T ? T[K] : any>(
  object: T,
  key: K,
  value: V
): asserts object is Extract<
  T & Record<K, V> extends infer O
    ? {
        [P in keyof O]: O[P];
      }
    : never,
  T
> {
  (object as any)[key] = value;
}

export default class EloquentModel<TAttributes extends Attributes, T extends TDatabase> {
  // Declare property types
  protected _database: T;
  protected _models: TDatabaseModels | undefined = undefined;
  protected _onChange: TOnChangeModel | undefined = undefined;
  protected _primaryKeyColumn: SQLiteColumn | undefined;
  protected _schema: TSchema;
  protected _schemaKey!: string;
  protected _table!: SQLiteTable;

  // Entity properties, following Laravel's naming convention
  protected _attributes: Partial<TAttributes> = {};
  protected _changes: Partial<TAttributes> = {};
  protected _original: TAttributes | undefined;

  /**
   * Returns the primary key column for the table, or undefined if there is no primary key defined
   * @returns {SQLiteColumn|undefined}
   */
  getKeyColumn(): SQLiteColumn | undefined {
    const primaryKeyColumn = Object.entries(getTableColumns(this._table)).find(([, column]) => column.primary === true);
    if (primaryKeyColumn) {
      const [, column] = primaryKeyColumn;
      return column;
    }
    return undefined;
  }

  /**
   * Guesses the name of the model's corresponding schema entry
   * @returns {string}
   */
  protected guessSchemaKey(): string {
    const className = this.constructor.name.replace(/Class$/, '');
    return `${toCamelCase(Pluralize(className))}Table`;
  }

  /**
   * Attempts to resolve the model's table from the schema automatically
   * @returns {SQLiteTable}
   */
  protected guessTable(): SQLiteTable {
    const schemaEntry = Object.entries(this._schema).find(
      ([name, entry]: [string, SQLiteTable | Relations]) =>
        name === this._schemaKey && entry.constructor.name === 'SQLiteTable'
    );
    if (schemaEntry) {
      const [, sqliteTable] = schemaEntry;
      return sqliteTable as SQLiteTable;
    }
    throw new Error(`Unable to find entry in schema: ${this._schemaKey}`);
  }

  /**
   * Return attributes if fully completed/populated, else undefined
   * @param {Partial<TAttributes>} attributes
   * @returns {TAttributes|undefined}
   */
  protected completedAttributes(attributes: Partial<TAttributes>): TAttributes | undefined {
    // Check essential criteria
    const validator = modelValidator(this);
    if (validator.passes()) {
      return { ...attributes } as TAttributes;
    }
    //console.log(validator);

    return undefined;
  }

  /**
   * Returns a proxy of the model with magic methods to handle the getting/setting of model properties
   * @param {this} model
   * @returns {Proxy<this>}
   */
  private addMagicMethods(model: this): this {
    return new Proxy(model, {
      get(target, name, receiver) {
        if (!Reflect.has(target, name)) {
          const stringName = String(name);
          //console.log(`Getting non-existent property '${stringName}'`);
          // Check if attribute exists
          const attributes = model.getAttributes();
          const columns = model.getTableColumns();
          const relations = model.getTableRelations();
          if (
            Object.keys(attributes).includes(stringName) ||
            Object.keys(columns).includes(stringName) ||
            Object.keys(relations).includes(stringName)
          ) {
            //console.log(`Returning attribute '${stringName}': ${attributes[stringName]}`);
            return model.getAttribute(stringName as keyof TAttributes);
          }
        }
        return Reflect.get(target, name, receiver);
      },
      set(target, name, value, receiver) {
        if (!Reflect.has(target, name)) {
          const stringName = String(name);
          //console.log(`Setting non-existent property '${stringName}', initial value: ${value}`);
          // Check if attribute exists
          const attributes = model.getAttributes();
          const columns = model.getTableColumns();
          const relations = model.getTableRelations();
          if (
            Object.keys(attributes).includes(stringName) ||
            Object.keys(columns).includes(stringName) ||
            Object.keys(relations).includes(stringName)
          ) {
            //console.log(`Setting attribute '${stringName}': ${attributes[stringName]} => ${value}`);
            return model.setAttribute(stringName, value);
          }
        }
        return Reflect.set(target, name, value, receiver);
      },
    });
  }

  /**
   * Initialise the model
   * @param {TAttributes} attributes
   * @param {TDatabase} database
   * @param {TSchema} schema
   * @param {TDatabaseModels} models
   * @param {TOnChangeModel | undefined} onChange
   */
  constructor(
    attributes: Partial<TAttributes> = {},
    database: T,
    schema: TSchema,
    models: TDatabaseModels | undefined = undefined,
    onChange: TOnChangeModel | undefined = undefined
  ) {
    //console.log(`Initialising ${containerKey}:`, attributes);
    this._database = database;
    this._models = models;
    this._onChange = onChange;
    this._schema = schema;
    this._schemaKey = this._schemaKey || this.guessSchemaKey();
    this._table = this._table || this.guessTable();
    this._primaryKeyColumn = this.getKeyColumn();

    // Set the data for the entity, where applicable
    if (attributes) {
      this.setAttributes(attributes);
      this._original = this.completedAttributes(attributes);
      if (this.getKey()) {
        // No changes on initialising when key is given
        this._changes = {};
      }
    }

    // Return the proxied object to support "magic" methods
    return this.addMagicMethods(this);
  }

  /**
   *
   * @param rawRows
   * @param withRelations
   * @returns
   */
  relationalRowMapper(rawRows: Record<string, any>, withRelations: string[]): TAttributes[] {
    /*
    // Originally it looked like using the relational query might be easier, but it actually ended up seeming longer
    // and/or convoluted than using a custom implementation
    const { tables, tableNamesMap } = extractTablesRelationalConfig(this._schema, createTableRelationsHelpers);
    const tableConfig: TableRelationalConfig | undefined = Object.values(tables)
      .find(({ dbName }) => dbName === this.getTableName());

    if (tableConfig) { 
      const selectionEntries = Object.entries(tableConfig.columns);
      const selection = selectionEntries.map(([key, value]) => ({
        dbKey: value.name,
        tsKey: key,
        field: aliasedTableColumn(value, 'users'), // aliasedTableColumn(value, tableAlias),
        relationTableTsKey: void 0,
        isJson: false,
        selection: []
      }));

      const rows = rawRows.map((row) => mapRelationalRow(tables, tableConfig, row, selection));
      console.log(rows);
      if (this.queryMode === "first") {
        return rows[0];
      }
      return rows;
    }
    */

    // Iterate over each of the raw rows with the row mapper
    //const rows = {} as Record<string, TAttributes[]>;
    //const rows = [] as TAttributes[];
    const rows: Record<string, TAttributes> = {};
    rawRows.forEach((rawRow: any) => {
      this.rowMapper(rawRow, this, withRelations, rows);
    });
    return this.flatten(Object.values(rows), this);
  }

  protected flatten<TRowModel extends TDatabaseModels>(rows: TAttributes[], model: TRowModel) {
    const tableRelations = Object.entries(model.getTableRelations());
    return rows.map((row) => {
      Object.entries(row).forEach(([key, value]) => {
        const tableRelation = tableRelations.find(([relationName]) => relationName === key);
        if (tableRelation) {
          const [, relation] = tableRelation;
          if (relation instanceof Many) {
            row = {
              ...row,
              [key]: this.flatten(Object.values(value), model.getRelatedModel(key)),
            };
          }
        }
      });
      return row;
    });
  }

  /**
   * Maps the objects from the rawRow to the relevant hierarchy in a row
   * @param {any} rawRow
   * @param {TRowModel extends TDatabaseModels} model
   * @param {string[]} withRelations
   * @returns
   */
  protected rowMapper<TRowModel extends TDatabaseModels>(
    rawRow: any,
    model: TRowModel,
    withRelations: string[],
    rows: Record<string, any>
  ) {
    const tableName = model.getTableName();
    const tableRelations = Object.entries(model.getTableRelations());
    const primaryKey = rawRow[tableName] ? rawRow[tableName][model.getKeyName()] : undefined;

    // Add row
    if (rows[primaryKey] === undefined) {
      rows[primaryKey] = rawRow[tableName];
    }
    const row: Record<string, any> = rows[primaryKey];

    // Add relations to row
    if (row) {
      tableRelations.forEach(([relationName, relation]) => {
        const modelInstance = model.getRelatedModel(relationName);
        if (modelInstance && withRelations.includes(relationName)) {
          const regex = new RegExp(`^${relationName}.(.*)`);
          const relatedRelations = withRelations
            .map((relation: string): string | null => {
              const matches = relation.match(regex);
              return matches?.length ? matches[1] : null;
            })
            .filter((relation) => !!relation) as string[];

          if (relation instanceof Many) {
            // Has Many
            if (row[relationName] === undefined) {
              row[relationName] = {};
            }
            this.rowMapper(rawRow, modelInstance, relatedRelations, row[relationName]);
          } else if (relation instanceof One) {
            // Has One
            const relation = this.rowMapper(rawRow, modelInstance, relatedRelations, {});
            row[relationName] = relation ?? undefined;
          }
        }
      });
    }

    return row;
  }

  /**
   * Returns a specific attribute for the given instance
   * @param {keyof TAttributes} key
   * @param {any} fallback
   * @returns {any}
   */
  getAttribute(key: keyof TAttributes, fallback: any = undefined): any {
    if (this._attributes[key]) {
      return this._attributes[key];
    }

    const relationPromise = this.lazyLoadRelation(key); // Lazy-load relation where applicable, see below
    if (relationPromise instanceof Promise) {
      return relationPromise;
    }

    return fallback;
  }

  /**
   * Returns a Promise of the related model(s)
   * @param {keyof TAttributes} key
   * @returns {Promise<any>|undefined}
   */
  protected lazyLoadRelation(key: keyof TAttributes): Promise<any> | undefined {
    // Check if relation and associated model exist
    const relationName = key as string;
    const relation = this.getTableRelation(relationName);
    const modelInstance = this.getRelatedModel(relationName);
    if (relation && modelInstance) {
      let criteria: any[] = [];
      let singular = false;

      // Attempt to lazy load relation
      if (relation instanceof Many) {
        // Find the inverse relation so we know which field to use
        const modelRelations: Record<string, Relation<string>> = modelInstance.getTableRelations();
        const inverseRelation = Object.values(modelRelations).find(
          ({ referencedTable }) => referencedTable === this.getTableDefinition()
        );
        if (inverseRelation && inverseRelation instanceof One && inverseRelation.config) {
          const { fields, references } = inverseRelation.config;
          criteria = references
            .map((reference, index) => {
              const value = this._attributes[reference.name as keyof TAttributes];
              return value ? eq(fields[index], value) : null;
            })
            .filter((criteria) => criteria);
        }
      } else if (relation instanceof One && relation.config) {
        singular = true;
        const { fields, references } = relation.config;
        criteria = fields
          .map((field, index) => {
            const value = this._attributes[field.name as keyof TAttributes];
            return value ? eq(references[index], value) : null;
          })
          .filter((criteria) => criteria);
      }

      if (criteria.length) {
        // Return the promise to fetch and hydrate the relation
        return modelInstance
          .query()
          .where(criteria)
          .then((rows: TModelType<typeof modelInstance>[]): any => {
            if (singular) {
              this.setAttribute(relationName, rows[0] as any);
            } else {
              this.setAttribute(relationName, rows as any);
            }
            return this._attributes[key];
          });
      }

      return undefined;
    }
  }

  /**
   * Returns the current model instance's attributes
   * @returns {Partial<TAttributes>}
   */
  getAttributes(): Partial<TAttributes> {
    return this._attributes;
  }

  /**
   * Returns the changes to the current model (i.e. properties which have been changed but not yet persisted)
   * @returns {Partial<TAttributes>}
   */
  getChanges(): Partial<TAttributes> {
    return this._changes;
  }

  /**
   * Returns the model instance's primary key column name
   * @returns {keyof TAttributes|undefined}
   */
  getKeyName(): keyof TAttributes | undefined {
    if (this._primaryKeyColumn) {
      return this._primaryKeyColumn.name as keyof TAttributes;
    }

    return undefined;
  }

  /**
   * Returns the curent model instance's primary key
   */
  getKey() {
    const keyName = this.getKeyName();

    return keyName ? this._attributes[keyName] || undefined : undefined;
  }

  /**
   * Returns the last persisted state of the model instance, or undefined if attributes were partial
   * NOTE: Technically the attributes might not actually be persisted but represent that they could/should be persisted
   * @returns {TAttributes|undefined}
   */
  getPersistedAttributes(): TAttributes | undefined {
    return this._original;
  }

  /**
   * Returns the model associated with the given relation
   * @param {string} relationName
   * @param {boolean} instance
   * @returns
   */
  getRelatedModel(relationName: string, instance = true) {
    const relatedModel = ucfirst(Pluralize.singular(relationName));
    const model = this._models?.[relatedModel];
    if (instance && model) {
      return createEloquentModel(model, {}, this._database, this._schema, this._models, this._onChange);
    }
    return model;
  }

  /**
   * Returns the table columns
   * @returns {Record<string, SQLiteColumn<any, {}, {}>>}
   */
  getTableColumns(): Record<string, SQLiteColumn<any, {}, {}>> {
    return getTableColumns(this.getTableDefinition());
  }

  /**
   * Returns the SQLite table definition
   * @returns {SQLiteTable}
   */
  getTableDefinition(): SQLiteTable {
    return this._table;
  }

  /**
   * Returns the table name
   * @returns {string}
   */
  getTableName(): string {
    return getTableName(this._table);
  }

  /**
   * Returns the relation definitions for the current model
   * @returns {Record<string, Relation<string>>}
   */
  getTableRelations(): Record<string, Relation<string>> {
    const { tables } = extractTablesRelationalConfig(this._schema, createTableRelationsHelpers);

    const table = Object.values(tables).find(({ dbName }) => dbName === this.getTableName());
    if (table?.relations) {
      //console.log(table.relations);
      return table.relations;
    }

    return {};
  }

  /**
   * Returns the relation
   * @returns {Relation<string>|undefined}
   */
  getTableRelation(relationName: string): Relation<string> | undefined {
    const relations = this.getTableRelations();
    return relations[relationName] ?? undefined;
  }

  /**
   * Sets an attribute on the model instance
   * @param {keyof TAttributes} key
   * @param {TAttributes[K]} value
   * @returns {boolean}
   */
  setAttribute<K extends keyof TAttributes>(key: K, value: TAttributes[K]): boolean {
    // Check that key exists in the model
    const columns = Object.keys(getTableColumns(this._table));
    if (columns.includes(key as string)) {
      // Set the value
      setProperty(this._attributes, key, value);

      // Check if the value changed
      const attributeKey = key as keyof TAttributes;
      if (!deepEqual(this.getAttribute(attributeKey), this._original?.[attributeKey])) {
        // Update the changes and return true
        setProperty(this._changes, key, value);
        return true;
      }
    }

    const relationName = key as string;
    const relation = this.getTableRelation(relationName);
    const model = this.getRelatedModel(relationName, false);
    // Check if relation and model exist
    if (relation && model) {
      //console.log(`Relation: ${key} => ${model}`, value);
      const property = Array.isArray(value)
        ? value
            .map((entry: any) => {
              if (!entry) {
                return undefined;
              }
              if (entry.constructor.prototype instanceof EloquentModel) {
                // Already an instance of the model
                return entry;
              }
              // Create a model with the given attributes
              return createEloquentModel(model, entry, this._database, this._schema, this._models, this._onChange);
            })
            .filter((entry: any) => entry !== undefined)
        : value
          ? value.constructor.prototype instanceof EloquentModel
            ? value
            : createEloquentModel(model, value, this._database, this._schema, this._models, this._onChange)
          : undefined;
      setProperty(this._attributes, key, property);
      return true;
    }

    // No change made
    return false;
  }

  /**
   * Sets multiple attributes on the model instance
   * @param {TAttributes} attributes
   * @returns {void}
   */
  setAttributes(attributes: Partial<TAttributes>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      this.setAttribute(key, value);
    });
  }

  /**
   * Creates a new model instance
   * @returns {this & TAttributes}
   */
  factory(attributes: Partial<TAttributes> = {}): this & TAttributes {
    const { constructor } = Object.getPrototypeOf(this);
    return new constructor(attributes, this._database, this._schema, this._models, this._onChange) as this &
      TAttributes;
  }

  /**
   * Execute onChange callback to notify of changes to database
   * @param {DatabaseChangeType} changeType
   * @param {this} model
   */
  protected changed(changeType: DatabaseChangeType, model: this): void {
    if (typeof this._onChange === 'function') {
      this._onChange<this>(changeType, model);
    }
  }

  /**
   * Delete this instance from the database
   * @returns {Promise<boolean>}
   */
  async delete(): Promise<boolean> {
    let success = false;
    const primaryKey = this.getKey();
    let criteria: SQL | undefined;
    if (this._primaryKeyColumn && primaryKey) {
      // Delete based on primary key
      criteria = eq(this._primaryKeyColumn, primaryKey);
    } else {
      // Delete based on matching fields (dangerous)
      const columns = Object.values(this.getTableColumns());
      criteria = and(
        ...Object.entries(this._attributes).map(([key, value]): SQL | undefined => {
          const column = columns.find(({ name }) => name === key);
          return column ? eq(column, value) : undefined;
        })
      );
    }
    const { changes } = await this._database.delete(this._table).where(criteria);
    success = !!changes;
    if (success) {
      //console.log('Clearing primary keys');
      const keyName = this.getKeyName();
      if (keyName) {
        delete this._attributes[keyName];
      }
      this.changed(DatabaseChangeType.DELETE, this);
    }
    return success;
  }

  /**
   * Inserts this instance in the database
   * NOTE: Protected as this should not be called directly, but via the `save` method
   * @returns {Promise<number>}
   */
  protected async insert(): Promise<number> {
    const [result] = (await this._database.insert(this._table).values(this._attributes).returning()) as TAttributes[];
    //console.log('Insert', this._attributes, result);
    const keyName = this.getKeyName();
    if (keyName && result[keyName]) {
      //console.log(`Updating primary key: ${result[keyName]}`);
      setProperty(this._attributes, keyName, result[keyName] as any);
    }
    this.changed(DatabaseChangeType.INSERT, this);
    return 1;
  }

  /**
   * Updates this instance in the database
   * NOTE: Protected as this should not be called directly, but via the `save` method
   * @returns {Promise<number>}
   */
  protected async update(): Promise<number> {
    const primaryKey = this.getKey();
    if (this._primaryKeyColumn && primaryKey && Object.keys(this._changes).length) {
      const { changes } = await this._database
        .update(this._table)
        .set(this._changes)
        .where(eq(this._primaryKeyColumn, primaryKey));
      //.returning({ id: this._primaryKey });
      //console.log('Update', this._changes, changes);
      if (changes) {
        this.changed(DatabaseChangeType.UPDATE, this);
      }
      return changes;
    }
    return 0;
  }

  /**
   * Attempt to save changes to this instance
   * @returns {Promise<boolean>}
   */
  async save(): Promise<boolean> {
    let success = false;
    try {
      const primaryKey = this.getKey();
      if (!primaryKey) {
        const insertedRows = await this.insert();
        success = !!insertedRows;
      } else if (Object.keys(this._changes).length) {
        const updatedRows = await this.update();
        success = !!updatedRows;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // SqliteError, missing constraints etc.
      //console.warn(e);
    }
    // Reset the changes on the existing model when successful
    if (success) {
      this._original = this.completedAttributes(this._attributes);
      this._changes = {};
    }
    return success;
  }

  /**
   * Returns an extended `Query` instance for this model
   * @returns {TQueryExtended<TAttributes>}
   */
  query(): TSelectQueryExtended<TAttributes, this> {
    const query = this._database.select().from(this._table) as TSelectQuery<TAttributes>;
    const extendedQuery = extendSelectQuery(query, this);
    return extendedQuery;
  }

  /**
   * Converts the basic object results into instances of the model
   * @param {any[]} rows
   * @returns {this[]}
   */
  hydrate(rows: any[]): this[] {
    const { constructor } = Object.getPrototypeOf(this);
    return rows.map((item) => new constructor(item, this._database, this._schema, this._models, this._onChange));
  }

  /**
   * @returns {Collection<this>}
   */
  async all(): Promise<Collection<this>> {
    const rows = await this.query();
    return collect(this.hydrate(rows));
  }

  /**
   * Attempts to load the given instance from the database
   * @param {number|string} primaryKey
   * @returns {Promise<this|null>}
   */
  async find(primaryKey: number | string): Promise<this | null> {
    if (this._primaryKeyColumn) {
      const rows = await this.query().where(eq(this._primaryKeyColumn, primaryKey)).limit(1);
      if (rows.length) {
        return this.hydrate(rows)[0];
      }
    }
    return null;
  }
}

export function createEloquentModel<TAttributes extends Attributes, T extends TDatabase>(
  model: typeof EloquentModel<TAttributes, T>,
  attributes: Partial<TAttributes> = {},
  database: T,
  schema: TSchema,
  models: TDatabaseModels | undefined = undefined,
  onChange: TOnChangeModel | undefined = undefined
) {
  return new model(attributes, database, schema, models, onChange) as EloquentModel<TAttributes, T> & TAttributes;
}
