import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { getCurrentDashboardPage } from '@/lib/navigation';

interface PageHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  showBreadcrumb?: boolean;
}

export const PageHeader = ({ 
  title, 
  description, 
  children, 
  className,
  showBreadcrumb = true 
}: PageHeaderProps) => {
  const location = useLocation();
  const currentItem = getCurrentDashboardPage(location.pathname);
  
  // Use provided title or fallback to nav item title
  const pageTitle = title || currentItem?.title || 'Page';
  const PageIcon = currentItem?.icon;
  
  return (
    <div className={cn("space-y-4 pb-6", className)}>
      {showBreadcrumb && (
        <Breadcrumb className="text-xs" />
      )}
      
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {PageIcon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border">
                <PageIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {pageTitle}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};