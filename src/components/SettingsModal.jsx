import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Settings, Trash2, LogOut, User } from "lucide-react"
import { userStorage } from '@/lib/userStorage'
import { authApi } from '@/lib/authApi'

const SettingsModal = ({ 
  analysisParams,
  setAnalysisParams 
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = userStorage.getCurrentUser();
  
  const updateAnalysisParam = (key, value) => {
    setAnalysisParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  // Special handler for percentage fields - converts UI percentage to API decimal
  const updatePercentageParam = (key, value) => {
    if (value === '' || value === undefined || parseFloat(value) <= 0) {
      setAnalysisParams(prev => ({
        ...prev,
        [key]: undefined
      }));
    } else {
      // Convert percentage to decimal (e.g., 2.5% -> 0.025)
      const decimalValue = parseFloat(value) / 100;
      setAnalysisParams(prev => ({
        ...prev,
        [key]: decimalValue
      }));
    }
  };

  // Helper to display percentage values (converts API decimal back to UI percentage)
  const getPercentageDisplayValue = (key) => {
    const value = analysisParams[key];
    if (value === undefined || value === null) return '';
    // Convert decimal back to percentage for display (e.g., 0.025 -> 2.5)
    // Round to 2 decimal places to avoid overflow
    return (Math.round(value * 100 * 100) / 100).toString();
  };

  const clearAnalysisParam = (key) => {
    setAnalysisParams(prev => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  const clearAllAnalysisParams = () => {
    setAnalysisParams({});
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      // The page will automatically refresh due to auth state change
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Open settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analysis Settings</DialogTitle>
          <DialogDescription>
            Configure optional parameters for Vynn AI stock analysis. Leave empty to use API defaults.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Analysis Parameters Section */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Optional Analysis Parameters</h3>
              <p className="text-sm text-muted-foreground">
                These parameters will be applied to all analysis requests. Only the ticker symbol is required from chat input.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllAnalysisParams}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>

            <div className="grid gap-6">
              {/* Pipeline Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis Pipeline</CardTitle>
                  <CardDescription>Choose the type of analysis to perform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pipeline">Pipeline Type</Label>
                      <Select 
                        value={analysisParams.pipeline || 'default'} 
                        onValueChange={(value) => updateAnalysisParam('pipeline', value === 'default' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Use API Default</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive - Full analysis</SelectItem>
                          <SelectItem value="financial-statements">Get Financial Statements - Income statement, balance sheet, cash flow</SelectItem>
                          <SelectItem value="financial-model">Build Financial Model - Financial statements and modeling</SelectItem>
                          <SelectItem value="search-news">Search Financial News - Relevant news articles for the company</SelectItem>
                          <SelectItem value="screen-news">Screen Financial News - Catalyst, risk and mitigation analysis</SelectItem>
                          <SelectItem value="news-to-price">News to Price - Analyze impact of news on stock price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="strategy">Analysis Strategy</Label>
                      <Select 
                        value={analysisParams.strategy || 'default'} 
                        onValueChange={(value) => updateAnalysisParam('strategy', value === 'default' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select strategy (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Use API Default</SelectItem>
                          <SelectItem value="conservative">Conservative - Lower risk</SelectItem>
                          <SelectItem value="moderate">Moderate - Balanced</SelectItem>
                          <SelectItem value="aggressive">Aggressive - Growth focused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Modeling */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Modeling</CardTitle>
                  <CardDescription>Configure DCF and valuation parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="model">Model Type</Label>
                      <Select 
                        value={analysisParams.model || 'default'} 
                        onValueChange={(value) => updateAnalysisParam('model', value === 'default' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Use API Default</SelectItem>
                          <SelectItem value="dcf">DCF - Discounted Cash Flow</SelectItem>
                          <SelectItem value="comparable">Comparable - Company analysis</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive - Combined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="years">Projection Years</Label>
                      <Input
                        id="years"
                        type="number"
                        min="3"
                        max="10"
                        value={analysisParams.years || ''}
                        onChange={(e) => updateAnalysisParam('years', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="scaling">Revenue Scaling</Label>
                      <Select 
                        value={analysisParams.scaling || 'default'} 
                        onValueChange={(value) => updateAnalysisParam('scaling', value === 'default' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select scaling (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Use API Default</SelectItem>
                          <SelectItem value="conservative">Conservative - 10-15%</SelectItem>
                          <SelectItem value="moderate">Moderate - 15-25%</SelectItem>
                          <SelectItem value="aggressive">Aggressive - 25%+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="term_growth">Terminal Growth Rate (%)</Label>
                      <Input
                        id="term_growth"
                        type="number"
                        min="0.1"
                        max="500.0"
                        step="0.1"
                        value={getPercentageDisplayValue('term_growth')}
                        onChange={(e) => updatePercentageParam('term_growth', e.target.value)}
                        placeholder="e.g., 2.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="wacc">WACC - Discount Rate (%)</Label>
                      <Input
                        id="wacc"
                        type="number"
                        min="0.1"
                        max="100.0"
                        step="0.1"
                        value={getPercentageDisplayValue('wacc')}
                        onChange={(e) => updatePercentageParam('wacc', e.target.value)}
                        placeholder="e.g., 8.0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adjustment_cap">Max Price Adjustment (%)</Label>
                      <Input
                        id="adjustment_cap"
                        type="number"
                        min="0.1"
                        max="100.0"
                        step="0.1"
                        value={getPercentageDisplayValue('adjustment_cap')}
                        onChange={(e) => updatePercentageParam('adjustment_cap', e.target.value)}
                        placeholder="e.g., 20.0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Article Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Article Analysis</CardTitle>
                  <CardDescription>Configure news and article processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_searched">Maximum Searched Articles</Label>
                      <Input
                        id="max_searched"
                        type="number"
                        min="10"
                        max="100"
                        value={analysisParams.max_searched || ''}
                        onChange={(e) => updateAnalysisParam('max_searched', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 30"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max_filtered">Max Filtered Articles</Label>
                      <Input
                        id="max_filtered"
                        type="number"
                        min="5"
                        max="50"
                        value={analysisParams.max_filtered || ''}
                        onChange={(e) => updateAnalysisParam('max_filtered', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 15"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min_score">Min Relevance Score (0.1-0.9)</Label>
                      <Input
                        id="min_score"
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={analysisParams.min_score || ''}
                        onChange={(e) => updateAnalysisParam('min_score', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 0.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="min_confidence">Min Confidence (0.1-0.9)</Label>
                      <Input
                        id="min_confidence"
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={analysisParams.min_confidence || ''}
                        onChange={(e) => updateAnalysisParam('min_confidence', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 0.6"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Parameters Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Configuration</CardTitle>
                  <CardDescription>Preview of parameters that will be sent to API</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {Object.keys(analysisParams).length > 0 
                        ? JSON.stringify(analysisParams, null, 2)
                        : "No parameters configured - using API defaults"
                      }
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          
          {/* Account & Security Section - Updated */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Account & Security
            </h3>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Signed in as</p>
                        <p className="text-sm text-slate-600">{currentUser || 'No user signed in'}</p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={isLoggingOut}
                        >
                          <LogOut className="h-4 w-4" />
                          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign Out Confirmation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to sign out? This will clear all your local data and you'll need to sign in again to access your analysis history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isLoggingOut}
                          >
                            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <Settings className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Data Privacy</h4>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          Your analysis parameters and conversation history are stored locally in your browser. 
                          Signing out will clear all this data. Your login credentials are managed securely by our authentication system.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal;