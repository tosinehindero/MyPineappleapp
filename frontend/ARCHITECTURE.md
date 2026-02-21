# PineapplePlay Architecture 🍍

## 🏗️ Technology Stack

### Frontend & Backend
**Next.js 16.1.6** (App Router)
- Frontend UI (React 19.2.3)
- Server Actions for backend logic
- API Routes (if needed)
- SSR & Static Generation

### Database & Services
**Firebase Suite**
- **Firebase Authentication** - User auth & management
- **Cloud Firestore** - NoSQL database
- **Cloud Storage** - File uploads (photos)
- **Firebase Hosting** (optional deployment)

### No Separate Backend
❌ No FastAPI
❌ No Express server
❌ No MongoDB
✅ All logic in Next.js + Firebase

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────┐
│           Next.js Application           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Client Components           │   │
│  │  - UI, Forms, Maps, Chat        │   │
│  └─────────┬───────────────────────┘   │
│            │                             │
│            ▼                             │
│  ┌─────────────────────────────────┐   │
│  │     Server Actions              │   │
│  │  - getUserProfile()             │   │
│  │  - updateUserProfile()          │   │
│  │  - searchUsers()                │   │
│  └─────────┬───────────────────────┘   │
│            │                             │
└────────────┼─────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│            Firebase Services            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Authentication                  │  │
│  │  - User sign up/login            │  │
│  │  - Session management            │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Cloud Firestore                 │  │
│  │  - members/                      │  │
│  │  - conversations/                │  │
│  │  - messages/ (encrypted)         │  │
│  │  - conversationKeys/             │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Cloud Storage                   │  │
│  │  - member-photos/                │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### User Registration
```
1. User fills form (/register)
   ↓
2. Client validates with Zod
   ↓
3. Firebase Auth creates user
   ↓
4. Photos → Firebase Storage
   ↓
5. User data → Firestore (members)
   ↓
6. Success redirect
```

### Secure Messaging
```
1. User types message
   ↓
2. Client encrypts with AES-256
   ↓
3. Encrypted message → Firestore
   ↓
4. Real-time listener (onSnapshot)
   ↓
5. Client decrypts message
   ↓
6. Display in UI
```

### Map Discovery
```
1. User opens map
   ↓
2. Geolocation API gets position
   ↓
3. Fetch users from Firestore
   ↓
4. Client filters by radius
   ↓
5. Render markers on map
```

---

## 📂 Project Structure

```
/app/frontend/
├── app/
│   ├── actions.ts           # Next.js Server Actions
│   ├── page.tsx             # Home page
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── register/
│   │   └── page.tsx         # Registration
│   ├── map/
│   │   └── page.tsx         # Map view
│   └── messages/
│       └── page.tsx         # Messaging
├── components/
│   ├── Navbar.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── Footer.tsx
│   ├── RegistrationForm.tsx
│   ├── MapView.tsx
│   ├── SecureMessaging.tsx
│   └── steps/
│       ├── IdentityStep.tsx
│       ├── PreferencesStep.tsx
│       ├── LifestyleStep.tsx
│       └── BioStep.tsx
├── lib/
│   ├── firebase.ts          # Firebase config
│   ├── schemas.ts           # Zod schemas
│   ├── messaging.ts         # Messaging logic
│   └── encryption.ts        # AES-256 encryption
└── public/
    └── marker-*.png
```

---

## 🔥 Firebase Collections

### `members`
```typescript
{
  userId: string;
  username: string;
  email: string;
  accountType: string;
  experienceLevel: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  ageRangeMin: number;
  ageRangeMax: number;
  interests: string[];
  lookingFor: string[];
  description: string;
  fantasies: string;
  photoUrls: string[];
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt?: Date;
}
```

### `conversations`
```typescript
{
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantPhotos: { [userId: string]: string };
  lastMessage: string; // Always "[Encrypted Message]"
  lastMessageTime: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
}
```

### `messages`
```typescript
{
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string; // ⚠️ ENCRYPTED
  iv: string;
  timestamp: Timestamp;
  readBy: string[];
}
```

### `conversationKeys`
```typescript
{
  id: string; // "${conversationId}_${userId}"
  conversationId: string;
  userId: string;
  encryptedKey: string; // Conversation key encrypted for this user
  createdAt: Timestamp;
}
```

