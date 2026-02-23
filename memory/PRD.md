# PineapplePlay - Luxury Social Platform

## Original Problem Statement
Restore existing codebase from fork EMTba46ab and ensure:
- Collection name uses `members` (NOT profiles)
- Admin UID set to: `48VUvApl8PWC8KhcKEqgfVS87wB2`

## Architecture
- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Backend**: FastAPI + Firebase (Auth + Firestore + Storage) + MongoDB
- **Database**: 
  - Firestore: `members`, `posts`, `favorites`, `notifications`, `verificationRequests`, `profileViews`, `comments`, `postReactions`, `conversations`, `messages`, `conversationKeys`
  - MongoDB: `marketplace_listings`, `payment_transactions`

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
- ✅ **Pineapple Branding Update** - Added user-provided pineapple logo throughout app (Feb 22, 2026)
- ✅ **My Listings Page** - Marketplace listing management with edit/delete (Feb 22, 2026)
- ✅ **Mobile Hamburger Menu** - Feed page mobile navigation (Feb 22, 2026)
- ✅ **Marketplace Image Upload** - Photo upload for listings (Feb 22, 2026)
- ✅ **Purchase Success Page** - Post-purchase confirmation (Feb 22, 2026)
- ✅ **Transaction History Page** - Purchases & sales tracking (Feb 22, 2026)
- ✅ **Messaging Verified** - User confirmed working (Feb 22, 2026)
- ✅ **FAQ/Help Center Page** - Comprehensive help documentation (Feb 22, 2026)
- ✅ **Real-time Notifications System** - Full implementation (Feb 22, 2026)

## Key Fixes Applied This Session (Feb 22, 2026)

### Real-time Notifications System (NEW)
Implemented comprehensive notifications feature:

**Components Created/Modified:**
- `/app/frontend/components/NotificationDropdown.tsx` - Dropdown UI with bell icon
- `/app/frontend/lib/notifications.ts` - Firebase notifications helper functions
- `/app/frontend/app/feed/page.tsx` - Integrated notification bell in header (desktop & mobile)

**Notification Triggers Implemented:**
1. **New Message Notifications**: 
   - File: `/app/frontend/components/SecureMessaging.tsx`
   - Triggers when user sends a message (both existing and new conversations)
   - Uses `notifyNewMessage()` helper function

2. **Sale Notifications**:
   - File: `/app/frontend/app/marketplace/success/page.tsx`
   - Triggers when buyer completes a purchase
   - Notifies seller about the sale with item details
   - Uses `notifyNewPurchase()` helper function

3. **New Follower Notifications**:
   - File: `/app/frontend/lib/profile-client.ts`
   - Triggers when someone favorites (follows) a profile
   - Uses direct Firestore addDoc to notifications collection

**UI Features:**
- Bell icon in header (both desktop and mobile navigation)
- Red badge showing unread count
- Dropdown with smooth animation
- Different icons and colors for each notification type
- Mark as read (individual and bulk)
- Links to relevant pages (messages, transactions, profiles)

**Firebase Firestore Collection:**
- Collection: `notifications`
- Fields: `type`, `title`, `message`, `toUserId`, `fromUserId`, `fromUsername`, `fromPhoto`, `read`, `link`, `metadata`, `createdAt`

## Key Files Modified (This Session)
- `/app/frontend/app/feed/page.tsx` - Added notification bell to header (desktop & mobile)
- `/app/frontend/components/SecureMessaging.tsx` - Added message notification trigger
- `/app/frontend/lib/profile-client.ts` - Added follow notification trigger
- `/app/frontend/app/marketplace/success/page.tsx` - Added sale notification trigger
- `/app/frontend/components/NotificationDropdown.tsx` - Added follow icon and color
- `/app/backend/server.py` - Added seller_id to payment status response

## Marketplace Features Status
- ✅ Main marketplace page with listings grid
- ✅ Category filtering
- ✅ Create listing modal with image upload
- ✅ Purchase flow with Stripe checkout
- ✅ Report listing functionality
- ✅ My Listings page (edit/delete with image management)
- ✅ Image upload for listings (up to 5 per listing)
- ✅ Success/confirmation page after purchase
- ✅ Transaction history page (purchases & sales)

