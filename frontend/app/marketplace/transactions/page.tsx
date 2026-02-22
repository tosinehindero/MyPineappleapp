'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import VettingGuard from '@/components/VettingGuard';

interface Transaction {
  transaction_id: string;
  listing_id: string;
  listing_title: string;
  buyer_id: string;
  buyer_username: string;
  seller_id: string;
  seller_username: string;
  amount: number;
  platform_fee: number;
  seller_amount: number;
  payment_status: string;
  escrow_status: string;
  session_id: string;
  created_at: string;
  paid_at?: string;
  delivered_at?: string;
}

type TabType = 'all' | 'purchases' | 'sales';

export default function TransactionsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [confirmingDelivery, setConfirmingDelivery] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
        fetchTransactions(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchTransactions = async (userId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/transactions/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const confirmDelivery = async (transactionId: string) => {
    if (!currentUser) return;
    
    setConfirmingDelivery(transactionId);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/marketplace/confirm-delivery/${transactionId}?buyer_id=${currentUser.uid}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Delivery confirmed! Payment released to seller.');
        fetchTransactions(currentUser.uid);
      } else {
        toast.error(data.detail || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(null);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'purchases') return t.buyer_id === currentUser?.uid;
    if (activeTab === 'sales') return t.seller_id === currentUser?.uid;
    return true;
  });

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.escrow_status === 'released') {
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' };
    }
    if (transaction.escrow_status === 'held') {
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'In Escrow' };
    }
    if (transaction.payment_status === 'paid') {
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Paid' };
    }
    if (transaction.payment_status === 'pending') {
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Pending' };
    }
    return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Unknown' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    totalPurchases: transactions.filter(t => t.buyer_id === currentUser?.uid).length,
    totalSales: transactions.filter(t => t.seller_id === currentUser?.uid).length,
    totalSpent: transactions
      .filter(t => t.buyer_id === currentUser?.uid && t.payment_status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0),
    totalEarned: transactions
      .filter(t => t.seller_id === currentUser?.uid && t.escrow_status === 'released')
      .reduce((sum, t) => sum + t.seller_amount, 0),
    inEscrow: transactions
      .filter(t => t.seller_id === currentUser?.uid && t.escrow_status === 'held')
      .reduce((sum, t) => sum + t.seller_amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <VettingGuard>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/marketplace" className="text-gold/60 hover:text-gold transition-colors">
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-heading text-gold">Transaction History</h1>
                  <p className="text-offWhite/60 font-body">Track your purchases and sales</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-2xl font-heading text-gold">{stats.totalPurchases}</p>
              <p className="text-offWhite/60 text-sm font-body">Purchases</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-2xl font-heading text-green-400">{stats.totalSales}</p>
              <p className="text-offWhite/60 text-sm font-body">Sales</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-2xl font-heading text-offWhite">${stats.totalSpent.toFixed(2)}</p>
              <p className="text-offWhite/60 text-sm font-body">Total Spent</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-2xl font-heading text-green-400">${stats.totalEarned.toFixed(2)}</p>
              <p className="text-offWhite/60 text-sm font-body">Earned</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-2xl font-heading text-blue-400">${stats.inEscrow.toFixed(2)}</p>
              <p className="text-offWhite/60 text-sm font-body">In Escrow</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6">
            {(['all', 'purchases', 'sales'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full font-body text-sm transition-all ${
                  activeTab === tab
                    ? 'bg-gold text-charcoal'
                    : 'bg-gold/10 text-offWhite/70 hover:bg-gold/20'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab === 'all' ? 'All Transactions' : tab === 'purchases' ? 'My Purchases' : 'My Sales'}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gold/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-heading text-gold/60 mb-2">No Transactions Yet</h2>
              <p className="text-offWhite/40 font-body mb-6">
                {activeTab === 'purchases' 
                  ? "You haven't made any purchases yet." 
                  : activeTab === 'sales'
                  ? "You haven't made any sales yet."
                  : "Start buying or selling to see your transaction history."}
              </p>
              <Link
                href="/marketplace"
                className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
              >
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredTransactions.map((transaction) => {
                  const isBuyer = transaction.buyer_id === currentUser?.uid;
                  const isSeller = transaction.seller_id === currentUser?.uid;
                  const statusBadge = getStatusBadge(transaction);
                  const canConfirmDelivery = isBuyer && transaction.escrow_status === 'held';

                  return (
                    <motion.div
                      key={transaction.transaction_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-darkBlue/50 rounded-2xl border border-gold/20 overflow-hidden hover:border-gold/40 transition-all"
                    >
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          {/* Left Section - Transaction Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {/* Type Badge */}
                              <span className={`px-3 py-1 rounded-full text-xs font-body ${
                                isBuyer 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {isBuyer ? 'Purchase' : 'Sale'}
                              </span>
                              {/* Status Badge */}
                              <span className={`px-3 py-1 rounded-full text-xs font-body ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                            </div>

                            <h3 className="text-xl font-heading text-offWhite mb-2">
                              {transaction.listing_title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-offWhite/60 font-body">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {isBuyer ? `Seller: ${transaction.seller_username}` : `Buyer: ${transaction.buyer_username}`}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(transaction.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Right Section - Amount & Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-heading text-gold">
                                {isBuyer ? `-$${(transaction.amount || 0).toFixed(2)}` : `+$${(transaction.seller_amount || 0).toFixed(2)}`}
                              </p>
                              {isSeller && (transaction.platform_fee || 0) > 0 && (
                                <p className="text-xs text-offWhite/40 font-body">
                                  Fee: ${(transaction.platform_fee || 0).toFixed(2)}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              {canConfirmDelivery && (
                                <button
                                  onClick={() => confirmDelivery(transaction.transaction_id)}
                                  disabled={confirmingDelivery === transaction.transaction_id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-body text-sm disabled:opacity-50 flex items-center gap-2"
                                  data-testid={`confirm-delivery-${transaction.transaction_id}`}
                                >
                                  {confirmingDelivery === transaction.transaction_id ? (
                                    <>
                                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Confirming...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M5 13l4 4L19 7" />
                                      </svg>
                                      Confirm Delivery
                                    </>
                                  )}
                                </button>
                              )}
                              <Link
                                href="/messages"
                                className="px-4 py-2 border border-gold/30 text-gold rounded-lg hover:bg-gold/10 transition-colors font-body text-sm flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Message
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Escrow Info Banner */}
                        {transaction.escrow_status === 'held' && (
                          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <div className="flex items-start space-x-2">
                              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <p className="text-blue-400/80 text-sm font-body">
                                {isBuyer 
                                  ? "Payment is held in escrow. Click 'Confirm Delivery' once you receive the item to release payment to the seller."
                                  : "Payment is held in escrow until the buyer confirms delivery."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Completed Banner */}
                        {transaction.escrow_status === 'released' && (
                          <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="flex items-center space-x-2">
                              <svg className="w-5 h-5 text-green-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-green-400/80 text-sm font-body">
                                Transaction completed on {transaction.delivered_at ? formatDate(transaction.delivered_at) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </VettingGuard>
  );
}
