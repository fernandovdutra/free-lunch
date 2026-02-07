/**
 * ICS Credit Card PDF Statement Parser
 *
 * Parses ICS (ABN AMRO credit card) PDF statements into structured transaction data.
 * Uses pdfjs-dist for client-side PDF text extraction.
 */

// Types
export interface IcsStatementHeader {
  statementDate: Date;
  customerNumber: string;
  totalNewExpenses: number;
  debitIban: string;
  estimatedDebitDate: Date;
}

export interface IcsTransaction {
  transactionDate: Date;
  bookingDate: Date;
  description: string; // Merchant name
  city: string;
  country: string; // 3-letter code
  foreignAmount: number | null;
  foreignCurrency: string | null;
  exchangeRate: number | null;
  amountEur: number;
  direction: 'Af' | 'Bij';
}

export interface IcsParseResult {
  header: IcsStatementHeader;
  transactions: IcsTransaction[];
  warnings: string[];
  statementId: string; // e.g. "78179360017_2026-01"
}

// Dutch month abbreviations (with and without period)
const DUTCH_MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mrt: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  dec: 11,
};

const DUTCH_FULL_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11,
};

/**
 * Parse a Dutch abbreviated date like "30 dec." or "06 jan."
 * Year is inferred from the statement date.
 */
