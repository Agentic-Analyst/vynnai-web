import React from 'react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  isCollapsed?: boolean;
  className?: string;
}

export const ConnectionStatus = ({ isConnected, isCollapsed = false, className }: ConnectionStatusProps) => {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 text-xs rounded-lg border",
      isConnected 
        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400" 
        : "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400",
      isCollapsed && "justify-center px-0 w-8 h-8",
      className
    )}>
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium">Live Data</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium">Offline</span>
          )}
        </>
      )}
      {isConnected && !isCollapsed && (
        <Activity className="h-3 w-3 animate-pulse ml-auto" />
      )}
    </div>
  );
};