import React, { useState } from 'react';
import { useDesk } from '../../app/DeskProvider';
import { person } from '../../data/model';
import { addThread } from '../../data/repository';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Button } from '../ui/primitives';

export function NewThreadDialog() {
  const { data, setData, org, role, params, patch, go } = useDesk();
  const requested = params.get('new');
  const choices = data.contracts.filter((c) => c.org === org.id);
  const [contract, setContract] = useState(
    requested === 'choose'
      ? choices[0]?.id || ''
      : choices.some((c) => c.id === requested)
        ? requested || ''
        : '',
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [assignee, setAssignee] = useState('Анна Сергеева');
  const [error, setError] = useState('');
  const close = () => patch({ new: null });
  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Заполните тему и сообщение.');
      return;
    }
    if (!choices.some((c) => c.id === contract)) {
      setError('Выберите договор этой организации.');
      return;
    }
    const id = 'thread-' + crypto.randomUUID();
    setData((prev) =>
      addThread(prev, {
        id,
        org: org.id,
        contract,
        title: title.trim(),
        person: person(role),
        assignee: role === 'employee' ? person(role) : assignee,
        date: 'Сегодня',
        resolved: false,
        messages: [{ name: person(role), text: message.trim(), time: 'Только что' }],
      }),
    );
    go('/discussions', { thread: id });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="question-dialog">
        <span className="sheet-label">Обсуждение договора</span>
        <DialogTitle>Задать вопрос</DialogTitle>
        <DialogDescription className="sr-only">Новый вопрос по договору</DialogDescription>
        <form className="form-stack" onSubmit={submit}>
          <label className="field">
            Договор
            <select value={contract} onChange={(e) => setContract(e.target.value)}>
              <option value="" disabled>
                Выберите договор
              </option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {data.counterparties.find((p) => p.id === c.party)!.name} · {c.number}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Тема
            <input
              id="question-title"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно выяснить?"
              required
            />
          </label>
          {role === 'director' && (
            <label className="field">
              Ответственный
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option>Анна Сергеева</option>
                <option>Дмитрий Орлов</option>
              </select>
            </label>
          )}
          <label className="field">
            Сообщение
            <textarea
              id="question-message"
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Добавьте контекст вопроса"
              required
            />
          </label>
          <p className="form-error" role="alert">
            {error}
          </p>
          <div className="form-actions">
            <Button onClick={close}>Отмена</Button>
            <Button type="submit" variant="primary">
              Создать обсуждение
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
