# Bells & Whistles - Firebase Social Platform

## Original Problem Statement
Build a Firebase-powered social platform with:
- Firestore using `members` collection (NOT profiles)
- Admin UID: `48VUvApl8PWC8KhcKEqgfVS87wB2`
- Feed page with post creation and scrollable posts
- Admin Dashboard for user verification management
- Dark Mode + Glassmorphism UI

## Architecture
- **Frontend**: React 19 with Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **Database**: Firestore collections: `members`, `posts`
- **Styling**: Dark mode with glassmorphism effects

## User Personas
1. **Members**: Regular users who can view feed, create posts
2. **Admin** (UID: 48VUvApl8PWC8KhcKEqgfVS87wB2): Can access admin dashboard, verify/unverify members

## Core Requirements (Static)
- [x] Firebase Auth integration (email/password)
- [x] `members` collection for user profiles (NOT profiles)
- [x] `posts` collection for feed content
- [x] Admin role check via UID matching
- [x] Real-time data sync with Firestore

## What's Been Implemented (Jan 2026)
- [x] **Authentication System**: Login/Signup with Firebase Auth
- [x] **useProfile Hook**: Fetches from `members` collection
- [x] **usePosts Hook**: Real-time posts with author profiles from `members`
- [x] **useMembers Hook**: Admin view of all members
- [x] **Feed Page** (`/feed`): Post creation box, scrollable posts list
- [x] **Admin Dashboard** (`/admin`): Stats cards, member table with verification toggle
- [x] **Navbar**: Responsive, shows Admin link for admin users only
- [x] **Dark Mode + Glassmorphism UI**: Cyberpunk aesthetic
- [x] **Toast Notifications**: Sonner for user feedback
- [x] **Route Protection**: Auth-based redirects

## Key Files
- `/app/frontend/src/lib/firebase.js` - Firebase config + ADMIN_UID
- `/app/frontend/src/contexts/AuthContext.js` - Auth state management
- `/app/frontend/src/hooks/useProfile.js` - Members collection hook
- `/app/frontend/src/hooks/usePosts.js` - Posts with author profiles
- `/app/frontend/src/hooks/useMembers.js` - Admin members management
- `/app/frontend/src/pages/FeedPage.jsx` - Main feed
- `/app/frontend/src/pages/AdminPage.jsx` - Admin dashboard
- `/app/frontend/src/pages/LoginPage.jsx` - Auth page

## Firebase Configuration
- Project: `pineappleplayapp`
- Collections: `members`, `posts`
- Security Rules: Authenticated read/write enabled

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Firebase Auth integration
- [x] Members collection migration from profiles
- [x] Feed page loading
- [x] Admin dashboard access

### P1 (High Priority)
- [ ] User profile page with edit capability
- [ ] Post likes functionality
- [ ] Post comments system
- [ ] Conversations/messaging

### P2 (Medium Priority)
- [ ] Image uploads for posts
- [ ] Profile photo uploads
- [ ] Post search/filter
- [ ] Member search in admin

### P3 (Nice to Have)
- [ ] Push notifications
- [ ] Email notifications for verification
- [ ] Analytics dashboard for admin
- [ ] Dark/Light mode toggle

## Next Tasks
1. Test admin login with UID `48VUvApl8PWC8KhcKEqgfVS87wB2`
2. Verify member verification toggle works
3. Add user profile editing feature
4. Implement post interactions (likes, comments)
