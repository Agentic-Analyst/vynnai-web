import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dailyReportsApi, CompanyReport, SectorReport } from '@/lib/dailyReportsApi';
import { useStockWatchlist } from '@/hooks/useStockWatchlist';

interface DailyReportsContextType {
  companyReports: CompanyReport[];
  sectorReports: SectorReport[];
  loading: boolean;
  error: string | null;
  statusMessage: string | null;
  reportDate: string | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  refreshReports: () => Promise<void>;
  loadReportsForTickers: (tickers: string[], date?: string, stockPricesMap?: Record<string, any>) => Promise<void>;
  loadReportsForSectors: (sectors: string[], date?: string, stockPricesMap?: Record<string, any>) => Promise<void>;
}

const DailyReportsContext = createContext<DailyReportsContextType | undefined>(undefined);

export function DailyReportsProvider({ children }: { children: React.ReactNode }) {
  const { watchedSymbols } = useStockWatchlist();
  const [companyReports, setCompanyReports] = useState<CompanyReport[]>([]);
  const [sectorReports, setSectorReports] = useState<SectorReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [lastFetchedTickers, setLastFetchedTickers] = useState<string[]>([]);
  
  // Helper to get today's date in YYYY-MM-DD format (using local timezone)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Persistent selected date state (survives navigation)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());

  /**
   * Get the current market date (format: YYYY-MM-DD)
   * Uses ET timezone and accounts for market hours
   */
  const getCurrentMarketDate = useCallback((): string => {
    const now = new Date();
    
    // Convert to ET timezone
    const etTimeString = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const [datePart, timePart] = etTimeString.split(', ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');
    
    const etHour = parseInt(hour);
    
    // Market opens at 9:30 AM ET, reports generated 1 hour before (8:30 AM ET)
    // If current time is before 8:30 AM ET, use previous day's date
    if (etHour < 8 || (etHour === 8 && parseInt(minute) < 30)) {
      // Use previous day
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      date.setDate(date.getDate() - 1);
      return date.toISOString().split('T')[0];
    }
    
    // Otherwise use today's date
    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Load company reports for specific tickers
   */
  const loadReportsForTickers = useCallback(async (tickers: string[], date?: string, stockPricesMap?: Record<string, any>) => {
    if (!tickers || tickers.length === 0) {
      console.log('📊 No tickers provided, skipping report fetch');
      setCompanyReports([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const targetDate = date || getCurrentMarketDate();
      console.log(`📊 Fetching company reports for ${tickers.length} tickers on ${targetDate}:`, tickers);
      
      setReportDate(targetDate);
      
      // Fetch reports for all tickers in batch
      const multiReportResponse = await dailyReportsApi.getMultipleCompanyReportsMarkdown(tickers, targetDate);
      
      // Convert to CompanyReport format
      const reportsData: CompanyReport[] = multiReportResponse.reports
        .filter(report => report.content && report.ticker) // Only include successfully fetched reports
        .map(report => {
          // Get sector from stock prices if available
          const stockData = stockPricesMap?.[report.ticker!];
          const sector = stockData?.sector || 'Unknown';
          const companyName = stockData?.name || report.ticker;
          
          return {
            id: `company-${report.ticker}-${targetDate}`,
            ticker: report.ticker!,
            companyName: companyName!,
            sector: sector,
            reportDate: targetDate,
            reportType: 'daily',
            summary: `Daily market intelligence report for ${report.ticker}`,
            status: 'available',
            fileSize: dailyReportsApi.formatFileSize(report.content.length),
            lastUpdated: new Date().toISOString(),
            markdownContent: report.content,
            filename: report.filename,
          };
        });
      
      setCompanyReports(reportsData);
      setLastFetchedTickers(tickers);
      
      const failedCount = tickers.length - reportsData.length;
      console.log(`✅ Loaded ${reportsData.length} company reports${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
      
      if (failedCount > 0) {
        const successfulTickers = reportsData.map(r => r.ticker);
        const failedTickers = tickers.filter(t => !successfulTickers.includes(t));
        console.warn(`⚠️ Failed to load reports for:`, failedTickers);
      }
      
      // Don't set status message here - let Reports.tsx handle the display based on counts
      
    } catch (err: any) {
      console.error(`❌ Failed to fetch company reports:`, err);
      
      // Don't show error if reports simply don't exist yet (404 or "not found" errors)
      const errorMessage = err.message || '';
      const isNotFoundError = 
        errorMessage.includes('not found') || 
        errorMessage.includes('404') ||
        errorMessage.includes('No company reports') ||
        errorMessage.includes('No reports found');
      
      if (isNotFoundError) {
        console.log('ℹ️ No reports found for current date - you may need to generate them first');
        setError(null);
      } else {
        // Only set error for actual failures (network errors, server errors, etc.)
        setError(err.message || 'Failed to fetch company reports');
      }
      setCompanyReports([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentMarketDate]);

  /**
   * Load sector reports for specific sectors
   */
  const loadReportsForSectors = useCallback(async (sectors: string[], date?: string, stockPricesMap?: { [key: string]: any }) => {
    if (!sectors || sectors.length === 0) {
      console.log('📊 No sectors provided, skipping report fetch');
      setSectorReports([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const targetDate = date || getCurrentMarketDate();
      console.log(`📊 Fetching sector reports for ${sectors.length} sectors on ${targetDate}:`, sectors);
      
      setReportDate(targetDate);
      
      // Fetch reports for all sectors in batch
      const multiReportResponse = await dailyReportsApi.getMultipleSectorReportsMarkdown(sectors, targetDate);
      
      // Convert to SectorReport format
      const reportsData: SectorReport[] = multiReportResponse.reports
        .filter(report => report.content) // Only include successfully fetched reports
        .map((report, index) => {
          // Use the sector from the original array (reports are in same order as request)
          const sectorName = sectors[index] || 'Unknown';
          
          // Calculate company count for this sector from stockPricesMap
          let companyCount = 0;
          if (stockPricesMap) {
            companyCount = Object.values(stockPricesMap).filter(
              (stock: any) => stock.sector === sectorName
            ).length;
          }
          
          return {
            id: `sector-${sectorName}-${targetDate}`,
            sector: sectorName,
            companyCount: companyCount,
            reportDate: targetDate,
            summary: `Sector analysis for ${sectorName}`,
            status: 'available',
            fileSize: dailyReportsApi.formatFileSize(report.content.length),
            lastUpdated: new Date().toISOString(),
            markdownContent: report.content,
            filename: report.filename,
          };
        });
      
      setSectorReports(reportsData);
      
      const failedCount = sectors.length - reportsData.length;
      console.log(`✅ Loaded ${reportsData.length} sector reports${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
      
      if (failedCount > 0) {
        const successfulSectors = reportsData.map(r => r.sector);
        const failedSectors = sectors.filter(s => !successfulSectors.includes(s));
        console.warn(`⚠️ Failed to load reports for sectors:`, failedSectors);
      }
      
      // Don't set status message here - let Reports.tsx handle the display based on counts
      
    } catch (err: any) {
      console.error(`❌ Failed to fetch sector reports:`, err);
      
      // Don't show error if reports simply don't exist yet (404 or "not found" errors)
      const errorMessage = err.message || '';
      const isNotFoundError = 
        errorMessage.includes('not found') || 
        errorMessage.includes('404') ||
        errorMessage.includes('No sector reports') ||
        errorMessage.includes('No reports found');
      
      if (isNotFoundError) {
        console.log('ℹ️ No sector reports found for current date - you may need to generate them first');
        setError(null);
      } else {
        // Only set error for actual failures (network errors, server errors, etc.)
        setError(err.message || 'Failed to fetch sector reports');
      }
      setSectorReports([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentMarketDate]);

  /**
   * Refresh reports based on current watchlist
   */
  const refreshReports = useCallback(async () => {
    if (watchedSymbols.length === 0) {
      console.log('📊 No watched symbols');
      return;
    }

    // Check if watchlist has changed
    const tickersChanged = 
      lastFetchedTickers.length !== watchedSymbols.length ||
      !lastFetchedTickers.every(ticker => watchedSymbols.includes(ticker));

    if (tickersChanged) {
      console.log('🔄 Watchlist changed, refreshing reports');
      await loadReportsForTickers(watchedSymbols);
    } else {
      console.log(`✓ Reports already loaded for current watchlist`);
    }
  }, [watchedSymbols, lastFetchedTickers, loadReportsForTickers]);

  // Auto-load reports ONLY ONCE when component mounts and watchlist is available
  useEffect(() => {
    // Only auto-load if we haven't loaded any reports yet and have a watchlist
    if (watchedSymbols.length > 0 && companyReports.length === 0 && lastFetchedTickers.length === 0) {
      console.log('🔄 Initial load: fetching reports for watchlist...');
      const todayDate = getTodayDate();
      setSelectedDate(todayDate);
      loadReportsForTickers(watchedSymbols, todayDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const value: DailyReportsContextType = {
    companyReports,
    sectorReports,
    loading,
    error,
    statusMessage,
    reportDate,
    selectedDate,
    setSelectedDate,
    refreshReports,
    loadReportsForTickers,
    loadReportsForSectors,
  };

  return (
    <DailyReportsContext.Provider value={value}>
      {children}
    </DailyReportsContext.Provider>
  );
}

export function useDailyReports() {
  const context = useContext(DailyReportsContext);
  if (context === undefined) {
    throw new Error('useDailyReports must be used within a DailyReportsProvider');
  }
  return context;
}