## Notifications Feature Status
- ✅ Notification bell icon in header
- ✅ Real-time notification updates via Firebase
- ✅ Message notifications
- ✅ Sale notifications  
- ✅ Follow notifications
- ✅ Mark as read functionality
- ✅ Unread badge counter

## Search Feature Status (NEW - Feb 22, 2026)
- ✅ Search bar in feed page header (desktop)
- ✅ Real-time dropdown results with debouncing
- ✅ Search across members, posts, and marketplace listings
- ✅ Filter tabs (All, Members, Posts, Listings)
- ✅ Dedicated search page at /search
- ✅ Blocked users filtered from search results

## Settings Page (NEW - Feb 22, 2026)
- ✅ **Consolidated Settings Page** at `/settings`
- ✅ **Privacy Settings**:
  - Profile visibility (Public / Members Only / Connections Only)
  - Who can message you (Everyone / Connections / No One)
  - Show online status toggle
  - Show last active toggle
- ✅ **Notification Settings**:
  - Messages notifications toggle
  - Likes & reactions notifications toggle
  - Comments notifications toggle
  - New followers notifications toggle
  - Marketplace notifications toggle
  - Email digest frequency (Daily / Weekly / Never)
- ✅ **Blocked Users Management**:
  - View all blocked users with avatars and block dates
  - One-click unblock functionality
- ✅ **Account Actions**:
  - Link to Help & FAQ
  - Sign Out button

## Block/Report Feature Status (Feb 22, 2026)
- ✅ Block user functionality
- ✅ Unblock user functionality
- ✅ Report user with multiple reasons
- ✅ Block/Report button on profile pages
- ✅ Blocked users' posts filtered from feed
- ✅ Blocked banner when viewing profile of user who blocked you
- ✅ **Blocked Users management page** at `/settings/blocked` (NEW)

## Feed Features Status
- ✅ Post creation with text
- ✅ **Image upload for posts** (up to 4 images per post) - FIXED
- ✅ Privacy settings (All / Circle)
- ✅ Category filtering
- ✅ Real-time feed updates
- ✅ Reactions (Fire / Pineapple)
- ✅ Comments

## Events Feature (NEW - Feb 22, 2026)
Located at `/events` - Full community events management system

### Features:
- **Events Listing Page**:
  - Grid view of all public events with image cards
  - Filter by: Upcoming, My RSVPs, Hosting
  - Event categories: Social, Travel, Dining, Wellness, Nightlife, Other
  - RSVP directly from card or detail view

- **Create Event**:
  - Image upload support
  - Title, description, category selection
  - Date/time with optional end time
  - Location and address
  - Max attendees limit (optional)
  - Price setting (optional)
  - Private event toggle

- **Event Detail Modal**:
  - Full event information
  - Host profile with message button
  - Attendee count
  - RSVP/Cancel RSVP button

- **RSVP System**:
  - One-click RSVP
  - Automatic notification to host
  - Cancel RSVP option
  - Max attendees enforcement

- **Event Management**:
  - Cancel event (notifies all attendees)
  - Delete event
  - Edit event (host only)

### Files Created:
- `/app/frontend/lib/events.ts` - All event CRUD operations
- `/app/frontend/app/events/page.tsx` - Events listing and creation UI

### Navigation:
- Mobile menu: Events link with calendar icon
- Feed sidebar: VIP Events section links to events page

### Firestore Collection: `events`
Fields: `title`, `description`, `date`, `endDate`, `location`, `address`, `imageUrl`, `category`, `hostId`, `hostUsername`, `hostPhotoUrl`, `attendees`, `attendeeCount`, `maxAttendees`, `isPrivate`, `price`, `status`, `createdAt`

## Admin Dashboard (ENHANCED - Feb 22, 2026)
Located at `/admin/vetting` - requires admin role (`role: "admin"` in members document)

### Features:
- **Overview Tab**: 
  - Platform statistics (total users, verified, pending, banned)
  - Content overview (posts, reported posts, pending reports)
  - Quick action cards for vetting, reports, and test user creation
  
- **Vetting Tab**:
  - Pending user applications list with quick approve/deny buttons
  - Detailed profile review with photos, interests, and description
  - Approve to verify user and send welcome notification
  - Reject with custom reason (sends notification to user)
  
