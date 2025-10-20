import { useI18n } from '@i18n/I18nContext';

export function LoadingScreen() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen items-center justify-center bg-muted text-primary">
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
        <p className="text-sm font-medium">{t('feedback.loading')}</p>
      </div>
    </div>
  );
}
