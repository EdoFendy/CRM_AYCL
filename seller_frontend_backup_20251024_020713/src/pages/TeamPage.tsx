import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { StatsCard } from '@/components/data/StatsCard';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
  joined_at: string;
  is_active: boolean;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  leader_id: string;
  created_at: string;
}

interface TeamStats {
  total_members: number;
  active_members: number;
  total_opportunities: number;
  total_revenue: number;
}

export default function TeamPage() {
  const { token, user } = useAuth();

  // Load team information
  const teamQuery = useQuery({
    queryKey: ['team-info'],
    queryFn: async () => {
      const response = await apiClient<{ data: Team }>('teams/my-team', {
        token,
      });
      return response.data;
    },
  });

  // Load team members
  const membersQuery = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await apiClient<{ data: TeamMember[] }>('teams/members', {
        token,
      });
      return response.data || [];
    },
  });

  // Load team stats
  const statsQuery = useQuery({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const response = await apiClient<{ data: TeamStats }>('teams/stats', {
        token,
      });
      return response.data;
    },
  });

  const team = teamQuery.data;
  const members = membersQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My Team</h2>
          <p className="text-sm text-slate-500">
            {team?.name || 'Loading team information...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Your Role:</span>
          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {user?.role || 'Seller'}
          </span>
        </div>
      </div>

      {/* Team Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Team Members"
            value={stats.total_members}
            subtitle={`${stats.active_members} active`}
            icon="👥"
          />
          <StatsCard
            title="Team Opportunities"
            value={stats.total_opportunities}
            subtitle="All team deals"
            icon="🎯"
          />
          <StatsCard
            title="Team Revenue"
            value={`€${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="Total generated"
            icon="💰"
          />
          <StatsCard
            title="Your Referral Code"
            value={user?.referralCode || 'N/A'}
            subtitle="Share with others"
            icon="🔗"
          />
        </div>
      )}

      {/* Team Information */}
      {team && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-600">Team Name</p>
              <p className="text-lg font-semibold text-slate-900">{team.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Created</p>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(team.created_at).toLocaleDateString()}
              </p>
            </div>
            {team.description && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-600">Description</p>
                <p className="text-slate-900">{team.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {member.full_name || member.email}
                  </p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Collaboration Tools */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Team Chat</h3>
              <p className="text-sm text-slate-500">Communicate with your team</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Stay connected with your team members through our integrated chat system.
          </p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Open Chat
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Team Reports</h3>
              <p className="text-sm text-slate-500">View team performance</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Access detailed reports on team performance and collaboration metrics.
          </p>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            View Reports
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Shared Goals</h3>
              <p className="text-sm text-slate-500">Track team objectives</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Set and track shared team goals and objectives for better collaboration.
          </p>
          <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Manage Goals
          </button>
        </div>
      </div>

      {/* Your Referral Information */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Referral Program</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-600">Your Referral Code</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary bg-primary/10 px-3 py-2 rounded">
                {user?.referralCode || 'N/A'}
              </span>
              <button className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50">
                Copy
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Your Referral Link</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={user?.referralLink || 'N/A'}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50"
              />
              <button className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50">
                Copy
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-slate-50 rounded-md">
          <p className="text-sm text-slate-600">
            <strong>How it works:</strong> Share your referral code or link with potential customers. 
            When they sign up using your referral, you'll earn commissions on their purchases.
          </p>
        </div>
      </div>
    </section>
  );
}