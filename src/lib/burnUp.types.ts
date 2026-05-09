/**
 * Cumulative spend per day, indexed 0..daysInMonth.
 * Index 0 is €0 at the start of day 1.
 */
export interface TimelineRow {
  dateKey: string; // "YYYY-MM-DD"
  expenses: number;
}

/**
 * One scheduled fixed cost in the current month.
 *
 * d — day-of-month (1..daysInMonth)
 * a — euro amount (positive)
 * l — short label (e.g. "rent", "internet")
 */
export interface FixedCost {
  d: number;
  a: number;
  l: string;
}
