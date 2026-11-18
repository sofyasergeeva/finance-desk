import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChatCircle,
  PaperPlaneTilt,
  Plus,
  ArrowCounterClockwise,
  LockSimple,
} from '@phosphor-icons/react';
import { useDesk } from '../app/DeskProvider';
import { initials, person, visibleThreads } from '../data/model';
import { replyToThread } from '../data/repository';
import { Button } from '../components/ui/primitives';
import { Empty, PageHeading } from '../components/common';
import { readStringRecord, writeSession } from '../lib/session';

const DRAFT_KEY = 'finance-desk-discussion-drafts-v1';
function readDrafts(): Record<string, string> {
  return readStringRecord(DRAFT_KEY, 2000);
}
export function Discussions() {
  const { data, setData, org, role, params, patch, href, go, notify } = useDesk();
  const [drafts, setDrafts] = useState(readDrafts);
  const [error, setError] = useState('');
  const [closePrompt, setClosePrompt] = useState(false);
  const all = visibleThreads(data, org.id, role);
  const filter = ['open', 'closed', 'all'].includes(params.get('filter') || '')
    ? params.get('filter')!
    : 'open';
  const selected = params.get('thread');
  const list = all.filter(
    (t) => filter === 'all' || (filter === 'open' ? !t.resolved : t.resolved),
  );
  const thread = selected ? all.find((t) => t.id === selected) : list[0];
  const contract = data.contracts.find((c) => c.id === thread?.contract);
  const party = data.counterparties.find((p) => p.id === contract?.party);
  const draftId = org.id + ':' + role + ':' + (thread?.id || '');
  const message = drafts[draftId] || '';
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousSelection = useRef<string | null>(null);
  const restoreStatusFocus = useRef(false);
  const setMessage = (value: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      if (value) next[draftId] = value;
      else delete next[draftId];
      return next;
    });
  useEffect(() => {
    writeSession(DRAFT_KEY, drafts);
  }, [drafts]);
  useEffect(() => {
    setError('');
    setClosePrompt(false);
  }, [draftId]);
  useEffect(() => {
    if (selected && thread) titleRef.current?.focus({ preventScroll: true });
    else if (previousSelection.current)
      document
        .querySelector<HTMLAnchorElement>(
          `[data-thread-id="${CSS.escape(previousSelection.current)}"]`,
        )
        ?.focus({ preventScroll: true });
    previousSelection.current = selected;
  }, [selected, org.id, role]);
  useEffect(() => {
    if (closePrompt)
      document.querySelector<HTMLButtonElement>('.close-question-prompt button')?.focus();
    else if (restoreStatusFocus.current) {
      document.querySelector<HTMLButtonElement>('.resolve-question')?.focus();
      restoreStatusFocus.current = false;
    }
  }, [closePrompt]);
  function reply(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!thread || thread.resolved) return;
    if (!message.trim()) {
      setError('Напишите ответ.');
      replyRef.current?.focus();
      return;
    }
    setData((prev) => replyToThread(prev, thread.id, org.id, role, person(role), message));
    setMessage('');
    setError('');
    setClosePrompt(false);
    notify('Ответ отправлен');
  }
  function resolve() {
    if (!thread) return;
    if (!thread.resolved && message.trim() && !closePrompt) {
      setClosePrompt(true);
      return;
    }
    if (closePrompt) restoreStatusFocus.current = true;
    setData((prev) => ({
      ...prev,
      threads: prev.threads.map((t) =>
        t.id === thread.id && t.org === org.id ? { ...t, resolved: !t.resolved } : t,
      ),
    }));
    if (!selected) patch({ thread: thread.id });
    setClosePrompt(false);
    notify(thread.resolved ? 'Вопрос открыт снова' : 'Вопрос закрыт');
  }
  return (
    <div className={`discussion-page ${selected ? 'is-thread-view' : ''}`}>
      <PageHeading title="Обсуждения" financial={false}>
        <Button
          variant="primary"
          aria-label="Задать вопрос"
          onClick={() => go('/discussions', { new: 'choose' })}
        >
          <Plus size={18} />
          <span className="question-action-label">Задать вопрос</span>
        </Button>
      </PageHeading>
      <div className={`discussion-layout ${selected ? 'has-selected-thread' : ''}`}>
        <section className="discussion-index" aria-label="Список обсуждений">
          <div className="discussion-toolbar">
            <div className="segmented" role="group" aria-label="Состояние вопросов">
              {[
                ['open', 'Открытые'],
                ['closed', 'Закрытые'],
                ['all', 'Все'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => patch({ filter: value, thread: null })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.length ? (
            list.map((t) => {
              const c = data.contracts.find((c) => c.id === t.contract)!;
              const p = data.counterparties.find((p) => p.id === c.party)!;
              const isSelected = thread?.id === t.id;
              return (
                <Link
                  key={t.id}
                  className={`discussion-link ${isSelected ? 'selected' : ''}`}
                  aria-current={isSelected ? 'true' : undefined}
                  data-thread-id={t.id}
                  to={href('/discussions', { filter, thread: t.id })}
                >
                  <span className="question-context">
                    {p.name}
                    <span>{c.number}</span>
                  </span>
                  <h2>{t.title}</h2>
                  <p className="discussion-preview">{t.messages.at(-1)?.text}</p>
                  <span className="discussion-link-footer">
                    <span>{t.assignee}</span>
                    <span>{t.messages.at(-1)?.time || t.date}</span>
                  </span>
                  {filter === 'all' && (
                    <span className={`status ${t.resolved ? 'posted' : 'question'}`}>
                      {t.resolved ? 'Закрыт' : 'Открыт'}
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <Empty
              title={filter === 'closed' ? 'Закрытых вопросов нет' : 'Вопросов нет'}
              text="Выберите другой фильтр или задайте вопрос по договору."
            />
          )}
        </section>
        <section className="conversation" aria-label="Выбранное обсуждение">
          {selected && !thread ? (
            <div className="conversation-unavailable">
              <LockSimple size={28} />
              <h2>Это обсуждение недоступно</h2>
              <p>Проверьте выбранную организацию или откройте назначенный вам вопрос.</p>
              <Button onClick={() => patch({ thread: null })}>К списку вопросов</Button>
            </div>
          ) : thread && contract && party ? (
            <>
              <button
                className="text-link conversation-back"
                onClick={() => patch({ thread: null })}
              >
                <ArrowLeft size={18} />К списку вопросов
              </button>
              <div className="conversation-heading">
                <div className="conversation-state">
                  <span className={`status ${thread.resolved ? 'posted' : 'question'}`}>
                    {thread.resolved ? 'Закрытый вопрос' : 'Открытый вопрос'}
                  </span>
                  {!closePrompt && (
                    <Button variant="ghost" className="resolve-question" onClick={resolve}>
                      {thread.resolved ? <ArrowCounterClockwise size={16} /> : <Check size={16} />}
                      {thread.resolved ? 'Открыть снова' : 'Закрыть вопрос'}
                    </Button>
                  )}
                </div>
                <h2 ref={titleRef} tabIndex={-1}>
                  {thread.title}
                </h2>
                <div className="conversation-meta">
                  <Link
                    className="conversation-contract"
                    to={href(`/contracts/${contract.id}`, {
                      tab: 'discussion',
                    })}
                  >
                    {party.name} · {contract.number}
                    <ArrowUpRight size={15} />
                  </Link>
                  <span>Ответственный: {thread.assignee}</span>
                </div>
              </div>
              {closePrompt && (
                <div className="close-question-prompt" role="alert">
                  <p>Ответ не отправлен. Закрыть вопрос и сохранить черновик?</p>
                  <div>
                    <Button
                      onClick={() => {
                        setClosePrompt(false);
                        replyRef.current?.focus();
                      }}
                    >
                      Продолжить ответ
                    </Button>
                    <Button onClick={resolve}>Закрыть вопрос</Button>
                  </div>
                </div>
              )}
              <div
                className="messages"
                role="log"
                aria-label="Сообщения обсуждения"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {thread.messages.map((m, i) => (
                  <article className="message" key={i}>
                    <span
                      className={`small-avatar ${m.name === person(role) ? 'self' : ''}`}
                      aria-hidden="true"
                    >
                      {initials(m.name)}
                    </span>
                    <div>
                      <div className="message-header">
                        <strong>{m.name}</strong>
                        <span>{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </article>
                ))}
              </div>
              {!thread.resolved ? (
                <form className="reply-form" onSubmit={reply}>
                  <label htmlFor="reply">Ответ</label>
                  <textarea
                    ref={replyRef}
                    id="reply"
                    name="reply"
                    autoComplete="off"
                    rows={2}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.ctrlKey || e.metaKey) &&
                        e.key === 'Enter' &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={2000}
                    placeholder="Написать ответ…"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'reply-error' : undefined}
                  />
                  <p id="reply-error" className="form-error" role="alert">
                    {error}
                  </p>
                  <div className="reply-actions">
                    <span className="draft-label">{message ? 'Черновик' : ''}</span>
                    <Button variant="primary" type="submit" title="Отправить ответ · Ctrl+Enter">
                      <PaperPlaneTilt size={17} />
                      Отправить
                    </Button>
                  </div>
                </form>
              ) : (
                message && (
                  <p className="retained-draft">
                    Неотправленный ответ сохранён. Он будет доступен после открытия вопроса.
                  </p>
                )
              )}
            </>
          ) : (
            <div className="conversation-placeholder">
              <ChatCircle size={30} />
              <h2>Выберите вопрос</h2>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
