// Remove the common leading indentation of a block of text. A fenced block nested in a list item
// carries the list's indent; a shell reads it as written, so tests dedent before running it.
export function dedent(text) {
  const lines = text.split("\n");
  const indents = lines
    .filter((l) => l.trim() !== "")
    .map((l) => l.match(/^ */)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(Math.min(cut, l.match(/^ */)[0].length)))
    .join("\n");
}
