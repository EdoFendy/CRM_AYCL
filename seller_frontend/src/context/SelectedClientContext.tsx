import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

type SelectedClient = 
  | { type: 'company'; data: Company }
  | { type: 'contact'; data: Contact }
  | null;

interface SelectedClientContextValue {
  selectedClient: SelectedClient;
  selectClient: (client: SelectedClient) => void;
  clearClient: () => void;
  hasClient: boolean;
}

const SelectedClientContext = createContext<SelectedClientContextValue | undefined>(undefined);

export function SelectedClientProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<SelectedClient>(null);

  const selectClient = useCallback((client: SelectedClient) => {
    setSelectedClient(client);
  }, []);

  const clearClient = useCallback(() => {
    setSelectedClient(null);
  }, []);

  const hasClient = selectedClient !== null;

  return (
    <SelectedClientContext.Provider
      value={{
        selectedClient,
        selectClient,
        clearClient,
        hasClient
      }}
    >
      {children}
    </SelectedClientContext.Provider>
  );
}

export function useSelectedClient() {
  const context = useContext(SelectedClientContext);
  if (context === undefined) {
    throw new Error('useSelectedClient must be used within a SelectedClientProvider');
  }
  return context;
}

