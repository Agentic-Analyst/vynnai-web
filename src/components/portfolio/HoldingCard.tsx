import React from 'react';
import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PortfolioData } from '@/hooks/usePortfolio';

interface HoldingCardProps {
  holding: PortfolioData;
  onEdit: (holding: PortfolioData) => void;
  onDelete: (holding: PortfolioData) => void;
}

export function HoldingCard({ holding, onEdit, onDelete }: HoldingCardProps) {
  const isGain = holding.gain >= 0;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{holding.symbol}</h3>
            <p className="text-sm text-muted-foreground truncate">{holding.name}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(holding)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(holding)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Shares</span>
            <span className="font-medium">{holding.shares}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="font-medium">${holding.currentPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Market Value</span>
            <span className="font-semibold">${holding.currentValue.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">Gain/Loss</span>
            <div className="flex items-center gap-1">
              {isGain ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <div className="text-right">
                <div className={`font-semibold ${isGain ? 'text-green-500' : 'text-red-500'}`}>
                  ${holding.gain.toFixed(2)}
                </div>
                <div className={`text-xs ${isGain ? 'text-green-500' : 'text-red-500'}`}>
                  ({isGain ? '+' : ''}{holding.gainPercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}