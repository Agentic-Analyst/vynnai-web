
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, BarChart3Icon, Loader2 } from 'lucide-react';
import { Stock, formatCurrency, formatPercentage, formatNumber, formatDate } from '@/utils/stocksApi';
import { Sparkline } from '@/components/stocks/Sparkline';
import { cn } from '@/lib/utils';

interface StockCardProps {
  stock: Stock;
  priceHistory?: number[];
  className?: string;
  onClick?: () => void;
}

export function StockCard({ stock, priceHistory, className, onClick }: StockCardProps) {
  const isLoading = stock.price === null;
  const isPositive = stock.change ? stock.change >= 0 : false;
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:border-amber-500/20 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm border-amber-500/10 dark:border-slate-800/60",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold leading-none">{stock.symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{stock.name}</p>
            {stock.sector && (
              <span className="text-xs text-muted-foreground/80">• {stock.sector}</span>
            )}
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent className="pb-3 pt-2">
        {/* Price and Change */}
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-0.5">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                formatCurrency(stock.price!)
              )}
            </div>
            <div className="flex items-center text-xs">
              {isLoading ? (
                <span className="text-muted-foreground">--</span>
              ) : (
                <span className={cn(
                  "inline-flex items-center",
                  isPositive ? "text-success" : "text-danger"
                )}>
                  {isPositive ? 
                    <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  }
                  {formatCurrency(Math.abs(stock.change!))} ({formatPercentage(stock.changePercent!)})
                </span>
              )}
            </div>
          </div>
          
          {/* Chart in top right */}
          <div className="h-14 w-24 flex-shrink-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : priceHistory && priceHistory.length > 0 ? (
              <Sparkline 
                data={priceHistory} 
                color={isPositive ? 'rgb(var(--success))' : 'rgb(var(--danger))'}
              />
            ) : null}
          </div>
        </div>
        
        {/* Analysis Section - more compact */}
        <div className="space-y-1.5 pt-2 border-t border-amber-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Short-term:</span>
            <div>
              {(() => {
                if (isLoading) return <span className="text-xs text-muted-foreground">N/A</span>;
                
                // Mock recommendation logic based on stock symbol
                const recommendations = ['Buy', 'Hold', 'Sell'];
                const recommendationIndex = Math.abs(stock.symbol.charCodeAt(0)) % 3;
                const recommendation = recommendations[recommendationIndex];
                
                const getRecommendationColor = (rec: string) => {
                  switch(rec) {
                    case 'Buy': return 'bg-green-100 text-green-800 border-green-200';
                    case 'Sell': return 'bg-red-100 text-red-800 border-red-200';
                    case 'Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                    default: return 'bg-gray-100 text-gray-800 border-gray-200';
                  }
                };
                
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRecommendationColor(recommendation)}`}>
                    {recommendation}
                  </span>
                );
              })()}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Intrinsic Value:</span>
            <div className="text-right">
              {(() => {
                if (isLoading || stock.price === null) return <span className="text-xs text-muted-foreground">N/A</span>;
                
                // Mock intrinsic value - slightly different from current price
                const intrinsicMultiplier = 0.95 + (Math.abs(stock.symbol.charCodeAt(1)) % 20) / 100; // Between 0.95 and 1.15
                const intrinsicValue = stock.price * intrinsicMultiplier;
                
                return (
                  <div className="text-right">
                    <div className="text-xs font-medium">{formatCurrency(intrinsicValue)}</div>
                    <div className={`text-xs ${intrinsicValue > stock.price ? 'text-green-600' : 'text-red-600'}`}>
                      {intrinsicValue > stock.price ? 'Undervalued' : 'Overvalued'}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
