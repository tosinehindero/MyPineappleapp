'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Set a timeout to stop checking auth after 5 seconds (prevents infinite loading)
    const authTimeout = setTimeout(() => {
      setChecking(false);
    }, 5000);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(authTimeout);
      if (user) {
        // User is logged in, redirect to feed
        router.replace('/feed');
      } else {
        // User is not logged in, show landing page
        setChecking(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  }, [router]);

  // Show loading while checking auth
  if (checking) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-charcoal">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      {/* CTA Section for Registration */}
      <section className="py-24 px-6 bg-gradient-to-b from-charcoal to-darkBlue">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-heading text-gold mb-6">
            Ready to Join?
          </h2>
          <p className="text-offWhite/80 text-lg mb-8 font-body">
            Complete our exclusive membership application and become part of the PineapplePlay community.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-5 bg-gold text-charcoal font-semibold text-lg rounded-full hover:shadow-gold-glow transition-all"
            data-testid="register-cta-button"
          >
            Start Your Application →
          </Link>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}

