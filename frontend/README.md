# LUXY - Luxury Social Platform Landing Page

A stunning Next.js 15 landing page with a luxury aesthetic, featuring high-end design elements, smooth animations, and a sophisticated color palette inspired by onluxy.com.

## 🎨 Design Features

### Color Palette
- **Charcoal** (#121212) - Deep, sophisticated background
- **Dark Blue** (#0F172A) - Premium card backgrounds
- **Gold** (#D4AF37) - Luxurious accent color
- **Off-White** (#F8FAFC) - Elegant text color

### Typography
- **Playfair Display** - Elegant serif font for headings
- **Inter** - Clean, modern sans-serif for body text

### Custom Effects
- ✨ Glass-morphism cards with backdrop blur
- 🌟 Gold glow shadows for premium feel
- 🎯 Smooth scroll-based navbar transition
- 💫 Fade-in animations on scroll
- 🎨 Gold gradient text effects
- ⚡ Interactive hover states

## 📦 Tech Stack

- **Next.js 16.1.6** (Latest) with App Router
- **React 19.2.3** - Latest React features
- **Tailwind CSS v4** - CSS-based configuration
- **TypeScript** - Type-safe development
- **Turbopack** - Ultra-fast bundler

## 🚀 Project Structure

```
/app/frontend/
├── app/
│   ├── layout.tsx        # Root layout with metadata
│   ├── page.tsx          # Main landing page
│   └── globals.css       # Luxury theme styles
├── components/
│   ├── Navbar.tsx        # Sticky navbar with scroll effect
│   ├── HeroSection.tsx   # Hero with CTA
│   ├── FeaturesSection.tsx # Feature cards
│   └── Footer.tsx        # Footer with links
├── public/               # Static assets
├── package.json
└── .env.local           # Environment variables
```

## 🎯 Sections

### 1. Navbar
- **Sticky positioning** with smooth scroll-based transitions
- **Transparent** → **Charcoal background** on scroll
- **Desktop navigation** with hover effects
- **CTA Buttons**: "Log In" and "Apply for Membership"
- Fully responsive with mobile optimization

### 2. Hero Section
- **High-resolution background image** with gradient overlays
- **Large, impactful typography** with gold gradient text
- **Dual CTA buttons**:
  - Primary: "Join the Inner Circle" (Gold)
  - Secondary: "Learn More" (Outlined)
- **Animated entrance** on page load
- **Scroll indicator** with bounce animation

### 3. Features Section
- **Three premium feature cards**:
  1. ✓ **Verified Community** - Vetted membership
  2. ✈ **Global Travel** - Worldwide connections
  3. 🔒 **Secure Encrypted Messaging** - Privacy-first
- **Glass-morphism design** with backdrop blur
- **Staggered animations** on scroll into view
- **Interactive hover effects** with gold glow
- **Bottom CTA**: "Request an Invitation"

### 4. Footer
- **Multi-column layout** with brand, links, and legal
- **Social media links** with hover animations
- **Responsive grid** for mobile/tablet/desktop
- **Gold accent colors** throughout

## 🎨 Custom Utility Classes

### Glass Morphism
```jsx
className="glass-morphism"        // Dark frosted glass
className="glass-morphism-light"  // Light frosted glass
```

### Gold Effects
```jsx
className="text-gold-gradient"    // Gold gradient text
className="bg-gold-gradient"      // Gold gradient background
className="gold-shimmer"          // Animated shimmer effect
```

### Color Classes
```jsx
className="bg-charcoal"           // #121212
className="bg-darkBlue"           // #0F172A
className="bg-gold"               // #D4AF37
className="text-offWhite"         // #F8FAFC
```

### Shadow Effects
```jsx
className="shadow-[0_0_20px_rgba(212,175,55,0.5)]"  // Gold glow
```

## 🛠️ Development

### Running Locally
```bash
cd /app/frontend
yarn dev
```

The app runs on **http://localhost:3000**

### Building for Production
```bash
yarn build
yarn start
```

### Linting
```bash
yarn lint
```

## 🌐 Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## ✨ Key Features Implemented

### Navbar
- [x] Sticky positioning
- [x] Transparent to charcoal transition on scroll
- [x] Responsive design
- [x] "Log In" button
- [x] "Apply for Membership" CTA

### Hero
- [x] High-resolution dark background
- [x] Gold gradient text
- [x] "Join the Inner Circle" CTA button
- [x] Animated entrance
- [x] Responsive typography

### Features
- [x] Three sleek cards
- [x] Glass-morphism effect
- [x] Icon integration
- [x] Hover animations
- [x] Scroll-triggered entrance

### Overall
- [x] Minimalist, high-end vibe
- [x] Smooth animations
- [x] Luxury color palette
- [x] Typography hierarchy
- [x] Mobile responsive
- [x] Fast loading with Turbopack

## 📱 Responsive Design

- **Mobile** (< 768px): Stacked layout, hamburger menu ready
- **Tablet** (768px - 1024px): Optimized spacing
- **Desktop** (> 1024px): Full feature layout

## 🎭 Animations

- Fade-in on scroll (Intersection Observer)
- Smooth scroll behavior
- Hover transformations
- Button hover effects
- Navbar scroll transitions
- Shimmer effects

## 🔧 Customization

### Changing Colors
Edit `/app/frontend/app/globals.css`:
```css
@theme {
  --color-charcoal: #121212;
  --color-darkBlue: #0F172A;
  --color-gold: #D4AF37;
  --color-offWhite: #F8FAFC;
}
```

### Changing Fonts
Update font imports in `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT');
```

### Adding Sections
Create new components in `/components` and import in `app/page.tsx`

## 📊 Performance

- ⚡ **Turbopack** for fast builds
- 🎨 **CSS-in-CSS** with Tailwind v4
- 📦 **Code splitting** with Next.js
- 🖼️ **Optimized images** with next/image (when integrated)
- 🔄 **Fast refresh** during development

## 🎨 Design Inspiration

Inspired by **onluxy.com** - minimalist, high-end luxury aesthetic with:
- Dark, sophisticated color scheme
- Premium typography
- Subtle animations
- Glass-morphism effects
- Gold accent colors
- Clean, spacious layouts

## 📝 Test IDs

All major elements include `data-testid` attributes for testing:
- `navbar-logo`
- `hero-section`
- `hero-cta-button`
- `features-section`
- `feature-card-{index}`
- `footer`

## 🚀 Deployment

The app is configured to run on port 3000 and is compatible with:
- Vercel
- Netlify
- Docker
- Any Node.js hosting platform

## 📄 License

This project is part of a luxury social platform MVP.

---

**Built with** ❤️ **using Next.js 15, React 19, and Tailwind CSS v4**
