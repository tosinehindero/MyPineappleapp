'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { Search, Filter, MapPin, X, ChevronDown, Users, Sparkles } from 'lucide-react';

interface Member {
  id: string;
  username: string;
  primaryName?: string;
  accountType: string;
  experienceLevel: string;
  city?: string;
  state?: string;
  location?: string;
  photoUrls?: string[];
  isOnline?: boolean;
  lastActive?: Date;
  partyVibe?: string;
  interests?: string[];
  isVerified?: boolean;
  verifiedPineapple?: boolean;
}

const accountTypeOptions = [
  'All Types',
  'Single Male',
  'Single Female',
  'Couple (M/F)',
  'Couple (M/M)',
  'Couple (F/F)',
  'Poly Triad',
  'Poly Quad+',
  'Non-Binary Individual',
];

const experienceLevelOptions = [
  'All Levels',
  'Brand New (Curious)',
  'Beginner (Less than 1 year)',
  'Intermediate (1-3 years)',
  'Experienced (3-5 years)',
  'Veteran (5+ years)',
];

// Party Vibe tags based on interests
const getPartyVibe = (interests: string[] = [], experienceLevel: string = ''): string => {
  if (interests.includes('House Parties') || interests.includes('Club Events')) {
    return 'Social Butterfly';
  }
  if (interests.includes('Luxury Travel') || interests.includes('Resort Takeovers')) {
    return 'Jet Setter';
  }
  if (interests.includes('Educational Workshops')) {
    return 'Explorer';
  }
  if (experienceLevel.includes('Veteran') || experienceLevel.includes('Experienced')) {
    return 'Seasoned Pro';
  }
  if (experienceLevel.includes('Brand New') || experienceLevel.includes('Beginner')) {
    return 'Fresh Face';
  }
  if (interests.includes('Friendship First') || interests.includes('Casual Dating')) {
    return 'Easy Going';
  }
  return 'Adventurer';
};

