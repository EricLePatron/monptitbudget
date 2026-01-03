import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CategorySelectorProps {
  categories: ExpenseCategory[];
  selectedCategory?: string;
  onSelectCategory: (category: string | undefined) => void;
  onAddCategory: (name: string, emoji: string) => Promise<ExpenseCategory | null>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
}

const EMOJI_OPTIONS = ['🛒', '🥖', '🍽️', '🚌', '💊', '☕', '🏠', '📱', '🎁', '📦'];

export function CategorySelector({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
}: CategorySelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📦');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const newCat = await onAddCategory(newCategoryName.trim(), selectedEmoji);
    if (newCat) {
      onSelectCategory(newCat.name);
      setNewCategoryName('');
      setSelectedEmoji('📦');
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, cat: ExpenseCategory) => {
    e.stopPropagation();
    if (onDeleteCategory) {
      await onDeleteCategory(cat.id);
      if (selectedCategory === cat.name) {
        onSelectCategory(undefined);
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* No category option */}
      <Button
        type="button"
        variant={selectedCategory === undefined ? 'default' : 'outline'}
        size="sm"
        className="h-8 rounded-full text-sm"
        onClick={() => onSelectCategory(undefined)}
      >
        Aucune
      </Button>

      {categories.map((cat) => (
        <div key={cat.id} className="relative group">
          <Button
            type="button"
            variant={selectedCategory === cat.name ? 'default' : 'outline'}
            size="sm"
            className="h-8 rounded-full text-sm pr-2"
            onClick={() => onSelectCategory(cat.name)}
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.name}
          </Button>
          {onDeleteCategory && (
            <button
              type="button"
              onClick={(e) => handleDeleteCategory(e, cat)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {/* Add category */}
      <Popover open={isAdding} onOpenChange={setIsAdding}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full border border-dashed text-sm"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nom de la catégorie"
              className="h-9"
              maxLength={20}
            />
            <div className="flex flex-wrap gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant={selectedEmoji === emoji ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0 text-base"
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              Créer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
