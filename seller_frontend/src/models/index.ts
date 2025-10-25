// Team-related types
export interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  status: string;
  team_id?: string;
  reseller_team_id?: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  type: 'seller' | 'reseller';
  parent_team_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TeamMetrics {
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  memberCount: number;
  totalDeals: number;
  wonDeals: number;
}

export interface RankingEntry {
  userId: string;
  name: string;
  email: string;
  value: number;
  deals: number;
  rank: number;
  isCurrentUser?: boolean;
}

// Opportunity types
export interface Opportunity {
  id: string;
  company_id: string;
  company_name?: string;
  title: string;
  value: number;
  currency?: string;
  stage: string;
  probability?: number;
  owner_id: string;
  owner_name?: string;
  expected_close_date?: string;
  source?: string;
  referral_id?: string;
  created_at: string;
  updated_at: string;
}

// Contact types
export interface Contact {
  id: string;
  company_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  linkedin?: string;
  owner_id: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  due_date?: string;
  owner_id: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

// Activity types
export interface Activity {
  id: string;
  type: string;
  content: string;
  actor_id?: string;
  actor_name?: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

