# Dynamic Member Profile Page 👤

Comprehensive member profile system with photo galleries, lifestyle tags, vetting wall, and interactive actions.

## 🎯 Features

### **Layout & Aesthetics**
✅ **Full-width header** with primary photo background + charcoal gradient
✅ **Playfair Display** username with gold verified shield icon
✅ **Experience level badge** (Beginner/Intermediate/Seasoned)
✅ **Masonry photo gallery** with `object-contain` (no cropping)
✅ **Lifestyle tags** as elegant gold-outlined chips
✅ **Glass-morphism** cards for content sections

### **Interactive Features**
✅ **Sticky action bar** with Message & Favorite buttons
✅ **Favorite/Heart toggle** - Stores in Firestore `favorites` collection
✅ **Message redirect** - Links to encrypted chat
✅ **Owner mode** - Edit profile button for profile owner

### **Security & Privacy**
✅ **Vetting wall** - Blur content for unverified users
✅ **Gold modal** - "Membership Vetting Required" message
✅ **Owner detection** - Full access to own profile

---

## 📂 Files Created

```
/app/frontend/
├── app/
│   └── profile/
│       ├── actions.ts           # Server Actions
│       └── [id]/
│           └── page.tsx         # Dynamic route
└── components/
    └── ProfilePage.tsx          # Main profile component
```

---

## 🔥 Firestore Collections

### **New: `favorites`**
```typescript
{
  id: "${currentUserId}_${targetUserId}",
  userId: string,
  favoriteUserId: string,
  createdAt: Date
}
```

### **Updated: `members`**
```typescript
{
  // ... existing fields
  isVerified?: boolean,  // For vetting wall
  updatedAt?: Date       // Track profile updates
}
```

---

## 🎨 Profile Layout

### **Header Section**
```
┌─────────────────────────────────────┐
│   [Photo Background with Gradient]  │
│                                     │
│   Username 🛡️ [Experience Badge]   │
│   📍 Location • Account Type        │
└─────────────────────────────────────┘
```

### **Main Content Grid**
```
┌──────────────┬────────────────────┐
│   Details    │   Photo Gallery   │
│  (1/3 wide)  │    (2/3 wide)     │
│              │                   │
│  - About     │   [Masonry Grid]  │
│  - Interests │   [Photo]  [Photo]│
│  - Looking   │   [Photo]  [Photo]│
│  - Fantasies │   [Photo]  [Photo]│
└──────────────┴────────────────────┘
```

### **Sticky Action Bar (Bottom)**
```
┌──────────────────────────────────┐
│ [Message] [♥ Favorite]    [Info] │
└──────────────────────────────────┘
```

---

## 🔐 Privacy Logic

### **Vetting Wall Conditions**
```typescript
const shouldBlur = !currentUser?.isVerified && 
                   profileId !== currentUser?.uid;

if (shouldBlur) {
  // Apply blur-md filter
  // Hide: description, fantasies, photos
  // Show vetting modal on click
}
```

### **Owner Mode**
```typescript
const isOwner = currentUser?.uid === profileId;

if (isOwner) {
  // Show "Edit Profile" button
  // Allow editing description & fantasies
  // No blur filter
}
```

---

## 🎨 Visual Components

### **1. Verified Shield Icon**
```jsx
<div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center shadow-gold-glow">
  <svg>✓</svg> {/* Shield with checkmark */}
</div>
```

### **2. Experience Badge**
```jsx
// Colors based on level
Beginner:      green-500 background
Intermediate:  blue-500 background
Seasoned/Pro:  gold background
```

### **3. Lifestyle Tags**
```jsx
<span className="px-4 py-2 border border-gold/40 text-gold rounded-full">
  {interest}
</span>
```

### **4. Photo Gallery (Masonry)**
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <img 
    className="object-contain"  // NO CROPPING
    style={{ aspectRatio: '1' }}
  />
