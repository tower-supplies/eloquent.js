type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? K extends keyof T
      ? T[K] extends object
        ? U[K] extends object
          ? DeepMerge<T[K], U[K]>
          : U[K]
        : U[K]
      : U[K]
    : K extends keyof T
      ? T[K]
      : never;
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends object, U extends object>(target: T, source: U): DeepMerge<T, U> {
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    const targetVal = (target as Record<string, unknown>)[key];
    const sourceVal = (source as Record<string, unknown>)[key];

    result[key] = isObject(targetVal) && isObject(sourceVal) ? deepMerge(targetVal, sourceVal) : sourceVal;
  }

  return result as DeepMerge<T, U>;
}
