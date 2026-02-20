'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

const MASTER_KEY = 'Pineapple-Admin-2024';

export default function AdminSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate master key
    if (masterKey !== MASTER_KEY) {
      toast.error('Invalid Master System Key', {
        description: 'Access denied. The master key is incorrect.',
      });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Create admin profile in Firestore
      await setDoc(doc(db, 'members', user.uid), {
        uid: user.uid,
        email: user.email,
        username: email.split('@')[0] + '_admin',
        role: 'admin',
        isVerified: true,
        status: 'verified',
        accountType: 'Admin',
        experienceLevel: 'System Administrator',
        location: 'System',
        interests: [],
        lookingFor: [],
        fantasies: '',
        description: 'System Administrator',
        photoUrls: [],
        ageRangeMin: 21,
        ageRangeMax: 99,
        createdAt: serverTimestamp(),
        verifiedAt: serverTimestamp(),
      });

      toast.success('Admin Account Created Successfully!', {
        description: 'Redirecting to dashboard...',
        duration: 3000,
      });

      // Step 3: Redirect to admin dashboard with success flag
      setTimeout(() => {
        router.push('/admin/vetting?initialized=true');
      }, 2000);

    } catch (error: any) {
      console.error('Admin setup error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use', {
          description: 'This email is already registered.',
        });
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak', {
          description: 'Please use a stronger password.',
        });
      } else {
        toast.error('Setup failed', {
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#0F172A',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#F8FAFC',
          },
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Warning Banner */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-red-400 font-semibold text-sm">SECURITY WARNING</h3>
              <p className="text-red-300/80 text-xs mt-1">
                This page should be deleted after initial admin setup. Do not leave this route accessible in production.
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-darkBlue/80 backdrop-blur-xl rounded-2xl border border-gold/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/30">
              <svg className="w-8 h-8 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading text-gold">Admin Initialization</h1>
            <p className="text-offWhite/60 text-sm font-body mt-2">
              One-time setup for the first administrator account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pineappleplay.com"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
                data-testid="admin-email-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-gold transition-colors disabled:opacity-50 pr-12"
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-offWhite/40 hover:text-gold transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
                data-testid="admin-confirm-password-input"
              />
            </div>

            {/* Master Key Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gold/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-darkBlue text-gold/60 text-xs font-body uppercase tracking-wider">
                  Authorization Required
                </span>
              </div>
            </div>

            {/* Master System Key */}
            <div>
              <label className="block text-offWhite/80 text-sm font-body mb-2">
                Master System Key
              </label>
              <input
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Enter the secret master key"
                required
                disabled={loading}
                className="w-full px-4 py-3 bg-charcoal border border-red-500/30 rounded-xl text-offWhite font-body placeholder-offWhite/40 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                data-testid="admin-master-key-input"
              />
              <p className="text-offWhite/40 text-xs mt-2">
                This key was provided during system deployment
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-gold to-gold-light text-charcoal font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
              data-testid="admin-setup-submit"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Initializing Admin...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Initialize Admin Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="text-offWhite/40 text-sm font-body hover:text-gold transition-colors"
            >
              Cancel and return home
            </Link>
          </div>
        </div>

        {/* Bottom Warning */}
        <p className="text-center text-offWhite/30 text-xs mt-6 font-body">
          After initialization, delete <code className="text-red-400/80">app/admin/setup-secret/page.tsx</code>
        </p>
      </motion.div>
    </div>
  );
}
