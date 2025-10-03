import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
  onUpdate?: (id: string, name: string, description?: string) => void;
  editingPortfolio?: {
    id: string;
    name: string;
    description?: string;
  } | null;
  title: string;
}

export function PortfolioModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editingPortfolio,
  title,
}: PortfolioModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPortfolio) {
      setName(editingPortfolio.name);
      setDescription(editingPortfolio.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setErrors({});
  }, [editingPortfolio, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Portfolio name is required';
    }

    if (name.trim().length > 50) {
      newErrors.name = 'Portfolio name must be 50 characters or less';
    }

    if (description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (editingPortfolio && onUpdate) {
      onUpdate(editingPortfolio.id, name.trim(), description.trim() || undefined);
    } else {
      onSave(name.trim(), description.trim() || undefined);
    }

    onClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Portfolio Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Growth Portfolio, Dividend Stocks"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your portfolio strategy..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/200 characters
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingPortfolio ? 'Update Portfolio' : 'Create Portfolio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}