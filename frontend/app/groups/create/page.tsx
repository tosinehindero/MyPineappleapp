'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import { useSubscription } from '@/lib/subscription';
import { createGroup, canCreateGroup, type GroupPrivacy } from '@/lib/groups';

export default function CreateGroupPage() {
  const router = useRouter();
  const { subscription, loading: subLoading } = useSubscription();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
  const [vettingRequired, setVettingRequired] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      const userDoc = await getDoc(doc(db, 'members', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Check access
  useEffect(() => {
    if (!loading && !subLoading && userProfile) {
      const canCreate = canCreateGroup(subscription?.tier || 'free', userProfile?.isFounder);
      if (!canCreate) {
        toast.error('Premium or Founder status required to create circles');
        router.push('/groups');
      }
    }
  }, [loading, subLoading, subscription, userProfile, router]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    if (!name.trim()) {
      toast.error('Circle name is required');
      return;
    }

    if (name.length < 3) {
      toast.error('Circle name must be at least 3 characters');
      return;
    }

    setCreating(true);

    const result = await createGroup(
      currentUser.uid,
      name.trim(),
      description.trim(),
      privacy,
      vettingRequired,
      coverImage || undefined
    );

    if (result.success && result.groupId) {
      toast.success('Circle created successfully!');
      router.push(`/groups/${result.groupId}`);
    } else {
      toast.error(result.error || 'Failed to create circle');
      setCreating(false);
    }
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <div className="relative bg-gradient-to-b from-darkBlue to-charcoal py-8 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Link href="/groups" className="text-gold/60 hover:text-gold text-sm font-body mb-4 inline-block">
            ← Back to Circles
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-gold">Create Inner Circle</h1>
          <p className="text-offWhite/60 font-body mt-2">
            Build your exclusive community
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cover Image */}
          <div>
            <label className="block text-offWhite font-body font-semibold mb-3">
              Cover Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-[3/1] bg-darkBlue/50 border-2 border-dashed border-gold/30 rounded-2xl overflow-hidden cursor-pointer hover:border-gold/50 transition-colors group"
            >
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-charcoal/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-gold font-body">Change Image</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-offWhite/40">
                  <svg className="w-12 h-12 mb-2" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-body">Click to upload cover image</span>
                  <span className="text-sm mt-1">Recommended: 1200x400px</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="hidden"
            />
          </div>

          {/* Circle Name */}
          <div>
            <label className="block text-offWhite font-body font-semibold mb-3">
              Circle Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Miami Swingers Elite"
              maxLength={50}
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
              data-testid="group-name-input"
            />
            <p className="text-offWhite/40 text-xs mt-2 font-body">{name.length}/50 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-offWhite font-body font-semibold mb-3">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell members what this circle is about..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold resize-none"
              data-testid="group-description-input"
            />
            <p className="text-offWhite/40 text-xs mt-2 font-body">{description.length}/500 characters</p>
          </div>

          {/* Privacy Settings */}
          <div>
            <label className="block text-offWhite font-body font-semibold mb-3">
              Privacy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'public', label: 'Public', desc: 'Anyone can see and join' },
                { value: 'private', label: 'Private', desc: 'Visible but requires approval' },
                { value: 'secret', label: 'Secret', desc: 'Invite-only, hidden from search' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPrivacy(option.value as GroupPrivacy)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    privacy === option.value
                      ? 'border-gold bg-gold/10'
                      : 'border-gold/20 bg-darkBlue/30 hover:border-gold/40'
                  }`}
                  data-testid={`privacy-${option.value}`}
                >
                  <p className={`font-body font-semibold ${
                    privacy === option.value ? 'text-gold' : 'text-offWhite'
                  }`}>
                    {option.label}
                  </p>
                  <p className="text-offWhite/50 text-xs mt-1 font-body">
                    {option.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Vetting Toggle */}
          <div className="bg-darkBlue/30 border border-gold/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-offWhite font-body font-semibold">Vetting Required</p>
                <p className="text-offWhite/50 text-sm font-body mt-1">
                  Manually approve every new member before they can join
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVettingRequired(!vettingRequired)}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  vettingRequired ? 'bg-gold' : 'bg-white/10'
                }`}
                data-testid="vetting-toggle"
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    vettingRequired ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full py-4 bg-gold text-charcoal font-heading text-lg rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="create-group-submit"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating Circle...</span>
                </>
              ) : (
                <span>Create Circle</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
