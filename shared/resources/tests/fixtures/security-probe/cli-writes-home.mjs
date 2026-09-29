#!/usr/bin/env node
/**
 * A CLI that engages on its input AND writes a side effect into os.homedir()
 * — the escape the sandbox HOME exists to make visible (task.144, the BUG-12
 * rule applied to the cli: form).
 */
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

writeFileSync(join(homedir(), "cli-probe-side-effect"), "x");
const host = process.argv[process.argv.indexOf("--host") + 1];
process.exitCode = /^[a-z0-9.-]+(:[0-9]+)?$/i.test(host ?? "") ? 0 : 3;
