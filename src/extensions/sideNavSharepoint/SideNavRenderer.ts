import { INavItem, DEFAULT_NAV_ITEMS } from './SideNavData';

export interface ISideNavOptions {
  navItems?: INavItem[];
  siteTitle?: string;
  shiftMainContent?: boolean;
}

export class SideNavRenderer {
  private _container: HTMLElement | null = null;
  private _options: ISideNavOptions;
  private _navItems: INavItem[];
  private _activeFlyoutId: string | null = null;
  private _closeTimeout: number | null = null;
  private _isCollapsed: boolean = false;

  public constructor(options?: ISideNavOptions) {
    this._options = options || {};
    this._navItems = this._options.navItems && this._options.navItems.length > 0 
      ? this._options.navItems 
      : DEFAULT_NAV_ITEMS;
  }

  public render(targetElement: HTMLElement): void {
    this._container = targetElement;
    this.injectStyles();
    this.buildDom();
    this.attachEvents();
    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
    }
  }

  public dispose(): void {
    this.applyMainContentShift(false);
    const styleEl = document.getElementById('sirva-sidenav-custom-styles');
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  }

  private injectStyles(): void {
    if (document.getElementById('sirva-sidenav-custom-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'sirva-sidenav-custom-styles';
    style.textContent = `
      :root {
        --sirva-bg-dark: #15083f;
        --sirva-bg-dark-hover: #29155f;
        --sirva-bg-dark-active: #2b1461;
        --sirva-rail-width: 220px;
        --sirva-top-height: 56px;
        --sirva-cyan: #22d3ee;
        --sirva-purple-text: #a855f7;
        --sirva-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      /* Global Layout Integration for SharePoint */
      body.sirva-has-rail #spPageCanvasContent,
      body.sirva-has-rail #workbenchPageContent,
      body.sirva-has-rail [data-automation-id="contentScrollRegion"],
      body.sirva-has-rail [data-automation-id="CanvasControl"],
      body.sirva-has-rail .sp-appBar {
        margin-left: var(--sirva-rail-width) !important;
        transition: margin-left 0.25s cubic-bezier(0.2, 0, 0, 1);
      }

      body.sirva-rail-collapsed #spPageCanvasContent,
      body.sirva-rail-collapsed #workbenchPageContent,
      body.sirva-rail-collapsed [data-automation-id="contentScrollRegion"],
      body.sirva-rail-collapsed [data-automation-id="CanvasControl"],
      body.sirva-rail-collapsed .sp-appBar {
        margin-left: 0px !important;
      }

      /* Main Wrapper */
      .sirva-nav-root {
        font-family: var(--sirva-font);
        color: #ffffff;
        box-sizing: border-box;
      }
      .sirva-nav-root * {
        box-sizing: border-box;
      }

      /* Top Header Bar */
      .sirva-top-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: var(--sirva-top-height);
        background: var(--sirva-bg-dark);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px 0 20px;
      }

      /* Brand Area */
      .sirva-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: #ffffff;
        width: 180px;
        user-select: none;
      }
      .sirva-brand-icon {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sirva-brand-text {
        font-size: 20px;
        letter-spacing: -0.02em;
        line-height: 1;
        display: flex;
        align-items: baseline;
      }
      .sirva-brand-sirva {
        font-weight: 300;
        color: #ffffff;
      }
      .sirva-brand-life {
        font-weight: 700;
        color: #ffffff;
        margin-left: 2px;
      }

      /* Top Bar Right Tools */
      .sirva-top-tools {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .sirva-rail-toggle-btn {
        background: transparent;
        border: none;
        color: #cbd5e1;
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .sirva-rail-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }

      /* Left Vertical Rail */
      .sirva-left-rail {
        position: fixed;
        top: var(--sirva-top-height);
        left: 0;
        bottom: 0;
        width: var(--sirva-rail-width);
        background: var(--sirva-bg-dark);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-top: 16px;
        padding-bottom: 20px;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.15);
        transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
      }

      .sirva-rail-collapsed .sirva-left-rail {
        transform: translateX(-100%);
      }

      /* Navigation Menu List */
      .sirva-nav-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* Navigation Items */
      .sirva-nav-item {
        position: relative;
        margin: 0;
      }

      .sirva-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 22px 11px 22px;
        color: #d1d5db;
        text-decoration: none;
        font-size: 14.5px;
        font-weight: 450;
        letter-spacing: 0.01em;
        position: relative;
        transition: all 0.18s ease;
        border-left: 3.5px solid transparent;
        cursor: pointer;
        user-select: none;
      }

      .sirva-nav-link:hover,
      .sirva-nav-item.is-hovered .sirva-nav-link {
        background: var(--sirva-bg-dark-hover);
        color: #ffffff;
      }

      /* Active State (e.g. Home) */
      .sirva-nav-item.is-active .sirva-nav-link {
        color: var(--sirva-cyan);
        border-left-color: var(--sirva-cyan);
        font-weight: 500;
      }

      /* Selected / Flyout Open State (e.g. Pay & benefits) */
      .sirva-nav-item.is-flyout-open .sirva-nav-link {
        background: var(--sirva-bg-dark-active);
        color: #ffffff;
      }

      /* Chevron Indicator */
      .sirva-chevron {
        font-size: 15px;
        line-height: 1;
        opacity: 0.7;
        margin-left: 8px;
        transition: transform 0.18s ease, opacity 0.18s ease;
      }
      .sirva-nav-link:hover .sirva-chevron,
      .sirva-nav-item.is-flyout-open .sirva-chevron {
        opacity: 1;
        transform: translateX(2px);
      }

      /* Mega Menu Flyout Panel */
      .sirva-megamenu-panel {
        position: fixed;
        left: calc(var(--sirva-rail-width) + 8px);
        top: calc(var(--sirva-top-height) + 14px);
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 18px 45px -4px rgba(18, 9, 60, 0.22), 0 6px 18px -2px rgba(18, 9, 60, 0.1);
        padding: 30px 42px 34px 42px;
        z-index: 10005;
        min-width: 620px;
        max-width: 780px;
        display: none;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      /* Invisible hit-area bridge to avoid mouse leaving flyout */
      .sirva-megamenu-panel::before {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: -14px;
        width: 16px;
      }

      .sirva-megamenu-panel.is-visible {
        display: block;
        opacity: 1;
        transform: translateY(0);
      }

      /* Columns in Mega Menu */
      .sirva-megamenu-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(170px, 1fr));
        gap: 36px;
      }

      .sirva-megamenu-col {
        display: flex;
        flex-direction: column;
      }

      .sirva-megamenu-heading {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--sirva-purple-text);
        margin: 0 0 18px 0;
        user-select: none;
      }

      .sirva-megamenu-links {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 13px;
      }

      .sirva-megamenu-link {
        color: #334155;
        text-decoration: none;
        font-size: 14px;
        line-height: 1.4;
        transition: color 0.15s ease, transform 0.15s ease;
        display: inline-block;
      }

      .sirva-megamenu-link:hover {
        color: #7c3aed;
        transform: translateX(3px);
      }

      /* Bottom Rail Footer */
      .sirva-rail-footer {
        padding: 12px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .sirva-rail-footer-text {
        font-size: 11.5px;
        color: #94a3b8;
      }

      /* Mobile and Responsive adjustments */
      @media (max-width: 768px) {
        .sirva-megamenu-panel {
          min-width: 90vw;
          left: 10px;
          top: calc(var(--sirva-top-height) + 10px);
        }
        .sirva-megamenu-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private buildDom(): void {
    if (!this._container) {
      return;
    }

    const logoSvg = `
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="url(#swirlGradient1)" stroke-width="3.5" stroke-dasharray="75 35" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="12" stroke="url(#swirlGradient2)" stroke-width="3.5" stroke-dasharray="45 25" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="5.5" fill="#22d3ee"/>
        <defs>
          <linearGradient id="swirlGradient1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#22d3ee"/>
            <stop offset="50%" stop-color="#a855f7"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
          <linearGradient id="swirlGradient2" x1="40" y1="40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#06b6d4"/>
            <stop offset="100%" stop-color="#d946ef"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    const collapseIcon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;

    const navItemsHtml = this._navItems.map((item) => {
      const activeClass = item.isActive ? 'is-active' : '';
      const chevronHtml = item.hasChevron ? '<span class="sirva-chevron">&#x203A;</span>' : '';
      return `
        <li class="sirva-nav-item ${activeClass}" data-item-id="${item.id}">
          <a class="sirva-nav-link" href="${item.url || '#'}" role="button" aria-haspopup="${item.columns ? 'true' : 'false'}">
            <span>${item.title}</span>
            ${chevronHtml}
          </a>
        </li>
      `;
    }).join('');

    this._container.innerHTML = `
      <div class="sirva-nav-root" id="sirvaNavRoot">
        <!-- Top Bar -->
        <header class="sirva-top-header">
          <a href="#" class="sirva-brand" title="Sirva Life">
            <span class="sirva-brand-icon">${logoSvg}</span>
            <span class="sirva-brand-text">
              <span class="sirva-brand-sirva">sirva</span><span class="sirva-brand-life">life</span>
            </span>
          </a>
          <div class="sirva-top-tools">
            <button class="sirva-rail-toggle-btn" id="sirvaRailToggle" title="Toggle Navigation Rail" aria-label="Toggle Navigation Rail">
              ${collapseIcon}
            </button>
          </div>
        </header>

        <!-- Left Vertical Rail -->
        <aside class="sirva-left-rail" id="sirvaLeftRail" role="navigation" aria-label="Primary Navigation">
          <ul class="sirva-nav-list">
            ${navItemsHtml}
          </ul>
          <div class="sirva-rail-footer">
            <span class="sirva-rail-footer-text">Global People Hub</span>
          </div>
        </aside>

        <!-- Flyout Mega Menu Panel -->
        <div class="sirva-megamenu-panel" id="sirvaMegaMenuPanel" role="region" aria-label="Mega menu subnavigation">
          <div class="sirva-megamenu-grid" id="sirvaMegaMenuGrid">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    if (!this._container) {
      return;
    }

    const panel = this._container.querySelector('#sirvaMegaMenuPanel') as HTMLElement | null;
    const grid = this._container.querySelector('#sirvaMegaMenuGrid') as HTMLElement | null;
    const items = this._container.querySelectorAll('.sirva-nav-item');
    const toggleBtn = this._container.querySelector('#sirvaRailToggle') as HTMLButtonElement | null;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleRailCollapse();
      });
    }

    items.forEach((itemEl) => {
      const id = itemEl.getAttribute('data-item-id');
      const itemData = this._navItems.find((n) => n.id === id);

      itemEl.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
        if (itemData && itemData.columns && itemData.columns.length > 0) {
          this.openFlyout(itemData, itemEl as HTMLElement, panel, grid);
        } else {
          this.closeFlyout(panel);
        }
      });

      itemEl.addEventListener('mouseleave', () => {
        this.scheduleClose(panel);
      });

      itemEl.addEventListener('click', (e) => {
        // Toggle active link visual
        items.forEach((it) => it.classList.remove('is-active'));
        itemEl.classList.add('is-active');

        if (itemData && itemData.columns && itemData.columns.length > 0) {
          e.preventDefault();
          this.openFlyout(itemData, itemEl as HTMLElement, panel, grid);
        }
      });
    });

    if (panel) {
      panel.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
      });

      panel.addEventListener('mouseleave', () => {
        this.scheduleClose(panel);
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeFlyout(panel);
      }
    });

    // Close on clicking outside
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panel && !panel.contains(target) && !this._container?.contains(target)) {
        this.closeFlyout(panel);
      }
    });
  }

  private openFlyout(
    itemData: INavItem,
    itemEl: HTMLElement,
    panel: HTMLElement | null,
    grid: HTMLElement | null
  ): void {
    if (!panel || !grid || !itemData.columns) {
      return;
    }

    this._activeFlyoutId = itemData.id;

    // Highlight left rail item
    const allItems = this._container?.querySelectorAll('.sirva-nav-item');
    allItems?.forEach((it) => it.classList.remove('is-flyout-open'));
    itemEl.classList.add('is-flyout-open');

    // Generate 3-column HTML
    const columnsHtml = itemData.columns.map((col) => {
      const linksHtml = col.items.map((sub) => {
        return `
          <li>
            <a href="${sub.url}" class="sirva-megamenu-link" ${sub.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
              ${sub.title}
            </a>
          </li>
        `;
      }).join('');

      return `
        <div class="sirva-megamenu-col">
          <h4 class="sirva-megamenu-heading">${col.header}</h4>
          <ul class="sirva-megamenu-links">
            ${linksHtml}
          </ul>
        </div>
      `;
    }).join('');

    grid.innerHTML = columnsHtml;

    // Position panel nicely aligned with top bar or hovered item
    const rect = itemEl.getBoundingClientRect();
    const panelTop = Math.max(rect.top - 12, 60);
    panel.style.top = `${panelTop}px`;

    panel.classList.add('is-visible');
  }

  private closeFlyout(panel: HTMLElement | null): void {
    if (!panel) {
      return;
    }
    panel.classList.remove('is-visible');
    const allItems = this._container?.querySelectorAll('.sirva-nav-item');
    allItems?.forEach((it) => it.classList.remove('is-flyout-open'));
    this._activeFlyoutId = null;
  }

  private scheduleClose(panel: HTMLElement | null): void {
    this.clearCloseTimeout();
    this._closeTimeout = window.setTimeout(() => {
      this.closeFlyout(panel);
    }, 180);
  }

  private clearCloseTimeout(): void {
    if (this._closeTimeout !== null) {
      window.clearTimeout(this._closeTimeout);
      this._closeTimeout = null;
    }
  }

  private toggleRailCollapse(): void {
    this._isCollapsed = !this._isCollapsed;
    const panel = this._container?.querySelector('#sirvaMegaMenuPanel') as HTMLElement | null;
    this.closeFlyout(panel);

    if (this._isCollapsed) {
      document.body.classList.add('sirva-rail-collapsed');
    } else {
      document.body.classList.remove('sirva-rail-collapsed');
    }
  }

  private applyMainContentShift(apply: boolean): void {
    if (apply) {
      document.body.classList.add('sirva-has-rail');
    } else {
      document.body.classList.remove('sirva-has-rail');
      document.body.classList.remove('sirva-rail-collapsed');
    }
  }
}
