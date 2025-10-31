import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, MessageSquare, Newspaper, FileText
} from 'lucide-react';

// Top-level navigation (Chat vs Dashboard)
export const topLevelNavItems = [
  {
    title: 'Chat',
    icon: MessageSquare,
    href: '/chat',
    pathPattern: '/chat'
  },
  {
    title: 'Dashboard',
    icon: BarChart3,
    href: '/dashboard',
    pathPattern: '/dashboard'
  }
];

// Dashboard internal navigation
export const dashboardNavItems = [
  {
    title: 'News',
    icon: Newspaper,
    href: '/dashboard/news',
  },
  {
    title: 'Reports',
    icon: FileText,
    href: '/dashboard/reports',
  },
  {
    title: 'Stocks',
    icon: BarChart,
    href: '/dashboard/stocks',
  },
  {
    title: 'Portfolio',
    icon: Wallet,
    href: '/dashboard/portfolio',
  },
  {
    title: 'Performance',
    icon: LineChart,
    href: '/dashboard/performance',
  },
  {
    title: 'Markets',
    icon: BarChart3,
    href: '/dashboard/markets',
  },
  {
    title: 'Currencies',
    icon: DollarSign,
    href: '/dashboard/currencies',
  },
  {
    title: 'Global',
    icon: Globe,
    href: '/dashboard/global',
  },
  {
    title: 'Analysis',
    icon: PieChart,
    href: '/dashboard/analysis',
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
  }
];

// For backward compatibility
export const navItems = dashboardNavItems;

export type NavItem = {
  title: string;
  icon: React.ElementType;
  href: string;
  pathPattern?: string;
};

// Helper functions
export const getCurrentTopLevelSection = (pathname: string) => {
  if (pathname.startsWith('/chat')) {
    return topLevelNavItems.find(item => item.pathPattern === '/chat');
  }
  if (pathname.startsWith('/dashboard')) {
    return topLevelNavItems.find(item => item.pathPattern === '/dashboard');
  }
  return null;
};

export const getCurrentDashboardPage = (pathname: string) => {
  return dashboardNavItems.find(item => item.href === pathname);
};
