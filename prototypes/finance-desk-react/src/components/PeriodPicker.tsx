import React, { useRef, useState } from 'react';
import { CalendarBlank, CaretDown, ArrowCounterClockwise, Check } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import { CURRENT_DATE, FIRST_DATE, dateRange, isDate, periodLabel } from '../data/model';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/primitives';

const presets = [
  ['2026-11', 'Текущий месяц'],
  ['2026-10', 'Прошлый месяц'],
  ['2026-10-01:2026-11-18', 'Текущий квартал'],
  ['2026-10-20:2026-11-18', 'Последние 30 дней'],
] as const;
export function PeriodPicker() {
  const { period, patch } = useDesk();
  const current = dateRange(period);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [error, setError] = useState('');
  const start = () => {
    setFrom(current.from);
    setTo(current.to);
    setError('');
    setOpen(true);
  };
  const apply = (value: string) => {
    patch({ period: value, doc: null, pay: null }, false);
    setOpen(false);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let message = '';
    let field = 'period-from';
    if (!isDate(from) || !isDate(to)) message = 'Укажите обе даты.';
    else if (from > to) {
      message = 'Дата «По» должна быть не раньше даты «С».';
      field = 'period-to';
    } else if (from < FIRST_DATE || to > CURRENT_DATE) {
      message = 'Данные доступны с 1 октября по 18 ноября 2026.';
      field = from < FIRST_DATE ? 'period-from' : 'period-to';
    }
    if (message) {
      setError(message);
      requestAnimationFrame(() => document.getElementById(field)?.focus());
      return;
    }
    apply(`${from}:${to}`);
  };
  return (
    <div className="period-control">
      <Button
        ref={trigger}
        className="period-trigger"
        onClick={start}
        aria-label={`Финансовый период: ${periodLabel(period)}`}
        aria-haspopup="dialog"
      >
        <CalendarBlank aria-hidden="true" />
        <span>{periodLabel(period)}</span>
        <CaretDown aria-hidden="true" />
      </Button>
      {period !== '2026-11' && (
        <button
          className="period-reset icon-button"
          title="Сбросить период: текущий месяц"
          aria-label="Сбросить период: текущий месяц"
          onClick={() => apply('2026-11')}
        >
          <ArrowCounterClockwise aria-hidden="true" />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="period-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
          }}
        >
          <DialogTitle>Выбрать период</DialogTitle>
          <DialogDescription>
            Обороты за выбранные даты, остатки на конец периода.
          </DialogDescription>
          <div className="period-presets">
            {presets.map(([value, label]) => (
              <Button key={value} onClick={() => apply(value)} aria-pressed={period === value}>
                {label}
                {period === value && <Check aria-hidden="true" />}
              </Button>
            ))}
          </div>
          <form noValidate onSubmit={submit}>
            <div className="date-fields">
              <label htmlFor="period-from">
                С
                <input
                  id="period-from"
                  name="from"
                  type="date"
                  autoComplete="off"
                  min={FIRST_DATE}
                  max={CURRENT_DATE}
                  value={from}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'period-error' : 'period-bounds'}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setError('');
                  }}
                />
              </label>
              <label htmlFor="period-to">
                По
                <input
                  id="period-to"
                  name="to"
                  type="date"
                  autoComplete="off"
                  min={FIRST_DATE}
                  max={CURRENT_DATE}
                  value={to}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'period-error' : 'period-bounds'}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setError('');
                  }}
                />
              </label>
            </div>
            <p id="period-bounds" className="period-bounds">
              Доступны данные: 1 октября – 18 ноября 2026
            </p>
            {error && (
              <p id="period-error" className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="period-actions">
              <Button onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" variant="primary">
                Применить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
