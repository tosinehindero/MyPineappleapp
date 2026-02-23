'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  query as firestoreQuery,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { getBlockedUsers } from '@/lib/user-safety';

interface SearchResult {
  id: string;
  type: 'member' | 'post' | 'listing';
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'members' | 'posts' | 'listings'>(initialType as any);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const blocked = await getBlockedUsers(user.uid);
        setBlockedUserIds(blocked);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, activeTab, blockedUserIds]);

  const performSearch = async () => {
    setLoading(true);
    const searchResults: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();

    try {
      // Search Members
      if (activeTab === 'all' || activeTab === 'members') {
        const membersRef = collection(db, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        membersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (blockedUserIds.includes(doc.id)) return;
          
          const username = (data.username || '').toLowerCase();
          const location = (data.location || '').toLowerCase();
          const interests = (data.interests || []).join(' ').toLowerCase();
          const description = (data.description || '').toLowerCase();
          
          if (
            username.includes(queryLower) ||
            location.includes(queryLower) ||
            interests.includes(queryLower) ||
            description.includes(queryLower)
          ) {
            searchResults.push({
              id: doc.id,
              type: 'member',
              title: data.username || 'Member',
              subtitle: data.location || data.accountType || '',
              description: data.description?.substring(0, 120) || '',
              image: data.photoUrls?.[0] || null,
              link: `/profile/${doc.id}`,
            });
          }
        });
      }

      // Search Posts
      if (activeTab === 'all' || activeTab === 'posts') {
        const postsRef = collection(db, 'posts');
        const postsSnapshot = await getDocs(firestoreQuery(postsRef, orderBy('createdAt', 'desc'), limit(200)));
        
        postsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (blockedUserIds.includes(data.authorId)) return;
          
          const content = (data.content || '').toLowerCase();
          
          if (content.includes(queryLower)) {
            searchResults.push({
              id: doc.id,
              type: 'post',
              title: data.content?.substring(0, 80) + (data.content?.length > 80 ? '...' : '') || 'Post',
              subtitle: `by ${data.authorUsername || 'Member'}`,
              description: data.content?.substring(0, 150) || '',
              image: data.images?.[0] || null,
              link: `/feed#post-${doc.id}`,
            });
          }
        });
      }

      // Search Marketplace Listings
      if (activeTab === 'all' || activeTab === 'listings') {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const response = await fetch(`${BACKEND_URL}/api/marketplace/listings`);
        const data = await response.json();
        
        if (data.success && data.listings) {
          data.listings.forEach((listing: any) => {
            if (blockedUserIds.includes(listing.seller_id)) return;
            
            const title = (listing.title || '').toLowerCase();
            const description = (listing.description || '').toLowerCase();
            const category = (listing.category || '').toLowerCase();
            
            if (
              title.includes(queryLower) ||
              description.includes(queryLower) ||
              category.includes(queryLower)
            ) {
              searchResults.push({
                id: listing.listing_id,
                type: 'listing',
                title: listing.title,
                subtitle: `$${listing.price?.toFixed(2) || '0.00'} • ${listing.category || 'General'}`,
                description: listing.description?.substring(0, 150) || '',
                image: listing.images?.[0] || null,
                link: `/marketplace?listing=${listing.listing_id}`,
              });
            }
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'member':
        return (
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'post':
        return (
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      case 'listing':
        return (
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'member':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'post':
        return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'listing':
        return 'bg-purple-500/20 text-purple-400 border-purple-400/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab.slice(0, -1));

  const resultCounts = {
    all: results.length,
    members: results.filter(r => r.type === 'member').length,
    posts: results.filter(r => r.type === 'post').length,
    listings: results.filter(r => r.type === 'listing').length,
  };

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-darkBlue/95 backdrop-blur-md border-b border-gold/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/feed" className="text-offWhite/60 hover:text-gold transition-colors">
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading text-gold">Search</h1>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members, posts, listings..."
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-12 py-3 text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-gold/50"
              autoFocus
              data-testid="search-page-input"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-offWhite/40"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-offWhite/40 hover:text-offWhite"
              >
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4 overflow-x-auto">
            {(['all', 'members', 'posts', 'listings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-body capitalize transition-colors rounded-lg whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gold/20 text-gold'
                    : 'text-offWhite/60 hover:text-gold hover:bg-gold/10'
                }`}
              >
                {tab} ({resultCounts[tab]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
            <p className="text-offWhite/40 mt-4 font-body">Searching...</p>
          </div>
        ) : searchQuery.length < 2 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-offWhite/20 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-offWhite/40 font-body">Enter at least 2 characters to search</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-offWhite/20 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-offWhite/40 font-body">No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((result, index) => (
              <motion.div
                key={`${result.type}-${result.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={result.link}
                  className="block bg-darkBlue/60 border border-gold/10 rounded-xl p-4 hover:border-gold/30 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    {/* Image */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      result.image ? 'bg-charcoal' : getTypeColor(result.type)
                    }`}>
                      {result.image ? (
                        <img
                          src={result.image}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        getTypeIcon(result.type)
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(result.type)}`}>
                          {result.type}
                        </span>
                      </div>
                      <h3 className="text-offWhite font-body font-semibold truncate">
                        {result.title}
                      </h3>
                      {result.subtitle && (
                        <p className="text-offWhite/60 text-sm font-body">
                          {result.subtitle}
                        </p>
                      )}
                      {result.description && (
                        <p className="text-offWhite/40 text-sm font-body mt-1 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-offWhite/40 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
