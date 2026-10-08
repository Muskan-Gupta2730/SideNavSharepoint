import { Log } from '@microsoft/sp-core-library';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';

import * as strings from 'SideNavSharepointApplicationCustomizerStrings';
import { SideNavRenderer } from './SideNavRenderer';
import { INavItem } from './SideNavData';
import { NavService } from './NavService';

const LOG_SOURCE: string = 'SideNavSharepointApplicationCustomizer';
const ROOT_ID: string = 'sirva-sidenav-extension-root';

export interface ISideNavSharepointApplicationCustomizerProperties {
  siteTitle?: string;
  shiftMainContent?: boolean;

}

export default class SideNavSharepointApplicationCustomizer
  extends BaseApplicationCustomizer<ISideNavSharepointApplicationCustomizerProperties> {

  private _renderer: SideNavRenderer | undefined;
  private _navItems: INavItem[] | undefined;

  public async onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    const service = new NavService(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl
    );
    this._navItems = await service.getNavItems();

    if (this.context.application && this.context.application.navigatedEvent) {
      this.context.application.navigatedEvent.add(this, () => {
        this._renderNav();
      });
    }

    this._renderNav();
  }

  private _renderNav(): void {
    const navRoot = document.getElementById('sirvaNavRoot');

    if (navRoot && navRoot.isConnected && this._renderer) {
      this._renderer.refreshShift();
      return;
    }

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }

    const staleRoot = document.getElementById(ROOT_ID);
    if (staleRoot && staleRoot.parentNode) {
      staleRoot.parentNode.removeChild(staleRoot);
    }

    const rootEl = document.createElement('div');
    rootEl.id = ROOT_ID;
    (document.body || document.documentElement).prepend(rootEl);

    this._renderer = new SideNavRenderer({
      navItems: this._navItems,          // <-- from the list now
      siteTitle: this.properties.siteTitle,
      shiftMainContent: this.properties.shiftMainContent !== false,
      logoUrl: `${this.context.pageContext.web.absoluteUrl}/SiteAssets/logo.png`
    });

    this._renderer.render(rootEl);
  }

  protected onDispose(): void {
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }

    const rootEl = document.getElementById(ROOT_ID);

    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }
  }
}