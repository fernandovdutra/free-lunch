import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useInsights, useGenerateOnDemandInsight } from '@/hooks/useInsights';
import type { Insight } from '@/types';

const typeColors: Record<Insight['type'], string> = {
  daily: 'bg-blue-100 text-blue-800',
  weekly: 'bg-purple-100 text-purple-800',
  monthly: 'bg-amber-100 text-amber-800',
  yearly: 'bg-emerald-100 text-emerald-800',
  on_demand: 'bg-gray-100 text-gray-800',
};

export function Insights() {
  const navigate = useNavigate();
  const [askOpen, setAskOpen] = useState(false);
  const { data: insights, isLoading, error } = useInsights(50);
  const generateMutation = useGenerateOnDemandInsight();

  const handleAsk = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await generateMutation.mutateAsync({
      question: formData.get('question') as string,
    });
    setAskOpen(false);
    void navigate(`/insights/${result.insightId}`);
  };

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load insights</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const insightsList = insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">AI-generated financial analysis and recommendations</p>
        </div>
        <Button onClick={() => { setAskOpen(true); }}>
          <Sparkles className="mr-2 h-4 w-4" />
          Ask AI
        </Button>
      </div>

      {/* Insight Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insightsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No insights yet</h3>
            <p className="mt-1 text-muted-foreground">
              Insights are generated automatically or you can ask the AI for an analysis.
            </p>
            <Button className="mt-4" onClick={() => { setAskOpen(true); }}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Your First Insight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insightsList.map((insight) => (
            <Card
              key={insight.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${!insight.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
              onClick={() => void navigate(`/insights/${insight.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={typeColors[insight.type]}>
                      {insight.type.replace('_', ' ')}
                    </Badge>
                    {!insight.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(insight.generatedAt, 'MMM d, yyyy')}
                  </span>
                </div>
                <CardTitle className="text-base">{insight.summary}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {insight.highlights.slice(0, 4).map((h, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-muted px-2 py-1 text-sm"
                    >
                      <span className="text-muted-foreground">{h.label}:</span>{' '}
                      <span className="font-medium">{h.value}</span>
                    </div>
                  ))}
                </div>
                {insight.recommendations.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {insight.recommendations.length} recommendation(s)
                    {insight.anomalies.length > 0 && ` · ${insight.anomalies.length} anomaly(ies)`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ask AI Dialog */}
      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask AI About Your Finances</DialogTitle>
            <DialogDescription>
              Ask a question or leave blank for a general analysis of the last 30 days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleAsk(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question (optional)</Label>
              <Input
                id="question"
                name="question"
                placeholder="e.g., Where am I overspending? How can I save more?"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAskOpen(false); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={generateMutation.isPending}>
                {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
