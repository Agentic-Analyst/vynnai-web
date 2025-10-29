import React from 'react';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Calendar } from 'lucide-react';

/**
 * Market Status Test Component
 * 
 * This component displays detailed market status information for testing purposes.
 * It shows the current Eastern Time, market status, and time until next event.
 * 
 * Usage: Import and render this component anywhere in your app to test market status.
 */
export function MarketStatusTest() {
  const marketStatus = useMarketStatus();
  const [currentET, setCurrentET] = React.useState('');
  const [localTime, setLocalTime] = React.useState('');
  const [showDetailed, setShowDetailed] = React.useState(false);

  React.useEffect(() => {
    const updateET = () => {
      const now = new Date();
      const etTime = now.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      setCurrentET(etTime);
    };

    updateET();
    const interval = setInterval(updateET, 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const updateLocalTime = () => {
      setLocalTime(new Date().toLocaleString());
    };

    updateLocalTime();
    const interval = setInterval(updateLocalTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Market Status Test</h1>
        <p className="text-muted-foreground">
          Testing the real-time US stock market status indicator
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
        {/* Current Market Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Status
              </CardTitle>
              <Badge 
                variant={marketStatus.isOpen ? "default" : "secondary"}
                className={marketStatus.isOpen ? "bg-green-500" : ""}
              >
                {marketStatus.isOpen ? "OPEN" : "CLOSED"}
              </Badge>
            </div>
            <CardDescription>NYSE/NASDAQ Trading Status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-semibold">{marketStatus.statusText}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {marketStatus.nextEvent === 'open' ? 'Opens' : 'Closes'}
              </p>
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="text-lg font-medium hover:underline cursor-pointer text-left"
                title="Click to toggle between estimated and detailed time"
              >
                {showDetailed ? marketStatus.timeUntilChangeDetailed : marketStatus.timeUntilChange}
              </button>
              <p className="text-xs text-muted-foreground mt-1">
                (Click to toggle detailed/estimated)
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    marketStatus.isOpen 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-gray-400'
                  }`} 
                />
                <p className="text-sm">
                  {marketStatus.isOpen 
                    ? 'Currently accepting trades' 
                    : 'Trading suspended'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Information
            </CardTitle>
            <CardDescription>Current times and trading hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Your Local Time</p>
              <p className="text-lg font-medium font-mono">
                {localTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Eastern Time (ET)</p>
              <p className="text-lg font-medium font-mono">{currentET}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Trading Hours</p>
              <div className="space-y-1 text-sm">
                <p>🕐 Open: 9:30 AM ET</p>
                <p>🕓 Close: 4:00 PM ET</p>
                <p>📅 Days: Monday - Friday</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            About This Feature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">✅ Timezone Support</p>
            <p className="text-muted-foreground">
              Works for users in any timezone worldwide. Your local time is automatically 
              converted to Eastern Time for accurate market status.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">✅ Holiday Awareness</p>
            <p className="text-muted-foreground">
              Automatically accounts for US market holidays including New Year's Day, 
              MLK Day, Presidents' Day, Good Friday, Memorial Day, Juneteenth, 
              Independence Day, Labor Day, Thanksgiving, and Christmas.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">✅ Real-time Updates</p>
            <p className="text-muted-foreground">
              Status updates automatically every second with detailed countdown timer showing 
              hours, minutes, and seconds. Click the countdown to toggle between estimated 
              (hours only) and detailed (hours, minutes, seconds) display modes.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">✅ Docker Compatible</p>
            <p className="text-muted-foreground">
              All calculations happen in the browser using the user's system time, 
              so it works perfectly in containerized deployments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Raw data from useMarketStatus hook</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{JSON.stringify(marketStatus, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
