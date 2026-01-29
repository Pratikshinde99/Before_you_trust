import { Link } from 'react-router-dom';
import { User, Building2, Phone, Globe, Wrench, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskIndicator } from '@/components/shared/RiskIndicator';
import { EntityWithRisk } from '@/lib/api';
import { EntityType } from '@/types';

interface EntityCardProps {
  entity: EntityWithRisk;
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

export function EntityCard({ entity }: EntityCardProps) {
  const Icon = entityIcons[entity.type];
  
  return (
    <Link to={`/entity/${entity.id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent">
              <Icon className="h-6 w-6 text-accent-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {entity.name}
                </h3>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {entityTypeLabels[entity.type]}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground truncate mb-3">
                {entity.identifier}
              </p>
              
              <RiskIndicator
                level={entity.risk_score.risk_level}
                totalIncidents={entity.risk_score.total_incidents}
                size="sm"
              />
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
