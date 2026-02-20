//import { relations } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const noKeysTable = sqliteTable('no_keys', {
  field: text().notNull(),
  value: text(),
});

/**
 * Users
 */
export const usersTable = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
  town_id: int(),
});

/**
 * User relations
 */
export const userRelations = relations(usersTable, ({ one }) => ({
  town: one(townsTable, {
    fields: [usersTable.town_id],
    references: [townsTable.id],
  }),
}));

/**
 * Towns
 */
export const townsTable = sqliteTable('towns', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  county_id: int().notNull(),
});

/**
 * Town relations
 */
export const townRelations = relations(townsTable, ({ one, many }) => ({
  county: one(countiesTable, {
    fields: [townsTable.county_id],
    references: [countiesTable.id],
  }),
  users: many(usersTable),
}));

/**
 * Counties
 */
export const countiesTable = sqliteTable('counties', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

/**
 * County relations
 */
export const countyRelations = relations(countiesTable, ({ many }) => ({
  towns: many(townsTable),
}));

/**
 * Items
 */
export const itemsTable = sqliteTable('items', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  product_id: int(),
});

/**
 * Item relations
 */
export const itemRelations = relations(itemsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [itemsTable.product_id],
    references: [productsTable.id],
  }),
}));

/**
 * Products
 */
export const productsTable = sqliteTable('products', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

/**
 * Product relations
 */
export const productRelations = relations(productsTable, ({ many }) => ({
  items: many(itemsTable),
  productProperties: many(productPropertiesTable),
}));

/**
 * Product properties
 */
export const productPropertiesTable = sqliteTable('product_properties', {
  id: int().primaryKey({ autoIncrement: true }),
  field: text().notNull(),
  value: text(),
  product_id: int(),
});

/**
 * Product property relations
 */
export const productPropertyRelations = relations(productPropertiesTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [productPropertiesTable.product_id],
    references: [productsTable.id],
  }),
}));
