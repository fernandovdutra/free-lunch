import { useState } from 'react';
import {
  Breadcrumb,
  CategoryRow,
  DayHeader,
  DrillHeadline,
  DrillRow,
  PhosphorButton,
  Pill,
  ProgressBar,
  Scrubber,
  SectionHeader,
  StatusGlyph,
  TransactionRow,
} from '@/components/redesign';

/**
 * Dev-only design-system reference page. Mounted at /__dev/primitives in
 * dev builds (gated in App.tsx by import.meta.env.DEV). Public route — no
 * auth needed since the page renders only static sample data. Phase 11/12
 * cleanup removes this file and its route.
 */
export function PrimitivesPlayground() {
  const [activePill, setActivePill] = useState<'all' | 'uncat' | 'reimb'>('all');
  const [scrubberMonth, setScrubberMonth] = useState('2026-04');
  const scrubberBarsL1 = [
    { monthKey: '2025-11', label: 'NOV', amount: 4180 },
    { monthKey: '2025-12', label: 'DEC', amount: 4810 }, // over
    { monthKey: '2026-01', label: 'JAN', amount: 4290 },
    { monthKey: '2026-02', label: 'FEB', amount: 4020 },
    { monthKey: '2026-03', label: 'MAR', amount: 4640 }, // over
    { monthKey: '2026-04', label: 'APR', amount: 4292 },
  ];
  const scrubberBarsL3 = [
    { monthKey: '2025-11', label: 'NOV', amount: 521 },
    { monthKey: '2025-12', label: 'DEC', amount: 678 },
    { monthKey: '2026-01', label: 'JAN', amount: 612 },
    { monthKey: '2026-02', label: 'FEB', amount: 558 },
    { monthKey: '2026-03', label: 'MAR', amount: 720 },
    { monthKey: '2026-04', label: 'APR', amount: 641 },
  ];

  return (
    <div className="min-h-screen bg-bg text-textHi">
      <div className="mx-auto w-full max-w-[420px] pb-12 lg:max-w-[480px]">
      <Block title="01 SECTION HEADER">
        <SectionHeader>BY CATEGORY</SectionHeader>
        <SectionHeader right="VIEW ALL ›">RECENT TRANSACTIONS</SectionHeader>
        <SectionHeader tether right="+ 3 MORE CATEGORIES ›">
          BY CATEGORY
        </SectionHeader>
      </Block>

      <Block title="02 PILL (FILTER ROW)">
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
          <Pill
            active={activePill === 'all'}
            onClick={() => {
              setActivePill('all');
            }}
          >
            ALL
          </Pill>
          <Pill
            active={activePill === 'uncat'}
            variant="warn"
            onClick={() => {
              setActivePill('uncat');
            }}
          >
            ! UNCAT
          </Pill>
          <Pill
            active={activePill === 'reimb'}
            onClick={() => {
              setActivePill('reimb');
            }}
          >
            ◐ REIMB
          </Pill>
          <Pill>▸ APR 2026</Pill>
          <Pill>◱ ALL CATS</Pill>
          <Pill disabled>DISABLED</Pill>
        </div>
      </Block>

      <Block title="03 PROGRESS BAR">
        <div className="space-y-3 px-4 pb-3">
          <Labeled hint="25% accent">
            <ProgressBar value={25} max={100} />
          </Labeled>
          <Labeled hint="75% accent">
            <ProgressBar value={75} max={100} />
          </Labeled>
          <Labeled hint="100% accent">
            <ProgressBar value={100} max={100} />
          </Labeled>
          <Labeled hint="110% capped to 100% (over)">
            <ProgressBar value={110} max={100} variant="warn" />
          </Labeled>
          <Labeled hint="50% warn">
            <ProgressBar value={50} max={100} variant="warn" />
          </Labeled>
        </div>
      </Block>

      <Block title="04 CATEGORY ROW">
        <CategoryRow
          name="Groceries"
          amount="€919"
          meta="18 TXN · 21.4% OF APR · €31 LEFT"
          progress={919}
          max={950}
          onClick={() => undefined}
        />
        <CategoryRow
          name="Dining"
          amount="€468"
          meta="12 TXN · 10.9% OF APR · €132 LEFT"
          progress={468}
          max={600}
          onClick={() => undefined}
        />
        <CategoryRow
          name="Transport"
          amount="€212"
          meta="8 TXN · 4.9% OF APR · €88 LEFT"
          progress={212}
          max={300}
          onClick={() => undefined}
        />
        <CategoryRow
          name="Subscriptions"
          amount="€87"
          meta="3 TXN · 2.0% OF APR"
          onClick={() => undefined}
        />
        <CategoryRow
          name="Entertainment"
          amount="€242"
          meta="OVER €42 · 5 TXN · 5.6% OF APR"
          progress={242}
          max={200}
          variant="over"
          onClick={() => undefined}
        />
      </Block>

      <Block title="05 TRANSACTION ROW">
        <TransactionRow
          merchant="Albert Heijn"
          amount="€42.10"
          sign="-"
          meta="APR 8 · GROCERIES"
          onClick={() => undefined}
        />
        <TransactionRow
          merchant="Salary — ACME B.V."
          amount="€3,420.00"
          sign="+"
          meta="APR 1 · INCOME"
          variant="income"
          onClick={() => undefined}
        />
        <TransactionRow
          merchant="Dinner with M."
          amount="€48.00"
          sign="-"
          meta="APR 7 · DINING · REIMB €48.00"
          variant="pending"
          onClick={() => undefined}
        />
        <TransactionRow
          merchant="Transfer to savings"
          amount="€500.00"
          sign=""
          meta="APR 5 · TRANSFER"
          variant="transfer"
          onClick={() => undefined}
        />
        <TransactionRow
          merchant="Bol.com"
          amount="€18.95"
          sign="-"
          meta="UNCATEGORIZED"
          variant="uncat"
          onClick={() => undefined}
        />
      </Block>

      <Block title="06 DAY HEADER">
        <DayHeader label="TUE · APR 8" />
        <DayHeader label="MON · APR 7" total="−€96.00" />
        <DayHeader label="SUN · APR 6" total="−€12.40" />
      </Block>

      <Block title="07 STATUS GLYPH">
        <div className="space-y-3 px-4 pb-3">
          <StatusGlyph
            glyph="▸"
            label="READY"
            tone="textLo"
            trailing={
              <span
                aria-hidden
                className="cursor-blink ml-1 inline-block h-3 w-2 bg-accent"
              />
            }
          />
          <StatusGlyph glyph="◐" label="LAST SYNC 2 MIN AGO" tone="textMid" />
          <StatusGlyph label="ALL BANKS UP" tone="accent" />
        </div>
      </Block>

      <Block title="08 SCRUBBER">
        <div className="space-y-6 px-4 pb-3">
          <Labeled hint="L1 — total budget €4,500, current = APR">
            <Scrubber
              bars={scrubberBarsL1}
              selectedMonthKey={scrubberMonth}
              budget={4500}
              budgetCaption="BUDGET €4,500"
              onSelectMonth={setScrubberMonth}
            />
          </Labeled>
          <Labeled hint="L2 — category budget €950, current = APR">
            <Scrubber
              bars={scrubberBarsL3.map((b) => ({
                ...b,
                amount: b.amount + 270,
              }))}
              selectedMonthKey={scrubberMonth}
              budget={950}
              budgetCaption="BUDGET €950"
              onSelectMonth={setScrubberMonth}
            />
          </Labeled>
          <Labeled hint="L3 — no budget line, no alert state">
            <Scrubber
              bars={scrubberBarsL3}
              selectedMonthKey={scrubberMonth}
              onSelectMonth={setScrubberMonth}
            />
          </Labeled>
        </div>
      </Block>

      <Block title="09 BREADCRUMB">
        <div className="space-y-2 pb-2">
          <Breadcrumb segments={[{ label: 'EXPENSES' }]} onBack={() => undefined} />
          <Breadcrumb
            segments={[
              { label: 'EXPENSES', href: '/expenses' },
              { label: 'GROCERIES' },
            ]}
            onBack={() => undefined}
            onSegmentClick={() => undefined}
          />
          <Breadcrumb
            segments={[
              { label: 'EXPENSES', href: '/expenses' },
              { label: 'GROCERIES', href: '/expenses/x' },
              { label: 'SUPERMARKET' },
            ]}
            onBack={() => undefined}
            onSegmentClick={() => undefined}
          />
        </div>
      </Block>

      <Block title="10 DRILL HEADLINE">
        <div className="space-y-4 pb-3">
          <DrillHeadline
            amountFormatted="€4,292.00"
            monthLabel="APR 2026"
            budgetCaption="BUDGET €4,500"
          />
          <DrillHeadline
            amountFormatted="€919.00"
            monthLabel="APR 2026"
            budgetCaption="BUDGET €950"
          />
          <DrillHeadline amountFormatted="€641.00" monthLabel="APR 2026" />
        </div>
      </Block>

      <Block title="11 DRILL ROW">
        <DrillRow
          index={1}
          name="Groceries"
          amount="€950"
          spentLabel="€919"
          meta="12 TXN · 27.4% OF MAY · €31 LEFT"
          progress={919}
          max={950}
          onClick={() => undefined}
        />
        <DrillRow
          index={2}
          name="Car"
          amount="€700"
          spentLabel="€658"
          meta="4 TXN · 27.3% OF MAY · €42 LEFT"
          progress={658}
          max={700}
          onClick={() => undefined}
        />
        <DrillRow
          index={3}
          name="Housing"
          amount="€1.990"
          spentLabel="€100"
          meta="3 TXN · 4.1% OF MAY · €1.890 LEFT"
          progress={100}
          max={1990}
          onClick={() => undefined}
        />
        <DrillRow
          index={4}
          name="Entertainment"
          amount="€200"
          spentLabel="€242"
          meta="6 TXN · 9.1% OF MAY · €42 OVER"
          progress={242}
          max={200}
          variant="over"
          onClick={() => undefined}
        />
        <DrillRow
          index={5}
          name="Subscriptions (no budget)"
          amount="€87"
          meta="2 TXN · 3.2% OF MAY · NO BUDGET"
          onClick={() => undefined}
        />
      </Block>

      <Block title="12 PHOSPHOR BUTTON">
        <div className="space-y-3 px-4 pb-3">
          <PhosphorButton onClick={() => undefined}>
            ▸ CONTINUE WITH GOOGLE
          </PhosphorButton>
          <PhosphorButton variant="warn" onClick={() => undefined}>
            DELETE TRANSACTION
          </PhosphorButton>
          <PhosphorButton disabled>DISABLED</PhosphorButton>
        </div>
      </Block>
      </div>
    </div>
  );
}

interface BlockProps {
  title: string;
  children: React.ReactNode;
}

function Block({ title, children }: BlockProps) {
  return (
    <section className="mb-2">
      <div className="px-4 pt-6 pb-3 font-mono text-[9px] tracking-[0.16em] text-textDim upper-wide">
        {title}
      </div>
      {children}
    </section>
  );
}

interface LabeledProps {
  hint: string;
  children: React.ReactNode;
}

function Labeled({ hint, children }: LabeledProps) {
  return (
    <div>
      <div className="mb-1 font-mono text-ct-meta text-textLo upper-tight">
        {hint}
      </div>
      {children}
    </div>
  );
}
