/** No control at all — every input is accepted verbatim. */
export function validateHost(input) {
  return `https://${input}/`;
}
