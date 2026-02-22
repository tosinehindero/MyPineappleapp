import Link from 'next/link';

const pineappleLogo = "https://customer-assets.emergentagent.com/job_ece997f5-18cb-49ee-85d0-980bc524a48f/artifacts/k57dslwa_logo2.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-darkBlue border-t border-gold/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-1.5 mb-4">
              <h3 className="text-3xl font-heading text-gold">PineapplePlay</h3>
              <img src={pineappleLogo} alt="Pineapple" className="w-8 h-10 object-contain" />
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
                <Link href="#features" className="text-offWhite/70 hover:text-gold transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#about" className="text-offWhite/70 hover:text-gold transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-offWhite/70 hover:text-gold transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-offWhite/70 hover:text-gold transition-colors">
                  Membership
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
