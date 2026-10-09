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
    `&$top=200`;

  try {
    const response: SPHttpClientResponse = await this.spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data: ISideNavListResponse = await response.json();

    // Position filled items first; blank Position items last
    const sortedItems = data.value.sort((a, b) => {
      const posA = a.Position;
      const posB = b.Position;

      const isBlankA = posA == null || posA === 0;
      const isBlankB = posB == null || posB === 0;

      if (isBlankA && !isBlankB) return 1;
      if (!isBlankA && isBlankB) return -1;

      if (isBlankA && isBlankB) return a.Id - b.Id;

      return posA! - posB!;
    });

    return sortedItems.map((item: ISideNavListItem): INavItem => ({
      id: `nav-${item.Id}`,
      title: item.Title,
      url: item.Link?.Url || '#',
      icon: '',
      hasChevron: false
    }));
  } catch (error) {
    console.error('SideNavLinks load failed, falling back to defaults:', error);
    return [];
  }
}


}