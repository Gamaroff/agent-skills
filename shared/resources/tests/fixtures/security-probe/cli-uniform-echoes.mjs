// A usage error that quotes its input. Nothing in the output separates this from
// a control refusing that input, so it stays scored: a stated limit.
console.error(`unknown argument ${process.argv[2]}`);
process.exit(2);
