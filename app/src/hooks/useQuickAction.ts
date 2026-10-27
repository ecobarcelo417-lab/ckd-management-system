import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useQuickAction = (handler: () => void, enabled: boolean = true) => {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (!enabled || params.get('action') !== 'new') return;
    handler();
    const next = new URLSearchParams(params);
    next.delete('action');
    setParams(next, { replace: true });

  }, [params, enabled]);
};
