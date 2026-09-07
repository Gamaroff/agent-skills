/**
 * A control that is PRESENT BUT INERT: it rejects some hostile input (so a
 * reviewer reading the source sees a control and believes it) while letting a
 * different hostile shape straight through.
 */
export function validateHost(input) {
  if (typeof input !== "string" || input === "") return false;
  // Rejects whitespace and @ — but not `/`, which is the re-pointing route.
  if (/[\s@]/.test(input)) return false;
  return input;
}
