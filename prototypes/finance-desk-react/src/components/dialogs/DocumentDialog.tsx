import { useRef } from 'react';
import { useDesk } from '../../app/DeskProvider';
import { kinds } from '../../data/model';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/primitives';
import { DocumentDetails } from '../DocumentDetails';

export function DocumentDialog() {
  const { data, org, params, closeDocument } = useDesk();
  const id = params.get('doc');
  const found = data.documents.find((d) => d.id === id && d.org === org.id);
  const previous = useRef(found);
  if (id) previous.current = found;
  const d = id ? found : previous.current;
  return (
    <Dialog
      open={!!id}
      onOpenChange={(open) => {
        if (!open) closeDocument();
      }}
    >
      <DialogContent className="sheet" aria-describedby="document-description">
        <DialogTitle>
          {d ? `${kinds[d.kind].label} ${d.number}` : 'Документ недоступен'}
        </DialogTitle>
        <DialogDescription id="document-description">
          {d
            ? 'Сумма, договор и проводки документа.'
            : 'Документ не найден в выбранной организации.'}
        </DialogDescription>
        {d && <DocumentDetails document={d} />}
      </DialogContent>
    </Dialog>
  );
}
