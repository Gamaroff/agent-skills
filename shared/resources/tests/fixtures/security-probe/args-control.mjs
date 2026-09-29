/**
 * A two-argument control: it refuses unless its SECOND argument says which
 * hosts are allowed (task.131). Called with one argument — the engine's shape
 * before --args-json — it throws on every input, so every case is rejected and
 * the verdict is `unverifiable`. Called with `--args-json '[{"allow":[…]}]'`,
 * it engages.
 */
export function validateHost(input, opts) {
  if (!opts || !Array.isArray(opts.allow)) {
    throw new TypeError("validateHost: opts.allow is required");
  }
  return opts.allow.includes(input) ? { ok: true } : { ok: false };
}
