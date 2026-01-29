import { AlertTriangle, Copy, ExternalLink, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DuplicateResult } from '@/lib/api';

interface DuplicateWarningProps {
  data: DuplicateResult | null;
  isLoading?: boolean;
  error?: string | null;
  onViewIncident?: (incidentId: string) => void;
  onProceedAnyway?: () => void;
}

export function DuplicateWarning({ 
  data, 
  isLoading, 
  error, 
  onViewIncident,
  onProceedAnyway 
}: DuplicateWarningProps) {
  if (isLoading) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-yellow-600 animate-pulse" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  // No duplicates or similar incidents found
  if (!data.has_duplicates && !data.has_similar) return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          {data.has_duplicates ? 'Potential Duplicate Detected' : 'Similar Reports Found'}
        </CardTitle>
        <CardDescription className="text-xs">
          We found existing reports that may be related to your submission
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duplicates */}
        {data.duplicates.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Likely Duplicates
            </span>
            {data.duplicates.map((dup, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-lg border border-yellow-500/30 bg-background space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="destructive" className="text-xs">
                    {dup.similarity_score}% match
                  </Badge>
                  {onViewIncident && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onViewIncident(dup.incident_id)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{dup.explanation}</p>
                <div className="flex flex-wrap gap-1">
                  {dup.matching_elements.map((el, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {el}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Similar Incidents */}
        {data.similar.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Similar Reports</span>
            {data.similar.map((sim, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {sim.similarity_score}% similar
                  </Badge>
                  {onViewIncident && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onViewIncident(sim.incident_id)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Matches:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sim.matching_elements.slice(0, 3).map((el, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {el}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Differences:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sim.distinguishing_elements.slice(0, 3).map((el, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {el}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <span className="font-medium">Recommendation: </span>
          {data.recommendation}
        </div>

        {/* Actions */}
        {onProceedAnyway && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onProceedAnyway}
          >
            This is a different incident - proceed with submission
          </Button>
        )}

        {/* Processing Note */}
        <Alert className="bg-transparent border-0 p-0">
          <Info className="h-3 w-3" />
          <AlertDescription className="text-[10px] text-muted-foreground">
            {data.processing_note}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
