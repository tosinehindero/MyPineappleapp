'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import IdentityStep from './steps/IdentityStep';
import PreferencesStep from './steps/PreferencesStep';
import LifestyleStep from './steps/LifestyleStep';
import BioStep from './steps/BioStep';
import type {
  IdentityData,
  PreferencesData,
  LifestyleData,
  BioData,
  RegistrationData,
} from '@/lib/schemas';

const steps = [
  { id: 1, name: 'Identity', component: IdentityStep },
  { id: 2, name: 'Preferences', component: PreferencesStep },
  { id: 3, name: 'Lifestyle', component: LifestyleStep },
  { id: 4, name: 'The Bio', component: BioStep },
];

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data state
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);
  const [preferencesData, setPreferencesData] = useState<PreferencesData | null>(null);
  const [lifestyleData, setLifestyleData] = useState<LifestyleData | null>(null);

  const progress = (currentStep / steps.length) * 100;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
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

  const handleStepSubmit = async (data: any) => {
    setError(null);

    if (currentStep === 1) {
      setIdentityData(data as IdentityData);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setPreferencesData(data as PreferencesData);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setLifestyleData(data as LifestyleData);
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Final step - create user and save to Firestore
      setIsLoading(true);
      try {
        if (!identityData || !preferencesData || !lifestyleData) {
          throw new Error('Missing form data');
        }

        const bioData = data as BioData;

        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          identityData.email,
          identityData.password
        );

        const userId = userCredential.user.uid;

        // Upload photos to Firebase Storage
        const photoUrls = await uploadPhotos(bioData.photos, userId);

        // Prepare data for Firestore
        const registrationData: RegistrationData = {
          accountType: identityData.accountType,
          username: identityData.username,
          email: identityData.email,
          password: '', // Don't store password in Firestore
          confirmPassword: '',
          ageConfirmation: identityData.ageConfirmation,
          experienceLevel: preferencesData.experienceLevel,
          location: preferencesData.location,
          ageRangeMin: preferencesData.ageRangeMin,
          ageRangeMax: preferencesData.ageRangeMax,
          interests: lifestyleData.interests,
          lookingFor: lifestyleData.lookingFor,
          description: bioData.description,
          fantasies: bioData.fantasies,
          photoUrls,
          createdAt: new Date(),
          userId,
        };

        // Save to Firestore
        await setDoc(doc(db, 'members', userId), registrationData);

        setSuccess(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Registration error:', err);
        setError(err.message || 'Registration failed. Please try again.');
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto mb-8 shadow-gold-glow"
          >
            <svg
              className="w-12 h-12 text-charcoal"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7"></path>
            </svg>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-heading text-gold mb-4">
            Welcome to PineapplePlay!
          </h1>
          <p className="text-offWhite/80 text-lg mb-8 font-body">
            Your application has been successfully submitted. We'll review your profile and get back to you soon.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Return Home
          </button>
        </div>
      </motion.div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-charcoal py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-heading text-gold mb-2">
            Join PineapplePlay
          </h1>
          <p className="text-offWhite/70 font-body">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-darkBlue rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold shadow-gold-glow"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-xs font-body ${
                  step.id <= currentStep ? 'text-gold' : 'text-offWhite/40'
                }`}
              >
                {step.name}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="glass-morphism rounded-2xl p-8 min-h-[500px]">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
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
              <CurrentStepComponent
                onSubmit={handleStepSubmit}
                onBack={handleBack}
                initialData={
                  currentStep === 1
                    ? identityData
                    : currentStep === 2
                    ? preferencesData
                    : currentStep === 3
                    ? lifestyleData
                    : null
                }
                isLoading={isLoading}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
