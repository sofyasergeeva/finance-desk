import { PeriodPicker } from '../components/PeriodPicker';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, CaretDown, ChatCircle, FileText } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import {
  contractTotals,
  cutoff,
  longDate,
  money,
  partyTotals,
  plural,
  periodDocuments,
  visibleThreads,
} from '../data/model';
import type { Contract, Counterparty } from '../data/model';
import {
  Avatar,
  Breadcrumbs,
  DocumentList,
  Empty,
  PageHeading,
  SearchInput,
  useTab,
} from '../components/common';
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

function ContractRow({ contract }: { contract: Contract }) {
  const { data, period, href } = useDesk();
  const totals = contractTotals(data, contract, period);
  return (
    <Link to={href(`/contracts/${contract.id}`)} className="contract-row">
      <span className="contract-mark">
        <FileText size={20} />
      </span>
      <span className="contract-name">
        <strong>{contract.title}</strong>
        <span className="secondary">
          Договор {contract.number} · {contract.direction === 'client' ? 'Клиент' : 'Поставщик'}
        </span>
      </span>
      <span className={`contract-debt ${contract.direction === 'supplier' ? 'peach-text' : ''}`}>
        <span className="secondary">
          {contract.direction === 'client' ? 'Нам должны' : 'Мы должны'}
        </span>
        <strong>{money(totals.debt)}</strong>
      </span>
      <ArrowUpRight size={20} />
    </Link>
  );
}
export function Counterparties() {
  const { data, org, period, params, patch, href, expanded, setExpanded } = useDesk();
  const q = params.get('q') || '';
  const direction = params.get('direction') || 'all';
  const status = params.get('status') || 'all';
  const sort = params.get('sort') || 'debt';
  const parties = data.counterparties
    .filter((p) => {
      const t = partyTotals(data, p.id, org.id, period);
      const inDirection = t.contracts.filter(
        (c) => direction === 'all' || c.direction === direction,
      );
      return (
        inDirection.length &&
        `${p.name} ${inDirection.map((c) => c.number + ' ' + c.title).join(' ')}`
          .toLocaleLowerCase('ru')
          .includes(q.toLocaleLowerCase('ru')) &&
        (status === 'all' ||
          (status === 'open'
            ? (direction === 'client'
                ? t.client
                : direction === 'supplier'
                  ? t.supplier
                  : t.client + t.supplier) > 0
            : (direction === 'client'
                ? t.client
                : direction === 'supplier'
                  ? t.supplier
                  : t.client + t.supplier) === 0))
      );
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'ru')
        : partyTotals(data, b.id, org.id, period).client +
          partyTotals(data, b.id, org.id, period).supplier -
          (partyTotals(data, a.id, org.id, period).client +
            partyTotals(data, a.id, org.id, period).supplier),
    );
  return (
    <>
      <PageHeading title="Контрагенты" />
      <div className="directory-toolbar">
        <div className="segmented" role="group" aria-label="Направление расчётов">
          {[
            ['all', 'Все'],
            ['client', 'Клиенты'],
            ['supplier', 'Поставщики'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={direction === value}
              onClick={() => patch({ direction: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput
          label="Поиск контрагента или договора"
          placeholder="Контрагент или договор"
          value={q}
          onChange={(q) => patch({ q })}
        />
        <label className="sr-only" htmlFor="party-status">
          Состояние расчётов
        </label>
        <select
          id="party-status"
          value={status}
          onChange={(e) => patch({ status: e.target.value })}
        >
          <option value="all">Все расчёты</option>
          <option value="open">С задолженностью</option>
          <option value="settled">Без задолженности</option>
        </select>
        <label className="sr-only" htmlFor="party-sort">
          Сортировка контрагентов
        </label>
        <select id="party-sort" value={sort} onChange={(e) => patch({ sort: e.target.value })}>
          <option value="debt">По сумме долга</option>
          <option value="name">По названию</option>
        </select>
      </div>
      {(q || status !== 'all') && (
        <div className="filter-summary">
          <span>Найдено: {parties.length}</span>
          {q && <span className="filter-chip">Поиск: {q}</span>}
          {status !== 'all' && (
            <span className="filter-chip">
              {status === 'open' ? 'С задолженностью' : 'Без задолженности'}
            </span>
          )}
          <button className="text-link" onClick={() => patch({ q: null, status: null })}>
            Сбросить фильтры
          </button>
        </div>
      )}
      <section className="directory-list" aria-label="Список контрагентов">
        <div className="directory-columns">
          <span>Контрагент и договоры</span>
          <span>Нам должны</span>
          <span>Мы должны</span>
          <span />
        </div>
        {parties.map((p) => {
          const t = partyTotals(data, p.id, org.id, period);
          const visible = t.contracts.filter(
            (c) => direction === 'all' || c.direction === direction,
          );
          const key = org.id + '-' + p.id;
          const open = expanded.includes(key);
          const directions = [...new Set(t.contracts.map((c) => c.direction))];
          return (
            <Collapsible
              key={p.id}
              className="counterparty-row"
              open={open}
              onOpenChange={(value) =>
                setExpanded((prev) => (value ? [...prev, key] : prev.filter((v) => v !== key)))
              }
            >
              <div className="party-row-summary">
                <div className="party-identity">
                  <Link to={href(`/counterparties/${p.id}`)} className="party-name-link">
                    <Avatar party={p} />
                    <span>
                      <strong>{p.name}</strong>
                      <span className="secondary">
                        {directions.length === 2
                          ? 'Клиент и поставщик'
                          : directions[0] === 'client'
                            ? 'Клиент'
                            : 'Поставщик'}
                      </span>
                    </span>
                  </Link>
                  <CollapsibleTrigger
                    className="contracts-toggle"
                    aria-label={`${visible.length} ${plural(visible.length, ['договор', 'договора', 'договоров'])} ${p.name}`}
                  >
                    {visible.length} {plural(visible.length, ['договор', 'договора', 'договоров'])}
                    <CaretDown size={15} />
                  </CollapsibleTrigger>
                </div>
                <span className={`party-amount ${t.client ? 'mint-text' : 'zero-amount'}`}>
                  <span className="mobile-label">Нам должны</span>
                  {money(t.client)}
                </span>
                <span className={`party-amount ${t.supplier ? 'peach-text' : 'zero-amount'}`}>
                  <span className="mobile-label">Мы должны</span>
                  {money(t.supplier)}
                </span>
                <Link
                  to={href(`/counterparties/${p.id}`)}
                  className="icon-button"
                  aria-label={`Открыть контрагента ${p.name}`}
                >
                  <ArrowUpRight size={20} />
                </Link>
              </div>
              <CollapsibleContent>
                <div className="expanded-contracts">
                  {visible.map((c) => (
                    <ContractRow key={c.id} contract={c} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {parties.length === 0 && (
          <Empty
            title="Контрагенты не найдены"
            text="Попробуйте другое название или измените фильтры."
            action={
              <Button onClick={() => patch({ q: null, status: null, direction: null })}>
                Сбросить фильтры
              </Button>
            }
          />
        )}
      </section>
      <p className="data-note">
        Задолженность учитывается по договору. Черновики в расчёт не входят.
      </p>
    </>
  );
}
export function ContextQuestions({ contractIds }: { contractIds: string[] }) {
  const { data, org, role, href, go } = useDesk();
  const questions = visibleThreads(data, org.id, role).filter((t) =>
    contractIds.includes(t.contract),
  );
  return questions.length ? (
    <div className="context-questions">
      {questions.map((t) => (
        <Link to={href('/discussions', { thread: t.id })} className="context-question" key={t.id}>
          <ChatCircle size={22} />
          <span>
            <strong>{t.title}</strong>
            <span className="secondary">
              {t.assignee} · {t.messages.length} сообщ.
            </span>
          </span>
          <span className={`status ${t.resolved ? 'posted' : 'question'}`}>
            {t.resolved ? 'Закрыт' : 'Открыт'}
          </span>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  ) : (
    <Empty
      title="Обсуждений пока нет"
      text="Вопрос можно создать в контексте договора."
      action={
        <Button onClick={() => go('/discussions', { new: contractIds[0] })}>Задать вопрос</Button>
      }
    />
  );
}
function PartyContacts({ party }: { party: Counterparty }) {
  return (
    <Collapsible className="contact-disclosure">
      <CollapsibleTrigger className="disclosure-trigger">
        Контакты и реквизиты
        <CaretDown size={18} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="detail-fields">
          <div>
            <dt>Контактное лицо</dt>
            <dd>{party.contact}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{party.email}</dd>
          </div>
          <div>
            <dt>ИНН</dt>
            <dd>{party.inn}</dd>
          </div>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
export function PartyPage() {
  const { id } = useParams();
  const { data, org, period, href, last } = useDesk();
  const party = data.counterparties.find((p) => p.id === id);
  const totals = partyTotals(data, id || '', org.id, period);
  const tab = useTab('contracts');
  if (!party || !totals.contracts.length)
    return (
      <Empty
        title="Контрагент не найден"
        text="В выбранной организации нет договоров этого контрагента."
        action={
          <Link className="button" to={href('/counterparties')}>
            К контрагентам
          </Link>
        }
      />
    );
  const documents = periodDocuments(data, org.id, period).filter((d) =>
    totals.contracts.some((c) => c.id === d.contract),
  );
  return (
    <>
      <Breadcrumbs
        items={[{ label: 'Контрагенты', to: last('/counterparties') }, { label: party.name }]}
      />
      <div className="entity-page-heading">
        <Avatar party={party} size="large" />
        <div>
          <h1 tabIndex={-1}>{party.name}</h1>
          <p>
            {totals.contracts.length}{' '}
            {plural(totals.contracts.length, ['договор', 'договора', 'договоров'])} · {org.legal}
          </p>
        </div>
        <PeriodPicker />
      </div>
      <div className="detail-layout">
        <section className="detail-main">
          <Tabs {...tab}>
            <TabsList aria-label="Разделы контрагента">
              <TabsTrigger value="contracts">
                Договоры <span>{totals.contracts.length}</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                Документы <span>{documents.length}</span>
              </TabsTrigger>
              <TabsTrigger value="discussion">Обсуждения</TabsTrigger>
            </TabsList>
            <TabsContent value="contracts">
              <div className="section-intro">
                <h2>Договоры с {party.name}</h2>
              </div>
              {totals.contracts.map((c) => (
                <ContractRow key={c.id} contract={c} />
              ))}
            </TabsContent>
            <TabsContent value="documents">
              <DocumentList documents={documents} compact />
              {!documents.length && (
                <Empty
                  title="Документов в срезе нет"
                  text="Проверьте выбранный финансовый период."
                />
              )}
            </TabsContent>
            <TabsContent value="discussion">
              <ContextQuestions contractIds={totals.contracts.map((c) => c.id)} />
            </TabsContent>
          </Tabs>
          <PartyContacts party={party} />
        </section>
        <aside className="settlement-aside">
          <span className="aside-label">Расчёты на {longDate(cutoff(period))}</span>
          {totals.contracts.some((c) => c.direction === 'client') && (
            <div>
              <span>Нам должны</span>
              <strong className="lavender-text">{money(totals.client)}</strong>
            </div>
          )}
          {totals.contracts.some((c) => c.direction === 'supplier') && (
            <div>
              <span>Мы должны</span>
              <strong className="peach-text">{money(totals.supplier)}</strong>
            </div>
          )}
          {new Set(totals.contracts.map((c) => c.direction)).size > 1 && (
            <p>Встречные долги не сворачиваются.</p>
          )}
        </aside>
      </div>
    </>
  );
}
