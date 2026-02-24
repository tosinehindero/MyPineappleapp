import { z } from 'zod';

// Account Types with expanded options
export const accountTypes = [
  'Single Male',
  'Single Female',
  'Couple (M/F)',
  'Couple (M/M)',
  'Couple (F/F)',
  'Poly Triad',
  'Poly Quad+',
  'Non-Binary Individual',
  'Other',
] as const;

// Experience levels
export const experienceLevels = [
  'Brand New (Curious)',
  'Beginner (Less than 1 year)',
  'Intermediate (1-3 years)',
  'Experienced (3-5 years)',
  'Veteran (5+ years)',
] as const;

// Community tenure
export const communityTenureOptions = [
  'Just starting out',
  'Less than 6 months',
  '6 months - 1 year',
  '1-2 years',
  '2-5 years',
  '5+ years',
] as const;

// Interest categories
export const interestCategories = {
  'Social & Dating': [
    'Casual Dating',
    'Friendship First',
    'Event Companions',
    'Travel Partners',
  ],
  'Lifestyle': [
    'Soft Swap',
    'Full Swap',
    'Same Room',
    'Separate Room',
    'Voyeurism',
    'Exhibitionism',
  ],
  'Kink & BDSM': [
    'Light BDSM',
    'Bondage',
    'Dominance/Submission',
    'Role Play',
  ],
  'Relationship Styles': [
    'Polyamory',
    'Open Relationship',
    'Hotwife/Cuckold',
    'Stag/Vixen',
  ],
  'Events & Social': [
    'House Parties',
    'Club Events',
    'Resort Takeovers',
    'Luxury Travel',
    'Educational Workshops',
  ],
} as const;

// Preference options
export const preferenceOptions = [
  'Singles Only',
  'Couples Only',
  'Both Singles & Couples',
  'Women Only',
  'Men Only',
  'All Genders',
] as const;

// Travel status options
export const travelStatusOptions = [
  'Local Only',
  'Willing to Travel (within state)',
  'Willing to Travel (domestic)',
  'International Traveler',
  'Frequent Traveler',
] as const;

