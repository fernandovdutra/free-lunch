import { describe, it, expect } from 'vitest';
import { buildDailyEmailHtml, buildWeeklyEmailHtml } from '../emailTemplates';

const mockData = {
  date: 'Monday, January 15, 2024',
  summary: 'A normal spending day with groceries and transport.',
  highlights: [
    { label: 'Total Spent', value: '€85.00', trend: 'up' as const, sentiment: 'negative' },
    { label: 'Saved vs Budget', value: '€15.00', sentiment: 'positive' },
  ],
  recommendations: [
    { priority: 'high', category: 'Food', text: 'Consider meal prepping to reduce daily food costs.', potentialSavings: 50 },
    { priority: 'low', category: 'Transport', text: 'Walk short distances when weather permits.' },
  ],
  anomalies: [
    { description: 'Unusually large expense at Restaurant XYZ', severity: 'warning' as const },
  ],
  narrative: 'Today was a typical day.\n\nYou spent most on groceries.',
};

describe('buildDailyEmailHtml', () => {
  it('returns valid HTML structure', () => {
    const html = buildDailyEmailHtml(mockData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Free Lunch');
  });

  it('includes summary text', () => {
    const html = buildDailyEmailHtml(mockData);
    expect(html).toContain('A normal spending day');
  });

  it('renders highlights with sentiment colors', () => {
    const html = buildDailyEmailHtml(mockData);
    // Negative sentiment = red
    expect(html).toContain('#dc2626');
    // Positive sentiment = green
    expect(html).toContain('#16a34a');
  });

  it('renders recommendations with priority badges', () => {
    const html = buildDailyEmailHtml(mockData);
    expect(html).toContain('HIGH');
    expect(html).toContain('meal prepping');
    expect(html).toContain('save ~€50');
  });

  it('renders anomalies when present', () => {
    const html = buildDailyEmailHtml(mockData);
    expect(html).toContain('Anomalies');
    expect(html).toContain('Restaurant XYZ');
  });

  it('omits anomalies section when none', () => {
    const html = buildDailyEmailHtml({ ...mockData, anomalies: [] });
    expect(html).not.toContain('Anomalies');
  });

  it('splits narrative into paragraphs', () => {
    const html = buildDailyEmailHtml(mockData);
    expect(html).toContain('<p');
    expect(html).toContain('Today was a typical day.');
    expect(html).toContain('You spent most on groceries.');
  });

  it('escapes HTML in user content', () => {
    const html = buildDailyEmailHtml({
      ...mockData,
      summary: '<script>alert("xss")</script>',
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});

describe('buildWeeklyEmailHtml', () => {
  it('includes goal progress section when provided', () => {
    const html = buildWeeklyEmailHtml({
      ...mockData,
      goalProgress: [
        { goalName: 'Emergency Fund', progressPct: 65, onTrack: true, note: 'Good progress' },
      ],
    });
    expect(html).toContain('Goal Progress');
    expect(html).toContain('Emergency Fund');
    expect(html).toContain('65%');
  });

  it('includes investment summary when provided', () => {
    const html = buildWeeklyEmailHtml({
      ...mockData,
      investmentSummary: {
        totalValue: 50000,
        totalGain: 5000,
        returnPct: 11.1,
        periodChange: 200,
      },
    });
    expect(html).toContain('Investments');
    expect(html).toContain('€50000.00');
    expect(html).toContain('11.1%');
  });

  it('inserts extra sections before Analysis heading', () => {
    const html = buildWeeklyEmailHtml({
      ...mockData,
      goalProgress: [
        { goalName: 'Test Goal', progressPct: 50, onTrack: true, note: 'OK' },
      ],
    });
    // Goal Progress should appear before Analysis
    const goalIdx = html.indexOf('Goal Progress');
    const analysisIdx = html.indexOf('Analysis');
    expect(goalIdx).toBeLessThan(analysisIdx);
  });

  it('works without extra sections (falls back to daily structure)', () => {
    const html = buildWeeklyEmailHtml(mockData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Analysis');
  });
});
