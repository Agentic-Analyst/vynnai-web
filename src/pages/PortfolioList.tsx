import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit2, Trash2, TrendingUp, TrendingDown, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { usePortfolios, PortfolioSummary } from '@/hooks/usePortfolios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { PortfolioModal } from '@/components/portfolio/PortfolioModal';
import { DeleteConfirmation } from '@/components/portfolio/DeleteConfirmation';

type SortField = 'name' | 'totalValue' | 'totalGain' | 'totalGainPercent' | 'holdingsCount' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const PortfolioList = () => {
  const navigate = useNavigate();
  const { portfolios, createPortfolio, updatePortfolio, deletePortfolio, getPortfolioSummaries } = usePortfolios();
  const { toast } = useToast();

  // State for modals and UI
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [deletingPortfolio, setDeletingPortfolio] = useState<PortfolioSummary | null>(null);

  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const portfolioSummaries = getPortfolioSummaries();

  // Filter and sort portfolios
  const filteredAndSortedPortfolios = useMemo(() => {
    let filtered = portfolioSummaries.filter(portfolio => 
      portfolio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (portfolio.description && portfolio.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort portfolios
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle date fields
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [portfolioSummaries, searchQuery, sortField, sortDirection]);

  // Modal handlers
  const handleCreatePortfolio = (name: string, description?: string) => {
    const portfolioId = createPortfolio(name, description);
    console.log('Created portfolio with ID:', portfolioId);
    
    toast({
      title: 'Success',
      description: `Portfolio "${name}" created successfully`,
    });
    
    // Navigate to the new portfolio
    navigate(`/dashboard/portfolio/${portfolioId}`);
  };

  const handleEditPortfolio = (portfolio: PortfolioSummary) => {
    setEditingPortfolio({
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePortfolio = (id: string, name: string, description?: string) => {
    updatePortfolio(id, { name, description });
    toast({
      title: 'Success',
      description: `Portfolio "${name}" updated successfully`,
    });
  };

  const handleDeletePortfolio = (portfolio: PortfolioSummary) => {
    setDeletingPortfolio(portfolio);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingPortfolio) {
      deletePortfolio(deletingPortfolio.id);
      toast({
        title: 'Success',
        description: `Portfolio "${deletingPortfolio.name}" deleted successfully`,
      });
    }
    setIsDeleteDialogOpen(false);
    setDeletingPortfolio(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Portfolios</h1>
          <p className="text-muted-foreground mt-1">
            Manage your investment portfolios
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search portfolios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="totalValue">Total Value</SelectItem>
              <SelectItem value="totalGain">Total Gain/Loss</SelectItem>
              <SelectItem value="totalGainPercent">Gain %</SelectItem>
              <SelectItem value="holdingsCount">Holdings Count</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="updatedAt">Updated Date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="px-3"
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Portfolio Cards/List */}
      {filteredAndSortedPortfolios.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No portfolios found' : 'No portfolios yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : 'Create your first portfolio to start tracking your investments'
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 mx-auto">
                    <Plus className="h-4 w-4" />
                    Create Your First Portfolio
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPortfolios.map((portfolio) => (
            <Card key={portfolio.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle 
                      className="text-lg mb-1 hover:text-primary"
                      onClick={() => navigate(`/dashboard/portfolio/${portfolio.id}`)}
                    >
                      {portfolio.name}
                    </CardTitle>
                    {portfolio.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {portfolio.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPortfolio(portfolio);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => navigate(`/dashboard/portfolio/${portfolio.id}`)}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold text-lg">{formatCurrency(portfolio.totalValue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gain/Loss</span>
                    <div className="flex items-center gap-1">
                      {portfolio.totalGain >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`font-semibold ${portfolio.totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(portfolio.totalGain)} ({portfolio.totalGain >= 0 ? '+' : ''}{portfolio.totalGainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>{portfolio.holdingsCount} holdings</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(portfolio.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <PortfolioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreatePortfolio}
        title="Create New Portfolio"
      />

      <PortfolioModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPortfolio(null);
        }}
        onSave={handleCreatePortfolio}
        onUpdate={handleUpdatePortfolio}
        editingPortfolio={editingPortfolio}
        title="Edit Portfolio"
      />

      <DeleteConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingPortfolio(null);
        }}
        onConfirm={handleConfirmDelete}
        holdingSymbol={deletingPortfolio?.name || ''}
      />
    </div>
  );
};

export default PortfolioList;