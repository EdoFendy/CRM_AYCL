// Quotes and Proposals Types

export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_company?: string;
  title: string;
  description?: string;
  items: QuoteItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  valid_until?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  file_url?: string;
}

export interface QuoteItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Proposal {
  id: string;
  proposal_number: string;
  client_id: string;
  client_name: string;
  client_email: string;
  client_company?: string;
  title: string;
  description: string;
  solution_overview: string;
  suggested_products: ProposalProduct[];
  price_range: {
    min: number;
    max: number;
  };
  benefits: string[];
  next_steps: string;
  status: 'draft' | 'sent' | 'reviewed' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  file_url?: string;
}

export interface ProposalProduct {
  id: string;
  name: string;
  description: string;
  estimated_price?: number;
  category: string;
}

export interface QuoteFormData {
  client_id: string;
  title: string;
  description?: string;
  items: Omit<QuoteItem, 'id'>[];
  tax_rate: number;
  currency: string;
  valid_until?: string;
}

export interface ProposalFormData {
  client_id: string;
  title: string;
  description: string;
  solution_overview: string;
  suggested_products: Omit<ProposalProduct, 'id'>[];
  price_range: {
    min: number;
    max: number;
  };
  benefits: string[];
  next_steps: string;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  fiscal_code?: string;
}

