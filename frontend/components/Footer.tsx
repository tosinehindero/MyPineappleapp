import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-darkBlue border-t border-gold/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-gold/30">
                <img
                  src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                  alt="PineapplePlay Logo"
                  className="w-full h-full object-cover"
                  data-testid="footer-pineapple-logo"
                />
              </div>
              <h3 className="text-3xl font-heading text-gold">PineapplePlay</h3>
            </div>
            <p className="text-offWhite/70 font-body leading-relaxed max-w-md">
              An exclusive social platform for those who value privacy, authenticity, 
              and meaningful connections with distinguished individuals worldwide.
            </p>
            <div className="mt-6 flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-charcoal transition-all"
                aria-label="Instagram"
              >
                IG
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-charcoal transition-all"
                aria-label="Twitter"
              >
                X
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-charcoal transition-all"
                aria-label="LinkedIn"
              >
                IN
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gold font-heading text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3 font-body">
              <li>
                <Link href="/#features" className="text-offWhite/70 hover:text-gold transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-offWhite/70 hover:text-gold transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-offWhite/70 hover:text-gold transition-colors">
                  Help Center / FAQ
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-offWhite/70 hover:text-gold transition-colors">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-gold font-heading text-lg mb-4">Legal</h4>
            <ul className="space-y-3 font-body">
              <li>
                <Link href="#" className="text-offWhite/70 hover:text-gold transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-offWhite/70 hover:text-gold transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-offWhite/70 hover:text-gold transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-offWhite/70 hover:text-gold transition-colors">
                  Code of Conduct
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gold/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-offWhite/50 text-sm font-body">
              © {currentYear} PineapplePlay. All rights reserved.
            </p>
            <p className="text-offWhite/50 text-sm font-body">
              Crafted with excellence for the distinguished
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
