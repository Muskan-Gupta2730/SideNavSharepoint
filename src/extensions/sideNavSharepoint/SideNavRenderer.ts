import { INavItem, DEFAULT_NAV_ITEMS } from './SideNavData';
import Img from "../../img/logo.png";

export interface ISideNavOptions {
  navItems?: INavItem[];
  siteTitle?: string;
  shiftMainContent?: boolean;
  logoUrl?: string;
}

export class SideNavRenderer {
  private _container: HTMLElement | null = null;
  private _options: ISideNavOptions;
  private _navItems: INavItem[];
  private _activeFlyoutId: string | null = null;
  private _closeTimeout: number | null = null;
  private _isCollapsed: boolean = false;
  private _onResize: (() => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onDocClick: ((e: MouseEvent) => void) | null = null;
  private _shiftObserver: MutationObserver | null = null;
  private _shiftGuardTimer: number | null = null;

  public constructor(options?: ISideNavOptions) {
    this._options = options || {};
    this._navItems = this._options.navItems && this._options.navItems.length > 0
      ? this._options.navItems
      : DEFAULT_NAV_ITEMS;
  }
private shouldSkipRender(): boolean {
  // Popup / dialog / iframe ke andar nav mat dikhao
  try {
    if (window.self !== window.top) {
      return true;
    }
  } catch {
    return true;
  }

  const query = window.location.search.toLowerCase();
  if (query.indexOf('isdlg=1') > -1) {
    return true;
  }

  return false;
}

  private esc(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  public render(targetElement: HTMLElement): void {
    this._container = targetElement;
    this.injectStyles();
    this.buildDom();
    this.attachEvents();
    this.updateActiveFromUrl();
    this.syncRailTop();
    this._onResize = (): void => this.syncRailTop();
    window.addEventListener('resize', this._onResize);
    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
    }
    if (this.shouldSkipRender()) {
  return;
}
  }
  

  /** Call after SPA navigation to re-apply the content offset without rebuilding the nav DOM. */
  public refreshShift(): void {
    this.updateActiveFromUrl();
    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
    }
  }

