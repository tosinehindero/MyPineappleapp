'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { step3Schema, type Step3Data } from '@/lib/registration-schemas';
import { Shield, Camera, Video, CheckCircle2, AlertTriangle, Upload, X } from 'lucide-react';

interface SafetyMediaStepProps {
  onSubmit: (data: Step3Data) => void;
  onBack: () => void;
  initialData: Partial<Step3Data> | null;
  isLoading: boolean;
}

const consentItems = [
  {
    id: 'consentPledge',
    title: 'Consent Pledge',
    icon: Shield,
    description: 'I pledge to always respect boundaries and obtain enthusiastic consent before any interaction. I understand that "No" means no, and silence is not consent.',
  },
  {
    id: 'privacyAgreement',
    title: 'Privacy Agreement',
    icon: Shield,
    description: 'I agree to respect the privacy of all members. I will not share photos, videos, or personal information of other members without their explicit written consent.',
  },
  {
    id: 'healthStandards',
    title: 'Health & Safety Standards',
    icon: Shield,
    description: 'I acknowledge the importance of sexual health. I commit to regular testing and honest communication about my health status with potential partners.',
  },
  {
    id: 'videoVettingAgreement',
    title: 'Video Vetting Agreement',
    icon: Video,
    description: 'I understand that to earn the "Verified Pineapple" badge, I may be required to complete a brief video verification call with our vetting team. This helps ensure the safety and authenticity of our community.',
  },
  {
    id: 'ageVerification',
    title: 'Age Verification',
    icon: CheckCircle2,
    description: 'I confirm that I am at least 21 years of age and legally able to access adult content. I understand that providing false information may result in immediate removal from the platform.',
  },
];

export default function SafetyMediaStep({
  onSubmit,
  onBack,
  isLoading,
}: SafetyMediaStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      consentPledge: false,
      privacyAgreement: false,
      healthStandards: false,
      videoVettingAgreement: false,
      ageVerification: false,
      photos: [],
      videoIntro: undefined,
    },
  });

  const photos = watch('photos') || [];
  const allConsentsAccepted = watch('consentPledge') && 
    watch('privacyAgreement') && 
    watch('healthStandards') && 
    watch('videoVettingAgreement') && 
    watch('ageVerification');

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
      const currentPhotos = photos || [];
      const newPhotos = [...currentPhotos, ...imageFiles].slice(0, 10);

      setValue('photos', newPhotos, { shouldValidate: true });

      // Create previews
      imageFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string].slice(0, 10));
        };
        reader.readAsDataURL(file);
      });
    },
    [photos, setValue]
  );

  const handleVideoFile = useCallback((file: File | null) => {
    if (!file) {
      setValue('videoIntro', undefined);
      setVideoPreview(null);
      return;
    }

    if (file.type.startsWith('video/')) {
      setValue('videoIntro', file, { shouldValidate: true });
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  }, [setValue]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setValue('photos', newPhotos, { shouldValidate: true });
    setPreviews(newPreviews);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Section: Consent & Safety Pledges */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-gold">
          <Shield className="w-5 h-5" />
          <h3 className="text-lg font-heading">Safety & Consent Pledges</h3>
        </div>
        
        <div className="bg-darkBlue/30 border border-gold/20 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-sm text-offWhite/80">
              PineapplePlay is a consent-first community. Please read and agree to each statement below. 
              These agreements are essential to maintaining a safe, respectful environment for all members.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {consentItems.map((item) => (
            <Controller
              key={item.id}
              name={item.id as keyof Step3Data}
              control={control}
              render={({ field }) => (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    field.value
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-gold/20 hover:border-gold/40'
                  }`}
                  onClick={() => field.onChange(!field.value)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      field.value ? 'border-green-500 bg-green-500' : 'border-gold/40'
                    }`}>
                      {field.value && <CheckCircle2 className="w-4 h-4 text-charcoal" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className={`w-5 h-5 ${field.value ? 'text-green-500' : 'text-gold'}`} />
                        <h4 className={`font-heading ${field.value ? 'text-green-400' : 'text-gold'}`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-sm text-offWhite/70">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            />
          ))}
        </div>
        
        {(errors.consentPledge || errors.privacyAgreement || errors.healthStandards || 
          errors.videoVettingAgreement || errors.ageVerification) && (
          <p className="text-sm text-red-400">Please agree to all consent pledges to continue</p>
        )}
      </div>

      {/* Section: Photo Upload */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Camera className="w-5 h-5" />
            <h3 className="text-lg font-heading">Profile Photos</h3>
          </div>
          <span className="text-sm text-offWhite/60">
            {photos.length}/10 photos
          </span>
        </div>
        
        <p className="text-sm text-offWhite/70">
          Upload 3-10 photos that represent you. At least one clear face photo is required for verification.
          Photos should be recent and accurately represent your appearance.
        </p>

        <Controller
          name="photos"
          control={control}
          render={() => (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-gold bg-gold/10'
                  : photos.length >= 3
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-gold/30 hover:border-gold/60'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="photo-upload-input"
              />
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Upload className={`w-12 h-12 ${photos.length >= 3 ? 'text-green-500' : 'text-gold'}`} />
                </div>
                <div>
                  <p className="text-offWhite font-body">
                    <span className="text-gold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-offWhite/60 mt-1">
                    JPG, PNG, or WebP • Max 15MB each • 3-10 photos required
                  </p>
                </div>
              </div>
            </div>
          )}
        />
        {errors.photos && (
          <p className="text-sm text-red-400">{errors.photos.message}</p>
        )}

        {/* Photo Previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {previews.map((preview, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group aspect-square"
              >
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-gold/20"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-gold text-charcoal text-xs rounded">
                    Primary
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Video Intro (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <Video className="w-5 h-5" />
          <h3 className="text-lg font-heading">Video Introduction</h3>
          <span className="text-xs text-offWhite/50">(Optional but recommended)</span>
        </div>
        
        <p className="text-sm text-offWhite/70">
          A short video intro helps your profile stand out and speeds up the verification process. 
          15-60 seconds is ideal. Just be yourself!
        </p>

        {!videoPreview ? (
          <div className="relative border-2 border-dashed border-gold/30 rounded-xl p-6 text-center hover:border-gold/60 transition-all">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(e) => handleVideoFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="video-upload-input"
            />
            <div className="space-y-2">
              <Video className="w-10 h-10 text-gold mx-auto" />
              <p className="text-offWhite/70 text-sm">
                Upload a video (MP4, MOV, WebM • Max 50MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <video
              src={videoPreview}
              controls
              className="w-full max-h-64 rounded-xl border-2 border-gold/20"
            />
            <button
              type="button"
              onClick={() => handleVideoFile(null)}
              className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
        {errors.videoIntro && (
          <p className="text-sm text-red-400">{errors.videoIntro.message}</p>
        )}
      </div>

      {/* Verified Pineapple Badge Info */}
      <div className="bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold flex-shrink-0">
            <img
              src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
              alt="Verified Pineapple"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="font-heading text-gold text-lg mb-2">Earn Your Verified Pineapple Badge</h4>
            <p className="text-sm text-offWhite/70">
              Complete your profile with photos and pass our quick video vetting call to earn the exclusive 
              "Verified Pineapple" badge. Verified members get 3x more profile views and connection requests!
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !allConsentsAccepted || photos.length < 3}
          className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="submit-registration-button"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <CheckCircle2 className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}