const vibeColors: Record<string, string> = {
  'Social Butterfly': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Jet Setter': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Explorer': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Seasoned Pro': 'bg-gold/20 text-gold border-gold/30',
  'Fresh Face': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Easy Going': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Adventurer': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function MemberDirectoryPage() {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState('All Types');
  const [selectedExperience, setSelectedExperience] = useState('All Levels');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersQuery = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(membersQuery);
        
        const membersList: Member[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Check if user was active in last 5 minutes
          const lastActive = data.lastActive?.toDate();
          const isOnline = lastActive && (Date.now() - lastActive.getTime()) < 5 * 60 * 1000;
          
          membersList.push({
            id: doc.id,
            username: data.username || 'Anonymous',
            primaryName: data.primaryName,
            accountType: data.accountType || 'Single',
            experienceLevel: data.experienceLevel || 'Beginner',
            city: data.city,
            state: data.state,
            location: data.location,
            photoUrls: data.photoUrls || [],
            isOnline,
            lastActive,
            partyVibe: getPartyVibe(data.interests, data.experienceLevel),
            interests: data.interests || [],
            isVerified: data.isVerified,
            verifiedPineapple: data.verifiedPineapple,
          });
        });
        
        setMembers(membersList);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Filter and search members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesUsername = member.username.toLowerCase().includes(query);
        const matchesCity = member.city?.toLowerCase().includes(query);
        const matchesState = member.state?.toLowerCase().includes(query);
        const matchesLocation = member.location?.toLowerCase().includes(query);
        
        if (!matchesUsername && !matchesCity && !matchesState && !matchesLocation) {
          return false;
        }
      }

      // Account type filter
      if (selectedAccountType !== 'All Types' && member.accountType !== selectedAccountType) {
        return false;
      }

      // Experience level filter
      if (selectedExperience !== 'All Levels' && member.experienceLevel !== selectedExperience) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, selectedAccountType, selectedExperience]);

  const clearFilters = () => {
    setSelectedAccountType('All Types');
    setSelectedExperience('All Levels');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedAccountType !== 'All Types' || selectedExperience !== 'All Levels' || searchQuery;

  return (
    <div className="min-h-screen bg-charcoal pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-charcoal/95 backdrop-blur-xl border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-heading text-gold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Member Directory
              </h1>
              <p className="text-offWhite/60 text-sm font-body mt-1">
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found
              </p>
            </div>
            <Link
              href="/feed"
              className="text-gold/60 hover:text-gold text-sm font-body transition-colors"
            >
              ← Back to Feed
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-offWhite/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or city..."
                className="w-full pl-12 pr-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body placeholder:text-offWhite/40 focus:outline-none focus:border-gold/50 transition-colors"
                data-testid="member-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-offWhite/40 hover:text-offWhite transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-gold/20 border-gold/50 text-gold'
                  : 'bg-darkBlue/50 border-gold/20 text-offWhite/70 hover:border-gold/40'
              }`}
              data-testid="filter-toggle-btn"
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline font-body">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              )}
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account Type Filter */}
                    <div>
                      <label className="text-offWhite/60 text-sm font-body mb-2 block">
                        Account Type
                      </label>
                      <div className="relative">
                        <select
                          value={selectedAccountType}
                          onChange={(e) => setSelectedAccountType(e.target.value)}
                          className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body appearance-none cursor-pointer focus:outline-none focus:border-gold/50"
                          data-testid="account-type-filter"
                        >
                          {accountTypeOptions.map((type) => (
                            <option key={type} value={type} className="bg-charcoal">
                              {type}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offWhite/40 pointer-events-none" />
                      </div>
                    </div>

                    {/* Experience Level Filter */}
                    <div>
                      <label className="text-offWhite/60 text-sm font-body mb-2 block">
                        Experience Level
                      </label>
                      <div className="relative">
                        <select
                          value={selectedExperience}
                          onChange={(e) => setSelectedExperience(e.target.value)}
                          className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body appearance-none cursor-pointer focus:outline-none focus:border-gold/50"
                          data-testid="experience-filter"
                        >
                          {experienceLevelOptions.map((level) => (
                            <option key={level} value={level} className="bg-charcoal">
                              {level}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-offWhite/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-gold text-sm font-body hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Member Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-darkBlue/30 rounded-2xl border border-gold/10 p-4 animate-pulse"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gold/10" />
                  <div className="flex-1">
                    <div className="h-4 bg-gold/10 rounded w-24 mb-2" />
                    <div className="h-3 bg-gold/10 rounded w-32" />
                  </div>
                </div>
                <div className="h-3 bg-gold/10 rounded w-20 mb-2" />
                <div className="h-6 bg-gold/10 rounded w-24" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gold/40" />
            </div>
            <h3 className="text-xl font-heading text-offWhite mb-2">No Members Found</h3>
            <p className="text-offWhite/60 font-body mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'No members have registered yet'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gold/20 text-gold rounded-full font-body hover:bg-gold/30 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  href={`/profile/${member.id}`}
                  className="block bg-darkBlue/40 backdrop-blur-sm rounded-2xl border border-gold/20 p-4 hover:border-gold/40 hover:bg-darkBlue/60 transition-all group"
                  data-testid={`member-card-${member.id}`}
                >
                  {/* Profile Photo & Status */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-charcoal border-2 border-gold/20 group-hover:border-gold/40 transition-colors">
                        {member.photoUrls && member.photoUrls[0] ? (
                          <img
                            src={member.photoUrls[0]}
                            alt={member.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gold/40">
                            <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Online Status Indicator */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-darkBlue ${
                          member.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                        title={member.isOnline ? 'Online Now' : 'Offline'}
                      />
                      
                      {/* Verified Badge */}
                      {(member.isVerified || member.verifiedPineapple) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full overflow-hidden border border-gold shadow-lg">
                          <img
                            src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                            alt="Verified"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Username & Account Type */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-offWhite font-heading text-lg truncate group-hover:text-gold transition-colors">
                        {member.primaryName || member.username}
                      </h3>
                      <p className="text-gold/70 text-sm font-body truncate">
                        {member.accountType}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-offWhite/60 text-sm font-body mb-3">
                    <MapPin className="w-3.5 h-3.5 text-gold/50" />
                    <span className="truncate">
                      {member.city && member.state
                        ? `${member.city}, ${member.state}`
                        : member.location || 'Location not set'}
                    </span>
                  </div>

                  {/* Vibe Tag */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body border ${
                        vibeColors[member.partyVibe || 'Adventurer']
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      {member.partyVibe}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
