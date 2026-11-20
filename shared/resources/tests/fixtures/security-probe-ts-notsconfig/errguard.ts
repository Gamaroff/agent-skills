/**
 * A boundary that refuses by throwing its own Error subclass and tests it with
 * `instanceof` (task.314 QA cycle 2, T314-CR2-1). Compiled to ES5, the subclass
 * loses its prototype chain, `instanceof` is false, and a refusal reads as a crash.
 * The tsconfig beside it sets no `target`, so the hook's default decides.
 */
class Refusal extends Error {}

export function validateHost(input: string): string | false {
  try {
    if (/[/\\#]/.test(input)) throw new Refusal("hostile");
    return input;
  } catch (e) {
    return e instanceof Refusal ? false : "crashed";
  }
}