</div>
```

---

## 🔧 Server Actions

### **Get Profile**
```typescript
await getProfile(userId)
// Returns: { success, data: ProfileData }
```

### **Update Profile**
```typescript
await updateProfile(userId, {
  description: "...",
  fantasies: "..."
})
```

### **Toggle Favorite**
```typescript
await toggleFavorite(currentUserId, targetUserId)
// Returns: { success, isFavorite: boolean }
```

### **Check if Favorite**
```typescript
await checkIsFavorite(currentUserId, targetUserId)
// Returns: { success, isFavorite: boolean }
```

### **Get User's Favorites**
```typescript
await getUserFavorites(userId)
// Returns: { success, data: Favorite[] }
```

---

## 🎯 User Flows

### **Viewing a Profile**
```
1. Click on user (from map/search)
   ↓
2. Navigate to /profile/{userId}
   ↓
3. Check auth status
   ↓
4. Fetch profile from Firestore
   ↓
5. Apply vetting wall if needed
   ↓
6. Render profile with actions
```

### **Sending a Message**
```
1. Click "Message" button
   ↓
2. Redirect to /messages?userId={targetId}
   ↓
3. Initialize conversation (if new)
   ↓
4. Open chat interface
```

### **Adding to Favorites**
```
1. Click heart icon
   ↓
2. Toggle favorite in Firestore
   ↓
3. Update UI (filled/empty heart)
   ↓
4. Store: favorites/{currentId}_{targetId}
```

### **Editing Profile (Owner)**
```
1. Click "Edit Profile"
   ↓
2. Open modal with current data
   ↓
3. Edit description & fantasies
   ↓
4. Save to Firestore
   ↓
5. Update local state
   ↓
6. Close modal
```

---

## 🎨 Styling Details

### **Color Scheme**
```css
Background:     #121212 (charcoal)
Cards:          glass-morphism
Text:           #F8FAFC (offWhite)
Accents:        #D4AF37 (gold)
Borders:        gold/20 to gold/60
```

### **Typography**
```css
Headings:       Playfair Display (serif)
Body:           Inter (sans-serif)
Username:       text-4xl md:text-5xl
Section Titles: text-xl md:text-2xl
```

### **Spacing**
```css
Container:      max-w-7xl mx-auto
Padding:        px-6 py-12
Card Padding:   p-6
Grid Gap:       gap-4 to gap-8
```

---

## 📱 Responsive Design

### **Desktop (> 1024px)**
```
Grid: 1/3 (details) + 2/3 (gallery)
Full header width
Action bar: Flex row
```

### **Tablet (768-1024px)**
```
Similar to desktop
Adjusted spacing
```

### **Mobile (< 768px)**
```
Grid: Stacked vertical
Full-width components
Action bar: Simplified
```

---

## 🔒 Security Features

### **Vetting Wall**
```typescript
// Blur content for unverified users
filter: blur-md

// Blurred elements:
- Description
- Fantasies & Experiences
- Photo gallery

// Always visible:
- Username
- Experience level
- Interests
- Looking for tags
```

### **Firestore Security Rules**
```javascript
// profiles.rules
match /members/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;
}

match /favorites/{favoriteId} {
  allow read, write: if request.auth != null;
}
```

---

## ✨ Interactive Elements

### **Action Bar Buttons**

**Message Button:**
```jsx
<button onClick={() => router.push(`/messages?userId=${profileId}`)}>
  💬 Message
</button>
```

**Favorite Button:**
```jsx
<button onClick={handleToggleFavorite}>
  {isFavorite ? '❤️' : '🤍'} // Filled when favorited
</button>
```

**Edit Profile (Owner):**
```jsx
<button onClick={() => setShowEditModal(true)}>
  ✏️ Edit Profile
