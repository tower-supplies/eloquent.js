import Database from 'better-sqlite3';
import collect from 'collect.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

import { createEloquentModel } from '@/classes';
import * as extendedRelationalQuery from '@/extensions/extendedRelationalQuery';
import reset from '@/utils/reset';

import DatabaseModels, {
  CountyClass,
  NoKeyClass,
  NoTableClass,
  TownClass,
  UserClass,
} from '../../support/database/models';
import * as schema from '../../support/database/schema';
import { TDatabase } from '../../support/database/types';

const drizzleDb: TDatabase = drizzle(new Database('test.db'), { schema });
const noKey = createEloquentModel(NoKeyClass, {}, drizzleDb, schema, DatabaseModels);
const user = createEloquentModel(UserClass, {}, drizzleDb, schema, DatabaseModels);
const town = createEloquentModel(TownClass, {}, drizzleDb, schema, DatabaseModels);
const county = createEloquentModel(CountyClass, {}, drizzleDb, schema, DatabaseModels);

beforeAll(async () => {
  // Extend the relational query
  extendedRelationalQuery;

  // Reset the database before applying migrations
  await reset(drizzleDb);
  await migrate(drizzleDb, { migrationsFolder: resolve(__dirname, '../../support/database/migrations') });
});

describe('guessTable', () => {
  it('throws an error when attempting to guess a table that is not defined in the schema', () => {
    const instantiateUnknown = () => new NoTableClass({}, drizzleDb, schema, DatabaseModels);
    expect(instantiateUnknown).toThrowError(new Error('Unable to find entry in schema: noTablesTable'));
  });
});

describe('all', () => {
  it('returns an empty collection when there are no instances of a model', async () => {
    const users = await user.all();
    expect(users).toEqual(collect());
    expect(users.count()).toEqual(0);
  });
});

describe('save', () => {
  it('returns false when unable to persist a new model', async () => {
    const newUser = user.factory({ name: 'John' });
    const saved = await newUser.save();
    expect(saved).toEqual(false);
  });

  it('returns true when able to persist a new model', async () => {
    const newUser = user.factory({ name: 'John' });
    newUser.age = 42; // Test setting parameter(s) after model initialising
    newUser.email = 'john@eloquent.js';
    const saved = await newUser.save();
    expect(saved).toEqual(true);
    expect(newUser.id).toEqual(1);

    // Check that model persisted as expected
    const users = await user.all();
    expect(users.count()).toEqual(1);
    const savedUser = users.first();
    expect(savedUser.id).toEqual(1);
    expect(savedUser.name).toEqual('John');
    expect(savedUser.age).toEqual(42);
    expect(savedUser.email).toEqual('john@eloquent.js');
  });

  it('returns false when unable to update an existing model', async () => {
    const savedUser = await user.find(1);
    expect(savedUser?.id).toEqual(1);
    if (savedUser) {
      // @ts-expect-error
      savedUser.age = null; // Deliberate error; setting null against a number
      expect(savedUser.getChanges()).toEqual({ age: null });
      const saved = await savedUser.save();
      expect(saved).toEqual(false);
    }
  });

  it('returns true when able to update an existing model', async () => {
    const savedUser = await user.find(1);
    expect(savedUser?.id).toEqual(1);
    if (savedUser) {
      savedUser.age = 43;
      const saved = await savedUser.save();
      expect(saved).toEqual(true);
    }
  });

  it('returns false when there are no changes to save', async () => {
    const savedUser = await user.find(1);
    expect(savedUser?.id).toEqual(1);
    const saved = await savedUser?.save();
    expect(saved).toEqual(false);
  });

  it('returns true when persisting a model without keys', async () => {
    const newNoKey = noKey.factory({ field: 'abc', value: '123' });
    const saved = await newNoKey.save();
    expect(saved).toEqual(true);
  });
});

describe('find', () => {
  it('returns null when the key is not found', async () => {
    const savedUser = await user.find(101);
    expect(savedUser).toEqual(null);
  });

  it('returns an instance of the model when the key is found', async () => {
    const savedUser = await user.find(1);
    expect(savedUser?.id).toEqual(1);
  });

  it('returns null when find is used on a model without primary keys', async () => {
    const result = await noKey.find(1);
    expect(result).toEqual(null);
  });
});

