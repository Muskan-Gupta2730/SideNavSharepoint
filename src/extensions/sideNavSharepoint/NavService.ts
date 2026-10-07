import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { INavItem } from './SideNavData';

interface ISideNavListItem {
  Id: number;
  Title: string;
  Link?: {
    Description?: string;
    Url: string;
  };
  isActive?: string;
  Position?: number;
}

interface ISideNavListResponse {
  value: ISideNavListItem[];
}

export class NavService {
  constructor(
    private spHttpClient: SPHttpClient,
    private webUrl: string
  ) {}

  public async getNavItems(): Promise<INavItem[]> {
    const endpoint =
      `${this.webUrl}/_api/web/lists/getbytitle('SideNavLinks')/items` +
      `?$select=Id,Title,Link,isActive,Position` +
      `&$filter=isActive eq 'Yes'` +
      `&$orderby=Position asc` +
      `&$top=100`;

    try {
      const response: SPHttpClientResponse = await this.spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data: ISideNavListResponse = await response.json();

      return data.value.map((item: ISideNavListItem): INavItem => ({
        id: `nav-${item.Id}`,
        title: item.Title,
        url: item.Link && item.Link.Url ? item.Link.Url : '#',
        icon: '',
        hasChevron: false
      }));
    } catch (error) {
      console.error('SideNavLinks load failed, falling back to defaults:', error);
      return []; // renderer falls back to DEFAULT_NAV_ITEMS when empty
    }
  }
}