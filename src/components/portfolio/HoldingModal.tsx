import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PortfolioHolding } from '@/hooks/usePortfolio';

interface HoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: Omit<PortfolioHolding, 'id' | 'dateAdded'>) => void;
  onUpdate: (id: string, updates: Partial<PortfolioHolding>) => void;
  editingHolding?: PortfolioHolding | null;
  title: string;
}

export function HoldingModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate, 
  editingHolding, 
  title 
}: HoldingModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    shares: '',
    costBasis: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (editingHolding) {
      setFormData({
        symbol: editingHolding.symbol,
        shares: editingHolding.shares.toString(),
        costBasis: editingHolding.costBasis.toString(),
      });
    } else {
      setFormData({
        symbol: '',
        shares: '',
        costBasis: '',
      });
    }
    setErrors({});
  }, [editingHolding, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    } else if (!/^[A-Z0-9]{1,10}$/i.test(formData.symbol.trim())) {
      newErrors.symbol = 'Symbol must be 1-10 characters (letters/numbers)';
    }

    if (!formData.shares.trim()) {
      newErrors.shares = 'Shares is required';
    } else {
      const shares = parseFloat(formData.shares);
      if (isNaN(shares) || shares <= 0) {
        newErrors.shares = 'Shares must be a positive number';
      }
    }

    if (!formData.costBasis.trim()) {
      newErrors.costBasis = 'Cost basis is required';
    } else {
      const costBasis = parseFloat(formData.costBasis);
      if (isNaN(costBasis) || costBasis <= 0) {
        newErrors.costBasis = 'Cost basis must be a positive number';
      }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const holdingData = {
      symbol: formData.symbol.toUpperCase(),
      shares: parseFloat(formData.shares),
      costBasis: parseFloat(formData.costBasis),
    };

    try {
      if (editingHolding) {
        onUpdate(editingHolding.id, holdingData);
        toast({
          title: 'Success',
          description: 'Holding updated successfully',
        });
      } else {
        onSave(holdingData);
        toast({
          title: 'Success',
          description: 'Holding added successfully',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save holding',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
              className={errors.symbol ? 'border-red-500' : ''}
            />
            {errors.symbol && (
              <p className="text-sm text-red-500">{errors.symbol}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shares">Number of Shares</Label>
            <Input
              id="shares"
              type="number"
              step="0.001"
              placeholder="e.g., 10"
              value={formData.shares}
              onChange={(e) => handleInputChange('shares', e.target.value)}
              className={errors.shares ? 'border-red-500' : ''}
            />
            {errors.shares && (
              <p className="text-sm text-red-500">{errors.shares}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="costBasis">Cost Basis (per share)</Label>
            <Input
              id="costBasis"
              type="number"
              step="0.01"
              placeholder="e.g., 150.75"
              value={formData.costBasis}
              onChange={(e) => handleInputChange('costBasis', e.target.value)}
              className={errors.costBasis ? 'border-red-500' : ''}
            />
            {errors.costBasis && (
              <p className="text-sm text-red-500">{errors.costBasis}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingHolding ? 'Update' : 'Add'} Holding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}