
import React from 'react';
import { Product } from '../types';

interface Props {
  product: Product;
  formattedPrice?: string; // Kept for interface compatibility
  onClick?: () => void;
}

const ProductCard: React.FC<Props> = ({ product, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col items-center bg-[#242636] rounded-[1.2rem] p-1.5 border border-gray-800/60 shadow-lg cursor-pointer active:scale-95 transition-all duration-300 hover:border-yellow-400/30 hover:shadow-yellow-400/10 w-full h-full"
    >
      {/* The Visual Card (Image/Icon Area) */}
      <div className={`
        w-full aspect-[4/5] rounded-[0.9rem] bg-gradient-to-br ${product.imageColor} 
        relative overflow-hidden shadow-inner
      `}>
         {/* Background Pattern Overlay */}
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>

         {/* Product Image */}
         {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
            />
         ) : (
            /* Fallback Icon/Text if no image */
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-12 h-12 bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center shadow-inner">
                  <span className="text-white text-lg font-bold opacity-80 uppercase">
                    {product.name.slice(0, 2)}
                  </span>
               </div>
            </div>
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
};

export default ProductCard;
