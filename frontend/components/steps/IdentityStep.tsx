'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { identitySchema, type IdentityData } from '@/lib/schemas';
import { motion } from 'framer-motion';

interface IdentityStepProps {
  onSubmit: (data: IdentityData) => void;
  onBack: () => void;
  initialData: IdentityData | null;
  isLoading: boolean;
}

const accountTypes = [
  'Single Male',
  'Single Female',
  'Couple (M/F)',
  'Couple (F/F)',
  'Poly Triad (M/W/M)',
  'Poly Triad (W/M/W)',
];

export default function IdentityStep({
  onSubmit,
  initialData,
  isLoading,
}: IdentityStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdentityData>({
    resolver: zodResolver(identitySchema),
    defaultValues: initialData || undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Account Type */}
      <div>
        <label className="block text-gold font-body mb-2">
          Account Type <span className="text-red-400">*</span>
        </label>
        <select
          {...register('accountType')}
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="account-type-select"
        >
          <option value="">Select account type...</option>
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.accountType && (
          <p className="mt-1 text-sm text-red-400">{errors.accountType.message}</p>
        )}
      </div>

      {/* Username */}
      <div>
        <label className="block text-gold font-body mb-2">
          Username <span className="text-red-400">*</span>
        </label>
        <input
          {...register('username')}
          type="text"
          placeholder="Choose a unique username"
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="username-input"
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-gold font-body mb-2">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="email-input"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-gold font-body mb-2">
          Password <span className="text-red-400">*</span>
        </label>
        <input
          {...register('password')}
          type="password"
          placeholder="Create a strong password"
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="password-input"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
        )}
        <p className="mt-1 text-xs text-offWhite/60">
          Must include uppercase, lowercase, number, and special character
        </p>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-gold font-body mb-2">
          Confirm Password <span className="text-red-400">*</span>
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          placeholder="Re-enter your password"
          className="w-full px-4 py-3 bg-darkBlue border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body"
          data-testid="confirm-password-input"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Age Confirmation */}
      <div className="flex items-start space-x-3">
        <input
          {...register('ageConfirmation')}
          type="checkbox"
          className="mt-1 w-5 h-5 rounded border-gold/20 bg-darkBlue text-gold focus:ring-gold focus:ring-offset-charcoal"
          data-testid="age-confirmation-checkbox"
        />
        <label className="text-offWhite/90 font-body">
          I confirm I am at least 21 years old <span className="text-red-400">*</span>
        </label>
      </div>
      {errors.ageConfirmation && (
        <p className="text-sm text-red-400">{errors.ageConfirmation.message}</p>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="next-button"
        >
          Next Step →
        </motion.button>
      </div>
    </form>
  );
}
