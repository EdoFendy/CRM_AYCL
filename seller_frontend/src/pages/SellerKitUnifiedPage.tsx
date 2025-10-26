import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@context/AuthContext';
import { useSelectedClient } from '@context/SelectedClientContext';
import { apiClient } from '@lib/apiClient';
import { toast } from 'sonner';
import { 
  User, Building2, Plus, X, Download, FileText, 
  Calculator, Package, Receipt, FileSignature, DollarSign,
  ChevronRight, AlertCircle
} from 'lucide-react';

// Import components
import { DriveTestCalculator } from '@components/kit/DriveTestCalculator';
import { BundleBuilder } from '@components/kit/BundleBuilder';
import { ProposalGenerator } from '@components/kit/ProposalGenerator';
import { QuoteGenerator } from '@components/kit/QuoteGenerator';
import { InvoiceManager } from '@components/kit/InvoiceManager';
import { ResourcesManager } from '@components/kit/ResourcesManager';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_name?: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
  website: string | null;
}

type ActiveSection = 'client-selector' | 'drive-test' | 'bundle' | 'proposal' | 'quote' | 'contract' | 'invoice' | 'resources';

export default function SellerKitUnifiedPage() {
  const { token, user } = useAuth();
  const { selectedClient, selectClient, clearClient } = useSelectedClient();
  const [activeSection, setActiveSection] = useState<ActiveSection>('client-selector');
  const [showAddClient, setShowAddClient] = useState(false);

  // Fetch contacts
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

  // Fetch companies
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
    selectClient({
      type: 'contact',
      data: {
        id: contact.id,
        full_name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email || '',
        company_name: contact.company_name || ''
      }
    });
    toast.success(`Cliente selezionato: ${contact.first_name} ${contact.last_name}`);
  };

  const handleSelectCompany = (company: Company) => {
    selectClient({
      type: 'company',
      data: {
        id: company.id,
        ragione_sociale: company.ragione_sociale,
        website: company.website || ''
      }
    });
    toast.success(`Azienda selezionata: ${company.ragione_sociale}`);
  };

  const sections = [
    {
      id: 'drive-test' as ActiveSection,
      icon: Calculator,
      title: 'Drive Test',
      description: 'Configura e genera link Drive Test',
      color: 'from-blue-500 to-blue-600',
      requiresClient: true
    },
    {
      id: 'bundle' as ActiveSection,
      icon: Package,
      title: 'Bundle',
      description: 'Crea bundle personalizzato',
      color: 'from-purple-500 to-purple-600',
      requiresClient: true
    },
    {
      id: 'proposal' as ActiveSection,
      icon: FileText,
      title: 'Proposta',
      description: 'Genera proposta commerciale',
      color: 'from-green-500 to-green-600',
      requiresClient: true
    },
    {
      id: 'quote' as ActiveSection,
      icon: Receipt,
      title: 'Preventivo',
      description: 'Crea preventivo dettagliato',
      color: 'from-orange-500 to-orange-600',
      requiresClient: true
    },
    {
      id: 'contract' as ActiveSection,
      icon: FileSignature,
      title: 'Contratto',
      description: 'Genera e invia contratto',
      color: 'from-indigo-500 to-indigo-600',
      requiresClient: true
    },
    {
      id: 'invoice' as ActiveSection,
      icon: DollarSign,
      title: 'Fattura',
      description: 'Gestisci fatture e pagamenti',
      color: 'from-pink-500 to-pink-600',
      requiresClient: false
    },
    {
      id: 'resources' as ActiveSection,
      icon: Download,
      title: 'Risorse',
      description: 'Pitch Deck e documenti',
      color: 'from-teal-500 to-teal-600',
      requiresClient: false
    }
  ];

  const renderToolContent = () => {
    switch (activeSection) {
      case 'drive-test':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Configura Drive Test</h2>
                <p className="text-slate-600">Crea un preventivo Drive Test personalizzato</p>
              </div>
            </div>
            <DriveTestCalculator />
          </div>
        );

      case 'bundle':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Crea Bundle</h2>
                <p className="text-slate-600">Costruisci un bundle personalizzato con sconti</p>
              </div>
            </div>
            <BundleBuilder />
          </div>
        );

      case 'proposal':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Genera Proposta</h2>
                <p className="text-slate-600">Crea una proposta commerciale professionale</p>
              </div>
            </div>
            <ProposalGenerator />
          </div>
        );

      case 'quote':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Crea Preventivo</h2>
                <p className="text-slate-600">Genera un preventivo dettagliato</p>
              </div>
            </div>
            <QuoteGenerator />
          </div>
        );

      case 'contract':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileSignature className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Genera Contratto</h2>
                <p className="text-slate-600">Crea e invia un contratto professionale</p>
              </div>
            </div>
            <div className="text-center py-12 text-slate-600">
              <FileSignature className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p>Generatore Contratti - Coming soon</p>
              <p className="text-sm mt-2">Questa funzionalità sarà disponibile a breve</p>
            </div>
          </div>
        );

      case 'invoice':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Gestisci Fatture</h2>
                <p className="text-slate-600">Carica prova pagamento e genera fatture</p>
              </div>
            </div>
            <InvoiceManager />
          </div>
        );

      case 'resources':
        return (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Risorse</h2>
                <p className="text-slate-600">Pitch Deck e materiali di marketing</p>
              </div>
            </div>
            <ResourcesManager />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">🎯 Seller Kit</h1>
              <p className="text-sm text-slate-600">Tutti gli strumenti per vendere in un'unica pagina</p>
            </div>
            
            {/* Selected Client Badge */}
            {selectedClient && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  {selectedClient.type === 'contact' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <div>
                    <div className="text-xs opacity-90">Cliente Selezionato</div>
                    <div className="font-semibold">
                      {selectedClient.type === 'contact' 
                        ? selectedClient.data.full_name 
                        : selectedClient.data.ragione_sociale}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    clearClient();
                    setActiveSection('client-selector');
                  }}
                  className="hover:bg-white/20 p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Client Selector Section */}
        {activeSection === 'client-selector' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Seleziona Cliente</h2>
                  <p className="text-sm text-slate-600">Scegli un cliente per iniziare</p>
                </div>
                <button
                  onClick={() => setShowAddClient(!showAddClient)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Cliente
                </button>
              </div>

              {/* Add Client Form */}
              {showAddClient && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">Aggiungi Nuovo Cliente</h3>
                  <p className="text-sm text-blue-700">
                    Per aggiungere un nuovo cliente, vai alla sezione{' '}
                    <a href="/contacts" className="underline font-medium">Contatti</a> o{' '}
                    <a href="/portfolio" className="underline font-medium">Portfolio</a>
                  </p>
                </div>
              )}

              {/* Contacts Grid */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Contatti ({contacts.length})
                </h3>
                {contactsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Nessun contatto assegnato</p>
                    <a href="/portfolio" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
                      Vai al Portfolio →
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="text-left p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {contact.first_name} {contact.last_name}
                              </div>
                              {contact.email && (
                                <div className="text-xs text-slate-500">{contact.email}</div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        {contact.company_name && (
                          <div className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {contact.company_name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Companies Grid */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Aziende ({companies.length})
                </h3>
                {companiesQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                    <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Nessuna azienda assegnata</p>
                    <a href="/portfolio" className="text-sm text-green-600 hover:text-green-800 mt-2 inline-block">
                      Vai al Portfolio →
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className="text-left p-4 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                              <Building2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{company.ragione_sociale}</div>
                              {company.website && (
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                  {company.website}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tools Grid - Always visible */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Strumenti Disponibili</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isDisabled = section.requiresClient && !selectedClient;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => !isDisabled && setActiveSection(section.id)}
                      disabled={isDisabled}
                      className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                        isDisabled
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                          : `bg-gradient-to-br ${section.color} text-white border-transparent hover:shadow-2xl hover:scale-105 cursor-pointer`
                      }`}
                    >
                      {isDisabled && (
                        <div className="absolute top-2 right-2">
                          <AlertCircle className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <Icon className="w-8 h-8 mb-3" />
                      <h3 className="font-bold text-lg mb-1">{section.title}</h3>
                      <p className={`text-sm ${isDisabled ? 'text-slate-500' : 'opacity-90'}`}>
                        {section.description}
                      </p>
                      {isDisabled && (
                        <div className="mt-3 text-xs text-slate-600 font-medium">
                          ⚠️ Seleziona un cliente
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Tool Section */}
        {activeSection !== 'client-selector' && (
          <div className="animate-in slide-in-from-right duration-300">
            {/* Back Button */}
            <button
              onClick={() => setActiveSection('client-selector')}
              className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Torna alla selezione
            </button>

            {/* Tool Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              {renderToolContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}