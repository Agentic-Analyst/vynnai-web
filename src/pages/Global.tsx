
import React from 'react';
import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import { useMarketIndices, mockIndices } from '@/utils/stocksApi';
import { Globe } from 'lucide-react';

const Global = () => {
  const indices = useMarketIndices(mockIndices);
  
  const regions = [
    { name: 'North America', markets: ['United States', 'Canada'] },
    { name: 'Europe', markets: ['United Kingdom', 'Germany', 'France', 'Switzerland'] },
    { name: 'Asia-Pacific', markets: ['Japan', 'China', 'Hong Kong', 'Australia'] },
  ];
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Global Markets</h1>
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-card rounded-lg p-6 shadow">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">World Markets Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {regions.map((region) => (
              <div key={region.name} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{region.name}</h3>
                <ul className="space-y-2">
                  {region.markets.map((market) => {
                    const index = indices.find(i => i.region === market);
                    return (
                      <li key={market} className="flex justify-between items-center">
                        <span>{market}</span>
                        {index ? (
                          <span className={index.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Economic Calendar</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Time</th>
                  <th className="text-left py-2 px-4">Region</th>
                  <th className="text-left py-2 px-4">Event</th>
                  <th className="text-left py-2 px-4">Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">08:30 AM</td>
                  <td className="py-2 px-4">United States</td>
                  <td className="py-2 px-4">Non-Farm Payrolls</td>
                  <td className="py-2 px-4">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">High</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">10:00 AM</td>
                  <td className="py-2 px-4">Eurozone</td>
                  <td className="py-2 px-4">ECB Interest Rate Decision</td>
                  <td className="py-2 px-4">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">High</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">02:00 PM</td>
                  <td className="py-2 px-4">United Kingdom</td>
                  <td className="py-2 px-4">GDP (QoQ)</td>
                  <td className="py-2 px-4">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Medium</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Assessment & Market Cap - Combined Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Assessment */}
          <div className="bg-card rounded-lg p-5 shadow">
            <h2 className="text-lg font-semibold mb-3">Risk Assessment</h2>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Volatility</span>
                  <span className="text-yellow-500">Medium</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-yellow-500 h-1.5 rounded-full" style={{width: '65%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Correlation</span>
                  <span className="text-green-500">Low</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: '35%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Downside Risk</span>
                  <span className="text-green-500">Low</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: '40%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sharpe Ratio</span>
                  <span className="text-green-500">Good</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: '75%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Liquidity</span>
                  <span className="text-green-500">High</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Capitalization Distribution */}
          <div className="bg-card rounded-lg p-5 shadow">
            <h2 className="text-lg font-semibold mb-3">Market Cap Distribution</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Large Cap', value: 65, fill: '#3b82f6' },
                      { name: 'Mid Cap', value: 25, fill: '#10b981' },
                      { name: 'Small Cap', value: 10, fill: '#f59e0b' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={70}
                    dataKey="value"
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="bg-card rounded-lg p-5 shadow">
          <h2 className="text-lg font-semibold mb-3">Technical Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border rounded p-3">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">S&P 500</p>
                  <p className="text-xs text-muted-foreground">RSI: 68</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">BUY</span>
              </div>
              <p className="text-xs text-muted-foreground">MACD: Bullish</p>
            </div>
            <div className="border rounded p-3">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">Nasdaq</p>
                  <p className="text-xs text-muted-foreground">RSI: 72</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">BUY</span>
              </div>
              <p className="text-xs text-muted-foreground">MACD: Strong</p>
            </div>
            <div className="border rounded p-3">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">Dow Jones</p>
                  <p className="text-xs text-muted-foreground">RSI: 45</p>
                </div>
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">SELL</span>
              </div>
              <p className="text-xs text-muted-foreground">MACD: Bearish</p>
            </div>
            <div className="border rounded p-3">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-semibold text-sm">Russell 2000</p>
                  <p className="text-xs text-muted-foreground">RSI: 58</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">BUY</span>
              </div>
              <p className="text-xs text-muted-foreground">MACD: Positive</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Global;
