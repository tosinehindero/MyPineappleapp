'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const pineappleImage = "https://customer-assets.emergentagent.com/job_ece997f5-18cb-49ee-85d0-980bc524a48f/artifacts/z2y9pjap_1771729561245.png";

const coreValues = [
  {
    title: 'Privacy First',
    description: 'Your discretion is our priority. Every interaction is protected with end-to-end encryption and thoughtful privacy controls.',
    icon: (
      <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Curated Community',
    description: 'We maintain an exclusive, vetted membership to ensure every connection is meaningful and every member shares our values.',
    icon: (
      <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Premium Experience',
    description: 'From our interface to our events, everything is crafted with sophistication and attention to detail that discerning members deserve.',
    icon: (
      <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: 'Authentic Connections',
    description: 'We celebrate genuine relationships and meaningful encounters, fostering a space where authenticity is cherished.',
    icon: (
      <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

const stats = [
  { value: '10K+', label: 'Verified Members' },
  { value: '50+', label: 'Exclusive Events' },
  { value: '100%', label: 'Privacy Focused' },
  { value: '24/7', label: 'Secure Platform' },
];

export default function AboutPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl md:text-2xl font-heading text-gold">PineapplePlay</span>
              <img src={pineappleImage} alt="Pineapple" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            </Link>
            <div className="flex items-center space-x-4 md:space-x-6">
              <Link href="/" className="text-offWhite/70 hover:text-gold transition-colors text-sm font-body hidden md:block">
                Home
              </Link>
              <Link href="/about" className="text-gold text-sm font-body">
                About
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/feed"
                  className="px-4 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all text-sm"
                >
                  Enter Feed
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-offWhite/70 hover:text-gold transition-colors text-sm font-body hidden md:block">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all text-sm"
                  >
                    Apply Now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-[96px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-2 bg-gold/10 border border-gold/30 rounded-full text-gold text-sm font-body mb-6">
              Welcome to the Inner Circle
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-heading mb-6"
          >
            <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent">
              About PineapplePlay
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-offWhite/70 font-body max-w-2xl mx-auto leading-relaxed"
          >
            A sanctuary for the sophisticated. Where privacy meets passion, and every connection is crafted with intention.
          </motion.p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-heading mb-6">
                <span className="bg-gradient-to-r from-gold to-yellow-200 bg-clip-text text-transparent">
                  Why We Exist
                </span>
              </h2>
              <div className="space-y-4 text-offWhite/80 font-body leading-relaxed">
                <p>
                  PineapplePlay was born from a simple realization: the lifestyle community deserved better. 
                  Better privacy. Better connections. Better experiences.
                </p>
                <p>
                  We built this platform for those who refuse to compromise on discretion, who value 
                  quality over quantity, and who understand that true luxury lies in the details.
                </p>
                <p>
                  Our vetted membership ensures that every profile you encounter belongs to someone 
                  who shares your commitment to authenticity and respect. Here, you're not just a user—you're 
                  a valued member of an exclusive community.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Decorative element */}
              <div className="aspect-square max-w-md mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent rounded-3xl" />
                <div className="absolute inset-4 border border-gold/30 rounded-2xl" />
                <div className="absolute inset-8 border border-gold/20 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={pineappleImage} alt="PineapplePlay" className="w-32 h-40 md:w-40 md:h-52 object-contain" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-gold/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-heading bg-gradient-to-r from-gold to-yellow-200 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-offWhite/60 font-body text-sm">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-heading mb-4">
              <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent">
                Our Core Values
              </span>
            </h2>
            <p className="text-offWhite/60 font-body max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                {/* Glassmorphism Card */}
                <div className="relative h-full p-8 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-gold/30 transition-all duration-500 hover:bg-white/[0.05]">
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 group-hover:bg-gold/20 transition-colors">
                      {value.icon}
                    </div>
                    <h3 className="text-xl font-heading text-gold mb-3">
                      {value.title}
                    </h3>
                    <p className="text-offWhite/70 font-body leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The PineapplePlay Promise */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent via-gold/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-heading mb-6">
              <span className="bg-gradient-to-r from-gold to-yellow-200 bg-clip-text text-transparent">
                The PineapplePlay Promise
              </span>
            </h2>
            <p className="text-lg text-offWhite/80 font-body leading-relaxed mb-8 max-w-2xl mx-auto">
              When you join PineapplePlay, you're not just signing up for a platform. You're stepping 
              into a world where your privacy is sacred, your experiences are elevated, and your 
              connections are genuine. We promise to always prioritize your discretion, maintain 
              our exclusive standards, and continuously evolve to exceed your expectations.
            </p>
            <div className="flex items-center justify-center space-x-2 text-gold">
              <span className="text-2xl">🍍</span>
              <span className="font-heading text-lg">Where Luxury Meets Lifestyle</span>
              <span className="text-2xl">🍍</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20" />
            <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm" />
            
            {/* Content */}
            <div className="relative z-10 py-16 px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-heading mb-4">
                <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent">
                  Ready to Join the Movement?
                </span>
              </h2>
              <p className="text-offWhite/70 font-body mb-8 max-w-xl mx-auto">
                Apply for membership today and discover a community that values what you value. 
                Exclusive. Elevated. Exceptional.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all text-lg"
                  data-testid="join-movement-btn"
                >
                  Join the Movement
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 border-2 border-gold/50 text-gold font-semibold rounded-full hover:bg-gold/10 transition-all text-lg"
                >
                  Member Login
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gold/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-heading text-gold">PineapplePlay</span>
              <span className="text-xl">🍍</span>
            </div>
            <div className="flex items-center space-x-6 text-sm font-body">
              <Link href="/" className="text-offWhite/60 hover:text-gold transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-gold">
                About
              </Link>
              <Link href="/login" className="text-offWhite/60 hover:text-gold transition-colors">
                Login
              </Link>
              <Link href="/register" className="text-offWhite/60 hover:text-gold transition-colors">
                Apply
              </Link>
            </div>
            <p className="text-offWhite/40 text-sm font-body">
              © {new Date().getFullYear()} PineapplePlay. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
