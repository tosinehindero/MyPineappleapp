'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  role?: string;
  isVerified?: boolean;
  username?: string;
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin' && userProfile?.isVerified === true;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        setProfileLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'members', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        setProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-charcoal/95 backdrop-blur-md shadow-lg border-b border-gold/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-2 group flex-shrink-0"
            data-testid="navbar-logo"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gold/30">
              <img
                src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                alt="PineapplePlay Logo"
                className="w-full h-full object-cover"
                data-testid="navbar-pineapple-logo"
              />
            </div>
            <span className="text-lg sm:text-2xl font-heading text-gold group-hover:text-gold-light transition-colors">
              PineapplePlay
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {currentUser ? (
              <>
                <Link
                  href="/feed"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body"
                  data-testid="nav-link-feed"
                >
                  Feed
                </Link>
                <Link
                  href="/members"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body flex items-center"
                  data-testid="nav-link-members"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Members
                </Link>
                <Link
                  href="/map"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body"
                  data-testid="nav-link-map"
                >
                  Discover
                </Link>
                <Link
                  href="/marketplace"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body"
                  data-testid="nav-link-marketplace"
                >
                  Marketplace
                </Link>
                <Link
                  href="/travel"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body flex items-center"
                  data-testid="nav-link-travel"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Travel
                </Link>
                <Link
                  href="/messages"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body flex items-center"
                  data-testid="nav-link-messages"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Messages
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="#features"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body"
                  data-testid="nav-link-features"
                >
                  Features
                </Link>
                <Link
                  href="/about"
                  className="text-offWhite/80 hover:text-gold transition-colors font-body"
                  data-testid="nav-link-about"
                >
                  About
                </Link>
              </>
            )}
          </div>

          {/* Right side - CTA Buttons / User Menu + Mobile Hamburger */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {currentUser ? (
              /* Logged In State */
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 rounded-full border border-gold/30 hover:border-gold/60 transition-all"
                  data-testid="user-menu-btn"
                >
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-heading text-sm">
                      {currentUser.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block text-offWhite/80 font-body text-sm max-w-[120px] truncate">
                    {currentUser.email}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gold transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-darkBlue border border-gold/20 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="p-4 border-b border-gold/10">
                      <p className="text-offWhite font-body text-sm truncate">{currentUser.email}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-offWhite/50 text-xs font-body">
                          {profileLoading ? 'Loading...' : (isAdmin ? 'Administrator' : 'Member')}
                        </p>
                        {!profileLoading && isAdmin && (
                          <span className="text-xs px-1.5 py-0.5 bg-gold/20 text-gold rounded-full">Admin</span>
                        )}
                      </div>
                    </div>
                    <div className="py-2">
                      {/* Admin Dashboard Link - Only visible for verified admins */}
                      {!profileLoading && isAdmin && (
                        <Link
                          href="/admin/vetting"
                          className="flex items-center px-4 py-2 text-gold hover:bg-gold/10 transition-colors font-body text-sm font-medium"
                          onClick={() => setShowUserMenu(false)}
                          data-testid="admin-dashboard-link"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/feed"
                        className="flex items-center px-4 py-2 text-offWhite/80 hover:bg-gold/10 hover:text-gold transition-colors font-body text-sm"
                        onClick={() => setShowUserMenu(false)}
                        data-testid="feed-link"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        Feed
                      </Link>
                      <Link
                        href={`/profile/${currentUser.uid}`}
                        className="flex items-center px-4 py-2 text-offWhite/80 hover:bg-gold/10 hover:text-gold transition-colors font-body text-sm"
                        onClick={() => setShowUserMenu(false)}
                        data-testid="my-profile-link"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </Link>
                      <Link
                        href="/messages"
                        className="flex items-center px-4 py-2 text-offWhite/80 hover:bg-gold/10 hover:text-gold transition-colors font-body text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Messages
                      </Link>
                      <Link
                        href="/map"
                        className="flex items-center px-4 py-2 text-offWhite/80 hover:bg-gold/10 hover:text-gold transition-colors font-body text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Discover
                      </Link>
                      <Link
                        href="/marketplace"
                        className="flex items-center px-4 py-2 text-offWhite/80 hover:bg-gold/10 hover:text-gold transition-colors font-body text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Marketplace
                      </Link>
                    </div>
                    <div className="py-2 border-t border-gold/10">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors font-body text-sm"
                        data-testid="sign-out-btn"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged Out State */
              <>
                {/* Desktop CTA Buttons */}
                <div className="hidden sm:flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="px-6 py-2 text-offWhite/90 hover:text-gold border border-gold/30 rounded-full transition-all hover:border-gold/60 font-body"
                    data-testid="login-button"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all font-body whitespace-nowrap"
                    data-testid="apply-button"
                  >
                    Apply for Membership
                  </Link>
                </div>

                {/* Mobile Hamburger Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden p-2 text-gold hover:bg-gold/10 rounded-lg transition-colors"
                  data-testid="mobile-menu-btn"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && !currentUser && (
          <div className="sm:hidden bg-charcoal/95 backdrop-blur-md border-t border-gold/10 py-4 space-y-2">
            <Link
              href="#features"
              className="block px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors font-body"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/about"
              className="block px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors font-body"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <div className="px-4 pt-4 space-y-3 border-t border-gold/10">
              <Link
                href="/login"
                className="block w-full px-4 py-3 text-center text-offWhite/90 hover:text-gold border border-gold/30 rounded-full transition-all hover:border-gold/60 font-body"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block w-full px-4 py-3 text-center bg-gold text-charcoal font-semibold rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all font-body"
                onClick={() => setMobileMenuOpen(false)}
              >
                Apply for Membership
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
