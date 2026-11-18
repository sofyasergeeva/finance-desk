import { useEffect, useState } from 'react';
import {
  CaretDown,
  DownloadSimple,
  Printer,
  ArrowCounterClockwise,
  Info,
} from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import {
  amountKeys,
  chart,
  postingFor,
  trialBalance,
  trialConsistent,
  trialMovements,
  trialTotal,
  trialRowsForDisplay,
} from '../data/ledger';
import { dateRange, money, periodLabel, shortDate } from '../data/model';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/primitives';
import { Empty } from './common';
import { csvExport } from '../lib/csv';
import { usePrintPreview } from './printing';

const trialNumber = (value: number) => money(value).replace(/\s*₽$/, '');
export function TrialBalance() {
  const { data, org, period, params, patch, showDocument, notify } = useDesk();
  const print = usePrintPreview();
  const selected = params.get('ledgerAccount') || 'all';
  const detail = params.get('ledgerDetail');
  const [draft, setDraft] = useState(selected);
  const hideZero = params.get('ledgerZero') !== 'show';
  useEffect(() => setDraft(selected), [selected, org.id]);
  const all = trialBalance(data, org, period);
  const rows = trialRowsForDisplay(all, selected, hideZero);
  const total = trialTotal(rows);
  const detailRow = rows.find((r) => r.code === detail);
  const movements = detailRow ? trialMovements(data, org.id, period, detailRow.code) : [];
  const valid = selected === 'all' || ['55', '90', ...chart.map((a) => a.code)].includes(selected);
  if (!trialConsistent(all))
    return (
      <Empty
        title="Данные ОСВ несогласованы"
        text="Остатки и обороты не сошлись. Формирование и экспорт остановлены."
      />
    );
  const exportRows = () => {
    const range = dateRange(period);
    csvExport(
      'finance-desk-demo-trial-balance.csv',
      [
        'Организация',
        'С',
        'По',
        'Счёт',
        'Название',
        'Начальное Дт RUB',
        'Начальное Кт RUB',
        'Оборот Дт RUB',
        'Оборот Кт RUB',
        'Конечное Дт RUB',
        'Конечное Кт RUB',
      ],
      rows.map((r) => [
        org.legal,
        range.from,
        range.to,
        r.code,
        r.name,
        ...amountKeys.map((k) => (r[k] / 100).toFixed(2)),
      ]),
    );
    notify('ОСВ выгружена в CSV');
  };
  return (
    <section className="trial-balance" aria-label="Оборотно-сальдовая ведомость">
      <form
        className="ledger-filter"
        onSubmit={(e) => {
          e.preventDefault();
          patch(
            {
              ledgerAccount: draft === 'all' ? null : draft,
              ledgerDetail: null,
            },
            false,
          );
        }}
      >
        <label htmlFor="ledger-account">
          Счёт бухгалтерского учёта
          <select
            id="ledger-account"
            name="ledger-account"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          >
            <option value="all">Все счета</option>
            {chart.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} · {a.name}
              </option>
            ))}
            <option value="55">55 · Все специальные счета</option>
            <option value="90">90 · Все субсчета продаж</option>
          </select>
        </label>
        <Button type="submit" variant="primary">
          Сформировать
        </Button>
        <Button
          onClick={() => {
            setDraft('all');
            patch({ ledgerAccount: null, ledgerDetail: null, period: '2026-11' }, false);
          }}
        >
          <ArrowCounterClockwise size={17} />
          Сбросить
        </Button>
        <div className="ledger-exports">
          <Button disabled={!valid || draft !== selected} onClick={exportRows}>
            <DownloadSimple size={17} />
            CSV
          </Button>
          <Button disabled={!valid || draft !== selected} onClick={() => print('trial')}>
            <Printer size={17} />
            PDF
          </Button>
        </div>
      </form>
      {draft !== selected && (
        <p className="filter-pending" role="status">
          Счёт изменён. Нажмите «Сформировать», чтобы применить отбор.
        </p>
      )}
      <div className="ledger-caption">
        <div>
          <h2>Оборотно-сальдовая ведомость</h2>
          <p>
            {org.legal} · {periodLabel(period)}
          </p>
        </div>
        <label className="ledger-zero">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(e) => patch({ ledgerZero: e.target.checked ? null : 'show' })}
          />
          Скрыть нулевые счета
        </label>
      </div>
      {!valid ? (
        <Empty
          title="Счёт не найден"
          text="Выберите счёт из плана счетов."
          action={
            <Button
              onClick={() => {
                setDraft('all');
                patch({ ledgerAccount: null, ledgerDetail: null });
              }}
            >
              Все счета
            </Button>
          }
        />
      ) : (
        <>
          <div
            className="ledger-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="ОСВ, таблица с горизонтальной прокруткой"
          >
            <table className="ledger-table">
              <caption className="sr-only">ОСВ, все суммы в рублях</caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col">
                    Счёт
                  </th>
                  <th colSpan={2} scope="colgroup">
                    Сальдо на начало
                  </th>
                  <th colSpan={2} scope="colgroup">
                    Обороты за период
                  </th>
                  <th colSpan={2} scope="colgroup">
                    Сальдо на конец
                  </th>
                </tr>
                <tr>
                  {['Дебет', 'Кредит', 'Дебет', 'Кредит', 'Дебет', 'Кредит'].map((name, i) => (
                    <th scope="col" className="num" key={i}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className={detail === r.code ? 'ledger-selected' : ''}>
                    <th scope="row">
                      <button
                        className="ledger-row-trigger"
                        aria-expanded={detail === r.code}
                        onClick={() =>
                          patch({ ledgerDetail: detail === r.code ? null : r.code }, false)
                        }
                      >
                        <span className="ledger-code">{r.code}</span>
                        <span>{r.name}</span>
                        <CaretDown size={16} />
                      </button>
                    </th>
                    {amountKeys.map((k) => (
                      <td key={k} className={`num ${r[k] === 0 ? 'ledger-zero-value' : ''}`}>
                        {trialNumber(r[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Итого, ₽</th>
                  {amountKeys.map((k) => (
                    <td key={k} className="num">
                      {trialNumber(total[k])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <Collapsible className="ledger-help">
            <CollapsibleTrigger className="history-disclose">
              <Info size={16} />
              Как читать ведомость
              <CaretDown size={14} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p>
                Начальное сальдо показывает остаток до первой даты. Обороты содержат проведённые
                операции за период. Начальное Дт − начальное Кт + оборот Дт − оборот Кт = конечное
                Дт − конечное Кт. Расчёты по разным договорам не сворачиваются между собой.
              </p>
              <p>
                Начальные остатки заданы в учебном наборе. Это не ОСВ из 1С. Родительские счета и их
                субсчета не суммируются повторно.
              </p>
            </CollapsibleContent>
          </Collapsible>
          {detailRow && (
            <section className="ledger-detail" aria-label={`Операции по счёту ${detailRow.code}`}>
              <div className="section-heading">
                <div>
                  <h2>
                    Счёт {detailRow.code} · {detailRow.name}
                  </h2>
                  <p>Проведённые документы за выбранные даты</p>
                </div>
                <Button variant="ghost" onClick={() => patch({ ledgerDetail: null })}>
                  Свернуть
                </Button>
              </div>
              {movements.length ? (
                <div className="ledger-source-list">
                  {movements.map((d) => {
                    const p = postingFor(d);
                    const c = data.contracts.find((c) => c.id === d.contract)!;
                    const party = data.counterparties.find((p) => p.id === c.party)!;
                    return (
                      <button
                        key={d.id}
                        className="ledger-source"
                        onClick={() => showDocument(d.id)}
                      >
                        <span>{shortDate(d.date)}</span>
                        <span>
                          <strong>{d.number}</strong>
                          <span className="secondary">
                            {party.name} · {c.number}
                          </span>
                        </span>
                        <span>
                          Дт {p.debit}
                          <span className="secondary">Кт {p.credit}</span>
                        </span>
                        <strong className="num">{money(d.amount)}</strong>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  title="Оборотов по счёту нет"
                  text="В этом периоде остаток сформирован без новых проводок."
                />
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
