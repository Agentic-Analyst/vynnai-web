import { 
  BarChart, PieChart, BarChart3, Wallet, LineChart, Globe, 
  DollarSign, Settings, Home
} from 'lucide-react';

export const navItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/dashboard',
  },
  {
    title: 'Stocks',
    icon: BarChart,
    href: '/dashboard/stocks',
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

export type NavItem = {
  title: string;
  icon: React.ElementType;
  href: string;
};
