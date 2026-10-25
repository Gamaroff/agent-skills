#!/usr/bin/env node
/**
 * The cli: form's task.232 fixture. Its one argument names what to do in its
 * cwd (the case directory) — the same actions as the shell: fixtures:
 * `nested-write` writes sub/marker, `remove` deletes target and sub/target,
 * `keep` does nothing, `symlink-out` plants out -> /. Prints ok, exits 0.
 */
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";

switch (process.argv[2]) {
  case "nested-write":
    mkdirSync("sub", { recursive: true });
    writeFileSync("sub/marker", "");
    break;
  case "remove":
    rmSync("target", { force: true });
    rmSync("sub/target", { force: true });
    break;
  case "symlink-out":
    symlinkSync("/", "out");
    break;
  default:
    break;
}
process.stdout.write("ok\n");
