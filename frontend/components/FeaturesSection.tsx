'use client';

import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: '✓',
    title: 'Verified Community',
    description: 'Every member is carefully vetted to ensure authenticity and maintain our high standards of excellence.',
    gradient: 'from-gold/20 to-transparent',
  },
  {
    icon: '✈',
    title: 'Global Travel',
    description: 'Connect with distinguished members worldwide. Access exclusive events and experiences in premier destinations.',
    gradient: 'from-gold-light/20 to-transparent',
  },
  {
    icon: '🔒',
    title: 'Secure Encrypted Messaging',
    description: 'Your conversations remain private with military-grade end-to-end encryption and secure data storage.',
    gradient: 'from-gold-dark/20 to-transparent',
  },
];

export default function FeaturesSection() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = cardsRef.current.map((card, index) => {
      if (!card) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleCards((prev) => [...prev, index]);
              }, index * 200);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(card);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  return (
    <section
      id="features"
      className="py-24 px-6 bg-gradient-to-b from-charcoal via-darkBlue/50 to-charcoal"
      data-testid="features-section"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm uppercase tracking-[0.3em] font-body font-light mb-4 block">
            Excellence in Every Detail
          </span>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading text-offWhite mb-6"
            data-testid="features-heading"
          >
            Designed for the <span className="text-gold-gradient">Distinguished</span>
          </h2>
          <p className="text-offWhite/70 text-lg max-w-2xl mx-auto font-body">
            Experience a platform that understands your need for privacy, quality, and authentic connections.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              className={`group relative transition-all duration-700 ${
                visibleCards.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              data-testid={`feature-card-${index}`}
            >
              {/* Card */}
              <div className="relative h-full glass-morphism rounded-2xl p-8 hover:border-gold/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                ></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300">
                      <span className="text-3xl">{feature.icon}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-heading text-gold mb-4 group-hover:text-gold-light transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-offWhite/80 font-body leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative Line */}
                  <div className="mt-6 h-0.5 w-12 bg-gradient-to-r from-gold to-transparent opacity-50 group-hover:w-24 group-hover:opacity-100 transition-all duration-500"></div>
                </div>

                {/* Corner Accent */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gold/5 rounded-bl-full blur-2xl group-hover:bg-gold/10 transition-all duration-500"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <p className="text-offWhite/60 mb-6 font-body">
            Join over 10,000 verified members worldwide
          </p>
          <button
            className="px-8 py-4 border-2 border-gold/40 text-gold hover:bg-gold hover:text-charcoal rounded-full transition-all duration-300 font-body font-semibold"
            data-testid="features-cta-button"
          >
            Request an Invitation
          </button>
        </div>
      </div>
    </section>
  );
}
