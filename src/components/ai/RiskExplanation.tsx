import { Info, TrendingUp, Clock, Shield, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExplainableRiskScore } from '@/lib/api';

interface RiskExplanationProps {
  riskData: ExplainableRiskScore;
}

const factorIcons = {
  frequency: BarChart3,
  severity: TrendingUp,
  recency: Clock,
  verification: Shield,
};

const factorLabels = {
  frequency: 'Report Frequency',
  severity: 'Severity Distribution',
  recency: 'Recent Activity',
  verification: 'Verification Status',
};

export function RiskExplanation({ riskData }: RiskExplanationProps) {
  const { factors, risk_score, risk_level, algorithm_version, disclaimer } = riskData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-muted-foreground" />
          Risk Indicator Explanation
        </CardTitle>
        <CardDescription>
          Transparent breakdown of how the risk score is calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Risk Score</span>
            <span className="font-mono">{risk_score}/100</span>
          </div>
          <Progress value={risk_score} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Risk Level: <span className="font-medium capitalize">{risk_level}</span>
          </p>
        </div>

        {/* Factor Breakdown */}
        <Accordion type="multiple" className="w-full">
          {Object.entries(factors).map(([key, factor]) => {
            const Icon = factorIcons[key as keyof typeof factorIcons];
            const label = factorLabels[key as keyof typeof factorLabels];
            
            return (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        (+{factor.weighted.toFixed(1)} pts)
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-7">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Contribution</span>
                        <span className="font-mono">{factor.weighted.toFixed(1)} points</span>
                      </div>
                      <Progress value={factor.raw * 100} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {factor.explanation}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Algorithm Info */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>Algorithm version: {algorithm_version}</p>
        </div>

        {/* Disclaimer */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {disclaimer}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
