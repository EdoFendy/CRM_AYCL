import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { FiltersToolbar } from '../components/forms/FiltersToolbar';
import { usePersistentFilters } from '../hooks/usePersistentFilters';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';

interface Seller {
  id: string;
  email: string;
  full_name: string;
  referral_code?: string | null;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_id: string;
  company_name?: string;
  owner_id: string | null;
  owner_name?: string | null;
}

interface Company {
  id: string;
  ragione_sociale: string;
  owner_id: string | null;
  owner_name?: string | null;
}

export default function SellerAssignmentsPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { filters, setFilters, resetFilters } = usePersistentFilters({ 
    seller: '', 
    type: 'contacts',
    search: '' 
  });
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningType, setAssigningType] = useState<'contacts' | 'companies'>('contacts');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('');

  // Fetch sellers
  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: () =>
      apiClient<{ data: Seller[] }>('users', {
        token,
        searchParams: { role: 'seller' },
      }),
  });

  // Fetch contacts
  const contactsQuery = useQuery({
    queryKey: ['contacts', 'assignments'],
    queryFn: () =>
      apiClient<{ data: Contact[] }>('contacts', {
        token,
      }),
    enabled: filters.type === 'contacts' || filters.type === '',
  });

  // Fetch companies
  const companiesQuery = useQuery({
    queryKey: ['companies', 'assignments'],
    queryFn: () =>
      apiClient<{ data: Company[] }>('companies', {
        token,
      }),
    enabled: filters.type === 'companies',
  });

  // Batch assign mutation for contacts
  const assignContactsMutation = useMutation({
    mutationFn: async ({ sellerId, contactIds }: { sellerId: string; contactIds: string[] }) => {
      const promises = contactIds.map(contactId =>
        apiClient(`contacts/${contactId}`, {
          token,
          method: 'PATCH',
          body: { owner_id: sellerId },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Contatti assegnati con successo!');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowAssignModal(false);
      setSelectedIds([]);
      setSelectedSeller('');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'assegnazione dei contatti');
    },
  });

  // Batch assign mutation for companies
  const assignCompaniesMutation = useMutation({
    mutationFn: async ({ sellerId, companyIds }: { sellerId: string; companyIds: string[] }) => {
      const promises = companyIds.map(companyId =>
        apiClient(`companies/${companyId}`, {
          token,
          method: 'PATCH',
          body: { owner_id: sellerId },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Aziende assegnate con successo!');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowAssignModal(false);
      setSelectedIds([]);
      setSelectedSeller('');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nell\'assegnazione delle aziende');
    },
  });

  // Bulk remove assignment
  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ type, ids }: { type: 'contacts' | 'companies'; ids: string[] }) => {
      const promises = ids.map(id =>
        apiClient(`${type}/${id}`, {
          token,
          method: 'PATCH',
          body: { owner_id: null },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Assegnazioni rimosse con successo!');
      queryClient.invalidateQueries({ queryKey: ['contacts', 'companies'] });
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Errore nella rimozione delle assegnazioni');
    },
  });

  const sellers = sellersQuery.data?.data ?? [];
  const contacts = contactsQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];

  // Filter by seller if selected
  const filteredContacts = filters.seller
    ? contacts.filter(c => c.owner_id === filters.seller)
    : contacts;

  const filteredCompanies = filters.seller
    ? companies.filter(c => c.owner_id === filters.seller)
    : companies;

  // Filter by search term
  const searchFilter = (item: Contact | Company) => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    if ('first_name' in item) {
      const contact = item as Contact;
      return (
        contact.first_name.toLowerCase().includes(searchLower) ||
        contact.last_name.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.company_name?.toLowerCase().includes(searchLower)
      );
    } else {
      const company = item as Company;
      return company.ragione_sociale.toLowerCase().includes(searchLower);
    }
  };

  const displayContacts = filteredContacts.filter(searchFilter);
  const displayCompanies = filteredCompanies.filter(searchFilter);

  const handleBulkAssign = () => {
    if (selectedIds.length === 0) {
      toast.error('Seleziona almeno un elemento');
      return;
    }
    if (!selectedSeller) {
      toast.error('Seleziona un seller');
      return;
    }
    setShowAssignModal(true);
  };

  const handleConfirmAssign = () => {
    if (assigningType === 'contacts') {
      assignContactsMutation.mutate({ sellerId: selectedSeller, contactIds: selectedIds });
    } else {
      assignCompaniesMutation.mutate({ sellerId: selectedSeller, companyIds: selectedIds });
    }
  };

  const handleBulkRemove = () => {
    if (selectedIds.length === 0) {
      toast.error('Seleziona almeno un elemento');
      return;
    }
    if (confirm(`Rimuovere l'assegnazione da ${selectedIds.length} elementi?`)) {
      removeAssignmentMutation.mutate({ 
        type: filters.type === 'companies' ? 'companies' : 'contacts', 
        ids: selectedIds 
      });
    }
  };

  const getSellerName = (sellerId: string | null) => {
    if (!sellerId) return 'Non assegnato';
    const seller = sellers.find(s => s.id === sellerId);
    return seller?.full_name || seller?.email || 'Sconosciuto';
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assegnazione Seller</h1>
          <p className="text-slate-600">Gestisci l'assegnazione di contatti e aziende ai seller</p>
        </div>
      </div>

      {/* Filters */}
      <FiltersToolbar>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.type ?? 'contacts'}
          onChange={(event) => setFilters({ type: event.target.value as 'contacts' | 'companies' })}
        >
          <option value="contacts">Contatti</option>
          <option value="companies">Aziende</option>
        </select>

        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={filters.seller ?? ''}
          onChange={(event) => setFilters({ seller: event.target.value })}
        >
          <option value="">Tutti i Seller</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.full_name || seller.email}
            </option>
          ))}
        </select>

        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Cerca..."
          value={filters.search ?? ''}
          onChange={(event) => setFilters({ search: event.target.value })}
        />

        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={handleBulkAssign}
          disabled={selectedIds.length === 0}
        >
          Assegna ({selectedIds.length})
        </button>

        <button
          type="button"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          onClick={handleBulkRemove}
          disabled={selectedIds.length === 0}
        >
          Rimuovi Assegnazione ({selectedIds.length})
        </button>

        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          onClick={resetFilters}
        >
          Reset
        </button>
      </FiltersToolbar>

      {/* Contacts Table */}
      {filters.type === 'contacts' || filters.type === '' ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Contatti ({displayContacts.length})
            </h2>
          </div>
          <DataTable
            data={displayContacts}
            columns={[
              {
                id: 'select',
                header: '',
                cell: (contact: Contact) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(contact.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, contact.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== contact.id));
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                ),
              },
              {
                id: 'name',
                header: 'Nome',
                cell: (contact: Contact) => (
                  <div>
                    <div className="font-medium text-slate-900">
                      {contact.first_name} {contact.last_name}
                    </div>
                    {contact.email && (
                      <div className="text-sm text-slate-500">{contact.email}</div>
                    )}
                  </div>
                ),
              },
              {
                id: 'company',
                header: 'Azienda',
                cell: (contact: Contact) => (
                  <div className="text-slate-600">{contact.company_name || '—'}</div>
                ),
              },
              {
                id: 'owner',
                header: 'Assegnato a',
                cell: (contact: Contact) => (
                  <div className="font-medium text-slate-900">
                    {getSellerName(contact.owner_id)}
                  </div>
                ),
              },
            ]}
            enableSelectAll
            onSelectAll={(checked) => {
              if (checked) {
                setSelectedIds(displayContacts.map(c => c.id));
              } else {
                setSelectedIds([]);
              }
            }}
          />
        </div>
      ) : null}

      {/* Companies Table */}
      {filters.type === 'companies' ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Aziende ({displayCompanies.length})
            </h2>
          </div>
          <DataTable
            data={displayCompanies}
            columns={[
              {
                id: 'select',
                header: '',
                cell: (company: Company) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(company.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, company.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== company.id));
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                ),
              },
              {
                id: 'name',
                header: 'Ragione Sociale',
                cell: (company: Company) => (
                  <div className="font-medium text-slate-900">{company.ragione_sociale}</div>
                ),
              },
              {
                id: 'owner',
                header: 'Assegnato a',
                cell: (company: Company) => (
                  <div className="font-medium text-slate-900">
                    {getSellerName(company.owner_id)}
                  </div>
                ),
              },
            ]}
            enableSelectAll
            onSelectAll={(checked) => {
              if (checked) {
                setSelectedIds(displayCompanies.map(c => c.id));
              } else {
                setSelectedIds([]);
              }
            }}
          />
        </div>
      ) : null}

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedSeller('');
        }}
        title={`Assegna ${assigningType === 'contacts' ? 'Contatti' : 'Aziende'} a Seller`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Seleziona Seller
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <option value="">Seleziona un seller</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.full_name || seller.email}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-slate-600">
            Sei sicuro di voler assegnare <strong>{selectedIds.length}</strong>{' '}
            {assigningType === 'contacts' ? 'contatti' : 'aziende'} al seller selezionato?
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              onClick={() => {
                setShowAssignModal(false);
                setSelectedSeller('');
              }}
            >
              Annulla
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={handleConfirmAssign}
              disabled={!selectedSeller || (assignContactsMutation.isPending || assignCompaniesMutation.isPending)}
            >
              {assignContactsMutation.isPending || assignCompaniesMutation.isPending
                ? 'Assegnazione...'
                : 'Conferma Assegnazione'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

