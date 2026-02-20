'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import VettingGuard from '@/components/VettingGuard';

interface Listing {
  listing_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  seller_id: string;
  seller_username: string;
  status: string;
  created_at: string;
  views: number;
}

const CATEGORIES = [
  'All',
  'Apparel',
  'Lingerie',
  'Accessories',
  'Toys',
  'Books & Media',
  'Art & Decor',
  'Other',
];

const CONDITIONS = [
  { value: 'new', label: 'New', color: 'text-green-400' },
  { value: 'like_new', label: 'Like New', color: 'text-blue-400' },
  { value: 'good', label: 'Good', color: 'text-yellow-400' },
  { value: 'fair', label: 'Fair', color: 'text-orange-400' },
];

export default function MarketplacePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Get user profile
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch listings
  useEffect(() => {
    fetchListings();
  }, [selectedCategory]);

  const fetchListings = async () => {
    try {
      let url = `${BACKEND_URL}/api/marketplace/listings`;
      if (selectedCategory !== 'All') {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const handlePurchase = async (listing: Listing) => {
    if (!currentUser) {
      toast.error('Please sign in to make a purchase');
      return;
    }

    if (listing.seller_id === currentUser.uid) {
      toast.error("You can't purchase your own listing");
      return;
    }

    setPurchasing(listing.listing_id);

    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.listing_id,
          buyer_id: currentUser.uid,
          buyer_email: currentUser.email,
          origin_url: window.location.origin,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error(data.detail || 'Failed to initiate purchase');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const getConditionStyle = (condition: string) => {
    const cond = CONDITIONS.find(c => c.value === condition);
    return cond?.color || 'text-offWhite/60';
  };

  const getConditionLabel = (condition: string) => {
    const cond = CONDITIONS.find(c => c.value === condition);
    return cond?.label || condition;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading marketplace...</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gold/60 hover:text-gold transition-colors">
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-heading text-gold">Lifestyle Gear</h1>
                <p className="text-offWhite/60 font-body">Member Marketplace</p>
              </div>
            </div>

            {currentUser && (
              <div className="flex items-center space-x-4">
                <Link
                  href="/marketplace/my-listings"
                  className="px-4 py-2 border border-gold/30 text-gold rounded-full hover:bg-gold/10 transition-colors font-body text-sm"
                >
                  My Listings
                </Link>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                  data-testid="create-listing-btn"
                >
                  + Sell Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-body transition-all ${
                selectedCategory === category
                  ? 'bg-gold text-charcoal'
                  : 'bg-gold/10 text-gold/80 hover:bg-gold/20'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Escrow Notice */}
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-green-400 font-body text-sm font-medium">Secure Escrow Protection</p>
            <p className="text-green-400/70 text-xs font-body">Your payment is held safely until you confirm delivery</p>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gold/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-heading text-gold/60 mb-2">No Listings Yet</h2>
            <p className="text-offWhite/40 font-body mb-6">Be the first to list an item!</p>
            {currentUser && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
              >
                Create First Listing
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <motion.div
                key={listing.listing_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-darkBlue/50 rounded-2xl overflow-hidden border border-gold/20 hover:border-gold/40 transition-all group"
              >
                {/* Image */}
                <div className="aspect-square bg-charcoal relative overflow-hidden">
                  {listing.images && listing.images[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gold/20" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Condition Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 bg-charcoal/90 rounded-full text-xs font-body ${getConditionStyle(listing.condition)}`}>
                      {getConditionLabel(listing.condition)}
                    </span>
                  </div>

                  {/* Report Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedListing(listing);
                      setShowReportModal(true);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-charcoal/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                    title="Report Listing"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </button>
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-heading text-offWhite line-clamp-1">{listing.title}</h3>
                    <span className="text-xl font-heading text-gold">${listing.price}</span>
                  </div>
                  
                  <p className="text-offWhite/50 text-sm font-body line-clamp-2 mb-3">
                    {listing.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-offWhite/40 text-xs font-body">
                      by {listing.seller_username}
                    </span>
                    <span className="text-offWhite/40 text-xs font-body flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {listing.views}
                    </span>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handlePurchase(listing)}
                    disabled={purchasing === listing.listing_id || listing.seller_id === currentUser?.uid}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${
                      listing.seller_id === currentUser?.uid
                        ? 'bg-gold/20 text-gold/50 cursor-not-allowed'
                        : 'bg-gold text-charcoal hover:shadow-gold-glow'
                    }`}
                  >
                    {purchasing === listing.listing_id ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : listing.seller_id === currentUser?.uid ? (
                      <span>Your Listing</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Buy Now</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchListings();
          toast.success('Listing created successfully!');
        }}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        currentUser={currentUser}
        onSuccess={() => {
          setShowReportModal(false);
          setSelectedListing(null);
          toast.success('Report submitted. We will review it shortly.');
        }}
      />
    </div>
  );
}

// Create Listing Modal Component
function CreateListingModal({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: any;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Other',
    condition: 'new',
  });
  const [submitting, setSubmitting] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          seller_id: currentUser.uid,
          seller_username: userProfile?.username || currentUser.email,
          images: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
        setFormData({ title: '', description: '', price: '', category: 'Other', condition: 'new' });
      }
    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-heading text-gold mb-6">Create Listing</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
                placeholder="What are you selling?"
                required
              />
            </div>

            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold h-24 resize-none"
                placeholder="Describe your item..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-offWhite/80 text-sm font-body mb-2">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-offWhite/80 text-sm font-body mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
                >
                  {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Condition</label>
              <div className="grid grid-cols-4 gap-2">
                {CONDITIONS.map((cond) => (
                  <button
                    key={cond.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: cond.value })}
                    className={`py-2 rounded-lg text-sm font-body transition-all ${
                      formData.condition === cond.value
                        ? 'bg-gold text-charcoal'
                        : 'bg-gold/10 text-offWhite/70 hover:bg-gold/20'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3% Fee Notice */}
            <div className="bg-gold/10 rounded-xl p-4">
              <p className="text-gold/80 text-sm font-body">
                <strong>Platform Fee:</strong> 3% of the sale price will be deducted to support the community.
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors font-body"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gold text-charcoal font-semibold rounded-xl hover:shadow-gold-glow transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Report Modal Component
function ReportModal({
  isOpen,
  onClose,
  listing,
  currentUser,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  currentUser: any;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  const REPORT_REASONS = [
    'Prohibited item',
    'Misleading description',
    'Suspected fraud',
    'Inappropriate content',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !listing) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.listing_id,
          reporter_id: currentUser.uid,
          reason,
          details,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
        setReason('');
        setDetails('');
      }
    } catch (error) {
      console.error('Error reporting listing:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !listing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-heading text-gold mb-2">Report Listing</h2>
          <p className="text-offWhite/60 text-sm font-body mb-6">
            Report "{listing.title}" for review
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
                required
              >
                <option value="">Select a reason</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold h-24 resize-none"
                placeholder="Provide additional details..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors font-body"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
