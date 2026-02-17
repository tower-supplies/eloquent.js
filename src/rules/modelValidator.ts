import Validator, { ErrorMessages, Rules, TypeCheckingRule } from '@tower-supplies/validator.js';
import collect from 'collect.js';
import { SQLiteColumn, SQLiteInteger, SQLiteText } from 'drizzle-orm/sqlite-core';

import Model from '../classes/Model';
import { TDatabase } from '../types';
import en from './lang/en';

/**
 * Set English error messages by default (rather than slugs, e.g. 'validation.required')
 * @see https://github.com/tower-supplies/validatorjs/tree/main#language-support
 */
Validator.setMessages('en', en);
Validator.useLang('en');

/**
 * Add/merge rules to existing rules
 * @param {Rules} existingRules
 * @param {string | Array<string | TypeCheckingRule> | Rules} additionalRules
 * @returns {Rules}
 */
export const addRules = (
  existingRules: Rules,
  additionalRules: Rules | string | (string | TypeCheckingRule)[]
): Rules | string[] => {
  // Convert to iterable rules
  const iterableRules = typeof additionalRules === 'string' ? additionalRules.split('|') : additionalRules;

  // Loop through rules
  Object.entries(iterableRules).forEach(([key, rule]: [string, string | TypeCheckingRule]) => {
    // Get properties for additional rule
    const isArray = Array.isArray(rule);
    const isString = typeof rule === 'string';

    if (typeof existingRules[key] === 'undefined') {
      // New key
      existingRules[key] = rule;
    } else if (typeof existingRules[key] === 'string') {
      // Merging with existing key
      if (isArray || isString) {
        const additionalRuleParts = isArray ? rule : rule.split('|');
        existingRules[key] = collect(existingRules[key].split('|')).merge(additionalRuleParts).unique().join('|');
      }
    } else if (Array.isArray(existingRules[key])) {
      // Merging with existing array
      if (isArray || isString) {
        const additionalRuleParts = isString ? [rule] : rule;
        existingRules[key] = [...existingRules[key], ...additionalRuleParts].filter(
          (e, i, self) => i === self.indexOf(e)
        ); // Unique
      }
    } else {
      // Must be an instance of Rules; i.e. nested / deep merge
      existingRules[key] = addRules(existingRules[key], rule);
    }
  });

  return Object.keys(existingRules).every((key, index) => key === String(index))
    ? (Object.values(existingRules) as string[])
    : existingRules;
};

type TColumnTypeMapping = Record<string, string>;

/**
 * Column mapping (SQLite => Validator)
 */
const columnTypeMappings: TColumnTypeMapping = {
  [SQLiteInteger.name]: 'integer',
  [SQLiteText.name]: 'string',
};

type TSQLiteColumn = SQLiteColumn & {
  autoIncrement: boolean;
};

/**
 * Guesses primitive model rules based on database schema
 * @param {Model} model
 * @returns {Rules}
 */
export const modelRules = <TAttributes, T extends TDatabase>(model: Model<TAttributes, T>): Rules => {
  const columnTypes = collect(columnTypeMappings);
  const rules: Rules = {};

  // Loop through columns
  Object.entries(model.getTableDefinition()).forEach(([columnName, column]: [string, TSQLiteColumn]) => {
    //console.log(columnName, column);

    // Check if required (i.e. not null and without default value)
    const autoIncrementPrimaryKey = column.autoIncrement && column.primary;
    const hasDefault = column.default ?? column.defaultFn;
    if (column.notNull && !autoIncrementPrimaryKey && !hasDefault) {
      addRules(rules, { [columnName]: 'required' });
    }

    // Check if column type is known, and should be enforced
    const columnType = columnTypes.get(column.columnType);
    if (columnType) {
      addRules(rules, { [columnName]: columnType });
    }
  });

  return rules;
};

/**
 * Returns a validator for the given model instance
 * @param {Model} model
 * @param {Rules} rules
 * @param {ErrorMessages} customErrorMessages
 * @returns
 */
const modelValidator = <TAttributes, T extends TDatabase>(
  model: Model<TAttributes, T>,
  rules: Rules = {},
  customErrorMessages: ErrorMessages = {}
) => {
  return new Validator(model.getAttributes(), addRules(modelRules(model), rules) as Rules, customErrorMessages);
};

export default modelValidator;
