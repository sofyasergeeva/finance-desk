import React, { useEffect, useRef, useState } from 'react';
import { Check, ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { useDesk } from '../../app/DeskProvider';
import {
  contractTotals,
  cutoff,
  longDate,
  money,
  parseMoney,
  validatePayment,
} from '../../data/model';
import type { PaymentInput } from '../../data/model';
import { recordPayment } from '../../data/repository';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Button } from '../ui/primitives';
import { Empty } from '../common';

type PaymentStage = 'input' | 'review' | 'success' | 'discard';
export function PaymentDialog() {
  const { data, setData, org, role, period, params, patch, draftPayments } = useDesk();
  const requested = params.get('pay') || '';
  const choices = data.contracts.filter(
    (c) => c.org === org.id && c.direction === 'client' && contractTotals(data, c, period).debt > 0,
  );
  const [selected, setSelected] = useState(
    requested === 'choose'
      ? choices[0]?.id || ''
      : choices.some((c) => c.id === requested)
        ? requested
        : '',
  );
  const cached = draftPayments.current[org.id + '-' + selected];
  const [values, setValues] = useState({
    amount: cached?.amount || '',
    account: cached?.account || 'bank',
    date: cached?.date || cutoff(period),
    comment: cached?.comment || '',
  });
  const [stage, setStage] = useState<PaymentStage>('input');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('amount');
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState('');
  const lock = useRef(false);
  const lastStage = useRef<PaymentStage>('input');
  const amountRef = useRef<HTMLInputElement>(null);
  const c = data.contracts.find((c) => c.id === selected && c.org === org.id);
  const p = data.counterparties.find((p) => p.id === c?.party);
  const totals = c ? contractTotals(data, c, period) : null;
  const input: PaymentInput = {
    contract: selected,
    amount: parseMoney(values.amount) || 0,
    account: values.account,
    date: values.date,
    comment: values.comment,
  };
  useEffect(() => {
    if (selected && stage !== 'success') draftPayments.current[org.id + '-' + selected] = values;
  }, [values, selected, stage, org.id]);
  const close = () => patch({ pay: null }, true);
  const requestClose = () => {
    if (values.amount && stage !== 'success' && stage !== 'discard') {
      lastStage.current = stage;
      setStage('discard');
    } else close();
  };
  function review(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = validatePayment(data, org, role, period, input);
    if (message) {
      const field = message.startsWith('Дата') ? 'date' : 'amount';
      setErrorField(field);
      setError(message);
      if (field === 'date') document.getElementById('payment-date')?.focus();
      else amountRef.current?.focus();
      return;
    }
    setError('');
    setStage('review');
  }
  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      await Promise.resolve();
      const result = recordPayment(data, org, role, period, input);
      setData(result.data);
      setCreated(result.document.id);
      delete draftPayments.current[org.id + '-' + selected];
      setStage('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить запись.');
      lock.current = false;
    } finally {
      setPending(false);
    }
  }
  const doc = data.documents.find((d) => d.id === created);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) requestClose();
      }}
    >
      <DialogContent
        className="payment-dialog"
        onInteractOutside={(e) => {
          if (pending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <DialogTitle>
          {stage === 'review'
            ? 'Проверьте поступление'
            : stage === 'success'
              ? 'Поступление учтено'
              : stage === 'discard'
                ? 'Закрыть форму?'
                : 'Учесть оплату клиента'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {stage === 'success'
            ? 'Изменены только демонстрационные данные этой вкладки.'
            : stage === 'discard'
              ? 'Введённые значения сохранятся как черновик формы в этой вкладке.'
              : 'Оплата учитывается по существующему долгу договора.'}
        </DialogDescription>
        {role !== 'employee' ? (
          <div className="inline-message">
            Эта операция доступна сотруднику. Закройте форму и переключите демонстрационную роль.
          </div>
        ) : !c || !p || !totals ? (
          <Empty
            title="Договор недоступен для оплаты"
            text="Он не найден в этой организации или долг уже погашен. Закройте форму и выберите нужный договор."
          />
        ) : stage === 'discard' ? (
          <div className="form-actions">
            <Button onClick={() => setStage(lastStage.current)}>Продолжить ввод</Button>
            <Button variant="primary" onClick={close}>
              Закрыть
            </Button>
          </div>
        ) : stage === 'success' && doc ? (
          <div className="payment-success">
            <CheckCircle size={52} weight="duotone" />
            <p>
              Создан документ <strong>{doc.number}</strong> на <strong>{money(doc.amount)}</strong>.
            </p>
            <div className="review-row">
              <span>Остаток по договору {c.number}</span>
              <strong>{money(totals.debt)}</strong>
            </div>
            <p className="secondary">
              1С и банк не использовались. Это не подтверждение реального платежа.
            </p>
            <div className="form-actions">
              <Button onClick={close}>Готово</Button>
              <Button variant="primary" onClick={() => patch({ pay: null, doc: doc.id }, true)}>
                Открыть документ
                <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        ) : stage === 'review' ? (
          <>
            <div className="payment-review-value">
              <span>Поступление от {p.name}</span>
              <strong>{money(input.amount)}</strong>
            </div>
            <div className="review-list">
              {[
                ['Организация', org.legal],
                ['Договор', c.number + ' · ' + c.title],
                ['Дата', longDate(input.date)],
                [
                  'Куда поступили деньги',
                  org.accounts.find((a) => a.id === input.account)?.name || '',
                ],
                ['Долг до', money(totals.debt)],
                ['Долг после', money(totals.debt - input.amount)],
              ].map(([label, value]) => (
                <div className="review-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="form-hint">
              Запись сохранится в учебных данных. Банковский перевод не выполняется.
            </p>
            <p role="alert" className="form-error">
              {error}
            </p>
            <div className="form-actions">
              <Button onClick={() => setStage('input')} disabled={pending}>
                <ArrowLeft size={17} />
                Изменить
              </Button>
              <Button variant="mint" onClick={confirm} disabled={pending}>
                {pending ? (
                  'Сохранение…'
                ) : (
                  <>
                    <Check size={18} />
                    Подтвердить
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <form noValidate onSubmit={review} className="payment-form">
            <label className="field">
              Клиент и договор
              <select
                value={selected}
                onChange={(e) => {
                  const id = e.target.value;
                  const saved = draftPayments.current[org.id + '-' + id];
                  setSelected(id);
                  setValues({
                    amount: saved?.amount || '',
                    account: saved?.account || 'bank',
                    date: saved?.date || cutoff(period),
                    comment: saved?.comment || '',
                  });
                  setError('');
                }}
              >
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {data.counterparties.find((p) => p.id === c.party)!.name} · {c.number}
                  </option>
                ))}
              </select>
            </label>
            <div className="payment-debt">
              <span>Долг по договору</span>
              <strong>{money(totals.debt)}</strong>
            </div>
            <label className="field" htmlFor="payment-amount">
              Сумма поступления, ₽
              <input
                ref={amountRef}
                id="payment-amount"
                className="amount-input"
                inputMode="decimal"
                autoComplete="off"
                value={values.amount}
                onChange={(e) => {
                  setValues((v) => ({ ...v, amount: e.target.value }));
                  setError('');
                }}
                placeholder="0,00"
                aria-invalid={!!error && errorField === 'amount'}
                aria-describedby="payment-error payment-limit"
              />
            </label>
            <p id="payment-limit" className="field-hint">
              Можно учесть часть суммы. Не больше {money(totals.debt)}.
            </p>
            <p id="payment-error" className="form-error" role="alert">
              {errorField === 'amount' ? error : ''}
            </p>
            <div className="form-row">
              <label className="field">
                Куда поступили деньги
                <select
                  value={values.account}
                  onChange={(e) => setValues((v) => ({ ...v, account: e.target.value }))}
                >
                  {org.accounts
                    .filter((a) => a.id !== 'deposit')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Дата
                <input
                  id="payment-date"
                  aria-invalid={!!error && errorField === 'date'}
                  aria-describedby="payment-date-error"
                  type="date"
                  value={values.date}
                  min="2026-10-01"
                  max={cutoff(period)}
                  onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                />
              </label>
            </div>
            <p id="payment-date-error" className="form-error" role="alert">
              {errorField === 'date' ? error : ''}
            </p>
            <label className="field">
              Комментарий <span className="secondary">необязательно</span>
              <input
                value={values.comment}
                maxLength={180}
                onChange={(e) => setValues((v) => ({ ...v, comment: e.target.value }))}
                placeholder="Например, частичная оплата"
              />
            </label>
            <div className="form-actions">
              <Button onClick={requestClose}>Отмена</Button>
              <Button type="submit" variant="primary">
                Проверить
                <ArrowRight size={18} />
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