describe('getAttribute', () => {
  it('returns the property of a model', async () => {
    const newUser = user.factory({ name: 'John' });
    expect(newUser.getAttribute('name')).toEqual('John');
  });

  it('returns the fallback when the property is not present/set', async () => {
    const newUser = user.factory({ name: 'John' });
    expect(newUser.getAttribute('age', 21)).toEqual(21);
  });

  it('returns undefined when the property is not present/set, and no fallback is provided', async () => {
    const newUser = user.factory({ name: 'John' });
    expect(newUser.getAttribute('age')).toEqual(undefined);
  });
});

describe('getAttributes', () => {
  it('returns the properties of a model', () => {
    const properties = { name: 'John', age: 32 };
    const newUser = user.factory(properties);
    expect(newUser.getAttributes()).toEqual(properties);
  });
});

describe('getPersistedAttributes', () => {
  it('returns undefined if the model is not capable of being persisted', () => {
    const properties = { name: 'James', age: 32 };
    const newUser = user.factory(properties);
    expect(newUser.getPersistedAttributes()).toEqual(undefined);
  });

  it('returns the attributes of the model if it is capable of being persisted (but has not yet been saved)', () => {
    const properties = { name: 'James', age: 32, email: 'james@elqouent.js' };
    const newUser = user.factory(properties);
    expect(newUser.getPersistedAttributes()).toEqual(properties);
  });

  it('returns the attributes of the model if it has been persisted', async () => {
    const properties = { name: 'Jimmy', age: 32, email: 'jimmy@eloquent.js' };
    const newUser = user.factory(properties);
    await newUser.save();
    expect(newUser.getPersistedAttributes()).toEqual({ id: 2, ...properties });
  });
});

describe('setAttribute', () => {
  it('set the property of a model, via setAttribute', () => {
    const newUser = user.factory({ name: 'John' });
    newUser.setAttribute('name', 'James');
    expect(newUser.name).toEqual('James');
  });

  it('set the property of a model, via proxied property', () => {
    const newUser = user.factory({ name: 'John', age: 35 });
    newUser.name = 'James';
    newUser.age = 36;
    expect(newUser.name).toEqual('James');
    expect(newUser.age).toEqual(36);
  });

  it("ignores properties which don't exist, via setAttribute", () => {
    const newUser = user.factory({ name: 'John' });
    // @ts-expect-error
    newUser.setAttribute('job', 'Director');
    // @ts-expect-error
    expect(newUser.job).toEqual(undefined); // Deliberate error; `job` does not exist on the `UserClass`
  });
});

describe('hydrate', () => {
  it('converts as array of objects (JSON) to an array of models', () => {
    const userObjects = [
      {
        name: 'Bill',
        age: 57,
        email: 'bill@test.com',
      },
      {
        name: 'Ben',
        age: 55,
        email: 'ben@test.com',
      },
    ];
    const userModels = user.hydrate(userObjects);
    expect(userModels.length).toEqual(2);
    userModels.forEach((userModel, index) => {
      expect(userModel).toBeInstanceOf(UserClass);
      expect(userModel.getAttributes()).toEqual(userObjects[index]);
    });
  });
});

describe('setAttributes', () => {
  it('sets multiple properties of a model', () => {
    const newUser = user.factory({ name: 'John' });
    newUser.setAttributes({
      age: 27,
      email: 'john@eloquent.js',
    });
    expect(newUser.getAttributes()).toEqual({
      name: 'John',
      age: 27,
      email: 'john@eloquent.js',
    });
  });

  it("ignores properties which don't exist", () => {
    const newUser = user.factory({ name: 'John' });
    newUser.setAttributes({
      age: 27,
      email: 'john@eloquent.js',
      job: 'Director',
    } as any);
    expect(newUser.getAttributes()).toEqual({
      name: 'John',
      age: 27,
      email: 'john@eloquent.js',
    });
  });
});

