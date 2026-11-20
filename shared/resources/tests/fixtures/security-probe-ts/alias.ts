/** A value import through the tsconfig `paths` alias: the ONLY thing in this file that needs it. */
import { isHostile } from "@fx/alias-target";

export function validateHost(input: string): string | false {
  return isHostile(input) || input.includes("/") ? false : input;
}
