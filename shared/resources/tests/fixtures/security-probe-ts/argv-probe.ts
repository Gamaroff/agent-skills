/**
 * Reports how its own child was started: the case's answer carries it in `detail`.
 * The runner's source is one of the `-e` arguments and holds the engine's result
 * marker, which would corrupt the answer, so a long argument is reported as `<code>`.
 */
export function validateHost(_input: string): never {
  const execArgv = process.execArgv.map((a) => (a.length > 200 ? "<code>" : a));
  throw new Error(
    JSON.stringify({
      execArgv,
      compiler: process.env.PROBE_TS_COMPILER ?? null,
    }),
  );
}
