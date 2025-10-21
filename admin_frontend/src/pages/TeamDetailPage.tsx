import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { apiClient } from '../utils/apiClient';
import { DataTable } from '../components/data/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface Team {
  id: string;
  name: string;
  type: string;
  parent_team_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  code11: string;
  status: string;
  team_id: string | null;
  reseller_team_id: string | null;
  created_at: string;
  last_login_at: string | null;
  [key: string]: any; // For dynamic field access
}

interface Activity {
  id: string;
  type: string;
  actor_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  content: string | null;
  metadata: any;
  occurred_at: string;
  created_at: string;
}

interface Company {
  id: string;
  ragione_sociale: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company_id: string;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  company_id: string;
  owner_id: string;
}

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

const TABS = ['members', 'activities', 'performance', 'settings'] as const;

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const { token } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [teamQuery, membersQuery, activitiesQuery, allUsersQuery, companiesQuery, contactsQuery, opportunitiesQuery] = useQueries({
    queries: [
      {
        queryKey: ['team', teamId],
        queryFn: () => apiClient<Team>(`teams/${teamId}`, { token }),
        enabled: Boolean(teamId),
      },
      {
        queryKey: ['team', teamId, 'members'],
        queryFn: () => {
          // Get users filtered by team_id first (for seller teams)
          return apiClient<{ data: TeamMember[] }>('users', { 
            token, 
            searchParams: { team_id: teamId, limit: 1000 } 
          });
        },
        enabled: Boolean(teamId),
      },
      {
        queryKey: ['team', teamId, 'activities'],
        queryFn: async () => {
          // Get team members first
          const team = await apiClient<Team>(`teams/${teamId}`, { token });
          const field = team.type === 'seller' ? 'team_id' : 'reseller_team_id';
          const membersResponse = await apiClient<{ data: TeamMember[] }>('users', { 
            token, 
            searchParams: { [field]: teamId, limit: 1000 } 
          });
          
          // Get activities for all team members
          const memberIds = membersResponse.data.map(m => m.id);
          if (memberIds.length === 0) return { data: [] };
          
          const activitiesPromises = memberIds.map(memberId =>
            apiClient<{ data: Activity[] }>('activities', { 
              token, 
              searchParams: { actor_id: memberId } 
            })
          );
          
          const activitiesResults = await Promise.all(activitiesPromises);
          const allActivities = activitiesResults.flatMap(result => result.data);
          
          // Sort by date
          allActivities.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
          
          return { data: allActivities };
        },
        enabled: Boolean(teamId),
      },
      {
        queryKey: ['users-available'],
        queryFn: async () => {
          // Get all users first
          const allUsers = await apiClient<{ data: TeamMember[] }>('users', { 
            token, 
            searchParams: { limit: 1000 } 
          });
          return allUsers;
        },
      },
      {
        queryKey: ['companies-list'],
        queryFn: () => apiClient<{ data: Company[] }>('companies', { 
          token, 
          searchParams: { limit: 1000 } 
        }),
      },
      {
        queryKey: ['contacts-list'],
        queryFn: () => apiClient<{ data: Contact[] }>('contacts', { 
          token, 
          searchParams: { limit: 1000 } 
        }),
      },
      {
        queryKey: ['opportunities-list'],
        queryFn: async () => {
          // Get all opportunities first
          const allOpportunities = await apiClient<{ data: Opportunity[] }>('opportunities', { 
            token, 
            searchParams: { limit: 1000 } 
          });
          
          // Filter opportunities by team members
          const team = await apiClient<Team>(`teams/${teamId}`, { token });
          const field = team.type === 'seller' ? 'team_id' : 'reseller_team_id';
          const membersResponse = await apiClient<{ data: TeamMember[] }>('users', { 
            token, 
            searchParams: { [field]: teamId, limit: 1000 } 
          });
          
          const memberIds = membersResponse.data.map(m => m.id);
          const teamOpportunities = allOpportunities.data.filter(opp => 
            memberIds.includes(opp.owner_id)
          );
          
          return { data: teamOpportunities };
        },
        enabled: Boolean(teamId),
      },
    ],
  });

  const team = teamQuery.data;
  const members = membersQuery.data?.data ?? [];
  const activities = activitiesQuery.data?.data ?? [];
  const allUsers = allUsersQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];
  const contacts = contactsQuery.data?.data ?? [];
  const opportunities = opportunitiesQuery.data?.data ?? [];

  // Filter members based on team type
  const actualMembers = team?.type === 'seller' 
    ? members 
    : allUsers.filter(user => user.reseller_team_id === teamId);

  // Filter activities to only include those from team members
  const teamMemberIds = actualMembers.map(member => member.id);
  const teamActivities = activities.filter(activity => 
    teamMemberIds.includes(activity.actor_id || '')
  );


  // Available users to add to team (not already in this team)
  const availableUsers = allUsers.filter(user => {
    if (team?.type === 'seller') {
      return user.role === 'seller' && user.team_id !== teamId;
    } else if (team?.type === 'reseller') {
      return user.role === 'reseller' && user.reseller_team_id !== teamId;
    }
    return false;
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId }: AddMemberFormValues) => {
      const field = team?.type === 'seller' ? 'team_id' : 'reseller_team_id';
      return apiClient(`users/${userId}`, {
        method: 'PATCH',
        token,
        body: { [field]: teamId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddMemberModal(false);
      addMemberForm.reset();
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const field = team?.type === 'seller' ? 'team_id' : 'reseller_team_id';
      return apiClient(`users/${userId}`, {
        method: 'PATCH',
        token,
        body: { [field]: null },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setRemovingMemberId(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const addMemberForm = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { userId: '' },
  });

  const onAddMember = addMemberForm.handleSubmit(async (values) => {
    setError(null);
    await addMemberMutation.mutateAsync(values);
  });

  const tabLabels: Record<typeof TABS[number], string> = useMemo(
    () => ({
      members: 'Team Members',
      activities: 'Team Activities',
      performance: 'Performance',
      settings: 'Settings',
    }),
    []
  );

  // Helper functions
  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.full_name || member?.email || 'Unknown';
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return null;
    const company = companies.find(c => c.id === companyId);
    return company?.ragione_sociale || 'Unknown Company';
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact';
  };

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const memberActivities = teamActivities.length;
    const uniqueCompanies = new Set(teamActivities.filter(a => a.company_id).map(a => a.company_id)).size;
    const uniqueContacts = new Set(teamActivities.filter(a => a.contact_id).map(a => a.contact_id)).size;
    
    // Get opportunities owned by team members
    const teamOpportunities = opportunities.filter(opp => 
      actualMembers.some(member => member.id === opp.owner_id)
    );
    
    const totalPipelineValue = teamOpportunities
      .filter(opp => !['closed_won', 'closed_lost'].includes(opp.stage))
      .reduce((sum, opp) => sum + (typeof opp.value === 'number' ? opp.value : Number(opp.value) || 0), 0);
    
    const wonOpportunities = teamOpportunities.filter(opp => opp.stage === 'closed_won');
    const totalWonValue = wonOpportunities.reduce((sum, opp) => sum + (typeof opp.value === 'number' ? opp.value : Number(opp.value) || 0), 0);

    return {
      memberCount: actualMembers.length,
      totalActivities: memberActivities,
      companiesEngaged: uniqueCompanies,
      contactsEngaged: uniqueContacts,
      totalOpportunities: teamOpportunities.length,
      pipelineValue: totalPipelineValue,
      wonValue: totalWonValue,
      wonCount: wonOpportunities.length,
    };
  }, [actualMembers, teamActivities, opportunities]);

  if (!team) {
    return (
      <section className="space-y-6">
        <div className="text-center">
          <p className="text-slate-500">Loading team...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
              team.type === 'seller' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {team.type} team
            </span>
            <span>•</span>
            <span>{actualMembers.length} members</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Sub-navbar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              activeTab === tab
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Performance Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Performance Overview */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Team Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Members</span>
                <span className="text-sm font-semibold text-slate-900">{performanceMetrics.memberCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Activities</span>
                <span className="text-sm font-semibold text-slate-900">{performanceMetrics.totalActivities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Companies Engaged</span>
                <span className="text-sm font-semibold text-slate-900">{performanceMetrics.companiesEngaged}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Contacts Engaged</span>
                <span className="text-sm font-semibold text-slate-900">{performanceMetrics.contactsEngaged}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Opportunities</span>
                <span className="text-sm font-semibold text-slate-900">{performanceMetrics.totalOpportunities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Pipeline Value</span>
                <span className="text-sm font-semibold text-green-600">
                  €{performanceMetrics.pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Won Value</span>
                <span className="text-sm font-semibold text-green-600">
                  €{performanceMetrics.wonValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activities Summary */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {teamActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{activity.type}</span>
                    <span className="text-slate-400">
                      {new Date(activity.occurred_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 truncate">
                    {getMemberName(activity.actor_id || '')} • {activity.content || 'No details'}
                  </p>
                </div>
              ))}
              {teamActivities.length === 0 && (
                <p className="text-sm text-slate-500">No recent activities</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="lg:col-span-2">
          {activeTab === 'members' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Members</h3>
              <DataTable
                data={actualMembers}
                columns={[
                  {
                    id: 'name',
                    header: 'Name',
                    cell: (member: TeamMember) => (
                      <div>
                        <p className="font-medium text-slate-900">{member.full_name || 'No Name'}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (member: TeamMember) => (
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        member.status === 'active' ? 'bg-green-100 text-green-700' :
                        member.status === 'invited' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {member.status}
                      </span>
                    ),
                  },
                  {
                    id: 'last_login',
                    header: 'Last Login',
                    cell: (member: TeamMember) => 
                      member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never',
                  },
                  {
                    id: 'joined',
                    header: 'Joined',
                    cell: (member: TeamMember) => new Date(member.created_at).toLocaleDateString(),
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (member: TeamMember) => (
                      <button
                        onClick={() => setRemovingMemberId(member.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    ),
                  },
                ]}
                emptyState={<span>No team members</span>}
              />
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Activities</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {teamActivities.map((activity) => (
                  <div key={activity.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        {activity.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(activity.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {activity.content || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="rounded bg-slate-100 px-2 py-0.5">
                        by: {getMemberName(activity.actor_id || '')}
                      </span>
                      {activity.company_id && (
                        <Link 
                          to={`/portfolio/${activity.company_id}`}
                          className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 hover:bg-blue-200"
                        >
                          {getCompanyName(activity.company_id)}
                        </Link>
                      )}
                      {activity.contact_id && (
                        <Link 
                          to={`/contacts/${activity.contact_id}`}
                          className="rounded bg-green-100 px-2 py-0.5 text-green-700 hover:bg-green-200"
                        >
                          {getContactName(activity.contact_id)}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {teamActivities.length === 0 && (
                  <p className="text-sm text-slate-500">No activities recorded</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Total Pipeline Value</p>
                  <p className="text-2xl font-bold text-slate-900">
                    €{performanceMetrics.pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Won Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    €{performanceMetrics.wonValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Total Activities</p>
                  <p className="text-2xl font-bold text-slate-900">{performanceMetrics.totalActivities}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Companies Engaged</p>
                  <p className="text-2xl font-bold text-slate-900">{performanceMetrics.companiesEngaged}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Settings</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt className="font-medium">Team ID</dt>
                  <dd className="font-mono text-slate-700">{team.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Team Type</dt>
                  <dd className="text-slate-900">{team.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Created</dt>
                  <dd>{new Date(team.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Updated</dt>
                  <dd>{new Date(team.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Add Team Member"
      >
        <form onSubmit={onAddMember} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="userId">
              Select User
            </label>
            <select
              id="userId"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...addMemberForm.register('userId')}
            >
              <option value="">Choose a user...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowAddMemberModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        isOpen={removingMemberId !== null}
        onClose={() => setRemovingMemberId(null)}
        onConfirm={() => removingMemberId && removeMemberMutation.mutate(removingMemberId)}
        title="Remove Team Member"
        message="Are you sure you want to remove this member from the team? They will lose access to team resources."
        confirmVariant="danger"
        isLoading={removeMemberMutation.isPending}
      />
    </section>
  );
}
