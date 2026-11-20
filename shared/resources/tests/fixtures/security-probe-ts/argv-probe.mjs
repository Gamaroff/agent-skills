/**
 * The JavaScript twin of argv-probe.ts: a plain entry must be started exactly as before.
 * A long argument (the runner's source, which holds the engine's result marker) is
 * reported as `<code>`.
 */
export function validateHost() {
  const execArgv = process.execArgv.map((a) => (a.length > 200 ? "<code>" : a));
  throw new Error(
    JSON.stringify({
      execArgv,
      compiler: process.env.PROBE_TS_COMPILER ?? null,
    }),
  );
}