</button>
```

---

## 🎭 Modals

### **1. Vetting Wall Modal**
**Trigger:** Click "Why is content blurred?"
**Content:**
- 🔒 Lock icon
- "Membership Vetting Required" heading
- Explanation text
- "I Understand" button

### **2. Edit Profile Modal**
**Trigger:** Click "Edit Profile" (owner only)
**Fields:**
- Description (textarea)
- Fantasies & Experiences (textarea)
**Actions:**
- Cancel
- Save Changes

---

## 📊 Data Flow

### **Profile Load**
```
1. Extract userId from URL params
   ↓
2. Auth check (onAuthStateChanged)
   ↓
3. Fetch profile (getProfile)
   ↓
4. Check if favorite (checkIsFavorite)
   ↓
5. Apply vetting logic
   ↓
6. Render components
```

### **Favorite Toggle**
```
1. Click heart button
   ↓
2. Check auth
   ↓
3. Call toggleFavorite(currentId, targetId)
   ↓
4. Firestore: add or delete favorite doc
   ↓
5. Update local state
   ↓
6. Animate button (scale + color change)
```

---

## 🎨 Animation Effects

### **Page Load**
```typescript
Header: Fade in
Content: Slide up
Photos: Staggered fade (delay * index)
```

### **Gallery**
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: index * 0.1 }}
/>
```

### **Action Buttons**
```typescript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### **Modal**
```typescript
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
```

---

## 🔧 Usage Examples

### **Link to Profile**
```jsx
// From map marker
<a href={`/profile/${user.id}`}>
  View Profile
</a>

// From search results
<Link href={`/profile/${user.id}`}>
  {user.username}
</Link>
```

### **Check if Favorited**
```typescript
const favResult = await checkIsFavorite(currentUserId, profileId);
setIsFavorite(favResult.isFavorite);
```

### **Edit Profile**
```typescript
const result = await updateProfile(userId, {
  description: "New bio...",
  fantasies: "Updated experiences..."
});

if (result.success) {
  // Update local state
  setProfile(prev => ({ ...prev, ...updates }));
}
```

---

## 📝 Integration Points

### **From Map View**
- Click marker popup → "View Profile" → `/profile/{id}`

### **From Search**
- User card → Click → `/profile/{id}`

### **To Messages**
- Profile action bar → "Message" → `/messages?userId={id}`

### **Favorites List**
- Heart icon → Toggle → Stored in Firestore
- Future: View all favorites page

---

## 🚀 Performance

### **Optimizations**
- Lazy load images
- Staggered animation timing
- Memoized components
- Single Firestore query for profile
- Client-side favorite state management

### **Image Handling**
```jsx
// No cropping - preserve aspect ratio
object-contain
// With container aspect ratio
aspectRatio: '1'
// Center in container
background: darkBlue
```

---

## ✅ Testing Checklist

**Profile Display:**
- [ ] Photo header loads correctly
- [ ] Username displays with verified shield
- [ ] Experience badge shows correct color
- [ ] Interests render as chips
- [ ] Gallery uses masonry grid

**Actions:**
- [ ] Message button redirects
- [ ] Favorite toggle works
- [ ] Edit profile opens modal (owner)
- [ ] Save profile updates Firestore

**Privacy:**
- [ ] Vetting wall blurs unverified
- [ ] Owner sees full profile
- [ ] Modal explains vetting

**Responsive:**
- [ ] Mobile layout stacks
- [ ] Action bar adapts
- [ ] Gallery responsive

---

## 🎯 Summary

**Route:** `/profile/[id]`

**Components:**
- ProfilePage.tsx (main component)
- Server Actions (profile/actions.ts)

**Features:**
- ✅ Full-width photo header
- ✅ Verified shield icon
- ✅ Experience badge
- ✅ Masonry gallery (no crop)
- ✅ Lifestyle tags
- ✅ Message button
- ✅ Favorite toggle
- ✅ Vetting wall
- ✅ Edit profile (owner)

**Firestore:**
- `members` - Profile data
- `favorites` - Favorite relationships

**The dynamic profile page is live with all luxury features and privacy controls!** 👤✨

Access at: **http://localhost:3000/profile/{userId}**
