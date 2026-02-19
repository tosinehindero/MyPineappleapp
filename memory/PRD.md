# PineapplePlay - Product Requirements Document

## Original Problem Statement
Build a luxury social web application called "PineapplePlay" - an exclusive social platform for discerning individuals who value privacy, sophistication, and meaningful connections.

## Architecture
- **Framework**: Next.js 16 (App Router)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Styling**: Tailwind CSS with custom luxury theme (Charcoal/Gold)
- **Encryption**: AES-256 (crypto-js)
- **Validation**: Zod
- **Animations**: Framer Motion
- **Mapping**: React-Leaflet

## Core Features (Completed)

### 1. Landing Page & Branding ✅
- Luxury themed landing page with Hero, Features, and Navbar
- "PineapplePlay" branding with upside-down pineapple logo
- Charcoal (#121212) background, Gold (#D4AF37) accents

### 2. Multi-Step Registration Form ✅
- 4-step form: Identity → Preferences → Lifestyle → Bio
- Firebase Auth integration
- Zod validation + Framer Motion transitions

### 3. Map View ✅
- React-Leaflet map with gold radius slider (0-50 miles)
- Displays user locations as gold pins
- "Who's Online" sidebar

### 4. Secure Messaging ✅
- AES-256 encrypted message content
- Real-time message subscription
- End-to-end encryption per conversation

### 5. Dynamic Member Profile Page ✅
- Route: `/profile/[id]`
- Full-width header, masonry photo gallery, lifestyle tags
- Edit Profile modal, Favorites toggle
- Vetting Wall for unverified users (blur + modal)

### 6. Privacy Protection Features ✅
- **Screenshot Deterrent**: CSS/JS protection on Profile and Messaging pages
  - `user-select: none` to prevent text selection
  - Privacy overlay on window blur (tab switch, minimize)
  - Right-click disabled
  - Keyboard shortcut blocking (PrintScreen, Ctrl+P)
- **Watermarked Images**: Profile photos display viewing user's username
  - Semi-transparent diagonal watermark pattern
  - Timestamp included for traceability
  - Next.js Image optimization for memory efficiency

### 7. Community Pulse Sidebar ✅
- **Collapsible drawer** sliding in from the right edge
- **Real-time Firebase subscriptions** for live updates
- **4 tabs**:
  - ✨ **New**: Recently joined members (last 7 days)
  - 🟢 **Online**: Currently online members (verified users only)
  - 🔥 **Hot/Trending**: Popular profiles based on favorites
  - 🔔 **Alerts**: Unread messages and notifications
- **Privacy**: Online status visible only to verified members
- **Non-authenticated state**: Shows login prompt with "Join Now" CTA

### 8. Profile View Tracking ✅ (NEW - Dec 19, 2026)
- **"Someone viewed your profile"** notifications
- **View recording**: Tracks when users view other profiles
- **Duplicate prevention**: Only one view per user per day
- **Real-time notifications**: Shows in Alerts tab with 👁️ icon
- **Click-through**: Notifications link directly to viewer's profile
- **Unread indicators**: Gold dot and left border for unread notifications
- **View stats**: Total views and unique viewers tracked per profile

## Firestore Security Rules ✅ DEPLOYED
Rules at `/app/frontend/firestore.rules` - User deployed manually.

## Database Collections
- **members**: User profiles with sensitive fields (description, fantasies)
- **conversations**: Chat threads with participant info
- **messages**: Encrypted message content
- **conversationKeys**: Per-user encrypted conversation keys
- **favorites**: User favorite relationships
- **verificationRequests**: Membership verification requests
- **notifications**: User notifications (new)

## Key Files
- `components/CommunityPulse.tsx` - Community Pulse drawer (NEW)
- `components/ClientProviders.tsx` - Client-side providers wrapper (NEW)
- `app/pulse/actions.ts` - Pulse server actions (NEW)
- `components/PrivacyProtection.tsx` - Screenshot deterrent wrapper
- `components/WatermarkedImage.tsx` - Image watermarking component
- `components/ProfilePage.tsx` - Full profile with privacy features
- `components/SecureMessaging.tsx` - Encrypted messaging UI
- `app/profile/actions.ts` - Profile CRUD with field-level privacy
- `lib/messaging.ts` - Encryption and message handling
- `firestore.rules` - Firestore security rules

## Backlog (P1)
1. **Verification Request UI** - User-facing verification flow
2. **Admin Dashboard** - Approve/reject verification requests
3. **Photo Management** - Add/remove profile photos
4. **Memory Investigation** - Previous pod crash (unresolved)

## Technical Debt
- Memory usage monitoring (previous crash unresolved)
- TypeScript strict mode fixes
- Test coverage

## Last Update
December 19, 2026 - Added "Someone viewed your profile" notifications with real-time tracking
