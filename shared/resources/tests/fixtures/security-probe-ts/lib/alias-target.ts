/** Reached through the tsconfig `paths` alias `@fx/alias-target`. */
export function isHostile(host: string): boolean {
  return /[\\?#]/.test(host);
}
