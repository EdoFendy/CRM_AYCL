import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useCursorPagination() {
  const [searchParams, setSearchParams] = useSearchParams();
  const limit = Number(searchParams.get('limit') ?? 25);
  const cursor = searchParams.get('cursor') ?? undefined;

  const update = useCallback(
    (next: { cursor?: string | null; limit?: number }) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (typeof next.limit === 'number') {
          params.set('limit', String(next.limit));
        }
        if (next.cursor) {
          params.set('cursor', next.cursor);
        } else {
          params.delete('cursor');
        }
        return params;
      });
    },
    [setSearchParams]
  );

  return useMemo(() => ({ limit, cursor, update }), [cursor, limit, update]);
}
