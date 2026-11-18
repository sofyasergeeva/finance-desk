import { useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { useDesk } from '../../app/DeskProvider';
import { kinds, money, periodDocuments } from '../../data/model';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/primitives';
import { Empty, SearchInput } from '../common';

export function SearchDialog({ open, close }: { open: boolean; close: () => void }) {
  const { data, org, period, go, showDocument } = useDesk();
  const [q, setQ] = useState('');
  const needle = q.trim().toLocaleLowerCase('ru');
  const contracts = data.contracts.filter((c) => c.org === org.id);
  const parties = data.counterparties.filter(
    (p) =>
      contracts.some((c) => c.party === p.id) &&
      needle &&
      p.name.toLocaleLowerCase('ru').includes(needle),
  );
  const cs = contracts.filter(
    (c) =>
      needle &&
      `${c.number} ${c.title} ${data.counterparties.find((p) => p.id === c.party)!.name}`
        .toLocaleLowerCase('ru')
        .includes(needle),
  );
  const docs = periodDocuments(data, org.id, period).filter(
    (d) =>
      needle &&
      `${d.number} ${kinds[d.kind].label} ${data.counterparties.find((p) => p.id === contracts.find((c) => c.id === d.contract)?.party)?.name}`
        .toLocaleLowerCase('ru')
        .includes(needle),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="search-dialog">
        <DialogTitle>Найти в Finance Desk</DialogTitle>
        <DialogDescription>{org.name}. Документы за выбранный период.</DialogDescription>
        <SearchInput
          label="Поиск по приложению"
          placeholder="Контрагент, договор, документ"
          value={q}
          onChange={setQ}
        />
        <div className="search-results">
          {!needle ? (
            <p className="search-hint">Например, «Меридиан» или «ПД-075».</p>
          ) : (
            <>
              {parties.length > 0 && <h3>Контрагенты</h3>}
              {parties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    close();
                    go(`/counterparties/${p.id}`);
                  }}
                >
                  {p.name}
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {cs.length > 0 && <h3>Договоры</h3>}
              {cs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    close();
                    go(`/contracts/${c.id}`);
                  }}
                >
                  <span>
                    {c.title}
                    <span className="secondary">{c.number}</span>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {docs.length > 0 && <h3>Документы</h3>}
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    close();
                    showDocument(d.id);
                  }}
                >
                  <span>
                    {kinds[d.kind].short} {d.number}
                    <span className="secondary">{money(d.amount)}</span>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {!parties.length && !cs.length && !docs.length && (
                <Empty title="Ничего не найдено" text="Попробуйте часть названия или номера." />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
