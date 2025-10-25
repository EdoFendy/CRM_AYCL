import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';

interface Company {
  id: string;
  ragione_sociale: string;
  website?: string;
  industry?: string;
}

interface Contact {
  id: string;
  full_name: string;
  email?: string;
  company_name?: string;
}

export function ClientSelector() {
  const { token } = useAuth();
  const { selectedClient, selectClient, clearClient } = useSelectedClient();
  const [searchType, setSearchType] = useState<'company' | 'contact'>('company');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const companiesQuery = useQuery({
    queryKey: ['companies', searchTerm],
    queryFn: () =>
      apiClient<{ data: Company[] }>('companies', {
        token,
        searchParams: { search: searchTerm, limit: 10 }
      }),
    enabled: Boolean(token) && searchType === 'company' && searchTerm.length > 1,
    select: (res) => res.data ?? []
  });

  const contactsQuery = useQuery({
    queryKey: ['contacts', searchTerm],
    queryFn: () =>
      apiClient<{ data: Contact[] }>('contacts', {
        token,
        searchParams: { search: searchTerm, limit: 10 }
      }),
    enabled: Boolean(token) && searchType === 'contact' && searchTerm.length > 1,
    select: (res) => res.data ?? []
  });

  const results = searchType === 'company' ? companiesQuery.data : contactsQuery.data;
  const isLoading = searchType === 'company' ? companiesQuery.isLoading : contactsQuery.isLoading;

  const handleSelectCompany = (company: Company) => {
    selectClient({ type: 'company', data: company });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectContact = (contact: Contact) => {
    selectClient({ type: 'contact', data: contact });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const getClientDisplay = () => {
    if (!selectedClient) return null;
    
    if (selectedClient.type === 'company') {
      return (
        <div className="selected-client-card">
          <div className="selected-client-icon">🏢</div>
          <div className="selected-client-info">
            <div className="selected-client-label">Cliente Selezionato</div>
            <div className="selected-client-name">{selectedClient.data.ragione_sociale}</div>
            {selectedClient.data.industry && (
              <div className="selected-client-meta">{selectedClient.data.industry}</div>
            )}
          </div>
          <button onClick={clearClient} className="clear-client-button" title="Rimuovi cliente">
            ×
          </button>
        </div>
      );
    }

    return (
      <div className="selected-client-card">
        <div className="selected-client-icon">👤</div>
        <div className="selected-client-info">
          <div className="selected-client-label">Cliente Selezionato</div>
          <div className="selected-client-name">{selectedClient.data.full_name}</div>
          {selectedClient.data.email && (
            <div className="selected-client-meta">{selectedClient.data.email}</div>
          )}
        </div>
        <button onClick={clearClient} className="clear-client-button" title="Rimuovi cliente">
          ×
        </button>
      </div>
    );
  };

  if (selectedClient) {
    return getClientDisplay();
  }

  return (
    <div className="client-selector">
      <div className="client-selector-header">
        <h3 className="client-selector-title">👤 Seleziona Cliente</h3>
        <p className="client-selector-description">
          Seleziona un cliente per iniziare a creare carrelli, preventivi e contratti
        </p>
      </div>

      <div className="client-selector-tabs">
        <button
          onClick={() => setSearchType('company')}
          className={`selector-tab ${searchType === 'company' ? 'active' : ''}`}
        >
          🏢 Azienda
        </button>
        <button
          onClick={() => setSearchType('contact')}
          className={`selector-tab ${searchType === 'contact' ? 'active' : ''}`}
        >
          👤 Contatto
        </button>
      </div>

      <div className="client-selector-search">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={
            searchType === 'company'
              ? 'Cerca azienda per nome...'
              : 'Cerca contatto per nome o email...'
          }
          className="search-input"
        />

        {showDropdown && searchTerm.length > 1 && (
          <div className="search-dropdown">
            {isLoading ? (
              <div className="dropdown-loading">
                <div className="spinner-sm" />
                <span>Ricerca in corso...</span>
              </div>
            ) : results && results.length > 0 ? (
              <div className="dropdown-results">
                {searchType === 'company'
                  ? (results as Company[]).map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className="dropdown-item"
                      >
                        <div className="dropdown-item-icon">🏢</div>
                        <div className="dropdown-item-info">
                          <div className="dropdown-item-name">{company.ragione_sociale}</div>
                          {company.industry && (
                            <div className="dropdown-item-meta">{company.industry}</div>
                          )}
                        </div>
                      </button>
                    ))
                  : (results as Contact[]).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="dropdown-item"
                      >
                        <div className="dropdown-item-icon">👤</div>
                        <div className="dropdown-item-info">
                          <div className="dropdown-item-name">{contact.full_name}</div>
                          {contact.email && (
                            <div className="dropdown-item-meta">{contact.email}</div>
                          )}
                        </div>
                      </button>
                    ))}
              </div>
            ) : (
              <div className="dropdown-empty">
                <p>Nessun risultato trovato</p>
                <p className="text-sm text-slate-500">
                  Prova con un termine di ricerca diverso
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="client-selector-hint">
        💡 <strong>Suggerimento:</strong> Seleziona un cliente prima di procedere con le operazioni
      </div>
    </div>
  );
}

