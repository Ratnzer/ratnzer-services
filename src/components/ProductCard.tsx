
import React, { useState } from 'react';
import { Product } from '../types';

interface Props {
  product: Product;
  formattedPrice?: string; // Kept for interface compatibility
  onClick?: () => void;
}

// ✅ Use React.memo to prevent unnecessary re-renders of product cards in long lists
const ProductCard: React.FC<Props> = React.memo(({ product, onClick }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col items-center bg-[#242636] rounded-[1.2rem] p-1.5 border border-gray-700 shadow-lg cursor-pointer active:scale-95 transition-all duration-300 hover:border-yellow-400/30 hover:shadow-yellow-400/10 w-full h-full will-change-transform touch-manipulation"
    >
      {/* The Visual Card (Image/Icon Area) */}
      <div className={`
        w-full aspect-[4/5] rounded-[0.9rem] bg-gradient-to-br ${product.imageColor} 
        relative overflow-hidden shadow-inner ${!isImageLoaded ? 'animate-shimmer' : ''}
      `}>
	         {/* Background Pattern Overlay removed as requested */}

         {/* Product Image */}
         {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setIsImageLoaded(true)}
              fetchPriority="high"
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-150 ease-in-out group-hover:scale-105 will-change-transform will-change-opacity ${
                isImageLoaded ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'
              }`}
            />
         ) : (
            /* No image - Keep only Shimmer */
            <div className="absolute inset-0 animate-shimmer"></div>
         )}
         
         {/* Tag (e.g., Sale, New) */}
         {product.tag && (
             <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-sm z-10">
                 {product.tag}
             </div>
         )}

         {/* Glossy Effect overlay */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
      </div>

      {/* Product Name (Inside the Card Container) */}
      <div className="w-full flex items-center justify-center pt-2 pb-1 min-h-[40px]">
        <h3 className="text-gray-300 font-bold text-[10px] sm:text-[11px] text-center leading-tight px-1 group-hover:text-yellow-400 transition-colors line-clamp-2">
            {product.name}
        </h3>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if product data or onClick reference changes
  return prevProps.product.id === nextProps.product.id && 
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.imageUrl === nextProps.product.imageUrl &&
         prevProps.onClick === nextProps.onClick;
});

export default ProductCard;
