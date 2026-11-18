import { useEffect, useState } from 'react';
import { useDesk } from '../../app/DeskProvider';
import { initialData } from '../../data/repository';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Button,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../ui/primitives';

export function AboutDialog({ open, close }: { open: boolean; close: () => void }) {
  const { mode, patch, setData, go, notify } = useDesk();
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="about-dialog">
        <DialogTitle>Демонстрационный режим</DialogTitle>
        <DialogDescription>
          Все компании, документы и суммы учебные. Подключения к 1С и банку нет.
        </DialogDescription>
        <div className="about-body">
          <p>
            Изменения сохраняются в текущей вкладке. Переключатель ролей показывает варианты
            интерфейса.
          </p>
          <Collapsible className="demo-settings">
            <CollapsibleTrigger className="disclosure-trigger">
              Параметры демонстрации
            </CollapsibleTrigger>
            <CollapsibleContent>
              <label className="field">
                Состояние данных
                <select
                  id="data-scenario"
                  value={mode}
                  onChange={(e) => {
                    patch({
                      scenario: e.target.value === 'ready' ? null : e.target.value,
                    });
                    close();
                  }}
                >
                  <option value="ready">Данные доступны</option>
                  <option value="loading">Загрузка</option>
                  <option value="error">Ошибка получения данных</option>
                  <option value="partial">Неполная выборка</option>
                </select>
              </label>
              {confirmReset ? (
                <div className="demo-reset-confirm" role="alert">
                  <p>
                    Восстановить исходные оплаты и обсуждения? Изменения этой вкладки будут удалены.
                  </p>
                  <div>
                    <Button onClick={() => setConfirmReset(false)}>Отмена</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setData(initialData());
                        close();
                        go('/');
                        notify('Исходные данные восстановлены');
                      }}
                    >
                      Восстановить
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmReset(true)}>
                  Восстановить исходные данные
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
