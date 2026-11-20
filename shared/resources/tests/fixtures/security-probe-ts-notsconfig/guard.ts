/**
 * A TypeScript entry with NO tsconfig.json above it (the test asserts that): the hook
 * must supply its own resolution default, or the `.js` specifier below would not
 * reach `lib/mapped.ts`.
 */
import { tag } from "./lib/mapped.js";

class Holder {
  constructor(readonly prefix = tag) {}
}

export function validateHost(input: string): string | false {
  return input.includes("/") ? false : new Holder().prefix + input;
}
