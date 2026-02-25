'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  step1Schema, 
  accountTypes, 
  travelStatusOptions,
  type Step1Data 
} from '@/lib/registration-schemas';
import { Eye, EyeOff, MapPin, Plane, Users, User } from 'lucide-react';

// Form input type (before refinements)
type Step1FormInput = {
  accountType: typeof accountTypes[number];
  primaryName: string;
  primaryAge: number;
  hasSecondaryUser: boolean;
  secondaryName?: string;
  secondaryAge?: number;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  city: string;
  state: string;
  country: string;
  travelStatus: typeof travelStatusOptions[number];
};

interface AccountStepProps {
  onSubmit: (data: Step1Data) => void;
  initialData: Partial<Step1FormInput> | null;
  isLoading: boolean;
}

export default function AccountStep({
  onSubmit,
  initialData,
  isLoading,
}: AccountStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1FormInput>({
    resolver: zodResolver(step1Schema) as any,
    defaultValues: {
      accountType: initialData?.accountType || undefined,
      primaryName: initialData?.primaryName || '',
      primaryAge: initialData?.primaryAge || 21,
      hasSecondaryUser: initialData?.hasSecondaryUser || false,
      secondaryName: initialData?.secondaryName || '',
      secondaryAge: initialData?.secondaryAge || 21,
      username: initialData?.username || '',
      email: initialData?.email || '',
      password: '',
      confirmPassword: '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      country: initialData?.country || 'United States',
      travelStatus: initialData?.travelStatus || undefined,
    },
  });

  const accountType = watch('accountType');
  const hasSecondaryUser = watch('hasSecondaryUser');

  // Auto-detect if account type suggests multiple people
  useEffect(() => {
    const coupleTypes = ['Couple (M/F)', 'Couple (M/M)', 'Couple (F/F)', 'Poly Triad', 'Poly Quad+'];
    if (coupleTypes.includes(accountType)) {
      setValue('hasSecondaryUser', true);
    }
  }, [accountType, setValue]);

  const showSecondaryFields = hasSecondaryUser && 
    ['Couple (M/F)', 'Couple (M/M)', 'Couple (F/F)', 'Poly Triad', 'Poly Quad+'].includes(accountType);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Section: Account Type */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <Users className="w-5 h-5" />
          <h3 className="text-lg font-heading">Account Type</h3>
        </div>
        
        <Controller
          name="accountType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accountTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => field.onChange(type)}
                  className={`p-3 rounded-xl border-2 text-sm font-body transition-all ${
                    field.value === type
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-gold/20 text-offWhite/70 hover:border-gold/50'
                  }`}
                  data-testid={`account-type-${type.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        />
        {errors.accountType && (
          <p className="text-sm text-red-400">{errors.accountType.message}</p>
        )}
      </div>

      {/* Section: Primary User */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <User className="w-5 h-5" />
          <h3 className="text-lg font-heading">
            {showSecondaryFields ? 'Primary Member' : 'Your Details'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              {showSecondaryFields ? 'First Name' : 'Display Name'} <span className="text-red-400">*</span>
            </label>
            <input
              {...register('primaryName')}
              type="text"
              placeholder="Enter name"
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
              data-testid="primary-name-input"
            />
            {errors.primaryName && (
              <p className="mt-1 text-sm text-red-400">{errors.primaryName.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              Age <span className="text-red-400">*</span>
            </label>
            <Controller
              name="primaryAge"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={21}
                  max={99}
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 21)}
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                  data-testid="primary-age-input"
                />
              )}
            />
            {errors.primaryAge && (
              <p className="mt-1 text-sm text-red-400">{errors.primaryAge.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Secondary User (for couples/polys) */}
      {showSecondaryFields && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-gold">
            <User className="w-5 h-5" />
            <h3 className="text-lg font-heading">Partner/Secondary Member</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-offWhite/80 text-sm mb-2">
                Partner's Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('secondaryName')}
                type="text"
                placeholder="Enter partner's name"
                className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                data-testid="secondary-name-input"
              />
              {errors.secondaryName && (
                <p className="mt-1 text-sm text-red-400">{errors.secondaryName.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-offWhite/80 text-sm mb-2">
                Partner's Age <span className="text-red-400">*</span>
              </label>
              <Controller
                name="secondaryAge"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={21}
                    max={99}
                    value={field.value || 21}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 21)}
                    className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                    data-testid="secondary-age-input"
                  />
                )}
              />
              {errors.secondaryAge && (
                <p className="mt-1 text-sm text-red-400">{errors.secondaryAge.message}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Section: Account Credentials */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">Account Credentials</h3>
        
        <div>
          <label className="block text-offWhite/80 text-sm mb-2">
            Username <span className="text-red-400">*</span>
          </label>
          <input
            {...register('username')}
            type="text"
            placeholder="Choose a unique username"
            className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
            data-testid="username-input"
          />
          <p className="mt-1 text-xs text-offWhite/50">Letters, numbers, and underscores only</p>
          {errors.username && (
            <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="block text-offWhite/80 text-sm mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
            data-testid="email-input"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                className="w-full px-4 py-3 pr-12 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-offWhite/50 hover:text-gold"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-offWhite/50">8+ chars, upper, lower, number, special</p>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 pr-12 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-offWhite/50 hover:text-gold"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <MapPin className="w-5 h-5" />
          <h3 className="text-lg font-heading">Location</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              City <span className="text-red-400">*</span>
            </label>
            <input
              {...register('city')}
              type="text"
              placeholder="Miami"
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
              data-testid="city-input"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-400">{errors.city.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              State/Province <span className="text-red-400">*</span>
            </label>
            <input
              {...register('state')}
              type="text"
              placeholder="Florida"
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
              data-testid="state-input"
            />
            {errors.state && (
              <p className="mt-1 text-sm text-red-400">{errors.state.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-offWhite/80 text-sm mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <input
              {...register('country')}
              type="text"
              placeholder="United States"
              className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
              data-testid="country-input"
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-400">{errors.country.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section: Travel Status */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <Plane className="w-5 h-5" />
          <h3 className="text-lg font-heading">Travel Willingness</h3>
        </div>
        
        <Controller
          name="travelStatus"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {travelStatusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => field.onChange(status)}
                  className={`p-3 rounded-xl border-2 text-sm font-body transition-all text-left ${
                    field.value === status
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-gold/20 text-offWhite/70 hover:border-gold/50'
                  }`}
                  data-testid={`travel-${status.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        />
        {errors.travelStatus && (
          <p className="text-sm text-red-400">{errors.travelStatus.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="step1-next-button"
        >
          Continue to Profile
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </form>
  );
}
