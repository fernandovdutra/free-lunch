import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInsights, useMarkInsightRead } from '@/hooks/useInsights';

const sentimentColors: Record<string, string> = {
  positive: 'text-accent',
  negative: 'text-warn',
  neutral: 'text-textMid',
};

const priorityColors: Record<string, string> = {
  high: 'bg-warn-dim text-warn',
  medium: 'bg-alert-dim text-alert',
  low: 'border border-rule bg-surface text-textMid',
};

const severityColors: Record<string, string> = {
  alert: 'text-warn',
  warning: 'text-alert',
  info: 'text-textMid',
};

export function InsightDetail() {
  const { insightId } = useParams<{ insightId: string }>();
  const navigate = useNavigate();
  const { data: insights, isLoading } = useInsights(50);
  const markRead = useMarkInsightRead();

  const insight = insights?.find((i) => i.id === insightId);

  useEffect(() => {
    if (insight && !insight.isRead) {
      void markRead.mutateAsync(insight.id);
    }
  }, [insight?.id, insight?.isRead]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Insight not found</h3>
          <Button className="mt-4" variant="outline" onClick={() => void navigate('/insights')}>
            Back to Insights
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => void navigate('/insights')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Insights
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {insight.type.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {format(insight.generatedAt, 'MMMM d, yyyy · h:mm a')}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{insight.summary}</h1>
        <p className="text-muted-foreground">
          {format(insight.periodStart, 'MMM d')} — {format(insight.periodEnd, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Highlights */}
      {insight.highlights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {insight.highlights.map((h, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{h.label}</p>
                <p className={`text-xl font-bold ${sentimentColors[h.sentiment] ?? ''}`}>
                  {h.value}
                  {h.trend === 'up' && ' ↑'}
                  {h.trend === 'down' && ' ↓'}
                  {h.trend === 'stable' && ' →'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Anomalies */}
      {insight.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insight.anomalies.map((a, i) => (
                <li key={i} className={`text-sm ${severityColors[a.severity] ?? ''}`}>
                  <Badge variant="outline" className="mr-2">
                    {a.severity}
                  </Badge>
                  {a.description}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insight.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insight.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge className={priorityColors[r.priority] ?? ''}>
                    {r.priority}
                  </Badge>
                  <div>
                    <p className="text-sm">{r.text}</p>
                    {r.potentialSavings != null && r.potentialSavings > 0 && (
                      <p className="text-xs text-accent tabular-nums">
                        Potential savings: ~{'\u20AC'}{r.potentialSavings.toFixed(0)}/month
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Goal Progress */}
      {insight.goalProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insight.goalProgress.map((g, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{g.goalName}</span>
                    <span className={`tabular-nums ${g.onTrack ? 'text-accent' : 'text-alert'}`}>
                      {g.progressPct.toFixed(0)}% {g.onTrack ? '(on track)' : '(behind)'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${g.onTrack ? 'bg-accent' : 'bg-alert'}`}
                      style={{ width: `${Math.min(100, g.progressPct)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Summary */}
      {insight.investmentSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Investment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold tabular-nums">{'\u20AC'}{insight.investmentSummary.totalValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gain</p>
                <p className={`text-xl font-bold tabular-nums ${insight.investmentSummary.totalGain >= 0 ? 'text-accent' : 'text-warn'}`}>
                  {insight.investmentSummary.totalGain >= 0 ? '+' : ''}{'\u20AC'}{insight.investmentSummary.totalGain.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return</p>
                <p className={`text-xl font-bold tabular-nums ${insight.investmentSummary.returnPct >= 0 ? 'text-accent' : 'text-warn'}`}>
                  {insight.investmentSummary.returnPct >= 0 ? '+' : ''}{insight.investmentSummary.returnPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {insight.narrative.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
