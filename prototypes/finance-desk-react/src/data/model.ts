export type Role = 'director' | 'employee';
export type Direction = 'client' | 'supplier';
export type Kind = 'act' | 'purchase' | 'in' | 'out';
export type DataMode = 'ready' | 'loading' | 'error' | 'partial';
export interface Account {
  id: string;
  name: string;
  detail: string;
  opening: number;
  icon: string;
}
export interface Organization {
  id: string;
  name: string;
  legal: string;
  initials: string;
  accounts: Account[];
}
export interface Counterparty {
  id: string;
  name: string;
  initials: string;
  color: string;
  contact: string;
  email: string;
  inn: string;
}
export interface Contract {
  id: string;
  org: string;
  party: string;
  direction: Direction;
  number: string;
  title: string;
  openingAccrued: number;
  openingPaid: number;
  owner: string;
}
export interface Document {
  id: string;
  org: string;
  contract: string;
  kind: Kind;
  number: string;
  date: string;
  amount: number;
  account?: string;
  description: string;
  status: 'posted' | 'draft';
}
export interface Message {
  name: string;
  text: string;
  time: string;
}
export interface Thread {
  id: string;
  org: string;
  contract: string;
  title: string;
  person: string;
  assignee: string;
  date: string;
  resolved: boolean;
  messages: Message[];
}
export interface DemoData {
  organizations: Organization[];
  counterparties: Counterparty[];
  contracts: Contract[];
  documents: Document[];
  threads: Thread[];
}
export const CURRENT_DATE = '2026-11-18';
export const FIRST_DATE = '2026-10-01';
export const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
export function normalizePeriod(value: string | null): string {
  if (value === '2026-10' || value === '2026-11') return value;
  const [from, to, extra] = (value || '').split(':');
  return !extra &&
    isDate(from || '') &&
    isDate(to || '') &&
    from >= FIRST_DATE &&
    to <= CURRENT_DATE &&
    from <= to
    ? `${from}:${to}`
    : '2026-11';
}
export function dateRange(period: string) {
  const normalized = normalizePeriod(period);
  if (normalized.includes(':')) {
    const [from, to] = normalized.split(':');
    return { from, to };
  }
  return {
    from: normalized + '-01',
    to: normalized === '2026-10' ? '2026-10-31' : CURRENT_DATE,
  };
}
export const cutoff = (period: string) => dateRange(period).to;
export function dayBefore(value: string) {
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export const periodLabel = (period: string) => {
  const { from, to } = dateRange(period);
  return `${shortDate(from)} – ${shortDate(to)} 2026`;
};
export const kinds: Record<Kind, { label: string; short: string; debit: string; credit: string }> =
  {
    act: {
      label: 'Акт оказанных услуг',
      short: 'Акт',
      debit: '62',
      credit: '90.01',
    },
    purchase: {
      label: 'Получение услуг',
      short: 'Получение услуг',
      debit: '26',
      credit: '60',
    },
    in: {
      label: 'Поступление денег',
      short: 'Поступление',
      debit: '51',
      credit: '62',
    },
    out: {
      label: 'Списание денег',
      short: 'Списание',
      debit: '60',
      credit: '51',
    },
  };
export const person = (role: Role) => (role === 'director' ? 'Елена Соколова' : 'Анна Сергеева');
export const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
export const money = (cents: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const shortDate = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
export const longDate = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
export const plural = (n: number, forms: [string, string, string]) =>
  forms[n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];
export function parseMoney(value: string): number | null {
  const raw = value.replace(/[\s\u202f]/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [integer, fraction = ''] = raw.split('.');
  const result = Number(integer) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}
export function scopeDocuments(data: DemoData, org: string, period: string) {
  const endDate = cutoff(period);
  return data.documents
    .filter((d) => d.org === org && d.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
export function periodDocuments(data: DemoData, org: string, period: string) {
  const { from } = dateRange(period);
  return scopeDocuments(data, org, period).filter((d) => d.date >= from);
}
export function contractTotalsAtDate(data: DemoData, contract: Contract, date: string) {
  let accrued = contract.openingAccrued;
  let paid = contract.openingPaid;
  for (const d of data.documents.filter(
    (d) =>
      d.org === contract.org &&
      d.date <= date &&
      d.contract === contract.id &&
      d.status === 'posted',
  )) {
    if (d.kind === 'act' || d.kind === 'purchase') accrued += d.amount;
    else paid += d.amount;
  }
  return { accrued, paid, debt: accrued - paid };
}
export function contractTotals(data: DemoData, contract: Contract, period: string) {
  return contractTotalsAtDate(data, contract, cutoff(period));
}
export function partyTotals(data: DemoData, party: string, org: string, period: string) {
  const contracts = data.contracts.filter((c) => c.party === party && c.org === org);
  return {
    contracts,
    client: contracts
      .filter((c) => c.direction === 'client')
      .reduce((s, c) => s + Math.max(0, contractTotals(data, c, period).debt), 0),
    supplier: contracts
      .filter((c) => c.direction === 'supplier')
      .reduce((s, c) => s + Math.max(0, contractTotals(data, c, period).debt), 0),
  };
}
export function accountBalance(
  data: DemoData,
  org: Organization,
  account: Account,
  period: string,
  atStart = false,
) {
  return (
    account.opening +
    scopeDocuments(data, org.id, period)
      .filter(
        (d) =>
          d.account === account.id &&
          d.status === 'posted' &&
          (!atStart || d.date < dateRange(period).from),
      )
      .reduce((s, d) => s + (d.kind === 'in' ? d.amount : d.kind === 'out' ? -d.amount : 0), 0)
  );
}
export function overview(data: DemoData, org: Organization, period: string) {
  const movements = periodDocuments(data, org.id, period).filter(
    (d) => d.status === 'posted' && (d.kind === 'in' || d.kind === 'out'),
  );
  const debts = data.contracts.filter((c) => c.org === org.id);
  return {
    balance: org.accounts.reduce((s, a) => s + accountBalance(data, org, a, period), 0),
    opening: org.accounts.reduce((s, a) => s + accountBalance(data, org, a, period, true), 0),
    incoming: movements.filter((d) => d.kind === 'in').reduce((s, d) => s + d.amount, 0),
    outgoing: movements.filter((d) => d.kind === 'out').reduce((s, d) => s + d.amount, 0),
    client: debts
      .filter((c) => c.direction === 'client')
      .reduce((s, c) => s + Math.max(0, contractTotals(data, c, period).debt), 0),
    supplier: debts
      .filter((c) => c.direction === 'supplier')
      .reduce((s, c) => s + Math.max(0, contractTotals(data, c, period).debt), 0),
    movements,
  };
}
export function visibleThreads(data: DemoData, org: string, role: Role) {
  return data.threads.filter(
    (t) => t.org === org && (role === 'director' || t.assignee === person(role)),
  );
}
export interface PaymentInput {
  contract: string;
  amount: number;
  account: string;
  date: string;
  comment: string;
}
export function validatePayment(
  data: DemoData,
  org: Organization,
  role: Role,
  period: string,
  input: PaymentInput,
): string | null {
  if (role !== 'employee')
    return 'Учитывать оплату может сотрудник. Переключите демонстрационную роль.';
  const c = data.contracts.find(
    (c) => c.id === input.contract && c.org === org.id && c.direction === 'client',
  );
  if (!c) return 'Выберите договор клиента этой организации.';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
    return 'Введите сумму больше нуля с точностью до копеек.';
  if (input.amount > contractTotals(data, c, period).debt)
    return 'Сумма превышает остаток долга по договору.';
  if (!org.accounts.some((a) => a.id === input.account && a.id !== 'deposit'))
    return 'Выберите расчётный счёт или кассу этой организации.';
  if (!isDate(input.date) || input.date > cutoff(period) || input.date < FIRST_DATE)
    return 'Дата должна входить в доступный срез: с 1 октября по ' + longDate(cutoff(period)) + '.';
  const debtOnDate = Math.max(0, contractTotalsAtDate(data, c, input.date).debt);
  if (input.amount > debtOnDate)
    return (
      'Дата поступления предшествует достаточному долгу: на эту дату можно учесть не больше ' +
      money(debtOnDate) +
      '. Авансы в прототипе не поддерживаются.'
    );
  return null;
}
