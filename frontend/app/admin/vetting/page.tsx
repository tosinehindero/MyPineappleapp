'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import {
  checkAdminRole,
  getPendingVerifications,
  approveUser,
  rejectUser,
  getVerificationStats,
  createTestPendingUser,
  getUserReports,
  updateReportStatus,
  banUser,
  unbanUser,
  getAdminStats,
  getSubscriptionStats,
  getAllUsersForAdmin,
  setUserTier,
  setFounderStatus,
  type PendingProfile,
  type UserReport,
  type AdminStats,
  type SubscriptionStats,
  type UserWithSubscription,
} from '@/lib/admin';

type TabType = 'overview' | 'vetting' | 'reports' | 'users';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Vetting state
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PendingProfile | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Reports state
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportFilter, setReportFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Admin stats
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  
  // Subscription stats
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  
  // User management state
  const [allUsers, setAllUsers] = useState<UserWithSubscription[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [tierUpdating, setTierUpdating] = useState<string | null>(null);
  const [founderUpdating, setFounderUpdating] = useState<string | null>(null);
  
  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banTargetUsername, setBanTargetUsername] = useState<string>('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<'7days' | '30days' | 'permanent'>('7days');

  // Check for initialization success message
  useEffect(() => {
    if (searchParams.get('initialized') === 'true') {
      toast.success('Admin Initialized Successfully!');
      router.replace('/admin/vetting');
    }
  }, [searchParams, router]);

  // Auth and admin check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);
      const adminStatus = await checkAdminRole(user.uid);
      
      if (!adminStatus) {
        toast.error('Access Denied - Admin privileges required');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadAllData();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadAllData = async () => {
    const [profilesResult, statsResult, reportsResult, adminStatsResult, subStatsResult] = await Promise.all([
      getPendingVerifications(),
      getVerificationStats(),
      getUserReports('pending'),
      getAdminStats(),
      getSubscriptionStats(),
    ]);

    if (profilesResult.success) setPendingProfiles(profilesResult.data);
    setStats(statsResult);
    if (reportsResult.success) setReports(reportsResult.data);
    setAdminStats(adminStatsResult);
    setSubscriptionStats(subStatsResult);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const result = await getAllUsersForAdmin();
    if (result.success) {
      setAllUsers(result.data);
    }
    setUsersLoading(false);
  };

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0) {
      loadUsers();
    }
  }, [activeTab]);

  const handleSetUserTier = async (userId: string, tier: 'free' | 'basic' | 'premium') => {
    setTierUpdating(userId);
    const result = await setUserTier(userId, tier);
    
    if (result.success) {
      toast.success(`User tier updated to ${tier.toUpperCase()}`);
      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, tier } : u
      ));
    } else {
      toast.error('Failed to update tier', { description: result.error });
    }
    setTierUpdating(null);
  };

  const handleSetFounderStatus = async (userId: string, isFounder: boolean) => {
    setFounderUpdating(userId);
    const result = await setFounderStatus(userId, isFounder);
    
    if (result.success) {
      toast.success(isFounder ? 'Founder status granted' : 'Founder status removed');
      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isFounder } : u
      ));
    } else {
      toast.error('Failed to update founder status', { description: result.error });
    }
    setFounderUpdating(null);
  };
    setStats(statsResult);
    if (reportsResult.success) setReports(reportsResult.data);
    setAdminStats(adminStatsResult);
  };

  const loadReports = async (status: string) => {
    setReportFilter(status);
    const result = await getUserReports(status === 'all' ? undefined : status);
    if (result.success) setReports(result.data);
  };

  const handleApprove = async (uid: string) => {
    setProcessingId(uid);
    const result = await approveUser(uid);
    
    if (result.success) {
      toast.success('User approved successfully!');
      setPendingProfiles((prev) => prev.filter((p) => p.id !== uid));
      setSelectedProfile(null);
      setStats((prev) => ({ ...prev, pending: prev.pending - 1, verified: prev.verified + 1 }));
    } else {
      toast.error('Failed to approve user', { description: result.error });
    }
    
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!selectedProfile) return;
    
    setProcessingId(selectedProfile.id);
    const result = await rejectUser(selectedProfile.id, rejectReason);
    
    if (result.success) {
      toast.info('User verification rejected');
      setPendingProfiles((prev) => prev.filter((p) => p.id !== selectedProfile.id));
      setSelectedProfile(null);
      setShowRejectModal(false);
      setRejectReason('');
      setStats((prev) => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }));
    } else {
      toast.error('Failed to reject user', { description: result.error });
    }
    
    setProcessingId(null);
  };

  const handleReportAction = async (action: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    
    const result = await updateReportStatus(selectedReport.id, action, adminNotes);
    
    if (result.success) {
      toast.success(`Report ${action}`);
      await loadReports(reportFilter);
      setSelectedReport(null);
      setAdminNotes('');
    } else {
      toast.error('Failed to update report');
    }
  };

  const handleBanUser = async () => {
    if (!banTargetId || !banReason) return;
    
    const result = await banUser(banTargetId, banReason, banDuration);
    
    if (result.success) {
      toast.success('User has been banned');
      setShowBanModal(false);
      setBanTargetId(null);
      setBanReason('');
      await loadAllData();
    } else {
      toast.error('Failed to ban user', { description: result.error });
    }
  };

  const handleCreateTestUser = async () => {
    const result = await createTestPendingUser();
    if (result.success) {
      toast.success('Test user created!');
      await loadAllData();
    } else {
      toast.error('Failed to create test user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading text-red-400 mb-4">Access Denied</h1>
          <Link href="/" className="text-gold hover:text-gold-light transition-colors">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <div className="bg-darkBlue/50 border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/feed" className="text-gold/60 hover:text-gold text-sm font-body mb-2 inline-block">
                ← Back to Feed
              </Link>
              <h1 className="text-3xl font-heading text-gold">Admin Dashboard</h1>
              <p className="text-offWhite/60 font-body mt-1">Manage users, reports, and content</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-white/[0.03] rounded-xl p-1">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'vetting', label: 'Vetting', icon: '👤', badge: stats.pending },
              { key: 'reports', label: 'Reports', icon: '🚨', badge: adminStats?.pendingReports || 0 },
              { key: 'users', label: 'User Management', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-body transition-all flex items-center justify-center space-x-2 ${
                  activeTab === tab.key
                    ? 'bg-gold/20 text-gold'
                    : 'text-offWhite/60 hover:text-gold'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && adminStats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Users', value: adminStats.totalUsers, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                { label: 'Verified', value: adminStats.verifiedUsers, color: 'text-green-400', bg: 'bg-green-500/20' },
                { label: 'Pending', value: adminStats.pendingUsers, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
                { label: 'Banned', value: adminStats.bannedUsers, color: 'text-red-400', bg: 'bg-red-500/20' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} border border-white/10 rounded-xl p-6`}>
                  <p className={`text-3xl font-heading ${stat.color}`}>{stat.value}</p>
                  <p className="text-offWhite/60 text-sm font-body mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveTab('vetting')}
                className="bg-darkBlue/50 border border-gold/20 rounded-xl p-6 text-left hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">👤</span>
                  {stats.pending > 0 && (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                      {stats.pending} pending
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-heading text-gold">User Vetting</h3>
                <p className="text-offWhite/60 text-sm font-body mt-1">
                  Review and approve new membership applications
                </p>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className="bg-darkBlue/50 border border-gold/20 rounded-xl p-6 text-left hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🚨</span>
                  {(adminStats.pendingReports || 0) > 0 && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                      {adminStats.pendingReports} pending
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-heading text-gold">User Reports</h3>
                <p className="text-offWhite/60 text-sm font-body mt-1">
                  Review reports and take moderation actions
                </p>
              </button>

              <button
                onClick={handleCreateTestUser}
                className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-left hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🧪</span>
                </div>
                <h3 className="text-lg font-heading text-purple-400">Create Test User</h3>
                <p className="text-offWhite/60 text-sm font-body mt-1">
                  Generate a test pending user for workflow testing
                </p>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
              <h3 className="text-xl font-heading text-gold mb-4">Platform Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-darkBlue/50 border border-gold/20 rounded-xl p-6">
                  <h4 className="text-offWhite font-body font-semibold mb-4">Content Overview</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Total Posts</span>
                      <span className="text-offWhite font-semibold">{adminStats.totalPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Reported Posts</span>
                      <span className="text-red-400 font-semibold">{adminStats.reportedPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Pending Reports</span>
                      <span className="text-yellow-400 font-semibold">{adminStats.pendingReports}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-darkBlue/50 border border-gold/20 rounded-xl p-6">
                  <h4 className="text-offWhite font-body font-semibold mb-4">User Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Verification Rate</span>
                      <span className="text-green-400 font-semibold">
                        {adminStats.totalUsers > 0 
                          ? Math.round((adminStats.verifiedUsers / adminStats.totalUsers) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Pending Approval</span>
                      <span className="text-yellow-400 font-semibold">{adminStats.pendingUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-offWhite/60">Banned Users</span>
                      <span className="text-red-400 font-semibold">{adminStats.bannedUsers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Vetting Tab */}
        {activeTab === 'vetting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {pendingProfiles.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading text-gold mb-2">All Caught Up!</h2>
                <p className="text-offWhite/60 font-body mb-6">No pending verification requests.</p>
                <button
                  onClick={handleCreateTestUser}
                  className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/40 rounded-full transition-all"
                >
                  Create Test User
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profiles List */}
                <div className="lg:col-span-1 space-y-4">
                  <h2 className="text-xl font-heading text-gold mb-4">
                    Pending Reviews ({pendingProfiles.length})
                  </h2>
                  
                  {pendingProfiles.map((profile) => (
                    <motion.div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedProfile?.id === profile.id
                          ? 'bg-gold/10 border-gold'
                          : 'bg-darkBlue/50 border-gold/20 hover:border-gold/40'
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center space-x-4">
                        {profile.photoUrls[0] ? (
                          <img src={profile.photoUrls[0]} alt={profile.username} className="w-14 h-14 rounded-full object-cover border-2 border-gold/30" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/30">
                            <span className="text-gold font-heading text-xl">{profile.username[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-offWhite font-body font-medium truncate">{profile.username}</p>
                          <p className="text-offWhite/50 text-sm truncate">{profile.accountType} • {profile.location}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(profile.id); }}
                            disabled={processingId === profile.id}
                            className="p-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedProfile(profile); setShowRejectModal(true); }}
                            className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Profile Detail */}
                <div className="lg:col-span-2">
                  {selectedProfile ? (
                    <motion.div key={selectedProfile.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-darkBlue/50 rounded-2xl border border-gold/20 overflow-hidden">
                      <div className="bg-gradient-to-r from-gold/20 to-gold/5 px-6 py-4 border-b border-gold/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">👑</span>
                            <div>
                              <h3 className="text-xl font-heading text-gold">VIP Review</h3>
                              <p className="text-offWhite/60 text-sm">Membership Application</p>
                            </div>
                          </div>
                          <span className="px-4 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">Pending</span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-start space-x-6 mb-8">
                          {selectedProfile.photoUrls[0] ? (
                            <img src={selectedProfile.photoUrls[0]} alt={selectedProfile.username} className="w-24 h-24 rounded-xl object-cover border-2 border-gold/30" />
                          ) : (
                            <div className="w-24 h-24 rounded-xl bg-gold/20 flex items-center justify-center border-2 border-gold/30">
                              <span className="text-gold font-heading text-3xl">{selectedProfile.username[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <h4 className="text-2xl font-heading text-offWhite mb-2">{selectedProfile.username}</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm">{selectedProfile.accountType}</span>
                              <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm">{selectedProfile.experienceLevel}</span>
                              <span className="px-3 py-1 bg-gold/10 text-offWhite/70 rounded-full text-sm">{selectedProfile.location}</span>
                            </div>
                          </div>
                        </div>

                        {selectedProfile.description && (
                          <div className="mb-6">
                            <h5 className="text-sm font-body text-gold mb-2">About</h5>
                            <p className="text-offWhite/80 font-body bg-charcoal rounded-xl p-4 border border-gold/10">{selectedProfile.description}</p>
                          </div>
                        )}

                        {selectedProfile.interests.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-sm font-body text-gold mb-2">Interests</h5>
                            <div className="flex flex-wrap gap-2">
                              {selectedProfile.interests.map((interest, i) => (
                                <span key={i} className="px-3 py-1 bg-gold/5 text-offWhite/70 rounded-full text-sm border border-gold/10">{interest}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-4 pt-6 border-t border-gold/10">
                          <button
                            onClick={() => handleApprove(selectedProfile.id)}
                            disabled={processingId === selectedProfile.id}
                            className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            <span>Approve & Welcome</span>
                          </button>
                          <button
                            onClick={() => setShowRejectModal(true)}
                            className="flex-1 py-4 bg-gradient-to-r from-red-600/80 to-red-500/80 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center space-x-2"
                          >
                            <svg className="w-5 h-5" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Deny</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-12 bg-darkBlue/30 rounded-2xl border border-gold/10">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gold/60" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </div>
                        <h3 className="text-xl font-heading text-gold/60 mb-2">Select a Profile</h3>
                        <p className="text-offWhite/40 font-body">Choose a pending application to review</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filter */}
            <div className="flex space-x-2 mb-6">
              {['pending', 'resolved', 'dismissed', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => loadReports(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-body capitalize transition-all ${
                    reportFilter === filter
                      ? 'bg-gold/20 text-gold'
                      : 'bg-white/[0.03] text-offWhite/60 hover:text-gold'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-400" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading text-green-400 mb-2">No Reports</h2>
                <p className="text-offWhite/60 font-body">No {reportFilter !== 'all' ? reportFilter : ''} reports to review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reports List */}
                <div className="space-y-4">
                  <h2 className="text-xl font-heading text-gold mb-4">Reports ({reports.length})</h2>
                  
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedReport?.id === report.id
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-darkBlue/50 border-gold/20 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-offWhite font-body font-medium">
                            <span className="text-red-400">{report.reportedUsername}</span>
                            <span className="text-offWhite/40 mx-2">reported by</span>
                            <span className="text-offWhite/60">{report.reporterUsername}</span>
                          </p>
                          <p className="text-offWhite/60 text-sm mt-1 capitalize">{report.reason.replace('_', ' ')}</p>
                          <p className="text-offWhite/40 text-xs mt-1">
                            {report.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                          report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          report.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Report Detail */}
                <div>
                  {selectedReport ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-darkBlue/50 rounded-2xl border border-red-500/20 p-6">
                      <h3 className="text-xl font-heading text-red-400 mb-4">Report Details</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-offWhite/40 text-sm">Reported User</p>
                          <Link href={`/profile/${selectedReport.reportedUserId}`} className="text-offWhite hover:text-gold transition-colors">
                            {selectedReport.reportedUsername}
                          </Link>
                        </div>
                        
                        <div>
                          <p className="text-offWhite/40 text-sm">Reported By</p>
                          <Link href={`/profile/${selectedReport.reporterId}`} className="text-offWhite/60 hover:text-gold transition-colors">
                            {selectedReport.reporterUsername}
                          </Link>
                        </div>
                        
                        <div>
                          <p className="text-offWhite/40 text-sm">Reason</p>
                          <p className="text-offWhite capitalize">{selectedReport.reason.replace('_', ' ')}</p>
                        </div>
                        
                        {selectedReport.details && (
                          <div>
                            <p className="text-offWhite/40 text-sm">Details</p>
                            <p className="text-offWhite/80 bg-charcoal rounded-lg p-3 mt-1">{selectedReport.details}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-offWhite/40 text-sm mb-2">Admin Notes</p>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes about this report..."
                            className="w-full p-3 bg-charcoal border border-gold/20 rounded-lg text-offWhite font-body focus:outline-none focus:border-gold resize-none h-24"
                          />
                        </div>
                        
                        {selectedReport.status === 'pending' && (
                          <div className="flex space-x-3 pt-4 border-t border-gold/10">
                            <button
                              onClick={() => handleReportAction('resolved')}
                              className="flex-1 py-3 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-xl transition-all font-body"
                            >
                              Mark Resolved
                            </button>
                            <button
                              onClick={() => handleReportAction('dismissed')}
                              className="flex-1 py-3 bg-gray-600/20 hover:bg-gray-600 text-gray-400 hover:text-white rounded-xl transition-all font-body"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => {
                                setBanTargetId(selectedReport.reportedUserId);
                                setBanTargetUsername(selectedReport.reportedUsername || 'User');
                                setShowBanModal(true);
                              }}
                              className="py-3 px-4 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all font-body"
                            >
                              Ban User
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-12 bg-darkBlue/30 rounded-2xl border border-gold/10">
                      <div className="text-center">
                        <p className="text-offWhite/40 font-body">Select a report to view details</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-heading text-gold mb-2">User Management</h2>
              <p className="text-offWhite/60 font-body mb-6">
                Search and manage users, view user details, and take moderation actions.
              </p>
              <p className="text-offWhite/40 text-sm font-body">
                Use the Search feature in the main app to find specific users, then visit their profile to take actions.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-heading text-gold mb-4">Reject Application</h3>
              <p className="text-offWhite/60 font-body mb-4">
                Provide a reason for rejecting <span className="text-gold">{selectedProfile.username}</span>'s application:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., ID verification photo is unclear..."
                className="w-full p-4 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold resize-none h-32 mb-6"
              />
              <div className="flex space-x-4">
                <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors">Cancel</button>
                <button onClick={handleReject} disabled={processingId === selectedProfile.id} className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50">
                  {processingId === selectedProfile.id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban Modal */}
      <AnimatePresence>
        {showBanModal && banTargetId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBanModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-darkBlue rounded-2xl border border-red-500/30 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-heading text-red-400 mb-4">Ban User</h3>
              <p className="text-offWhite/60 font-body mb-4">
                You are about to ban <span className="text-red-400">{banTargetUsername}</span>. This will prevent them from accessing the platform.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-offWhite/60 text-sm mb-2 block">Ban Duration</label>
                  <div className="flex space-x-2">
                    {(['7days', '30days', 'permanent'] as const).map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setBanDuration(duration)}
                        className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                          banDuration === duration
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/[0.03] text-offWhite/60 border border-white/10'
                        }`}
                      >
                        {duration === '7days' ? '7 Days' : duration === '30days' ? '30 Days' : 'Permanent'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-offWhite/60 text-sm mb-2 block">Reason for Ban</label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Explain why this user is being banned..."
                    className="w-full p-3 bg-charcoal border border-red-500/20 rounded-lg text-offWhite font-body focus:outline-none focus:border-red-500/50 resize-none h-24"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button onClick={() => { setShowBanModal(false); setBanReason(''); }} className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors">Cancel</button>
                <button onClick={handleBanUser} disabled={!banReason} className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50">
                  Confirm Ban
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminVettingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
