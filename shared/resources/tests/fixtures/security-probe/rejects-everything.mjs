/**
 * An unimplemented control: it throws on every input, hostile and legitimate
 * alike. Indistinguishable from a stub, which is why it must NOT score
 * `engages`.
 */
export function validateHost() {
  throw new Error("not implemented");
}
