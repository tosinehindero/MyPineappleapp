# Luxury Social App - Tailwind Theme Guide

## 🎨 Color Palette

### Direct Colors (Use these for maximum luxury effect)
```jsx
// Background
className="bg-charcoal"           // #121212 - Main background

// Cards & Surfaces  
className="bg-darkBlue"            // #0F172A - Card backgrounds

// Primary/Accent
className="bg-gold"                // #D4AF37 - Primary gold
className="bg-gold-light"          // #E5C158 - Light gold
className="bg-gold-dark"           // #B8941F - Dark gold
className="text-gold"              // Gold text

// Text
className="text-offWhite"          // #F8FAFC - Primary text color
```

### CSS Variable Colors (For component compatibility)
```jsx
className="bg-background"          // Charcoal in dark mode
className="bg-card"                // Dark Blue in dark mode
className="bg-primary"             // Gold
className="text-foreground"        // Off-white in dark mode
```

---

## 📝 Typography

### Font Families
```jsx
// Headings (Playfair Display - Serif)
className="font-heading"           // Use for h1, h2, h3, h4, h5, h6
className="font-serif"             // Alternative

// Body Text (Inter - Sans)
className="font-body"              // Body text (auto-applied)
className="font-sans"              // Alternative
```

### Usage Example
```jsx
<h1 className="font-heading text-4xl text-gold">Luxury Heading</h1>
<p className="font-body text-offWhite">Body content with Inter font</p>
```

---

## ✨ Custom Effects

### Glass Morphism
```jsx
// Dark glass effect (primary)
className="glass-morphism"

// Light glass effect
className="glass-morphism-light"

// Example Usage
<div className="glass-morphism p-6 rounded-lg">
  <h3>Premium Card</h3>
</div>
```

### Gold Glow Shadows
```jsx
// Standard glow
className="shadow-gold-glow"

// Small glow
className="shadow-gold-glow-sm"

// Large glow
className="shadow-gold-glow-lg"

// Example
<button className="bg-gold px-6 py-3 rounded shadow-gold-glow">
  Glowing Button
</button>
```

### Gold Gradient Text
```jsx
className="text-gold-gradient"

// Example
<h2 className="text-gold-gradient text-5xl font-heading">
  Gradient Gold Text
</h2>
```

### Animated Gold Shimmer
```jsx
className="gold-shimmer"

// Example - Animated background
<div className="gold-shimmer h-1 w-full"></div>
```

---

## 🔘 Button Styles

### Luxury Button (Pre-built class)
```jsx
// Primary luxury button with gold gradient hover
<button className="btn-luxury px-6 py-3 rounded-lg">
  Luxury Button
</button>
```

### Standard Buttons (Auto-enhanced)
All `<button>` elements automatically get subtle gold hover effects:
```jsx
<button className="bg-gold text-charcoal px-4 py-2 rounded">
  Auto Gold Hover
</button>
```

### Custom Button with Effects
```jsx
<button className="bg-gold text-charcoal px-6 py-3 rounded-lg 
                   shadow-gold-glow hover:shadow-gold-glow-lg
                   transition-all duration-300">
  Custom Luxury Button
</button>
```

---

## 💎 Luxury Card Component

### Pre-built Luxury Card
```jsx
<div className="card-luxury">
  <h3 className="font-heading text-gold mb-4">Premium Content</h3>
  <p className="text-offWhite">Your content here</p>
</div>
```

### Custom Luxury Card
```jsx
<div className="bg-darkBlue glass-morphism rounded-lg p-6 
                hover:shadow-gold-glow transition-all duration-300
                border border-gold/20">
  <h3 className="font-heading text-2xl text-gold mb-3">Title</h3>
  <p className="text-offWhite/90">Description</p>
</div>
```

---

## 🎭 Complete Example Components

### Hero Section
```jsx
<section className="bg-charcoal min-h-screen flex items-center justify-center">
  <div className="text-center space-y-6">
    <h1 className="font-heading text-6xl text-gold-gradient">
      Welcome to Luxury
    </h1>
    <p className="font-body text-xl text-offWhite/80 max-w-2xl mx-auto">
      Experience the finest social platform
    </p>
    <button className="btn-luxury px-8 py-4 rounded-full text-lg">
      Get Started
    </button>
  </div>
</section>
```

### Feature Card
```jsx
<div className="card-luxury max-w-sm">
  <div className="w-12 h-12 bg-gold rounded-lg shadow-gold-glow mb-4 
                  flex items-center justify-center">
    <span className="text-2xl">✨</span>
  </div>
  <h3 className="font-heading text-2xl text-gold mb-3">
    Premium Feature
  </h3>
  <p className="text-offWhite/90 font-body">
    Discover exclusive features designed for luxury experiences.
  </p>
</div>
```

### Profile Card
```jsx
<div className="glass-morphism rounded-xl p-6 border border-gold/20 
                hover:border-gold/40 transition-all duration-300">
  <div className="flex items-center space-x-4">
    <div className="w-16 h-16 rounded-full bg-gold shadow-gold-glow"></div>
    <div>
      <h4 className="font-heading text-xl text-gold">John Doe</h4>
      <p className="text-offWhite/70 font-body text-sm">@johndoe</p>
    </div>
  </div>
</div>
```

---

## 🌓 Dark Mode (Default)

The luxury theme is optimized for **dark mode by default**:
- Background: Charcoal (#121212)
- Cards: Dark Blue (#0F172A)
- Primary: Gold (#D4AF37)
- Text: Off-white (#F8FAFC)

To enable dark mode in your app:
```jsx
// Add to root element (usually in index.html or App.js)
<html className="dark">
```

---

## 🎨 Background Gradients

```jsx
// Gold gradient background
className="bg-gold-gradient"

// Subtle gold gradient
className="bg-gold-gradient-subtle"

// Example
<div className="bg-gold-gradient p-8 rounded-lg">
  <h3 className="text-charcoal">Gold Background</h3>
</div>
```

---

## 📦 Quick Reference Classes

| Effect | Class |
|--------|-------|
| Gold glow shadow | `shadow-gold-glow` |
| Glass morphism | `glass-morphism` |
| Luxury button | `btn-luxury` |
| Luxury card | `card-luxury` |
| Gold gradient text | `text-gold-gradient` |
| Animated shimmer | `gold-shimmer` |
| Heading font | `font-heading` |
| Body font | `font-body` |

---

## 🚀 Getting Started

1. **Enable dark mode** (add to your root element):
```jsx
<div className="dark">
  {/* Your app */}
</div>
```

2. **Use the color palette**:
```jsx
<div className="bg-charcoal text-offWhite">
  <div className="bg-darkBlue p-6 rounded-lg">
    <h1 className="font-heading text-gold">Luxury App</h1>
  </div>
</div>
```

3. **Apply effects**:
```jsx
<button className="btn-luxury shadow-gold-glow">
  Premium Action
</button>
```

Enjoy your luxury social app theme! ✨🎨
