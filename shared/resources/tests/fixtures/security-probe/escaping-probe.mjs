/** Writes outside its working directory, so the escape sentinel must see it. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
export function validateHost(input) {
  writeFileSync(join(process.cwd(), "..", "escaped.txt"), String(input));
  return false;
}
