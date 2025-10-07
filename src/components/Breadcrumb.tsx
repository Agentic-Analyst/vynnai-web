import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentTopLevelSection, getCurrentDashboardPage } from '@/lib/navigation';

export const Breadcrumb = ({ className }) => {
  const location = useLocation();
  
  // Get the current top-level section (Chat vs Dashboard)
  const currentTopLevel = getCurrentTopLevelSection(location.pathname);
  // Get the current dashboard page (if in dashboard)
  const currentDashboardPage = getCurrentDashboardPage(location.pathname);
  
  // Create breadcrumb items
  const breadcrumbItems = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isHome: true
    }
  ];
  
  // Add top-level section (Chat or Dashboard)
  if (currentTopLevel) {
    breadcrumbItems.push({
      label: currentTopLevel.title,
      href: currentTopLevel.href,
      icon: currentTopLevel.icon,
      isHome: false
    });
    
    // If we're in dashboard and on a specific page (not the main dashboard)
    if (currentTopLevel.pathPattern === '/dashboard' && 
        currentDashboardPage && 
        currentDashboardPage.href !== '/dashboard') {
      breadcrumbItems.push({
        label: currentDashboardPage.title,
        href: currentDashboardPage.href,
        icon: currentDashboardPage.icon,
        isHome: false
      });
    }
  }
  
  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          )}
          <div className="flex items-center space-x-1.5">
            <item.icon className={cn(
              "h-4 w-4",
              index === breadcrumbItems.length - 1 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            {index === breadcrumbItems.length - 1 ? (
              <span className="font-medium text-foreground">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};