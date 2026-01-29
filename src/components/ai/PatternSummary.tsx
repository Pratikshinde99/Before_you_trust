import { Sparkles, AlertCircle, TrendingUp, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PatternSummary as PatternSummaryType } from '@/lib/api';

interface PatternSummaryProps {
  data: PatternSummaryType | null;
  isLoading?: boolean;
  error?: string | null;
}

export function PatternSummary({ data, isLoading, error }: PatternSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Generated Pattern Summary
        </CardTitle>
        <CardDescription>
          Neutral analysis of reported incident patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Summary */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </div>
        </div>

        {/* Key Patterns */}
        {data.key_patterns.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Key Patterns Identified
            </h4>
            <div className="space-y-2">
              {data.key_patterns.map((pattern, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm">{pattern.pattern}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {pattern.frequency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pattern.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temporal Analysis */}
        {data.temporal_analysis && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Temporal Analysis
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Earliest:</span>{' '}
                <span className="font-medium">{data.temporal_analysis.earliest}</span>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">Latest:</span>{' '}
                <span className="font-medium">{data.temporal_analysis.latest}</span>
              </div>
              {data.temporal_analysis.peak_period && (
                <div className="p-2 rounded bg-muted/30 col-span-2">
                  <span className="text-muted-foreground">Peak Period:</span>{' '}
                  <span className="font-medium">{data.temporal_analysis.peak_period}</span>
                </div>
              )}
              {data.temporal_analysis.trend && (
                <div className="p-2 rounded bg-muted/30 col-span-2">
                  <span className="text-muted-foreground">Trend:</span>{' '}
                  <span className="font-medium">{data.temporal_analysis.trend}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Distribution */}
        {Object.keys(data.category_distribution).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Category Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.category_distribution).map(([category, count]) => (
                <Badge key={category} variant="outline" className="capitalize">
                  {category.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Data Quality */}
        <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
          <p>
            Based on {data.data_quality.total_reports} report{data.data_quality.total_reports !== 1 ? 's' : ''} 
            ({data.data_quality.verified_count} verified)
          </p>
          <p>{data.data_quality.confidence_note}</p>
        </div>

        {/* Disclaimer */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {data.disclaimer}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
