import collect, { Collection } from 'collect.js';
import { eq, getTableColumns, Relations } from 'drizzle-orm';
import { toCamelCase } from 'drizzle-orm/casing';
import { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { deepEqual } from 'fast-equals';
import Pluralize from 'pluralize';

import DatabaseChangeType from '../enums/DatabaseChangeType';
import extendSelectQuery, { TSelectQuery, TSelectQueryExtended } from '../extensions/extendedSelectQuery';
import { modelValidator } from '../rules';
import { TDatabase, TDatabaseModels, TModels, TOnChangeModel, TSchema } from '../types';
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

export default class Model<TAttributes, T extends TDatabase> {
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

  // Avoid TypeScript complaining about property setters/getters
  [key: string]: any;

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
    return `${toCamelCase(Pluralize(this.constructor.name))}Table`;
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
          const columns = getTableColumns(model.getTableDefinition());
          if (Object.keys(attributes).includes(stringName) || Object.keys(columns).includes(stringName)) {
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
          const columns = getTableColumns(model.getTableDefinition());
          if (Object.keys(attributes).includes(stringName) || Object.keys(columns).includes(stringName)) {
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
   * @param {keyof TModels<TDatabaseModels>} containerKey
   * @param {TDatabase} database
   * @param {TAttributes} attributes
   * @param {TOnChangeModel | undefined} onChange
   * @param {TDatabaseModels} relations
   * @param {TSchema} schema
   */
  constructor(
    attributes: Partial<TAttributes> = {},
    database: T,
    schema: TSchema,
    models: TDatabaseModels | undefined = undefined,
    modelKey: keyof TModels<TDatabaseModels>,
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
    }

    // Return the proxied object to support "magic" methods
    return this.addMagicMethods(this);
  }

  /**
   * Returns a specific attribute for the given instance
   * @param {keyof TAttributes} key
   * @returns {any}
   */
  getAttribute(key: keyof TAttributes): any {
    return this._attributes[key];
  }

  /**
   * Returns the current model instance's attributes
   * @returns {Partial<TAttributes>}
   */
  getAttributes(): Partial<TAttributes> {
    return this._attributes;
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
   * Returns the SQLite table definition
   * @returns {SQLiteTable}
   */
  getTableDefinition(): SQLiteTable {
    return this._table;
  }

  getTableRelations(): Relations | undefined {
    let relations: Relations | undefined = undefined;
    Object.entries(this._schema).forEach(([, entry]: [string, SQLiteTable | Relations]) => {
      if (entry instanceof Relations && entry.table === this.getTableDefinition()) {
        relations = entry;
      }
    });
    return relations;
  }

  /**
   * Sets an attribute on the model instance
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  setAttribute(key: string, value: any): boolean {
    // Check that key exists in the model
    const columns = Object.keys(getTableColumns(this._table));
    if (columns.includes(key)) {
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

    // Check if key exists in relations
    const relations = this.getTableRelations();
    if (relations) {
      // Table names are plural (e.g. itemsTable, productsTable)
      const relatedTable = `${Pluralize(key)}Table`;
      // Model names are singular PascalCase (e.g. Scan, ScanLocation)
      const relatedModel = ucfirst(Pluralize.singular(key));
      // Check if table and model exist
      if (this._schema[relatedTable] && this._models?.[relatedModel]) {
        //console.log(`Relation: ${key} => ${relatedModel} (${relatedTable})`, value);
        const model = this._models[relatedModel];
        const property = Array.isArray(value)
          ? value.map(
              (entry) => new model(entry, this._database, this._schema, this._models, relatedModel, this._onChange)
            )
          : new model(value, this._database, this._schema, this._models, relatedModel, this._onChange);
        setProperty(this._attributes, key, property);
      }
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
   * @returns {this}
   */
  factory(attributes: Partial<TAttributes> = {}): this {
    const { constructor } = Object.getPrototypeOf(this);
    return new constructor(attributes, this._database, this._schema, this._models, this._onChange);
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
    const success = false;
    const primaryKey = this.getKey();
    if (this._primaryKeyColumn && primaryKey) {
      const { changes } = await this._database.delete(this._table).where(eq(this._primaryKeyColumn, primaryKey));
      const success = !!changes;
      if (success) {
        //console.log('Clearing primary keys');
        const keyName = this.getKeyName();
        if (keyName) {
          delete this._attributes[keyName];
        }
        this.changed(DatabaseChangeType.DELETE, this);
      }
    }
    return success;
  }

  /**
   * Inserts this instance in the database
   * NOTE: Protected as this should not be called directly, but via the `save` method
   * @returns {Promise<number>}
   */
  protected async insert(): Promise<number> {
    const { changes, lastInsertRowId } = await this._database.insert(this._table).values(this._attributes);
    //.returning({ id: this._primaryKeyColumn });
    //console.log('Insert', this._attributes, changes, lastInsertRowId);
    const keyName = this.getKeyName();
    if (keyName && lastInsertRowId) {
      //console.log(`Updating primary key: ${lastInsertRowId}`);
      setProperty(this._attributes, keyName, lastInsertRowId as any);
    }
    if (changes) {
      this.changed(DatabaseChangeType.INSERT, this);
    }
    return changes;
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
    const primaryKey = this.getKey();
    if (!primaryKey) {
      const insertedRows = await this.insert();
      success = !!insertedRows;
    } else if (Object.keys(this._changes).length) {
      const updatedRows = await this.update();
      success = !!updatedRows;
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
