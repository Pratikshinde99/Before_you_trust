import { useParams, Link } from 'react-router-dom';
import { User, Building2, Phone, Globe, Wrench, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { IncidentCard } from '@/components/incident/IncidentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEntityById, getIncidentsByEntityId } from '@/lib/mockData';
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

function getSeverityLabel(count: number): { label: string; className: string } {
  if (count >= 50) return { label: 'Very High Risk', className: 'bg-destructive text-destructive-foreground' };
  if (count >= 20) return { label: 'High Risk', className: 'bg-orange-500 text-primary-foreground' };
  if (count >= 5) return { label: 'Moderate Risk', className: 'bg-yellow-500 text-primary-foreground' };
  return { label: 'Low Activity', className: 'bg-muted text-muted-foreground' };
}

const EntityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const entity = id ? getEntityById(id) : undefined;
  const incidents = id ? getIncidentsByEntityId(id) : [];

  if (!entity) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="mb-4 text-2xl font-semibold text-foreground">Entity Not Found</h1>
          <p className="mb-8 text-muted-foreground">
            The requested entity could not be found in our database.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const Icon = entityIcons[entity.type];
  const riskInfo = getSeverityLabel(entity.incidentCount);

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Button */}
        <Link to="/" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Link>

        {/* Entity Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-accent">
                <Icon className="h-10 w-10 text-accent-foreground" />
              </div>
              
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                    {entity.name}
                  </h1>
                  <Badge variant="outline">
                    {entityTypeLabels[entity.type]}
                  </Badge>
                </div>
                
                <p className="mb-4 text-lg text-muted-foreground">
                  {entity.identifier}
                </p>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    <Badge className={riskInfo.className}>
                      {riskInfo.label}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {entity.incidentCount} incident{entity.incidentCount === 1 ? '' : 's'} reported
                  </span>
                </div>
              </div>
              
              <Link to="/submit">
                <Button>Report Incident</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Incidents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Incident Reports ({incidents.length})
          </h2>
          
          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map(incident => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No incidents have been reported for this entity yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EntityDetail;
