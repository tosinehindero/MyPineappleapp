'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import debounce from 'lodash.debounce';

interface SearchResult {
  id: string;
  type: 'member' | 'post' | 'listing';
  title: string;
  subtitle?: string;
  image?: string;
  link: string;
}

interface SearchDropdownProps {
  userId: string;
  blockedUserIds?: string[];
}

export default function SearchDropdown({ userId, blockedUserIds = [] }: SearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'members' | 'posts' | 'listings'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string, tab: string) => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      try {
        // Search Members
        if (tab === 'all' || tab === 'members') {
          const membersRef = collection(db, 'members');
          const membersSnapshot = await getDocs(membersRef);
          
          membersSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            // Skip blocked users
            if (blockedUserIds.includes(doc.id)) return;
            
            const username = (data.username || '').toLowerCase();
            const location = (data.location || '').toLowerCase();
            const interests = (data.interests || []).join(' ').toLowerCase();
            
            if (
              username.includes(queryLower) ||
              location.includes(queryLower) ||
              interests.includes(queryLower)
            ) {
              searchResults.push({
                id: doc.id,
                type: 'member',
                title: data.username || 'Member',
                subtitle: data.location || data.accountType || '',
                image: data.photoUrls?.[0] || null,
                link: `/profile/${doc.id}`,
              });
            }
          });
        }

        // Search Posts
        if (tab === 'all' || tab === 'posts') {
          const postsRef = collection(db, 'posts');
          const postsSnapshot = await getDocs(query(postsRef, orderBy('createdAt', 'desc'), limit(100)));
          
          postsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            // Skip posts from blocked users
            if (blockedUserIds.includes(data.authorId)) return;
            
            const content = (data.content || '').toLowerCase();
            
            if (content.includes(queryLower)) {
              searchResults.push({
                id: doc.id,
                type: 'post',
                title: data.content?.substring(0, 60) + (data.content?.length > 60 ? '...' : '') || 'Post',
                subtitle: `by ${data.authorUsername || 'Member'}`,
                image: data.images?.[0] || null,
                link: `/feed#post-${doc.id}`,
              });
            }
          });
        }

        // Search Marketplace Listings (from backend API)
        if (tab === 'all' || tab === 'listings') {
          const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
          const response = await fetch(`${BACKEND_URL}/api/marketplace/listings`);
          const data = await response.json();
          
          if (data.success && data.listings) {
            data.listings.forEach((listing: any) => {
              // Skip listings from blocked users
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
                  subtitle: `$${listing.price?.toFixed(2) || '0.00'}`,
                  image: listing.images?.[0] || null,
                  link: `/marketplace?listing=${listing.listing_id}`,
                });
              }
            });
          }
        }

        setResults(searchResults.slice(0, 10)); // Limit to 10 results in dropdown
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [blockedUserIds]
  );

  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery, activeTab);
    } else {
      setResults([]);
    }
  }, [searchQuery, activeTab, performSearch]);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'member':
        return (
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'post':
        return (
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      case 'listing':
        return (
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
        return 'bg-blue-500/20 text-blue-400';
      case 'post':
        return 'bg-green-500/20 text-green-400';
      case 'listing':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab.slice(0, -1)); // Remove 's' from tab name

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="Search..."
          className="w-40 md:w-48 bg-white/[0.05] border border-white/10 rounded-full px-4 py-1.5 pl-9 text-sm text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-gold/50 focus:w-56 md:focus:w-64 transition-all"
          data-testid="search-input"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-offWhite/40"
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
            onClick={() => {
              setSearchQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-offWhite/40 hover:text-offWhite"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && searchQuery.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-darkBlue border border-gold/20 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Tabs */}
            <div className="flex border-b border-gold/10 px-2 pt-2">
              {(['all', 'members', 'posts', 'listings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-body capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-offWhite/60 hover:text-gold'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-offWhite/40 text-sm font-body">
                    {searchQuery.length < 2 ? 'Type at least 2 characters' : 'No results found'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gold/10">
                  {filteredResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.link}
                      onClick={() => {
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className="block p-3 hover:bg-gold/5 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {/* Image or Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.image ? 'bg-charcoal' : getTypeColor(result.type)
                        }`}>
                          {result.image ? (
                            <img
                              src={result.image}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            getTypeIcon(result.type)
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body text-offWhite truncate">
                            {result.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeColor(result.type)}`}>
                              {result.type}
                            </span>
                            {result.subtitle && (
                              <span className="text-xs text-offWhite/50 truncate">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredResults.length > 0 && (
              <div className="px-4 py-3 bg-darkBlue/80 border-t border-gold/10 text-center">
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}&type=${activeTab}`}
                  className="text-sm text-gold hover:underline font-body"
                  onClick={() => setIsOpen(false)}
                >
                  See all results →
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
