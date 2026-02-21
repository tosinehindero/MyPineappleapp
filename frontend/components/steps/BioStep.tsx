'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bioSchema, type BioData } from '@/lib/schemas';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';

interface BioStepProps {
  onSubmit: (data: BioData) => void;
  onBack: () => void;
  initialData: any;
  isLoading: boolean;
}

export default function BioStep({
  onSubmit,
  onBack,
  isLoading,
}: BioStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BioData>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      description: '',
      fantasies: '',
      photos: [],
    },
  });

  const photos = watch('photos');
  const description = watch('description');
  const fantasies = watch('fantasies');

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const currentPhotos = photos || [];
      const newPhotos = [...currentPhotos, ...fileArray].slice(0, 100); // Max 100 photos

      setValue('photos', newPhotos, { shouldValidate: true });

      // Create previews
      const newPreviews: string[] = [];
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === fileArray.length) {
            setPreviews((prev) => [...prev, ...newPreviews].slice(0, 100));
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [photos, setValue]
  );

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Description */}
      <div>
        <label className="block text-gold font-body mb-2">
          About You <span className="text-red-400">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={5}
          placeholder="Tell us about yourself, your interests, and what makes you unique..."
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
          data-testid="description-textarea"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {errors.description && (
              <p className="text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>
          <p className="text-xs text-offWhite/60">
            {description?.length || 0} / 1000 characters
          </p>
        </div>
      </div>

      {/* Fantasies & Experiences */}
      <div>
        <label className="block text-gold font-body mb-2">
          Fantasies & Experiences <span className="text-red-400">*</span>
        </label>
        <textarea
          {...register('fantasies')}
          rows={5}
          placeholder="Share your desires, fantasies, and past experiences in the lifestyle..."
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
          data-testid="fantasies-textarea"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {errors.fantasies && (
              <p className="text-sm text-red-400">{errors.fantasies.message}</p>
            )}
          </div>
          <p className="text-xs text-offWhite/60">
            {fantasies?.length || 0} / 1000 characters
          </p>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-gold font-body mb-2">
          Photos <span className="text-red-400">*</span>
        </label>
        <p className="text-sm text-offWhite/70 mb-3">
          Upload up to 100 high-resolution photos (max 20MB each). JPG, PNG, SVG, GIF supported.
        </p>

        <Controller
          name="photos"
          control={control}
          render={({ field }) => (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive
                  ? 'border-gold bg-gold/10'
                  : 'border-gold/30 hover:border-gold/60'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/gif"
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="photo-upload-input"
              />
              <div className="space-y-3">
                <div className="flex justify-center">
                  <svg
                    className="w-12 h-12 text-gold"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-offWhite font-body">
                    <span className="text-gold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-offWhite/60 mt-1">
                    High-resolution images retained • No cropping
                  </p>
                </div>
              </div>
            </div>
          )}
        />
        {errors.photos && (
          <p className="mt-2 text-sm text-red-400">{errors.photos.message}</p>
        )}
        {photos && photos.length > 0 && (
          <p className="mt-2 text-sm text-gold">
            {photos.length} photo{photos.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gold/20"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="px-8 py-3 border-2 border-gold/40 text-gold rounded-full hover:bg-gold/10 transition-all disabled:opacity-50"
        >
          ← Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center space-x-2"
          data-testid="submit-button"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Submitting...</span>
            </>
          ) : (
            <span>Complete Registration ✓</span>
          )}
        </motion.button>
      </div>
    </form>
  );
}
