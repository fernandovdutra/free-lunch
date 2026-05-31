// Visual-verification screenshots for the Wealth UI. Renders the standalone
// preview (mock data, no Firebase) and captures key states.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'http://localhost:5173/wealth-preview.html';
const OUT = 'e2e/screenshots/wealth';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: 440, height: 950 },
  deviceScaleFactor: 2,
});

async function load() {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg path', { timeout: 15000 });
  await page.waitForTimeout(400); // let the ResizeObserver settle the chart width
}

// 1) Main screen — default (NET WORTH, 1Y)
await load();
await page.screenshot({ path: `${OUT}/01-main-default.png`, fullPage: true });

// 2) Subject = EQUITIES + benchmark = S&P 500 (overlay + hero "vs" line)
await page.getByText('EQUITIES', { exact: true }).click();
await page.getByText('S&P 500', { exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-equities-vs-sp500.png`, fullPage: true });

// 3) Holding detail sheet (Bitcoin — auto-priced asset)
await load();
await page.getByText('Bitcoin', { exact: true }).click();
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-holding-detail.png` });

// 4) Check-in flow (first card)
await load();
await page.getByText(/update values/i).first().click();
await page.getByText(/wealth check-in/i).first().waitFor({ timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-checkin.png` });

await browser.close();
console.log('Screenshots written to', OUT);
