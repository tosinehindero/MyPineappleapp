# PineapplePlay - Luxury Social Platform

## Original Problem Statement
Restore existing codebase from fork EMTba46ab and ensure:
- Collection name uses `members` (NOT profiles)
- Admin UID set to: `48VUvApl8PWC8KhcKEqgfVS87wB2`

## Architecture
- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Database**: Firestore collections: `members`, `posts`, `favorites`, `notifications`, `verificationRequests`, `profileViews`, `comments`, `postReactions`

## Current Status (Feb 21, 2026)
- ✅ Codebase restored from zip file
- ✅ All code uses `members` collection
- ✅ App running on Next.js dev server
- ✅ Fixed Server Actions origin mismatch (allowedOrigins config)
- ✅ Fixed Firestore permission errors in CommunityPulse.tsx (added auth checks)
- ✅ Fixed profile page loading (converted to client-side Firebase calls)
- ✅ Admin UID configured: `48VUvApl8PWC8KhcKEqgfVS87wB2`

## Key Fixes Applied This Session
1. **Server Actions Origin Mismatch**: Added `allowedOrigins` in `next.config.ts`
2. **Firestore Permission Errors**: Added `if (!currentUser) return;` guards to all `onSnapshot` calls
3. **Profile Page Not Loading**: Converted server actions to client-side functions (`lib/profile-client.ts`)
4. **Missing Firestore Rules**: User added rules for `posts`, `postReactions`, `comments`

## Key Files Modified
- `/app/frontend/next.config.ts` - Added allowedOrigins for server actions
- `/app/frontend/components/CommunityPulse.tsx` - Fixed auth checks on subscriptions
- `/app/frontend/components/ProfilePage.tsx` - Using client-side profile functions
- `/app/frontend/lib/profile-client.ts` - NEW: Client-side profile operations
- `/app/frontend/app/views/actions.ts` - Converted to client-side

## Firestore Rules Required
- members, posts, postReactions, comments, conversations, messages, favorites, notifications, profileViews, verificationRequests, savedDestinations, marketplace_listings, marketplace_orders

## Next Tasks
- Test full user flow (registration, feed, messaging)
- Admin vetting dashboard testing
- Performance optimization
