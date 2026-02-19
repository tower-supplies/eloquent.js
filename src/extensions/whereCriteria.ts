import { eq, gt, gte, lt, lte, SQL } from 'drizzle-orm';
import { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import { TWhereOperator } from '../types';

type TWhereFunction = (column: SQLiteColumn, value: unknown) => SQL;

const whereCriteria = (column: SQLiteColumn, operator: TWhereOperator, value?: unknown) =>
  resolveWhereOperator(operator)(column, value);

const resolveWhereOperator = (operator: TWhereOperator): TWhereFunction => {
  switch (operator) {
    case '=':
      return eq;

    case '>':
      return gt;

    case '>=':
      return gte;

    case '<':
      return lt;

    case '<=':
      return lte;

    default:
      throw new Error(`Unsupported where operator: ${operator}`);
  }
};

export default whereCriteria;
