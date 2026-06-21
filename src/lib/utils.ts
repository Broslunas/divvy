/**
 * Shared utility functions for the Divvy app.
 */
import type { ItemizedBillItem } from '@/types';

/**
 * Returns the currency symbol for a given ISO 4217 currency code.
 */
export const getCurrencySymbol = (code?: string): string => {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    MXN: '$',
    COP: '$',
    ARS: '$',
    CLP: '$',
    PEN: 'S/',
    BRL: 'R$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    RON: 'lei',
    TRY: '₺',
    INR: '₹',
    CNY: '¥',
    KRW: '₩',
    THB: '฿',
    AUD: 'A$',
    CAD: 'C$',
    NZD: 'NZ$',
    SGD: 'S$',
    HKD: 'HK$',
    ZAR: 'R',
    ILS: '₪',
    AED: 'د.إ',
    SAR: '﷼',
  };
  return symbols[code || 'EUR'] || code || '€';
};

/**
 * Returns initials from a username (max 2 characters).
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Compute how much each participant owes for a single itemized article.
 * Returns a map of userId → amount in the article's currency.
 */
export function computeItemShare(item: ItemizedBillItem): Record<string, number> {
  const shares: Record<string, number> = {};
  const t = item.splitType ?? 'equal';

  if (t === 'equal' || item.userIds.length === 0) {
    const share = item.userIds.length > 0 ? item.amount / item.userIds.length : 0;
    item.userIds.forEach(uid => { shares[uid] = share; });
    return shares;
  }

  const values = item.splitValues ?? {};

  if (t === 'exact') {
    item.userIds.forEach(uid => { shares[uid] = parseFloat(values[uid] || '0') || 0; });
    return shares;
  }

  if (t === 'percentage') {
    item.userIds.forEach(uid => {
      const pct = parseFloat(values[uid] || '0') || 0;
      shares[uid] = (pct / 100) * item.amount;
    });
    return shares;
  }

  if (t === 'shares') {
    const totalShares = item.userIds.reduce(
      (s, uid) => s + (parseFloat(values[uid] || '0') || 0),
      0
    );
    item.userIds.forEach(uid => {
      const pts = parseFloat(values[uid] || '0') || 0;
      shares[uid] = totalShares > 0 ? (pts / totalShares) * item.amount : 0;
    });
    return shares;
  }

  return shares;
}

/**
 * Aggregate itemized shares across all articles into per-member totals.
 * `memberIds` is the full group roster so every member appears in the output.
 */
export function computeItemizedDebts(
  items: ItemizedBillItem[],
  memberIds: string[],
): { userId: string; value: number }[] {
  const debts: Record<string, number> = {};
  memberIds.forEach(id => { debts[id] = 0; });

  items.forEach(item => {
    const shares = computeItemShare(item);
    Object.entries(shares).forEach(([uid, val]) => {
      if (debts[uid] !== undefined) debts[uid] += val;
    });
  });

  return Object.entries(debts).map(([userId, value]) => ({
    userId,
    value: Math.round(value * 100) / 100,
  }));
}