describe('delete', () => {
  it('returns false when unable to delete a model', async () => {
    const newUser = user.factory({ id: 101, name: 'John', age: 51, email: 'john@eloquent.js' });
    const deleted = await newUser.delete();
    expect(deleted).toEqual(false);
  });

  it('returns true when able to delete a model', async () => {
    const newUser = user.factory({ name: 'John', age: 51, email: 'john.eloquent@eloquent.js' });
    const saved = await newUser.save();
    expect(saved).toEqual(true);
    const deleted = await newUser.delete();
    expect(deleted).toEqual(true);
  });

  it('is able to delete a model without a primary key', async () => {
    const john = noKey.factory({ field: 'John', value: '51' });
    const savedJohn = await john.save();
    expect(savedJohn).toEqual(true);

    const jim = noKey.factory({ field: 'Jim', value: '53' });
    const savedJim = await jim.save();
    expect(savedJim).toEqual(true);

    const deletedJohn = await john.delete();
    expect(deletedJohn).toEqual(true);

    const remainingJim = await noKey.query().where(eq(schema.noKeysTable.field, 'Jim'));
    expect(remainingJim.length).toEqual(1);
    expect(remainingJim[0].value).toEqual('53');
  });
});

describe('query (select)', () => {
  it('has a hydrate method', async () => {
    const query = user.query();
    expect(query.hydrate).toBeTypeOf('function');

    const users = await user.query().hydrate();
    expect(users.length).toEqual(2);
    const savedUser = users[0];
    expect(savedUser.name).toEqual('John');
  });

  it('has a whereIn method', async () => {
    const query = user.query();
    expect(query.whereIn).toBeTypeOf('function');

    const users = await user.query().whereIn(schema.usersTable.name, ['John']).hydrate();
    expect(users.length).toEqual(1);
    const savedUser = users[0];
    expect(savedUser.name).toEqual('John');

    const queryWithoutCriteria = await user.query().whereIn(schema.usersTable.name, []);
    expect(queryWithoutCriteria.length).toEqual(2);
  });

  it('has a whereNotIn method', async () => {
    const query = user.query();
    expect(query.whereIn).toBeTypeOf('function');

    const users = await user.query().whereNotIn(schema.usersTable.name, ['John']).hydrate();
    expect(users.length).toEqual(1);
    const savedUser = users[0];
    expect(savedUser.name).toEqual('Jimmy');

    const queryWithoutCriteria = await user.query().whereNotIn(schema.usersTable.name, []);
    expect(queryWithoutCriteria.length).toEqual(2);
  });

  describe('has a where method which supports alternative syntax:', async () => {
    it('supports where with only two parameters and infers it as equals', async () => {
      const savedUsers = await user.query().where('name', 'John');
      expect(savedUsers.length).toEqual(1);
      const savedUser = savedUsers[0];
      expect(savedUser.name).toEqual('John');
    });

    it('supports equals (=)', async () => {
      const savedUsers = await user.query().where('name', '=', 'John');
      expect(savedUsers.length).toEqual(1);
      const savedUser = savedUsers[0];
      expect(savedUser.name).toEqual('John');
    });

    it('supports less than (<)', async () => {
      const savedUsers = await user.query().where('age', '<', 32);
      expect(savedUsers.length).toEqual(0);
    });

    it('supports less than or equal to (<=)', async () => {
      const savedUsers = await user.query().where('age', '<=', 32);
      expect(savedUsers.length).toEqual(1);
      const savedUser = savedUsers[0];
      expect(savedUser.name).toEqual('Jimmy');
    });

    it('supports greater than (>)', async () => {
      const savedUsers = await user.query().where('age', '>', 43);
      expect(savedUsers.length).toEqual(0);
    });

    it('supports greater than or equal to (>=)', async () => {
      const savedUsers = await user.query().where('age', '>=', 43);
      expect(savedUsers.length).toEqual(1);
      const savedUser = savedUsers[0];
      expect(savedUser.name).toEqual('John');
    });

    it('supports multiple wheres, as AND by default', async () => {
      let savedUsers = await user.query().where('age', '>=', 43).where('name', 'Jimmy');
      expect(savedUsers.length).toEqual(0);

      savedUsers = await user.query().where('age', '>=', 43).where('name', 'John');
      expect(savedUsers.length).toEqual(1);
    });

    it('supports orWhere with alternative where syntax', async () => {
      const savedUsers = await user.query().where('age', '>=', 43).orWhere('name', 'Jimmy');
      expect(savedUsers.length).toEqual(2);
    });

    it('supports orWhere with original where syntax', async () => {
      const savedUsers = await user.query().where('age', '>=', 43).orWhere(eq(schema.usersTable.name, 'Jimmy'));
      expect(savedUsers.length).toEqual(2);
    });

    it('does nothing when there are insufficient parameters passed to where', async () => {
      const savedUsers = await user.query().where('age');
      expect(savedUsers.length).toEqual(2);
    });

    it('does nothing when there are insufficient parameters passed to orWhere', async () => {
      const savedUsers = await user.query().orWhere('age');
      expect(savedUsers.length).toEqual(2);
    });

    it('throws an error when an invalid field is supplied', async () => {
      const invalidWhere = async () => await user.query().where('noExistentField', '>=', 43);
      await expect(invalidWhere()).rejects.toThrowError(new Error('Unable to find column: noExistentField'));
    });

    it('throws an error when an invalid operator is supplied', async () => {
      const invalidWhere = async () => await user.query().where('age', 'boom', 43);
      await expect(invalidWhere()).rejects.toThrowError(new Error('Unsupported where operator: boom'));
    });
  });

  it('supports groupBy, having and limit passed, whilst retaining the extended functionality', async () => {
    const savedUsers = await user
      .query()
      .groupBy(schema.usersTable.name)
      .having(eq(schema.usersTable.name, 'John'))
      .limit(1)
      .hydrate();
    expect(savedUsers.length).toEqual(1);
    const savedUser = savedUsers[0];
    expect(savedUser.name).toEqual('John');
  });
});

