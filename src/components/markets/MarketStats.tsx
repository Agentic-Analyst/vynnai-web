import React, { useMemo } from 'react';
import { StatsCard } from '@/components/ui/StatsCard';
import { BarChart3, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  isRealTime?: boolean;
}

interface MarketStatsProps {
  stocks: Stock[];
  className?: string;
}

export function MarketStats({ stocks, className }: MarketStatsProps) {
  // Calculate market statistics from real-time data
  const marketStats = useMemo(() => {
    if (!stocks || stocks.length === 0) {
      return {
        totalMarketCap: 0,
        totalVolume: 0,
        topGainer: null,
        topLoser: null
      };
    }

    // Calculate totals
    const totalMarketCap = stocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0);
    const totalVolume = stocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);

    // Find top gainer and loser
    const validStocks = stocks.filter(stock => stock && stock.changePercent !== undefined);
    const topGainer = [...validStocks].sort((a, b) => b.changePercent - a.changePercent)[0];
    const topLoser = [...validStocks].sort((a, b) => a.changePercent - b.changePercent)[0];

    return {
      totalMarketCap,
      totalVolume,
      topGainer,
      topLoser
    };
  }, [stocks]);

  // Format large numbers
  const formatValue = (value: number | null | undefined, type: 'currency' | 'volume' = 'currency') => {
    if (!value || value === 0 || isNaN(value)) return type === 'volume' ? '0' : '$0';
    
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return type === 'volume' ? `${(value / 1e6).toFixed(2)}M` : `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return type === 'volume' ? `${(value / 1e3).toFixed(2)}K` : `$${(value / 1e3).toFixed(2)}K`;
    }
    return type === 'volume' ? value.toLocaleString() : `$${value.toLocaleString()}`;
  };

  // Calculate market cap trend (simplified - could be enhanced with historical data)
  const marketCapTrend = useMemo(() => {
    if (stocks.length === 0) return 0;
    const validStocks = stocks.filter(stock => stock && typeof stock.changePercent === 'number' && !isNaN(stock.changePercent));
    if (validStocks.length === 0) return 0;
    const avgChangePercent = validStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / validStocks.length;
    return avgChangePercent;
  }, [stocks]);

  const { totalMarketCap, totalVolume, topGainer, topLoser } = marketStats;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Market Cap" 
          value={totalMarketCap > 0 ? formatValue(totalMarketCap) : 'N/A'}
          trend={totalMarketCap > 0 ? marketCapTrend : undefined}
          icon={<Wallet2 />}
          className="bg-primary/5"
        />
        <StatsCard 
          title="Trading Volume" 
          value={totalVolume > 0 ? formatValue(totalVolume, 'volume') : 'N/A'}
          description={totalVolume > 0 ? "Today's volume" : "No data"}
          icon={<BarChart3 />}
          className="bg-primary/5"
        />
        <StatsCard 
          title="Top Gainer" 
          value={topGainer?.symbol || 'N/A'}
          trend={topGainer?.changePercent}
          trendLabel={topGainer?.name}
          icon={<TrendingUp />}
          className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        />
        <StatsCard 
          title="Top Loser" 
          value={topLoser?.symbol || 'N/A'}
          trend={topLoser?.changePercent}
          trendLabel={topLoser?.name}
          icon={<TrendingDown />}
          className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
        />
      </div>
    </div>
  );
}