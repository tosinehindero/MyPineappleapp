'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lifestyleSchema, type LifestyleData } from '@/lib/schemas';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface LifestyleStepProps {
  onSubmit: (data: LifestyleData) => void;
  onBack: () => void;
  initialData: LifestyleData | null;
  isLoading: boolean;
}

const interestOptions = [
  'Swingers',
  'BDSM',
  'Voyeurism',
  'Soft Swap',
  'Full Swap',
  'Luxury Travel',
  'Educational Workshops',
];

const lookingForOptions = [
  'Friendship',
  'Play Partners',
  'Travel Buddies',
  'Long-term Poly',
];

export default function LifestyleStep({
  onSubmit,
  onBack,
  initialData,
  isLoading,
}: LifestyleStepProps) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LifestyleData>({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: initialData || {
      interests: [],
      lookingFor: [],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Community Interests */}
      <div>
        <label className="block text-gold font-heading text-xl mb-3">
          What draws you to the community? <span className="text-red-400">*</span>
        </label>
        <p className="text-offWhite/70 text-sm font-body mb-4">
          Select all that apply
        </p>
        <Controller
          name="interests"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-3">
              {interestOptions.map((interest) => {
                const isSelected = field.value.includes(interest);
                return (
                  <motion.button
                    key={interest}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const newValue = isSelected
                        ? field.value.filter((i) => i !== interest)
                        : [...field.value, interest];
                      field.onChange(newValue);
                    }}
                    className={`px-6 py-3 rounded-full border-2 transition-all font-body ${
                      isSelected
                        ? 'bg-gold text-charcoal border-gold shadow-gold-glow-sm'
                        : 'bg-darkBlue/50 text-offWhite border-gold/30 hover:border-gold/60'
                    }`}
                    data-testid={`interest-chip-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {interest}
                  </motion.button>
                );
              })}
            </div>
          )}
        />
        {errors.interests && (
          <p className="mt-2 text-sm text-red-400">{errors.interests.message}</p>
        )}
      </div>

      {/* Looking For */}
      <div>
        <label className="block text-gold font-heading text-xl mb-3">
          Looking For: <span className="text-red-400">*</span>
        </label>
        <p className="text-offWhite/70 text-sm font-body mb-4">
          Select all that apply
        </p>
        <Controller
          name="lookingFor"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lookingForOptions.map((option) => {
                const isSelected = field.value.includes(option);
                return (
                  <motion.button
                    key={option}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const newValue = isSelected
                        ? field.value.filter((i) => i !== option)
                        : [...field.value, option];
                      field.onChange(newValue);
                    }}
                    className={`px-6 py-4 rounded-lg border-2 transition-all font-body text-left ${
                      isSelected
                        ? 'bg-gold/20 text-gold border-gold'
                        : 'bg-darkBlue/50 text-offWhite border-gold/30 hover:border-gold/60'
                    }`}
                    data-testid={`looking-for-chip-${option.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {isSelected && (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        />
        {errors.lookingFor && (
          <p className="mt-2 text-sm text-red-400">{errors.lookingFor.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onBack}
          className="px-8 py-3 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all"
        >
          ← Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
          data-testid="next-button"
        >
          Next Step →
        </motion.button>
      </div>
    </form>
  );
}
