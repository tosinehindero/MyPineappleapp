'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesSchema, type PreferencesData } from '@/lib/schemas';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface PreferencesStepProps {
  onSubmit: (data: PreferencesData) => void;
  onBack: () => void;
  initialData: PreferencesData | null;
  isLoading: boolean;
}

const experienceLevels = ['Beginner', 'Intermediate', 'Seasoned/Pro'];

export default function PreferencesStep({
  onSubmit,
  onBack,
  initialData,
  isLoading,
}: PreferencesStepProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: initialData || {
      ageRangeMin: 21,
      ageRangeMax: 50,
    },
  });

  const ageRangeMin = watch('ageRangeMin');
  const ageRangeMax = watch('ageRangeMax');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Experience Level */}
      <div>
        <label className="block text-gold font-body mb-3">
          Experience Level <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {experienceLevels.map((level) => (
            <label
              key={level}
              className="relative flex items-center justify-center cursor-pointer"
            >
              <input
                {...register('experienceLevel')}
                type="radio"
                value={level}
                className="sr-only peer"
              />
              <div className="w-full px-4 py-3 border-2 border-gold/20 rounded-lg text-center transition-all peer-checked:border-gold peer-checked:bg-gold/10 hover:border-gold/40">
                <span className="text-offWhite font-body">{level}</span>
              </div>
            </label>
          ))}
        </div>
        {errors.experienceLevel && (
          <p className="mt-1 text-sm text-red-400">{errors.experienceLevel.message}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-gold font-body mb-2">
          Location (City/State) <span className="text-red-400">*</span>
        </label>
        <input
          {...register('location')}
          type="text"
          placeholder="e.g., Miami, FL"
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="location-input"
        />
        {errors.location && (
          <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>
        )}
      </div>

      {/* Age Range Slider */}
      <div>
        <label className="block text-gold font-body mb-3">
          Desired Age Range: {ageRangeMin} - {ageRangeMax} years
        </label>
        
        <div className="space-y-4">
          {/* Minimum Age */}
          <div>
            <label className="block text-offWhite/70 text-sm mb-2">Minimum Age</label>
            <Controller
              name="ageRangeMin"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="range"
                  min="18"
                  max="99"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-darkBlue rounded-lg appearance-none cursor-pointer accent-gold"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((field.value - 18) / (99 - 18)) * 100}%, #0F172A ${((field.value - 18) / (99 - 18)) * 100}%, #0F172A 100%)`,
                  }}
                />
              )}
            />
          </div>

          {/* Maximum Age */}
          <div>
            <label className="block text-offWhite/70 text-sm mb-2">Maximum Age</label>
            <Controller
              name="ageRangeMax"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="range"
                  min="18"
                  max="99"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-darkBlue rounded-lg appearance-none cursor-pointer accent-gold"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((field.value - 18) / (99 - 18)) * 100}%, #0F172A ${((field.value - 18) / (99 - 18)) * 100}%, #0F172A 100%)`,
                  }}
                />
              )}
            />
          </div>
        </div>
        {errors.ageRangeMax && (
          <p className="mt-1 text-sm text-red-400">{errors.ageRangeMax.message}</p>
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
