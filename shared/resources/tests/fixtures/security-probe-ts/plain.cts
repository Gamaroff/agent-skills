/** A `.cts` entry written with ESM syntax: the hook loads every TypeScript source as a module. */
import { shape } from "./lib/envelope";

enum Mode {
  On = 1,
}

export function validateHost(input: string): string | false {
  return Mode.On && !input.includes("/") ? shape(input) : false;
}
