'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  blockUser,
  unblockUser,
  reportUser,
  REPORT_REASONS,
  type ReportReason,
} from '@/lib/user-safety';

interface BlockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
  currentUserId: string;
  isBlocked: boolean;
  onBlockStatusChange: (blocked: boolean) => void;
}

export default function BlockReportModal({
  isOpen,
  onClose,
  targetUserId,
  targetUsername,
  currentUserId,
  isBlocked,
  onBlockStatusChange,
}: BlockReportModalProps) {
  const [activeTab, setActiveTab] = useState<'block' | 'report'>('block');
  const [loading, setLoading] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBlock = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isBlocked) {
        const result = await unblockUser(currentUserId, targetUserId);
        if (result.success) {
          onBlockStatusChange(false);
          setSuccess(`You have unblocked ${targetUsername}`);
        } else {
          setError(result.error || 'Failed to unblock user');
        }
      } else {
        const result = await blockUser(currentUserId, targetUserId);
        if (result.success) {
          onBlockStatusChange(true);
          setSuccess(`You have blocked ${targetUsername}. They can no longer see your profile or message you.`);
        } else {
          setError(result.error || 'Failed to block user');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason) {
      setError('Please select a reason for your report');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await reportUser(currentUserId, targetUserId, reportReason, reportDetails);
      if (result.success) {
        setSuccess('Thank you for your report. Our team will review it shortly.');
        setReportReason('');
        setReportDetails('');
      } else {
        setError(result.error || 'Failed to submit report');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    setReportReason('');
    setReportDetails('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-darkBlue border border-gold/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gold/10">
            <h2 className="font-heading text-gold text-lg">Safety Options</h2>
            <button
              onClick={handleClose}
              className="text-offWhite/60 hover:text-offWhite transition-colors"
            >
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gold/10">
            <button
              onClick={() => setActiveTab('block')}
              className={`flex-1 py-3 text-sm font-body transition-colors ${
                activeTab === 'block'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-offWhite/60 hover:text-gold'
              }`}
            >
              {isBlocked ? 'Unblock' : 'Block'} User
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 py-3 text-sm font-body transition-colors ${
                activeTab === 'report'
                  ? 'text-gold border-b-2 border-gold'
                  : 'text-offWhite/60 hover:text-gold'
              }`}
            >
              Report User
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm font-body">{success}</p>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm font-body">{error}</p>
              </div>
            )}

            {activeTab === 'block' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h3 className="text-offWhite font-body font-semibold mb-2">
                    {isBlocked ? `Unblock ${targetUsername}?` : `Block ${targetUsername}?`}
                  </h3>
                  <p className="text-offWhite/60 text-sm font-body">
                    {isBlocked
                      ? 'They will be able to see your profile and send you messages again.'
                      : 'They won\'t be able to see your profile, send you messages, or find you in search results.'}
                  </p>
                </div>

                <button
                  onClick={handleBlock}
                  disabled={loading}
                  className={`w-full py-3 rounded-full font-semibold transition-all disabled:opacity-50 ${
                    isBlocked
                      ? 'bg-gold/20 text-gold hover:bg-gold/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                  data-testid={isBlocked ? 'unblock-btn' : 'block-btn'}
                >
                  {loading ? 'Processing...' : isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-offWhite/60 text-sm font-body">
                  Help us keep PineapplePlay safe. Reports are confidential.
                </p>

                {/* Report Reason */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">
                    Why are you reporting this user?
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          reportReason === reason.value
                            ? 'bg-gold/20 border border-gold/30'
                            : 'bg-white/[0.03] border border-white/10 hover:border-gold/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason.value}
                          checked={reportReason === reason.value}
                          onChange={(e) => setReportReason(e.target.value as ReportReason)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                          reportReason === reason.value ? 'border-gold' : 'border-offWhite/40'
                        }`}>
                          {reportReason === reason.value && (
                            <div className="w-2 h-2 rounded-full bg-gold" />
                          )}
                        </div>
                        <span className="text-offWhite text-sm font-body">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <label className="block text-offWhite/80 text-sm font-body mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide any additional context..."
                    rows={3}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>

                <button
                  onClick={handleReport}
                  disabled={loading || !reportReason}
                  className="w-full py-3 bg-gold text-charcoal rounded-full font-semibold hover:shadow-gold-glow transition-all disabled:opacity-50"
                  data-testid="submit-report-btn"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
