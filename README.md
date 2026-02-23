# Eloquent.js

Eloquent.js is a Javascript/Typescript implementation of some of the basic functionality of Laravel's [Eloquent](https://laravel.com/docs/12.x/eloquent). To use Laravel's own description:

> An object-relational mapper (ORM) that makes it enjoyable to interact with your database. When using Eloquent, each database table has a corresponding "Model" that is used to interact with that table. In addition to retrieving records from the database table, Eloquent models allow you to insert, update, and delete records from the table as well.

This package is fundamentally a wrapper around [Drizzle ORM](https://orm.drizzle.team/) which is used for the baseline database connectivity and interactions. Currently two SQLite database providers are supported:

- [Expo SQLite](https://orm.drizzle.team/docs/connect-expo-sqlite) - Expo / ReactNative
- [Better-SQLite3](https://orm.drizzle.team/docs/get-started-sqlite) - Node / Testing

## Installation

Add the package to your project using your preferred package management tool, e.g. `npm`, `yarn` etc. For example:

```bash
npm i @tower-supplies/eloquent.js
```

Additional package/dependency, depending on requirements:

```bash
npm i better-sqlite OR npm i expo-sqlite
```

Optional development dependency for the generation of migrations etc.

```bash
npm i -D drizzle-kit
```

## Configuration

As the package uses [Drizzle ORM](https://orm.drizzle.team/) behind the scenes most of the initial configuration is the same as Drizzle, and their documentation can be followed to create a database [schema](https://orm.drizzle.team/docs/sql-schema-declaration) and/or [migrations](https://orm.drizzle.team/docs/migrations).

### Schema

Create a `schema.ts` file containing the database schema, including any relations where relevant, e.g.

```ts
import { int, sqliteTable, varchar } from 'drizzle-orm/sqlite-core';
export const usersTable = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
});
```

### Migrations

If using `drizzle-kit` to create database migrations etc. ensure the `drizzle.config.ts` file exists in the root directory of the project and is configured correctly.

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  out: './database/migrations',
  schema: './database/schema.ts',
});
```

To create the database migrations the console command:

```bash
npx drizzle-kit generate
```

### Models

Create a model for each table in the schema, similar to that shown below. It may be benefical to create a base model in the application, from which other models extend, to avoid code duplication around the database type definition.

```ts
import EloquentModel, { TAttributes } from '@tower-supplies/eloquent.js';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from '../schema';

type TDatabase = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

export interface UserAttributes extends TAttributes {
  id: number;
  name: string;
  age: number;
  email: string;
}

// The class without the interface properties
export class UserClass extends EloquentModel<UserAttributes, TDatabase> {}

// Use declaration merging to add the properties to the class
interface User extends UserAttributes {}
class User extends UserClass {}

export default User;
```

## Initialisation

### With Context

The easiest way of working with multiple models, across an application, is by extending and utilising the provided React Context.

```ts
import {
  DatabaseProvider as EloquentDatabaseProvider,
  useDatabaseContext as useEloquentDatabaseContext,
} from '@tower-supplies/eloquent.js';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { ReactNode } from 'react';
import { Text } from 'react-native';

import { DatabaseModels, schema } from './database';

type TDatabase = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>;
type TModelType = keyof typeof DatabaseModels;
type TModels = { [K in TModelType as K & string]: InstanceType<(typeof DatabaseModels)[K]> };

const DatabaseProvider = ({ children }: { children: ReactNode }) => (
  <EloquentDatabaseProvider
    databaseName="database.db"
    databaseModels={DatabaseModels}
    errorHandler={(database, details, whenWhile) => <Text>Criticial error {whenWhile}: {details}</Text>}
    schema={schema}
    Initialising={<Text>Database initialising...</Text>}
    Migrating={<Text>Migrations in progress...</Text>}
  >
    {children}
  </EloquentDatabaseProvider>
);

// Apply the types to the context
const useDatabaseContext = () => useEloquentDatabaseContext<TDatabase, TModels>();

export { DatabaseProvider, useDatabaseContext };
```

The relevant model can then be accessed in the relevant component using the `useDatabaseContext` hook:

```ts
const {
  models: { user },
} = useDatabaseContext();
```

### Without Context

It is also possible to manually initialise an individual model, outside of the provided React Context:

```ts
import { createEloquentModel, TDatabase } from '@tower-supplies/eloquent.js';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import DatabaseModels, { UserClass } from './models';
import * as schema from '../schema';

const drizzleDb: TDatabase = drizzle(new Database('test.db'), { schema });
const user = createEloquentModel(UserClass, {}, drizzleDb, schema, DatabaseModels);
```

## Usage

Some basic usage examples are shown below. Reviewing the test suite for more detailed examples and/or more complex usage.

### Creating

```ts
// Create with initial properties
const newUser = user.factory({ name: 'John', ... });
newUser.age = 42; // Set property directly on object
newUser.save().then((saved) => ...);
```

### Updating

```ts
// Find existing user
user.find(1).then((savedUser) => {
    savedUser.age = 43; // Update property directly on object
    savedUser.save().then((saved) => ...);
});
```

### Deleting

```ts
// Find an existing user
user.find(1).then((savedUser) => {;
    savedUser.delete().then((deleted) => ...);
});
```

### Querying

#### Where

The first parameter is the field to query; it may be the field name as a string or the `SQLiteColumn` from Drizzle.

The second parameter is the 'operation'; the currenty operators which are supported are:
| Operator | Description |
|----------|---------------------------|
| = | Equals |
| > | Greater than |
| >= | Greater than, or equal to |
| < | Less than |
| <= | Less than, or equal to |

The third parameter is the value against which the operation will be applied. _If only two parameters are used the second parameter is assumed to be the value, and the equals operator is used by default._

```ts
user.query()
    .where('name', 'John') // or .where('name', '=', 'John)
    .where('age', '>', 40)
    .then((users) => ...) // JSON objects
```

#### WhereIn

When querying for multiple parameters the `whereIn` and `whereNotIn` methods may be useful:

```ts
user.query()
    .whereIn('name', ['John', 'Steve'])
    .then((users) => ...) // JSON objects
```

### Hydration

```ts
user.query()
    .where('name', 'John') // or .where('name', '=', 'John)
    .where('age', '>', 40)
    .hydrate()
    .then((users) => ...) // Model objects
```

### Relations

Relations between models are handled in one of two ways, either via lazy loading (that delays loading non-critical models until they are needed) or eager loading when the relations are found, and populated, at the time of the original query. When using `Eloquent.js`s lazy loading strategy the initial access to the relation will return a `Promise`. Subsequent access will return the relation directly, as it has already been loaded.

#### Lazy loading

```ts
// Find an existing user
user.find(1).then((savedUser) => {
    savedUser.town.then((savedTown) => {
        // savedUser.town === savedTown; no longer a Promise
        ...
    });
});
```

#### Eager loading

```ts
user
  .query()
  .with('town')
  .where('id', 1)
  .then((users) => {
    const savedUser = users[0];
    savedUser.town; // Pre-loaded; not a Promise
  });
```

## Development / Testing

The codebase is covered by a comprehensive set of tests. When making changes it is recommended that a test-driven development pattern is employed; i.e. write a test that replicates the issue before implementing a fix and ensuring that all existing tests still pass/remaining unaffected. As a bare minimum, please ensure that all existing tests still pass as expected.

#### Running tests

```bash
npm run test
```

It is also possible to get a code coverage report, to see how much of the codebase is covered by the tests:

```bash
npm run test -- --coverage
```

When making changes please try to ensure that, if anything, the coverage percentage goes up (more code is covered by tests) rather than down.

#### Changes to the test database

If changes are made to the schema of the tests it will be necessary to regenerate the migrations for the test suite. This may be done using the following command:

```
npx drizzle-kit generate --config=./configs/drizzle.config.tests.ts
```
