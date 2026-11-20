/** A class decorator (tsconfig `experimentalDecorators`): `transpileModule` emits the helper inline. */
function frozen(target: Function): void {
  Object.freeze(target.prototype);
}

@frozen
class Box {
  value = "x";
}

export function validateHost(input: string): string | false {
  return new Box().value === input || input.includes("/") ? false : input;
}
