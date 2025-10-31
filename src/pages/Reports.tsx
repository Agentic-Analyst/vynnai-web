import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  TrendingUp, 
  Building2, 
  Globe2,
  Calendar,
  Search,
  Clock
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
  
  // State management
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'sector'>('date');
  const [activeTab, setActiveTab] = useState<'company' | 'sector' | 'global'>('company');

  // Mock stock data with sector information - will be replaced with API data
  const mockStockData = useMemo(() => {
    return watchedSymbols.map(symbol => ({
      symbol,
      name: `${symbol} Inc.`, // Placeholder - will come from API
      sector: 'Technology', // Placeholder - will come from API
    }));
  }, [watchedSymbols]);

  // Mock data - will be replaced with API calls
  const companyReports: CompanyReport[] = useMemo(() => {
    return mockStockData.map(stock => ({
      id: `${stock.symbol}-${Date.now()}`,
      ticker: stock.symbol,
      companyName: stock.name,
      sector: stock.sector,
      reportDate: new Date().toISOString().split('T')[0],
      reportType: 'daily' as const,
      summary: `Daily analysis for ${stock.name} including price movements, technical indicators, and market sentiment.`,
      status: 'available' as const,
      fileSize: '2.3 MB',
      lastUpdated: new Date().toISOString(),
    }));
  }, [mockStockData]);

  const sectorReports: SectorReport[] = useMemo(() => {
    const sectors = Array.from(new Set(mockStockData.map(s => s.sector)));
    return sectors.map(sector => ({
      id: `sector-${sector}-${Date.now()}`,
      sector: sector,
      companyCount: mockStockData.filter(s => s.sector === sector).length,
      reportDate: new Date().toISOString().split('T')[0],
      summary: `Sector analysis covering ${mockStockData.filter(s => s.sector === sector).length} companies in ${sector}.`,
      status: 'available' as const,
      fileSize: '3.8 MB',
      lastUpdated: new Date().toISOString(),
    }));
  }, [mockStockData]);

  const globalReports: GlobalReport[] = [
    {
      id: 'global-1',
      title: 'Why is the Market Moving Today?',
      reportDate: new Date().toISOString().split('T')[0],
      summary: 'Comprehensive analysis of global market movements, key drivers, and economic indicators.',
      status: 'available',
      fileSize: '5.2 MB',
      lastUpdated: new Date().toISOString(),
      topics: ['Federal Reserve', 'Inflation', 'Tech Sector', 'Energy Prices'],
    },
    {
      id: 'global-2',
      title: 'Market Outlook & Sentiment Analysis',
      reportDate: new Date().toISOString().split('T')[0],
      summary: 'Overall market sentiment, investor positioning, and forward-looking indicators.',
      status: 'available',
      fileSize: '4.1 MB',
      lastUpdated: new Date().toISOString(),
      topics: ['Market Sentiment', 'Volatility Index', 'Options Flow'],
    },
  ];

  // Filtering and sorting logic for Company Reports
  const filteredCompanyReports = useMemo(() => {
    let filtered = companyReports;

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
  }, [companyReports, searchQuery, selectedSector, sortBy]);

  // Filtering for Sector Reports
  const filteredSectorReports = useMemo(() => {
    let filtered = sectorReports;

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [sectorReports, searchQuery]);

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
  }, [searchQuery]);

  const sectors = useMemo(() => {
    return Array.from(new Set(companyReports.map(r => r.sector)));
  }, [companyReports]);

  // Handlers
  const handlePreview = (report: any) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  };

  const handleDownload = async (report: any) => {
    // TODO: Implement API call to download report
    console.log('Downloading report:', report.id);
    // Placeholder for download functionality
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return formatDate(dateString);
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatTime(new Date().toISOString())}
            </Badge>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{report.fileSize}</span>
                      <span>{formatTime(report.lastUpdated)}</span>
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
                    <p className="text-sm text-muted-foreground">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{report.fileSize}</span>
                      <span>{formatTime(report.lastUpdated)}</span>
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <span>{report.fileSize}</span>
                      <span>{formatTime(report.lastUpdated)}</span>
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
                // TODO: These will be populated from API
                // content={selectedReport?.markdownContent}
                // pdfUrl={selectedReport?.pdfUrl}
                // loading={selectedReport?.loading}
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
      </div>
    </div>
  );
};

export default Reports;
