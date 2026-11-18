import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bank,
  Wallet,
  Vault,
  ChatCircle,
  Plus,
  ArrowDownLeft,
} from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import {
  accountBalance,
  contractTotals,
  cutoff,
  initials,
  shortDate,
  money,
  overview,
  periodDocuments,
  plural,
  visibleThreads,
} from '../data/model';
import { Button } from '../components/ui/primitives';
import { DocumentList, Empty, PageHeading } from '../components/common';

export function Overview() {
  const { data, org, role, period, href, go, openPayment } = useDesk();
  const info = overview(data, org, period);
  const questions = visibleThreads(data, org.id, role).filter((t) => !t.resolved);
  const drafts = periodDocuments(data, org.id, period).filter((d) => d.status === 'draft');
  const debtCount = (direction: string) =>
    data.contracts.filter(
      (c) =>
        c.org === org.id && c.direction === direction && contractTotals(data, c, period).debt > 0,
    ).length;
  return (
    <>
      <PageHeading title={role === 'director' ? 'Обзор' : 'Моя работа'}>
        {role === 'employee' && (
          <Button variant="primary" onClick={() => openPayment('choose')}>
            <Plus size={18} />
            Учесть оплату
          </Button>
        )}
      </PageHeading>
      <div className={`overview-top ${role === 'employee' ? 'employee-overview' : ''}`}>
        <section
          className="financial-focus"
          aria-label={role === 'director' ? 'Деньги компании' : 'Документы к работе'}
        >
          {role === 'director' ? (
            <div className="balance-composition">
              <div className="cash-surface">
                <div className="cash-heading">
                  <span>
                    <Wallet size={21} />
                    Деньги компании
                  </span>
                  <span className="balance-date">На {shortDate(cutoff(period))}</span>
                </div>
                <div className="cash-value">{money(info.balance)}</div>
                <div className="cash-bottom">
                  <span>Счета, депозит и касса</span>
                  <Link to={href('/reports', { report: 'money' })} className="cash-report-link">
                    Открыть отчёт
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </div>
              <div className="debt-strip">
                <Link
                  to={href('/reports', {
                    report: 'settlements',
                    direction: 'client',
                  })}
                >
                  <span>
                    Клиенты должны нам
                    <ArrowUpRight size={18} />
                  </span>
                  <strong>{money(info.client)}</strong>
                  <span className="debt-detail">
                    {debtCount('client')}{' '}
                    {plural(debtCount('client'), ['договор', 'договора', 'договоров'])}
                  </span>
                </Link>
                <Link
                  to={href('/reports', {
                    report: 'settlements',
                    direction: 'supplier',
                  })}
                >
                  <span>
                    Мы должны поставщикам
                    <ArrowUpRight size={18} />
                  </span>
                  <strong>{money(info.supplier)}</strong>
                  <span className="debt-detail">
                    {debtCount('supplier')}{' '}
                    {plural(debtCount('supplier'), ['договор', 'договора', 'договоров'])}
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <section className="employee-desk">
              <div className="employee-desk-top">
                <h2>
                  {drafts.length ? 'Проверить черновики' : 'Черновиков нет'}
                  <span className="count">{drafts.length}</span>
                </h2>
                <Link to={href('/documents', { status: 'draft' })} className="text-link">
                  Все черновики
                  <ArrowRight size={17} />
                </Link>
              </div>
              {drafts.length ? (
                <DocumentList documents={drafts} compact />
              ) : (
                <p className="no-drafts">За выбранный период.</p>
              )}
            </section>
          )}
          <section className="recent-section">
            <div className="section-heading">
              <h2>Движение денег</h2>
              <Link className="text-link" to={href('/documents', { kind: 'money' })}>
                Все операции
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="movement-totals">
              <span>
                <ArrowDownLeft size={19} />
                Поступило<strong>{money(info.incoming)}</strong>
              </span>
              <span>
                <ArrowUpRight size={19} />
                Списано<strong>{money(info.outgoing)}</strong>
              </span>
            </div>
            {info.movements.length ? (
              <DocumentList documents={info.movements.slice(0, 4)} compact />
            ) : (
              <Empty
                title="Движений не было"
                text="За выбранные даты нет поступлений и списаний."
              />
            )}
          </section>
        </section>
        <aside className="overview-aside">
          {role === 'director' && (
            <section className="accounts-panel">
              <div className="section-heading">
                <h2>Счета и кассы</h2>
                <Vault size={22} aria-hidden="true" />
              </div>
              <div className="cash-accounts">
                {org.accounts.map((a) => (
                  <Link key={a.id} to={href('/reports', { report: 'money', account: a.id })}>
                    <span className={`account-symbol ${a.id}`}>
                      {a.id === 'bank' ? (
                        <Bank size={20} />
                      ) : a.id === 'cash' ? (
                        <Wallet size={20} />
                      ) : (
                        <Vault size={20} />
                      )}
                    </span>
                    <span>
                      {a.name}
                      <strong>{money(accountBalance(data, org, a, period))}</strong>
                    </span>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="focus-questions">
            <div className="section-heading">
              <h2>
                {role === 'director' ? 'Открытые вопросы' : 'Назначено мне'}
                <span className="count">{questions.length}</span>
              </h2>
              <ChatCircle size={22} aria-hidden="true" />
            </div>
            <div className="questions-list">
              {questions.slice(0, 3).map((t) => {
                const c = data.contracts.find((c) => c.id === t.contract)!;
                const p = data.counterparties.find((p) => p.id === c.party)!;
                return (
                  <Link
                    key={t.id}
                    to={href('/discussions', { thread: t.id })}
                    className="question-summary"
                  >
                    <span className="question-context">
                      {p.name}
                      <span>{c.number}</span>
                    </span>
                    <h3>{t.title}</h3>
                    <div className="question-person">
                      <span className="small-avatar">{initials(t.assignee)}</span>
                      <span>{t.assignee}</span>
                      <span className="message-count">
                        {t.messages.length}{' '}
                        {plural(t.messages.length, ['сообщение', 'сообщения', 'сообщений'])}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {!questions.length && <p className="quiet-empty">Открытых вопросов нет.</p>}
            <Link className="text-link" to={href('/discussions')}>
              Все обсуждения
              <ArrowRight size={17} />
            </Link>
          </section>
        </aside>
      </div>
      {role === 'employee' && (
        <div className="employee-quick-link">
          <span>Найти договор клиента или поставщика</span>
          <Button onClick={() => go('/counterparties')}>
            Контрагенты
            <ArrowRight size={17} />
          </Button>
        </div>
      )}
    </>
  );
}
