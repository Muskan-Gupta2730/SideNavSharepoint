export interface ISubMenuItem {
  id: string;
  title: string;
  url: string;
  isExternal?: boolean;
}

export interface IMegaMenuColumn {
  header: string;
  /** Set when the Level 2 heading itself has a Link in the list */
  headerUrl?: string;
  headerIsExternal?: boolean;
  items: ISubMenuItem[];
}

export interface INavItem {
  id: string;
  title: string;
  url?: string;
  icon?: string;
  isExternal?: boolean;
  children?: INavItem[];
  isActive?: boolean;
  hasChevron?: boolean;
  columns?: IMegaMenuColumn[];
}

/**
 * Fallback used only when the SharePoint list cannot be read.
 * PASTE YOUR EXISTING DEFAULT_NAV_ITEMS HERE (keep it as it was).
 */
export const DEFAULT_NAV_ITEMS: INavItem[] = [
  {
    id: 'home',
    title: 'Home',
    url: 'https://iproats.sharepoint.com/sites/SirvaDev/SitePages/Home.aspx',
    isActive: false,
    hasChevron: false,
    icon: ''
  },
  {
    id: 'working-here',
    title: 'Working here',
    url: '#',
    hasChevron: true,
    children: [
      { id: 'wh-1', title: 'Workplace Guidelines', url: '#' },
      { id: 'wh-2', title: 'Office Locations', url: '#' },
      { id: 'wh-3', title: 'Culture & Values', url: '#' }
    ]
  },
  {
    id: 'pay-benefits',
    title: 'Pay & benefits',
    url: '#',
    hasChevron: true,
    children: [
      { id: 'pb-1', title: 'Payslips and tax documents', url: '#' },
      { id: 'pb-2', title: 'Pay calendar 2026', url: '#' },
      {
        id: 'pb-3',
        title: 'Benefits',
        url: '#',
        hasChevron: true,
        children: [
          { id: 'pb-3-1', title: 'Enrolment 2027', url: '#' },
          { id: 'pb-3-2', title: 'Health and insurance', url: '#' },
          { id: 'pb-3-3', title: 'Pension and savings', url: '#' },
          { id: 'pb-3-4', title: 'Family and parental leave', url: '#' }
        ]
      },
      {
        id: 'pb-4',
        title: 'Who can help',
        url: '#',
        hasChevron: true,
        children: [
          { id: 'pb-4-1', title: 'HR Helpdesk', url: '#' },
          { id: 'pb-4-2', title: 'Benefits team contact', url: '#' }
        ]
      }
    ]
  },
  {
    id: 'learning',
    title: 'Learning',
    url: '#',
    hasChevron: false
  },
  {
    id: 'countries',
    title: 'Countries',
    url: '#',
    hasChevron: false
  },
  {
    id: 'news',
    title: 'News',
    url: '#',
    hasChevron: false
  }
];