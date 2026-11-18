import type { DemoData, Document, Organization } from './model.ts';
import { dateRange, kinds } from './model.ts';
import { ledgerSeeds } from './ledger-seed.ts';

export const chart = [
  { code: '26', name: 'Общехозяйственные расходы' },
  { code: '50', name: 'Касса' },
  { code: '51', name: 'Расчётные счета' },
  { code: '55.03', name: 'Депозитные счета' },
  { code: '60', name: 'Расчёты с поставщиками' },
  { code: '62', name: 'Расчёты с покупателями' },
  { code: '70', name: 'Расчёты по оплате труда' },
  { code: '71', name: 'Расчёты с подотчётными' },
  { code: '90.01', name: 'Выручка' },
];
export interface TrialRow {
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  debitTurnover: number;
  creditTurnover: number;
  closingDebit: number;
  closingCredit: number;
}
export const amountKeys = [
  'openingDebit',
  'openingCredit',
  'debitTurnover',
  'creditTurnover',
  'closingDebit',
  'closingCredit',
] as const;
export function postingFor(d: Document) {
  return {
    debit: d.kind === 'in' && d.account === 'cash' ? '50' : kinds[d.kind].debit,
    credit: d.kind === 'out' && d.account === 'cash' ? '50' : kinds[d.kind].credit,
  };
}
function unit(code: string, d?: Document) {
  return code + '|' + (code === '60' || code === '62' ? d?.contract || '' : '');
}
function openings(data: DemoData, org: Organization) {
  const units = new Map<string, number>();
  for (const a of org.accounts)
    units.set(unit(a.id === 'cash' ? '50' : a.id === 'deposit' ? '55.03' : '51'), a.opening);
  for (const c of data.contracts.filter((c) => c.org === org.id))
    units.set(
      (c.direction === 'client' ? '62' : '60') + '|' + c.id,
      (c.openingAccrued - c.openingPaid) * (c.direction === 'client' ? 1 : -1),
    );
  units.set(unit('26'), ledgerSeeds[org.id]?.expense || 0);
  units.set(unit('90.01'), -(ledgerSeeds[org.id]?.revenue || 0));
  return units;
}
function apply(units: Map<string, number>, d: Document) {
  const p = postingFor(d);
  units.set(unit(p.debit, d), (units.get(unit(p.debit, d)) || 0) + d.amount);
  units.set(unit(p.credit, d), (units.get(unit(p.credit, d)) || 0) - d.amount);
}
function side(units: Map<string, number>, code: string, debit: boolean) {
  return [...units]
    .filter(([k]) => k.split('|')[0] === code)
    .reduce((sum, [, value]) => sum + Math.max(0, debit ? value : -value), 0);
}
export function trialBalance(data: DemoData, org: Organization, period: string): TrialRow[] {
  const { from, to } = dateRange(period);
  const opening = openings(data, org);
  const posted = data.documents.filter(
    (d) => d.org === org.id && d.status === 'posted' && d.date <= to,
  );
  for (const d of posted.filter((d) => d.date < from)) apply(opening, d);
  const closing = new Map(opening);
  const periodDocs = posted.filter((d) => d.date >= from);
  for (const d of periodDocs) apply(closing, d);
  return chart.map((a) => ({
    ...a,
    openingDebit: side(opening, a.code, true),
    openingCredit: side(opening, a.code, false),
    debitTurnover: periodDocs
      .filter((d) => postingFor(d).debit === a.code)
      .reduce((s, d) => s + d.amount, 0),
    creditTurnover: periodDocs
      .filter((d) => postingFor(d).credit === a.code)
      .reduce((s, d) => s + d.amount, 0),
    closingDebit: side(closing, a.code, true),
    closingCredit: side(closing, a.code, false),
  }));
}
export function trialTotal(rows: TrialRow[]) {
  return amountKeys.reduce(
    (result, key) => ({
      ...result,
      [key]: rows.reduce((s, r) => s + r[key], 0),
    }),
    {} as Record<(typeof amountKeys)[number], number>,
  );
}
export function trialConsistent(rows: TrialRow[]) {
  const t = trialTotal(rows);
  return (
    rows.every(
      (r) =>
        amountKeys.every((k) => Number.isSafeInteger(r[k]) && r[k] >= 0) &&
        r.openingDebit - r.openingCredit + r.debitTurnover - r.creditTurnover ===
          r.closingDebit - r.closingCredit,
    ) &&
    t.openingDebit === t.openingCredit &&
    t.debitTurnover === t.creditTurnover &&
    t.closingDebit === t.closingCredit
  );
}
export function accountMatches(code: string, filter: string) {
  return filter === 'all' || code === filter || code.startsWith(filter + '.');
}
export function trialRowsForDisplay(rows: TrialRow[], account: string, hideZero: boolean) {
  return rows.filter(
    (row) =>
      accountMatches(row.code, account) &&
      (!hideZero || account !== 'all' || amountKeys.some((key) => row[key] !== 0)),
  );
}
export function trialMovements(data: DemoData, org: string, period: string, code: string) {
  const { from, to } = dateRange(period);
  return data.documents
    .filter(
      (d) =>
        d.org === org &&
        d.status === 'posted' &&
        d.date >= from &&
        d.date <= to &&
        (accountMatches(postingFor(d).debit, code) || accountMatches(postingFor(d).credit, code)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
