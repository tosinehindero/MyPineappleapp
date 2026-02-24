'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import AccountStep from './steps/AccountStep';
import ProfileStep from './steps/ProfileStep';
import SafetyMediaStep from './steps/SafetyMediaStep';
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  FullRegistrationData,
} from '@/lib/registration-schemas';
import { CheckCircle2, User, Heart, Shield } from 'lucide-react';
import Link from 'next/link';

const steps = [
  { id: 1, name: 'Account & Logistics', icon: User, description: 'Basic info & credentials' },
  { id: 2, name: 'Lifestyle Profile', icon: Heart, description: 'Interests & preferences' },
  { id: 3, name: 'Safety & Media', icon: Shield, description: 'Pledges & photos' },
];

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data state
  const [step1Data, setStep1Data] = useState<Partial<Step1Data> | null>(null);
  const [step2Data, setStep2Data] = useState<Partial<Step2Data> | null>(null);

  const progress = (currentStep / steps.length) * 100;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const uploadPhotos = async (files: File[], userId: string): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      const fileName = `${userId}/photo_${Date.now()}_${index}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `member-photos/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  };

  const uploadVideo = async (file: File, userId: string): Promise<string> => {
    const fileName = `${userId}/video_intro_${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `member-videos/${fileName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleStep1Submit = (data: Step1Data) => {
    setError(null);
    setStep1Data(data);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Submit = (data: Step2Data) => {
    setError(null);
    setStep2Data(data);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!step1Data || !step2Data) {
        throw new Error('Missing form data from previous steps');
      }

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        step1Data.email!,
        step1Data.password!
      );

      const userId = userCredential.user.uid;

      // Upload photos
      const photoUrls = await uploadPhotos(data.photos, userId);

      // Upload video if provided
      let videoIntroUrl: string | undefined;
      if (data.videoIntro) {
        videoIntroUrl = await uploadVideo(data.videoIntro, userId);
      }

      // Prepare full registration data
      const registrationData: Omit<FullRegistrationData, 'password'> = {
        // Step 1 data
        accountType: step1Data.accountType!,
        primaryName: step1Data.primaryName!,
        primaryAge: step1Data.primaryAge!,
        hasSecondaryUser: step1Data.hasSecondaryUser || false,
        secondaryName: step1Data.secondaryName,
        secondaryAge: step1Data.secondaryAge,
        username: step1Data.username!,
        email: step1Data.email!,
        city: step1Data.city!,
        state: step1Data.state!,
        country: step1Data.country!,
        travelStatus: step1Data.travelStatus!,

        // Step 2 data
        experienceLevel: step2Data.experienceLevel!,
        communityTenure: step2Data.communityTenure!,
        verificationHandles: step2Data.verificationHandles,
        interests: step2Data.interests!,
        preferenceType: step2Data.preferenceType!,
        ageRangeMin: step2Data.ageRangeMin!,
        ageRangeMax: step2Data.ageRangeMax!,
        aboutYou: step2Data.aboutYou!,
        fantasies: step2Data.fantasies!,

        // Step 3 data
        photoUrls,
        videoIntroUrl,

        // Metadata
        userId,
        createdAt: new Date(),
        status: 'pending',
        isVerified: false,
        verifiedPineapple: false,
      };

      // Build location string for compatibility with existing code
      const location = `${step1Data.city}, ${step1Data.state}`;

      // Save to Firestore members collection
      await setDoc(doc(db, 'members', userId), {
        ...registrationData,
        location, // Add combined location field
        description: step2Data.aboutYou, // Map for compatibility
        lookingFor: [], // Infer from interests if needed
        // Legacy field mappings
        ageConfirmation: true,
      });

      setSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please login or use a different email.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.message?.includes('permission')) {
        setError('Upload failed due to permissions. Please try again or contact support.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-charcoal flex items-center justify-center p-6"
      >
        <div className="max-w-2xl w-full text-center">
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </motion.div>

          {/* Pineapple logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 shadow-gold-glow border-2 border-gold/40"
          >
            <img
              src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
              alt="PineapplePlay Logo"
              className="w-full h-full object-cover"
              data-testid="registration-success-pineapple"
            />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-heading text-gold mb-4">
            Welcome to PineapplePlay!
          </h1>
          
          <p className="text-offWhite/80 text-lg mb-4 font-body">
            Your application has been successfully submitted.
          </p>
          
          <div className="bg-darkBlue/50 border border-gold/20 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-heading text-gold mb-3">What happens next?</h3>
            <ul className="space-y-2 text-offWhite/70 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gold">1.</span>
                <span>Our vetting team will review your application (usually within 24-48 hours)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">2.</span>
                <span>You may receive an invite for a brief video verification call</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">3.</span>
                <span>Once approved, you'll receive full access and your "Verified Pineapple" badge!</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            >
              Return Home
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/40 mx-auto shadow-lg">
              <img
                src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                alt="PineapplePlay Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading text-gold mb-2">
            Join PineapplePlay
          </h1>
          <p className="text-offWhite/60 font-body">
            Begin your journey with our exclusive community
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          {/* Step indicators */}
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.id 
                        ? 'bg-green-500 text-white' 
                        : currentStep === step.id 
                          ? 'bg-gold text-charcoal shadow-gold-glow' 
                          : 'bg-darkBlue border-2 border-gold/30 text-offWhite/50'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center hidden sm:block">
                    <p className={`text-sm font-body ${currentStep >= step.id ? 'text-gold' : 'text-offWhite/40'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-offWhite/40">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-gold/20'}`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Mobile step name */}
          <div className="sm:hidden text-center">
            <p className="text-gold font-body">
              Step {currentStep}: {steps[currentStep - 1].name}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-darkBlue rounded-full overflow-hidden mt-4">
            <motion.div
              className="h-full bg-gradient-to-r from-gold to-gold-light"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="glass-morphism rounded-2xl p-6 sm:p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl"
            >
              <p className="text-red-300 text-sm font-body">{error}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={currentStep}
              custom={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <AccountStep
                  onSubmit={handleStep1Submit}
                  initialData={step1Data}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 2 && (
                <ProfileStep
                  onSubmit={handleStep2Submit}
                  onBack={handleBack}
                  initialData={step2Data}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 3 && (
                <SafetyMediaStep
                  onSubmit={handleStep3Submit}
                  onBack={handleBack}
                  initialData={null}
                  isLoading={isLoading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-offWhite/40 text-sm font-body">
            Already a member?{' '}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
