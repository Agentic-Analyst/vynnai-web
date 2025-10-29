import { useState, useEffect } from 'react';
import { isMarketHoliday } from '@/utils/marketHolidays';

export interface MarketStatus {
  isOpen: boolean;
  statusText: string;
  timeUntilChange: string;
  timeUntilChangeDetailed: string;
  nextEvent: 'open' | 'close';
}

/**
 * Custom hook to determine US stock market status
 * US Stock Market (NYSE/NASDAQ) operates:
 * - Regular hours: 9:30 AM - 4:00 PM Eastern Time (ET)
 * - Monday through Friday
 * - Closed on major US holidays
 * 
 * This hook works for users in any timezone worldwide by converting
 * their local time to Eastern Time (America/New_York)
 */
export function useMarketStatus(): MarketStatus {
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isOpen: false,
    statusText: 'Market is closed',
    timeUntilChange: '',
    timeUntilChangeDetailed: '',
    nextEvent: 'open'
  });

  useEffect(() => {
    const calculateMarketStatus = (): MarketStatus => {
      // Get current time in Eastern Time (US stock market timezone)
      const now = new Date();
      const etTimeString = now.toLocaleString('en-US', { 
        timeZone: 'America/New_York' 
      });
      const etNow = new Date(etTimeString);
      
      // Get day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = etNow.getDay();
      
      // Check if today is a market holiday
      const isHoliday = isMarketHoliday(etNow);
      
      // Market is closed on weekends and holidays
      if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {
        // Find next trading day
        const nextTradingDay = new Date(etNow);
        let daysToAdd = 1;
        
        if (dayOfWeek === 0) daysToAdd = 1; // Sunday -> Monday
        else if (dayOfWeek === 6) daysToAdd = 2; // Saturday -> Monday
        
        nextTradingDay.setDate(etNow.getDate() + daysToAdd);
        
        // Keep advancing until we find a non-holiday weekday
        while (nextTradingDay.getDay() === 0 || 
               nextTradingDay.getDay() === 6 || 
               isMarketHoliday(nextTradingDay)) {
          nextTradingDay.setDate(nextTradingDay.getDate() + 1);
        }
        
        nextTradingDay.setHours(9, 30, 0, 0);
        
        const totalSeconds = Math.floor((nextTradingDay.getTime() - etNow.getTime()) / 1000);
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;
        
        return {
          isOpen: false,
          statusText: isHoliday ? 'Market Holiday' : 'Market is closed',
          timeUntilChange: days > 0 
            ? `Opens in ${days}d ${hours}h`
            : `Opens in ${hours}h`,
          timeUntilChangeDetailed: days > 0
            ? `Opens in ${days}d ${hours}h ${minutes}m ${seconds}s`
            : hours > 0
              ? `Opens in ${hours}h ${minutes}m ${seconds}s`
              : `Opens in ${minutes}m ${seconds}s`,
          nextEvent: 'open'
        };
      }
      
      // Get current time in minutes since midnight
      const currentMinutes = etNow.getHours() * 60 + etNow.getMinutes();
      const currentSeconds = etNow.getHours() * 3600 + etNow.getMinutes() * 60 + etNow.getSeconds();
      
      // Market hours in minutes since midnight
      const marketOpen = 9 * 60 + 30;  // 9:30 AM
      const marketClose = 16 * 60;      // 4:00 PM
      
      // Check if market is currently open
      const isOpen = currentMinutes >= marketOpen && currentMinutes < marketClose;
      
      if (isOpen) {
        // Calculate time until market close
        const marketCloseSeconds = 16 * 3600; // 4:00 PM in seconds
        const secondsUntilClose = marketCloseSeconds - currentSeconds;
        const hours = Math.floor(secondsUntilClose / 3600);
        const minutes = Math.floor((secondsUntilClose % 3600) / 60);
        const seconds = secondsUntilClose % 60;
        
        return {
          isOpen: true,
          statusText: 'Market is open',
          timeUntilChange: hours > 0 
            ? `Closes in ${hours}h`
            : `Closes in ${minutes}m`,
          timeUntilChangeDetailed: hours > 0
            ? `Closes in ${hours}h ${minutes}m ${seconds}s`
            : `Closes in ${minutes}m ${seconds}s`,
          nextEvent: 'close'
        };
      } else if (currentMinutes < marketOpen) {
        // Market hasn't opened yet today
        const marketOpenSeconds = 9 * 3600 + 30 * 60; // 9:30 AM in seconds
        const secondsUntilOpen = marketOpenSeconds - currentSeconds;
        const hours = Math.floor(secondsUntilOpen / 3600);
        const minutes = Math.floor((secondsUntilOpen % 3600) / 60);
        const seconds = secondsUntilOpen % 60;
        
        return {
          isOpen: false,
          statusText: 'Pre-market',
          timeUntilChange: hours > 0 
            ? `Opens in ${hours}h`
            : `Opens in ${minutes}m`,
          timeUntilChangeDetailed: hours > 0
            ? `Opens in ${hours}h ${minutes}m ${seconds}s`
            : `Opens in ${minutes}m ${seconds}s`,
          nextEvent: 'open'
        };
      } else {
        // Market has closed for the day
        // Calculate time until next market open
        const nextDay = new Date(etNow);
        
        // If it's Friday, next open is Monday (or later if holiday)
        if (dayOfWeek === 5) {
          nextDay.setDate(etNow.getDate() + 3);
        } else {
          nextDay.setDate(etNow.getDate() + 1);
        }
        
        // Skip weekends and holidays
        while (nextDay.getDay() === 0 || 
               nextDay.getDay() === 6 || 
               isMarketHoliday(nextDay)) {
          nextDay.setDate(nextDay.getDate() + 1);
        }
        
        nextDay.setHours(9, 30, 0, 0);
        
        const totalSeconds = Math.floor((nextDay.getTime() - etNow.getTime()) / 1000);
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;
        
        return {
          isOpen: false,
          statusText: 'After-hours',
          timeUntilChange: days > 0
            ? `Opens in ${days}d ${hours}h`
            : hours > 0 
              ? `Opens in ${hours}h`
              : `Opens in ${minutes}m`,
          timeUntilChangeDetailed: days > 0
            ? `Opens in ${days}d ${hours}h ${minutes}m ${seconds}s`
            : hours > 0
              ? `Opens in ${hours}h ${minutes}m ${seconds}s`
              : `Opens in ${minutes}m ${seconds}s`,
          nextEvent: 'open'
        };
      }
    };

    // Initial calculation
    setMarketStatus(calculateMarketStatus());

    // Update every second for accurate countdown
    const interval = setInterval(() => {
      setMarketStatus(calculateMarketStatus());
    }, 1000); // 1 second for detailed countdown

    return () => clearInterval(interval);
  }, []);

  return marketStatus;
}
