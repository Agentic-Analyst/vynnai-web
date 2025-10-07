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
      description: "AI Chat with Vynn AI Financial Analyst"
    },
    {
      label: "Dashboard",
      icon: BarChart3,
      path: "/dashboard",
      description: "Stock Market Dashboard"
    }
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-foreground">VYNN AI - Value Your Next News</h1>
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
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2"
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