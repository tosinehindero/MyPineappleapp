# PineapplePlay - Product Requirements Document

## Overview
PineapplePlay is a lifestyle community platform for adults (21+) featuring social networking, marketplace, groups/circles, and event discovery. Built with Next.js 16, FastAPI, MongoDB, and Firebase.

## Core Features (Implemented)

### Authentication & Registration
- ✅ 3-step registration flow with detailed vetting
- ✅ Firebase Authentication integration
- ✅ Multi-tier subscription system (Voyager, Insider, Elite)

### Social Features
- ✅ Main Feed with posts and interactions
- ✅ Inner Circles (Groups) - create, join, manage
- ✅ Member Directory with search/filter
- ✅ Direct Messaging
- ✅ Profile Views tracking

### Marketplace
- ✅ Product listings with images
- ✅ Featured items system
- ✅ Stripe payment integration
- ✅ Transaction history

### Admin Panel
- ✅ User management (ban, delete, set tier)
- ✅ Group/Circle management
- ✅ Vetting queue for new users
- ✅ Statistics dashboard

## Technical Stack
- **Frontend**: Next.js 16.1.6, React 19, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB (Firestore for user profiles)
- **Auth/Storage**: Firebase (Auth, Firestore, Cloud Storage)
- **Payments**: Stripe

## Deployment Status

### Fixed Issues (Dec 2025)
- ✅ ESLint version incompatibility resolved (downgraded to 8.57.0)
- ✅ Added `.npmrc` and `.yarnrc` for engine compatibility
- ✅ Created frontend `.env` with backend URL
- ✅ Fixed TypeScript resolver types in registration steps

### Known Technical Debt
- 🟡 Backend `server.py` is monolithic (~1300 lines) - needs refactoring
- 🟢 Settings page toggles are UI-only (not connected to backend)
- 🟢 Firebase config hardcoded (should use env variables)

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login

### Marketplace
- GET `/api/marketplace/listings` - Get all listings
- GET `/api/marketplace/listings/featured` - Get featured listings
- POST `/api/marketplace/listings` - Create listing
- POST `/api/marketplace/listings/{id}/toggle-featured` - Toggle featured status

### Admin
- GET `/api/admin/users` - Get all users
- DELETE `/api/admin/users/{id}` - Delete user account
- DELETE `/api/admin/groups/{id}` - Delete group/circle
- PUT `/api/admin/users/{id}/tier` - Update user tier

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://...
DB_NAME=pineappleplay
CORS_ORIGINS=*
EMERGENT_LLM_KEY=sk-emergent-...
STRIPE_API_KEY=sk_test_...
```

### Frontend (.env)
```
NEXT_PUBLIC_BACKEND_URL=https://...
```

## Backlog

### P1 (High Priority)
- [ ] Refactor backend into modular routers
- [ ] Move Firebase config to environment variables

### P2 (Medium Priority)
- [ ] Connect settings toggles to backend
- [ ] Add loading states and micro-animations
- [ ] Improve mobile responsiveness

### P3 (Low Priority)
- [ ] Add pagination to database queries
- [ ] Implement notification system
- [ ] Add analytics dashboard
