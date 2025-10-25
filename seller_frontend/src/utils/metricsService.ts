import type { Opportunity, TeamMember, RankingEntry, TeamMetrics } from '@models/index';
import { safeToNumber } from './numberUtils';

/**
 * Calculate rankings for sellers based on opportunities
 */
export function calculateRankings(
  opportunities: Opportunity[],
  members: TeamMember[],
  currentUserId?: string
): RankingEntry[] {
  // Group opportunities by owner
  const opportunitiesByOwner = opportunities.reduce((acc, opp) => {
    if (!acc[opp.owner_id]) {
      acc[opp.owner_id] = [];
    }
    acc[opp.owner_id].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Calculate metrics for each seller
  const rankings = members.map(member => {
    const memberOpps = opportunitiesByOwner[member.id] || [];
    const wonOpps = memberOpps.filter(o => o.stage === 'closed_won');
    const totalValue = wonOpps.reduce((sum, o) => sum + safeToNumber(o.value), 0);

    return {
      userId: member.id,
      name: member.full_name || member.email,
      email: member.email,
      value: totalValue,
      deals: wonOpps.length,
      rank: 0, // Will be set after sorting
      isCurrentUser: member.id === currentUserId,
    };
  });

  // Sort by value descending
  rankings.sort((a, b) => b.value - a.value);

  // Assign ranks
  rankings.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return rankings;
}

/**
 * Calculate team rankings (filter by team members)
 */
export function calculateTeamRankings(
  opportunities: Opportunity[],
  teamMembers: TeamMember[],
  currentUserId?: string
): RankingEntry[] {
  return calculateRankings(opportunities, teamMembers, currentUserId);
}

/**
 * Calculate global rankings (all sellers)
 */
export function calculateGlobalRankings(
  opportunities: Opportunity[],
  allSellers: TeamMember[],
  currentUserId?: string
): RankingEntry[] {
  return calculateRankings(opportunities, allSellers, currentUserId);
}

/**
 * Calculate team average metrics
 */
export function calculateTeamAverages(
  opportunities: Opportunity[],
  teamMembers: TeamMember[]
): TeamMetrics {
  const memberCount = teamMembers.length;
  
  if (memberCount === 0) {
    return {
      totalValue: 0,
      avgDealSize: 0,
      winRate: 0,
      memberCount: 0,
      totalDeals: 0,
      wonDeals: 0,
    };
  }

  const wonOpps = opportunities.filter(o => o.stage === 'closed_won');
  const lostOpps = opportunities.filter(o => o.stage === 'closed_lost');
  const closedOpps = [...wonOpps, ...lostOpps];

  const totalValue = wonOpps.reduce((sum, o) => sum + safeToNumber(o.value), 0);
  const avgDealSize = wonOpps.length > 0 ? totalValue / wonOpps.length : 0;
  const winRate = closedOpps.length > 0 ? (wonOpps.length / closedOpps.length) * 100 : 0;

  return {
    totalValue,
    avgDealSize,
    winRate,
    memberCount,
    totalDeals: opportunities.length,
    wonDeals: wonOpps.length,
  };
}

/**
 * Get top N performers
 */
export function getTopPerformers(
  rankings: RankingEntry[],
  limit: number = 5
): RankingEntry[] {
  return rankings.slice(0, limit);
}

/**
 * Find current user's rank in rankings
 */
export function getCurrentUserRank(
  rankings: RankingEntry[],
  userId?: string
): RankingEntry | null {
  if (!userId) return null;
  return rankings.find(r => r.userId === userId) || null;
}

/**
 * Calculate personal metrics from opportunities
 */
export function calculatePersonalMetrics(opportunities: Opportunity[]) {
  const activeOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));
  const wonOpps = opportunities.filter(o => o.stage === 'closed_won');
  const lostOpps = opportunities.filter(o => o.stage === 'closed_lost');
  const closedOpps = [...wonOpps, ...lostOpps];

  const totalPipelineValue = activeOpps.reduce((sum, o) => sum + safeToNumber(o.value), 0);
  const wonValue = wonOpps.reduce((sum, o) => sum + safeToNumber(o.value), 0);
  const winRate = closedOpps.length > 0 ? (wonOpps.length / closedOpps.length) * 100 : 0;
  const avgDealSize = wonOpps.length > 0 ? wonValue / wonOpps.length : 0;

  return {
    totalPipelineValue,
    wonValue,
    winRate,
    avgDealSize,
    activeDeals: activeOpps.length,
    wonDeals: wonOpps.length,
    totalDeals: opportunities.length,
  };
}

