/** A `.mts` entry with a type-only import (erased) and a parameter property. */
import type { Readable } from "node:stream";

class Holder {
  constructor(readonly source?: Readable) {}
}

export function validateHost(input: string): string | false {
  return new Holder().source === undefined && !input.includes("/")
    ? input
    : false;
}
