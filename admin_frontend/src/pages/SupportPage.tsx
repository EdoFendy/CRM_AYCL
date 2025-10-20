import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';
import { useAuth } from '@context/AuthContext';

const supportSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
});

type SupportValues = z.infer<typeof supportSchema>;

export default function SupportPage() {
  const { t, notify } = useI18n();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: { subject: '', message: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient('tickets', {
        method: 'POST',
        body: {
          subject: values.subject,
          body: values.message,
          requester: 'support@admin',
        },
        token,
      });
      notify('support.sent');
      navigate('/login');
    } catch (err: any) {
      setError(err.message ?? t('support.error'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{t('support.title')}</h1>
          <p className="text-sm text-slate-600">{t('support.description')}</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="subject">
              {t('support.subject')}
            </label>
            <input
              id="subject"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              {...form.register('subject')}
            />
            {form.formState.errors.subject && (
              <p className="text-xs text-red-600">{form.formState.errors.subject.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="message">
              {t('support.message')}
            </label>
            <textarea
              id="message"
              rows={5}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              {...form.register('message')}
            />
            {form.formState.errors.message && (
              <p className="text-xs text-red-600">{form.formState.errors.message.message}</p>
            )}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={() => navigate(-1)}
            >
              {t('forms.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('feedback.loading') : t('forms.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
