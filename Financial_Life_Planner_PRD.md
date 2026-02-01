# Product Requirements Document (PRD)

## Personal Financial Planning & Scenario Modeling Tool

---

### 1. Executive Summary

**Product Name:** Financial Life Planner

**Purpose:** A personal financial planning tool that allows the user to model various life scenarios (relocation, income changes, investment strategies, retirement timing) and visualize their impact on long-term wealth accumulation and retirement readiness.

**Target User:** Fernando (and Aline) - expat professionals with complex financial situations spanning multiple countries, currencies, and asset classes.

---

### 2. Problem Statement

Managing personal finances across multiple countries, currencies, and asset types while planning for major life decisions (relocation, career changes, retirement) requires:

- Manual calculation of complex interdependencies
- Difficulty comparing multiple scenarios side-by-side
- No single source of truth for financial data
- Inability to quickly adjust assumptions and see impacts

---

### 3. Core Features

#### 3.1 Financial Profile Dashboard

**Data Points to Capture:**

**Personal Information:**

- Names, dates of birth, nationalities
- Current country of residence
- Employment status and details
- Risk profile category

**Income Sources:**

| Variable                    | Current Value                      | Adjustable? |
| --------------------------- | ---------------------------------- | ----------- |
| Gross salary (Fernando)     | €150,732/year                      | ✓           |
| Gross salary (Aline)        | €0 (current) / €76,000 (potential) | ✓           |
| Tax rate (by country)       | NL: 43%, ES: 52%/34%               | ✓           |
| Performance bonus           | €6,782 net/year                    | ✓           |
| Holiday allowance           | €11,484 net/year                   | ✓           |
| Stock options vesting       | 30,000 options/year, 5-year vest   | ✓           |
| Expected net stock proceeds | €10,000/year for 5 years           | ✓           |

**Assets:**

| Asset                  | Current Value | Currency | Category     | Growth Rate  |
| ---------------------- | ------------- | -------- | ------------ | ------------ |
| Primary residence      | €595,000      | EUR      | Illiquid     | User-defined |
| Property in Brazil     | R$300,000     | BRL      | Illiquid     | User-defined |
| Car                    | €33,000       | EUR      | Depreciating | -10%/year    |
| Bitcoin                | €136,000      | EUR      | Semi-liquid  | User-defined |
| Novia Global portfolio | €74,274       | EUR      | Semi-liquid  | 6.5-8.5%     |
| Hudl vested shares     | €22,900       | EUR      | Semi-liquid  | User-defined |
| Cash savings           | €17,000       | EUR      | Liquid       | 0%           |

**Liabilities:**

| Liability | Balance  | Interest Rate | Monthly Payment | Term Remaining |
| --------- | -------- | ------------- | --------------- | -------------- |
| Mortgage  | €393,665 | Variable      | €1,286          | User input     |
| Car loan  | €28,988  | Variable      | User input      | User input     |

**Pension Assets:**

| Provider              | Max Amount | Built-up Amount | Drawdown Date |
| --------------------- | ---------- | --------------- | ------------- |
| PME pensioenfonds     | €9,349     | €1,230          | 2056          |
| Nationale-Nederlanden | €4,127     | €4,127          | 2056          |
| AOW pension           | Variable   | €860/year       | 2057          |

**Monthly Expenses:**

| Category         | Amount | Adjustable? |
| ---------------- | ------ | ----------- |
| Living expenses  | €5,814 | ✓           |
| Mortgage payment | €1,286 | ✓           |
| Vacations        | €400   | ✓           |
| **Total**        | €7,500 | -           |

---

#### 3.2 Scenario Engine

**Pre-built Scenarios:**

1. **Stay in Netherlands (Single Income)**
   - Fernando continues as sole earner
   - Current expense structure
   - No regular investment additions

2. **Stay in Netherlands (Dual Income)**
   - Aline returns to work (doctor salary NL)
   - Increased childcare costs
   - Additional investment capacity

3. **Relocate to Spain (Barcelona) - Single Income**
   - Move in 2 years
   - 16% cost of living reduction
   - Higher tax rate for Fernando
   - No additional investments initially

4. **Relocate to Spain (Barcelona) - Dual Income**
   - Move in 2 years
   - Aline works as doctor after 2 more years (4 years from now)
   - Combined income: €10,250/month net
   - Monthly surplus: €3,415

5. **Entrepreneurship at Age 40**
   - Leave Hudl at age 40 (2029)
   - Variable income assumptions
   - Different risk profiles

**Custom Scenario Builder:**

- Clone any scenario
- Adjust any variable
- Name and save scenarios
- Compare up to 4 scenarios side-by-side

---

#### 3.3 Investment Modeling

