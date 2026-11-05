#!/usr/bin/env node
/**
 * A CLI that reads repository state (task.254): `check DIR` exits 0 only when
 * its cwd is inside a git work tree that holds a commit, and refuses anything
 * else with exit 1. The shape whose legitimate case needs a `--fixture-setup`:
 * fixture files are text, so without a setup no commit can exist and every
 * input, legitimate ones too, ends in "not a repository".
 */
import { spawnSync } from "node:child_process";

const [cmd, dir] = process.argv.slice(2);
if (cmd !== "check" || dir === undefined) {
  console.error("usage: cli-needs-repo check DIR");
  process.exit(2);
}
if (dir.startsWith("-")) {
  // The guard under probe: a DIR that reads as a flag is refused whatever the
  // repository holds, so a hostile case is rejected even when one exists.
  console.error(`refusing ${dir}: reads as a flag`);
  process.exit(1);
}
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
if (git("rev-parse", "--is-inside-work-tree").status !== 0) {
  console.error("not a git repository");
  process.exit(1);
}
if (git("rev-parse", "--verify", "HEAD").status !== 0) {
  console.error("no commit");
  process.exit(1);
}
console.log("ok");
