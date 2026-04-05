import { Loader2, RefreshCw, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecategorizeTransactions } from '@/hooks/useBankConnection';

interface AutoCategorizationCardProps {
  hasTransactions: boolean;
}

export function AutoCategorizationCard({ hasTransactions }: AutoCategorizationCardProps) {
  const recategorizeMutation = useRecategorizeTransactions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Categorization</CardTitle>
        <CardDescription>
          Re-run categorization on existing transactions using rules, merchant database, and AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recategorizeMutation.data && (
          <p className="text-sm text-emerald-600">
            Processed {recategorizeMutation.data.processed} transactions: {recategorizeMutation.data.updated} updated
            {recategorizeMutation.data.llmCategorized > 0 && (
              <> ({recategorizeMutation.data.llmCategorized} by AI)</>
            )}
            , {recategorizeMutation.data.skipped} skipped
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void recategorizeMutation.mutateAsync({})}
            disabled={recategorizeMutation.isPending || !hasTransactions}
          >
            {recategorizeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Re-categorize (rules only)
          </Button>
          <Button
            variant="outline"
            onClick={() => void recategorizeMutation.mutateAsync({ useLLM: true, mode: 'uncategorized' })}
            disabled={recategorizeMutation.isPending || !hasTransactions}
          >
            {recategorizeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            AI categorize uncategorized
          </Button>
          <Button
            variant="outline"
            onClick={() => void recategorizeMutation.mutateAsync({ useLLM: true, mode: 'all' })}
            disabled={recategorizeMutation.isPending || !hasTransactions}
          >
            {recategorizeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            AI categorize all
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          "Rules only" re-applies pattern matching. "AI categorize" also uses Claude AI for transactions that rules can't match. Manually set categories are never changed.
        </p>
      </CardContent>
    </Card>
  );
}
