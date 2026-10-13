import { INavItem, DEFAULT_NAV_ITEMS } from './SideNavData';
import Img from "../../img/logo.png";
import './SideNavRenderer.module.scss';

const RAIL_WIDTH_EXPANDED: number = 240;
const RAIL_WIDTH_COLLAPSED: number = 60;

/**
 * Elements used to measure where the host page content actually starts.
 * Checked in order. If overlay mode triggers on a page where it should not
 * (or never triggers where it should), inspect the page in DevTools and
 * adjust this list.
 */
const HOST_CONTENT_SELECTORS: string[] = [
  '[role="main"]',
  '[data-automation-id="contentScrollRegion"]',
  '#spPageCanvasContent'
];

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
  private _isOverlay: boolean = false;
  private _collapsedBeforeOverlay: boolean = false;
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
    // Do not render the nav inside popups / dialogs / iframes
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
    if (this.shouldSkipRender()) {
      return;
    }

    this._container = targetElement;
    this._isOverlay = false;
    document.body.classList.remove('sirva-rail-overlay');

    this.buildDom();
    // Phones / small screens start collapsed, desktop starts expanded
    this.setCollapsed(this.isCompactView());
    this.attachEvents();
    this.updateActiveFromUrl();
    this.syncRailTop();

    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }
    this._onResize = (): void => {
      this.syncRailTop();
      this.scheduleReconcile(100);
    };
    window.addEventListener('resize', this._onResize);

    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
      this.startLayoutWatcher();
    }
  }

  /** Call after SPA navigation to re-apply the content offset without rebuilding the nav DOM. */
  public refreshShift(): void {
    if (this.isCompactView()) {
      this.setCollapsed(true);
      const panel = this._container?.querySelector('#sirvaMegaMenuPanel') as HTMLElement | null;
      this.closeFlyout(panel);
    }

    this.updateActiveFromUrl();

    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
      this.scheduleReconcile(100);
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

  private isCompactView(): boolean {
    return window.innerWidth <= 1024;
  }

  public dispose(): void {
    this._isCollapsed = false;
    this._isOverlay = false;
    document.body.classList.remove('sirva-rail-collapsed', 'sirva-rail-overlay', 'sirva-layout-probe');
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
    this.stopShiftGuard();
    this.applyMainContentShift(false);

    if (this._container) {
      this._container.innerHTML = '';
    }
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

        <!-- Edge tab: only visible in overlay mode while the rail is closed -->
        <button class="sirva-edge-tab" id="sirvaEdgeTab" type="button" title="Open navigation" aria-label="Open navigation">&#x203A;</button>

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
    const edgeTab = this._container.querySelector('#sirvaEdgeTab') as HTMLButtonElement | null;

    // On compact screens and in overlay mode, tapping a real link closes the rail
    this._container.addEventListener('click', (e) => {
      if (!this.isCompactView() && !this._isOverlay) {
        return;
      }

      const link = (e.target as HTMLElement).closest(
        'a.sirva-nav-link, a.sirva-megamenu-link'
      ) as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || href === '#') {
        return;
      }

      // Keep mega-menu parent links clickable for opening submenus
      if (
        link.classList.contains('sirva-nav-link') &&
        link.getAttribute('aria-haspopup') === 'true'
      ) {
        return;
      }

      this.setCollapsed(true);
      this.closeFlyout(panel);
    });

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleRailCollapse();
      });
    }

    if (edgeTab) {
      edgeTab.addEventListener('click', () => {
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
        if (this._isOverlay && !this._isCollapsed) {
          this.setCollapsed(true);
        }
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._onDocClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      const insideNav = !!this._container && this._container.contains(target);

      if (panel && !panel.contains(target) && !insideNav) {
        this.closeFlyout(panel);
      }

      // Overlay mode: clicking outside closes the open rail
      if (this._isOverlay && !this._isCollapsed && !insideNav) {
        this.setCollapsed(true);
      }

      const hamburger = target.closest(
        'button[data-automation-id="HamburgerToggle"], button[aria-label*="avigation"], button[title*="avigation"], [data-automation-id="nav-toggle"]'
      );
      if (hamburger) {
        window.setTimeout(() => this.applyMainContentShift(true), 150);
        window.setTimeout(() => this.applyMainContentShift(true), 500);
      }

      // The list "full screen" toggle does not trigger SPA navigation,
      // so re-check the layout after any click.
      this.scheduleReconcile(250);
      window.setTimeout(() => this.reconcileLayoutMode(), 800);
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
    }, 350);
  }

  private clearCloseTimeout(): void {
    if (this._closeTimeout !== null) {
      window.clearTimeout(this._closeTimeout);
      this._closeTimeout = null;
    }
  }

  /** Single place that applies the collapsed / expanded state. */
  private setCollapsed(collapsed: boolean): void {
    this._isCollapsed = collapsed;
    document.body.classList.toggle('sirva-rail-collapsed', collapsed);
    const rail = this._container?.querySelector('.sirva-left-rail') as HTMLElement | null;
    if (rail) {
      rail.classList.toggle('is-collapsed', collapsed);
    }
  }

  private toggleRailCollapse(): void {
    const panel = this._container?.querySelector('#sirvaMegaMenuPanel') as HTMLElement | null;
    this.closeFlyout(panel);
    this.setCollapsed(!this._isCollapsed);

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

  // ---------------------------------------------------------------------
  // Layout watcher: decides between "push content" and "overlay" mode
  // ---------------------------------------------------------------------

  private startLayoutWatcher(): void {
    this.stopShiftGuard();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    this._shiftObserver = new MutationObserver(() => this.scheduleReconcile(200));
    this._shiftObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });

    this.scheduleReconcile(100);
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

  /** Throttled: at most one pending check at a time. */
  private scheduleReconcile(delay: number): void {
    if (this._shiftGuardTimer !== null) {
      return;
    }
    this._shiftGuardTimer = window.setTimeout(() => {
      this._shiftGuardTimer = null;
      this.reconcileLayoutMode();
    }, delay);
  }

  private reconcileLayoutMode(): void {
    // Bail out if the nav was disposed / removed
    if (!this._container || !this._container.querySelector('#sirvaLeftRail')) {
      return;
    }
    if (this._options.shiftMainContent === false) {
      return;
    }

    if (this.isCompactView()) {
      // Compact view has its own overlay behaviour (media query), keep it untouched
      this.setOverlayMode(false, false);
    } else {
      this.setOverlayMode(!this.hostReservesRailSpace());
    }

    this.syncRailTop();

    // Discard mutation records caused by our own class toggles (prevents a feedback loop)
    if (this._shiftObserver) {
      this._shiftObserver.takeRecords();
    }
  }

  /**
   * True when the host page content starts to the right of the rail.
   * In list full-screen mode SharePoint renders content from x = 0, so this returns false.
   */
  private hostReservesRailSpace(): boolean {
    const body = document.body;
    const wasOverlay = this._isOverlay;

    // While in overlay mode our CSS zeroes the spacer, so briefly lift it to measure
    // the host layout honestly. Class changes are reverted synchronously (no paint).
    if (wasOverlay) {
      body.classList.add('sirva-layout-probe');
      body.classList.remove('sirva-rail-overlay');
    }

    let left: number | null = null;
    for (const selector of HOST_CONTENT_SELECTORS) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        left = rect.left;
        break;
      }
    }

    if (wasOverlay) {
      body.classList.add('sirva-rail-overlay');
      body.classList.remove('sirva-layout-probe');
    }

    // Nothing measurable (page still loading): keep the current mode
    if (left === null) {
      return !wasOverlay;
    }

    const footprint = this._isCollapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_EXPANDED;
    return left >= footprint - 4;
  }

  private setOverlayMode(enable: boolean, restoreCollapse: boolean = true): void {
    if (enable === this._isOverlay) {
      return;
    }

    this._isOverlay = enable;
    document.body.classList.toggle('sirva-rail-overlay', enable);

    const panel = this._container?.querySelector('#sirvaMegaMenuPanel') as HTMLElement | null;
    this.closeFlyout(panel);

    if (enable) {
      this._collapsedBeforeOverlay = this._isCollapsed;
      this.setCollapsed(true);
    } else if (restoreCollapse) {
      this.setCollapsed(this._collapsedBeforeOverlay);
    }
  }

  private applyMainContentShift(apply: boolean): void {
    document.body.classList.toggle('sirva-has-rail', apply);
    document.documentElement.classList.toggle('sirva-has-rail', apply);
    this.syncRailTop();
  }
}