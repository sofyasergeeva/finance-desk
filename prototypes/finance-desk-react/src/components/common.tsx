import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CaretRight,
  FileText,
  MagnifyingGlass,
  Receipt,
  LockSimple,
} from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import type { Counterparty, Document } from '../data/model';
import { kinds, money, shortDate } from '../data/model';
import { Button } from './ui/primitives';
import { PeriodPicker } from './PeriodPicker';

export function Avatar({ party, size = '' }: { party: Counterparty; size?: string }) {
  return (
    <span className={`entity-avatar ${party.color} ${size}`} aria-hidden="true">
      {party.initials}
    </span>
  );
}
export function Status({ document }: { document: Document }) {
  return (
    <span className={`status ${document.status}`}>
      {document.status === 'posted' ? 'Проведён' : 'Черновик'}
    </span>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <MagnifyingGlass size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function AccessDenied() {
  const { go } = useDesk();
  return (
    <div className="access-state">
      <LockSimple size={34} />
      <h1 tabIndex={-1}>Этот раздел доступен руководителю</h1>
      <p>Выберите другой раздел или переключите демонстрационную роль в меню профиля.</p>
      <Button onClick={() => go('/')}>Вернуться на рабочий стол</Button>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
  financial = true,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  financial?: boolean;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">
        {financial && <PeriodPicker />}
        {children}
      </div>
    </div>
  );
}
export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Путь к объекту">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {i > 0 && <CaretRight size={12} aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function DocumentIcon({ kind }: { kind: Document['kind'] }) {
  return (
    <span className={`document-icon ${kind}`}>
      {kind === 'in' ? (
        <ArrowDownLeft size={20} />
      ) : kind === 'out' ? (
        <ArrowUpRight size={20} />
      ) : kind === 'purchase' ? (
        <Receipt size={20} />
      ) : (
        <FileText size={20} />
      )}
    </span>
  );
}
export function DocumentList({
  documents,
  compact = false,
}: {
  documents: Document[];
  compact?: boolean;
}) {
  const { data, href, showDocument } = useDesk();
  return (
    <div className={`document-list ${compact ? 'compact' : ''}`}>
      {documents.map((d) => {
        const c = data.contracts.find((c) => c.id === d.contract)!;
        const p = data.counterparties.find((p) => p.id === c.party)!;
        return (
          <div className="document-row" key={d.id}>
            <button
              className="document-open"
              onClick={() => showDocument(d.id)}
              data-document-id={d.id}
            >
              <DocumentIcon kind={d.kind} />
              <span>
                <strong>
                  {kinds[d.kind].short} {d.number}
                </strong>
                <span className="secondary">
                  {shortDate(d.date)}
                  <span className="document-party"> · {p.name}</span>
                </span>
              </span>
            </button>
            {!compact && (
              <Link className="row-context-link" to={href(`/contracts/${c.id}`)}>
                {p.name}
                <span className="secondary">Договор {c.number}</span>
              </Link>
            )}
            <Status document={d} />
            <button
              className={`document-amount ${d.kind === 'in' ? 'positive' : ''}`}
              onClick={() => showDocument(d.id)}
              title="Открыть документ"
            >
              {d.kind === 'in' ? '+' : d.kind === 'out' ? '−' : ''}
              {money(d.amount)}
            </button>
            <button
              className="icon-button row-open"
              onClick={() => showDocument(d.id)}
              aria-label={`Подробности ${d.number}`}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Найти…',
  label = 'Поиск',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="search-input">
      <MagnifyingGlass size={19} aria-hidden="true" />
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  );
}
export function useTab(defaultValue: string) {
  const { params, patch } = useDesk();
  return {
    value: params.get('tab') || defaultValue,
    onValueChange: (tab: string) => patch({ tab }),
  };
}
