import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Search, FileText, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { SearchBar } from '@/components/search/SearchBar';
import { EntityCard } from '@/components/search/EntityCard';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/shared/States';
import { useSearchEntities } from '@/hooks/useApi';
import { EntityType } from '@/types';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as EntityType | 'all') || 'all';
  
  const [query, setQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState<EntityType | 'all'>(initialType);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<EntityType | undefined>(
    initialType === 'all' ? undefined : initialType
  );

  const { data, isLoading, error } = useSearchEntities(
    searchQuery,
    searchType,
    searchQuery.length >= 2
  );

  const hasSearched = searchQuery.length >= 2;

  const handleSearch = () => {
    if (query.trim().length < 2) return;
    
    setSearchQuery(query);
    setSearchType(entityType === 'all' ? undefined : entityType);
    
    const params = new URLSearchParams();
    params.set('q', query);
    if (entityType !== 'all') params.set('type', entityType);
    setSearchParams(params);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-accent/80 to-background py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Community-verified information</span>
            </div>
            
            <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Before You Trust
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground">
              Search for people, businesses, or services to view incident reports from real users. 
              Make informed decisions based on documented experiences.
            </p>
            
            <div className="mx-auto max-w-2xl">
              <SearchBar
                query={query}
                entityType={entityType}
                onQueryChange={setQuery}
                onEntityTypeChange={setEntityType}
                onSearch={handleSearch}
                isSearching={isLoading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {hasSearched && (
        <section className="py-8 md:py-12">
          <div className="container">
            {isLoading ? (
              <LoadingState message="Searching records..." />
            ) : error ? (
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title="Search Error"
                description="We couldn't complete your search. Please try again."
                action={
                  <Button onClick={handleSearch} variant="outline">
                    Retry Search
                  </Button>
                }
              />
            ) : data && data.results.length > 0 ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found <span className="font-medium text-foreground">{data.total}</span> result{data.total !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.results.map(entity => (
                    <EntityCard key={entity.id} entity={entity} />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title="No results found"
                description="No matching records were found. This could mean no incidents have been reported for this search term."
                action={
                  <Link to="/submit">
                    <Button>Report an Incident</Button>
                  </Link>
                }
              />
            )}
          </div>
        </section>
      )}

      {/* Features - shown when not searching */}
      {!hasSearched && (
        <>
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
                    <Search className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Search Records</h3>
                  <p className="text-sm text-muted-foreground">
                    Look up people, businesses, phone numbers, websites, or services before engaging.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
                    <FileText className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">View Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Access structured, factual incident reports documented by community members.
                  </p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
                    <Users className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Submit Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Document your experience anonymously to help others make informed decisions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-border bg-card py-12">
            <div className="container">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-4 text-2xl font-semibold text-foreground">
                  Had an experience to share?
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Your report could help someone else avoid a similar situation. 
                  All submissions are anonymous and reviewed for accuracy.
                </p>
                <Link to="/submit">
                  <Button size="lg">
                    <FileText className="mr-2 h-4 w-4" />
                    Submit a Report
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
};

export default Index;
