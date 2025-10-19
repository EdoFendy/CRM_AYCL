export const ROLE = {
  ADMIN: 'admin',
  SELLER: 'seller',
  RESELLER: 'reseller',
  CUSTOMER: 'customer',
  MANAGEMENT: 'management'
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
// CRITIC PASS: Enumerazione ruoli statica; TODO collegare a tabella ruoli dinamica e includere permessi granulari.
