/**
 * A control that engages: it rejects every hostile URL-authority input and
 * accepts a legitimate hostname. Fixture for `security-probe.test.mjs`.
 */
export function validateHost(input) {
  if (typeof input !== "string" || input === "") return false;
  // Reject anything that is not a bare host[:port].
  if (!/^[a-z0-9.-]+(:[0-9]+)?$/i.test(input)) return false;
  if (input.includes("..")) return false;
  return input;
}
