# Format profile: Rebirth hi-fi phone screens

Load this when [`SKILL.md`](../../SKILL.md) § "Working from an existing UI" matches a page to this
format. It maps the format's markup to Wireloom primitives. The general rules in that section still
apply. This file only settles what they leave to the profile.

## The format

One phone screen per HTML file, 393 px wide (`<meta name="viewport" content="width=393…">`), usually
under `apps/rebirth-app-ux/hifi/rbt-theme/{parent,teen}/`. The pages share one stylesheet
(`_shared/rbt-theme.css`) and one component vocabulary, the `s5-*` classes.

**Detect by** `<body class="phone rbt-theme audience-…">` together with `s5-*` classes in the body.

## Skip entirely

| Markup | Why |
|---|---|
| `<svg id="rbt-icon-sprite">` | The icon sprite sheet. It is most of the file (about 350 of 430 lines) and draws nothing by itself |
| `<script>`, `<style>`, `<head>` | No layout |
| `div.status` | The fake iOS status bar (`9:41`, signal, battery). Wireloom has no status bar |
| `img.s5-cloudCutout` | Background cloud art |
| `.s5-hero` and everything in it (`s5-heroPhoto`, `s5-heroFade`, `s5-notch`, logos) | A decorative photo band, marked `aria-hidden` |
| `s5-pulse`, `s5-accentDot`, `s5-loader__dot`, `s5-tabInk`, `s5-sliderDots` | Animation and decoration |
| `s5-photoBg`, `s5-photoVeil` | Full-bleed background photo behind a photo screen. Keep the copy on top of it (`s5-photoTitle`, `s5-photoSub`) |
| `svg.rbt-svg` icons | Every one is `aria-hidden="true"`, so it is decoration. The two exceptions are under [Icons](#icons) |

## Screen structure

| Markup | Wireloom |
|---|---|
| `div.screen` | `window:`, untitled |
| `header.s5-onbTop` (`s5-onbBack` + `s5-onbTitle`) | `navbar:` with `leading:` holding `backbutton "Back"` and `text "<title>" bold`. The back control has no visible label; its `aria-label` is "Back" |
| `.s5-homeHead` (handle + bell) | `header:` with a `row:` of `text "<handle>" muted`, `spacer`, and the bell as an [icon-only button](#icons) |
| `.s5-onbBody`, `.s5-homeBody` | No primitive of its own: its children go straight into the window |
| `.s5-actions` | `footer:`. Keep the page's button order |
| `nav.s5-nav` | `tabbar:`. One `tabitem` per `<span>`, label from the `<em>`, `is-on` → `selected` |
| `.s5-sheetOverlay[hidden]` | A second block: the full base screen again, plus `sheet title="<s5-sheetEyebrow>":`. The sheet's `<h2>` becomes `text … bold`, its `<p>` plain `text`, its `.s5-approveActions` a `row justify=end:` of buttons |
| `.s5-tabs` + `.s5-pane` | `segmented:` with one `segment` per `.s5-tab` (`is-active` → `selected`), then the visible pane's content. Draw each `hidden` pane as its own block only when the user asks for it |

## Content

| Markup | Wireloom |
|---|---|
| `h1.s5-h1` | `text "<copy>" bold size=large` |
| `p.s5-lede` | `text "<copy>" muted` |
| `p.s5-caps--section` | `section "<copy>":` holding everything up to the next section heading (or the end of the body) |
| `p.s5-noteCard` | `panel:` holding the copy as `text` lines |
| `.s5-glassCard`, `.s5-formCard` | `panel:` |
| `label.s5-field` (`s5-fieldLabel` + `s5-fieldValue`) | `kv "<label>" "<value>"` |
| `.s5-members` > `.s5-member` | `list:` of `slot "<s5-name>" chevron:` holding a `row:` of `avatar "<initial>" size=small` and `text "<s5-role>" muted`. Add `chevron` only when the row has an `s5-chev`; a trailing `s5-pill` replaces the chevron with a [status](#pills) |
| `.s5-eduRow`, `.s5-glassRow` | `text "<strong>" bold`, then `text "<s5-meta>" muted`. With a trailing pill, wrap them as a `row:` of a `col:` holding the two lines, then the [pill](#pills) |
| `.s5-list` > `.s5-listItem` | `list:` of `item "<copy>"` |
| `.s5-rowGroup` > `.s5-pickRow` | `radio "<s5-pickName>" group="<section>" label-right`, `is-on` → `selected`, followed by `text "<s5-pickMeta>" muted` when there is one |
| `.s5-chipRow` > `.s5-chipBtn` | `row:` of `chip "<copy>"`, `is-on` → `selected` |
| `.s5-tileGrid` > `.s5-tile` | `grid cols=2 rows=<n/2>:` of `cell "<s5-caps>":` holding `text "<s5-tileSub>" muted`. `s5-tile--focal` → `state=active` |
| `.s5-slider` > `.s5-slide` | The first slide only, as `slot "<h3>":` holding `text "<caps> · <p>" muted`, then `text "1 of <n>" muted` |
| `.s5-appRow`, `.s5-bandRow` | `row:` of `image label="<alt>" width=48 height=48`, a `col:` (`text "<s5-appName>" bold`, `text "<s5-appMeta>" muted`), `spacer`, then the pill or action |
| `.s5-bandBar` (`--pct:N%`) | `progress value=<N> max=100 label="<s5-bandLeft>"` |
| `button.s5-cta` | `button "<copy>" primary` |
| `button.s5-ghost` | `button "<copy>"` |
| `button.s5-platAct` | `button "<copy>"`, `s5-platAct--on` → `primary` |
| `img.s5-avatar` (a photo) | `avatar "<first letter of the name>" size=small` |
| `.s5-avatar--ph` (an icon in a circle) | The same `avatar`, from the name beside it |

A class not listed here falls back to the general rules: transcribe its visible text, and pick the
primitive whose meaning matches. Then add a row here, so the next conversion doesn't have to work it
out again.

## Pills

`s5-pill` is a read-only state badge. It is never a `toggle`, even when it reads "On", because the
page draws no switch. Its variant is a colour with a meaning (`_shared/rbt-theme.css`), so it maps to
a `status` kind:

| Variant | Colour | Wireloom |
|---|---|---|
| `s5-pill--on` | green | `status "<copy>" kind=success` |
| `s5-pill--live` | orange: waiting on the user | `status "<copy>" kind=warning` |
| `s5-pill--wait` | muted brown: ended or about to | `chip "<copy>"` |
| `s5-pill`, no variant | teal | `status "<copy>" kind=info` |

## Icons

Drop `rbt-svg` icons, with two exceptions where the icon is the only thing that tells a control apart:

- **Tab-bar items.** Use the nearest named Wireloom icon. If there isn't one, leave `icon=` off and the
  renderer draws the label's first letter in a box.
- **Icon-only buttons** (the bell in `.s5-homeHead`). Use a text button named for what it does, such as
  `button "Notifications"`. A boxed letter tells the reader nothing.

| Sprite symbol | Named icon |
|---|---|
| `rbt-family-hub`, `rbt-linked-profile`, `rbt-add-teen`, `rbt-pending-invite` | `leader` |
| `rbt-profile-settings` | `gear` |
| `rbt-passport`, `rbt-shield-lock`, `rbt-time-lock` | `lock` |
| `rbt-legal-consent`, `rbt-activity-ledger`, `rbt-transactions-ledger` | `policy` |
| `rbt-wallet`, `rbt-financial-limits` | `credits` |
| `rbt-success`, `rbt-approve` | `check` |
| `rbt-warning` | `warning` |
| `rbt-error` | `warning` with `accent=danger` |
| anything else (`rbt-home-dashboard`, `rbt-notifications`, …) | none |

## Worked example: `parent/app-family-settings.html`

Caption: "Derived from `app-family-settings.html`, 393 px phone".

What was dropped: the status bar, three cloud cutouts, the icon sprite, and the five `s5-listIco` row
icons, which are all `aria-hidden`. The repeated title in `s5-onbTitle` and `s5-h1` is kept twice,
because the page shows it twice.

```wireloom
window:
  navbar:
    leading:
      backbutton "Back"
      text "Family settings" bold
  text "Family settings" bold size=large
  text "The name, the members, and how you are asked." muted
  panel:
    kv "Family name" "Steiner family"
  section "Members":
    list:
      slot "You" chevron:
        row:
          avatar "Y" size=small
          text "Parent · verified" muted
      slot "Sophie" chevron:
        row:
          avatar "S" size=small
          text "Teen · verified family" muted
      slot "Jakob" chevron:
        row:
          avatar "J" size=small
          text "Teen · invite open" muted
  section "Tell me":
    row:
      col:
        text "Consent requests" bold
        text "As soon as one arrives" muted
      status "On" kind=success
    row:
      col:
        text "Consent about to end" bold
        text "Renew it, or let it lapse" muted
      status "On" kind=success
    row:
      col:
        text "Asks and limit warnings" bold
        text "From each teen" muted
      status "On" kind=success
  section "Approvals":
    row:
      col:
        text "Your passkey or Face ID" bold
        text "Before any approval or change" muted
      status "Always" kind=success
    row:
      col:
        text "Ask before a consent continues" bold
        text "Nothing carries on by itself" muted
      status "Always" kind=success
  section "Privacy":
    list:
      item "Services get an age band and your yes or no"
      item "Never names, birthdays, messages or location"
  footer:
    button "Done"
```

## Worked example: `parent/app-consent-request.html`, with its sheet

The page has a hidden `.s5-sheetOverlay` opened by the Review button, so it gives two blocks: the
screen as it loads, then the same screen with the sheet up. Both lede lines are split to stay under
about 42 characters.

```wireloom
window:
  navbar:
    leading:
      backbutton "Back"
      text "Consent request" bold
  text "Roblox asked to connect" bold size=large
  text "So Sophie can open an account." muted
  text "It wants her age band — nothing else." muted
  row:
    image label="Roblox" width=48 height=48
    col:
      text "Roblox" bold
      text "Asked today 16:20 · games" muted
    spacer
    status "Waiting" kind=warning
  panel:
    text "For Sophie" bold
    text "14–17 · verified family" muted
    text "Over 13 — yes or no" bold
    text "Not her birthday, not her name" muted
    text "Nothing else is shared" bold
    text "No messages, no location, no activity" muted
  section "How long":
    radio "30 days" group="how-long" selected label-right
    text "Reminder before it ends" muted
    radio "This school year" group="how-long" label-right
    text "Ends 30 June" muted
    radio "Until I withdraw" group="how-long" label-right
  footer:
    button "Review" primary
    button "Decline"
```

```wireloom
window:
  navbar:
    leading:
      backbutton "Back"
      text "Consent request" bold
  text "Roblox asked to connect" bold size=large
  text "So Sophie can open an account." muted
  text "It wants her age band — nothing else." muted
  row:
    image label="Roblox" width=48 height=48
    col:
      text "Roblox" bold
      text "Asked today 16:20 · games" muted
    spacer
    status "Waiting" kind=warning
  panel:
    text "For Sophie" bold
    text "14–17 · verified family" muted
    text "Over 13 — yes or no" bold
    text "Not her birthday, not her name" muted
    text "Nothing else is shared" bold
    text "No messages, no location, no activity" muted
  section "How long":
    radio "30 days" group="how-long" selected label-right
    text "Reminder before it ends" muted
    radio "This school year" group="how-long" label-right
    text "Ends 30 June" muted
    radio "Until I withdraw" group="how-long" label-right
  footer:
    button "Review" primary
    button "Decline"
  sheet title="Approve connection":
    text "Roblox receives “over 13” for Sophie" bold
    text "Her name stays on this device."
    text "Ends in 30 days unless you renew —"
    text "withdraw any time in consent history."
    row justify=end:
      button "Back"
      button "Approve" primary
```
