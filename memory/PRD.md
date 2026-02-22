# PineapplePlay - Luxury Social Platform

## Original Problem Statement
Restore existing codebase from fork EMTba46ab and ensure:
- Collection name uses `members` (NOT profiles)
- Admin UID set to: `48VUvApl8PWC8KhcKEqgfVS87wB2`

## Architecture
- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Database**: Firestore collections: `members`, `posts`, `favorites`, `notifications`, `verificationRequests`, `profileViews`, `comments`, `postReactions`, `conversations`, `messages`, `conversationKeys`

## Current Status (Feb 22, 2026)
- ✅ Codebase restored from zip file
- ✅ All code uses `members` collection
- ✅ App running on Next.js dev server
- ✅ Fixed Server Actions origin mismatch (allowedOrigins config)
- ✅ Fixed Firestore permission errors in CommunityPulse.tsx (added auth checks)
- ✅ Fixed profile page loading (converted to client-side Firebase calls)
- ✅ Admin UID configured: `48VUvApl8PWC8KhcKEqgfVS87wB2`
- ✅ **Fixed Profile Page Timeout Bug** (Feb 22, 2026)
- ✅ **Fixed Messaging Feature - New Conversation UI** (Feb 22, 2026)

## Key Fixes Applied This Session (Feb 22, 2026)
1. **Profile Page Timeout Fix**: Removed race-condition-prone timeout mechanism. Replaced with AbortController pattern using `isCancelled` flag to properly handle component unmount and prevent stale state updates during navigation.
2. **Messaging Feature Fix**: Added support for `userId` URL parameter in SecureMessaging component. When clicking "Send Message" from a profile (`/messages?userId=xyz`), the UI now shows:
   - New conversation header with target user info
   - Message input field to compose first message
   - Handles initializing conversation and sending first encrypted message
   - Mobile-responsive with back button

## Key Files Modified (This Session)
- `/app/frontend/components/ProfilePage.tsx` - Removed timeout, added AbortController pattern (lines 109-168)
- `/app/frontend/components/SecureMessaging.tsx` - Added userId param handling, new conversation UI, mobile responsiveness

## Previously Applied Fixes
1. **Server Actions Origin Mismatch**: Added `allowedOrigins` in `next.config.ts`
2. **Firestore Permission Errors**: Added `if (!currentUser) return;` guards to all `onSnapshot` calls
3. **Profile Page Not Loading**: Converted server actions to client-side functions (`lib/profile-client.ts`)
4. **Missing Firestore Rules**: User added rules for `posts`, `postReactions`, `comments`

## Key Files Reference
- `/app/frontend/next.config.ts` - Server actions allowed origins
- `/app/frontend/components/CommunityPulse.tsx` - Online users, notifications
- `/app/frontend/components/ProfilePage.tsx` - User profile page with editing
- `/app/frontend/components/SecureMessaging.tsx` - E2E encrypted messaging
- `/app/frontend/lib/profile-client.ts` - Client-side profile operations
- `/app/frontend/lib/messaging.ts` - Messaging encryption and Firestore ops
- `/app/frontend/lib/encryption.ts` - AES-256 encryption utilities

## Firestore Rules Required
- members, posts, postReactions, comments, conversations, messages, conversationKeys, favorites, notifications, profileViews, verificationRequests, savedDestinations, marketplace_listings, marketplace_orders

## P0 Tasks (Verified & Testing Pending)
- ✅ Profile page timeout bug - Code fixed, needs user verification
- ✅ Messaging feature - Code fixed, needs user verification

## P1 Tasks (Next)
- Full E2E testing with authenticated user account
- Admin vetting dashboard testing
- Performance optimization

## P2 Tasks (Backlog)
- Add test accounts or seed data for automated E2E testing
- Consider making photo upload optional during registration for testing
