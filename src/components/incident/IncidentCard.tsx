import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, CheckCircle, Clock, AlertCircle, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IncidentWithEvidence } from '@/lib/api';
import { IncidentCategory } from '@/types';

interface IncidentCardProps {
  incident: IncidentWithEvidence;
  onFlag?: (incidentId: string) => void;
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

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-chart-5/20 text-foreground border-chart-5/40' },
  medium: { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40' },
  high: { label: 'High', className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40' },
  critical: { label: 'Critical', className: 'bg-destructive/20 text-destructive border-destructive/40' },
};

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
  verified: { icon: CheckCircle, label: 'Verified', className: 'text-chart-1' },
  pending: { icon: Clock, label: 'Under Review', className: 'text-muted-foreground' },
  disputed: { icon: AlertCircle, label: 'Disputed', className: 'text-yellow-600' },
};

export function IncidentCard({ incident, onFlag }: IncidentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const StatusIcon = statusConfig[incident.status]?.icon || Clock;
  const statusInfo = statusConfig[incident.status] || statusConfig.pending;
  const severityInfo = severityConfig[incident.severity] || severityConfig.medium;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-foreground leading-tight">
              {incident.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(incident.date_occurred), 'MMM d, yyyy')}</span>
              </div>
              
              {incident.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{incident.location}</span>
                </div>
              )}
              
              <div className={`flex items-center gap-1 ${statusInfo.className}`}>
                <StatusIcon className="h-4 w-4" />
                <span>{statusInfo.label}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={severityInfo.className}>
              {severityInfo.label}
            </Badge>
            <Badge variant="secondary">
              {categoryLabels[incident.category]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-3'}`}>
          {incident.description}
        </p>
        
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {incident.what_was_promised && (
              <div className="rounded-md bg-accent/50 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  What was promised
                </p>
                <p className="text-sm text-foreground">{incident.what_was_promised}</p>
              </div>
            )}
            
            {incident.what_actually_happened && (
              <div className="rounded-md bg-accent/50 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  What actually happened
                </p>
                <p className="text-sm text-foreground">{incident.what_actually_happened}</p>
              </div>
            )}
            
            {incident.incident_evidence && incident.incident_evidence.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Evidence ({incident.incident_evidence.length} file{incident.incident_evidence.length !== 1 ? 's' : ''})
                </p>
                <div className="flex flex-wrap gap-2">
                  {incident.incident_evidence.map((ev) => (
                    <Badge key={ev.id} variant="outline" className="text-xs">
                      {ev.file_name || ev.file_type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show more
              </>
            )}
          </Button>
          
          {onFlag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFlag(incident.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-4 w-4 mr-1" />
              Report issue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
