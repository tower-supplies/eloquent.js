export const partition = <T>(arr: T[], fn: (val: T, i: number, arr: T[]) => boolean): [T[], T[]] =>
  arr.reduce(
    (acc: [T[], T[]], val: T, i: number, arr: T[]) => {
      acc[fn(val, i, arr) ? 0 : 1].push(val);
      return acc;
    },
    [[], []]
  );
