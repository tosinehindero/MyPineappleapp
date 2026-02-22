'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { notifyNewPurchase } from '@/lib/notifications';
import Link from 'next/link';
import { Suspense } from 'react';

interface TransactionDetails {
  listing_id: string;
  title: string;
  price: number;
  seller_username: string;
  seller_id?: string;
  buyer_id: string;
  status: string;
  created_at: string;
  transaction_id?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionId === 'demo') {
      // Demo mode - show success UI with sample data
      setTransaction({
        listing_id: 'demo-123',
        title: 'Luxury Designer Item',
        price: 299.99,
        seller_username: 'EliteStyle',
        buyer_id: currentUser?.uid || 'demo-buyer',
        status: 'completed',
        created_at: new Date().toISOString(),
      });
      setLoading(false);
    } else if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
      setError('No session ID provided');
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/payment/status/${sessionId}`);
      const data = await response.json();

      if (data.success && data.payment_status === 'paid') {
        // Get buyer username for the notification
        let buyerUsername = 'Buyer';
        if (currentUser) {
          const buyerDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (buyerDoc.exists()) {
            buyerUsername = buyerDoc.data().username || 'Buyer';
          }
        }
        
        // Send notification to seller about the sale
        if (data.seller_id) {
          try {
            await notifyNewPurchase(
              data.seller_id,
              buyerUsername,
              data.listing_title || 'Item',
              data.amount || 0,
              data.transaction_id
            );
          } catch (notifyError) {
            console.error('Error sending sale notification:', notifyError);
            // Don't fail the payment verification if notification fails
          }
        }
        
        // Get transaction details from the response or create placeholder
        setTransaction({
          listing_id: data.listing_id || '',
          title: data.listing_title || 'Your Purchase',
          price: data.amount || 0,
          seller_username: data.seller_username || 'Seller',
          seller_id: data.seller_id,
          buyer_id: currentUser?.uid || '',
          status: 'completed',
          created_at: new Date().toISOString(),
          transaction_id: data.transaction_id,
        });
      } else if (data.status === 'pending' || data.payment_status === 'unpaid') {
        setError('Payment is still processing. Please check back shortly.');
      } else {
        setError('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Unable to verify payment. Please contact support if you were charged.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-offWhite/60 font-body text-lg">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading text-gold mb-4">Payment Status</h1>
          <p className="text-offWhite/60 font-body mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="px-6 py-3 border border-gold/30 text-gold rounded-full hover:bg-gold/10 transition-colors font-body"
            >
              Back to Marketplace
            </Link>
            <Link
              href="/messages"
              className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            >
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        {/* Success Animation */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/40"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="w-12 h-12 text-green-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <motion.path d="M5 13l4 4L19 7" />
            </motion.svg>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl md:text-4xl font-heading text-gold mb-3"
          >
            Purchase Successful!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-offWhite/60 font-body"
          >
            Thank you for your purchase. Your transaction has been completed.
          </motion.p>
        </div>

        {/* Transaction Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-darkBlue/50 rounded-2xl border border-gold/20 p-6 mb-8"
        >
          <h2 className="text-lg font-heading text-gold/80 mb-4">Order Details</h2>
          
          <div className="space-y-4">
            {transaction && (
              <>
                <div className="flex justify-between items-center pb-3 border-b border-gold/10">
                  <span className="text-offWhite/60 font-body">Item</span>
                  <span className="text-offWhite font-body font-medium">{transaction.title}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gold/10">
                  <span className="text-offWhite/60 font-body">Seller</span>
                  <span className="text-offWhite font-body">{transaction.seller_username}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gold/10">
                  <span className="text-offWhite/60 font-body">Status</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-body">
                    Completed
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-offWhite/80 font-body font-medium">Total Paid</span>
                  <span className="text-2xl font-heading text-gold">${transaction.price.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Escrow Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gold/10 rounded-xl p-4 mb-8"
        >
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h3 className="text-gold font-body font-semibold mb-1">Protected by Escrow</h3>
              <p className="text-offWhite/60 text-sm font-body">
                Your payment is held securely until you confirm receipt of your item. 
                Contact the seller to arrange delivery details.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-darkBlue/30 rounded-xl p-4 mb-8"
        >
          <h3 className="text-offWhite font-body font-semibold mb-3">What's Next?</h3>
          <ul className="space-y-2 text-offWhite/60 text-sm font-body">
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 bg-gold/20 rounded-full flex items-center justify-center text-gold text-xs">1</span>
              <span>Contact the seller via Messages to arrange delivery</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 bg-gold/20 rounded-full flex items-center justify-center text-gold text-xs">2</span>
              <span>Receive and inspect your item</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 bg-gold/20 rounded-full flex items-center justify-center text-gold text-xs">3</span>
              <span>Confirm receipt to release payment to seller</span>
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/messages"
            className="flex-1 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all text-center"
            data-testid="contact-seller-btn"
          >
            Contact Seller
          </Link>
          <Link
            href="/marketplace"
            className="flex-1 py-3 border border-gold/30 text-gold rounded-full hover:bg-gold/10 transition-colors text-center font-body"
            data-testid="continue-shopping-btn"
          >
            Continue Shopping
          </Link>
        </motion.div>

        {/* Transaction Reference */}
        {sessionId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center text-offWhite/40 text-xs font-body mt-6"
          >
            Transaction Reference: {sessionId.slice(0, 20)}...
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default function MarketplaceSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-offWhite/60 font-body text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
