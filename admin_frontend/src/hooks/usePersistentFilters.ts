import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function usePersistentFilters<T extends Record<string, string | number | undefined>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const entries = Object.entries(defaults).map(([key, defaultValue]) => {
      const value = searchParams.get(key);
      return [key, value ?? (defaultValue !== undefined ? String(defaultValue) : undefined)];
    });
    return Object.fromEntries(entries) as Record<string, string | undefined>;
  }, [defaults, searchParams]);

  const setFilters = useCallback(
    (next: Partial<Record<keyof T, string | undefined>>) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        Object.entries(next).forEach(([key, value]) => {
          if (value && value.length) {
            params.set(key, value);
          } else {
            params.delete(key);
          }
        });
        return params;
      });
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, setFilters, resetFilters };
}
