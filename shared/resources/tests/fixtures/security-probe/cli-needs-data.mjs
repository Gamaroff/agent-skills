#!/usr/bin/env node
/**
 * A CLI that reads a populated directory (task.216): `merge-back DIR` exits 0
 * only when DIR/items.json exists and carries the marker, or when the
 * PROBE_MARKER env var does; anything else is refused with exit 1. The shape
 * whose legitimate case needs a case `fixture` — without one every input,
 * legitimate ones too, ends in "no items.json".
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [cmd, dir] = process.argv.slice(2);
if (cmd !== "merge-back" || dir === undefined) {
  console.error("usage: cli-needs-data merge-back DIR");
  process.exit(2);
}
if (process.env.PROBE_MARKER === "MARKER") {
  console.log("ok (env)");
  process.exit(0);
}
const items = join(dir, "items.json");
if (!existsSync(items)) {
  console.error(`no items.json in ${dir}`);
  process.exit(1);
}
if (!readFileSync(items, "utf8").includes("MARKER")) {
  console.error(`${items} carries no marker`);
  process.exit(1);
}
console.log("ok");
