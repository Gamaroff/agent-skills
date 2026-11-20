/** A `.tsx` entry: the generic arrow `<T,>` is TSX-only syntax. */
export const identity = <T,>(x: T): T => x;

export function validateHost(input: string): string | false {
  return identity(input).includes("/") ? false : input;
}
