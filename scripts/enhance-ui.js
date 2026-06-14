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

/**
 * Force the immersive dark drawer for everyone, ignoring each user's Foundry
 * theme. Leave false to respect each client's Light/Dark setting (recommended).
 */
const FORCE_DARK = false;

const EUI = {
  ID: "enhance-ui",

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
    if (FORCE_DARK) document.body.classList.add("eui-force-dark");
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

Hooks.once("ready", () => EUI.init());
Hooks.on("renderSidebar", () => EUI.schedule());
Hooks.on("collapseSidebar", () => EUI.ensureExpanded());

// Expose for console tinkering / debugging.
globalThis.EnhanceUI = EUI;
