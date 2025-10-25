import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@context/AuthContext';

export type DataScope = 'personal' | 'team';

export interface DataScopeFilters {
  owner?: string;
  team_id?: string;
}

export function useDataScope(defaultScope: DataScope = 'personal') {
  const [scope, setScope] = useState<DataScope>(defaultScope);
  const { user } = useAuth();

  const hasTeam = useMemo(() => {
    return Boolean(user?.teamId || user?.resellerTeamId);
  }, [user]);

  const getFilterParams = useCallback((): DataScopeFilters => {
    if (scope === 'personal' || !hasTeam) {
      return { owner: user?.id };
    }
    
    // Team scope: filter by team_id
    const teamId = user?.teamId || user?.resellerTeamId;
    return { team_id: teamId || undefined };
  }, [scope, user, hasTeam]);

  const toggleScope = useCallback(() => {
    if (hasTeam) {
      setScope(prev => prev === 'personal' ? 'team' : 'personal');
    }
  }, [hasTeam]);

  return {
    scope,
    setScope,
    toggleScope,
    getFilterParams,
    hasTeam,
    teamId: user?.teamId || user?.resellerTeamId,
    userId: user?.id,
  };
}

