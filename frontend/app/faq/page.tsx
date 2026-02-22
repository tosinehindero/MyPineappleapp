'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: 'Marketplace & Payments',
    icon: (
      <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    items: [
      {
        question: 'How do I sell an item on the marketplace?',
        answer: (
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Marketplace</strong> from the navigation menu</li>
            <li>Click the <strong>"+ Sell Item"</strong> button</li>
            <li>Fill in your listing details (title, description, price)</li>
            <li>Upload up to 5 photos of your item</li>
            <li>Select a category and condition</li>
            <li>Click <strong>"Create Listing"</strong> to publish</li>
          </ol>
        ),
      },
      {
        question: 'How does the escrow payment protection work?',
        answer: (
          <div className="space-y-3">
            <p>Our escrow system protects both buyers and sellers:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Buyer purchases item</strong> → Payment is held securely in escrow</li>
              <li><strong>Seller ships/delivers item</strong> → Arranged via Messages</li>
              <li><strong>Buyer receives item</strong> → Inspects the item</li>
              <li><strong>Buyer confirms delivery</strong> → Payment released to seller</li>
            </ol>
            <p className="text-gold/80 text-sm mt-3">The seller only receives payment after the buyer confirms they received the item.</p>
          </div>
        ),
      },
      {
        question: 'How do I confirm delivery and release payment to the seller?',
        answer: (
          <div className="space-y-3">
            <p>After you receive your item, follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Marketplace</strong></li>
              <li>Click the <strong>"History"</strong> button in the header</li>
              <li>Find your purchase with the <strong>"In Escrow"</strong> status</li>
              <li>Click the green <strong>"Confirm Delivery"</strong> button</li>
              <li>Payment will be released to the seller immediately</li>
            </ol>
            <p className="text-yellow-400/80 text-sm mt-3">⚠️ Only confirm delivery after you have received and inspected your item!</p>
          </div>
        ),
      },
      {
        question: 'What is the platform fee?',
        answer: 'We charge a 3% platform fee on all sales. This fee is automatically deducted from the sale price when payment is released to the seller. For example, if you sell an item for $100, you will receive $97 after the fee.',
      },
      {
        question: 'How do I view my transaction history?',
        answer: (
          <div className="space-y-2">
            <p>To view all your purchases and sales:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Marketplace</strong></li>
              <li>Click <strong>"History"</strong> in the header</li>
              <li>Use the tabs to filter: <strong>All</strong>, <strong>My Purchases</strong>, or <strong>My Sales</strong></li>
            </ol>
            <p className="mt-2">You can see transaction status, amounts, and contact buyers/sellers directly from this page.</p>
          </div>
        ),
      },
      {
        question: 'How do I edit or delete my listing?',
        answer: (
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Marketplace</strong></li>
            <li>Click <strong>"My Listings"</strong> in the header</li>
            <li>Find the listing you want to modify</li>
            <li>Click <strong>"Edit"</strong> to update details or images</li>
            <li>Click <strong>"Delete"</strong> to remove the listing</li>
          </ol>
        ),
      },
    ],
  },
  {
    title: 'Messaging',
    icon: (
      <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    items: [
      {
        question: 'How do I send a message to another member?',
        answer: (
          <ol className="list-decimal list-inside space-y-2">
            <li>Visit the member's <strong>profile page</strong></li>
            <li>Click the <strong>"Send Message"</strong> button</li>
            <li>Type your message and press send</li>
            <li>Your conversation will appear in your <strong>Messages</strong> inbox</li>
          </ol>
        ),
      },
      {
        question: 'Are my messages private and secure?',
        answer: 'Yes! All messages on PineapplePlay are end-to-end encrypted. This means only you and the person you\'re messaging can read the conversation. Not even our team can access your private messages.',
      },
      {
        question: 'Where can I find my messages?',
        answer: 'You can access your messages by clicking "Messages" in the navigation menu, or by clicking the message icon in the header when viewing the feed.',
      },
    ],
  },
  {
    title: 'Account & Profile',
    icon: (
      <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    items: [
      {
        question: 'How do I edit my profile?',
        answer: (
          <ol className="list-decimal list-inside space-y-2">
            <li>Click on your <strong>profile icon</strong> or go to your profile page</li>
            <li>Click the <strong>"Edit Profile"</strong> button</li>
            <li>Update your photos, description, interests, and other details</li>
            <li>Click <strong>"Save Changes"</strong> to update your profile</li>
          </ol>
        ),
      },
      {
        question: 'What does the verification badge mean?',
        answer: 'The pineapple verification badge indicates that a member has been verified by our team. Verified members have confirmed their identity, making the community safer and more trustworthy for everyone.',
      },
      {
        question: 'How do I get verified?',
        answer: 'Verification is handled by our admin team during the membership approval process. All new members go through a vetting process to ensure authenticity and maintain our community standards.',
      },
    ],
  },
  {
    title: 'Community & Safety',
    icon: (
      <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    items: [
      {
        question: 'How do I report inappropriate content or behavior?',
        answer: (
          <div className="space-y-2">
            <p>To report a listing, post, or member:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>On marketplace listings: Click the <strong>"Report"</strong> button on the listing</li>
              <li>On posts: Use the report option in the post menu</li>
              <li>For members: Visit their profile and use the report feature</li>
            </ul>
            <p className="mt-2">Our team reviews all reports and takes appropriate action to maintain community safety.</p>
          </div>
        ),
      },
      {
        question: 'What are the community guidelines?',
        answer: 'PineapplePlay is an exclusive community built on respect, authenticity, and discretion. We expect all members to treat each other with respect, maintain honesty in all interactions, and protect the privacy of fellow members. Harassment, fraud, or any illegal activity will result in immediate removal from the platform.',
      },
      {
        question: 'How is my privacy protected?',
        answer: 'We take privacy seriously. Your personal information is never shared without consent. Messages are end-to-end encrypted. Profile visibility is limited to verified members only. We do not sell your data to third parties.',
      },
    ],
  },
  {
    title: 'Travel & Events',
    icon: (
      <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    items: [
      {
        question: 'How do I explore travel destinations?',
        answer: 'Visit the Travel section from the navigation menu to discover exclusive destinations popular with our community. You can save destinations to your favorites and connect with other members traveling to the same locations.',
      },
      {
        question: 'Can I connect with members in my travel destination?',
        answer: 'Yes! Use the Travel feature to see where other members are located or planning to visit. You can then message them directly to connect and potentially meet up.',
      },
    ],
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gold/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 flex items-center justify-between text-left hover:bg-gold/5 transition-colors px-2 rounded"
        data-testid="faq-question"
      >
        <span className="text-offWhite font-body pr-4">{item.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gold flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-2 text-offWhite/70 font-body text-sm leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFAQ = searchQuery
    ? faqData.map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((category) => category.items.length > 0)
    : faqData;

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <div className="bg-darkBlue/50 border-b border-gold/20">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/" className="text-gold/60 hover:text-gold transition-colors">
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-heading text-gold">Help Center</h1>
              <p className="text-offWhite/60 font-body">Find answers to common questions</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-charcoal border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold transition-colors"
              data-testid="faq-search"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {filteredFAQ.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-offWhite/60 font-body">No results found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-gold hover:underline font-body"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFAQ.map((category, categoryIndex) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="bg-darkBlue/30 rounded-2xl border border-gold/20 overflow-hidden"
              >
                {/* Category Header */}
                <div className="bg-darkBlue/50 px-6 py-4 border-b border-gold/10">
                  <div className="flex items-center space-x-3">
                    <span className="text-gold">{category.icon}</span>
                    <h2 className="text-xl font-heading text-gold">{category.title}</h2>
                  </div>
                </div>

                {/* Questions */}
                <div className="px-4 py-2">
                  {category.items.map((item, itemIndex) => (
                    <FAQAccordion
                      key={itemIndex}
                      item={item}
                      isOpen={openItems[`${categoryIndex}-${itemIndex}`] || false}
                      onToggle={() => toggleItem(categoryIndex, itemIndex)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-gold/10 rounded-2xl border border-gold/20 p-8 text-center"
        >
          <h2 className="text-2xl font-heading text-gold mb-3">Still have questions?</h2>
          <p className="text-offWhite/60 font-body mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Link
            href="/messages"
            className="inline-block px-8 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            data-testid="contact-support-btn"
          >
            Contact Support
          </Link>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-gold/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <Link href="/" className="text-gold/60 hover:text-gold transition-colors font-body text-sm">
            ← Back to PineapplePlay
          </Link>
        </div>
      </div>
    </div>
  );
}
