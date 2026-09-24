import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  if (variant === 'icon') {
    const iconSizes = {
      sm: 'w-7 h-7',
      md: 'w-9 h-9',
      lg: 'w-11 h-11',
      xl: 'w-14 h-14',
    };

    return (
      <img
        src="/ecomhub-icon.svg"
        alt="EcomHub OS"
        className={`${iconSizes[size]} object-contain shrink-0 ${className}`}
        loading="eager"
      />
    );
  }

  if (variant === 'compact') {
    const compactSizes = {
      sm: 'h-6',
      md: 'h-8',
      lg: 'h-10',
      xl: 'h-12',
    };

    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <img
          src="/ecomhub-icon.svg"
          alt="EcomHub OS"
          className={`${compactSizes[size]} w-auto object-contain shrink-0`}
          loading="eager"
        />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black text-[#0F172A] tracking-tight text-base sm:text-lg">
            EcomHub
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 text-[#4F46E5] border border-indigo-200">
            OS
          </span>
        </div>
      </div>
    );
  }

  // Full Logo Variant
  const fullHeights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-14',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img
        src="/ecomhub-icon.svg"
        alt="EcomHub OS"
        className={`${fullHeights[size]} w-auto object-contain shrink-0`}
        loading="eager"
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black text-[#0F172A] tracking-tight text-base sm:text-lg">
            EcomHub
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 text-[#4F46E5] border border-indigo-200">
            OS
          </span>
        </div>
        {showTagline && (
          <span className="text-[9px] font-semibold tracking-wider text-[#64748B] uppercase mt-1">
            Your Business, One Hub.
          </span>
        )}
      </div>
    </div>
  );
};