**Variables:**

| Parameter                 | Default              | Range      |
| ------------------------- | -------------------- | ---------- |
| Expected return (nominal) | 7.5%                 | 0-15%      |
| Inflation rate            | 3%                   | 0-10%      |
| Initial lump sum          | €62,000              | Any        |
| Monthly contribution      | €0 / €750 / €2,500   | Any        |
| Contribution growth rate  | 2%/year              | 0-5%       |
| Investment period         | 35 years (to age 69) | 1-50 years |
| Tax on gains              | 50% (conservative)   | 0-50%      |

**Asset Allocation Rules:**

- Maximum single asset concentration: 10%
- Recommended cash buffer: 3-6 months expenses
- Bitcoin cap recommendation: 10% of liquid/semi-liquid

**Automatic Alerts:**

- Concentration risk warnings
- Below cash buffer threshold
- Deviation from risk profile

---

#### 3.4 Retirement Calculator

**Inputs:**

| Variable                              | Default         | Source                                 |
| ------------------------------------- | --------------- | -------------------------------------- |
| Target retirement age                 | 69              | User                                   |
| Extended work age                     | 75              | User preference                        |
| Current annual expenses               | €90,000         | Calculated                             |
| Expected expense change at retirement | 0%              | User (adj for mortgage payoff, travel) |
| Long-term inflation                   | 3%              | Economic assumption                    |
| Safe withdrawal rate                  | 4-5%            | Industry standard                      |
| Pension income (NL)                   | 28% of expenses | Black Swan estimate                    |

**Outputs:**

| Metric                 | Netherlands             | Spain                   |
| ---------------------- | ----------------------- | ----------------------- |
| Required capital at 69 | €3,500,000 - €5,300,000 | €3,000,000 - €4,600,000 |
| Required capital at 75 | €4,200,000 - €6,400,000 | €3,600,000 - €5,500,000 |
| Current trajectory     | Calculate               | Calculate               |
| Gap/surplus            | Calculate               | Calculate               |
| Probability of success | Monte Carlo             | Monte Carlo             |

---

#### 3.5 Currency & Exchange Rate Module

**Currencies:**

- EUR (primary)
- BRL (Brazil assets)
- USD (potential US move)

**Variables:**

| Rate    | Current    | Historical Volatility |
| ------- | ---------- | --------------------- |
| EUR/BRL | 6.3811     | User research         |
| EUR/USD | User input | User research         |

**Features:**

- Real-time rate fetching (API integration)
- Historical rate lookups
- Manual override capability
- Currency hedging cost estimation

---

#### 3.6 Tax Estimation Engine

**Netherlands:**

- Income tax brackets (Box 1)
- Wealth tax (Box 3) - 32% on fictional 4% return
- 30% ruling status (ended Feb 2024)
- Mortgage interest deduction

**Spain:**

- Income tax (progressive rates)
- Beckham Law eligibility for expats
- Regional variations (Catalonia)
- Wealth tax

**Capital Gains:**

- Crypto taxation by country
- Stock option taxation
- Property gains

_Disclaimer: Not tax advice - estimates only_

---

#### 3.7 Cash Flow Projector

**Monthly View:**

```
Income (net):        €7,132
- Living expenses:   €5,814
- Mortgage:          €1,286
- Vacations:         €400
= Net cash flow:     -€368

Annual adjustments:
+ Bonus (net):       €6,782
+ Holiday allowance: €11,484
= Annual net flow:   €13,850
```

**Projection Features:**

- Month-by-month for 2 years
- Annual for years 3-10
- 5-year blocks for years 11+
- Inflation adjustments
- Income growth assumptions

---

#### 3.8 Visualization Suite

**Charts Required:**

1. **Net Worth Over Time**
   - Stacked area chart by asset class
   - With/without inflation adjustment toggle

2. **Portfolio Value Projection**
   - Line chart with confidence bands
   - Estimated vs. inflation-adjusted values
   - Multiple scenario overlay

3. **Asset Allocation Pie Chart**
   - Current allocation
   - Target allocation
   - Drift warnings

4. **Cash Flow Waterfall**
   - Income → Expenses → Savings → Investment

5. **Retirement Readiness Gauge**
   - Progress toward goal
   - Years to goal at current rate

6. **Scenario Comparison Table**
   - Side-by-side metrics
   - 5/10/15/20/30/40 year projections

---

### 4. User Stories

