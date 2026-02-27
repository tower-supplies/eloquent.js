/**
 * Some Javascript equivalents of the methods in Laravel's `Str` class
 * @see https://laravel.com/docs/12.x/strings
 */

/**
 * Convert to camelCase
 *
 * @param {string} input
 * @returns {string}
 */
export function camel(input: string): string {
  return input.toLowerCase().replace(/([_.][a-z])/g, (group) => group.toUpperCase().replace(/[_.]/, ''));
}

/**
 * Convert to snake_case
 *
 * @param {string} input
 * @returns {string}
 */
export function snake(input: string): string {
  return input
    .replace(/([a-z])(\.|[A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace('.', '');
}

/**
 * Captialise first letter
 *
 * @param {string} input
 * @returns {string}
 */
export function ucfirst(input: string): string {
  return `${input.charAt(0).toUpperCase()}${input.slice(1)}`;
}
