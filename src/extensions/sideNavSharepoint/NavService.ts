import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { INavItem } from './SideNavData';

interface ISideNavListItem {
  Id: number;
  Title: string;
  Link?: { Description?: string; Url: string };
  isActive?: string;
  Position?: number | null;
  Level?: string | number | null;      // Choice column returns text: "1" | "2" | "3"
  OpenInNewTab?: string | boolean | null; // Choice ("yes"/"no") or Yes/No column
  ParentLink?: { Id: number } | null;  // Lookup (expanded)
}

interface ISideNavListResponse {
  value: ISideNavListItem[];
}

interface ITreeNode {
  item: ISideNavListItem;
  level: number;
  children: ITreeNode[];
}

export class NavService {
  constructor(
    private spHttpClient: SPHttpClient,
    private webUrl: string
  ) {}

  public async getNavItems(): Promise<INavItem[]> {
    const endpoint =
      `${this.webUrl}/_api/web/lists/getbytitle('SideNavLinks')/items` +
      `?$select=Id,Title,Link,isActive,Position,Level,OpenInNewTab,ParentLink/Id` +
      `&$expand=ParentLink` +
      `&$filter=isActive eq 'Yes'` +
      `&$top=500`;

    try {
      const response: SPHttpClientResponse = await this.spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data: ISideNavListResponse = await response.json();
      return this.buildNav(data.value);
    } catch (error) {
      console.error('SideNavLinks load failed, falling back to defaults:', error);
      return [];
    }
  }

  // ---------------------------------------------------------------
  // Tree building
  // ---------------------------------------------------------------

  private buildNav(rows: ISideNavListItem[]): INavItem[] {
    const nodes = new Map<number, ITreeNode>();
    rows.forEach((row) => {
      nodes.set(row.Id, { item: row, level: this.parseLevel(row.Level), children: [] });
    });

    const roots: ITreeNode[] = [];

    nodes.forEach((node) => {
      const parentId = node.item.ParentLink ? node.item.ParentLink.Id : null;

      if (parentId === null) {
        // Level 1 (or Level left blank). A Level 2/3 item with no parent is an authoring mistake.
        if (node.level <= 1) {
          roots.push(node);
        } else {
          console.warn(`SideNavLinks: "${node.item.Title}" is Level ${node.level} but has no ParentLink. Skipped.`);
        }
        return;
      }

      const parent = nodes.get(parentId);
      if (!parent) {
        // Parent is inactive or deleted: hide the child as well
        return;
      }
      parent.children.push(node);
    });

    const sortNodes = (list: ITreeNode[]): void => {
      list.sort((a, b) => this.comparePosition(a.item, b.item));
      list.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots.map((root) => this.toNavItem(root));
  }

  /** Level 1 node -> rail item. Level 2 -> child item. Level 3 -> grandchild item. */
  private toNavItem(root: ITreeNode): INavItem {
    const children: INavItem[] = root.children.map((l2) => {
      const l3Children: INavItem[] = l2.children.map((l3) => ({
        id: `nav-${l3.item.Id}`,
        title: l3.item.Title,
        url: l3.item.Link?.Url || '#',
        isExternal: this.isYes(l3.item.OpenInNewTab),
        hasChevron: false
      }));

      return {
        id: `nav-${l2.item.Id}`,
        title: l2.item.Title,
        url: l2.item.Link?.Url || '#',
        isExternal: this.isYes(l2.item.OpenInNewTab),
        hasChevron: l3Children.length > 0,
        children: l3Children.length > 0 ? l3Children : undefined
      };
    });

    return {
      id: `nav-${root.item.Id}`,
      title: root.item.Title,
      url: root.item.Link?.Url || '#',
      isExternal: this.isYes(root.item.OpenInNewTab),
      icon: '',
      hasChevron: children.length > 0,
      children: children.length > 0 ? children : undefined
    };
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  private parseLevel(value: string | number | null | undefined): number {
    const n = parseInt(`${value ?? ''}`, 10);
    return isNaN(n) ? 1 : n;
  }

  private isYes(value: string | boolean | null | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    return `${value ?? ''}`.trim().toLowerCase() === 'yes';
  }

  /** Position-filled items first; blank Position goes last (then by Id). */
  private comparePosition(a: ISideNavListItem, b: ISideNavListItem): number {
    const blankA = a.Position == null || a.Position === 0;
    const blankB = b.Position == null || b.Position === 0;

    if (blankA && !blankB) { return 1; }
    if (!blankA && blankB) { return -1; }
    if (blankA && blankB) { return a.Id - b.Id; }
    return (a.Position as number) - (b.Position as number);
  }
}