| ID   | As a... | I want to...                                   | So that...                                      |
| ---- | ------- | ---------------------------------------------- | ----------------------------------------------- |
| US1  | User    | Input my current financial position            | I have a baseline for all calculations          |
| US2  | User    | Create multiple "what-if" scenarios            | I can compare different life paths              |
| US3  | User    | Adjust individual variables with sliders       | I can see immediate impact on projections       |
| US4  | User    | See my retirement readiness score              | I know if I'm on track                          |
| US5  | User    | Model the Spain relocation decision            | I can make an informed choice                   |
| US6  | User    | Track Bitcoin concentration risk               | I know when to rebalance                        |
| US7  | User    | Compare Netherlands vs Spain taxes             | I understand the true cost of living difference |
| US8  | User    | Export projections to PDF                      | I can share with Aline or advisors              |
| US9  | User    | Save my data locally                           | My financial info stays private                 |
| US10 | User    | See projections in both nominal and real terms | I understand inflation's impact                 |

---

### 5. Technical Requirements

#### 5.1 Architecture Options

**Option A: Web Application (React)**

- Pros: Runs anywhere, shareable
- Cons: Hosting costs, security concerns with financial data

**Option B: Desktop Application (Electron)**

- Pros: Local data storage, offline capable
- Cons: Installation required

**Option C: Spreadsheet + UI (Excel/Google Sheets)**

- Pros: Familiar, easy formulas
- Cons: Limited visualization, fragile

**Recommendation:** React web app with local storage (no server) or local-first with optional cloud sync (encrypted)

#### 5.2 Data Storage

```typescript
interface FinancialProfile {
  personal: PersonalInfo;
  income: IncomeSource[];
  assets: Asset[];
  liabilities: Liability[];
  pensions: Pension[];
  expenses: Expense[];
  scenarios: Scenario[];
  settings: UserSettings;
}
```

#### 5.3 Key Calculations

**Future Value with Regular Contributions:**

```
FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
```

**Inflation-Adjusted Value:**

```
Real FV = Nominal FV / (1 + inflation)^n
```

**Required Retirement Capital:**

```
Capital = Annual Expenses × (1 + inflation)^years / SWR
```

**Monte Carlo Simulation:**

- 1,000+ iterations
- Variable returns (normal distribution around expected)
- Variable inflation
- Output: probability distribution of outcomes

---

### 6. MVP Scope

**Phase 1 (MVP):**

- Financial profile input (all assets, liabilities, income, expenses)
- Two pre-built scenarios (NL stay vs Spain move)
- Basic projection charts (net worth, portfolio value)
- Retirement gap calculator
- Export to PDF

**Phase 2:**

- Custom scenario builder
- Monte Carlo simulations
- Tax estimation engine
- Currency module with API

**Phase 3:**

- Actual vs. projected tracking
- Integration with bank/brokerage APIs
- Goal-based planning
- What-if sliders with instant updates

---

### 7. Success Metrics

| Metric                                  | Target               |
| --------------------------------------- | -------------------- |
| Time to input full profile              | < 30 minutes         |
| Time to create new scenario             | < 5 minutes          |
| Calculation accuracy vs spreadsheet     | 99%+                 |
| User can answer "Spain vs NL?" question | Yes, with confidence |

---

### 8. Assumptions & Constraints

**Assumptions:**

- User has access to all financial documents
- Investment returns follow historical patterns (not guaranteed)
- Tax laws remain relatively stable
- User will update data periodically

**Constraints:**

- Not a licensed financial advisor tool
- Not connected to actual accounts (manual input)
- Tax calculations are estimates only
- Projections are not guarantees

---

### 9. Open Questions

1. Should the tool support multiple users (Fernando + Aline separate logins)?
2. Should it integrate with Novia Global/LGT for live portfolio values?
3. How detailed should the tax engine be (every bracket vs. effective rate)?
4. Should it support goal-based planning (e.g., "buy bigger house in 5 years")?
5. What level of Monte Carlo sophistication is needed?

---

### 10. Appendix: Key Numbers from Documents

**Current State (Dec 2024):**

- Net assets: €502,535
- Monthly net income: €7,132
- Monthly expenses: €7,500
- Annual surplus (with bonus/holiday): ~€13,850
- Investment portfolio: €74,274
- Bitcoin: €136,000 (54% concentration - needs rebalancing)
- Cash: €17,000 (below 3-month buffer of €22,500)

**Targets:**

- Cash buffer: €22,000
- Bitcoin allocation: 10% (~€25,000)
- Retirement at 69 (Spain): €3-4.6M
- Retirement at 69 (NL): €3.5-5.3M
- Personal goal at 75: €50-100M (requires entrepreneurship)

---

### 11. Next Steps

1. Review and refine this PRD
2. Decide on technical architecture (React recommended)
3. Build Phase 1 MVP
4. Iterate based on usage

---

_Document created: January 2025_
_Based on: Black Swan Capital Suitability Report (May 2023) and Review Report (December 2024)_