describe('getTableRelations', () => {
  it('returns no records for a table with no relations', () => {
    const newNoKey = noKey.factory({ field: 'abc', value: '123' });
    expect(newNoKey.getTableRelations()).toEqual({});
  });
});

describe('relationships', () => {
  it('are supported via RelationalQuery', async () => {
    // Create counties
    const dorset = county.factory({ name: 'Dorset' });
    const leicestershire = county.factory({ name: 'Leicestershire ' });
    const powys = county.factory({ name: 'Powys' });
    const counties = [dorset, leicestershire, powys];
    for (const aCounty of counties) {
      await aCounty.save();
    }

    // Create towns
    const bournemouth = town.factory({ name: 'Bournemouth', county_id: dorset.id });
    const poole = town.factory({ name: 'Poole', county_id: dorset.id });
    const hinckley = town.factory({ name: 'Hinckley', county_id: leicestershire.id });
    const nuneaton = town.factory({ name: 'Nuneaton', county_id: leicestershire.id });
    const welshpool = town.factory({ name: 'Welshpool', county_id: powys.id });
    const newtown = town.factory({ name: 'Newtown', county_id: powys.id });
    const towns = [bournemouth, poole, hinckley, nuneaton, welshpool, newtown];
    for (const aTown of towns) {
      await aTown.save();
    }

    // Create users (John and Jimmy exist from previous tests)
    const bill = user.factory({ name: 'Bill', age: 26, email: 'bill@eloquent.js' });
    const ben = user.factory({ name: 'Ben', age: 27, email: 'ben@eloquent.js', town_id: bournemouth.id });
    const bob = user.factory({ name: 'Bob', age: 28, email: 'bob@eloquent.js', town_id: bournemouth.id });
    const brad = user.factory({ name: 'Brad', age: 29, email: 'brad@eloquent.js', town_id: poole.id });
    const bernie = user.factory({ name: 'Bernie', age: 30, email: 'bernie@eloquent.js', town_id: hinckley.id });
    const simon = user.factory({ name: 'Simon', age: 31, email: 'simon@eloquent.js', town_id: nuneaton.id });
    const steve = user.factory({ name: 'Steve', age: 32, email: 'steve@eloquent.js', town_id: welshpool.id });
    const susie = user.factory({ name: 'Susie', age: 33, email: 'susie@eloquent.js', town_id: welshpool.id });
    const sarah = user.factory({ name: 'Sarah', age: 34, email: 'sarah@eloquent.js', town_id: newtown.id });
    const steph = user.factory({ name: 'Steph', age: 35, email: 'steph@eloquent.js', town_id: newtown.id });
    const users = [bill, ben, bob, brad, bernie, simon, steve, susie, sarah, steph];
    for (const aUser of users) {
      await aUser.save();
    }

    // One
    const savedUsers = collect(
      await drizzleDb.query.usersTable
        .findMany({
          with: {
            town: {
              with: {
                county: true,
              },
            },
          },
        })
        .hydrate(user)
    );

    expect(savedUsers.count()).toEqual(12);

    const john = savedUsers.where('id', 1).first();
    expect(john.name).toEqual('John');
    expect(john.town).toEqual(undefined);

    const savedBrad = savedUsers.where('name', 'Brad').first();
    expect(savedBrad.name).toEqual('Brad');
    expect(savedBrad.town?.name).toEqual(poole.name); // Deep comparing the town may be cyclic
    expect(savedBrad.town?.county?.name).toEqual(dorset.name); // Deep comparing the county may be cyclic

    // Many
    const savedCounties = collect(
      await drizzleDb.query.countiesTable
        .findMany({
          with: {
            towns: {
              with: {
                users: true,
              },
            },
          },
        })
        .hydrate(county)
    );

    expect(savedCounties.count()).toEqual(3);

    const savedDorset = savedCounties.where('name', 'Dorset').first();
    expect(savedDorset.name).toEqual('Dorset');
    expect(savedDorset.towns?.length).toEqual(2);
    expect(savedDorset.towns?.map((town) => town.name).join()).toEqual('Bournemouth,Poole');
  });

  it('lazily loads One related model, via getAttribute', async () => {
    const savedUsers = user.hydrate(await user.query().where(eq(schema.usersTable.name, 'Brad')));
    expect(savedUsers.length).toEqual(1);
    const savedBrad = savedUsers[0];
    expect(savedBrad.name).toEqual('Brad');

    const savedTowns = town.hydrate(await town.query().where(eq(schema.townsTable.name, 'Poole')));
    expect(savedTowns.length).toEqual(1);
    const savedPoole = savedTowns[0];
    expect(savedPoole.name).toEqual('Poole');

    if (savedBrad && savedPoole) {
      // Lazy relations are initially returned as a function
      expect(savedBrad.getAttribute('town')).toBeInstanceOf(Promise);
      expect(await savedBrad.getAttribute('town')).toEqual(savedPoole);
      expect(savedBrad.getAttribute('town')).toEqual(savedPoole); // 2nd time it is already populated
    }
  });

  it('lazily loads One related model, via direct access', async () => {
    const savedUsers = await user.query().where(eq(schema.usersTable.name, 'Brad')).hydrate();
    expect(savedUsers.length).toEqual(1);
    const savedBrad = savedUsers[0];
    expect(savedBrad.name).toEqual('Brad');

    const savedTowns = await town.query().where(eq(schema.townsTable.name, 'Poole')).hydrate();
    expect(savedTowns.length).toEqual(1);
    const savedPoole = savedTowns[0];
    expect(savedPoole.name).toEqual('Poole');

    if (savedBrad && savedPoole) {
      // Lazy relations are initially returned as a function
      expect(savedBrad.town).toBeInstanceOf(Promise);
      expect(await savedBrad.town).toEqual(savedPoole);
      expect(savedBrad.town).toEqual(savedPoole); // 2nd time it is already populated
    }
  });

  it('lazily loads Many related model(s), via getAttribute', async () => {
    const savedCounties = await county.query().where(eq(schema.countiesTable.name, 'Dorset')).hydrate();
    expect(savedCounties.length).toEqual(1);
    const savedDorset = savedCounties[0];
    expect(savedDorset.name).toEqual('Dorset');

    const savedTowns = await town.query().where(eq(schema.townsTable.county_id, savedDorset.id)).hydrate();
    expect(savedTowns.length).toEqual(2);

    if (savedDorset && savedTowns) {
      // Lazy relations are initially returned as a function
      expect(savedDorset.getAttribute('towns')).toBeInstanceOf(Promise);
      expect(await savedDorset.getAttribute('towns')).toEqual(savedTowns);
      expect(savedDorset.getAttribute('towns')).toEqual(savedTowns); // 2nd time it is already populated
    }
  });

  it('lazily loads Many related model(s), via direct access', async () => {
    const savedCounties = await county.query().where(eq(schema.countiesTable.name, 'Dorset')).hydrate();
    expect(savedCounties.length).toEqual(1);
    const savedDorset = savedCounties[0];
    expect(savedDorset.name).toEqual('Dorset');

    const savedTowns = await town.query().where(eq(schema.townsTable.county_id, savedDorset.id)).hydrate();
    expect(savedTowns.length).toEqual(2);

    if (savedDorset && savedTowns) {
      // Lazy relations are initially returned as a function
      expect(savedDorset.towns).toBeInstanceOf(Promise);
      expect(await savedDorset.towns).toEqual(savedTowns);
      expect(savedDorset.towns).toEqual(savedTowns); // 2nd time it is already populated
    }
  });

  it('eagerly loads One related model', async () => {
    const savedUsers = await user
      .query()
      .with('town')
      .with('town.county')
      .whereIn(schema.usersTable.name, ['John', 'Brad'])
      .hydrate();

    expect(savedUsers.length).toEqual(2);
    const savedBrad = savedUsers.find(({ name }) => name === 'Brad');
    expect(savedBrad?.name).toEqual('Brad');
    expect(savedBrad?.town?.name).toEqual('Poole');
    expect(savedBrad?.town?.county?.name).toEqual('Dorset');
  });

  it('eagerly loads Many related model(s)', async () => {
    const savedCounties = collect(
      await county
        .query()
        .with('towns')
        .with('towns.users')
        .whereIn(schema.countiesTable.name, ['Dorset', 'Powys'])
        .hydrate()
    );
    expect(savedCounties.count()).toEqual(2);
    const savedDorset = savedCounties.where('name', 'Dorset').first();
    expect(savedDorset.name).toEqual('Dorset');
    expect(savedDorset.towns?.length).toEqual(2);

    const savedBournemouth = collect(savedDorset.towns).where('name', 'Bournemouth').first();
    expect(savedBournemouth.users?.length).toEqual(2);

    const savedBen = collect(savedBournemouth.users).where('name', 'Ben').first();
    expect(savedBen.name).toEqual('Ben');
  });

  it("ignore trailing '.' when using with", async () => {
    const savedCounties = collect(
      await county
        .query()
        .with('towns')
        .with('towns.')
        .whereIn(schema.countiesTable.name, ['Dorset', 'Powys'])
        .hydrate()
    );
    expect(savedCounties.count()).toEqual(2);
    const savedDorset = savedCounties.where('name', 'Dorset').first();
    expect(savedDorset.name).toEqual('Dorset');
  });

  it("throws an error when attempting to eagerly load a relation without it's parent", async () => {
    const savedCounties = async () =>
      collect(
        await county.query().with('towns.users').whereIn(schema.countiesTable.name, ['Dorset', 'Powys']).hydrate()
      );
    await expect(savedCounties()).rejects.toThrowError(new Error('Parent relation (towns) is missing'));
  });

  it('may be set One using the model class', () => {
    const newUser = user.factory({ name: 'Steve' });
    const newTown = town.factory({ name: 'Coventry' });
    newUser.setAttribute('town', newTown);
    expect(newUser.town?.name).toEqual('Coventry');
  });

  it('may be set One using the model attributes', () => {
    const newUser = user.factory({ name: 'Steve' });
    newUser.town = { name: 'Coventry' } as any;
    expect(newUser.town?.name).toEqual('Coventry');
  });

  it('may be set Many using the model class', () => {
    const newCounty = county.factory({ name: 'Warwickshire' });
    const newTown = town.factory({ name: 'Coventry' });
    newCounty.towns = [newTown];
    expect(newCounty.towns?.length).toEqual(1);
    expect(newCounty.towns[0].name).toEqual('Coventry');
  });

  it('may be set Many using the model attributes', () => {
    const newCounty = county.factory({ name: 'Warwickshire' });
    newCounty.setAttribute('towns', [{ name: 'Coventry' } as any]);
    expect(newCounty.towns?.length).toEqual(1);
    if (newCounty.towns?.length) {
      expect(newCounty.towns[0].name).toEqual('Coventry');
    }
  });

  it('removes undefined entries from array when setting Many relations', () => {
    const newCounty = county.factory({ name: 'Warwickshire' });
    const coventry = town.factory({ name: 'Coventry' });
    const bedworth = town.factory({ name: 'Bedworth' });
    newCounty.setAttribute('towns', [coventry, undefined as any, bedworth]);
    expect(newCounty.towns?.length).toEqual(2);
    if (newCounty.towns?.length === 2) {
      expect(newCounty.towns[0].name).toEqual('Coventry');
      expect(newCounty.towns[1].name).toEqual('Bedworth');
    }
  });
});