export function parseDutchDate(dateStr: string, statementYear: number, statementMonth: number): Date {
  const match = dateStr.trim().match(/^(\d{1,2})\s+([a-z]+)\.?$/i);
  if (!match) throw new Error(`Cannot parse Dutch date: "${dateStr}"`);

  const dayStr = match[1] ?? '';
  const monthStr = (match[2] ?? '').toLowerCase();
  const day = parseInt(dayStr, 10);
  const month = DUTCH_MONTHS[monthStr];
  if (month === undefined) throw new Error(`Unknown Dutch month: "${monthStr}"`);

  // Year inference: if the transaction month is > statement month,
  // it's from the previous year (e.g. Dec transaction on a Jan statement)
  let year = statementYear;
  if (month > statementMonth) {
    year = statementYear - 1;
  }

  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Parse a Dutch full date like "26 januari 2026"
 */
function parseFullDutchDate(dateStr: string): Date {
  const match = dateStr.trim().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (!match) throw new Error(`Cannot parse full Dutch date: "${dateStr}"`);

  const dayStr = match[1] ?? '';
  const monthStr = (match[2] ?? '').toLowerCase();
  const yearStr = match[3] ?? '';
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  const month = DUTCH_FULL_MONTHS[monthStr];
  if (month === undefined) throw new Error(`Unknown Dutch month: "${monthStr}"`);

  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Parse a Dutch amount like "36,00" or "692,52" to a number
 */
export function parseDutchAmount(amountStr: string): number {
  // Remove any spaces, replace comma with dot
  const cleaned = amountStr.trim().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) throw new Error(`Cannot parse amount: "${amountStr}"`);
  return num;
}

// Country codes to distinguish from currency codes
const COUNTRY_CODES = new Set([
  'FRA', 'GBR', 'DEU', 'USA', 'NLD', 'BEL', 'ESP', 'ITA', 'AUT', 'CHE',
  'PRT', 'GRC', 'IRL', 'LUX', 'POL', 'CZE', 'HUN', 'SWE', 'NOR', 'DNK',
  'FIN', 'TUR', 'CAN', 'AUS', 'JPN', 'CHN', 'BRA', 'MEX', 'THA', 'IDN',
]);

// Lines to skip during parsing
const SKIP_PATTERNS = [
  /^GEINCASSEERD VORIG SALDO/i,
  /^Uw Card met als laatste/i,
  /^Wisselkoers\s/i,
  /^Nu beschikbaar/i,
  /^Uw betalingen aan/i,
  /^Het totale saldo/i,
  /^E\d{15}/,
  /^Minimaal te betalen/i,
  /^Bestedingslimiet/i,
  /^International Card Services/i,
  /^Postbus/i,
  /^\d{4}\s+DS\s+Diemen/i,
  /^Telefoon/i,
  /^Kvk\s/i,
  /^www\./i,
  /^Bankrek\./i,
  /^BIC:/i,
  /^ICS identificatie/i,
  /^NL\d{2}ZZZ/i,
  /^Dit product valt/i,
];

function shouldSkipLine(text: string): boolean {
  return SKIP_PATTERNS.some((pat) => pat.test(text.trim()));
}

/**
 * Check if a line is a cardholder name (all caps name, no numbers)
 */
function isCardholderName(text: string): boolean {
  const trimmed = text.trim();
  // Names like "F. VELHO DUTRA" - all caps, with optional dots and spaces
  return /^[A-Z][A-Z.\s-]+$/.test(trimmed) && trimmed.length > 3 && trimmed.length < 40;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  page: number;
  width: number;
}

/**
 * Parse an ICS PDF statement from an ArrayBuffer.
 * Lazy-loads pdfjs-dist to avoid bundling ~400KB on initial page load.
 */
export async function parseIcsStatement(pdfBuffer: ArrayBuffer): Promise<IcsParseResult> {
  // Dynamic import for code-splitting
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source - use bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).href;

  const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const warnings: string[] = [];

  // Extract all text items from all pages with positions
  const allTextItems: TextItem[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform;
        allTextItems.push({
          str: item.str,
          x: transform[4] as number,
          y: transform[5] as number,
          page: pageNum,
          width: item.width,
        });
      }
    }
  }

  // Group text items into rows by Y-coordinate (used for both header and transaction parsing)
  const rows = groupIntoRows(allTextItems);

  // Parse header info using row-based extraction
  // The PDF has a header table with labels on one row and values on the next
  const fullText = allTextItems.map((t) => t.str).join(' ');

  // Extract statement date: "26 januari 2026"
  const dateMatch = fullText.match(/Datum\s+ICS-klantnummer.*?(\d{1,2}\s+[a-z]+\s+\d{4})/i)
    ?? fullText.match(/(\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4})/i);
  if (!dateMatch?.[1]) throw new Error('Could not find statement date in PDF');
  const statementDate = parseFullDutchDate(dateMatch[1]);
  const statementYear = statementDate.getFullYear();
  const statementMonth = statementDate.getMonth();

  // Extract customer number
  const customerMatch = fullText.match(/ICS-klantnummer\s+.*?(\d{11})/);
  if (!customerMatch?.[1]) throw new Error('Could not find ICS customer number in PDF');
  const customerNumber = customerMatch[1];

  // Extract total new expenses using row-based approach
  // Find the row containing "Totaal nieuwe uitgaven", then get values from the next row
  let totalNewExpenses = 0;
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i]!.map((t) => t.str).join(' ');
    if (rowText.includes('Totaal nieuwe uitgaven')) {
      // The values row is the next row
      const valuesRow = rows[i + 1];
      if (valuesRow) {
        // Values row contains: "€ 692,52 | Af | € 692,52 | Bij | € 712,40 | Af | € 712,40 | Af"
        // Extract all € amounts and their directions
        const valuesText = valuesRow.map((t) => t.str).join(' ');
        // Find the third "€ amount" (Totaal nieuwe uitgaven is the third column)
        const amountMatches = [...valuesText.matchAll(/€\s*([\d.,]+)/g)];
        const thirdAmount = amountMatches[2];
        if (thirdAmount?.[1]) {
          totalNewExpenses = parseDutchAmount(thirdAmount[1]);
        }
      }
      break;
    }
  }
  if (totalNewExpenses === 0) throw new Error('Could not find total new expenses in PDF');

  // Extract debit IBAN and estimated debit date from the footer text
  const ibanMatch = fullText.match(/bankrekening\s+(NL\w+)/i);
  const debitIban = ibanMatch?.[1] ?? '';

  const debitDateMatch = fullText.match(/omstreeks\s+(\d{1,2}\s+[a-z]+\s+\d{4})/i);
  let estimatedDebitDate = new Date(statementYear, statementMonth, 1);
  if (debitDateMatch?.[1]) {
    try {
      estimatedDebitDate = parseFullDutchDate(debitDateMatch[1]);
    } catch {
      // fallback to statement date
    }
  }

  // Build statement ID
  const monthStr = String(statementMonth + 1).padStart(2, '0');
  const statementId = `${customerNumber}_${statementYear}-${monthStr}`;

  // Parse transaction rows (reusing rows grouped above)
  const transactions: IcsTransaction[] = [];
  let lastTransaction: IcsTransaction | null = null;

  for (const row of rows) {
    const lineText = row.map((t) => t.str).join(' ').trim();

    // Skip known non-transaction lines
    if (shouldSkipLine(lineText)) continue;
    if (isCardholderName(lineText)) continue;

    // Skip header rows
    if (/^Datum\s/i.test(lineText)) continue;
    if (/^Vorig openstaand/i.test(lineText)) continue;
    if (/^transactie/i.test(lineText)) continue;
    if (/^boeking/i.test(lineText)) continue;
    if (/^Bladnummer/i.test(lineText)) continue;
    if (/^Volgnummer/i.test(lineText)) continue;
    if (/€/.test(lineText) && /Af.*Bij.*Af.*Af/i.test(lineText)) continue;
    if (/Bedrag/i.test(lineText)) continue;
    if (/^Omschrijving/i.test(lineText)) continue;
    if (/^\d+\s*$/.test(lineText)) continue; // Page numbers

    // Check for Wisselkoers line - attach exchange rate to previous transaction
    const wisselMatch = lineText.match(/Wisselkoers\s+[A-Z]{3}\s+([\d.,]+)/);
    if (wisselMatch?.[1] && lastTransaction) {
      lastTransaction.exchangeRate = parseDutchAmount(wisselMatch[1]);
      continue;
    }

    // Try to parse as transaction row
    const tx = parseTransactionRow(row, statementYear, statementMonth);
    if (tx) {
      // Skip "GEINCASSEERD VORIG SALDO" (Bij credit)
      if (tx.description.includes('GEINCASSEERD VORIG SALDO')) continue;

      transactions.push(tx);
      lastTransaction = tx;
    }
  }

  // Validate: sum of "Af" transactions should ≈ total
  const afSum = transactions
    .filter((t) => t.direction === 'Af')
    .reduce((sum, t) => sum + t.amountEur, 0);
  const diff = Math.abs(afSum - totalNewExpenses);
  if (diff > 0.02) {
    warnings.push(
      `Sum of parsed transactions (€${afSum.toFixed(2)}) differs from statement total (€${totalNewExpenses.toFixed(2)}) by €${diff.toFixed(2)}`
    );
  }

  return {
    header: {
      statementDate,
      customerNumber,
      totalNewExpenses,
      debitIban,
      estimatedDebitDate,
    },
    transactions,
    warnings,
    statementId,
  };
}

