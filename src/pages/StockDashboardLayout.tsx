import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';

const StockDashboardLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-white to-amber-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-300 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <main className="flex-1 transition-all duration-300 overflow-y-auto h-full">
        <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default StockDashboardLayout;