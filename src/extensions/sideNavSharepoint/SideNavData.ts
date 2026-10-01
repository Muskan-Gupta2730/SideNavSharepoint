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
    url: '#',
    isActive: true,
    hasChevron: false
  },
  {
    id: 'working-here',
    title: 'Working here',
    url: '#',
    isActive: false,
    hasChevron: true,
    columns: [
      {
        header: 'OUR CULTURE',
        items: [
          { title: 'Values & Mission', url: '#' },
          { title: 'Diversity & Inclusion', url: '#' },
          { title: 'Community Impact', url: '#' },
          { title: 'Recognition & Awards', url: '#' }
        ]
      },
      {
        header: 'WORKPLACE',
        items: [
          { title: 'Offices & Locations', url: '#' },
          { title: 'Flexible Working', url: '#' },
          { title: 'Health & Wellbeing', url: '#' },
          { title: 'Travel & Expenses', url: '#' }
        ]
      },
      {
        header: 'TOOLS & TECH',
        items: [
          { title: 'IT Service Desk', url: '#' },
          { title: 'Software & Apps', url: '#' },
          { title: 'Equipment Request', url: '#' },
          { title: 'Security Guidelines', url: '#' }
        ]
      }
    ]
  },
  {
    id: 'pay-benefits',
    title: 'Pay & benefits',
    url: '#',
    isActive: false,
    hasChevron: true,
    columns: [
      {
        header: 'YOUR PAY',
        items: [
          { title: 'Payslips and tax documents', url: '#' },
          { title: 'Pay calendar 2026', url: '#' },
          { title: 'Bonus and commission', url: '#' },
          { title: 'Change your bank details', url: '#' }
        ]
      },
      {
        header: 'BENEFITS',
        items: [
          { title: 'Enrolment 2027', url: '#' },
          { title: 'Health and insurance', url: '#' },
          { title: 'Pension and savings', url: '#' },
          { title: 'Family and parental leave', url: '#' }
        ]
      },
      {
        header: 'WHO CAN HELP',
        items: [
          { title: 'Your local HR team', url: '#' },
          { title: 'Payroll service desk', url: '#' },
          { title: 'Ask a question', url: '#' }
        ]
      }
    ]
  },
  {
    id: 'learning',
    title: 'Learning',
    url: '#',
    isActive: false,
    hasChevron: true,
    columns: [
      {
        header: 'DEVELOPMENT',
        items: [
          { title: 'Career pathways', url: '#' },
          { title: 'Leadership academy', url: '#' },
          { title: 'Mentorship program', url: '#' },
          { title: 'Skills assessment', url: '#' }
        ]
      },
      {
        header: 'TRAINING',
        items: [
          { title: 'Mandatory compliance', url: '#' },
          { title: 'Technical certifications', url: '#' },
          { title: 'Language courses', url: '#' },
          { title: 'Global onboarding', url: '#' }
        ]
      },
      {
        header: 'RESOURCES',
        items: [
          { title: 'Digital library', url: '#' },
          { title: 'Tuition assistance', url: '#' },
          { title: 'External webinars', url: '#' },
          { title: 'Learning FAQs', url: '#' }
        ]
      }
    ]
  },
  {
    id: 'countries',
    title: 'Countries',
    url: '#',
    isActive: false,
    hasChevron: false
  },
  {
    id: 'news',
    title: 'News',
    url: '#',
    isActive: false,
    hasChevron: false
  }
];
