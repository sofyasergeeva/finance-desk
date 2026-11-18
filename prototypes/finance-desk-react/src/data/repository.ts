import fixtures from './fixtures.json' with { type: 'json' };
import type { DemoData, Document, Organization, PaymentInput, Role, Thread } from './model.ts';
import { isDate, kinds, validatePayment } from './model.ts';
import { isRecord, readSession, writeSession } from '../lib/session.ts';

export const STORAGE_KEY = 'finance-desk-react-demo-v1';
export function initialData(): DemoData {
  return structuredClone(fixtures) as DemoData;
}
export function readDemo(): DemoData {
  const base = initialData();
  const saved = readSession(STORAGE_KEY);
  const validContract = (value: Record<string, unknown>) =>
    base.contracts.some((c) => c.id === value.contract && c.org === value.org);
  function isDocument(value: unknown): value is Document {
    return (
      isRecord(value) &&
      ['id', 'org', 'contract', 'number', 'date', 'description'].every(
        (key) => typeof value[key] === 'string',
      ) &&
      typeof value.kind === 'string' &&
      Object.hasOwn(kinds, value.kind) &&
      (value.status === 'posted' || value.status === 'draft') &&
      typeof value.amount === 'number' &&
      Number.isSafeInteger(value.amount) &&
      value.amount >= 0 &&
      typeof value.date === 'string' &&
      isDate(value.date) &&
      validContract(value) &&
      (value.account === undefined ||
        base.organizations.some(
          (org) => org.id === value.org && org.accounts.some((a) => a.id === value.account),
        ))
    );
  }
  function isThread(value: unknown): value is Thread {
    return (
      isRecord(value) &&
      ['id', 'org', 'contract', 'title', 'person', 'assignee', 'date'].every(
        (key) => typeof value[key] === 'string',
      ) &&
      typeof value.resolved === 'boolean' &&
      validContract(value) &&
      Array.isArray(value.messages) &&
      value.messages.every(
        (message) =>
          isRecord(message) &&
          ['name', 'text', 'time'].every((key) => typeof message[key] === 'string'),
      )
    );
  }
  if (
    isRecord(saved) &&
    saved.version === 1 &&
    Array.isArray(saved.documents) &&
    saved.documents.every(isDocument) &&
    Array.isArray(saved.threads) &&
    saved.threads.every(isThread)
  ) {
    return { ...base, documents: saved.documents, threads: saved.threads };
  }
  return base;
}
export function saveDemo(data: DemoData) {
  writeSession(STORAGE_KEY, { version: 1, documents: data.documents, threads: data.threads });
}
export function recordPayment(
  data: DemoData,
  org: Organization,
  role: Role,
  period: string,
  input: PaymentInput,
): { data: DemoData; document: Document } {
  const error = validatePayment(data, org, role, period, input);
  if (error) throw Error(error);
  const document: Document = {
    id: 'demo-' + crypto.randomUUID(),
    org: org.id,
    contract: input.contract,
    kind: 'in',
    number:
      'ПД-ДЕМО-' +
      String(data.documents.filter((d) => d.id.startsWith('demo-')).length + 1).padStart(3, '0'),
    date: input.date,
    amount: input.amount,
    account: input.account,
    description: input.comment.trim() || 'Поступление по договору',
    status: 'posted',
  };
  return {
    data: { ...data, documents: [...data.documents, document] },
    document,
  };
}
export function replyToThread(
  data: DemoData,
  id: string,
  org: string,
  role: Role,
  name: string,
  text: string,
): DemoData {
  const target = data.threads.find(
    (t) => t.id === id && t.org === org && (role === 'director' || t.assignee === name),
  );
  if (!target || !text.trim()) throw Error('Нет доступа к обсуждению или сообщение пусто.');
  return {
    ...data,
    threads: data.threads.map((t) =>
      t.id === id
        ? {
            ...t,
            messages: [...t.messages, { name, text: text.trim(), time: 'Только что' }],
          }
        : t,
    ),
  };
}
export function addThread(data: DemoData, thread: Thread): DemoData {
  return { ...data, threads: [thread, ...data.threads] };
}