  private updateActiveFromUrl(): void {
    if (!this._container) {
      return;
    }

    const normalize = (p: string): string => p.toLowerCase().replace(/\/$/, '');
    const current = normalize(window.location.pathname);

    let activeId: string | null = null;
    for (const item of this._navItems) {
      if (!item.url || item.url === '#') {
        continue;
      }
      try {
        const itemPath = normalize(new URL(item.url, window.location.origin).pathname);
        if (itemPath === current) {
          activeId = item.id;
          break;
        }
      } catch {
        // ignore malformed URLs
      }
    }

    this._container.querySelectorAll('.sirva-nav-item').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-item-id') === activeId);
    });
  }

  public dispose(): void {
    this._isCollapsed = false;
    document.body.classList.remove('sirva-rail-collapsed');
    document.documentElement.classList.remove('sirva-has-rail');
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick);
      this._onDocClick = null;
    }
    this.clearCloseTimeout();
    this.applyMainContentShift(false);
    this.stopShiftGuard();
    const styleEl = document.getElementById('sirva-sidenav-custom-styles');
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  }

  private injectStyles(): void {
    let style = document.getElementById('sirva-sidenav-custom-styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'sirva-sidenav-custom-styles';
      document.head.appendChild(style);
    }

    style.textContent = `
      :root {
        --sirva-gap: 12px;
        --sirva-bg-dark: #150056;
        --sirva-bg-dark-hover: #150056;
        --sirva-bg-dark-active: #150056;
        --sirva-rail-width: 240px;
        --sirva-top-height: 56px;
        --sirva-cyan: #6FF0EE;
        --sirva-purple-text: #AE42F4 ;
       --sirva-light-blue: #6FF0EE;
--sirva-font: "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
      }

      /* =========================================================
         SharePoint Layout Integration
         ========================================================= */
      #sp-appBar {
        display: block !important;
        visibility: hidden !important;
        width: calc(var(--sirva-offset, 240px) + var(--sirva-gap)) !important;
        min-width: calc(var(--sirva-offset, 240px) + var(--sirva-gap)) !important;
        flex: 0 0 calc(var(--sirva-offset, 240px) + var(--sirva-gap)) !important;
        transition: width 0.22s cubic-bezier(0.2, 0, 0, 1),
                    min-width 0.22s cubic-bezier(0.2, 0, 0, 1),
                    flex-basis 0.22s cubic-bezier(0.2, 0, 0, 1);
      }
      body.sirva-has-rail {
        --sirva-offset: var(--sirva-rail-width);
        overflow-x: auto !important;
      }
      html.sirva-has-rail {
        overflow-x: auto !important;
      }
      body.sirva-has-rail.sirva-rail-collapsed {
        --sirva-offset: 60px;
      }

      body.sirva-has-rail [data-automation-id="pageCommandBar"],
      body.sirva-has-rail [data-automation-id="CanvasCommandBar"],
      body.sirva-has-rail div[class*="commandBarWrapper"],
      body.sirva-has-rail div[class*="canvasControl"],
      body.sirva-has-rail [data-automation-id="pageHeader"],
      body.sirva-has-rail #spPageCanvasContent,
      body.sirva-has-rail .SPCanvas,
      body.sirva-has-rail [data-automation-id="CanvasLayout"],
      body.sirva-has-rail .controlZone {
        margin-left: 0 !important;
        width: auto !important;
        max-width: none !important;
      }
      body.sirva-has-rail #spSiteHeader img[class*="logo" i],
      body.sirva-has-rail #spSiteHeader i[class*="logo" i],
      body.sirva-has-rail #spSiteHeader [class*="logo" i] > img {
        display: none !important;
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

      /* Top area of the rail (logo + hamburger) */
      .sirva-rail-brand {
        height: 56px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px 0 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .sirva-brand {
        display: flex;
        align-items: center;
        user-select: none;
      }
      .sirva-brand-icon {
        width: auto;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sirva-brand-logo-img {
        height: 42px;
        width: auto;
        max-width: 140px;
        object-fit: contain;
        border-radius: 4px;
        display: block;
      }

      /* Top bar right tools */
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

      /* Left vertical rail */
      .sirva-left-rail {
        position: fixed;
        top: 48px;
        left: 0;
        bottom: 0;
        width: 240px;
        background: var(--sirva-bg-dark);
        z-index: 10000;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: all !important;
        flex-direction: column;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.15);
        transition: width 0.22s cubic-bezier(0.2, 0, 0, 1), top 0.15s ease;
        overflow: hidden;
        transform: none !important;
      }

      /* ===== Collapsed rail ===== */
      body.sirva-rail-collapsed .sirva-left-rail {
        width: 60px !important;
        overflow: hidden !important;
      }
      body.sirva-rail-collapsed .sirva-rail-brand {
        width: 60px !important;
        padding: 0 !important;
        justify-content: center !important;
      }
      body.sirva-rail-collapsed .sirva-brand,
      body.sirva-rail-collapsed .sirva-brand-icon,
      body.sirva-rail-collapsed .sirva-brand-logo-img,
      body.sirva-rail-collapsed #sirvaBrandLogoFallback,
      body.sirva-rail-collapsed .sirva-nav-scroll {
        display: none !important;
      }
      body.sirva-rail-collapsed .sirva-top-tools {
        display: flex !important;
        width: 100%;
        justify-content: center;
      }
      body.sirva-rail-collapsed .sirva-rail-toggle-btn {
        display: flex !important;
        color: #ffffff !important;
      }
        /* ===== Hide nav links completely when collapsed ===== */
body.sirva-rail-collapsed #sirvaNavRoot .sirva-nav-scroll,
body.sirva-rail-collapsed #sirvaNavRoot .sirva-nav-list,
body.sirva-rail-collapsed #sirvaNavRoot .sirva-nav-item,
body.sirva-rail-collapsed #sirvaNavRoot a.sirva-nav-link,
#sirvaNavRoot .sirva-left-rail.is-collapsed .sirva-nav-scroll,
#sirvaNavRoot .sirva-left-rail.is-collapsed .sirva-nav-list,
#sirvaNavRoot .sirva-left-rail.is-collapsed .sirva-nav-item,
#sirvaNavRoot .sirva-left-rail.is-collapsed a.sirva-nav-link {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

      /* Scrollable nav wrapper */
      .sirva-nav-scroll {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.18) transparent;
      }
      .sirva-nav-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .sirva-nav-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sirva-nav-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.18);
        border-radius: 2px;
      }
      .sirva-nav-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.32);
      }

      /* Navigation list */
      .sirva-nav-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sirva-nav-item {
        position: relative;
        margin: 0;
      }
      .sirva-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 22px;
        color: #ffffff;
        text-decoration: none;
        font-size: 16px;
        font-weight: 450;
        letter-spacing: 0.01em;
        position: relative;
        transition: color 0.18s ease, border-color 0.18s ease;
        border-left: 3.5px solid transparent;
        cursor: pointer;
        user-select: none;
      }

      /* Chevron */
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

      /* =========================================================
         Link colours: hover = active look (works on every page)
         ========================================================= */
      #sirvaNavRoot a.sirva-nav-link,
      #sirvaNavRoot a.sirva-nav-link:link,
      #sirvaNavRoot a.sirva-nav-link:visited {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        background: transparent !important;
        text-decoration: none !important;
        border-left: 3.5px solid transparent !important;
        opacity: 1 !important;
      }
      #sirvaNavRoot a.sirva-nav-link span {
        color: inherit !important;
        -webkit-text-fill-color: inherit !important;
        opacity: 1 !important;
      }
      #sirvaNavRoot a.sirva-nav-link:hover,
      #sirvaNavRoot a.sirva-nav-link:focus,
      #sirvaNavRoot a.sirva-nav-link:active,
      #sirvaNavRoot .sirva-nav-item.is-active a.sirva-nav-link,
      #sirvaNavRoot .sirva-nav-item.is-flyout-open a.sirva-nav-link {
        color: var(--sirva-light-blue) !important;
        -webkit-text-fill-color: var(--sirva-light-blue) !important;
        background: transparent !important;
        border-left-color: var(--sirva-light-blue) !important;
        text-decoration: none !important;
        outline: none !important;
        opacity: 1 !important;
      }
      #sirvaNavRoot a.sirva-nav-link:hover span,
      #sirvaNavRoot a.sirva-nav-link:focus span {
        color: var(--sirva-light-blue) !important;
        -webkit-text-fill-color: var(--sirva-light-blue) !important;
      }
      #sirvaNavRoot .sirva-chevron {
        color: var(--sirva-light-blue) !important;
      }

      /* Mega menu flyout panel */
      .sirva-megamenu-panel {
        position: fixed;
        left: calc(var(--sirva-rail-width) + 16px);
        top: calc(var(--sirva-top-height) + 14px);
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 12px 28px rgba(21,0,86,.16); 
        padding: 30px 42px 34px 42px;
        z-index: 10010;
        min-width: 580px;
        max-width: 760px;
        display: none;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        border: 1px solid #E7E6E5;
      }
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
       color: #9631DE;
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
        color: #4D4B49;
        text-decoration: none;
        font-size: 14px;
        line-height: 1.4;
        transition: color 0.15s ease, transform 0.15s ease;
        display: inline-block;
      }
      .sirva-megamenu-link:hover {
        color: #7B1FC0;
        transform: translateX(3px);
      }

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
  }

  private buildDom(): void {
    if (!this._container) {
      return;
    }

    const imgModule = Img as unknown as string | { default?: string; uri?: string };
    const logoPath: string = typeof imgModule === 'string'
      ? imgModule
      : (imgModule.default || imgModule.uri || '');

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
        <li class="sirva-nav-item ${activeClass}" data-item-id="${this.esc(item.id)}">
          <a class="sirva-nav-link" href="${this.esc(item.url || '#')}" role="button" aria-haspopup="${item.columns ? 'true' : 'false'}">
            <span>${this.esc(item.title)}</span>
            ${chevronHtml}
          </a>
        </li>
      `;
    }).join('');

    this._container.innerHTML = `
      <div class="sirva-nav-root" id="sirvaNavRoot">
        <aside class="sirva-left-rail" id="sirvaLeftRail" role="navigation" aria-label="Primary Navigation">
          <div class="sirva-rail-brand">
            <div class="sirva-brand">
              <span class="sirva-brand-icon">
                ${logoPath
                  ? `<img class="sirva-brand-logo-img" id="sirvaBrandLogo" src="${this.esc(logoPath)}" alt="Logo" />`
                  : ''}
                <span id="sirvaBrandLogoFallback" style="display:${logoPath ? 'none' : 'flex'}; width:42px; height:42px; border-radius:8px; background:linear-gradient(135deg,var(--sirva-light-blue),#a855f7); align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
              </span>
            </div>
            <div class="sirva-top-tools">
              <button class="sirva-rail-toggle-btn" id="sirvaRailToggle" title="Toggle Navigation Rail" aria-label="Toggle Navigation Rail">
                ${collapseIcon}
              </button>
            </div>
          </div>
          <div class="sirva-nav-scroll">
            <ul class="sirva-nav-list">
              ${navItemsHtml}
            </ul>
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

    const logoImg = this._container.querySelector('#sirvaBrandLogo') as HTMLImageElement | null;
    if (logoImg) {
      logoImg.addEventListener('error', () => {
        logoImg.style.display = 'none';
        const fallback = this._container?.querySelector('#sirvaBrandLogoFallback') as HTMLElement | null;
        if (fallback) { fallback.style.display = 'flex'; }
      });
    }
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
      const itemData = this._navItems.find((n) => `${n.id}` === id);

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

    this._onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        this.closeFlyout(panel);
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._onDocClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      if (panel && !panel.contains(target) && !this._container?.contains(target)) {
        this.closeFlyout(panel);
      }

      const hamburger = target.closest(
        'button[data-automation-id="HamburgerToggle"], button[aria-label*="avigation"], button[title*="avigation"], [data-automation-id="nav-toggle"]'
      );
      if (hamburger) {
        window.setTimeout(() => this.applyMainContentShift(true), 150);
        window.setTimeout(() => this.applyMainContentShift(true), 500);
      }
    };
    document.addEventListener('click', this._onDocClick);
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

    const allItems = this._container?.querySelectorAll('.sirva-nav-item');
    allItems?.forEach((it) => it.classList.remove('is-flyout-open'));
    itemEl.classList.add('is-flyout-open');

    const columnsHtml = itemData.columns.map((col) => {
      const linksHtml = col.items.map((sub) => {
        return `
          <li>
            <a href="${this.esc(sub.url)}" class="sirva-megamenu-link" ${sub.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
              ${this.esc(sub.title)}
            </a>
          </li>
        `;
      }).join('');

      return `
        <div class="sirva-megamenu-col">
          <h4 class="sirva-megamenu-heading">${this.esc(col.header)}</h4>
          <ul class="sirva-megamenu-links">
            ${linksHtml}
          </ul>
        </div>
      `;
    }).join('');

    grid.innerHTML = columnsHtml;

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
  const rail = this._container?.querySelector('.sirva-left-rail') as HTMLElement | null;
  this.closeFlyout(panel);

  document.body.classList.toggle('sirva-rail-collapsed', this._isCollapsed);
  if (rail) {
    rail.classList.toggle('is-collapsed', this._isCollapsed);
  }

  if (this._options.shiftMainContent !== false) {
    this.applyMainContentShift(true);
  }
}

  private syncRailTop(): void {
    const suite = document.querySelector(
      '#SuiteNavWrapper, #O365_NavHeader, [data-automationid="SimpleSuiteHeader"], [data-automationid="FluentSuiteHeader"]'
    ) as HTMLElement | null;

    let height = 48;
    if (suite) {
      const measured = Math.round(suite.getBoundingClientRect().height);
      if (measured > 0) {
        height = measured;
      }
    }

    const rail = this._container?.querySelector('.sirva-left-rail') as HTMLElement | null;
    if (rail) {
      rail.style.top = `${height}px`;
    }
  }

  private stopShiftGuard(): void {
    if (this._shiftObserver) {
      this._shiftObserver.disconnect();
      this._shiftObserver = null;
    }
    if (this._shiftGuardTimer !== null) {
      window.clearTimeout(this._shiftGuardTimer);
      this._shiftGuardTimer = null;
    }
  }

  private applyMainContentShift(apply: boolean): void {
    document.body.classList.toggle('sirva-has-rail', apply);
    document.documentElement.classList.toggle('sirva-has-rail', apply);
    this.syncRailTop();
  }
}