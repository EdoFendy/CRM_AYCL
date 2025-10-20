import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';

interface DocTemplate {
  id: string;
  name: string;
  category: string;
}

export default function AYCLKitPage() {
  const { token } = useAuth();
  const { t, notify } = useI18n();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [payload, setPayload] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['doc-templates'],
    queryFn: () => apiClient<{ data: DocTemplate[] }>('doc-templates', { token }),
  });

  const renderMutation = useMutation({
    mutationFn: () =>
      apiClient<{ file_url: string }>('docs/render', {
        method: 'POST',
        token,
        body: {
          template_id: selectedTemplate,
          data: payload ? JSON.parse(payload) : {},
        },
      }),
    onSuccess: (result) => {
      notify('ayclKit.generateDocument');
      if (result.file_url) {
        window.open(result.file_url, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: (error: any) => {
      notify(error.message);
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">{t('ayclKit.title')}</h2>
        <a
          className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          href="https://cdn.allyoucanleads.com/pitch-deck.pdf"
          target="_blank"
          rel="noreferrer"
        >
          {t('ayclKit.downloadPitch')}
        </a>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('ayclKit.generateDocument')}
        </h3>
        <div className="mt-4 space-y-4">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
          >
            <option value="">{t('ayclKit.selectTemplate')}</option>
            {templatesQuery.data?.data.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <textarea
            className="h-48 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            placeholder='{"company":"AYCL"}'
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
          />

          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedTemplate || renderMutation.isPending}
            onClick={() => renderMutation.mutate()}
          >
            {renderMutation.isPending ? t('feedback.loading') : t('forms.submit')}
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">{t('ayclKit.missingFileUpload')}</p>
      </div>
    </section>
  );
}
