import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EntityType } from '@/types';

interface SearchBarProps {
  query: string;
  entityType: EntityType | 'all';
  onQueryChange: (query: string) => void;
  onEntityTypeChange: (type: EntityType | 'all') => void;
  onSearch: () => void;
  isSearching?: boolean;
}

const entityTypeLabels: Record<EntityType | 'all', string> = {
  all: 'All Types',
  person: 'Person',
  business: 'Business',
  phone: 'Phone Number',
  website: 'Website',
  service: 'Service',
};

export function SearchBar({
  query,
  entityType,
  onQueryChange,
  onEntityTypeChange,
  onSearch,
  isSearching = false,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, phone, website, or business..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-10 h-12 bg-card"
          />
        </div>
        
        <Select value={entityType} onValueChange={(value) => onEntityTypeChange(value as EntityType | 'all')}>
          <SelectTrigger className="w-full sm:w-44 h-12 bg-card">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(entityTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button type="submit" size="lg" className="h-12" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </form>
  );
}
