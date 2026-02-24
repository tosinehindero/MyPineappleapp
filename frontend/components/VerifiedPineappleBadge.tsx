'use client';

import { motion } from 'framer-motion';

interface VerifiedPineappleBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function VerifiedPineappleBadge({ 
  size = 'md', 
  showText = false,
  className = '' 
}: VerifiedPineappleBadgeProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <motion.div 
      className={`inline-flex items-center gap-1.5 ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className={`${sizeClasses[size]} relative`}>
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gold/30 blur-sm animate-pulse" />
        
        {/* Badge container */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-gold shadow-gold-glow-sm">
          <img
            src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
            alt="Verified Pineapple"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Check mark overlay */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center border border-charcoal">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {showText && (
        <span className={`${textSizeClasses[size]} text-gold font-medium`}>
          Verified
        </span>
      )}
    </motion.div>
  );
}

// Tooltip version for hover states
export function VerifiedPineappleTooltip({ 
  children, 
  isVerified 
}: { 
  children: React.ReactNode; 
  isVerified: boolean;
}) {
  if (!isVerified) return <>{children}</>;
  
  return (
    <div className="relative group inline-flex items-center gap-2">
      {children}
      <VerifiedPineappleBadge size="sm" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-darkBlue border border-gold/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gold">Verified Member</span>
        </div>
        <p className="text-xs text-offWhite/70 mt-1">
          Identity confirmed by our vetting team
        </p>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gold/30" />
      </div>
    </div>
  );
}