// ============================================
// STEP 1: Account & Logistics Schema
// ============================================
export const step1Schema = z.object({
  // Account Type
  accountType: z.enum(accountTypes, {
    message: 'Please select your account type',
  }),
  
  // Primary User Info
  primaryName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  primaryAge: z.number()
    .min(21, 'Must be at least 21 years old')
    .max(99, 'Please enter a valid age'),
  
  // Secondary User Info (for couples/polys)
  hasSecondaryUser: z.boolean().default(false),
  secondaryName: z.string().optional(),
  secondaryAge: z.number().min(21).max(99).optional(),
  
  // Account Credentials
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(25, 'Username must be less than 25 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
      'Must include uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string(),
  
  // Location
  city: z.string()
    .min(2, 'Please enter your city')
    .max(100, 'City name is too long'),
  state: z.string()
    .min(2, 'Please enter your state/province')
    .max(100, 'State name is too long'),
  country: z.string()
    .min(2, 'Please enter your country')
    .max(100, 'Country name is too long')
    .default('United States'),
  
  // Travel Status
  travelStatus: z.enum(travelStatusOptions, {
    message: 'Please select your travel willingness',
  }),
  
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => {
  // If account type suggests multiple people, secondary info might be needed
  const coupleTypes = ['Couple (M/F)', 'Couple (M/M)', 'Couple (F/F)', 'Poly Triad', 'Poly Quad+'];
  if (coupleTypes.includes(data.accountType) && data.hasSecondaryUser) {
    return data.secondaryName && data.secondaryName.length >= 2 && data.secondaryAge && data.secondaryAge >= 21;
  }
  return true;
}, {
  message: 'Please fill in partner/secondary user details',
  path: ['secondaryName'],
});

// ============================================
// STEP 2: Lifestyle Profile Schema
// ============================================
export const step2Schema = z.object({
  // Experience
  experienceLevel: z.enum(experienceLevels, {
    message: 'Please select your experience level',
  }),
  communityTenure: z.enum(communityTenureOptions, {
    message: 'Please select how long you\'ve been in the community',
  }),
  
  // External Verification (optional)
  verificationHandles: z.object({
    sls: z.string().max(100).optional(),
    kasidie: z.string().max(100).optional(),
    sdc: z.string().max(100).optional(),
    fetlife: z.string().max(100).optional(),
    other: z.string().max(200).optional(),
  }).optional(),
  
  // Interests (at least 3 required)
  interests: z.array(z.string())
    .min(3, 'Please select at least 3 interests'),
  
  // Preferences
  preferenceType: z.enum(preferenceOptions, {
    message: 'Please select your connection preferences',
  }),
  ageRangeMin: z.number().min(21).max(99).default(21),
  ageRangeMax: z.number().min(21).max(99).default(65),
  
  // About You - with vibe hints
  aboutYou: z.string()
    .min(100, 'Please write at least 100 characters about yourself')
    .max(2000, 'About section must be less than 2000 characters'),
  
  // Fantasies
  fantasies: z.string()
    .min(50, 'Please write at least 50 characters about your fantasies')
    .max(1500, 'Fantasies section must be less than 1500 characters'),
    
}).refine((data) => data.ageRangeMin <= data.ageRangeMax, {
  message: 'Minimum age must be less than maximum age',
  path: ['ageRangeMax'],
});

// ============================================
// STEP 3: Safety, Professionalism & Media Schema
// ============================================
export const step3Schema = z.object({
  // Consent Pledges
  consentPledge: z.boolean()
    .refine((val) => val === true, 'You must agree to the consent pledge'),
  
  privacyAgreement: z.boolean()
    .refine((val) => val === true, 'You must agree to the privacy agreement'),
  
  healthStandards: z.boolean()
    .refine((val) => val === true, 'You must acknowledge the health standards'),
  
  videoVettingAgreement: z.boolean()
    .refine((val) => val === true, 'You must agree to video vetting to be verified'),
  
  ageVerification: z.boolean()
    .refine((val) => val === true, 'You must confirm you are 21 or older'),
  
  // Media Upload
  photos: z.array(z.instanceof(File))
    .min(3, 'Please upload at least 3 photos')
    .max(10, 'Maximum 10 photos allowed')
    .refine(
      (files) => files.every((file) => file.size <= 15 * 1024 * 1024),
      'Each photo must be less than 15MB'
    )
    .refine(
      (files) =>
        files.every((file) =>
          ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
        ),
      'Only JPG, PNG, and WebP files are allowed'
    ),
  
  // Optional video intro
  videoIntro: z.instanceof(File).optional()
    .refine(
      (file) => !file || file.size <= 50 * 1024 * 1024,
      'Video must be less than 50MB'
    )
    .refine(
      (file) => !file || ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type),
      'Only MP4, MOV, and WebM videos are allowed'
    ),
});

// ============================================
// Combined Registration Data Type
// ============================================
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;

export interface FullRegistrationData {
  // Step 1
  accountType: string;
  primaryName: string;
  primaryAge: number;
  hasSecondaryUser: boolean;
  secondaryName?: string;
  secondaryAge?: number;
  username: string;
  email: string;
  city: string;
  state: string;
  country: string;
  travelStatus: string;
  
  // Step 2
  experienceLevel: string;
  communityTenure: string;
  verificationHandles?: {
    sls?: string;
    kasidie?: string;
    sdc?: string;
    fetlife?: string;
    other?: string;
  };
  interests: string[];
  preferenceType: string;
  ageRangeMin: number;
  ageRangeMax: number;
  aboutYou: string;
  fantasies: string;
  
  // Step 3
  photoUrls: string[];
  videoIntroUrl?: string;
  
  // Metadata
  userId: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  verifiedPineapple: boolean;
}

// Vibe hints for text fields
export const vibeHints = {
  aboutYou: [
    "What makes you unique?",
    "What do you enjoy outside the lifestyle?",
    "How would your friends describe you?",
    "What's your ideal weekend look like?",
    "Share your personality, not just your preferences!",
  ],
  fantasies: [
    "Dream scenario - describe it!",
    "What experiences are on your bucket list?",
    "What gets you excited to explore?",
    "Be open and honest - we're all adults here",
  ],
};
