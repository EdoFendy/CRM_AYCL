import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useDataScope } from '@hooks/useDataScope';
import { ScopeSwitch } from '@components/ui/ScopeSwitch';
import { DataTable } from '@components/data/DataTable';
import { StatusBadge } from '@components/ui/StatusBadge';
import { StatsCard } from '@components/data/StatsCard';
import type { Contact } from '@models/index';

export default function ContactsPage() {
  const { token, user } = useAuth();
  const { scope, setScope, getFilterParams, hasTeam } = useDataScope();
  const [searchTerm, setSearchTerm] = useState('');

  const contactsQuery = useQuery({
    queryKey: ['seller-contacts', scope],
    queryFn: async () => {
      const response = await apiClient<{ data: Contact[] }>('contacts', {
        token,
        searchParams: { ...getFilterParams(), limit: 1000 },
      });
      return response.data || [];
    },
    enabled: Boolean(token),
  });

  const contacts = contactsQuery.data ?? [];

  const filteredContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  const headers = scope === 'team'
    ? ['Nome', 'Email', 'Telefono', 'Ruolo', 'Owner', 'Data Creazione']
    : ['Nome', 'Email', 'Telefono', 'Ruolo', 'Data Creazione'];

  const rows = filteredContacts.map((contact) => {
    const isPersonal = contact.owner_id === user?.id;
    const baseRow = [
      <div key="name" className="flex items-center gap-2">
        {scope === 'team' && isPersonal && (
          <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" title="Tuo contatto" />
        )}
        <span className="font-medium">{`${contact.first_name} ${contact.last_name}`}</span>
      </div>,
      contact.email,
      contact.phone || '—',
      contact.role || '—',
    ];

    if (scope === 'team') {
      baseRow.push(
        <span key="owner" className="text-sm text-slate-600">
          {contact.owner_name || contact.owner_id?.substring(0, 8) || '—'}
        </span>
      );
    }

    baseRow.push(new Date(contact.created_at).toLocaleDateString('it-IT'));

    return baseRow;
  });

  return (
    <section className="space-y-6">
      {/* Header with Scope Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Contatti {scope === 'team' && '(Team)'}
          </h1>
          <p className="text-sm text-slate-600">
            {scope === 'personal' 
              ? 'Gestisci i tuoi contatti commerciali' 
              : 'Contatti del team'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasTeam && <ScopeSwitch scope={scope} onChange={setScope} />}
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition">
            + Nuovo Contatto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Totale Contatti"
          value={contacts.length}
          description={scope === 'team' ? 'Contatti del team' : 'I tuoi contatti'}
        />
        <StatsCard
          title="Nuovi questo mese"
          value={contacts.filter(c => {
            const created = new Date(c.created_at);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }).length}
          description="Aggiunti negli ultimi 30 giorni"
        />
        <StatsCard
          title="Con Email"
          value={contacts.filter(c => c.email).length}
          description="Contatti con email valida"
        />
      </div>

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Cerca per nome, email o telefono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Contacts Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            Lista Contatti ({filteredContacts.length})
          </h3>
          {scope === 'team' && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 mr-1" />
              Indica i tuoi contatti
            </p>
          )}
        </div>
        {contactsQuery.isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-sm text-slate-500">Caricamento contatti...</p>
          </div>
        ) : (
          <DataTable
            headers={headers}
            rows={rows}
            emptyMessage={searchTerm ? 'Nessun contatto trovato con i criteri di ricerca' : 'Nessun contatto disponibile'}
          />
        )}
      </div>

      {contactsQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Errore nel caricamento dei contatti
        </p>
      )}
    </section>
  );
}
