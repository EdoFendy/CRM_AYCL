import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { apiClient } from '@lib/apiClient';
import { useSelectedClient } from '@context/SelectedClientContext';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  company_id: string;
  company_name?: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
  website: string | null;
  geo: string | null;
  industry: string | null;
  revenue_range: string | null;
}

export default function PortfolioPage() {
  const { token, user } = useAuth();
  const { setSelectedClient } = useSelectedClient();

  // Fetch contacts assigned to current seller
  const contactsQuery = useQuery({
    queryKey: ['contacts', 'my-portfolio'],
    queryFn: () =>
      apiClient<{ data: Contact[] }>('contacts', {
        token,
        searchParams: { owner_id: user?.id },
      }),
    enabled: Boolean(token && user?.id),
    select: (res) => res.data ?? []
  });

  // Fetch companies assigned to current seller
  const companiesQuery = useQuery({
    queryKey: ['companies', 'my-portfolio'],
    queryFn: () =>
      apiClient<{ data: Company[] }>('companies', {
        token,
        searchParams: { owner_id: user?.id },
      }),
    enabled: Boolean(token && user?.id),
    select: (res) => res.data ?? []
  });

  const contacts = contactsQuery.data ?? [];
  const companies = companiesQuery.data ?? [];

  const handleSelectContact = (contact: Contact) => {
    setSelectedClient({
      type: 'contact',
      data: {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email || '',
        company: contact.company_name || '',
        phone: contact.phone || '',
        role: contact.role || ''
      }
    });
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedClient({
      type: 'company',
      data: {
        id: company.id,
        name: company.ragione_sociale,
        email: '',
        company: company.ragione_sociale,
        website: company.website || '',
        geo: company.geo || '',
        industry: company.industry || '',
        revenue_range: company.revenue_range || ''
      }
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Portfolio Clienti</h1>
        <p className="text-slate-600">
          Clienti e aziende assegnati a te ({contacts.length} contatti, {companies.length} aziende)
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
          <div className="text-sm text-slate-600">Contatti Assegnati</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-green-600">{companies.length}</div>
          <div className="text-sm text-slate-600">Aziende Assegnate</div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Contatti ({contacts.length})</h2>
        
        {contactsQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento contatti...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessun contatto assegnato</p>
            <p className="text-sm text-slate-400 mt-2">
              Contatta l'admin per l'assegnazione di contatti
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="font-medium text-slate-900 mb-1">
                  {contact.first_name} {contact.last_name}
                </div>
                {contact.role && (
                  <div className="text-sm text-slate-600 mb-2">{contact.role}</div>
                )}
                {contact.email && (
                  <div className="text-sm text-slate-500">{contact.email}</div>
                )}
                {contact.phone && (
                  <div className="text-sm text-slate-500">{contact.phone}</div>
                )}
                {contact.company_name && (
                  <div className="text-xs text-slate-400 mt-2">📍 {contact.company_name}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Companies */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Aziende ({companies.length})</h2>
        
        {companiesQuery.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Caricamento aziende...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Nessuna azienda assegnata</p>
            <p className="text-sm text-slate-400 mt-2">
              Contatta l'admin per l'assegnazione di aziende
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="font-medium text-slate-900 mb-2">
                  {company.ragione_sociale}
                </div>
                {company.industry && (
                  <div className="text-sm text-slate-600 mb-1">
                    🏭 {company.industry}
                  </div>
                )}
                {company.geo && (
                  <div className="text-sm text-slate-600 mb-1">
                    🌍 {company.geo}
                  </div>
                )}
                {company.revenue_range && (
                  <div className="text-sm text-slate-600 mb-1">
                    💰 {company.revenue_range}
                  </div>
                )}
                {company.website && (
                  <div className="text-xs text-blue-600 mt-2 truncate">
                    🔗 {company.website}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}