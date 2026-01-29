import { format } from 'date-fns';
import { MapPin, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IncidentReport, IncidentCategory } from '@/types';

interface IncidentCardProps {
  incident: IncidentReport;
  showEntity?: boolean;
}

const categoryLabels: Record<IncidentCategory, string> = {
  fraud: 'Fraud',
  scam: 'Scam',
  harassment: 'Harassment',
  misrepresentation: 'Misrepresentation',
  non_delivery: 'Non-Delivery',
  quality_issue: 'Quality Issue',
  safety_concern: 'Safety Concern',
  data_breach: 'Data Breach',
  unauthorized_charges: 'Unauthorized Charges',
  other: 'Other',
};

const severityStyles: Record<IncidentReport['severity'], string> = {
  low: 'bg-chart-5/20 text-foreground border-chart-5',
  medium: 'bg-yellow-500/20 text-foreground border-yellow-500',
  high: 'bg-orange-500/20 text-foreground border-orange-500',
  critical: 'bg-destructive/20 text-destructive border-destructive',
};

const statusIcons: Record<IncidentReport['status'], typeof CheckCircle> = {
  verified: CheckCircle,
  pending: Clock,
  disputed: AlertCircle,
};

const statusLabels: Record<IncidentReport['status'], string> = {
  verified: 'Verified',
  pending: 'Pending Review',
  disputed: 'Disputed',
};

export function IncidentCard({ incident, showEntity = false }: IncidentCardProps) {
  const StatusIcon = statusIcons[incident.status];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold leading-tight">
              {incident.title}
            </CardTitle>
            {showEntity && incident.entity && (
              <p className="text-sm text-muted-foreground mt-1">
                Regarding: {incident.entity.name}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={severityStyles[incident.severity]}>
              {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
            </Badge>
            <Badge variant="secondary">
              {categoryLabels[incident.category]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {incident.description}
        </p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(incident.dateOccurred, 'MMM d, yyyy')}</span>
          </div>
          
          {incident.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{incident.location}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <StatusIcon className="h-4 w-4" />
            <span>{statusLabels[incident.status]}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
