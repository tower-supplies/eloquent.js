enum WhereOperator {
  EQUALS = '=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL_TO = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL_TO = '<=',
}

export type TWhereOperator = WhereOperator[keyof WhereOperator];

export default WhereOperator;
