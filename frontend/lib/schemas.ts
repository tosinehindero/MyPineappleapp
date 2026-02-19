import { z } from 'zod';

// Step 1: Identity Schema
export const identitySchema = z.object({
  accountType: z.enum([
    'Single Male',
    'Single Female',
    'Couple (M/F)',
    'Couple (F/F)',
    'Poly Triad (M/W/M)',
    'Poly Triad (W/M/W)',
  ], {
    required_error: 'Please select an account type',
  }),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  ageConfirmation: z
    .boolean()
    .refine((val) => val === true, 'You must be at least 21 years old'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Step 2: Preferences Schema
export const preferencesSchema = z.object({
  experienceLevel: z.enum(['Beginner', 'Intermediate', 'Seasoned/Pro'], {
    required_error: 'Please select your experience level',
  }),
  location: z
    .string()
    .min(3, 'Please enter your city/state')
    .max(100, 'Location is too long'),
  ageRangeMin: z.number().min(18).max(99),
  ageRangeMax: z.number().min(18).max(99),
}).refine((data) => data.ageRangeMin <= data.ageRangeMax, {
  message: 'Minimum age must be less than or equal to maximum age',
  path: ['ageRangeMax'],
});

// Step 3: Lifestyle Interests Schema
export const lifestyleSchema = z.object({
  interests: z
    .array(z.string())
    .min(1, 'Please select at least one interest'),
  lookingFor: z
    .array(z.string())
    .min(1, 'Please select at least one option'),
});

// Step 4: Bio Schema
export const bioSchema = z.object({
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  fantasies: z
    .string()
    .min(20, 'Please share at least 20 characters')
    .max(1000, 'This field must be less than 1000 characters'),
  photos: z
    .array(z.instanceof(File))
    .min(1, 'Please upload at least 1 photo')
    .max(100, 'Maximum 100 photos allowed')
    .refine(
      (files) => files.every((file) => file.size <= 20 * 1024 * 1024),
      'Each file must be less than 20MB'
    )
    .refine(
      (files) =>
        files.every((file) =>
          ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/gif'].includes(
            file.type
          )
        ),
      'Only JPG, PNG, SVG, and GIF files are allowed'
    ),
});

// Combined Schema Type
export type IdentityData = z.infer<typeof identitySchema>;
export type PreferencesData = z.infer<typeof preferencesSchema>;
export type LifestyleData = z.infer<typeof lifestyleSchema>;
export type BioData = z.infer<typeof bioSchema>;

export interface RegistrationData
  extends IdentityData,
    PreferencesData,
    LifestyleData,
    Omit<BioData, 'photos'> {
  photoUrls?: string[];
  createdAt: Date;
  userId: string;
}
