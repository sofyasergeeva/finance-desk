import { TrialBalance } from '../components/TrialBalance';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bank,
  DownloadSimple,
  Wallet,
  Vault,
  ArrowsLeftRight,
} from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import {
  accountBalance,
  contractTotals,
  contractTotalsAtDate,
  cutoff,
  dateRange,
  dayBefore,
  longDate,
  money,
  overview,
  periodLabel,
} from '../data/model';
import { AccessDenied, DocumentList, Empty, PageHeading } from '../components/common';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/primitives';
import { csvExport } from '../lib/csv';

export function Reports() {
  const { data, org, role, period, params, patch, href, notify } = useDesk();
  if (role !== 'director') return <AccessDenied />;
  const report =
    params.get('report') === 'trial'
      ? 'trial'
      : params.get('report') === 'settlements'
        ? 'settlements'
        : 'money';
  const direction = params.get('direction') === 'supplier' ? 'supplier' : 'client';
  const account = org.accounts.find((a) => a.id === params.get('account'));
  const range = dateRange(period);
  const info = overview(data, org, period);
  const accounts = account ? [account] : org.accounts;
  const movements = info.movements.filter((d) => !account || d.account === account.id);
  const ending = accounts.reduce((s, a) => s + accountBalance(data, org, a, period), 0);
  const opening = accounts.reduce((s, a) => s + accountBalance(data, org, a, period, true), 0);
  const incoming = movements.filter((d) => d.kind === 'in').reduce((s, d) => s + d.amount, 0);
  const outgoing = movements.filter((d) => d.kind === 'out').reduce((s, d) => s + d.amount, 0);
  const contracts = data.contracts.filter((c) => c.org === org.id && c.direction === direction);
  const rows = contracts.map((c) => {
    const end = contractTotals(data, c, period);
    const start = contractTotalsAtDate(data, c, dayBefore(range.from));
    return {
      c,
      end,
      start,
      services: end.accrued - start.accrued,
      paid: end.paid - start.paid,
    };
  });
  const exportReport = () => {
    if (report === 'money')
      csvExport(
        'finance-desk-demo-money.csv',
        [
          'Организация',
          'С',
          'По',
          'Счёт',
          'Остаток на начало RUB',
          'Поступило RUB',
          'Списано RUB',
          'Остаток на конец RUB',
        ],
        accounts.map((a) => {
          const docs = info.movements.filter((d) => d.account === a.id);
          return [
            org.legal,
            range.from,
            range.to,
            a.name,
            (accountBalance(data, org, a, period, true) / 100).toFixed(2),
            (docs.filter((d) => d.kind === 'in').reduce((s, d) => s + d.amount, 0) / 100).toFixed(
              2,
            ),
            (docs.filter((d) => d.kind === 'out').reduce((s, d) => s + d.amount, 0) / 100).toFixed(
              2,
            ),
            (accountBalance(data, org, a, period) / 100).toFixed(2),
          ];
        }),
      );
    else
      csvExport(
        'finance-desk-demo-settlements.csv',
        [
          'Организация',
          'С',
          'По',
          'Контрагент',
          'Договор',
          'Направление',
          'Долг на начало RUB',
          'Услуги за период RUB',
          'Оплаты за период RUB',
          'Долг на конец RUB',
        ],
        rows.map(({ c, end, start, services, paid }) => [
          org.legal,
          range.from,
          range.to,
          data.counterparties.find((p) => p.id === c.party)!.name,
          c.number,
          direction === 'client' ? 'Нам должны' : 'Мы должны',
          (start.debt / 100).toFixed(2),
          (services / 100).toFixed(2),
          (paid / 100).toFixed(2),
          (end.debt / 100).toFixed(2),
        ]),
      );
    notify('Отчёт выгружен в CSV');
  };
  return (
    <>
      <PageHeading title="Отчёты">
        {report !== 'trial' && (
          <Button onClick={exportReport}>
            <DownloadSimple size={18} />
            Выгрузить CSV
          </Button>
        )}
      </PageHeading>
      <Tabs value={report} onValueChange={(v) => patch({ report: v, account: null })}>
        <TabsList aria-label="Вид финансового отчёта">
          <TabsTrigger value="money">
            <Wallet size={18} />
            Деньги
          </TabsTrigger>
          <TabsTrigger value="settlements">
            <ArrowsLeftRight size={18} />
            Взаиморасчёты
          </TabsTrigger>
          <TabsTrigger value="trial">ОСВ</TabsTrigger>
        </TabsList>
        <TabsContent value="money">
          <div className="report-layout">
            <label className="mobile-account-select">
              Счёт или касса
              <select
                aria-label="Счёт отчёта"
                value={account?.id || 'all'}
                onChange={(e) =>
                  patch({
                    account: e.target.value === 'all' ? null : e.target.value,
                  })
                }
              >
                <option value="all">Все денежные средства</option>
                {org.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <aside className="report-accounts">
              <h2>Счета и кассы</h2>
              <button
                className={`account-choice ${!account ? 'selected' : ''}`}
                onClick={() => patch({ account: null })}
                aria-pressed={!account}
              >
                <Wallet size={20} />
                <span>
                  Все счета<strong>{money(info.balance)}</strong>
                </span>
              </button>
              {org.accounts.map((a) => (
                <button
                  key={a.id}
                  className={`account-choice ${account?.id === a.id ? 'selected' : ''}`}
                  aria-pressed={account?.id === a.id}
                  onClick={() => patch({ account: a.id })}
                >
                  {a.id === 'bank' ? (
                    <Bank size={20} />
                  ) : a.id === 'cash' ? (
                    <Wallet size={20} />
                  ) : (
                    <Vault size={20} />
                  )}
                  <span>
                    {a.name}
                    <strong>{money(accountBalance(data, org, a, period))}</strong>
                  </span>
                </button>
              ))}
            </aside>
            <section className="money-report">
              <div className="report-result">
                <div>
                  <span>{account?.name || 'Все денежные средства'}</span>
                  <h2>{money(ending)}</h2>
                  <p>Остаток на {longDate(cutoff(period))}</p>
                </div>
                <div className="net-change">
                  <span>Изменение за период</span>
                  <strong className={ending - opening < 0 ? 'peach-text' : 'mint-text'}>
                    {ending - opening > 0 ? '+' : ''}
                    {money(ending - opening)}
                  </strong>
                </div>
              </div>
              <div className="reconciliation" role="group" aria-label="Расчёт остатка">
                <div>
                  <span>На начало {longDate(range.from)}</span>
                  <strong>{money(opening)}</strong>
                </div>
                <span className="calculation-sign">+</span>
                <div>
                  <span>Поступило за период</span>
                  <strong className="mint-text">{money(incoming)}</strong>
                </div>
                <span className="calculation-sign">−</span>
                <div>
                  <span>Списано за период</span>
                  <strong className="peach-text">{money(outgoing)}</strong>
                </div>
              </div>
              <div className="section-heading">
                <div>
                  <h2>Операции за период</h2>
                  <p>{periodLabel(period)}</p>
                </div>
                <span className="count">{movements.length}</span>
              </div>
              {movements.length ? (
                <DocumentList documents={movements} compact />
              ) : (
                <Empty
                  title="Движений не было"
                  text="За выбранные даты остаток счёта не менялся."
                />
              )}
              {!account && (
                <p className="data-note">
                  Депозит включён в общий остаток. Условия его использования здесь не учитываются.
                </p>
              )}
            </section>
          </div>
        </TabsContent>
        <TabsContent value="settlements">
          <div className="report-settlement-header">
            <div className="segmented" role="group" aria-label="Направление отчёта">
              <button
                aria-pressed={direction === 'client'}
                onClick={() => patch({ direction: 'client' })}
              >
                Клиенты должны нам
              </button>
              <button
                aria-pressed={direction === 'supplier'}
                onClick={() => patch({ direction: 'supplier' })}
              >
                Мы должны поставщикам
              </button>
            </div>
            <div className="report-debt-total">
              <span>Долг на {longDate(cutoff(period))}</span>
              <strong className={direction === 'client' ? 'lavender-text' : 'peach-text'}>
                {money(direction === 'client' ? info.client : info.supplier)}
              </strong>
            </div>
          </div>
          <div
            className="report-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Таблица взаиморасчётов, прокрутка по горизонтали"
          >
            <table className="report-table">
              <caption className="sr-only">Расчёты по договорам, {periodLabel(period)}</caption>
              <thead>
                <tr>
                  <th>Контрагент / договор</th>
                  <th className="num">Долг на начало</th>
                  <th className="num">Услуги за период</th>
                  <th className="num">Оплаты за период</th>
                  <th className="num">Долг на конец</th>
                  <th>
                    <span className="sr-only">Открыть договор</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, start, end, services, paid }) => {
                  const p = data.counterparties.find((p) => p.id === c.party)!;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={href(`/contracts/${c.id}`)}>
                          <strong>{p.name}</strong>
                          <span className="secondary">
                            {c.number} · {c.title}
                          </span>
                        </Link>
                      </td>
                      <td className="num">{money(start.debt)}</td>
                      <td className="num">{money(services)}</td>
                      <td className="num">{money(paid)}</td>
                      <td className="num">
                        <strong>{money(end.debt)}</strong>
                      </td>
                      <td>
                        <Link
                          to={href(`/contracts/${c.id}`)}
                          className="icon-button"
                          aria-label={`Открыть расчёты по договору ${c.number}`}
                        >
                          <ArrowUpRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="data-note">
            Долг на начало + услуги − оплаты = долг на конец. Встречные долги не сворачиваются.
          </p>
        </TabsContent>
        <TabsContent value="trial">
          <TrialBalance />
        </TabsContent>
      </Tabs>
    </>
  );
}
