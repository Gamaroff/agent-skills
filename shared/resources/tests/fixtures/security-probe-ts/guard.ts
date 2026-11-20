/**
 * The TypeScript boundary fixture for the module entry form (task.314). One file
 * that Node's strip-only mode cannot load, for each of these reasons:
 *   1. non-erasable syntax: an enum, a namespace, a parameter property;
 *   2. a value import in a `.ts` file whose nearest package.json says commonjs;
 *   3. resolution: an extensionless import and a `.js` specifier that names a
 *      `.ts` file. (The `paths` alias has its own file, `alias.ts`, so removing
 *      the alias handling turns that one case red and no other.)
 */
import { shape } from "./lib/envelope";
import { suffix } from "./lib/nodenext.js";

enum Verdict {
  Refuse = "refuse",
  Allow = "allow",
}

namespace Parse {
  export const host = (s: string): string => s.trim();
}

class Guard {
  constructor(readonly deny: readonly string[]) {}
  decide(input: string): Verdict {
    const host = Parse.host(input);
    return this.deny.some((d) => host.includes(d))
      ? Verdict.Refuse
      : Verdict.Allow;
  }
}

const guard = new Guard(["/", "@", " ", "\\", "#", "?"]);

/** A control that refuses every hostile input and accepts a plain host. */
export function validateHost(input: string): string | false {
  return guard.decide(input) === Verdict.Allow ? shape(input) + suffix : false;
}

/** No control at all: every input is accepted. */
export function acceptAll(input: string): string {
  return shape(input);
}
