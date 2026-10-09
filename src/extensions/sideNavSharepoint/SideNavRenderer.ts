import { INavItem, DEFAULT_NAV_ITEMS } from './SideNavData';
import Img from "../../img/logo.png";
import './SideNavRenderer.module.scss';

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
  if (this.shouldSkipRender()) {
    return;
  }


this._container = targetElement;
// Set mobile state before rendering the sidebar
if (this.isCompactView()) {
  this._isCollapsed = true;
  document.body.classList.add('sirva-rail-collapsed');
} else {
  this._isCollapsed = false;
  document.body.classList.remove('sirva-rail-collapsed');
}


this.buildDom();
this.attachEvents();
this.updateActiveFromUrl();
this.syncRailTop();
  this._onResize = (): void => this.syncRailTop();
  window.addEventListener('resize', this._onResize);

  // Phone par rail by default collapsed rakho
  if (this.isCompactView()) {
    this._isCollapsed = true;
    document.body.classList.add('sirva-rail-collapsed');
    const rail = this._container.querySelector('.sirva-left-rail');
    if (rail) {
      rail.classList.add('is-collapsed');
    }
  }

  if (this._options.shiftMainContent !== false) {
    this.applyMainContentShift(true);
  }
}
  

  /** Call after SPA navigation to re-apply the content offset without rebuilding the nav DOM. */

public refreshShift(): void {
  if (this.isCompactView()) {
    this._isCollapsed = true;

    document.body.classList.add('sirva-rail-collapsed');

    const rail = this._container?.querySelector(
      '.sirva-left-rail'
    ) as HTMLElement | null;

    if (rail) {
      rail.classList.add('is-collapsed');
    }

    const panel = this._container?.querySelector(
      '#sirvaMegaMenuPanel'
    ) as HTMLElement | null;

    this.closeFlyout(panel);
  }

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

  private isCompactView(): boolean {
  return window.innerWidth <= 1024;
}

private collapseRail(): void {
  if (!this._isCollapsed) {
    this.toggleRailCollapse();
  }
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


this._container.addEventListener('click', (e) => {
  if (!this.isCompactView()) {
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

  // Close immediately when another navigation link is tapped
  this._isCollapsed = true;
  document.body.classList.add('sirva-rail-collapsed');

  const rail = this._container?.querySelector(
    '.sirva-left-rail'
  ) as HTMLElement | null;

  if (rail) {
    rail.classList.add('is-collapsed');
  }

  const panel = this._container?.querySelector(
    '#sirvaMegaMenuPanel'
  ) as HTMLElement | null;

  this.closeFlyout(panel);
});
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
  }, 350);
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