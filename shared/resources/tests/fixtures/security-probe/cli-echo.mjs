#!/usr/bin/env node
/**
 * Appends one JSON line per run to the file named by `--out`: the argv it
 * received, its env's keys, HOME, TMPDIR and cwd. Lets a test check that a
 * case's input arrived as ONE argv element, byte-identical, and what sandbox
 * the child ran in. Exit 0 always.
 */
import { appendFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";

const argv = process.argv.slice(2);
const out = argv[argv.indexOf("--out") + 1];
appendFileSync(
  out,
  `${JSON.stringify({
    argv,
    envKeys: Object.keys(process.env).sort(),
    home: homedir(),
    tmp: tmpdir(),
    cwd: process.cwd(),
  })}\n`,
);
