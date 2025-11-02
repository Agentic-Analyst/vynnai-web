import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  TrendingUp, 
  Building2,
  Globe2,
  Calendar,
  Search,
  Clock,
  Loader2,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useStockWatchlist } from '@/hooks/useStockWatchlist';
import { useRealTimeStockPrices } from '@/hooks/useRealTimeStockPrices';
import { useDailyReports } from '@/contexts/DailyReportsContext';
import { dailyReportsApi } from '@/lib/dailyReportsApi';
import ReportPreview from '@/components/reports/ReportPreview';

// Mock data structure - will be replaced with API data
interface CompanyReport {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  reportDate: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  summary: string;
  status: 'available' | 'generating' | 'failed';
  fileSize?: string;
  lastUpdated: string;
}

interface SectorReport {
  id: string;
  sector: string;
  companyCount: number;
  reportDate: string;
  summary: string;
  status: 'available' | 'generating' | 'failed';
  fileSize?: string;
  lastUpdated: string;
}

interface GlobalReport {
  id: string;
  title: string;
  reportDate: string;
  summary: string;
  status: 'available' | 'generating' | 'failed';
  fileSize?: string;
  lastUpdated: string;
  topics: string[];
}

const Reports: React.FC = () => {
  const { watchedSymbols } = useStockWatchlist();
  const { prices: stockPrices } = useRealTimeStockPrices(watchedSymbols);
  const {
    companyReports: apiCompanyReports,
    sectorReports: apiSectorReports,
    loading: reportsLoading,
    error: reportsError,
    statusMessage,
    reportDate,
    selectedDate,
    setSelectedDate,
    refreshReports,
    loadReportsForTickers,
    loadReportsForSectors,
  } = useDailyReports();
  
  // State management
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'sector'>('date');
  const [activeTab, setActiveTab] = useState<'company' | 'sector' | 'global'>('company');
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Date selection refs (selectedDate is now in context for persistence)
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const lastConfirmedDateRef = React.useRef<string>('');
  
  // Report generation state
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    jobId?: string;
    status?: string;
    progress?: string;
    error?: string;
  }>({});
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);


  // Use real API data
  const companyReports = apiCompanyReports;
  const sectorReports = apiSectorReports;

  // Placeholder for Global Reports (API not yet available)
  const globalReports: GlobalReport[] = [
    {
      id: 'global-1',
      title: 'Why is the Market Moving Today?',
      reportDate: new Date().toISOString().split('T')[0],
      summary: 'Comprehensive analysis of global market movements, key drivers, and economic indicators.',
      status: 'generating',
      fileSize: '5.2 MB',
      lastUpdated: new Date().toISOString(),
      topics: ['Federal Reserve', 'Inflation', 'Tech Sector', 'Energy Prices'],
    },
    {
      id: 'global-2',
      title: 'Market Outlook & Sentiment Analysis',
      reportDate: new Date().toISOString().split('T')[0],
      summary: 'Overall market sentiment, investor positioning, and forward-looking indicators.',
      status: 'generating',
      fileSize: '4.1 MB',
      lastUpdated: new Date().toISOString(),
      topics: ['Market Sentiment', 'Volatility Index', 'Options Flow'],
    },
  ];

  // Filtering and sorting logic for Company Reports
  const filteredCompanyReports = useMemo(() => {
    let filtered = companyReports;

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(r => r.reportDate === selectedDate);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        r =>
          r.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedSector !== 'all') {
      filtered = filtered.filter(r => r.sector === selectedSector);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
        case 'name':
          return a.companyName.localeCompare(b.companyName);
        case 'sector':
          return a.sector.localeCompare(b.sector);
        default:
          return 0;
      }
    });

    return filtered;
  }, [companyReports, searchQuery, selectedSector, sortBy, selectedDate]);

  // Filtering for Sector Reports
  const filteredSectorReports = useMemo(() => {
    let filtered = sectorReports;

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(r => r.reportDate === selectedDate);
    }

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [sectorReports, searchQuery, selectedDate]);

  // Compute concise status message based on what's actually missing
  const computedStatusMessage = useMemo(() => {
    if (!selectedDate || watchedSymbols.length === 0) return null;
    
    const missing: string[] = [];
    
    // Check if company reports are missing for selected date
    if (filteredCompanyReports.length === 0 && watchedSymbols.length > 0) {
      missing.push('Company');
    }
    
    // Check if sector reports are missing for selected date
    if (filteredSectorReports.length === 0) {
      const uniqueSectors = Array.from(new Set(
        Object.values(stockPrices)
          .map(stock => stock.sector)
          .filter((sector): sector is string => sector !== undefined && sector !== null && sector !== '')
      ));
      
      if (uniqueSectors.length > 0) {
        missing.push('Sector');
      }
    }
    
    return missing.length > 0 ? `Missing: ${missing.join(', ')}` : null;
  }, [filteredCompanyReports, filteredSectorReports, selectedDate, watchedSymbols, stockPrices]);

  const sectors = useMemo(() => {
    return Array.from(new Set(companyReports.map(r => r.sector)));
  }, [companyReports]);

  // Filtering for Global Reports
  const filteredGlobalReports = useMemo(() => {
    let filtered = globalReports;

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [searchQuery, globalReports]);

  // Sync selectedDate with reportDate from context
  useEffect(() => {
    if (reportDate && !selectedDate) {
      setSelectedDate(reportDate);
    }
  }, [reportDate, selectedDate]);

  // Handle date change - only update display, don't fetch yet
  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    
    setSelectedDate(newDate);
    console.log(`📅 Date display updated to: ${newDate}`);
  };

  // Fetch reports when user finishes selecting a date (onBlur or explicit action)
  const handleDateConfirm = async (dateToFetch: string, forceRefresh = false) => {
    if (!dateToFetch) return;

    // Skip if same date and not forced, unless it's the first time loading
    if (!forceRefresh && dateToFetch === reportDate && companyReports.length > 0) {
      console.log(`📅 Already showing reports for ${dateToFetch}, skipping fetch`);
      return;
    }

    console.log(`📅 Date confirmed: ${dateToFetch} - fetching reports`);
    
    // Fetch reports for the confirmed date
    if (watchedSymbols.length > 0) {
      setLoading(true);
      try {
        // Extract unique sectors from watched stocks
        const sectors = Array.from(new Set(
          Object.values(stockPrices)
            .map(stock => stock.sector)
            .filter((sector): sector is string => sector !== undefined && sector !== null && sector !== '')
        ));
        
        console.log(`📊 Fetching reports for ${watchedSymbols.length} companies on ${dateToFetch}`);
        
        // Load company reports for the new date
        await loadReportsForTickers(watchedSymbols, dateToFetch, stockPrices);
        
        // Load sector reports if sectors are available
        if (sectors.length > 0) {
          await loadReportsForSectors(sectors, dateToFetch, stockPrices);
        }
        
        console.log('✅ Reports loaded for new date');
      } catch (error: any) {
        console.error('Error loading reports for new date:', error);
        // Don't show alert for 404 errors (reports don't exist yet)
        if (!error.message?.includes('not found') && !error.message?.includes('404')) {
          alert(`Failed to load reports: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Get Reports for a specific date
  const handleGetReports = async () => {
    if (!selectedDate || watchedSymbols.length === 0) {
      if (watchedSymbols.length === 0) {
        alert('No watched stocks found. Please add stocks to your watchlist first.');
      }
      return;
    }
    
    setLoading(true);
    
    try {
      // Extract unique sectors from watched stocks
      const sectors = Array.from(new Set(
        Object.values(stockPrices)
          .map(stock => stock.sector)
          .filter((sector): sector is string => sector !== undefined && sector !== null && sector !== '')
      ));
      
      console.log(`📊 Fetching reports for ${watchedSymbols.length} companies and ${sectors.length} sectors on ${selectedDate}`);
      
      // Load company reports for the selected date with stock prices for enrichment
      await loadReportsForTickers(watchedSymbols, selectedDate, stockPrices);
      
      // Load sector reports if sectors are available
      if (sectors.length > 0) {
        await loadReportsForSectors(sectors, selectedDate, stockPrices);
      }
      
      console.log('✅ Reports loaded successfully');
    } catch (error: any) {
      console.error('Error loading reports:', error);
      alert(`Failed to load reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get today's date in YYYY-MM-DD format (using local timezone)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleTodayClick = () => {
    const today = getTodayDate();
    handleDateChange(today);
    handleDateConfirm(today, true); // Force refresh
    lastConfirmedDateRef.current = today;
  };

  // Loading state for manual fetch
  const [loading, setLoading] = useState(false);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Handlers
  const handlePreview = (report: any) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  };

  const handleDownload = async (report: any) => {
    if (!reportDate || downloading) return;
    
    setDownloading(report.id);
    
    try {
      let blob: Blob;
      let filename: string;
      
      if (report.ticker) {
        // Company report - use ticker and reportDate
        blob = await dailyReportsApi.downloadCompanyReportPDF(report.ticker, reportDate || selectedDate);
        filename = `${report.ticker}_daily_report_${reportDate || selectedDate}.pdf`;
      } else {
        // Sector report - use sector name and reportDate
        blob = await dailyReportsApi.downloadSectorReportPDF(report.sector, reportDate || selectedDate);
        filename = `${report.sector}_sector_report_${reportDate || selectedDate}.pdf`;
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`✅ Downloaded: ${filename}`);
    } catch (error: any) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  // Report generation handler
  const handleGenerateReports = async () => {
    if (!selectedDate || isGenerating || watchedSymbols.length === 0) {
      if (watchedSymbols.length === 0) {
        alert('No watched stocks found. Please add stocks to your watchlist first.');
      }
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus({ status: 'pending', progress: 'Checking existing reports...' });
    
    try {
      // Extract unique sectors from watched stocks
      const sectors = Array.from(new Set(
        Object.values(stockPrices)
          .map(stock => stock.sector)
          .filter((sector): sector is string => sector !== undefined && sector !== null && sector !== '')
      ));
      
      // Check which reports are missing for the selected date
      const companyReportsForDate = filteredCompanyReports.filter(r => r.reportDate === selectedDate);
      const sectorReportsForDate = filteredSectorReports.filter(r => r.reportDate === selectedDate);
      
      const needCompanyReports = companyReportsForDate.length === 0 && watchedSymbols.length > 0;
      const needSectorReports = sectorReportsForDate.length === 0 && sectors.length > 0;
      
      if (!needCompanyReports && !needSectorReports) {
        alert('All reports already exist for this date.');
        setIsGenerating(false);
        return;
      }
      
      console.log(`📊 Generating ${needCompanyReports ? `${watchedSymbols.length} companies` : ''}${needCompanyReports && needSectorReports ? ' and ' : ''}${needSectorReports ? `${sectors.length} sectors` : ''} on ${selectedDate}`);
      
      let companyResult;
      let sectorResult;
      
      // Only trigger batch report generation for companies if missing
      if (needCompanyReports) {
        companyResult = await dailyReportsApi.generateCompanyReports(watchedSymbols, selectedDate);
        console.log(`✅ Company reports generation triggered (batch: ${companyResult.batch_id})`);
      }
      
      // Only trigger batch report generation for sectors if missing
      if (needSectorReports && sectors.length > 0) {
        sectorResult = await dailyReportsApi.generateSectorReports(sectors, selectedDate);
        console.log(`✅ Sector reports generation triggered (batch: ${sectorResult.batch_id})`);
      }
      
      const totalJobs = (companyResult?.total_jobs || 0) + (sectorResult?.total_jobs || 0);
      
      setGenerationStatus({
        jobId: companyResult?.batch_id || sectorResult?.batch_id,
        status: 'running',
        progress: `Batch queued for ${needCompanyReports ? `${watchedSymbols.length} companies` : ''}${needCompanyReports && needSectorReports ? ' and ' : ''}${needSectorReports ? `${sectors.length} sectors` : ''}, waiting for completion...`
      });
      
      // Start polling for batch status
      const interval = setInterval(async () => {
        try {
          let companyBatchStatus;
          let sectorBatchStatus;
          
          if (companyResult) {
            companyBatchStatus = await dailyReportsApi.getBatchStatus(companyResult.batch_id);
          }
          if (sectorResult) {
            sectorBatchStatus = await dailyReportsApi.getBatchStatus(sectorResult.batch_id);
          }
          
          // Determine overall status
          const companyComplete = !companyBatchStatus || companyBatchStatus.status === 'completed' || companyBatchStatus.status === 'failed';
          const sectorComplete = !sectorBatchStatus || sectorBatchStatus.status === 'completed' || sectorBatchStatus.status === 'failed';
          const allComplete = companyComplete && sectorComplete;
          
          // Build progress message
          const progressParts = [];
          if (companyBatchStatus) progressParts.push(`Companies: ${companyBatchStatus.status}`);
          if (sectorBatchStatus) progressParts.push(`Sectors: ${sectorBatchStatus.status}`);
          
          setGenerationStatus({
            jobId: companyResult?.batch_id || sectorResult?.batch_id,
            status: allComplete ? 'completed' : 'running',
            progress: progressParts.join(', '),
          });
          
          // Stop polling if all batches are completed
          if (allComplete) {
            clearInterval(interval);
            setPollInterval(null);
            setIsGenerating(false);
            
            const anySuccess = 
              (companyBatchStatus && companyBatchStatus.status === 'completed') || 
              (sectorBatchStatus && sectorBatchStatus.status === 'completed');
            
            if (anySuccess) {
              // Refresh reports after successful generation
              setTimeout(async () => {
                console.log('✅ Batch generation complete, refreshing reports...');
                await refreshReports();
                setGenerationDialogOpen(false);
              }, 2000);
            }
          }
        } catch (error: any) {
          console.error('Error polling batch status:', error);
          setGenerationStatus(prev => ({
            ...prev,
            error: error.message
          }));
        }
      }, 3000); // Poll every 3 seconds
      
      setPollInterval(interval);
      
    } catch (error: any) {
      console.error('Error generating reports:', error);
      setGenerationStatus({
        status: 'failed',
        error: error.message,
        progress: 'Generation failed'
      });
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse YYYY-MM-DD format directly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        <p className="text-muted-foreground">
          Daily reports for your watchlist companies and market analysis
        </p>
      </div>

      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            {reportsLoading ? (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3 animate-spin" />
                Loading reports...
              </Badge>
            ) : reportsError ? (
              <Badge variant="destructive" className="gap-1">
                Error: {reportsError}
              </Badge>
            ) : computedStatusMessage ? (
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                <AlertCircle className="h-3 w-3" />
                {computedStatusMessage}
              </Badge>
            ) : reportDate ? (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Report Date: {reportDate}
              </Badge>
            ) : null}
            
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  handleDateChange(newDate);
                  
                  // Auto-confirm if the date changed and is different from last confirmed
                  if (newDate && newDate !== lastConfirmedDateRef.current) {
                    // Small delay to allow the date picker to close naturally
                    setTimeout(() => {
                      handleDateConfirm(newDate);
                      lastConfirmedDateRef.current = newDate;
                    }, 100);
                  }
                }}
                onBlur={(e) => {
                  // Also confirm on blur as fallback
                  const newDate = e.target.value;
                  if (newDate && newDate !== lastConfirmedDateRef.current) {
                    handleDateConfirm(newDate);
                    lastConfirmedDateRef.current = newDate;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDateConfirm(selectedDate);
                    lastConfirmedDateRef.current = selectedDate;
                    e.currentTarget.blur(); // Remove focus after Enter
                  }
                }}
                max={getTodayDate()}
                className="w-40 h-8 text-sm"
                disabled={reportsLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTodayClick}
                disabled={reportsLoading}
                className="h-8 text-xs"
              >
                Today
              </Button>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerationDialogOpen(true)}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Generate Reports
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGetReports}
              disabled={loading || watchedSymbols.length === 0}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Get Reports
            </Button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Tabs for different report types */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company Reports
              <Badge variant="secondary" className="ml-1">{companyReports.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sector" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Sector Reports
              <Badge variant="secondary" className="ml-1">{sectorReports.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Globe2 className="h-4 w-4" />
              Global Reports
              <Badge variant="secondary" className="ml-1">{globalReports.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Company Reports Tab */}
          <TabsContent value="company" className="space-y-4 mt-6">
            {/* Filters */}
            <div className="flex gap-3 items-center flex-wrap">
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="name">Company Name</SelectItem>
                  <SelectItem value="sector">Sector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanyReports.map(report => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {report.ticker}
                          {report.status === 'available' && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Ready
                            </Badge>
                          )}
                          {report.status === 'generating' && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              Generating
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {report.companyName}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {report.sector}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(report.reportDate)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                        {report.summary}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{report.fileSize}</span>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handlePreview(report)}
                        disabled={report.status !== 'available'}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleDownload(report)}
                        disabled={report.status !== 'available' || downloading === report.id}
                      >
                        {downloading === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {downloading === report.id ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCompanyReports.length === 0 && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No reports found</p>
                  <p className="text-sm mt-2">
                    {searchQuery || selectedSector !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Add companies to your watchlist to generate reports'}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Sector Reports Tab */}
          <TabsContent value="sector" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSectorReports.map(report => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          {report.sector}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {report.companyCount} {report.companyCount === 1 ? 'company' : 'companies'} tracked
                        </CardDescription>
                      </div>
                      {report.status === 'available' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Ready
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(report.reportDate)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted-foreground flex-1">
                        {report.summary}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{report.fileSize}</span>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handlePreview(report)}
                        disabled={report.status !== 'available'}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleDownload(report)}
                        disabled={report.status !== 'available' || downloading === report.id}
                      >
                        {downloading === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {downloading === report.id ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSectorReports.length === 0 && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No sector reports found</p>
                  <p className="text-sm mt-2">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Add companies to your watchlist to generate sector reports'}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Global Reports Tab */}
          <TabsContent value="global" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGlobalReports.map(report => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Globe2 className="h-5 w-5 text-primary" />
                        </div>
                        {report.status === 'available' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Ready
                          </Badge>
                        )}
                        {report.status === 'generating' && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(report.reportDate)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {report.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm line-clamp-2">
                      {report.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {report.topics.map(topic => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground pt-2">
                      <span>{report.fileSize}</span>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handlePreview(report)}
                        disabled={report.status !== 'available'}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleDownload(report)}
                        disabled={report.status !== 'available'}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredGlobalReports.length === 0 && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <Globe2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No global reports found</p>
                  <p className="text-sm mt-2">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Global market reports will appear here'}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedReport?.ticker || selectedReport?.sector || selectedReport?.title}
              </DialogTitle>
              <DialogDescription>
                Report generated on {selectedReport && formatDate(selectedReport.reportDate)}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[600px] w-full rounded-md border p-6">
              {/* Preview content using ReportPreview component */}
              <ReportPreview
                reportId={selectedReport?.id || ''}
                reportType={
                  selectedReport?.ticker ? 'company' :
                  selectedReport?.sector ? 'sector' : 'global'
                }
                content={selectedReport?.markdownContent}
                loading={false}
              />
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={() => selectedReport && handleDownload(selectedReport)} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Generation Dialog */}
        <Dialog open={generationDialogOpen} onOpenChange={setGenerationDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Generate Daily Reports
              </DialogTitle>
              <DialogDescription>
                Reports for {formatDate(selectedDate)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Report Status Summary */}
              {!generationStatus.status && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Report Status</h4>
                    
                    {/* Company Reports Status */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Company Reports ({watchedSymbols.length} companies)</span>
                      </div>
                      {filteredCompanyReports.filter(r => r.reportDate === selectedDate).length > 0 ? (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                          <CheckCircle className="h-3 w-3" />
                          Exists
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                          <AlertCircle className="h-3 w-3" />
                          Missing
                        </Badge>
                      )}
                    </div>

                    {/* Sector Reports Status */}
                    {(() => {
                      const sectors = Array.from(new Set(
                        Object.values(stockPrices)
                          .map(stock => stock.sector)
                          .filter((sector): sector is string => sector !== undefined && sector !== null && sector !== '')
                      ));
                      const hasSectorReports = filteredSectorReports.filter(r => r.reportDate === selectedDate).length > 0;
                      
                      return sectors.length > 0 ? (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>Sector Reports ({sectors.length} sectors)</span>
                          </div>
                          {hasSectorReports ? (
                            <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                              <CheckCircle className="h-3 w-3" />
                              Exists
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
                              <AlertCircle className="h-3 w-3" />
                              Missing
                            </Badge>
                          )}
                        </div>
                      ) : null;
                    })()}

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Only missing reports will be generated
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Status Display */}
              {generationStatus.status && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {generationStatus.status === 'pending' && (
                        <>
                          <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                          <span className="text-sm font-medium text-blue-700">Pending</span>
                        </>
                      )}
                      {generationStatus.status === 'running' && (
                        <>
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          <span className="text-sm font-medium text-blue-700">Running</span>
                        </>
                      )}
                      {generationStatus.status === 'completed' && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Completed</span>
                        </>
                      )}
                      {generationStatus.status === 'failed' && (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Failed</span>
                        </>
                      )}
                    </div>

                    {generationStatus.jobId && (
                      <div className="text-xs text-muted-foreground">
                        Job ID: <code className="bg-muted px-1 rounded">{generationStatus.jobId}</code>
                      </div>
                    )}

                    {generationStatus.progress && (
                      <div className="text-sm">
                        {generationStatus.progress}
                      </div>
                    )}

                    {generationStatus.error && (
                      <div className="text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{generationStatus.error}</span>
                      </div>
                    )}

                    {generationStatus.status === 'completed' && (
                      <div className="text-sm text-green-600">
                        ✅ Reports generated successfully! Refreshing data in 2 seconds...
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setGenerationDialogOpen(false);
                  if (pollInterval) {
                    clearInterval(pollInterval);
                    setPollInterval(null);
                  }
                  setIsGenerating(false);
                  setGenerationStatus({});
                }}
                disabled={isGenerating && generationStatus.status === 'running'}
              >
                {isGenerating && generationStatus.status === 'running' ? 'Running...' : 'Close'}
              </Button>
              <Button 
                onClick={handleGenerateReports}
                disabled={isGenerating || !selectedDate || watchedSymbols.length === 0}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Generate Missing Reports
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Reports;
