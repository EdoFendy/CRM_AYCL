import { useI18n } from '@i18n/I18nContext';

interface PaginationControlsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function PaginationControls({ onPrevious, onNext, hasPrevious, hasNext }: PaginationControlsProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between pt-4">
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onPrevious}
        disabled={!hasPrevious}
      >
        {t('pagination.previous')}
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onNext}
        disabled={!hasNext}
      >
        {t('pagination.next')}
      </button>
    </div>
  );
}
