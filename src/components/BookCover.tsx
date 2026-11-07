import React, { useState } from 'react';
import officialCoverImg from '../assets/images/dating_wrong_book_cover_1790602540354.jpg';

interface BookCoverProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'max-w-[190px]',
    md: 'max-w-[260px]',
    lg: 'max-w-[340px] sm:max-w-[380px]',
  };

  return (
    <div className={`relative w-full ${sizeClasses[size]} ${className}`}>
      {!imageError ? (
        /* The book image is presented exactly as provided, with no filters, overlays, or modifications */
        <img
          src={officialCoverImg || '/dating_wrong_front_cover.jpg'}
          alt="Dating Wrong by Gerishon Wanyeki"
          className="w-full h-auto block rounded-xs shadow-lg"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Fallback typography block if image fails to load */
        <div className="w-full aspect-[3/4] p-6 flex flex-col justify-between text-[#FAF7F2] bg-[#0C0A09] rounded-xs shadow-lg">
          <div className="pt-1 text-center">
            <p className="font-ui-sans tracking-[0.26em] text-[10.5px] uppercase text-[#F59E0B] font-bold">
              Gerishon Wanyeki
            </p>
            <div className="w-10 h-[1px] bg-[#D97706]/70 mx-auto mt-2" />
          </div>
          <div className="my-auto text-center px-1">
            <h1 className="font-display-serif text-3xl sm:text-4xl tracking-tight leading-[0.98] font-bold text-[#FAF7F2] uppercase">
              Dating
            </h1>
            <div className="mt-1">
              <span className="font-display-serif text-4xl sm:text-5xl font-black uppercase text-[#DC2626]">
                Wrong
              </span>
            </div>
            <p className="mt-3 font-book-serif italic text-xs sm:text-sm text-[#F5EFE6] leading-snug max-w-[210px] mx-auto">
              Why We Choose the Wrong People and Repeat the Same Relationships
            </p>
          </div>
          <div className="text-center pb-1 pt-2">
            <p className="font-ui-sans tracking-[0.24em] text-[8.5px] uppercase font-semibold text-[#E5D8C5]">
              Mark & Alvis
            </p>
            <p className="font-ui-sans tracking-[0.12em] text-[7.5px] uppercase text-[#C4B59D] mt-0.5">
              Nairobi • First Edition
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCover;
