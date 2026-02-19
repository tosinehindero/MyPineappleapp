'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  getProfile,
  updateProfile,
  toggleFavorite,
  checkIsFavorite,
} from '../actions';
import Link from 'next/link';
import PrivacyProtection from './PrivacyProtection';
import WatermarkedImage from './WatermarkedImage';

interface ProfileData {
  id: string;
  username: string;
  accountType: string;
  experienceLevel: string;
  location: string;
  interests: string[];
  lookingFor: string[];
  description: string;
  fantasies: string;
  photoUrls: string[];
  isVerified?: boolean;
  ageRangeMin?: number;
  ageRangeMax?: number;
}

interface ProfilePageProps {
  profileId: string;
}

export default function ProfilePage({ profileId }: ProfilePageProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVettingModal, setShowVettingModal] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editFantasies, setEditFantasies] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  const isOwner = currentUser?.uid === profileId;
  const shouldBlur = isRestricted && !isOwner;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Get user's verification status from their profile
        const { getUserVerificationStatus } = await import('../app/profile/actions');
        const verificationResult = await getUserVerificationStatus(user.uid);
        setIsVerified(verificationResult.isVerified || false);
        
        // Check if favorite
        const favResult = await checkIsFavorite(user.uid, profileId);
        if (favResult.success) {
          setIsFavorite(favResult.isFavorite);
        }
      }
    });
    return () => unsubscribe();
  }, [profileId]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const result = await getProfile(
        profileId,
        currentUser?.uid,
        isVerified
      );
      
      if (result.success && result.data) {
        setProfile(result.data as ProfileData);
        setIsRestricted(result.restricted || false);
        setEditDescription(result.data.description || '');
        setEditFantasies(result.data.fantasies || '');
      }
      setLoading(false);
    };
    
    if (currentUser !== null) {
      loadProfile();
    }
  }, [profileId, currentUser, isVerified]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      router.push('/register');
      return;
    }

    const result = await toggleFavorite(currentUser.uid, profileId);
    if (result.success) {
      setIsFavorite(result.isFavorite);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile(profileId, {
      description: editDescription,
      fantasies: editFantasies,
    });

    if (result.success) {
      setProfile((prev) =>
        prev
          ? { ...prev, description: editDescription, fantasies: editFantasies }
          : null
      );
      setShowEditModal(false);
    }
    setSaving(false);
  };

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'Intermediate':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Seasoned/Pro':
        return 'bg-gold/20 text-gold border-gold/40';
      default:
        return 'bg-gold/20 text-gold border-gold/40';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite font-body">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-heading text-gold mb-4">Profile Not Found</h2>
          <Link
            href="/map"
            className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Full-Width Header with Photo Background */}
      <div className="relative h-96 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: profile.photoUrls[0]
              ? `url(${profile.photoUrls[0]})`
              : 'linear-gradient(135deg, #0F172A 0%, #121212 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/70 to-charcoal"></div>

        {/* Profile Header Content */}
        <div className="relative h-full flex items-end">
          <div className="w-full px-6 pb-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-heading text-offWhite">
                  {profile.username}
                </h1>
                {profile.isVerified && (
                  <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center shadow-gold-glow">
                    <svg
                      className="w-6 h-6 text-charcoal"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <span
                  className={`px-4 py-1.5 border rounded-full text-sm font-semibold ${getExperienceBadgeColor(
                    profile.experienceLevel
                  )}`}
                >
                  {profile.experienceLevel}
                </span>
              </div>

              <div className="flex items-center space-x-6 text-offWhite/80">
                <span className="flex items-center space-x-2">
                  <span>📍</span>
                  <span className="font-body">{profile.location}</span>
                </span>
                <span className="font-body">{profile.accountType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Section */}
            <div className="glass-morphism rounded-2xl p-6">
              <h2 className="text-xl font-heading text-gold mb-4">About</h2>
              <div className={shouldBlur ? 'filter blur-md' : ''}>
                <p className="text-offWhite/90 font-body leading-relaxed">
                  {profile.description}
                </p>
              </div>
            </div>

            {/* Lifestyle Interests */}
            <div className="glass-morphism rounded-2xl p-6">
              <h2 className="text-xl font-heading text-gold mb-4">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-4 py-2 border border-gold/40 text-gold rounded-full text-sm font-body hover:bg-gold/10 transition-colors"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div className="glass-morphism rounded-2xl p-6">
              <h2 className="text-xl font-heading text-gold mb-4">Looking For</h2>
              <div className="flex flex-wrap gap-2">
                {profile.lookingFor.map((item) => (
                  <span
                    key={item}
                    className="px-4 py-2 bg-gold/10 border border-gold/30 text-offWhite rounded-full text-sm font-body"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Fantasies & Experiences */}
            <div className="glass-morphism rounded-2xl p-6">
              <h2 className="text-xl font-heading text-gold mb-4">
                Fantasies & Experiences
              </h2>
              <div className={shouldBlur ? 'filter blur-md' : ''}>
                <p className="text-offWhite/90 font-body leading-relaxed">
                  {profile.fantasies}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Photo Gallery */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-heading text-gold mb-6">Photo Gallery</h2>

            {/* Masonry Grid */}
            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${
                shouldBlur ? 'filter blur-md' : ''
              }`}
            >
              {profile.photoUrls.map((url, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group cursor-pointer"
                  style={{ aspectRatio: '1' }}
                >
                  <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-gold/20 hover:border-gold/60 transition-colors">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-contain bg-darkBlue"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                </motion.div>
              ))}
            </div>

            {profile.photoUrls.length === 0 && (
              <div className="text-center py-12 glass-morphism rounded-2xl">
                <p className="text-offWhite/60 font-body">No photos available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-darkBlue/95 backdrop-blur-md border-t border-gold/20 py-4 px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isOwner && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push(`/messages?userId=${profileId}`)}
                  className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Message</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleFavorite}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isFavorite
                      ? 'bg-gold text-charcoal'
                      : 'bg-gold/20 text-gold hover:bg-gold/30'
                  }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </motion.button>
              </>
            )}

            {isOwner && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEditModal(true)}
                className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Profile</span>
              </motion.button>
            )}
          </div>

          {shouldBlur && (
            <button
              onClick={() => setShowVettingModal(true)}
              className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Why is content blurred?</span>
            </button>
          )}
        </div>
      </div>

      {/* Vetting Wall Modal */}
      <AnimatePresence>
        {showVettingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/90 backdrop-blur-md flex items-center justify-center z-50 p-6"
            onClick={() => setShowVettingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-morphism rounded-2xl p-8 max-w-md w-full border-2 border-gold/30"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold">
                  <svg
                    className="w-10 h-10 text-gold"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-heading text-gold mb-4">
                  Membership Vetting Required
                </h3>
                <p className="text-offWhite/80 font-body mb-6 leading-relaxed">
                  To view private details and access full profiles, your membership must be
                  verified. This ensures the safety and exclusivity of our community.
                </p>
                <button
                  onClick={() => setShowVettingModal(false)}
                  className="w-full px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-charcoal/90 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-morphism rounded-2xl p-8 max-w-2xl w-full my-8"
            >
              <h3 className="text-2xl font-heading text-gold mb-6">Edit Profile</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-gold font-body mb-2">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-gold font-body mb-2">
                    Fantasies & Experiences
                  </label>
                  <textarea
                    value={editFantasies}
                    onChange={(e) => setEditFantasies(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
                    placeholder="Share your desires and experiences..."
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Padding for Action Bar */}
      <div className="h-24"></div>
    </div>
  );
}
