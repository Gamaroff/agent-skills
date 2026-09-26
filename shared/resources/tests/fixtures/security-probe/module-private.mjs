/**
 * The predicate exists but is module-private — the task.139 shape (obs #156):
 * `isWorkItemDocument` was a bare `const`, so the probe could not import it.
 */
const validateHost = (input) => typeof input === "string" && input.length < 64;

export const unrelated = validateHost;
