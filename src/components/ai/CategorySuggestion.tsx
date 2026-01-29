import { Lightbulb, Check, X, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CategorizationResult } from '@/lib/api';
import { IncidentCategory } from '@/types';

interface CategorySuggestionProps {
  data: CategorizationResult | null;
  isLoading?: boolean;
  error?: string | null;
  onAccept?: (category: IncidentCategory) => void;
  onReject?: () => void;
}

const categoryLabels: Record<string, string> = {
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

export function CategorySuggestion({ 
  data, 
  isLoading, 
  error, 
  onAccept, 
  onReject 
}: CategorySuggestionProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary animate-pulse" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail - categorization is optional
  }

  if (!data) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          AI Category Suggestion
        </CardTitle>
        <CardDescription className="text-xs">
          Based on your description, we suggest the following category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Category */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm">
              {categoryLabels[data.primary_category] || data.primary_category}
            </Badge>
            {data.secondary_category && (
              <Badge variant="outline" className="text-sm">
                Also: {categoryLabels[data.secondary_category] || data.secondary_category}
              </Badge>
            )}
          </div>
          
          {/* Confidence */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Confidence</span>
              <span>{data.confidence}%</span>
            </div>
            <Progress value={data.confidence} className="h-1.5" />
          </div>
        </div>

        {/* Explanation */}
        <div className="text-sm text-muted-foreground">
          <p>{data.explanation}</p>
        </div>

        {/* Indicators */}
        {data.indicators.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Key indicators:</span>
            <div className="flex flex-wrap gap-1">
              {data.indicators.map((indicator, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {(onAccept || onReject) && (
          <div className="flex gap-2 pt-2">
            {onAccept && (
              <Button 
                size="sm" 
                onClick={() => onAccept(data.primary_category as IncidentCategory)}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Use This Category
              </Button>
            )}
            {onReject && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onReject}
              >
                <X className="h-4 w-4 mr-1" />
                Choose Different
              </Button>
            )}
          </div>
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
