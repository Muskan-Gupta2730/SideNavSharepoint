import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName
} from '@microsoft/sp-application-base';

import * as strings from 'SideNavSharepointApplicationCustomizerStrings';
import { SideNavRenderer } from './SideNavRenderer';
import { INavItem } from './SideNavData';

const LOG_SOURCE: string = 'SideNavSharepointApplicationCustomizer';

export interface ISideNavSharepointApplicationCustomizerProperties {
  siteTitle?: string;
  shiftMainContent?: boolean;
  navItemsJson?: string;
}

/**
 * Modern SharePoint Vertical Mega Menu Navbar Application Customizer
 * Implements the Sirva Life Left Rail & Flyout Mega Menu
 */
export default class SideNavSharepointApplicationCustomizer
  extends BaseApplicationCustomizer<ISideNavSharepointApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;
  private _renderer: SideNavRenderer | undefined;
  private _isRendered: boolean = false;

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);

    // Listen to placeholder changes (standard SPFx pattern)
    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceholders);

    // Modern SharePoint SPA navigation event
    if (this.context.application && this.context.application.navigatedEvent) {
      this.context.application.navigatedEvent.add(this, () => {
        this._renderPlaceholders();
      });
    }

    this._renderPlaceholders();

    return Promise.resolve();
  }

  private _renderPlaceholders(): void {
    if (this._isRendered && document.getElementById('sirvaNavRoot')) {
      return;
    }

    let parsedItems: INavItem[] | undefined = undefined;
    if (this.properties.navItemsJson) {
      try {
        parsedItems = JSON.parse(this.properties.navItemsJson);
      } catch {
        Log.error(LOG_SOURCE, new Error('Failed to parse navItemsJson property'));
      }
    }

    // Try to get PlaceholderName.Top first
    if (!this._topPlaceholder) {
      this._topPlaceholder = this.context.placeholderProvider.tryCreateContent(
        PlaceholderName.Top,
        { onDispose: this._onDispose.bind(this) }
      );
    }

    let targetElement: HTMLElement | null = null;
    if (this._topPlaceholder && this._topPlaceholder.domElement) {
      targetElement = this._topPlaceholder.domElement;
    } else {
      // Fallback: create or attach dedicated container in document.body
      let rootEl = document.getElementById('sirva-sidenav-extension-root');
      if (!rootEl) {
        rootEl = document.createElement('div');
        rootEl.id = 'sirva-sidenav-extension-root';
        document.body.prepend(rootEl);
      }
      targetElement = rootEl;
    }

    if (targetElement) {
      if (this._renderer) {
        this._renderer.dispose();
      }

      this._renderer = new SideNavRenderer({
        navItems: parsedItems,
        siteTitle: this.properties.siteTitle,
        shiftMainContent: this.properties.shiftMainContent !== false
      });

      this._renderer.render(targetElement);
      this._isRendered = true;
    }
  }

  private _onDispose(): void {
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = undefined;
    }
    this._isRendered = false;
  }
}
