import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { mockNews, NewsItem, formatDate } from '@/utils/stocksApi';
import { cn } from '@/lib/utils';
import { 
  NewspaperIcon, 
  Search, 
  ExternalLink, 
  Clock,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';

export function NewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter news based on search query and category
  const filteredNews = mockNews.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
                         item.title.toLowerCase().includes(searchLower) ||
                         item.summary.toLowerCase().includes(searchLower) ||
                         item.source.toLowerCase().includes(searchLower) ||
                         item.relatedSymbols?.some(symbol => 
                           symbol.toLowerCase().includes(searchLower)
                         );
    
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'stocks' && item.relatedSymbols && item.relatedSymbols.length > 0) ||
                           (selectedCategory === 'markets' && (!item.relatedSymbols || item.relatedSymbols.length === 0));
    
    return matchesSearch && matchesCategory;
  });

  const handleNewsClick = (newsItem: NewsItem) => {
    // Mock URL - will be replaced with real URL from websocket later
    const mockUrl = `https://example.com/news/${newsItem.id}`;
    window.open(mockUrl, '_blank', 'noopener,noreferrer');
  };

  const categories = [
    { id: 'all', label: 'All News', count: mockNews.length },
    { id: 'stocks', label: 'Stock News', count: mockNews.filter(n => n.relatedSymbols && n.relatedSymbols.length > 0).length },
    { id: 'markets', label: 'Market News', count: mockNews.filter(n => !n.relatedSymbols || n.relatedSymbols.length === 0).length }
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <NewspaperIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Market News Feed</h1>
      </div>

            {/* Search Bar */}
            <div className="mb-6 animate-slide-up" style={{ '--delay': '100ms' } as React.CSSProperties}>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search news, stocks, sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6 animate-slide-up" style={{ '--delay': '200ms' } as React.CSSProperties}>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  <Filter className="h-3 w-3" />
                  {category.label}
                  <Badge variant="secondary" className="ml-1">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>

            {/* News Feed */}
            <div className="space-y-4 animate-slide-up" style={{ '--delay': '300ms' } as React.CSSProperties}>
              {filteredNews.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <NewspaperIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No news found</p>
                    <p>Try adjusting your search terms or filters.</p>
                  </div>
                </Card>
              ) : (
                filteredNews.map((newsItem, index) => (
                  <Card 
                    key={newsItem.id} 
                    className={cn(
                      "overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary",
                      "animate-slide-up"
                    )}
                    style={{ '--delay': `${400 + index * 50}ms` } as React.CSSProperties}
                    onClick={() => handleNewsClick(newsItem)}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        {/* Image */}
                        {newsItem.imageUrl && (
                          <div className="lg:w-64 lg:flex-shrink-0">
                            <div className="h-48 lg:h-full relative overflow-hidden">
                              <img 
                                src={newsItem.imageUrl} 
                                alt={newsItem.title}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                {newsItem.title}
                              </h2>
                              <p className="text-muted-foreground mb-4 line-clamp-3">
                                {newsItem.summary}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground ml-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(newsItem.publishedAt)}
                              </div>
                              <span className="text-sm font-medium text-primary">
                                {newsItem.source}
                              </span>
                            </div>
                            
                            {/* Related Symbols */}
                            {newsItem.relatedSymbols && newsItem.relatedSymbols.length > 0 && (
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                <div className="flex gap-1">
                                  {newsItem.relatedSymbols.map((symbol) => (
                                    <Badge 
                                      key={symbol} 
                                      variant="outline" 
                                      className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                      {symbol}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Load More Button (for future pagination) */}
            {filteredNews.length > 0 && (
              <div className="text-center mt-8 animate-slide-up" style={{ '--delay': '600ms' } as React.CSSProperties}>
                <Button variant="outline" size="lg" className="gap-2">
                  <NewspaperIcon className="h-4 w-4" />
                  Load More News
                </Button>
              </div>
            )}
    </div>
  );
}