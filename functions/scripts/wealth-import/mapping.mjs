/**
 * Account → Holding mapping for the net-worth import. Keyed by
 * `${kind}:${sheetRowName}` so labels that appear as both an asset and a
 * liability (House, Apto, Nubank, Tesla) stay distinct.
 *
 * Fields per entry:
 *   name             display name on the Wealth screen
 *   platform         where it's held (cosmetic)
 *   type             AssetType: Real Estate | Equities | Crypto | Cash | Mortgage | Credit | Loan
 *   liquidity        'liquid' | 'illiquid'
 *   symbol           ticker / coin id for future auto-pricing (else null)
 *   valuation        override: 'EUR' | 'BRL' | 'BTC' (else inferred from flag/name)
 *   include          false → keep in reconciliation but DON'T import (default true)
 *   needsTypeDecision true → type is a placeholder awaiting the user's call
 *
 * THESE ARE PROPOSALS. type / liquidity / include are the user's calls.
 */
export const MAPPING = {
  // ── Deposits (cash) ──
  'asset:ABN': { name: 'ABN AMRO', platform: 'ABN AMRO', type: 'Cash', liquidity: 'liquid' },
  'asset:BB (R$)': { name: 'Banco do Brasil', platform: 'Banco do Brasil', type: 'Cash', liquidity: 'liquid' },
  'asset:Nubank (R$)': { name: 'Nubank', platform: 'Nubank', type: 'Cash', liquidity: 'liquid' },
  'asset:Transferwise': { name: 'Wise', platform: 'Wise', type: 'Cash', liquidity: 'liquid' },

  // ── Financial instruments ──
  'asset:XP (R$)': { name: 'XP Investimentos', platform: 'XP', type: 'Equities', liquidity: 'liquid' },
  'asset:FGTS (R$)': { name: 'FGTS', platform: 'Caixa', type: 'Equities', liquidity: 'illiquid' },
  'asset:NOVIA': { name: 'Novia', platform: 'Novia', type: 'Equities', liquidity: 'liquid' },
  'asset:ASML Stocks': { name: 'ASML', platform: 'ASML', type: 'Equities', liquidity: 'liquid', symbol: 'ASML' },

  // ── Real estate ──
  'asset:House, Eindhoven': { name: 'House, Eindhoven', platform: 'Self-held', type: 'Real Estate', liquidity: 'illiquid' },
  'asset:Apto, POA (R$)': { name: 'Apartment, Porto Alegre', platform: 'Self-held', type: 'Real Estate', liquidity: 'illiquid' },

  // ── Digital assets (crypto) ──
  'asset:BTC': { name: 'Bitcoin', platform: 'Self-held', type: 'Crypto', liquidity: 'liquid', symbol: 'BTC', valuation: 'BTC' },
  'asset:BTC Oranje (Paulo) (link contrato)': { name: 'Bitcoin (loaned, Paulo)', platform: 'Loan contract', type: 'Crypto', liquidity: 'illiquid', symbol: 'BTC', valuation: 'BTC' },
  'asset:Hudl VESTED stock (NET, i.e. 50% of total)': { name: 'Hudl vested stock', platform: 'Hudl', type: 'Equities', liquidity: 'illiquid' },

  // ── Objects of value (vehicles) ──
  'asset:MiTo': { name: 'Alfa Romeo MiTo', platform: 'Self-held', type: 'Vehicle', liquidity: 'illiquid' },
  'asset:Tesla Model 3': { name: 'Tesla Model 3', platform: 'Self-held', type: 'Vehicle', liquidity: 'illiquid' },

  // ── Receivables (zero at latest snapshot; kept for history) ──
  'asset:Abatimento IR': { name: 'IR rebate receivable', platform: '', type: 'Cash', liquidity: 'illiquid' },
  'asset:Supershortlease': { name: 'Supershortlease receivable', platform: '', type: 'Cash', liquidity: 'illiquid' },

  // ── Liabilities ──
  'liability:Nubank (R$)': { name: 'Nubank (debt)', platform: 'Nubank', type: 'Credit', liquidity: 'liquid' },
  'liability:House, Eindhoven': { name: 'Mortgage, Eindhoven', platform: '', type: 'Mortgage', liquidity: 'illiquid' },
  'liability:Apto, POA': { name: 'Mortgage, Porto Alegre', platform: '', type: 'Mortgage', liquidity: 'illiquid' },
  'liability:Tesla Model 3 (ribank, mijn findio)': { name: 'Tesla Model 3 loan', platform: 'Findio', type: 'Loan', liquidity: 'illiquid' },
};
