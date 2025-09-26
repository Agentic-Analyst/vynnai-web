import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { IntegratedDashboard } from '@/components/layout/IntegratedDashboard';

const StockDashboardLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Check if we're on the main dashboard page or a sub-page
  const isMainDashboard = location.pathname === '/dashboard';
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <main className="flex-1 transition-all duration-300">
        {isMainDashboard ? (
          <IntegratedDashboard />
        ) : (
          <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};

export default StockDashboardLayout;