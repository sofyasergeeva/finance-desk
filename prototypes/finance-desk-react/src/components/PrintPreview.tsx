import { useLocation, useNavigate } from 'react-router-dom';
import { Printer } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Button } from './ui/primitives';
import {
  amountKeys,
  accountMatches,
  postingFor,
  trialBalance,
  trialConsistent,
  trialTotal,
  trialRowsForDisplay,
} from '../data/ledger';
import { kinds, longDate, money, periodLabel } from '../data/model';

export function PrintPreview() {
  const { data, org, period, role, params, patch } = useDesk();
  const location = useLocation();
  const navigate = useNavigate();
  const [type, id] = params.get('print')?.split(':') || [];
  const d = data.documents.find((d) => d.id === id && d.org === org.id);
  const allRows = trialBalance(data, org, period);
  const isTrial =
    type === 'trial' &&
    role === 'director' &&
    trialConsistent(allRows) &&
    allRows.some((r) => accountMatches(r.code, params.get('ledgerAccount') || 'all'));
  const isDoc = type === 'document' && !!d;
  const rows = trialRowsForDisplay(
    allRows,
    params.get('ledgerAccount') || 'all',
    params.get('ledgerZero') !== 'show',
  );
  const total = trialTotal(rows);
  const close = () => {
    if (location.state?.printPreview) navigate(-1);
    else patch({ print: null });
  };
  const c = d ? data.contracts.find((c) => c.id === d.contract) : null;
  const party = c ? data.counterparties.find((p) => p.id === c.party) : null;
  const p = d ? postingFor(d) : null;
  return (
    <Dialog
      open={!!type}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="print-dialog">
        <DialogTitle className="sr-only">Предпросмотр PDF</DialogTitle>
        <DialogDescription className="print-explanation">
          Учебная копия. Это не оригинальная печатная форма 1С.
        </DialogDescription>
        <div className="print-toolbar">
          <Button onClick={close}>Вернуться</Button>
          <Button variant="primary" disabled={!isTrial && !isDoc} onClick={() => window.print()}>
            <Printer size={18} />
            Печать / сохранить PDF
          </Button>
        </div>
        <article className="print-sheet">
          <header>
            <span>Finance Desk</span>
            <span>Демонстрационная копия</span>
          </header>
          {isTrial ? (
            <>
              <h1>Оборотно-сальдовая ведомость</h1>
              <p>{org.legal}</p>
              <p>{periodLabel(period)} · Все суммы в рублях</p>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2}>Счёт</th>
                    <th colSpan={2}>Начальное сальдо</th>
                    <th colSpan={2}>Обороты</th>
                    <th colSpan={2}>Конечное сальдо</th>
                  </tr>
                  <tr>
                    {['Дт', 'Кт', 'Дт', 'Кт', 'Дт', 'Кт'].map((s, i) => (
                      <th key={i}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.code}>
                      <td>
                        {r.code}
                        <span>{r.name}</span>
                      </td>
                      {amountKeys.map((k) => (
                        <td key={k}>
                          {(r[k] / 100).toLocaleString('ru-RU', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Итого</th>
                    {amountKeys.map((k) => (
                      <td key={k}>
                        {(total[k] / 100).toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </>
          ) : isDoc && d && c && party && p ? (
            <>
              <h1>{kinds[d.kind].label}</h1>
              <p>
                № {d.number} от {longDate(d.date)}
              </p>
              <dl>
                <div>
                  <dt>Организация</dt>
                  <dd>{org.legal}</dd>
                </div>
                <div>
                  <dt>Контрагент</dt>
                  <dd>{party.name}</dd>
                </div>
                <div>
                  <dt>Договор</dt>
                  <dd>
                    {c.number} · {c.title}
                  </dd>
                </div>
                <div>
                  <dt>Состояние</dt>
                  <dd>{d.status === 'posted' ? 'Проведён' : 'Черновик'}</dd>
                </div>
              </dl>
              <h2>{money(d.amount)}</h2>
              <p>{d.description}</p>
              {d.status === 'posted' ? (
                <table>
                  <thead>
                    <tr>
                      <th>Дебет</th>
                      <th>Кредит</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{p.debit}</td>
                      <td>{p.credit}</td>
                      <td>{money(d.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p>Черновик не формирует проводки.</p>
              )}
            </>
          ) : (
            <>
              <h1>Данные недоступны</h1>
              <p>Проверьте организацию, документ или роль.</p>
            </>
          )}
          <footer>
            Сформировано из синтетических данных прототипа. Не заменяет документы и отчёты 1С.
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  );
}
