import React from 'react';
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
import { Settings, Trash2 } from "lucide-react"

const SettingsModal = ({ 
  analysisParams,
  setAnalysisParams 
}) => {
  
  const updateAnalysisParam = (key, value) => {
    setAnalysisParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
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
                          <SelectItem value="financial-only">Financial Only - Data and modeling</SelectItem>
                          <SelectItem value="model-only">Model Only - Pure modeling</SelectItem>
                          <SelectItem value="news-only">News Only - Sentiment analysis</SelectItem>
                          <SelectItem value="model-to-price">Model to Price - Price targets</SelectItem>
                          <SelectItem value="news-to-price">News to Price - Price impact</SelectItem>
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
                        min="1.0"
                        max="4.0"
                        step="0.1"
                        value={analysisParams.term_growth || ''}
                        onChange={(e) => updateAnalysisParam('term_growth', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 2.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="wacc">WACC - Discount Rate (%)</Label>
                      <Input
                        id="wacc"
                        type="number"
                        min="5.0"
                        max="15.0"
                        step="0.1"
                        value={analysisParams.wacc || ''}
                        onChange={(e) => updateAnalysisParam('wacc', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 8.0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adjustment_cap">Max Price Adjustment (%)</Label>
                      <Input
                        id="adjustment_cap"
                        type="number"
                        min="5.0"
                        max="50.0"
                        step="1.0"
                        value={analysisParams.adjustment_cap || ''}
                        onChange={(e) => updateAnalysisParam('adjustment_cap', e.target.value ? parseFloat(e.target.value) : undefined)}
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
                      <Label htmlFor="max_articles">Maximum Articles</Label>
                      <Input
                        id="max_articles"
                        type="number"
                        min="10"
                        max="100"
                        value={analysisParams.max_articles || ''}
                        onChange={(e) => updateAnalysisParam('max_articles', e.target.value ? parseInt(e.target.value) : undefined)}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal;