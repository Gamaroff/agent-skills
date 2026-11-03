// A cli: entry that refuses to run when its PATH names the probe harness's
// directory (task.255): the run-time gh guard belongs to the --fixture-setup
// alone, never to the entry.
process.exit(/\.probe-harness/.test(process.env.PATH ?? "") ? 1 : 0);
