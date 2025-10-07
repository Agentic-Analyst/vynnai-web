
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
        "overflow-hidden transition-all duration-300 hover:shadow-md bg-card/50 backdrop-blur-sm",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold leading-none">{stock.symbol}</CardTitle>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{stock.name}</p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
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
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="text-muted-foreground">Volume:</div>
              <div className="text-right">
                {isLoading || stock.volume === null ? "N/A" : formatNumber(stock.volume)}
              </div>
              <div className="text-muted-foreground">Mkt Cap:</div>
              <div className="text-right">
                {isLoading || stock.marketCap === null ? "N/A" : formatNumber(stock.marketCap)}
              </div>
              <div className="text-muted-foreground">Updated:</div>
              <div className="text-right">
                {isLoading || !stock.lastUpdated ? "N/A" : formatDate(stock.lastUpdated)}
              </div>
            </div>
          </div>
          <div className="h-24">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : priceHistory && priceHistory.length > 0 ? (
              <Sparkline 
                data={priceHistory} 
                color={isPositive ? 'rgb(var(--success))' : 'rgb(var(--danger))'}
              />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
