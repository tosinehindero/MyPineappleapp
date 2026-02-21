'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  getProfileClient,
  updateProfileClient,
  toggleFavoriteClient,
  checkIsFavoriteClient,
  getUserVerificationStatusClient,
} from '@/lib/profile-client';
import { recordProfileView } from '@/app/views/actions';
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
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVettingModal, setShowVettingModal] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editFantasies, setEditFantasies] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [viewerUsername, setViewerUsername] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const isOwner = currentUser?.uid === profileId;
  const shouldBlur = isRestricted && !isOwner;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
      setCurrentUser(user);
      if (user) {
        const verificationResult = await getUserVerificationStatusClient(user.uid);
        setIsVerified(verificationResult.isVerified || false);
        
        const viewerProfileResult = await getProfileClient(user.uid, user.uid, true);
        if (viewerProfileResult.success && viewerProfileResult.data) {
          const username = viewerProfileResult.data.username || user.email || 'Member';
          setViewerUsername(username);
          
          if (user.uid !== profileId) {
            await recordProfileView(
              user.uid,
              username,
              viewerProfileResult.data.photoUrls?.[0] || null,
              profileId
            );
          }
        }
        
        const favResult = await checkIsFavoriteClient(user.uid, profileId);
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
      setLoadError(null);
      
      try {
        console.log('🍍 Loading profile:', profileId, '| Current user:', currentUser?.uid);
        
        // For own profile, always allow loading (bypass verification check)
        const isOwnProfile = currentUser?.uid === profileId;
        
        const result = await getProfileClient(
          profileId,
          currentUser?.uid,
          isOwnProfile ? true : isVerified // Bypass verification for own profile
        );
        
        console.log('🍍 Profile load result:', result.success, result.data?.username);
        
        if (result.success && result.data) {
          setProfile(result.data as ProfileData);
          // Don't blur own profile
          setIsRestricted(isOwnProfile ? false : (result.restricted || false));
          setEditDescription(result.data.description || '');
          setEditFantasies(result.data.fantasies || '');
        } else {
          setLoadError(result.error || 'Profile not found');
        }
      } catch (error: any) {
        console.error('Profile load error:', error);
        setLoadError(error.message || 'Failed to load profile');
      }
      
      setLoading(false);
    };

    // Add loading timeout
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('🍍 Profile loading timeout');
        setLoading(false);
        setLoadError('Loading timed out. Please try again.');
      }
    }, 5000);
    
    // Load profile if auth is checked
    if (authChecked) {
      if (currentUser) {
        loadProfile();
      } else {
        // Not logged in - redirect after short delay
        setTimeout(() => router.push('/login'), 100);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [profileId, currentUser, isVerified, router, authChecked]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      router.push('/register');
      return;
    }

    const result = await toggleFavoriteClient(currentUser.uid, profileId);
    if (result.success && result.isFavorite !== undefined) {
      setIsFavorite(result.isFavorite);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfileClient(profileId, {
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

  // Loading state with timeout message
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite font-body">Loading profile...</p>
          <p className="text-offWhite/40 font-body text-sm mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // Error state with back button
  if (loadError) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <span className="text-5xl mb-4 block">😕</span>
          <h2 className="text-2xl font-heading text-gold mb-4">Unable to Load Profile</h2>
          <p className="text-offWhite/70 font-body mb-6">{loadError}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gold/20 text-gold border border-gold/40 rounded-full hover:bg-gold/30 transition-all font-body"
            >
              Try Again
            </button>
            <Link
              href="/feed"
              className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            >
              Back to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="text-center">
          <span className="text-5xl mb-4 block">🍍</span>
          <h2 className="text-2xl font-heading text-gold mb-4">Profile Not Found</h2>
          <p className="text-offWhite/70 font-body mb-6">This profile doesn't exist or may have been removed.</p>
          <Link
            href="/feed"
            className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  // Get cover and profile photos
  const coverPhoto = profile.photoUrls[0] || null;
  const profilePhoto = profile.photoUrls[0] || null;
  const galleryPhotos = profile.photoUrls.slice(1);

  return (
    <PrivacyProtection viewerUsername={viewerUsername} showWarning={!isOwner}>
      <div className="min-h-screen bg-charcoal">
        {/* Large Cover Photo Header */}
        <div className="relative h-72 md:h-96 overflow-hidden">
          {/* Cover Image */}
          {coverPhoto ? (
            <div
              className="absolute inset-0 bg-cover bg-center transform scale-105"
              style={{
                backgroundImage: `url(${coverPhoto})`,
                filter: shouldBlur ? 'blur(20px)' : 'none',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-darkBlue via-charcoal to-darkBlue" />
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/30 via-charcoal/50 to-charcoal"></div>
          
          {/* Back Button */}
          <div className="absolute top-6 left-6 z-10">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-charcoal/60 backdrop-blur-md rounded-full text-offWhite/80 hover:text-gold transition-colors border border-gold/20"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-body text-sm">Back</span>
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10 pb-32">
          {/* Profile Header Card */}
          <div className="bg-darkBlue/80 backdrop-blur-xl rounded-2xl border border-gold/20 p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-6">
              {/* Circular Profile Picture */}
              <div className="flex-shrink-0 -mt-20 md:-mt-24">
                <div className="relative">
                  <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gold overflow-hidden bg-darkBlue shadow-2xl ${shouldBlur ? 'filter blur-sm' : ''}`}>
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gold/20">
                        <span className="text-4xl md:text-5xl font-heading text-gold">
                          {profile.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Gold Pineapple Verification Badge */}
                  {profile.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 md:w-12 md:h-12 bg-gold rounded-full flex items-center justify-center shadow-lg border-2 border-charcoal" data-testid="verification-badge">
                      <span className="text-xl md:text-2xl">🍍</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  {/* Username */}
                  <h1 className="text-3xl md:text-4xl font-heading text-offWhite" data-testid="profile-username">
                    {profile.username}
                  </h1>
                  
                  {/* Verified Text Badge */}
                  {profile.isVerified && (
                    <span className="px-3 py-1 bg-gold/20 text-gold text-sm font-body rounded-full border border-gold/40">
                      Verified Member
                    </span>
                  )}
                </div>

                {/* Account Type & Location */}
                <div className="flex flex-wrap items-center gap-4 text-offWhite/70 font-body mb-4">
                  <span className="flex items-center space-x-1" data-testid="profile-account-type">
                    <svg className="w-4 h-4 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{profile.accountType}</span>
                  </span>
                  <span className="flex items-center space-x-1" data-testid="profile-location">
                    <svg className="w-4 h-4 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </span>
                </div>

                {/* Experience Level & Age Range */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-4 py-1.5 border rounded-full text-sm font-semibold ${getExperienceBadgeColor(profile.experienceLevel)}`} data-testid="profile-experience">
                    {profile.experienceLevel}
                  </span>
                  {profile.ageRangeMin && profile.ageRangeMax && (
                    <span className="px-4 py-1.5 bg-offWhite/10 text-offWhite/80 rounded-full text-sm font-body border border-offWhite/20" data-testid="profile-age-range">
                      Age Range: {profile.ageRangeMin} - {profile.ageRangeMax}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 md:pt-0">
                {isOwner ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEditModal(true)}
                    className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all flex items-center space-x-2"
                    data-testid="edit-profile-btn"
                  >
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Profile</span>
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/messages?userId=${profileId}`)}
                      className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all flex items-center space-x-2"
                      data-testid="send-message-btn"
                    >
                      <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Send Message</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleToggleFavorite}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 ${
                        isFavorite
                          ? 'bg-gold text-charcoal border-gold'
                          : 'bg-transparent text-gold border-gold/40 hover:border-gold'
                      }`}
                      data-testid="favorite-btn"
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
              </div>
            </div>
          </div>

          {/* Profile Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Bio / About Me Section */}
              <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6" data-testid="bio-section">
                <h2 className="text-lg font-heading text-gold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>About Me</span>
                </h2>
                <div className={shouldBlur ? 'filter blur-md select-none' : ''}>
                  <p className="text-offWhite/90 font-body leading-relaxed">
                    {profile.description || 'No bio added yet.'}
                  </p>
                </div>
              </div>

              {/* Experience Level */}
              <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6" data-testid="experience-section">
                <h2 className="text-lg font-heading text-gold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>Experience Level</span>
                </h2>
                <span className={`inline-block px-4 py-2 border rounded-full text-sm font-semibold ${getExperienceBadgeColor(profile.experienceLevel)}`}>
                  {profile.experienceLevel}
                </span>
              </div>

              {/* Desired Age Range */}
              {profile.ageRangeMin && profile.ageRangeMax && (
                <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6" data-testid="age-range-section">
                  <h2 className="text-lg font-heading text-gold mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Desired Age Range</span>
                  </h2>
                  <div className="flex items-center space-x-3">
                    <span className="px-4 py-2 bg-gold/10 text-gold rounded-lg font-body text-lg font-semibold border border-gold/30">
                      {profile.ageRangeMin}
                    </span>
                    <span className="text-offWhite/50">to</span>
                    <span className="px-4 py-2 bg-gold/10 text-gold rounded-lg font-body text-lg font-semibold border border-gold/30">
                      {profile.ageRangeMax}
                    </span>
                  </div>
                </div>
              )}

              {/* Interests - Tag Cloud */}
              <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6" data-testid="interests-section">
                <h2 className="text-lg font-heading text-gold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Interests</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.length > 0 ? (
                    profile.interests.map((interest, index) => (
                      <motion.span
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-4 py-2 bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/40 text-gold rounded-full text-sm font-body hover:bg-gold/20 transition-colors cursor-default"
                      >
                        {interest}
                      </motion.span>
                    ))
                  ) : (
                    <p className="text-offWhite/50 font-body text-sm">No interests added yet.</p>
                  )}
                </div>
              </div>

              {/* Looking For */}
              {profile.lookingFor.length > 0 && (
                <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6">
                  <h2 className="text-lg font-heading text-gold mb-4 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Looking For</span>
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.lookingFor.map((item) => (
                      <span
                        key={item}
                        className="px-4 py-2 bg-offWhite/5 border border-offWhite/20 text-offWhite/80 rounded-full text-sm font-body"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Vibe Gallery */}
            <div className="lg:col-span-2">
              <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-6" data-testid="gallery-section">
                <h2 className="text-lg font-heading text-gold mb-6 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Vibe Gallery</span>
                </h2>

                {profile.photoUrls.length > 0 ? (
                  <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${shouldBlur ? 'filter blur-lg' : ''}`}>
                    {profile.photoUrls.map((url, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative aspect-square group cursor-pointer"
                        onClick={() => !shouldBlur && setSelectedPhoto(url)}
                      >
                        <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-gold/20 hover:border-gold/60 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gold/20">
                          <WatermarkedImage
                            src={url}
                            alt={`${profile.username}'s photo ${index + 1}`}
                            viewerUsername={viewerUsername || 'Member'}
                            fill
                            objectFit="cover"
                            className="transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end justify-center pb-4">
                          <span className="text-offWhite/80 text-sm font-body">View</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gold/20 rounded-xl">
                    <svg className="w-12 h-12 text-gold/40 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-offWhite/50 font-body">No photos uploaded yet.</p>
                  </div>
                )}
              </div>

              {/* Blurred Content Notice */}
              {shouldBlur && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-offWhite/80 font-body text-sm">Some content is hidden until your membership is verified.</span>
                  </div>
                  <button
                    onClick={() => setShowVettingModal(true)}
                    className="text-gold hover:text-gold-light font-body text-sm underline"
                  >
                    Learn more
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Photo Lightbox */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/95 backdrop-blur-md flex items-center justify-center z-50 p-6"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl w-full max-h-[80vh] rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <WatermarkedImage
                  src={selectedPhoto}
                  alt="Full size photo"
                  viewerUsername={viewerUsername || 'Member'}
                  width={1200}
                  height={800}
                  objectFit="contain"
                  className="rounded-2xl"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:text-gold transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="bg-darkBlue/90 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border-2 border-gold/30"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold">
                    <span className="text-4xl">🍍</span>
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
                className="bg-darkBlue/90 backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full my-8 border border-gold/20"
              >
                <h3 className="text-2xl font-heading text-gold mb-6">Edit Profile</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-gold font-body mb-2">About Me / Bio</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
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
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
                      placeholder="Share your desires and experiences..."
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
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
      </div>
    </PrivacyProtection>
  );
}
