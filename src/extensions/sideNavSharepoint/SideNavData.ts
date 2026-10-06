export interface ISubMenuItem {
  title: string;
  url: string;
  isExternal?: boolean;
}

export interface IMegaMenuColumn {
  header: string;
  items: ISubMenuItem[];
}

export interface INavItem {
  children: any;
  icon: string;
  id: string;
  title: string;
  url?: string;
  isActive?: boolean;
  hasChevron?: boolean;
  columns?: IMegaMenuColumn[];
}

export const DEFAULT_NAV_ITEMS: INavItem[] = [
  {
    id: 'home',
    title: 'Home',
    url: 'https://iproats.sharepoint.com/sites/SirvaDev/SitePages/Home.aspx',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
  {
    id: 'about',
    title: 'About',
    url: '#',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
  {
    id: 'life',
    title: 'Life@Sirva',
    url: '#',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
  {
    id: 'country',
    title: 'Country',
    url: 'https://iproats.sharepoint.com/sites/SirvaDev/SitePages/AustraliaHubb.aspx',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
  {
    id: 'dept',
    title: 'Departments',
    url: '#',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
  {
    id: 'comms',
    title: 'Communication',
    url: '#',
    isActive: false,
    hasChevron: false,
    children: undefined,
    icon: ""
  },
    {
      id: 'people',
      title: 'People',
      url: '#',
      isActive: false,
      hasChevron: false,
      children: undefined,
      icon: ""
    },
    {
      id: 'leaders',
      title: 'Leaders',
      url: '#',
      isActive: false,
      hasChevron: false,
      children: undefined,
      icon: ""
    },
      {
        id: 'learning',
        title: 'Learning',
        url: '#',
        isActive: false,
        hasChevron: false,
        children: undefined,
        icon: ""
      },
      {
        id: 'careers',
        title: 'Careers',
        url: '#',
        isActive: false,
        hasChevron: false,
        children: undefined,
        icon: ""
      },
        {
          id: 'news',
          title: 'News@Sirva',
          url: '#',
          isActive: false,
          hasChevron: false,
          children: undefined,
          icon: ""
        },


];
