import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import {
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  IntersectThree,
  MagnifyingGlass,
  WarningCircle,
  Buildings,
} from '@phosphor-icons/react';
import { DeskProvider, useDesk } from './DeskProvider';
import { person, initials, periodDocuments } from '../data/model';
import { Button } from '../components/ui/primitives';
import { DocumentList, Empty } from '../components/common';

const Discussions = lazy(() =>
  import('../pages/Discussions').then((m) => ({ default: m.Discussions })),
);
const Overview = lazy(() => import('../pages/Overview').then((m) => ({ default: m.Overview })));
const Reports = lazy(() => import('../pages/Reports').then((m) => ({ default: m.Reports })));
const Overlays = lazy(() =>
  import('../components/dialogs/Overlays').then((m) => ({ default: m.OverlaysHost })),
);
const Counterparties = lazy(() =>
  import('../pages/Counterparties').then((m) => ({
    default: m.Counterparties,
  })),
);
const PartyPage = lazy(() =>
  import('../pages/Counterparties').then((m) => ({ default: m.PartyPage })),
);
const ContractPage = lazy(() =>
  import('../pages/ContractWorkspace').then((m) => ({
    default: m.ContractPage,
  })),
);
const DealPage = lazy(() =>
  import('../pages/ContractWorkspace').then((m) => ({
    default: m.DealPage,
  })),
);
const Documents = lazy(() => import('../pages/Documents').then((m) => ({ default: m.Documents })));
const DocumentPage = lazy(() =>
  import('../pages/Documents').then((m) => ({ default: m.DocumentPage })),
);
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>Не удалось открыть интерфейс</h1>
        <p>Обновите страницу.</p>
        <Button onClick={() => window.location.reload()}>Обновить страницу</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function DataState() {
  const { mode, patch, data, org, period } = useDesk();
  if (mode === 'ready') return null;
  if (mode === 'loading')
    return (
      <section className="data-state" aria-busy="true">
        <h1 tabIndex={-1}>Загружаем финансовые данные</h1>
        <p role="status">Итоги пока не показаны.</p>
        <div className="skeleton-line" />
        <div className="skeleton-surface" />
        <Button onClick={() => patch({ scenario: null })}>
          Показать данные
          <ArrowRight size={18} />
        </Button>
      </section>
    );
  if (mode === 'error')
    return (
      <section className="data-state">
        <WarningCircle size={40} />
        <h1 tabIndex={-1}>Не удалось получить данные</h1>
        <p>Остатки и обороты не показаны.</p>
        <Button variant="primary" onClick={() => patch({ scenario: null })}>
          <ArrowClockwise size={18} />
          Повторить
        </Button>
      </section>
    );
  return (
    <section className="partial-state">
      <div className="data-warning" role="status">
        <WarningCircle size={24} />
        <div>
          <h1 tabIndex={-1}>Получена только часть документов</h1>
          <p>Итоги и выгрузка скрыты: по неполной выборке нельзя подтвердить остатки.</p>
        </div>
        <Button onClick={() => patch({ scenario: null })}>Повторить загрузку</Button>
      </div>
      <DocumentList documents={periodDocuments(data, org.id, period).slice(0, 3)} />
    </section>
  );
}
function Shell() {
  const { org, role, params, mode, patch, href, go, last, notice } = useDesk();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [search, setSearch] = useState(false);
  const [about, setAbout] = useState(false);
  const [overlaysLoaded, setOverlaysLoaded] = useState(false);
  const overlayRequested =
    search || about || ['doc', 'pay', 'new', 'print'].some((key) => params.has(key));
  useEffect(() => {
    if (overlayRequested) setOverlaysLoaded(true);
  }, [overlayRequested]);
  const nav = [
    ['/', role === 'director' ? 'Обзор' : 'Моя работа'],
    ['/counterparties', 'Контрагенты'],
    ['/documents', 'Документы'],
    ['/discussions', 'Обсуждения'],
    ...(role === 'director' ? [['/reports', 'Отчёты']] : []),
  ];
  const section =
    location.pathname.startsWith('/contracts') || location.pathname.startsWith('/deals')
      ? '/counterparties'
      : '/' + location.pathname.split('/')[1];
  const changeOrganization = (value: string) => {
    if (location.pathname === '/reports')
      patch({ org: value, doc: null, pay: null, print: null, ledgerDetail: null }, false);
    else
      go(
        section === '/'
          ? '/'
          : ['/counterparties', '/documents', '/discussions', '/reports'].includes(section)
            ? section
            : '/counterparties',
        { org: value },
      );
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k' &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        setSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const title = document.querySelector('main h1')?.textContent;
      document.title = `${title || 'Рабочее пространство'} · Finance Desk`;
    }, 200);
    return () => clearTimeout(timer);
  }, [location.pathname, role, mode]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <header className="app-header">
        <div className="topbar">
          <Link className="brand" to={href('/')} aria-label="Finance Desk, главная">
            <span className="brand-symbol">
              <IntersectThree size={26} weight="bold" />
            </span>
            <span>
              finance <span className="brand-light">desk</span>
            </span>
          </Link>
          <nav className="main-navigation" aria-label="Основные разделы">
            {nav.map(([path, label]) => (
              <Link
                key={path}
                to={last(path)}
                className={section === path ? 'active' : ''}
                aria-current={section === path ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="profile-controls">
            <button
              className="icon-button"
              onClick={() => setSearch(true)}
              title="Поиск · Ctrl+K"
              aria-label="Поиск по приложению"
            >
              <MagnifyingGlass size={21} />
            </button>
            <span className={`profile-avatar ${role}`} aria-hidden="true">
              {initials(person(role))}
            </span>
            <label className="role-control">
              <span>{person(role)}</span>
              <select
                aria-label="Демонстрационная роль"
                value={role}
                onChange={(e) => {
                  const next = e.target.value;
                  if (location.pathname === '/reports' && next === 'employee')
                    go('/', { role: next });
                  else
                    patch({
                      role: next,
                      doc: null,
                      pay: null,
                      new: null,
                      thread: null,
                    });
                }}
              >
                <option value="director">Руководитель</option>
                <option value="employee">Сотрудник</option>
              </select>
            </label>
          </div>
        </div>
        <div className="contextbar">
          <label className="organization-control">
            <Buildings size={19} />
            <span className="sr-only">Организация</span>
            <select
              aria-label="Организация"
              value={org.id}
              onChange={(e) => changeOrganization(e.target.value)}
            >
              <option value="kontur">Студия «Контур»</option>
              <option value="line">Бюро «Линия»</option>
            </select>
          </label>
          <div className="context-meta">
            <button className="demo-badge" onClick={() => setAbout(true)}>
              <span />
              Деморежим
            </button>
            <span>18 ноября 2026</span>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <LazyMotion features={domAnimation} strict>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={location.pathname + '-' + org.id + '-' + role}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.14 }}
            >
              {mode !== 'ready' ? (
                <DataState />
              ) : (
                <Suspense
                  fallback={
                    <div className="route-loading" role="status">
                      Загрузка раздела…
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/counterparties" element={<Counterparties />} />
                    <Route path="/counterparties/:id" element={<PartyPage />} />
                    <Route path="/contracts/:id" element={<ContractPage />} />
                    <Route path="/deals/:id" element={<DealPage />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/documents/:id" element={<DocumentPage />} />
                    <Route path="/discussions" element={<Discussions />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route
                      path="*"
                      element={
                        <Empty
                          title="Страница не найдена"
                          text="Проверьте адрес или откройте рабочий стол."
                          action={<Button onClick={() => go('/')}>На рабочий стол</Button>}
                        />
                      }
                    />
                  </Routes>
                </Suspense>
              )}
            </m.div>
          </AnimatePresence>
        </LazyMotion>
      </main>

      {(overlaysLoaded || overlayRequested) && (
        <Suspense
          fallback={
            <div className="sr-only" role="status">
              Открываем подробности…
            </div>
          }
        >
          <Overlays
            search={search}
            closeSearch={() => setSearch(false)}
            about={about}
            closeAbout={() => setAbout(false)}
          />
        </Suspense>
      )}
      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
        {notice && (
          <>
            <CheckCircle size={20} />
            {notice}
          </>
        )}
      </div>
    </div>
  );
}
export function App() {
  return (
    <ErrorBoundary>
      <DeskProvider>
        <Shell />
      </DeskProvider>
    </ErrorBoundary>
  );
}
