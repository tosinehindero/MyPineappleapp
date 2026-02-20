'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
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
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-1 group"
            data-testid="navbar-logo"
          >
            <span className="text-2xl font-heading text-gold group-hover:text-gold-light transition-colors">
              PineapplePlay
            </span>
            <span 
              className="text-3xl transform rotate-180 group-hover:scale-110 transition-transform"
              style={{ display: 'inline-block' }}
            >
              🍍
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-offWhite/80 hover:text-gold transition-colors font-body"
              data-testid="nav-link-features"
            >
              Features
            </Link>
            <Link
              href="/map"
              className="text-offWhite/80 hover:text-gold transition-colors font-body"
              data-testid="nav-link-map"
            >
              Discover
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
                <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Messages
            </Link>
            <Link
              href="#about"
              className="text-offWhite/80 hover:text-gold transition-colors font-body"
              data-testid="nav-link-about"
            >
              About
            </Link>
          </div>

          {/* CTA Buttons / User Menu */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              /* Logged In State */
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-full border border-gold/30 hover:border-gold/60 transition-all"
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
                      <p className="text-offWhite/50 text-xs font-body">Member</p>
                    </div>
                    <div className="py-2">
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
                <Link
                  href="/login"
                  className="hidden sm:block px-6 py-2 text-offWhite/90 hover:text-gold border border-gold/30 rounded-full transition-all hover:border-gold/60 font-body"
                  data-testid="login-button"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all font-body"
                  data-testid="apply-button"
                >
                  Apply for Membership
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
