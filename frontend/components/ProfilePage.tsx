'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getProfileClient,
  updateProfileClient,
  toggleFavoriteClient,
  checkIsFavoriteClient,
  getUserVerificationStatusClient,
  addPhotoToGallery,
  removePhotoFromGallery,
} from '@/lib/profile-client';
import { recordProfileView } from '@/app/views/actions';
import Link from 'next/link';
import PrivacyProtection from './PrivacyProtection';
import WatermarkedImage from './WatermarkedImage';

const pineappleLogo = "https://customer-assets.emergentagent.com/job_ece997f5-18cb-49ee-85d0-980bc524a48f/artifacts/z2y9pjap_1771729561245.png";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVettingModal, setShowVettingModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [viewerUsername, setViewerUsername] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Edit form state
  const [editUsername, setEditUsername] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFantasies, setEditFantasies] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editLookingFor, setEditLookingFor] = useState<string[]>([]);
  const [editAgeMin, setEditAgeMin] = useState(18);
  const [editAgeMax, setEditAgeMax] = useState(99);
  const [newInterest, setNewInterest] = useState('');
  const [newLookingFor, setNewLookingFor] = useState('');

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
    // Skip if auth not checked yet or no user
    if (!authChecked) return;
    
    if (!currentUser) {
      // Not logged in - redirect
      router.push('/login');
      return;
    }

    // Use AbortController pattern to handle cleanup properly
    let isCancelled = false;
    
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
        
        // Check if component unmounted or navigation happened
        if (isCancelled) return;
        
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
        if (isCancelled) return;
        console.error('Profile load error:', error);
        setLoadError(error.message || 'Failed to load profile');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [profileId, currentUser?.uid, isVerified, router, authChecked]);

  // Initialize edit form when opening modal
  const openEditModal = () => {
    if (profile) {
      setEditUsername(profile.username || '');
      setEditDescription(profile.description || '');
      setEditFantasies(profile.fantasies || '');
      setEditLocation(profile.location || '');
      setEditInterests(profile.interests || []);
      setEditLookingFor(profile.lookingFor || []);
      setEditAgeMin(profile.ageRangeMin || 18);
      setEditAgeMax(profile.ageRangeMax || 99);
    }
    setShowEditModal(true);
  };

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
      username: editUsername,
      description: editDescription,
      fantasies: editFantasies,
      location: editLocation,
      interests: editInterests,
      lookingFor: editLookingFor,
      ageRangeMin: editAgeMin,
      ageRangeMax: editAgeMax,
    });

    if (result.success) {
      setProfile((prev) =>
        prev
          ? { 
              ...prev, 
              username: editUsername,
              description: editDescription, 
              fantasies: editFantasies,
              location: editLocation,
              interests: editInterests,
              lookingFor: editLookingFor,
              ageRangeMin: editAgeMin,
              ageRangeMax: editAgeMax,
            }
          : null
      );
      setShowEditModal(false);
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB to match your rules)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      // Updated path to match your storage rules: member-photos/{userId}/
      const storageRef = ref(storage, `member-photos/${currentUser.uid}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      const result = await addPhotoToGallery(currentUser.uid, downloadUrl);
      
      if (result.success && result.photoUrls) {
        setProfile((prev) => prev ? { ...prev, photoUrls: result.photoUrls } : null);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    if (!currentUser || !confirm('Remove this photo from your gallery?')) return;

    try {
      const result = await removePhotoFromGallery(currentUser.uid, photoUrl);
      if (result.success && result.photoUrls) {
        setProfile((prev) => prev ? { ...prev, photoUrls: result.photoUrls } : null);
      }
    } catch (error: any) {
      console.error('Remove photo error:', error);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !editInterests.includes(newInterest.trim())) {
      setEditInterests([...editInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setEditInterests(editInterests.filter(i => i !== interest));
  };

  const addLookingForItem = () => {
    if (newLookingFor.trim() && !editLookingFor.includes(newLookingFor.trim())) {
      setEditLookingFor([...editLookingFor, newLookingFor.trim()]);
      setNewLookingFor('');
    }
  };

  const removeLookingForItem = (item: string) => {
    setEditLookingFor(editLookingFor.filter(i => i !== item));
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
          <img src={pineappleLogo} alt="" className="h-12 w-12 mx-auto mb-4 object-cover rounded-xl" />
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
          <div className="absolute top-6 left-6 z-10 flex items-center space-x-2">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-charcoal/60 backdrop-blur-md rounded-full text-offWhite/80 hover:text-gold transition-colors border border-gold/20"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-body text-sm">Back</span>
            </button>
            <Link
              href="/feed"
              className="flex items-center space-x-2 px-4 py-2 bg-gold/20 backdrop-blur-md rounded-full text-gold hover:bg-gold/30 transition-colors border border-gold/30"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-body text-sm">Feed</span>
            </Link>
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
                      <img src={pineappleLogo} alt="Verified" className="h-6 w-6 md:h-8 md:w-8 object-cover rounded-lg" />
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
                    onClick={() => openEditModal()}
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
              <div className="bg-darkBlue/60 backdrop-blur-md rounded-2xl border border-gold/20 p-4 sm:p-6" data-testid="gallery-section">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg font-heading text-gold flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Vibe Gallery</span>
                  </h2>
                  {isOwner && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3 py-1.5 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Add Photo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {profile.photoUrls.length > 0 ? (
                  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 ${shouldBlur ? 'filter blur-lg' : ''}`}>
                    {profile.photoUrls.map((url, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative aspect-square group cursor-pointer"
                        onClick={() => !shouldBlur && setSelectedPhoto(url)}
                      >
                        <div className="absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden border-2 border-gold/20 hover:border-gold/60 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gold/20">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg sm:rounded-xl flex items-end justify-center pb-4">
                          <span className="text-offWhite/80 text-sm font-body">View</span>
                        </div>

                        {/* Delete Button for Owner */}
                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(url);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </motion.div>
                    ))}

                    {/* Add Photo Placeholder for Owner */}
                    {isOwner && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative aspect-square cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="absolute inset-0 rounded-lg sm:rounded-xl border-2 border-dashed border-gold/30 hover:border-gold/60 transition-all duration-300 flex flex-col items-center justify-center bg-gold/5 hover:bg-gold/10">
                          <svg className="w-8 h-8 text-gold/60 mb-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-gold/60 text-xs">Add Photo</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div 
                    className={`text-center py-12 border-2 border-dashed border-gold/20 rounded-xl ${isOwner ? 'cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-all' : ''}`}
                    onClick={() => isOwner && fileInputRef.current?.click()}
                  >
                    <svg className="w-12 h-12 text-gold/40 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-offWhite/50 font-body">
                      {isOwner ? 'Click to add your first photo' : 'No photos uploaded yet.'}
                    </p>
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
              className="fixed inset-0 bg-charcoal/95 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[80vh] rounded-xl sm:rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedPhoto}
                  alt="Full size photo"
                  className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                  style={{ maxHeight: '85vh' }}
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:text-gold transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
                    <img src={pineappleLogo} alt="" className="w-10 h-12 object-contain" />
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
              className="fixed inset-0 bg-charcoal/90 backdrop-blur-md flex items-start justify-center z-50 p-4 sm:p-6 overflow-y-auto"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-darkBlue/90 backdrop-blur-xl rounded-2xl p-4 sm:p-8 max-w-2xl w-full my-4 sm:my-8 border border-gold/20"
              >
                <h3 className="text-xl sm:text-2xl font-heading text-gold mb-6">Edit Profile</h3>

                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Username */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">Display Name</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                      placeholder="Your display name"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                      placeholder="City, Country"
                    />
                  </div>

                  {/* Age Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gold font-body mb-2 text-sm">Min Age Preference</label>
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={editAgeMin}
                        onChange={(e) => setEditAgeMin(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gold font-body mb-2 text-sm">Max Age Preference</label>
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={editAgeMax}
                        onChange={(e) => setEditAgeMax(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                      />
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">Interests</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editInterests.map((interest, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-gold/20 text-gold rounded-full text-xs flex items-center gap-2"
                        >
                          {interest}
                          <button 
                            onClick={() => removeInterest(interest)}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                        className="flex-1 px-4 py-2 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                        placeholder="Add interest..."
                      />
                      <button
                        onClick={addInterest}
                        className="px-4 py-2 bg-gold/20 text-gold rounded-xl hover:bg-gold/30 transition-colors text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Looking For */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">Looking For</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editLookingFor.map((item, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs flex items-center gap-2"
                        >
                          {item}
                          <button 
                            onClick={() => removeLookingForItem(item)}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLookingFor}
                        onChange={(e) => setNewLookingFor(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLookingForItem())}
                        className="flex-1 px-4 py-2 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body text-sm"
                        placeholder="Add what you're looking for..."
                      />
                      <button
                        onClick={addLookingForItem}
                        className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-xl hover:bg-pink-500/30 transition-colors text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* About Me / Bio */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">About Me / Bio</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none text-sm"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Fantasies */}
                  <div>
                    <label className="block text-gold font-body mb-2 text-sm">
                      Fantasies & Experiences
                    </label>
                    <textarea
                      value={editFantasies}
                      onChange={(e) => setEditFantasies(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none text-sm"
                      placeholder="Share your desires and experiences..."
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 mt-4 border-t border-gold/10">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden File Input for Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>
    </PrivacyProtection>
  );
}
