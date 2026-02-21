# PineapplePlay - Luxury Social Platform

## Original Problem Statement
Restore existing codebase from fork EMTba46ab and ensure:
- Collection name uses `members` (NOT profiles)
- Admin UID set to: `48VUvApl8PWC8KhcKEqgfVS87wB2`

## Architecture
- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Database**: Firestore collections: `members`, `posts`, `favorites`, `notifications`, `verificationRequests`

## Current Status (Jan 2026)
- ✅ Codebase restored from zip file
- ✅ All code uses `members` collection (verified via grep)
- ✅ App running on Next.js dev server
- ✅ Homepage, Login, Feed pages working
- ⚠️ Admin role requires Firestore document update

## Admin Configuration
Admin check is done via `checkAdminRole()` in `/app/frontend/lib/admin.ts`:
- Reads `role` field from `members/{userId}` document
- Returns true if `role === 'admin'`

**To set Admin UID `48VUvApl8PWC8KhcKEqgfVS87wB2` as admin:**
Update Firestore document `members/48VUvApl8PWC8KhcKEqgfVS87wB2`:
```json
{
  "role": "admin",
  "isVerified": true
}
```

## Key Files
- `/app/frontend/lib/firebase.ts` - Firebase configuration
- `/app/frontend/lib/admin.ts` - Admin role checking, verification management
- `/app/frontend/app/admin/` - Admin dashboard pages
- `/app/frontend/app/feed/` - Feed page
- `/app/frontend/app/profile/` - Profile pages
- `/app/frontend/components/` - Reusable components

## Collections Used
All code uses `members` collection:
- `/app/frontend/app/actions.ts`
- `/app/frontend/app/admin/actions.ts`
- `/app/frontend/app/profile/actions.ts`
- `/app/frontend/app/feed/actions.ts`
- `/app/frontend/app/pulse/actions.ts`
- `/app/frontend/lib/admin.ts`

## Next Steps
1. Update Firestore to set admin role for UID 48VUvApl8PWC8KhcKEqgfVS87wB2
2. Test admin dashboard functionality
3. Verify user vetting workflow
