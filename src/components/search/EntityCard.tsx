import { Link } from 'react-router-dom';
import { User, Building2, Phone, Globe, Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Entity, EntityType } from '@/types';

interface EntityCardProps {
  entity: Entity;
}

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
  phone: 'Phone',
  website: 'Website',
  service: 'Service',
};

function getSeverityColor(count: number): string {
  if (count >= 50) return 'bg-destructive text-destructive-foreground';
  if (count >= 20) return 'bg-orange-500 text-primary-foreground';
  if (count >= 5) return 'bg-yellow-500 text-primary-foreground';
  return 'bg-muted text-muted-foreground';
}

export function EntityCard({ entity }: EntityCardProps) {
  const Icon = entityIcons[entity.type];
  
  return (
    <Link to={`/entity/${entity.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
              <Icon className="h-6 w-6 text-accent-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">{entity.name}</h3>
                <Badge variant="outline" className="shrink-0">
                  {entityTypeLabels[entity.type]}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground truncate mb-2">
                {entity.identifier}
              </p>
              
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <Badge className={getSeverityColor(entity.incidentCount)}>
                  {entity.incidentCount} {entity.incidentCount === 1 ? 'incident' : 'incidents'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
