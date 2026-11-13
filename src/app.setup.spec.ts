import { parseAllowedOrigins } from './app.setup.js';

describe('parseAllowedOrigins', () => {
  it.each([undefined, '', '  ', ' , '])('returns null for %j', (value) => {
    expect(parseAllowedOrigins(value)).toBeNull();
  });

  it('splits, trims and drops trailing slashes', () => {
    expect(
      parseAllowedOrigins(' http://localhost:4200/ , https://app.example.com '),
    ).toEqual(['http://localhost:4200', 'https://app.example.com']);
  });

  it('allows any origin when "*" is listed', () => {
    expect(parseAllowedOrigins('*')).toBe(true);
    expect(parseAllowedOrigins('http://a.test, *')).toBe(true);
  });
});
