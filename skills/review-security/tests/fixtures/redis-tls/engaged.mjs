/**
 * Measured defect A, ENGAGED variant.
 *
 * Composes an ioredis-style options object from an untrusted authority
 * component. TLS is applied UNCONDITIONALLY — it cannot be gated on an
 * environment variable, because the probe sandbox's env is a fixed six-key
 * allowlist (`sandboxEnv`, shared/resources/qa-execute-snippets.mjs) that a
 * probe spec has no way to extend.
 *
 * One argument, by the engine's contract: the child runner calls `fn(input)`.
 * Rejection is `false`; acceptance is the composed object.
 */
export function buildRedisOptions(authority) {
  if (typeof authority !== "string" || authority === "") return false;

  // A bare host, optionally with a numeric port. This is the discrimination the
  // corpus is built to test: `db.internal.example.com:5432` is legitimate and
  // `pa:ss` is hostile, so `:` must be judged by what follows it rather than by
  // its presence.
  const m = /^([a-z0-9.-]+)(?::([0-9]+))?$/i.exec(authority);
  if (!m) return false;

  const [, host, port] = m;
  if (host.includes("..") || host.startsWith(".") || host.endsWith(".")) {
    return false;
  }
  // An external destination must not resolve to the machine running the code:
  // loopback and private ranges reach services that are unauthenticated
  // precisely because they were assumed unreachable.
  if (
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
  ) {
    return false;
  }

  return {
    host,
    port: port ? Number(port) : 6379,
    tls: { rejectUnauthorized: true, servername: host },
  };
}
