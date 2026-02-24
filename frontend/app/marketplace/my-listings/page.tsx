'use client';

import { useState, useEffect, useRef } from 'react';
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
  featured?: boolean;
  featured_at?: string;
}

const CATEGORIES = [
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

export default function MyListingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
        fetchMyListings(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchMyListings = async (userId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/my-listings/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load your listings');
    }
  };

  const handleDelete = async () => {
    if (!selectedListing || !currentUser) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/marketplace/listings/${selectedListing.listing_id}?seller_id=${currentUser.uid}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Listing deleted successfully');
        setListings(listings.filter(l => l.listing_id !== selectedListing.listing_id));
        setShowDeleteModal(false);
        setSelectedListing(null);
      } else {
        toast.error(data.detail || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (listing: Listing) => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/marketplace/listings/${listing.listing_id}/toggle-featured`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seller_id: currentUser.uid }),
        }
      );
      const data = await response.json();

      if (data.success) {
        // Update local state
        setListings(listings.map(l => 
          l.listing_id === listing.listing_id 
            ? { ...l, featured: data.featured } 
            : l
        ));
        toast.success(data.featured ? 'Listing marked as featured!' : 'Listing unfeatured');
      } else {
        toast.error(data.detail || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update featured status');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' };
      case 'sold':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sold' };
      case 'pending':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' };
      case 'deleted':
        return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Deleted' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading your listings...</p>
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
                  <h1 className="text-3xl font-heading text-gold">My Listings</h1>
                  <p className="text-offWhite/60 font-body">Manage your marketplace items</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Link
                  href="/marketplace/transactions"
                  className="px-4 py-2 border border-gold/30 text-gold rounded-full hover:bg-gold/10 transition-colors font-body text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  History
                </Link>
                <Link
                  href="/marketplace"
                  className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                  data-testid="create-new-listing-btn"
                >
                  + New Listing
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-3xl font-heading text-gold">{listings.length}</p>
              <p className="text-offWhite/60 text-sm font-body">Total Listings</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-3xl font-heading text-green-400">
                {listings.filter(l => l.status === 'active').length}
              </p>
              <p className="text-offWhite/60 text-sm font-body">Active</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-3xl font-heading text-blue-400">
                {listings.filter(l => l.status === 'sold').length}
              </p>
              <p className="text-offWhite/60 text-sm font-body">Sold</p>
            </div>
            <div className="bg-darkBlue/50 rounded-xl border border-gold/20 p-4 text-center">
              <p className="text-3xl font-heading text-offWhite">
                {listings.reduce((sum, l) => sum + (l.views || 0), 0)}
              </p>
              <p className="text-offWhite/60 text-sm font-body">Total Views</p>
            </div>
          </div>

          {/* Listings Grid */}
          {listings.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gold/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-heading text-gold/60 mb-2">No Listings Yet</h2>
              <p className="text-offWhite/40 font-body mb-6">Start selling by creating your first listing!</p>
              <Link
                href="/marketplace"
                className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
              >
                Create Your First Listing
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => {
                const statusBadge = getStatusBadge(listing.status);
                return (
                  <motion.div
                    key={listing.listing_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-darkBlue/50 rounded-2xl border border-gold/20 overflow-hidden hover:border-gold/40 transition-all"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Image */}
                      <div className="w-full md:w-48 h-48 md:h-auto bg-charcoal flex-shrink-0 relative">
                        {listing.images && listing.images[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gold/20" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {/* Featured Badge on Image */}
                        {listing.featured && (
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-charcoal rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Featured
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-heading text-offWhite">{listing.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-body ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="text-offWhite/60 text-sm font-body line-clamp-2 mb-3">
                              {listing.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className="text-gold font-heading text-xl">${listing.price}</span>
                              <span className="text-offWhite/40 font-body">{listing.category}</span>
                              <span className={`font-body ${getConditionStyle(listing.condition)}`}>
                                {getConditionLabel(listing.condition)}
                              </span>
                              <span className="text-offWhite/40 font-body flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {listing.views} views
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Featured Toggle Button */}
                            <button
                              onClick={() => handleToggleFeatured(listing)}
                              disabled={listing.status !== 'active'}
                              className={`px-4 py-2 rounded-lg font-body text-sm transition-all flex items-center gap-2 ${
                                listing.featured
                                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 text-yellow-400 hover:from-yellow-500/30 hover:to-amber-500/30'
                                  : 'border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              data-testid={`toggle-featured-${listing.listing_id}`}
                              title={listing.featured ? 'Remove from featured' : 'Mark as featured'}
                            >
                              <svg className="w-4 h-4" fill={listing.featured ? 'currentColor' : 'none'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              {listing.featured ? 'Featured' : 'Feature'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setShowEditModal(true);
                              }}
                              disabled={listing.status === 'sold' || listing.status === 'deleted'}
                              className="px-4 py-2 border border-gold/30 text-gold rounded-lg hover:bg-gold/10 transition-colors font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              data-testid={`edit-listing-${listing.listing_id}`}
                            >
                              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setShowDeleteModal(true);
                              }}
                              disabled={listing.status === 'sold' || listing.status === 'deleted'}
                              className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              data-testid={`delete-listing-${listing.listing_id}`}
                            >
                              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <EditListingModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
          currentUser={currentUser}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedListing(null);
            if (currentUser) fetchMyListings(currentUser.uid);
            toast.success('Listing updated successfully');
          }}
        />

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && selectedListing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-heading text-gold mb-2">Delete Listing?</h2>
                  <p className="text-offWhite/60 font-body">
                    Are you sure you want to delete "{selectedListing.title}"? This action cannot be undone.
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedListing(null);
                    }}
                    className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors font-body"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Listing'
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </VettingGuard>
  );
}

