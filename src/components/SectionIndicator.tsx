import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getCurrentDashboardPage } from '@/lib/navigation';

interface SectionIndicatorProps {
  className?: string;
}

export const SectionIndicator = ({ className }: SectionIndicatorProps) => {
  const location = useLocation();
  const currentItem = getCurrentDashboardPage(location.pathname);
  
  if (!currentItem) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary",
      className
    )}>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      <currentItem.icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {currentItem.title}
      </span>
    </div>
  );
};