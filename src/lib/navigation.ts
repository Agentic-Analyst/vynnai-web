import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, MessageSquare, Newspaper, FileText, Bitcoin
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
    title: 'Currencies',
    icon: DollarSign,
    href: '/dashboard/currencies',
    comingSoon: true,
  },
  {
    title: 'Global',
    icon: Globe,
    href: '/dashboard/global',
    comingSoon: true,
  },
  {
    title: 'Crypto',
    icon: Bitcoin,
    href: '/dashboard/analysis',
    comingSoon: true,
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
  comingSoon?: boolean;
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
