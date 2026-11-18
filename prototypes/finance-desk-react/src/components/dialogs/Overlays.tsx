import { useDesk } from '../../app/DeskProvider';
import { PrintPreview } from '../PrintPreview';
import { DocumentDialog } from './DocumentDialog';
import { PaymentDialog } from './PaymentDialog';
import { NewThreadDialog } from './NewThreadDialog';
import { SearchDialog } from './SearchDialog';
import { AboutDialog } from './AboutDialog';

export function OverlaysHost({
  search,
  closeSearch,
  about,
  closeAbout,
}: {
  search: boolean;
  closeSearch: () => void;
  about: boolean;
  closeAbout: () => void;
}) {
  const { mode, params, org } = useDesk();
  const showForm = mode === 'ready' && !params.has('print');
  return (
    <>
      {showForm && !params.has('pay') && !params.has('new') && <DocumentDialog key={org.id} />}
      {showForm && params.has('pay') && <PaymentDialog key={org.id + '-' + params.get('pay')} />}
      {showForm && params.has('new') && <NewThreadDialog key={org.id + '-' + params.get('new')} />}
      {mode === 'ready' && params.has('print') && <PrintPreview />}
      <SearchDialog open={search} close={closeSearch} />
      <AboutDialog open={about} close={closeAbout} />
    </>
  );
}
