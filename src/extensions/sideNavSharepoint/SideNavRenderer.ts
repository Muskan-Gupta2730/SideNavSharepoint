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
  private _activeCascadeId: string | null = null;
  private _activeTier1Item: INavItem | null = null;
  private _tier2SwitchTimeout: number | null = null;
  private _activeItemEl: HTMLElement | null = null;
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

  private getItemChildren(item?: INavItem | null): INavItem[] {
    if (!item) {
      return [];
    }
    if (item.children && item.children.length > 0) {
      return item.children;
    }
    if (item.columns && item.columns.length > 0) {
      const list: INavItem[] = [];
      item.columns.forEach((col, idx) => {
        const subItems = (col.items || []).map((sub) => ({
          id: sub.id,
          title: sub.title,
          url: sub.url,
          isExternal: sub.isExternal,
          hasChevron: false
        }));
        list.push({
          id: `${item.id}-col-${idx}`,
          title: col.header,
          url: col.headerUrl || '#',
          isExternal: col.headerIsExternal,
          hasChevron: subItems.length > 0,
          children: subItems.length > 0 ? subItems : undefined
        });
      });
      return list;
    }
    return [];
  }

  private hasItemChildren(item?: INavItem | null): boolean {
    return this.getItemChildren(item).length > 0;
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

  private targetAttr(isExternal?: boolean): string {
    return isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
  }

  private normalizePath(p: string): string {
    return p.toLowerCase().replace(/\/$/, '');
  }

  /** True when the given URL points at the page currently open. */
  private isCurrentUrl(url?: string): boolean {
    if (!url || url === '#') {
      return false;
    }
    try {
      const itemPath = this.normalizePath(new URL(url, window.location.origin).pathname);
      return itemPath === this.normalizePath(window.location.pathname);
    } catch {
      return false;
    }
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
      this.closeCascadingMenu();
    }

    this.updateActiveFromUrl();

    if (this._options.shiftMainContent !== false) {
      this.applyMainContentShift(true);
      this.scheduleReconcile(100);
    }
  }

  /**
   * Marks the rail item as active when the current page is the item itself
   * OR any link inside its flyout (so "Payslips" keeps "Pay & benefits" lit).
   */
  private updateActiveFromUrl(): void {
    if (!this._container) {
      return;
    }

    let activeId: string | null = null;

    for (const item of this._navItems) {
      let match = this.isCurrentUrl(item.url);

      if (!match) {
        const children = this.getItemChildren(item);
        match = children.some((c) =>
          this.isCurrentUrl(c.url) || this.getItemChildren(c).some((sub) => this.isCurrentUrl(sub.url))
        );
      }

      if (match) {
        activeId = item.id;
        break;
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
    this.clearTier2SwitchTimeout();
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
      const hasSub = this.hasItemChildren(item);
      const activeClass = item.isActive ? 'is-active' : '';
      const chevronHtml = (item.hasChevron || hasSub) ? '<span class="sirva-chevron" aria-hidden="true">&#x203A;</span>' : '';
      return `
        <li class="sirva-nav-item ${activeClass}" data-item-id="${this.esc(item.id)}">
          <a class="sirva-nav-link" href="${this.esc(item.url || '#')}" ${this.targetAttr(item.isExternal)}
             role="button" aria-haspopup="${hasSub ? 'true' : 'false'}" aria-expanded="false">
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

        <!-- Cascading Navigation Flyout Container -->
        <div class="sirva-cascade-container" id="sirvaCascadeContainer" role="region" aria-label="Cascading subnavigation">
          <!-- Tier 1: Level 2 Items -->
          <div class="sirva-cascade-panel sirva-cascade-tier1" id="sirvaCascadeTier1">
            <ul class="sirva-cascade-list" id="sirvaCascadeList1"></ul>
          </div>
          <!-- Tier 2: Level 3 Items (Cascades to the right) -->
          <div class="sirva-cascade-panel sirva-cascade-tier2" id="sirvaCascadeTier2">
            <ul class="sirva-cascade-list" id="sirvaCascadeList2"></ul>
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

    const cascadeContainer = this._container.querySelector('#sirvaCascadeContainer') as HTMLElement | null;
    const items = this._container.querySelectorAll('.sirva-nav-item');
    const toggleBtn = this._container.querySelector('#sirvaRailToggle') as HTMLButtonElement | null;
    const edgeTab = this._container.querySelector('#sirvaEdgeTab') as HTMLButtonElement | null;

    // Tapping a real link closes rail and menu on compact screens / overlay mode
    this._container.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement).closest(
        'a.sirva-nav-link, a.sirva-cascade-link'
      ) as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || href === '#') {
        return;
      }

      if (
        link.classList.contains('sirva-nav-link') &&
        link.getAttribute('aria-haspopup') === 'true'
      ) {
        return;
      }

      if (this.isCompactView() || this._isOverlay) {
        this.setCollapsed(true);
      }
      this.closeCascadingMenu();
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
      const hasSub = this.hasItemChildren(itemData);

      itemEl.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
        if (itemData && hasSub) {
          this.openCascadingMenu(itemData, itemEl as HTMLElement);
        } else {
          this.closeCascadingMenu();
        }
      });

      itemEl.addEventListener('mouseleave', () => {
        this.scheduleClose();
      });

      itemEl.addEventListener('click', (e) => {
        if (itemData && hasSub) {
          e.preventDefault();
          this.openCascadingMenu(itemData, itemEl as HTMLElement);
        }
      });

      // Keyboard: ArrowRight jumps from the rail item into Tier 1
      itemEl.addEventListener('keydown', (evt) => {
        const e = evt as KeyboardEvent;
        if (itemData && hasSub && (e.key === 'ArrowRight' || e.key === ' ')) {
          e.preventDefault();
          this.openCascadingMenu(itemData, itemEl as HTMLElement);
          this.focusTier1First();
        }
      });
    });

    if (cascadeContainer) {
      cascadeContainer.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
      });
      cascadeContainer.addEventListener('mouseleave', () => {
        this.scheduleClose();
      });
    }

    this._onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        const wasOpen = !!cascadeContainer && cascadeContainer.classList.contains('is-visible');
        if (wasOpen) {
          this.returnFocusToRail();
        }
        if (this._isOverlay && !this._isCollapsed) {
          this.setCollapsed(true);
        }
      }
    };
    document.addEventListener('keydown', this._onKeyDown);

    this._onDocClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      const insideNav = !!this._container && this._container.contains(target);

      if (cascadeContainer && !cascadeContainer.contains(target) && !insideNav) {
        this.closeCascadingMenu();
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

      this.scheduleReconcile(250);
      window.setTimeout(() => this.reconcileLayoutMode(), 800);
    };
    document.addEventListener('click', this._onDocClick);
  }

  private focusTier1First(): void {
    const first = this._container?.querySelector('#sirvaCascadeList1 .sirva-cascade-link') as HTMLElement | null;
    if (first) {
      first.focus();
    }
  }

  private focusTier2First(): void {
    const first = this._container?.querySelector('#sirvaCascadeList2 .sirva-cascade-link') as HTMLElement | null;
    if (first) {
      first.focus();
    }
  }

  private returnFocusToRail(): void {
    const itemEl = this._activeItemEl;
    this.closeCascadingMenu();
    const link = itemEl?.querySelector('a.sirva-nav-link') as HTMLElement | null;
    if (link) {
      link.focus();
    }
  }

  private openCascadingMenu(itemData: INavItem, itemEl: HTMLElement): void {
    const container = this._container?.querySelector('#sirvaCascadeContainer') as HTMLElement | null;
    const tier1List = this._container?.querySelector('#sirvaCascadeList1') as HTMLElement | null;
    if (!container || !tier1List) {
      return;
    }

    const children = this.getItemChildren(itemData);
    if (children.length === 0) {
      this.closeCascadingMenu();
      return;
    }

    this._activeCascadeId = itemData.id;
    this._activeItemEl = itemEl;

    const allItems = this._container?.querySelectorAll('.sirva-nav-item');
    allItems?.forEach((it) => {
      it.classList.remove('is-flyout-open');
      it.querySelector('a.sirva-nav-link')?.setAttribute('aria-expanded', 'false');
    });
    itemEl.classList.add('is-flyout-open');
    itemEl.querySelector('a.sirva-nav-link')?.setAttribute('aria-expanded', 'true');

    tier1List.innerHTML = children.map((child) => {
      const hasGrandChildren = this.hasItemChildren(child);
      const current = this.isCurrentUrl(child.url) ? ' is-current' : '';
      const chevronHtml = hasGrandChildren
        ? '<span class="sirva-cascade-arrow" aria-hidden="true">&#x203A;</span>'
        : '';
      return `
        <li class="sirva-cascade-item" data-item-id="${this.esc(child.id)}">
          <a class="sirva-cascade-link ${hasGrandChildren ? 'has-children' : ''}${current}"
             href="${this.esc(child.url || '#')}"
             ${this.targetAttr(child.isExternal)}
             role="button"
             aria-haspopup="${hasGrandChildren ? 'true' : 'false'}"
             aria-expanded="false">
            <span class="sirva-cascade-text">${this.esc(child.title)}</span>
            ${chevronHtml}
          </a>
        </li>
      `;
    }).join('');

    const tier1Items = tier1List.querySelectorAll('.sirva-cascade-item');
    tier1Items.forEach((t1El) => {
      const childId = t1El.getAttribute('data-item-id');
      const childData = children.find((c) => c.id === childId);
      if (!childData) {
        return;
      }
      const hasGrandChildren = this.hasItemChildren(childData);

      t1El.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
        this.clearTier2SwitchTimeout();

        if (hasGrandChildren) {
          this._tier2SwitchTimeout = window.setTimeout(() => {
            this.openTier2(childData, t1El as HTMLElement);
          }, 80);
        } else {
          this._tier2SwitchTimeout = window.setTimeout(() => {
            this.closeTier2();
          }, 80);
        }
      });

      t1El.addEventListener('click', (e) => {
        if (hasGrandChildren && (!childData.url || childData.url === '#')) {
          e.preventDefault();
          this.openTier2(childData, t1El as HTMLElement);
        }
      });

      t1El.addEventListener('keydown', (evt) => {
        const e = evt as KeyboardEvent;
        if (e.key === 'ArrowRight' && hasGrandChildren) {
          e.preventDefault();
          this.openTier2(childData, t1El as HTMLElement);
          this.focusTier2First();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.returnFocusToRail();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = t1El.nextElementSibling?.querySelector('.sirva-cascade-link') as HTMLElement | null;
          if (next) { next.focus(); }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = t1El.previousElementSibling?.querySelector('.sirva-cascade-link') as HTMLElement | null;
          if (prev) { prev.focus(); }
        }
      });
    });

    this.closeTier2();

    container.classList.add('is-visible');

    // Align with the hovered rail item, clamped to screen height
    const rect = itemEl.getBoundingClientRect();
    const desiredTop = Math.max(rect.top - 6, 56);
    const maxTop = window.innerHeight - container.offsetHeight - 16;
    container.style.top = `${Math.max(56, Math.min(desiredTop, Math.max(56, maxTop)))}px`;
  }

  private openTier2(childData: INavItem, t1El: HTMLElement): void {
    const container = this._container?.querySelector('#sirvaCascadeContainer') as HTMLElement | null;
    const tier2Panel = this._container?.querySelector('#sirvaCascadeTier2') as HTMLElement | null;
    const tier2List = this._container?.querySelector('#sirvaCascadeList2') as HTMLElement | null;
    if (!container || !tier2Panel || !tier2List) {
      return;
    }

    const subChildren = this.getItemChildren(childData);
    if (subChildren.length === 0) {
      this.closeTier2();
      return;
    }

    this._activeTier1Item = childData;

    const tier1Items = this._container?.querySelectorAll('.sirva-cascade-tier1 .sirva-cascade-item');
    tier1Items?.forEach((it) => {
      it.classList.remove('is-active-tier1');
      it.querySelector('.sirva-cascade-link')?.setAttribute('aria-expanded', 'false');
    });
    t1El.classList.add('is-active-tier1');
    t1El.querySelector('.sirva-cascade-link')?.setAttribute('aria-expanded', 'true');

    tier2List.innerHTML = subChildren.map((sub) => {
      const current = this.isCurrentUrl(sub.url) ? ' is-current' : '';
      const aria = current ? ' aria-current="page"' : '';
      return `
        <li class="sirva-cascade-item" data-item-id="${this.esc(sub.id)}">
          <a class="sirva-cascade-link${current}"${aria} href="${this.esc(sub.url || '#')}" ${this.targetAttr(sub.isExternal)}>
            <span class="sirva-cascade-text">${this.esc(sub.title)}</span>
          </a>
        </li>
      `;
    }).join('');

    const tier2Items = tier2List.querySelectorAll('.sirva-cascade-item');
    tier2Items.forEach((t2El) => {
      t2El.addEventListener('mouseenter', () => {
        this.clearCloseTimeout();
        this.clearTier2SwitchTimeout();
      });

      t2El.addEventListener('keydown', (evt) => {
        const e = evt as KeyboardEvent;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const t1Link = t1El.querySelector('.sirva-cascade-link') as HTMLElement | null;
          if (t1Link) { t1Link.focus(); }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = t2El.nextElementSibling?.querySelector('.sirva-cascade-link') as HTMLElement | null;
          if (next) { next.focus(); }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = t2El.previousElementSibling?.querySelector('.sirva-cascade-link') as HTMLElement | null;
          if (prev) { prev.focus(); }
        }
      });
    });

    tier2Panel.classList.add('is-visible');

    // Align Tier 2 top with the active Tier 1 item
    const offsetTop = t1El.offsetTop;
    const containerRect = container.getBoundingClientRect();
    const maxMargin = Math.max(0, window.innerHeight - containerRect.top - tier2Panel.offsetHeight - 16);
    tier2Panel.style.marginTop = `${Math.min(Math.max(0, offsetTop - 4), maxMargin)}px`;
  }

  private closeTier2(): void {
    this.clearTier2SwitchTimeout();
    this._activeTier1Item = null;
    const tier2Panel = this._container?.querySelector('#sirvaCascadeTier2') as HTMLElement | null;
    if (tier2Panel) {
      tier2Panel.classList.remove('is-visible');
      tier2Panel.style.marginTop = '0px';
    }
    const tier1Items = this._container?.querySelectorAll('.sirva-cascade-tier1 .sirva-cascade-item');
    tier1Items?.forEach((it) => {
      it.classList.remove('is-active-tier1');
      it.querySelector('.sirva-cascade-link')?.setAttribute('aria-expanded', 'false');
    });
  }

  private closeCascadingMenu(): void {
    this.clearTier2SwitchTimeout();
    this.closeTier2();
    const container = this._container?.querySelector('#sirvaCascadeContainer') as HTMLElement | null;
    if (container) {
      container.classList.remove('is-visible');
    }
    const allItems = this._container?.querySelectorAll('.sirva-nav-item');
    allItems?.forEach((it) => {
      it.classList.remove('is-flyout-open');
      it.querySelector('a.sirva-nav-link')?.setAttribute('aria-expanded', 'false');
    });
    this._activeCascadeId = null;
  }

  private scheduleClose(): void {
    this.clearCloseTimeout();
    this._closeTimeout = window.setTimeout(() => {
      this.closeCascadingMenu();
    }, 300);
  }

  private clearCloseTimeout(): void {
    if (this._closeTimeout !== null) {
      window.clearTimeout(this._closeTimeout);
      this._closeTimeout = null;
    }
  }

  private clearTier2SwitchTimeout(): void {
    if (this._tier2SwitchTimeout !== null) {
      window.clearTimeout(this._tier2SwitchTimeout);
      this._tier2SwitchTimeout = null;
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
    this.closeCascadingMenu();
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

    this.closeCascadingMenu();

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