import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1815] via-[#121214] to-[#0D0D0D] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg
          className="h-10 w-10 text-[#D4AF37]/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M9 3h6l1 3H8l1-3Z" />
          <path d="M7 8h10l2 4-1.5 9h-11L5 12l2-4Z" />
        </svg>
        <span className="mt-3 font-serif text-xs text-[#A19D94] line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
