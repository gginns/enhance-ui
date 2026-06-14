# Enhance UI — Sidebar Drawer

A personal, canvas-first UI module for Foundry VTT (v13–v14). It turns the
default sidebar into a **fixed icon rail** (a stable activity-bar spine, à la
VS Code / Discord) with **floating drawers** that slide out over the canvas.

The map never reflows or shrinks. Only the drawer moves; the rail stays nailed
to the right edge.

## What it does

- **Fixed rail** pinned to the right edge — never moves, always visible.
- **Click a tab** → its drawer slides out to the *left* of the rail.
- **Click the same tab again** → the drawer retracts back under the rail.
- **Switch tabs** while open → drawer content swaps in place, drawer stays out.
- **Loads fully closed** — pure canvas on world load (rail only, no drawer).
- The rail sits **on top** of the drawer in the z-order.

No ApplicationV2 rewrite: this is positioning + transitions plus a thin JS
layer that toggles state classes. It should survive version bumps.

## Install (dev)

Foundry requires the module folder name to match the `id` in `module.json`.
This repo's `id` is **`enhance-ui`**, so the folder under
`Data/modules/` must be named `enhance-ui` (not `Enchance UI`).

Easiest path on Windows — symlink your dev folder into Foundry's data dir:

```powershell
# Run as admin. Adjust the Foundry data path to yours.
$src = "C:\Projects\Enchance UI"
$dst = "$env:LOCALAPPDATA\FoundryVTT\Data\modules\enhance-ui"
New-Item -ItemType SymbolicLink -Path $dst -Target $src
```

Then enable **Enhance UI — Sidebar Drawer** in your world's module settings.

## Tuning (hardcoded — no config UI by design)

Edit the variables at the top of `styles/enhance-ui.css`:

| Variable          | Purpose                          | Default |
|-------------------|----------------------------------|---------|
| `--eui-rail-w`    | Width of the fixed icon rail     | `54px`  |
| `--eui-drawer-w`  | Width of the slide-out drawer    | `360px` |
| `--eui-anim`      | Open/close animation duration    | `200ms` |

## How it works

`scripts/enhance-ui.js` finds `#sidebar-tabs` (the rail) and the tab panels at
runtime and stamps its own classes (`.eui-rail`, `.eui-drawer`) onto them, so
the CSS doesn't depend on guessing exact native class names. It then toggles
`#sidebar.eui-open` + `<body>.eui-drawer-open` as you open/close drawers. A
`MutationObserver` re-tags the DOM when Foundry re-renders the sidebar.

If the console logs `No drawer panels found inside #sidebar`, the panel
selector needs adjusting for your build — grab the `#sidebar` HTML from dev
tools and update `getPanels()` / the `.eui-drawer` selectors.

## Roadmap (out of scope for v0.1)

- Docked-but-collapsible log with a "peek last 1–2 messages" sliver state
- Summonable dice tray (single-die button → expand → auto-collapse after roll)
- Auto-hide macro hotbar (peek on mouse-to-bottom-edge)
- Auto-hide / slide-out scene nav (top-left)
- Context-aware layout modes (prep / play / combat) via body class + combat hooks
