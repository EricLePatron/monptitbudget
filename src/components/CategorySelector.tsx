import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Check } from 'lucide-react';
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
}

const EMOJI_OPTIONS = ['📦', '🛒', '🥖', '🍽️', '🚌', '🎮', '💊', '🛍️', '☕', '🍕', '🏠', '💡', '📱', '🎬', '✈️', '🎁'];

export function CategorySelector({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
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

  return (
    <div className="space-y-3">
      <ScrollArea className="w-full">
        <div className="flex flex-wrap gap-2 pb-1">
          {/* No category option */}
          <Button
            type="button"
            variant={selectedCategory === undefined ? 'default' : 'outline'}
            size="sm"
            className="h-9 rounded-full"
            onClick={() => onSelectCategory(undefined)}
          >
            Sans catégorie
          </Button>

          {categories.map((cat) => (
            <Button
              key={cat.id}
              type="button"
              variant={selectedCategory === cat.name ? 'default' : 'outline'}
              size="sm"
              className="h-9 rounded-full"
              onClick={() => onSelectCategory(cat.name)}
            >
              <span className="mr-1">{cat.emoji}</span>
              {cat.name}
              {selectedCategory === cat.name && <Check className="ml-1 h-3 w-3" />}
            </Button>
          ))}

          {/* Add category button */}
          <Popover open={isAdding} onOpenChange={setIsAdding}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full border border-dashed"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom de la catégorie</label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Café"
                    className="h-9"
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emoji</label>
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={selectedEmoji === emoji ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0 text-lg"
                        onClick={() => setSelectedEmoji(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                >
                  Créer la catégorie
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </ScrollArea>
    </div>
  );
}
