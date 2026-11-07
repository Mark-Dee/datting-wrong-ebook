import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { BookCover } from './BookCover.tsx';
import { PopReveal } from './PopReveal.tsx';
import { BookMetadata, UserEntitlement } from '../types.ts';

interface HeroSectionProps {
  metadata: BookMetadata;
  entitlement: UserEntitlement | null;
  onReadBook: () => void;
  onOpenSample: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  metadata,
  entitlement,
  onReadBook,
  onOpenSample,
}) => {
  return (
    <section className="relative pt-10 pb-18 sm:pt-16 sm:pb-24 overflow-hidden border-b border-[#E8DEC9]">
      {/* Ambient literary dusk and warm parchment background glow */}
      <div
        className="absolute -top-32 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #B91C1C 0%, #D97706 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-1/3 -left-36 w-[30rem] h-[30rem] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #D97706 0%, #F59E0B 35%, transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Literary Provocation & Discovery */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Main Book Title */}
            <PopReveal delayMs={100} yOffset={35}>
              <h1 className="font-display-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#141110] leading-[1.05]">
                Dating{' '}
                <span
                  className="font-display-serif font-bold text-[#991B1B] tracking-normal drop-shadow-sm"
                  style={{
                    textShadow: '0 2px 10px rgba(153, 27, 27, 0.35), 0 1px 3px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  Wrong
                </span>
              </h1>
            </PopReveal>

            {/* Subtitle */}
            <PopReveal delayMs={160} yOffset={30}>
              <p className="mt-3 font-display-serif text-xl sm:text-2xl text-[#3D3530] leading-snug font-normal max-w-xl">
                Why We Choose the Wrong People and Repeat the Same Relationships
              </p>
            </PopReveal>

            {/* Author Byline */}
            <PopReveal delayMs={220} yOffset={25}>
              <p className="mt-2.5 font-ui-sans text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-[#8C6D46]">
                By {metadata.author}
              </p>
            </PopReveal>

            {/* The Central Quote Callout */}
            <PopReveal delayMs={280} yOffset={35} className="w-full">
              <div className="my-6 p-5 sm:p-6 bg-[#F4EFE6] border-l-3 border-[#78350F] rounded-r-xs w-full shadow-xs">
                <blockquote className="font-book-serif text-lg sm:text-xl italic text-[#292524] leading-relaxed">
                  “{metadata.quote}”
                </blockquote>
                <div className="mt-2.5 font-ui-sans text-xs font-bold uppercase tracking-wider text-[#8C6D46] flex items-center gap-2">
                  <span>— {metadata.quoteAttribution}</span>
                </div>
              </div>
            </PopReveal>

            {/* Reflection Paragraph */}
            <PopReveal delayMs={340} yOffset={30}>
              <p className="font-book-serif text-base sm:text-lg text-[#4A4039] leading-relaxed max-w-2xl">
                This book is not a courtroom. It is not a place where I put my former partners on trial. It is a mirror. The purpose of the book is not to make the reader suspicious of love, women, men, relationships or marriage. It is to help us become more intentional about the people we choose, the motives we carry, the boundaries we establish and the kind of people we ourselves become.
              </p>
            </PopReveal>

            {/* Call to Action Block */}
            <PopReveal delayMs={400} yOffset={35}>
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                <button
                  onClick={onReadBook}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xs bg-[#991B1B] text-[#FAF7F2] font-ui-sans font-semibold text-sm tracking-wider uppercase hover:bg-[#7F1D1D] active:translate-y-0.5 transition-all shadow-md hover:shadow-lg hover:shadow-[#991B1B]/25 group cursor-pointer"
                >
                  <span>{entitlement ? 'Continue Reading' : 'Read the Book'}</span>
                  <ArrowRight className="w-4 h-4 text-[#FDE8E8] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={onOpenSample}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xs bg-[#EDE3D0]/80 hover:bg-[#E5D8C3] text-[#332A24] font-ui-sans font-semibold text-sm tracking-wide border border-[#D5C6AF] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#78350F]" />
                  <span>Read Free Sample Chapters</span>
                </button>
              </div>
            </PopReveal>

            {/* Access & Payment details strip (without symbols) */}
            <PopReveal delayMs={460} yOffset={25}>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-y-1.5 sm:gap-x-6 text-xs font-ui-sans text-[#6B5E52]">
                <span>M-PESA Activation Fee (750 KSH)</span>
                <span className="hidden sm:inline text-stone-300 font-light">•</span>
                <span>Digital License</span>
                <span className="hidden sm:inline text-stone-300 font-light">•</span>
                <span>Includes Offline Reading</span>
              </div>
            </PopReveal>
          </div>

          {/* Right Column: Book Front Cover as provided */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center pt-6 lg:pt-0">
            <PopReveal delayMs={150} yOffset={45} className="w-full flex justify-center">
              <BookCover size="lg" className="mx-auto" />
            </PopReveal>

            {/* Real book publication colophon snippet */}
            <PopReveal delayMs={500} yOffset={20}>
              <div className="mt-8 text-center max-w-xs space-y-1">
                <p className="font-display-serif text-sm font-semibold text-[#1C1917]">
                  Published by Mark & Alvis
                </p>
                <p className="font-ui-sans text-xs text-[#6B5E52]">
                  First Edition, 2026 • Printed & Released in Nairobi, Kenya
                </p>
                <p className="font-ui-sans text-[11px] text-[#9C8E7E] tracking-tight">
                  {metadata.pageCount} Pages • {metadata.wordCount.toLocaleString()} Words • 750 KSH
                </p>
              </div>
            </PopReveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
