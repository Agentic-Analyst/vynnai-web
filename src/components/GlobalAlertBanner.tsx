import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGlobalAlerts, GlobalAlert } from '@/contexts/GlobalAlertsContext';
import { AlertTriangle, X, TrendingDown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GlobalAlertBanner() {
  const { alerts, dismissAlert, markAsRead } = useGlobalAlerts();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<GlobalAlert | null>(null);
  const [shownAlertIds, setShownAlertIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shownGlobalAlerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const navigate = useNavigate();

  // Get the first high-impact alert (unread for auto-popup, but keep banner for read ones too)
  const criticalAlertForBanner = alerts.find(a => a.impact === 'high');
  const criticalAlertUnread = alerts.find(a => !a.read && a.impact === 'high');

  // Auto-popup dialog when a new critical alert appears
  useEffect(() => {
    if (criticalAlertUnread && !shownAlertIds.has(criticalAlertUnread.id) && !showDialog) {
      setSelectedAlert(criticalAlertUnread);
      setShowDialog(true);
      // Mark as read when auto-showing
      markAsRead(criticalAlertUnread.id);
      // Track that we've shown this alert
      setShownAlertIds(prev => {
        const next = new Set(prev);
        next.add(criticalAlertUnread.id);
        try {
          localStorage.setItem('shownGlobalAlerts', JSON.stringify([...next]));
        } catch (e) {
          console.error('Failed to save shown alerts:', e);
        }
        return next;
      });
    }
  }, [criticalAlertUnread?.id]); // Only trigger when alert ID changes (new alert)

  const handleViewDetails = (alert: GlobalAlert) => {
    setSelectedAlert(alert);
    setShowDialog(true);
    markAsRead(alert.id);
  };

  const handleDismiss = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissAlert(alertId);
  };

  const handleGoToNews = () => {
    navigate('/dashboard/news');
  };

  if (!criticalAlertForBanner) {
    return null;
  }

  const alertTypeConfig = {
    critical: {
      bgColor: 'bg-gradient-to-r from-red-600 to-red-700',
      borderColor: 'border-red-700',
      textColor: 'text-white',
      icon: AlertTriangle,
      iconBg: 'bg-red-800',
    },
    warning: {
      bgColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
      borderColor: 'border-orange-600',
      textColor: 'text-white',
      icon: AlertTriangle,
      iconBg: 'bg-orange-700',
    },
    info: {
      bgColor: 'bg-gradient-to-r from-slate-800 to-slate-900',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-100',
      icon: AlertTriangle,
      iconBg: 'bg-slate-950',
    },
  };

  const config = alertTypeConfig[criticalAlertForBanner.type];
  const Icon = config.icon;

  return (
    <>
      {/* Global Alert Banner - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
        <div className={cn(
          "border-b-2",
          config.bgColor,
          config.borderColor
        )}>
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-full flex-shrink-0",
                config.iconBg
              )}>
                <Icon className="h-5 w-5 text-white animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("font-bold text-lg", config.textColor)}>
                        🚨 CRITICAL MARKET ALERT
                      </h3>
                      <Badge 
                        variant="secondary" 
                        className="bg-white/20 text-white border-white/30 uppercase text-xs font-bold"
                      >
                        {criticalAlertForBanner.impact} IMPACT
                      </Badge>
                    </div>
                    <p className={cn("font-semibold mb-2", config.textColor)}>
                      {criticalAlertForBanner.title}
                    </p>
                    <p className={cn("text-sm mb-3 line-clamp-2", config.textColor, "opacity-95")}>
                      {criticalAlertForBanner.message}
                    </p>
                    
                    {/* Affected Symbols */}
                    {criticalAlertForBanner.affectedSymbols.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="h-4 w-4 text-white/80" />
                        <span className="text-sm text-white/90 font-medium">Affected:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {criticalAlertForBanner.affectedSymbols.slice(0, 8).map(symbol => (
                            <Badge 
                              key={symbol} 
                              variant="secondary"
                              className="bg-white/25 text-white border-white/40 text-xs font-bold hover:bg-white/35 cursor-pointer"
                              onClick={() => navigate(`/stocks?symbol=${symbol}`)}
                            >
                              {symbol}
                            </Badge>
                          ))}
                          {criticalAlertForBanner.affectedSymbols.length > 8 && (
                            <Badge 
                              variant="secondary"
                              className="bg-white/25 text-white border-white/40 text-xs"
                            >
                              +{criticalAlertForBanner.affectedSymbols.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDetails(criticalAlertForBanner)}
                        className="bg-white text-red-700 hover:bg-white/90 font-semibold h-8 shadow-lg"
                      >
                        View Full Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGoToNews}
                        className="text-white hover:bg-white/20 h-8"
                      >
                        Go to News →
                      </Button>
                      <div className="flex items-center gap-1.5 text-white/80 text-xs ml-auto">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(criticalAlertForBanner.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDismiss(criticalAlertForBanner.id, e)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          {selectedAlert && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    selectedAlert.type === 'critical' && "bg-red-100",
                    selectedAlert.type === 'warning' && "bg-orange-100",
                    selectedAlert.type === 'info' && "bg-blue-100"
                  )}>
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      selectedAlert.type === 'critical' && "text-red-600",
                      selectedAlert.type === 'warning' && "text-orange-600",
                      selectedAlert.type === 'info' && "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedAlert.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn(
                        selectedAlert.impact === 'high' && "border-red-300 text-red-700 bg-red-50",
                        selectedAlert.impact === 'medium' && "border-orange-300 text-orange-700 bg-orange-50",
                        selectedAlert.impact === 'low' && "border-blue-300 text-blue-700 bg-blue-50"
                      )}>
                        {selectedAlert.impact.toUpperCase()} IMPACT
                      </Badge>
                      <span>•</span>
                      <Badge variant="outline">{selectedAlert.category}</Badge>
                      <span>•</span>
                      <span className="text-xs">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Alert Details</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedAlert.message}
                  </p>
                </div>

                {/* Source Information */}
                {selectedAlert.sourceUrl && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Source:</span>
                    <a 
                      href={selectedAlert.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline ml-2 break-all block mt-1"
                    >
                      {selectedAlert.sourceUrl}
                    </a>
                  </div>
                )}

                {selectedAlert.affectedSymbols.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Affected Securities ({selectedAlert.affectedSymbols.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlert.affectedSymbols.map(symbol => (
                        <Badge 
                          key={symbol} 
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => {
                            navigate(`/stocks?symbol=${symbol}`);
                            setShowDialog(false);
                          }}
                        >
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-between items-center border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleGoToNews();
                      setShowDialog(false);
                    }}
                  >
                    View All News & Alerts
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      dismissAlert(selectedAlert.id);
                      setShowDialog(false);
                    }}
                  >
                    Dismiss Alert
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
