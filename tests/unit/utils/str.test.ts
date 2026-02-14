import { camel, ucfirst } from '@/utils';
import { describe, expect, it } from 'vitest';

describe('camel', () => {
  it('converts snake_case to camelCase', () => {
    const camelised = camel('basic_example');
    expect(camelised).toEqual('basicExample');
  });
});

describe('ucfirst', () => {
  it('converts the first character of a string to Uppercase', () => {
    const capitalised = ucfirst('basic example');
    expect(capitalised).toEqual('Basic example');
  });
});
