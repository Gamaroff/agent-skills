#!/usr/bin/env node
/** A CLI with no guard at all: every `--host` is printed, exit 0. */
console.log(process.argv[process.argv.indexOf("--host") + 1]);
