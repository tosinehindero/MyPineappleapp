import React from 'react';

/**
 * Luxury Theme Demo Component
 * Showcases all custom luxury styling features
 */
const LuxuryThemeDemo = () => {
  return (
    <div className="min-h-screen bg-charcoal p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="text-center space-y-4">
          <h1 className="font-heading text-6xl text-gold-gradient">
            Luxury Social App
          </h1>
          <p className="text-offWhite/80 text-xl font-body">
            Experience premium design with custom Tailwind configuration
          </p>
          <div className="gold-shimmer h-1 w-32 mx-auto rounded-full"></div>
        </header>

        {/* Color Palette */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="bg-charcoal h-24 rounded-lg border border-gold/20"></div>
              <p className="text-offWhite text-sm font-body">Charcoal (#121212)</p>
            </div>
            <div className="space-y-2">
              <div className="bg-darkBlue h-24 rounded-lg border border-gold/20"></div>
              <p className="text-offWhite text-sm font-body">Dark Blue (#0F172A)</p>
            </div>
            <div className="space-y-2">
              <div className="bg-gold h-24 rounded-lg shadow-gold-glow"></div>
              <p className="text-offWhite text-sm font-body">Gold (#D4AF37)</p>
            </div>
            <div className="space-y-2">
              <div className="bg-offWhite h-24 rounded-lg"></div>
              <p className="text-offWhite text-sm font-body">Off-white (#F8FAFC)</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Typography</h2>
          <div className="glass-morphism p-6 rounded-lg space-y-4">
            <div>
              <h1 className="font-heading text-5xl text-gold mb-2">Playfair Display</h1>
              <p className="text-offWhite/70 text-sm">Heading Font (font-heading)</p>
            </div>
            <div>
              <p className="font-body text-xl text-offWhite">
                Inter Font for body text - Clean, modern, and highly readable
              </p>
              <p className="text-offWhite/70 text-sm mt-2">Body Font (font-body)</p>
            </div>
          </div>
        </section>

        {/* Glass Morphism Effects */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Glass Morphism</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-morphism p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gold mb-3">Dark Glass</h3>
              <p className="text-offWhite/90 font-body">
                Frosted glass effect with dark background and subtle gold border.
                Perfect for cards and overlays.
              </p>
            </div>
            <div className="glass-morphism-light p-6 rounded-lg">
              <h3 className="font-heading text-xl text-gold mb-3">Light Glass</h3>
              <p className="text-offWhite/90 font-body">
                Lighter variant with enhanced transparency.
                Great for secondary elements.
              </p>
            </div>
          </div>
        </section>

        {/* Gold Glow Shadows */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Gold Glow Effects</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-darkBlue p-6 rounded-lg shadow-gold-glow-sm">
              <div className="w-12 h-12 bg-gold rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <h4 className="font-heading text-lg text-gold mb-2">Small Glow</h4>
              <p className="text-offWhite/80 text-sm">shadow-gold-glow-sm</p>
            </div>
            <div className="bg-darkBlue p-6 rounded-lg shadow-gold-glow">
              <div className="w-12 h-12 bg-gold rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              <h4 className="font-heading text-lg text-gold mb-2">Standard Glow</h4>
              <p className="text-offWhite/80 text-sm">shadow-gold-glow</p>
            </div>
            <div className="bg-darkBlue p-6 rounded-lg shadow-gold-glow-lg">
              <div className="w-12 h-12 bg-gold rounded-lg mb-4 flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
              <h4 className="font-heading text-lg text-gold mb-2">Large Glow</h4>
              <p className="text-offWhite/80 text-sm">shadow-gold-glow-lg</p>
            </div>
          </div>
        </section>

        {/* Button Styles */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Button Styles</h2>
          <div className="glass-morphism p-8 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <button className="btn-luxury px-6 py-3 rounded-lg">
                Luxury Button
              </button>
              <button className="bg-gold text-charcoal px-6 py-3 rounded-lg font-semibold shadow-gold-glow hover:shadow-gold-glow-lg transition-all">
                Gold Button
              </button>
              <button className="bg-darkBlue text-gold px-6 py-3 rounded-lg border-2 border-gold hover:bg-gold hover:text-charcoal transition-all">
                Outline Button
              </button>
              <button className="bg-offWhite text-charcoal px-6 py-3 rounded-lg font-semibold hover:shadow-gold-glow transition-all">
                Light Button
              </button>
            </div>
            <p className="text-offWhite/70 text-sm mt-6 font-body">
              All buttons automatically receive subtle gold hover effects
            </p>
          </div>
        </section>

        {/* Luxury Cards */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Luxury Cards</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-luxury">
              <h3 className="font-heading text-xl text-gold mb-3">Premium Card</h3>
              <p className="text-offWhite/90 font-body mb-4">
                Pre-built luxury card with glass morphism and gold glow hover effect.
              </p>
              <button className="btn-luxury px-4 py-2 rounded text-sm">
                Learn More
              </button>
            </div>
            
            <div className="bg-darkBlue p-6 rounded-lg border border-gold/30 hover:shadow-gold-glow transition-all">
              <h3 className="font-heading text-xl text-gold mb-3">Custom Card</h3>
              <p className="text-offWhite/90 font-body mb-4">
                Custom styled card with dark blue background and gold border.
              </p>
              <button className="text-gold hover:text-gold-light transition-colors">
                Explore →
              </button>
            </div>
            
            <div className="glass-morphism-light p-6 rounded-lg hover:border-gold/40 border border-gold/20 transition-all">
              <h3 className="font-heading text-xl text-gold mb-3">Light Card</h3>
              <p className="text-offWhite/90 font-body mb-4">
                Light glass card with subtle transparency effect.
              </p>
              <div className="flex space-x-2">
                <span className="text-gold text-2xl">⭐</span>
                <span className="text-gold text-2xl">⭐</span>
                <span className="text-gold text-2xl">⭐</span>
              </div>
            </div>
          </div>
        </section>

        {/* Text Effects */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Text Effects</h2>
          <div className="glass-morphism p-8 rounded-lg space-y-6">
            <div>
              <h3 className="text-gold-gradient text-4xl font-heading mb-2">
                Gold Gradient Text
              </h3>
              <p className="text-offWhite/70 text-sm">text-gold-gradient</p>
            </div>
            <div>
              <div className="gold-shimmer text-4xl font-heading mb-2 bg-clip-text text-transparent">
                Animated Gold Shimmer
              </div>
              <p className="text-offWhite/70 text-sm">gold-shimmer</p>
            </div>
          </div>
        </section>

        {/* Complete Example */}
        <section className="space-y-6">
          <h2 className="font-heading text-3xl text-gold">Complete Example</h2>
          <div className="bg-darkBlue rounded-xl overflow-hidden shadow-gold-glow-lg">
            <div className="bg-gold-gradient h-32 flex items-center justify-center">
              <h3 className="text-charcoal text-3xl font-heading">Featured Post</h3>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gold shadow-gold-glow flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h4 className="font-heading text-xl text-gold">Alexander Knight</h4>
                  <p className="text-offWhite/70 font-body text-sm">@alexknight</p>
                </div>
              </div>
              <p className="text-offWhite/90 font-body leading-relaxed">
                Just launched my new luxury brand collection! Experience elegance 
                redefined with our premium designs. Each piece tells a story of 
                craftsmanship and sophistication. ✨
              </p>
              <div className="flex space-x-4 pt-4 border-t border-gold/20">
                <button className="text-offWhite/70 hover:text-gold transition-colors flex items-center space-x-2">
                  <span>❤️</span>
                  <span className="text-sm">1.2K</span>
                </button>
                <button className="text-offWhite/70 hover:text-gold transition-colors flex items-center space-x-2">
                  <span>💬</span>
                  <span className="text-sm">89</span>
                </button>
                <button className="text-offWhite/70 hover:text-gold transition-colors flex items-center space-x-2">
                  <span>🔄</span>
                  <span className="text-sm">234</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-12 border-t border-gold/20">
          <p className="text-offWhite/70 font-body">
            Luxury Theme Configuration Complete ✨
          </p>
          <p className="text-offWhite/50 text-sm mt-2">
            All custom utilities and effects are ready to use
          </p>
        </footer>

      </div>
    </div>
  );
};

export default LuxuryThemeDemo;
