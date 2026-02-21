'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';

interface WatermarkedImageProps {
  src: string;
  alt: string;
  viewerUsername: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Watermarked Image Component
 * - Renders image with Next.js Image optimization
 * - Overlays a semi-transparent watermark with the viewer's username
 * - Watermark is diagonal and repeated for traceability
 */
export default function WatermarkedImage({
  src,
  alt,
  viewerUsername,
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  objectFit = 'cover',
}: WatermarkedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  // Generate watermark text with timestamp
  const watermarkText = `${viewerUsername} • ${new Date().toLocaleDateString()}`;

  // Handle image error
  const handleError = () => {
    setImageError(true);
  };

  if (imageError || !src) {
    return (
      <div
        className={`relative bg-darkBlue flex items-center justify-center ${className}`}
        style={fill ? { position: 'absolute', inset: 0 } : { width, height }}
      >
        <div className="text-offWhite/40 text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-body">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={
        fill
          ? { position: 'absolute', inset: 0 }
          : { width: width || '100%', height: height || '100%' }
      }
    >
      {/* Base Image with Next.js Optimization */}
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit }}
          priority={priority}
          onError={handleError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 400}
          height={height || 400}
          style={{ objectFit, width: '100%', height: '100%' }}
          priority={priority}
          onError={handleError}
        />
      )}

      {/* Watermark Overlay */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          zIndex: 10,
        }}
      >
        {/* Repeated diagonal watermark pattern */}
        <div
          className="absolute"
          style={{
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            display: 'flex',
            flexWrap: 'wrap',
            transform: 'rotate(-30deg)',
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{
                width: '180px',
                height: '80px',
                padding: '8px',
              }}
            >
              <span
                className="font-body text-xs whitespace-nowrap"
                style={{
                  color: 'rgba(212, 175, 55, 0.15)',
                  textShadow: '0 0 2px rgba(0, 0, 0, 0.5)',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                }}
              >
                {watermarkText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Single prominent watermark in center */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 11 }}
      >
        <span
          className="font-body text-lg transform -rotate-30"
          style={{
            color: 'rgba(212, 175, 55, 0.2)',
            textShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
            fontWeight: 600,
            letterSpacing: '2px',
          }}
        >
          {viewerUsername.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
