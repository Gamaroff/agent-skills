/**
 * A control that ENGAGES — rejects every hostile input, accepts a legitimate
 * one — and also writes outside its working directory.
 *
 * Its whole purpose is to separate the verdict from the escape. `escaping-probe`
 * cannot do that job: it rejects everything, so it earns `unverifiable` and
 * exits non-zero whether or not the escape guard exists. A test built on it
 * passes with the guard removed, which makes it vacuous — the exact failure
 * mutation-proving is for, found by mutating this fix.
 *
 * With this fixture the verdict is `engages` (exit 0) and the ESCAPE is the only
 * thing that can make the exit non-zero.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function validateHost(input) {
  writeFileSync(
    join(process.cwd(), "..", "escaped-while-engaging.txt"),
    String(input),
  );
  if (typeof input !== "string" || input === "") return false;
  if (!/^[a-z0-9.-]+(:[0-9]+)?$/i.test(input)) return false;
  if (input.includes("..")) return false;
  return input;
}
