import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { defaultMessages, MessageDictionary } from './messages';

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: keyof MessageDictionary | string, options?: { defaultValue?: string }) => string;
  notify: (key: keyof MessageDictionary | string) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'it',
  setLocale: () => undefined,
  t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  notify: () => undefined,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('it');
  const [messages, setMessages] = useState<Record<string, string>>(defaultMessages[locale] ?? {});

  const changeLocale = useCallback((nextLocale: string) => {
    setLocale(nextLocale);
    setMessages(defaultMessages[nextLocale] ?? {});
  }, []);

  const translate = useCallback(
    (key: string, options?: { defaultValue?: string }) => {
      return messages[key] ?? options?.defaultValue ?? key;
    },
    [messages]
  );

  const notify = useCallback(
    (key: string) => {
      const message = translate(key, { defaultValue: key });
      // TODO: Replace with toast/notification system integrated with UI design
      console.info(`[i18n-notify] ${message}`);
      window.dispatchEvent(new CustomEvent('aycl-notify', { detail: { message } }));
    },
    [translate]
  );

  const value = useMemo(
    () => ({ locale, setLocale: changeLocale, t: translate, notify }),
    [locale, changeLocale, translate, notify]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
