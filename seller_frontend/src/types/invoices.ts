// Invoice Types and Interfaces

export interface Invoice {
  id: string;
  invoice_number: string;
  contract_id: string;
  contract_name?: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'paid';
  payment_proof?: PaymentProof;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  paid_at?: string;
  file_url?: string;
}

export interface PaymentProof {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  notes?: string;
  uploaded_at: string;
}

export interface InvoiceFormData {
  contract_id: string;
  amount: number;
  currency: string;
  payment_proof?: {
    file: File;
    payment_date: string;
    payment_method: string;
    amount: number;
    notes?: string;
  };
}

export interface InvoiceApprovalRequest {
  invoice_id: string;
  contract_id: string;
  amount: number;
  payment_proof_id: string;
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'invoice_approved' | 'invoice_rejected' | 'contract_signed' | 'checkout_completed';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