- **Reports Tab**:
  - Filter by status (pending, resolved, dismissed, all)
  - View reporter and reported user details
  - Add admin notes to reports
  - Mark as resolved, dismiss, or ban user directly
  - Quick ban with duration options (7 days, 30 days, permanent)
  
- **User Management Tab**:
  - Placeholder for future user search and management features

### Admin Functions (lib/admin.ts):
- `getUserReports()` - Fetch user reports by status
- `updateReportStatus()` - Update report with admin notes
- `banUser()` - Ban user with reason and duration
- `unbanUser()` - Restore banned user access
- `getAdminStats()` - Get comprehensive platform statistics
- `deletePost()` - Remove reported posts
- `clearPostReports()` - Approve reported posts

## P0 Tasks (Completed)
- ✅ Real-time notifications system
- ✅ Search feature (members, posts, listings)
- ✅ Block/Report users safety features
- ✅ **Inner Circle Feature** (Feb 23, 2026)

## Inner Circle Feature (NEW - Feb 23, 2026)
The "Circle" feature allows users to create an exclusive group of connections who can see their private posts.

### How It Works:
1. **Adding to Circle**: Visit a user's profile and click "Add to Circle" button
2. **Circle Posts**: When creating a post, select "Circle" privacy to make it visible only to your circle members
3. **Managing Circle**: Go to Settings > My Circle tab to view and remove members
4. **Feed Visibility**: Posts marked as "Circle only" will only appear in feeds of users who have the author in their circle

### Files Created/Modified:
- `/app/frontend/lib/circle.ts` - Circle management functions (add, remove, get members, check status)
- `/app/frontend/components/ProfilePage.tsx` - Added "Add to Circle" button on profile pages
- `/app/frontend/app/settings/page.tsx` - Added "My Circle" tab with member management
- `/app/frontend/app/feed/page.tsx` - Updated feed filtering for circle-only posts

### Firestore Collection: `circles`
Fields: `ownerId`, `memberId`, `memberUsername`, `memberPhotoUrl`, `createdAt`

### Firebase Rules Required:
```
match /circles/{circleId} {
  allow read: if request.auth != null && 
                (resource.data.ownerId == request.auth.uid || 
                 resource.data.memberId == request.auth.uid);
  allow create: if request.auth != null && 
                  request.resource.data.ownerId == request.auth.uid;
  allow delete: if request.auth != null && 
                  resource.data.ownerId == request.auth.uid;
  allow update: if false;
}
```

## P1 Tasks (Next Priority)
- ✅ **Privacy & Notification Settings Persistence** (Feb 23, 2026)
  - Settings now save to Firebase when user clicks "Save Changes"
  - Visual indicator shows when there are unsaved changes (green pulsing dot)
  - Button state changes: "Saved" (grey) → "Save Changes" (gold with indicator)
  - Settings load from user's `members` document on page load
- Admin vetting dashboard testing
- Backend refactoring (break down server.py into modular routers)

## P2 Tasks (Backlog)
- Performance optimization
- Security review of Firestore rules
- UI/UX polish

## Firestore Security Rules Needed
For features to work, ensure these rules are in Firebase Console:
```
// Notifications
match /notifications/{notificationId} {
  allow read: if request.auth != null && resource.data.toUserId == request.auth.uid;
  allow create: if request.auth != null;
  allow update: if request.auth != null && resource.data.toUserId == request.auth.uid;
}

// Blocked Users
match /blockedUsers/{blockId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow delete: if request.auth != null && resource.data.blockerId == request.auth.uid;
}

// User Reports
match /userReports/{reportId} {
  allow read: if request.auth != null && resource.data.reporterId == request.auth.uid;
  allow create: if request.auth != null;
}

// Circles (Inner Circle / Connections)
match /circles/{circleId} {
  allow read: if request.auth != null && 
                (resource.data.ownerId == request.auth.uid || 
                 resource.data.memberId == request.auth.uid);
  allow create: if request.auth != null && 
                  request.resource.data.ownerId == request.auth.uid;
  allow delete: if request.auth != null && 
                  resource.data.ownerId == request.auth.uid;
  allow update: if false;
}
```
