import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useI18n } from '@i18n/I18nContext';
import { apiClient } from '@utils/apiClient';

interface ContractResponse {
  id: string;
  status: string;
  data_entry_url?: string;
  signature_url?: string;
}

const STEPS = ['create', 'send', 'dataEntry', 'signature', 'monitor'] as const;

type Step = typeof STEPS[number];

export default function StartKitPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<Step>('create');
  const [contractId, setContractId] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (message: string) => setLog((prev) => [...prev, message]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<ContractResponse>('contracts', {
        method: 'POST',
        token,
        body: {
          company_id: 'TODO',
          offer_id: null,
        },
      }),
    onSuccess: (data) => {
      setContractId(data.id);
      appendLog(`Creato contratto ${data.id}`);
      setCurrentStep('send');
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiClient<ContractResponse>(`contracts/${contractId}/send`, {
        method: 'POST',
        token,
      }),
    onSuccess: (data) => {
      appendLog(`Contratto inviato (${data.status})`);
      setCurrentStep('dataEntry');
    },
  });

  const dataEntryMutation = useMutation({
    mutationFn: () =>
      apiClient<{ url: string }>(`contracts/${contractId}/data-entry-link`, {
        method: 'POST',
        token,
      }),
    onSuccess: (data) => {
      appendLog(`Link compilazione: ${data.url}`);
      setCurrentStep('signature');
    },
  });

  const signatureMutation = useMutation({
    mutationFn: () =>
      apiClient<{ url: string }>(`contracts/${contractId}/request-signature`, {
        method: 'POST',
        token,
      }),
    onSuccess: (data) => {
      appendLog(`Richiesta firma inviata: ${data.url}`);
      setCurrentStep('monitor');
    },
  });

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">{t('startKit.title')}</h2>
      <p className="text-sm text-slate-600">{t('startKit.missingTemplate')}</p>

      <div className="grid gap-4 md:grid-cols-5">
        {STEPS.map((step) => (
          <div
            key={step}
            className={`rounded-lg border p-4 text-center text-sm ${
              currentStep === step
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {t(`startKit.step.${step}`)}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createMutation.isPending || Boolean(contractId)}
          onClick={() => createMutation.mutate()}
        >
          {t('startKit.step.create')}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!contractId || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
        >
          {t('startKit.step.send')}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!contractId || dataEntryMutation.isPending}
          onClick={() => dataEntryMutation.mutate()}
        >
          {t('startKit.step.dataEntry')}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!contractId || signatureMutation.isPending}
          onClick={() => signatureMutation.mutate()}
        >
          {t('startKit.step.signature')}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('startKit.timeline')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {log.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
