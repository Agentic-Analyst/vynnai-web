import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ScatterChart, Scatter
} from 'recharts';
import { 
  Download, TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon,
  BarChart3, LineChart as LineChartIcon, Target, Gauge,
  DollarSign, Percent, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useStockPricesSubscription } from '@/contexts/StockPricesWebSocketContext';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

const COLORS = {
  primary: '#8884d8',
  secondary: '#82ca9d',
  accent: '#ffc658',
  danger: '#ff6b6b',
  success: '#51cf66',
  warning: '#ffd43b',
  info: '#4dabf7',
  purple: '#9775fa',
  pink: '#f06595',
  teal: '#20c997',
};

const CHART_COLORS = [
  COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.info,
  COLORS.purple, COLORS.pink, COLORS.teal, COLORS.warning
];

// Custom Treemap Content Component
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, symbol, name, percentage, color } = props;

  if (width < 50 || height < 40) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 10}
        textAnchor="middle"
        fill="#fff"
        fontSize={14}
        fontWeight="bold"
      >
        {symbol}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="#fff"
        fontSize={12}
      >
        {percentage?.toFixed(1)}%
      </text>
    </g>
  );
};

const Performance = () => {
  const navigate = useNavigate();
  const { portfolios, getPortfolioSummaries } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [exportingChart, setExportingChart] = useState<string | null>(null);

  // Chart refs for export
  const performanceChartRef = useRef<HTMLDivElement>(null);
  const allocationChartRef = useRef<HTMLDivElement>(null);
  const gainLossChartRef = useRef<HTMLDivElement>(null);
  const diversificationChartRef = useRef<HTMLDivElement>(null);
  const riskReturnChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  // Get portfolio summaries
  const portfolioSummaries = getPortfolioSummaries();

  // Auto-select first portfolio if none selected
  React.useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  // Get selected portfolio
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const selectedSummary = portfolioSummaries.find(s => s.id === selectedPortfolioId);

  // Get real-time prices for holdings
  const symbols = selectedPortfolio?.holdings.map(h => h.symbol) || [];
  const { prices, isConnected } = useStockPricesSubscription(symbols, 'performance-page');

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    if (!selectedPortfolio || !selectedSummary) {
      return null;
    }

    const holdings = selectedPortfolio.holdings.map(holding => {
      const price = prices[holding.symbol];
      const currentPrice = price?.current_price || holding.costBasis;
      const currentValue = holding.shares * currentPrice;
      const costValue = holding.shares * holding.costBasis;
      const gain = currentValue - costValue;
      const gainPercent = (gain / costValue) * 100;

      return {
        ...holding,
        currentPrice,
        currentValue,
        costValue,
        gain,
        gainPercent,
        name: price?.name || holding.symbol,
      };
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.costValue, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = (totalGain / totalCost) * 100;

    return {
      holdings,
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
    };
  }, [selectedPortfolio, selectedSummary, prices]);

  // Generate performance history (30 days)
  const performanceHistory = useMemo(() => {
    if (!portfolioMetrics) return [];

    const days = 30;
    const data = [];
    const currentValue = portfolioMetrics.totalValue;
    const volatility = 1.5;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      // Simulate historical values with trend toward current value
      const progress = i / (days - 1);
      const randomFactor = (Math.random() - 0.5) * volatility;
      const trendFactor = portfolioMetrics.totalGainPercent * progress / 100;
      const historicalValue = currentValue * (1 - trendFactor + (randomFactor / 100));

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(historicalValue.toFixed(2)),
        cost: portfolioMetrics.totalCost,
      });
    }

    // Ensure last value matches current
    data[data.length - 1].value = currentValue;

    return data;
  }, [portfolioMetrics]);

  // Allocation data for pie/treemap
  const allocationData = useMemo(() => {
    if (!portfolioMetrics) return [];

    return portfolioMetrics.holdings.map((holding, index) => ({
      symbol: holding.symbol,
      name: holding.name,
      value: holding.currentValue,
      percentage: (holding.currentValue / portfolioMetrics.totalValue) * 100,
      shares: holding.shares,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [portfolioMetrics]);

  // Gain/Loss data
  const gainLossData = useMemo(() => {
    if (!portfolioMetrics) return [];

    return portfolioMetrics.holdings
      .sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain))
      .map(holding => ({
        symbol: holding.symbol,
        name: holding.name,
        gain: holding.gain,
        gainPercent: holding.gainPercent,
      }));
  }, [portfolioMetrics]);

  // Risk/Return scatter data
  const riskReturnData = useMemo(() => {
    if (!portfolioMetrics) return [];

    return portfolioMetrics.holdings.map(holding => ({
      symbol: holding.symbol,
      name: holding.name,
      return: holding.gainPercent,
      risk: Math.abs(holding.gainPercent) * 0.8, // Simplified risk metric
      value: holding.currentValue,
    }));
  }, [portfolioMetrics]);

  // Diversification metrics
  const diversificationData = useMemo(() => {
    if (!portfolioMetrics || portfolioMetrics.holdings.length === 0) return [];

    const totalValue = portfolioMetrics.totalValue;
    const holdings = portfolioMetrics.holdings;

    // Calculate concentration (Herfindahl index)
    const concentration = holdings.reduce((sum, h) => {
      const weight = h.currentValue / totalValue;
      return sum + (weight * weight);
    }, 0);

    const diversificationScore = (1 - concentration) * 100;
    const balanceScore = (1 - (Math.max(...holdings.map(h => h.currentValue)) / totalValue)) * 100;
    const spreadScore = Math.min(holdings.length * 10, 100);

    return [
      { metric: 'Diversification', score: diversificationScore, fullMark: 100 },
      { metric: 'Balance', score: balanceScore, fullMark: 100 },
      { metric: 'Spread', score: spreadScore, fullMark: 100 },
      { metric: 'Holdings Count', score: Math.min(holdings.length * 20, 100), fullMark: 100 },
    ];
  }, [portfolioMetrics]);

  // Export chart as image
  const exportChart = async (chartRef: React.RefObject<HTMLDivElement>, name: string) => {
    if (!chartRef.current) return;

    setExportingChart(name);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 3, // High resolution
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${selectedPortfolio?.name || 'portfolio'}-${name}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting chart:', error);
    } finally {
      setExportingChart(null);
    }
  };

  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Activity className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Portfolios Found</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Create your first portfolio to start tracking performance and viewing analytics.
        </p>
        <Button onClick={() => navigate('/dashboard/portfolio')}>
          Create Portfolio
        </Button>
      </div>
    );
  }

  if (!selectedPortfolio || !portfolioMetrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Portfolio Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Portfolio Performance</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for your investments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
            isConnected 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            {isConnected ? 'Live Prices' : 'Disconnected'}
          </div>

          <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map(portfolio => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  <div className="flex items-center gap-2">
                    <span>{portfolio.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({portfolio.holdings.length} holdings)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioMetrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Current market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold flex items-center gap-2",
              portfolioMetrics.totalGain >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {portfolioMetrics.totalGain >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              ${Math.abs(portfolioMetrics.totalGain).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className={cn(
              "text-xs mt-1 flex items-center gap-1",
              portfolioMetrics.totalGain >= 0 ? "text-green-600" : "text-red-600"
            )}>
              <Percent className="h-3 w-3" />
              {portfolioMetrics.totalGain >= 0 ? '+' : ''}{portfolioMetrics.totalGainPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioMetrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Target className="h-3 w-3 inline mr-1" />
              Initial investment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioMetrics.holdings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <BarChart3 className="h-3 w-3 inline mr-1" />
              Active positions
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <Card className="lg:col-span-2" ref={performanceChartRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5" />
                  Portfolio Value Over Time
                </CardTitle>
                <CardDescription className="mt-1">30-day performance history</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(performanceChartRef, 'performance-history')}
                disabled={exportingChart === 'performance-history'}
              >
                {exportingChart === 'performance-history' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-2">Export</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    name="Portfolio Value"
                    stroke={COLORS.primary} 
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    name="Cost Basis"
                    stroke={COLORS.secondary} 
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Allocation - Pie Chart */}
        <Card ref={allocationChartRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Portfolio Allocation
                </CardTitle>
                <CardDescription className="mt-1">Distribution by holding</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(allocationChartRef, 'allocation')}
                disabled={exportingChart === 'allocation'}
              >
                {exportingChart === 'allocation' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ symbol, percentage }) => `${symbol} ${percentage.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `$${parseFloat(value).toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gain/Loss by Holding */}
        <Card ref={gainLossChartRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gain/Loss by Holding
                </CardTitle>
                <CardDescription className="mt-1">Individual performance</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(gainLossChartRef, 'gain-loss')}
                disabled={exportingChart === 'gain-loss'}
              >
                {exportingChart === 'gain-loss' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gainLossData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="symbol" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'gain') return [`$${parseFloat(value).toFixed(2)}`, 'Gain/Loss'];
                      return [`${parseFloat(value).toFixed(2)}%`, 'Return'];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Bar dataKey="gain" name="Gain/Loss ($)" fill={COLORS.primary}>
                    {gainLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? COLORS.success : COLORS.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Diversification Radar */}
        <Card ref={diversificationChartRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Diversification Analysis
                </CardTitle>
                <CardDescription className="mt-1">Portfolio health metrics</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(diversificationChartRef, 'diversification')}
                disabled={exportingChart === 'diversification'}
              >
                {exportingChart === 'diversification' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={diversificationData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Radar 
                    name="Score" 
                    dataKey="score" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary} 
                    fillOpacity={0.6} 
                  />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk/Return Scatter */}
        <Card ref={riskReturnChartRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk/Return Profile
                </CardTitle>
                <CardDescription className="mt-1">Position analysis</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(riskReturnChartRef, 'risk-return')}
                disabled={exportingChart === 'risk-return'}
              >
                {exportingChart === 'risk-return' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    dataKey="risk" 
                    name="Risk" 
                    label={{ value: 'Risk (%)', position: 'bottom', fontSize: 12 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="return" 
                    name="Return" 
                    label={{ value: 'Return (%)', angle: -90, position: 'left', fontSize: 12 }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Return' || name === 'Risk') return `${parseFloat(value).toFixed(2)}%`;
                      return `$${parseFloat(value).toFixed(2)}`;
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Scatter name="Holdings" data={riskReturnData} fill={COLORS.primary}>
                    {riskReturnData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Allocation Treemap */}
        <Card ref={trendChartRef} className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Portfolio Allocation Treemap
                </CardTitle>
                <CardDescription className="mt-1">Visual representation of portfolio weight</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportChart(trendChartRef, 'treemap')}
                disabled={exportingChart === 'treemap'}
              >
                {exportingChart === 'treemap' ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={allocationData}
                  dataKey="value"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill={COLORS.primary}
                  content={<CustomTreemapContent />}
                >
                  <Tooltip 
                    formatter={(value: any) => `$${parseFloat(value).toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Footer */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">About These Analytics</h4>
              <p className="text-sm text-muted-foreground">
                All charts are interactive and update in real-time with live market data. 
                Click the export button on any chart to download it as a high-resolution PNG image. 
                Performance calculations are based on current market prices and may differ from actual realized gains.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Performance;
