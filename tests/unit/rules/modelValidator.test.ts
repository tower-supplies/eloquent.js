import { Rules } from '@tower-supplies/validator.js';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it } from 'vitest';

import { addRules, modelRules } from '@/rules/modelValidator';

import { createEloquentModel } from '@/classes';
import DatabaseModels, { UserClass } from '../../support/database/models';
import * as schema from '../../support/database/schema';
import { TDatabase } from '../../support/database/types';

const drizzleDb: TDatabase = drizzle(new Database('test.db'), { schema });

describe('addRules', () => {
  it('will accept a string with a single rule', () => {
    const rules: Rules = {};
    const result = addRules(rules, 'required');
    const expectedResult = ['required'];
    expect(result).toEqual(expectedResult);
  });

  it('will accept a string with multiple rules', () => {
    const rules: Rules = {};
    const result = addRules(rules, 'required|string');
    const expectedResult = ['required', 'string'];
    expect(result).toEqual(expectedResult);
  });

  it('adds rules, including nested rules, to existing rules', () => {
    const nestedRules: Rules = {
      name: 'required',
      email: ['string'],
      bio: {
        age: 'min:18',
        education: {
          primary: 'string',
          secondary: ['string', { in: ['school', 'university'] }],
        },
      },
    };

    const result = addRules(nestedRules, {
      name: 'string',
      email: 'required',
      bio: {
        age: 'required',
        education: {
          primary: ['required'],
          secondary: 'required',
        },
      },
    });

    const expectedResult = {
      name: 'required|string', // Keeps original string format
      email: ['string', 'required'], // Keeps original array format
      bio: {
        age: 'min:18|required', // Keeps original string format
        education: {
          primary: 'string|required', // Keeps original string format
          secondary: ['string', { in: ['school', 'university'] }, 'required'], // Keeps original array format
        },
      },
    };

    expect(result).toEqual(expectedResult);
  });
});

describe('modelRules', () => {
  it('adds "required" to properties that are: not nullable, have no default and are not autoincrement keys', () => {
    const user = createEloquentModel(UserClass, {}, drizzleDb, schema, DatabaseModels);
    const rules = modelRules(user);

    expect(rules.id).toEqual('integer'); // Autoincrement primary key, should not be required
    expect(rules.name).toEqual('required|string');
    expect(rules.age).toEqual('required|integer');
  });
});
