
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Grid3X3, List, Wifi, WifiOff } from 'lucide-react';

import { useStockData, mockStocks } from '@/utils/stocksApi';
import { usePortfolio, PortfolioHolding } from '@/hooks/usePortfolio';
import { useRealTimeStockPrices } from '@/hooks/useRealTimeStockPrices';
import { PieChart, Cell, Pie, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { HoldingModal } from '@/components/portfolio/HoldingModal';
import { DeleteConfirmation } from '@/components/portfolio/DeleteConfirmation';
import { HoldingCard } from '@/components/portfolio/HoldingCard';

const Portfolio = () => {
  const stocks = useStockData(mockStocks);
  const { holdings, addHolding, updateHolding, deleteHolding } = usePortfolio();
  const { toast } = useToast();
  
  // Get symbols from holdings for real-time subscription
  const symbols = useMemo(() => {
    return holdings.map(h => h.symbol);
  }, [holdings]);
  
  const { prices: realTimePrices, isConnected, connectionStatus } = useRealTimeStockPrices(symbols);
  
  // Show toast when real-time connection is established
  React.useEffect(() => {
    if (isConnected && symbols.length > 0) {
      toast({
        title: 'Live Prices Connected',
        description: `Real-time price updates enabled for ${symbols.length} holdings`,
      });
    }
  }, [isConnected, symbols.length, toast]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<PortfolioHolding | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  

  // Calculate portfolio values with real-time prices
  const portfolioItems = holdings.map(item => {
    const stock = stocks.find(s => s.symbol === item.symbol);
    const realTimePrice = realTimePrices[item.symbol];
    
    // Prioritize real-time price, then mock data, then cost basis as fallback
    let currentPrice = item.costBasis; // Default fallback
    let stockName = `${item.symbol} (Unknown)`;
    let priceSource = 'cost-basis';
    
    if (realTimePrice) {
      currentPrice = realTimePrice.current_price;
      stockName = stock?.name || item.symbol;
      priceSource = 'real-time';
    } else if (stock) {
      currentPrice = stock.price;
      stockName = stock.name;
      priceSource = 'mock-data';
    }
    
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
      isRealTime: !!realTimePrice,
      priceChange: realTimePrice?.change_percent || 0,
      priceSource
    };
  });
  
  const totalValue = portfolioItems.reduce((sum, item) => sum + item.currentValue, 0);
  const totalCost = portfolioItems.reduce((sum, item) => sum + item.totalCostBasis, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  
  // Data for pie chart
  const pieData = portfolioItems.map(item => ({
    name: item.symbol,
    value: item.currentValue
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Portfolio</h1>
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
        </div>
        <div className="flex items-center gap-2">
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

          <Button onClick={handleAddHolding} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Holding
          </Button>
        </div>
      </div>
      
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
                <Button onClick={handleAddHolding} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Holding
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost Basis</p>
                    <p className="text-lg font-semibold">${totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
                    <div className="flex items-center">
                      <p className={`text-xl font-bold ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${totalGain.toFixed(2)}
                      </p>
                      <p className={`ml-2 ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                </div>
                
                {pieData.length > 0 && (
                  <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
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
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
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
                                <span>${item.currentPrice.toFixed(2)}</span>
                                {item.isRealTime ? (
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Price from WebSocket" />
                                ) : (
                                  <div className="text-xs text-muted-foreground" title={`Source: ${(item as any).priceSource}`}>
                                    {(item as any).priceSource === 'mock-data' ? 'M' : 'CB'}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">${item.currentValue.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">
                              <div className={item.gain >= 0 ? 'text-green-500' : 'text-red-500'}>
                                <div>${item.gain.toFixed(2)} ({item.gain >= 0 ? '+' : ''}{item.gainPercent.toFixed(2)}%)</div>
                                {item.isRealTime && item.priceChange !== 0 && (
                                  <div className={`text-xs ${item.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Today: {item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(2)}%
                                  </div>
                                )}
                              </div>
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
                    {portfolioItems.map((item) => (
                      <HoldingCard
                        key={item.id}
                        holding={item}
                        onEdit={handleEditHolding}
                        onDelete={handleDeleteHolding}
                      />
                    ))}
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
    </div>
  );
};

export default Portfolio;
