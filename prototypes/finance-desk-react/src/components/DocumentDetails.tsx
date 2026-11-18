import { Link } from 'react-router-dom';
import { ArrowSquareOut, Copy, CaretDown, DownloadSimple } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import { cutoff, dateRange, longDate, money } from '../data/model';
import type { Document } from '../data/model';
import { Status } from './common';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/primitives';
import { postingFor } from '../data/ledger';
import { dealForDocument } from '../data/deals';
import { usePrintPreview } from './printing';

export function DocumentDetails({
  document: d,
  full = false,
}: {
  document: Document;
  full?: boolean;
}) {
  const { data, org, period, href, notify, go } = useDesk();
  const c = data.contracts.find((c) => c.id === d.contract)!;
  const p = data.counterparties.find((p) => p.id === c.party)!;
  const account = org.accounts.find((a) => a.id === d.account);
  const posting = postingFor(d);
  const deal = dealForDocument(d.id);
  const print = usePrintPreview();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + href(`/documents/${d.id}`));
      notify('Прямая ссылка на документ скопирована');
    } catch {
      notify('Копирование недоступно. Откройте документ отдельно и скопируйте адрес.');
    }
  };
  return (
    <div className="document-details">
      <div className="document-meta">
        <Status document={d} />
        <span>{longDate(d.date)}</span>
      </div>
      <div className="document-value">
        <span>Сумма документа</span>
        <strong>{money(d.amount)}</strong>
      </div>
      <Link className="document-context" to={href(`/contracts/${c.id}`)}>
        <span>
          <strong>{p.name}</strong>
          <span className="secondary">
            Договор {c.number} · {c.title}
          </span>
        </span>
        <ArrowSquareOut size={20} />
      </Link>
      {(d.date > cutoff(period) || d.date < dateRange(period).from) && (
        <div className="inline-message">
          Документ вне выбранного периода. Его сумма не входит в обороты за эти даты.
        </div>
      )}
      <dl className="detail-fields">
        <div>
          <dt>Организация</dt>
          <dd>{org.legal}</dd>
        </div>
        <div>
          <dt>Ответственный</dt>
          <dd>{c.owner}</dd>
        </div>
        {account && (
          <>
            <div>
              <dt>Денежные средства</dt>
              <dd>{account.name}</dd>
            </div>
            <div>
              <dt>Реквизиты</dt>
              <dd>{account.detail}</dd>
            </div>
          </>
        )}
      </dl>
      {deal && deal.org === org.id && (
        <Link className="document-deal-link" to={href(`/deals/${deal.id}`)}>
          Основание: сделка {deal.number}
          <ArrowSquareOut size={16} />
        </Link>
      )}
      <section className="document-description">
        <h3>Содержание</h3>
        <p>{d.description}</p>
        {(d.kind === 'act' || d.kind === 'purchase') && (
          <div className="service-line">
            <span>
              {c.title}
              <span className="secondary">1 услуга · цена {money(d.amount)}</span>
            </span>
            <strong>{money(d.amount)}</strong>
          </div>
        )}
      </section>
      <Collapsible className="posting-disclosure">
        <CollapsibleTrigger className="disclosure-trigger">
          Проводки
          <CaretDown size={18} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {d.status === 'draft' ? (
            <p className="posting-note">Черновик не формирует проводки и не меняет остатки.</p>
          ) : (
            <>
              <div className="posting-table" role="table" aria-label="Демонстрационная проводка">
                <div role="row">
                  <span role="columnheader">Дебет</span>
                  <span role="columnheader">Кредит</span>
                  <span role="columnheader">Сумма</span>
                </div>
                <div role="row">
                  <strong role="cell">{posting.debit}</strong>
                  <strong role="cell">{posting.credit}</strong>
                  <strong role="cell">{money(d.amount)}</strong>
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
      <div className="document-actions">
        {!full && (
          <Link className="button" to={href(`/documents/${d.id}`)}>
            <ArrowSquareOut size={18} />
            Открыть отдельно
          </Link>
        )}
        <Button onClick={() => print('document', d.id)}>
          <DownloadSimple size={17} />
          PDF
        </Button>
        <Button onClick={copy}>
          <Copy size={17} />
          Скопировать ссылку
        </Button>
        <Button onClick={() => go('/discussions', { new: c.id })}>Обсудить договор</Button>
      </div>
    </div>
  );
}
