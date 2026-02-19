# PineapplePlay Registration Form 🍍

A luxury multi-step membership application form with Firebase integration, built with Next.js 15, TypeScript, Zod validation, and Framer Motion animations.

## 🎯 Features

### Multi-Step Registration Flow
- **Step 1: Identity** - Account type, username, email, password, age verification
- **Step 2: Preferences** - Experience level, location, age range preferences
- **Step 3: Lifestyle Interests** - Community interests and relationship goals
- **Step 4: The Bio** - Personal description, fantasies, and photo uploads

### Core Functionality
✅ **Firebase Auth** - Secure user authentication
✅ **Firestore Database** - Store member data in 'members' collection
✅ **Firebase Storage** - High-resolution photo uploads (no cropping)
✅ **Zod Validation** - Schema validation on every step
✅ **Framer Motion** - Smooth slide-left transitions between steps
✅ **Gold Progress Bar** - Visual progress indicator
✅ **Luxury Theme** - Charcoal/Gold/Dark Blue design system

## 📦 Tech Stack

```
Next.js:          16.1.6
React:            19.2.3
TypeScript:       5.x
Firebase:         12.9.0
Zod:              4.3.6
Framer Motion:    12.34.2
React Hook Form:  7.71.1
Tailwind CSS:     v4
```

## 🗂️ Project Structure

```
/app/frontend/
├── app/
│   ├── register/
│   │   └── page.tsx              # Registration page
│   └── page.tsx                  # Home page with CTA
├── components/
│   ├── RegistrationForm.tsx      # Main form container
│   └── steps/
│       ├── IdentityStep.tsx      # Step 1: Identity
│       ├── PreferencesStep.tsx   # Step 2: Preferences
│       ├── LifestyleStep.tsx     # Step 3: Lifestyle
│       └── BioStep.tsx           # Step 4: Bio & Photos
├── lib/
│   ├── firebase.ts               # Firebase configuration
│   └── schemas.ts                # Zod validation schemas
```

## 🔥 Firebase Configuration

### Services Used
- **Firebase Auth** - User authentication
- **Cloud Firestore** - Member data storage
- **Cloud Storage** - Photo uploads

### Firestore Schema (`members` collection)

```typescript
{
  userId: string;
  accountType: string;
  username: string;
  email: string;
  experienceLevel: string;
  location: string;
  ageRangeMin: number;
  ageRangeMax: number;
  interests: string[];
  lookingFor: string[];
  description: string;
  fantasies: string;
  photoUrls: string[];
  createdAt: Date;
}
```

## 📋 Form Steps Breakdown

### Step 1: Identity
**Fields:**
- Account Type (Dropdown)
  - Single Male
  - Single Female
  - Couple (M/F)
  - Couple (F/F)
  - Poly Triad (M/W/M)
  - Poly Triad (W/M/W)
- Username (3-20 characters, alphanumeric + underscore)
- Email (valid email format)
- Password (min 8 chars, must include uppercase, lowercase, number, special char)
- Confirm Password (must match)
- Age Confirmation (checkbox, must be 21+)

**Validation:**
```typescript
- Username: 3-20 chars, /^[a-zA-Z0-9_]+$/
- Email: valid email format
- Password: Strong password requirements
- Age: Must confirm 21+ years old
```

### Step 2: Preferences
**Fields:**
- Experience Level (Radio buttons)
  - Beginner
  - Intermediate
  - Seasoned/Pro
- Location (Text input: City/State)
- Desired Age Range (Dual range sliders: 18-99)

**Validation:**
```typescript
- Location: 3-100 characters
- Age Range: Min ≤ Max, both between 18-99
```

### Step 3: Lifestyle Interests
**Fields:**
- Community Interests (Multi-select chips)
  - Swingers
  - BDSM
  - Voyeurism
  - Soft Swap
  - Full Swap
  - Luxury Travel
  - Educational Workshops
- Looking For (Multi-select)
  - Friendship
  - Play Partners
  - Travel Buddies
  - Long-term Poly

**Validation:**
```typescript
- Interests: Min 1 selection required
- Looking For: Min 1 selection required
```

### Step 4: The Bio
**Fields:**
- About You (Textarea, 50-1000 chars)
- Fantasies & Experiences (Textarea, 20-1000 chars)
- Photo Upload (Drag & drop)

**Photo Requirements:**
- Max file size: 20MB per photo
- Supported formats: JPG, PNG, SVG, GIF
- Max photos: 100 per user
- No cropping - high-res retention
- Uploaded to Firebase Storage

**Validation:**
```typescript
- Description: 50-1000 characters
- Fantasies: 20-1000 characters
- Photos: 1-100 files, ≤20MB each
```

