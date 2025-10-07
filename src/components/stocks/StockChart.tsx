
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { generatePriceHistory, useHistoricalData, type Timeframe } from '@/utils/stocksApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeRanges: Array<{ label: string; timeframe: Timeframe; days: number }> = [
  { label: '1D', timeframe: '1D', days: 1 },
  { label: '1W', timeframe: '1W', days: 7 },
  { label: '1M', timeframe: '1M', days: 30 },
  { label: '3M', timeframe: '3M', days: 90 },
  { label: '1Y', timeframe: '1Y', days: 365 },
  { label: 'All', timeframe: 'ALL', days: 1825 },
];

interface StockChartProps {
  symbol: string;
  name: string;
  currentPrice: number;
  volatility?: number;
  className?: string;
}

export function StockChart({ 
  symbol, 
  name,
  currentPrice,
  volatility = 2,
  className
}: StockChartProps) {
  const [selectedRange, setSelectedRange] = useState(timeRanges[2]); // Default to 1M
  
  // Fetch real historical data from API
  const { data: historicalData, loading, error } = useHistoricalData(symbol, selectedRange.timeframe);
  
  const chartData = useMemo(() => {
    // If we have real historical data, use it
    if (historicalData && historicalData.length > 0) {
      return historicalData.map((point, index) => {
        const date = new Date(point.timestamp);
        return {
          date: date.toLocaleDateString('en-US', { 
            month: selectedRange.days > 90 ? 'short' : 'numeric', 
            day: 'numeric',
            ...(selectedRange.days > 365 ? { year: '2-digit' } : {})
          }),
          price: point.price,
          volume: point.volume,
          timestamp: point.timestamp
        };
      });
    }
    
    // Fallback to generated mock data if no real data is available
    console.log(`📊 Using fallback mock data for ${symbol} (${selectedRange.label}) - Historical API unavailable`);
    const prices = generatePriceHistory(selectedRange.days, currentPrice, volatility);
    const data = [];
    
    // Calculate dates going backward from today
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < prices.length; i++) {
      const date = new Date(now.getTime() - (selectedRange.days - i) * msPerDay);
      data.push({
        date: date.toLocaleDateString('en-US', { 
          month: selectedRange.days > 90 ? 'short' : 'numeric', 
          day: 'numeric',
          year: selectedRange.days > 90 ? '2-digit' : undefined
        }),
        price: prices[i]
      });
    }
    
    return data;
  }, [historicalData, selectedRange, currentPrice, volatility, loading, error]);
  
  // Calculate min and max for Y axis with some padding
  const minPrice = Math.min(...chartData.map(d => d.price)) * 0.98;
  const maxPrice = Math.max(...chartData.map(d => d.price)) * 1.02;
  
  const formatYAxis = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  // Show loading state
  if (loading) {
    return (
      <Card className={cn("overflow-hidden h-full flex flex-col", className)}>
        <CardHeader className="flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="leading-none">{symbol}</CardTitle>
            <p className="text-sm text-muted-foreground">{name}</p>
          </div>
          <div className="flex gap-1">
            {timeRanges.map((range) => (
              <Button 
                key={range.label} 
                variant={selectedRange.label === range.label ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedRange(range)}
                className="h-7 px-2 text-xs"
                disabled={loading}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading historical data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show data source indicator
  const isUsingRealData = historicalData && historicalData.length > 0;
  
  return (
    <Card className={cn("overflow-hidden h-full flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="leading-none flex items-center gap-2">
            {symbol}
            {isUsingRealData ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Live Data</span>
            ) : (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Disconnected</span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{name}</p>
          {error && (
            <p className="text-xs text-red-500 mt-1">Failed to load historical data</p>
          )}
        </div>
        <div className="flex gap-1">
          {timeRanges.map((range) => (
            <Button 
              key={range.label} 
              variant={selectedRange.label === range.label ? "default" : "outline"} 
              size="sm"
              onClick={() => setSelectedRange(range)}
              className="h-7 px-2 text-xs"
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4 flex-1">
        <div className="h-full min-h-[300px] w-full px-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="hsl(var(--border))" 
              />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                tickMargin={10}
                interval={Math.floor(chartData.length / Math.max(1, Math.floor(selectedRange.days / 10)))}
              />
              <YAxis 
                domain={[minPrice, maxPrice]} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                tickMargin={10}
                tickFormatter={formatYAxis}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#colorPrice)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
