import { camel, snake, ucfirst } from '@/utils';
import { describe, expect, it } from 'vitest';

describe('camel', () => {
  it('converts snake_case to snakeCase', () => {
    const camelised = camel('basic_example');
    expect(camelised).toEqual('basicExample');
  });

  it('converts dot.notation to dotNotation', () => {
    const camelised = camel('basic.example');
    expect(camelised).toEqual('basicExample');
  });
});

describe('snake', () => {
  it('converts camelCase to camel_case', () => {
    const snaked = snake('basicExample');
    expect(snaked).toEqual('basic_example');
  });

  it('converts dot.notation to dot_notation', () => {
    const snaked = snake('basic.example');
    expect(snaked).toEqual('basic_example');
  });
});

describe('ucfirst', () => {
  it('converts the first character of a string to Uppercase', () => {
    const capitalised = ucfirst('basic example');
    expect(capitalised).toEqual('Basic example');
  });
});