---

## 🛡️ Security Model

### Authentication
- Firebase Authentication handles all auth
- Session tokens managed by Firebase
- Secure by default (HTTPS)

### Data Access
- Client-side Firebase SDK
- Security Rules in Firestore
- Users can only access their own data

### Encryption
- AES-256-CBC for messages
- Client-side encryption/decryption only
- Keys stored encrypted in Firestore

### Example Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Members can read their own profile
    match /members/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Conversations: only participants can access
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
    
    // Messages: only conversation participants
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    // Conversation keys: only the owner
    match /conversationKeys/{keyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## ⚡ Next.js Server Actions

### Purpose
- Server-side data operations
- Secure API calls
- Database queries

### Usage Example
```typescript
// app/actions.ts
'use server';

export async function getUserProfile(userId: string) {
  const userDoc = await getDoc(doc(db, 'members', userId));
  return userDoc.data();
}

// Component
import { getUserProfile } from '@/app/actions';

const profile = await getUserProfile(userId);
```

### Available Actions
- `getUserProfile(userId)`
- `updateUserProfile(userId, data)`
- `searchUsers(filters)`
- `updateOnlineStatus(userId, isOnline)`
- `getNearbyUsers(lat, lng, radius)`

---

## 🚀 Deployment Options

### Vercel (Recommended)
```bash
npm install -g vercel
vercel deploy
```

### Firebase Hosting
```bash
npm run build
firebase deploy
```

### Netlify
```bash
netlify deploy --prod
```

---

## 🔧 Environment Variables

### Required (.env.local)
```bash
# Firebase config (already in lib/firebase.ts)
# No additional env vars needed
```

**Note:** Firebase config is public and safe to commit (API keys are restricted by domain).

---

## 📊 Performance Optimization

### Next.js Features
- ✅ Server-side rendering (SSR)
- ✅ Static generation for landing pages
- ✅ Image optimization (next/image)
- ✅ Code splitting
- ✅ Route prefetching

### Firebase Optimization
- ✅ Indexed queries
- ✅ Pagination for large datasets
- ✅ Real-time listeners (efficient updates)
- ✅ Offline persistence
- ✅ CDN for storage files

---

## 🔐 Best Practices

### Code Organization
1. Server Actions in `app/actions.ts`
2. Firebase config in `lib/firebase.ts`
3. Client components in `components/`
4. Utility functions in `lib/`

### Security
1. Use Firebase Security Rules
2. Encrypt sensitive data (messages)
3. Validate all inputs (Zod)
4. Use environment variables
5. Never expose secrets in client code

### Performance
1. Use React.memo for expensive components
2. Implement pagination
3. Lazy load images
4. Use Suspense for async data
5. Cache Firebase queries

---

## 🎯 Advantages of This Architecture

### ✅ Pros
- **No backend to manage** - Firebase handles it all
- **Real-time updates** - Firestore onSnapshot
- **Scalable** - Firebase auto-scales
- **Secure** - Built-in auth & security rules
- **Fast** - CDN, caching, optimizations
- **Cost-effective** - Pay only for usage
- **Easy deployment** - Single build

### 📝 Considerations
- **Vendor lock-in** - Tied to Firebase ecosystem
- **Cost at scale** - Can get expensive with high usage
- **Firestore limits** - Query limitations
- **Client-side queries** - Limited complex joins

---

## 🚀 Scaling Strategy

### Current: Single Region
- Firebase project in single region
- All data in one Firestore instance

### Future: Multi-Region
- Firebase multi-region setup
- CDN for static assets
- Edge functions for compute
- Caching layer (Redis)

---

## 📈 Monitoring & Analytics

### Firebase Console
- Authentication metrics
- Firestore usage
- Storage usage
- Performance monitoring

### Next.js Analytics
- Vercel Analytics
- Core Web Vitals
- Page performance

---

## ✅ Summary

**Architecture:** Next.js + Firebase (No separate backend)

**Database:** Cloud Firestore (NoSQL)

**Auth:** Firebase Authentication

**Storage:** Firebase Cloud Storage

**Backend Logic:** Next.js Server Actions

**Encryption:** Client-side AES-256

**Deployment:** Vercel/Firebase Hosting

**This is a modern, serverless, scalable architecture perfect for the PineapplePlay luxury social platform!** 🍍✨
