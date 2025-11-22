import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      label: "Chat",
      icon: MessageSquare,
      path: "/chat",
      description: "AI Chat with VYNN AI Financial Analyst"
    },
    {
      label: "Dashboard",
      icon: BarChart3,
      path: "/dashboard",
      description: "Stock Market Dashboard"
    }
  ];

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-amber-500/10 sticky top-0 z-50 transition-colors duration-300">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 dark:from-amber-200 dark:via-amber-400 dark:to-amber-200 bg-clip-text text-transparent tracking-tight">
              VYNN AI
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground uppercase tracking-widest border-l border-border pl-4">
              Value Your Next News
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              // Fix: Check if current path starts with the item path for dashboard sections
              const isActive = item.path === "/chat" 
                ? location.pathname === "/chat" 
                : location.pathname.startsWith("/dashboard");
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    isActive 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400" 
                      : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-200 hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;