/**
 * Group text items into rows by page and Y-coordinate proximity.
 * Items on different pages are never grouped together.
 */
function groupIntoRows(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by page ascending, then Y descending (top to bottom), then X ascending
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);

  const firstItem = sorted[0];
  if (!firstItem) return [];

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [firstItem];
  let currentY = firstItem.y;
  let currentPage = firstItem.page;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item) continue;
    // Same row only if same page and Y within 3 units
    if (item.page === currentPage && Math.abs(item.y - currentY) < 3) {
      currentRow.push(item);
    } else {
      rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
      currentPage = item.page;
    }
  }
  rows.push(currentRow);

  // Sort items within each row by X
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  return rows;
}

/**
 * Try to parse a row of text items as a transaction.
 * Returns null if the row doesn't match the transaction pattern.
 */
function parseTransactionRow(
  row: TextItem[],
  statementYear: number,
  statementMonth: number
): IcsTransaction | null {
  // Combine row into text for analysis
  const texts = row.map((t) => t.str.trim()).filter(Boolean);

  // Transaction rows start with a date pattern: "DD mmm."
  const datePattern = /^\d{1,2}\s+[a-z]{3}\.?$/i;
  if (texts.length < 3) return null;

  // Find the two date columns
  let txDateStr: string | null = null;
  let bookDateStr: string | null = null;
  let restStartIdx = 0;

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) continue;
    if (datePattern.test(text)) {
      if (!txDateStr) {
        txDateStr = text;
      } else {
        bookDateStr = text;
        restStartIdx = i + 1;
        break;
      }
    }
  }

  if (!txDateStr || !bookDateStr) return null;

  // Parse remaining items: description parts, possible foreign amount, EUR amount, direction
  const rest = texts.slice(restStartIdx);
  if (rest.length < 2) return null;

  // Last item should be direction (Af or Bij)
  const directionStr = rest[rest.length - 1];
  if (directionStr !== 'Af' && directionStr !== 'Bij') return null;

  // Second to last should be the EUR amount
  const eurAmountStr = rest[rest.length - 2];
  if (!eurAmountStr) return null;
  let amountEur: number;
  try {
    amountEur = parseDutchAmount(eurAmountStr);
  } catch {
    return null;
  }

  // Check for foreign amount (format: "33,71 USD" or just "33,71" followed by "USD")
  let foreignAmount: number | null = null;
  let foreignCurrency: string | null = null;
  let descEndIdx = rest.length - 2; // default: everything before EUR amount

  // Look for currency code near the end (not a country code)
  for (let i = rest.length - 3; i >= Math.max(0, rest.length - 5); i--) {
    const token = rest[i];
    if (!token) continue;
    if (/^[A-Z]{3}$/.test(token) && !COUNTRY_CODES.has(token)) {
      // This is a currency code - the amount before it is the foreign amount
      foreignCurrency = token;
      const prevToken = rest[i - 1];
      if (i > 0 && prevToken) {
        try {
          foreignAmount = parseDutchAmount(prevToken);
          descEndIdx = i - 1;
        } catch {
          // Not a foreign amount
        }
      }
      break;
    }
  }

  // Description is everything between dates and amounts
  // Usually: MERCHANT_NAME CITY COUNTRY_CODE
  const descParts = rest.slice(0, descEndIdx);
  if (descParts.length === 0) return null;

  // Last part of description is usually the country code (3 letters)
  const lastDescPart = descParts[descParts.length - 1] ?? '';
  const countryCode = /^[A-Z]{3}$/.test(lastDescPart) ? lastDescPart : '';

  // Second to last is usually the city (if country exists)
  let city = '';
  let merchantParts: string[];
  if (countryCode && descParts.length >= 3) {
    city = descParts[descParts.length - 2] ?? '';
    merchantParts = descParts.slice(0, -2);
  } else if (countryCode && descParts.length === 2) {
    // Just merchant + country, no city
    merchantParts = descParts.slice(0, -1);
  } else {
    merchantParts = descParts;
  }

  const description = merchantParts.join(' ');

  try {
    const transactionDate = parseDutchDate(txDateStr, statementYear, statementMonth);
    const bookingDate = parseDutchDate(bookDateStr, statementYear, statementMonth);

    return {
      transactionDate,
      bookingDate,
      description,
      city,
      country: countryCode,
      foreignAmount,
      foreignCurrency,
      exchangeRate: null, // Set later from Wisselkoers line
      amountEur,
      direction: directionStr,
    };
  } catch {
    return null;
  }
}
