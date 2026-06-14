/**
 * Enhance UI — Sidebar Drawer
 * ---------------------------------------------------------------------------
 * Decouples the Foundry sidebar's tab rail from its panel content.
 *
 *   - The rail (#sidebar-tabs) is pinned to the right edge as a stable spine.
 *   - Each tab panel becomes a floating "drawer" that slides out to the LEFT
 *     of the rail as an overlay. The canvas never reflows.
 *   - Click a tab to open its drawer; click the same tab again to retract it.
 *   - World loads "fully closed": rail only, no drawer. (Per spec.)
 *
 * This script does NOT rewrite the Sidebar Application. It only:
 *   1. Stamps its own classes onto the rail + panels (so CSS is robust against
 *      Foundry markup changes between versions).
 *   2. Toggles state classes on #sidebar / <body> for the open/close overlay.
 *
 * All positioning + animation lives in styles/enhance-ui.css.
 */

const EUI = {
  ID: "enhance-ui",

  /** Settings keys (registered in the `init` hook, scope: client). */
  SETTINGS: {
    chatTheme: "chatTheme",
    drawerWidth: "drawerWidth",
    railWidth: "railWidth",
    accent: "accent",
    forceDark: "forceDark",
  },

  /** Available chat-box themes (value -> label). */
  CHAT_THEMES: {
    flat: "Flat (solid, themed)",
    parchment: "Parchment (D&D, fixed contrast)",
    minimal: "Minimal (no cards, compact)",
    glass: "Glass (frosted translucent)",
  },

  /** Stable anchors that have held across v11–v14. */
  SIDEBAR_SEL: "#sidebar",
  RAIL_SEL: "#sidebar-tabs",

  /** Runtime state. */
  state: { open: false, tab: null },
  observer: null,
  _rafQueued: false,

  log(...args) { console.log("Enhance UI |", ...args); },
  warn(...args) { console.warn("Enhance UI |", ...args); },

  getSidebar() { return document.querySelector(this.SIDEBAR_SEL); },
  getRail() { return document.querySelector(this.RAIL_SEL); },

  /**
   * Find the tab content panels — the things that should become drawers.
   * Tries the most specific v13/v14 selectors first, then falls back to any
   * [data-tab] element inside #sidebar that is NOT part of the rail.
   */
  getPanels(sidebar) {
    if (!sidebar) return [];
    const specific = sidebar.querySelectorAll(
      ":scope > section.sidebar-tab, :scope > .sidebar-tab, :scope > section[data-tab]"
    );
    if (specific.length) return Array.from(specific);

    // Fallback for unexpected markup: any sectioned [data-tab] outside the rail.
    return Array.from(sidebar.querySelectorAll("[data-tab]")).filter(
      (el) => !el.closest(EUI.RAIL_SEL) && el.matches("section, div, aside")
    );
  },

  /** Stamp our classes onto the live DOM. Idempotent + cheap. */
  tag() {
    const sidebar = this.getSidebar();
    if (!sidebar) return;

    sidebar.classList.add("eui-sidebar");

    const rail = this.getRail();
    if (rail) rail.classList.add("eui-rail");

    const panels = this.getPanels(sidebar);
    panels.forEach((p) => p.classList.add("eui-drawer"));

    if (!panels.length && !this._warnedPanels) {
      this._warnedPanels = true;
      this.warn(
        "No drawer panels found inside #sidebar. The panel selector may need " +
        "updating for this Foundry build. Please share the #sidebar HTML so " +
        "the selectors can be adjusted."
      );
    }
  },

  /** Attach the toggle handler to the rail (once). */
  bind() {
    const rail = this.getRail();
    if (!rail || rail.dataset.euiBound) return;
    rail.dataset.euiBound = "1";

    // Capture phase so we can intercept a "close" click before Foundry's own
    // tab handler re-activates the tab.
    rail.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target.closest("[data-tab]");
        if (!btn || !rail.contains(btn)) return;
        const tab = btn.dataset.tab;

        if (this.state.open && this.state.tab === tab) {
          // Re-click on the active tab → retract.
          ev.preventDefault();
          ev.stopImmediatePropagation();
          this.close();
        } else {
          // Open (or swap content). Let Foundry handle the tab activation so
          // the correct panel gets its native `.active` class.
          this.open(tab);
        }
      },
      true
    );
  },

  open(tab) {
    this.state.open = true;
    this.state.tab = tab;
    const sb = this.getSidebar();
    if (sb) {
      sb.classList.add("eui-open");
      sb.setAttribute("data-eui-tab", tab);
    }
    document.body.classList.add("eui-drawer-open");
  },

  close() {
    this.state.open = false;
    this.state.tab = null;
    const sb = this.getSidebar();
    if (sb) {
      sb.classList.remove("eui-open");
      sb.removeAttribute("data-eui-tab");
    }
    document.body.classList.remove("eui-drawer-open");
  },

  /**
   * Keep Foundry's internal sidebar "expanded" so the panels stay in the DOM
   * and rendered. We control all visibility ourselves via CSS, so Foundry's
   * native collapse animation never fights our overlay.
   */
  ensureExpanded() {
    try {
      const sb = ui?.sidebar;
      if (sb && sb.expanded === false && typeof sb.expand === "function") {
        sb.expand();
      }
    } catch (e) {
      /* non-fatal; CSS still governs the visible state */
    }
  },

  /**
   * Register module settings in Foundry's built-in Configure Settings panel.
   * Client-scoped so each player tunes their own view. Must run in `init`.
   */
  registerSettings() {
    const S = this.SETTINGS;
    const reapply = () => this.applySettings();

    game.settings.register(this.ID, S.chatTheme, {
      name: "Chat box theme",
      hint: "How chat message cards are styled inside the drawer.",
      scope: "client",
      config: true,
      type: String,
      choices: this.CHAT_THEMES,
      default: "flat",
      onChange: reapply,
    });

    game.settings.register(this.ID, S.drawerWidth, {
      name: "Drawer width (px)",
      hint: "Width of the slide-out drawer.",
      scope: "client",
      config: true,
      type: Number,
      range: { min: 280, max: 560, step: 10 },
      default: 360,
      onChange: reapply,
    });

    game.settings.register(this.ID, S.railWidth, {
      name: "Rail width (px)",
      hint: "Width of the fixed icon rail on the right edge.",
      scope: "client",
      config: true,
      type: Number,
      range: { min: 40, max: 80, step: 2 },
      default: 54,
      onChange: reapply,
    });

    game.settings.register(this.ID, S.accent, {
      name: "Accent colour",
      hint: "Hex colour for the active tab + message accent (e.g. #c9a14a).",
      scope: "client",
      config: true,
      type: String,
      default: "#c9a14a",
      onChange: reapply,
    });

    game.settings.register(this.ID, S.forceDark, {
      name: "Force dark drawer",
      hint: "Keep the dark drawer even when your Foundry theme is Light.",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: reapply,
    });
  },

  /** Push current setting values onto <body> as classes + CSS variables. */
  applySettings() {
    const body = document.body;
    let theme = "flat";
    let drawerW = 360;
    let railW = 54;
    let accent = "#c9a14a";
    let forceDark = false;
    try {
      theme = game.settings.get(this.ID, this.SETTINGS.chatTheme);
      drawerW = game.settings.get(this.ID, this.SETTINGS.drawerWidth);
      railW = game.settings.get(this.ID, this.SETTINGS.railWidth);
      accent = game.settings.get(this.ID, this.SETTINGS.accent);
      forceDark = game.settings.get(this.ID, this.SETTINGS.forceDark);
    } catch (e) {
      /* settings not ready yet; fall back to defaults */
    }

    // chat theme class (one at a time)
    Object.keys(this.CHAT_THEMES).forEach((t) =>
      body.classList.toggle(`eui-chat-${t}`, t === theme)
    );

    body.classList.toggle("eui-force-dark", !!forceDark);

    body.style.setProperty("--eui-drawer-w", `${drawerW}px`);
    body.style.setProperty("--eui-rail-w", `${railW}px`);
    if (accent) body.style.setProperty("--eui-accent", accent);
  },

  /** Coalesce bursts of mutations (e.g. chat spam) into one tag+bind pass. */
  schedule() {
    if (this._rafQueued) return;
    this._rafQueued = true;
    requestAnimationFrame(() => {
      this._rafQueued = false;
      this.tag();
      this.bind();
    });
  },

  init() {
    document.body.classList.add("eui-enabled");
    this.applySettings();
    this.ensureExpanded();
    this.tag();
    this.bind();
    this.close(); // start fully closed (canvas-first)

    const sb = this.getSidebar();
    if (sb && !this.observer) {
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(sb, { childList: true, subtree: true });
    }

    this.log("Initialized (rail pinned, drawers ready).");
  },
};

Hooks.once("init", () => EUI.registerSettings());
Hooks.once("ready", () => EUI.init());
Hooks.on("renderSidebar", () => EUI.schedule());
Hooks.on("collapseSidebar", () => EUI.ensureExpanded());

// Expose for console tinkering / debugging.
globalThis.EnhanceUI = EUI;
