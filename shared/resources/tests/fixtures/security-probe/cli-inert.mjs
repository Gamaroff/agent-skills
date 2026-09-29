#!/usr/bin/env node
/**
 * A CLI whose `--host` guard is PRESENT BUT INERT: it refuses whitespace and
 * `@` and lets `/` through, which is the re-pointing route.
 */
const argv = process.argv.slice(2);
const host = argv[argv.indexOf("--host") + 1];
if (/[\s@]/.test(host ?? "")) {
  console.error("refused");
  process.exitCode = 3;
} else {
  console.log(host);
}