## 🎨 Design System

### Colors
```css
Charcoal:  #121212  (background)
Dark Blue: #0F172A  (cards)
Gold:      #D4AF37  (primary/accents)
Off-white: #F8FAFC  (text)
```

### Typography
- **Headings:** Playfair Display (serif)
- **Body:** Inter (sans-serif)

### Components
- Gold progress bar at top
- Glass-morphism cards
- Gold glow effects on hover
- Smooth Framer Motion transitions

## 🔐 Security Features

✅ Firebase Auth for user creation
✅ Strong password requirements
✅ Age verification (21+)
✅ Secure file uploads to Firebase Storage
✅ Environment variables for sensitive keys

## 🚀 Usage

### Access the Registration Form
```
http://localhost:3000/register
```

### Form Flow
1. User fills out Step 1 (Identity)
2. Click "Next Step" → validates and proceeds to Step 2
3. Fill Step 2 (Preferences) → validates and proceeds
4. Fill Step 3 (Lifestyle) → validates and proceeds
5. Fill Step 4 (Bio + Photos) → uploads photos → creates Firebase Auth account → saves to Firestore
6. Success screen with confirmation

### Success Response
```typescript
{
  success: true,
  userId: "firebase-user-id",
  message: "Welcome to PineapplePlay!"
}
```

## 📱 Responsive Design

- **Mobile** (< 768px): Stacked layout, touch-friendly
- **Tablet** (768-1024px): Optimized spacing
- **Desktop** (> 1024px): Full layout with max-width container

## ✨ Animations

### Progress Bar
- Smooth fill animation on step change
- Gold glow effect
- Easing: easeOut

### Step Transitions
- Slide-left enter/exit
- 300ms duration
- Opacity fade

### Interactive Elements
- Chip selections: Scale on hover/tap
- Buttons: Scale transform + gold glow
- Photo upload: Drag active state
- Success screen: Spring animation

## 🧪 Validation Examples

### Strong Password
```
✅ MyP@ssw0rd123  (valid)
❌ password       (too weak)
❌ PASSWORD123    (no special char)
```

### Username
```
✅ john_doe_21    (valid)
❌ john doe       (spaces not allowed)
❌ ab             (too short)
```

### Photos
```
✅ photo.jpg (2MB)    (valid)
✅ image.png (19MB)   (valid)
❌ file.pdf           (wrong format)
❌ huge.jpg (25MB)    (too large)
```

## 🔧 Configuration

### Firebase Setup
Firebase credentials are configured in `/lib/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "pineappleplayapp.firebaseapp.com",
  projectId: "pineappleplayapp",
  storageBucket: "pineappleplayapp.firebasestorage.app",
  // ...
};
```

### Environment Variables
```env
# Already configured in firebase.ts
# No additional .env needed
```

## 📊 Data Flow

```
User Input → Zod Validation → Firebase Auth → Upload Photos → Save to Firestore → Success
     ↓              ↓                ↓              ↓                ↓              ↓
 Form State    Real-time        User ID       Storage URLs    Member Doc      Redirect
               Errors          Creation        Array         /members/{uid}
```

## 🎯 Test IDs

All interactive elements include `data-testid` attributes:
- `account-type-select`
- `username-input`
- `email-input`
- `password-input`
- `age-confirmation-checkbox`
- `interest-chip-{name}`
- `looking-for-chip-{name}`
- `photo-upload-input`
- `next-button`
- `submit-button`

## 🐛 Error Handling

### Validation Errors
- Real-time field validation
- Clear error messages below fields
- Red text for errors

### Firebase Errors
- Auth errors (email already exists, weak password)
- Storage errors (upload failed)
- Firestore errors (save failed)
- User-friendly error messages displayed

### Example Error Messages
```
❌ "Username must be at least 3 characters"
❌ "Password must contain uppercase, lowercase, number, and special character"
❌ "Please select at least one interest"
❌ "Each file must be less than 20MB"
❌ "Email already in use"
```

## 🚀 Future Enhancements

- [ ] Email verification after signup
- [ ] Profile photo cropping tool
- [ ] Save draft progress to Firestore (resume later)
- [ ] Admin approval workflow
- [ ] Photo moderation
- [ ] Welcome email automation

## 📝 Notes

- All passwords are securely handled by Firebase Auth (never stored in Firestore)
- Photos are stored in Firebase Storage with URLs saved in Firestore
- Form progress is maintained in component state (could be extended to Firestore for persistence)
- Age verification is self-reported (could be enhanced with ID verification)

---

**Built with ❤️ for PineapplePlay** 🍍✨
