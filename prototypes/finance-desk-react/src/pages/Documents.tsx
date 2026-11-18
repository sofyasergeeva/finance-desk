import { DocumentDetails } from '../components/DocumentDetails';
import { csvExport } from '../lib/csv';
import { Link, useParams } from 'react-router-dom';
import { DownloadSimple, Plus } from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import { kinds, periodDocuments } from '../data/model';

import { Breadcrumbs, DocumentList, Empty, PageHeading, SearchInput } from '../components/common';
import { Button } from '../components/ui/primitives';

export function Documents() {
  const { data, org, role, period, params, patch, notify, openPayment } = useDesk();
  const q = params.get('q') || '';
  const status = params.get('status') || 'all';
  const kind = params.get('kind') || 'all';
  const rows = periodDocuments(data, org.id, period).filter((d) => {
    const c = data.contracts.find((c) => c.id === d.contract)!;
    const p = data.counterparties.find((p) => p.id === c.party)!;
    return (
      (status === 'all' || d.status === status) &&
      (kind === 'all' ||
        (kind === 'money' ? d.kind === 'in' || d.kind === 'out' : kind === d.kind)) &&
      `${d.number} ${p.name} ${c.number} ${kinds[d.kind].label}`
        .toLocaleLowerCase('ru')
        .includes(q.toLocaleLowerCase('ru'))
    );
  });
  const exportRows = () => {
    csvExport(
      'finance-desk-demo-documents.csv',
      ['Демоорганизация', 'Документ', 'Дата', 'Вид', 'Договор', 'Сумма RUB', 'Состояние'],
      rows.map((d) => [
        org.legal,
        d.number,
        d.date,
        kinds[d.kind].label,
        data.contracts.find((c) => c.id === d.contract)!.number,
        (d.amount / 100).toFixed(2),
        d.status === 'draft' ? 'Черновик' : 'Проведён',
      ]),
    );
    notify('Документы выгружены в CSV');
  };
  return (
    <>
      <PageHeading title="Документы">
        {role === 'employee' && (
          <Button variant="primary" onClick={() => openPayment('choose')}>
            <Plus size={18} />
            Учесть оплату
          </Button>
        )}
        <Button onClick={exportRows}>
          <DownloadSimple size={18} />
          CSV
        </Button>
      </PageHeading>
      <div className="directory-toolbar">
        <div className="segmented" role="group" aria-label="Состояние документа">
          {[
            ['all', 'Все документы'],
            ['draft', 'Черновики'],
            ['posted', 'Проведённые'],
          ].map(([v, label]) => (
            <button key={v} aria-pressed={status === v} onClick={() => patch({ status: v })}>
              {label}
            </button>
          ))}
        </div>
        <SearchInput
          label="Поиск документов"
          value={q}
          placeholder="Номер, контрагент или договор"
          onChange={(q) => patch({ q })}
        />
        <label className="sr-only" htmlFor="document-kind">
          Вид документа
        </label>
        <select id="document-kind" value={kind} onChange={(e) => patch({ kind: e.target.value })}>
          <option value="all">Все виды</option>
          <option value="money">Движение денег</option>
          {Object.entries(kinds).map(([id, k]) => (
            <option key={id} value={id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="list-caption">
        <span>{rows.length} документов</span>
        {(q || kind !== 'all' || status !== 'all') && (
          <button
            className="text-link"
            onClick={() => patch({ q: null, kind: null, status: null })}
          >
            Сбросить фильтры
          </button>
        )}
      </div>
      <section className="journal" aria-label="Журнал документов">
        {rows.length ? (
          <DocumentList documents={rows} />
        ) : (
          <Empty
            title="Документы не найдены"
            text="Измените фильтры или финансовый период."
            action={
              <Button onClick={() => patch({ q: null, kind: null, status: null })}>
                Сбросить фильтры
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}

export function DocumentPage() {
  const { id } = useParams();
  const { data, org, href, last } = useDesk();
  const d = data.documents.find((d) => d.id === id && d.org === org.id);
  if (!d)
    return (
      <Empty
        title="Документ недоступен"
        text="Он не найден в выбранной организации. Данные других организаций не отображаются."
        action={
          <Link className="button" to={href('/documents')}>
            К документам
          </Link>
        }
      />
    );
  const c = data.contracts.find((c) => c.id === d.contract)!;
  const p = data.counterparties.find((p) => p.id === c.party)!;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Контрагенты', to: last('/counterparties') },
          { label: p.name, to: href(`/counterparties/${p.id}`) },
          { label: c.number, to: href(`/contracts/${c.id}`) },
          { label: d.number },
        ]}
      />
      <PageHeading
        title={kinds[d.kind].label}
        description={`${d.number} · ${p.name}`}
        financial={false}
      />
      <article className="full-document">
        <DocumentDetails document={d} full />
      </article>
    </>
  );
}
