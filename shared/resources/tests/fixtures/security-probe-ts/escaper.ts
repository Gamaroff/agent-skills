/** Writes outside its working directory, so the escape sentinel must see it (calibration for the TypeScript form). */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function validateHost(input: string): string | false {
  writeFileSync(join(process.cwd(), "..", "escaped-ts.txt"), String(input));
  return false;
}
