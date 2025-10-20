import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AuthProvider } from '@context/AuthContext';
import { I18nProvider } from '@i18n/I18nContext';

describe('App routing', () => {
  it('renders login page by default', () => {
    const queryClient = new QueryClient();
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/login']}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    );

    expect(screen.getByText(/Accesso Admin/i)).toBeInTheDocument();
  });
});
