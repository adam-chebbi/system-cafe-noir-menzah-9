import React, { useState } from 'react';
import {
  Coffee,
  Milk,
  Cookie,
  UtensilsCrossed,
  Droplets,
  Package,
  Leaf,
  CupSoda,
  Box
} from 'lucide-react';

export interface ItemThumbnailProps {
  src?: string;
  alt: string;
  category?: string;
  type?: 'product' | 'ingredient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showBadge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 min-w-6 text-[10px]',
  sm: 'w-8 h-8 min-w-8 text-xs',
  md: 'w-11 h-11 min-w-11 text-sm',
  lg: 'w-16 h-16 min-w-16 text-base',
  xl: 'w-24 h-24 min-w-24 text-xl',
  hero: 'w-36 h-36 min-w-36 text-2xl'
};

const ICON_SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
  hero: 'w-14 h-14'
};

const ROUNDED_MAP = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full'
};

export const ItemThumbnail: React.FC<ItemThumbnailProps> = ({
  src,
  alt,
  category = '',
  type = 'product',
  size = 'md',
  className = '',
  rounded = 'xl',
  showBadge = false
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const cleanCategory = (category || '').toLowerCase();

  // Helper for Category-Based Fallback Aesthetics
  const getCategoryFallback = () => {
    if (cleanCategory.includes('coffee') || cleanCategory.includes('café') || cleanCategory.includes('grain')) {
      return {
        icon: Coffee,
        bg: 'bg-[#ECE4D8] text-[#5C3D2E] border-[#D8C7B5]',
        label: 'Café'
      };
    }
    if (cleanCategory.includes('milk') || cleanCategory.includes('lait') || cleanCategory.includes('dairy')) {
      return {
        icon: Milk,
        bg: 'bg-[#E5EFF8] text-[#2C5D88] border-[#C7DDF0]',
        label: 'Lait'
      };
    }
    if (cleanCategory.includes('syrup') || cleanCategory.includes('sirop') || cleanCategory.includes('vanille') || cleanCategory.includes('caramel')) {
      return {
        icon: Droplets,
        bg: 'bg-[#FDF2D9] text-[#976814] border-[#F5DFAB]',
        label: 'Sirop'
      };
    }
    if (cleanCategory.includes('bakery') || cleanCategory.includes('pâtisserie') || cleanCategory.includes('viennoiserie') || cleanCategory.includes('cookie') || cleanCategory.includes('croissant')) {
      return {
        icon: Cookie,
        bg: 'bg-[#FBEBD9] text-[#8C4E1E] border-[#F4D3B0]',
        label: 'Pâtisserie'
      };
    }
    if (cleanCategory.includes('fresh') || cleanCategory.includes('frais') || cleanCategory.includes('tea') || cleanCategory.includes('thé') || cleanCategory.includes('matcha')) {
      return {
        icon: Leaf,
        bg: 'bg-[#E5F4EB] text-[#1E6B37] border-[#C3E6D0]',
        label: 'Frais'
      };
    }
    if (cleanCategory.includes('savory') || cleanCategory.includes('salé') || cleanCategory.includes('brunch') || cleanCategory.includes('toast')) {
      return {
        icon: UtensilsCrossed,
        bg: 'bg-[#F2EFEB] text-[#554E46] border-[#DDD7CF]',
        label: 'Salé'
      };
    }
    if (cleanCategory.includes('beverage') || cleanCategory.includes('boisson') || cleanCategory.includes('signature')) {
      return {
        icon: CupSoda,
        bg: 'bg-[#F6E8EB] text-[#8C2E46] border-[#E8C6CF]',
        label: 'Boisson'
      };
    }
    if (cleanCategory.includes('pack') || cleanCategory.includes('emballage')) {
      return {
        icon: Package,
        bg: 'bg-[#EDEFEA] text-[#48534C] border-[#D3D8D1]',
        label: 'Emballage'
      };
    }

    return {
      icon: type === 'ingredient' ? Box : Coffee,
      bg: 'bg-[#ECEEEA] text-[#252A27] border-[#D9DDD8]',
      label: type === 'ingredient' ? 'Matière' : 'Produit'
    };
  };

  const fallback = getCategoryFallback();
  const FallbackIcon = fallback.icon;
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const iconSizeClasses = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;
  const roundedClasses = ROUNDED_MAP[rounded] || ROUNDED_MAP.xl;

  const showImage = Boolean(src && !hasError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden border shadow-2xs select-none ${sizeClasses} ${roundedClasses} ${
        showImage ? 'bg-[#ECEEEA] border-[#D9DDD8]' : `${fallback.bg}`
      } ${className}`}
      title={alt}
    >
      {showImage ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#ECEEEA] text-[#555D58] animate-pulse">
              <FallbackIcon className={iconSizeClasses} />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-0.5 text-center">
          <FallbackIcon className={iconSizeClasses} />
        </div>
      )}

      {showBadge && (
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
      )}
    </div>
  );
};
