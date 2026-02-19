'use client';

import { useEffect, useState } from 'react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      data-testid="hero-section"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1606508976671-18ac39d3d1c6?q=80&w=2070&auto=format&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/70 to-charcoal"></div>
        <div className="absolute inset-0 bg-darkBlue/30"></div>
      </div>

      {/* Content */}
      <div
        className={`relative z-10 text-center px-6 max-w-5xl mx-auto transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Subtitle */}
        <div className="mb-6 flex justify-center">
          <span className="text-gold text-sm uppercase tracking-[0.3em] font-body font-light">
            Exclusive · Elite · Elevated
          </span>
        </div>

        {/* Main Heading */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading mb-8 leading-tight"
          data-testid="hero-heading"
        >
          <span className="text-gold-gradient block mb-2">
            Where luxury
          </span>
          <span className="text-offWhite">
            meets Lifestyle
          </span>
        </h1>

        {/* Description */}
        <p
          className="text-offWhite/80 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-body leading-relaxed"
          data-testid="hero-description"
        >
          An invitation-only social platform for discerning individuals who value 
          privacy, sophistication, and meaningful connections across the globe.
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button
            className="group relative px-10 py-5 bg-gold text-charcoal font-semibold text-lg rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] font-body"
            data-testid="hero-cta-button"
          >
            <span className="relative z-10">Join the Inner Circle</span>
            <div className="absolute inset-0 bg-gold-light opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <button
            className="px-10 py-5 border-2 border-gold/40 text-gold hover:border-gold hover:bg-gold/10 rounded-full transition-all duration-300 font-body font-semibold text-lg"
            data-testid="hero-secondary-button"
          >
            Learn More
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-20 animate-bounce">
          <svg
            className="w-6 h-6 mx-auto text-gold/60"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gold/5 blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-gold/5 blur-3xl"></div>
    </section>
  );
}
