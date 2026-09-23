#!/usr/bin/env node
/**
 * A multi-flag CLI whose `--host` guard ENGAGES: a bare host[:port] is printed
 * and exits 0, anything else is refused with a non-zero exit. The shape the
 * cli: entry form (task.144) exists to reach — the decision sits behind a flag
 * parser, not behind a one-argument export.
 */
const argv = process.argv.slice(2);
const val = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const host = val("--host");
if (val("--mode") !== "strict") {
  console.error("usage: cli-refuser --mode strict --host <host>");
  process.exitCode = 2;
} else if (
  typeof host !== "string" ||
  !/^[a-z0-9.-]+(:[0-9]+)?$/i.test(host) ||
  host.includes("..")
) {
  console.error(`refused: ${JSON.stringify(host)} is not a bare host`);
  process.exitCode = 3;
} else {
  console.log(host);
}
