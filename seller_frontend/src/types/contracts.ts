// Contract Types and Interfaces

export interface Contract {
  id: string;
  company_id: string;
  company_name?: string;
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'terminated';
  signed_at?: string;
  template_id?: string;
  pdf_url?: string;
  created_at: string;
  expires_at?: string;
  pack?: string;
  payment_amount?: number;
  payment_currency?: string;
  notes?: string;
  files?: Array<{
    id: string;
    name: string;
    storage_url: string;
    mime: string;
  }>;
}

export interface ContractData {
  company_name: string;
  company_address: string;
  company_tax_id: string;
  representative_name: string;
  representative_role: string;
  contract_place: string;
  contract_date: string;
  setup_fee: string;
  unit_cost?: string;
  revenue_share_percentage?: string;
  revenue_share_months?: string;
  icp_geographic_area: string;
  icp_sector: string;
  icp_min_revenue: string;
  icp_unit_cost?: string;
  icp_revenue_share?: string;
  icp_date: string;
}

export interface ContractFormData {
  company_id: string;
  template_type: 'performance' | 'setupfee';
  contract_data: ContractData;
  expires_at?: string;
  payment_amount?: number;
  payment_currency?: string;
  notes?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: 'performance' | 'setupfee';
  description: string;
  required_fields: string[];
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'performance',
    name: 'Performance Contract',
    type: 'performance',
    description: 'Contratto basato su performance e revenue sharing',
    required_fields: ['company_name', 'representative_name', 'revenue_share_percentage', 'revenue_share_months']
  },
  {
    id: 'setupfee',
    name: 'Setup Fee Contract',
    type: 'setupfee',
    description: 'Contratto con fee iniziale di setup',
    required_fields: ['company_name', 'representative_name', 'setup_fee']
  }
];
