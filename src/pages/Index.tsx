import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, FileWarning, Users, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { SearchBar } from '@/components/search/SearchBar';
import { EntityCard } from '@/components/search/EntityCard';
import { IncidentCard } from '@/components/incident/IncidentCard';
import { Button } from '@/components/ui/button';
import { searchEntities, getRecentIncidents } from '@/lib/mockData';
import { Entity, EntityType } from '@/types';

const Index = () => {
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState<EntityType | 'all'>('all');
  const [searchResults, setSearchResults] = useState<Entity[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const recentIncidents = getRecentIncidents(3);

  const handleSearch = () => {
    if (!query.trim()) {
      setSearchResults(null);
      setHasSearched(false);
      return;
    }
    
    const type = entityType === 'all' ? undefined : entityType;
    const results = searchEntities(query, type);
    setSearchResults(results);
    setHasSearched(true);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent to-background py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              <span>Community-powered trust verification</span>
            </div>
            
            <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Before You Trust
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Search for people, businesses, phone numbers, or websites to see incident reports 
              from real users. Make informed decisions with community-sourced information.
            </p>
            
            <div className="mx-auto max-w-2xl">
              <SearchBar
                query={query}
                entityType={entityType}
                onQueryChange={setQuery}
                onEntityTypeChange={setEntityType}
                onSearch={handleSearch}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {hasSearched && (
        <section className="py-8">
          <div className="container">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {searchResults && searchResults.length > 0 
                ? `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}` 
                : 'No results found'}
            </h2>
            
            {searchResults && searchResults.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchResults.map(entity => (
                  <EntityCard key={entity.id} entity={entity} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No matching records found. This could mean no incidents have been reported, 
                  or the entity hasn't been added to our database yet.
                </p>
                <Link to="/submit">
                  <Button variant="outline" className="mt-4">
                    Report an Incident
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features */}
      {!hasSearched && (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent">
                  <Search className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Search Anything</h3>
                <p className="text-sm text-muted-foreground">
                  Look up people, businesses, phone numbers, websites, or services before engaging.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent">
                  <FileWarning className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">View Incidents</h3>
                <p className="text-sm text-muted-foreground">
                  Access structured, factual incident reports submitted by real users.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent">
                  <Users className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Report Anonymously</h3>
                <p className="text-sm text-muted-foreground">
                  Submit incident reports without creating an account. Help protect others.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Incidents */}
      {!hasSearched && (
        <section className="border-t border-border bg-card py-12 md:py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Recent Reports</h2>
              <Link to="/submit">
                <Button variant="outline" size="sm">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Submit Report
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentIncidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} showEntity />
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Index;
