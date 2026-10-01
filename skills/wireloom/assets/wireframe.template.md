---
type: wireframe
title: "{screen title, from the page's <title> or its main heading}"
description: Low-fidelity wireframe of {screen title}.
source: "{source file name, relative to this document}"
source_sha256: "{sha256 printed by `wireloom.js status <source>`}"
profile: "{format profile name, or none}"
viewport: "{width in px, from <meta name=\"viewport\">}"
wireloom: "{renderer version printed by `wireloom.js check`}"
created: "{YYYY-MM-DD}"
updated: "{YYYY-MM-DD}"
---

# {screen title} — wireframe

Derived from `{source}`, {viewport} px phone.

## Default

![{screen title} wireframe]({stem}.wireframe.svg)

<details><summary>Wireloom source</summary>

```wireloom
window:
  text "{the screen's Wireloom source}"
```

</details>

## {Sheet | Tab}: {name}

{One section like "Default" for each state that is hidden until a tap. Delete this section when the
page has none. With more than one block the pictures are {stem}.wireframe.1.svg,
{stem}.wireframe.2.svg, … in block order, so the Default section embeds {stem}.wireframe.1.svg.}

## Conversion notes

- **Dropped:** {what was left out, and the rule that dropped it}.
- **Judgement calls:** {each mapping the profile left open, and what was chosen}.
- **Unmapped:** {classes or elements the profile has no row for, or "none"}.
