import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, CaretDown, ChatCircle, Plus, FileText } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import {
  contractTotals,
  cutoff,
  longDate,
  shortDate,
  money,
  periodDocuments,
  scopeDocuments,
} from '../data/model';
import { deals } from '../data/deals';
import { postingFor } from '../data/ledger';
import type { Document } from '../data/model';
import { Breadcrumbs, DocumentList, Empty, PageHeading, useTab } from '../components/common';
import { ContextQuestions } from './Counterparties';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/primitives';

function HistoryEvent({ document: d }: { document: Document }) {
  const { showDocument, role, href } = useDesk();
  const p = postingFor(d);
  return (
    <Collapsible className="history-event">
      <div className="history-date">{shortDate(d.date)}</div>
      <div className="history-content">
        <DocumentList documents={[d]} compact />
        <CollapsibleTrigger className="history-disclose">
          Реквизиты и проводки
          <CaretDown size={14} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="history-expanded">
            <p>{d.description}</p>
            {d.status === 'posted' ? (
              <div className="inline-posting">
                <span>
                  Дт <strong>{p.debit}</strong>
                </span>
                <span>
                  Кт <strong>{p.credit}</strong>
                </span>
                <strong>{money(d.amount)}</strong>
              </div>
            ) : (
              <p>Черновик не формирует проводок.</p>
            )}
            <div className="history-actions">
              <Button variant="ghost" onClick={() => showDocument(d.id)}>
                Открыть документ
                <ArrowUpRight size={16} />
              </Button>
              {role === 'director' && d.status === 'posted' && (
                <Link
                  className="text-link"
                  to={href('/reports', {
                    report: 'trial',
                    ledgerAccount: p.debit,
                    ledgerDetail: p.debit,
                  })}
                >
                  Счёт {p.debit} в ОСВ
                </Link>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
export function ContractPage() {
  const { id } = useParams();
  const { data, org, role, period, href, last, go, openPayment, params, patch } = useDesk();
  const tab = useTab('documents');
  const c = data.contracts.find((c) => c.id === id && c.org === org.id);
  if (!c)
    return (
      <Empty
        title="Договор недоступен"
        text="В выбранной организации этот договор не найден."
        action={
          <Link className="button" to={last('/counterparties')}>
            К контрагентам
          </Link>
        }
      />
    );
  const party = data.counterparties.find((p) => p.id === c.party)!;
  const total = contractTotals(data, c, period);
  const allHistory = params.get('history') === 'all';
  const docs = (allHistory ? scopeDocuments : periodDocuments)(data, org.id, period).filter(
    (d) => d.contract === c.id,
  );
  const linkedDeals = deals.filter(
    (d) => d.org === org.id && d.contract === c.id && d.date <= cutoff(period),
  );
  const coverage =
    total.accrued > 0 && total.paid >= 0 && total.paid <= total.accrued
      ? Math.round((total.paid / total.accrued) * 100)
      : null;
  return (
    <div className="contract-workspace">
      <Breadcrumbs
        items={[
          { label: 'Контрагенты', to: last('/counterparties') },
          { label: party.name, to: href(`/counterparties/${party.id}`) },
          { label: 'Договор ' + c.number },
        ]}
      />
      <PageHeading title={c.title} description={`${c.number} · ${party.name}`}>
        {role === 'employee' && c.direction === 'client' && total.debt > 0 && (
          <Button variant="primary" onClick={() => openPayment(c.id)}>
            <Plus size={18} />
            Учесть оплату
          </Button>
        )}
      </PageHeading>
      <section className="contract-summary" aria-label="Расчёты по договору">
        <div className="settlement-aside">
          <span className="aside-label">На {longDate(cutoff(period))}</span>
          <span>{c.direction === 'client' ? 'Клиент должен нам' : 'Мы должны поставщику'}</span>
          <strong>{money(total.debt)}</strong>
        </div>
        <div className="contract-coverage">
          <div className="contract-amounts">
            <div>
              <span>{c.direction === 'client' ? 'Начислено за услуги' : 'Получено услуг'}</span>
              <strong>{money(total.accrued)}</strong>
            </div>
            <div>
              <span>{c.direction === 'client' ? 'Поступило оплат' : 'Оплачено'}</span>
              <strong>{money(total.paid)}</strong>
            </div>
          </div>
          {coverage !== null ? (
            <>
              <div className="coverage-caption">
                <span>{c.direction === 'client' ? 'Покрыто оплатами' : 'Оплачено начислений'}</span>
                <strong>{coverage}%</strong>
              </div>
              <div
                className="coverage-track"
                role="progressbar"
                aria-label="Покрытие начислений оплатами"
                aria-valuenow={coverage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: coverage + '%' }} />
              </div>
            </>
          ) : (
            <p className="secondary">Процент покрытия не определён для этих остатков.</p>
          )}
          <Collapsible className="contract-balance-details">
            <CollapsibleTrigger className="history-disclose">
              Как получены суммы
              <CaretDown size={14} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p>
                Накопительно с учётом начальных данных на 1 октября. Это расчёты договора целиком;
                распределение оплат по актам не задано.
              </p>
              <dl className="calculation">
                <div>
                  <dt>Начальные начисления</dt>
                  <dd>{money(c.openingAccrued)}</dd>
                </div>
                <div>
                  <dt>Начальные оплаты</dt>
                  <dd>{money(c.openingPaid)}</dd>
                </div>
              </dl>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>
      <div className="contract-body">
        <section className="contract-documents">
          <Tabs {...tab}>
            <TabsList aria-label="Разделы договора">
              <TabsTrigger value="documents">
                Документы <span>{docs.length}</span>
              </TabsTrigger>
              <TabsTrigger value="discussion">Обсуждения</TabsTrigger>
              <TabsTrigger value="details">Реквизиты</TabsTrigger>
            </TabsList>
            <TabsContent value="documents">
              <div className="section-intro history-heading">
                <div>
                  <h2>{allHistory ? 'История документов' : 'Документы за период'}</h2>
                  <p>Черновики не меняют остаток.</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => patch({ history: allHistory ? null : 'all' })}
                >
                  {allHistory ? 'Только за период' : 'Вся история до ' + longDate(cutoff(period))}
                </Button>
              </div>
              {docs.length ? (
                <div className="contract-timeline">
                  {docs.map((d) => (
                    <HistoryEvent key={d.id} document={d} />
                  ))}
                </div>
              ) : (
                <Empty
                  title="Документов за период нет"
                  text="Откройте всю историю или выберите другие даты."
                />
              )}
            </TabsContent>
            <TabsContent value="discussion">
              <ContextQuestions contractIds={[c.id]} />
            </TabsContent>
            <TabsContent value="details">
              <dl className="detail-fields">
                {[
                  ['Организация', org.legal],
                  ['Контрагент', party.name],
                  ['Договор', c.number],
                  ['Ответственный', c.owner],
                  ['Предмет', c.title],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
          </Tabs>
        </section>
        <aside className="contract-context">
          <div className="section-heading">
            <h2>Связанные сделки</h2>
            <span className="count">{linkedDeals.length}</span>
          </div>
          {linkedDeals.length ? (
            linkedDeals.map((deal) => (
              <Collapsible className="deal-disclosure" key={deal.id}>
                <CollapsibleTrigger className="deal-trigger">
                  <FileText size={20} />
                  <span>
                    <strong>{deal.title}</strong>
                    <span className="secondary">{deal.number}</span>
                  </span>
                  <CaretDown size={16} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="deal-expanded">
                    <div className="deal-amount">
                      <span>Сумма сделки</span>
                      <strong>{money(deal.amount)}</strong>
                    </div>
                    <p>{deal.closed ? 'Закрыта' : 'План завершения: ' + shortDate(deal.planned)}</p>
                    <Link className="button" to={href(`/deals/${deal.id}`)}>
                      Открыть сделку
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <p className="quiet-empty">Связанных сделок нет.</p>
          )}
          <Button className="contract-question" onClick={() => go('/discussions', { new: c.id })}>
            <ChatCircle size={18} />
            Задать вопрос
          </Button>
          {role === 'director' && (
            <Link
              className="text-link"
              to={href('/reports', {
                report: 'trial',
                ledgerAccount: c.direction === 'client' ? '62' : '60',
              })}
            >
              Счёт {c.direction === 'client' ? '62' : '60'} в ОСВ
              <ArrowUpRight size={16} />
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
export function DealPage() {
  const { id } = useParams();
  const { data, org, period, href, last } = useDesk();
  const deal = deals.find((d) => d.id === id && d.org === org.id);
  if (!deal)
    return (
      <Empty
        title="Сделка недоступна"
        text="В выбранной организации такой сделки нет."
        action={
          <Link className="button" to={last('/counterparties')}>
            К контрагентам
          </Link>
        }
      />
    );
  const c = data.contracts.find((c) => c.id === deal.contract)!;
  const p = data.counterparties.find((p) => p.id === c.party)!;
  const acts = scopeDocuments(data, org.id, period).filter((d) => deal.acts.includes(d.id));
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Контрагенты', to: last('/counterparties') },
          { label: p.name, to: href(`/counterparties/${p.id}`) },
          { label: c.number, to: href(`/contracts/${c.id}`) },
          { label: deal.number },
        ]}
      />
      <PageHeading title={deal.title} description={`${deal.number} · ${p.name}`} />
      <div className="deal-page-summary">
        <div>
          <span>Сумма сделки</span>
          <strong>{money(deal.amount)}</strong>
        </div>
        <div>
          <span>Создана</span>
          <strong>{longDate(deal.date)}</strong>
        </div>
        <div>
          <span>{deal.closed ? 'Состояние' : 'План завершения'}</span>
          <strong>{deal.closed ? 'Закрыта' : longDate(deal.planned)}</strong>
        </div>
      </div>
      <section className="deal-act-section">
        <h2>Акты по сделке</h2>
        {acts.length ? (
          <DocumentList documents={acts} />
        ) : (
          <Empty title="Актов в срезе нет" text="Проверьте конечную дату периода." />
        )}
        <p className="data-note">
          Сумма сделки не является начислением. Задолженность и оплаты учитываются в{' '}
          <Link to={href(`/contracts/${c.id}`)}>договоре {c.number}</Link>.
        </p>
      </section>
    </>
  );
}
