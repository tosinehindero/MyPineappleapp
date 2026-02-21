'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import {
  checkAdminRole,
  getPendingVerifications,
  approveUser,
  rejectUser,
  getVerificationStats,
  createTestPendingUser,
  type PendingProfile,
} from '@/lib/admin';
import Link from 'next/link';

function AdminVettingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PendingProfile | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Check for initialization success message
  useEffect(() => {
    if (searchParams.get('initialized') === 'true') {
      toast.success('Admin Initialized Successfully!', {
        description: 'Please delete the setup-secret route in code now.',
        duration: 10000,
      });
      // Clean up URL
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
      
      // Check admin role - with debug logging
      const adminStatus = await checkAdminRole(user.uid);
      console.log('🍍 Admin Check Debug:', {
        userId: user.uid,
        email: user.email,
        isAdmin: adminStatus,
      });
      
      if (!adminStatus) {
        toast.error('Access Denied - Admin privileges required');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadData();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    const [profilesResult, statsResult] = await Promise.all([
      getPendingVerifications(),
      getVerificationStats(),
    ]);

    if (profilesResult.success) {
      setPendingProfiles(profilesResult.data);
    }
    setStats(statsResult);
  };

  const handleApprove = async (uid: string) => {
    setProcessingId(uid);
    const result = await approveUser(uid);
    
    if (result.success) {
      toast.success('🍍 Welcome to the Inner Circle!', {
        description: `${pendingProfiles.find(p => p.id === uid)?.username || 'User'} has been verified and welcomed to the community.`,
        duration: 5000,
      });
      
      // Remove from list
      setPendingProfiles((prev) => prev.filter((p) => p.id !== uid));
      setSelectedProfile(null);
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        verified: prev.verified + 1,
      }));
    } else {
      toast.error('Failed to approve user', {
        description: result.error,
      });
    }
    
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!selectedProfile) return;
    
    setProcessingId(selectedProfile.id);
    const result = await rejectUser(selectedProfile.id, rejectReason);
    
    if (result.success) {
      toast.info('User verification rejected', {
        description: 'User has been notified.',
      });
      
      // Remove from list
      setPendingProfiles((prev) => prev.filter((p) => p.id !== selectedProfile.id));
      setSelectedProfile(null);
      setShowRejectModal(false);
      setRejectReason('');
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        rejected: prev.rejected + 1,
      }));
    } else {
      toast.error('Failed to reject user', {
        description: result.error,
      });
    }
    
    setProcessingId(null);
  };

  const handleCreateTestUser = async () => {
    const result = await createTestPendingUser();
    if (result.success) {
      toast.success('Test user created!', {
        description: 'Refresh the page to see the new pending user.',
      });
      // Reload data
      await loadData();
    } else {
      toast.error('Failed to create test user', {
        description: result.error,
      });
    }
  };

  // Loading state
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

  // Not admin - should redirect, but show message just in case
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading text-red-400 mb-4">Access Denied</h1>
          <p className="text-offWhite/60 font-body mb-6">You don't have permission to access this page.</p>
          <Link href="/" className="text-gold hover:text-gold-light transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F172A',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#F8FAFC',
          },
        }}
      />

      {/* Header */}
      <div className="bg-darkBlue/50 border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Debug Banner - Remove in production */}
          <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 mb-4 text-sm font-mono">
            <span className="text-purple-300">🔧 Debug Mode:</span>
            <span className="text-purple-200 ml-2">
              isAdmin: {isAdmin ? '✅ true' : '❌ false'} | 
              Pending: {pendingProfiles.length} | 
              Selected: {selectedProfile ? selectedProfile.username : 'none'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Link href="/feed" className="text-gold/60 hover:text-gold text-sm font-body mb-2 inline-block">
                ← Back to Feed
              </Link>
              <h1 className="text-3xl font-heading text-gold">Admin Vetting Dashboard</h1>
              <p className="text-offWhite/60 font-body mt-1">Review and approve membership applications</p>
            </div>
            
            {/* Stats */}
            <div className="flex space-x-6">
              <div className="text-center">
                <p className="text-3xl font-heading text-yellow-400">{stats.pending}</p>
                <p className="text-offWhite/60 text-sm font-body">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-heading text-green-400">{stats.verified}</p>
                <p className="text-offWhite/60 text-sm font-body">Verified</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-heading text-red-400">{stats.rejected}</p>
                <p className="text-offWhite/60 text-sm font-body">Rejected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {pendingProfiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-heading text-gold mb-2">All Caught Up!</h2>
            <p className="text-offWhite/60 font-body">No pending verification requests at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profiles List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-heading text-gold mb-4">
                Pending Reviews ({pendingProfiles.length})
              </h2>
              
              {pendingProfiles.map((profile) => (
                <motion.button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedProfile?.id === profile.id
                      ? 'bg-gold/10 border-gold'
                      : 'bg-darkBlue/50 border-gold/20 hover:border-gold/40'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center space-x-4">
                    {profile.photoUrls[0] ? (
                      <img
                        src={profile.photoUrls[0]}
                        alt={profile.username}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gold/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/30">
                        <span className="text-gold font-heading text-xl">
                          {profile.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-offWhite font-body font-medium truncate">
                        {profile.username}
                      </p>
                      <p className="text-offWhite/50 text-sm font-body truncate">
                        {profile.accountType} • {profile.location}
                      </p>
                      <p className="text-gold/60 text-xs font-body">
                        {profile.createdAt?.toLocaleDateString() || 'Recently'}
                      </p>
                    </div>
                    {/* Quick Action Buttons */}
                    <div className="flex flex-col space-y-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(profile.id);
                        }}
                        disabled={processingId === profile.id}
                        className="p-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
                        title="Quick Approve"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfile(profile);
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === profile.id}
                        className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
                        title="Deny"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Profile Detail / VIP Review Card */}
            <div className="lg:col-span-2">
              {selectedProfile ? (
                <motion.div
                  key={selectedProfile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-darkBlue/50 rounded-2xl border border-gold/20 overflow-hidden"
                >
                  {/* VIP Badge */}
                  <div className="bg-gradient-to-r from-gold/20 to-gold/5 px-6 py-4 border-b border-gold/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">👑</span>
                        <div>
                          <h3 className="text-xl font-heading text-gold">VIP Review</h3>
                          <p className="text-offWhite/60 text-sm font-body">Membership Application</p>
                        </div>
                      </div>
                      <span className="px-4 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-body">
                        Pending Verification
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* User Info */}
                    <div className="flex items-start space-x-6 mb-8">
                      <div className="flex-shrink-0">
                        {selectedProfile.photoUrls[0] ? (
                          <img
                            src={selectedProfile.photoUrls[0]}
                            alt={selectedProfile.username}
                            className="w-24 h-24 rounded-xl object-cover border-2 border-gold/30"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gold/20 flex items-center justify-center border-2 border-gold/30">
                            <span className="text-gold font-heading text-3xl">
                              {selectedProfile.username[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-heading text-offWhite mb-2">
                          {selectedProfile.username}
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-body">
                            {selectedProfile.accountType}
                          </span>
                          <span className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-body">
                            {selectedProfile.experienceLevel}
                          </span>
                          <span className="px-3 py-1 bg-gold/10 text-offWhite/70 rounded-full text-sm font-body">
                            {selectedProfile.location}
                          </span>
                        </div>
                        <p className="text-offWhite/60 text-sm font-body">
                          Age Range: {selectedProfile.ageRangeMin || 21} - {selectedProfile.ageRangeMax || 65}
                        </p>
                      </div>
                    </div>

                    {/* Verification Documents */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {/* Live Selfie */}
                      <div>
                        <h5 className="text-sm font-body text-gold mb-3 flex items-center">
                          <span className="mr-2">📸</span> Live Selfie
                        </h5>
                        <div className="aspect-square rounded-xl overflow-hidden border border-gold/20 bg-charcoal">
                          {selectedProfile.liveSelfieUrl || selectedProfile.photoUrls[0] ? (
                            <img
                              src={selectedProfile.liveSelfieUrl || selectedProfile.photoUrls[0]}
                              alt="Live Selfie"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-offWhite/40">
                              <span className="font-body">No selfie uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ID Upload */}
                      <div>
                        <h5 className="text-sm font-body text-gold mb-3 flex items-center">
                          <span className="mr-2">🪪</span> ID Verification
                        </h5>
                        <div className="aspect-square rounded-xl overflow-hidden border border-gold/20 bg-charcoal">
                          {selectedProfile.idUploadUrl ? (
                            <img
                              src={selectedProfile.idUploadUrl}
                              alt="ID Document"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-offWhite/40 flex-col p-4">
                              <svg className="w-12 h-12 mb-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                              </svg>
                              <span className="font-body text-sm text-center">No ID uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fantasies Questionnaire */}
                    <div className="mb-8">
                      <h5 className="text-sm font-body text-gold mb-3 flex items-center">
                        <span className="mr-2">✨</span> Fantasies & Desires
                      </h5>
                      <div className="p-4 bg-charcoal rounded-xl border border-gold/10">
                        {selectedProfile.fantasies ? (
                          <p className="text-offWhite/80 font-body whitespace-pre-wrap">
                            {selectedProfile.fantasies}
                          </p>
                        ) : (
                          <p className="text-offWhite/40 font-body italic">
                            No fantasies questionnaire submitted
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Interests */}
                    {selectedProfile.interests.length > 0 && (
                      <div className="mb-8">
                        <h5 className="text-sm font-body text-gold mb-3 flex items-center">
                          <span className="mr-2">💎</span> Interests
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedProfile.interests.map((interest, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-gold/5 text-offWhite/70 rounded-full text-sm font-body border border-gold/10"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photo Gallery */}
                    {selectedProfile.photoUrls.length > 1 && (
                      <div className="mb-8">
                        <h5 className="text-sm font-body text-gold mb-3 flex items-center">
                          <span className="mr-2">🖼️</span> Photo Gallery
                        </h5>
                        <div className="grid grid-cols-4 gap-3">
                          {selectedProfile.photoUrls.slice(1).map((url, i) => (
                            <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gold/20">
                              <img
                                src={url}
                                alt={`Photo ${i + 2}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-6 border-t border-gold/10">
                      <button
                        onClick={() => handleApprove(selectedProfile.id)}
                        disabled={processingId === selectedProfile.id}
                        className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-green-600/30 hover:shadow-green-500/40"
                        data-testid="approve-btn"
                      >
                        {processingId === selectedProfile.id ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg">🍍</span>
                            <span>Approve & Welcome</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processingId === selectedProfile.id}
                        className="flex-1 py-4 bg-gradient-to-r from-red-600/80 to-red-500/80 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20 hover:shadow-red-500/30"
                        data-testid="reject-btn"
                      >
                        <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-12 bg-darkBlue/30 rounded-2xl border border-gold/10">
                  <div>
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gold/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-heading text-gold/60 mb-2">Select a Profile</h3>
                    <p className="text-offWhite/40 font-body">
                      Choose a pending application from the list to review
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
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
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors font-body"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId === selectedProfile.id}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors font-body disabled:opacity-50"
                >
                  {processingId === selectedProfile.id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function AdminVettingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading admin dashboard...</p>
        </div>
      </div>
    }>
      <AdminVettingContent />
    </Suspense>
  );
}
