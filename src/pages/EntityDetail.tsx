import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Building2, Phone, Globe, Wrench, ArrowLeft, FileText, BarChart3 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { IncidentCard } from '@/components/incident/IncidentCard';
import { FlagIncidentDialog } from '@/components/incident/FlagIncidentDialog';
import { RiskIndicator } from '@/components/shared/RiskIndicator';
import { PatternSummary } from '@/components/ai/PatternSummary';
import { LoadingState, EmptyState, ErrorState } from '@/components/shared/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity, useRiskScore, useGenerateSummary } from '@/hooks/useApi';
import { EntityType } from '@/types';

const entityIcons: Record<EntityType, typeof User> = {
  person: User,
  business: Building2,
  phone: Phone,
  website: Globe,
  service: Wrench,
};

const entityTypeLabels: Record<EntityType, string> = {
  person: 'Person',
  business: 'Business',
  phone: 'Phone Number',
  website: 'Website',
  service: 'Service',
};

const EntityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [flagIncidentId, setFlagIncidentId] = useState<string | null>(null);
  
  const { data, isLoading, error } = useEntity(id, true);
  const { data: riskData } = useRiskScore(id);
  const { data: patternSummary, isLoading: summaryLoading, error: summaryError } = useGenerateSummary(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16">
          <LoadingState message="Loading entity details..." />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="container py-16">
          <ErrorState
            title="Entity Not Found"
            message="The requested entity could not be found in our database."
            action={
              <Link to="/">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Search
                </Button>
              </Link>
            }
          />
        </div>
      </Layout>
    );
  }

  const { entity, risk_score, incidents = [], incidents_total = 0 } = data;
  const Icon = entityIcons[entity.type];

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Link */}
        <Link 
          to="/" 
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Link>

        {/* Entity Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent">
                <Icon className="h-8 w-8 text-accent-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                    {entity.name}
                  </h1>
                  <Badge variant="outline" className="text-sm">
                    {entityTypeLabels[entity.type]}
                  </Badge>
                </div>
                
                <p className="text-lg text-muted-foreground mb-4">
                  {entity.identifier}
                </p>
                
                <RiskIndicator
                  level={risk_score.risk_level}
                  score={risk_score.severity_score}
                  totalIncidents={risk_score.total_incidents}
                  verifiedIncidents={risk_score.verified_incidents}
                  size="lg"
                  showDetails
                />
              </div>
              
              <div className="shrink-0">
                <Link to={`/submit?entity=${id}&name=${encodeURIComponent(entity.name)}&type=${entity.type}&identifier=${encodeURIComponent(entity.identifier)}`}>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Report Incident
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="incidents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="incidents" className="gap-2">
              <FileText className="h-4 w-4" />
              Incidents ({incidents_total})
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-6">
            {/* AI Pattern Summary - above incidents */}
            {incidents.length > 0 && (
              <PatternSummary
                data={patternSummary ?? null}
                isLoading={summaryLoading}
                error={summaryError?.message}
              />
            )}

            {/* Incident List */}
            {incidents.length > 0 ? (
              incidents.map(incident => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onFlag={(id) => setFlagIncidentId(id)}
                />
              ))
            ) : (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No incidents reported"
                description="No incidents have been reported for this entity yet."
                action={
                  <Link to={`/submit?entity=${id}`}>
                    <Button variant="outline">Submit a Report</Button>
                  </Link>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="breakdown">
            {riskData ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* By Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(riskData.breakdown.by_category).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(riskData.breakdown.by_category).map(([cat, count]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <span className="text-sm capitalize text-muted-foreground">
                              {cat.replace('_', ' ')}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* By Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
                        <div key={level} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-muted-foreground">{level}</span>
                          <Badge variant="secondary">{riskData.breakdown.by_severity[level]}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">By Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verified</span>
                        <Badge variant="secondary">{riskData.breakdown.by_status.verified}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pending Review</span>
                        <Badge variant="secondary">{riskData.breakdown.by_status.pending}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Disputed</span>
                        <Badge variant="secondary">{riskData.breakdown.by_status.disputed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <LoadingState message="Loading breakdown..." />
            )}
          </TabsContent>
        </Tabs>

        {/* Flag Dialog */}
        {flagIncidentId && (
          <FlagIncidentDialog
            incidentId={flagIncidentId}
            open={!!flagIncidentId}
            onOpenChange={(open) => !open && setFlagIncidentId(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default EntityDetail;
