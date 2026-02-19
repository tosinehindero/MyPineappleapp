import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-charcoal">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      {/* CTA Section for Registration */}
      <section className="py-24 px-6 bg-gradient-to-b from-charcoal to-darkBlue">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-heading text-gold mb-6">
            Ready to Join?
          </h2>
          <p className="text-offWhite/80 text-lg mb-8 font-body">
            Complete our exclusive membership application and become part of the PineapplePlay community.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-5 bg-gold text-charcoal font-semibold text-lg rounded-full hover:shadow-gold-glow transition-all"
            data-testid="register-cta-button"
          >
            Start Your Application →
          </Link>
        </div>
      </section>
      
      <Footer />
    </main>
  );
}

