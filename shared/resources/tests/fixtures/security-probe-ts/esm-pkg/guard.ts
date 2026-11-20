/** A `.ts` entry in a `"type": "module"` package, with an index-resolved import. */
import { shape } from "./helpers";

class Pair {
  constructor(public readonly bad = "/") {}
}

export function validateHost(input: string): string | false {
  return input.includes(new Pair().bad) ? false : shape(input);
}
