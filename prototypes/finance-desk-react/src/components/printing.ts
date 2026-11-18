import { useLocation, useNavigate } from 'react-router-dom';
import { useDesk } from '../app/DeskProvider';

export function usePrintPreview() {
  const { params } = useDesk();
  const location = useLocation();
  const navigate = useNavigate();
  return (type: 'document' | 'trial', id = '') => {
    const next = new URLSearchParams(params);
    next.set('print', type + (id ? ':' + id : ''));
    navigate(location.pathname + '?' + next, {
      state: { ...location.state, printPreview: true },
    });
  };
}
