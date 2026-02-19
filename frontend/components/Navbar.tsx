'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/register"
              className="hidden sm:block px-6 py-2 text-offWhite/90 hover:text-gold border border-gold/30 rounded-full transition-all hover:border-gold/60 font-body"
              data-testid="login-button"
            >
              Register
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all font-body"
              data-testid="apply-button"
            >
              Apply for Membership
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
