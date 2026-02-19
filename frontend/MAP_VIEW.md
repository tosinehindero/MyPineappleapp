# PineapplePlay Map View 🗺️

A luxury interactive map component showing nearby members with real-time online status indicators and radius-based filtering.

## 🎯 Features

### Interactive Map Display
✅ **React-Leaflet Integration** - OpenStreetMap tiles
✅ **Gold Radius Filter** - 0-50 miles adjustable slider
✅ **Gold Pin Markers** - Custom-designed luxury pins
✅ **Geolocation** - Auto-detect user's current location
✅ **Firestore Integration** - Fetch real member data
✅ **Distance Calculation** - Haversine formula for accurate filtering

### Who's Online Sidebar
✅ **Real-time Status** - Shows users with `isOnline: true`
✅ **Green Pulse Animation** - Animated indicator for online users
✅ **Gold-Bordered Avatars** - Luxury styling
✅ **User Details** - Username, account type, location, interests
✅ **Interactive Cards** - Hover effects and smooth animations

## 📦 Tech Stack

```
React-Leaflet:    5.0.0
Leaflet:          1.9.4
Firebase:         12.9.0 (Firestore)
Framer Motion:    12.34.2
Next.js:          16.1.6
TypeScript:       5.x
```

## 🗂️ Project Structure

```
/app/frontend/
├── components/
│   └── MapView.tsx              # Main map component
├── app/
│   └── map/
│       └── page.tsx             # Map page
├── public/
│   ├── marker-icon.png          # Leaflet marker icon
│   ├── marker-icon-2x.png       # Retina marker icon
│   └── marker-shadow.png        # Marker shadow
└── lib/
    └── firebase.ts              # Firebase config
```

## 🎨 Design Components

### Map Header
- Dark blue background with backdrop blur
- Gold progress bar aesthetic
- Real-time member count
- Responsive padding

### Radius Slider
```typescript
Range: 0-50 miles
Default: 25 miles
Color: Gold (#D4AF37)
Style: Linear gradient fill
```

### Gold Pin Markers
```svg
Custom SVG icon:
- Gold (#D4AF37) outer pin
- Dark blue (#0F172A) center circle
- Size: 32x48px
- Anchor: Bottom center
```

### Who's Online Sidebar
- Width: 96 (384px) on desktop
- Full width on mobile
- Dark blue background
- Glass-morphism cards
- Slide-in animation (right to left)

## 🔥 Firebase Integration

### Firestore Query
```typescript
Collection: 'members'
Fields used:
  - username
  - accountType
  - location
  - interests[]
  - photoUrls[]
  - isOnline (boolean)
  - coordinates { lat, lng }
```

### Data Structure
```typescript
interface User {
  id: string;
  username: string;
  accountType: string;
  location: string;
  interests: string[];
  photoUrls: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  isOnline?: boolean;
  lastSeen?: Date;
}
```

## 🎯 Key Features Breakdown

### 1. Radius Filtering
**Functionality:**
- Gold slider from 0-50 miles
- Real-time filtering of users
- Visual circle overlay on map
- Member count updates dynamically

**Implementation:**
```typescript
// Haversine distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  // ... calculation
  return distance;
};

// Filter users within radius
const usersInRadius = users.filter(user => 
  calculateDistance(...) <= radius
);
```

