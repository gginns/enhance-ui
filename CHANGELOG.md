# Changelog

## [0.1.4] — 2026-06-14

### Fixed

- **Grey stone texture survived in every theme** (so all themes looked alike).
  Root cause confirmed via computed-style dump: dnd5e paints
  `texture-gray1.webp` on **`.chat-message::before`**, a layered pseudo-element —
  not the card background, which is why prior `background` overrides missed it.
  Now reset `.chat-message::before/::after` globally, so each theme's real
  surface shows: Flat = solid dark, Minimal = no card, Glass = frosted.
- **Parchment now actually looks like parchment** — warm paper gradient with
  dark ink text, instead of reverting to dnd5e's grey stone.
- Timestamp + ⋮ controls are now legible (they were dim text sitting on the
  leftover texture; with the texture gone the forced contrast reads).

### Added

- **Soft fade on the chat scroll edges** — messages now dissolve into the top
  (and slightly the bottom) of the scroll region instead of hard-clipping
  against the screen edge. Tunable via `--eui-fade` (default 28px).

## [0.1.3] — 2026-06-14

### Added

- **Settings panel** (Game Settings → Configure Settings → Enhance UI), all
  client-scoped + live-applied: chat box theme, drawer width, rail width, accent
  colour, and a "force dark" toggle (replaces the old `FORCE_DARK` constant).
- **Four chat box themes:** Flat (solid surface), Parchment (keeps dnd5e's
  texture but with restored contrast), Minimal (no cards, compact rows), Glass
  (frosted translucent).

### Fixed

- **Parchment texture bled through the cards** — the card fill was translucent
  so dnd5e's `background-image` showed underneath. Flat theme now uses a solid
  fill with `background-image: none !important`.
- **Timestamp + delete/⋮ controls were invisible** — dnd5e keeps them near-
  transparent until hover. They're now forced to full opacity with legible
  contrast per theme.
- **Lingering red/maroon bar on the left edge** — reset decorative borders and
  `::before`/`::after` pseudo-elements on `.chat-scroll` / `.chat-log`.

## [0.1.2] — 2026-06-14

### Fixed

- **Drawer sticks open when collapsing any non-chat panel.** Clicking a tab
  again to retract it left the panel visible as a grey slab over the canvas
  (only Chat retracted correctly).
  - **Cause:** Foundry's sidebar tab panels are ApplicationV2 windows, and
    AppV2 sets an **inline `transform`** on them for positioning. The
    closed-state hide used a stylesheet `transform` with no `!important`, so the
    inline value won and the drawer never slid off-screen. Chat doesn't get the
    same inline transform, which is why only Chat closed correctly.
  - **Fix:** mark the drawer `transform` `!important` in both the closed and
    open states, and add a safety net that hides any non-rail / non-drawer
    sidebar child when nothing is open (`#sidebar:not(.eui-open) >
    *:not(.eui-rail):not(.eui-drawer) { display: none }`).
  - Files: `styles/enhance-ui.css`.

### Added

- **Cohesive content restyle (theme-aware).** Restyled the drawer *interior* to
  match the rail instead of leaving raw Foundry/dnd5e chrome: flattened chat
  message cards and **overrode the inline `border-color` user-colour** (the
  magenta `#cc28c1` borders) down to a subtle card + thin accent; quieted
  round-markers; dark search/inputs; ProseMirror chat input, chat controls and
  dice-tray buttons on the card surface; directory hover/rows (user folder
  colours preserved); settings/access buttons + dividers. Confirmed against the
  real v14 DOM: panels live in `#sidebar-content > section.sidebar-tab`, so the
  closed-state safety net hides that single wrapper.

- **Theme-aware palette (per user).** Foundry's color scheme is a client
  setting flagged on `<body>` (`theme-dark`/`theme-light` + `data-theme`), so it
  is not forced by the GM. The drawer now defines dark + light surface palettes
  keyed off that flag; text/scrollbar colors pull from Foundry's semantic
  tokens (`--color-text-primary`, `--color-text-subtle`, etc.) so they adapt
  automatically. A light-mode player gets a light drawer, a dark-mode player
  gets dark.
- **`FORCE_DARK` escape hatch** in `scripts/enhance-ui.js` — set `true` to keep
  the immersive dark drawer for everyone regardless of their theme (adds
  `.eui-force-dark`, suppressing the light overrides).

### Notes

- The stray red/pink ticks chased since v0.1.1 were the dnd5e inline user-colour
  (`#cc28c1`) bleeding through message-card chrome — now addressed by the chat
  card override above. Verify visually after deploying this build.

## [0.1.1] — 2026-06-14

- Polish: hide orphaned Foundry window chrome; unify rail + drawer into one
  seamless unit; clean active-tab state; add padding and slimmer scrollbars.
- CI: tag-triggered GitHub Action that builds the module zip and cuts a release.

## [0.1.0] — 2026-06-14

- Initial release. Fixed right-edge icon rail + floating overlay drawers that
  slide out leftward. Loads fully closed (canvas-first). All default tabs on the
  rail. Self-tagging JS, no ApplicationV2 rewrite.
