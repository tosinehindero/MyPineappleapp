'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  step2Schema, 
  experienceLevels,
  communityTenureOptions,
  interestCategories,
  preferenceOptions,
  vibeHints,
  type Step2Data 
} from '@/lib/registration-schemas';
import { Sparkles, Heart, Link2, ChevronDown, Lightbulb } from 'lucide-react';

interface ProfileStepProps {
  onSubmit: (data: Step2Data) => void;
  onBack: () => void;
  initialData: Partial<Step2Data> | null;
  isLoading: boolean;
}

export default function ProfileStep({
  onSubmit,
  onBack,
  initialData,
  isLoading,
}: ProfileStepProps) {
  const [showVerificationHandles, setShowVerificationHandles] = useState(false);
  const [currentVibeHint, setCurrentVibeHint] = useState({ aboutYou: 0, fantasies: 0 });
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Social & Dating');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      experienceLevel: initialData?.experienceLevel || undefined,
      communityTenure: initialData?.communityTenure || undefined,
      verificationHandles: initialData?.verificationHandles || {},
      interests: initialData?.interests || [],
      preferenceType: initialData?.preferenceType || undefined,
      ageRangeMin: initialData?.ageRangeMin || 21,
      ageRangeMax: initialData?.ageRangeMax || 65,
      aboutYou: initialData?.aboutYou || '',
      fantasies: initialData?.fantasies || '',
    },
  });

  const selectedInterests = watch('interests') || [];
  const aboutYou = watch('aboutYou') || '';
  const fantasies = watch('fantasies') || '';
  const ageRangeMin = watch('ageRangeMin');
  const ageRangeMax = watch('ageRangeMax');

  // Rotate vibe hints
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVibeHint(prev => ({
        aboutYou: (prev.aboutYou + 1) % vibeHints.aboutYou.length,
        fantasies: (prev.fantasies + 1) % vibeHints.fantasies.length,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Section: Experience */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gold">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-lg font-heading">Experience Level</h3>
        </div>
        
        <Controller
          name="experienceLevel"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              {experienceLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => field.onChange(level)}
                  className={`w-full p-4 rounded-xl border-2 text-left font-body transition-all ${
                    field.value === level
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-gold/20 text-offWhite/70 hover:border-gold/50'
                  }`}
                  data-testid={`experience-${level.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        />
        {errors.experienceLevel && (
          <p className="text-sm text-red-400">{errors.experienceLevel.message}</p>
        )}
      </div>

      {/* Section: Community Tenure */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">How long in the community?</h3>
        
        <Controller
          name="communityTenure"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {communityTenureOptions.map((tenure) => (
                <button
                  key={tenure}
                  type="button"
                  onClick={() => field.onChange(tenure)}
                  className={`p-3 rounded-xl border-2 text-sm font-body transition-all ${
                    field.value === tenure
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-gold/20 text-offWhite/70 hover:border-gold/50'
                  }`}
                  data-testid={`tenure-${tenure.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  {tenure}
                </button>
              ))}
            </div>
          )}
        />
        {errors.communityTenure && (
          <p className="text-sm text-red-400">{errors.communityTenure.message}</p>
        )}
      </div>

      {/* Section: External Verification Handles (Collapsible) */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowVerificationHandles(!showVerificationHandles)}
          className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
        >
          <Link2 className="w-5 h-5" />
          <span className="font-heading text-lg">External Verification Handles</span>
          <span className="text-xs text-offWhite/50 ml-2">(Optional - helps verify you faster)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showVerificationHandles ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showVerificationHandles && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
            >
              <div>
                <label className="block text-offWhite/80 text-sm mb-2">SLS Username</label>
                <input
                  {...register('verificationHandles.sls')}
                  type="text"
                  placeholder="Your SLS handle"
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-offWhite/80 text-sm mb-2">Kasidie Username</label>
                <input
                  {...register('verificationHandles.kasidie')}
                  type="text"
                  placeholder="Your Kasidie handle"
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-offWhite/80 text-sm mb-2">SDC Username</label>
                <input
                  {...register('verificationHandles.sdc')}
                  type="text"
                  placeholder="Your SDC handle"
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-offWhite/80 text-sm mb-2">FetLife Username</label>
                <input
                  {...register('verificationHandles.fetlife')}
                  type="text"
                  placeholder="Your FetLife handle"
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-offWhite/80 text-sm mb-2">Other Platforms</label>
                <input
                  {...register('verificationHandles.other')}
                  type="text"
                  placeholder="Any other community handles (comma separated)"
                  className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Section: Interests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Heart className="w-5 h-5" />
            <h3 className="text-lg font-heading">Your Interests</h3>
          </div>
          <span className="text-sm text-offWhite/60">
            {selectedInterests.length} selected (min 3)
          </span>
        </div>
        
        <Controller
          name="interests"
          control={control}
          render={({ field }) => (
            <div className="space-y-4">
              {Object.entries(interestCategories).map(([category, interests]) => (
                <div key={category} className="border border-gold/20 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                    className="w-full flex items-center justify-between p-4 bg-darkBlue/30 hover:bg-darkBlue/50 transition-colors"
                  >
                    <span className="font-body text-offWhite">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gold">
                        {interests.filter(i => field.value.includes(i)).length}/{interests.length}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gold transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedCategory === category && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 flex flex-wrap gap-2">
                          {interests.map((interest) => {
                            const isSelected = field.value.includes(interest);
                            return (
                              <button
                                key={interest}
                                type="button"
                                onClick={() => {
                                  const newValue = isSelected
                                    ? field.value.filter(i => i !== interest)
                                    : [...field.value, interest];
                                  field.onChange(newValue);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-body transition-all ${
                                  isSelected
                                    ? 'bg-gold text-charcoal'
                                    : 'bg-darkBlue/50 text-offWhite/70 border border-gold/20 hover:border-gold/50'
                                }`}
                                data-testid={`interest-${interest.toLowerCase().replace(/[^a-z]/g, '-')}`}
                              >
                                {interest}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        />
        {errors.interests && (
          <p className="text-sm text-red-400">{errors.interests.message}</p>
        )}
      </div>

      {/* Section: Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">Connection Preferences</h3>
        
        <Controller
          name="preferenceType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {preferenceOptions.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => field.onChange(pref)}
                  className={`p-3 rounded-xl border-2 text-sm font-body transition-all ${
                    field.value === pref
                      ? 'border-gold bg-gold/20 text-gold'
                      : 'border-gold/20 text-offWhite/70 hover:border-gold/50'
                  }`}
                  data-testid={`preference-${pref.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  {pref}
                </button>
              ))}
            </div>
          )}
        />
        {errors.preferenceType && (
          <p className="text-sm text-red-400">{errors.preferenceType.message}</p>
        )}
      </div>

      {/* Age Range */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">
          Preferred Age Range: {ageRangeMin} - {ageRangeMax}
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-offWhite/70 text-sm mb-2">Minimum Age</label>
            <Controller
              name="ageRangeMin"
              control={control}
              render={({ field }) => (
                <input
                  type="range"
                  min="21"
                  max="99"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-darkBlue rounded-lg appearance-none cursor-pointer accent-gold"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((field.value - 21) / (99 - 21)) * 100}%, #0F172A ${((field.value - 21) / (99 - 21)) * 100}%, #0F172A 100%)`,
                  }}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-offWhite/70 text-sm mb-2">Maximum Age</label>
            <Controller
              name="ageRangeMax"
              control={control}
              render={({ field }) => (
                <input
                  type="range"
                  min="21"
                  max="99"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-darkBlue rounded-lg appearance-none cursor-pointer accent-gold"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((field.value - 21) / (99 - 21)) * 100}%, #0F172A ${((field.value - 21) / (99 - 21)) * 100}%, #0F172A 100%)`,
                  }}
                />
              )}
            />
          </div>
        </div>
        {errors.ageRangeMax && (
          <p className="text-sm text-red-400">{errors.ageRangeMax.message}</p>
        )}
      </div>

      {/* Section: About You */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">About You <span className="text-red-400">*</span></h3>
        
        {/* Vibe Hint */}
        <motion.div 
          key={currentVibeHint.aboutYou}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-gold/70 text-sm"
        >
          <Lightbulb className="w-4 h-4" />
          <span className="italic">Vibe: {vibeHints.aboutYou[currentVibeHint.aboutYou]}</span>
        </motion.div>
        
        <textarea
          {...register('aboutYou')}
          rows={6}
          placeholder="Tell us about yourself - your personality, hobbies, what makes you unique..."
          className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors resize-none"
          data-testid="about-you-textarea"
        />
        <div className="flex justify-between items-center">
          {errors.aboutYou && (
            <p className="text-sm text-red-400">{errors.aboutYou.message}</p>
          )}
          <p className="text-xs text-offWhite/50 ml-auto">
            {aboutYou.length} / 2000 characters (min 100)
          </p>
        </div>
      </div>

      {/* Section: Fantasies */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading text-gold">Fantasies & Desires <span className="text-red-400">*</span></h3>
        
        {/* Vibe Hint */}
        <motion.div 
          key={currentVibeHint.fantasies}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-gold/70 text-sm"
        >
          <Lightbulb className="w-4 h-4" />
          <span className="italic">Vibe: {vibeHints.fantasies[currentVibeHint.fantasies]}</span>
        </motion.div>
        
        <textarea
          {...register('fantasies')}
          rows={5}
          placeholder="Share your fantasies, bucket list experiences, what you're hoping to explore..."
          className="w-full px-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite focus:outline-none focus:border-gold transition-colors resize-none"
          data-testid="fantasies-textarea"
        />
        <div className="flex justify-between items-center">
          {errors.fantasies && (
            <p className="text-sm text-red-400">{errors.fantasies.message}</p>
          )}
          <p className="text-xs text-offWhite/50 ml-auto">
            {fantasies.length} / 1500 characters (min 50)
          </p>
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
          disabled={isLoading}
          className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="step2-next-button"
        >
          Continue to Verification
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>
    </form>
  );
}
