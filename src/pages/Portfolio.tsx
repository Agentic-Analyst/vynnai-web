
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Grid3X3, List, Wifi, WifiOff, ArrowLeft, Loader2, FileText, Download, Eye } from 'lucide-react';

import { usePortfolios } from '@/hooks/usePortfolios';
import { PortfolioHolding } from '@/hooks/usePortfolio';
import { useStockPricesSubscription } from '@/contexts/StockPricesWebSocketContext';
import { PageHeader } from '@/components/PageHeader';
import { PieChart, Cell, Pie, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { HoldingModal } from '@/components/portfolio/HoldingModal';
import { DeleteConfirmation } from '@/components/portfolio/DeleteConfirmation';
import { HoldingCard } from '@/components/portfolio/HoldingCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Portfolio = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { getPortfolio, updatePortfolio } = usePortfolios();
  const { toast } = useToast();

  // Get the specific portfolio
  const portfolio = portfolioId ? getPortfolio(portfolioId) : null;

  // Debug logging
  console.log('Portfolio Debug:', {
    portfolioId,
    portfolio: portfolio ? { id: portfolio.id, name: portfolio.name } : null,
    hasPortfolio: !!portfolio
  });

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64">
        <h2 className="text-2xl font-bold mb-4">Portfolio Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The portfolio you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate('/dashboard/portfolio')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portfolios
        </Button>
      </div>
    );
  }

  const holdings = portfolio.holdings;

  // Portfolio management functions
  const addHolding = (newHolding: Omit<PortfolioHolding, 'id' | 'dateAdded'>) => {
    const holding: PortfolioHolding = {
      ...newHolding,
      id: `holding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: new Date().toISOString(),
    };
    
    const updatedHoldings = [...holdings, holding];
    updatePortfolio(portfolio.id, { holdings: updatedHoldings });
    
    toast({
      title: 'Success',
      description: `${holding.symbol} holding added successfully`,
    });
  };

  const updateHolding = (id: string, updates: Partial<PortfolioHolding>) => {
    const updatedHoldings = holdings.map(h => 
      h.id === id ? { ...h, ...updates } : h
    );
    updatePortfolio(portfolio.id, { holdings: updatedHoldings });
    
    const updatedHolding = updatedHoldings.find(h => h.id === id);
    if (updatedHolding) {
      toast({
        title: 'Success',
        description: `${updatedHolding.symbol} holding updated successfully`,
      });
    }
  };

  const deleteHolding = (holdingId: string) => {
    const updatedHoldings = holdings.filter(h => h.id !== holdingId);
    updatePortfolio(portfolio.id, { holdings: updatedHoldings });
  };
  
  // Get symbols from holdings for real-time subscription (stabilize to prevent unnecessary reconnections)
  const symbols = useMemo(() => {
    if (!holdings || !Array.isArray(holdings)) return [];
    return holdings.map(h => h.symbol).filter(Boolean);
  }, [JSON.stringify(holdings?.map(h => h.symbol).sort())]);
  
  const { prices: realTimePrices, isConnected, connectionStatus } = useStockPricesSubscription(symbols, `portfolio-${portfolioId}`);
  
  // Show toast when real-time connection is established (use useCallback to stabilize)
  const showConnectionToast = React.useCallback(() => {
    if (isConnected && symbols.length > 0) {
      toast({
        title: 'Live Prices Connected',
        description: `Real-time price updates enabled for ${symbols.length} holdings`,
      });
    }
  }, [isConnected, symbols.length]);

  React.useEffect(() => {
    showConnectionToast();
  }, [showConnectionToast]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<PortfolioHolding | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Analysis dialog states
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    symbol: string;
    name: string;
    recommendation: string;
    content: string;
    loading: boolean;
  } | null>(null);

  // Handle indicator click
  const handleIndicatorClick = async (symbol: string, name: string, recommendation: string) => {
    setAnalysisDialogOpen(true);
    setSelectedAnalysis({
      symbol,
      name,
      recommendation,
      content: '',
      loading: true
    });

    // TODO: Fetch actual analysis from API
    // For now, show mock content
    setTimeout(() => {
      setSelectedAnalysis({
        symbol,
        name,
        recommendation,
        content: generateMockAnalysis(symbol, recommendation),
        loading: false
      });
    }, 1000);
  };

  // Mock analysis generator (will be replaced with actual API call)
  const generateMockAnalysis = (symbol: string, recommendation: string) => {
    return `# ${recommendation} Recommendation for ${symbol}

## Executive Summary
Based on comprehensive technical and fundamental analysis, we recommend a **${recommendation}** position for ${symbol}.

## Key Findings

### Technical Analysis
- **Support Level**: $${(Math.random() * 100 + 50).toFixed(2)}
- **Resistance Level**: $${(Math.random() * 100 + 150).toFixed(2)}
- **RSI (14-day)**: ${(Math.random() * 40 + 30).toFixed(1)} - ${recommendation === 'Buy' ? 'Oversold' : recommendation === 'Sell' ? 'Overbought' : 'Neutral'}
- **MACD**: ${recommendation === 'Buy' ? 'Bullish crossover' : recommendation === 'Sell' ? 'Bearish crossover' : 'Neutral trend'}

### Fundamental Analysis
- **P/E Ratio**: ${(Math.random() * 20 + 10).toFixed(2)}
- **PEG Ratio**: ${(Math.random() * 2 + 0.5).toFixed(2)}
- **Debt-to-Equity**: ${(Math.random() * 1.5).toFixed(2)}
- **ROE**: ${(Math.random() * 20 + 5).toFixed(1)}%

### Recent Developments
1. Strong earnings beat in latest quarter
2. New product launches driving growth
3. Expanding market share in key segments
4. Positive analyst sentiment shift

## Recommendation Rationale

${recommendation === 'Buy' ? 
  `The stock shows strong buying signals with positive momentum indicators and attractive valuation metrics. Technical indicators suggest an oversold condition with potential for upside.` :
  recommendation === 'Sell' ?
  `Current valuation appears stretched with overbought technical indicators. Consider taking profits at current levels.` :
  `Maintain current position. Wait for clearer directional signals before adding or reducing exposure.`
}

## Risk Factors
- Market volatility
- Sector-specific headwinds
- Regulatory changes
- Competition intensification

---
*Analysis generated on ${new Date().toLocaleDateString()}*
`;
  };

  // Handle download analysis
  const handleDownloadAnalysis = () => {
    if (!selectedAnalysis) return;
    
    // TODO: Implement actual PDF download from API
    toast({
      title: 'Download Started',
      description: `Downloading ${selectedAnalysis.recommendation} analysis for ${selectedAnalysis.symbol}...`,
    });
  };
  

  // Debug logging for WebSocket state changes
  React.useEffect(() => {
    console.log('🔍 WebSocket State Change:', {
      isConnected,
      connectionStatus,
      symbolsCount: symbols.length,
      symbols: symbols.slice(0, 3), // Log first 3 symbols only
      pricesCount: Object.keys(realTimePrices).length
    });
  }, [isConnected, connectionStatus, symbols.length, Object.keys(realTimePrices).length]);

  // Calculate portfolio values with real-time prices only (no mock data fallback)
  const portfolioItems = useMemo(() => {
    try {
      return holdings.map(item => {
        const realTimePrice = realTimePrices[item.symbol];
        
        // Only use real-time price or show loading state
        if (realTimePrice) {
          const currentPrice = realTimePrice.current_price;
          const stockName = realTimePrice.name || item.symbol;
          const currentValue = currentPrice * item.shares;
          const totalCostBasis = item.costBasis * item.shares;
          const gain = currentValue - totalCostBasis;
          const gainPercent = totalCostBasis > 0 ? (gain / totalCostBasis) * 100 : 0;
          
          return {
            ...item,
            name: stockName,
            currentPrice,
            currentValue,
            totalCostBasis,
            gain,
            gainPercent,
            isRealTime: true,
            priceChange: realTimePrice.change_percent || 0,
            priceSource: 'real-time'
          };
        } else {
          // Show loading state when no real-time data available
          const totalCostBasis = item.costBasis * item.shares;
          
          return {
            ...item,
            name: item.symbol,
            currentPrice: null, // Will show loading indicator
            currentValue: null,
            totalCostBasis,
            gain: null,
            gainPercent: null,
            isRealTime: false,
            priceChange: null,
            priceSource: 'loading'
          };
        }
      });
    } catch (error) {
      console.error('Error calculating portfolio items:', error);
      return [];
    }
  }, [holdings, realTimePrices]);

  // Calculate totals only from real-time data (exclude loading items)
  const realTimeItems = portfolioItems.filter(item => item.isRealTime);
  const totalValue = realTimeItems.reduce((sum, item) => sum + (item.currentValue || 0), 0);
  const totalCost = portfolioItems.reduce((sum, item) => sum + item.totalCostBasis, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  
  // Data for pie chart (only include real-time data)
  const pieData = realTimeItems.map(item => ({
    name: item.symbol,
    value: item.currentValue || 0
  }));
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Modal handlers
  const handleAddHolding = () => {
    setIsAddModalOpen(true);
  };

  const handleEditHolding = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setIsEditModalOpen(true);
  };

  const handleDeleteHolding = (holding: PortfolioHolding) => {
    setDeletingHolding(holding);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingHolding) {
      deleteHolding(deletingHolding.id);
      toast({
        title: 'Success',
        description: `${deletingHolding.symbol} holding deleted successfully`,
      });
    }
    setIsDeleteDialogOpen(false);
    setDeletingHolding(null);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingHolding(null);
  };
  
  return (
    <div>
      <PageHeader 
        title={portfolio.name}
        description={portfolio.description}
        showBreadcrumb={false}
      >
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard/portfolio')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portfolios
        </Button>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Live Prices ({Object.keys(realTimePrices).length} active)</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span className="text-orange-600 capitalize">{connectionStatus}</span>
            </>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex border rounded-lg p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="h-8 w-8 p-0"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Holding Button */}
        <Button onClick={handleAddHolding} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Holding
        </Button>
      </PageHeader>
      
      {holdings.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your portfolio by adding your first stock holding.
                </p>
                <Button onClick={handleAddHolding} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Add Your First Holding
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Portfolio Summary
                  {totalGain >= 0 ? (
                    <TrendingUp className={`h-4 w-4 ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  ) : (
                    <TrendingDown className={`h-4 w-4 ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    {realTimeItems.length > 0 ? (
                      <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-2xl font-bold text-muted-foreground">Loading...</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost Basis</p>
                    <p className="text-lg font-semibold">${totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
                    {realTimeItems.length > 0 ? (
                      <div className="flex items-center">
                        <p className={`text-xl font-bold ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${totalGain.toFixed(2)}
                        </p>
                        <p className={`ml-2 ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ({totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xl font-bold text-muted-foreground">Loading...</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {pieData.length > 0 ? (
                  <div className="mt-6 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : portfolioItems.length > 0 ? (
                  <div className="mt-6 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading portfolio data...</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Symbol</th>
                          <th className="text-left py-2 px-4">Name</th>
                          <th className="text-right py-2 px-4">Shares</th>
                          <th className="text-right py-2 px-4">Cost Basis</th>
                          <th className="text-right py-2 px-4">Current Price</th>
                          <th className="text-right py-2 px-4">Value</th>
                          <th className="text-right py-2 px-4">Gain/Loss</th>
                          <th className="text-center py-2 px-4">Short-term</th>
                          <th className="text-right py-2 px-4">Intrinsic Value</th>
                          <th className="text-right py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{item.symbol}</td>
                            <td className="py-3 px-4">{item.name}</td>
                            <td className="py-3 px-4 text-right">{item.shares}</td>
                            <td className="py-3 px-4 text-right">${item.costBasis.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.currentPrice !== null ? (
                                  <>
                                    <span>${item.currentPrice.toFixed(2)}</span>
                                    {item.isRealTime && (
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Price from WebSocket" />
                                    )}
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-muted-foreground text-sm">Loading...</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {item.currentValue !== null ? (
                                `$${item.currentValue.toFixed(2)}`
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-muted-foreground text-sm">Loading...</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {item.gain !== null && item.gainPercent !== null ? (
                                <div className={item.gain >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  <div>${item.gain.toFixed(2)} ({item.gain >= 0 ? '+' : ''}{item.gainPercent.toFixed(2)}%)</div>
                                  {item.isRealTime && item.priceChange !== null && item.priceChange !== 0 && (
                                    <div className={`text-xs ${item.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      Today: {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-muted-foreground text-sm">Loading...</span>
                                </div>
                              )}
                            </td>
                            {/* Short-term Column */}
                            <td className="py-3 px-4 text-center">
                              {(() => {
                                // Mock recommendation logic based on gain/loss
                                const recommendations = ['Buy', 'Hold', 'Sell'];
                                const recommendationIndex = Math.abs(item.symbol.charCodeAt(0)) % 3;
                                const recommendation = recommendations[recommendationIndex];
                                
                                const getRecommendationColor = (rec: string) => {
                                  switch(rec) {
                                    case 'Buy': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
                                    case 'Sell': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
                                    case 'Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
                                    default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
                                  }
                                };
                                
                                return (
                                  <button
                                    onClick={() => handleIndicatorClick(item.symbol, item.name, recommendation)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${getRecommendationColor(recommendation)}`}
                                    title={`Click to view ${recommendation} analysis`}
                                  >
                                    <Eye className="h-3 w-3" />
                                    {recommendation}
                                  </button>
                                );
                              })()}
                            </td>
                            {/* Intrinsic Value Column */}
                            <td className="py-3 px-4 text-right">
                              {(() => {
                                // Mock intrinsic value - slightly different from current price
                                const intrinsicMultiplier = 0.95 + (Math.abs(item.symbol.charCodeAt(1)) % 20) / 100; // Between 0.95 and 1.15
                                const intrinsicValue = item.currentPrice ? item.currentPrice * intrinsicMultiplier : null;
                                
                                return intrinsicValue !== null ? (
                                  <div className="text-right">
                                    <div>${intrinsicValue.toFixed(2)}</div>
                                    {item.currentPrice && (
                                      <div className={`text-xs ${intrinsicValue > item.currentPrice ? 'text-green-600' : 'text-red-600'}`}>
                                        {intrinsicValue > item.currentPrice ? 'Undervalued' : 'Overvalued'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-muted-foreground text-sm">Loading...</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditHolding(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteHolding(item)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {portfolioItems.map((item) => {
                      // Calculate recommendation for card view (same logic as table)
                      const recommendations = ['Buy', 'Hold', 'Sell'];
                      const recommendationIndex = Math.abs(item.symbol.charCodeAt(0)) % 3;
                      const recommendation = recommendations[recommendationIndex];
                      
                      return (
                        <HoldingCard
                          key={item.id}
                          holding={item}
                          recommendation={recommendation}
                          onEdit={handleEditHolding}
                          onDelete={handleDeleteHolding}
                          onIndicatorClick={() => handleIndicatorClick(item.symbol, item.name, recommendation)}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <HoldingModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        onSave={addHolding}
        onUpdate={updateHolding}
        title="Add New Holding"
      />
      
      <HoldingModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={addHolding}
        onUpdate={updateHolding}
        editingHolding={editingHolding}
        title="Edit Holding"
      />
      
      <DeleteConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingHolding(null);
        }}
        onConfirm={handleConfirmDelete}
        holdingSymbol={deletingHolding?.symbol || ''}
      />

      {/* Stock Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedAnalysis?.symbol} - {selectedAnalysis?.name}
              {selectedAnalysis && (
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  selectedAnalysis.recommendation === 'Buy' ? 'bg-green-100 text-green-800 border-green-200' :
                  selectedAnalysis.recommendation === 'Sell' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-yellow-100 text-yellow-800 border-yellow-200'
                }`}>
                  {selectedAnalysis.recommendation}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Short-term investment analysis and recommendation
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[600px] w-full rounded-md border p-6">
            {selectedAnalysis?.loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading analysis...</p>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm max-w-none"
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 pb-2 border-b">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">{children}</strong>
                  ),
                  p: ({ children }) => (
                    <p className="my-3 leading-relaxed text-gray-700">{children}</p>
                  ),
                }}
              >
                {selectedAnalysis?.content || ''}
              </ReactMarkdown>
            )}
          </ScrollArea>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setAnalysisDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleDownloadAnalysis}
              className="gap-2"
              disabled={selectedAnalysis?.loading}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portfolio;