### 2. Gold Pin Markers
**Custom Icon:**
- SVG-based for crisp rendering
- Gold outer shape (#D4AF37)
- Dark blue center (#0F172A)
- Popup on click with user details

**Popup Contents:**
- User avatar (or initial)
- Username
- Online status indicator
- Account type
- Location
- Top 3 interests

### 3. Who's Online Sidebar
**Features:**
- Auto-filters online users (`isOnline: true`)
- Green pulse animation
- Gold-bordered avatars
- Smooth fade-in animations
- Hover scale effect

**Green Pulse Indicator:**
```css
Outer ring: animate-ping (green-400)
Inner dot: bg-green-500
Border: 2px darkBlue
Animation: Infinite pulse
```

### 4. Geolocation
**Auto-Detection:**
```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    setUserLocation([lat, lng]);
  },
  (error) => {
    // Fallback to Miami, FL
    setUserLocation([25.7617, -80.1918]);
  }
);
```

## 📱 Responsive Design

### Desktop (> 1024px)
- Flex layout: Map (flex-1) | Sidebar (w-96)
- Full height viewport
- Side-by-side layout

### Tablet (768-1024px)
- Similar to desktop
- Adjusted padding

### Mobile (< 768px)
- Stacked layout
- Map on top, sidebar below
- Full-width components
- Touch-friendly controls

## 🎨 Styling Details

### Map Container
```css
Height: 100vh
Background: Charcoal (#121212)
Border: Gold/20 opacity
Z-index: Map header (1000)
```

### Radius Circle
```css
Stroke: Gold (#D4AF37)
Fill: Gold with 10% opacity
Weight: 2px
Radius: Dynamic (miles to meters)
```

### Online User Cards
```css
Background: glass-morphism
Border: Gold/20, hover Gold/40
Padding: 1rem
Border-radius: 0.5rem
Transition: All 300ms
```

### Avatar Styles
```css
Size: 56px (w-14 h-14)
Border: 2px solid gold
Border-radius: 50%
Object-fit: cover
Position: relative (for pulse indicator)
```

## 🔧 Usage

### Access Map View
```
http://localhost:3000/map
```

### From Navbar
Click "Discover" link in navigation

### User Interactions
1. **Adjust Radius** - Drag slider to change search area
2. **View Members** - Click gold pins on map for details
3. **Online Users** - Scroll sidebar to see all online members
4. **Pan/Zoom** - Standard map controls

## 🎭 Animations

### Sidebar Entrance
```typescript
Framer Motion:
initial: { x: 400 }
animate: { x: 0 }
Duration: Default
```

### User Cards
```typescript
Fade-in:
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }

Hover:
whileHover: { scale: 1.02 }
```

### Green Pulse
```css
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

Animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite
```

### Loading State
```typescript
Spinner: Gold border, transparent top
Size: 64px
Animation: spin
Text: "Loading map..."
```

## 🌍 Map Configuration

### Tile Layer
```typescript
Provider: OpenStreetMap
URL: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
Attribution: © OpenStreetMap contributors
```

### Default Settings
```typescript
Center: User location or Miami, FL
Zoom: 11 (city-level view)
Zoom Control: Enabled
Scroll Wheel Zoom: Enabled
```

## 📊 Data Flow

```
User Location → Geolocation API
    ↓
Firestore Query → Fetch Members
    ↓
Calculate Distances → Filter by Radius
    ↓
Render Map Markers + Online Sidebar
    ↓
User Interaction → Update Filters → Re-render
```

## 🎯 Demo Data

Since this is a new app, the component includes demo data generation:

```typescript
// Generate random coordinates near user
const lat = userLocation[0] + (Math.random() - 0.5) * 0.5;
const lng = userLocation[1] + (Math.random() - 0.5) * 0.5;

// Random online status
isOnline: Math.random() > 0.5
```

**In Production:**
- Replace with actual user coordinates from Firestore
- Implement real-time online status updates
- Add WebSocket or Firestore listeners for live updates

## 🔐 Privacy Considerations

### Location Privacy
- Users control location sharing
- Approximate locations (not exact addresses)
- Radius filtering maintains privacy
- No real-time tracking

### Online Status
- User-controlled visibility
- Last seen timestamps
- Privacy settings integration (future)

## 🚀 Performance

### Optimization Techniques
- Dynamic imports for map components (avoid SSR)
- Memoized distance calculations
- Filtered data before rendering
- Lazy loading of user images

### Lazy Loading
```typescript
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
```

## 🐛 Troubleshooting

### Leaflet CSS Not Loading
- Ensure `leaflet/dist/leaflet.css` is imported
- Check public folder for marker icons

### Map Not Rendering
- Component must be client-side (`'use client'`)
- Check browser console for errors
- Verify Firestore permissions

### Markers Not Showing
- Ensure user data has `coordinates` field
- Check custom icon initialization
- Verify lat/lng values are valid

## ✨ Future Enhancements

- [ ] Real-time location updates
- [ ] User profile preview modal
- [ ] Filtering by interests
- [ ] Advanced search filters
- [ ] Route calculation between users
- [ ] Clustering for many markers
- [ ] Custom map themes (dark mode)
- [ ] Favorite locations
- [ ] Event markers on map
- [ ] Travel plans visualization

## 📝 Component Props

### MapView Component
```typescript
Props: None (self-contained)
State:
  - users: User[]
  - radius: number (0-50)
  - loading: boolean
  - userLocation: [lat, lng]
  - customIcon: L.Icon
```

## 🎨 Color Scheme

```css
Map Background: #121212 (charcoal)
Header: #0F172A (darkBlue) + 95% opacity
Pins: #D4AF37 (gold)
Slider: #D4AF37 gradient
Online Pulse: #22C55E (green-500)
Card Background: glass-morphism
Text: #F8FAFC (offWhite)
```

## 📱 Test IDs

```typescript
data-testid="radius-slider"
data-testid="online-sidebar"
data-testid="online-user-{userId}"
```

---

## 🚀 Quick Start

1. **Navigate to Map:**
   ```
   http://localhost:3000/map
   ```

2. **Adjust Radius:**
   - Move gold slider to change search area

3. **View Members:**
   - Click gold pins for details
   - Check sidebar for online users

4. **Interact:**
   - Pan and zoom the map
   - Hover over online user cards

**The map view is live and ready to connect members!** 🗺️✨
