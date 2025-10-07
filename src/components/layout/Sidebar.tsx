
import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useLocation } from 'react-router-dom';
import { navItems, type NavItem } from '@/lib/navigation';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({ isCollapsed, onToggle, className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground relative transition-all duration-300 ease-in-out flex flex-col border-r border-sidebar-border",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
        <h2 className={cn(
          "font-semibold tracking-tight transition-opacity duration-200",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          VYNN
        </h2>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "absolute right-2 text-sidebar-foreground h-8 w-8",
            isCollapsed ? "right-2" : "right-4"
          )}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group",
                  "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-sm",
                  isActive 
                    ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-l-3 border-primary shadow-sm" 
                    : "text-sidebar-foreground hover:translate-x-1",
                  isCollapsed && "justify-center px-0"
                )}
              >
                {/* Active indicator dot for collapsed state */}
                {isActive && isCollapsed && (
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full shadow-lg" />
                )}
                
                {/* Left border indicator for expanded state */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-md" />
                )}
                
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "group-hover:scale-105"
                )} />
                <span className={cn(
                  "text-sm font-medium transition-all duration-200",
                  isCollapsed ? "opacity-0 w-0" : "opacity-100",
                  isActive ? "font-semibold" : "group-hover:font-medium"
                )}>
                  {item.title}
                </span>
                
                {/* Modern hover indicator */}
                {!isActive && (
                  <div className={cn(
                    "absolute inset-0 rounded-lg border border-transparent transition-all duration-200",
                    "group-hover:border-sidebar-accent/50 group-hover:bg-gradient-to-r group-hover:from-sidebar-accent/5 group-hover:to-transparent"
                  )} />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "transition-opacity duration-200 rounded-md bg-sidebar-accent/50 p-2 text-xs text-sidebar-accent-foreground",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          <p className="font-medium">Market Status</p>
          <p>Markets are open</p>
          <p className="text-[10px]">Closes in 3h 45m</p>
        </div>
      </div>
    </aside>
  );
}
