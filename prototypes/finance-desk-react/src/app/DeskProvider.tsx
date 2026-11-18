import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { DataMode, DemoData, Organization, Role } from '../data/model';
import { readDemo, saveDemo } from '../data/repository';
import { normalizePeriod } from '../data/model';
import { readStringRecord, writeSession } from '../lib/session';

type Values = Record<string, string | null | undefined>;
interface Desk {
  data: DemoData;
  setData: React.Dispatch<React.SetStateAction<DemoData>>;
  org: Organization;
  role: Role;
  period: string;
  mode: DataMode;
  params: URLSearchParams;
  patch: (values: Values, replace?: boolean) => void;
  href: (path: string, values?: Values) => string;
  go: (path: string, values?: Values) => void;
  showDocument: (id: string) => void;
  closeDocument: () => void;
  openPayment: (id: string) => void;
  notice: string;
  notify: (message: string) => void;
  last: (path: string) => string;
  expanded: string[];
  setExpanded: React.Dispatch<React.SetStateAction<string[]>>;
  draftPayments: React.RefObject<Record<string, Record<string, string>>>;
}
const Context = createContext<Desk | null>(null);
const bases = ['/', '/counterparties', '/documents', '/discussions', '/reports'];
export function DeskProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(readDemo);
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const org = data.organizations.find((o) => o.id === params.get('org')) || data.organizations[0];
  const role: Role = params.get('role') === 'employee' ? 'employee' : 'director';
  const period = normalizePeriod(params.get('period'));
  const mode = (
    ['loading', 'error', 'partial'].includes(params.get('scenario') || '')
      ? params.get('scenario')
      : 'ready'
  ) as DataMode;
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useRef(readStringRecord('fd-react-navigation'));
  const scrollPositions = useRef(new Map<string, number>());
  const docTrigger = useRef<HTMLElement | null>(null);
  const draftPayments = useRef<Record<string, Record<string, string>>>({});
  const common = () => ({
    org: org.id,
    role,
    period,
    ...(mode === 'ready' ? {} : { scenario: mode }),
  });
  const href = (path: string, values: Values = {}) => {
    const search = new URLSearchParams({ ...common() });
    for (const [k, v] of Object.entries(values)) v == null ? search.delete(k) : search.set(k, v);
    return path + '?' + search.toString();
  };
  const patch = (values: Values, replace = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values))
      v == null || v === '' ? next.delete(k) : next.set(k, v);
    navigate(location.pathname + '?' + next.toString(), {
      replace,
      state: location.state,
    });
  };
  const go = (path: string, values: Values = {}) =>
    navigate(href(path, values), { state: { insideDesk: true } });
  const showDocument = (id: string) => {
    docTrigger.current = document.activeElement as HTMLElement;
    const next = new URLSearchParams(params);
    next.delete('pay');
    next.set('doc', id);
    navigate(location.pathname + '?' + next, {
      state: { insideDesk: true, quickDocument: true },
    });
  };
  const closeDocument = () => {
    if (location.state?.quickDocument) navigate(-1);
    else patch({ doc: null });
    setTimeout(() => {
      if (docTrigger.current?.isConnected) docTrigger.current.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
    }, 50);
  };
  const openPayment = (id: string) => {
    const next = new URLSearchParams(params);
    next.delete('doc');
    next.set('pay', id);
    navigate(location.pathname + '?' + next, { state: { insideDesk: true } });
  };
  const last = (path: string) => {
    const saved = history.current[path];
    if (!saved) return href(path);
    const old = new URL(saved, window.location.origin);
    return href(
      path,
      Object.fromEntries(
        [...old.searchParams].filter(
          ([key]) => !['org', 'role', 'period', 'doc', 'pay', 'scenario'].includes(key),
        ),
      ),
    );
  };
  const notify = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  };
  useEffect(() => saveDemo(data), [data]);
  useEffect(() => {
    if (bases.includes(location.pathname)) {
      const clean = new URLSearchParams(params);
      clean.delete('doc');
      clean.delete('pay');
      history.current[location.pathname] = location.pathname + '?' + clean;
      writeSession('fd-react-navigation', history.current);
    }
  }, [location.pathname, location.search]);
  const scrollKey = (() => {
    const p = new URLSearchParams(params);
    p.delete('doc');
    p.delete('pay');
    return location.pathname + '?' + p;
  })();
  useLayoutEffect(() => {
    const target = scrollPositions.current.get(scrollKey) || 0;
    let settled = false;
    const record = () => {
      if (settled) scrollPositions.current.set(scrollKey, window.scrollY);
    };
    window.addEventListener('scroll', record, { passive: true });
    const timer = setTimeout(() => {
      window.scrollTo(0, target);
      settled = true;
    }, 170);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', record);
    };
  }, [scrollKey]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!params.has('doc') && !params.has('pay'))
        document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  const previousDoc = useRef<string | null>(null);
  useEffect(() => {
    const current = params.get('doc');
    if (previousDoc.current && !current)
      setTimeout(() => {
        if (docTrigger.current?.isConnected) docTrigger.current.focus({ preventScroll: true });
      }, 40);
    previousDoc.current = current;
  }, [params.get('doc')]);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  return (
    <Context.Provider
      value={{
        data,
        setData,
        org,
        role,
        period,
        mode,
        params,
        patch,
        href,
        go,
        showDocument,
        closeDocument,
        openPayment,
        notice,
        notify,
        last,
        expanded,
        setExpanded,
        draftPayments,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDesk() {
  const context = useContext(Context);
  if (!context) throw Error('Missing DeskProvider');
  return context;
}
