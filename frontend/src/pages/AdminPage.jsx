import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Users, 
  ShieldCheck, 
  ShieldX, 
  Loader2,
  CheckCircle2,
  XCircle,
  Crown,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AdminPage = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { members, loading: membersLoading, toggleVerification } = useMembers();

  // Redirect non-admins
  if (!authLoading && (!user || !isAdmin())) {
    return <Navigate to="/feed" replace />;
  }

  const handleToggleVerification = async (memberId, currentStatus, memberName) => {
    try {
      await toggleVerification(memberId, currentStatus);
      toast.success(`${memberName || 'Member'} ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
    } catch (err) {
      console.error('Failed to toggle verification:', err);
      toast.error('Failed to update verification status');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const verifiedCount = members.filter(m => m.isVerified).length;
  const pendingCount = members.filter(m => !m.isVerified).length;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage member verification and community access
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" data-testid="admin-stats">
          <StatCard 
            icon={Users}
            label="Total Members"
            value={members.length}
            gradient="from-primary to-accent-cyan"
          />
          <StatCard 
            icon={ShieldCheck}
            label="Verified"
            value={verifiedCount}
            gradient="from-green-500 to-emerald-400"
          />
          <StatCard 
            icon={Clock}
            label="Pending Verification"
            value={pendingCount}
            gradient="from-amber-500 to-orange-400"
          />
        </div>

        {/* Members Table */}
        <div className="glass-card overflow-hidden" data-testid="members-table">
          <div className="p-6 border-b border-white/10">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Member Directory
            </h2>
          </div>

          {membersLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Member
                    </th>
                    <th className="text-left p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-center p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center p-4 text-muted-foreground font-medium text-sm uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow 
                      key={member.id} 
                      member={member} 
                      formatDate={formatDate}
                      onToggleVerification={handleToggleVerification}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, gradient }) => (
  <div className="glass-card p-6 relative overflow-hidden group">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
    <div className="relative">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="font-heading text-4xl font-bold text-foreground">{value}</p>
    </div>
  </div>
);

const MemberRow = ({ member, formatDate, onToggleVerification }) => {
  const isAdminMember = member.role === 'admin';
  
  return (
    <tr 
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
      data-testid={`member-row-${member.id}`}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center">
            {member.photoURL ? (
              <img 
                src={member.photoURL} 
                alt={member.displayName} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-medium">
                {(member.displayName || 'A').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-foreground flex items-center gap-2">
              {member.displayName || 'Unknown'}
              {member.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-accent-cyan" />
              )}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {member.id.substring(0, 12)}...
            </p>
          </div>
        </div>
      </td>
      <td className="p-4 text-foreground/80">{member.email || '-'}</td>
      <td className="p-4">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
          isAdminMember 
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
            : 'bg-white/5 text-muted-foreground border border-white/10'
        }`}>
          {isAdminMember && <Crown className="w-3 h-3" />}
          {member.role || 'member'}
        </span>
      </td>
      <td className="p-4 text-muted-foreground text-sm">
        {formatDate(member.createdAt)}
      </td>
      <td className="p-4 text-center">
        {member.isVerified ? (
          <span className="inline-flex items-center gap-1 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <XCircle className="w-5 h-5" />
          </span>
        )}
      </td>
      <td className="p-4 text-center">
        <VerificationToggle 
          isVerified={member.isVerified}
          disabled={isAdminMember}
          onChange={() => onToggleVerification(member.id, member.isVerified)}
          testId={`verify-toggle-${member.id}`}
        />
      </td>
    </tr>
  );
};

const VerificationToggle = ({ isVerified, disabled, onChange, testId }) => {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer'
      } ${
        isVerified 
          ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
          : 'bg-slate-700 hover:bg-slate-600'
      }`}
      data-testid={testId}
    >
      <span
        className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
          isVerified ? 'translate-x-9' : 'translate-x-1'
        }`}
      >
        {isVerified ? (
          <ShieldCheck className="w-4 h-4 text-green-500" />
        ) : (
          <ShieldX className="w-4 h-4 text-slate-500" />
        )}
      </span>
    </button>
  );
};

export default AdminPage;
