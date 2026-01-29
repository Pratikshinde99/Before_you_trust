import { cn } from '@/lib/utils';

interface RiskIndicatorProps {
  level: string;
  score?: number;
  totalIncidents?: number;
  verifiedIncidents?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const levelConfig: Record<string, { label: string; className: string; description: string }> = {
  unknown: {
    label: 'No Data',
    className: 'bg-muted text-muted-foreground border-border',
    description: 'No incidents have been reported',
  },
  low: {
    label: 'Low',
    className: 'bg-chart-1/10 text-chart-1 border-chart-1/30',
    description: 'Minimal reported incidents',
  },
  moderate: {
    label: 'Moderate',
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    description: 'Some incidents reported',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
    description: 'Multiple incidents reported',
  },
  critical: {
    label: 'Critical',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
    description: 'Significant incident history',
  },
};

export function RiskIndicator({
  level,
  score,
  totalIncidents,
  verifiedIncidents,
  size = 'md',
  showDetails = false,
}: RiskIndicatorProps) {
  const config = levelConfig[level] || levelConfig.unknown;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-md border font-medium',
            sizeClasses[size],
            config.className
          )}
        >
          {config.label}
        </span>
        
        {score !== undefined && size !== 'sm' && (
          <span className="text-sm text-muted-foreground">
            Score: {score.toFixed(0)}/100
          </span>
        )}
      </div>
      
      {showDetails && (
        <div className="text-xs text-muted-foreground">
          <p>{config.description}</p>
          {totalIncidents !== undefined && (
            <p className="mt-1">
              {totalIncidents} total incident{totalIncidents !== 1 ? 's' : ''}
              {verifiedIncidents !== undefined && verifiedIncidents > 0 && (
                <> • {verifiedIncidents} verified</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
