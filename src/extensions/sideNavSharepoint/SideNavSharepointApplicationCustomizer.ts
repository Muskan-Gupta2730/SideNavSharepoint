import { Log } from '@microsoft/sp-core-library';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';

import * as strings from 'SideNavSharepointApplicationCustomizerStrings';
import { SideNavRenderer } from './SideNavRenderer';
import { INavItem } from './SideNavData';

const LOG_SOURCE: string = 'SideNavSharepointApplicationCustomizer';
const ROOT_ID: string = 'sirva-sidenav-extension-root';

export interface ISideNavSharepointApplicationCustomizerProperties {
  siteTitle?: string;
  shiftMainContent?: boolean;
  navItemsJson?: string;
}

export default class SideNavSharepointApplicationCustomizer
  extends BaseApplicationCustomizer<ISideNavSharepointApplicationCustomizerProperties> {

  private _renderer: SideNavRenderer | undefined;

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    if (this.context.application && this.context.application.navigatedEvent) {
      this.context.application.navigatedEvent.add(this, () => {
        this._renderNav();
      });
    }

    this._renderNav();

    return Promise.resolve();
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

    let parsedItems: INavItem[] | undefined = undefined;

    if (this.properties.navItemsJson) {
      try {
        parsedItems = JSON.parse(this.properties.navItemsJson);
      } catch {
        Log.error(
          LOG_SOURCE,
          new Error('Failed to parse navItemsJson property')
        );
      }
    }

    const staleRoot = document.getElementById(ROOT_ID);

    if (staleRoot && staleRoot.parentNode) {
      staleRoot.parentNode.removeChild(staleRoot);
    }

    const rootEl = document.createElement('div');
    rootEl.id = ROOT_ID;

    if (document.body) {
      document.body.prepend(rootEl);
    } else {
      document.documentElement.prepend(rootEl);
    }

    this._renderer = new SideNavRenderer({
      navItems: parsedItems,
      siteTitle: this.properties.siteTitle,
      shiftMainContent: this.properties.shiftMainContent !== false,
      logoUrl: `${this.context.pageContext.web.absoluteUrl}/SiteAssets/logo.jpg`
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