// Edit Listing Modal Component
function EditListingModal({
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Other',
    condition: 'new',
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // Populate form when listing changes
  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title,
        description: listing.description,
        price: listing.price.toString(),
        category: listing.category,
        condition: listing.condition,
      });
      setExistingImages(listing.images || []);
      setNewImages([]);
      setNewImagePreviews([]);
    }
  }, [listing]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;
    
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        return false;
      }
      return true;
    });

    setNewImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    if (newImages.length === 0) return [];

    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('@/lib/firebase');
    
    const uploadedUrls: string[] = [];
    const totalImages = newImages.length;

    for (let i = 0; i < newImages.length; i++) {
      const file = newImages[i];
      const fileName = `marketplace/${currentUser.uid}/${Date.now()}_${i}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
      
      setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !listing) return;

    setSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Upload new images
      const uploadedImageUrls = await uploadNewImages();
      const allImages = [...existingImages, ...uploadedImageUrls];

      const response = await fetch(`${BACKEND_URL}/api/marketplace/listings/${listing.listing_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          seller_id: currentUser.uid,
          images: allImages,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        toast.error(data.detail || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const totalImages = existingImages.length + newImages.length;

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
          className="bg-darkBlue rounded-2xl border border-gold/20 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-heading text-gold mb-6">Edit Listing</h2>

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

            {/* Image Management */}
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">Photos ({totalImages}/5)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              
              <div className="grid grid-cols-5 gap-2 mb-2">
                {/* Existing Images */}
                {existingImages.map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gold/20">
                    <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                    >
                      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* New Image Previews */}
                {newImagePreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-green-500/40">
                    <img src={preview} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 px-1 bg-green-500 rounded text-white text-xs">New</div>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                    >
                      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* Add Button */}
                {totalImages < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gold/30 flex flex-col items-center justify-center text-gold/60 hover:border-gold/60 hover:text-gold transition-colors"
                  >
                    <svg className="w-6 h-6 mb-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs">Add</span>
                  </button>
                )}
              </div>
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
                  {CATEGORIES.map((cat) => (
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

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 border border-gold/30 text-offWhite/80 rounded-xl hover:border-gold/60 transition-colors font-body disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gold text-charcoal font-semibold rounded-xl hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
